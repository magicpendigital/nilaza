import {
  ModelGenerationResult,
  ModelMessage,
  ModelProviderError,
  ModelProviderName,
  ModelProviderRequest,
  DECISION_ROUTE_FEATURES,
  isChatProvider,
  isChatStep,
  isDecisionProvider,
  RouteProviderName,
  ModelRoute,
  ModelRouteStep,
  MAX_ROUTE_STEPS,
  MIN_ATTEMPT_MS,
  MODEL_PROVIDER_NAMES,
  PROVIDER_SECRET_NAMES,
  FEATURE_DEADLINE_MAX_MS,
  REASONING_MODES,
  ReasoningMode,
  attemptTimeoutMs,
  classifyProviderError,
  resultOutcome,
  routeReasoning,
  thrownProviderError,
  validFeatureDeadlineMs
} from "./model-provider.ts";
import { AiTraceContext, AiTraceSpan, createAiTrace, traceGenerationInput } from "./ai-trace.ts";
import { oracleSafetySignal } from "../../../packages/ai-contracts/oracle-safety.mjs";
import { invokeAnthropic } from "./providers/anthropic.ts";
import { invokeDeepSeek } from "./providers/deepseek.ts";
import { invokeGemini } from "./providers/gemini.ts";
import { invokeOpenAI } from "./providers/openai.ts";
import { invokeOpenRouter } from "./providers/openrouter.ts";
import { readOpenRouterBillingReceipt } from "./providers/openrouter-billing.ts";
import { ConfiguredFeature, readActiveFeatureConfig } from "./feature-config.ts";
import { parseRouteSteps } from "./model-route-steps.ts";
import { applyCampaignRoute, resolveCampaignRoute, type CampaignExperiment } from "./model-campaign.ts";
import {
  CallCost,
  CostSource,
  DATA_CLASS_RANK,
  DataClass,
  ProviderRegistry,
  callCost,
  featureDataClass,
  projectCallCostMicro,
  readProviderRegistry,
  referencePrice,
  reportProviderOutcome,
  secretPresent
} from "./provider-registry.ts";

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
  },
  // Batch C (2026-11-24): the free daily private note under the Tarot summary. Short JSON {text, need, askThem}.
  tarot_note: {
    feature: "tarot_note",
    version: "2026-11-24-tarot-note-v1",
    status: "active",
    primaryProvider: "openrouter",
    primaryModel: "deepseek/deepseek-v4.1-flash",
    fallbackProvider: "openrouter",
    fallbackModel: "xiaomi/mimo-v2.6-flash",
    temperature: 0.7,
    maxOutputTokens: 700,
    responseSchema: "tarot_note_output_v1",
    fallbackWhen: ["missing_api_key", "provider_timeout", "rate_limit", "provider_5xx", "malformed_response"],
    safetyPolicy: { allowSpiritualReflection: true, blockDeterministicPredictions: true, reasoning: { mode: "off" } },
    steps: [
      { provider: "openrouter", model: "deepseek/deepseek-v4.1-flash", timeoutMs: 20_000, maxTokens: 700, temperature: 0.7, jsonMode: true, reasoning: { mode: "off" } },
      { provider: "openrouter", model: "xiaomi/mimo-v2.6-flash", timeoutMs: 20_000, maxTokens: 700, temperature: 0.7, jsonMode: true, reasoning: { mode: "off" } }
    ],
    totalDeadlineMs: 40_000
  },
  // 2026-11-25: Bản đồ số "Lời nhắn riêng". The model only picks and joins approved numerology blocks into JSON
  // {message, blockIds}; the output is checked inside the router (numerology-message-prompt.ts). Sensitive data class.
  numerology_private_message: {
    feature: "numerology_private_message",
    version: "2026-11-25-numerology-message-v1",
    status: "active",
    primaryProvider: "openrouter",
    primaryModel: "deepseek/deepseek-v4.1-flash",
    fallbackProvider: "openrouter",
    fallbackModel: "xiaomi/mimo-v2.6-flash",
    temperature: 0.6,
    maxOutputTokens: 600,
    responseSchema: "numerology_private_message_v1",
    fallbackWhen: ["missing_api_key", "provider_timeout", "rate_limit", "provider_5xx", "malformed_response"],
    safetyPolicy: { approvedBlocksOnly: true, blockDeterministicPredictions: true, reasoning: { mode: "off" } },
    steps: [
      { provider: "openrouter", model: "deepseek/deepseek-v4.1-flash", timeoutMs: 20_000, maxTokens: 600, temperature: 0.6, jsonMode: true, reasoning: { mode: "off" } },
      { provider: "openrouter", model: "xiaomi/mimo-v2.6-flash", timeoutMs: 20_000, maxTokens: 600, temperature: 0.6, jsonMode: true, reasoning: { mode: "off" } }
    ],
    totalDeadlineMs: 40_000
  },
  // Batch C (2026-11-24): AI tier of the reader suggestion. A decision model picks one slug (no text); a cheap chat model
  // answering JSON is the fallback. The 4 s budget is enforced in reader-router.ts (the table minimum deadline is 5 s).
  // The primary/fallback pair describes the chat step so a router that ignores steps never calls a decision API.
  reader_router: {
    feature: "reader_router",
    version: "2026-11-24-reader-router-v1",
    status: "active",
    primaryProvider: "openrouter",
    primaryModel: "deepseek/deepseek-v4.1-flash",
    temperature: 0.2,
    maxOutputTokens: 200,
    responseSchema: "reader_router_choice_v1",
    fallbackWhen: ["missing_api_key", "provider_timeout", "rate_limit", "provider_5xx", "malformed_response"],
    safetyPolicy: { decisionOnly: true, reasoning: { mode: "off" } },
    steps: [
      { provider: "openrouter_decisions", model: "typesafe/jev-1.14", timeoutMs: 3_000, maxTokens: 64, temperature: 0, jsonMode: false, reasoning: null },
      { provider: "openrouter", model: "deepseek/deepseek-v4.1-flash", timeoutMs: 3_000, maxTokens: 200, temperature: 0.2, jsonMode: true, reasoning: { mode: "off" } }
    ]
  }
};

