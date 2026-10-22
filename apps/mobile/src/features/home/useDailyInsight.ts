import { useMemo } from "react";
import type { DailyInsight, JournalEntry, Language, Profile } from "../../types";

// A stable fallback prevents downstream effects from refetching on unrelated
// navigation, loading, or analytics state updates. Recompute at day rollover.
export function useDailyInsight(
  saved: DailyInsight | null,
  profile: Profile,
  entries: JournalEntry[],
  language: Language,
  dateKey: string,
  build: (profile: Profile, entries: JournalEntry[], language: Language) => DailyInsight
) {
  return useMemo(() => saved?.dateKey === dateKey ? saved : build(profile, entries, language),
    [saved, profile, entries, language, dateKey, build]);
}
