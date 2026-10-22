export type ModelProviderName = "openai" | "openrouter" | "gemini" | "anthropic";

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
};

export type ModelProviderRequest = {
  feature: string;
  provider: ModelProviderName;
  model: string;
  system: string;
  messages: ModelMessage[];
  temperature: number;
  maxOutputTokens: number;
  responseSchema?: string;
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
    billingReceipt?: OpenRouterBillingReceipt;
  }>;
  requestId?: string;
  latencyMs: number;
  usage: ModelUsage;
  moderationStatus: "passed" | "blocked" | "fallback";
  safetyReason?: string;
  traceId?: string;
  traceSpanId?: string;
  tracePersisted?: boolean;
  traceExported?: boolean;
  traceUrl?: string;
};

export class ModelProviderError extends Error {
  provider: ModelProviderName;
  code: string;
  status?: number;
  retryable: boolean;
  safetyBlocked: boolean;
  billingReceipt?: OpenRouterBillingReceipt;

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

export function providerErrorFromResponse(provider: ModelProviderName, status: number, bodyText: string) {
  const code =
    status === 401 || status === 403 ? "provider_auth_error" :
    status === 429 ? "rate_limit" :
    status >= 500 ? "provider_5xx" :
    "provider_error";
  return new ModelProviderError({
    provider,
    code,
    status,
    retryable: status === 429 || status >= 500,
    message: `${provider} request failed with status ${status}: ${bodyText.slice(0, 220)}`
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
