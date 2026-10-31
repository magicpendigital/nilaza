import { localDayStart, policyGrantsPremium, type TierPolicy } from "./account-tier-policy.ts";
function assertEquals(actual: unknown, expected: unknown) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }

const policy = (mode: TierPolicy["mode"]): TierPolicy => ({ mode, trialHours: 24, astrologyAi: { dailyLimit: 1, dayOffsetMinutes: 420 } });
const now = new Date("2026-10-31T10:00:00Z");

Deno.test("all_premium grants every authenticated user, free grants nobody", () => {
  assertEquals(policyGrantsPremium({ created_at: null }, now, policy("all_premium")), true);
  assertEquals(policyGrantsPremium({ created_at: "2026-10-31T09:00:00Z" }, now, policy("free")), false);
});

Deno.test("new_account_trial lasts trialHours and fails closed without a creation time", () => {
  assertEquals(policyGrantsPremium({ created_at: "2026-10-30T10:00:01Z" }, now, policy("new_account_trial")), true);
  assertEquals(policyGrantsPremium({ created_at: "2026-10-30T10:00:00Z" }, now, policy("new_account_trial")), false);
  assertEquals(policyGrantsPremium({}, now, policy("new_account_trial")), false);
});

Deno.test("the day starts at local midnight in UTC+7", () => {
  assertEquals(localDayStart(new Date("2026-10-31T10:00:00Z"), 420).toISOString(), "2026-10-30T17:00:00.000Z");
  assertEquals(localDayStart(new Date("2026-10-31T16:59:00Z"), 420).toISOString(), "2026-10-30T17:00:00.000Z");
  assertEquals(localDayStart(new Date("2026-10-31T17:00:00Z"), 420).toISOString(), "2026-10-31T17:00:00.000Z");
});
