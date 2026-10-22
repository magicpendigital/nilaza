import { ModelProviderError } from "../model-provider.ts";
import { generateWithModelRoute } from "../model-router.ts";
import { invokeOpenRouter } from "./openrouter.ts";
import { openRouterReceiptCostMicro, readOpenRouterBillingReceipt, reconcileOpenRouterBillingReceipt } from "./openrouter-billing.ts";

function assert(condition: unknown, message: string) { if (!condition) throw new Error(message); }
const request = { feature: "persona_chat", provider: "openrouter" as const, model: "fixture/router", system: "Synthetic prompt", messages: [{ role: "user" as const, content: "Synthetic hello" }], temperature: 0.2, maxOutputTokens: 100 };
const completion = { id: "gen-fixture-primary", model: "fixture/resolved-model", provider: "Fixture Provider", usage: { cost: 0.0123, cost_details: { upstream_inference_cost: 0.009 }, prompt_tokens: 20, completion_tokens: 5, total_tokens: 25, prompt_tokens_details: { cached_tokens: 3, cache_write_tokens: 4 }, completion_tokens_details: { reasoning_tokens: 2 } }, choices: [{ message: { content: "Synthetic response" }, finish_reason: "stop" }] };
const receipt = () => readOpenRouterBillingReceipt(completion, request.model, "http-request-fixture");
const mockFetch = (body: unknown, status = 200, headers: Record<string, string> = {}) => ((_url: string | URL | Request, _init?: RequestInit) => Promise.resolve(new Response(JSON.stringify(body), { status, headers }))) as typeof fetch;

Deno.test("completion receipt keeps actual charge, model, counts and separate generation/request IDs", () => {
  const r = receipt();
  assert(r.costUsd === 0.0123 && r.upstreamInferenceCostUsd === 0.009, "Account cost was conflated with upstream cost");
  assert(r.generationId === "gen-fixture-primary" && r.requestId === "http-request-fixture", "Generation and request identities were conflated");
  assert(r.model === "fixture/resolved-model" && r.cachedInputTokens === 3 && r.cacheWriteTokens === 4 && r.reasoningTokens === 2, "Actual model or token details lost");
  assert(r.status === "reported" && r.source === "completion_usage", "Authoritative cost status lost");
  assert(r.inputTokens === 20 && r.outputTokens === 5 && r.totalTokens === 25, "Per-attempt input/output tokens lost");
});

Deno.test("invalid/missing cost remains unknown even when upstream cost is zero", () => {
  for (const value of [undefined, null, -1, NaN, Infinity, "0", {}, []]) {
    const r = readOpenRouterBillingReceipt({ id: "gen-fixture", usage: { cost: value, cost_details: { upstream_inference_cost: 0 } } }, request.model);
    assert(r.costUsd === null && r.status === "pending_reconciliation", "Unknown account charge became zero or settled");
    assert(openRouterReceiptCostMicro(r) === null, "Unknown cost settled a reservation");
  }
  const r = readOpenRouterBillingReceipt({ usage: { cost_details: { upstream_inference_cost: 0 } } }, request.model);
  assert(r.status === "unavailable" && r.generationId === undefined && r.costUsd === null, "Missing ID fabricated a receipt");
});

Deno.test("zero is reported only when explicit, tiny costs round up and missing ID cannot settle", () => {
  const zero = readOpenRouterBillingReceipt({ id: "gen-zero", usage: { cost: 0 } }, request.model);
  assert(zero.status === "reported" && openRouterReceiptCostMicro(zero) === 0, "Explicit free usage lost");
  const tiny = readOpenRouterBillingReceipt({ id: "gen-tiny", usage: { cost: 0.0000004 } }, request.model);
  assert(openRouterReceiptCostMicro(tiny) === 1 && tiny.costUsd === 0.0000004, "Tiny charge disappeared or original receipt changed");
  assert(openRouterReceiptCostMicro({ ...receipt(), generationId: undefined }) === null, "Missing identity incorrectly settled cost");
  assert(openRouterReceiptCostMicro({ ...receipt(), source: "none" }) === null, "Receipt without authoritative source settled cost");
  assert(openRouterReceiptCostMicro({ ...receipt(), costUsd: Number.MAX_SAFE_INTEGER }) === null, "Unsafe integer settlement accepted");
});

Deno.test("receipt allowlist removes private text and rejects malformed token/identity fields", () => {
  const r = readOpenRouterBillingReceipt({ ...completion, private: "PRIVATE_FIXTURE_MARKER", prompt: "PRIVATE_FIXTURE_MARKER", id: "gen-x?secret=bad", provider: "bad\nPRIVATE_FIXTURE_MARKER", usage: { ...completion.usage, prompt_tokens_details: { cached_tokens: -1, cache_write_tokens: 1.5 }, completion_tokens_details: { reasoning_tokens: Infinity } } }, request.model, "bad\nrequest");
  assert(!JSON.stringify(r).includes("PRIVATE_FIXTURE_MARKER"), "Private payload escaped receipt allowlist");
  assert(r.generationId === undefined && r.requestId === undefined && r.cachedInputTokens === undefined && r.cacheWriteTokens === undefined && r.reasoningTokens === undefined, "Invalid count/identity retained");
});

