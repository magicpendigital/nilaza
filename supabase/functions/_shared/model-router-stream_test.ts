// Persona chat streaming (docs/contracts/persona-chat-streaming.md): OpenRouter SSE through the shared router.
// Provider calls are faked with streamed bodies; no network.
import { ModelRoute, ModelRouteStep } from "./model-provider.ts";
import { STREAM_HOLDBACK_CHARS, createStreamGate, generateWithModelRoute } from "./model-router.ts";
import { ProviderRegistry, defaultProviderRegistry } from "./provider-registry.ts";

function assert(value: unknown, label: string) { if (!value) throw new Error(label); }
function equal(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}

const encoder = new TextEncoder();
type Part = string | { fail: true };
/** An SSE body: each part is one network chunk; { fail } breaks the connection at that point. */
function sseBody(parts: Part[]): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      const part = parts[index++];
      if (part === undefined) return controller.close();
      if (typeof part !== "string") return controller.error(new TypeError("connection reset"));
      controller.enqueue(encoder.encode(part));
    }
  });
}
const delta = (content: string) => `data: ${JSON.stringify({ id: "gen-s", model: "m", choices: [{ delta: { content } }] })}\n\n`;
const finish = `data: ${JSON.stringify({ id: "gen-s", model: "m", choices: [{ delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 12, completion_tokens: 7, total_tokens: 19 } })}\n\n`;
const done = "data: [DONE]\n\n";
const streamError = `data: ${JSON.stringify({ error: { code: 502, message: "upstream overloaded" }, choices: [{ delta: { content: "" }, finish_reason: "error" }] })}\n\n`;

