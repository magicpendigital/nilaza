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
    // Batch C (2026-11-24): the private note is short (700) and the reader suggestion returns a slug (200).
    // 2026-11-25: the numerology private message is at most 120 words of JSON (600).
    const limit = route.feature === "tarot_note" ? 700 : route.feature === "reader_router" ? 200
      : route.feature === "numerology_private_message" ? 600 : 2000;
    assertEquals(route.maxOutputTokens, limit, `${route.feature} limit`);
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

Deno.test("Admin A4 deadline: attempts share the total, the last gets what is left, no deadline keeps 40 s / 60 s", async () => {
  const { attemptTimeoutMs, providerTimeoutMs, validFeatureDeadlineMs } = await import("./model-provider.ts");
  assertEquals(providerTimeoutMs("ai_council", undefined), 40_000, "default without override");
  assertEquals(providerTimeoutMs("astrology_report", undefined), 60_000, "astrology default without override");
  assertEquals(providerTimeoutMs("ai_council", 12_345), 12_345, "router override");
  assertEquals(attemptTimeoutMs(90_000, 0, 0, 2), 45_000, "primary gets an equal share");
  assertEquals(attemptTimeoutMs(90_000, 3_000, 1, 2), 87_000, "fallback gets the rest after a fast failure");
  assertEquals(attemptTimeoutMs(90_000, 45_000, 1, 2), 45_000, "fallback after a primary timeout");
  assertEquals(attemptTimeoutMs(90_000, 0, 0, 1), 90_000, "single model gets it all");
  assertEquals(attemptTimeoutMs(5_000, 4_600, 1, 2), 400, "almost nothing left");
  assertEquals([validFeatureDeadlineMs(4_999), validFeatureDeadlineMs(140_001), validFeatureDeadlineMs(60_000.5), validFeatureDeadlineMs(null), validFeatureDeadlineMs(60_000)],
    [undefined, undefined, undefined, undefined, 60_000], "deadline bounds 5-140 s");
});

Deno.test("Admin A4 deadline: a hanging primary is cut at its share and the fallback answers within the total", async () => {
  const { generateWithModelRoute } = await import("./model-router.ts");
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = ((_input: unknown, init?: RequestInit) => {
    calls += 1;
    if (calls === 1) {
      return new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal?.reason)));
    }
    return Promise.resolve(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "fallback answer" }] }, finishReason: "STOP" }] }), { status: 200 }));
  }) as typeof fetch;
  const started = Date.now();
  try {
    const result = await generateWithModelRoute({
      feature: "daily_insight",
      deadlineMs: 5_000,
      system: "system",
      messages: [{ role: "user", content: "hello" }],
      fallbackText: "local fallback",
      env: { get: (key: string) => key === "GEMINI_API_KEY" ? "test-key" : "" },
      route: {
        feature: "daily_insight", version: "test", status: "active",
        primaryProvider: "gemini", primaryModel: "slow-model", fallbackProvider: "gemini", fallbackModel: "fast-model",
        temperature: 0.2, maxOutputTokens: 100, responseSchema: "test", fallbackWhen: ["provider_timeout"], safetyPolicy: {}
      }
    });
    const elapsed = Date.now() - started;
    assertEquals([result.text, result.fallbackUsed, result.attempts[0]?.code], ["fallback answer", true, "provider_timeout"], "fallback after timeout");
    assertEquals(elapsed >= 2_300 && elapsed < 5_000, true, `primary cut near 2.5 s, total under 5 s (took ${elapsed} ms)`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
