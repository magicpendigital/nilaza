import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { generateWithModelRoute } from "../_shared/model-router.ts";
import { sanitizeProviderMetadata } from "../_shared/model-provider.ts";
import { assembleTarotSystem, tarotContentVersion, prepareTarotContext, resolveTarotPrompt, tarotPromptMetadata, tarotPromptTraceMetadata } from "../_shared/tarot-prompt.ts";
import { AiRequestError, aiAuthUserOrUnavailable, guardAiJsonRequest } from "../_shared/ai-request-guard.ts";

import { answerCorsHeaders, readAnswerCorrelation } from "../_shared/answer-provenance.ts";
import { answerProvenanceSchema, isIncompleteAnswerFinishReason, type AnswerProvenance } from "../../../packages/ai-contracts/answer-provenance.ts";
import { checkTarotOutputText, tarotOutputSchema } from "../../../packages/ai-contracts/tarot-output.ts";
import { writeAnswerReceipt } from "../_shared/answer-receipt.ts";
import { claimDailyAttempt } from "../_shared/daily-attempts.ts";
import { localDayStart, tarotDailyLimits } from "../_shared/account-tier-policy.ts";

type LocalizedText = {
  vi?: string;
  en?: string;
  [key: string]: string | undefined;
};

type TarotInput = {
  language?: "vi" | "en" | string;
  deck?: {
    id?: string;
    slug?: string;
    name?: LocalizedText;
  };
  topic?: string;
  spread?: string;
  question?: string;
  selectedCards?: Array<{
    id: string;
    name?: LocalizedText;
    reversed?: boolean;
    orientation?: "upright" | "reversed";
    spread?: string;
    positionKey?: string;
    positionLabel?: LocalizedText;
    reflectionQuestion?: LocalizedText;
  }>;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": answerCorsHeaders
};

