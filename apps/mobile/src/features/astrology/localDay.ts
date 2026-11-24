// Local calendar days for the daily sky (spec section 6.1): "today" is the device's calendar day,
// fixed wall-clock times are resolved per day so a 23- or 25-hour DST day stays correct. A zone is
// passed in so tests do not depend on the machine's time zone.

export type LocalZone = { offsetMinutes(at: Date): number };
export type LocalDate = { year: number; month: number; day: number };

export const deviceZone: LocalZone = { offsetMinutes: (at) => -at.getTimezoneOffset() };
export const fixedZone = (minutes: number): LocalZone => ({ offsetMinutes: () => minutes });

const MINUTE = 60000;
const DAY = 86400000;

// The UTC fields of the shifted instant read as the local wall clock.
const shifted = (at: Date, zone: LocalZone) => new Date(at.getTime() + zone.offsetMinutes(at) * MINUTE);

export function localDateOf(at: Date, zone: LocalZone = deviceZone): LocalDate {
  const local = shifted(at, zone);
  return { year: local.getUTCFullYear(), month: local.getUTCMonth() + 1, day: local.getUTCDate() };
}

/** The instant a local date shows hour:minute. Two passes settle the offset across a DST change. */
export function wallClock(date: LocalDate, hour: number, minute: number, zone: LocalZone = deviceZone): Date {
  const naive = Date.UTC(date.year, date.month - 1, date.day, hour, minute);
  let at = naive - zone.offsetMinutes(new Date(naive)) * MINUTE;
  at = naive - zone.offsetMinutes(new Date(at)) * MINUTE;
  return new Date(at);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

/** [start, end) of the local day holding `at`. */
export function localDayRange(at: Date, zone: LocalZone = deviceZone): [Date, Date] {
  const date = localDateOf(at, zone);
  return [wallClock(date, 0, 0, zone), wallClock(addDays(date, 1), 0, 0, zone)];
}

export const daysBetween = (from: LocalDate, to: LocalDate) =>
  Math.round((Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / DAY);

const pad = (value: number) => String(value).padStart(2, "0");

export const dayKey = (date: LocalDate) => `${date.year}-${pad(date.month)}-${pad(date.day)}`;

/** 0 = Sunday. */
export const weekdayOf = (date: LocalDate) => new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();

/** Local HH:mm, seconds dropped, so a change at 23:59:40 never reads as the next day. */
export function formatClock(at: Date, zone: LocalZone = deviceZone): string {
  const local = shifted(at, zone);
  return `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}

export const formatDayMonth = (date: LocalDate) => `${pad(date.day)}/${pad(date.month)}`;
