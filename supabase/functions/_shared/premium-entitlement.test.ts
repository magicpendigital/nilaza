import { isPremiumEntitled, PREMIUM_ENTITLEMENTS, resolveServerTier } from "./premium-entitlement.ts";
import type { TierPolicy } from "./account-tier-policy.ts";
function assertEquals(actual: unknown, expected: unknown, label = "") { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }

const now = new Date("2026-11-15T10:00:00Z");
const future = "2026-12-15T10:00:00Z";
const past = "2026-11-15T09:59:59Z";
const policy = (mode: TierPolicy["mode"]): TierPolicy => ({ mode, trialHours: 24, astrologyAi: { dailyLimit: 1, dayOffsetMinutes: 420 } });

Deno.test("premium and the legacy Astrology entitlement both count", () => {
  assertEquals(PREMIUM_ENTITLEMENTS, ["premium", "premium_astrology_ai"]);
  assertEquals(isPremiumEntitled([{ entitlement: "premium", status: "active", current_period_end: future }], now), true);
  assertEquals(isPremiumEntitled([{ entitlement: "premium_astrology_ai", status: "trialing", current_period_end: future }], now), true);
});

Deno.test("old behaviour is kept: active/trialing with no period end is entitled", () => {
  assertEquals(isPremiumEntitled([{ entitlement: "premium_astrology_ai", status: "active", current_period_end: null }], now), true);
  assertEquals(isPremiumEntitled([{ entitlement: "premium", status: "trialing" }], now), true);
});

Deno.test("expired periods, wrong statuses and unknown entitlements grant nothing", () => {
  assertEquals(isPremiumEntitled([{ entitlement: "premium", status: "active", current_period_end: past }], now), false, "past end");
  assertEquals(isPremiumEntitled([{ entitlement: "premium", status: "active", current_period_end: now.toISOString() }], now), false, "end equals now");
  for (const status of ["expired", "free", "paused", "", null]) {
    assertEquals(isPremiumEntitled([{ entitlement: "premium", status, current_period_end: future }], now), false, String(status));
  }
  for (const entitlement of ["free", "PREMIUM", "premium_plus", "", null]) {
    assertEquals(isPremiumEntitled([{ entitlement, status: "active", current_period_end: future }], now), false, String(entitlement));
  }
  assertEquals(isPremiumEntitled([{ entitlement: "premium", status: "active", current_period_end: "not a date" }], now), false, "bad date");
  assertEquals(isPremiumEntitled([], now), false);
  assertEquals(isPremiumEntitled(null, now), false);
  assertEquals(isPremiumEntitled(undefined, now), false);
});

Deno.test("canceled and past_due keep access only until a known future end", () => {
  assertEquals(isPremiumEntitled([{ entitlement: "premium", status: "canceled", current_period_end: future }], now), true);
  assertEquals(isPremiumEntitled([{ entitlement: "premium", status: "past_due", current_period_end: future }], now), true);
  assertEquals(isPremiumEntitled([{ entitlement: "premium", status: "canceled", current_period_end: past }], now), false);
  assertEquals(isPremiumEntitled([{ entitlement: "premium", status: "past_due", current_period_end: null }], now), false);
  assertEquals(isPremiumEntitled([{ entitlement: "premium", status: "canceled" }], now), false);
});

Deno.test("one valid row among invalid ones is enough", () => {
  assertEquals(isPremiumEntitled([
    { entitlement: "premium", status: "expired", current_period_end: past },
    { entitlement: "premium_astrology_ai", status: "active", current_period_end: future }
  ], now), true);
});

Deno.test("server tier: paid entitlement or policy; free otherwise", () => {
  const paid = [{ entitlement: "premium", status: "active", current_period_end: future }];
  assertEquals(resolveServerTier({ subscriptions: paid, user: {} }, now, policy("free")), "premium");
  assertEquals(resolveServerTier({ subscriptions: [], user: {} }, now, policy("all_premium")), "premium");
  assertEquals(resolveServerTier({ subscriptions: [], user: { created_at: "2026-11-15T09:00:00Z" } }, now, policy("new_account_trial")), "premium");
  assertEquals(resolveServerTier({ subscriptions: [], user: {} }, now, policy("new_account_trial")), "free");
  assertEquals(resolveServerTier({ subscriptions: null, user: { created_at: "2026-11-15T09:00:00Z" } }, now, policy("free")), "free");
});
