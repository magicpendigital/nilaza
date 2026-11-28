// ai-astrology-insight request handler. index.ts wires the real Supabase client, model router, feature config,
// switch and receipt writer; handler_test.ts injects fakes.
// Nil P1-B (15/11/2026): one stored reading per (user, server chart hash, fixed topic, language, calculation version,
// prompt version). The claim goes through public.astrology_claim_report (migration 20261115110000_astrology_lock.sql,
// service_role only): the same key replays the stored reading with no model call and no turn used, a reading in
// progress returns 409, and the daily limit is checked in the same locked transaction. Client roles can only read
// their own rows; every write here uses the service client and always filters by the verified user id.
// The router module is injected (index.ts); its trace type is kept loose here so tests need no provider imports.
import { asModelJson, systemPrompt } from "../_shared/astrology-system-prompt.ts";
import {
  ASTROLOGY_AI_CONTRACT,
  astrologyDiagnosticFieldCode,
  makeAstrologyAiResponseEnvelope,
  selectAstrologyAiFacts,
  toAstrologyAiRequest,
  validateAstrologyAiInvocation,
  validateAstrologyAiResponse
} from "../_shared/astrology-ai-insight.ts";
import { astrologyInputHash, astrologyLockKey, astrologyTopic } from "../_shared/astrology-lock.ts";
import { answerCorsHeaders, readAnswerCorrelation } from "../_shared/answer-provenance.ts";
import { answerProvenanceSchema, isIncompleteAnswerFinishReason, type AnswerProvenance } from "../../../packages/ai-contracts/answer-provenance.ts";
import { accountTierPolicy, localDayStart } from "../_shared/account-tier-policy.ts";
import { PREMIUM_ENTITLEMENTS, resolveServerTier } from "../_shared/premium-entitlement.ts";
import { configuredDailyLimit } from "../_shared/feature-config.ts";

/** Failed attempts allowed on top of the daily limit before the day is closed. */
export const FAILED_ATTEMPT_ALLOWANCE = 2;

// deno-lint-ignore no-explicit-any
type Any = any;
export type AstrologyInsightDeps = {
  env: (key: string) => string | undefined;
  createClient: (url: string, key: string, options?: Any) => Any;
  readActiveModelRoute: (supabase: Any, feature: "astrology_report") => Promise<Any>;
  generateWithModelRoute: (input: Any) => Promise<Any>;
  readActiveFeatureConfig: (feature: "astrology_insight") => Promise<Any>;
  featurePaused: (supabase: Any, feature: "astrology_insight") => Promise<boolean>;
  writeAnswerReceipt: (input: Any) => Promise<{ receiptId: string; createdAt: string } | null>;
  now?: () => Date;
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": answerCorsHeaders,
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
});

function safeFailure(status: number, code: string, message: string) {
  return jsonResponse({ error: { code, message } }, status);
}

function decodeBase64(value: string) {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error("Invalid base64 value");
  }
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function encodeBase64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 8192, bytes.length)));
  }
  return btoa(binary);
}

function focusToLegacyReportFocus(theme: string) {
  if (theme === "relationships") return "love";
  if (theme === "work") return "career";
  if (theme === "decision" || theme === "patterns") return "inner_lesson";
  return "personality";
}

function diagnosticsOf(messages: string[]) {
  return messages.slice(0, 16).map((message) => ({
    path: message.match(/^(?:response|invocation)(?:\.[A-Za-z0-9_]+|\[[0-9]+\])*/)?.[0] ?? "response",
    code: message.includes("evidence") ? "evidence_reference"
      : message.includes("caveat") ? "caveat_reference"
        : message.includes("forbidden") ? "privacy_field"
          : message.includes("mismatch") ? "contract_mismatch"
            : message.includes("must ") ? "schema_constraint"
              : "response_contract",
    field_code: astrologyDiagnosticFieldCode(message)
  }));
}

