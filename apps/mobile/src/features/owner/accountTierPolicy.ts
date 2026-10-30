import type { AccountTier } from "./tierPreview";

/**
 * How the client derives the account tier until a subscription resolver exists.
 * - all_premium: every signed-in account is Premium (closed test, Owner decision 2026-10-30).
 * - new_account_trial: Premium for `trialHours` after the account was created, then Free.
 * - free: everyone is Free.
 * Display only: server endpoints keep their own entitlement checks.
 */
export type AccountTierPolicyMode = "all_premium" | "new_account_trial" | "free";

export type AccountTierPolicy = {
  mode: AccountTierPolicyMode;
  trialHours: number;
  /** False while nothing is sold: screens show no Premium promotion or plan comparison. */
  premiumOnSale: boolean;
};

export const accountTierPolicy: AccountTierPolicy = {
  mode: "all_premium",
  trialHours: 24,
  premiumOnSale: false,
};

export const premiumOnSale = accountTierPolicy.premiumOnSale;

export function resolveAccountTier(input: {
  policy?: AccountTierPolicy;
  signedIn: boolean;
  accountCreatedAt?: string;
  now?: Date;
}): AccountTier {
  const policy = input.policy ?? accountTierPolicy;
  if (!input.signedIn || policy.mode === "free") return "free";
  if (policy.mode === "all_premium") return "premium";
  const createdMs = input.accountCreatedAt ? Date.parse(input.accountCreatedAt) : Number.NaN;
  // Unknown creation time fails closed so a trial never becomes permanent.
  if (!Number.isFinite(createdMs)) return "free";
  const nowMs = (input.now ?? new Date()).getTime();
  const elapsedMs = nowMs - createdMs;
  return elapsedMs >= 0 && elapsedMs < policy.trialHours * 60 * 60 * 1000 ? "premium" : "free";
}
