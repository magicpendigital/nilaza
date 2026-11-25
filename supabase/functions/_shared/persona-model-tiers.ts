// Owner decision 25/11/2026 (docs/proposals/CHAT_KNOWLEDGE_CHARACTERS_2026-11-24.vi.md section 6): each persona chats on
// one model tier. Code defaults and bounds live in packages/agent-config/persona-model-tiers.json; Admin may publish a
// replacement in public.ai_persona_model_tiers (migration 20261125090000), read here with the service key over REST and
// cached for a minute per function instance, like feature-config.ts and context-config.ts.
//
// Rules kept here, whatever a row says:
// - The standard tier with useActiveRoute (the default) changes nothing: no route, deadline, cost cap or history override,
//   so a persona without a tier behaves exactly as before tiers existed.
// - Every number is clamped to the JSON bounds; a tier with unusable steps is dropped, and a persona mapped to a missing
//   tier falls back to standard.
// - The total wait never exceeds the platform wall clock minus a safety margin (Free plan: 150 s - 15 s = 135 s), and a
//   non-streamed reply never exceeds 140 s because Supabase answers 504 when no byte is sent within 150 s.
// - A missing key or table, no active row, a duplicate active row, a timeout or any error means the code defaults.
import tierSpec from "../../../packages/agent-config/persona-model-tiers.json" with { type: "json" };
import {
  isChatProvider,
  type ModelProviderName,
  type ModelRoute,
  REASONING_MODES,
  type ReasoningMode,
  type ReasoningSetting
} from "./model-provider.ts";

export type PersonaTierKey = "standard" | "deep_knowledge" | "premium";
export type PersonaOutputStyle = "concise" | "knowledge";
type Range = { min: number; max: number };

type TierSpecFile = {
  version: number;
  tierKeys: PersonaTierKey[];
  defaultTier: PersonaTierKey;
  outputStyles: PersonaOutputStyle[];
  bounds: {
    maxOutputTokens: Range; timeoutMs: Range; primaryShare: Range; costCapMicro: Range; temperature: Range;
    reasoningMaxTokens: Range; historyTurns: Range; historyChars: Range; maxSteps: number;
  };
  platform: { wallClockMsAllowed: number[]; wallClockMs: number; safetyMarginMs: number; nonStreamMaxMs: number };
  tiers: Record<string, unknown>;
  personaTiers: Record<string, string>;
};

export const PERSONA_TIER_SPEC = tierSpec as unknown as TierSpecFile;
const BOUNDS = PERSONA_TIER_SPEC.bounds;

export type PersonaTier = {
  key: PersonaTierKey;
  label: { vi: string; en: string };
  /** true: the active persona_chat route, ai_feature_configs deadline and cost cap apply unchanged. */
  useActiveRoute: boolean;
  steps?: Array<{ provider: ModelProviderName; model: string }>;
  temperature?: number;
  reasoning?: ReasoningSetting;
  maxOutputTokens?: number;
  /** Wanted total wait before the platform cap. */
  timeoutMs?: number;
  /** Share of the total wait the first step may use before the next one takes over. */
  primaryShare: number;
  costCapMicro?: number;
  /** Raised history cap; unset keeps today's 8 turns x 800 characters. */
  history?: { turns: number; chars: number };
  outputStyle: PersonaOutputStyle;
};

export type PersonaTierPlatform = { wallClockMs: number; safetyMarginMs: number; nonStreamMaxMs: number };

export type PersonaTierConfig = {
  /** Version of the active Admin row, or null for the code defaults. */
  version: number | null;
  source: "code_default" | "admin_config";
  tiers: Partial<Record<PersonaTierKey, PersonaTier>>;
  personaTiers: Record<string, PersonaTierKey>;
  platform: PersonaTierPlatform;
};

export type ResolvedPersonaTier = PersonaTier & {
  configVersion: number | null;
  configSource: PersonaTierConfig["source"];
  /** How the persona reached this tier. */
  matchedBy: "persona_id" | "persona_slug" | "book_slug" | "default" | "missing_tier_fallback";
};

const CODE_STANDARD_TIER: PersonaTier = { key: "standard", label: { vi: "Thường", en: "Standard" }, useActiveRoute: true, primaryShare: 0.65, outputStyle: "concise" };

