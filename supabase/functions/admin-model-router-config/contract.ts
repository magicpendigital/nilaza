/** Versioned wire contract. Both Edge publication and SQL tests use this adapter. */
export const MODEL_ROUTE_PUBLISH_CONTRACT = "model_route_publish_v2";
const providers = new Set(["openai", "openrouter", "gemini", "anthropic"]);
const features = new Set(["oracle_router", "persona_chat", "ai_council", "tarot_reading", "daily_insight", "astrology_report"]);
const reasons = new Set(["missing_api_key", "provider_timeout", "rate_limit", "provider_5xx", "malformed_response"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === "object" && !Array.isArray(value);
function requireText(value: unknown, name: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw Error(`Invalid ${name}`);
  return value.trim();
}
function model(value: unknown) {
  if (!object(value)) throw Error("Invalid provider/model pair");
  const provider = requireText(value.provider, "provider", 30).toLowerCase();
  if (!providers.has(provider)) throw Error("Unsupported provider");
  return { provider, model: requireText(value.model, "model", 160) };
}
export function modelRouteRpcPayload(input: unknown) {
  if (!object(input) || input.contractVersion !== MODEL_ROUTE_PUBLISH_CONTRACT) throw Error("Refresh Admin before publishing this contract");
  if (!features.has(input.feature)) throw Error("Unsupported feature");
  if (!uuid.test(input.publishRequestId || "")) throw Error("publishRequestId is required");
  if (!Object.hasOwn(input, "expectedActiveId") || (input.expectedActiveId !== null && !uuid.test(input.expectedActiveId))) throw Error("expectedActiveId is required");
  if (!["active", "experimental", "draft"].includes(input.status)) throw Error("Invalid route status");
  if (!Number.isFinite(input.temperature) || input.temperature < 0 || input.temperature > 2) throw Error("Invalid temperature");
  if (!Number.isInteger(input.maxTokens) || input.maxTokens < 64 || input.maxTokens > 8192) throw Error("Invalid output token limit");
  if (!Array.isArray(input.fallbackWhen) || input.fallbackWhen.length > reasons.size || input.fallbackWhen.some((reason: unknown) => !reasons.has(String(reason))) || new Set(input.fallbackWhen).size !== input.fallbackWhen.length) throw Error("Invalid fallback policy");
  if (!object(input.safetyPolicy) || JSON.stringify(input.safetyPolicy).length > 8192) throw Error("Invalid safety policy");
  if (!Object.hasOwn(input, "fallback")) throw Error("Explicit fallback or null is required");
  return {
    contract_version: MODEL_ROUTE_PUBLISH_CONTRACT,
    publish_request_id: input.publishRequestId,
    expected_active_id: input.expectedActiveId,
    feature: input.feature,
    version: requireText(input.version, "version", 96), status: input.status,
    primary: model(input.primary), fallback: input.fallback === null ? null : model(input.fallback),
    temperature: input.temperature, max_output_tokens: input.maxTokens,
    response_schema: requireText(input.responseSchema, "response schema", 96),
    fallback_when: input.fallbackWhen, safety_policy: input.safetyPolicy
  };
}

export async function publishModelRoute(supabase: { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<any> }, input: unknown) {
  // Do not flatten primary/fallback. This is the exact argument consumed by SQL.
  return await supabase.rpc("publish_model_route_config", { config_input: modelRouteRpcPayload(input) });
}
