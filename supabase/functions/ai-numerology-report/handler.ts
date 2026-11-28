// ai-numerology-report: Bản đồ số "Báo cáo tổng hợp" (Owner decisions 2026-11-28, plan
// ASTRO_NUMEROLOGY_SYNTHESIS_TWO_SYSTEMS_PLAN_2026-11-28 section 4). Mirrors ai-numerology-message. index.ts wires the real
// Supabase client, model router and stores; handler_test.ts injects fakes. This module has no remote imports.
//
// Order, all before the request body is read:
//   1. verified sign-in (authenticateAiRequest: no anonymous account, no body read);
//   2. strict switch numerology_report (missing row, read error or enabled=false: 503 feature_paused);
//   3. content gate: numerology-blocks.json AND numerology-report.json approved with a named reviewer (503 content_not_approved);
//   4. Premium: a paid entitlement or the shared tier switch (403 premium_required; unreadable: 503);
//   5. quota: 1 delivered report per Vietnam day plus 2 failed attempts (usage_events; 429 daily_limit_reached).
// Then the bounded JSON body is read and checked strictly (unknown key, bad number, arrows that do not follow from the
// digits, or block ids that are not exactly the ones the numbers lead to: 400). The server resolves the block text itself.
// The model's answer is checked inside the router (fallback model once) and never replaced by canned text: a failure is
// 503 report_unavailable, it is not a delivered report, and it uses one of the failed-attempt allowances. The report is
// saved on the phone only: no report text and no request body is stored; usage_events keeps counts and model data.
import type { ModelGenerationResult, ModelRoute } from "../_shared/model-provider.ts";
import { sanitizeProviderMetadata } from "../_shared/model-provider.ts";
import { AiRequestError, authenticateAiRequest, readBoundedJson } from "../_shared/ai-request-guard.ts";
import { featurePausedBody } from "../_shared/feature-switch.ts";
import { globalPromptMetadata, type GlobalPrompt } from "../_shared/global-prompt.ts";
import {
  checkNumerologyReportRequest, numerologyReportContentApproved, resolveReportSections, type NumerologyLanguage
} from "../_shared/numerology-payload.ts";
import {
  assembleNumerologyReportSystem, checkNumerologyReportText, NUMEROLOGY_REPORT_PROMPT_VERSION, numerologyReportOutputSchema,
  numerologyReportUserContent
} from "../_shared/numerology-report-prompt.ts";
import type { DailyAttemptResult } from "../_shared/daily-attempts.ts";
import { localDayStart } from "../_shared/account-tier-policy.ts";
import { isIncompleteAnswerFinishReason } from "../../../packages/ai-contracts/answer-provenance.ts";

export const FEATURE = "numerology_report";
export const ATTEMPT_EVENT = "numerology_report_attempted";
export const DELIVERED_EVENT = "numerology_report_generated";
/**
 * Cost cap for one report's step chain, micro-USD (Owner 29/11/2026: Sonnet 5.5 first, budget 5 USD). The shared
 * default (20 000) would skip Sonnet, whose worst case is about 4 000 output tokens x 10 USD/M plus the input; the
 * per-feature Admin config does not cover this feature yet.
 */
export const NUMEROLOGY_REPORT_COST_CAP_MICRO = 100_000;

