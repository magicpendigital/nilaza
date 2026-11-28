// Free / Premium switch and limits per on-device reflection feature (Owner decision 27/11/2026,
// docs/proposals/NEW_REFLECTION_MODALITIES_2026-11-27.vi.md section 10). Admin publishes a replacement in
// public.feature_access_configs (migration 20261127090000); the app reads it through get_feature_access_config().
// The literal below is a copy of packages/agent-config/feature-access.json (scripts/admin-feature-access.test.mjs keeps
// them equal). It is what the app uses before anything is published, offline without a cached copy, or when the
// published copy does not pass parseFeatureAccessConfig.
// Rules (Owner 27/11):
// - a feature turned off elsewhere (a release flag or an AI switch) stays off: "off" always wins;
// - Premium accounts keep access; a Premium feature is "locked" only for accounts without Premium, and a locked
//   feature shows the Premium label and the existing Premium intro screen, never an empty screen;
// - switching a feature to Premium never deletes or hides what a user already saved (canViewSaved is always true).
// This is client-side gating for features that run on the device; nothing here is a server-side quota.

export const FEATURE_ACCESS_SPEC = /* @feature-access-defaults */ {
  "refreshMinutes": 5,
  "dayOffsetMinutes": 420,
  "limitKinds": ["unlimited", "per_day", "per_item_per_day", "retake_after_days"],
  "bounds": {
    "count": { "min": 1, "max": 100 },
    "days": { "min": 1, "max": 365 }
  },
  "editableFeatures": ["book_quote", "boi_kieu", "rune_draw", "big_five", "enneagram"],
  "allowedKinds": {
    "book_quote": ["per_item_per_day", "per_day", "unlimited"],
    "boi_kieu": ["per_day", "unlimited"],
    "rune_draw": ["per_day", "unlimited"],
    "big_five": ["retake_after_days", "unlimited"],
    "enneagram": ["retake_after_days", "unlimited"]
  },
  "defaults": {
    "features": {
      "book_quote": { "tier": "free", "free": { "kind": "per_item_per_day", "count": 1 }, "premium": { "kind": "per_item_per_day", "count": 1 } },
      "boi_kieu": { "tier": "free", "free": { "kind": "per_day", "count": 1 }, "premium": { "kind": "per_day", "count": 1 } },
      "rune_draw": { "tier": "free", "free": { "kind": "per_day", "count": 1 }, "premium": { "kind": "per_day", "count": 1 } },
      "big_five": { "tier": "free", "free": { "kind": "retake_after_days", "days": 30 }, "premium": { "kind": "retake_after_days", "days": 30 } },
      "enneagram": { "tier": "free", "free": { "kind": "retake_after_days", "days": 30 }, "premium": { "kind": "retake_after_days", "days": 30 } }
    }
  }
} as const;

export type FeatureId = (typeof FEATURE_ACCESS_SPEC.editableFeatures)[number];
export type AccessTier = "free" | "premium";
export type AccessLimit =
  | { kind: "unlimited" }
  | { kind: "per_day"; count: number }
  | { kind: "per_item_per_day"; count: number }
  | { kind: "retake_after_days"; days: number };
export type FeatureRule = { tier: AccessTier; free: AccessLimit; premium: AccessLimit };
export type FeatureAccessConfig = { features: Record<FeatureId, FeatureRule> };
export type ConfigSource = "default" | "cache" | "remote";
export type PublishedFeatureAccess = { version: number; publishedAt: string | null; config: FeatureAccessConfig };

export const FEATURE_IDS: readonly FeatureId[] = FEATURE_ACCESS_SPEC.editableFeatures;
export const REFRESH_MS = FEATURE_ACCESS_SPEC.refreshMinutes * 60_000;
export const DAY_OFFSET_MINUTES = FEATURE_ACCESS_SPEC.dayOffsetMinutes;

export function isFeatureId(value: unknown): value is FeatureId {
  return typeof value === "string" && (FEATURE_IDS as readonly string[]).includes(value);
}

export function defaultFeatureAccessConfig(): FeatureAccessConfig {
  return JSON.parse(JSON.stringify(FEATURE_ACCESS_SPEC.defaults)) as FeatureAccessConfig;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function wholeIn(value: unknown, bound: { min: number; max: number }): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= bound.min && value <= bound.max;
}

function parseLimit(featureId: FeatureId, value: unknown): AccessLimit | null {
  if (!isObject(value) || typeof value.kind !== "string") return null;
  const allowed = FEATURE_ACCESS_SPEC.allowedKinds[featureId] as readonly string[];
  if (!allowed.includes(value.kind)) return null;
  const keys = Object.keys(value);
  if (value.kind === "unlimited") return keys.length === 1 ? { kind: "unlimited" } : null;
  if (value.kind === "per_day" || value.kind === "per_item_per_day") {
    if (keys.length !== 2 || !wholeIn(value.count, FEATURE_ACCESS_SPEC.bounds.count)) return null;
    return { kind: value.kind, count: value.count };
  }
  if (value.kind === "retake_after_days") {
    if (keys.length !== 2 || !wholeIn(value.days, FEATURE_ACCESS_SPEC.bounds.days)) return null;
    return { kind: "retake_after_days", days: value.days };
  }
  return null;
}