Deno.test("adapter preserves receipt on malformed output and HTTP errors without private error body", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = mockFetch({ ...completion, choices: [] });
    let error: unknown;
    try { await invokeOpenRouter(request, "fixture-key"); } catch (value) { error = value; }
    assert(error instanceof ModelProviderError && error.billingReceipt?.costUsd === 0.0123 && error.billingReceipt.inputTokens === 20, "Charged malformed attempt lost receipt or token counts");
    globalThis.fetch = mockFetch({ ...completion, error: { message: "PRIVATE_FIXTURE_MARKER" } }, 429);
    try { await invokeOpenRouter(request, "fixture-key"); } catch (value) { error = value; }
    assert(error instanceof ModelProviderError && error.code === "rate_limit" && error.billingReceipt?.generationId === completion.id, "HTTP failure receipt lost");
    assert(error instanceof Error && !error.message.includes("PRIVATE_FIXTURE_MARKER"), "Raw provider error escaped");
  } finally { globalThis.fetch = original; }
});

Deno.test("adapter does not substitute generation ID into HTTP request ID", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = mockFetch(completion);
    const r = await invokeOpenRouter(request, "fixture-key");
    assert(r.requestId === undefined && r.billingReceipt?.generationId === completion.id, "Generation ID substituted for missing header");
    globalThis.fetch = mockFetch(completion, 200, { "x-request-id": "http-request-fixture" });
    const header = await invokeOpenRouter(request, "fixture-key");
    assert(header.requestId === "http-request-fixture" && header.billingReceipt?.generationId === completion.id, "Separate IDs not retained");
  } finally { globalThis.fetch = original; }
});

Deno.test("router keeps both charged attempts and actual resolved models after malformed fallback", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = ((_url: string | URL | Request) => {
    calls++;
    const body = calls === 1 ? { ...completion, choices: [] } : { ...completion, id: "gen-fixture-fallback", model: "fixture/resolved-fallback", usage: { cost: 0.002 } };
    return Promise.resolve(new Response(JSON.stringify(body)));
  }) as typeof fetch;
  try {
    const result = await generateWithModelRoute({ feature: "persona_chat", system: request.system, messages: request.messages, fallbackText: "Local response", env: { OPENROUTER_API_KEY: "fixture-key", AI_TRACE_ENABLED: "false" }, route: { feature: "persona_chat", version: "fixture-only", status: "active", primaryProvider: "openrouter", primaryModel: "fixture/primary", fallbackProvider: "openrouter", fallbackModel: "fixture/fallback", temperature: 0.2, maxOutputTokens: 100, responseSchema: "fixture", fallbackWhen: ["malformed_response"], safetyPolicy: {} } });
    assert(calls === 2 && result.fallbackUsed && result.attempts.length === 2, "Unexpected call/retry or fallback behavior");
    assert(result.attempts[0].ok === false && result.attempts[0].billingReceipt?.costUsd === 0.0123, "Failed charged attempt lost");
    assert(result.attempts[1].billingReceipt?.costUsd === 0.002 && result.attempts[1].resolvedModel === "fixture/resolved-fallback", "Fallback receipt/model lost");
  } finally { globalThis.fetch = original; }
});

Deno.test("router retains billed output which safety blocks and unknown cost on transport failure", async () => {
  const original = globalThis.fetch;
  const route = { feature: "persona_chat", version: "fixture", status: "active" as const, primaryProvider: "openrouter" as const, primaryModel: "fixture/model", temperature: 0.2, maxOutputTokens: 100, responseSchema: "fixture", fallbackWhen: [], safetyPolicy: {} };
  try {
    globalThis.fetch = mockFetch({ ...completion, choices: [{ message: { content: "This will definitely happen" } }] });
    const input = { feature: "persona_chat", system: request.system, messages: request.messages, fallbackText: "Local safe response", env: { OPENROUTER_API_KEY: "fixture-key", AI_TRACE_ENABLED: "false" }, route };
    const blocked = await generateWithModelRoute(input);
    assert(blocked.moderationStatus === "blocked" && blocked.attempts[0].billingReceipt?.costUsd === 0.0123, "Safety rejection erased actual provider charge");
    globalThis.fetch = (() => Promise.reject(new Error("Synthetic network failure"))) as typeof fetch;
    const failed = await generateWithModelRoute(input);
    assert(failed.attempts[0].billingReceipt?.costUsd === null && failed.attempts[0].billingReceipt?.status === "unavailable", "Transport error became zero billed");
  } finally { globalThis.fetch = original; }
});

