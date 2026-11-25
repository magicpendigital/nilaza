export type ModelProviderName = "openai" | "openrouter" | "gemini" | "anthropic" | "deepseek";

/** Admin A7 (D4): the Supabase secret NAME per provider. Only presence is ever checked; the value goes to the adapter. */
export const PROVIDER_SECRET_NAMES: Record<ModelProviderName, string> = {
  openrouter: "OPENROUTER_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY"
};
export const MODEL_PROVIDER_NAMES = Object.keys(PROVIDER_SECRET_NAMES) as ModelProviderName[];

/**
 * Batch C (2026-11-24): decision APIs return one choice from a fixed list (no text). They are valid only in the
 * reader_router chain; the router never sends chat traffic to them.
 */
export type DecisionProviderName = "openrouter_decisions" | "openai_decisions" | "gemini_decisions";
export const DECISION_PROVIDER_SECRET_NAMES: Record<DecisionProviderName, string> = {
  openrouter_decisions: "OPENROUTER_API_KEY",
  openai_decisions: "OPENAI_API_KEY",
  gemini_decisions: "GEMINI_API_KEY"
};
export const DECISION_PROVIDER_NAMES = Object.keys(DECISION_PROVIDER_SECRET_NAMES) as DecisionProviderName[];
/** The only route feature whose steps may use a decision provider. */
export const DECISION_ROUTE_FEATURES = ["reader_router"] as const;
export type RouteProviderName = ModelProviderName | DecisionProviderName;
export function isDecisionProvider(value: unknown): value is DecisionProviderName {
  return DECISION_PROVIDER_NAMES.includes(value as DecisionProviderName);
}
export function isChatProvider(value: unknown): value is ModelProviderName {
  return MODEL_PROVIDER_NAMES.includes(value as ModelProviderName);
}

/** Admin A7 (D3): one step of a route chain (model_route_versions.steps, at most 4). */
export type ModelRouteStep = {
  /** A decision provider appears only in reader_router chains (see DECISION_ROUTE_FEATURES). */
  provider: RouteProviderName;
  model: string;
  timeoutMs: number;
  maxTokens: number;
  temperature: number;
  jsonMode: boolean;
  reasoning?: ReasoningSetting | null;
};
export type ChatRouteStep = ModelRouteStep & { provider: ModelProviderName };
export function isChatStep(step: ModelRouteStep): step is ChatRouteStep {
  return isChatProvider(step.provider);
}
export const MAX_ROUTE_STEPS = 4;

export type ModelMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ModelRoute = {
  id?: string;
  feature: string;
  version: string;
  status: "active" | "experimental" | "draft" | "archived";
  primaryProvider: ModelProviderName;
  primaryModel: string;
  fallbackProvider?: ModelProviderName;
  fallbackModel?: string;
  temperature: number;
  maxOutputTokens: number;
  responseSchema: string;
  fallbackWhen: string[];
  safetyPolicy: Record<string, unknown>;
  /** A7: an explicit chain. Absent means today's primary + optional fallback behaviour. */
  steps?: ModelRouteStep[];
  /** A7: total wait for the whole chain, 5-140 s. */
  totalDeadlineMs?: number;
};

/** A provider that has not answered after this long is aborted, so the route can fall back (analysis AI-14). */
export const PROVIDER_TIMEOUT_MS = 40_000;

/**
 * Astrology AI reasons over a strict schema and needs longer (Owner 2026-11-03: 60 s per model). Two
 * attempts stay under the 150 s Supabase Edge Function idle limit; longer waits need streaming.
 */
export function providerTimeoutMs(feature: string, attemptTimeoutMs?: number) {
  if (typeof attemptTimeoutMs === "number" && Number.isFinite(attemptTimeoutMs) && attemptTimeoutMs > 0) return Math.floor(attemptTimeoutMs);
  return feature === "astrology_report" ? 60_000 : PROVIDER_TIMEOUT_MS;
}

/** Admin A4 (ai_feature_configs.deadline_ms): total wait for all model attempts of one request, 5-140 s. */
export const FEATURE_DEADLINE_MIN_MS = 5_000;
export const FEATURE_DEADLINE_MAX_MS = 140_000;
/** An attempt with less time than this left is not started; it is recorded as provider_timeout. */
export const MIN_ATTEMPT_MS = 1_000;

