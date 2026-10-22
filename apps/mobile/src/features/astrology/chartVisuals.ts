import { colors } from "../../theme";
import type { AstrologyAspectFact } from "./contracts";

export type AstrologyAspectEmphasis =
  | "selected"
  | "related"
  | "ambient"
  | "quiet";

export function resolveFocusedBodies(
  selectionId: string | null | undefined,
  facts: readonly { id: string }[],
  selectedAspect?: Pick<AstrologyAspectFact, "bodyA" | "bodyB">,
): string[] {
  if (selectedAspect) return [selectedAspect.bodyA, selectedAspect.bodyB];
  if (!selectionId) return [];

  const bodyId = selectionId.startsWith("body:")
    ? selectionId.slice("body:".length)
    : selectionId;
  return facts.some((fact) => fact.id === bodyId) ? [bodyId] : [];
}

export function getAstrologyAspectEmphasis(
  aspect: Pick<AstrologyAspectFact, "bodyA" | "bodyB">,
  selectionId: string | null | undefined,
  selectedFactId: string | undefined,
  selectedAspect: boolean,
): AstrologyAspectEmphasis {
  if (!selectionId) return "ambient";
  if (selectedAspect) return "selected";
  if (
    selectedFactId &&
    (aspect.bodyA === selectedFactId || aspect.bodyB === selectedFactId)
  ) {
    return "related";
  }
  return "quiet";
}

export function getAstrologyAspectLineStyle(type: string): {
  color: string;
  dashArray?: string;
} {
  switch (type) {
    case "sextile":
      return { color: colors.moon, dashArray: "2 4" };
    case "square":
      return { color: colors.rose, dashArray: "7 3" };
    case "trine":
      return { color: colors.ivory, dashArray: "10 3 2 3" };
    case "opposition":
      return { color: colors.rose, dashArray: "1 4" };
    case "conjunction":
    default:
      return { color: colors.gold };
  }
}

export function getAstrologyAspectLineMetrics(
  emphasis: AstrologyAspectEmphasis,
): { opacity: number; width: number } {
  switch (emphasis) {
    case "selected":
      return { opacity: 1, width: 2.4 };
    case "related":
      return { opacity: 0.88, width: 1.45 };
    case "quiet":
      return { opacity: 0.1, width: 0.55 };
    case "ambient":
    default:
      return { opacity: 0.3, width: 0.7 };
  }
}