const TIER_KEYS = PERSONA_TIER_SPEC.tierKeys;
const isTierKey = (value: unknown): value is PersonaTierKey => TIER_KEYS.includes(value as PersonaTierKey);
const intIn = (value: unknown, range: Range) =>
  typeof value === "number" && Number.isInteger(value) && value >= range.min && value <= range.max ? value : undefined;
const numIn = (value: unknown, range: Range) =>
  typeof value === "number" && Number.isFinite(value) && value >= range.min && value <= range.max ? value : undefined;
const MODEL_ID = /^[a-z0-9][a-z0-9._\-\/:]{1,119}$/i;
const PERSONA_KEY = /^[a-z0-9][a-z0-9-]{0,79}$/;

function label(value: unknown, key: string): { vi: string; en: string } {
  const raw = value && typeof value === "object" ? value as { vi?: unknown; en?: unknown } : {};
  const fallback = key === "standard" ? { vi: "Thường", en: "Standard" }
    : key === "deep_knowledge" ? { vi: "Tri thức sâu", en: "Deep knowledge" }
    : { vi: "Cao cấp", en: "Premium" };
  const pick = (text: unknown, other: string) => typeof text === "string" && text.trim() && text.length <= 40 ? text.trim() : other;
  return { vi: pick(raw.vi, fallback.vi), en: pick(raw.en, fallback.en) };
}

function reasoning(value: unknown): ReasoningSetting | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as { mode?: unknown; maxTokens?: unknown };
  if (!REASONING_MODES.includes(raw.mode as ReasoningMode)) return undefined;
  const mode = raw.mode as ReasoningMode;
  const maxTokens = intIn(raw.maxTokens, BOUNDS.reasoningMaxTokens);
  return mode !== "off" && maxTokens !== undefined ? { mode, maxTokens } : { mode };
}

/** One tier from JSON (code file or Admin row); undefined when it cannot run safely. */
export function parsePersonaTier(key: PersonaTierKey, raw: unknown): PersonaTier | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const value = raw as Record<string, unknown>;
  const outputStyle = PERSONA_TIER_SPEC.outputStyles.includes(value.outputStyle as PersonaOutputStyle)
    ? value.outputStyle as PersonaOutputStyle : "concise";
  const historyRaw = value.history && typeof value.history === "object" ? value.history as Record<string, unknown> : null;
  const turns = historyRaw ? intIn(historyRaw.turns, BOUNDS.historyTurns) : undefined;
  const chars = historyRaw ? intIn(historyRaw.chars, BOUNDS.historyChars) : undefined;
  const tier: PersonaTier = {
    key,
    label: label(value.label, key),
    useActiveRoute: value.useActiveRoute !== false,
    primaryShare: numIn(value.primaryShare, BOUNDS.primaryShare) ?? 0.65,
    outputStyle,
    ...(turns !== undefined && chars !== undefined ? { history: { turns, chars } } : {})
  };
  if (tier.useActiveRoute) return tier;
  const steps = Array.isArray(value.steps) ? value.steps : [];
  if (!steps.length || steps.length > BOUNDS.maxSteps) return undefined;
  const parsedSteps: Array<{ provider: ModelProviderName; model: string }> = [];
  for (const step of steps) {
    const { provider, model } = (step ?? {}) as { provider?: unknown; model?: unknown };
    if (!isChatProvider(provider) || typeof model !== "string" || !MODEL_ID.test(model)) return undefined;
    parsedSteps.push({ provider, model });
  }
  tier.steps = parsedSteps;
  tier.temperature = numIn(value.temperature, BOUNDS.temperature) ?? 0.68;
  tier.maxOutputTokens = intIn(value.maxOutputTokens, BOUNDS.maxOutputTokens) ?? 2000;
  tier.timeoutMs = intIn(value.timeoutMs, BOUNDS.timeoutMs) ?? PERSONA_TIER_SPEC.platform.nonStreamMaxMs;
  const parsedReasoning = reasoning(value.reasoning);
  if (parsedReasoning) tier.reasoning = parsedReasoning;
  const costCapMicro = intIn(value.costCapMicro, BOUNDS.costCapMicro);
  if (costCapMicro !== undefined) tier.costCapMicro = costCapMicro;
  return tier;
}

function parsePlatform(raw: unknown): PersonaTierPlatform {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const spec = PERSONA_TIER_SPEC.platform;
  const wallClockMs = spec.wallClockMsAllowed.includes(value.wallClockMs as number) ? value.wallClockMs as number : spec.wallClockMs;
  return { wallClockMs, safetyMarginMs: spec.safetyMarginMs, nonStreamMaxMs: spec.nonStreamMaxMs };
}