function envGet(env: EnvLike | undefined, key: string) {
  const direct = env?.[key];
  if (typeof direct === "string") return direct;
  const fromGet = env?.get?.(key);
  if (typeof fromGet === "string") return fromGet;
  return typeof Deno !== "undefined" ? Deno.env.get(key) : undefined;
}

export { parseRouteSteps };

function rowToRoute(row: any, fallback: ModelRoute): ModelRoute {
  if (!row) return fallback;
  const steps = parseRouteSteps(row.steps, { allowDecision: (DECISION_ROUTE_FEATURES as readonly string[]).includes(row.feature) });
  const totalDeadlineMs = validFeatureDeadlineMs(row.total_deadline_ms);
  // Batch C: the legacy primary/fallback pair is chat-only. When a reader_router row starts with a decision step, the
  // pair is taken from its chat steps; without usable steps the code default applies.
  let primary = { provider: row.primary_provider, model: row.primary_model };
  let secondary = row.fallback_provider ? { provider: row.fallback_provider, model: row.fallback_model } : undefined;
  if (!isChatProvider(primary.provider) || (secondary && !isChatProvider(secondary.provider))) {
    const chat = (steps ?? []).filter(isChatStep);
    if (!steps || !chat.length) return fallback;
    primary = { provider: chat[0].provider, model: chat[0].model };
    secondary = chat[1] ? { provider: chat[1].provider, model: chat[1].model } : undefined;
  }
  return {
    ...(steps ? { steps } : {}),
    ...(totalDeadlineMs !== undefined ? { totalDeadlineMs } : {}),
    id: row.id,
    feature: row.feature,
    version: row.version,
    status: row.status,
    primaryProvider: primary.provider,
    primaryModel: primary.model,
    fallbackProvider: secondary?.provider ?? undefined,
    fallbackModel: secondary?.model ?? undefined,
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
  const legacyColumns = "id, feature, version, status, primary_provider, primary_model, fallback_provider, fallback_model, temperature, max_output_tokens, response_schema, fallback_when, safety_policy";
  const lookup = (columns: string) => supabase
    .from("model_route_versions")
    .select(columns)
    .eq("feature", feature)
    .eq("status", "active")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .limit(2);
  try {
    // A7 (D3): read the chain columns; before migration 20261113140000 they do not exist, so read the legacy columns.
    let { data, error } = await lookup(`${legacyColumns}, steps, total_deadline_ms`);
    if (error) ({ data, error } = await lookup(legacyColumns));
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

const OUTPUT_SAFETY_CHECKS = [
  { code: "self_harm", patterns: ["kill myself", "suicide", "end my life", "tu tu", "tự tử"] },
  { code: "regulated_advice", patterns: ["medical diagnosis", "legal advice", "financial advice", "diagnose me"] },
  { code: "deterministic_prediction", patterns: ["will definitely happen", "certainly happen", "guaranteed future"] }
];

export function detectSafetyIssue(text: string) {
  const normalized = text.toLowerCase();
  for (const check of OUTPUT_SAFETY_CHECKS) {
    if (check.patterns.some((pattern) => normalized.includes(pattern))) return check.code;
  }
  return null;
}

/**
 * Streaming: text this close to the end is held back until more arrives, so a safety phrase split across two chunks
 * is caught before any part of it reaches the person.
 */
export const STREAM_HOLDBACK_CHARS = Math.max(...OUTPUT_SAFETY_CHECKS.flatMap((check) => check.patterns.map((pattern) => pattern.length))) - 1;

/**
 * One streamed attempt: runs the output safety check on everything received so far, forwards only text that is
 * already past the check (all but the last STREAM_HOLDBACK_CHARS), and reports whether anything was sent.
 */
export function createStreamGate(provider: ModelProviderName, send: (text: string) => void) {
  let received = "";
  let sent = 0;
  const emit = (end: number) => {
    // Never split a UTF-16 surrogate pair across two events.
    if (end < received.length && end > sent && /[\uD800-\uDBFF]/.test(received[end - 1])) end -= 1;
    if (end <= sent) return;
    send(received.slice(sent, end));
    sent = end;
  };
  return {
    onDelta(piece: string) {
      received += piece;
      const issue = detectSafetyIssue(received);
      if (issue) {
        throw new ModelProviderError({ provider, code: issue, message: "Output safety check blocked the streamed reply.", retryable: false, safetyBlocked: true });
      }
      emit(received.length - STREAM_HOLDBACK_CHARS);
    },
    /** After the full reply passed every check: send the held-back tail. */
    flush() {
      emit(received.length);
    },
    get emitted() {
      return sent > 0;
    }
  };
}

function providerSecret(provider: ModelProviderName, env?: EnvLike) {
  return envGet(env, PROVIDER_SECRET_NAMES[provider] ?? PROVIDER_SECRET_NAMES.anthropic) ?? "";
}

async function invokeProvider(request: ModelProviderRequest, env?: EnvLike) {
  const apiKey = providerSecret(request.provider, env);
  if (request.provider === "openai") return await invokeOpenAI(request, apiKey);
  if (request.provider === "deepseek") return await invokeDeepSeek(request, apiKey);
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
  /**
   * LLM phase 0: the feature's own structure check, run inside the router. It returns a content-free
   * rejection code for an unusable answer; the fallback model is then tried once. The last candidate's
   * answer is returned unchanged so the feature's own check still names the rejection.
   */
  acceptOutput?: (text: string, finishReason?: string) => string | undefined;
  /** The person's current message; when set, only it is checked with the shared safety policy, not the whole history. */
  safetyText?: string;
  /**
   * Admin A4: total wait for all model attempts (ai_feature_configs.deadline_ms, 5-140 s). Unset or out of range
   * keeps today's behaviour: each attempt waits providerTimeoutMs(feature) (40 s, 60 s for astrology_report).
   */
  deadlineMs?: number | null;
  /**
   * Admin A7: per-turn cost cap in micro-USD for step chains. Undefined reads ai_feature_configs.cost_cap_micro;
   * when that is unset too, 20 000 (0.02 USD, Owner 04/11) applies. Routes without steps ignore it (today's behaviour).
   */
  costCapMicro?: number | null;
  /** Tests and tools: provider switches/circuits to use instead of reading ai_providers. */
  providerRegistry?: ProviderRegistry | null;
  /**
   * Streaming (persona chat only, docs/contracts/persona-chat-streaming.md): visible reply text as it arrives. Only
   * OpenRouter streams; other providers answer at once. A later step is tried only while nothing has been sent; once
   * text has been sent a failure ends the turn with streamInterrupted instead of a fallback.
   */
  onDelta?: (text: string) => void;
  /** Streaming: how long a started stream may run, from the start of this call (default 140 s). */
  streamDeadlineMs?: number;
  /** Override of the feature's data class (FEATURE_DATA_CLASS). */
  dataClass?: DataClass;
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
  // A7 (E5): step chain summary for the root span (skipped steps, spent cost, cap, deadline). Unset for legacy routes.
  let chainSummary: Record<string, unknown> | undefined;
  // P1-C: cost of every model call of this turn (success or failure). Span keys are snake_case so the trace redaction
  // keeps them (numbers, booleans and *_source strings survive "redacted" mode).
  const costTally = { totalMicro: 0, calls: 0, source: null as CostSource | null };
  const recordCallCost = (
    provider: ModelProviderName,
    model: string,
    receipt?: { costUsd?: number | null; inputTokens?: number | null; outputTokens?: number | null } | null,
    usage?: { inputTokens?: number; outputTokens?: number }
  ): { cost: CallCost; attributes: Record<string, unknown> } => {
    const inputTokens = usage?.inputTokens ?? receipt?.inputTokens ?? null;
    const outputTokens = usage?.outputTokens ?? receipt?.outputTokens ?? null;
    const cost = callCost({ provider, model, receiptUsd: receipt?.costUsd ?? null, inputTokens, outputTokens });
    costTally.calls += 1;
    costTally.totalMicro += cost.costMicro ?? 0;
    if (costTally.source === null || COST_SOURCE_RANK[cost.costSource] > COST_SOURCE_RANK[costTally.source]) costTally.source = cost.costSource;
    return {
      cost,
      attributes: {
        cost_micro: cost.costMicro,
        cost_source: cost.costSource,
        price_verified: cost.priceVerified,
        input_tokens: inputTokens,
        output_tokens: outputTokens
      }
    };
  };
  const finish = async (rawResult: ModelGenerationResult, status?: "ok" | "blocked" | "fallback" | "error") => {
    const result: ModelGenerationResult = input.onDelta ? { ...rawResult, streamed: streamEmitted } : rawResult;
    const defaultStatus = status ?? (result.moderationStatus === "blocked" ? "blocked" : result.moderationStatus === "fallback" ? "fallback" : "ok");
    const rootOutput = {
      status: result.moderationStatus,
      provider: result.provider,
      model: result.model,
      fallbackUsed: result.fallbackUsed,
      attemptCount: result.attempts.length,
      moderationStatus: result.moderationStatus,
      safetyReason: result.safetyReason ?? null,
      outcome: resultOutcome(result),
      ...(chainSummary ? { chain: chainSummary } : {}),
      ...(input.onDelta ? { streamed: streamEmitted, stream_interrupted: result.streamInterrupted === true } : {}),
      // P1-C: turn total. No model call (e.g. prompt safety block) = 0 calls, 0 micro-USD, cost_source null.
      cost_micro_total: costTally.totalMicro,
      cost_source: costTally.source,
      cost_call_count: costTally.calls,
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

  // Streaming state for the whole turn: once any text has been sent, no later step may run.
  let streamEmitted = false;
  const generationStartedAt = Date.now();
  const streamDeadlineAt = generationStartedAt + (typeof input.streamDeadlineMs === "number" && input.streamDeadlineMs > 0 ? input.streamDeadlineMs : FEATURE_DEADLINE_MAX_MS);
  const streamGate = (provider: ModelProviderName, attemptDeadlineAt: number) => {
    if (!input.onDelta) return undefined;
    const send = input.onDelta;
    const gate = createStreamGate(provider, (text) => {
      streamEmitted = true;
      send(text);
    });
    return { gate, request: { onDelta: (piece: string) => gate.onDelta(piece), streamDeadlineAt: Math.min(attemptDeadlineAt, streamDeadlineAt) } };
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
  if (route.steps?.length) {
    return await runStepChain();
  }
  const reasoning = routeReasoning(route.safetyPolicy);
  const candidates = [
    { provider: route.primaryProvider, model: route.primaryModel, fallbackUsed: false },
    route.fallbackProvider && route.fallbackModel
      ? { provider: route.fallbackProvider, model: route.fallbackModel, fallbackUsed: true }
      : null
  ].filter((candidate): candidate is { provider: ModelProviderName; model: string; fallbackUsed: boolean } => Boolean(candidate));
  const deadlineMs = validFeatureDeadlineMs(input.deadlineMs);
  const attemptsStartedAt = Date.now();

  for (const candidate of candidates) {
    let providerSpan: AiTraceSpan | undefined;
    const stream = streamGate(candidate.provider, deadlineMs === undefined ? Number.POSITIVE_INFINITY : attemptsStartedAt + deadlineMs);
    try {
      const timeoutMs = deadlineMs === undefined
        ? undefined
        : attemptTimeoutMs(deadlineMs, Date.now() - attemptsStartedAt, candidates.indexOf(candidate), candidates.length);
      if (timeoutMs !== undefined && timeoutMs < MIN_ATTEMPT_MS) {
        throw new ModelProviderError({ provider: candidate.provider, code: "provider_timeout", message: "Feature deadline reached before this attempt.", retryable: true });
      }
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
        ...(timeoutMs !== undefined ? { timeoutMs } : {}),
        ...(stream?.request ?? {}),
        traceHooks: {
          onRequest: (payload) => providerSpan?.captureWireRequest(payload),
          onResponse: (payload) => providerSpan?.captureWireResponse(payload)
        },
        ...(input.qaTraceHooks ? { qaTraceHooks: input.qaTraceHooks } : {})
      }, generationEnv);
      attempts.push({ provider: candidate.provider, model: candidate.model, resolvedModel: response.model, ok: true, ...(response.billingReceipt ? { billingReceipt: response.billingReceipt } : {}) });
      const legacyCost = recordCallCost(candidate.provider, candidate.model, response.billingReceipt, response.usage);
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
          } : {}),
          ...legacyCost.attributes
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
      const hasNext = candidates.indexOf(candidate) < candidates.length - 1;
      // Once text has been sent there is no fallback; the feature's own check still runs on the final text.
      const rejection = hasNext && !streamEmitted && route.fallbackWhen.includes("malformed_response")
        ? input.acceptOutput?.(response.text, response.finishReason) : undefined;
      if (rejection) {
        attempts[attempts.length - 1] = { ...attempts[attempts.length - 1], ok: false, code: "malformed_response", detail: `output_check:${String(rejection).slice(0, 40)}` };
        continue;
      }
      stream?.gate.flush();
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
        : thrownProviderError(candidate.provider, error);
      const billingReceipt = candidate.provider === "openrouter"
        ? providerError.billingReceipt ?? readOpenRouterBillingReceipt(null, candidate.model)
        : undefined;
      attempts.push({
        provider: candidate.provider,
        model: candidate.model,
        ok: false,
        code: providerError.code,
        status: providerError.status,
        ...(providerError.providerDetail ? { detail: providerError.providerDetail } : {}),
        ...(billingReceipt ? { resolvedModel: billingReceipt.model, billingReceipt } : {})
      });
      // A call that never started (deadline reached before this attempt) has no span and no cost.
      const failedCost = providerSpan ? recordCallCost(candidate.provider, candidate.model, billingReceipt) : undefined;
      providerSpan?.update({
        attributes: {
          ...(billingReceipt ? {
            generation_id: billingReceipt.generationId ?? null,
            billing_status: billingReceipt.status,
            billing_source: billingReceipt.source,
            charged_usd: billingReceipt.costUsd,
            upstream_inference_cost_usd: billingReceipt.upstreamInferenceCostUsd,
            resolved_model: billingReceipt.model
          } : {}),
          ...failedCost?.attributes
        },
        output: {
          errorCode: providerError.code,
          status: providerError.status ?? null,
          providerDetail: providerError.providerDetail ?? null,
          retryable: providerError.retryable,
          safetyBlocked: providerError.safetyBlocked
        }
      }).end(providerError.safetyBlocked ? "blocked" : "error");
      if (streamEmitted && !providerError.safetyBlocked) {
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
          moderationStatus: "fallback",
          outcome: "canned",
          streamInterrupted: true
        }, "error");
      }
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

  /**
   * Admin A7 (E1/E5): walk route.steps in order. A step is skipped when its provider is switched off, has no secret,
   * may not receive this feature's data class, has an open circuit, or would push the turn over the cost cap. A failed
   * step moves on for transient, 429, 402, 401/403, 404, context length and (once per request) an unusable format;
   * a safety block never moves on. The whole chain stays inside one total deadline (at most 140 s).
   */
  async function runStepChain() {
    const steps = route.steps ?? [];
    const getEnv = (key: string) => envGet(generationEnv, key);
    const deps = { env: { get: getEnv } };
    const registry = input.providerRegistry ?? (await readProviderRegistry(deps)).registry;
    const dataClass = input.dataClass ?? featureDataClass(input.feature);
    let costCapMicro: number | undefined = typeof input.costCapMicro === "number" && input.costCapMicro > 0 ? input.costCapMicro : undefined;
    if (input.costCapMicro === undefined) {
      const configFeature = (input.feature === "astrology_report" ? "astrology_insight" : input.feature) as ConfiguredFeature;
      costCapMicro = (await readActiveFeatureConfig(configFeature, deps).catch(() => null))?.costCapMicro;
    }
    costCapMicro ??= DEFAULT_COST_CAP_MICRO;
    const deadlines = [route.totalDeadlineMs, validFeatureDeadlineMs(input.deadlineMs)].filter((value): value is number => typeof value === "number");
    const totalDeadlineMs = deadlines.length
      ? Math.min(...deadlines)
      : Math.min(FEATURE_DEADLINE_MAX_MS, steps.reduce((sum, step) => sum + step.timeoutMs, 0));
    const startedAt = Date.now();
    const skipped: Array<{ stepIndex: number; provider: string; reason: string }> = [];
    let spentMicro = 0;
    let formatRetryUsed = false;
    let lastError: { code: string; errorClass: string } | undefined;
    const report = (provider: ModelProviderName, value: Parameters<typeof reportProviderOutcome>[1]) =>
      reportProviderOutcome(provider, value, deps).catch(() => false);
    const summary = () => {
      chainSummary = { stepCount: steps.length, skipped, spentMicro, costCapMicro, totalDeadlineMs, dataClass, lastErrorClass: lastError?.errorClass ?? null };
    };
    const canned = async (latencyMs = 0) => {
      summary();
      const interrupted = streamEmitted;
      return await finish({
        text: input.fallbackText, provider: "local_fallback", model: "safe_mock", routeVersionId: route.id, routeVersion: route.version,
        fallbackUsed: true, attempts, latencyMs, usage: {}, moderationStatus: "fallback", outcome: "canned",
        ...(interrupted ? { streamInterrupted: true } : {})
      }, interrupted ? "error" : "fallback");
    };
    const safetyBlock = async (reason: string, latencyMs = 0, usage = {}) => {
      summary();
      return await finish({
        text: input.fallbackText, provider: "local_fallback", model: "safety_fallback", routeVersionId: route.id, routeVersion: route.version,
        fallbackUsed: true, attempts, latencyMs, usage, moderationStatus: "blocked", safetyReason: reason, outcome: "safety_block"
      }, "blocked");
    };

    for (const [stepIndex, step] of steps.entries()) {
      // Batch C: decision steps return a choice, not text; only reader-router.ts calls them.
      if (!isChatStep(step)) {
        skipped.push({ stepIndex, provider: step.provider, reason: "decision_provider" });
        continue;
      }
      const policy = registry.get(step.provider);
      const skipReason = !policy || !policy.enabled ? "disabled"
        : !secretPresent(policy.secretName, getEnv) ? "missing_secret"
        : DATA_CLASS_RANK[policy.allowedDataClass] < DATA_CLASS_RANK[dataClass] ? "data_class"
        : policy.openedUntil !== null && policy.openedUntil > Date.now() ? "circuit_open"
        : undefined;
      if (skipReason) {
        skipped.push({ stepIndex, provider: step.provider, reason: skipReason });
        if (skipReason === "missing_secret" && policy?.configured !== false) await report(step.provider, { result: "not_configured" });
        continue;
      }
      const remaining = totalDeadlineMs - (Date.now() - startedAt);
      if (remaining < MIN_ATTEMPT_MS) {
        skipped.push({ stepIndex, provider: step.provider, reason: "deadline" });
        lastError = { code: "provider_timeout", errorClass: "transient" };
        break;
      }
      const price = referencePrice(step.provider, step.model);
      const inputChars = input.system.length + input.messages.reduce((sum, message) => sum + message.content.length, 0);
      const projectedMicro = projectCallCostMicro(price, inputChars, step.maxTokens);
      if (spentMicro >= costCapMicro || spentMicro + projectedMicro > costCapMicro) {
        skipped.push({ stepIndex, provider: step.provider, reason: "cost_cap" });
        continue;
      }
      const timeoutMs = Math.min(step.timeoutMs, remaining);
      const fallbackStep = stepIndex > 0;
      const reasoning = step.reasoning ?? undefined;
      let providerSpan: AiTraceSpan | undefined;
      // A started stream may run to the end of the chain's total deadline, not just this step's first-text timeout.
      const stream = streamGate(step.provider, startedAt + totalDeadlineMs);
      try {
        providerSpan = trace.startSpan({
          name: `llm.${step.provider}.${fallbackStep ? "fallback" : "primary"}`,
          type: "generation",
          parentSpanId: rootSpan.spanId,
          input: {
            feature: input.feature, provider: step.provider, model: step.model, system: input.system, messages: input.messages,
            temperature: step.temperature, maxOutputTokens: step.maxTokens, responseSchema: route.responseSchema,
            reasoning: reasoning ?? null, jsonMode: step.jsonMode, timeoutMs
          },
          attributes: { provider: step.provider, model: step.model, fallbackUsed: fallbackStep, routeVersion: route.version, stepIndex }
        });
        const response = await invokeProvider({
          feature: input.feature, provider: step.provider, model: step.model, system: input.system, messages: input.messages,
          temperature: step.temperature, maxOutputTokens: step.maxTokens, responseSchema: route.responseSchema,
          ...(reasoning ? { reasoning } : {}), timeoutMs, jsonMode: step.jsonMode,
          ...(stream?.request ?? {}),
          traceHooks: {
            onRequest: (payload) => providerSpan?.captureWireRequest(payload),
            onResponse: (payload) => providerSpan?.captureWireResponse(payload)
          },
          ...(input.qaTraceHooks ? { qaTraceHooks: input.qaTraceHooks } : {})
        }, generationEnv);
        const okCost = recordCallCost(step.provider, step.model, response.billingReceipt, response.usage);
        // Unknown cost counts as 0 for the cap, as before.
        const costMicro = okCost.cost.costMicro ?? 0;
        spentMicro += costMicro;
        attempts.push({ provider: step.provider, model: step.model, resolvedModel: response.model, ok: true, ...(response.billingReceipt ? { billingReceipt: response.billingReceipt } : {}) });
        if (policy && (policy.failures > 0 || policy.openedUntil !== null)) await report(step.provider, { result: "ok" });
        const providerSafety = ["content_filter", "refusal", "SAFETY", "PROHIBITED_CONTENT"].includes(String(response.finishReason ?? ""));
        const outputSafety = providerSafety ? "provider_safety_block" : detectSafetyIssue(response.text);
        providerSpan.update({
          output: { text: response.text, provider: response.provider, model: response.model, requestId: response.requestId ?? null, usage: response.usage, finishReason: response.finishReason ?? null },
          attributes: {
            requestId: response.requestId ?? null, latencyMs: response.latencyMs, inputTokens: response.usage.inputTokens ?? null,
            outputTokens: response.usage.outputTokens ?? null, totalTokens: response.usage.totalTokens ?? null, finishReason: response.finishReason ?? null,
            costMicro, httpStatus: 200, errorClass: outputSafety ? "safety" : null, outcome: outputSafety ? "safety_block" : "ok",
            ...(response.billingReceipt ? {
              generation_id: response.billingReceipt.generationId ?? null, billing_status: response.billingReceipt.status,
              billing_source: response.billingReceipt.source, charged_usd: response.billingReceipt.costUsd,
              upstream_inference_cost_usd: response.billingReceipt.upstreamInferenceCostUsd, resolved_model: response.billingReceipt.model
            } : {}),
            ...okCost.attributes
          }
        });
        if (outputSafety) {
          providerSpan.end("blocked", { blocked: true, safetyReason: outputSafety });
          return await safetyBlock(outputSafety, response.latencyMs, response.usage);
        }
        providerSpan.end("ok");
        const hasNext = stepIndex < steps.length - 1;
        const rejection = hasNext && !formatRetryUsed && !streamEmitted ? input.acceptOutput?.(response.text, response.finishReason) : undefined;
        if (rejection) {
          formatRetryUsed = true;
          attempts[attempts.length - 1] = { ...attempts[attempts.length - 1], ok: false, code: "malformed_response", detail: `output_check:${String(rejection).slice(0, 40)}` };
          providerSpan.update({ attributes: { errorClass: "format", outcome: "rejected_format" } });
          lastError = { code: "malformed_response", errorClass: "format" };
          continue;
        }
        stream?.gate.flush();
        summary();
        return await finish({
          text: response.text, finishReason: response.finishReason, provider: response.provider, model: response.model,
          routeVersionId: route.id, routeVersion: route.version, fallbackUsed: fallbackStep, attempts, requestId: response.requestId,
          latencyMs: response.latencyMs, usage: response.usage, moderationStatus: "passed", outcome: fallbackStep ? "ok_fallback" : "ok"
        }, "ok");
      } catch (error) {
        const providerError = error instanceof ModelProviderError ? error : thrownProviderError(step.provider, error);
        const billingReceipt = step.provider === "openrouter" ? providerError.billingReceipt ?? readOpenRouterBillingReceipt(null, step.model) : undefined;
        const failedCost = providerSpan ? recordCallCost(step.provider, step.model, billingReceipt) : undefined;
        const costMicro = failedCost?.cost.costMicro ?? 0;
        spentMicro += costMicro;
        const { errorClass, moveOn } = classifyProviderError(providerError);
        attempts.push({
          provider: step.provider, model: step.model, ok: false, code: providerError.code, status: providerError.status,
          ...(providerError.providerDetail ? { detail: providerError.providerDetail } : {}),
          ...(billingReceipt ? { resolvedModel: billingReceipt.model, billingReceipt } : {})
        });
        providerSpan?.update({
          attributes: {
            errorClass, httpStatus: providerError.status ?? null, costMicro, outcome: errorClass === "safety" ? "safety_block" : "error",
            ...(billingReceipt ? { generation_id: billingReceipt.generationId ?? null, billing_status: billingReceipt.status, charged_usd: billingReceipt.costUsd } : {}),
            ...failedCost?.attributes
          },
          output: { errorCode: providerError.code, status: providerError.status ?? null, providerDetail: providerError.providerDetail ?? null, retryable: providerError.retryable, safetyBlocked: providerError.safetyBlocked }
        }).end(providerError.safetyBlocked ? "blocked" : "error");
        if (["transient", "rate_limit", "payment", "auth", "config"].includes(errorClass)) {
          await report(step.provider, { result: "failure", errorClass: errorClass as "transient", ...(providerError.status ? { httpStatus: providerError.status } : {}) });
        }
        if (errorClass === "safety") return await safetyBlock(providerError.code);
        lastError = { code: providerError.code, errorClass };
        if (!moveOn || streamEmitted) break;
        if (errorClass === "format") {
          if (formatRetryUsed) break;
          formatRetryUsed = true;
        }
      }
    }
    return await canned();
  }
}

/**
 * Batch C (2026-11-24): the route a feature runs for this user. The active route is read as before (an ambiguous or
 * invalid active route still throws); then a running model campaign of the feature, read with the service-role client,
 * may swap the step chain for the user's variant. No campaign, no service client or any campaign error keeps the active
 * route and experiment null.
 */
export async function resolveFeatureRoute(
  supabase: SupabaseLike | null | undefined,
  feature: string,
  userId: string,
  options: {
    campaignClient?: Parameters<typeof resolveCampaignRoute>[0];
    locale?: string | null;
    now?: Date;
    resolveCampaign?: typeof resolveCampaignRoute;
  } = {}
): Promise<{ route: ModelRoute; experiment: CampaignExperiment | null }> {
  const route = await readActiveModelRoute(supabase, feature);
  if (!options.campaignClient) return { route, experiment: null };
  try {
    const resolve = options.resolveCampaign ?? resolveCampaignRoute;
    const campaign = await resolve(options.campaignClient, feature, userId, options.now ?? new Date(), { locale: options.locale ?? null, signedIn: true });
    if (!campaign) return { route, experiment: null };
    return { route: applyCampaignRoute(route, campaign.route), experiment: { ...campaign.experiment } };
  } catch {
    return { route, experiment: null };
  }
}

/** Flat trace/usage metadata keys for a campaign run (ai-trace keeps campaignId and variant as top-level keys only). */
export function experimentTraceMetadata(experiment: { campaignId: string; variant: string } | null | undefined): Record<string, string> {
  return experiment ? { campaignId: experiment.campaignId, variant: experiment.variant } : {};
}

/** Owner 04/11: a fallback step may cost more than the first, but one turn stays under 0.02 USD unless configured. */
export const DEFAULT_COST_CAP_MICRO = 20_000;

/** P1-C: the turn's cost_source is the least certain of its calls. */
const COST_SOURCE_RANK: Record<CostSource, number> = { reported: 0, estimated: 1, unknown: 2 };
