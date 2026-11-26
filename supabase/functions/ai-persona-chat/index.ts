import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { generateWithModelRoute } from "../_shared/model-router.ts";
import { safetyRedirectFor } from "../_shared/crisis-safety.ts";
import { featurePaused, featurePausedBody } from "../_shared/feature-switch.ts";
import { type ModelGenerationResult, sanitizeProviderMetadata } from "../_shared/model-provider.ts";
import { assemblePersonaPromptStack } from "../_shared/persona-prompt-assembler.ts";
import { contextPolicyFor, contextPolicyMetadata } from "../_shared/context-config.ts";
import { personaModelMessages } from "./persona-context.ts";
import { AiRequestError, aiAuthUserOrUnavailable, guardAiJsonRequest } from "../_shared/ai-request-guard.ts";
import { claimDailyAttempt } from "../_shared/daily-attempts.ts";
import { accountTierPolicy } from "../_shared/account-tier-policy.ts";
import { configuredDailyLimit, readActiveFeatureConfig } from "../_shared/feature-config.ts";
import { readPersonaTierConfig, resolvePersonaTier, tierDeadlineMs, tierMetadata, tierRoute } from "../_shared/persona-model-tiers.ts";
import { createSseStream, singleEventResponse, sseResponse, wantsEventStream } from "./stream.ts";

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
  /** Opt in to Server-Sent Events (docs/contracts/persona-chat-streaming.md); `Accept: text/event-stream` does the same. */
  stream?: boolean;
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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept"
};

