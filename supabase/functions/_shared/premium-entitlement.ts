import { accountTierPolicy, policyGrantsPremium, type TierPolicy } from "./account-tier-policy.ts";

// One paid entitlement for all of Premium (Owner decision, billing plan 2026-11-15). The RevenueCat
// webhook writes it; older rows may still carry the Astrology-only entitlement and keep working.
export const PREMIUM_ENTITLEMENT = "premium";
export const LEGACY_PREMIUM_ENTITLEMENTS = ["premium_astrology_ai"] as const;
export const PREMIUM_ENTITLEMENTS: readonly string[] = [PREMIUM_ENTITLEMENT, ...LEGACY_PREMIUM_ENTITLEMENTS];

export type SubscriptionRow = {
  entitlement?: string | null;
  status?: string | null;
  current_period_end?: string | null;
};

// active/trialing: access unless a known period end has passed (a missing end keeps the old rule:
// open-ended access, as for rows written before the webhook or lifetime products).
// canceled (auto-renew off) and past_due (grace period): access only until a known, future end.
// Anything else (free, expired, unknown status or entitlement, unreadable date) grants nothing.
export function isPremiumEntitled(subscriptions: readonly SubscriptionRow[] | null | undefined, now = new Date()): boolean {
  const nowMs = now.getTime();
  return (subscriptions ?? []).some((row) => {
    if (!row || typeof row.entitlement !== "string" || !PREMIUM_ENTITLEMENTS.includes(row.entitlement)) return false;
    const end = row.current_period_end;
    const endMs = typeof end === "string" ? Date.parse(end) : Number.NaN;
    const endKnown = end !== null && end !== undefined;
    if (endKnown && !Number.isFinite(endMs)) return false;
    if (row.status === "active" || row.status === "trialing") return !endKnown || endMs > nowMs;
    if (row.status === "canceled" || row.status === "past_due") return endKnown && endMs > nowMs;
    return false;
  });
}

export type ServerTier = "premium" | "free";

// Server-side tier: a paid entitlement or the shared account tier switch (closed test policy).
export function resolveServerTier(
  input: { subscriptions: readonly SubscriptionRow[] | null | undefined; user: { created_at?: string | null } },
  now = new Date(),
  policy: TierPolicy = accountTierPolicy
): ServerTier {
  return isPremiumEntitled(input.subscriptions, now) || policyGrantsPremium(input.user, now, policy) ? "premium" : "free";
}
