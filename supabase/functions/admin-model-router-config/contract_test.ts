import { MODEL_ROUTE_PUBLISH_CONTRACT, modelRouteRpcPayload } from "./contract.ts";

function assert(value: unknown, label: string) { if (!value) throw new Error(label); }
function throws(fn: () => unknown, pattern: RegExp, label: string) {
  try { fn(); } catch (error) { if (pattern.test(String((error as Error).message))) return; throw new Error(`${label}: ${(error as Error).message}`); }
  throw new Error(`${label}: did not throw`);
}
const legacy = {
  contractVersion: MODEL_ROUTE_PUBLISH_CONTRACT, publishRequestId: "11111111-1111-4111-8111-111111111111", expectedActiveId: null,
  feature: "tarot_reading", version: "v-test", status: "active", primary: { provider: "openrouter", model: "a/b" }, fallback: { provider: "openrouter", model: "c/d" },
  temperature: 0.6, maxTokens: 2000, responseSchema: "tarot_reading_output_v3", fallbackWhen: ["provider_timeout"], safetyPolicy: {}
};
const step = (provider: string, model: string, extra: Record<string, unknown> = {}) => ({ provider, model, timeoutMs: 30000, maxTokens: 1500, temperature: 0.5, jsonMode: false, reasoning: { mode: "off" }, ...extra });

Deno.test("A7 contract: a v2 payload without steps maps exactly as before (no new keys)", () => {
  const payload = modelRouteRpcPayload(legacy);
  assert(JSON.stringify(Object.keys(payload)) === JSON.stringify(["contract_version", "publish_request_id", "expected_active_id", "feature", "version", "status", "primary", "fallback", "temperature", "max_output_tokens", "response_schema", "fallback_when", "safety_policy"]), "same keys");
  assert(payload.max_output_tokens === 2000 && payload.temperature === 0.6, "values kept");
});

Deno.test("A7 contract: steps derive primary, fallback, temperature and max tokens; deepseek allowed", () => {
  const payload = modelRouteRpcPayload({ ...legacy, primary: undefined, fallback: undefined, steps: [step("openrouter", "a/b"), step("anthropic", "claude-haiku-4-5"), step("deepseek", "deepseek-flash", { jsonMode: true })], totalDeadlineMs: 90000, note: "Thêm Anthropic và DeepSeek" });
  assert(payload.primary.provider === "openrouter" && payload.fallback?.provider === "anthropic", "first two steps");
  assert(payload.temperature === 0.5 && payload.max_output_tokens === 1500, "first step limits");
  const steps = (payload as any).steps;
  assert(steps.length === 3 && steps[2].json_mode === true && steps[0].timeout_ms === 30000 && steps[0].reasoning.mode === "off", "snake_case steps");
  assert((payload as any).total_deadline_ms === 90000 && (payload as any).note === "Thêm Anthropic và DeepSeek", "deadline and note");
  const single = modelRouteRpcPayload({ ...legacy, steps: [step("openrouter", "a/b")], note: "Một bước duy nhất" });
  assert(single.fallback === null, "one step has no fallback");
  const draft = modelRouteRpcPayload({ ...legacy, status: "draft", steps: [step("openrouter", "a/b")] });
  assert((draft as any).note === undefined, "a draft needs no note");
});

