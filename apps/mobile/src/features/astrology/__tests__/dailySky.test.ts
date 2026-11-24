import { moonPhaseFor, nextMoonEvent } from "../../home/moonPhase";
import { dailySkyAt, decanOf, skyDayOf } from "../dailySky";
import { fixedZone, formatClock, localDayRange, type LocalZone } from "../localDay";

// Spec ASTRO_NUMEROLOGY_IMPLEMENTATION_2026-11-23 section 6.5. Every case passes a zone so the
// result does not depend on the machine running the tests.
const vn = fixedZone(420);
const sydney = fixedZone(660);
// America/New_York around the 14/03/2027 switch to summer time (02:00 local = 07:00 UTC).
const newYork: LocalZone = { offsetMinutes: (at) => (at.getTime() >= Date.UTC(2027, 2, 14, 7) ? -240 : -300) };

test("1. 23/11/2026 noon: Taurus 11.4 degrees, 97%, full Moon tomorrow 21:54", () => {
  const sky = dailySkyAt(new Date("2026-11-23T12:00:00+07:00"), vn);
  expect(sky.sign).toBe("taurus");
  expect(sky.degree).toBeCloseTo(11.4, 1);
  expect(sky.decan).toBe("mid");
  expect(Math.round(sky.illumination * 100)).toBe(97);
  expect(sky.phase.id).toBe("waxing_gibbous");
  expect(sky.change).toBeUndefined();
  expect(sky.next.kind).toBe("full");
  expect(sky.next.days).toBe(1);
  expect(formatClock(sky.next.at, vn)).toBe("21:54");
});

test("2-3. 24/11/2026: Taurus 26.2 degrees, change to Gemini at 18:09 and full Moon at 21:54", () => {
  const sky = dailySkyAt(new Date("2026-11-24T12:00:00+07:00"), vn);
  expect(sky.sign).toBe("taurus");
  expect(sky.degree).toBeCloseTo(26.2, 1);
  expect(sky.decan).toBe("late");
  expect(Math.round(sky.illumination * 100)).toBe(100);
  expect(sky.change).toMatchObject({ from: "taurus", to: "gemini", passed: false });
  expect(formatClock(sky.change!.at, vn)).toBe("18:09");
  expect(sky.phase.id).toBe("full");
  expect(formatClock(sky.phase.exactAt!, vn)).toBe("21:54");
  expect(sky.next).toMatchObject({ kind: "full", days: 0 });
  expect(dailySkyAt(new Date("2026-11-24T18:08:00+07:00"), vn).sign).toBe("taurus");
  const after = dailySkyAt(new Date("2026-11-24T18:10:00+07:00"), vn);
  expect(after.sign).toBe("gemini");
  expect(after.change?.passed).toBe(true);
});

test("4. change just after midnight 29/01/2027 00:21: 28/1 is Libra, 29/1 noon is Scorpio", () => {
  expect(dailySkyAt(new Date("2027-01-29T00:20:00+07:00"), vn).sign).toBe("libra");
  expect(dailySkyAt(new Date("2027-01-29T00:22:00+07:00"), vn).sign).toBe("scorpio");
  const week = dailySkyAt(new Date("2027-01-28T09:00:00+07:00"), vn).week;
  expect(week[0]).toMatchObject({ key: "2027-01-28", sign: "libra" });
  expect(week[0].change).toBeUndefined();
  expect(week[1]).toMatchObject({ key: "2027-01-29", sign: "scorpio" });
  expect(formatClock(week[1].change!.at, vn)).toBe("00:21");
});

test("5. 02/12/2026 in UTC is already 03/12 in Vietnam (Virgo to Libra)", () => {
  const early = dailySkyAt(new Date("2026-12-03T02:59:00+07:00"), vn);
  expect(early.date).toEqual({ year: 2026, month: 12, day: 3 });
  expect(early.sign).toBe("virgo");
  expect(early.change).toMatchObject({ from: "virgo", to: "libra" });
  expect(dailySkyAt(new Date("2026-12-03T03:05:00+07:00"), vn).sign).toBe("libra");
});

test("6. change just before midnight 12/12/2026 23:05 (Capricorn to Aquarius)", () => {
  const sky = dailySkyAt(new Date("2026-12-12T23:00:00+07:00"), vn);
  expect(sky.sign).toBe("capricorn");
  expect(formatClock(sky.change!.at, vn)).toBe("23:05");
  expect(dailySkyAt(new Date("2026-12-12T23:10:00+07:00"), vn).sign).toBe("aquarius");
});

