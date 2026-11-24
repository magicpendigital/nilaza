/**
 * Model campaigns (proposal TAROT_NOTE_READER_ROUTER_CAMPAIGNS_2026-11-23 section 3).
 *
 * resolveCampaignRoute reads the running campaign of one feature (service-role RPC
 * runtime_model_campaign_for_feature), checks dates and audience, buckets the user with a stable hash of
 * campaignId + userId and returns the variant route plus {campaignId, variant} for the trace. Any problem returns null,
 * so the caller keeps the active route. Campaign rows are cached per isolate for 60 s.
 *
 * The caller tags the trace with experiment.campaignId and experiment.variant in the trace metadata (keys allowed by
 * _shared/ai-trace.ts) so admin_get_model_campaign_metrics can group runs by variant.
 */
import { parseRouteSteps } from "./model-router.ts";
import { ModelRoute, ModelRouteStep, validFeatureDeadlineMs } from "./model-provider.ts";

export const CAMPAIGN_FEATURES = [
  "oracle_router", "persona_chat", "ai_council", "tarot_reading", "daily_insight", "astrology_report", "tarot_note", "reader_router"
] as const;
export const CAMPAIGN_VARIANT_KEYS = ["A", "B", "C", "D"] as const;
export const CAMPAIGN_CACHE_MS = 60_000;

export type CampaignVariantKey = typeof CAMPAIGN_VARIANT_KEYS[number];
export type CampaignRoute = { steps: ModelRouteStep[]; totalDeadlineMs?: number };
export type CampaignExperiment = { campaignId: string; variant: CampaignVariantKey };
export type CampaignResolution = { route: CampaignRoute; experiment: CampaignExperiment };
export type CampaignVariantInput = { key: string; trafficPercent: number };
export type ResolveCampaignOptions = { locale?: string | null; signedIn?: boolean };

type RpcClient = { rpc: (name: string, params?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> | Promise<{ data: unknown; error: unknown }> };

type CachedCampaign = { at: number; value: unknown };
const cache = new Map<string, CachedCampaign>();

export function clearCampaignCache() {
  cache.clear();
}

/** FNV-1a 32-bit over the UTF-8 bytes; stable across isolates and deploys. */
export function stableBucket(campaignId: string, userId: string): number {
  const bytes = new TextEncoder().encode(`${campaignId}:${userId}`);
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 100;
}

/**
 * Pure: the variant whose cumulative traffic band (sorted by key) holds bucket 0-99, or null when the split is not a
 * valid 2-4 variant split totalling 100.
 */
export function pickVariant(variants: CampaignVariantInput[], bucket: number): CampaignVariantKey | null {
  if (!Array.isArray(variants) || variants.length < 2 || variants.length > 4) return null;
  if (!Number.isInteger(bucket) || bucket < 0 || bucket > 99) return null;
  const sorted = [...variants].sort((a, b) => a.key.localeCompare(b.key));
  const keys = new Set<string>();
  let total = 0;
  for (const variant of sorted) {
    if (!CAMPAIGN_VARIANT_KEYS.includes(variant.key as CampaignVariantKey) || keys.has(variant.key)) return null;
    if (!Number.isInteger(variant.trafficPercent) || variant.trafficPercent < 1 || variant.trafficPercent > 99) return null;
    keys.add(variant.key);
    total += variant.trafficPercent;
  }
  if (total !== 100) return null;
  let upper = 0;
  for (const variant of sorted) {
    upper += variant.trafficPercent;
    if (bucket < upper) return variant.key as CampaignVariantKey;
  }
  return null;
}

/** Snake_case variant route from the database to the runtime shape, validated by the router's own parser. */
export function parseCampaignRoute(value: unknown): CampaignRoute | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const route = value as Record<string, unknown>;
  if (Object.keys(route).some((key) => key !== "steps" && key !== "total_deadline_ms")) return null;
  const steps = parseRouteSteps(route.steps);
  if (!steps) return null;
  let totalDeadlineMs: number | undefined;
  if (route.total_deadline_ms !== undefined && route.total_deadline_ms !== null) {
    totalDeadlineMs = validFeatureDeadlineMs(route.total_deadline_ms);
    if (totalDeadlineMs === undefined) return null;
    if (steps.some((step) => step.timeoutMs > totalDeadlineMs!)) return null;
  }
  return { steps, ...(totalDeadlineMs !== undefined ? { totalDeadlineMs } : {}) };
}

