import {
  ModelGenerationResult,
  ModelMessage,
  ModelProviderError,
  ModelProviderName,
  ModelProviderRequest,
  ModelRoute,
  routeReasoning
} from "./model-provider.ts";
import { AiTraceContext, AiTraceSpan, createAiTrace, traceGenerationInput } from "./ai-trace.ts";
import { oracleSafetySignal } from "../../../packages/ai-contracts/oracle-safety.mjs";
import { invokeAnthropic } from "./providers/anthropic.ts";
import { invokeGemini } from "./providers/gemini.ts";
import { invokeOpenAI } from "./providers/openai.ts";
import { invokeOpenRouter } from "./providers/openrouter.ts";
import { readOpenRouterBillingReceipt } from "./providers/openrouter-billing.ts";

type EnvLike = {
  get?: (key: string) => string | undefined;
  [key: string]: unknown;
};

type SupabaseLike = {
  from: (table: string) => any;
};

export type ModelTraceFinalization = {
  status: "ok" | "blocked" | "fallback" | "error";
  output: Record<string, unknown>;
};

export const defaultModelRoutes: Record<string, ModelRoute> = {
  oracle_router: {
    feature: "oracle_router",
    version: "2026-09-14-oracle-pinned-v2",
    status: "active",
    primaryProvider: "openrouter",
    primaryModel: "deepseek/deepseek-v4.1-flash",
    fallbackProvider: "openrouter",
    fallbackModel: "xiaomi/mimo-v2.6-flash",
    temperature: 0.62,
    maxOutputTokens: 2000,
    responseSchema: "oracle_router_v1",
    fallbackWhen: ["missing_api_key", "provider_timeout", "rate_limit", "provider_5xx", "malformed_response"],
    safetyPolicy: { blockDeterministicPredictions: true, blockProfessionalAdvice: true, blockCrisisAdvice: true, reasoning: { mode: "off" } }
  },
  daily_insight: {
    feature: "daily_insight",
    version: "2026-06-30-llm-routing-v1",
    status: "active",
    primaryProvider: "openrouter",
    primaryModel: "deepseek/deepseek-v4.1-flash",
    fallbackProvider: "openrouter",
    fallbackModel: "xiaomi/mimo-v2.6-flash",
    temperature: 0.72,
    maxOutputTokens: 2000,
    responseSchema: "daily_insight_v1",
    fallbackWhen: ["missing_api_key", "provider_timeout", "rate_limit", "provider_5xx", "malformed_response"],
    safetyPolicy: { blockDeterministicPredictions: true, blockProfessionalAdvice: true, reasoning: { mode: "off" } }
  },
  persona_chat: {
    feature: "persona_chat",
    version: "2026-09-17-persona-openrouter-free-v1",
    status: "active",
    primaryProvider: "openrouter",
    primaryModel: "deepseek/deepseek-v4.1-flash",
    fallbackProvider: "openrouter",
    fallbackModel: "xiaomi/mimo-v2.6-flash",
    temperature: 0.68,
    maxOutputTokens: 2000,
    responseSchema: "chat_reply_v2",
    fallbackWhen: ["missing_api_key", "provider_timeout", "rate_limit", "provider_5xx", "malformed_response"],
    safetyPolicy: { requireInspiredByTransparency: true, blockProfessionalAdvice: true, reasoning: { mode: "off" } }
  },
  ai_council: {
    feature: "ai_council",
    version: "2026-09-20-council-rounds-v2",
    status: "active",
    primaryProvider: "openrouter",
    primaryModel: "deepseek/deepseek-v4.1-flash",
    fallbackProvider: "openrouter",
    fallbackModel: "xiaomi/mimo-v2.6-flash",
    temperature: 0.62,
    maxOutputTokens: 2000,
    responseSchema: "ai_council_rounds_v2",
    fallbackWhen: ["missing_api_key", "provider_timeout", "rate_limit", "provider_5xx", "malformed_response"],
    safetyPolicy: {
      blockRawPrivateContext: true,
      allowedOpenRouterModelPrefixes: ["openai/gpt-5", "anthropic/claude-", "google/gemini-"],
      reasoning: { mode: "low", maxTokens: 512 }
    }
  },
  tarot_reading: {
    feature: "tarot_reading",
    version: "2026-06-30-llm-routing-v1",
    status: "active",
    primaryProvider: "openrouter",
    primaryModel: "deepseek/deepseek-v4.1-flash",
    fallbackProvider: "openrouter",
    fallbackModel: "xiaomi/mimo-v2.6-flash",
    temperature: 0.64,
    maxOutputTokens: 2000,
    responseSchema: "tarot_reading_output_v3",
    fallbackWhen: ["missing_api_key", "provider_timeout", "rate_limit", "provider_5xx", "malformed_response"],
    safetyPolicy: { allowSpiritualReflection: true, blockDeterministicPredictions: true, reasoning: { mode: "off" } }
  },
  astrology_report: {
    feature: "astrology_report",
    version: "2026-06-30-llm-routing-v1",
    status: "active",
    primaryProvider: "openrouter",
    primaryModel: "deepseek/deepseek-v4.1-flash",
    fallbackProvider: "openrouter",
    fallbackModel: "xiaomi/mimo-v2.6-flash",
    temperature: 0.58,
    maxOutputTokens: 2000,
    responseSchema: "astrology_report_v1",
    fallbackWhen: ["missing_api_key", "provider_timeout", "rate_limit", "provider_5xx", "malformed_response"],
    safetyPolicy: { interpretCalculatedPlacementsOnly: true, requireCalculationCaveats: true, reasoning: { mode: "low", maxTokens: 512 } }
  }
};

