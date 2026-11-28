// Client mirror of supabase/functions/_shared/premium-entitlement.ts. Keep the two rules identical:
// the server stays the authority (Astrology AI checks again), the app only decides what to show.

/** One paid entitlement for all of Premium; older rows may still carry the Astrology-only one. */
export const PREMIUM_ENTITLEMENT = "premium";
export const LEGACY_PREMIUM_ENTITLEMENTS = ["premium_astrology_ai"] as const;
export const PREMIUM_ENTITLEMENTS: readonly string[] = [PREMIUM_ENTITLEMENT, ...LEGACY_PREMIUM_ENTITLEMENTS];

export type SubscriptionRow = {
  entitlement?: string | null;
  status?: string | null;
  current_period_end?: string | null;
};

// active/trialing: access unless a known period end has passed (a missing end means open-ended access).
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

/** The latest known future end among entitled rows, for "renews/ends on" copy. */
export function entitledPeriodEnd(subscriptions: readonly SubscriptionRow[] | null | undefined, now = new Date()): string | undefined {
  let best: { ms: number; value: string } | undefined;
  for (const row of subscriptions ?? []) {
    if (!isPremiumEntitled([row], now) || typeof row.current_period_end !== "string") continue;
    const ms = Date.parse(row.current_period_end);
    if (!best || ms > best.ms) best = { ms, value: row.current_period_end };
  }
  return best?.value;
}