Deno.test("A7 contract: invalid chains are refused before the database", () => {
  throws(() => modelRouteRpcPayload({ ...legacy, steps: Array(5).fill(step("openrouter", "a/b")), note: "Ghi chú hợp lệ" }), /1 to 4/, "5 steps");
  throws(() => modelRouteRpcPayload({ ...legacy, steps: [], note: "Ghi chú hợp lệ" }), /1 to 4/, "0 steps");
  throws(() => modelRouteRpcPayload({ ...legacy, steps: [step("groq", "x")], note: "Ghi chú hợp lệ" }), /Unsupported provider/, "unknown provider");
  throws(() => modelRouteRpcPayload({ ...legacy, steps: [step("openrouter", "a b")], note: "Ghi chú hợp lệ" }), /Invalid model/, "space in model");
  throws(() => modelRouteRpcPayload({ ...legacy, steps: [step("openrouter", "a/b", { timeoutMs: 500 })], note: "Ghi chú hợp lệ" }), /timeout/, "short timeout");
  throws(() => modelRouteRpcPayload({ ...legacy, steps: [step("openrouter", "a/b", { extra: true })], note: "Ghi chú hợp lệ" }), /Invalid route step/, "unknown key");
  throws(() => modelRouteRpcPayload({ ...legacy, steps: [step("openrouter", "a/b", { reasoning: { mode: "max" } })], note: "Ghi chú hợp lệ" }), /reasoning/, "bad reasoning");
  throws(() => modelRouteRpcPayload({ ...legacy, steps: [step("openrouter", "a/b")], totalDeadlineMs: 150000, note: "Ghi chú hợp lệ" }), /5-140/, "deadline over 140 s");
  throws(() => modelRouteRpcPayload({ ...legacy, steps: [step("openrouter", "a/b", { timeoutMs: 60000 })], totalDeadlineMs: 30000, note: "Ghi chú hợp lệ" }), /longer than the total/, "step over deadline");
  throws(() => modelRouteRpcPayload({ ...legacy, steps: [step("openrouter", "a/b")] }), /note is required/, "active chain without note");
  throws(() => modelRouteRpcPayload({ ...legacy, note: "short" }), /10-500/, "short note");
});

Deno.test("Batch C contract: decision steps only for reader_router; primary/fallback are the chat steps", () => {
  const decision = step("openrouter_decisions", "typesafe/jev-1.14", { timeoutMs: 3000, maxTokens: 64, temperature: 0, reasoning: null });
  const chat = step("openrouter", "deepseek/deepseek-v4.1-flash", { timeoutMs: 3000, maxTokens: 200, temperature: 0.2, jsonMode: true });
  const reader = { ...legacy, feature: "reader_router", responseSchema: "reader_router_choice_v1", totalDeadlineMs: 5000, note: "Bộ chọn người đọc" };
  const payload = modelRouteRpcPayload({ ...reader, steps: [decision, chat] });
  assert(payload.primary.provider === "openrouter" && payload.fallback === null, "primary is the first chat step, no chat fallback");
  assert(payload.temperature === 0.2 && payload.max_output_tokens === 200, "limits from the chat step");
  assert((payload as any).steps[0].provider === "openrouter_decisions", "decision step kept in order");
  throws(() => modelRouteRpcPayload({ ...reader, steps: [decision] }), /at least one chat step/, "decision-only chain");
  throws(() => modelRouteRpcPayload({ ...legacy, steps: [decision, chat], note: "Ghi chú hợp lệ" }), /only allowed for reader_router/, "decision step on tarot_reading");
  throws(() => modelRouteRpcPayload({ ...legacy, feature: "tarot_note", steps: [step("openai_decisions", "gpt-5-mini"), chat], note: "Ghi chú hợp lệ" }), /only allowed for reader_router/, "decision step on tarot_note");
  throws(() => modelRouteRpcPayload({ ...reader, steps: undefined, primary: { provider: "gemini_decisions", model: "x" }, fallback: null }), /only allowed for reader_router/, "decision provider as legacy primary");
  const note = modelRouteRpcPayload({ ...legacy, feature: "tarot_note", responseSchema: "tarot_note_output_v1", maxTokens: 700 });
  assert(note.feature === "tarot_note", "tarot_note accepted");
});

Deno.test("2026-11-25 contract: numerology_private_message routes publish like any chat feature, without decision steps", () => {
  const chat = step("openrouter", "deepseek/deepseek-v4.1-flash", { timeoutMs: 20000, maxTokens: 600, temperature: 0.6, jsonMode: true });
  const numerology = { ...legacy, feature: "numerology_private_message", responseSchema: "numerology_private_message_v1", maxTokens: 600, temperature: 0.6 };
  assert(modelRouteRpcPayload(numerology).feature === "numerology_private_message", "numerology_private_message accepted");
  throws(() => modelRouteRpcPayload({ ...numerology, steps: [step("openrouter_decisions", "typesafe/jev-1.14"), chat], note: "Ghi chú hợp lệ" }), /only allowed for reader_router/, "decision step on numerology");
});