function inWindow(campaign: Record<string, unknown>, now: Date) {
  const time = now.getTime();
  if (!Number.isFinite(time)) return false;
  for (const [key, check] of [["startsAt", (at: number) => time >= at], ["endsAt", (at: number) => time < at]] as const) {
    const raw = campaign[key];
    if (raw === null || raw === undefined) continue;
    const at = typeof raw === "string" ? Date.parse(raw) : NaN;
    if (!Number.isFinite(at) || !check(at)) return false;
  }
  return true;
}

function audienceAllows(audience: unknown, userId: string, options: ResolveCampaignOptions) {
  if (audience === null || audience === undefined) return true;
  if (typeof audience !== "object" || Array.isArray(audience)) return false;
  const rules = audience as Record<string, unknown>;
  if (Object.keys(rules).some((key) => key !== "signedInOnly" && key !== "locales")) return false;
  // Every campaign call is bucketed by user id, so a signed-in user is always required.
  if (!userId || options.signedIn === false) return false;
  if (rules.locales !== undefined) {
    if (!Array.isArray(rules.locales) || !rules.locales.length) return false;
    const locale = typeof options.locale === "string" ? options.locale.trim().toLowerCase().slice(0, 2) : "";
    if (!locale || !rules.locales.includes(locale)) return false;
  }
  return true;
}

async function readCampaign(supabase: RpcClient, feature: string, now: Date): Promise<unknown> {
  const hit = cache.get(feature);
  const at = now.getTime();
  if (hit && at - hit.at >= 0 && at - hit.at < CAMPAIGN_CACHE_MS) return hit.value;
  const { data, error } = await supabase.rpc("runtime_model_campaign_for_feature", { feature_input: feature });
  if (error) throw new Error("campaign_read_failed");
  cache.set(feature, { at, value: data ?? null });
  return data ?? null;
}

/**
 * The campaign route for this user, or null (no running campaign, outside dates or audience, invalid data, any
 * error). supabase must be a service-role client: the RPC refuses every other caller.
 */
export async function resolveCampaignRoute(
  supabase: RpcClient | null | undefined,
  feature: string,
  userId: string | null | undefined,
  now: Date = new Date(),
  options: ResolveCampaignOptions = {}
): Promise<CampaignResolution | null> {
  try {
    if (!supabase || typeof supabase.rpc !== "function") return null;
    if (!CAMPAIGN_FEATURES.includes(feature as typeof CAMPAIGN_FEATURES[number])) return null;
    if (typeof userId !== "string" || !userId.trim()) return null;
    const raw = await readCampaign(supabase, feature, now);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const campaign = raw as Record<string, unknown>;
    if (campaign.status !== "running" || campaign.feature !== feature) return null;
    if (typeof campaign.id !== "string" || !/^[0-9a-f-]{36}$/i.test(campaign.id)) return null;
    if (!inWindow(campaign, now) || !audienceAllows(campaign.audience, userId, options)) return null;
    if (!Array.isArray(campaign.variants)) return null;
    const variants = campaign.variants as Array<Record<string, unknown>>;
    const variant = pickVariant(variants.map((item) => ({ key: String(item?.key ?? ""), trafficPercent: Number(item?.trafficPercent) })), stableBucket(campaign.id, userId));
    if (!variant) return null;
    const route = parseCampaignRoute(variants.find((item) => item?.key === variant)?.route);
    if (!route) return null;
    return { route, experiment: { campaignId: campaign.id, variant } };
  } catch {
    return null;
  }
}

/**
 * The active route with the campaign chain applied: steps, deadline and the legacy primary/fallback fields follow the
 * variant so an older reader of the route sees the same first two models. Everything else (schema, safety policy,
 * fallback rules) stays from the active route.
 */
export function applyCampaignRoute(base: ModelRoute, override: CampaignRoute): ModelRoute {
  const [first, second] = override.steps;
  const { totalDeadlineMs: _drop, ...rest } = base;
  return {
    ...rest,
    steps: override.steps,
    ...(override.totalDeadlineMs !== undefined ? { totalDeadlineMs: override.totalDeadlineMs } : {}),
    primaryProvider: first.provider,
    primaryModel: first.model,
    fallbackProvider: second?.provider,
    fallbackModel: second?.model,
    temperature: first.temperature,
    maxOutputTokens: first.maxTokens
  };
}
