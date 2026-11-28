import {
  BOOTSTRAP_STORAGE_KEY, DAY_MS, OFFLINE_GRACE_MS, RECHECK_AFTER_MS, compareVersions, decideStartupState, isBelowMinimum,
  parseAppBootstrap, parseStoredBootstrap, shouldRecheck, startupGateActive, storedFromSuccess, updateDeadline,
  type AppBootstrap, type ReleasePolicy
} from "../startupGate";

const HOUR = 60 * 60 * 1000;
const t0 = Date.parse("2026-11-28T00:00:00Z");
const policy: ReleasePolicy = { minVersion: "0.1.4", graceDays: 3, effectiveAt: "2026-11-28T00:00:00Z" };
const online = (releasePolicy: ReleasePolicy | null, serverTime = t0): { ok: true; bootstrap: AppBootstrap } => ({
  ok: true, bootstrap: { serverTime: new Date(serverTime).toISOString(), releasePolicy, featureAccess: null }
});
const failed = { ok: false } as const;

describe("compareVersions", () => {
  test("numeric segment compare", () => {
    expect(compareVersions("0.1.3", "0.1.4")).toBeLessThan(0);
    expect(compareVersions("0.1.10", "0.1.9")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "0.99.99")).toBeGreaterThan(0);
    expect(compareVersions("0.2.0", "0.10.0")).toBeLessThan(0);
    expect(compareVersions("0.1.3", "0.1.3")).toBe(0);
  });

  test("malformed versions never compare (so they never block)", () => {
    for (const bad of ["0.1", "0.1.3.1", "v0.1.3", "0.1.3-beta", "01.1.3", "", "a.b.c"]) {
      expect(compareVersions(bad, "0.1.3")).toBeNull();
      expect(compareVersions("0.1.3", bad)).toBeNull();
    }
    expect(isBelowMinimum("dev", policy)).toBe(false);
    expect(isBelowMinimum("0.1.3", null)).toBe(false);
    expect(isBelowMinimum("0.1.3", policy)).toBe(true);
    expect(isBelowMinimum("0.1.4", policy)).toBe(false);
  });
});

describe("updateDeadline", () => {
  test("effectiveAt plus whole grace days", () => {
    expect(updateDeadline(policy)).toBe(t0 + 3 * DAY_MS);
    expect(updateDeadline({ ...policy, graceDays: 0 })).toBe(t0);
  });
});

describe("decideStartupState", () => {
  const base = { now: t0, lastSuccessAt: null, appVersion: "0.1.3", policy: null };

  test("online when the server answers and no minimum applies", () => {
    expect(decideStartupState({ ...base, fetchResult: online(null) })).toEqual({ state: "online", updateDeadline: null });
    expect(decideStartupState({ ...base, appVersion: "0.1.4", fetchResult: online(policy) }).state).toBe("online");
    expect(decideStartupState({ ...base, appVersion: "0.2.0", fetchResult: online(policy) }).state).toBe("online");
  });

  test("update-reminder before the deadline, update-required at and after it (server clock)", () => {
    const deadline = t0 + 3 * DAY_MS;
    expect(decideStartupState({ ...base, fetchResult: online(policy, deadline - 1) })).toEqual({ state: "update-reminder", updateDeadline: deadline });
    expect(decideStartupState({ ...base, fetchResult: online(policy, deadline) })).toEqual({ state: "update-required", updateDeadline: deadline });
    // The device clock does not matter while online.
    expect(decideStartupState({ ...base, now: deadline + 10 * DAY_MS, fetchResult: online(policy, deadline - 1) }).state).toBe("update-reminder");
    expect(decideStartupState({ ...base, fetchResult: online({ ...policy, graceDays: 0 }, t0) }).state).toBe("update-required");
  });

  test("offline: never succeeded -> blocked", () => {
    expect(decideStartupState({ ...base, fetchResult: failed })).toEqual({ state: "offline-blocked", updateDeadline: null });
  });

  test("offline: the 24-hour window is exact", () => {
    const last = t0 - OFFLINE_GRACE_MS;
    expect(OFFLINE_GRACE_MS).toBe(24 * HOUR);
    expect(decideStartupState({ ...base, lastSuccessAt: last + 1, fetchResult: failed }).state).toBe("offline-grace");
    expect(decideStartupState({ ...base, lastSuccessAt: last, fetchResult: failed }).state).toBe("offline-blocked");
    expect(decideStartupState({ ...base, lastSuccessAt: last - 1, fetchResult: failed }).state).toBe("offline-blocked");
    expect(decideStartupState({ ...base, lastSuccessAt: t0, fetchResult: failed }).state).toBe("offline-grace");
    // Device clock set back (accepted risk in the plan): still inside the window.
    expect(decideStartupState({ ...base, lastSuccessAt: t0 + HOUR, fetchResult: failed }).state).toBe("offline-grace");
  });

  test("offline inside the window: a stored policy past its deadline still asks for the update", () => {
    const deadline = t0 + 3 * DAY_MS;
    const offline = { ...base, lastSuccessAt: deadline - HOUR, policy, fetchResult: failed };
    expect(decideStartupState({ ...offline, now: deadline - 1 }).state).toBe("offline-grace");
    expect(decideStartupState({ ...offline, now: deadline })).toEqual({ state: "update-required", updateDeadline: deadline });
    // The stored server offset corrects the device clock.
    expect(decideStartupState({ ...offline, now: deadline - 10, serverOffsetMs: 10 }).state).toBe("update-required");
    expect(decideStartupState({ ...offline, now: deadline, appVersion: "0.1.4" }).state).toBe("offline-grace");
  });
});

