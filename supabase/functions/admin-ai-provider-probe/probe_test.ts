import { classifyReply, probeProvider, requestedProviders, safeDetail } from "./probe.ts";

function assert(value: unknown, label: string) { if (!value) throw new Error(label); }
const SECRET = "sk-test-secret-value-1234567890";
const secrets = (names: string[]) => (name: string) => names.includes(name) ? SECRET : undefined;

type Step = { status: number; body?: unknown };
function fakeFetch(steps: Step[]) {
  const calls: Array<{ url: string; method: string; headers: Record<string, string>; body: any }> = [];
  const impl = ((url: string, init: RequestInit) => {
    calls.push({ url, method: String(init.method), headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(String(init.body)) : null });
    const step = steps.shift();
    if (!step) return Promise.reject(new TypeError("network down"));
    return Promise.resolve(new Response(step.body === undefined ? "" : JSON.stringify(step.body), { status: step.status }));
  }) as unknown as typeof fetch;
  return { calls, impl };
}
const check = (outcome: unknown) => assert(!JSON.stringify(outcome).includes(SECRET), "secret value never in the outcome");

Deno.test("A7 probe: no secret means not_configured and no network call", async () => {
  const fake = fakeFetch([]);
  const outcome = await probeProvider("anthropic", secrets([]), fake.impl);
  assert(outcome.result === "not_configured" && outcome.configured === false && fake.calls.length === 0, "not configured");
  assert(outcome.secretName === "ANTHROPIC_API_KEY", "secret name only");
});

Deno.test("A7 probe: OpenRouter ok = key info then a 1-token ZDR call", async () => {
  const fake = fakeFetch([{ status: 200, body: { data: { limit: null, limit_remaining: null, usage: 1 } } }, { status: 200, body: { choices: [] } }]);
  const outcome = await probeProvider("openrouter", secrets(["OPENROUTER_API_KEY"]), fake.impl);
  assert(outcome.result === "ok" && outcome.configured && outcome.httpStatus === 200, "ok");
  assert(fake.calls[0].url === "https://openrouter.ai/api/v1/key" && fake.calls[0].method === "GET", "key info first");
  assert(fake.calls[1].body.max_tokens === 1 && fake.calls[1].body.provider.zdr === true && fake.calls[1].body.provider.data_collection === "deny", "1 token, ZDR");
  assert(fake.calls[0].headers.Authorization === `Bearer ${SECRET}`, "key only in the auth header");
  check(outcome);
});