function parsePersonaMap(raw: unknown): Record<string, PersonaTierKey> {
  const result: Record<string, PersonaTierKey> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return result;
  for (const [persona, tier] of Object.entries(raw as Record<string, unknown>)) {
    if (PERSONA_KEY.test(persona) && isTierKey(tier)) result[persona] = tier;
  }
  return result;
}

/**
 * A whole tier config (the code file or an Admin row's config jsonb). The standard tier always exists: a row without a
 * usable one keeps the code standard. A row without personaTiers keeps the code persona map.
 */
export function parsePersonaTierConfig(raw: unknown, version: number | null = null): PersonaTierConfig {
  const value = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const rawTiers = value.tiers && typeof value.tiers === "object" && !Array.isArray(value.tiers) ? value.tiers as Record<string, unknown> : {};
  const tiers: Partial<Record<PersonaTierKey, PersonaTier>> = {};
  for (const key of TIER_KEYS) {
    const tier = parsePersonaTier(key, rawTiers[key]);
    if (tier) tiers[key] = tier;
  }
  tiers.standard ??= CODE_STANDARD_TIER;
  const personaTiers = value.personaTiers && typeof value.personaTiers === "object"
    ? parsePersonaMap(value.personaTiers)
    : parsePersonaMap(PERSONA_TIER_SPEC.personaTiers);
  return {
    version,
    source: version === null ? "code_default" : "admin_config",
    tiers,
    personaTiers,
    platform: parsePlatform(value.platform ?? PERSONA_TIER_SPEC.platform)
  };
}

/** The code defaults (no Admin row). */
export function defaultPersonaTierConfig(): PersonaTierConfig {
  return parsePersonaTierConfig(PERSONA_TIER_SPEC, null);
}

/** The tier for one persona: by content id (book-...), then slug, then book-<slug>; a missing tier means standard. */
export function resolvePersonaTier(config: PersonaTierConfig, persona: { id?: unknown; slug?: unknown } | null | undefined): ResolvedPersonaTier {
  const id = typeof persona?.id === "string" && PERSONA_KEY.test(persona.id) ? persona.id : undefined;
  const slug = typeof persona?.slug === "string" && PERSONA_KEY.test(persona.slug) ? persona.slug : undefined;
  const candidates: Array<[string | undefined, ResolvedPersonaTier["matchedBy"]]> = [
    [id, "persona_id"], [slug, "persona_slug"], [slug ? `book-${slug}` : undefined, "book_slug"]
  ];
  let wanted: PersonaTierKey = PERSONA_TIER_SPEC.defaultTier;
  let matchedBy: ResolvedPersonaTier["matchedBy"] = "default";
  for (const [key, how] of candidates) {
    if (key && config.personaTiers[key]) {
      wanted = config.personaTiers[key];
      matchedBy = how;
      break;
    }
  }
  const tier = config.tiers[wanted];
  const chosen = tier ?? config.tiers.standard ?? CODE_STANDARD_TIER;
  return { ...chosen, configVersion: config.version, configSource: config.source, matchedBy: tier ? matchedBy : "missing_tier_fallback" };
}

/**
 * Total wait for one turn: the tier wish, capped by the platform. Streamed replies keep the connection alive with early
 * bytes, so they may use the wall clock minus the margin; a plain JSON reply must also stay under the 150 s idle limit.
 */
export function tierDeadlineMs(tier: Pick<PersonaTier, "timeoutMs">, platform: PersonaTierPlatform, stream: boolean): number {
  const wallCap = Math.max(5_000, platform.wallClockMs - platform.safetyMarginMs);
  const cap = stream ? wallCap : Math.min(platform.nonStreamMaxMs, wallCap);
  return Math.min(tier.timeoutMs ?? cap, cap);
}

/**
 * The step-chain route for a tier with its own models; undefined for useActiveRoute (the caller keeps the active route).
 * The first step may use primaryShare of the total wait (for a streamed reply: until its first visible text), the later
 * steps whatever is left; the router never lets the chain pass totalDeadlineMs.
 */
