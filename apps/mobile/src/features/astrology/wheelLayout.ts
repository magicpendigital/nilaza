import { AstrologyPlacementFact } from "./contracts";

/** Spread labels around a bounded inner ring; true longitude anchors never move. */
export function layoutWheelLabels(
  facts: AstrologyPlacementFact[],
  minimumGap = 15,
) {
  if (!facts.length) return new Map<string, number>();
  const sorted = [...facts].sort(
    (a, b) => a.longitude - b.longitude || a.id.localeCompare(b.id),
  );
  let cut = 0,
    largest = -1;
  sorted.forEach((f, i) => {
    const next =
        sorted[(i + 1) % sorted.length].longitude +
        (i === sorted.length - 1 ? 360 : 0),
      gap = next - f.longitude;
    if (gap > largest) {
      largest = gap;
      cut = (i + 1) % sorted.length;
    }
  });
  const ordered = [...sorted.slice(cut), ...sorted.slice(0, cut)];
  const origin = ordered[0].longitude;
  const gap = Math.min(minimumGap, 360 / ordered.length);
  const angles = ordered.map(
    (f) => ((f.longitude - origin + 360) % 360) + origin,
  );
  for (let i = 1; i < angles.length; i++)
    angles[i] = Math.max(angles[i], angles[i - 1] + gap);
  // Keep a gap at the seam as well, even with every body at the same longitude.
  angles[angles.length - 1] = Math.min(
    angles[angles.length - 1],
    angles[0] + 360 - gap,
  );
  for (let i = angles.length - 2; i >= 0; i--)
    angles[i] = Math.min(angles[i], angles[i + 1] - gap);
  return new Map(
    ordered.map((f, i) => [f.id, ((angles[i] % 360) + 360) % 360]),
  );
}
