// Admin A7 (E1/E5): step chain walking in the shared router. Provider calls are faked; no network.
import { ModelRoute, ModelRouteStep, classifyProviderError, ModelProviderError } from "./model-provider.ts";
import { DEFAULT_COST_CAP_MICRO, generateWithModelRoute, parseRouteSteps } from "./model-router.ts";
import { ProviderRegistry, defaultProviderRegistry } from "./provider-registry.ts";

function assert(value: unknown, label: string) { if (!value) throw new Error(label); }
function equal(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}

type Reply = { status?: number; body?: unknown; delayUntilAbort?: boolean };
type Call = { host: string; body: any };
function fakeFetch(replies: Record<string, Reply[]>) {
  const calls: Call[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = ((url: string | URL, init?: RequestInit) => {
    const host = new URL(String(url)).host;
    calls.push({ host, body: init?.body ? JSON.parse(String(init.body)) : null });
    const reply = replies[host]?.shift();
    if (!reply) return Promise.reject(new TypeError(`unexpected fetch ${host}`));
    if (reply.delayUntilAbort) {
      return new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("timed out", "TimeoutError"))));
    }
    return Promise.resolve(new Response(JSON.stringify(reply.body ?? {}), { status: reply.status ?? 200, headers: { "Content-Type": "application/json" } }));
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}
const openRouterOk = (text: string, extra: Record<string, unknown> = {}) => ({ body: { id: "gen-1", model: "m", choices: [{ message: { content: text }, finish_reason: "stop", ...extra }], usage: { prompt_tokens: 10, completion_tokens: 5 } } });
const anthropicOk = (text: string, stop = "end_turn") => ({ body: { id: "msg-1", content: [{ type: "text", text }], stop_reason: stop, usage: { input_tokens: 10, output_tokens: 5 } } });
const err = (status: number, message = "error") => ({ status, body: { error: { code: status, message } } });