async function recordOutputRejection(
  supabase: Any,
  userId: string,
  requestId: string,
  stage: "json_parse" | "response_validation",
  details: {
    routeVersion?: string;
    provider?: string;
    model?: string;
    promptVersion?: string;
    responseSchema?: string;
    validationErrors?: string[];
  } = {}
) {
  try {
    const { error } = await supabase.from("usage_events").insert({
      user_id: userId,
      event_name: "astrology_ai_insight_output_rejected",
      feature: "astrology_report",
      metadata: {
        requestId,
        stage,
        routeVersion: details.routeVersion ?? null,
        provider: details.provider ?? null,
        model: details.model ?? null,
        promptVersion: details.promptVersion ?? null,
        responseSchema: details.responseSchema ?? null,
        validationErrorCount: details.validationErrors?.length ?? 0,
        validationDiagnostics: diagnosticsOf(details.validationErrors ?? [])
      }
    });
    if (error) console.warn("astrology_ai_insight_rejection_telemetry_failed");
  } catch {
    console.warn("astrology_ai_insight_rejection_telemetry_failed");
  }
}

export function createAstrologyInsightHandler(deps: AstrologyInsightDeps) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return safeFailure(405, "method_not_allowed", "This endpoint accepts POST only.");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = deps.env("SUPABASE_URL");
    const supabaseAnonKey = deps.env("SUPABASE_ANON_KEY");
    if (!authHeader || !/^Bearer\s+\S+$/i.test(authHeader)) return safeFailure(401, "authentication_required", "Sign in to use the Astrology AI guide.");
    if (!supabaseUrl || !supabaseAnonKey) return safeFailure(503, "backend_unavailable", "The Astrology AI service is not configured yet.");

    const supabase = deps.createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    let userId: string;
    let userCreatedAt: string | null = null;
    let ownedReportId: string | null = null;
    let service: Any = null;
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !authData.user) return safeFailure(401, "authentication_required", "Sign in to use the Astrology AI guide.");
      userId = authData.user.id;
      userCreatedAt = authData.user.created_at ?? null;
    } catch {
      return safeFailure(503, "authentication_check_unavailable", "Your sign-in could not be checked. Try again shortly.");
    }
    // Emergency switch from Admin (Owner decision 2026-10-31); checked before any quota or model work.
    if (await deps.featurePaused(supabase, "astrology_insight")) {
      return safeFailure(503, "feature_paused", "Astrology AI is resting for a while. Please try again later.");
    }
    const configuredEnvironment = deps.env("AI_TRACE_ENVIRONMENT")?.toLowerCase();
    if (!configuredEnvironment || !["staging", "production", "live"].includes(configuredEnvironment)) {
      return safeFailure(503, "runtime_environment_not_configured", "The Astrology AI environment is not configured yet.");
    }

    let finalizeAiTrace: ((input: { status: string; output: Record<string, unknown> }) => Promise<void>) | undefined;
    let payload: unknown;
    try {
      const raw = await req.text();
      if (raw.length > 48_000) return safeFailure(413, "request_too_large", "This chart request is too large.");
      payload = JSON.parse(raw);
    } catch {
      return safeFailure(400, "invalid_json", "The request could not be read.");
    }

    // Crisis and regulated topics stop here: no claim, no model call, no turn used. The app shows the 115 card.
    const validationErrors = validateAstrologyAiInvocation(payload);
    if (validationErrors.length) {
      const blockedTopic = validationErrors.find((error) => error.includes("blocked topic"));
      const crisis = blockedTopic?.includes("self_harm") === true;
      const regulatedAdvice = blockedTopic?.includes("regulated_advice") === true;
      const code = crisis ? "crisis_support" : regulatedAdvice ? "professional_advice_blocked" : "invalid_request";
      return safeFailure(blockedTopic ? 422 : 400, code, blockedTopic
        ? "This topic needs support beyond an Astrology reflection."
        : "The chart request is incomplete or contains data the guide does not accept.");
    }

    const invocation = payload as Any;
    let correlation;
    try { correlation = readAnswerCorrelation(req, "astrology_insight", invocation.language, invocation.requestId); }
    catch { return safeFailure(400, "invalid_answer_correlation", "The request identifiers did not match."); }
    const normalizedQuestion = typeof invocation.userFocus.sanitizedQuestion === "string"
      ? invocation.userFocus.sanitizedQuestion.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim()
      : null;
    if (invocation.userFocus.mode === "question" && !normalizedQuestion) return safeFailure(400, "question_required", "Add a question for the guide.");
    invocation.userFocus.sanitizedQuestion = normalizedQuestion;

    const markFailed = async (id: string | null) => {
      if (!id || !service) return;
      try {
        await service.from("astrology_reports").update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", id).eq("user_id", userId);
      } catch {
        // The original safe failure remains the user-facing result; a stale queued row is released after 3 minutes.
      }
    };

    try {
      // Billing lot 1 (2026-11-15): the shared premium entitlement written by the RevenueCat webhook, plus
      // the contract's older Astrology-only entitlement. Status and period end are judged by the shared helper.
      const acceptedEntitlements = [...new Set([...PREMIUM_ENTITLEMENTS, ASTROLOGY_AI_CONTRACT.entitlement.requiredEntitlement])];
      const { data: subscriptions, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("entitlement,status,current_period_end")
        .eq("user_id", userId)
        .in("entitlement", acceptedEntitlements);
      if (subscriptionError) return safeFailure(503, "access_check_unavailable", "Premium access could not be checked. Try again shortly.");
      const nowDate = deps.now?.() ?? new Date();
      // A paid entitlement or the shared account tier switch (closed test: every signed-in account).
      if (resolveServerTier({ subscriptions, user: { created_at: userCreatedAt } }, nowDate) !== "premium") return safeFailure(403, "premium_required", "Astrology AI is available with Premium.");

      // Admin A4: the active ai_feature_configs row may set delivered readings per day and a total model deadline.
      const featureConfig = await deps.readActiveFeatureConfig("astrology_insight");
      const dailyAttemptLimit = configuredDailyLimit(featureConfig, accountTierPolicy.astrologyAi.dailyLimit);

      const route = await deps.readActiveModelRoute(supabase, "astrology_report");
      if (!route.id || route.status !== "active" || route.responseSchema !== ASTROLOGY_AI_CONTRACT.responseSchema.name) {
        return safeFailure(503, "route_not_ready", "Astrology AI is not configured for the current response format yet.");
      }
      const { data: prompt, error: promptError } = await supabase.from("prompt_versions")
        .select("id,version,status,locale,prompt_text")
        .eq("feature", "astrology_report")
        .eq("owner_type", "global")
        .is("owner_id", null)
        .eq("locale", invocation.language)
        .eq("status", "active")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (promptError || !prompt || !prompt.prompt_text?.trim()) {
        return safeFailure(503, "prompt_not_ready", "The approved Astrology AI prompt is not active for this language yet.");
      }

      const qaCaptureRequested = invocation.qaTraceConsent?.accepted === true
        && invocation.qaTraceConsent?.version === "astrology_ai_qa_trace_v1";
      const qaEncryptionKey = deps.env("AI_TRACE_QA_ENCRYPTION_KEY")?.trim();
      if (qaCaptureRequested) {
        const { data: ownerCapability, error: ownerCapabilityError } = await supabase.rpc("has_admin_capability", { capability: "roles.manage" });
        if (configuredEnvironment !== "staging" || deps.env("AI_TRACE_QA_CAPTURE_ENABLED") !== "true"
          || ownerCapabilityError || ownerCapability !== true || !qaEncryptionKey) {
          return safeFailure(403, "qa_capture_unavailable", "Owner QA capture is available only in staging when secure retention is configured.");
        }
        try {
          if (decodeBase64(qaEncryptionKey).length !== 32) throw new Error("Invalid key length");
        } catch {
          return safeFailure(503, "qa_capture_unavailable", "Secure QA capture is not configured yet.");
        }
      }

      // The server computes the chart hash and the lock key from validated facts; a client value is never read.
      const serviceKey = deps.env("SUPABASE_SERVICE_ROLE_KEY");
      if (!serviceKey) return safeFailure(503, "backend_unavailable", "The Astrology AI service is not configured yet.");
      service = deps.createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const topic = astrologyTopic(invocation.userFocus);
      const inputHash = await astrologyInputHash(invocation);
      const lockKey = await astrologyLockKey({
        inputHash, topic, language: invocation.language,
        calculationVersion: invocation.chart.calculationVersion, promptVersion: prompt.version
      });
      const chartData = {
        contractId: invocation.chart.contractId,
        contractVersion: invocation.chart.contractVersion,
        calculationVersion: invocation.chart.calculationVersion,
        reportRevision: invocation.chart.reportRevision,
        calculationStatus: invocation.chart.calculationStatus,
        selectedFactIds: invocation.selectedFactIds,
        facts: invocation.facts,
        caveats: invocation.caveats
      };
      const baseSummary = {
        contractId: ASTROLOGY_AI_CONTRACT.id,
        requestId: invocation.requestId,
        clientChartId: invocation.clientChartId,
        chartContractVersion: invocation.chart.contractVersion,
        reportRevision: invocation.chart.reportRevision,
        focusTheme: invocation.userFocus.theme,
        focusTopic: topic,
        factCount: invocation.selectedFactIds.length
      };
      const { data: claim, error: claimError } = await service.rpc("astrology_claim_report", {
        p_user_id: userId,
        p_lock_key: lockKey,
        p_input_hash: inputHash,
        p_focus_topic: topic,
        p_language: invocation.language,
        p_prompt_version: prompt.version,
        p_route_version: route.version ?? null,
        p_calculation_version: invocation.chart.calculationVersion,
        p_daily_limit: dailyAttemptLimit,
        p_failed_allowance: FAILED_ATTEMPT_ALLOWANCE,
        p_day_start: localDayStart(nowDate).toISOString(),
        p_report: {
          focus: focusToLegacyReportFocus(invocation.userFocus.theme),
          input_summary: baseSummary,
          chart_data: chartData,
          caveats: invocation.caveats
        },
        p_usage_metadata: {
          requestId: invocation.requestId,
          chartContractVersion: invocation.chart.contractVersion,
          calculationVersion: invocation.chart.calculationVersion,
          focusTheme: invocation.userFocus.theme,
          focusTopic: topic,
          selectedFactCount: invocation.selectedFactIds.length
        }
      });
      if (claimError || !claim || typeof claim.outcome !== "string") {
        return safeFailure(503, "usage_check_unavailable", "Usage could not be checked. Try again shortly.");
      }
      if (claim.outcome === "limit_reached") {
        return safeFailure(429, "daily_limit_reached", "You have reached today's Astrology AI limit. Please return tomorrow.");
      }
      if (claim.outcome === "in_progress") {
        return safeFailure(409, "report_in_progress", "This reading is still being written. Try again in a moment.");
      }
      if (claim.outcome === "replay") {
        return await replayStoredReport({ service, userId, reportId: claim.report_id, invocation, correlation, topic, dailyAttemptLimit });
      }
      if (claim.outcome !== "claimed" || typeof claim.report_id !== "string") {
        return safeFailure(503, "report_store_unavailable", "The private report could not be prepared. Try again shortly.");
      }
      ownedReportId = claim.report_id;

      // Reload with both identifiers. The provider receives facts from this owned row,
      // while the current question remains in memory for this request only.
      const { data: ownedReport, error: readReportError } = await service.from("astrology_reports")
        .select("id,user_id,chart_data")
        .eq("id", ownedReportId)
        .eq("user_id", userId)
        .maybeSingle();
      if (readReportError || !ownedReport || ownedReport.user_id !== userId) {
        await markFailed(ownedReportId);
        return safeFailure(503, "report_read_unavailable", "The private report could not be loaded. Try again shortly.");
      }

      const request = toAstrologyAiRequest(invocation, ownedReport.id);
      request.facts = ownedReport.chart_data.facts;
      request.selectedFactIds = ownedReport.chart_data.selectedFactIds;
      request.caveats = ownedReport.chart_data.caveats;
      const selectedFacts = selectAstrologyAiFacts(request);
      const question = request.userFocus.sanitizedQuestion;
      const messages = [
        {
          role: "user" as const,
          content: JSON.stringify({
            language: request.language,
            chart: request.chart,
            selectedFactIds: request.selectedFactIds,
            facts: selectedFacts,
            caveats: request.caveats,
            currentFocus: { mode: request.userFocus.mode, theme: request.userFocus.theme, question }
          })
        }
      ];
      const qaProviderExchange: Array<{ request?: unknown; response?: unknown; providerUrl?: string; status?: number; requestId?: string }> = [];
      const generation = await deps.generateWithModelRoute({
        feature: "astrology_report",
        deadlineMs: featureConfig?.deadlineMs,
        route,
        supabase,
        strictTraceRedaction: true,
        deferTraceFlush: true,
        qaTraceHooks: qaCaptureRequested ? {
          onRequest: (value: Any) => {
            const attempt = { providerUrl: value.url, request: value.body };
            qaProviderExchange.push(attempt);
          },
          onResponse: (value: Any) => {
            const attempt = qaProviderExchange.at(-1);
            if (attempt) Object.assign(attempt, { response: value.body, status: value.status, requestId: value.requestId });
          }
        } : undefined,
        env: { get: (key: string) => deps.env(key) },
        traceContext: {
          environment: configuredEnvironment === "staging" ? "staging" : "production",
          userId,
          clientRequestId: invocation.requestId,
          request: req,
          metadata: {
            ...correlation,
            chartContractVersion: request.chart.contractVersion,
            calculationVersion: request.chart.calculationVersion,
            reportRevision: request.chart.reportRevision,
            focusTheme: request.userFocus.theme,
            focusTopic: topic,
            selectedFactCount: request.selectedFactIds.length,
            promptContractId: ASTROLOGY_AI_CONTRACT.promptVersionId,
            promptDatabaseVersionId: prompt.id,
            promptVersion: prompt.version,
            responseSchema: route.responseSchema,
            routeVersion: route.version,
            maxOutputTokens: route.maxOutputTokens
          }
        },
        system: systemPrompt(prompt.prompt_text, request.language),
        messages,
        fallbackText: "{}"
      });
      const encryptionKeyForTrace = qaEncryptionKey;
      finalizeAiTrace = async (finalization) => {
        await generation.finalizeTrace?.(finalization);
        if (!qaCaptureRequested || !generation.traceId || !qaProviderExchange.length || !encryptionKeyForTrace) return;
        try {
          const payloadBytes = new TextEncoder().encode(JSON.stringify({
            requestId: invocation.requestId,
            feature: "astrology_report",
            routeVersion: route.version,
            promptVersion: prompt.version,
            responseSchema: route.responseSchema,
            providerExchanges: qaProviderExchange
          }));
          if (payloadBytes.byteLength > 200_000) return;
          const keyBytes = decodeBase64(encryptionKeyForTrace);
          const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
          const nonce = crypto.getRandomValues(new Uint8Array(12));
          const additionalData = new TextEncoder().encode(`nilaza-ai-trace-qa-v1:${generation.traceId}:${userId}`);
          const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, additionalData }, key, payloadBytes));
          const digest = await crypto.subtle.digest("SHA-256", payloadBytes);
          const contentSha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
          const { error } = await supabase.rpc("save_ai_trace_qa_capture", {
            trace_id_input: generation.traceId,
            nonce_input: encodeBase64(nonce),
            ciphertext_input: encodeBase64(ciphertext),
            content_sha256_input: contentSha256
          });
          if (error) console.warn("astrology_qa_capture_write_failed");
        } catch {
          console.warn("astrology_qa_capture_write_failed");
        }
      };

      // Every failure below marks the row failed: the key is released and only a delivered reading uses the day.
      if (generation.moderationStatus === "blocked") {
        await markFailed(ownedReport.id);
        await finalizeAiTrace?.({ status: "blocked", output: { stage: "safety", result: "blocked" } });
        return safeFailure(422, "professional_advice_blocked", "The request needs a different kind of support than an Astrology reflection can provide.");
      }
      if (generation.moderationStatus !== "passed" || generation.provider === "local_fallback") {
        await markFailed(ownedReport.id);
        await finalizeAiTrace?.({ status: "fallback", output: { stage: "provider", result: "unavailable" } });
        return safeFailure(503, "provider_unavailable", "The AI guide is temporarily unavailable. No generated answer was saved.");
      }

      const parsed = asModelJson(generation.text);
      if (!parsed || isIncompleteAnswerFinishReason(generation.finishReason)) {
        await recordOutputRejection(supabase, userId, invocation.requestId, "json_parse", {
          routeVersion: route.version, provider: generation.provider, model: generation.model,
          promptVersion: prompt.version, responseSchema: route.responseSchema
        });
        await markFailed(ownedReport.id);
        await finalizeAiTrace?.({ status: "error", output: { stage: "parse", errorCode: "invalid_model_json" } });
        return safeFailure(502, "invalid_model_response", "The AI response did not match the Astrology format. Try again.");
      }
      const providerMode = configuredEnvironment === "staging" ? "staging" : "live";
      const response = makeAstrologyAiResponseEnvelope({
        modelOutput: parsed,
        request,
        reportId: ownedReport.id,
        promptVersion: prompt.version,
        providerMode
      });
      const responseErrors = validateAstrologyAiResponse(response, request);
      if (responseErrors.length) {
        await recordOutputRejection(supabase, userId, invocation.requestId, "response_validation", {
          routeVersion: route.version, provider: generation.provider, model: generation.model,
          promptVersion: prompt.version, responseSchema: route.responseSchema, validationErrors: responseErrors
        });
        await markFailed(ownedReport.id);
        await finalizeAiTrace?.({
          status: "error",
          output: {
            stage: "validation",
            errorCode: "invalid_model_response",
            validationErrorCount: responseErrors.length,
            validationDiagnostics: diagnosticsOf(responseErrors)
          }
        });
        return safeFailure(502, "invalid_model_response", "The AI response could not be validated safely. Try again.");
      }

      // These fields have just passed the canonical response schema and evidence checks.
      // Keep the metadata projection narrow; store the validated envelope unchanged.
      const receiptFields = response as {
        metadata: { generatedAt: string };
        patterns: Array<{ id: string }>;
        tensions: Array<{ id: string }>;
        focusSections: Array<{ id: string }>;
        reflectionQuestions: string[];
      };
      const provenance: AnswerProvenance = {
        schemaVersion: answerProvenanceSchema, feature: "astrology_insight", ...correlation,
        locale: invocation.language, sourceKind: "ai", generatedAt: receiptFields.metadata.generatedAt,
        validationStatus: "validated", persistenceStatus: "stored", remoteId: ownedReport.id,
        traceId: generation.traceId, providerRequestId: generation.requestId,
        promptVersionId: prompt.id, promptVersion: prompt.version, promptAssemblyVersion: "2026-10-14-astrology-wrapper-v1", routeVersionId: generation.routeVersionId,
        routeVersion: generation.routeVersion, responseSchema: route.responseSchema,
        calculationVersion: invocation.chart.calculationVersion, chartContractVersion: invocation.chart.contractVersion,
        reportRevision: invocation.chart.reportRevision,
      };
      // Plain JSON copy: the receipt link below may only add answerProvenance.answerReceiptId (database guard).
      const completedSummary = JSON.parse(JSON.stringify({ ...baseSummary, answerProvenance: provenance }));
      const { error: saveError } = await service.from("astrology_reports").update({
        provider: generation.provider,
        provider_version: generation.model,
        interpretation: response,
        input_summary: completedSummary,
        prompt_version: prompt.version,
        route_version: generation.routeVersion ?? route.version ?? null,
        status: "completed",
        updated_at: new Date().toISOString()
      }).eq("id", ownedReport.id).eq("user_id", userId);
      if (saveError) {
        await markFailed(ownedReport.id);
        await finalizeAiTrace?.({ status: "error", output: { stage: "persist", errorCode: "report_save_unavailable" } });
        return safeFailure(503, "report_save_unavailable", "The validated response could not be saved. Try again.");
      }
      ownedReportId = null; // Completed: never mark failed after this point.

      await finalizeAiTrace?.({
        status: "ok",
        output: { stage: "response", reportStatus: "completed", responseReady: true }
      });

      const receipt = await deps.writeAnswerReceipt({ ...provenance, userId, sectionIds: ["summary", ...receiptFields.patterns.map(section => `patterns:${section.id}`), ...receiptFields.tensions.map(section => `tensions:${section.id}`), ...receiptFields.focusSections.map(section => `focusSections:${section.id}`), ...receiptFields.reflectionQuestions.map((_, index) => `reflection:${index}`)] });
      if (receipt) {
        provenance.answerReceiptId = receipt.receiptId;
        try {
          await service.from("astrology_reports").update({
            input_summary: { ...completedSummary, answerProvenance: { ...completedSummary.answerProvenance, answerReceiptId: receipt.receiptId } }
          }).eq("id", ownedReport.id).eq("user_id", userId);
        } catch { /* Receipt enrichment cannot discard the already saved report. */ }
      }

      return jsonResponse({
        report: response,
        provenance,
        replay: { replayed: false, topic },
        usage: { attemptsToday: typeof claim.attempts === "number" ? claim.attempts : null, dailyLimit: dailyAttemptLimit }
      });
    } catch {
      await finalizeAiTrace?.({ status: "error", output: { stage: "request", errorCode: "service_unavailable" } });
      await markFailed(ownedReportId);
      return safeFailure(503, "service_unavailable", "The Astrology AI service could not complete this request.");
    }
  };
}

