import type { CandidateChart } from "../../../../../packages/astrology-core/calculator.mjs";
import {
  astrologyCanonicalContractId,
  astrologySignIds,
  localizeAstrologyBody,
  localizeAstrologySign,
  type AstrologySignId,
} from "./contracts";

export const astrologyPlanetIds = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
] as const;

export const astrologyAngleIds = ["ascendant", "midheaven"] as const;

export const astrologyAspectTypes = [
  "conjunction",
  "sextile",
  "square",
  "trine",
  "opposition",
] as const;

export const astrologyHouseNumbers = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
] as const;

export type AstrologyPlanetId = (typeof astrologyPlanetIds)[number];
export type AstrologyAngleId = (typeof astrologyAngleIds)[number];
export type AstrologyBodyId = AstrologyPlanetId | AstrologyAngleId;
export type AstrologyAspectType = (typeof astrologyAspectTypes)[number];
export type AstrologyHouseNumber = (typeof astrologyHouseNumbers)[number];
export type AstrologySelectionLanguage = "vi" | "en";

export type AstrologyBodyFactId = `placement.${AstrologyBodyId}`;
export type AstrologyHouseFactId = `house.${AstrologyHouseNumber}`;
export type AstrologyAspectFactId =
  `aspect.${AstrologyBodyId}_${AstrologyBodyId}.${AstrologyAspectType}`;
export type AstrologyFactId =
  | AstrologyBodyFactId
  | AstrologyHouseFactId
  | AstrologyAspectFactId;

export type SafeAstrologyEvidenceRef = Readonly<{
  source: "calculated_chart";
  contractId: typeof astrologyCanonicalContractId;
  contractVersion: "0.2.0";
  kind: "placement" | "angle" | "house" | "aspect";
  factId: AstrologyFactId;
}>;

type SelectionBase<Kind extends string, Id extends string> = Readonly<{
  kind: Kind;
  id: Id;
  evidenceRefs: readonly SafeAstrologyEvidenceRef[];
  personalized: boolean;
}>;

export type AstrologyBodySelection = SelectionBase<
  "body",
  `body:${AstrologyBodyId}`
> &
  Readonly<{
    bodyId: AstrologyBodyId;
    sourceKind: "placement" | "angle";
    sign: AstrologySignId;
  }>;

export type AstrologySignSelection = SelectionBase<
  "sign",
  `sign:${AstrologySignId}`
> &
  Readonly<{
    sign: AstrologySignId;
  }>;

export type AstrologyHouseSelection = SelectionBase<
  "house",
  `house:${AstrologyHouseNumber}`
> &
  Readonly<{
    house: AstrologyHouseNumber;
    sign: AstrologySignId;
  }>;

export type AstrologyAspectSelection = SelectionBase<
  "aspect",
  AstrologyAspectFactId
> &
  Readonly<{
    bodyA: AstrologyBodyId;
    bodyB: AstrologyBodyId;
    aspectType: AstrologyAspectType;
  }>;

export type AstrologyChartSelection =
  | AstrologyBodySelection
  | AstrologySignSelection
  | AstrologyHouseSelection
  | AstrologyAspectSelection;

export type AstrologySelectionReasonCode =
  | "unsupported_chart_contract"
  | "angles_and_houses_excluded_uncertain_time"
  | "ambiguous_body_excluded"
  | "ambiguous_house_excluded"
  | "ambiguous_aspect_excluded";

export type AstrologyChartSelectionModel = Readonly<{
  contractId: typeof astrologyCanonicalContractId;
  contractVersion: "0.2.0";
  precision: "exact" | "approximate" | "unknown";
  anglesAndHousesAvailable: boolean;
  bodies: readonly AstrologyBodySelection[];
  signs: readonly AstrologySignSelection[];
  houses: readonly AstrologyHouseSelection[];
  aspects: readonly AstrologyAspectSelection[];
  selections: readonly AstrologyChartSelection[];
  reasonCodes: readonly AstrologySelectionReasonCode[];
}>;

