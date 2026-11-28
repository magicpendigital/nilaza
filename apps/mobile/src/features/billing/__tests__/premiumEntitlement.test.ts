import { entitledPeriodEnd, isPremiumEntitled } from "../premiumEntitlement";

const now = new Date("2026-11-15T00:00:00Z");
const future = "2026-12-15T00:00:00Z";
const past = "2026-10-15T00:00:00Z";

test("active or trialing Premium grants access while the period has not ended", () => {
  expect(isPremiumEntitled([{ entitlement: "premium", status: "active", current_period_end: future }], now)).toBe(true);
  expect(isPremiumEntitled([{ entitlement: "premium", status: "trialing", current_period_end: null }], now)).toBe(true);
  expect(isPremiumEntitled([{ entitlement: "premium", status: "active", current_period_end: past }], now)).toBe(false);
});

test("the legacy Astrology entitlement still counts as Premium", () => {
  expect(isPremiumEntitled([{ entitlement: "premium_astrology_ai", status: "active", current_period_end: future }], now)).toBe(true);
});

test("canceled or past_due keeps access only until a known future end", () => {
  expect(isPremiumEntitled([{ entitlement: "premium", status: "canceled", current_period_end: future }], now)).toBe(true);
  expect(isPremiumEntitled([{ entitlement: "premium", status: "past_due", current_period_end: future }], now)).toBe(true);
  expect(isPremiumEntitled([{ entitlement: "premium", status: "canceled", current_period_end: null }], now)).toBe(false);
  expect(isPremiumEntitled([{ entitlement: "premium", status: "past_due", current_period_end: past }], now)).toBe(false);
});

test("anything else fails closed", () => {
  expect(isPremiumEntitled(null, now)).toBe(false);
  expect(isPremiumEntitled([], now)).toBe(false);
  expect(isPremiumEntitled([{ entitlement: "free", status: "active", current_period_end: future }], now)).toBe(false);
  expect(isPremiumEntitled([{ entitlement: "premium", status: "expired", current_period_end: future }], now)).toBe(false);
  expect(isPremiumEntitled([{ entitlement: "premium", status: "active", current_period_end: "not a date" }], now)).toBe(false);
  expect(isPremiumEntitled([{ entitlement: null, status: "active", current_period_end: future }], now)).toBe(false);
});

test("the shown end date is the latest entitled future end", () => {
  expect(entitledPeriodEnd([
    { entitlement: "premium", status: "active", current_period_end: future },
    { entitlement: "premium", status: "canceled", current_period_end: "2027-01-01T00:00:00Z" },
    { entitlement: "free", status: "active", current_period_end: "2030-01-01T00:00:00Z" },
  ], now)).toBe("2027-01-01T00:00:00Z");
  expect(entitledPeriodEnd([{ entitlement: "premium", status: "active", current_period_end: past }], now)).toBeUndefined();
});
