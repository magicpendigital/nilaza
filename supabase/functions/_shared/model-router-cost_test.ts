// P1-C (15/11/2026): reference price book, call cost (reported / estimated / unknown) and cost on every generation span.
// Provider calls are faked; no network.
import { ModelRoute, ModelRouteStep } from "./model-provider.ts";
import { DEFAULT_COST_CAP_MICRO, defaultModelRoutes, generateWithModelRoute } from "./model-router.ts";
import {
  REFERENCE_PRICE_BOOK,
  REFERENCE_PRICES_MICRO_PER_TOKEN,
  callCost,
  defaultProviderRegistry,
  projectCallCostMicro,
  referencePrice,
  referencePriceInfo
} from "./provider-registry.ts";

function assert(value: unknown, label: string) { if (!value) throw new Error(label); }
function equal(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}

type Reply = { status?: number; body?: unknown };
function fakeFetch(replies: Record<string, Reply[]>) {
  const original = globalThis.fetch;
  globalThis.fetch = ((url: string | URL) => {
    const reply = replies[new URL(String(url)).host]?.shift();
    if (!reply) return Promise.reject(new TypeError("unexpected fetch"));
    return Promise.resolve(new Response(JSON.stringify(reply.body ?? {}), { status: reply.status ?? 200, headers: { "Content-Type": "application/json" } }));
  }) as typeof fetch;
  return { restore: () => { globalThis.fetch = original; } };
}
const orOk = (text: string, model: string, usage: Record<string, unknown> = { prompt_tokens: 1000, completion_tokens: 500 }) =>
  ({ body: { id: "gen-cost1", model, choices: [{ message: { content: text }, finish_reason: "stop" }], usage } });
const err = (status: number) => ({ status, body: { error: { code: status, message: "error" } } });

type SpanRecord = { name: string; attributes: Record<string, unknown>; output?: unknown; status?: string };
function fakeTrace() {
  const spans: SpanRecord[] = [];
  const trace = {
    traceId: "trace_cost_test",
    startSpan: (input: { name: string; attributes?: Record<string, unknown> }) => {
      const record: SpanRecord = { name: input.name, attributes: { ...(input.attributes ?? {}) } };
      spans.push(record);
      const span = {
        spanId: `s${spans.length}`,
        update(value: { attributes?: Record<string, unknown>; output?: unknown }) { Object.assign(record.attributes, value.attributes ?? {}); if (value.output) record.output = value.output; return span; },
        captureWireRequest() { return span; },
        captureWireResponse() { return span; },
        end(status: string, output?: unknown) { record.status = status; if (output) record.output = output; return span; }
      };
      return span;
    },
    flush: async () => ({ persisted: false, exported: false })
  };
  return { trace: trace as any, spans, root: () => spans[0].output as Record<string, unknown>, generations: () => spans.slice(1) };
}

const PRIMARY = "deepseek/deepseek-v4.1-flash";
const FALLBACK = "xiaomi/mimo-v2.6-flash";
const legacyRoute = (extra: Partial<ModelRoute> = {}): ModelRoute => ({
  feature: "tarot_reading", version: "cost-test", status: "active",
  primaryProvider: "openrouter", primaryModel: PRIMARY, fallbackProvider: "openrouter", fallbackModel: FALLBACK,
  temperature: 0.2, maxOutputTokens: 100, responseSchema: "tarot_reading_output_v3",
  fallbackWhen: ["provider_timeout", "rate_limit", "provider_5xx", "malformed_response"], safetyPolicy: {}, ...extra
});
const step = (model: string): ModelRouteStep =>
  ({ provider: "openrouter", model, timeoutMs: 30_000, maxTokens: 500, temperature: 0.5, jsonMode: false, reasoning: { mode: "off" } });
const env = { OPENROUTER_API_KEY: "or-test" };
const base = { feature: "tarot_reading", system: "system", messages: [{ role: "user" as const, content: "xin chào" }], fallbackText: "CANNED", env, costCapMicro: 20_000 };
const COST_KEYS = ["cost_micro", "cost_source", "price_verified", "input_tokens", "output_tokens"];
const costOf = (span: SpanRecord) => Object.fromEntries(COST_KEYS.map((key) => [key, span.attributes[key]]));

