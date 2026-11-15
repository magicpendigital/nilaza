import sharedPolicy from "../../../../../packages/agent-config/account-tier-policy.json";
import type { AccountTier } from "./tierPreview";

/**
 * How the client derives the account tier: a paid entitlement (features/billing) or this policy.
 * - all_premium: every signed-in account is Premium (closed test, Owner decision 2026-10-30).
 * - new_account_trial: Premium for `trialHours` after the account was created, then Free.
 * - free: everyone is Free.
 * The switch lives in packages/agent-config/account-tier-policy.json, which Astrology AI on the
 * server reads too; other endpoints keep their own entitlement checks.
 */
export type AccountTierPolicyMode = "all_premium" | "new_account_trial" | "free";

export type AccountTierPolicy = {
  mode: AccountTierPolicyMode;
  trialHours: number;
  /** False while nothing is sold: screens show no Premium promotion or plan comparison. */
  premiumOnSale: boolean;
};

export const accountTierPolicy: AccountTierPolicy = {
  mode: sharedPolicy.mode as AccountTierPolicyMode,
  trialHours: sharedPolicy.trialHours,
  premiumOnSale: sharedPolicy.premiumOnSale,
};

export const premiumOnSale = accountTierPolicy.premiumOnSale;

export function resolveAccountTier(input: {
  policy?: AccountTierPolicy;
  signedIn: boolean;
  accountCreatedAt?: string;
  now?: Date;
  /** A paid Premium entitlement (store purchase or the account's subscriptions row). */
  entitled?: boolean;
}): AccountTier {
  const policy = input.policy ?? accountTierPolicy;
  if (!input.signedIn) return "free";
  // A paid plan wins over the policy switch; the server still re-checks before any AI call.
  if (input.entitled === true) return "premium";
  if (policy.mode === "free") return "free";
  if (policy.mode === "all_premium") return "premium";
  const createdMs = input.accountCreatedAt ? Date.parse(input.accountCreatedAt) : Number.NaN;
  // Unknown creation time fails closed so a trial never becomes permanent.
  if (!Number.isFinite(createdMs)) return "free";
  const nowMs = (input.now ?? new Date()).getTime();
  const elapsedMs = nowMs - createdMs;
  return elapsedMs >= 0 && elapsedMs < policy.trialHours * 60 * 60 * 1000 ? "premium" : "free";
}