function envGet(env: EnvLike | undefined, key: string) {
  const direct = env?.[key];
  if (typeof direct === "string") return direct;
  const fromGet = env?.get?.(key);
  if (typeof fromGet === "string") return fromGet;
  return typeof Deno !== "undefined" ? Deno.env.get(key) : undefined;
}

function rowToRoute(row: any, fallback: ModelRoute): ModelRoute {
  if (!row) return fallback;
  return {
    id: row.id,
    feature: row.feature,
    version: row.version,
    status: row.status,
    primaryProvider: row.primary_provider,
    primaryModel: row.primary_model,
    fallbackProvider: row.fallback_provider ?? undefined,
    fallbackModel: row.fallback_model ?? undefined,
    temperature: Number(row.temperature ?? fallback.temperature),
    maxOutputTokens: Number(row.max_output_tokens ?? fallback.maxOutputTokens),
    responseSchema: row.response_schema ?? fallback.responseSchema,
    fallbackWhen: Array.isArray(row.fallback_when) ? row.fallback_when : fallback.fallbackWhen,
    safetyPolicy: row.safety_policy ?? fallback.safetyPolicy
  };
}

export class ActiveModelRouteError extends Error {
  constructor(readonly code: "ambiguous_active_model_route" | "invalid_active_model_route") {
    super(code);
    this.name = "ActiveModelRouteError";
  }
}

export async function readActiveModelRoute(supabase: SupabaseLike | null | undefined, feature: string): Promise<ModelRoute> {
  const fallback = defaultModelRoutes[feature] ?? defaultModelRoutes.persona_chat;
  if (!supabase) return fallback;
  try {
    const { data, error } = await supabase
      .from("model_route_versions")
      .select("id, feature, version, status, primary_provider, primary_model, fallback_provider, fallback_model, temperature, max_output_tokens, response_schema, fallback_when, safety_policy")
      .eq("feature", feature)
      .eq("status", "active")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true })
      .limit(2);
    // Ordinary traffic must not silently prefer a competing active revision.
    // Experimental traffic requires a separately reviewed explicit policy.
    if (!error && Array.isArray(data) && data.length > 1) throw new ActiveModelRouteError("ambiguous_active_model_route");
    const row = Array.isArray(data) ? data[0] : null;
    if (!error && row && (row.status !== "active" || row.feature !== feature)) throw new ActiveModelRouteError("invalid_active_model_route");
    return error || !row ? fallback : rowToRoute(row, fallback);
  } catch (error) {
    if (error instanceof ActiveModelRouteError) throw error;
    return fallback;
  }
}

function detectSafetyIssue(text: string) {
  const normalized = text.toLowerCase();
  const checks = [
    { code: "self_harm", patterns: ["kill myself", "suicide", "end my life", "tu tu", "tự tử"] },
    { code: "regulated_advice", patterns: ["medical diagnosis", "legal advice", "financial advice", "diagnose me"] },
    { code: "deterministic_prediction", patterns: ["will definitely happen", "certainly happen", "guaranteed future"] }
  ];
  for (const check of checks) {
    if (check.patterns.some((pattern) => normalized.includes(pattern))) return check.code;
  }
  return null;
}

