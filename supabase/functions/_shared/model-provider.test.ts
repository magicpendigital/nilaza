import { ModelProviderError } from "./model-provider.ts";
import { ActiveModelRouteError, defaultModelRoutes, generateWithModelRoute, readActiveModelRoute } from "./model-router.ts";
import { invokeAnthropic } from "./providers/anthropic.ts";
import { invokeGemini } from "./providers/gemini.ts";
import { invokeOpenAI } from "./providers/openai.ts";
import { invokeOpenRouter } from "./providers/openrouter.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function mockFetch(body: unknown, status = 200, headers: Record<string, string> = {}) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers
      })
    )) as typeof fetch;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

const request = {
  feature: "persona_chat",
  provider: "openai" as const,
  model: "test-model",
  system: "system",
  messages: [{ role: "user" as const, content: "hello" }],
  temperature: 0.2,
  maxOutputTokens: 100,
  responseSchema: "test_schema"
};

Deno.test("OpenAI adapter parses Responses API text and usage", async () => {
  const restore = mockFetch({
    id: "chatcmpl_123",
    choices: [{ message: { content: "OpenAI hello" }, finish_reason: "stop" }],
    usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 }
  }, 200, { "x-request-id": "req_openai" });
  try {
    const result = await invokeOpenAI(request, "key");
    assert(result.text === "OpenAI hello", "OpenAI text was not parsed");
    assert(result.usage.totalTokens === 7, "OpenAI usage was not parsed");
    assert(result.requestId === "req_openai", "OpenAI request id was not parsed");
  } finally {
    restore();
  }
});

Deno.test("OpenRouter adapter parses chat completions response", async () => {
  const restore = mockFetch({
    id: "or_123",
    choices: [{ message: { content: "OpenRouter hello" }, finish_reason: "stop" }],
    usage: { prompt_tokens: 2, completion_tokens: 5, total_tokens: 7 }
  });
  try {
    const result = await invokeOpenRouter({ ...request, provider: "openrouter" }, "key");
    assert(result.text === "OpenRouter hello", "OpenRouter text was not parsed");
    assert(result.usage.outputTokens === 5, "OpenRouter usage was not parsed");
  } finally {
    restore();
  }
});

