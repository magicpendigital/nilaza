// Admin redesign A7 (D4/E1): provider switches, allowed data class and circuit state for step chains.
// Read with the service key over REST from public.ai_providers + public.ai_provider_health (migration
// 20261113140100), cached 15 s per function instance. A missing key, a missing table or any read error keeps the
// last good copy, else the seeded defaults (OpenRouter on; direct providers off). Key VALUES are never read here:
// only whether Deno.env has a non-empty value under the secret name.
import { MODEL_PROVIDER_NAMES, ModelProviderName, PROVIDER_SECRET_NAMES } from "./model-provider.ts";

export type DataClass = "public" | "personal" | "sensitive";
export const DATA_CLASS_RANK: Record<DataClass, number> = { public: 0, personal: 1, sensitive: 2 };

/**
 * Data a feature sends to a model (spec 3.7): chat, Oracle, Council, Daily and Astrology carry feelings, journal labels
 * or birth data; Tarot sends the question and the drawn cards. A provider must be allowed at least this class.
 */
export const FEATURE_DATA_CLASS: Record<string, DataClass> = {
  persona_chat: "sensitive",
  oracle_router: "sensitive",
  ai_council: "sensitive",
  daily_insight: "sensitive",
  astrology_report: "sensitive",
  tarot_reading: "personal",
  // Batch C (2026-11-24): the private note sends the same question and cards as the reading; the reader suggestion
  // sends the question, topic and card names only.
  tarot_note: "personal",
  reader_router: "personal",
  // 2026-11-25: computed numerology numbers and approved block ids only (no name, no birth date); kept sensitive.
  numerology_private_message: "sensitive",
  // 2026-11-28: the full report sends the same kind of data plus digits present (no counts) and arrow ids; sensitive.
  numerology_report: "sensitive"
};
export function featureDataClass(feature: string): DataClass {
  return FEATURE_DATA_CLASS[feature] ?? "sensitive";
}

export type ProviderPolicy = {
  provider: ModelProviderName;
  priority: number;
  enabled: boolean;
  secretName: string;
  allowedDataClass: DataClass;
  /** null = not reported yet. */
  configured: boolean | null;
  failures: number;
  /** Epoch ms; the circuit is open while now < openedUntil. */
  openedUntil: number | null;
};
export type ProviderRegistry = Map<ModelProviderName, ProviderPolicy>;

/** Same as the migration seed; used until the tables can be read. */
export function defaultProviderRegistry(): ProviderRegistry {
  const seed: Array<[ModelProviderName, boolean, DataClass]> = [
    ["openrouter", true, "sensitive"], ["anthropic", false, "personal"], ["gemini", false, "personal"],
    ["openai", false, "personal"], ["deepseek", false, "public"]
  ];
  return new Map(seed.map(([provider, enabled, allowedDataClass], index) => [provider, {
    provider, priority: index + 1, enabled, secretName: PROVIDER_SECRET_NAMES[provider], allowedDataClass,
    configured: null, failures: 0, openedUntil: null
  }]));
}

type Dependencies = {
  env?: { get?: (name: string) => string | undefined };
  fetch?: typeof fetch;
  now?: () => number;
};

export const PROVIDER_REGISTRY_CACHE_MS = 15_000;
export const PROVIDER_REGISTRY_READ_TIMEOUT_MS = 1_500;
export const PROVIDER_REPORT_TIMEOUT_MS = 1_000;

let cache: { expiresAt: number; registry: ProviderRegistry; fromTables: boolean } | null = null;
let lastGood: ProviderRegistry | null = null;
let inflight: Promise<ProviderRegistry> | null = null;

/** Tests only. */
export function resetProviderRegistryCache() {
  cache = null;
  lastGood = null;
  inflight = null;
}

const envReader = (deps: Dependencies) => (key: string) =>
  deps.env?.get ? deps.env.get(key) : typeof Deno === "undefined" ? undefined : Deno.env.get(key);