function providerSecret(provider: ModelProviderName, env?: EnvLike) {
  if (provider === "openai") return envGet(env, "OPENAI_API_KEY") ?? "";
  if (provider === "openrouter") return envGet(env, "OPENROUTER_API_KEY") ?? "";
  if (provider === "gemini") return envGet(env, "GEMINI_API_KEY") ?? "";
  return envGet(env, "ANTHROPIC_API_KEY") ?? "";
}

async function invokeProvider(request: ModelProviderRequest, env?: EnvLike) {
  const apiKey = providerSecret(request.provider, env);
  if (request.provider === "openai") return await invokeOpenAI(request, apiKey);
  if (request.provider === "openrouter") {
    return await invokeOpenRouter(request, apiKey, {
      siteUrl: envGet(env, "NILAZA_SITE_URL"),
      appTitle: envGet(env, "NILAZA_APP_TITLE") ?? "Nilaza"
    });
  }
  if (request.provider === "gemini") return await invokeGemini(request, apiKey);
  return await invokeAnthropic(request, apiKey);
}

function shouldFallback(error: ModelProviderError, route: ModelRoute) {
  if (error.code === "trace_capture_failed") return false;
  if (error.safetyBlocked) return false;
  if (route.fallbackWhen.includes(error.code)) return true;
  if (error.retryable && route.fallbackWhen.some((code) => ["provider_timeout", "rate_limit", "provider_5xx"].includes(code))) return true;
  return false;
}

