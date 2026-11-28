import { councilAllowance, localDayStart, policyGrantsPremium, type TierPolicy } from "./account-tier-policy.ts";
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

Deno.test("AI Council allows one council a day with four follow-ups", () => {
  const current = { ...policy("all_premium"), council: { dailyCouncils: 1, followUpsPerCouncil: 4 } };
  const opening = { metadata: { opening: true } }, followUp = { metadata: { opening: false } };
  assertEquals(councilAllowance([], true, current), { allowed: true });
  assertEquals(councilAllowance([opening], true, current), { allowed: false, reason: "daily_council_limit" });
  assertEquals(councilAllowance([opening, followUp, followUp, followUp], false, current), { allowed: true });
  assertEquals(councilAllowance([opening, followUp, followUp, followUp, followUp], false, current), { allowed: false, reason: "daily_followup_limit" });
  // Older events without the flag count as openings.
  assertEquals(councilAllowance([{ metadata: null }], true, current), { allowed: false, reason: "daily_council_limit" });
});

Deno.test("Tarot AI: one delivered reading a day, three attempts at most; chat five a day (2026-11-11)", async () => {
  const { accountTierPolicy, tarotDailyLimits } = await import("./account-tier-policy.ts");
  assertEquals(tarotDailyLimits(), { delivered: 1, attempts: 3 });
  assertEquals(tarotDailyLimits(policy("all_premium")), { delivered: 1, attempts: 3 });
  assertEquals(accountTierPolicy.personaChat?.dailyLimit, 5);
});

Deno.test("Numerology full report: one delivered report a day, three attempts at most (2026-11-28)", async () => {
  const { accountTierPolicy, numerologyReportDailyLimits } = await import("./account-tier-policy.ts");
  assertEquals(accountTierPolicy.numerologyReport, { dailyLimit: 1, failedAttemptAllowance: 2 });
  assertEquals(numerologyReportDailyLimits(), { delivered: 1, attempts: 3 });
  // A policy without the key keeps the same numbers, never more.
  assertEquals(numerologyReportDailyLimits(policy("all_premium")), { delivered: 1, attempts: 3 });
});