Deno.test("P1-C: every model of the default routes and fallback chains has a dated, sourced price", () => {
  const models = new Set<string>();
  for (const route of Object.values(defaultModelRoutes)) {
    models.add(`${route.primaryProvider}:${route.primaryModel}`);
    if (route.fallbackProvider && route.fallbackModel) models.add(`${route.fallbackProvider}:${route.fallbackModel}`);
    // Batch C: decision APIs bill per call (usage.cost in the response), not per token, so they are not in the book.
    for (const s of route.steps ?? []) if (!s.provider.endsWith("_decisions")) models.add(`${s.provider}:${s.model}`);
  }
  assert(models.size >= 2, "default routes found");
  for (const key of models) {
    const entry = REFERENCE_PRICE_BOOK[key];
    assert(entry, `price for ${key}`);
    assert(entry.verified === true, `${key} is a verified price`);
  }
  for (const [key, entry] of Object.entries(REFERENCE_PRICE_BOOK)) {
    assert(entry.input > 0 && entry.output > 0, `${key} positive prices`);
    assert(typeof entry.verified === "boolean", `${key} verified flag`);
    assert(entry.source.length >= 12, `${key} names its source`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(entry.checkedOn), `${key} check date`);
    if (!entry.verified) assert(/chưa xác minh/i.test(entry.source), `${key} unverified source says chưa xác minh`);
    equal(REFERENCE_PRICES_MICRO_PER_TOKEN[key], [entry.input, entry.output], `${key} legacy shape mirrors the book`);
  }
  equal(referencePrice("anthropic", "claude-sonnet-4-5"), [3, 15], "existing referencePrice signature and value");
  equal(REFERENCE_PRICE_BOOK["deepseek:deepseek-flash"].verified, false, "direct DeepSeek is flagged unverified");
  equal(referencePrice("openrouter", "a/model"), undefined, "unknown model has no price");
});

Deno.test("P1-C: estimated and reported cost for every model in the book", () => {
  for (const [key, entry] of Object.entries(REFERENCE_PRICE_BOOK)) {
    const [provider, ...rest] = key.split(":");
    const model = rest.join(":");
    const estimated = callCost({ provider: provider as any, model, inputTokens: 1000, outputTokens: 500 });
    equal(estimated, { costMicro: Math.ceil(1000 * entry.input + 500 * entry.output), costSource: "estimated", priceVerified: entry.verified }, `${key} estimate`);
    const reported = callCost({ provider: provider as any, model, receiptUsd: 0.000321, inputTokens: 1000, outputTokens: 500 });
    equal(reported, { costMicro: 321, costSource: "reported", priceVerified: null }, `${key} receipt wins`);
  }
  // Default primary: 1000 in + 500 out = 50.7 + 101.4 = 152.1 -> 153 micro-USD.
  equal(callCost({ provider: "openrouter", model: PRIMARY, inputTokens: 1000, outputTokens: 500 }).costMicro, 153, "deepseek v4.1 flash estimate");
  // Only one side of usage known: still an estimate.
  equal(callCost({ provider: "openrouter", model: FALLBACK, outputTokens: 100 }).costMicro, 28, "output-only estimate");
  equal(callCost({ provider: "openrouter", model: "a/model", inputTokens: 10, outputTokens: 5 }), { costMicro: null, costSource: "unknown", priceVerified: null }, "no price = unknown");
  equal(callCost({ provider: "openrouter", model: PRIMARY }), { costMicro: null, costSource: "unknown", priceVerified: true }, "no usage = unknown");
  equal(callCost({ provider: "openrouter", model: PRIMARY, receiptUsd: Number.NaN, inputTokens: 10 }).costSource, "estimated", "invalid receipt falls back to estimate");
  equal(referencePriceInfo("openrouter", PRIMARY, "deepseek/deepseek-v4.1-flash-1017")?.input, 0.02, "resolved model is tried first");
});

Deno.test("P1-C: the cost cap projection keeps its formula; default routes stay far below 0.02 USD", () => {
  for (const price of [[3, 15], [0.0507, 0.2028], [1.25, 10]] as Array<[number, number]>) {
    for (const [chars, maxTokens] of [[0, 0], [7, 500], [6000, 2000], [100_000, 4000]]) {
      equal(projectCallCostMicro(price, chars, maxTokens), Math.ceil(Math.ceil(chars / 3) * price[0] + maxTokens * price[1]), "same formula as before");
    }
  }
  equal(projectCallCostMicro(undefined, 6000, 2000), 0, "no price projects 0 as before");
  // New effect: OpenRouter default models now project a cost (before: 0). A large turn is still far under the cap.
  const deepseek = projectCallCostMicro(referencePrice("openrouter", PRIMARY), 30_000, 2000);
  assert(deepseek > 0 && deepseek < DEFAULT_COST_CAP_MICRO / 10, `deepseek projection ${deepseek} well under the cap`);
});

