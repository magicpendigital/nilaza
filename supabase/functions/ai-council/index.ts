import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { generateWithModelRoute } from "../_shared/model-router.ts";
import { safeJsonParse, sanitizeProviderMetadata } from "../_shared/model-provider.ts";
import { councilContract } from "../_shared/council-contract.ts";
import { accountTierPolicy, councilAllowance, localDayStart } from "../_shared/account-tier-policy.ts";
import { configuredDailyLimit, readActiveFeatureConfig } from "../_shared/feature-config.ts";
import { safetyRedirectFor } from "../_shared/crisis-safety.ts";
import { featurePaused, featurePausedBody } from "../_shared/feature-switch.ts";
import { globalPromptMetadata, resolveGlobalPrompt } from "../_shared/global-prompt.ts";
import { userDataValues } from "../_shared/ai-user-context.ts";
import { assembleCouncilSystem, boundCouncilHistory, councilUserMessage } from "./council-prompt.ts";
import { blockEnabled, blockLimit, contextPolicyFor, contextPolicyMetadata, userDataPolicy } from "../_shared/context-config.ts";

type Language = "vi" | "en" | string;

type LocalizedText = {
  vi?: string;
  en?: string;
  [key: string]: string | undefined;
};

type CouncilPersona = {
  id: string;
  slug: string;
  name: LocalizedText;
  displayRole?: LocalizedText;
  transparencyNote?: LocalizedText;
};

type CouncilInput = {
  language?: Language;
  councilId?: "ai_council";
  /** Council Builder config version, not the request/response contract version. */
  councilVersion?: string;
  councilContractVersion?: string;
  councilTemplate?: {
    id?: string;
    meetingMode?: string;
    synthesisMode?: string;
    maxGuidesPerTurn?: number;
    guideRoles?: Array<{
      personaId?: string;
      personaSlug?: string;
      role?: string;
    }>;
    outputContract?: string[];
  };
  userMessage?: string;
  selectedPersonas?: CouncilPersona[];
  userContext?: {
    goals?: string[];
    tone?: string;
    /** CH-13 (Owner 04/11, 13/11): the chosen name; sent by newer app builds only. */
    nickname?: string;
  };
  sanitizedHistory?: Array<{
    role: "user" | "guide";
    text: string;
    personaId?: string;
  }>;
};

type RuntimeCouncilTemplate = {
  id?: string | null;
  meetingMode?: string | null;
  synthesisMode?: string | null;
  maxGuidesPerTurn: number;
  outputContract: string[];
  rosterSlugs: string[];
};

type CouncilTurn = {
  personaId: string;
  text: string;
  lens: string;
  kind: "opening" | "perspective" | "response" | "synthesis";
  replyToPersonaId?: string;
  promptVersionId: string;
  order: number;
};