export async function generateWithModelRoute(input: {
  feature: string;
  system: string;
  messages: ModelMessage[];
  fallbackText: string;
  /** The person's current message; when set, only it is checked with the shared safety policy, not the whole history. */
  safetyText?: string;
  supabase?: SupabaseLike | null;
  env?: EnvLike;
  strictTraceRedaction?: boolean;
  deferTraceFlush?: boolean;
  qaTraceHooks?: {
    onRequest?: (payload: { url: string; method: "POST"; body: unknown }) => void;
    onResponse?: (payload: { status: number; body: unknown; latencyMs: number; requestId?: string }) => void;
  };
  route?: ModelRoute;
  trace?: AiTraceContext;
  traceContext?: {
    userId?: string;
    sessionId?: string;
    clientRequestId?: string;
    endpoint?: string;
    environment?: string;
    metadata?: Record<string, unknown>;
    request?: Request;
  };
}): Promise<ModelGenerationResult & { finalizeTrace?: (input: ModelTraceFinalization) => Promise<void> }> {
  const generationEnv: EnvLike | undefined = input.strictTraceRedaction
    ? {
        get: (key: string) => key === "AI_TRACE_PAYLOAD_MODE"
          ? "redacted"
          : key === "AI_TRACE_ALLOW_FULL_DEBUG"
            ? "false"
            : envGet(input.env, key)
      }
    : input.env;
  const traceSetup = input.trace
    ? { trace: input.trace, rootSpan: input.trace.startSpan({ name: `nilaza.${input.feature}`, type: "chain" }) }
    : createAiTrace({
        feature: input.feature,
        supabase: input.supabase,
        env: generationEnv,
        ...input.traceContext,
        endpoint: input.traceContext?.endpoint ?? input.traceContext?.request?.url
      });
  const trace = traceSetup.trace;
  const rootSpan = traceSetup.rootSpan;
  const finish = async (result: ModelGenerationResult, status?: "ok" | "blocked" | "fallback" | "error") => {
    const defaultStatus = status ?? (result.moderationStatus === "blocked" ? "blocked" : result.moderationStatus === "fallback" ? "fallback" : "ok");
    const rootOutput = {
      status: result.moderationStatus,
      provider: result.provider,
      model: result.model,
      fallbackUsed: result.fallbackUsed,
      attemptCount: result.attempts.length,
      moderationStatus: result.moderationStatus,
      safetyReason: result.safetyReason ?? null,
      traceVersion: "v1"
    };
    if (input.deferTraceFlush) {
      let finalized = false;
      const deferredResult = { ...result, traceId: trace.traceId, traceSpanId: rootSpan.spanId } as ModelGenerationResult & { finalizeTrace?: (input: ModelTraceFinalization) => Promise<void> };
      deferredResult.finalizeTrace = async (finalization) => {
        if (finalized) return;
        finalized = true;
        rootSpan.update({ output: { ...rootOutput, finalization: finalization.output } }).end(finalization.status);
        const flush = await trace.flush();
        deferredResult.tracePersisted = flush.persisted;
        deferredResult.traceExported = flush.exported;
        deferredResult.traceUrl = flush.externalTraceUrl;
      };
      return deferredResult;
    }
    rootSpan.end(defaultStatus, rootOutput);
    const flush = await trace.flush();
    return {
      ...result,
      traceId: trace.traceId,
      traceSpanId: rootSpan.spanId,
      tracePersisted: flush.persisted,
      traceExported: flush.exported,
      traceUrl: flush.externalTraceUrl
    };
  };

  const route = input.route ?? await readActiveModelRoute(input.supabase, input.feature);
  rootSpan.update({
    input: traceGenerationInput({
      route,
      system: input.system,
      messages: input.messages
    }),
    attributes: {
      routeVersion: route.version,
      routeVersionId: route.id ?? null,
      responseSchema: route.responseSchema,
      primaryProvider: route.primaryProvider,
      primaryModel: route.primaryModel,
      fallbackProvider: route.fallbackProvider ?? null,
      fallbackModel: route.fallbackModel ?? null
    }
  });
  const promptSafety = input.safetyText !== undefined
    ? oracleSafetySignal(input.safetyText)
    : detectSafetyIssue(input.messages.map((message) => message.content).join("\n"));
  if (promptSafety) {
    return await finish({
      text: input.fallbackText,
      provider: "local_fallback",
      model: "safety_fallback",
      routeVersionId: route.id,
      routeVersion: route.version,
      fallbackUsed: true,
      attempts: [],
      latencyMs: 0,
      usage: {},
      moderationStatus: "blocked",
      safetyReason: promptSafety
    }, "blocked");
  }

  const attempts: ModelGenerationResult["attempts"] = [];
  const reasoning = routeReasoning(route.safetyPolicy);
  const candidates = [
    { provider: route.primaryProvider, model: route.primaryModel, fallbackUsed: false },
    route.fallbackProvider && route.fallbackModel
      ? { provider: route.fallbackProvider, model: route.fallbackModel, fallbackUsed: true }
      : null
  ].filter((candidate): candidate is { provider: ModelProviderName; model: string; fallbackUsed: boolean } => Boolean(candidate));

  for (const candidate of candidates) {
    let providerSpan: AiTraceSpan | undefined;
    try {
      providerSpan = trace.startSpan({
        name: `llm.${candidate.provider}.${candidate.fallbackUsed ? "fallback" : "primary"}`,
        type: "generation",
        parentSpanId: rootSpan.spanId,
        input: {
          feature: input.feature,
          provider: candidate.provider,
          model: candidate.model,
          system: input.system,
          messages: input.messages,
          temperature: route.temperature,
          maxOutputTokens: route.maxOutputTokens,
          responseSchema: route.responseSchema,
          reasoning: reasoning ?? null
        },
        attributes: {
          provider: candidate.provider,
          model: candidate.model,
          fallbackUsed: candidate.fallbackUsed,
          routeVersion: route.version
        }
      });
      const response = await invokeProvider({
        feature: input.feature,
        provider: candidate.provider,
        model: candidate.model,
        system: input.system,
        messages: input.messages,
        temperature: route.temperature,
        maxOutputTokens: route.maxOutputTokens,
        responseSchema: route.responseSchema,
        ...(reasoning ? { reasoning } : {}),
        traceHooks: {
          onRequest: (payload) => providerSpan?.captureWireRequest(payload),
          onResponse: (payload) => providerSpan?.captureWireResponse(payload)
        },
        ...(input.qaTraceHooks ? { qaTraceHooks: input.qaTraceHooks } : {})
      }, generationEnv);
      attempts.push({ provider: candidate.provider, model: candidate.model, resolvedModel: response.model, ok: true, ...(response.billingReceipt ? { billingReceipt: response.billingReceipt } : {}) });
      providerSpan.update({
        output: {
          text: response.text,
          provider: response.provider,
          model: response.model,
          requestId: response.requestId ?? null,
          usage: response.usage,
          finishReason: response.finishReason ?? null
        },
        attributes: {
          requestId: response.requestId ?? null,
          latencyMs: response.latencyMs,
          inputTokens: response.usage.inputTokens ?? null,
          outputTokens: response.usage.outputTokens ?? null,
          totalTokens: response.usage.totalTokens ?? null,
          finishReason: response.finishReason ?? null,
          ...(response.billingReceipt ? {
            generation_id: response.billingReceipt.generationId ?? null,
            billing_status: response.billingReceipt.status,
            billing_source: response.billingReceipt.source,
            charged_usd: response.billingReceipt.costUsd,
            upstream_inference_cost_usd: response.billingReceipt.upstreamInferenceCostUsd,
            resolved_model: response.billingReceipt.model,
            cached_input_tokens: response.billingReceipt.cachedInputTokens ?? null,
            cache_write_tokens: response.billingReceipt.cacheWriteTokens ?? null,
            reasoning_tokens: response.billingReceipt.reasoningTokens ?? null
          } : {})
        }
      }).end("ok");
      const outputSafety = detectSafetyIssue(response.text);
      if (outputSafety) {
        providerSpan.end("blocked", { blocked: true, safetyReason: outputSafety });
        return await finish({
          text: input.fallbackText,
          provider: "local_fallback",
          model: "safety_fallback",
          routeVersionId: route.id,
          routeVersion: route.version,
          fallbackUsed: true,
          attempts,
          latencyMs: response.latencyMs,
          usage: response.usage,
          moderationStatus: "blocked",
          safetyReason: outputSafety
        }, "blocked");
      }
      return await finish({
        text: response.text,
        finishReason: response.finishReason,
        provider: response.provider,
        model: response.model,
        routeVersionId: route.id,
        routeVersion: route.version,
        fallbackUsed: candidate.fallbackUsed,
        attempts,
        requestId: response.requestId,
        latencyMs: response.latencyMs,
        usage: response.usage,
        moderationStatus: "passed"
      }, "ok");
    } catch (error) {
      const providerError = error instanceof ModelProviderError
        ? error
        : new ModelProviderError({
            provider: candidate.provider,
            code: "provider_timeout",
            message: error instanceof Error ? error.message : "Provider request failed.",
            retryable: true
          });
      const billingReceipt = candidate.provider === "openrouter"
        ? providerError.billingReceipt ?? readOpenRouterBillingReceipt(null, candidate.model)
        : undefined;
      attempts.push({
        provider: candidate.provider,
        model: candidate.model,
        ok: false,
        code: providerError.code,
        status: providerError.status,
        ...(billingReceipt ? { resolvedModel: billingReceipt.model, billingReceipt } : {})
      });
      providerSpan?.update({
        ...(billingReceipt ? { attributes: {
          generation_id: billingReceipt.generationId ?? null,
          billing_status: billingReceipt.status,
          billing_source: billingReceipt.source,
          charged_usd: billingReceipt.costUsd,
          upstream_inference_cost_usd: billingReceipt.upstreamInferenceCostUsd,
          resolved_model: billingReceipt.model
        } } : {}),
        output: {
          errorCode: providerError.code,
          status: providerError.status ?? null,
          retryable: providerError.retryable,
          safetyBlocked: providerError.safetyBlocked
        }
      }).end(providerError.safetyBlocked ? "blocked" : "error");
      if (!candidate.fallbackUsed && shouldFallback(providerError, route)) continue;
      return await finish({
        text: input.fallbackText,
        provider: "local_fallback",
        model: "safe_mock",
        routeVersionId: route.id,
        routeVersion: route.version,
        fallbackUsed: true,
        attempts,
        latencyMs: 0,
        usage: {},
        moderationStatus: providerError.safetyBlocked ? "blocked" : "fallback",
        safetyReason: providerError.safetyBlocked ? providerError.code : undefined
      }, providerError.safetyBlocked ? "blocked" : "fallback");
    }
  }

  return await finish({
    text: input.fallbackText,
    provider: "local_fallback",
    model: "safe_mock",
    routeVersionId: route.id,
    routeVersion: route.version,
    fallbackUsed: true,
    attempts,
    latencyMs: 0,
    usage: {},
    moderationStatus: "fallback"
  }, "fallback");
}
