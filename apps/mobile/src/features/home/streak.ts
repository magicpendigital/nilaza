/** The day before a "YYYY-MM-DD" key. */
export function previousDayKey(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * The streak to show: the stored count only while it is still alive (last activity today or
 * yesterday). QA 2026-11-02: Home showed "Chuỗi 2 ngày" for a lapsed streak, then dropped to 1
 * the moment today's card was revealed.
 */
export function visibleStreak(currentStreak: number, lastActivityDate: string | undefined, todayKey: string) {
  if (!lastActivityDate) return 0;
  return lastActivityDate === todayKey || lastActivityDate === previousDayKey(todayKey) ? currentStreak : 0;
}