export function validFeatureDeadlineMs(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= FEATURE_DEADLINE_MIN_MS && value <= FEATURE_DEADLINE_MAX_MS
    ? value
    : undefined;
}

/**
 * Time for attempt `index` of `count` under a total deadline: earlier attempts get at most an equal share so the
 * fallback model still has time; the last attempt gets whatever is left. The sum never exceeds the deadline.
 */
export function attemptTimeoutMs(deadlineMs: number, elapsedMs: number, index: number, count: number): number {
  const remaining = Math.max(0, deadlineMs - Math.max(0, elapsedMs));
  if (index >= count - 1) return remaining;
  return Math.min(remaining, Math.floor(deadlineMs / Math.max(1, count)));
}

export const REASONING_MODES = ["off", "minimal", "low", "medium", "high"] as const;
export type ReasoningMode = typeof REASONING_MODES[number];
/** Hidden reasoning for one route; maxTokens caps the reasoning budget instead of an effort level. */
export type ReasoningSetting = { mode: ReasoningMode; maxTokens?: number };

/**
 * Owner decision 2026-11-02: Admin stores reasoning in the route's safety_policy JSON as
 * reasoning {mode, maxTokens}. Anything unrecognised means "not set" and the provider default applies.
 */
export function routeReasoning(policy: Record<string, unknown> | null | undefined): ReasoningSetting | undefined {
  const value = policy?.reasoning as { mode?: unknown; maxTokens?: unknown } | undefined;
  if (!value || typeof value !== "object" || !REASONING_MODES.includes(value.mode as ReasoningMode)) return undefined;
  const mode = value.mode as ReasoningMode;
  const maxTokens = Number(value.maxTokens);
  return mode !== "off" && Number.isInteger(maxTokens) && maxTokens >= 64 ? { mode, maxTokens } : { mode };
}

export type ModelProviderRequest = {
  feature: string;
  provider: ModelProviderName;
  model: string;
  system: string;
  messages: ModelMessage[];
  temperature: number;
  maxOutputTokens: number;
  responseSchema?: string;
  /** OpenRouter only for now; other providers ignore it. */
  reasoning?: ReasoningSetting;
  /** Abort this attempt after this many ms instead of the feature default (set by the router under a total deadline). */
  timeoutMs?: number;
  /** A7 step chains: ask for a JSON object where the provider supports it. */
  jsonMode?: boolean;
  /**
   * Streaming (persona chat, 25/11/2026): called with each piece of visible text as it arrives. It may throw (the router's
   * running output check) to stop the stream. Only the OpenRouter adapter streams; other providers ignore it and answer
   * in one piece. With it set, timeoutMs bounds the wait for the first visible text instead of the whole reply.
   */
  onDelta?: (text: string) => void;
  /** Streaming: absolute time (epoch ms) after which the stream is aborted, whatever timeoutMs says. */
  streamDeadlineAt?: number;
  metadata?: Record<string, unknown>;
  traceHooks?: {
    onRequest?: (payload: { url: string; method: "POST"; body: unknown }) => void;
    onResponse?: (payload: { status: number; body: unknown; latencyMs: number; requestId?: string }) => void;
  };
  qaTraceHooks?: {
    onRequest?: (payload: { url: string; method: "POST"; body: unknown }) => void;
    onResponse?: (payload: { status: number; body: unknown; latencyMs: number; requestId?: string }) => void;
  };
};

export type ModelUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type OpenRouterBillingReceipt = {
  schemaVersion: "openrouter_billing_v1";
  provider: "openrouter";
  status: "reported" | "pending_reconciliation" | "unavailable";
  source: "completion_usage" | "generation_lookup" | "none";
  model: string;
  generationId?: string;
  requestId?: string;
  upstreamRequestId?: string;
  upstreamProvider?: string;
  // Account charge and upstream cost are different amounts. Null is unknown.
  costUsd: number | null;
  upstreamInferenceCostUsd: number | null;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
  reconciliationError?: "missing_api_key" | "missing_generation_id" | "lookup_unavailable" | "invalid_generation_receipt";
};