const bodyOrder: readonly AstrologyBodyId[] = [
  ...astrologyPlanetIds,
  ...astrologyAngleIds,
];
const bodyOrderIndex = new Map(
  bodyOrder.map((bodyId, index) => [bodyId, index]),
);
const planetSet = new Set<string>(astrologyPlanetIds);
const angleSet = new Set<string>(astrologyAngleIds);
const bodySet = new Set<string>(bodyOrder);
const signSet = new Set<string>(astrologySignIds);
const aspectTypeSet = new Set<string>(astrologyAspectTypes);
const houseNumberSet = new Set<number>(astrologyHouseNumbers);

const aspectLabels: Record<
  AstrologyAspectType,
  Record<AstrologySelectionLanguage, string>
> = {
  conjunction: { vi: "đồng vị", en: "conjunction" },
  sextile: { vi: "lục hợp", en: "sextile" },
  square: { vi: "vuông", en: "square" },
  trine: { vi: "tam hợp", en: "trine" },
  opposition: { vi: "đối đỉnh", en: "opposition" },
};

const selectionKindLabels: Record<
  AstrologyChartSelection["kind"],
  Record<AstrologySelectionLanguage, string>
> = {
  body: { vi: "Thiên thể", en: "Body" },
  sign: { vi: "Cung hoàng đạo", en: "Zodiac sign" },
  house: { vi: "Nhà", en: "House" },
  aspect: { vi: "Góc hợp", en: "Aspect" },
};

function isPlanetId(value: unknown): value is AstrologyPlanetId {
  return typeof value === "string" && planetSet.has(value);
}

function isAngleId(value: unknown): value is AstrologyAngleId {
  return typeof value === "string" && angleSet.has(value);
}

function isBodyId(value: unknown): value is AstrologyBodyId {
  return typeof value === "string" && bodySet.has(value);
}

function isSignId(value: unknown): value is AstrologySignId {
  return typeof value === "string" && signSet.has(value);
}

function isAspectType(value: unknown): value is AstrologyAspectType {
  return typeof value === "string" && aspectTypeSet.has(value);
}

function isHouseNumber(value: unknown): value is AstrologyHouseNumber {
  return typeof value === "number" && houseNumberSet.has(value);
}

function bodyFactId(
  bodyId: AstrologyBodyId,
): AstrologyBodyFactId {
  return `placement.${bodyId}`;
}

function evidenceRef(
  kind: SafeAstrologyEvidenceRef["kind"],
  factId: AstrologyFactId,
): SafeAstrologyEvidenceRef {
  return {
    source: "calculated_chart",
    contractId: astrologyCanonicalContractId,
    contractVersion: "0.2.0",
    kind,
    factId,
  };
}

function uniqueEvidenceRefs(
  refs: readonly SafeAstrologyEvidenceRef[],
): SafeAstrologyEvidenceRef[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    if (seen.has(ref.factId)) return false;
    seen.add(ref.factId);
    return true;
  });
}

function canonicalBodyPair(
  first: AstrologyBodyId,
  second: AstrologyBodyId,
): readonly [AstrologyBodyId, AstrologyBodyId] {
  return (bodyOrderIndex.get(first) ?? Number.MAX_SAFE_INTEGER) <=
    (bodyOrderIndex.get(second) ?? Number.MAX_SAFE_INTEGER)
    ? [first, second]
    : [second, first];
}

/**
 * Aspect IDs do not depend on payload order, array position, or a provider ID.
 * This lets UI selection and AI citations survive deterministic recalculation.
 */
export function stableAstrologyAspectFactId(
  bodyA: AstrologyBodyId,
  aspectType: AstrologyAspectType,
  bodyB: AstrologyBodyId,
): AstrologyAspectFactId {
  const [first, second] = canonicalBodyPair(bodyA, bodyB);
  return `aspect.${first}_${second}.${aspectType}`;
}

function emptyModel(
  precision: AstrologyChartSelectionModel["precision"] = "unknown",
): AstrologyChartSelectionModel {
  const signs: AstrologySignSelection[] = astrologySignIds.map((sign) => ({
    kind: "sign",
    id: `sign:${sign}`,
    sign,
    evidenceRefs: [],
    personalized: false,
  }));
  return {
    contractId: astrologyCanonicalContractId,
    contractVersion: "0.2.0",
    precision,
    anglesAndHousesAvailable: false,
    bodies: [],
    signs,
    houses: [],
    aspects: [],
    selections: signs,
    reasonCodes: ["unsupported_chart_contract"],
  };
}

