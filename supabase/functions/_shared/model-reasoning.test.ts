import { ModelProviderError, routeReasoning } from "./model-provider.ts";
import { defaultModelRoutes } from "./model-router.ts";
import { invokeOpenRouter, openRouterReasoning } from "./providers/openrouter.ts";

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}

const request = {
  feature: "ai_council",
  provider: "openrouter" as const,
  model: "deepseek/deepseek-v4.1-flash",
  system: "system",
  messages: [{ role: "user" as const, content: "hello" }],
  temperature: 0.6,
  maxOutputTokens: 2000
};

Deno.test("routeReasoning reads the Admin setting from safety_policy and ignores anything else", () => {
  assertEquals(routeReasoning({ reasoning: { mode: "off", maxTokens: 512 } }), { mode: "off" }, "off drops the cap");
  assertEquals(routeReasoning({ reasoning: { mode: "low", maxTokens: 512 } }), { mode: "low", maxTokens: 512 }, "low keeps the cap");
  assertEquals(routeReasoning({ reasoning: { mode: "high", maxTokens: 10 } }), { mode: "high" }, "a cap under 64 is ignored");
  assertEquals(routeReasoning({ reasoning: { mode: "turbo" } }), undefined, "unknown mode");
  assertEquals(routeReasoning({}), undefined, "not set");
  assertEquals(routeReasoning(null), undefined, "no policy");
});

Deno.test("OpenRouter reasoning: off sends effort none, a cap sends max_tokens, a level sends the effort", () => {
  assertEquals(openRouterReasoning({ ...request, reasoning: { mode: "off" } }), { effort: "none" }, "off");
  assertEquals(openRouterReasoning({ ...request, reasoning: { mode: "low", maxTokens: 512 } }), { max_tokens: 512 }, "cap");
  assertEquals(openRouterReasoning({ ...request, reasoning: { mode: "medium" } }), { effort: "medium" }, "level");
  assertEquals(openRouterReasoning(request), undefined, "not set leaves the model default");
  assertEquals(openRouterReasoning({ ...request, feature: "persona_chat" }), { effort: "none" }, "persona chat stays direct when not set");
});

Deno.test("Default routes use 2000 tokens, light reasoning for Council and Astrology, off elsewhere", () => {
  for (const route of Object.values(defaultModelRoutes)) {
    assertEquals(route.maxOutputTokens, 2000, `${route.feature} limit`);
    const light = route.feature === "ai_council" || route.feature === "astrology_report";
    assertEquals(routeReasoning(route.safetyPolicy), light ? { mode: "low", maxTokens: 512 } : { mode: "off" }, `${route.feature} reasoning`);
    assertEquals(route.fallbackWhen.includes("schema_validation_failed_once"), false, `${route.feature} fallback reasons`);
  }
});

Deno.test("OpenRouter sends the reasoning object and treats a JSON reply cut off by the limit as malformed", async () => {
  const originalFetch = globalThis.fetch;
  let sent: Record<string, unknown> = {};
  globalThis.fetch = ((_url: string, init?: RequestInit) => {
    sent = JSON.parse(String(init?.body));
    return Promise.resolve(new Response(JSON.stringify({
      model: "deepseek/deepseek-v4.1-flash",
      choices: [{ message: { content: "{\"turns\":[" }, finish_reason: "length" }],
      usage: { prompt_tokens: 10, completion_tokens: 2000 }
    }), { status: 200 }));
  }) as typeof fetch;
  try {
    let error: unknown;
    try {
      await invokeOpenRouter({ ...request, reasoning: { mode: "low", maxTokens: 512 } }, "key");
    } catch (caught) {
      error = caught;
    }
    assertEquals(sent.reasoning, { max_tokens: 512 }, "wire reasoning");
    assertEquals(error instanceof ModelProviderError && error.code, "malformed_response", "cut-off reply");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Astrology waits 60 s per model, other features 40 s (Owner 2026-11-03)", async () => {
  const { providerTimeoutMs } = await import("./model-provider.ts");
  assertEquals(providerTimeoutMs("astrology_report"), 60_000, "astrology");
  assertEquals(providerTimeoutMs("ai_council"), 40_000, "council");
  assertEquals(2 * providerTimeoutMs("astrology_report") < 150_000, true, "two attempts fit the 150 s idle limit");
});
