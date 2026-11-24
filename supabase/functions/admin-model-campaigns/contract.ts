/**
 * Admin wire contract for model campaigns. Admin sends camelCase; the SQL RPCs of migration
 * 20261124090100_model_campaigns.sql take snake_case. Variant route steps are converted by the route publish contract
 * (admin-model-router-config/contract.ts modelRouteRpcPayload), so a campaign step and a published step are the same.
 */
import { MODEL_ROUTE_PUBLISH_CONTRACT, modelRouteRpcPayload } from "../admin-model-router-config/contract.ts";
import { CAMPAIGN_FEATURES, CAMPAIGN_VARIANT_KEYS } from "../_shared/model-campaign.ts";

export const CAMPAIGNS_MIGRATION = "20261124090100_model_campaigns.sql";
export const MIN_CALLS = 100;
export const METRICS_CAMPAIGN_LIMIT = 20;
export const CAMPAIGN_ACTIONS = ["save_draft", "start", "pause", "end", "pick_winner"] as const;
export type CampaignAction = typeof CAMPAIGN_ACTIONS[number];

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === "object" && !Array.isArray(value);
const onlyKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every((key) => keys.includes(key));
const optional = (value: unknown) => value === undefined || value === null;

function text(value: unknown, name: string, min: number, max: number) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) throw Error(`Invalid ${name}`);
  return value.trim();
}
function isoDate(value: unknown, name: string) {
  if (optional(value) || value === "") return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw Error(`Invalid ${name}`);
  return new Date(value).toISOString();
}

/** {steps: camelCase steps, totalDeadlineMs?} to the stored {steps: snake_case, total_deadline_ms}. */
export function campaignRouteToStored(route: unknown) {
  if (!object(route) || !onlyKeys(route, ["steps", "totalDeadlineMs"])) throw Error("Invalid variant route");
  if (!Array.isArray(route.steps) || route.steps.length < 1) throw Error("A route has 1 to 4 steps");
  const payload = modelRouteRpcPayload({
    contractVersion: MODEL_ROUTE_PUBLISH_CONTRACT, feature: "tarot_reading", publishRequestId: "00000000-0000-4000-8000-000000000000",
    expectedActiveId: null, status: "draft", version: "campaign", responseSchema: "campaign", fallbackWhen: [], safetyPolicy: {},
    steps: route.steps, totalDeadlineMs: route.totalDeadlineMs ?? null
  }) as Record<string, unknown>;
  return { steps: payload.steps, total_deadline_ms: (payload.total_deadline_ms as number | undefined) ?? null };
}

export function saveDraftPayload(input: unknown) {
  if (!object(input) || !onlyKeys(input, ["action", "id", "feature", "name", "startsAt", "endsAt", "audience", "stopRules", "variants"])) throw Error("Invalid campaign");
  if (!optional(input.id) && !uuid.test(String(input.id))) throw Error("Invalid campaign id");
  if (!(CAMPAIGN_FEATURES as readonly string[]).includes(input.feature)) throw Error("Unsupported feature");
  const startsAt = isoDate(input.startsAt, "start date");
  const endsAt = isoDate(input.endsAt, "end date");
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) throw Error("End date must be after start date");
  const audience = optional(input.audience) ? { signedInOnly: true } : input.audience;
  if (!object(audience) || !onlyKeys(audience, ["signedInOnly", "locales"])
    || (audience.signedInOnly !== undefined && typeof audience.signedInOnly !== "boolean")
    || (audience.locales !== undefined && (!Array.isArray(audience.locales) || audience.locales.length < 1 || audience.locales.length > 2
      || audience.locales.some((locale: unknown) => locale !== "vi" && locale !== "en") || new Set(audience.locales).size !== audience.locales.length))) {
    throw Error("Invalid audience");
  }
  const stopRules = optional(input.stopRules) ? {} : input.stopRules;
  if (!object(stopRules) || !onlyKeys(stopRules, ["maxFormatFailRate", "maxCostMultiplier"])
    || (stopRules.maxFormatFailRate !== undefined && (!Number.isFinite(stopRules.maxFormatFailRate) || stopRules.maxFormatFailRate < 0 || stopRules.maxFormatFailRate > 1))
    || (stopRules.maxCostMultiplier !== undefined && (!Number.isFinite(stopRules.maxCostMultiplier) || stopRules.maxCostMultiplier < 1 || stopRules.maxCostMultiplier > 10))) {
    throw Error("Invalid stop rules");
  }
  if (!Array.isArray(input.variants) || input.variants.length < 2 || input.variants.length > 4) throw Error("A campaign has 2 to 4 variants");
  const keys = new Set<string>();
  const variants = input.variants.map((variant: unknown) => {
    if (!object(variant) || !onlyKeys(variant, ["key", "label", "trafficPercent", "route"])) throw Error("Invalid variant");
    if (!(CAMPAIGN_VARIANT_KEYS as readonly string[]).includes(variant.key) || keys.has(variant.key)) throw Error("Variant keys are A, B, C, D and unique");
    keys.add(variant.key);
    if (!Number.isInteger(variant.trafficPercent) || variant.trafficPercent < 1 || variant.trafficPercent > 99) throw Error("Traffic is 1-99% per variant");
    return { key: variant.key, label: text(variant.label, "variant label", 1, 80), traffic_percent: variant.trafficPercent, route: campaignRouteToStored(variant.route) };
  });
  if (variants.reduce((sum: number, variant: { traffic_percent: number }) => sum + variant.traffic_percent, 0) !== 100) throw Error("Variant traffic must total 100");
  return {
    ...(optional(input.id) ? {} : { id: String(input.id) }),
    feature: input.feature, name: text(input.name, "campaign name", 3, 120),
    starts_at: startsAt, ends_at: endsAt, audience, stop_rules: stopRules, variants
  };
}

