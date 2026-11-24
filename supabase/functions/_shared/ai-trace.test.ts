import { createAiTrace, redactTraceValue } from "./ai-trace.ts";
import { generateWithModelRoute } from "./model-router.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("answer version allowlist survives redaction without admitting prose in metadata", () => {
  const input = { promptVersionId: "prompt-v2", promptVersion: "v2", routeVersionId: "route-id", routeVersion: "v3", calculationVersion: "calc-2", chartContractVersion: "0.2.0", responseSchema: "astrology_ai_insight_v1", interactionId: "interaction-1", attemptId: "attempt-2", system: "private system", question: "private question", promptDatabaseVersionId: "private prose masquerading as an id" };
  const result = redactTraceValue(input, "redacted") as Record<string, unknown>;
  for (const key of ["promptVersionId", "promptVersion", "routeVersionId", "routeVersion", "calculationVersion", "chartContractVersion", "responseSchema", "interactionId", "attemptId"]) assert(result[key] === input[key as keyof typeof input], `${key} preserved`);
  assert(!JSON.stringify(result).includes("private"), "no private prose survives");
});

Deno.test("model campaign tags survive redaction so metrics can group runs by variant", () => {
  const input = { campaignId: "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6", variant: "B", question: "private question" };
  const result = redactTraceValue(input, "redacted") as Record<string, unknown>;
  assert(result.campaignId === input.campaignId && result.variant === "B", "campaign tags preserved");
  const prose = redactTraceValue({ variant: "a long private sentence with spaces" }, "redacted") as Record<string, unknown>;
  assert(typeof prose.variant !== "string", "variant prose is redacted");
  assert(!JSON.stringify(result).includes("private"), "no private prose survives");
});

Deno.test("AI trace redacts prompt content while preserving routing metadata", () => {
  const redacted = redactTraceValue({
    provider: "openai",
    model: "test-model",
    temperature: 0.4,
    system: "private system prompt",
    messages: [{ role: "user", content: "a private question" }]
  }, "redacted") as Record<string, unknown>;

  assert(redacted.provider === "openai", "provider should remain visible");
  assert(redacted.model === "test-model", "model should remain visible");
  assert(redacted.temperature === 0.4, "temperature should remain visible");
  assert(JSON.stringify(redacted).includes('"redacted":true'), "text fields should be marked redacted");
  assert(!JSON.stringify(redacted).includes("private system prompt"), "system prompt must not leak in redacted mode");
  assert(!JSON.stringify(redacted).includes("private question"), "message content must not leak in redacted mode");
});

Deno.test("AI trace downgrades full debug in production", async () => {
  const { trace, rootSpan } = createAiTrace({
    feature: "trace_test",
    env: {
      AI_TRACE_ENABLED: "true",
      AI_TRACE_SINK: "none",
      AI_TRACE_ENVIRONMENT: "production",
      AI_TRACE_PAYLOAD_MODE: "full_debug",
      AI_TRACE_ALLOW_FULL_DEBUG: "true"
    }
  });
  rootSpan.update({ input: { content: "must stay private" } }).end("ok");
  assert(trace.payloadMode === "redacted", "production traces must downgrade full debug mode");
  const result = await trace.flush();
  assert(result.exported === false && result.persisted === false, "sink none should not export or persist");
});

Deno.test("AI trace persists only redacted payloads to Supabase", async () => {
  const writes: Array<{ table: string; value: unknown }> = [];
  const { trace, rootSpan } = createAiTrace({
    feature: "trace_test",
    supabase: {
      from: (table: string) => ({
        insert: async (value: unknown) => {
          writes.push({ table, value });
          return { error: null };
        }
      })
    },
    env: { AI_TRACE_ENABLED: "true", AI_TRACE_SINK: "supabase", AI_TRACE_PAYLOAD_MODE: "redacted" }
  });
  rootSpan.update({ input: { system: "private system prompt", provider: "openai" } }).end("ok");
  const result = await trace.flush();
  const serialized = JSON.stringify(writes);
  assert(result.persisted === true, "trace should persist through the Supabase sink");
  assert(writes.some((write) => write.table === "ai_trace_runs"), "trace run should be written");
  assert(writes.some((write) => write.table === "ai_trace_spans"), "trace spans should be written");
  assert(!serialized.includes("private system prompt"), "local trace payload must not contain private prompt text");
});

Deno.test("AI trace exports full debug payload through Langfuse OTLP only when explicitly allowed", async () => {
  const originalFetch = globalThis.fetch;
  let captured: { url: string; init?: RequestInit } | undefined;
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    captured = { url, init };
    return Promise.resolve(new Response("{}", { status: 200 }));
  }) as typeof fetch;
  try {
    const { trace, rootSpan } = createAiTrace({
      feature: "trace_test",
      env: {
        AI_TRACE_ENABLED: "true",
        AI_TRACE_SINK: "langfuse",
        AI_TRACE_ENVIRONMENT: "staging",
        AI_TRACE_PAYLOAD_MODE: "full_debug",
        AI_TRACE_ALLOW_FULL_DEBUG: "true",
        LANGFUSE_PUBLIC_KEY: "pk-test",
        LANGFUSE_SECRET_KEY: "sk-test",
        LANGFUSE_OTLP_ENDPOINT: "https://langfuse.example.test/api/public/otel/v1/traces"
      }
    });
    rootSpan.update({ input: { system: "synthetic prompt" }, output: { text: "synthetic output" } }).end("ok");
    const result = await trace.flush();
    const body = JSON.parse(String(captured?.init?.body));
    assert(result.exported === true, "Langfuse sink should report export success");
    assert(captured?.url.endsWith("/v1/traces"), "trace should use the OTLP endpoint");
    assert(captured?.init?.headers && new Headers(captured.init.headers).get("x-langfuse-ingestion-version") === "4", "Langfuse v4 ingestion header is required");
    assert(JSON.stringify(body).includes("synthetic prompt"), "full debug should include synthetic prompt text");
    assert(!JSON.stringify(body).includes("sk-test"), "secret key must not appear in OTLP body");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Model router emits provider trace hooks and correlation ids", async () => {
  const originalFetch = globalThis.fetch;
  let requestPayload: Record<string, unknown> | undefined;
  globalThis.fetch = ((_url: string, init?: RequestInit) => {
    requestPayload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Promise.resolve(new Response(JSON.stringify({
      id: "trace_req_1",
      choices: [{ message: { content: "traced response" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 4, completion_tokens: 3, total_tokens: 7 }
    }), { status: 200, headers: { "x-request-id": "trace_req_1" } }));
  }) as typeof fetch;

  try {
    const result = await generateWithModelRoute({
      feature: "persona_chat",
      system: "system prompt",
      messages: [{ role: "user", content: "hello" }],
      fallbackText: "fallback",
      env: {
        OPENAI_API_KEY: "key",
        AI_TRACE_ENABLED: "true",
        AI_TRACE_SINK: "none",
        AI_TRACE_PAYLOAD_MODE: "metadata"
      },
      route: {
        feature: "persona_chat",
        version: "trace-test",
        status: "active",
        primaryProvider: "openai",
        primaryModel: "trace-model",
        temperature: 0.2,
        maxOutputTokens: 80,
        responseSchema: "trace_schema",
        fallbackWhen: ["provider_5xx"],
        safetyPolicy: {}
      }
    });
    assert(result.text === "traced response", "router should return provider output");
    assert(Boolean(result.traceId), "router should return trace id");
    assert(Boolean(result.traceSpanId), "router should return trace root span id");
    assert(requestPayload?.model === "trace-model", "trace test should observe exact provider request");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