Deno.test("OpenRouter QA hooks capture the exact wire body and response without provider credentials", async () => {
  const originalFetch = globalThis.fetch;
  let wireBody: Record<string, unknown> | undefined;
  const captured: Array<Record<string, unknown>> = [];
  globalThis.fetch = ((_url: string, init?: RequestInit) => {
    wireBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Promise.resolve(new Response(JSON.stringify({
      id: "or_qa_response",
      model: "openrouter/test-model",
      choices: [{ message: { content: "Synthetic response" }, finish_reason: "stop" }]
    }), { status: 200, headers: { "Content-Type": "application/json", "x-request-id": "req_qa_1" } }));
  }) as typeof fetch;
  try {
    await invokeOpenRouter({
      ...request,
      provider: "openrouter",
      qaTraceHooks: {
        onRequest: value => captured.push({ phase: "request", ...value }),
        onResponse: value => captured.push({ phase: "response", ...value })
      }
    }, "provider-secret-must-not-be-captured");
    assert(captured.length === 2, "QA hooks must observe one request and one response");
    assert(JSON.stringify(captured[0].body) === JSON.stringify(wireBody), "QA request body must match the exact JSON sent to OpenRouter");
    assert(captured[0].url === "https://openrouter.ai/api/v1/chat/completions", "QA request URL should identify the provider endpoint");
    assert(captured[0].method === "POST", "QA request method should be retained");
    assert(JSON.stringify(captured).includes("Synthetic response"), "QA response body should be retained");
    assert(!JSON.stringify(captured).includes("provider-secret-must-not-be-captured"), "Provider credentials must never enter QA capture");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("OpenRouter adapter accepts structured text content", async () => {
  const restore = mockFetch({
    model: "provider/free-model",
    choices: [{ message: { content: [{ type: "text", text: "Structured OpenRouter hello" }] }, finish_reason: "stop" }]
  });
  try {
    const result = await invokeOpenRouter({ ...request, provider: "openrouter" }, "key");
    assert(result.text === "Structured OpenRouter hello", "Structured OpenRouter text was not parsed");
    assert(result.model === "provider/free-model", "Resolved OpenRouter model was not retained");
  } finally {
    restore();
  }
});

Deno.test("OpenRouter applies the canonical Astrology AI JSON schema only to its versioned route", async () => {
  const originalFetch = globalThis.fetch;
  const bodies: any[] = [];
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    return Promise.resolve(new Response(JSON.stringify({
      id: "or_astrology_schema",
      choices: [{ message: { content: "{}" }, finish_reason: "stop" }]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
  }) as typeof fetch;
  try {
    await invokeOpenRouter({ ...request, feature: "astrology_report", responseSchema: "astrology_ai_insight_v1", provider: "openrouter" }, "key");
    await invokeOpenRouter({ ...request, feature: "tarot_reading", responseSchema: "tarot_reading_output_v3", provider: "openrouter" }, "key");

    const astrologyBody = bodies[0];
    const format = astrologyBody.response_format;
    assert(format?.type === "json_schema", "Astrology must request JSON Schema output");
    assert(format.json_schema?.strict === true, "Astrology schema enforcement must be strict");
    assert(astrologyBody.provider?.require_parameters === true, "OpenRouter must select a compatible endpoint");
    assert(astrologyBody.provider?.zdr === true, "Astrology must require a zero-data-retention endpoint");
    assert(astrologyBody.provider?.data_collection === "deny", "Astrology must deny provider data collection");
    const schema = format.json_schema.schema;
    const expectedFields = ["headline", "synthesis", "evidenceFactIds", "patterns", "tensions", "focusSections", "reflectionQuestions", "suggestedFollowUps"];
    assert(JSON.stringify(schema.required) === JSON.stringify(expectedFields), "Astrology model output fields must match the contract allowlist");
    assert(!Object.hasOwn(schema.properties, "metadata"), "Server-owned response metadata must not be requested from the model");
    const hasRef = (value: any): boolean => {
      if (!value || typeof value !== "object") return false;
      if (Array.isArray(value)) return value.some(hasRef);
      return Object.hasOwn(value, "$ref") || Object.values(value).some(hasRef);
    };
    assert(!hasRef(schema), "Provider schema must inline canonical contract references");
    assert(bodies[1].response_format === undefined && bodies[1].provider === undefined, "Other AI routes must not inherit Astrology output settings");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("OpenRouter adapter disables hidden reasoning for persona chat", async () => {
  const originalFetch = globalThis.fetch;
  let payload: Record<string, unknown> | undefined;
  globalThis.fetch = ((_url: string, init?: RequestInit) => {
    payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Promise.resolve(new Response(JSON.stringify({
      choices: [{ message: { content: "A direct response" }, finish_reason: "stop" }]
    })));
  }) as typeof fetch;
  try {
    await invokeOpenRouter({ ...request, provider: "openrouter", model: "deepseek/deepseek-v4-flash-0731" }, "key");
    assert(JSON.stringify(payload?.reasoning) === JSON.stringify({ effort: "none" }), "Persona Chat must disable hidden reasoning");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("OpenRouter adapter accepts object text content", async () => {
  const restore = mockFetch({
    choices: [{ message: { content: { text: "Object OpenRouter hello" } }, finish_reason: "stop" }]
  });
  try {
    const result = await invokeOpenRouter({ ...request, provider: "openrouter" }, "key");
    assert(result.text === "Object OpenRouter hello", "Object OpenRouter text was not parsed");
  } finally {
    restore();
  }
});

Deno.test("Gemini adapter parses generateContent response", async () => {
  const restore = mockFetch({
    candidates: [{ content: { parts: [{ text: "Gemini hello" }] }, finishReason: "STOP" }],
    usageMetadata: { promptTokenCount: 2, candidatesTokenCount: 3, totalTokenCount: 5 }
  });
  try {
    const result = await invokeGemini({ ...request, provider: "gemini" }, "key");
    assert(result.text === "Gemini hello", "Gemini text was not parsed");
    assert(result.usage.inputTokens === 2, "Gemini usage was not parsed");
  } finally {
    restore();
  }
});

Deno.test("Anthropic adapter parses Messages API response", async () => {
  const restore = mockFetch({
    id: "msg_123",
    content: [{ type: "text", text: "Anthropic hello" }],
    usage: { input_tokens: 2, output_tokens: 6 },
    stop_reason: "end_turn"
  }, 200, { "request-id": "req_anthropic" });
  try {
    const result = await invokeAnthropic({ ...request, provider: "anthropic" }, "key");
    assert(result.text === "Anthropic hello", "Anthropic text was not parsed");
    assert(result.usage.totalTokens === 8, "Anthropic usage was not normalized");
    assert(result.requestId === "req_anthropic", "Anthropic request id was not parsed");
  } finally {
    restore();
  }
});

Deno.test("Provider adapter maps auth errors", async () => {
  const restore = mockFetch({ error: { message: "bad key" } }, 401);
  try {
    let thrown: unknown;
    try {
      await invokeOpenAI(request, "key");
    } catch (error) {
      thrown = error;
    }
    assert(thrown instanceof ModelProviderError, "Expected ModelProviderError");
    assert((thrown as ModelProviderError).code === "provider_auth_error", "Auth error was not mapped");
  } finally {
    restore();
  }
});

Deno.test("Model router falls back on missing primary secret", async () => {
  const restore = mockFetch({
    candidates: [{ content: { parts: [{ text: "fallback generated" }] }, finishReason: "STOP" }]
  });
  try {
    const result = await generateWithModelRoute({
      feature: "daily_insight",
      system: "system",
      messages: [{ role: "user", content: "hello" }],
      fallbackText: "local fallback",
      env: { OPENAI_API_KEY: "", GEMINI_API_KEY: "key" },
      route: {
        feature: "daily_insight",
        version: "test",
        status: "active",
        primaryProvider: "openai",
        primaryModel: "missing-key-model",
        fallbackProvider: "gemini",
        fallbackModel: "fallback-model",
        temperature: 0.2,
        maxOutputTokens: 100,
        responseSchema: "test",
        fallbackWhen: ["missing_api_key"],
        safetyPolicy: {}
      }
    });
    assert(result.text === "fallback generated", `Router did not use fallback provider: ${JSON.stringify(result)}`);
    assert(result.fallbackUsed === true, "Router did not mark fallbackUsed");
    assert(result.provider === "gemini", "Router provider should be Gemini");
  } finally {
    restore();
  }
});

Deno.test("Model router does not call provider for blocked safety input", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = (() => {
    fetchCalled = true;
    return Promise.resolve(new Response("{}"));
  }) as typeof fetch;
  try {
    const result = await generateWithModelRoute({
      feature: "persona_chat",
      system: "system",
      messages: [{ role: "user", content: "I want to kill myself" }],
      fallbackText: "safe fallback",
      env: { OPENAI_API_KEY: "key" },
      route: {
        feature: "persona_chat",
        version: "test",
        status: "active",
        primaryProvider: "openai",
        primaryModel: "model",
        temperature: 0.2,
        maxOutputTokens: 100,
        responseSchema: "test",
        fallbackWhen: ["provider_5xx"],
        safetyPolicy: {}
      }
    });
    assert(result.moderationStatus === "blocked", "Safety input should be blocked");
    assert(!fetchCalled, "Provider should not be called for blocked input");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Deferred model trace waits for the post-provider Astrology finalization", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => Promise.resolve(new Response(JSON.stringify({
    choices: [{ message: { content: "{}" }, finish_reason: "stop" }]
  }), { status: 200, headers: { "Content-Type": "application/json" } }))) as typeof fetch;
  let flushCount = 0;
  let rootEndStatus = "";
  let spanIndex = 0;
  const trace = {
    traceId: "trace_deferred_test",
    startSpan: () => {
      const isRoot = spanIndex++ === 0;
      return {
        spanId: isRoot ? "root" : `span-${spanIndex}`,
        update() { return this; },
        captureWireRequest() { return this; },
        captureWireResponse() { return this; },
        end(status: string) { if (isRoot) rootEndStatus = status; return this; }
      };
    },
    flush: async () => { flushCount++; return { persisted: true, exported: false }; }
  };
  try {
    const result = await generateWithModelRoute({
      feature: "astrology_report",
      system: "system",
      messages: [{ role: "user", content: "synthetic" }],
      fallbackText: "{}",
      trace: trace as any,
      deferTraceFlush: true,
      env: { OPENROUTER_API_KEY: "test-key" },
      route: {
        feature: "astrology_report", version: "test-route", status: "active",
        primaryProvider: "openrouter", primaryModel: "test-model", temperature: 0,
        maxOutputTokens: 128, responseSchema: "astrology_ai_insight_v1", fallbackWhen: [], safetyPolicy: {}
      }
    });
    assert(flushCount === 0, "Provider completion must not finalize the deferred root trace");
    await result.finalizeTrace?.({ status: "error", output: { stage: "validation", errorCode: "invalid_model_response" } });
    assert(flushCount === 1, "Post-provider finalization must flush exactly once");
    assert(rootEndStatus === "error", "The root trace status must include the post-provider failure");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function routeLookupFixture(rows: unknown[], error: unknown = null) {
  const calls: unknown[] = [];
  const query = {
    select: (value: string) => { calls.push(["select", value]); return query; },
    eq: (key: string, value: string) => { calls.push(["eq", key, value]); return query; },
    order: (key: string, options: unknown) => { calls.push(["order", key, options]); return query; },
    limit: (maximum: number) => { calls.push(["limit", maximum]); return Promise.resolve({ data: rows, error }); }
  };
  return { calls, client: { from: (table: string) => { calls.push(["from", table]); return query; } } };
}
const publishedOracleRow = {
  id: "11111111-1111-4111-8111-111111111111", feature: "oracle_router", version: "fictional-active-route",
  status: "active", primary_provider: "openrouter", primary_model: "fictional-model",
  fallback_provider: null, fallback_model: null, temperature: 0.6, max_output_tokens: 300,
  response_schema: "oracle_router_v1", fallback_when: [], safety_policy: {}
};

Deno.test("normal route lookup uses active-only deterministic ordering and no experimental traffic", async () => {
  const f = routeLookupFixture([publishedOracleRow]);
  const route = await readActiveModelRoute(f.client, "oracle_router");
  assert(route.version === "fictional-active-route", "Expected the sole active version");
  const calls = JSON.stringify(f.calls);
  assert(calls.includes('["eq","status","active"]'), "Ordinary lookup must select only active");
  assert(!calls.includes("experimental"), "Experimental status entered ordinary lookup");
  assert(calls.includes('["order","published_at",{"ascending":false,"nullsFirst":false}]'), "Publication ordering must handle NULL deterministically");
  assert(calls.includes('["order","id",{"ascending":true}]') && calls.includes('["limit",2]'), "Lookup must detect ambiguous active versions");
});
Deno.test("competing active routes fail rather than silently selecting one", async () => {
  const f = routeLookupFixture([publishedOracleRow, { ...publishedOracleRow, id: "22222222-2222-4222-8222-222222222222" }]);
  let caught;
  try { await readActiveModelRoute(f.client, "oracle_router"); } catch (error) { caught = error; }
  assert(caught instanceof ActiveModelRouteError && caught.code === "ambiguous_active_model_route", "Multiple active versions must fail explicitly");
});
Deno.test("unexpected inactive or wrong-feature route cannot become ordinary runtime route", async () => {
  for (const row of [{ ...publishedOracleRow, status: "experimental" }, { ...publishedOracleRow, feature: "persona_chat" }]) {
    let caught;
    try { await readActiveModelRoute(routeLookupFixture([row]).client, "oracle_router"); } catch (error) { caught = error; }
    assert(caught instanceof ActiveModelRouteError && caught.code === "invalid_active_model_route", "Unexpected route must fail closed");
  }
});
Deno.test("absent/unavailable route retains existing local fallback compatibility", async () => {
  for (const fixture of [routeLookupFixture([]), routeLookupFixture([], { message: "private query detail" })]) {
    const route = await readActiveModelRoute(fixture.client, "oracle_router");
    assert(route === defaultModelRoutes.oracle_router, "Existing fallback behavior changed beyond active-only scope");
  }
});
