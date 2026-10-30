import { drawRandomCards } from "../randomDraw";

describe("drawRandomCards", () => {
  it("returns distinct cards for a spread", () => {
    const picks = drawRandomCards(3, 78);
    expect(picks).toHaveLength(3);
    expect(new Set(picks.map((pick) => pick.index)).size).toBe(3);
    picks.forEach((pick) => expect(pick.index).toBeGreaterThanOrEqual(0));
  });

  it("lets the same card appear both upright and reversed in one-card draws", () => {
    const seen = new Map<number, Set<boolean>>();
    for (let run = 0; run < 20000; run += 1) {
      const [pick] = drawRandomCards(1, 78);
      const orientations = seen.get(pick.index) ?? new Set<boolean>();
      orientations.add(pick.reversed);
      seen.set(pick.index, orientations);
    }
    expect(seen.size).toBe(78);
    seen.forEach((orientations) => expect(orientations.size).toBe(2));
  });

  it("follows the reversed rate", () => {
    let reversed = 0;
    const runs = 10000;
    for (let run = 0; run < runs; run += 1) if (drawRandomCards(1, 78, { reversedRate: 0.3 })[0].reversed) reversed += 1;
    expect(reversed / runs).toBeGreaterThan(0.25);
    expect(reversed / runs).toBeLessThan(0.35);
  });
});