/** Same key: return the stored reading as it was written. No model call, no new row, no turn used. */
async function replayStoredReport(input: {
  service: Any; userId: string; reportId: unknown; invocation: Any; correlation: Any; topic: string; dailyAttemptLimit: number;
}) {
  const { service, userId, invocation, correlation, topic } = input;
  if (typeof input.reportId !== "string") return safeFailure(503, "report_replay_unavailable", "The saved reading could not be opened. Try again shortly.");
  const { data: stored, error } = await service.from("astrology_reports")
    .select("id,user_id,status,interpretation,chart_data,input_summary")
    .eq("id", input.reportId)
    .eq("user_id", userId)
    .maybeSingle();
  const storedProvenance = stored?.input_summary?.answerProvenance;
  if (error || !stored || stored.user_id !== userId || !["completed", "deleted"].includes(stored.status)
    || !stored.interpretation || typeof stored.interpretation !== "object" || !stored.chart_data || !storedProvenance) {
    return safeFailure(503, "report_replay_unavailable", "The saved reading could not be opened. Try again shortly.");
  }
  // The text and evidence are the stored ones; only this request's identifiers are carried over.
  const report = {
    ...stored.interpretation,
    requestId: invocation.requestId,
    metadata: { ...stored.interpretation.metadata, reportRevision: invocation.chart.reportRevision }
  };
  const replayContext = {
    chart: invocation.chart,
    selectedFactIds: stored.chart_data.selectedFactIds,
    facts: stored.chart_data.facts,
    caveats: stored.chart_data.caveats
  };
  const request = toAstrologyAiRequest(invocation, stored.id);
  request.selectedFactIds = replayContext.selectedFactIds;
  request.facts = replayContext.facts;
  request.caveats = replayContext.caveats;
  if (validateAstrologyAiResponse(report, request).length) {
    return safeFailure(503, "report_replay_unavailable", "The saved reading could not be opened. Try again shortly.");
  }
  const provenance = {
    ...storedProvenance,
    ...correlation,
    locale: invocation.language,
    remoteId: stored.id,
    reportRevision: invocation.chart.reportRevision
  };
  return jsonResponse({
    report,
    provenance,
    replay: { replayed: true, topic },
    replayContext,
    usage: { attemptsToday: null, dailyLimit: input.dailyAttemptLimit }
  });
}
