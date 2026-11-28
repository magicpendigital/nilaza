import { loadJson, removeJson, saveJson } from "../../storage";
import {
  defaultFeatureAccessConfig,
  parsePublishedFeatureAccess,
  REFRESH_MS,
  type ConfigSource,
  type FeatureAccessConfig
} from "./featureAccessConfig";

export const FEATURE_ACCESS_STORAGE_KEY = "nilaza.featureAccess.v1";

export type FeatureAccessSnapshot = {
  config: FeatureAccessConfig;
  version: number | null;
  publishedAt: string | null;
  source: ConfigSource;
  /** When the server last answered (ms since epoch); null before the first successful read. */
  checkedAt: number | null;
};

type CachedCopy = { version: number; publishedAt: string | null; config: unknown; checkedAt: number };

export type FeatureAccessService = {
  get(): FeatureAccessSnapshot;
  /** Load the last good copy saved on this device (once; later calls are no-ops). */
  hydrate(): Promise<FeatureAccessSnapshot>;
  /** Ask the server unless it answered less than `refreshMs` ago (or `force`). Never throws. */
  refresh(options?: { force?: boolean }): Promise<FeatureAccessSnapshot>;
  /**
   * Use an answer the app already got from the server (the start-up bootstrap carries the same payload as the
   * published-config read), exactly as if `refresh` had fetched it, so no second request is made. Never throws.
   */
  accept(answer: unknown, checkedAt?: number): Promise<FeatureAccessSnapshot>;
  subscribe(listener: (snapshot: FeatureAccessSnapshot) => void): () => void;
};

function defaultsSnapshot(): FeatureAccessSnapshot {
  return { config: defaultFeatureAccessConfig(), version: null, publishedAt: null, source: "default", checkedAt: null };
}

/**
 * Keeps the Free / Premium rules for this device.
 * - Before anything is read: the built-in defaults (all five features free, v1 limits).
 * - A valid published copy replaces them and is cached, so the app works offline with the last copy.
 * - A malformed answer or a network error keeps whatever is in use (cache or defaults).
 * - "Nothing published" (null) means the defaults; the cache is replaced so an old copy does not linger.
 */
export function createFeatureAccessService(input: {
  fetcher: () => Promise<unknown>;
  now?: () => number;
  refreshMs?: number;
  storageKey?: string;
}): FeatureAccessService {
  const now = input.now ?? Date.now;
  const refreshMs = input.refreshMs ?? REFRESH_MS;
  const storageKey = input.storageKey ?? FEATURE_ACCESS_STORAGE_KEY;
  const listeners = new Set<(snapshot: FeatureAccessSnapshot) => void>();
  let snapshot = defaultsSnapshot();
  let hydrated: Promise<FeatureAccessSnapshot> | null = null;
  let inFlight: Promise<FeatureAccessSnapshot> | null = null;

  const publish = (next: FeatureAccessSnapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener(snapshot));
    return snapshot;
  };

  const hydrate = () => {
    hydrated ??= (async () => {
      try {
        const cached = await loadJson<CachedCopy | null>(storageKey, null);
        const parsed = cached ? parsePublishedFeatureAccess(cached) : null;
        // A server answer that arrived while the cache was loading wins over the cache.
        if (parsed && snapshot.source === "default" && snapshot.checkedAt === null) {
          return publish({ ...parsed, source: "cache", checkedAt: typeof cached?.checkedAt === "number" ? cached.checkedAt : null });
        }
      } catch {
        // Unreadable storage: keep the defaults.
      }
      return snapshot;
    })();
    return hydrated;
  };

  const refresh = async (options: { force?: boolean } = {}) => {
    await hydrate();
    if (!options.force && snapshot.source === "remote" && snapshot.checkedAt !== null && now() - snapshot.checkedAt < refreshMs) {
      return snapshot;
    }
    inFlight ??= (async () => {
      try {
        const answer = await input.fetcher();
        return await apply(answer, now());
      } catch {
        return snapshot;
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  };

  // "Nothing published" (null) resets to the defaults; a malformed answer keeps what is in use.
  const apply = async (answer: unknown, checkedAt: number) => {
    if (answer === null || answer === undefined) {
      await removeJson(storageKey).catch(() => undefined);
      return publish({ ...defaultsSnapshot(), source: "remote", checkedAt });
    }
    const parsed = parsePublishedFeatureAccess(answer);
    if (!parsed) return snapshot;
    await saveJson<CachedCopy>(storageKey, { ...parsed, checkedAt }).catch(() => undefined);
    return publish({ ...parsed, source: "remote", checkedAt });
  };

  const accept = async (answer: unknown, checkedAt?: number) => {
    await hydrate();
    try {
      return await apply(answer, checkedAt ?? now());
    } catch {
      return snapshot;
    }
  };

  return {
    get: () => snapshot,
    hydrate,
    refresh,
    accept,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

let shared: FeatureAccessService | null = null;

/**
 * Set the app-wide service once. The app does this in StartupGate with the start-up bootstrap read
 * (backendClient.getAppBootstrap), so the switch and the release policy come from one request.
 */
export function configureFeatureAccess(fetcher: () => Promise<unknown>): FeatureAccessService {
  shared = createFeatureAccessService({ fetcher });
  return shared;
}

/** The app-wide service; until configureFeatureAccess runs it only serves the cache or the built-in defaults. */
export function getFeatureAccessService(): FeatureAccessService {
  shared ??= createFeatureAccessService({ fetcher: async () => { throw new Error("Feature access is not configured"); } });
  return shared;
}
