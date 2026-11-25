// ai-numerology-message: Bản đồ số "Lời nhắn riêng" (Owner approval 2026-11-25, items B2-B6). index.ts wires the real
// Supabase client, model router and stores; handler_test.ts injects fakes. This module has no remote imports.
//
// Order, all before the request body is read:
//   1. verified sign-in (authenticateAiRequest: no anonymous account, no body read);
//   2. strict switch numerology_private_message (missing row, read error or enabled=false: 503 feature_paused);
//   3. content gate: numerology-blocks.json must be approved with a named reviewer (503 content_not_approved);
//   4. Premium: a paid entitlement or the shared tier switch (403 premium_required; unreadable: 503);
//   5. quota: 1 delivered message per Vietnam day plus 2 failed attempts (usage_events; 429 daily_limit_reached).
// Then the bounded JSON body is read and checked strictly (unknown key, bad number or a block id that does not follow from
// the numbers: 400). The server resolves the block text itself; the model only picks and joins approved blocks. Its answer
// is checked inside the router (fallback model once) and never replaced by canned text: a failure is 503 message_unavailable
// and the attempt stays counted. No message text and no request body is stored: usage_events keeps counts and model data.
import type { ModelGenerationResult, ModelRoute } from "../_shared/model-provider.ts";
import { sanitizeProviderMetadata } from "../_shared/model-provider.ts";
import { AiRequestError, authenticateAiRequest, readBoundedJson } from "../_shared/ai-request-guard.ts";
import { featurePausedBody } from "../_shared/feature-switch.ts";
import { globalPromptMetadata, type GlobalPrompt } from "../_shared/global-prompt.ts";
import { checkNumerologyRequest, numerologyContentApproved, resolveNumerologyBlocks, type NumerologyLanguage } from "../_shared/numerology-blocks.ts";
import {
  assembleNumerologyMessageSystem, checkNumerologyMessageText, NUMEROLOGY_MESSAGE_PROMPT_VERSION, numerologyMessageOutputSchema,
  numerologyMessageUserContent
} from "../_shared/numerology-message-prompt.ts";
import type { DailyAttemptResult } from "../_shared/daily-attempts.ts";
import { localDayStart } from "../_shared/account-tier-policy.ts";
import { isIncompleteAnswerFinishReason } from "../../../packages/ai-contracts/answer-provenance.ts";

export const FEATURE = "numerology_private_message";
export const ATTEMPT_EVENT = "numerology_message_attempted";
export const DELIVERED_EVENT = "numerology_message_generated";

