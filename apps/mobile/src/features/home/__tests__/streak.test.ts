import { previousDayKey, visibleStreak } from "../streak";

test("a streak shows only while the last activity was today or yesterday", () => {
  expect(visibleStreak(2, "2026-11-02", "2026-11-02")).toBe(2);
  expect(visibleStreak(2, "2026-11-01", "2026-11-02")).toBe(2);
  expect(visibleStreak(2, "2026-10-31", "2026-11-02")).toBe(0);
  expect(visibleStreak(5, undefined, "2026-11-02")).toBe(0);
});

test("the previous day crosses month and year boundaries", () => {
  expect(previousDayKey("2026-11-01")).toBe("2026-10-31");
  expect(previousDayKey("2027-01-01")).toBe("2026-12-31");
});
