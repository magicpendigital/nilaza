import rhythmData from "../../../../../packages/content/data/home-daily-rhythm.json";
import type { Language } from "../../types";

type Localized = { vi: string; en: string };
export type DailyRhythm = { id: string; pause: Localized; action: Localized };

const days = rhythmData.days as DailyRhythm[];

/** Day number of a local "YYYY-MM-DD" key, so consecutive days step through the bank in order (analysis HO-02). */
function dayNumber(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return 0;
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function dailyRhythmFor(dateKey: string, language: Language) {
  const entry = days[((dayNumber(dateKey) % days.length) + days.length) % days.length];
  const vi = language === "vi";
  return { id: entry.id, pause: vi ? entry.pause.vi : entry.pause.en, action: vi ? entry.action.vi : entry.action.en };
}
