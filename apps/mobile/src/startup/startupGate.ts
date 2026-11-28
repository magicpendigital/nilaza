// Start-up check (Owner decisions 27-28/11/2026; record docs/feature-plans/startup-gate-2026-11-28.json).
// Pure rules only: no React, no network, no storage. StartupGate.tsx feeds them and draws the screens.
//
// - Every start asks the server once (get_app_bootstrap). A good answer stores lastSuccessAt.
// - No answer (offline, server error, 8 s timeout): within 24 hours of lastSuccessAt -> offline mode with a banner;
//   exactly 24 hours or later, or never succeeded -> full-screen "Mất kết nối".
// - App older than the Owner-set minimum version -> reminder until effectiveAt + graceDays days, then "Cần cập nhật".
//   Online, the deadline is measured with the server's clock; offline, with the device clock corrected by the last
//   known server offset.

export type StartupState = "online" | "offline-grace" | "offline-blocked" | "update-reminder" | "update-required";

export type ReleasePolicy = { minVersion: string; graceDays: number; effectiveAt: string };
export type AppBootstrap = { serverTime: string; releasePolicy: ReleasePolicy | null; featureAccess: unknown };
export type BootstrapFetchResult = { ok: true; bootstrap: AppBootstrap } | { ok: false };

/** Device-level record (AsyncStorage key BOOTSTRAP_STORAGE_KEY), shared by every account and guests. */
export type StoredBootstrap = {
  /** Device time (ms) of the last good answer. */
  lastSuccessAt: number;
  /** Release policy from the last good answer (null = no minimum). */
  policy: ReleasePolicy | null;
  /** serverTime - device time at the last good answer, ms. */
  serverOffsetMs: number;
};

export const BOOTSTRAP_STORAGE_KEY = "nilaza.bootstrap.v1";
export const OFFLINE_GRACE_MS = 24 * 60 * 60 * 1000;
export const RECHECK_AFTER_MS = 5 * 60 * 1000;
export const BOOTSTRAP_TIMEOUT_MS = 8000;
export const DAY_MS = 24 * 60 * 60 * 1000;

const strictVersion = /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/;

function parseVersion(value: string): number[] | null {
  const match = strictVersion.exec(value.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/**
 * Numeric segment compare of two x.y.z versions: negative when a < b, 0 when equal, positive when a > b
 * ("0.1.10" > "0.1.9"). Null when either is not a strict x.y.z version, so a malformed value never blocks the app.
 */
export function compareVersions(a: string, b: string): number | null {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return null;
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

/** True when appVersion is older than the policy minimum (false when either version is malformed). */
export function isBelowMinimum(appVersion: string, policy: ReleasePolicy | null): boolean {
  if (!policy) return false;
  const order = compareVersions(appVersion, policy.minVersion);
  return order !== null && order < 0;
}

/** Last moment (ms) the old version keeps working: effectiveAt + graceDays whole days. Null when unreadable. */
export function updateDeadline(policy: ReleasePolicy): number | null {
  const start = Date.parse(policy.effectiveAt);
  return Number.isFinite(start) ? start + policy.graceDays * DAY_MS : null;
}

function parsePolicy(value: unknown): ReleasePolicy | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  if (typeof raw.minVersion !== "string" || !parseVersion(raw.minVersion)) return undefined;
  if (typeof raw.graceDays !== "number" || !Number.isInteger(raw.graceDays) || raw.graceDays < 0 || raw.graceDays > 30) return undefined;
  if (typeof raw.effectiveAt !== "string" || !Number.isFinite(Date.parse(raw.effectiveAt))) return undefined;
  return { minVersion: raw.minVersion.trim(), graceDays: raw.graceDays, effectiveAt: raw.effectiveAt };
}

/** Validates the server answer; anything unexpected is null (treated like no answer). */
export function parseAppBootstrap(value: unknown): AppBootstrap | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.serverTime !== "string" || !Number.isFinite(Date.parse(raw.serverTime))) return null;
  const releasePolicy = parsePolicy(raw.releasePolicy);
  if (releasePolicy === undefined) return null;
  return { serverTime: raw.serverTime, releasePolicy, featureAccess: raw.featureAccess ?? null };
}