/** Knowledge tiers send up to 12 history turns of 2,500 characters; Vietnamese text takes more than one byte a letter. */
const PERSONA_CHAT_MAX_REQUEST_BYTES = 96 * 1024;

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
      maxBytes: PERSONA_CHAT_MAX_REQUEST_BYTES,
      authenticate: async (token) => {
        if (!supabase) return null;
        const { data, error } = await supabase.auth.getUser(token);
        return aiAuthUserOrUnavailable(data?.user, error);
      }
    });
    if (!supabase) return jsonResponse({ error: "ai_unavailable" }, 503);
    const input = requestInput as PersonaInput;
    // Old builds never ask for a stream and keep the single JSON reply below.
    const stream = wantsEventStream(req, input);
    const language = input.language ?? "vi";
    const text = input.text?.trim();
    const personaName = localize(input.persona?.name, language, "Nilaza Guide");
    const role = localize(input.persona?.displayRole, language, language === "vi" ? "người dẫn lối phản chiếu" : "reflective guide");

    if (!text) return jsonResponse({ error: "text is required" }, 400);

    // Crisis screening runs first, on the full message, before any model call and for every tier.
    const redirect = safetyRedirectFor(text, language);
    if (redirect) {
      await supabase.from("safety_events").insert({
        user_id: userId,
        feature: "chat",
        reason: "blocked_topic",
        summary: `persona_chat safety redirect: ${redirect.signal}`,
        status: "open"
      });
      const safetyBody = { text: redirect.text, moderationStatus: "blocked", safety: redirect.safety, persistenceStatus: "skipped" };
      return stream ? singleEventResponse("done", safetyBody, corsHeaders) : jsonResponse(safetyBody);
    }
    // Emergency switch from Admin; a safety reply above still answers while chat rests.
    if (await featurePaused(supabase, "persona_chat")) return jsonResponse(featurePausedBody, 503);
    // AI-02: Chat+Oracle 5 model attempts per local day (shared counter); safety replies above stay free.
    // Admin A4: the active ai_feature_configs row may set another limit and a total model deadline.
    const featureConfig = await readActiveFeatureConfig("persona_chat");
    const attempt = await claimDailyAttempt(supabase as never, {
      userId, eventName: "persona_message_attempted", feature: "persona_chat",
      limit: configuredDailyLimit(featureConfig, accountTierPolicy.personaChat?.dailyLimit ?? 5)
    });
    if (attempt === "limit_reached") return jsonResponse({ error: "daily_limit_reached" }, 429);
    if (attempt === "unavailable") return jsonResponse({ error: "usage_check_unavailable" }, 503);

    // Owner 25/11: each persona has a model tier (persona-model-tiers.ts). The standard tier keeps the active route,
    // the feature deadline, today's history caps and the concise output contract; knowledge tiers bring their own.
    const tierConfig = await readPersonaTierConfig();
    const tier = resolvePersonaTier(tierConfig, input.persona);
    const tierDeadline = tierDeadlineMs(tier, tierConfig.platform, stream);
    const tierModelRoute = tierRoute(tier, tierDeadline);

    // Owner request 14/11: Admin may switch data blocks off or shorten them (ai_context_configs); defaults = today.
    // Crisis screening above already ran on the full message and never depends on this config.
    const contextPolicy = await contextPolicyFor("persona_chat");
    const modelMessages = personaModelMessages({
      language,
      text,
      history: input.sanitizedHistory,
      userContext: input.userContext,
      policy: contextPolicy,
      tierHistory: tier.history ?? null
    });
    const promptStack = await assemblePersonaPromptStack({
      supabase,
      language,
      persona: input.persona,
      userContext: input.userContext,
      outputStyle: tier.outputStyle
    });

    const fallbackReply =
      language === "vi"
        ? `${personaName} (${role}) đang tạm phản hồi theo hướng an toàn trong khi kết nối AI được khôi phục: hãy gọi tên cảm xúc chính, tách điều bạn biết khỏi điều bạn đang đoán, rồi chọn một bước nhỏ ít rủi ro để thử.`
        : `${personaName} (${role}) is temporarily using a safe response while the AI connection is restored: name the main feeling, separate what you know from what you are guessing, then choose one small low-risk next step.`;
    const promptVersionId = promptStack.promptVersionId;
    const knowledgeMetadata = {
      outputStyle: promptStack.outputStyle,
      knowledgeBriefId: promptStack.knowledgeBriefId ?? null,
      knowledgeBriefVersion: promptStack.knowledgeBriefVersion ?? null,
      knowledgeBriefStatus: promptStack.knowledgeBriefStatus ?? null
    };
    const generate = (onDelta?: (text: string) => void) => generateWithModelRoute({
      feature: "persona_chat",
      // A knowledge tier brings its own step chain and total deadline; the standard tier keeps the feature deadline.
      ...(tierModelRoute
        ? { route: tierModelRoute, ...(tier.costCapMicro !== undefined ? { costCapMicro: tier.costCapMicro } : {}) }
        : { deadlineMs: featureConfig?.deadlineMs }),
      ...(onDelta ? { onDelta, streamDeadlineMs: tierDeadline } : {}),
      // Never below the feature floor; rises with the enabled blocks' data class.
      dataClass: contextPolicy.dataClass,
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
          sessionContinuation: Boolean(input.sessionId && uuidPattern.test(input.sessionId)),
          stream,
          ...tierMetadata(tier, tierDeadline),
          ...knowledgeMetadata,
          ...contextPolicyMetadata(contextPolicy)
        }
      },
      system: promptStack.assembledSystemPrompt,
      // E3 / AI-05: history, then one user message: data block, handoff block, the message (persona-context.ts).
      messages: modelMessages,
      fallbackText: fallbackReply,
      safetyText: text
    });

    const modelMetadata = (generation: ModelGenerationResult) => ({
      ...sanitizeProviderMetadata(generation),
      ...(stream ? { streamed: generation.streamed === true, streamInterrupted: generation.streamInterrupted === true } : {})
    });

    // Saves the turn and writes usage_events exactly once, whatever the transport.
    const persistTurn = async (generation: ModelGenerationResult): Promise<{ persistenceStatus: string; sessionId?: string }> => {
      const reply = generation.text;
      const moderationStatus = generation.moderationStatus;
      const usageMetadata = {
        personaSlug: input.persona?.slug ?? null,
        promptVersionId,
        promptStackSource: promptStack.source,
        personaSkillVersion: promptStack.personaSkillVersion ?? null,
        personaSkillPromptVersionId: promptStack.personaSkillUuid ?? null,
        methodPackId: promptStack.methodPackId,
        methodPackVersion: promptStack.methodPackVersion,
        clientRequestId: input.clientRequestId ?? null,
        stream,
        ...tierMetadata(tier, tierDeadline),
        ...knowledgeMetadata,
        model: modelMetadata(generation)
      };

      if (moderationStatus === "blocked") {
        await supabase.from("safety_events").insert({
          user_id: userId,
          feature: "chat",
          reason: "blocked_topic",
          summary: `persona_chat blocked: ${generation.safetyReason ?? "safety_filter"}`,
          status: "open"
        });
      }
      // Streaming: the model failed after part of the reply was shown. Nothing is saved to the chat history (the
      // person saw a broken reply and may retry), but the call and its cost are still recorded once.
      if (generation.streamInterrupted) {
        await supabase.from("usage_events").insert({
          user_id: userId,
          event_name: "persona_message_generated",
          feature: "persona_chat",
          metadata: { ...usageMetadata, persistence: "stream_interrupted", sessionId: null, sessionReused: false }
        });
        return { persistenceStatus: "skipped" };
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

      if (sessionError || !session?.id) return { persistenceStatus: "session_error" };

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
          ...usageMetadata,
          persistence: messageError ? "message_error" : "stored",
          sessionId: session.id,
          sessionReused: session.id === requestedSessionId
        }
      });
      return { persistenceStatus: messageError ? "message_error" : "stored", sessionId: session.id };
    };

    // The JSON reply of old builds; a stream sends the same object as its `done` event. New fields are additive.
    const replyBody = (generation: ModelGenerationResult, persisted: { persistenceStatus: string; sessionId?: string }) => ({
      text: generation.text,
      promptVersionId,
      moderationStatus: generation.moderationStatus,
      promptStack: {
        source: promptStack.source,
        globalPromptVersion: promptStack.globalPromptVersion ?? null,
        personaSkillVersion: promptStack.personaSkillVersion ?? null,
        personaSlug: promptStack.personaSlug ?? input.persona?.slug ?? null,
        methodPackId: promptStack.methodPackId,
        methodPackVersion: promptStack.methodPackVersion,
        outputStyle: promptStack.outputStyle,
        knowledgeBriefId: promptStack.knowledgeBriefId ?? null,
        knowledgeBriefVersion: promptStack.knowledgeBriefVersion ?? null
      },
      modelTier: { key: tier.key, label: localize(tier.label, language, tier.label.vi) },
      model: modelMetadata(generation),
      persistenceStatus: persisted.persistenceStatus,
      remoteSessionId: persisted.sessionId,
      methodPackId: promptStack.methodPackId,
      methodPackVersion: promptStack.methodPackVersion
    });

    if (!stream) {
      const generation = await generate();
      return jsonResponse(replyBody(generation, await persistTurn(generation)));
    }

    const { body, writer } = createSseStream();
    writer.send("meta", {
      modelTier: tier.key,
      modelTierLabel: localize(tier.label, language, tier.label.vi),
      outputStyle: promptStack.outputStyle,
      deadlineMs: tierDeadline,
      clientRequestId: input.clientRequestId ?? null
    });
    void (async () => {
      try {
        const generation = await generate((delta) => writer.send("delta", { text: delta }));
        const persisted = await persistTurn(generation);
        if (generation.streamInterrupted) {
          writer.send("error", { code: "stream_interrupted", retryable: true, persistenceStatus: persisted.persistenceStatus });
        } else {
          writer.send("done", replyBody(generation, persisted));
        }
      } catch {
        writer.send("error", { code: "internal_error", retryable: true });
      } finally {
        writer.close();
      }
    })();
    return sseResponse(body, corsHeaders);
  } catch (error) {
    if (error instanceof AiRequestError) return jsonResponse({ error: error.code }, error.status);
    return jsonResponse({ error: "invalid_request" }, 400);
  }
});
