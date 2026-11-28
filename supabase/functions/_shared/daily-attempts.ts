import { localDayStart } from "./account-tier-policy.ts";

// Minimal slice of the Supabase client used here, so tests can pass a fake.
type AttemptStore = {
  from: (table: string) => {
    select: (columns: string, options: { count: "exact"; head: true }) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          gte: (column: string, value: string) => PromiseLike<{ count: number | null; error: unknown }>;
        };
      };
    };
    insert: (row: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
  };
};

export type DailyAttemptResult = "allowed" | "limit_reached" | "unavailable";

/**
 * P1-A Tarot result lock (2026-11-15): one event (account, spread, topic, Vietnam day) has one draw and one answer.
 * - dailySpreadSoftCap: at most this many different spreads/topics may be drawn per account per Vietnam day, and never
 *   more than the delivered AI readings allowed that day, so switching topic cannot become an endless redraw.
 * - clarifiersPerReading: one server-drawn clarifier card per reading (library meaning, no model).
 * - claimStaleSeconds: an interpretation claim older than this may be taken over; it is longer than the 150 s Edge
 *   Function limit, so a live model call is never interpreted twice.
 * Delivered readings and failed attempts per day still come from account-tier-policy (tarotDailyLimits).
 */
export const TAROT_LOCK_POLICY = Object.freeze({ dailySpreadSoftCap: 3, clarifiersPerReading: 1, claimStaleSeconds: 180 });

/**
 * Counts this account's attempts for one feature since local midnight and, when under the limit,
 * records one more before any model work (Owner decision 2026-11-10: 3 per day for Daily Insight and
 * the legacy Astrology preview). A failed count or insert refuses the call, so cost stays bounded.
 * Two simultaneous requests can both pass the count; at most one extra call results.
 */
export async function claimDailyAttempt(
  supabase: AttemptStore,
  input: { userId: string; eventName: string; feature: string; limit: number; now?: Date }
): Promise<DailyAttemptResult> {
  const now = input.now ?? new Date();
  try {
    const { count, error } = await supabase.from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", input.userId)
      .eq("event_name", input.eventName)
      .gte("created_at", localDayStart(now).toISOString());
    if (error || count === null) return "unavailable";
    if (count >= input.limit) return "limit_reached";
    const { error: insertError } = await supabase.from("usage_events").insert({
      user_id: input.userId,
      event_name: input.eventName,
      feature: input.feature,
      metadata: { attemptNumber: count + 1, limit: input.limit }
    });
    return insertError ? "unavailable" : "allowed";
  } catch {
    return "unavailable";
  }
}

/**
 * Numerology private message (Owner 2026-11-25): one delivered message per account per Vietnam day, plus a capped number
 * of failed attempts. A delivered message today ("delivered") refuses first; otherwise the attempt is claimed as in
 * claimDailyAttempt (attemptLimit = delivered + failed allowance). A failed count or insert refuses the call.
 */
export async function claimDeliveredAttempt(
  supabase: AttemptStore,
  input: { userId: string; feature: string; deliveredEvent: string; attemptEvent: string; deliveredLimit: number; attemptLimit: number; now?: Date }
): Promise<{ result: DailyAttemptResult; reason?: "delivered" | "attempts" }> {
  const now = input.now ?? new Date();
  try {
    const { count, error } = await supabase.from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", input.userId)
      .eq("event_name", input.deliveredEvent)
      .gte("created_at", localDayStart(now).toISOString());
    if (error || count === null) return { result: "unavailable" };
    if (count >= input.deliveredLimit) return { result: "limit_reached", reason: "delivered" };
  } catch {
    return { result: "unavailable" };
  }
  const result = await claimDailyAttempt(supabase, { userId: input.userId, eventName: input.attemptEvent, feature: input.feature, limit: input.attemptLimit, now });
  return result === "limit_reached" ? { result, reason: "attempts" } : { result };
}
