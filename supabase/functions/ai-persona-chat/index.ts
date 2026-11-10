import { handoffContextBlock } from "../_shared/chat-handoff.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { generateWithModelRoute } from "../_shared/model-router.ts";
import { safetyRedirectFor } from "../_shared/crisis-safety.ts";
import { featurePaused, featurePausedBody } from "../_shared/feature-switch.ts";
import { sanitizeProviderMetadata } from "../_shared/model-provider.ts";
import { assemblePersonaPromptStack } from "../_shared/persona-prompt-assembler.ts";
import { AiRequestError, aiAuthUserOrUnavailable, guardAiJsonRequest } from "../_shared/ai-request-guard.ts";
import { claimDailyAttempt } from "../_shared/daily-attempts.ts";
import { accountTierPolicy } from "../_shared/account-tier-policy.ts";

type Language = "vi" | "en" | string;

type LocalizedText = {
  vi?: string;
  en?: string;
  [key: string]: string | undefined;
};

type PersonaInput = {
  language?: Language;
  persona?: {
    id?: string;
    slug?: string;
    name?: LocalizedText;
    displayRole?: LocalizedText;
    transparencyNote?: LocalizedText;
    sourceInspiration?: LocalizedText;
    type?: string;
  };
  text?: string;
  sessionId?: string;
  clientRequestId?: string;
  sanitizedHistory?: Array<{
    role?: "user" | "guide";
    text?: string;
  }>;
  userContext?: {
    goals?: string[];
    tone?: string;
    nickname?: string;
    handoffContext?: unknown;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeHistory(history: PersonaInput["sanitizedHistory"], currentText: string) {
  if (!Array.isArray(history)) return [] as Array<{ role: "user" | "assistant"; content: string }>;
  return history
    .slice(-8)
    .map((turn) => {
      const content = typeof turn?.text === "string" ? turn.text.replace(/\s+/g, " ").trim().slice(0, 800) : "";
      const role = turn?.role === "guide" ? "assistant" as const : "user" as const;
      return content ? { role, content } : null;
    })
    .filter((turn): turn is { role: "user" | "assistant"; content: string } => Boolean(turn))
    .filter((turn, index, turns) => !(index === turns.length - 1 && turn.role === "user" && turn.content === currentText));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    }) : null;
    const { input: requestInput, userId } = await guardAiJsonRequest(req, {
      configured: Boolean(supabase),
      authenticate: async (token) => {
        if (!supabase) return null;
        const { data, error } = await supabase.auth.getUser(token);
        return aiAuthUserOrUnavailable(data?.user, error);
      }
    });
    if (!supabase) return jsonResponse({ error: "ai_unavailable" }, 503);
    const input = requestInput as PersonaInput;
    const language = input.language ?? "vi";
    const text = input.text?.trim();
    const personaName = localize(input.persona?.name, language, "Nilaza Guide");
    const role = localize(input.persona?.displayRole, language, language === "vi" ? "người dẫn lối phản chiếu" : "reflective guide");

    if (!text) return jsonResponse({ error: "text is required" }, 400);

    const redirect = safetyRedirectFor(text, language);
    if (redirect) {
      await supabase.from("safety_events").insert({
        user_id: userId,
        feature: "chat",
        reason: "blocked_topic",
        summary: `persona_chat safety redirect: ${redirect.signal}`,
        status: "open"
      });
      return jsonResponse({ text: redirect.text, moderationStatus: "blocked", safety: redirect.safety, persistenceStatus: "skipped" });
    }
    // Emergency switch from Admin; a safety reply above still answers while chat rests.
    if (await featurePaused(supabase, "persona_chat")) return jsonResponse(featurePausedBody, 503);
    // AI-02: Chat+Oracle 5 model attempts per local day (Oracle has no model call yet); safety replies above stay free.
    const attempt = await claimDailyAttempt(supabase as never, {
      userId, eventName: "persona_message_attempted", feature: "persona_chat",
      limit: accountTierPolicy.personaChat?.dailyLimit ?? 5
    });
    if (attempt === "limit_reached") return jsonResponse({ error: "daily_limit_reached" }, 429);
    if (attempt === "unavailable") return jsonResponse({ error: "usage_check_unavailable" }, 503);

    const sanitizedHistory = sanitizeHistory(input.sanitizedHistory, text);
    // Analysis CH-06: context brought from Tarot or Astrology rides with each turn as a labelled block.
    const handoffBlock = handoffContextBlock(input.userContext?.handoffContext, language === "vi" ? "vi" : "en");
    const promptStack = await assemblePersonaPromptStack({
      supabase,
      language,
      persona: input.persona,
      userContext: input.userContext
    });

    const fallbackReply =
      language === "vi"
        ? `${personaName} (${role}) đang tạm phản hồi theo hướng an toàn trong khi kết nối AI được khôi phục: hãy gọi tên cảm xúc chính, tách điều bạn biết khỏi điều bạn đang đoán, rồi chọn một bước nhỏ ít rủi ro để thử.`
        : `${personaName} (${role}) is temporarily using a safe response while the AI connection is restored: name the main feeling, separate what you know from what you are guessing, then choose one small low-risk next step.`;
    const promptVersionId = promptStack.promptVersionId;
    const generation = await generateWithModelRoute({
      feature: "persona_chat",
      supabase,
      traceContext: {
        userId,
        request: req,
        metadata: {
          personaSlug: input.persona?.slug ?? null,
          promptVersionId,
          promptStackSource: promptStack.source,
          personaSkillVersion: promptStack.personaSkillVersion ?? null,
          methodPackId: promptStack.methodPackId,
          methodPackVersion: promptStack.methodPackVersion,
          clientRequestId: input.clientRequestId ?? null,
          sessionContinuation: Boolean(input.sessionId && uuidPattern.test(input.sessionId))
        }
      },
      system: promptStack.assembledSystemPrompt,
      messages: [
        ...sanitizedHistory,
        { role: "user", content: handoffBlock ? `${handoffBlock}\n\n${text}` : text }
      ],
      fallbackText: fallbackReply,
      safetyText: text
    });
    const reply = generation.text;
    const moderationStatus = generation.moderationStatus;

    let persistenceStatus = "skipped";

    if (moderationStatus === "blocked") {
      await supabase.from("safety_events").insert({
        user_id: userId,
        feature: "chat",
        reason: "blocked_topic",
        summary: `persona_chat blocked: ${generation.safetyReason ?? "safety_filter"}`,
        status: "open"
      });
    }
    const { data: personaRow } = input.persona?.slug
      ? await supabase.from("personas").select("id").eq("slug", input.persona.slug).maybeSingle()
      : { data: null };
    const personaId = personaRow?.id ?? null;
    let session: { id: string } | null = null;
    let sessionError: { message?: string } | null = null;
    const requestedSessionId = typeof input.sessionId === "string" && uuidPattern.test(input.sessionId) ? input.sessionId : undefined;

    if (requestedSessionId) {
      const existing = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("id", requestedSessionId)
        .eq("user_id", userId)
        .eq("session_kind", "persona_chat")
        .neq("status", "deleted")
        .maybeSingle();
      if (!existing.error && existing.data?.id) {
        const memberships = personaId
          ? await supabase.from("chat_session_personas").select("persona_id").eq("session_id", requestedSessionId)
          : { data: [] as Array<{ persona_id: string }> };
        const belongsToOtherPersona = personaId
          && Array.isArray(memberships.data)
          && memberships.data.length > 0
          && !memberships.data.some((row: { persona_id?: string }) => row.persona_id === personaId);
        if (!belongsToOtherPersona) session = existing.data as { id: string };
      }
    }

    if (!session) {
      const created = await supabase
        .from("chat_sessions")
        .insert({
          user_id: userId,
          title: text.slice(0, 80),
          session_kind: "persona_chat"
        })
        .select("id")
        .single();
      session = created.data as { id: string } | null;
      sessionError = created.error;
    }

    if (!sessionError && session?.id) {
      const sessionPatch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
      if (session.id !== requestedSessionId) sessionPatch.title = text.slice(0, 80);
      await supabase.from("chat_sessions")
        .update(sessionPatch)
        .eq("id", session.id)
        .eq("user_id", userId);
      if (personaId) {
        // A continued turn can revisit the same session/persona pair. The
        // join table is unique, so make this write idempotent instead of
        // turning every second message into a duplicate-key error.
        await supabase.from("chat_session_personas").upsert({
          session_id: session.id,
          persona_id: personaId
        }, { onConflict: "session_id,persona_id", ignoreDuplicates: true });
      }
      const { error: messageError } = await supabase.from("chat_messages").insert([
        {
          session_id: session.id,
          user_id: userId,
          persona_id: personaId,
          role: "user",
          content: text,
          language,
          moderation_status: "passed"
        },
        {
          session_id: session.id,
          user_id: userId,
          persona_id: personaId,
          role: "guide",
          content: reply,
          language,
          prompt_version_id: promptStack.globalPromptUuid ?? null,
          moderation_status: "not_reviewed"
        }
      ]);
      await supabase.from("usage_events").insert({
        user_id: userId,
        event_name: "persona_message_generated",
        feature: "persona_chat",
        metadata: {
          personaSlug: input.persona?.slug ?? null,
          persistence: messageError ? "message_error" : "stored",
          promptVersionId,
          promptStackSource: promptStack.source,
          personaSkillVersion: promptStack.personaSkillVersion ?? null,
          personaSkillPromptVersionId: promptStack.personaSkillUuid ?? null,
          methodPackId: promptStack.methodPackId,
          methodPackVersion: promptStack.methodPackVersion,
          clientRequestId: input.clientRequestId ?? null,
          sessionId: session.id,
          sessionReused: session.id === requestedSessionId,
          model: sanitizeProviderMetadata(generation)
        }
      });
      persistenceStatus = messageError ? "message_error" : "stored";
    } else {
      persistenceStatus = "session_error";
    }

    return jsonResponse({
      text: reply,
      promptVersionId,
      moderationStatus,
      promptStack: {
        source: promptStack.source,
        globalPromptVersion: promptStack.globalPromptVersion ?? null,
        personaSkillVersion: promptStack.personaSkillVersion ?? null,
        personaSlug: promptStack.personaSlug ?? input.persona?.slug ?? null,
        methodPackId: promptStack.methodPackId,
        methodPackVersion: promptStack.methodPackVersion
      },
      model: sanitizeProviderMetadata(generation),
      persistenceStatus,
      remoteSessionId: session?.id,
      methodPackId: promptStack.methodPackId,
      methodPackVersion: promptStack.methodPackVersion
    });
  } catch (error) {
    if (error instanceof AiRequestError) return jsonResponse({ error: error.code }, error.status);
    return jsonResponse({ error: "invalid_request" }, 400);
  }
});
