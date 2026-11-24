/** Versioned wire contract. Both Edge publication and SQL tests use this adapter. */
export const MODEL_ROUTE_PUBLISH_CONTRACT = "model_route_publish_v2";
// Admin A7 (D3): deepseek added; migration 20261113140000 extends the SQL checks the same way.
const providers = new Set(["openai", "openrouter", "gemini", "anthropic", "deepseek"]);
// Batch C (2026-11-24): tarot_note and reader_router; migration 20261124090000 extends the SQL checks the same way.
const features = new Set(["oracle_router", "persona_chat", "ai_council", "tarot_reading", "daily_insight", "astrology_report", "tarot_note", "reader_router"]);
// Decision APIs return one choice and no text: valid only as steps of a reader_router chain, never as primary/fallback.
export const DECISION_PROVIDERS = new Set(["openrouter_decisions", "openai_decisions", "gemini_decisions"]);
export const DECISION_FEATURES = new Set(["reader_router"]);
const reasons = new Set(["missing_api_key", "provider_timeout", "rate_limit", "provider_5xx", "malformed_response"]);
const reasoningModes = new Set(["off", "minimal", "low", "medium", "high"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_ROUTE_STEPS = 4;
export const MAX_TOTAL_DEADLINE_MS = 140_000;
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === "object" && !Array.isArray(value);
const intIn = (value: unknown, min: number, max: number) => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
function requireText(value: unknown, name: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw Error(`Invalid ${name}`);
  return value.trim();
}
function model(value: unknown, allowDecision = false) {
  if (!object(value)) throw Error("Invalid provider/model pair");
  const provider = requireText(value.provider, "provider", 30).toLowerCase();
  if (DECISION_PROVIDERS.has(provider) && !allowDecision) throw Error("Decision providers are only allowed for reader_router");
  if (!providers.has(provider) && !DECISION_PROVIDERS.has(provider)) throw Error("Unsupported provider");
  return { provider, model: requireText(value.model, "model", 160) };
}
/** A7: one chain step from Admin (camelCase) to the stored shape (snake_case). */
function routeStep(value: unknown, allowDecision: boolean) {
  if (!object(value)) throw Error("Invalid route step");
  const known = new Set(["provider", "model", "timeoutMs", "maxTokens", "temperature", "jsonMode", "reasoning"]);
  if (Object.keys(value).some((key) => !known.has(key))) throw Error("Invalid route step");
  const pair = model(value, allowDecision);
  if (/\s/.test(pair.model)) throw Error("Invalid model");
  if (!intIn(value.timeoutMs, 1_000, MAX_TOTAL_DEADLINE_MS)) throw Error("Invalid step timeout");
  if (!intIn(value.maxTokens, 64, 8192)) throw Error("Invalid step output token limit");
  if (!Number.isFinite(value.temperature) || value.temperature < 0 || value.temperature > 2) throw Error("Invalid step temperature");
  if (typeof value.jsonMode !== "boolean") throw Error("Invalid step JSON mode");
  let reasoning: { mode: string; maxTokens?: number } | null = null;
  if (value.reasoning !== undefined && value.reasoning !== null) {
    if (!object(value.reasoning) || !reasoningModes.has(value.reasoning.mode)
      || Object.keys(value.reasoning).some((key) => key !== "mode" && key !== "maxTokens")
      || (value.reasoning.maxTokens !== undefined && !intIn(value.reasoning.maxTokens, 64, 8192))) throw Error("Invalid step reasoning");
    reasoning = { mode: value.reasoning.mode, ...(value.reasoning.maxTokens !== undefined ? { maxTokens: value.reasoning.maxTokens } : {}) };
  }
  return { provider: pair.provider, model: pair.model, timeout_ms: value.timeoutMs, max_tokens: value.maxTokens, temperature: value.temperature, json_mode: value.jsonMode, reasoning };
}
export function modelRouteRpcPayload(input: unknown) {
  if (!object(input) || input.contractVersion !== MODEL_ROUTE_PUBLISH_CONTRACT) throw Error("Refresh Admin before publishing this contract");
  if (!features.has(input.feature)) throw Error("Unsupported feature");
  if (!uuid.test(input.publishRequestId || "")) throw Error("publishRequestId is required");
  if (!Object.hasOwn(input, "expectedActiveId") || (input.expectedActiveId !== null && !uuid.test(input.expectedActiveId))) throw Error("expectedActiveId is required");
  if (!["active", "experimental", "draft"].includes(input.status)) throw Error("Invalid route status");
  // A7: with steps, the legacy columns are derived from the first two steps so older routers still run them.
  const steps = input.steps === undefined || input.steps === null ? null : input.steps;
  if (steps !== null && (!Array.isArray(steps) || steps.length < 1 || steps.length > MAX_ROUTE_STEPS)) throw Error("A route has 1 to 4 steps");
  const storedSteps = steps ? steps.map((value: unknown) => routeStep(value, DECISION_FEATURES.has(input.feature))) : null;
  // Batch C: the legacy columns are chat-only and describe the first two chat steps (decision steps are skipped).
  const chatSteps = storedSteps ? storedSteps.filter((step: { provider: string }) => !DECISION_PROVIDERS.has(step.provider)) : null;
  if (chatSteps && chatSteps.length === 0) throw Error("A route needs at least one chat step");
  const temperature = chatSteps ? chatSteps[0].temperature : input.temperature;
  const maxTokens = chatSteps ? chatSteps[0].max_tokens : input.maxTokens;
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) throw Error("Invalid temperature");
  if (!Number.isInteger(maxTokens) || maxTokens < 64 || maxTokens > 8192) throw Error("Invalid output token limit");
  if (!Array.isArray(input.fallbackWhen) || input.fallbackWhen.length > reasons.size || input.fallbackWhen.some((reason: unknown) => !reasons.has(String(reason))) || new Set(input.fallbackWhen).size !== input.fallbackWhen.length) throw Error("Invalid fallback policy");
  if (!object(input.safetyPolicy) || JSON.stringify(input.safetyPolicy).length > 8192) throw Error("Invalid safety policy");
  if (!storedSteps && !Object.hasOwn(input, "fallback")) throw Error("Explicit fallback or null is required");
  const totalDeadlineMs = input.totalDeadlineMs === undefined || input.totalDeadlineMs === null ? null : input.totalDeadlineMs;
  if (totalDeadlineMs !== null && !intIn(totalDeadlineMs, 5_000, MAX_TOTAL_DEADLINE_MS)) throw Error("Total deadline must be 5-140 seconds");
  if (totalDeadlineMs !== null && storedSteps?.some((step) => step.timeout_ms > totalDeadlineMs)) throw Error("A step waits longer than the total deadline");
  const note = input.note === undefined || input.note === null ? null : input.note;
  if (note !== null && (typeof note !== "string" || note.trim().length < 10 || note.trim().length > 500)) throw Error("Publish note must be 10-500 characters");
  if (storedSteps && input.status === "active" && note === null) throw Error("Publish note is required");
  return {
    contract_version: MODEL_ROUTE_PUBLISH_CONTRACT,
    publish_request_id: input.publishRequestId,
    expected_active_id: input.expectedActiveId,
    feature: input.feature,
    version: requireText(input.version, "version", 96), status: input.status,
    primary: chatSteps ? { provider: chatSteps[0].provider, model: chatSteps[0].model } : model(input.primary),
    fallback: chatSteps
      ? (chatSteps[1] ? { provider: chatSteps[1].provider, model: chatSteps[1].model } : null)
      : input.fallback === null ? null : model(input.fallback),
    temperature, max_output_tokens: maxTokens,
    response_schema: requireText(input.responseSchema, "response schema", 96),
    fallback_when: input.fallbackWhen, safety_policy: input.safetyPolicy,
    // Optional A7 fields are sent only when set, so a v2 payload without them is byte-identical to before.
    ...(storedSteps ? { steps: storedSteps } : {}),
    ...(totalDeadlineMs !== null ? { total_deadline_ms: totalDeadlineMs } : {}),
    ...(note !== null ? { note: note.trim() } : {})
  };
}

export async function publishModelRoute(supabase: { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<any> }, input: unknown) {
  // Do not flatten primary/fallback. This is the exact argument consumed by SQL.
  return await supabase.rpc("publish_model_route_config", { config_input: modelRouteRpcPayload(input) });
}