type CouncilSynthesis = {
  consensus: string;
  tensions: string[];
  assumptions: string[];
  nextStep: string;
  reflectionQuestion: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const promptVersionId = councilContract.promptVersionId;
const outputSchema = councilContract.responseSchema;

function localize(value: LocalizedText | undefined, language: Language, fallback: string) {
  if (!value) return fallback;
  return value[language] ?? value.en ?? value.vi ?? fallback;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
}

function lensForPersona(persona: CouncilPersona, language: Language) {
  const role = localize(persona.displayRole, language, "");
  if (role) return role;
  if (persona.slug.includes("communication")) return language === "vi" ? "giao tiếp và ranh giới" : "communication and boundaries";
  if (persona.slug.includes("calm")) return language === "vi" ? "bình tâm và tự chăm sóc" : "calm and self-care";
  if (persona.slug.includes("confucius")) return language === "vi" ? "hòa hợp và cách ứng xử" : "harmony and conduct";
  if (persona.slug.includes("laozi")) return language === "vi" ? "buông bớt cưỡng cầu" : "letting go of force";
  return language === "vi" ? "lý trí và mục đích" : "reason and purpose";
}

function buildTurn(persona: CouncilPersona, message: string, language: Language, index: number, previousPersona?: CouncilPersona): CouncilTurn {
  const lens = lensForPersona(persona, language);
  // Canned turns used when the model is unavailable (live QA 2026-10-31): short, different per seat, and they
  // neither quote the question back nor paste the persona description. The app labels them as fallback.
  void message;
  const previous = previousPersona ? localize(previousPersona.name, language, language === "vi" ? "người trước" : "the previous guide") : "";
  const vi = [
    "Chưa cần vội có câu trả lời tuyệt đối. Thử viết ra điều bạn đã biết chắc và điều còn đang đoán.",
    `Tiếp nối ${previous}, hãy để ý điều gì đang làm bạn căng nhất khi nghĩ tới chuyện này, rồi cho nó một chút thời gian.`,
    `Từ những gì ${previous} gợi ý, chọn một bước nhỏ có thể thử trong 24 giờ tới và một dấu hiệu cho biết bước đó có ích.`
  ];
  const en = [
    "No need to rush a final answer. Write down what you know for sure and what you are still guessing.",
    `Building on ${previous}, notice what feels most tense when you think about this, and give it a little time.`,
    `From what ${previous} suggested, pick one small step to try in the next 24 hours and one sign that it helped.`
  ];
  const text = (language === "vi" ? vi : en)[Math.min(index, 2)];

  return {
    personaId: persona.id,
    text,
    lens,
    kind: index === 0 ? "opening" : "response",
    replyToPersonaId: previousPersona?.id,
    promptVersionId,
    order: index
  };
}

function fallbackSynthesis(language: Language, turns: CouncilTurn[]): CouncilSynthesis {
  return language === "vi"
    ? {
      consensus: "Các góc nhìn đều mời bạn làm rõ điều mình biết, điều còn thiếu và điều nằm trong tầm kiểm soát.",
      tensions: ["Chưa có đủ dữ kiện để chọn một kết luận duy nhất."],
      assumptions: ["Đây là phản chiếu biểu tượng dựa trên câu hỏi hiện tại, không phải dự đoán chắc chắn."],
      nextStep: "Viết ra một bước nhỏ có thể thử trong 24 giờ tới và tiêu chí để biết bước đó hữu ích.",
      reflectionQuestion: "Điều gì sẽ giúp bạn có thêm thông tin trước khi quyết định?"
    }
    : {
      consensus: "The perspectives invite you to separate what you know, what is missing, and what is within your control.",
      tensions: ["There is not enough context to choose one final conclusion."],
      assumptions: ["This is symbolic reflection on the current question, not a certain prediction."],
      nextStep: "Write one small step you can try in the next 24 hours and how you will know it helped.",
      reflectionQuestion: "What would give you better information before you decide?"
    };
}

function parseCouncilSynthesis(value: unknown, fallback: CouncilSynthesis): CouncilSynthesis {
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Record<string, unknown>;
  const text = (key: string, defaultValue: string) => typeof candidate[key] === "string" && candidate[key].trim()
    ? candidate[key].trim()
    : defaultValue;
  const list = (key: string, defaultValue: string[]) => Array.isArray(candidate[key])
    ? candidate[key].filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()).slice(0, 4)
    : defaultValue;
  return {
    consensus: text("consensus", fallback.consensus),
    tensions: list("tensions", fallback.tensions),
    assumptions: list("assumptions", fallback.assumptions),
    nextStep: text("nextStep", fallback.nextStep),
    reflectionQuestion: text("reflectionQuestion", fallback.reflectionQuestion)
  };
}

