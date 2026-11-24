import type { CandidateChart } from "../../../../../packages/astrology-core/calculator.mjs";
import big3Data from "../../../../../packages/content/data/astrology-big3.json";
import { localizeAstrologySign, type AstrologySignId } from "../astrology/contracts";
import { bigThreeOf } from "../astrology/sky";
import { lifePathNumber, parseBirthDate } from "../numerology/calc";
import type { JournalEntry, Language } from "../../types";

// "Tôi là ai" (Lô 4, docs/proposals/ASTRO_NUMEROLOGY_IMPLEMENTATION_2026-11-23.vi.md section 7).
// Everything here is calculated on the device from data the user already saved; nothing is sent anywhere.

/** "Nilaza đã ghi lại" appears from this many journal entries (Owner decision 4, 23/11/2026). */
export const RECORDED_THRESHOLD = 5;

type Text = { vi: string; en: string };
const pick = (text: Text, language: Language) => (language === "vi" ? text.vi : text.en);
const big3Signs = big3Data.signs as Record<AstrologySignId, Record<"sunHeadline" | "moonClause", Text>>;

export type CertainSigns = { sun?: AstrologySignId; moon?: AstrologySignId; rising?: AstrologySignId };

/** Only signs the chart is sure of: one possible sign, Rising only with an exact birth time. */
export function certainSigns(chart: CandidateChart | undefined): CertainSigns {
  const big3 = chart ? bigThreeOf(chart) : null;
  if (!big3) return {};
  return {
    ...(big3.sun.length === 1 ? { sun: big3.sun[0] } : {}),
    ...(big3.moon.length === 1 ? { moon: big3.moon[0] } : {}),
    ...(big3.timeKnown && big3.rising ? { rising: big3.rising } : {})
  };
}

export type IdentityChip = { key: "sun" | "moon" | "rising" | "lifePath"; label: string; accessibilityLabel: string };

export function identityChips(signs: CertainSigns, language: Language, lifePath?: string): IdentityChip[] {
  const vi = language === "vi";
  const bodies = [
    { key: "sun" as const, sign: signs.sun, name: vi ? "Mặt Trời" : "Sun" },
    { key: "moon" as const, sign: signs.moon, name: vi ? "Mặt Trăng" : "Moon" },
    { key: "rising" as const, sign: signs.rising, name: vi ? "Cung Mọc" : "Rising" }
  ];
  const chips: IdentityChip[] = bodies.flatMap(({ key, sign, name }) => {
    if (!sign) return [];
    const label = localizeAstrologySign(sign, language);
    return [{ key, label, accessibilityLabel: `${name} ${label}` }];
  });
  // Life-path label from lifePathLabel (Lô 3 calculation); hidden when there is no valid birth date.
  if (lifePath) chips.push({ key: "lifePath", label: lifePath, accessibilityLabel: `${vi ? "Số chủ đạo" : "Life path"} ${lifePath}` });
  return chips;
}

/** Life-path label ("6", "11/2", "22/4") from a YYYY-MM-DD birth date, by the Lô 3 rules; undefined when it does not parse. */
export function lifePathLabel(birthDate: string): string | undefined {
  const parts = parseBirthDate(birthDate);
  return parts ? lifePathNumber(parts).label : undefined;
}

export type OneSentence = { sentence: string; sources: string[] };

/**
 * "Bạn trong một câu": joined only from the Owner-approved astrology-big3 templates (sunHeadline + moonClause),
 * never written by AI. Each clause names where it comes from. Hidden unless Sun and Moon are both certain.
 */
export function oneSentence(signs: CertainSigns, language: Language): OneSentence | null {
  if (!signs.sun || !signs.moon) return null;
  const vi = language === "vi";
  const sunText = pick(big3Signs[signs.sun].sunHeadline, language);
  const moonText = pick(big3Signs[signs.moon].moonClause, language);
  return {
    sentence: `${sunText} ${moonText}.`,
    sources: [
      `${vi ? "Mặt Trời" : "Sun in"} ${localizeAstrologySign(signs.sun, language)}: “${sunText}”`,
      `${vi ? "Mặt Trăng" : "Moon in"} ${localizeAstrologySign(signs.moon, language)}: “${moonText}”`
    ]
  };
}

const DAY_MS = 86_400_000;

/** Days since 1970-01-01 of the Monday that starts the local week containing this moment. */
function localWeekStart(moment: Date) {
  const day = Math.round(Date.UTC(moment.getFullYear(), moment.getMonth(), moment.getDate()) / DAY_MS);
  const weekday = (moment.getDay() + 6) % 7; // Monday = 0
  return day - weekday;
}

/**
 * Weeks in a row (Monday to Sunday, device time) with at least one journal entry. The run may end this week
 * or last week, so an unfinished week does not reset it.
 */
export function consecutiveJournalWeeks(createdAt: string[], now: Date = new Date()) {
  const weeks = new Set<number>();
  for (const value of createdAt) {
    const moment = new Date(value);
    if (Number.isFinite(moment.getTime()) && moment.getTime() <= now.getTime()) weeks.add(localWeekStart(moment));
  }
  let week = localWeekStart(now);
  if (!weeks.has(week)) week -= 7;
  let count = 0;
  while (weeks.has(week)) {
    count += 1;
    week -= 7;
  }
  return count;
}

export type RecordedSummary =
  | { ready: false; remaining: number }
  | { ready: true; journal: number; readings: number; weeks: number };

/** Counts only, never a judgement about the person. */
export function recordedSummary(entries: Array<Pick<JournalEntry, "createdAt" | "sourceType">>, now: Date = new Date()): RecordedSummary {
  if (entries.length < RECORDED_THRESHOLD) return { ready: false, remaining: RECORDED_THRESHOLD - entries.length };
  return {
    ready: true,
    journal: entries.length,
    readings: entries.filter((entry) => entry.sourceType === "tarot").length,
    weeks: consecutiveJournalWeeks(entries.map((entry) => entry.createdAt), now)
  };
}

/** Stored birth dates are YYYY-MM-DD; show them the Vietnamese way (DD/MM/YYYY) in both languages. */
export function displayBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value.trim();
}
