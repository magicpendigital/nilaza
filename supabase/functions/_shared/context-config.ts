// Owner request 14/11 (docs/proposals/AI_CONTEXT_CONFIG_2026-11-14.vi.md): Admin can switch off or narrow the data
// blocks a feature sends to the model. The active row of public.ai_context_configs (migration 20261114090200) is read
// with the service key over REST and cached for a minute per function instance, like feature-config.ts.
//
// Hard rules kept here, whatever a row says:
// - Only blocks named in packages/agent-config/ai-context-blocks.json exist; unknown keys are ignored, so there is no
//   way to add a field (journal text has no block). Locked inputs (the message, language, persona) are not blocks.
// - Every limit is clamped to [min, max] and max equals today's code value, so a config can only send less.
// - The request data class is never below the feature floor (provider-registry.ts) and rises with enabled blocks.
// - A missing key or table, no active row, a duplicate active row, a timeout or any error means "today's behaviour".
// Crisis screening and the data-block separation live in the callers and the router and never read this config.
import blockSpec from "../../../packages/agent-config/ai-context-blocks.json" with { type: "json" };
import { DATA_CLASS_RANK, type DataClass, featureDataClass } from "./provider-registry.ts";
import type { UserDataPolicy } from "./ai-user-context.ts";

export type ContextFeature = "persona_chat" | "daily_insight" | "ai_council";
export const CONTEXT_FEATURES: readonly ContextFeature[] = Object.freeze(["persona_chat", "daily_insight", "ai_council"]);

type LimitSpec = { label: string; min: number; max: number };
type BlockSpec = { label: string; dataClass: DataClass; limits: Record<string, LimitSpec> };
type FeatureSpec = { configurable: boolean; floorDataClass: DataClass; blocks?: Record<string, BlockSpec> };
export const CONTEXT_BLOCK_SPEC = blockSpec as unknown as { version: number; features: Record<string, FeatureSpec> };

export type ResolvedBlock = { enabled: boolean; limits: Record<string, number> };
export type ContextPolicy = {
  feature: ContextFeature;
  /** Version of the active row, or null when the code defaults apply. */
  version: number | null;
  blocks: Record<string, ResolvedBlock>;
  dataClass: DataClass;
};
export type ActiveContextConfig = { feature: ContextFeature; version: number; blocks: Record<string, unknown> };

type Dependencies = {
  env?: { get?: (name: string) => string | undefined };
  fetch?: typeof fetch;
  now?: () => number;
};

export const CONTEXT_CONFIG_CACHE_MS = 60_000;
export const CONTEXT_CONFIG_ERROR_CACHE_MS = 15_000;
export const CONTEXT_CONFIG_READ_TIMEOUT_MS = 1_500;

let cache: { expiresAt: number; rows: Map<ContextFeature, ActiveContextConfig> } | null = null;
let inflight: Promise<Map<ContextFeature, ActiveContextConfig>> | null = null;

/** Tests only: forget the cached rows. */
export function resetContextConfigCache() {
  cache = null;
  inflight = null;
}

function featureSpec(feature: ContextFeature): Record<string, BlockSpec> {
  return CONTEXT_BLOCK_SPEC.features[feature]?.blocks ?? {};
}

/** Clamp a stored limit into the spec range; anything that is not a whole number keeps the default (the max). */
function clampLimit(value: unknown, spec: LimitSpec): number {
  if (typeof value !== "number" || !Number.isInteger(value)) return spec.max;
  return Math.min(spec.max, Math.max(spec.min, value));
}

/** Provider data-class rule: the highest of the feature floor and every enabled block's class; never below the floor. */
export function requestDataClass(floor: DataClass, enabledBlockClasses: readonly DataClass[]): DataClass {
  let rank = DATA_CLASS_RANK[floor] ?? DATA_CLASS_RANK.sensitive;
  for (const value of enabledBlockClasses) rank = Math.max(rank, DATA_CLASS_RANK[value] ?? DATA_CLASS_RANK.sensitive);
  return (Object.keys(DATA_CLASS_RANK) as DataClass[]).find((name) => DATA_CLASS_RANK[name] === rank) ?? "sensitive";
}

/** The policy for one feature: every block on at today's caps unless the row narrows it. Never throws. */
export function resolveContextPolicy(feature: ContextFeature, row: { version?: unknown; blocks?: unknown } | null): ContextPolicy {
  const stored = row?.blocks && typeof row.blocks === "object" && !Array.isArray(row.blocks) ? row.blocks as Record<string, unknown> : {};
  const blocks: Record<string, ResolvedBlock> = {};
  const enabledClasses: DataClass[] = [];
  for (const [id, spec] of Object.entries(featureSpec(feature))) {
    const raw = stored[id] && typeof stored[id] === "object" && !Array.isArray(stored[id]) ? stored[id] as Record<string, unknown> : {};
    const limits: Record<string, number> = {};
    for (const [name, limit] of Object.entries(spec.limits)) limits[name] = clampLimit(raw[name], limit);
    const enabled = raw.enabled !== false;
    blocks[id] = { enabled, limits };
    if (enabled) enabledClasses.push(spec.dataClass);
  }
  const dataClass = requestDataClass(featureDataClass(feature), enabledClasses);
  const version = typeof row?.version === "number" && Number.isInteger(row.version) && row.version >= 1 ? row.version : null;
  return { feature, version, blocks, dataClass };
}

