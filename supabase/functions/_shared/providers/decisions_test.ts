import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { DecisionProviderError, decisionRequestBody, invokeDecision, type DecisionRequest } from "./decisions.ts";

const options = { "the-love-oracle": "Love and relationships", "the-clear-strategist": "Work and decisions" };
const base = (provider: DecisionRequest["provider"]): DecisionRequest => ({
  provider, model: provider === "openai_decisions" ? "gpt-6-luna" : provider === "gemini_decisions" ? "gemini-decision-1" : "typesafe/jev-1.14",
  state: "question: Should I text my ex?\ntopic: love", questionName: "reader", instructions: "Pick the best guide.", options, timeoutMs: 3000
});
const env = (values: Record<string, string>) => ({ get: (key: string) => values[key] });
type Captured = { url: string; init: RequestInit };
function fake(body: unknown, status = 200, captured: Captured[] = []) {
  return async (url: string, init: RequestInit) => {
    captured.push({ url, init });
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  };
}

Deno.test("openrouter_decisions: documented body and auth, answer keyed by question name", async () => {
  const captured: Captured[] = [];
  const result = await invokeDecision(base("openrouter_decisions"), env({ OPENROUTER_API_KEY: "k-or" }), fake({
    answers: { reader: { type: "choice", choice: "the-love-oracle", probabilities: { "the-love-oracle": 0.8, "the-clear-strategist": 0.2 }, confidence: 0.7 } },
    usage: { cost: 0.00001 }
  }, 200, captured));
  assertEquals(result.choice, "the-love-oracle");
  assertEquals(result.confidence, 0.7);
  assertEquals(result.probabilities, { "the-love-oracle": 0.8, "the-clear-strategist": 0.2 });
  assertEquals(result.costUsd, 0.00001);
  assertEquals(captured[0].url, "https://openrouter.ai/api/alpha/decisions");
  assertEquals((captured[0].init.headers as Record<string, string>).Authorization, "Bearer k-or");
  const sent = JSON.parse(String(captured[0].init.body));
  assertEquals(Object.keys(sent).sort(), ["model", "questions", "state"], "no user field or identifiers are sent");
  assertEquals(sent.questions.reader, { type: "choice", instructions: "Pick the best guide.", criteria: options });
});

Deno.test("openai_decisions: questions array with choices {value, description}; answers array", async () => {
  const captured: Captured[] = [];
  const result = await invokeDecision(base("openai_decisions"), env({ OPENAI_API_KEY: "k-oa" }), fake({
    answers: [{ name: "reader", type: "choice", choice: "the-clear-strategist", probabilities: [{ value: "the-clear-strategist", probability: 0.6 }, { value: "x", probability: 0.4 }], confidence: 0.5 }]
  }, 200, captured));
  assertEquals(result.choice, "the-clear-strategist");
  assertEquals(result.probabilities, { "the-clear-strategist": 0.6 }, "unknown values are dropped");
  assertEquals(captured[0].url, "https://api.openai.com/v1/decisions");
  const sent = JSON.parse(String(captured[0].init.body));
  assertEquals(sent.input, base("openai_decisions").state);
  assertEquals(sent.questions[0].choices, [{ value: "the-love-oracle", description: "Love and relationships" }, { value: "the-clear-strategist", description: "Work and decisions" }]);
});

Deno.test("gemini_decisions: x-goog-api-key header and input field", async () => {
  const captured: Captured[] = [];
  const result = await invokeDecision(base("gemini_decisions"), env({ GEMINI_API_KEY: "k-g" }), fake({
    answers: { reader: { type: "choice", choice: "the-love-oracle", confidence: 0.9 } }
  }, 200, captured));
  assertEquals(result.choice, "the-love-oracle");
  const headers = captured[0].init.headers as Record<string, string>;
  assertEquals(headers["x-goog-api-key"], "k-g");
  assertEquals(headers.Authorization, undefined);
  assertEquals(Object.keys(JSON.parse(String(captured[0].init.body))).sort(), ["input", "model", "questions"]);
});

Deno.test("missing key is provider_unavailable without a network call", async () => {
  let called = false;
  const error = await assertRejects(() => invokeDecision(base("openai_decisions"), env({}), async () => { called = true; return new Response("{}"); }), DecisionProviderError);
  assertEquals(error.code, "provider_unavailable");
  assert(!called);
});

Deno.test("refusal, unknown choice, missing answer and HTTP errors are typed failures", async () => {
  const cases: Array<[unknown, number, string]> = [
    [{ answers: { reader: { type: "refusal" } } }, 200, "refusal"],
    [{ answers: { reader: { type: "choice", choice: "not-a-candidate" } } }, 200, "malformed_response"],
    [{ answers: {} }, 200, "malformed_response"],
    [{ error: "nope" }, 401, "provider_auth_error"],
    [{ error: "slow down" }, 429, "rate_limit"],
    [{ error: "down" }, 503, "provider_5xx"],
    [{ error: "bad" }, 400, "provider_error"]
  ];
  for (const [body, status, code] of cases) {
    const error = await assertRejects(() => invokeDecision(base("openrouter_decisions"), env({ OPENROUTER_API_KEY: "k" }), fake(body, status)), DecisionProviderError);
    assertEquals(error.code, code, JSON.stringify(body));
  }
});

Deno.test("a timeout is provider_timeout", async () => {
  const error = await assertRejects(() => invokeDecision({ ...base("openrouter_decisions"), timeoutMs: 5 }, env({ OPENROUTER_API_KEY: "k" }),
    (_url, init) => new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("timed out", "TimeoutError"))))), DecisionProviderError);
  assertEquals(error.code, "provider_timeout");
});

Deno.test("request bodies carry only the state text, never identifiers", () => {
  for (const provider of ["openrouter_decisions", "openai_decisions", "gemini_decisions"] as const) {
    const text = JSON.stringify(decisionRequestBody(base(provider)));
    assert(!/user|session|nickname|journal|birth/i.test(text.replace(base(provider).state, "")), provider);
  }
});
