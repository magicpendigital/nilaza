// tarot_reading, daily_insight and astrology_report get their rows from migration 20261111090000;
// until it is applied they have no row and read as on.
export type SwitchedFeature = "ai_council" | "persona_chat" | "astrology_insight" | "tarot_reading" | "daily_insight" | "astrology_report";

type SwitchReader = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{ data: { enabled?: unknown } | null; error: unknown }>;
      };
    };
  };
};

/**
 * Emergency switch from public.ai_feature_switches (Owner decision 2026-10-31). Only an explicit
 * enabled=false pauses a feature: a missing table, a missing row or a read error leaves it on,
 * so a database that has not received the migration keeps working.
 */
export async function featurePaused(supabase: SwitchReader | null, feature: SwitchedFeature): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.from("ai_feature_switches").select("enabled").eq("feature", feature).maybeSingle();
    return !error && data?.enabled === false;
  } catch {
    return false;
  }
}

export const featurePausedBody = { error: "feature_paused", message: "This feature is resting for a while. Please try again later." };