function fakeTrace() {
  const spans: Array<{ name: string; attributes: Record<string, unknown>; output?: unknown; status?: string }> = [];
  const trace = {
    traceId: "trace_steps_test",
    startSpan: (input: { name: string; attributes?: Record<string, unknown> }) => {
      const record = { name: input.name, attributes: { ...(input.attributes ?? {}) } as Record<string, unknown>, output: undefined as unknown, status: undefined as string | undefined };
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
  return { trace: trace as any, spans, root: () => spans[0] };
}

const step = (provider: ModelRouteStep["provider"], model: string, extra: Partial<ModelRouteStep> = {}): ModelRouteStep =>
  ({ provider, model, timeoutMs: 30_000, maxTokens: 500, temperature: 0.5, jsonMode: false, reasoning: { mode: "off" }, ...extra });
const route = (steps?: ModelRouteStep[], extra: Partial<ModelRoute> = {}): ModelRoute => ({
  feature: "tarot_reading", version: "steps-test", status: "active",
  primaryProvider: "openrouter", primaryModel: "primary-model", fallbackProvider: "openrouter", fallbackModel: "fallback-model",
  temperature: 0.2, maxOutputTokens: 100, responseSchema: "tarot_reading_output_v3",
  fallbackWhen: ["provider_timeout", "rate_limit", "provider_5xx", "malformed_response"], safetyPolicy: {},
  ...(steps ? { steps } : {}), ...extra
});
function registry(changes: Record<string, Partial<{ enabled: boolean; allowedDataClass: "public" | "personal" | "sensitive"; openedUntil: number | null }>> = {}): ProviderRegistry {
  const value = defaultProviderRegistry();
  for (const provider of ["anthropic", "gemini", "openai"] as const) value.get(provider)!.enabled = true;
  for (const [provider, change] of Object.entries(changes)) Object.assign(value.get(provider as any)!, change);
  return value;
}
const env = { OPENROUTER_API_KEY: "or-test", ANTHROPIC_API_KEY: "an-test", OPENAI_API_KEY: "oa-test", DEEPSEEK_API_KEY: "ds-test" };
const base = { feature: "tarot_reading", system: "system", messages: [{ role: "user" as const, content: "câu hỏi" }], fallbackText: "CANNED", env, costCapMicro: 20_000 };

Deno.test("A7: a route without steps behaves as today (primary then fallback, registry ignored)", async () => {
  const fake = fakeFetch({ "openrouter.ai": [err(503), openRouterOk("fallback answer")] });
  try {
    const t = fakeTrace();
    // Even a registry that switches OpenRouter off does not change a legacy route.
    const result = await generateWithModelRoute({ ...base, route: route(), trace: t.trace, providerRegistry: registry({ openrouter: { enabled: false } }) });
    equal(fake.calls.map((c) => c.body.model), ["primary-model", "fallback-model"], "same candidates");
    equal(fake.calls.map((c) => c.body.max_tokens), [100, 100], "route max tokens");
    assert(result.text === "fallback answer" && result.fallbackUsed && result.moderationStatus === "passed", "fallback answered");
    assert(result.outcome === undefined, "legacy result shape unchanged");
    equal(t.spans.map((s) => s.name), ["nilaza.tarot_reading", "llm.openrouter.primary", "llm.openrouter.fallback"], "legacy span names");
    equal(fake.calls.map((c) => c.body.provider), [{ zdr: true, data_collection: "deny" }, { zdr: true, data_collection: "deny" }], "ZDR on legacy routes");
  } finally { fake.restore(); }
});

Deno.test("A7: a legacy route still stops on a 400 like today (no new move-on rules)", async () => {
  const fake = fakeFetch({ "openrouter.ai": [err(400, "bad request")] });
  try {
    const result = await generateWithModelRoute({ ...base, route: route(), trace: fakeTrace().trace });
    assert(fake.calls.length === 1 && result.text === "CANNED", "one call then canned");
  } finally { fake.restore(); }
});

Deno.test("A7: steps walk in order; a 5xx moves to the next step; spans carry step index, class, status and outcome", async () => {
  const fake = fakeFetch({ "openrouter.ai": [err(503)], "api.anthropic.com": [anthropicOk("anthropic answer")] });
  try {
    const t = fakeTrace();
    const result = await generateWithModelRoute({ ...base, route: route([step("openrouter", "a/model"), step("anthropic", "claude-haiku-4-5")]), trace: t.trace, providerRegistry: registry() });
    assert(result.text === "anthropic answer" && result.provider === "anthropic" && result.outcome === "ok_fallback" && result.fallbackUsed, "second step answered");
    equal(t.spans.slice(1).map((s) => [s.name, s.attributes.stepIndex, s.attributes.errorClass, s.attributes.httpStatus, s.attributes.outcome]),
      [["llm.openrouter.primary", 0, "transient", 503, "error"], ["llm.anthropic.fallback", 1, null, 200, "ok"]], "span attributes");
    const root = t.root().output as Record<string, any>;
    assert(root.outcome === "ok_fallback" && root.chain.stepCount === 2 && root.chain.costCapMicro === 20_000, "root outcome and chain summary");
    equal(fake.calls[0].body.provider, { zdr: true, data_collection: "deny" }, "ZDR/deny on the OpenRouter step");
    assert(fake.calls[1].body.max_tokens === 500 && fake.calls[1].body.temperature === 0.5, "per-step limits sent");
  } finally { fake.restore(); }
});

Deno.test("A7: first step answering is outcome ok", async () => {
  const fake = fakeFetch({ "openrouter.ai": [openRouterOk("first")] });
  try {
    const result = await generateWithModelRoute({ ...base, route: route([step("openrouter", "a/model"), step("anthropic", "claude-haiku-4-5")]), trace: fakeTrace().trace, providerRegistry: registry() });
    assert(result.outcome === "ok" && !result.fallbackUsed && fake.calls.length === 1, "ok on step 1");
  } finally { fake.restore(); }
});

Deno.test("A7: 429, 402, 401/403, 404 and context length move on", async () => {
  for (const failure of [err(429), err(402, "Insufficient credits"), err(401), err(403), err(404, "model not found"), err(400, "This model's maximum context length is 8192 tokens")]) {
    const fake = fakeFetch({ "openrouter.ai": [failure], "api.anthropic.com": [anthropicOk("next")] });
    try {
      const result = await generateWithModelRoute({ ...base, route: route([step("openrouter", "a/model"), step("anthropic", "claude-haiku-4-5")]), trace: fakeTrace().trace, providerRegistry: registry() });
      assert(result.text === "next", `moved on after ${JSON.stringify(failure.body)}`);
    } finally { fake.restore(); }
  }
});

Deno.test("A7: an unrecognised 400 stops at canned text", async () => {
  const fake = fakeFetch({ "openrouter.ai": [err(400, "invalid parameter")] });
  try {
    const result = await generateWithModelRoute({ ...base, route: route([step("openrouter", "a/model"), step("anthropic", "claude-haiku-4-5")]), trace: fakeTrace().trace, providerRegistry: registry() });
    assert(result.text === "CANNED" && result.outcome === "canned" && fake.calls.length === 1, "canned, no second call");
  } finally { fake.restore(); }
});

Deno.test("A7: a safety block never falls through to another step", async () => {
  // Output safety (shared check), provider content filter and Anthropic refusal.
  for (const replies of [
    { "openrouter.ai": [openRouterOk("I will tell you how to end my life")] },
    { "openrouter.ai": [openRouterOk("filtered", { finish_reason: "content_filter" })] }
  ]) {
    const fake = fakeFetch({ ...replies, "api.anthropic.com": [anthropicOk("must not be called")] });
    try {
      const t = fakeTrace();
      const result = await generateWithModelRoute({ ...base, route: route([step("openrouter", "a/model"), step("anthropic", "claude-haiku-4-5")]), trace: t.trace, providerRegistry: registry() });
      assert(result.outcome === "safety_block" && result.moderationStatus === "blocked" && result.text === "CANNED", "blocked");
      assert(fake.calls.every((c) => c.host === "openrouter.ai"), "no other provider called");
      assert((t.root().output as any).outcome === "safety_block", "root outcome safety_block");
    } finally { fake.restore(); }
  }
  const fake = fakeFetch({ "openrouter.ai": [err(503)], "api.anthropic.com": [anthropicOk("refused", "refusal")], "api.openai.com": [{ body: {} }] });
  try {
    const result = await generateWithModelRoute({ ...base, route: route([step("openrouter", "a/model"), step("anthropic", "claude-haiku-4-5"), step("openai", "gpt-4o-mini")]), trace: fakeTrace().trace, providerRegistry: registry() });
    assert(result.outcome === "safety_block" && !fake.calls.some((c) => c.host === "api.openai.com"), "a refusal stops the chain");
  } finally { fake.restore(); }
});

Deno.test("A7: a prompt flagged by the safety policy calls no provider", async () => {
  const fake = fakeFetch({});
  try {
    const result = await generateWithModelRoute({ ...base, safetyText: "tôi muốn tự tử", route: route([step("openrouter", "a/model")]), trace: fakeTrace().trace, providerRegistry: registry() });
    assert(result.moderationStatus === "blocked" && fake.calls.length === 0, "blocked before any call");
  } finally { fake.restore(); }
});

Deno.test("A7: an unusable format moves on once per request", async () => {
  const fake = fakeFetch({ "openrouter.ai": [openRouterOk("bad 1"), openRouterOk("bad 2")], "api.anthropic.com": [anthropicOk("never")] });
  try {
    const steps = [step("openrouter", "a/model"), step("openrouter", "b/model"), step("anthropic", "claude-haiku-4-5")];
    const result = await generateWithModelRoute({ ...base, route: route(steps), trace: fakeTrace().trace, providerRegistry: registry(), acceptOutput: () => "missing_field" });
    assert(fake.calls.length === 2 && result.text === "bad 2" && result.outcome === "ok_fallback", "second answer returned unchanged for the feature check");
    assert(result.attempts[0].code === "malformed_response" && result.attempts[0].detail === "output_check:missing_field", "first rejection recorded");
  } finally { fake.restore(); }
  const thrown = fakeFetch({ "openrouter.ai": [openRouterOk("", {}), openRouterOk("", {})], "api.anthropic.com": [anthropicOk("never")] });
  try {
    const steps = [step("openrouter", "a/model"), step("openrouter", "b/model"), step("anthropic", "claude-haiku-4-5")];
    const result = await generateWithModelRoute({ ...base, route: route(steps), trace: fakeTrace().trace, providerRegistry: registry() });
    assert(result.outcome === "canned" && thrown.calls.length === 2, "two empty answers: one move, then canned");
  } finally { thrown.restore(); }
});

Deno.test("A7: skip rules: switched off, no secret, data class below the feature, open circuit", async () => {
  const fake = fakeFetch({ "api.openai.com": [{ body: { id: "c", choices: [{ message: { content: "openai answer" }, finish_reason: "stop" }], usage: {} } }] });
  try {
    const t = fakeTrace();
    const steps = [step("anthropic", "claude-haiku-4-5"), step("gemini", "gemini-2.5-flash"), step("deepseek", "deepseek-flash"), step("openai", "gpt-4o-mini")];
    const result = await generateWithModelRoute({
      ...base, feature: "persona_chat", route: route(steps, { feature: "persona_chat" }), trace: t.trace,
      // anthropic: circuit open; gemini: no GEMINI_API_KEY in env; deepseek: public only (persona_chat is sensitive); openai raised to sensitive.
      providerRegistry: registry({ anthropic: { openedUntil: Date.now() + 60_000, allowedDataClass: "sensitive" }, gemini: { allowedDataClass: "sensitive" }, deepseek: { enabled: true }, openai: { allowedDataClass: "sensitive" } }),
      env: { ...env, GEMINI_API_KEY: "" }
    });
    assert(result.text === "openai answer" && fake.calls.length === 1, "only the allowed provider was called");
    equal((t.root().output as any).chain.skipped.map((s: any) => s.reason), ["circuit_open", "missing_secret", "data_class"], "skip reasons");
    assert(result.outcome === "ok_fallback", "a later step answered");
  } finally { fake.restore(); }
  const off = fakeFetch({});
  try {
    const result = await generateWithModelRoute({ ...base, route: route([step("anthropic", "claude-haiku-4-5")]), trace: fakeTrace().trace, providerRegistry: defaultProviderRegistry() });
    assert(result.outcome === "canned" && off.calls.length === 0, "seeded defaults keep direct providers off");
  } finally { off.restore(); }
});

Deno.test("A7: the total deadline bounds the chain", async () => {
  const fake = fakeFetch({ "openrouter.ai": [{ delayUntilAbort: true }], "api.anthropic.com": [anthropicOk("too late")] });
  try {
    const t = fakeTrace();
    const started = Date.now();
    const steps = [step("openrouter", "a/model", { timeoutMs: 4_500 }), step("anthropic", "claude-haiku-4-5", { timeoutMs: 30_000 })];
    const result = await generateWithModelRoute({ ...base, route: route(steps, { totalDeadlineMs: 5_000 }), trace: t.trace, providerRegistry: registry() });
    assert(Date.now() - started < 5_500, "finished inside the deadline");
    assert(result.outcome === "canned" && !fake.calls.some((c) => c.host === "api.anthropic.com"), "no step started without at least 1 s left");
    equal((t.root().output as any).chain.skipped.map((s: any) => s.reason), ["deadline"], "skip recorded");
    assert((t.root().output as any).chain.totalDeadlineMs === 5_000, "deadline recorded");
  } finally { fake.restore(); }
});

Deno.test("A7: the feature deadline and the route deadline: the smaller wins", async () => {
  const fake = fakeFetch({ "openrouter.ai": [openRouterOk("ok")] });
  try {
    const t = fakeTrace();
    await generateWithModelRoute({ ...base, deadlineMs: 20_000, route: route([step("openrouter", "a/model")], { totalDeadlineMs: 90_000 }), trace: t.trace, providerRegistry: registry() });
    assert((t.root().output as any).chain.totalDeadlineMs === 20_000, "min of both");
  } finally { fake.restore(); }
});

Deno.test("A7: cost cap: a step whose worst case exceeds the cap is skipped; spending stops the chain", async () => {
  const fake = fakeFetch({ "openrouter.ai": [openRouterOk("cheap answer")] });
  try {
    const t = fakeTrace();
    const steps = [step("anthropic", "claude-sonnet-4-5", { maxTokens: 2000 }), step("openrouter", "a/model")];
    const result = await generateWithModelRoute({ ...base, costCapMicro: 20_000, route: route(steps), trace: t.trace, providerRegistry: registry({ anthropic: { allowedDataClass: "sensitive" } }) });
    assert(result.text === "cheap answer" && !fake.calls.some((c) => c.host === "api.anthropic.com"), "expensive step skipped");
    equal((t.root().output as any).chain.skipped.map((s: any) => s.reason), ["cost_cap"], "cost_cap recorded");
  } finally { fake.restore(); }
  const spent = fakeFetch({ "openrouter.ai": [{ status: 503, body: { error: { code: 503 }, usage: { cost: 0.025 } } }], "api.anthropic.com": [anthropicOk("never")] });
  try {
    const t = fakeTrace();
    const result = await generateWithModelRoute({ ...base, route: route([step("openrouter", "a/model"), step("anthropic", "claude-haiku-4-5")]), trace: t.trace, providerRegistry: registry() });
    assert(result.outcome === "canned" && spent.calls.length === 1, "no step after the cap was spent");
    assert((t.root().output as any).chain.spentMicro === 25_000, "spent cost from the billing receipt");
  } finally { spent.restore(); }
});

Deno.test("A7: without a configured cap the default is 0.02 USD", async () => {
  const fake = fakeFetch({ "openrouter.ai": [openRouterOk("ok")] });
  try {
    const t = fakeTrace();
    const { costCapMicro: _drop, ...noCap } = base;
    await generateWithModelRoute({ ...noCap, env: { ...env, SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "" }, route: route([step("openrouter", "a/model")]), trace: t.trace, providerRegistry: registry() });
    assert((t.root().output as any).chain.costCapMicro === DEFAULT_COST_CAP_MICRO && DEFAULT_COST_CAP_MICRO === 20_000, "default cap");
  } finally { fake.restore(); }
});

Deno.test("A7: JSON mode and reasoning are sent per step; DeepSeek uses its own endpoint", async () => {
  const fake = fakeFetch({ "openrouter.ai": [err(503)], "api.deepseek.com": [{ body: { id: "d", model: "deepseek-flash", choices: [{ message: { content: "{}" }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1 } } }] });
  try {
    const steps = [step("openrouter", "a/model", { jsonMode: true, reasoning: { mode: "low", maxTokens: 256 } }), step("deepseek", "deepseek-flash", { jsonMode: true })];
    const result = await generateWithModelRoute({ ...base, feature: "tarot_reading", dataClass: "public", route: route(steps), trace: fakeTrace().trace, providerRegistry: registry({ deepseek: { enabled: true } }) });
    equal(fake.calls[0].body.response_format, { type: "json_object" }, "OpenRouter JSON mode");
    equal(fake.calls[0].body.reasoning, { max_tokens: 256 }, "step reasoning");
    equal(fake.calls[0].body.provider, { zdr: true, data_collection: "deny" }, "ZDR kept with JSON mode");
    equal(fake.calls[1].body.response_format, { type: "json_object" }, "DeepSeek JSON mode");
    assert(result.provider === "deepseek" && result.text === "{}", "DeepSeek answered");
  } finally { fake.restore(); }
});

Deno.test("A7: stored steps parse strictly; anything out of bounds falls back to the legacy columns", () => {
  const good = [{ provider: "openrouter", model: "a/b", timeout_ms: 30000, max_tokens: 2000, temperature: 0.6, json_mode: false, reasoning: { mode: "low", maxTokens: 256 } }];
  equal(parseRouteSteps(good), [{ provider: "openrouter", model: "a/b", timeoutMs: 30000, maxTokens: 2000, temperature: 0.6, jsonMode: false, reasoning: { mode: "low", maxTokens: 256 } }], "parsed");
  for (const bad of [null, [], Array(5).fill(good[0]), [{ ...good[0], provider: "groq" }], [{ ...good[0], timeout_ms: 500 }], [{ ...good[0], json_mode: "no" }], [{ ...good[0], reasoning: { mode: "max" } }]]) {
    assert(parseRouteSteps(bad) === undefined, `refused ${JSON.stringify(bad).slice(0, 60)}`);
  }
});

Deno.test("A7: error classes", () => {
  const e = (input: Partial<ConstructorParameters<typeof ModelProviderError>[0]>) => new ModelProviderError({ provider: "openrouter", code: "provider_error", message: "m", ...input });
  equal(classifyProviderError(e({ safetyBlocked: true, status: 503 })), { errorClass: "safety", moveOn: false }, "safety first");
  equal(classifyProviderError(e({ code: "trace_capture_failed" })), { errorClass: "trace", moveOn: false }, "trace capture");
  equal(classifyProviderError(e({ code: "network_error" })), { errorClass: "transient", moveOn: true }, "network");
  equal(classifyProviderError(e({ status: 402 })), { errorClass: "payment", moveOn: true }, "402");
  equal(classifyProviderError(e({ status: 400 })), { errorClass: "other", moveOn: false }, "plain 400");
});
