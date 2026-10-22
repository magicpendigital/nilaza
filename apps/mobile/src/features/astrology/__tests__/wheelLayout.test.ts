import { layoutWheelLabels } from "../wheelLayout";
import { AstrologyPlacementFact } from "../contracts";
const facts = (angles: number[]) =>
  angles.map(
    (longitude, i) =>
      ({
        id: `body${i}`,
        kind: "placement",
        longitude,
        sign: "aries",
        degree: 0,
        confidence: "exact",
        retrograde: false,
        label: { en: `body${i}` },
      }) as AstrologyPlacementFact,
  );
test.each([
  [Array(12).fill(0)],
  [[359, 0, 1, 2, 180, 181, 182]],
  [[13.2, 15.9, 15, 47.8, 75, 105.1, 195.2, 284.8, 317.4, 315.3, 257.7, 358.4]],
])("bounded labels do not collide across the seam", (longitudes) => {
  const source = facts(longitudes);
  const before = JSON.stringify(source);
  const layout = layoutWheelLabels(source);
  const values = [...layout.values()].sort((a, b) => a - b);
  values.forEach((a, i) =>
    expect(
      (values[(i + 1) % values.length] - a + 360) % 360,
    ).toBeGreaterThanOrEqual(14.999),
  );
  expect(JSON.stringify(source)).toEqual(before);
  expect(layoutWheelLabels([...source].reverse())).toEqual(layout);
});