export function statusParams(input: unknown) {
  if (!object(input) || !onlyKeys(input, ["action", "campaignId", "note"])) throw Error("Invalid campaign action");
  if (!["start", "pause", "end"].includes(input.action)) throw Error("Invalid campaign action");
  if (!uuid.test(String(input.campaignId ?? ""))) throw Error("Invalid campaign id");
  const note = optional(input.note) || input.note === "" ? null : text(input.note, "note", 1, 500);
  return { campaign_id: String(input.campaignId), action: input.action as string, note };
}

export function winnerPayload(input: unknown) {
  if (!object(input) || !onlyKeys(input, ["action", "campaignId", "variant", "note", "expectedActiveId", "publishRequestId", "version", "responseSchema"])) throw Error("Invalid winner request");
  if (!uuid.test(String(input.campaignId ?? ""))) throw Error("Invalid campaign id");
  if (!(CAMPAIGN_VARIANT_KEYS as readonly string[]).includes(input.variant)) throw Error("Invalid variant");
  if (!Object.hasOwn(input, "expectedActiveId") || (input.expectedActiveId !== null && !uuid.test(String(input.expectedActiveId)))) throw Error("expectedActiveId is required");
  if (!uuid.test(String(input.publishRequestId ?? ""))) throw Error("publishRequestId is required");
  return {
    campaign_id: String(input.campaignId), variant: input.variant, note: text(input.note, "publish note", 10, 500),
    expected_active_id: input.expectedActiveId, publish_request_id: String(input.publishRequestId),
    ...(optional(input.version) || input.version === "" ? {} : { version: text(input.version, "version", 1, 96) }),
    ...(optional(input.responseSchema) || input.responseSchema === "" ? {} : { response_schema: text(input.responseSchema, "response schema", 1, 96) })
  };
}

type VariantMetrics = Record<string, unknown> & { variant: string; calls: number; avgCostMicro?: number | null; formatFailCalls?: number };
const rate = (part: unknown, whole: number) => whole > 0 && Number.isFinite(Number(part)) ? Math.round((Number(part) / whole) * 10000) / 10000 : null;

/**
 * Rates per variant and stop-rule warnings. A warning is shown only when the variant has enough data; nothing pauses
 * the campaign automatically, Admin decides. Cost is compared with variant A (the control).
 */
export function evaluateMetrics(metrics: { variants?: VariantMetrics[] } & Record<string, unknown>, stopRules: Record<string, unknown> = {}) {
  const variants = Array.isArray(metrics?.variants) ? metrics.variants : [];
  const control = variants.find((item) => item.variant === "A");
  const controlCost = Number(control?.avgCostMicro);
  return {
    ...metrics,
    variants: variants.map((item) => {
      const calls = Number(item.calls) || 0;
      const enoughData = calls >= MIN_CALLS;
      const formatFailRate = rate(item.formatFailCalls, calls);
      const costMultiplier = controlCost > 0 && Number.isFinite(Number(item.avgCostMicro)) && item.avgCostMicro !== null
        ? Math.round((Number(item.avgCostMicro) / controlCost) * 100) / 100 : null;
      const breached: string[] = [];
      if (enoughData && typeof stopRules.maxFormatFailRate === "number" && formatFailRate !== null && formatFailRate > stopRules.maxFormatFailRate) breached.push("maxFormatFailRate");
      if (enoughData && typeof stopRules.maxCostMultiplier === "number" && costMultiplier !== null && costMultiplier > stopRules.maxCostMultiplier) breached.push("maxCostMultiplier");
      return {
        ...item, calls, enoughData, formatFailRate, costMultiplier,
        modelFallbackRate: rate(item.modelFallbackCalls, calls),
        cannedFallbackRate: rate(item.cannedFallbackCalls, calls),
        errorRate: rate(item.errorCalls, calls),
        noteYesRate: rate(item.noteFeedbackYes, (Number(item.noteFeedbackYes) || 0) + (Number(item.noteFeedbackNo) || 0)),
        stopRuleBreached: breached
      };
    })
  };
}

/** HTTP status and a Vietnamese-safe code for an RPC error. A missing RPC names the migration. */
export function rpcErrorResponse(error: { code?: string; message?: string } | null | undefined) {
  const code = String(error?.code ?? "");
  if (code === "PGRST202" || code === "42883" || code === "42P01") return { status: 412, body: { error: "Model campaigns need migration " + CAMPAIGNS_MIGRATION, code: "migration_missing", migration: CAMPAIGNS_MIGRATION } };
  if (code === "42501") return { status: 403, body: { error: "Admin role required", code } };
  if (code === "40001" || code === "23505") return { status: 409, body: { error: "Campaign changed or conflicts with another running campaign; reload and try again", code } };
  if (code === "P0002") return { status: 404, body: { error: "Campaign not found", code } };
  return { status: 400, body: { error: "Campaign request refused", code: code || "invalid_request" } };
}