/**
 * Same rules as nilaza_private.feature_access_errors: every editable feature exactly once, nothing unknown.
 * Returns null for anything else, so the caller keeps the last good copy or the built-in defaults; a newer server
 * shape the app does not understand never half-applies.
 */
export function parseFeatureAccessConfig(value: unknown): FeatureAccessConfig | null {
  if (!isObject(value) || Object.keys(value).some((key) => key !== "features") || !isObject(value.features)) return null;
  const features = value.features;
  if (Object.keys(features).some((key) => !isFeatureId(key))) return null;
  const result = {} as Record<FeatureId, FeatureRule>;
  for (const id of FEATURE_IDS) {
    const rule = features[id];
    if (!isObject(rule) || Object.keys(rule).some((key) => !["tier", "free", "premium"].includes(key))) return null;
    if (rule.tier !== "free" && rule.tier !== "premium") return null;
    const free = parseLimit(id, rule.free), premium = parseLimit(id, rule.premium);
    if (!free || !premium) return null;
    result[id] = { tier: rule.tier, free, premium };
  }
  return { features: result };
}

/** The RPC answer {version, publishedAt, config}, or null when nothing is published or the answer is malformed. */
export function parsePublishedFeatureAccess(value: unknown): PublishedFeatureAccess | null {
  if (!isObject(value) || !Number.isInteger(value.version) || (value.version as number) < 1) return null;
  const config = parseFeatureAccessConfig(value.config);
  if (!config) return null;
  return { version: value.version as number, publishedAt: typeof value.publishedAt === "string" ? value.publishedAt : null, config };
}

export type AccessState = "open" | "locked" | "off";
export type FeatureAccess = {
  featureId: FeatureId;
  /** open: usable within `limit`; locked: Premium feature for an account without Premium; off: turned off elsewhere. */
  state: AccessState;
  tier: AccessTier;
  /** Show the "Premium" label next to the feature (also to Premium accounts, so they see why it is special). */
  premiumLabel: boolean;
  /** The limit that applies to this account (null when off or locked). */
  limit: AccessLimit | null;
  /** Saved results stay readable whatever the switch says. */
  canViewSaved: true;
  configVersion: number | null;
  source: ConfigSource;
};

export function resolveFeatureAccess(input: {
  featureId: FeatureId;
  config: FeatureAccessConfig;
  isPremium: boolean;
  switchedOff?: boolean;
  configVersion?: number | null;
  source?: ConfigSource;
}): FeatureAccess {
  const rule = input.config.features[input.featureId] ?? defaultFeatureAccessConfig().features[input.featureId];
  const base = {
    featureId: input.featureId, tier: rule.tier, premiumLabel: rule.tier === "premium", canViewSaved: true as const,
    configVersion: input.configVersion ?? null, source: input.source ?? "default"
  };
  if (input.switchedOff) return { ...base, state: "off", limit: null };
  if (input.isPremium) return { ...base, state: "open", limit: rule.premium };
  if (rule.tier === "premium") return { ...base, state: "locked", limit: null };
  return { ...base, state: "open", limit: rule.free };
}

export type LimitUse = { at: string | number | Date; itemId?: string };
export type LimitCheck = { allowed: boolean; remaining: number | null; nextAvailableAt: Date | null };

const DAY_MS = 86_400_000;
/** Start of the local day (UTC+7 by default, like the server quotas' dayOffsetMinutes) containing `ms`. */
function dayStart(ms: number, offsetMinutes: number): number {
  const offset = offsetMinutes * 60_000;
  return Math.floor((ms + offset) / DAY_MS) * DAY_MS - offset;
}
function toMs(value: LimitUse["at"]): number {
  return value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(value);
}

/**
 * Whether one more use is allowed now, given this account's earlier uses on this device.
 * per_day counts uses since the start of the local day; per_item_per_day counts only uses of `itemId` (e.g. one book);
 * retake_after_days allows a new attempt once `days` full days have passed since the last one.
 */
export function evaluateLimit(
  limit: AccessLimit,
  uses: readonly LimitUse[],
  now: Date,
  itemId?: string,
  dayOffsetMinutes: number = DAY_OFFSET_MINUTES
): LimitCheck {
  const nowMs = now.getTime();
  const times = uses
    .filter((use) => limit.kind !== "per_item_per_day" || use.itemId === itemId)
    .map((use) => toMs(use.at))
    .filter((ms) => Number.isFinite(ms) && ms <= nowMs);
  if (limit.kind === "unlimited") return { allowed: true, remaining: null, nextAvailableAt: null };
  if (limit.kind === "retake_after_days") {
    if (!times.length) return { allowed: true, remaining: 1, nextAvailableAt: null };
    const next = Math.max(...times) + limit.days * DAY_MS;
    return next <= nowMs ? { allowed: true, remaining: 1, nextAvailableAt: null } : { allowed: false, remaining: 0, nextAvailableAt: new Date(next) };
  }
  const start = dayStart(nowMs, dayOffsetMinutes);
  const used = times.filter((ms) => ms >= start).length;
  const remaining = Math.max(limit.count - used, 0);
  return remaining > 0
    ? { allowed: true, remaining, nextAvailableAt: null }
    : { allowed: false, remaining: 0, nextAvailableAt: new Date(start + DAY_MS) };
}
