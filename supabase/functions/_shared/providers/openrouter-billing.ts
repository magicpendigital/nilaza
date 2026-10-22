import type { OpenRouterBillingReceipt } from "../model-provider.ts";

const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const identifier = (value: unknown) => typeof value === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(value) ? value : undefined;
const generationId = (value: unknown) => typeof value === "string" && /^gen-[A-Za-z0-9_-]{1,180}$/.test(value) ? value : undefined;
const modelName = (value: unknown) => typeof value === "string" && /^[A-Za-z0-9_./:-]{1,200}$/.test(value) ? value : undefined;
const providerName = (value: unknown) => typeof value === "string" && /^[A-Za-z0-9 ._:-]{1,100}$/.test(value) ? value : undefined;
const cost = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER ? value : null;
const tokens = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;

export function readOpenRouterBillingReceipt(payload: unknown, requestedModel: string, httpRequestId?: string | null): OpenRouterBillingReceipt {
  const json = record(payload), usage = record(json.usage);
  const id = generationId(json.id);
  const charged = cost(usage.cost);
  return {
    schemaVersion: "openrouter_billing_v1",
    provider: "openrouter",
    status: charged !== null ? "reported" : id ? "pending_reconciliation" : "unavailable",
    source: charged !== null ? "completion_usage" : "none",
    model: modelName(json.model) ?? modelName(requestedModel) ?? "unknown",
    generationId: id,
    requestId: identifier(httpRequestId),
    upstreamProvider: providerName(json.provider),
    costUsd: charged,
    upstreamInferenceCostUsd: cost(record(usage.cost_details).upstream_inference_cost),
    inputTokens: tokens(usage.prompt_tokens),
    outputTokens: tokens(usage.completion_tokens),
    totalTokens: tokens(usage.total_tokens),
    cachedInputTokens: tokens(record(usage.prompt_tokens_details).cached_tokens),
    cacheWriteTokens: tokens(record(usage.prompt_tokens_details).cache_write_tokens),
    reasoningTokens: tokens(record(usage.completion_tokens_details).reasoning_tokens)
  };
}

// Reservation accounting rounds up; the original USD receipt remains unchanged.
// Missing generation identity cannot safely settle a deduplicated operation.
export function openRouterReceiptCostMicro(receipt: OpenRouterBillingReceipt): number | null {
  const charged = cost(receipt.costUsd);
  if (charged === null || receipt.status !== "reported" || receipt.schemaVersion !== "openrouter_billing_v1" || receipt.provider !== "openrouter" || !["completion_usage", "generation_lookup"].includes(receipt.source) || !generationId(receipt.generationId)) return null;
  const rounded = Math.ceil(charged * 1_000_000);
  return Number.isSafeInteger(rounded) ? rounded : null;
}

/** Explicit server-side reconciliation only; never calls chat/completions or logs the lookup payload. */
export async function reconcileOpenRouterBillingReceipt(
  receipt: OpenRouterBillingReceipt,
  apiKey: string,
  options: { fetcher?: typeof fetch; timeoutMs?: number } = {}
): Promise<OpenRouterBillingReceipt> {
  // Copy only known fields even if the runtime caller supplies extra private data.
  const safe: OpenRouterBillingReceipt = {
    schemaVersion: "openrouter_billing_v1", provider: "openrouter",
    status: cost(receipt.costUsd) !== null ? "reported" : generationId(receipt.generationId) ? "pending_reconciliation" : "unavailable",
    source: ["completion_usage", "generation_lookup"].includes(receipt.source) ? receipt.source : "none",
    model: modelName(receipt.model) ?? "unknown", generationId: generationId(receipt.generationId),
    requestId: identifier(receipt.requestId), upstreamRequestId: identifier(receipt.upstreamRequestId),
    upstreamProvider: providerName(receipt.upstreamProvider), costUsd: cost(receipt.costUsd),
    upstreamInferenceCostUsd: cost(receipt.upstreamInferenceCostUsd),
    inputTokens: tokens(receipt.inputTokens), outputTokens: tokens(receipt.outputTokens), totalTokens: tokens(receipt.totalTokens),
    cachedInputTokens: tokens(receipt.cachedInputTokens), cacheWriteTokens: tokens(receipt.cacheWriteTokens), reasoningTokens: tokens(receipt.reasoningTokens)
  };
  if (!safe.generationId) return { ...safe, reconciliationError: "missing_generation_id" };
  if (!apiKey) return { ...safe, reconciliationError: "missing_api_key" };
  const controller = new AbortController();
  const requestedTimeout = options.timeoutMs;
  const timeoutMs = typeof requestedTimeout === "number" && Number.isFinite(requestedTimeout) ? Math.max(1, Math.min(5000, requestedTimeout)) : 2500;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Promise.race also bounds injected fetchers which do not implement abort.
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error("lookup_timeout")); }, timeoutMs);
    });
    const lookup = async () => {
      const url = new URL("https://openrouter.ai/api/v1/generation");
      url.searchParams.set("id", safe.generationId!);
      const response = await (options.fetcher ?? fetch)(url.toString(), {
        method: "GET", headers: { Authorization: `Bearer ${apiKey}` }, signal: controller.signal, redirect: "error"
      });
      if (!response.ok) return { ...safe, reconciliationError: "lookup_unavailable" as const };
      const data = record(record(await response.json()).data);
      const charged = cost(data.total_cost);
      const resolvedModel = modelName(data.model);
      if (generationId(data.id) !== safe.generationId || charged === null || !resolvedModel) return { ...safe, reconciliationError: "invalid_generation_receipt" as const };
      const inputTokens = tokens(data.native_tokens_prompt) ?? tokens(data.tokens_prompt) ?? safe.inputTokens;
      const outputTokens = tokens(data.native_tokens_completion) ?? tokens(data.tokens_completion) ?? safe.outputTokens;
      const totalTokens = inputTokens !== undefined && outputTokens !== undefined ? tokens(inputTokens + outputTokens) : safe.totalTokens;
      return {
        ...safe, status: "reported" as const, source: "generation_lookup" as const,
        model: resolvedModel, costUsd: charged,
        // A non-BYOK upstream cost can be0/null; it never substitutes for total_cost.
        upstreamInferenceCostUsd: cost(data.upstream_inference_cost),
        inputTokens, outputTokens, totalTokens,
        requestId: safe.requestId ?? identifier(data.request_id),
        upstreamRequestId: identifier(data.upstream_id), upstreamProvider: providerName(data.provider_name),
        cachedInputTokens: tokens(data.native_tokens_cached) ?? safe.cachedInputTokens,
        reasoningTokens: tokens(data.native_tokens_reasoning) ?? safe.reasoningTokens
      };
    };
    return await Promise.race([lookup(), timeout]);
  } catch { return { ...safe, reconciliationError: "lookup_unavailable" }; }
  finally { if (timer !== undefined) clearTimeout(timer); }
}