function localize(value: LocalizedText | undefined, language: string, fallback: string) {
  if (!value) return fallback;
  return value[language] ?? value.en ?? value.vi ?? fallback;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let finalizeTrace: Awaited<ReturnType<typeof generateWithModelRoute>>["finalizeTrace"];
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
    let input;
    try { input = prepareTarotContext(requestInput); } catch { throw new AiRequestError(400, "invalid_tarot_input"); }
    // AI-02 (Owner 2026-11-04): one delivered AI reading per local day; failed attempts capped. Checked before any model work.
    const tarotLimits = tarotDailyLimits();
    const { count: deliveredToday, error: deliveredError } = await supabase.from("tarot_readings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("interpretation->>moderationStatus", "passed")
      .gte("created_at", localDayStart().toISOString());
    if (deliveredError || deliveredToday === null) return jsonResponse({ error: "usage_check_unavailable" }, 503);
    if (deliveredToday >= tarotLimits.delivered) return jsonResponse({ error: "daily_limit_reached" }, 429);
    const attempt = await claimDailyAttempt(supabase as never, {
      userId, eventName: "tarot_reading_attempted", feature: "tarot_reading", limit: tarotLimits.attempts
    });
    if (attempt === "limit_reached") return jsonResponse({ error: "daily_limit_reached" }, 429);
    if (attempt === "unavailable") return jsonResponse({ error: "usage_check_unavailable" }, 503);
    const language = input.language;
    const cards = input.selectedCards;
    const correlation = readAnswerCorrelation(req, "tarot_reading", language);

    const cardNames = cards.map((card) => localize(card.name, language, card.id)).join(", ");
    const summary =
      language === "vi"
        ? `Các lá đã chọn (${cardNames}) được diễn giải như một công cụ tự phản chiếu, không phải dự đoán chắc chắn. Hãy dùng trải bài này để nhìn rõ cảm xúc, nhu cầu và lựa chọn nhỏ tiếp theo.`
        : `The selected cards (${cardNames}) are interpreted as a self-reflection tool, not a certain prediction. Use this spread to clarify your feeling, need, and next small choice.`;
    const reflection =
      cards.map((card) => localize(card.reflectionQuestion, language, "")).find(Boolean) ||
      (language === "vi" ? "Điều gì trong mình đang xin được lắng nghe kỹ hơn?" : "What part of me is asking to be heard more carefully?");

    const prompt = await resolveTarotPrompt(supabase, language);
    const promptMetadata = tarotPromptMetadata(prompt);
    const promptVersionId = prompt.promptVersionId;
    const contentVersion = await tarotContentVersion();

    let persistenceStatus = "skipped";
    let remoteId: string | undefined;
    const generation = await generateWithModelRoute({
      feature: "tarot_reading",
      supabase,
      strictTraceRedaction: true,
      deferTraceFlush: true,
      traceContext: {
        userId,
        request: req,
        clientRequestId: correlation.clientRequestId,
        metadata: {
          ...correlation,
          responseSchema: tarotOutputSchema,
          contentVersion,
          deckSlug: input.deck?.slug ?? null,
          spread: input.spread ?? null,
          cardCount: cards.length,
          language,
          promptVersionId,
          ...tarotPromptTraceMetadata(prompt)
        }
      },
      system: assembleTarotSystem(prompt, language),
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            language,
            deck: input.deck ?? null,
            topic: input.topic ?? "open",
            spread: input.spread ?? "daily-one",
            question: input.question ?? null,
            selectedCards: cards
          })
        }
      ],
      fallbackText: JSON.stringify({ summary, reflection }),
      // LLM phase 0: a malformed primary answer tries the fallback model once before the canned text.
      acceptOutput: (text, finishReason) => isIncompleteAnswerFinishReason(finishReason)
        ? "incomplete" : checkTarotOutputText(text, language, cards.map(card => card.id)).reason
    });
    finalizeTrace = generation.finalizeTrace;
    const outputCheck = generation.moderationStatus === "passed" && !isIncompleteAnswerFinishReason(generation.finishReason)
      ? checkTarotOutputText(generation.text, language, cards.map(card => card.id)) : undefined;
    const validated = outputCheck?.output;
    const parsed = validated ?? { summary, reflection, sections: [] };
    const moderationStatus = generation.moderationStatus === "blocked" ? "blocked" : validated ? "passed" : "fallback";
    const provenance: AnswerProvenance = {
      schemaVersion: answerProvenanceSchema, feature: "tarot_reading", ...correlation, locale: language,
      sourceKind: moderationStatus === "passed" ? "ai" : moderationStatus === "blocked" ? "blocked" : "fallback",
      generatedAt: new Date().toISOString(), validationStatus: validated ? "validated" : generation.moderationStatus === "passed" ? "rejected" : "not_applicable",
      persistenceStatus: "unknown", promptVersionId, promptVersion: prompt.promptVersion, promptAssemblyVersion: promptMetadata.promptAssemblyVersion,
      routeVersionId: generation.routeVersionId, routeVersion: generation.routeVersion, traceId: generation.traceId,
      providerRequestId: generation.requestId, responseSchema: tarotOutputSchema, contentVersion,
    };

    if (generation.moderationStatus === "blocked") {
      await supabase.from("safety_events").insert({
        user_id: userId,
        feature: "tarot",
        reason: "blocked_topic",
        summary: `tarot_reading blocked: ${generation.safetyReason ?? "safety_filter"}`,
        status: "open"
      });
    }
    const { data: deckRow } = input.deck?.slug
      ? await supabase.from("tarot_decks").select("id").eq("slug", input.deck.slug).maybeSingle()
      : { data: null };
    const { data: reading, error: readingError } = await supabase
      .from("tarot_readings")
      .insert({
        user_id: userId,
        deck_id: deckRow?.id ?? null,
        topic: input.topic ?? "open",
        spread: input.spread ?? "daily-one",
        question: input.question ?? null,
        selected_cards: cards,
        interpretation: { ...parsed, ...promptMetadata, moderationStatus, provenance: { ...provenance, persistenceStatus: "stored" }, model: sanitizeProviderMetadata(generation) },
        prompt_version_id: prompt.promptRecordId,
        language,
        status: "completed"
      })
      .select("id")
      .single();

    let usageRecorded = false;
    try {
    const { error: usageError } = await supabase.from("usage_events").insert({
      user_id: userId,
      event_name: "tarot_reading_generated",
      feature: "tarot_reading",
      metadata: {
        deckSlug: input.deck?.slug ?? null,
        spread: input.spread ?? null,
        cardCount: cards.length,
        persistence: readingError ? "reading_error" : "stored",
        ...promptMetadata,
        model: sanitizeProviderMetadata(generation)
      }
    });
    usageRecorded = !usageError;
    } catch { /* Telemetry cannot discard an already persisted answer. */ }
    persistenceStatus = readingError ? "reading_error" : "stored";
    remoteId = reading?.id;
    provenance.persistenceStatus = readingError ? "failed" : "stored";
    provenance.remoteId = remoteId;
    await finalizeTrace?.({ status: readingError || provenance.validationStatus === "rejected" ? "error" : moderationStatus === "passed" ? "ok" : moderationStatus, output: { stage: readingError ? "persist" : provenance.validationStatus === "rejected" ? "validation" : "response", validationStatus: provenance.validationStatus, persistenceStatus: provenance.persistenceStatus, usageRecorded,
      // Content-free reason for a rejected answer (QA 2026-11-02: DeepSeek replies were rejected without a cause on record).
      ...(outputCheck?.reason ? { rejection: { code: outputCheck.reason } } : {}) } });
    const receipt = await writeAnswerReceipt({ ...provenance, userId, sectionIds: ["summary", "reflection", ...parsed.sections.map(section => section.key)] });
    if (receipt) {
      provenance.answerReceiptId = receipt.receiptId;
      if (remoteId && !readingError) {
        try {
          // Preserve the verified link when this reading is reopened on another device.
          await supabase.from("tarot_readings").update({
            interpretation: { ...parsed, ...promptMetadata, moderationStatus, provenance, model: sanitizeProviderMetadata(generation) }
          }).eq("id", remoteId).eq("user_id", userId);
        } catch { /* Receipt enrichment cannot discard the already saved answer. */ }
      }
    }

    return jsonResponse({
      summary: parsed.summary,
      reflection: parsed.reflection,
      sections: parsed.sections,
      ...promptMetadata,
      moderationStatus,
      provenance,
      model: sanitizeProviderMetadata(generation),
      persistenceStatus,
      remoteId
    });
  } catch (error) {
    await finalizeTrace?.({ status: "error", output: { stage: "request", errorCode: "service_unavailable" } });
    if (error instanceof AiRequestError) return jsonResponse({ error: error.code }, error.status);
    return jsonResponse({ error: "service_unavailable" }, 503);
  }
});
