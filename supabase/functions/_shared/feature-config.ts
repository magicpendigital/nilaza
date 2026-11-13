// Admin redesign A4 (E2): the active row of public.ai_feature_configs per AI feature (migration 20261113090100).
// Read with the service key over REST, cached in memory for a minute per function instance. A missing key, a
// missing table (migration not applied), no active row, a timeout or any read error returns null, and callers
// then keep today's code defaults (account-tier-policy.json, 40 s / 60 s model wait). Out-of-range values are
// ignored field by field, so a bad row can never loosen a limit beyond the database bounds.

export type ConfiguredFeature = "persona_chat" | "oracle_router" | "tarot_reading" | "daily_insight" | "astrology_insight" | "ai_council";
type LocalizedCopy = { vi: string; en: string };
export type ActiveFeatureConfig = {
  feature: ConfiguredFeature;
  version: number;
  /** Requests per account per local day; replaces the code limit when set. */
  quotaDaily?: number;
  /** Stored only: counters are still grouped in code (Chat and Oracle share one). */
  quotaGroup?: string;
  /** AI Council follow-up questions per council. */
  followUps?: number;
  /** Total wait for all model attempts of one request (passed to generateWithModelRoute). */
  deadlineMs?: number;
  /** Stored only until the cost cap step (A7). */
  costCapMicro?: number;
  /** Stored only: the app keeps its own limit and resting messages for now. */
  copy: { quotaExhausted?: LocalizedCopy; paused?: LocalizedCopy };
};

type Dependencies = {
  env?: { get?: (name: string) => string | undefined };
  fetch?: typeof fetch;
  now?: () => number;
};

const FEATURES: readonly ConfiguredFeature[] = ["persona_chat", "oracle_router", "tarot_reading", "daily_insight", "astrology_insight", "ai_council"];
const COLUMNS = "feature,version,quota_daily,quota_group,follow_ups,deadline_ms,cost_cap_micro,copy";
export const FEATURE_CONFIG_CACHE_MS = 60_000;
/** After a failed read, defaults are used for this long before trying again, so an outage adds no per-request latency. */
export const FEATURE_CONFIG_ERROR_CACHE_MS = 15_000;
export const FEATURE_CONFIG_READ_TIMEOUT_MS = 1_500;

let cache: { expiresAt: number; rows: Map<ConfiguredFeature, ActiveFeatureConfig> } | null = null;
let inflight: Promise<Map<ConfiguredFeature, ActiveFeatureConfig>> | null = null;

/** Tests only: forget the cached rows. */
export function resetFeatureConfigCache() {
  cache = null;
  inflight = null;
}

const intIn = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : undefined;

function copyEntry(value: unknown): LocalizedCopy | undefined {
  if (!value || typeof value !== "object") return undefined;
  const { vi, en } = value as { vi?: unknown; en?: unknown };
  return typeof vi === "string" && typeof en === "string" && vi.trim() && en.trim() && vi.length <= 300 && en.length <= 300
    ? { vi: vi.trim(), en: en.trim() }
    : undefined;
}

/** One REST row to the runtime shape; undefined when the row itself is unusable. */
export function parseFeatureConfigRow(row: unknown): ActiveFeatureConfig | undefined {
  if (!row || typeof row !== "object") return undefined;
  const value = row as Record<string, unknown>;
  const feature = value.feature as ConfiguredFeature;
  const version = intIn(value.version, 1, Number.MAX_SAFE_INTEGER);
  if (!FEATURES.includes(feature) || version === undefined) return undefined;
  const config: ActiveFeatureConfig = { feature, version, copy: {} };
  const quotaDaily = intIn(value.quota_daily, 1, 100);
  if (quotaDaily !== undefined) config.quotaDaily = quotaDaily;
  if (typeof value.quota_group === "string" && /^[a-z][a-z0-9_]{2,39}$/.test(value.quota_group)) config.quotaGroup = value.quota_group;
  const followUps = feature === "ai_council" ? intIn(value.follow_ups, 0, 10) : undefined;
  if (followUps !== undefined) config.followUps = followUps;
  const deadlineMs = intIn(value.deadline_ms, 5_000, 140_000);
  if (deadlineMs !== undefined) config.deadlineMs = deadlineMs;
  // PostgREST returns bigint as a JSON number while it fits.
  const costCapMicro = intIn(value.cost_cap_micro, 1, 1_000_000);
  if (costCapMicro !== undefined) config.costCapMicro = costCapMicro;
  const copy = value.copy && typeof value.copy === "object" ? value.copy as Record<string, unknown> : {};
  const quotaExhausted = copyEntry(copy.quotaExhausted);
  const paused = copyEntry(copy.paused);
  if (quotaExhausted) config.copy.quotaExhausted = quotaExhausted;
  if (paused) config.copy.paused = paused;
  return config;
}

function restBase(get: (key: string) => string | undefined): { url: URL; key: string } | null {
  const base = get("SUPABASE_URL"), key = get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) return null;
  try {
    const url = new URL(base);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/"
      || url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) return null;
    return { url, key };
  } catch {
    return null;
  }
}

async function loadActiveRows(deps: Dependencies): Promise<Map<ConfiguredFeature, ActiveFeatureConfig> | null> {
  const get = (key: string) => deps.env?.get ? deps.env.get(key) : typeof Deno === "undefined" ? undefined : Deno.env.get(key);
  const target = restBase(get);
  if (!target) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEATURE_CONFIG_READ_TIMEOUT_MS);
  try {
    const url = new URL(`rest/v1/ai_feature_configs?select=${COLUMNS}&status=eq.active`, target.url);
    const response = await (deps.fetch ?? fetch)(url, {
      method: "GET", redirect: "error", signal: controller.signal,
      headers: { apikey: target.key, Authorization: `Bearer ${target.key}`, Accept: "application/json" }
    });
    if (!response.ok) return null;
    const body = await response.json();
    if (!Array.isArray(body)) return null;
    const rows = new Map<ConfiguredFeature, ActiveFeatureConfig>();
    for (const raw of body) {
      const config = parseFeatureConfigRow(raw);
      // The partial unique index allows one active row per feature; a duplicate would be ambiguous, so use defaults.
      if (!config) continue;
      if (rows.has(config.feature)) return null;
      rows.set(config.feature, config);
    }
    return rows;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** The active config for one feature, or null for "use the code defaults". Never throws. */
export async function readActiveFeatureConfig(feature: ConfiguredFeature, deps: Dependencies = {}): Promise<ActiveFeatureConfig | null> {
  const now = deps.now ?? Date.now;
  try {
    if (!cache || cache.expiresAt <= now()) {
      inflight ??= loadActiveRows(deps).then((rows) => {
        cache = rows
          ? { rows, expiresAt: now() + FEATURE_CONFIG_CACHE_MS }
          : { rows: new Map(), expiresAt: now() + FEATURE_CONFIG_ERROR_CACHE_MS };
        return cache.rows;
      }).finally(() => { inflight = null; });
      await inflight;
    }
    return cache?.rows.get(feature) ?? null;
  } catch {
    return null;
  }
}

/** The configured daily limit when the active config sets one, otherwise the code default. */
export function configuredDailyLimit(config: ActiveFeatureConfig | null, fallback: number): number {
  return config?.quotaDaily ?? fallback;
}
