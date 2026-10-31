import policy from "../../../packages/agent-config/account-tier-policy.json" with { type: "json" };

// Same switch the app uses for its displayed tier (apps/mobile/src/features/owner/accountTierPolicy.ts).
export type PolicyMode = "all_premium" | "new_account_trial" | "free";
export type TierPolicy = { mode: PolicyMode; trialHours: number; astrologyAi: { dailyLimit: number; dayOffsetMinutes: number } };

export const accountTierPolicy = policy as TierPolicy;

// Premium by policy for an authenticated user; a missing creation time fails closed for trials.
export function policyGrantsPremium(user: { created_at?: string | null }, now = new Date(), current: TierPolicy = accountTierPolicy): boolean {
  if (current.mode === "all_premium") return true;
  if (current.mode !== "new_account_trial") return false;
  const createdMs = user.created_at ? Date.parse(user.created_at) : Number.NaN;
  if (!Number.isFinite(createdMs)) return false;
  const elapsedMs = now.getTime() - createdMs;
  return elapsedMs >= 0 && elapsedMs < current.trialHours * 3600000;
}

// UTC instant of the most recent local midnight for a fixed offset (UTC+7 by default).
export function localDayStart(now = new Date(), offsetMinutes = accountTierPolicy.astrologyAi.dayOffsetMinutes): Date {
  const local = new Date(now.getTime() + offsetMinutes * 60000);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - offsetMinutes * 60000);
}
