import {
  buildChartGeometry,
  chartAngleForLongitude,
  findNearestChartTarget,
  normalizeDegrees,
} from "../chartGeometry";
import type { AstrologyAspectFact, AstrologyPlacementFact } from "../contracts";

const facts: AstrologyPlacementFact[] = [
  {
    id: "sun",
    kind: "placement",
    label: { en: "Sun" },
    longitude: 0,
    sign: "aries",
    degree: 0,
    confidence: "exact",
    retrograde: false,
  },
  {
    id: "moon",
    kind: "placement",
    label: { en: "Moon" },
    longitude: 0,
    sign: "aries",
    degree: 0,
    confidence: "exact",
    retrograde: false,
  },
  {
    id: "venus",
    kind: "placement",
    label: { en: "Venus" },
    longitude: 180,
    sign: "libra",
    degree: 0,
    confidence: "exact",
    retrograde: false,
  },
];

const aspects: AstrologyAspectFact[] = [
  {
    id: "sun:opposition:venus:0",
    bodyA: "sun",
    bodyB: "venus",
    type: "opposition",
    orb: 0,
    exactSeparation: 180,
    confidence: "exact",
  },
];

describe("astrology chart geometry", () => {
  it("normalizes longitudes and places Aries at the top of the wheel", () => {
    expect(normalizeDegrees(-1)).toBe(359);
    expect(chartAngleForLongitude(0)).toBe(270);
    const chart = buildChartGeometry({
      width: 300,
      height: 300,
      facts,
      aspects,
    });
    const sun = chart.placementAnchors.find((item) => item.id === "sun");
    expect(sun?.x).toBeCloseTo(150, 4);
    expect(sun?.y).toBeLessThan(150);
  });

  it("keeps the fact angle stable while zoom changes radial distance", () => {
    const normal = buildChartGeometry({
      width: 300,
      height: 300,
      facts,
      aspects,
      zoom: 1,
    });
    const zoomed = buildChartGeometry({
      width: 300,
      height: 300,
      facts,
      aspects,
      zoom: 2,
    });
    const normalSun = normal.placementAnchors.find((item) => item.id === "sun");
    const zoomedSun = zoomed.placementAnchors.find((item) => item.id === "sun");
    expect(normalSun?.angleDegrees).toBe(zoomedSun?.angleDegrees);
    expect(zoomed.radius).toBeGreaterThan(normal.radius);
  });

  it("moves only labels into layers when placements collide and preserves a list fallback", () => {
    const chart = buildChartGeometry({
      width: 300,
      height: 300,
      facts,
      aspects,
    });
    const sunLabel = chart.labelAnchors.find((item) => item.id === "sun");
    const moonLabel = chart.labelAnchors.find((item) => item.id === "moon");
    expect(sunLabel?.anchor.x).toBe(moonLabel?.anchor.x);
    expect(sunLabel?.anchor.y).toBe(moonLabel?.anchor.y);
    expect([sunLabel?.layer, moonLabel?.layer]).toContain(0);
    expect(
      [sunLabel?.layer, moonLabel?.layer].some(
        (layer) => typeof layer === "number" && layer > 0,
      ),
    ).toBe(true);
    expect(chart.aspectSegments).toHaveLength(1);
    expect(
      findNearestChartTarget(chart.placementAnchors, {
        x: chart.placementAnchors[0].x,
        y: chart.placementAnchors[0].y,
      })?.id,
    ).toBe("sun");
  });
});
