import golden from "../../../../../../docs/proposals/data/numerology-golden-2026-11-23.json";
import { challenges, completedAge, currentPinnacleIndex, localToday, parseBirthDate, personalCycles, pinnacles } from "../calc";

// Lô 5: rules 6-8 of docs/proposals/ASTRO_NUMEROLOGY_IMPLEMENTATION_2026-11-23.vi.md, variant masters11_22_only (D1).
const cases = golden.variants.masters11_22_only as any[];
const cycleCases = golden.personalCycles as { birth: string; on: string; personalYearMonthDay: number[] }[];
const day = (value: string) => parseBirthDate(value)!;

test("the golden sets are complete", () => {
  expect(cases).toHaveLength(28);
  expect(cycleCases.length).toBeGreaterThanOrEqual(5);
});

describe.each(cases.map((item) => [item.id, item] as const))("golden case %s", (_id, item) => {
  const birth = day(item.birth);

  test("pinnacles keep 11/22 and never 33", () => {
    expect(pinnacles(birth).map((stage) => stage.number.label)).toEqual(item.pinnacles);
  });

  test("pinnacle ages from the life path root", () => {
    expect(pinnacles(birth).map((stage) => [stage.fromAge, stage.toAge])).toEqual(item.pinnacleAges);
  });

  test("challenges reduce the parts to one digit and allow 0", () => {
    expect(challenges(birth)).toEqual(item.challenges);
  });
});

describe.each(cycleCases.map((item) => [`${item.birth} on ${item.on}`, item] as const))("personal cycles %s", (_label, item) => {
  test("year, month and day", () => {
    const result = personalCycles(day(item.birth), day(item.on));
    expect([result.year, result.month, result.day]).toEqual(item.personalYearMonthDay);
  });
});

test("the personal year changes on 1 January and never keeps a master number", () => {
  const birth = day("2000-03-15");
  expect(personalCycles(birth, day("2026-12-31")).year).toBe(1);
  expect(personalCycles(birth, day("2027-01-01")).year).toBe(2);
  // 15 + 3 + 2029 would reach 11 if masters were kept; it must read 2.
  for (let year = 1990; year < 2060; year += 1) {
    const cycles = personalCycles(birth, { year, month: 11, day: 29 });
    for (const value of [cycles.year, cycles.month, cycles.day]) {
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(9);
    }
  }
});

test("the current pinnacle follows the completed age", () => {
  const birth = day("2000-03-15");
  expect(completedAge(birth, day("2026-11-25"))).toBe(26);
  expect(completedAge(birth, day("2035-03-14"))).toBe(34);
  expect(completedAge(birth, day("2035-03-15"))).toBe(35);
  expect(currentPinnacleIndex(birth, day("2026-11-25"))).toBe(0);
  expect(currentPinnacleIndex(birth, day("2035-03-14"))).toBe(0);
  expect(currentPinnacleIndex(birth, day("2035-03-15"))).toBe(1);
  expect(currentPinnacleIndex(birth, day("2044-03-15"))).toBe(2);
  expect(currentPinnacleIndex(birth, day("2053-03-15"))).toBe(3);
  expect(currentPinnacleIndex(birth, day("2100-01-01"))).toBe(3);
});

test("today is read in local time", () => {
  expect(localToday(new Date(2027, 0, 1, 0, 5))).toEqual({ year: 2027, month: 1, day: 1 });
});