function preciseAnglesAndHousesAreAvailable(chart: CandidateChart): boolean {
  return (
    chart.time.precision === "exact" &&
    chart.time.birthTimeKnown === true &&
    typeof chart.time.utc === "string" &&
    chart.time.range === null
  );
}

function duplicateValues(values: readonly string[]): Set<string> {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([value]) => value),
  );
}

/**
 * Creates the single feature-owned selection boundary used by the wheel,
 * story sheet, and future AI evidence citations. It never copies raw birth
 * input, location, timezone, coordinates, or UTC into the selection model.
 */
export function buildAstrologyChartSelectionModel(
  chart: CandidateChart | null | undefined,
): AstrologyChartSelectionModel {
  if (
    !chart ||
    chart.contractId !== astrologyCanonicalContractId ||
    chart.contractVersion !== "0.2.0"
  ) {
    return emptyModel(chart?.time?.precision ?? "unknown");
  }

  const reasons = new Set<AstrologySelectionReasonCode>();
  const anglesAndHousesAvailable = preciseAnglesAndHousesAreAvailable(chart);
  if (!anglesAndHousesAvailable) {
    reasons.add("angles_and_houses_excluded_uncertain_time");
  }

  const placementCandidates = chart.placements.filter(
    (fact) => isPlanetId(fact.body) && isSignId(fact.sign),
  );
  const angleCandidates = anglesAndHousesAvailable
    ? chart.angles.filter(
        (fact) => isAngleId(fact.body) && isSignId(fact.sign),
      )
    : [];
  const duplicateBodies = duplicateValues([
    ...placementCandidates.map((fact) => fact.body),
    ...angleCandidates.map((fact) => fact.body),
  ]);
  if (duplicateBodies.size) reasons.add("ambiguous_body_excluded");

  const bodySelections: AstrologyBodySelection[] = [
    ...placementCandidates.map((fact) => ({
      fact,
      sourceKind: "placement" as const,
    })),
    ...angleCandidates.map((fact) => ({
      fact,
      sourceKind: "angle" as const,
    })),
  ]
    .filter(({ fact }) => !duplicateBodies.has(fact.body))
    .map(({ fact, sourceKind }) => {
      const bodyId = fact.body as AstrologyBodyId;
      const ref = evidenceRef(
        sourceKind,
        bodyFactId(bodyId),
      );
      return {
        kind: "body" as const,
        id: `body:${bodyId}` as `body:${AstrologyBodyId}`,
        bodyId,
        sourceKind,
        sign: fact.sign as AstrologySignId,
        evidenceRefs: [ref],
        personalized: true,
      };
    })
    .sort(
      (first, second) =>
        (bodyOrderIndex.get(first.bodyId) ?? Number.MAX_SAFE_INTEGER) -
        (bodyOrderIndex.get(second.bodyId) ?? Number.MAX_SAFE_INTEGER),
    );

  const rawHouses = anglesAndHousesAvailable
    ? chart.houses.filter(
        (fact) => isHouseNumber(fact.house) && isSignId(fact.sign),
      )
    : [];
  const duplicateHouses = duplicateValues(
    rawHouses.map((fact) => String(fact.house)),
  );
  if (duplicateHouses.size) reasons.add("ambiguous_house_excluded");
  const houseSelections: AstrologyHouseSelection[] = rawHouses
    .filter((fact) => !duplicateHouses.has(String(fact.house)))
    .map((fact) => {
      const house = fact.house as AstrologyHouseNumber;
      const houseRef = evidenceRef("house", `house.${house}`);
      const occupantRefs = bodySelections
        .filter((selection) => selection.sign === fact.sign)
        .flatMap((selection) => selection.evidenceRefs);
      const refs = uniqueEvidenceRefs([houseRef, ...occupantRefs]);
      return {
        kind: "house" as const,
        id: `house:${house}` as `house:${AstrologyHouseNumber}`,
        house,
        sign: fact.sign as AstrologySignId,
        evidenceRefs: refs,
        personalized: true,
      };
    })
    .sort((first, second) => first.house - second.house);

  const availableBodies = new Map(
    bodySelections.map((selection) => [selection.bodyId, selection]),
  );
  const aspectCandidates = chart.aspects.flatMap((aspect) => {
    if (
      !isBodyId(aspect.bodyA) ||
      !isBodyId(aspect.bodyB) ||
      aspect.bodyA === aspect.bodyB ||
      !isAspectType(aspect.type) ||
      !availableBodies.has(aspect.bodyA) ||
      !availableBodies.has(aspect.bodyB)
    ) {
      return [];
    }
    const [bodyA, bodyB] = canonicalBodyPair(aspect.bodyA, aspect.bodyB);
    return [
      {
        bodyA,
        bodyB,
        aspectType: aspect.type,
        factId: stableAstrologyAspectFactId(bodyA, aspect.type, bodyB),
      },
    ];
  });
  const duplicateAspects = duplicateValues(
    aspectCandidates.map((aspect) => aspect.factId),
  );
  if (duplicateAspects.size) reasons.add("ambiguous_aspect_excluded");
  const aspectSelections: AstrologyAspectSelection[] = aspectCandidates
    .filter((aspect) => !duplicateAspects.has(aspect.factId))
    .map((aspect) => {
      const refs = uniqueEvidenceRefs([
        evidenceRef("aspect", aspect.factId),
        ...(availableBodies.get(aspect.bodyA)?.evidenceRefs ?? []),
        ...(availableBodies.get(aspect.bodyB)?.evidenceRefs ?? []),
      ]);
      return {
        kind: "aspect" as const,
        id: aspect.factId,
        bodyA: aspect.bodyA,
        bodyB: aspect.bodyB,
        aspectType: aspect.aspectType,
        evidenceRefs: refs,
        personalized: true,
      };
    })
    .sort((first, second) => first.id.localeCompare(second.id));

  const signSelections: AstrologySignSelection[] = astrologySignIds.map(
    (sign) => {
      const refs = uniqueEvidenceRefs([
        ...bodySelections
          .filter((selection) => selection.sign === sign)
          .flatMap((selection) => selection.evidenceRefs),
        ...houseSelections
          .filter((selection) => selection.sign === sign)
          .flatMap((selection) => selection.evidenceRefs.slice(0, 1)),
      ]);
      return {
        kind: "sign",
        id: `sign:${sign}`,
        sign,
        evidenceRefs: refs,
        personalized: refs.length > 0,
      };
    },
  );

  const selections: AstrologyChartSelection[] = [
    ...bodySelections,
    ...signSelections,
    ...houseSelections,
    ...aspectSelections,
  ];
  return {
    contractId: astrologyCanonicalContractId,
    contractVersion: "0.2.0",
    precision: chart.time.precision,
    anglesAndHousesAvailable,
    bodies: bodySelections,
    signs: signSelections,
    houses: houseSelections,
    aspects: aspectSelections,
    selections,
    reasonCodes: [...reasons],
  };
}