Deno.test("P1-C: legacy route records cost on the failed primary and the answering fallback", async () => {
  const fake = fakeFetch({ "openrouter.ai": [err(503), orOk("fallback answer", FALLBACK, { prompt_tokens: 1000, completion_tokens: 500, cost: 0.00042 })] });
  try {
    const t = fakeTrace();
    const result = await generateWithModelRoute({ ...base, route: legacyRoute(), trace: t.trace });
    assert(result.text === "fallback answer" && result.fallbackUsed, "fallback answered");
    const [primary, fallback] = t.generations();
    equal(primary.status, "error", "primary span error");
    equal(costOf(primary), { cost_micro: null, cost_source: "unknown", price_verified: true, input_tokens: null, output_tokens: null }, "failed call without receipt: unknown");
    equal(costOf(fallback), { cost_micro: 420, cost_source: "reported", price_verified: null, input_tokens: 1000, output_tokens: 500 }, "receipt cost");
    assert(fallback.attributes.charged_usd === 0.00042 && fallback.attributes.inputTokens === 1000, "existing attributes kept");
    const root = t.root();
    equal([root.cost_micro_total, root.cost_source, root.cost_call_count], [420, "unknown", 2], "root total, least certain source");
  } finally { fake.restore(); }
});

Deno.test("P1-C: legacy success without a receipt is estimated from tokens", async () => {
  const fake = fakeFetch({ "openrouter.ai": [orOk("primary answer", PRIMARY)] });
  try {
    const t = fakeTrace();
    await generateWithModelRoute({ ...base, route: legacyRoute(), trace: t.trace });
    equal(t.generations().map(costOf), [{ cost_micro: 153, cost_source: "estimated", price_verified: true, input_tokens: 1000, output_tokens: 500 }], "estimate");
    equal([t.root().cost_micro_total, t.root().cost_source, t.root().cost_call_count], [153, "estimated", 1], "root");
  } finally { fake.restore(); }
});

Deno.test("P1-C: output safety block and format rejection still record the call cost", async () => {
  let fake = fakeFetch({ "openrouter.ai": [orOk("This will definitely happen.", PRIMARY)] });
  try {
    const t = fakeTrace();
    const result = await generateWithModelRoute({ ...base, route: legacyRoute(), trace: t.trace });
    assert(result.moderationStatus === "blocked" && result.text === "CANNED", "blocked safely");
    equal(t.generations().map((s) => [s.status, s.attributes.cost_micro, s.attributes.cost_source]), [["blocked", 153, "estimated"]], "blocked span has cost");
    equal(t.root().cost_micro_total, 153, "blocked turn still costs");
  } finally { fake.restore(); }

  fake = fakeFetch({ "openrouter.ai": [orOk("not json", PRIMARY), orOk("good", FALLBACK, { prompt_tokens: 100, completion_tokens: 100 })] });
  try {
    const t = fakeTrace();
    const result = await generateWithModelRoute({ ...base, route: legacyRoute(), trace: t.trace, acceptOutput: (text: string) => text === "good" ? undefined : "format" });
    assert(result.text === "good", "fallback after format rejection");
    // mimo: 100 x 0.14 + 100 x 0.28 = 42.
    equal(t.generations().map((s) => s.attributes.cost_micro), [153, 42], "rejected and accepted calls both cost");
    equal(t.root().cost_micro_total, 195, "total");
  } finally { fake.restore(); }
});

Deno.test("P1-C: a prompt safety block makes no model call and records zero calls", async () => {
  const t = fakeTrace();
  const result = await generateWithModelRoute({ ...base, messages: [{ role: "user", content: "I want to end my life" }], route: legacyRoute(), trace: t.trace });
  assert(result.moderationStatus === "blocked", "blocked");
  equal(t.generations().length, 0, "no generation span");
  equal([t.root().cost_micro_total, t.root().cost_source, t.root().cost_call_count], [0, null, 0], "no cost");
});

Deno.test("P1-C: step chain spans carry cost; spent micro for the cap is unchanged", async () => {
  const fake = fakeFetch({ "openrouter.ai": [err(503), orOk("answer", FALLBACK, { prompt_tokens: 1000, completion_tokens: 500, cost: 0.0002 })] });
  try {
    const t = fakeTrace();
    const registry = defaultProviderRegistry();
    const result = await generateWithModelRoute({ ...base, route: legacyRoute({ steps: [step(PRIMARY), step(FALLBACK)] }), trace: t.trace, providerRegistry: registry });
    assert(result.text === "answer" && result.outcome === "ok_fallback", "second step answered");
    const [first, second] = t.generations();
    equal([first.attributes.cost_source, first.attributes.cost_micro, first.attributes.costMicro], ["unknown", null, 0], "failed step: unknown, cap counts 0");
    equal([second.attributes.cost_source, second.attributes.cost_micro, second.attributes.costMicro], ["reported", 200, 200], "receipt step");
    const root = t.root();
    equal((root.chain as Record<string, unknown>).spentMicro, 200, "chain spent unchanged");
    equal([root.cost_micro_total, root.cost_call_count], [200, 2], "root total");
  } finally { fake.restore(); }
});
