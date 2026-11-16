import policy from "../../../packages/agent-config/account-tier-policy.json" with { type: "json" };

// Same switch the app uses for its displayed tier (apps/mobile/src/features/owner/accountTierPolicy.ts).
export type PolicyMode = "all_premium" | "new_account_trial" | "free";
export type TierPolicy = {
  mode: PolicyMode;
  trialHours: number;
  /** False while nothing is sold: no deck is locked to Premium. Same flag as the app's premiumOnSale. */
  premiumOnSale?: boolean;
  astrologyAi: { dailyLimit: number; dayOffsetMinutes: number };
  council?: { dailyCouncils: number; followUpsPerCouncil: number };
  dailyInsight?: { dailyLimit: number };
  astrologyPreview?: { dailyLimit: number };
  personaChat?: { dailyLimit: number };
  tarotAi?: { dailyLimit: number; failedAttemptAllowance: number };
};

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

// Tarot AI (Owner 2026-11-04: 1 per day for every account): only a delivered reading uses up the day,
// like Astrology AI; failed attempts on top are capped so provider failures cannot run up cost.
export function tarotDailyLimits(current: TierPolicy = accountTierPolicy): { delivered: number; attempts: number } {
  const limits = current.tarotAi ?? { dailyLimit: 1, failedAttemptAllowance: 2 };
  return { delivered: limits.dailyLimit, attempts: limits.dailyLimit + limits.failedAttemptAllowance };
}

// AI Council allowance for one local day: a council opens with a question that has no history,
// and each council allows a few follow-up questions. Events logged before the opening flag count as openings.
export function councilAllowance(
  todaysEvents: Array<{ metadata?: { opening?: boolean } | null }>,
  isOpening: boolean,
  current: TierPolicy = accountTierPolicy
): { allowed: true } | { allowed: false; reason: "daily_council_limit" | "daily_followup_limit" } {
  const limits = current.council ?? { dailyCouncils: 1, followUpsPerCouncil: 4 };
  const openings = todaysEvents.filter((event) => event.metadata?.opening !== false).length;
  if (isOpening && openings >= limits.dailyCouncils) return { allowed: false, reason: "daily_council_limit" };
  if (todaysEvents.length >= limits.dailyCouncils * (1 + limits.followUpsPerCouncil)) return { allowed: false, reason: "daily_followup_limit" };
  return { allowed: true };
}
