import type { AstrologyAspectFact, AstrologyPlacementFact } from "./contracts";

export type ChartPoint = {
  x: number;
  y: number;
};

export type PlacementAnchor = ChartPoint & {
  id: string;
  longitude: number;
  angleDegrees: number;
};

export type LabelAnchor = ChartPoint & {
  id: string;
  layer: number;
  anchor: PlacementAnchor;
};

export type AspectSegment = {
  id: string;
  aspect: AstrologyAspectFact;
  from: PlacementAnchor;
  to: PlacementAnchor;
};

export type ChartGeometry = {
  center: ChartPoint;
  radius: number;
  zoom: number;
  zodiacAnchors: Array<
    ChartPoint & { signIndex: number; angleDegrees: number }
  >;
  placementAnchors: PlacementAnchor[];
  labelAnchors: LabelAnchor[];
  aspectSegments: AspectSegment[];
};

export function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

export function chartAngleForLongitude(longitude: number): number {
  return normalizeDegrees(longitude - 90);
}

export function polarPoint(
  center: ChartPoint,
  radius: number,
  angleDegrees: number,
): ChartPoint {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: center.x + Math.cos(radians) * radius,
    y: center.y + Math.sin(radians) * radius,
  };
}

function distanceBetween(first: ChartPoint, second: ChartPoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function buildPlacementAnchors(
  facts: AstrologyPlacementFact[],
  center: ChartPoint,
  radius: number,
): PlacementAnchor[] {
  return facts.map((fact) => {
    const angleDegrees = chartAngleForLongitude(fact.longitude);
    return {
      id: fact.id,
      longitude: fact.longitude,
      angleDegrees,
      ...polarPoint(center, radius, angleDegrees),
    };
  });
}

/**
 * Labels may move radially to avoid obscuring each other; fact anchors never
 * move. The future renderer can use `layer` for a leader line or a list-mode
 * alternative without changing the calculated point.
 */
export function resolveLabelCollisions(
  anchors: PlacementAnchor[],
  center: ChartPoint,
  radius: number,
  minimumDistance = 32,
): LabelAnchor[] {
  const labels: LabelAnchor[] = [];
  for (const anchor of [...anchors].sort(
    (a, b) => a.angleDegrees - b.angleDegrees || a.id.localeCompare(b.id),
  )) {
    let layer = 0;
    let candidate = polarPoint(center, radius, anchor.angleDegrees);
    while (
      labels.some(
        (label) => distanceBetween(label, candidate) < minimumDistance,
      ) &&
      layer < 8
    ) {
      layer += 1;
      candidate = polarPoint(center, radius + layer * 18, anchor.angleDegrees);
    }
    labels.push({ id: anchor.id, anchor, layer, ...candidate });
  }
  return labels;
}

export function buildChartGeometry({
  width,
  height,
  facts,
  aspects,
  zoom = 1,
}: {
  width: number;
  height: number;
  facts: AstrologyPlacementFact[];
  aspects: AstrologyAspectFact[];
  zoom?: number;
}): ChartGeometry {
  const safeZoom = Math.min(Math.max(zoom, 1), 3);
  const center = { x: Math.max(width, 0) / 2, y: Math.max(height, 0) / 2 };
  const radius = Math.max(0, Math.min(width, height) * 0.34 * safeZoom);
  const placementAnchors = buildPlacementAnchors(facts, center, radius);
  const byId = new Map(placementAnchors.map((anchor) => [anchor.id, anchor]));
  const aspectSegments = aspects.flatMap((aspect) => {
    const from = byId.get(aspect.bodyA);
    const to = byId.get(aspect.bodyB);
    return from && to ? [{ id: aspect.id, aspect, from, to }] : [];
  });
  const zodiacAnchors = Array.from({ length: 12 }, (_, signIndex) => {
    const angleDegrees = chartAngleForLongitude(signIndex * 30 + 15);
    return {
      signIndex,
      angleDegrees,
      ...polarPoint(center, radius * 1.18, angleDegrees),
    };
  });

  return {
    center,
    radius,
    zoom: safeZoom,
    zodiacAnchors,
    placementAnchors,
    labelAnchors: resolveLabelCollisions(
      placementAnchors,
      center,
      radius * 1.12,
    ),
    aspectSegments,
  };
}

export function findNearestChartTarget(
  anchors: PlacementAnchor[],
  target: ChartPoint,
  hitRadius = 26,
): PlacementAnchor | null {
  const candidates = anchors
    .map((anchor) => ({ anchor, distance: distanceBetween(anchor, target) }))
    .filter((candidate) => candidate.distance <= hitRadius)
    // Modern JavaScript sorts stably. For an exact overlap, preserve the
    // canonical fact order and let the renderer expose the complete list as an
    // alternative instead of silently reordering facts by a display label.
    .sort((first, second) => first.distance - second.distance);
  return candidates[0]?.anchor ?? null;
}