/** Reads the stored record; a missing or malformed one is null (= never succeeded on this device). */
export function parseStoredBootstrap(value: unknown): StoredBootstrap | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.lastSuccessAt !== "number" || !Number.isFinite(raw.lastSuccessAt)) return null;
  const policy = parsePolicy(raw.policy);
  const serverOffsetMs = typeof raw.serverOffsetMs === "number" && Number.isFinite(raw.serverOffsetMs) ? raw.serverOffsetMs : 0;
  return { lastSuccessAt: raw.lastSuccessAt, policy: policy ?? null, serverOffsetMs };
}

export type StartupDecision = {
  state: StartupState;
  /** Deadline (ms) shown in the reminder; null when no update is asked for. */
  updateDeadline: number | null;
};

/**
 * The start-up state.
 * - fetchResult ok: the fetched policy decides (server clock): old app before the deadline -> update-reminder, at or
 *   after it -> update-required, otherwise online.
 * - fetchResult failed: `now - lastSuccessAt < 24 h` -> offline-grace (a device clock set back still counts as inside
 *   the window; accepted in the plan), unless the stored policy's deadline has already passed (device clock + stored
 *   server offset) -> update-required. 24 h or more, or never succeeded -> offline-blocked.
 * `policy` is the stored policy from the last good answer; it is only used when the fetch failed.
 */
export function decideStartupState(input: {
  now: number;
  lastSuccessAt: number | null;
  fetchResult: BootstrapFetchResult;
  appVersion: string;
  policy: ReleasePolicy | null;
  serverOffsetMs?: number;
}): StartupDecision {
  if (input.fetchResult.ok) {
    const { bootstrap } = input.fetchResult;
    const policy = bootstrap.releasePolicy;
    if (!policy || !isBelowMinimum(input.appVersion, policy)) return { state: "online", updateDeadline: null };
    const deadline = updateDeadline(policy);
    if (deadline === null) return { state: "online", updateDeadline: null };
    const serverNow = Date.parse(bootstrap.serverTime);
    return { state: serverNow >= deadline ? "update-required" : "update-reminder", updateDeadline: deadline };
  }
  if (input.lastSuccessAt === null || input.now - input.lastSuccessAt >= OFFLINE_GRACE_MS) {
    return { state: "offline-blocked", updateDeadline: null };
  }
  if (input.policy && isBelowMinimum(input.appVersion, input.policy)) {
    const deadline = updateDeadline(input.policy);
    if (deadline !== null && input.now + (input.serverOffsetMs ?? 0) >= deadline) {
      return { state: "update-required", updateDeadline: deadline };
    }
  }
  return { state: "offline-grace", updateDeadline: null };
}

/** Whether a return to the foreground should ask the server again. */
export function shouldRecheck(now: number, lastCheckAt: number | null): boolean {
  return lastCheckAt === null || now - lastCheckAt > RECHECK_AFTER_MS;
}

/** States that replace the app with a full screen. */
export function isBlockingState(state: StartupState): boolean {
  return state === "offline-blocked" || state === "update-required";
}

/**
 * Whether the gate checks the server at all. It runs only when the build can reach Supabase:
 * the Supabase URL and anon key are both set, and, for builds that require online mode (release builds or
 * EXPO_PUBLIC_NILAZA_ONLINE_REQUIRED=true), the full hosted runtime is ready too. Otherwise it passes straight
 * through as "online": local/dev builds without Supabase keep working offline, and a release build missing its
 * configuration still reaches AccountBoundary's "Nilaza chưa được kết nối" notice.
 */
export function startupGateActive(config: { supabaseConfigured: boolean; onlineModeRequired: boolean; onlineRuntimeReady: boolean }): boolean {
  return config.supabaseConfigured && (!config.onlineModeRequired || config.onlineRuntimeReady);
}

/** The record to store after a good answer. */
export function storedFromSuccess(bootstrap: AppBootstrap, now: number): StoredBootstrap {
  return { lastSuccessAt: now, policy: bootstrap.releasePolicy, serverOffsetMs: Date.parse(bootstrap.serverTime) - now };
}
