import { signs } from "../../../../../../packages/astrology-core/calculator.mjs";
import { nextMoonEvent } from "../../home/moonPhase";
import { bigThreeOf, moonHouseToday, moonSignAt } from "../sky";

const chart = (birthTimeKnown: boolean) => ({
  placements: [{ body: "sun", sign: "pisces" }, { body: "moon", sign: "cancer" }],
  angles: birthTimeKnown ? [{ body: "ascendant", sign: "cancer" }] : [],
  // Whole Sign houses starting from the Cancer ascendant.
  houses: birthTimeKnown ? Array.from({ length: 12 }, (_, index) => ({ house: index + 1, sign: signs[(3 + index) % 12] })) : [],
  time: { birthTimeKnown }
}) as any;

test("Big 3 comes from the chart, Rising only with a birth time", () => {
  expect(bigThreeOf(chart(true))).toEqual({ sun: "pisces", moon: "cancer", rising: "cancer" });
  expect(bigThreeOf(chart(false))).toEqual({ sun: "pisces", moon: "cancer" });
});

test("today's Moon lands in the Whole Sign house of its sign", () => {
  const now = new Date("2026-10-31T12:00:00Z");
  expect(moonSignAt(now)).toBe("cancer");
  expect(moonHouseToday(chart(true), now)).toEqual({ house: 1, sign: "cancer" });
  expect(moonHouseToday(chart(false), now)).toBeNull();
});

test("next full or new moon is counted in whole days", () => {
  // First quarter 18 Jan to full moon 25 Jan 2024 is 7.6 days.
  expect(nextMoonEvent(new Date("2024-01-18T03:53:00Z"))).toEqual({ kind: "full", days: 8 });
  expect(nextMoonEvent(new Date("2024-02-02T23:18:00Z"))).toEqual({ kind: "new", days: 7 });
  // On the full moon itself the next event is today.
  expect(nextMoonEvent(new Date("2024-01-25T17:54:00Z"))).toEqual({ kind: "full", days: 0 });
});