export type ModelProviderResponse = {
  text: string;
  provider: ModelProviderName;
  model: string;
  requestId?: string;
  latencyMs: number;
  usage: ModelUsage;
  finishReason?: string;
  billingReceipt?: OpenRouterBillingReceipt;
  /** Streaming: ms from the request to the first visible text. */
  firstTextMs?: number;
};

export type ModelGenerationResult = {
  text: string;
  finishReason?: string;
  provider: ModelProviderName | "local_fallback";
  model: string;
  routeVersionId?: string;
  routeVersion: string;
  fallbackUsed: boolean;
  attempts: Array<{
    provider: ModelProviderName;
    model: string;
    ok: boolean;
    code?: string;
    status?: number;
    resolvedModel?: string;
    /** Content-free: provider error code/message or "output_check:<rejection code>". */
    detail?: string;
    billingReceipt?: OpenRouterBillingReceipt;
  }>;
  requestId?: string;
  latencyMs: number;
  usage: ModelUsage;
  moderationStatus: "passed" | "blocked" | "fallback";
  safetyReason?: string;
  /** E5: ok (first step answered), ok_fallback (a later step answered), canned (prepared text), safety_block. */
  outcome?: ModelOutcome;
  /** Streaming: some text already reached the person before the turn ended. */
  streamed?: boolean;
  /** Streaming: the model failed after text had been sent, so no fallback ran; the caller ends the stream with an error. */
  streamInterrupted?: boolean;
  traceId?: string;
  traceSpanId?: string;
  tracePersisted?: boolean;
  traceExported?: boolean;
  traceUrl?: string;
};

export type ModelOutcome = "ok" | "ok_fallback" | "canned" | "safety_block";

export function resultOutcome(result: Pick<ModelGenerationResult, "moderationStatus" | "fallbackUsed" | "outcome">): ModelOutcome {
  if (result.outcome) return result.outcome;
  if (result.moderationStatus === "blocked") return "safety_block";
  if (result.moderationStatus === "fallback") return "canned";
  return result.fallbackUsed ? "ok_fallback" : "ok";
}

export class ModelProviderError extends Error {
  provider: ModelProviderName;
  code: string;
  status?: number;
  retryable: boolean;
  safetyBlocked: boolean;
  billingReceipt?: OpenRouterBillingReceipt;
  /** Provider's short error code/message (see providerErrorDetail), or the output check's rejection code. */
  providerDetail?: string;

  constructor(input: {
    provider: ModelProviderName;
    code: string;
    message: string;
    status?: number;
    retryable?: boolean;
    safetyBlocked?: boolean;
    billingReceipt?: OpenRouterBillingReceipt;
  }) {
    super(input.message);
    this.name = "ModelProviderError";
    this.provider = input.provider;
    this.code = input.code;
    this.status = input.status;
    this.retryable = input.retryable ?? false;
    this.safetyBlocked = input.safetyBlocked ?? false;
    this.billingReceipt = input.billingReceipt;
  }
}

/**
 * A7 (E1): why a step failed, and whether the chain may move to the next step. A safety block never moves;
 * a format failure moves once per request (the router tracks "once"); anything unrecognised stops at canned text.
 */
export type ProviderErrorClass = "safety" | "transient" | "rate_limit" | "payment" | "auth" | "config" | "context_length" | "format" | "trace" | "other";
export function classifyProviderError(error: ModelProviderError): { errorClass: ProviderErrorClass; moveOn: boolean } {
  if (error.safetyBlocked) return { errorClass: "safety", moveOn: false };
  if (error.code === "trace_capture_failed") return { errorClass: "trace", moveOn: false };
  if (error.code === "missing_api_key") return { errorClass: "config", moveOn: true };
  if (error.code === "malformed_response") return { errorClass: "format", moveOn: true };
  if (["provider_timeout", "network_error", "provider_5xx", "provider_stream_error"].includes(error.code) || (error.status ?? 0) >= 500) return { errorClass: "transient", moveOn: true };
  if (error.status === 402) return { errorClass: "payment", moveOn: true };
  if (error.status === 429 || error.code === "rate_limit") return { errorClass: "rate_limit", moveOn: true };
  if (error.status === 401 || error.status === 403 || error.code === "provider_auth_error") return { errorClass: "auth", moveOn: true };
  if (error.status === 404) return { errorClass: "config", moveOn: true };
  const text = `${error.providerDetail ?? ""} ${error.message}`.toLowerCase();
  if ((error.status === 400 || error.status === 413 || error.status === 422)
    && /context|too long|too many tokens|maximum.{0,24}tokens|token limit|request_too_large/.test(text)) {
    return { errorClass: "context_length", moveOn: true };
  }
  return { errorClass: "other", moveOn: false };
}