// Structural copy of model-router's ModelTraceFinalization (kept local so tests need no provider imports).
export type NumerologyTraceFinalization = { status: "ok" | "blocked" | "fallback" | "error"; output: Record<string, unknown> };
export type NumerologyGeneration = ModelGenerationResult & { finalizeTrace?: (input: NumerologyTraceFinalization) => Promise<void> };
export type NumerologyGenerateInput = {
  feature: typeof FEATURE; route?: ModelRoute; strictTraceRedaction: true; deferTraceFlush: true;
  traceContext: { userId: string; request: Request; metadata: Record<string, unknown> };
  system: string; messages: Array<{ role: "user"; content: string }>; fallbackText: "";
  acceptOutput: (text: string, finishReason?: string) => string | undefined;
};
export type NumerologyMessageDeps = {
  authenticate: (token: string) => Promise<{ id: string; isAnonymous?: boolean } | null>;
  /** Strict switch (featureEnabledStrict): true only for an explicit enabled=true row. */
  featureEnabled: () => Promise<boolean>;
  /** Server tier of the signed-in account; throws when the subscription rows cannot be read. */
  readTier: (userId: string) => Promise<"premium" | "free">;
  /** claimDeliveredAttempt: one delivered message, then the failed-attempt allowance, per Vietnam day. */
  claimAttempt: (userId: string) => Promise<{ result: DailyAttemptResult; reason?: "delivered" | "attempts" }>;
  resolvePrompt: (language: NumerologyLanguage) => Promise<GlobalPrompt>;
  resolveRoute: (userId: string, language: NumerologyLanguage) => Promise<{ route: ModelRoute; experiment: { campaignId: string; variant: string } | null }>;
  generate: (input: NumerologyGenerateInput) => Promise<NumerologyGeneration>;
  recordUsage: (row: Record<string, unknown>) => Promise<boolean>;
  recordSafetyEvent: (row: Record<string, unknown>) => Promise<void>;
};
export type NumerologyHandlerOptions = {
  now?: () => Date;
  bodyClock?: () => number;
  /** Tests only: the content gate; production reads numerology-blocks.json. */
  contentApproved?: () => boolean;
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

export function nextVietnamDay(now: Date): string {
  return new Date(localDayStart(now).getTime() + 24 * 3600 * 1000).toISOString();
}

export function createNumerologyMessageHandler(configure: (req: Request) => NumerologyMessageDeps | null, options: NumerologyHandlerOptions = {}) {
  const now = options.now ?? (() => new Date());
  const contentApproved = options.contentApproved ?? (() => numerologyContentApproved());

  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    let finalize: NumerologyGeneration["finalizeTrace"];
    try {
      const deps = configure(req);
      const { userId } = await authenticateAiRequest(req, {
        configured: Boolean(deps),
        authenticate: async (token) => deps ? await deps.authenticate(token) : null
      });
      if (!deps) return json({ error: "ai_unavailable" }, 503);
      if (!await deps.featureEnabled()) return json(featurePausedBody, 503);
      if (!contentApproved()) return json({ error: "content_not_approved" }, 503);
      let tier: "premium" | "free";
      try { tier = await deps.readTier(userId); } catch { return json({ error: "access_check_unavailable" }, 503); }
      if (tier !== "premium") return json({ error: "premium_required" }, 403);
      const nextMessageAt = nextVietnamDay(now());
      const claim = await deps.claimAttempt(userId);
      if (claim.result === "limit_reached") return json({ error: "daily_limit_reached", reason: claim.reason ?? "attempts", nextMessageAt }, 429);
      if (claim.result !== "allowed") return json({ error: "usage_check_unavailable" }, 503);

      // Only now is the body read: bounded size and time, JSON object, then the strict contract.
      const input = await readBoundedJson(req, options.bodyClock ?? (() => performance.now()));
      const checked = checkNumerologyRequest(input);
      if (!checked.request) return json({ error: "invalid_request", reason: checked.error, attemptCounted: true }, 400);
      const request = checked.request;
      const blocks = resolveNumerologyBlocks(request.blockIds, request.language);
      if (!blocks) return json({ error: "invalid_request", reason: "block_not_found", attemptCounted: true }, 400);
      const sentIds = blocks.map((block) => block.id);

      const prompt = await deps.resolvePrompt(request.language);
      const { route, experiment } = await deps.resolveRoute(userId, request.language);
      const generation = await deps.generate({
        feature: FEATURE, route, strictTraceRedaction: true, deferTraceFlush: true,
        traceContext: {
          userId, request: req,
          metadata: {
            feature: FEATURE, responseSchema: numerologyMessageOutputSchema, promptVersion: NUMEROLOGY_MESSAGE_PROMPT_VERSION,
            language: request.language, blockCount: sentIds.length, nameNumbersSent: request.numbers.expression !== undefined,
            ...globalPromptMetadata(prompt), ...(experiment ? { campaignId: experiment.campaignId, variant: experiment.variant } : {})
          }
        },
        system: assembleNumerologyMessageSystem(prompt, request.language),
        messages: [{ role: "user", content: numerologyMessageUserContent({ language: request.language, numbers: request.numbers, blocks }) }],
        // No canned message: an empty fallback never passes the check, so a failure is 503 message_unavailable.
        fallbackText: "",
        acceptOutput: (text, finishReason) => isIncompleteAnswerFinishReason(finishReason) ? "incomplete" : checkNumerologyMessageText(text, sentIds).reason
      });
      finalize = generation.finalizeTrace;
      const model = sanitizeProviderMetadata(generation);
      if (generation.moderationStatus === "blocked") {
        await deps.recordSafetyEvent({ user_id: userId, feature: "chat", reason: "blocked_topic",
          summary: `numerology_private_message blocked: ${generation.safetyReason ?? "safety_filter"}`, status: "open" });
        await finalize?.({ status: "blocked", output: { stage: "response", persistenceStatus: "skipped", usageRecorded: false } });
        finalize = undefined;
        return json({ error: "message_unavailable", moderationStatus: "blocked", attemptCounted: true, retryable: false }, 503);
      }
      const check = generation.moderationStatus === "passed" && !isIncompleteAnswerFinishReason(generation.finishReason)
        ? checkNumerologyMessageText(generation.text, sentIds) : undefined;
      if (!check?.output) {
        await finalize?.({ status: "error", output: { stage: check ? "validation" : "response", persistenceStatus: "skipped", usageRecorded: false,
          ...(check?.reason ? { rejection: { code: check.reason } } : {}) } });
        finalize = undefined;
        return json({ error: "message_unavailable", attemptCounted: true, retryable: true, nextMessageAt }, 503);
      }
      // Counts and model data only: no message text, no numbers, no block ids are stored.
      const usageRecorded = await deps.recordUsage({
        user_id: userId, event_name: DELIVERED_EVENT, feature: FEATURE,
        metadata: { promptVersion: NUMEROLOGY_MESSAGE_PROMPT_VERSION, language: request.language, blockCount: check.output.blockIds.length, model,
          ...(experiment ? { campaignId: experiment.campaignId, variant: experiment.variant } : {}) }
      });
      await finalize?.({ status: "ok", output: { stage: "response", validationStatus: "validated", persistenceStatus: usageRecorded ? "stored" : "usage_error", usageRecorded } });
      finalize = undefined;
      return json({
        message: check.output.message, blockIds: check.output.blockIds, language: request.language, source: "backend",
        promptVersion: NUMEROLOGY_MESSAGE_PROMPT_VERSION, responseSchema: numerologyMessageOutputSchema, model, nextMessageAt,
        persistenceStatus: usageRecorded ? "stored" : "usage_error", createdAt: now().toISOString()
      });
    } catch (error) {
      await finalize?.({ status: "error", output: { stage: "request", errorCode: "service_unavailable" } }).catch(() => undefined);
      if (error instanceof AiRequestError) return json({ error: error.code }, error.status);
      return json({ error: "service_unavailable" }, 503);
    }
  };
}