/** Whether a non-empty secret exists under this name. The value is not returned, logged or stored. */
export function secretPresent(secretName: string, get: (key: string) => string | undefined): boolean {
  if (!/^[A-Z][A-Z0-9_]{2,63}$/.test(secretName)) return false;
  return Boolean(get(secretName)?.trim());
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

/** REST rows to the runtime shape. Unknown providers and malformed rows are ignored; null if nothing usable. */
export function parseProviderRows(providers: unknown, health: unknown): ProviderRegistry | null {
  if (!Array.isArray(providers)) return null;
  const healthBy = new Map<string, Record<string, unknown>>();
  if (Array.isArray(health)) for (const row of health) if (row && typeof row === "object") healthBy.set(String((row as Record<string, unknown>).provider), row as Record<string, unknown>);
  const registry: ProviderRegistry = new Map();
  for (const raw of providers) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const provider = row.provider as ModelProviderName;
    if (!MODEL_PROVIDER_NAMES.includes(provider) || typeof row.enabled !== "boolean") continue;
    const allowed = row.allowed_data_class as DataClass;
    if (!(allowed in DATA_CLASS_RANK)) continue;
    const h = healthBy.get(provider) ?? {};
    const opened = typeof h.opened_until === "string" ? Date.parse(h.opened_until) : NaN;
    registry.set(provider, {
      provider,
      priority: Number.isInteger(row.priority) ? row.priority as number : 99,
      enabled: row.enabled,
      secretName: typeof row.secret_name === "string" && /^[A-Z][A-Z0-9_]{2,63}$/.test(row.secret_name) ? row.secret_name : PROVIDER_SECRET_NAMES[provider],
      allowedDataClass: allowed,
      configured: typeof h.configured === "boolean" ? h.configured : null,
      failures: Number.isInteger(h.failures) ? h.failures as number : 0,
      openedUntil: Number.isFinite(opened) ? opened : null
    });
  }
  return registry.size ? registry : null;
}

