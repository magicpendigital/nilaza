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