// Structural copy of model-router's ModelTraceFinalization (kept local so tests need no provider imports).
export type ReportTraceFinalization = { status: "ok" | "blocked" | "fallback" | "error"; output: Record<string, unknown> };
export type ReportGeneration = ModelGenerationResult & { finalizeTrace?: (input: ReportTraceFinalization) => Promise<void> };
export type ReportGenerateInput = {
  feature: typeof FEATURE; route?: ModelRoute; costCapMicro: number; strictTraceRedaction: true; deferTraceFlush: true;
  traceContext: { userId: string; request: Request; metadata: Record<string, unknown> };
  system: string; messages: Array<{ role: "user"; content: string }>; fallbackText: "";
  acceptOutput: (text: string, finishReason?: string) => string | undefined;
};
export type NumerologyReportDeps = {
  authenticate: (token: string) => Promise<{ id: string; isAnonymous?: boolean } | null>;
  /** Strict switch (featureEnabledStrict): true only for an explicit enabled=true row. */
  featureEnabled: () => Promise<boolean>;
  /** Server tier of the signed-in account; throws when the subscription rows cannot be read. */
  readTier: (userId: string) => Promise<"premium" | "free">;
  /** claimDeliveredAttempt: one delivered report, then the failed-attempt allowance, per Vietnam day. */
  claimAttempt: (userId: string) => Promise<{ result: DailyAttemptResult; reason?: "delivered" | "attempts" }>;
  resolvePrompt: (language: NumerologyLanguage) => Promise<GlobalPrompt>;
  resolveRoute: (userId: string, language: NumerologyLanguage) => Promise<{ route: ModelRoute; experiment: { campaignId: string; variant: string } | null }>;
  generate: (input: ReportGenerateInput) => Promise<ReportGeneration>;
  recordUsage: (row: Record<string, unknown>) => Promise<boolean>;
  recordSafetyEvent: (row: Record<string, unknown>) => Promise<void>;
};
export type NumerologyReportHandlerOptions = {
  now?: () => Date;
  bodyClock?: () => number;
  /** Tests only: the content gate; production reads numerology-blocks.json and numerology-report.json. */
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

export function createNumerologyReportHandler(configure: (req: Request) => NumerologyReportDeps | null, options: NumerologyReportHandlerOptions = {}) {
  const now = options.now ?? (() => new Date());
  const contentApproved = options.contentApproved ?? (() => numerologyReportContentApproved());

  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    let finalize: ReportGeneration["finalizeTrace"];
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
      const nextReportAt = nextVietnamDay(now());
      const claim = await deps.claimAttempt(userId);
      if (claim.result === "limit_reached") return json({ error: "daily_limit_reached", reason: claim.reason ?? "attempts", nextReportAt }, 429);
      if (claim.result !== "allowed") return json({ error: "usage_check_unavailable" }, 503);

      // Only now is the body read: bounded size and time, JSON object, then the strict contract.
      const input = await readBoundedJson(req, options.bodyClock ?? (() => performance.now()));
      const checked = checkNumerologyReportRequest(input);
      if (!checked.request) return json({ error: "invalid_request", reason: checked.error, attemptCounted: true }, 400);
      const request = checked.request;
      const sections = resolveReportSections(request);
      if (!sections) return json({ error: "invalid_request", reason: "block_not_found", attemptCounted: true }, 400);

      const prompt = await deps.resolvePrompt(request.language);
      const { route, experiment } = await deps.resolveRoute(userId, request.language);
      const generation = await deps.generate({
        feature: FEATURE, route, costCapMicro: NUMEROLOGY_REPORT_COST_CAP_MICRO, strictTraceRedaction: true, deferTraceFlush: true,
        traceContext: {
          userId, request: req,
          metadata: {
            feature: FEATURE, responseSchema: numerologyReportOutputSchema, promptVersion: NUMEROLOGY_REPORT_PROMPT_VERSION,
            language: request.language, sectionCount: sections.length, blockCount: request.blockIds.length,
            nameNumbersSent: request.numbers.expression !== undefined,
            ...globalPromptMetadata(prompt), ...(experiment ? { campaignId: experiment.campaignId, variant: experiment.variant } : {})
          }
        },
        system: assembleNumerologyReportSystem(prompt, request.language),
        messages: [{ role: "user", content: numerologyReportUserContent({ language: request.language, numbers: request.numbers, chart: request.chart, sections }) }],
        // No canned report: an empty fallback never passes the check, so a failure is 503 report_unavailable.
        fallbackText: "",
        acceptOutput: (text, finishReason) => isIncompleteAnswerFinishReason(finishReason) ? "incomplete" : checkNumerologyReportText(text, sections).reason
      });
      finalize = generation.finalizeTrace;
      const model = sanitizeProviderMetadata(generation);
      if (generation.moderationStatus === "blocked") {
        await deps.recordSafetyEvent({ user_id: userId, feature: "chat", reason: "blocked_topic",
          summary: `numerology_report blocked: ${generation.safetyReason ?? "safety_filter"}`, status: "open" });
        await finalize?.({ status: "blocked", output: { stage: "response", persistenceStatus: "skipped", usageRecorded: false } });
        finalize = undefined;
        return json({ error: "report_unavailable", moderationStatus: "blocked", attemptCounted: true, retryable: false }, 503);
      }
      const check = generation.moderationStatus === "passed" && !isIncompleteAnswerFinishReason(generation.finishReason)
        ? checkNumerologyReportText(generation.text, sections) : undefined;
      if (!check?.output) {
        await finalize?.({ status: "error", output: { stage: check ? "validation" : "response", persistenceStatus: "skipped", usageRecorded: false,
          ...(check?.reason ? { rejection: { code: check.reason, ...(check.sectionId ? { section: check.sectionId } : {}) } } : {}) } });
        finalize = undefined;
        return json({ error: "report_unavailable", attemptCounted: true, retryable: true, nextReportAt }, 503);
      }
      // Counts and model data only: no report text, no numbers, no block ids are stored on the server.
      const usageRecorded = await deps.recordUsage({
        user_id: userId, event_name: DELIVERED_EVENT, feature: FEATURE,
        metadata: { promptVersion: NUMEROLOGY_REPORT_PROMPT_VERSION, language: request.language, sectionCount: check.output.sections.length, model,
          ...(experiment ? { campaignId: experiment.campaignId, variant: experiment.variant } : {}) }
      });
      await finalize?.({ status: "ok", output: { stage: "response", validationStatus: "validated", persistenceStatus: usageRecorded ? "stored" : "usage_error", usageRecorded } });
      finalize = undefined;
      return json({
        sections: check.output.sections, questions: check.output.questions, language: request.language, source: "backend",
        promptVersion: NUMEROLOGY_REPORT_PROMPT_VERSION, responseSchema: numerologyReportOutputSchema, model, nextReportAt,
        persistenceStatus: usageRecorded ? "stored" : "usage_error", createdAt: now().toISOString()
      });
    } catch (error) {
      await finalize?.({ status: "error", output: { stage: "request", errorCode: "service_unavailable" } }).catch(() => undefined);
      if (error instanceof AiRequestError) return json({ error: error.code }, error.status);
      return json({ error: "service_unavailable" }, 503);
    }
  };
}
