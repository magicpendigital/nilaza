import { signs } from "../../../../../../packages/astrology-core/calculator.mjs";
import { compareCharts, synastryText } from "../synastry";

const placement = (body: string, longitude: number) => ({ body, longitude, sign: signs[Math.floor(longitude / 30)] });
const exactChart = (longitudes: Record<string, number>) => ({
  placements: Object.entries(longitudes).map(([body, lon]) => placement(body, lon)),
  angles: [],
  sampledRanges: [],
  time: { precision: "exact" }
}) as any;
// Unknown time: only sampled ranges, the midpoint is used for planets.
const unknownChart = (longitudes: Record<string, number>) => ({
  placements: [],
  angles: [],
  sampledRanges: Object.entries(longitudes).map(([body, lon]) => ({ body, sampleStartLongitude: lon - 0.5, minOffset: 0, maxOffset: 1, possibleSigns: [signs[Math.floor(lon / 30)]] })),
  time: { precision: "unknown" }
}) as any;

// Mine: Sun Pisces, Moon Cancer. Theirs puts several bodies on exact aspects to mine.
const mine = { sun: 340, moon: 100, mercury: 330, venus: 10, mars: 50, saturn: 200 };
const theirs = { sun: 101, moon: 222, mercury: 61, venus: 51.5, mars: 280, saturn: 263 };

test("elements pair the Sun and Moon signs of both people", () => {
  const result = compareCharts(exactChart(mine), exactChart(theirs), "friend");
  expect(result.elements).toEqual([
    { body: "sun", mine: "pisces", theirs: "cancer", pair: "water-water", uncertain: false },
    { body: "moon", mine: "cancer", theirs: "scorpio", pair: "water-water", uncertain: false }
  ]);
});

test("at most five aspects, closest first, keeping both a flowing and a tension aspect", () => {
  const result = compareCharts(exactChart(mine), exactChart(theirs), "partner");
  expect(result.aspects.length).toBeLessThanOrEqual(5);
  expect(result.aspects.map((item) => item.orb)).toEqual([...result.aspects.map((item) => item.orb)].sort((a, b) => a - b));
  expect(result.aspects.some((item) => item.kind === "flowing")).toBe(true);
  expect(result.aspects.some((item) => item.kind === "tension")).toBe(true);
  expect(result.aspects).toEqual(expect.arrayContaining([expect.objectContaining({ group: "sun-moon", kind: "conjunction", mine: "moon", theirs: "sun" })]));
  expect(result.aspects.some((item) => item.group === "venus-mars")).toBe(true);
  // One text per group and kind.
  expect(new Set(result.aspects.map((item) => `${item.group}:${item.kind}`)).size).toBe(result.aspects.length);
  // With a limit of two the flowing and tension aspects still both appear.
  const two = compareCharts(exactChart(mine), exactChart(theirs), "partner", 2).aspects.map((item) => item.kind);
  expect(two).toEqual(expect.arrayContaining(["flowing", "tension"]));
});

test("Venus–Mars stays out of family and work comparisons", () => {
  for (const relationship of ["family", "work"] as const) {
    expect(compareCharts(exactChart(mine), exactChart(theirs), relationship).aspects.some((item) => item.group === "venus-mars")).toBe(false);
  }
});

test("an unknown birth time hides Moon aspects and notes the Moon element", () => {
  const result = compareCharts(exactChart(mine), unknownChart(theirs), "friend");
  expect(result.aspects.some((item) => item.mine === "moon" || item.theirs === "moon")).toBe(false);
  expect(result.elements.find((row) => row.body === "moon")?.uncertain).toBe(true);
  const text = synastryText(result, "Minh", "vi");
  // Both pairs are Water–Water, so they share one card that carries the Moon note.
  expect(text.elements).toHaveLength(1);
  expect(text.elements[0].label).toBe("Mặt Trời: bạn Song Ngư (Nước) · Minh Cự Giải (Nước)\nMặt Trăng: bạn Cự Giải (Nước) · Minh Bọ Cạp (Nước)");
  expect(text.elements[0].note).toBe("Giờ sinh chưa rõ nên Mặt Trăng có thể khác.");
  expect(text.aspects.every((item) => item.label.includes("của bạn") && item.label.includes("của Minh"))).toBe(true);
  expect(text.footer).toBe("Diễn giải biểu tượng để tự phản chiếu, không phải dự đoán chắc chắn về hai người.");
});