export function compactLines(lines: Array<string | undefined | null | false>) {
  return lines.filter((line): line is string => Boolean(line && line.trim())).join("\n");
}

export function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function readJsonResponse(response: Response) {
  const text = await response.text();
  const json = text ? safeJsonParse(text) : null;
  return { text, json };
}

export function providerErrorFromResponse(provider: ModelProviderName, status: number, bodyText: string, detail?: string) {
  const code =
    status === 401 || status === 403 ? "provider_auth_error" :
    status === 429 ? "rate_limit" :
    status >= 500 ? "provider_5xx" :
    "provider_error";
  const error = new ModelProviderError({
    provider,
    code,
    status,
    retryable: status === 429 || status >= 500,
    message: `${provider} request failed with status ${status}: ${bodyText.slice(0, 220)}`
  });
  if (detail) error.providerDetail = detail;
  return error;
}

/**
 * LLM phase 0: the provider's own short error code and message, for diagnosis. Metadata is dropped
 * because a moderation error can echo flagged input; the result is at most 160 characters.
 */
export function providerErrorDetail(json: unknown): string | undefined {
  const error = json && typeof json === "object" ? (json as { error?: unknown }).error : undefined;
  if (!error || typeof error !== "object") return typeof error === "string" ? error.slice(0, 160) : undefined;
  const { code, message } = error as { code?: unknown; message?: unknown };
  const parts = [typeof code === "string" || typeof code === "number" ? String(code) : "", typeof message === "string" ? message : ""].filter(Boolean);
  return parts.length ? parts.join(": ").replace(/\s+/g, " ").slice(0, 160) : undefined;
}

/** A thrown fetch failure: an abort by our timeout is provider_timeout, anything else is network_error. */
export function thrownProviderError(provider: ModelProviderName, error: unknown): ModelProviderError {
  const name = error instanceof Error ? error.name : "";
  const timeout = name === "TimeoutError" || name === "AbortError";
  return new ModelProviderError({
    provider,
    code: timeout ? "provider_timeout" : "network_error",
    message: error instanceof Error ? error.message.slice(0, 160) : "Provider request failed.",
    retryable: true
  });
}

export function normalizeUsage(input: {
  inputTokens?: unknown;
  outputTokens?: unknown;
  totalTokens?: unknown;
}): ModelUsage {
  const inputTokens = typeof input.inputTokens === "number" ? input.inputTokens : undefined;
  const outputTokens = typeof input.outputTokens === "number" ? input.outputTokens : undefined;
  const totalTokens =
    typeof input.totalTokens === "number" ? input.totalTokens :
    typeof inputTokens === "number" && typeof outputTokens === "number" ? inputTokens + outputTokens :
    undefined;
  return { inputTokens, outputTokens, totalTokens };
}

export function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function sanitizeProviderMetadata(result: ModelGenerationResult) {
  return {
    provider: result.provider,
    model: result.model,
    fallbackUsed: result.fallbackUsed,
    latencyMs: result.latencyMs,
    inputTokens: result.usage.inputTokens ?? null,
    outputTokens: result.usage.outputTokens ?? null,
    totalTokens: result.usage.totalTokens ?? null,
    requestId: result.requestId ?? null,
    routeVersionId: result.routeVersionId ?? null,
    routeVersion: result.routeVersion,
    attempts: result.attempts,
    moderationStatus: result.moderationStatus,
    safetyReason: result.safetyReason ?? null,
    traceId: result.traceId ?? null,
    traceSpanId: result.traceSpanId ?? null,
    tracePersisted: result.tracePersisted ?? false,
    traceExported: result.traceExported ?? false,
    traceUrl: result.traceUrl ?? null
  };
}