Deno.test("post-dispatch trace failure keeps the charge and does not trigger paid fallback", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (() => { calls++; return Promise.resolve(new Response(JSON.stringify(completion))); }) as typeof fetch;
  try {
    const result = await generateWithModelRoute({ feature: "persona_chat", system: request.system, messages: request.messages, fallbackText: "Local safe response", env: { OPENROUTER_API_KEY: "fixture-key", AI_TRACE_ENABLED: "false" }, qaTraceHooks: { onResponse: () => { throw new Error("PRIVATE_FIXTURE_MARKER"); } }, route: { feature: "persona_chat", version: "fixture", status: "active", primaryProvider: "openrouter", primaryModel: "fixture/primary", fallbackProvider: "openrouter", fallbackModel: "fixture/fallback", temperature: 0.2, maxOutputTokens: 100, responseSchema: "fixture", fallbackWhen: ["provider_timeout", "malformed_response", "trace_capture_failed"], safetyPolicy: {} } });
    assert(calls === 1 && result.attempts.length === 1 && result.attempts[0].code === "trace_capture_failed", "Trace failure triggered paid failover");
    assert(result.attempts[0].billingReceipt?.costUsd === 0.0123 && !JSON.stringify(result).includes("PRIVATE_FIXTURE_MARKER"), "Trace failure lost cost or leaked private exception");
  } finally { globalThis.fetch = original; }
});

Deno.test("explicit reconciliation verifies ID and fixed URL, refuses redirects, preserves header ID", async () => {
  let calls = 0;
  const fetcher = ((url: string | URL | Request, init?: RequestInit) => {
    calls++;
    assert(String(url) === "https://openrouter.ai/api/v1/generation?id=gen-fixture-primary", "Unexpected endpoint or query");
    assert(init?.method === "GET" && init.redirect === "error" && init.signal !== undefined, "Unsafe lookup dispatch");
    return Promise.resolve(new Response(JSON.stringify({ data: { id: completion.id, model: "fixture/final-model", total_cost: 0.013, upstream_inference_cost: 0, request_id: "metadata-request-id", provider_name: "Fixture Provider", upstream_id: "chatcmpl-fixture", native_tokens_cached: 4, native_tokens_reasoning: 8, prompt: "PRIVATE_FIXTURE_MARKER" } })));
  }) as typeof fetch;
  const r = await reconcileOpenRouterBillingReceipt(receipt(), "fixture-key", { fetcher });
  assert(calls === 1 && r.costUsd === 0.013 && r.upstreamInferenceCostUsd === 0 && r.source === "generation_lookup", "Wrong account charge/source");
  assert(r.requestId === "http-request-fixture" && r.upstreamRequestId === "chatcmpl-fixture" && r.model === "fixture/final-model", "Identity/model lost");
  assert(!JSON.stringify(r).includes("PRIVATE_FIXTURE_MARKER") && r.reasoningTokens === 8, "Private lookup payload leaked or count lost");
});

Deno.test("invalid lookup identity/cost/JSON and HTTP failures keep old receipt without inventing charge", async () => {
  const pending = readOpenRouterBillingReceipt({ id: completion.id }, request.model);
  for (const fetcher of [mockFetch({ data: { id: "gen-other", total_cost: 1, model: "fixture/model" } }), mockFetch({ data: { id: completion.id, total_cost: -1, model: "fixture/model" } }), mockFetch({ data: { id: completion.id, total_cost: null, model: "fixture/model" } }), mockFetch({}, 404), (() => Promise.resolve(new Response("invalid-json"))) as typeof fetch]) {
    const r = await reconcileOpenRouterBillingReceipt(pending, "fixture-key", { fetcher });
    assert(r.costUsd === null && r.reconciliationError !== undefined, "Invalid lookup became known zero or charge");
  }
  const known = await reconcileOpenRouterBillingReceipt(receipt(), "fixture-key", { fetcher: mockFetch({}, 500) });
  assert(known.costUsd === 0.0123, "Transient lookup lost already reported charge");
});

Deno.test("missing ID/key makes no network call and stalled lookup is bounded", async () => {
  let calls = 0;
  const stalled = (() => { calls++; return new Promise<Response>(() => {}); }) as typeof fetch;
  const noId = await reconcileOpenRouterBillingReceipt({ ...receipt(), generationId: "gen-x?unsafe=1" }, "fixture-key", { fetcher: stalled });
  const noKey = await reconcileOpenRouterBillingReceipt(receipt(), "", { fetcher: stalled });
  assert(calls === 0 && noId.reconciliationError === "missing_generation_id" && noKey.reconciliationError === "missing_api_key", "Invalid identity/key dispatched lookup");
  const result = await reconcileOpenRouterBillingReceipt(receipt(), "fixture-key", { fetcher: stalled, timeoutMs: 5 });
  assert(calls === 1 && result.reconciliationError === "lookup_unavailable" && result.costUsd === 0.0123, "Timeout was not bounded or erased reported cost");
});