export function tierRoute(tier: ResolvedPersonaTier, deadlineMs: number): ModelRoute | undefined {
  if (tier.useActiveRoute || !tier.steps?.length) return undefined;
  const maxTokens = tier.maxOutputTokens ?? 2000;
  const temperature = tier.temperature ?? 0.68;
  const reasoningSetting = tier.reasoning ?? { mode: "off" as const };
  const steps = tier.steps.map((step, index) => ({
    provider: step.provider,
    model: step.model,
    timeoutMs: index === tier.steps!.length - 1 ? deadlineMs : Math.max(1_000, Math.floor(deadlineMs * tier.primaryShare)),
    maxTokens,
    temperature,
    jsonMode: false,
    reasoning: reasoningSetting
  }));
  const [primary, fallback] = tier.steps;
  return {
    feature: "persona_chat",
    version: `persona-tier-${tier.key}-${tier.configVersion ?? "code"}`,
    status: "active",
    primaryProvider: primary.provider,
    primaryModel: primary.model,
    ...(fallback ? { fallbackProvider: fallback.provider, fallbackModel: fallback.model } : {}),
    temperature,
    maxOutputTokens: maxTokens,
    responseSchema: "chat_reply_v2",
    fallbackWhen: ["missing_api_key", "provider_timeout", "rate_limit", "provider_5xx", "malformed_response"],
    safetyPolicy: { requireInspiredByTransparency: true, blockProfessionalAdvice: true, reasoning: reasoningSetting },
    steps,
    totalDeadlineMs: deadlineMs
  };
}

/** Flat trace/usage metadata for the tier. */
export function tierMetadata(tier: ResolvedPersonaTier, deadlineMs: number | null): Record<string, unknown> {
  return {
    modelTier: tier.key,
    modelTierSource: tier.configSource,
    modelTierConfigVersion: tier.configVersion,
    modelTierMatchedBy: tier.matchedBy,
    modelTierDeadlineMs: deadlineMs
  };
}

// ---- Active Admin row -------------------------------------------------------------------------------------------

type Dependencies = {
  env?: { get?: (name: string) => string | undefined };
  fetch?: typeof fetch;
  now?: () => number;
};

export const PERSONA_TIER_CACHE_MS = 60_000;
export const PERSONA_TIER_ERROR_CACHE_MS = 15_000;
export const PERSONA_TIER_READ_TIMEOUT_MS = 1_500;

let cache: { expiresAt: number; config: PersonaTierConfig } | null = null;
let inflight: Promise<PersonaTierConfig> | null = null;

/** Tests only: forget the cached row. */
export function resetPersonaTierCache() {
  cache = null;
  inflight = null;
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

async function loadActiveConfig(deps: Dependencies): Promise<PersonaTierConfig | null> {
  const get = (key: string) => deps.env?.get ? deps.env.get(key) : typeof Deno === "undefined" ? undefined : Deno.env.get(key);
  const target = restBase(get);
  if (!target) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PERSONA_TIER_READ_TIMEOUT_MS);
  try {
    const url = new URL("rest/v1/ai_persona_model_tiers?select=version,config&status=eq.active", target.url);
    const response = await (deps.fetch ?? fetch)(url, {
      method: "GET", redirect: "error", signal: controller.signal,
      headers: { apikey: target.key, Authorization: `Bearer ${target.key}`, Accept: "application/json" }
    });
    if (!response.ok) return null;
    const body = await response.json();
    // One active row (partial unique index); none or a duplicate means the code defaults.
    if (!Array.isArray(body) || body.length !== 1) return null;
    const row = body[0] as { version?: unknown; config?: unknown };
    if (typeof row.version !== "number" || !Number.isInteger(row.version) || row.version < 1) return null;
    if (!row.config || typeof row.config !== "object" || Array.isArray(row.config)) return null;
    return parsePersonaTierConfig(row.config, row.version);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** The tier config in force: the active Admin row, or the code defaults. Never throws. */
export async function readPersonaTierConfig(deps: Dependencies = {}): Promise<PersonaTierConfig> {
  const now = deps.now ?? Date.now;
  try {
    if (!cache || cache.expiresAt <= now()) {
      inflight ??= loadActiveConfig(deps).then((config) => {
        cache = config
          ? { config, expiresAt: now() + PERSONA_TIER_CACHE_MS }
          : { config: defaultPersonaTierConfig(), expiresAt: now() + PERSONA_TIER_ERROR_CACHE_MS };
        return cache.config;
      }).finally(() => { inflight = null; });
      await inflight;
    }
    return cache?.config ?? defaultPersonaTierConfig();
  } catch {
    return defaultPersonaTierConfig();
  }
}