async function loadRegistry(deps: Dependencies): Promise<ProviderRegistry | null> {
  const target = restBase(envReader(deps));
  if (!target) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_REGISTRY_READ_TIMEOUT_MS);
  const headers = { apikey: target.key, Authorization: `Bearer ${target.key}`, Accept: "application/json" };
  try {
    const doFetch = deps.fetch ?? fetch;
    const [providers, health] = await Promise.all([
      doFetch(new URL("rest/v1/ai_providers?select=provider,priority,enabled,secret_name,allowed_data_class", target.url), { method: "GET", redirect: "error", signal: controller.signal, headers }),
      doFetch(new URL("rest/v1/ai_provider_health?select=provider,configured,failures,opened_until", target.url), { method: "GET", redirect: "error", signal: controller.signal, headers })
    ]);
    if (!providers.ok) return null;
    const registry = parseProviderRows(await providers.json(), health.ok ? await health.json() : []);
    // A provider row that is missing or unusable must not remove that provider from every chain (OpenRouter would
    // then leave "no provider"): such a provider keeps its seeded default. Only an explicit row changes a switch.
    if (registry) for (const [provider, policy] of defaultProviderRegistry()) if (!registry.has(provider)) registry.set(provider, policy);
    return registry;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Never throws. Returns the registry in use and whether it came from the tables (false = defaults). */
export async function readProviderRegistry(deps: Dependencies = {}): Promise<{ registry: ProviderRegistry; fromTables: boolean }> {
  const now = deps.now ?? Date.now;
  try {
    if (!cache || cache.expiresAt <= now()) {
      inflight ??= loadRegistry(deps).then((loaded) => {
        if (loaded) lastGood = loaded;
        const registry = loaded ?? lastGood ?? defaultProviderRegistry();
        cache = { registry, fromTables: Boolean(loaded ?? lastGood), expiresAt: now() + PROVIDER_REGISTRY_CACHE_MS };
        return registry;
      }).finally(() => { inflight = null; });
      await inflight;
    }
    return cache ? { registry: cache.registry, fromTables: cache.fromTables } : { registry: defaultProviderRegistry(), fromTables: false };
  } catch {
    return { registry: defaultProviderRegistry(), fromTables: false };
  }
}

export type RuntimeReport =
  | { result: "ok" }
  | { result: "not_configured" }
  | { result: "failure"; errorClass: "transient" | "rate_limit" | "payment" | "auth" | "config"; httpStatus?: number };

/**
 * Reports a runtime outcome to record_ai_provider_probe (service role) so the circuit is shared across instances, and
 * updates this instance's cached copy at once. Content-free; never throws; waits at most 1 s.
 */
export async function reportProviderOutcome(provider: ModelProviderName, report: RuntimeReport, deps: Dependencies = {}): Promise<boolean> {
  const now = (deps.now ?? Date.now)();
  const entry = cache?.registry.get(provider);
  if (entry) {
    if (report.result === "ok") { entry.failures = 0; entry.openedUntil = null; }
    else if (report.result === "not_configured") entry.configured = false;
    else {
      entry.failures += 1;
      if (report.errorClass === "payment" || report.errorClass === "auth") entry.openedUntil = now + 5 * 60_000;
      else if (entry.failures >= 3) entry.openedUntil = now + 60_000;
    }
  }
  const target = restBase(envReader(deps));
  if (!target) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_REPORT_TIMEOUT_MS);
  try {
    const body = { provider_input: provider, payload: { source: "runtime", ...report, ...(report.result === "not_configured" ? { configured: false } : {}) } };
    const response = await (deps.fetch ?? fetch)(new URL("rest/v1/rpc/record_ai_provider_probe", target.url), {
      method: "POST", redirect: "error", signal: controller.signal,
      headers: { apikey: target.key, Authorization: `Bearer ${target.key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    await response.body?.cancel().catch(() => undefined);
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * P1-C (15/11/2026): reference list prices in micro-USD per token (= USD per million tokens), input then output.
 * Used to project the worst case of a step before calling it (per-turn cost cap) and to estimate the cost of a call
 * when no billing receipt is available. A receipt (OpenRouter usage.cost) always wins over these numbers.
 * Every entry names its source and check date. `verified: false` marks a conservative guess that nobody checked
 * against the provider; Admin shows that flag next to any number computed from it.
 */
export type ReferencePriceEntry = {
  input: number;
  output: number;
  verified: boolean;
  source: string;
  checkedOn: string;
};
const OPENROUTER_API = "OpenRouter public models API (openrouter.ai/api/v1/models), list price";
const OPENROUTER_MIRROR = "Provider list price as mirrored by the OpenRouter models API; provider page not cross-checked";
export const REFERENCE_PRICE_BOOK: Record<string, ReferencePriceEntry> = {
  // Default routes (all six features): primary and fallback.
  "openrouter:deepseek/deepseek-v4.1-flash": { input: 0.0507, output: 0.2028, verified: true, source: `${OPENROUTER_API}; cheapest endpoint, others list up to 3/12`, checkedOn: "2026-11-15" },
  "openrouter:xiaomi/mimo-v2.6-flash": { input: 0.14, output: 0.28, verified: true, source: `${OPENROUTER_API}; endpoints range 0.10-0.18 / 0.28-0.36`, checkedOn: "2026-11-15" },
  // Other OpenRouter models offered in Admin (model-providers.js catalogue).
  "openrouter:deepseek/deepseek-v4.1-flash-1017": { input: 0.02, output: 0.108, verified: true, source: OPENROUTER_API, checkedOn: "2026-11-15" },
  "openrouter:openai/gpt-5.4-mini": { input: 0.75, output: 4.5, verified: true, source: OPENROUTER_API, checkedOn: "2026-11-15" },
  "openrouter:openai/gpt-5.4": { input: 2.5, output: 15, verified: true, source: OPENROUTER_API, checkedOn: "2026-11-15" },
  "openrouter:anthropic/claude-sonnet-4.6": { input: 3, output: 15, verified: true, source: OPENROUTER_API, checkedOn: "2026-11-15" },
  "openrouter:google/gemini-3.5-flash": { input: 1.5, output: 9, verified: true, source: OPENROUTER_API, checkedOn: "2026-11-15" },
  // Direct providers (off by default): values equal the OpenRouter mirror of the provider's list price on 15/11.
  "anthropic:claude-haiku-4-5": { input: 1, output: 5, verified: true, source: OPENROUTER_MIRROR, checkedOn: "2026-11-15" },
  "anthropic:claude-sonnet-4-5": { input: 3, output: 15, verified: true, source: OPENROUTER_MIRROR, checkedOn: "2026-11-15" },
  "openai:gpt-4o-mini": { input: 0.15, output: 0.6, verified: true, source: OPENROUTER_MIRROR, checkedOn: "2026-11-15" },
  "openai:gpt-4.1-mini": { input: 0.4, output: 1.6, verified: true, source: OPENROUTER_MIRROR, checkedOn: "2026-11-15" },
  "gemini:gemini-2.5-flash": { input: 0.3, output: 2.5, verified: true, source: OPENROUTER_MIRROR, checkedOn: "2026-11-15" },
  "gemini:gemini-2.5-flash-lite": { input: 0.1, output: 0.4, verified: true, source: OPENROUTER_MIRROR, checkedOn: "2026-11-15" },
  "gemini:gemini-2.5-pro": { input: 1.25, output: 10, verified: true, source: OPENROUTER_MIRROR, checkedOn: "2026-11-15" },
  // Direct DeepSeek: model ids are aliases not listed anywhere we could check. Conservative guess, chưa xác minh.
  "deepseek:deepseek-flash": { input: 0.3, output: 1.2, verified: false, source: "Chưa xác minh: conservative guess (common OpenRouter endpoint price of deepseek-v4.1-flash)", checkedOn: "2026-11-15" },
  "deepseek:deepseek-v4-pro": { input: 1.8, output: 3, verified: false, source: "Chưa xác minh: conservative guess, no public price found for this id", checkedOn: "2026-11-15" }
};

/** Same values as REFERENCE_PRICE_BOOK, in the original [input, output] shape (kept for existing callers). */
export const REFERENCE_PRICES_MICRO_PER_TOKEN: Record<string, [number, number]> = Object.fromEntries(
  Object.entries(REFERENCE_PRICE_BOOK).map(([key, entry]) => [key, [entry.input, entry.output]])
);
export function referencePrice(provider: ModelProviderName, model: string): [number, number] | undefined {
  return REFERENCE_PRICES_MICRO_PER_TOKEN[`${provider}:${model}`];
}

/** Book entry for a call; `resolvedModel` (the model OpenRouter actually answered with) is tried first. */
export function referencePriceInfo(provider: ModelProviderName, model: string, resolvedModel?: string): ReferencePriceEntry | undefined {
  if (resolvedModel && resolvedModel !== model) {
    const resolved = REFERENCE_PRICE_BOOK[`${provider}:${resolvedModel}`];
    if (resolved) return resolved;
  }
  return REFERENCE_PRICE_BOOK[`${provider}:${model}`];
}

/** Worst-case projection before a call: about 3 characters per input token plus the full output budget. 0 without a price. */
export function projectCallCostMicro(price: [number, number] | undefined, inputChars: number, maxOutputTokens: number): number {
  if (!price) return 0;
  return Math.ceil(Math.ceil(Math.max(0, inputChars) / 3) * price[0] + Math.max(0, maxOutputTokens) * price[1]);
}

export type CostSource = "reported" | "estimated" | "unknown";
export type CallCost = {
  /** micro-USD; null when nothing is known (counted as 0 by the cost cap). */
  costMicro: number | null;
  costSource: CostSource;
  /** Whether the reference price behind an estimate is verified; null when no reference price was used. */
  priceVerified: boolean | null;
};
const finiteNonNegative = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

/**
 * Cost of one finished or failed call: the billing receipt when present ("reported"), else tokens x reference price
 * ("estimated"), else unknown. Rounding of the receipt matches the step-chain cost cap (Math.round of USD x 1e6).
 */
export function callCost(input: {
  provider: ModelProviderName;
  model: string;
  resolvedModel?: string;
  receiptUsd?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
}): CallCost {
  if (finiteNonNegative(input.receiptUsd)) return { costMicro: Math.round(input.receiptUsd * 1_000_000), costSource: "reported", priceVerified: null };
  const price = referencePriceInfo(input.provider, input.model, input.resolvedModel);
  const tokensIn = finiteNonNegative(input.inputTokens) ? input.inputTokens : null;
  const tokensOut = finiteNonNegative(input.outputTokens) ? input.outputTokens : null;
  if (price && (tokensIn !== null || tokensOut !== null)) {
    // Round away float noise first (100 x 0.28 = 28.000000000000004 must stay 28), then round up to whole micro-USD.
    const raw = (tokensIn ?? 0) * price.input + (tokensOut ?? 0) * price.output;
    return { costMicro: Math.ceil(Math.round(raw * 1e6) / 1e6), costSource: "estimated", priceVerified: price.verified };
  }
  return { costMicro: null, costSource: "unknown", priceVerified: price ? price.verified : null };
}
