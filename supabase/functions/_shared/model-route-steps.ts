import {
  FEATURE_DEADLINE_MAX_MS,
  MAX_ROUTE_STEPS,
  MODEL_PROVIDER_NAMES,
  ModelProviderName,
  ModelRouteStep,
  REASONING_MODES,
  ReasoningMode,
  RouteProviderName,
  isDecisionProvider
} from "./model-provider.ts";

/**
 * A7 (D3): model_route_versions.steps to the runtime shape. Anything outside the database bounds makes the whole chain
 * unusable (undefined), so the route falls back to its primary/fallback columns, which the publish RPC keeps equal to
 * the first two steps.
 *
 * Kept in its own module (re-exported by model-router.ts) so model-campaign.ts can use it while model-router.ts imports
 * model-campaign.ts, without a circular import.
 */
export function parseRouteSteps(value: unknown, options: { allowDecision?: boolean } = {}): ModelRouteStep[] | undefined {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_ROUTE_STEPS) return undefined;
  const steps: ModelRouteStep[] = [];
  const int = (input: unknown, min: number, max: number) => typeof input === "number" && Number.isInteger(input) && input >= min && input <= max;
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return undefined;
    const step = raw as Record<string, unknown>;
    // Batch C: a decision provider is valid only in a reader_router chain (the table check and publish RPC agree).
    if (!MODEL_PROVIDER_NAMES.includes(step.provider as ModelProviderName) && !(options.allowDecision && isDecisionProvider(step.provider))) return undefined;
    if (typeof step.model !== "string" || !step.model.trim() || step.model.length > 160) return undefined;
    if (!int(step.timeout_ms, 1_000, FEATURE_DEADLINE_MAX_MS) || !int(step.max_tokens, 64, 8192)) return undefined;
    if (typeof step.temperature !== "number" || step.temperature < 0 || step.temperature > 2 || typeof step.json_mode !== "boolean") return undefined;
    let reasoning: ModelRouteStep["reasoning"] = null;
    if (step.reasoning && typeof step.reasoning === "object") {
      const r = step.reasoning as { mode?: unknown; maxTokens?: unknown };
      if (!REASONING_MODES.includes(r.mode as ReasoningMode)) return undefined;
      reasoning = { mode: r.mode as ReasoningMode, ...(int(r.maxTokens, 64, 8192) && r.mode !== "off" ? { maxTokens: r.maxTokens as number } : {}) };
    }
    steps.push({
      provider: step.provider as RouteProviderName, model: step.model.trim(), timeoutMs: step.timeout_ms as number,
      maxTokens: step.max_tokens as number, temperature: step.temperature, jsonMode: step.json_mode, reasoning
    });
  }
  return steps;
}