describe("parsing", () => {
  test("bootstrap answer", () => {
    expect(parseAppBootstrap({ serverTime: "2026-11-28T00:00:00Z", releasePolicy: null, featureAccess: null }))
      .toEqual({ serverTime: "2026-11-28T00:00:00Z", releasePolicy: null, featureAccess: null });
    expect(parseAppBootstrap({ serverTime: "2026-11-28T00:00:00Z", releasePolicy: policy, featureAccess: { version: 1 } })?.releasePolicy).toEqual(policy);
    for (const bad of [null, [], "x", {}, { serverTime: "nope" },
      { serverTime: "2026-11-28T00:00:00Z", releasePolicy: { ...policy, minVersion: "1.0" } },
      { serverTime: "2026-11-28T00:00:00Z", releasePolicy: { ...policy, graceDays: 31 } },
      { serverTime: "2026-11-28T00:00:00Z", releasePolicy: { ...policy, graceDays: 1.5 } },
      { serverTime: "2026-11-28T00:00:00Z", releasePolicy: { ...policy, effectiveAt: "later" } }]) {
      expect(parseAppBootstrap(bad)).toBeNull();
    }
  });

  test("stored record round trip and broken records", () => {
    const bootstrap = online(policy, t0 + 5000).bootstrap;
    const stored = storedFromSuccess(bootstrap, t0);
    expect(stored).toEqual({ lastSuccessAt: t0, policy, serverOffsetMs: 5000 });
    expect(parseStoredBootstrap(JSON.parse(JSON.stringify(stored)))).toEqual(stored);
    expect(parseStoredBootstrap(null)).toBeNull();
    expect(parseStoredBootstrap({ lastSuccessAt: "yesterday" })).toBeNull();
    expect(parseStoredBootstrap({ lastSuccessAt: t0, policy: { minVersion: "x" } })).toEqual({ lastSuccessAt: t0, policy: null, serverOffsetMs: 0 });
    expect(BOOTSTRAP_STORAGE_KEY).toBe("nilaza.bootstrap.v1");
  });
});

describe("recheck and activation", () => {
  test("foreground recheck only after more than 5 minutes", () => {
    expect(shouldRecheck(t0, null)).toBe(true);
    expect(shouldRecheck(t0 + RECHECK_AFTER_MS, t0)).toBe(false);
    expect(shouldRecheck(t0 + RECHECK_AFTER_MS + 1, t0)).toBe(true);
  });

  test("the gate runs only when Supabase is configured (and the hosted runtime is ready when online mode is required)", () => {
    expect(startupGateActive({ supabaseConfigured: false, onlineModeRequired: false, onlineRuntimeReady: false })).toBe(false);
    expect(startupGateActive({ supabaseConfigured: true, onlineModeRequired: false, onlineRuntimeReady: false })).toBe(true);
    expect(startupGateActive({ supabaseConfigured: true, onlineModeRequired: true, onlineRuntimeReady: false })).toBe(false);
    expect(startupGateActive({ supabaseConfigured: true, onlineModeRequired: true, onlineRuntimeReady: true })).toBe(true);
    expect(startupGateActive({ supabaseConfigured: false, onlineModeRequired: true, onlineRuntimeReady: true })).toBe(false);
  });
});