export function blockEnabled(policy: ContextPolicy, id: string): boolean {
  return policy.blocks[id]?.enabled ?? true;
}

export function blockLimit(policy: ContextPolicy, id: string, name: string): number | undefined {
  return policy.blocks[id]?.limits[name];
}

/** The data block switches for userDataBlock (ai-user-context.ts). Blocks a feature does not have stay as today. */
export function userDataPolicy(policy: ContextPolicy): UserDataPolicy {
  const has = (id: string) => id in policy.blocks;
  const result: UserDataPolicy = {};
  if (has("nickname")) result.nickname = blockEnabled(policy, "nickname");
  if (has("tone")) result.tone = blockEnabled(policy, "tone");
  if (has("localDateTime")) result.localDateTime = blockEnabled(policy, "localDateTime");
  if (has("recentMood")) result.recentMood = blockEnabled(policy, "recentMood");
  if (has("goals")) {
    result.goals = {
      enabled: blockEnabled(policy, "goals"),
      maxItems: blockLimit(policy, "goals", "maxItems") ?? 5,
      maxChars: blockLimit(policy, "goals", "maxChars") ?? 60
    };
  }
  return result;
}

/** Trace metadata: the version only when a published config is in force. */
export function contextPolicyMetadata(policy: ContextPolicy): Record<string, unknown> {
  return policy.version === null ? {} : { contextConfigVersion: policy.version };
}

export function parseContextConfigRow(row: unknown): ActiveContextConfig | undefined {
  if (!row || typeof row !== "object") return undefined;
  const value = row as Record<string, unknown>;
  const feature = value.feature as ContextFeature;
  if (!CONTEXT_FEATURES.includes(feature)) return undefined;
  if (typeof value.version !== "number" || !Number.isInteger(value.version) || value.version < 1) return undefined;
  if (!value.blocks || typeof value.blocks !== "object" || Array.isArray(value.blocks)) return undefined;
  return { feature, version: value.version, blocks: value.blocks as Record<string, unknown> };
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

async function loadActiveRows(deps: Dependencies): Promise<Map<ContextFeature, ActiveContextConfig> | null> {
  const get = (key: string) => deps.env?.get ? deps.env.get(key) : typeof Deno === "undefined" ? undefined : Deno.env.get(key);
  const target = restBase(get);
  if (!target) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONTEXT_CONFIG_READ_TIMEOUT_MS);
  try {
    const url = new URL("rest/v1/ai_context_configs?select=feature,version,blocks&status=eq.active", target.url);
    const response = await (deps.fetch ?? fetch)(url, {
      method: "GET", redirect: "error", signal: controller.signal,
      headers: { apikey: target.key, Authorization: `Bearer ${target.key}`, Accept: "application/json" }
    });
    if (!response.ok) return null;
    const body = await response.json();
    if (!Array.isArray(body)) return null;
    const rows = new Map<ContextFeature, ActiveContextConfig>();
    for (const raw of body) {
      const config = parseContextConfigRow(raw);
      if (!config) continue;
      // One active row per feature (partial unique index); a duplicate is ambiguous, so use today's behaviour.
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

/** The active row for one feature, or null for "today's behaviour". Never throws. */
export async function readActiveContextConfig(feature: ContextFeature, deps: Dependencies = {}): Promise<ActiveContextConfig | null> {
  const now = deps.now ?? Date.now;
  try {
    if (!cache || cache.expiresAt <= now()) {
      inflight ??= loadActiveRows(deps).then((rows) => {
        cache = rows
          ? { rows, expiresAt: now() + CONTEXT_CONFIG_CACHE_MS }
          : { rows: new Map(), expiresAt: now() + CONTEXT_CONFIG_ERROR_CACHE_MS };
        return cache.rows;
      }).finally(() => { inflight = null; });
      await inflight;
    }
    return cache?.rows.get(feature) ?? null;
  } catch {
    return null;
  }
}

/** Read and resolve in one call; used by the Edge Functions. Never throws. */
export async function contextPolicyFor(feature: ContextFeature, deps: Dependencies = {}): Promise<ContextPolicy> {
  return resolveContextPolicy(feature, await readActiveContextConfig(feature, deps));
}