test("7. the 7-day strip crosses the new year on the right days", () => {
  const before = dailySkyAt(new Date("2026-12-31T23:59:59+07:00"), vn).week.map((day) => day.key);
  expect(before).toEqual(["2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03", "2027-01-04", "2027-01-05", "2027-01-06"]);
  const after = dailySkyAt(new Date("2027-01-01T00:00:00+07:00"), vn).week.map((day) => day.key);
  expect(after[0]).toBe("2027-01-01");
  expect(after[6]).toBe("2027-01-07");
});

test("8-9. leap days: 29/02/2024 change at 10:09, 29/02/2028 none, 01/03/2028 04:41", () => {
  const leap2024 = skyDayOf({ year: 2024, month: 2, day: 29 }, vn);
  expect(leap2024.change).toMatchObject({ from: "libra", to: "scorpio" });
  expect(formatClock(leap2024.change!.at, vn)).toBe("10:09");
  expect(skyDayOf({ year: 2028, month: 2, day: 29 }, vn).change).toBeUndefined();
  const march = skyDayOf({ year: 2028, month: 3, day: 1 }, vn);
  expect(march.change).toMatchObject({ from: "aries", to: "taurus" });
  expect(formatClock(march.change!.at, vn)).toBe("04:41");
});

test("10. New York DST day is 23 hours; Gemini 10.6 degrees, 39% lit", () => {
  const noon = new Date("2027-03-14T12:00:00-04:00");
  const [start, end] = localDayRange(noon, newYork);
  expect((end.getTime() - start.getTime()) / 3600000).toBe(23);
  const sky = dailySkyAt(noon, newYork);
  expect(sky.date).toEqual({ year: 2027, month: 3, day: 14 });
  expect(sky.sign).toBe("gemini");
  expect(sky.degree).toBeCloseTo(10.6, 1);
  expect(Math.round(sky.illumination * 100)).toBe(39);
  expect(sky.week[0].key).toBe("2027-03-14");
  expect(sky.week[1].key).toBe("2027-03-15");
});

test("11. Sydney sees the same moment on its own day: change at 22:09", () => {
  const sky = dailySkyAt(new Date("2026-11-24T12:00:00+11:00"), sydney);
  expect(sky.date).toEqual({ year: 2026, month: 11, day: 24 });
  expect(sky.change).toMatchObject({ from: "taurus", to: "gemini" });
  expect(formatClock(sky.change!.at, sydney)).toBe("22:09");
});

test("12. main phases are named only on their own day, never 'rằm'", () => {
  const newMoon = moonPhaseFor(new Date("2027-02-06T09:00:00+07:00"), vn);
  expect(newMoon.id).toBe("new");
  expect(formatClock(newMoon.exactAt!, vn)).toBe("22:56");
  expect(moonPhaseFor(new Date("2027-02-07T09:00:00+07:00"), vn).id).toBe("waxing_crescent");
  expect(moonPhaseFor(new Date("2026-11-23T23:59:00+07:00"), vn).id).toBe("waxing_gibbous");
  expect(moonPhaseFor(new Date("2026-11-25T00:01:00+07:00"), vn).id).toBe("waning_gibbous");
  expect(nextMoonEvent(new Date("2027-02-01T08:00:00+07:00"), vn)).toMatchObject({ kind: "new", days: 5 });
});

test("the Moon changes sign at most once per local day over two months", () => {
  const first = dailySkyAt(new Date("2026-12-01T12:00:00+07:00"), vn).date;
  for (let offset = 0; offset < 60; offset += 7) {
    const week = dailySkyAt(new Date(Date.UTC(first.year, first.month - 1, first.day + offset, 5)), vn).week;
    week.forEach((day, index) => {
      if (index > 0 && day.sign !== week[index - 1].sign) expect(day.change ?? week[index - 1].change).toBeDefined();
    });
  }
});

test("decans split each sign in three", () => {
  expect([decanOf(0), decanOf(9.99), decanOf(10), decanOf(19.99), decanOf(20), decanOf(29.99)]).toEqual(["early", "early", "mid", "mid", "late", "late"]);
});
