import { CARD_ASPECT, FLIGHT_STAGES, FLIGHT_TOTAL_MS, slotSizing } from "../ritualLayout";

const phone = { areaWidth: 320, viewportHeight: 800 };

describe("slotSizing", () => {
  it("keeps one card moderate while the deck is on screen so the deck stays above the button", () => {
    const { width } = slotSizing({ ...phone, count: 1, done: false });
    expect(width).toBeGreaterThanOrEqual(110);
    expect(width * CARD_ASPECT).toBeLessThanOrEqual(800 * 0.3 + 1);
  });

  it("grows a single card once it is drawn, and never past 220", () => {
    const small = slotSizing({ ...phone, count: 1, done: false }).width;
    const big = slotSizing({ ...phone, count: 1, done: true }).width;
    expect(big).toBeGreaterThan(small);
    expect(slotSizing({ areaWidth: 900, viewportHeight: 1600, count: 1, done: true }).width).toBe(220);
  });

  it("is larger on a wider screen and smaller on a narrower one", () => {
    const narrow = slotSizing({ areaWidth: 280, viewportHeight: 800, count: 1, done: true }).width;
    const wide = slotSizing({ areaWidth: 380, viewportHeight: 900, count: 1, done: true }).width;
    expect(wide).toBeGreaterThan(narrow);
  });

  it("fits two to four cards in one row on a small phone", () => {
    for (const count of [2, 3, 4]) {
      const { width, gap } = slotSizing({ areaWidth: 300, viewportHeight: 640, count, done: false });
      expect(width * count + gap * (count - 1)).toBeLessThanOrEqual(300);
    }
  });

  it("caps cards on a wide screen instead of stretching them", () => {
    expect(slotSizing({ areaWidth: 800, viewportHeight: 1200, count: 3, done: false }).width).toBe(120);
    expect(slotSizing({ areaWidth: 800, viewportHeight: 1200, count: 4, done: false }).width).toBe(92);
  });

  it("falls back to a sane width for a zero or tiny measured area", () => {
    const { width } = slotSizing({ areaWidth: 0, viewportHeight: 0, count: 3, done: false });
    expect(width).toBeGreaterThan(40);
  });
});

describe("flight timing", () => {
  it("has the five stages in order and a slow face-down hold, flip and name hold", () => {
    expect(FLIGHT_STAGES.map((stage) => stage.key)).toEqual(["rise", "hold", "flip", "name", "land"]);
    const ms = Object.fromEntries(FLIGHT_STAGES.map((stage) => [stage.key, stage.ms]));
    expect(ms.hold).toBeGreaterThanOrEqual(1200);
    expect(ms.flip).toBeGreaterThanOrEqual(1200);
    expect(ms.name).toBeGreaterThanOrEqual(1800);
  });

  it("keeps one card under about seven seconds so a four-card spread stays bearable", () => {
    expect(FLIGHT_TOTAL_MS).toBeLessThanOrEqual(7000);
  });
});