function parseCouncilOutput(text: string, fallbackTurns: CouncilTurn[], personas: CouncilPersona[], language: Language) {
  const synthesisFallback = fallbackSynthesis(language, fallbackTurns);
  const json = safeJsonParse(text.trim()) ?? safeJsonParse(text.match(/\{[\s\S]*\}/)?.[0] ?? "");
  if (!json || typeof json !== "object" || !Array.isArray(json.turns)) {
    return { turns: fallbackTurns, suggestedFollowUps: undefined as string[] | undefined, transcriptSummary: undefined as string | undefined, synthesis: synthesisFallback, parsed: false };
  }

  const personaIds = new Set(personas.map((persona) => persona.id));
  const turns = json.turns
    .map((turn: any, index: number) => {
      const fallback = fallbackTurns[index] ?? fallbackTurns[0];
      const personaId = typeof turn.personaId === "string" && personaIds.has(turn.personaId) ? turn.personaId : fallback?.personaId;
      const textValue = typeof turn.text === "string" && turn.text.trim() ? turn.text.trim() : fallback?.text;
      if (!personaId || !textValue) return null;
      const kind = ["opening", "perspective", "response", "synthesis"].includes(turn.kind)
        ? turn.kind as CouncilTurn["kind"]
        : fallback?.kind ?? (index === 0 ? "opening" : "response");
      const replyToPersonaId = typeof turn.replyToPersonaId === "string" && personaIds.has(turn.replyToPersonaId) && turn.replyToPersonaId !== personaId
        ? turn.replyToPersonaId
        : fallback?.replyToPersonaId;
      return {
        personaId,
        text: textValue,
        lens: typeof turn.lens === "string" && turn.lens.trim() ? turn.lens.trim() : fallback?.lens ?? "",
        kind,
        replyToPersonaId,
        promptVersionId,
        order: index
      };
    })
    .filter((turn: CouncilTurn | null): turn is CouncilTurn => Boolean(turn));

  return {
    turns: turns.length >= 2 ? turns : fallbackTurns,
    suggestedFollowUps: Array.isArray(json.suggestedFollowUps)
      ? json.suggestedFollowUps.filter((item: unknown): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, 4)
      : undefined,
    transcriptSummary: typeof json.transcriptSummary === "string" ? json.transcriptSummary : undefined,
    synthesis: parseCouncilSynthesis(json.synthesis, synthesisFallback),
    parsed: turns.length >= 2
  };
}

function inputTemplate(input: CouncilInput): RuntimeCouncilTemplate {
  return {
    id: input.councilTemplate?.id ?? null,
    meetingMode: input.councilTemplate?.meetingMode ?? null,
    synthesisMode: input.councilTemplate?.synthesisMode ?? null,
    maxGuidesPerTurn: input.councilTemplate?.maxGuidesPerTurn ?? input.selectedPersonas?.length ?? 2,
    outputContract: input.councilTemplate?.outputContract ?? [],
    rosterSlugs: input.councilTemplate?.guideRoles?.map((role) => role.personaSlug).filter((slug): slug is string => Boolean(slug)) ?? []
  };
}

function parseRosterSlugs(roster: unknown): string[] {
  if (!Array.isArray(roster)) return [];
  return roster
    .map((member) => {
      if (!member || typeof member !== "object") return null;
      const slug = (member as { personaSlug?: unknown }).personaSlug;
      return typeof slug === "string" ? slug : null;
    })
    .filter((slug): slug is string => Boolean(slug));
}

async function readPublishedCouncilConfig(
  supabase: ReturnType<typeof createClient>,
  input: CouncilInput
): Promise<{
  configVersionId?: string;
  configVersion?: string;
  template: RuntimeCouncilTemplate;
  source: "supabase_active_config" | "mobile_payload";
}> {
  const fallbackTemplate = inputTemplate(input);
  let configQuery = supabase
    .from("ai_council_config_versions")
    .select("id, version, default_template_key, max_guides_per_turn")
    .eq("status", "active");

  if (input.councilVersion) configQuery = configQuery.eq("version", input.councilVersion);

  const { data: configs, error: configError } = await configQuery.order("created_at", { ascending: false }).limit(1);
  const config = (Array.isArray(configs) ? configs[0] : null) as any;
  if (configError || !config) return { template: fallbackTemplate, source: "mobile_payload" };

  const templateKey = input.councilTemplate?.id ?? config.default_template_key;
  const { data: templateRows, error: templateError } = await supabase
    .from("ai_council_template_versions")
    .select("template_key, meeting_mode, max_guides, synthesis_mode, roster, output_contract")
    .eq("config_version_id", config.id)
    .eq("template_key", templateKey)
    .limit(1);
  const template = (Array.isArray(templateRows) ? templateRows[0] : null) as any;
  if (templateError || !template) {
    return {
      configVersionId: config.id,
      configVersion: config.version,
      template: {
        ...fallbackTemplate,
        id: templateKey,
        maxGuidesPerTurn: config.max_guides_per_turn ?? fallbackTemplate.maxGuidesPerTurn
      },
      source: "supabase_active_config"
    };
  }

  return {
    configVersionId: config.id,
    configVersion: config.version,
    template: {
      id: template.template_key,
      meetingMode: template.meeting_mode,
      synthesisMode: template.synthesis_mode,
      maxGuidesPerTurn: template.max_guides ?? config.max_guides_per_turn ?? fallbackTemplate.maxGuidesPerTurn,
      outputContract: Array.isArray(template.output_contract) ? template.output_contract : fallbackTemplate.outputContract,
      rosterSlugs: parseRosterSlugs(template.roster)
    },
    source: "supabase_active_config"
  };
}

