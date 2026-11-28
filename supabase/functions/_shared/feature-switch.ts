// tarot_reading, daily_insight and astrology_report get their rows from migration 20261111090000 and
// oracle_router from 20261113090000; until applied they have no row and read as on.
export type SwitchedFeature = "ai_council" | "persona_chat" | "astrology_insight" | "tarot_reading" | "daily_insight" | "astrology_report" | "oracle_router"
  | "tarot_note" | "reader_router" | "numerology_private_message" | "numerology_report";

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

/**
 * Fail-closed switch for features that start OFF (numerology_private_message, Owner approval 2026-11-25): the feature
 * runs only when its row exists, reads cleanly and says enabled=true. A missing table, a missing row (the migration not
 * applied yet), a read error or any other value keeps it off, so deploying the function before the SQL stays safe.
 */
export async function featureEnabledStrict(supabase: SwitchReader | null, feature: SwitchedFeature): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.from("ai_feature_switches").select("enabled").eq("feature", feature).maybeSingle();
    return !error && data?.enabled === true;
  } catch {
    return false;
  }
}

export const featurePausedBody = { error: "feature_paused", message: "This feature is resting for a while. Please try again later." };