Deno.test("A7 probe: classes for bad key, no credit and unreachable per provider", async () => {
  const cases: Array<[Parameters<typeof probeProvider>[0], Step[], string]> = [
    ["openrouter", [{ status: 401, body: { error: { code: 401, message: "No auth credentials found" } } }], "bad_key"],
    ["openrouter", [{ status: 200, body: { data: { limit_remaining: 0 } } }], "no_credit"],
    ["openrouter", [{ status: 200, body: { data: {} } }, { status: 402, body: { error: { code: 402, message: "Insufficient credits" } } }], "no_credit"],
    ["anthropic", [{ status: 401, body: { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } } }], "bad_key"],
    ["anthropic", [{ status: 200, body: { data: [{ id: "claude-sonnet-4-5" }, { id: "claude-haiku-4-5" }] } }, { status: 400, body: { error: { type: "invalid_request_error", message: "Your credit balance is too low" } } }], "no_credit"],
    ["anthropic", [{ status: 200, body: { data: [] } }, { status: 402, body: { error: { type: "billing_error" } } }], "no_credit"],
    ["anthropic", [{ status: 529, body: { error: { type: "overloaded_error" } } }], "unreachable"],
    ["gemini", [{ status: 400, body: { error: { code: 400, message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT" } } }], "bad_key"],
    ["gemini", [{ status: 200, body: { models: [{ name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] }] } }, { status: 429, body: { error: { status: "RESOURCE_EXHAUSTED", message: "You exceeded your current quota" } } }], "no_credit"],
    ["gemini", [{ status: 200, body: { models: [] } }, { status: 400, body: { error: { status: "FAILED_PRECONDITION", message: "billing is not enabled" } } }], "no_credit"],
    ["openai", [{ status: 401, body: { error: { code: "invalid_api_key", message: "Incorrect API key provided" } } }], "bad_key"],
    ["openai", [{ status: 200, body: { data: [{ id: "gpt-4o-mini" }] } }, { status: 429, body: { error: { code: "credit_balance_exhausted", type: "insufficient_quota" } } }], "no_credit"],
    ["openai", [{ status: 200, body: { data: [{ id: "gpt-4o-mini" }] } }, { status: 429, body: { error: { message: "Rate limit reached for requests" } } }], "unreachable"],
    ["deepseek", [{ status: 200, body: { data: [{ id: "deepseek-flash" }] } }, { status: 402, body: { error: { message: "Insufficient Balance" } } }], "no_credit"],
    ["deepseek", [], "unreachable"]
  ];
  for (const [provider, steps, expected] of cases) {
    const fake = fakeFetch(steps);
    const outcome = await probeProvider(provider, secrets(["OPENROUTER_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY", "DEEPSEEK_API_KEY"]), fake.impl);
    assert(outcome.result === expected, `${provider} ${JSON.stringify(steps).slice(0, 80)} -> ${outcome.result}, expected ${expected}`);
    check(outcome);
  }
});

Deno.test("A7 probe: picks a cheap listed model and caps the generation at 1 token", async () => {
  const anthropic = fakeFetch([{ status: 200, body: { data: [{ id: "claude-opus-4-1" }, { id: "claude-haiku-4-5-20251001" }] } }, { status: 200, body: {} }]);
  await probeProvider("anthropic", secrets(["ANTHROPIC_API_KEY"]), anthropic.impl);
  assert(anthropic.calls[1].body.model === "claude-haiku-4-5-20251001" && anthropic.calls[1].body.max_tokens === 1, "haiku, 1 token");
  assert(anthropic.calls[0].headers["x-api-key"] === SECRET && !anthropic.calls[0].url.includes(SECRET), "key in header, not URL");
  const gemini = fakeFetch([{ status: 200, body: { models: [{ name: "models/gemini-2.5-pro", supportedGenerationMethods: ["generateContent"] }, { name: "models/gemini-2.5-flash-lite", supportedGenerationMethods: ["generateContent"] }] } }, { status: 200, body: {} }]);
  await probeProvider("gemini", secrets(["GEMINI_API_KEY"]), gemini.impl);
  assert(gemini.calls[1].url.endsWith("/models/gemini-2.5-flash-lite:generateContent") && gemini.calls[1].body.generationConfig.maxOutputTokens === 1, "flash-lite, 1 token");
  assert(!gemini.calls.some((call) => call.url.includes(SECRET)), "Gemini key never in the URL");
  const openai = fakeFetch([{ status: 200, body: { data: [{ id: "gpt-5" }, { id: "gpt-4o-mini" }] } }, { status: 200, body: {} }]);
  await probeProvider("openai", secrets(["OPENAI_API_KEY"]), openai.impl);
  assert(openai.calls[1].body.model === "gpt-4o-mini" && openai.calls[1].body.max_completion_tokens === 1, "gpt-4o-mini, 1 token");
});

Deno.test("A7 probe: request body validation and safe details", () => {
  assert(requestedProviders(null)?.length === 5 && requestedProviders({})?.length === 5, "all by default");
  assert(requestedProviders({ providers: ["anthropic", "anthropic"] })?.join() === "anthropic", "deduplicated");
  assert(requestedProviders({ providers: ["groq"] }) === null && requestedProviders({ providers: [] }) === null && requestedProviders([1]) === null, "invalid lists refused");
  assert(safeDetail({ error: { type: "billing_error", message: "secret text" } }) === "billing_error", "type token only");
  assert(safeDetail({ error: { message: `key ${SECRET} leaked` } }) === null, "message text never kept");
  assert(safeDetail({ error: "has spaces in it" }) === null, "free text refused");
  assert(classifyReply("openrouter", { status: 403, json: { error: { message: "Key budget limit exceeded" } } }) === "no_credit", "OpenRouter budget 403");
});