type Reply = { stream?: Part[]; json?: unknown; status?: number };
function fakeFetch(replies: Reply[]) {
  const calls: any[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = ((url: string | URL, init?: RequestInit) => {
    assert(new URL(String(url)).host === "openrouter.ai", "only OpenRouter is called");
    calls.push(init?.body ? JSON.parse(String(init.body)) : null);
    const reply = replies.shift();
    if (!reply) return Promise.reject(new TypeError("unexpected fetch"));
    if (reply.stream) return Promise.resolve(new Response(sseBody(reply.stream), { status: 200, headers: { "Content-Type": "text/event-stream" } }));
    return Promise.resolve(new Response(JSON.stringify(reply.json ?? {}), { status: reply.status ?? 200, headers: { "Content-Type": "application/json" } }));
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

function fakeTrace() {
  const spans: Array<{ name: string; output?: unknown }> = [];
  const trace = {
    traceId: "trace_stream_test",
    startSpan: (input: { name: string }) => {
      const record = { name: input.name, output: undefined as unknown };
      spans.push(record);
      const span = {
        spanId: `s${spans.length}`,
        update(value: { output?: unknown }) { if (value.output) record.output = value.output; return span; },
        captureWireRequest() { return span; },
        captureWireResponse() { return span; },
        end(_status: string, output?: unknown) { if (output) record.output = output; return span; }
      };
      return span;
    },
    flush: async () => ({ persisted: false, exported: false })
  };
  return { trace: trace as any, root: () => spans[0].output as Record<string, unknown> };
}

const step = (model: string): ModelRouteStep => ({ provider: "openrouter", model, timeoutMs: 30_000, maxTokens: 800, temperature: 0.6, jsonMode: false, reasoning: { mode: "off" } });
const route = (steps?: ModelRouteStep[]): ModelRoute => ({
  feature: "persona_chat", version: "stream-test", status: "active",
  primaryProvider: "openrouter", primaryModel: "primary-model", fallbackProvider: "openrouter", fallbackModel: "fallback-model",
  temperature: 0.6, maxOutputTokens: 800, responseSchema: "chat_reply_v2",
  fallbackWhen: ["provider_timeout", "rate_limit", "provider_5xx", "malformed_response"], safetyPolicy: {},
  ...(steps ? { steps, totalDeadlineMs: 60_000 } : {})
});
function registry(): ProviderRegistry {
  const value = defaultProviderRegistry();
  value.get("openrouter")!.enabled = true;
  value.get("openrouter")!.allowedDataClass = "sensitive";
  return value;
}
// A fake key that only exists in this test's env object.
const base = { feature: "persona_chat", system: "system", messages: [{ role: "user" as const, content: "Kinh Dịch nói gì về sự kiên nhẫn?" }], fallbackText: "CANNED", env: { OPENROUTER_API_KEY: "or-test" }, costCapMicro: 20_000, providerRegistry: registry() };
const ANSWER = "Quẻ Nhu nói về sự chờ đợi có chủ đích: mây đã tụ trên trời, mưa sẽ đến khi đủ duyên.";
const pieces = (text: string, size: number) => Array.from({ length: Math.ceil(text.length / size) }, (_, i) => text.slice(i * size, (i + 1) * size));

Deno.test("stream: deltas arrive in order, the joined deltas equal the final text, usage is read once from the last chunk", async () => {
  for (const steps of [[step("a/model"), step("b/model")], undefined]) {
    const fake = fakeFetch([{ stream: [": OPENROUTER PROCESSING\n\n", ...pieces(ANSWER, 7).map(delta), finish, done] }]);
    try {
      const sent: string[] = [];
      const t = fakeTrace();
      const result = await generateWithModelRoute({ ...base, route: route(steps), trace: t.trace, onDelta: (text) => sent.push(text) });
      assert(fake.calls.length === 1 && fake.calls[0].stream === true, "one streamed call");
      assert(result.text === ANSWER && result.moderationStatus === "passed" && result.streamed === true && !result.streamInterrupted, "final text");
      assert(sent.join("") === ANSWER && sent.length > 1, "deltas add up to the final text");
      assert(result.usage.inputTokens === 12 && result.usage.outputTokens === 7, "usage from the final chunk");
      assert(t.root().streamed === true, "root span marks the stream");
    } finally { fake.restore(); }
  }
});

Deno.test("stream: without onDelta the request is the plain JSON call (non-stream path unchanged)", async () => {
  const fake = fakeFetch([{ json: { id: "gen-1", model: "m", choices: [{ message: { content: ANSWER }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1 } } }]);
  try {
    const result = await generateWithModelRoute({ ...base, route: route([step("a/model")]), trace: fakeTrace().trace });
    assert(fake.calls[0].stream === undefined && result.text === ANSWER && result.streamed === undefined, "no stream field, no stream flag");
  } finally { fake.restore(); }
});

Deno.test("stream: an error before the first visible text falls back to the next step (step chain and legacy route)", async () => {
  for (const steps of [[step("a/model"), step("b/model")], undefined]) {
    const fake = fakeFetch([{ stream: [": keep-alive\n\n", streamError] }, { stream: [...pieces(ANSWER, 10).map(delta), finish, done] }]);
    try {
      const sent: string[] = [];
      const result = await generateWithModelRoute({ ...base, route: route(steps), trace: fakeTrace().trace, onDelta: (text) => sent.push(text) });
      equal(fake.calls.map((c) => c.model), steps ? ["a/model", "b/model"] : ["primary-model", "fallback-model"], "second model tried");
      assert(result.text === ANSWER && result.fallbackUsed && sent.join("") === ANSWER, "fallback answer streamed");
      assert(result.attempts[0].ok === false && result.attempts[0].code === "provider_stream_error", "first attempt recorded");
    } finally { fake.restore(); }
  }
});

Deno.test("stream: a failure after text was sent ends the turn as interrupted, with no fallback call", async () => {
  const long = ANSWER.repeat(2);
  for (const tail of [[streamError], [{ fail: true } as Part]]) {
    const fake = fakeFetch([{ stream: [...pieces(long, 20).map(delta), ...tail] }, { stream: [delta("never"), finish, done] }]);
    try {
      const sent: string[] = [];
      const t = fakeTrace();
      const result = await generateWithModelRoute({ ...base, route: route([step("a/model"), step("b/model")]), trace: t.trace, onDelta: (text) => sent.push(text) });
      assert(fake.calls.length === 1, "no second step once text was sent");
      assert(sent.join("").length > 0 && result.streamInterrupted === true && result.text === "CANNED", "interrupted");
      assert(t.root().stream_interrupted === true, "root span marks the interruption");
    } finally { fake.restore(); }
  }
});

Deno.test("stream: a safety phrase is caught before it is sent, even when split across chunks", async () => {
  const opening = "Một câu mở đầu khá dài để vượt qua phần văn bản được giữ lại. ";
  const fake = fakeFetch([{ stream: [delta(opening), delta("I will tell you how to end my"), delta(" life now"), finish, done] }, { stream: [delta("never"), finish, done] }]);
  try {
    const sent: string[] = [];
    const result = await generateWithModelRoute({ ...base, route: route([step("a/model"), step("b/model")]), trace: fakeTrace().trace, onDelta: (text) => sent.push(text) });
    const visible = sent.join("");
    assert(!visible.toLowerCase().includes("end my life") && !visible.includes("end my"), "blocked phrase never sent");
    assert(result.moderationStatus === "blocked" && result.text === "CANNED" && fake.calls.length === 1, "blocked, no fallback model");
  } finally { fake.restore(); }
});

Deno.test("stream gate: holds back the tail, flushes after the checks, never splits an emoji", () => {
  const sent: string[] = [];
  const gate = createStreamGate("openrouter", (text) => sent.push(text));
  const text = "Bình an 🌿 " + "x".repeat(40);
  for (const char of Array.from(text)) gate.onDelta(char);
  const before = sent.join("");
  assert(before.length === text.length - STREAM_HOLDBACK_CHARS || before.length === text.length - STREAM_HOLDBACK_CHARS - 1, "tail held back");
  gate.flush();
  assert(sent.join("") === text && gate.emitted, "flush sends the rest");
  for (const chunk of sent) assert(!/[\uD800-\uDBFF]$/.test(chunk), "no lone high surrogate at a chunk end");
  const quiet = createStreamGate("openrouter", () => { throw new Error("must not send"); });
  quiet.onDelta("ngắn");
  assert(!quiet.emitted, "short text stays held");
});
