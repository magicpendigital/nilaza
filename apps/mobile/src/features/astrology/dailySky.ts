import { moonQuartersBetween, moonStateAt, signChangesBetween, type MoonQuarterKind } from "../../../../../packages/astrology-core/sky.mjs";
import { moonPhaseFor, nextMoonEvent, type MoonPhase } from "../home/moonPhase";
import type { AstrologySignId } from "./contracts";
import { addDays, dayKey, deviceZone, localDateOf, localDayRange, wallClock, weekdayOf, type LocalDate, type LocalZone } from "./localDay";

// Today's sky (spec section 6.1), computed on the device: the Moon's sign now, its decan, how lit
// it is, the phase moment of the day, the sign change of the day and a 7-day strip.

export type Decan = "early" | "mid" | "late";
export type SignChange = { at: Date; from: AstrologySignId; to: AstrologySignId };

export type SkyDay = {
  date: LocalDate;
  key: string;
  weekday: number;
  /** Moon sign at 12:00 local time. */
  sign: AstrologySignId;
  illumination: number;
  waxing: boolean;
  change?: SignChange;
  quarter?: { kind: MoonQuarterKind; at: Date };
};

export type DailySky = {
  now: Date;
  date: LocalDate;
  sign: AstrologySignId;
  degree: number;
  decan: Decan;
  illumination: number;
  waxing: boolean;
  phase: MoonPhase;
  /** Sign change inside today; `passed` once it has happened. */
  change?: SignChange & { passed: boolean };
  next: { kind: "full" | "new"; at: Date; days: number };
  week: SkyDay[];
};

export const decanOf = (degree: number): Decan => (degree < 10 ? "early" : degree < 20 ? "mid" : "late");

function changeInDay(start: Date, end: Date): SignChange | undefined {
  const change = signChangesBetween("Moon", start, end)[0];
  return change ? { at: change.at, from: change.from as AstrologySignId, to: change.to as AstrologySignId } : undefined;
}

export function skyDayOf(date: LocalDate, zone: LocalZone = deviceZone): SkyDay {
  const noon = wallClock(date, 12, 0, zone);
  const start = wallClock(date, 0, 0, zone);
  const end = wallClock(addDays(date, 1), 0, 0, zone);
  const moon = moonStateAt(noon);
  const change = changeInDay(start, end);
  const quarter = moonQuartersBetween(start, end)[0];
  return {
    date,
    key: dayKey(date),
    weekday: weekdayOf(date),
    sign: moon.sign as AstrologySignId,
    illumination: moon.illumination,
    waxing: moon.waxing,
    ...(change ? { change } : {}),
    ...(quarter ? { quarter } : {})
  };
}

/** The light part of dailySkyAt for small cards (Home, Explore, hub tile): no scan of the week. */
export function skyGlanceAt(now: Date = new Date(), zone: LocalZone = deviceZone) {
  const moon = moonStateAt(now);
  return { sign: moon.sign as AstrologySignId, illumination: moon.illumination, waxing: moon.waxing, phase: moonPhaseFor(now, zone) };
}

export function dailySkyAt(now: Date = new Date(), zone: LocalZone = deviceZone): DailySky {
  const date = localDateOf(now, zone);
  const moon = moonStateAt(now);
  const [start, end] = localDayRange(now, zone);
  const change = changeInDay(start, end);
  return {
    now,
    date,
    sign: moon.sign as AstrologySignId,
    degree: moon.degree,
    decan: decanOf(moon.degree),
    illumination: moon.illumination,
    waxing: moon.waxing,
    phase: moonPhaseFor(now, zone),
    ...(change ? { change: { ...change, passed: change.at.getTime() <= now.getTime() } } : {}),
    next: nextMoonEvent(now, zone),
    week: Array.from({ length: 7 }, (_, index) => skyDayOf(addDays(date, index), zone))
  };
}