export function findAstrologyChartSelection(
  model: AstrologyChartSelectionModel,
  selectionId: string | null | undefined,
): AstrologyChartSelection | undefined {
  if (!selectionId) return undefined;
  return model.selections.find((selection) => selection.id === selectionId);
}

/** Resolves a contract evidence ID back to the most specific UI selection. */
export function findAstrologyChartSelectionByFactId(
  model: AstrologyChartSelectionModel,
  factId: string | null | undefined,
): AstrologyChartSelection | undefined {
  if (!factId) return undefined;
  return (
    model.selections.find(
      (selection) => selection.evidenceRefs[0]?.factId === factId,
    ) ??
    model.selections.find((selection) =>
      selection.evidenceRefs.some((ref) => ref.factId === factId),
    )
  );
}

export function getAstrologySelectionKindLabel(
  kind: AstrologyChartSelection["kind"],
  language: AstrologySelectionLanguage,
): string {
  return selectionKindLabels[kind][language];
}

export function getAstrologySelectionLabel(
  selection: AstrologyChartSelection,
  language: AstrologySelectionLanguage,
): string {
  switch (selection.kind) {
    case "body":
      return localizeAstrologyBody(selection.bodyId, language);
    case "sign":
      return localizeAstrologySign(selection.sign, language);
    case "house":
      return language === "vi"
        ? `Nhà ${selection.house}`
        : `House ${selection.house}`;
    case "aspect": {
      const first = localizeAstrologyBody(selection.bodyA, language);
      const second = localizeAstrologyBody(selection.bodyB, language);
      return `${first} ${aspectLabels[selection.aspectType][language]} ${second}`;
    }
  }
}