async function runtimePersonasFromTemplate(
  supabase: ReturnType<typeof createClient> | null,
  fallbackPersonas: CouncilPersona[],
  rosterSlugs: string[]
) {
  if (!supabase || !rosterSlugs.length) return fallbackPersonas;

  const { data: personaRows, error } = await supabase
    .from("personas")
    .select("id, slug, name, short_description, transparency_note")
    .in("slug", rosterSlugs);
  if (error || !Array.isArray(personaRows) || !personaRows.length) return fallbackPersonas;

  const typedPersonaRows = personaRows as unknown as Array<{ id: string; slug: string; name: LocalizedText; short_description?: LocalizedText; transparency_note?: LocalizedText }>;
  const bySlug = new Map(typedPersonaRows.map((row) => [row.slug, row]));
  const ordered: CouncilPersona[] = [];
  for (const slug of rosterSlugs) {
    const row = bySlug.get(slug);
    if (!row) continue;
    ordered.push({
      id: row.id,
      slug: row.slug,
      name: row.name,
      displayRole: row.short_description,
      transparencyNote: row.transparency_note
    });
  }

  return ordered.length >= 2 ? ordered : fallbackPersonas;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const input = (await req.json()) as CouncilInput;
    const language = input.language ?? "vi";
    const userMessage = input.userMessage?.trim();
    const selectedPersonas = input.selectedPersonas ?? [];

    if (input.councilId && input.councilId !== "ai_council") return jsonResponse({ error: "Unsupported councilId" }, 400);
    if (input.councilContractVersion && input.councilContractVersion !== councilContract.version) {
      return jsonResponse({ error: "Unsupported Council contract version" }, 409);
    }
    if (!userMessage || selectedPersonas.length < 2) {
      return jsonResponse({ error: "AI Council requires userMessage and at least two selectedPersonas" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization");
    let supabase: ReturnType<typeof createClient> | null = null;
    let userId: string | undefined;
    let runtimeConfig = {
      template: inputTemplate(input),
      source: "mobile_payload" as "supabase_active_config" | "mobile_payload",
      configVersionId: undefined as string | undefined,
      configVersion: input.councilVersion
    };
    let persistenceStatus = "skipped";
    let remoteSessionId: string | undefined;

    if (supabaseUrl && supabaseAnonKey && authHeader) {
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const accessToken = authHeader.replace(/^Bearer\s+/i, "");
      const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
      if (!userError && userData.user) {
        userId = userData.user.id;
        const publishedConfig = await readPublishedCouncilConfig(supabase, input);
        runtimeConfig = {
          template: publishedConfig.template,
          source: publishedConfig.source,
          configVersionId: publishedConfig.configVersionId,
          configVersion: publishedConfig.configVersion ?? input.councilVersion
        };
      } else {
        persistenceStatus = "auth_error";
      }
    }

    // Owner decision 2026-10-31: AI Council needs a signed-in account and follows the shared daily allowance.
    if (!supabase || !userId) return jsonResponse({ error: "sign_in_required", message: "Sign in to use AI Council." }, 401);
    // A safety message is answered before the allowance, so it never uses the day's council.
    const redirect = safetyRedirectFor(userMessage, language);
    if (redirect) {
      await supabase.from("safety_events").insert({
        user_id: userId,
        feature: "chat",
        reason: "blocked_topic",
        summary: `ai_council safety redirect: ${redirect.signal}`,
        status: "open"
      });
      return jsonResponse({ turns: [], safety: redirect.safety, safetyText: redirect.text, moderationStatus: "blocked", persistenceStatus: "skipped" });
    }
    // Emergency switch from Admin; a safety reply above still answers while Council rests.
    if (await featurePaused(supabase, "ai_council")) return jsonResponse(featurePausedBody, 503);
    const isOpening = (input.sanitizedHistory ?? []).length === 0;
    // Admin A4: the active ai_feature_configs row may set councils per day (quota_daily) and follow-ups per council.
    const featureConfig = await readActiveFeatureConfig("ai_council");
    const councilDefaults = accountTierPolicy.council ?? { dailyCouncils: 1, followUpsPerCouncil: 4 };
    const councilLimits = {
      dailyCouncils: configuredDailyLimit(featureConfig, councilDefaults.dailyCouncils),
      followUpsPerCouncil: featureConfig?.followUps ?? councilDefaults.followUpsPerCouncil
    };
    // Read one event more than the day's total allowance so a configured limit above 50 events is still enforced (default 5).
    const { data: todaysEvents, error: usageReadError } = await supabase.from("usage_events")
      .select("metadata")
      .eq("user_id", userId)
      .eq("event_name", "ai_council_turn_generated")
      .gte("created_at", localDayStart().toISOString())
      .limit(Math.max(50, councilLimits.dailyCouncils * (1 + councilLimits.followUpsPerCouncil) + 1));
    if (usageReadError || !todaysEvents) return jsonResponse({ error: "usage_check_unavailable", message: "Usage could not be checked. Try again shortly." }, 503);
    const allowance = councilAllowance(todaysEvents as Array<{ metadata?: { opening?: boolean } | null }>, isOpening, { ...accountTierPolicy, council: councilLimits });
    if (allowance.allowed === false) return jsonResponse({ error: allowance.reason, message: "You have reached today's AI Council limit. Please return tomorrow." }, 429);

    const runtimePersonas = await runtimePersonasFromTemplate(supabase, selectedPersonas, runtimeConfig.template.rosterSlugs);
    const maxGuides = Math.max(2, Math.min(runtimeConfig.template.maxGuidesPerTurn ?? runtimePersonas.length, 4));
    const selectedRuntimePersonas = runtimePersonas.slice(0, maxGuides);
    const fallbackTurns = selectedRuntimePersonas.map((persona, index) => buildTurn(persona, userMessage, language, index, selectedRuntimePersonas[index - 1]));
    // Admin A5: configured guide from prompt_versions (ai_council) with the prompt-library fallback, then locked rules.
    const systemPrompt = await resolveGlobalPrompt(supabase, "ai_council", language);
    const systemPromptMetadata = globalPromptMetadata(systemPrompt);
    // Owner request 14/11: Admin may switch data blocks off or shorten them (ai_context_configs); defaults = today.
    // Crisis screening above already ran on the full question; the allowance still counts the app's history.
    const contextPolicy = await contextPolicyFor("ai_council");
    const dataPolicy = userDataPolicy(contextPolicy);
    // AI-05: user context goes in the data block, history is bounded on the server.
    const sanitizedHistory = blockEnabled(contextPolicy, "history")
      ? boundCouncilHistory(input.sanitizedHistory, { turns: blockLimit(contextPolicy, "history", "turns"), chars: blockLimit(contextPolicy, "history", "chars") })
      : [];
    const contextSent = userDataValues({ language, nickname: input.userContext?.nickname, goals: input.userContext?.goals, tone: input.userContext?.tone, policy: dataPolicy }).values;
    const generation = await generateWithModelRoute({
      feature: "ai_council",
      deadlineMs: featureConfig?.deadlineMs,
      // Never below the feature floor; rises with the enabled blocks' data class.
      dataClass: contextPolicy.dataClass,
      supabase,
      traceContext: {
        userId,
        request: req,
        metadata: {
          promptVersionId,
          councilVersion: input.councilVersion ?? null,
          councilContractVersion: councilContract.version,
          configVersionId: runtimeConfig.configVersionId ?? null,
          configSource: runtimeConfig.source,
          templateId: runtimeConfig.template.id ?? null,
          guideCount: selectedRuntimePersonas.length,
          meetingMode: runtimeConfig.template.meetingMode ?? null,
          synthesisMode: runtimeConfig.template.synthesisMode ?? null,
          ...systemPromptMetadata,
          nicknameSent: "nickname" in contextSent,
          goalCount: Array.isArray(contextSent.goals) ? contextSent.goals.length : 0,
          historyTurns: sanitizedHistory.length,
          ...contextPolicyMetadata(contextPolicy)
        }
      },
      system: assembleCouncilSystem(systemPrompt),
      messages: [
        {
          role: "user",
          content: councilUserMessage({
            language,
            userContext: input.userContext,
            dataPolicy,
            request: {
              language,
              userMessage,
              selectedPersonas: selectedRuntimePersonas.map((persona) => ({
                id: persona.id,
                slug: persona.slug,
                name: localize(persona.name, language, "Guide"),
                displayRole: localize(persona.displayRole, language, "")
              })),
              sanitizedHistory,
              template: runtimeConfig.template
            }
          })
        }
      ],
      fallbackText: JSON.stringify({
        turns: fallbackTurns.map(({ personaId, text, lens, kind, replyToPersonaId }) => ({ personaId, text, lens, kind, replyToPersonaId })),
        transcriptSummary: `${fallbackTurns.length} guides responded to one ${runtimeConfig.template.meetingMode ?? "council"} turn with sanitized context only.`,
        synthesis: fallbackSynthesis(language, fallbackTurns)
      }),
      safetyText: userMessage
    });
    const parsedCouncil = parseCouncilOutput(generation.text, fallbackTurns, selectedRuntimePersonas, language);
    const turns = parsedCouncil.turns;
    const transcriptSummary = parsedCouncil.transcriptSummary ?? `${turns.length} guides responded to one ${runtimeConfig.template.meetingMode ?? "council"} turn with sanitized context only.`;

    if (supabase && userId) {
        if (generation.moderationStatus === "blocked") {
          await supabase.from("safety_events").insert({
            user_id: userId,
            feature: "chat",
            reason: "blocked_topic",
            summary: `ai_council blocked: ${generation.safetyReason ?? "safety_filter"}`,
            status: "open"
          });
        }
        const slugs = runtimePersonas.map((persona) => persona.slug);
        const { data: personaRows } = slugs.length
          ? await supabase.from("personas").select("id, slug").in("slug", slugs)
          : { data: [] };
        const typedPersonaRows = (personaRows ?? []) as unknown as Array<{ id: string; slug: string }>;
        const personaIdBySlug = new Map(typedPersonaRows.map((row) => [row.slug, row.id]));
        const { data: sessionData, error: sessionError } = await supabase
          .from("chat_sessions")
          .insert({
            user_id: userId,
            title: userMessage.slice(0, 80),
            session_kind: "ai_council",
            council_config_version: runtimeConfig.configVersion ?? null,
            council_config_version_id: runtimeConfig.configVersionId ?? null,
            council_template_key: runtimeConfig.template.id ?? null,
            transcript_summary: {
              summary: transcriptSummary,
              guideCount: turns.length,
              templateId: runtimeConfig.template.id ?? null,
              meetingMode: runtimeConfig.template.meetingMode ?? null,
              synthesisMode: runtimeConfig.template.synthesisMode ?? null,
              synthesis: parsedCouncil.synthesis,
              outputContract: runtimeConfig.template.outputContract,
              configSource: runtimeConfig.source
            }
          })
          .select("id")
          .single();
        const session = sessionData as { id?: string } | null;

        if (!sessionError && session?.id) {
          remoteSessionId = session.id;
          const rosterRows = runtimePersonas
            .map((persona) => personaIdBySlug.get(persona.slug))
            .filter(Boolean)
            .map((personaId) => ({ session_id: session.id, persona_id: personaId }));
          if (rosterRows.length) await supabase.from("chat_session_personas").insert(rosterRows);

          const councilRoundId = crypto.randomUUID();
          const messageRows = [
            {
              session_id: session.id,
              user_id: userId,
              role: "user",
              content: userMessage,
              language,
              moderation_status: "passed",
              council_round_id: councilRoundId,
              output_schema: outputSchema
            },
            ...turns.map((turn: CouncilTurn) => {
              const persona = runtimePersonas.find((candidate) => candidate.id === turn.personaId);
              const replyToPersona = runtimePersonas.find((candidate) => candidate.id === turn.replyToPersonaId);
              return {
                session_id: session.id,
                user_id: userId,
                persona_id: persona ? personaIdBySlug.get(persona.slug) ?? null : null,
                role: "guide",
                content: turn.text,
                language,
                moderation_status: "not_reviewed",
                council_round_id: councilRoundId,
                response_lens: turn.lens,
                council_sequence: turn.order + 1,
                council_turn_kind: turn.kind,
                council_reply_to_persona_id: replyToPersona ? personaIdBySlug.get(replyToPersona.slug) ?? null : null,
                output_schema: outputSchema
              };
            })
          ];
          const { error: messageError } = await supabase.from("chat_messages").insert(messageRows);
          await supabase.from("usage_events").insert({
            user_id: userId,
            event_name: "ai_council_turn_generated",
            feature: "ai_council",
            metadata: {
              opening: isOpening,
              guideCount: turns.length,
              promptVersionId,
              outputSchema,
              configVersionId: runtimeConfig.configVersionId ?? null,
              configSource: runtimeConfig.source,
              templateId: runtimeConfig.template.id ?? null,
              meetingMode: runtimeConfig.template.meetingMode ?? null,
              synthesisMode: runtimeConfig.template.synthesisMode ?? null,
              persistence: messageError ? "message_error" : "stored",
              model: sanitizeProviderMetadata(generation),
              modelOutputParsed: parsedCouncil.parsed,
              ...systemPromptMetadata
            }
          });
          persistenceStatus = messageError ? "message_error" : "stored";
        } else {
          persistenceStatus = "session_error";
        }
    }

    // Turns carry database persona ids; answer with the ids the app sent so each turn shows its own guide.
    const appIdBySlug = new Map(selectedPersonas.map((persona) => [persona.slug, persona.id]));
    const appIdByRuntimeId = new Map(runtimePersonas.map((persona) => [persona.id, appIdBySlug.get(persona.slug) ?? persona.id]));
    const appTurns = turns.map((turn) => ({
      ...turn,
      personaId: appIdByRuntimeId.get(turn.personaId) ?? turn.personaId,
      replyToPersonaId: turn.replyToPersonaId ? appIdByRuntimeId.get(turn.replyToPersonaId) ?? turn.replyToPersonaId : turn.replyToPersonaId
    }));
    return jsonResponse({
      schemaVersion: outputSchema,
      councilContractVersion: councilContract.version,
      turns: appTurns,
      suggestedFollowUps: parsedCouncil.suggestedFollowUps ?? (
        language === "vi"
          ? ["Mình nên hỏi guide nào sâu hơn?", "Bước nhỏ nào ít rủi ro nhất?", "Điều gì là nhu cầu thật của mình?"]
          : ["Which guide should I ask more deeply?", "Which small step has the lowest risk?", "What is my real need here?"]),
      transcriptSummary,
      synthesis: parsedCouncil.synthesis,
      promptVersionId,
      councilConfigVersionId: runtimeConfig.configVersionId ?? null,
      councilConfigSource: runtimeConfig.source,
      councilTemplateId: runtimeConfig.template.id ?? null,
      meetingMode: runtimeConfig.template.meetingMode ?? null,
      synthesisMode: runtimeConfig.template.synthesisMode ?? null,
      moderationStatus: generation.moderationStatus,
      model: sanitizeProviderMetadata(generation),
      persistenceStatus,
      remoteSessionId
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
