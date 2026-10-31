import { validateChart } from "../../../../../packages/astrology-core/validate.mjs";
export const astrologyCanonicalContractId = "nilaza.astrology.canonical-chart";

export const astrologySignIds = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

export type AstrologySignId = (typeof astrologySignIds)[number];
export type AstrologyLanguage = "vi" | "en" | "zh-Hans" | "ja" | "ko";
export type AstrologyFactConfidence = "exact" | "approximate" | "unavailable";
export type AstrologyChartPresentationStatus =
  "loading" | "limited" | "ready" | "error";

export type AstrologyLocalizedLabel = {
  vi?: string;
  en?: string;
};

/**
 * The mobile client deliberately keeps the incoming payload permissive while
 * A3 migrates the endpoint. The parser below is the only place where a chart
 * becomes displayable data. It rejects unsupported or ambiguous fields rather
 * than guessing a placement.
 */
export type AstrologyRawChart = Record<string, unknown> & {
  contractId?: unknown;
  contractVersion?: unknown;
  calculationStatus?: unknown;
  placements?: unknown;
  angles?: unknown;
  houses?: unknown;
  aspects?: unknown;
  uncertainties?: unknown;
  provenance?: unknown;
  time?: unknown;
};

export type AstrologyPlacementFact = {
  id: string;
  kind: "placement" | "angle";
  label: AstrologyLocalizedLabel;
  longitude: number;
  sign: AstrologySignId;
  degree: number;
  confidence: AstrologyFactConfidence;
  retrograde: boolean | null;
};

export type AstrologyAspectFact = {
  id: string;
  bodyA: string;
  bodyB: string;
  type: string;
  orb: number | null;
  exactSeparation: number | null;
  confidence: AstrologyFactConfidence;
};

export type AstrologyUncertainty = {
  code: string;
  severity: "info" | "warning" | "blocking";
};

export type AstrologyChartPresentation = {
  status: AstrologyChartPresentationStatus;
  source: "canonical" | "legacy_backend" | "local_preview" | "missing";
  facts: AstrologyPlacementFact[];
  aspects: AstrologyAspectFact[];
  uncertainties: AstrologyUncertainty[];
  reasonCodes: string[];
  providerLabel?: string;
  calculationVersion?: string;
};

type ChartPresentationOptions = {
  provider?: string;
  calculationVersion?: string;
};

const labelById: Record<string, AstrologyLocalizedLabel> = {
  sun: { vi: "Mặt Trời", en: "Sun" },
  moon: { vi: "Mặt Trăng", en: "Moon" },
  mercury: { vi: "Sao Thủy", en: "Mercury" },
  venus: { vi: "Sao Kim", en: "Venus" },
  mars: { vi: "Sao Hỏa", en: "Mars" },
  jupiter: { vi: "Sao Mộc", en: "Jupiter" },
  saturn: { vi: "Sao Thổ", en: "Saturn" },
  uranus: { vi: "Sao Thiên Vương", en: "Uranus" },
  neptune: { vi: "Sao Hải Vương", en: "Neptune" },
  pluto: { vi: "Sao Diêm Vương", en: "Pluto" },
  ascendant: { vi: "Cung mọc", en: "Ascendant" },
  midheaven: { vi: "Thiên đỉnh", en: "Midheaven" },
};
export function localizeAstrologyBody(id: string, language: AstrologyLanguage) {
  return localizeAstrologyLabel(labelById[id] ?? { vi: id, en: id }, language);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isSignId(value: unknown): value is AstrologySignId {
  return (
    typeof value === "string" &&
    (astrologySignIds as readonly string[]).includes(value)
  );
}

function asConfidence(value: unknown): AstrologyFactConfidence {
  return value === "exact" || value === "approximate" || value === "unavailable"
    ? value
    : "unavailable";
}

function asLocalizedLabel(
  value: unknown,
  fallback: AstrologyLocalizedLabel,
): AstrologyLocalizedLabel {
  const record = asRecord(value);
  if (!record) return fallback;
  const vi = asString(record.vi);
  const en = asString(record.en);
  return vi || en
    ? { vi: vi ?? en ?? fallback.vi, en: en ?? vi ?? fallback.en }
    : fallback;
}

function normalizedLongitude(value: number): number | null {
  if (value < 0 || value >= 360) return null;
  return value;
}

function parseSign(
  record: Record<string, unknown>,
  longitude: number,
): { sign: AstrologySignId; degree: number } | null {
  const nested = asRecord(record.sign);
  const signId = isSignId(record.sign) ? record.sign : nested?.id;
  if (!isSignId(signId)) return null;
  const degreeCandidate =
    asFiniteNumber(record.degree) ??
    asFiniteNumber(nested?.degree) ??
    longitude % 30;
  if (degreeCandidate < 0 || degreeCandidate >= 30) return null;
  if (Math.abs(degreeCandidate - (longitude % 30)) > 0.011) return null;
  const expectedSign = astrologySignIds[Math.floor(longitude / 30)];
  if (signId !== expectedSign) return null;
  return { sign: signId, degree: degreeCandidate };
}

function parseFact(
  value: unknown,
  kind: AstrologyPlacementFact["kind"],
): AstrologyPlacementFact | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asString(record.body) ?? asString(record.key);
  const longitudeValue = asFiniteNumber(record.longitude);
  if (!id || longitudeValue === null) return null;
  const longitude = normalizedLongitude(longitudeValue);
  if (longitude === null) return null;
  const sign = parseSign(record, longitude);
  if (!sign) return null;
  const normalizedId =
    id === "rising" ? "ascendant" : id === "mc" ? "midheaven" : id;
  if (
    !labelById[normalizedId] ||
    (kind === "angle") !== ["ascendant", "midheaven"].includes(normalizedId)
  )
    return null;
  return {
    id: normalizedId,
    kind,
    label: asLocalizedLabel(
      record.label,
      labelById[normalizedId] ?? { vi: normalizedId, en: normalizedId },
    ),
    longitude,
    sign: sign.sign,
    degree: sign.degree,
    confidence: asConfidence(
      record.confidence ??
        (record.approximate === true ? "approximate" : undefined),
    ),
    retrograde:
      typeof record.retrograde === "boolean" ? record.retrograde : null,
  };
}

function parseAspects(value: unknown): AstrologyAspectFact[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const record = asRecord(item);
    if (!record) return [];
    const bodies = Array.isArray(record.bodies) ? record.bodies : null;
    const bodyA = asString(record.bodyA) ?? asString(bodies?.[0]);
    const bodyB = asString(record.bodyB) ?? asString(bodies?.[1]);
    const type = asString(record.type);
    if (!bodyA || !bodyB || !type) return [];
    const orb = asFiniteNumber(record.orb);
    const exactSeparation =
      asFiniteNumber(record.exactSeparation) ??
      asFiniteNumber(record.separation);
    if (
      (orb !== null && orb < 0) ||
      (exactSeparation !== null &&
        (exactSeparation < 0 || exactSeparation > 180))
    )
      return [];
    return [
      {
        id: `${bodyA}:${type}:${bodyB}:${index}`,
        bodyA: bodyA === "rising" ? "ascendant" : bodyA,
        bodyB: bodyB === "rising" ? "ascendant" : bodyB,
        type,
        orb,
        exactSeparation,
        confidence: asConfidence(record.confidence),
      },
    ];
  });
}

function parseUncertainties(chart: AstrologyRawChart): AstrologyUncertainty[] {
  const raw = chart.uncertainties;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const record = asRecord(item);
    const code = asString(record?.code);
    if (!code) return [];
    const severity =
      record?.severity === "blocking" ||
      record?.severity === "warning" ||
      record?.severity === "info"
        ? record.severity
        : "warning";
    return [{ code, severity }];
  });
}

function sourceFor(
  chart: AstrologyRawChart | undefined,
  provider: string | undefined,
): AstrologyChartPresentation["source"] {
  if (!chart) return "missing";
  if (chart.contractId === astrologyCanonicalContractId) return "canonical";
  if (chart.source === "local_fallback" || provider === "local_fallback")
    return "local_preview";
  return "legacy_backend";
}

function hasUnknownTimeVisualConflict(
  chart: AstrologyRawChart,
  facts: AstrologyPlacementFact[],
): boolean {
  const time = asRecord(chart.time);
  return (
    time?.birthTimeKnown === false &&
    (facts.some((fact) => fact.kind === "angle") ||
      (Array.isArray(chart.houses) && chart.houses.length > 0))
  );
}

function isCanonicalVerified(
  chart: AstrologyRawChart,
  facts: AstrologyPlacementFact[],
  uncertainties: AstrologyUncertainty[],
): boolean {
  // The executable v0.2 contract currently carries candidate calculations with disclosed sample evidence.
  // A remote string claiming "verified" is never sufficient to certify a chart.
  if (
    chart.contractVersion !== "0.2.0" ||
    validateChart(chart).length ||
    chart.calculationStatus !== "verified"
  )
    return false;
  const provenance = asRecord(chart.provenance);
  return (
    provenance?.isReproducible === true &&
    facts.some((fact) => fact.id === "sun") &&
    facts.some((fact) => fact.id === "moon") &&
    !uncertainties.some((item) => item.severity === "blocking") &&
    !hasUnknownTimeVisualConflict(chart, facts)
  );
}

/**
 * Converts a backend result into a presentation boundary. A legacy payload can
 * expose fact rows, but cannot unlock the personal visual wheel until A3 has
 * supplied an explicit, reproducible canonical contract.
 */
export function toAstrologyChartPresentation(
  chart: AstrologyRawChart | undefined,
  options: ChartPresentationOptions = {},
): AstrologyChartPresentation {
  const source = sourceFor(chart, options.provider);
  if (!chart) {
    return {
      status: "limited",
      source,
      facts: [],
      aspects: [],
      uncertainties: [],
      reasonCodes: ["chart_missing"],
      providerLabel: options.provider,
      calculationVersion: options.calculationVersion,
    };
  }

  if (
    chart.contractId === astrologyCanonicalContractId &&
    chart.contractVersion === "0.2.0" &&
    validateChart(chart).length
  ) {
    return {
      status: "error",
      source,
      facts: [],
      aspects: [],
      uncertainties: [],
      reasonCodes: ["invalid_canonical_chart"],
    };
  }

  let facts = [
    ...(Array.isArray(chart.placements)
      ? chart.placements
          .map((item) => parseFact(item, "placement"))
          .filter((item): item is AstrologyPlacementFact => Boolean(item))
      : []),
    ...(Array.isArray(chart.angles)
      ? chart.angles
          .map((item) => parseFact(item, "angle"))
          .filter((item): item is AstrologyPlacementFact => Boolean(item))
      : []),
  ];
  const unknownConflict = hasUnknownTimeVisualConflict(chart, facts);
  if (
    asRecord(chart.time)?.birthTimeKnown === false ||
    ["approximate", "unknown"].includes(String(asRecord(chart.time)?.precision))
  )
    facts = [];
  const duplicate = new Set(facts.map((f) => f.id)).size !== facts.length;
  if (duplicate) facts = [];
  const coordinates = new Map(facts.map((f) => [f.id, f.longitude]));
  const rules: Record<string, [number, number]> = {
    conjunction: [0, 6],
    sextile: [60, 4],
    square: [90, 5],
    trine: [120, 5],
    opposition: [180, 6],
  };
  const pairs = new Set<string>();
  const aspects = parseAspects(chart.aspects).filter((a) => {
    const rule = rules[a.type],
      x = coordinates.get(a.bodyA),
      y = coordinates.get(a.bodyB),
      pair = [a.bodyA, a.bodyB].sort().join(":");
    if (
      !rule ||
      x === undefined ||
      y === undefined ||
      a.bodyA === a.bodyB ||
      pairs.has(pair) ||
      a.orb === null ||
      a.exactSeparation === null
    )
      return false;
    const separation = Math.abs(((x - y + 540) % 360) - 180);
    if (
      Math.abs(separation - a.exactSeparation) > 0.022 ||
      Math.abs(Math.abs(separation - rule[0]) - a.orb) > 0.022 ||
      a.orb > rule[1]
    )
      return false;
    pairs.add(pair);
    return true;
  });
  const uncertainties = parseUncertainties(chart);
  const canonicalVerified = isCanonicalVerified(chart, facts, uncertainties);
  const reasonCodes = [
    ...(facts.length === 0 ? ["placement_facts_unavailable"] : []),
    ...(source === "local_preview" ? ["local_preview_not_calculated"] : []),
    ...uncertainties
      .filter((item) => item.severity === "blocking")
      .map((item) => item.code),
    ...(unknownConflict ? ["unknown_time_visual_conflict"] : []),
    ...(duplicate ? ["duplicate_body"] : []),
    ...(!canonicalVerified ? ["canonical_verification_pending"] : []),
  ];

  return {
    status: canonicalVerified ? "ready" : "limited",
    source,
    facts,
    aspects,
    uncertainties,
    reasonCodes: [...new Set(reasonCodes)],
    providerLabel: options.provider ?? asString(chart.provider) ?? undefined,
    calculationVersion:
      options.calculationVersion ??
      asString(chart.calculationVersion) ??
      undefined,
  };
}

export function localizeAstrologyLabel(
  label: AstrologyLocalizedLabel,
  language: AstrologyLanguage,
): string {
  return language === "vi"
    ? (label.vi ?? label.en ?? "")
    : (label.en ?? label.vi ?? "");
}

export function localizeAstrologySign(
  sign: AstrologySignId,
  language: AstrologyLanguage,
): string {
  const labels: Record<AstrologySignId, AstrologyLocalizedLabel> = {
    aries: { vi: "Bạch Dương", en: "Aries" },
    taurus: { vi: "Kim Ngưu", en: "Taurus" },
    gemini: { vi: "Song Tử", en: "Gemini" },
    cancer: { vi: "Cự Giải", en: "Cancer" },
    leo: { vi: "Sư Tử", en: "Leo" },
    virgo: { vi: "Xử Nữ", en: "Virgo" },
    libra: { vi: "Thiên Bình", en: "Libra" },
    scorpio: { vi: "Bọ Cạp", en: "Scorpio" },
    sagittarius: { vi: "Nhân Mã", en: "Sagittarius" },
    capricorn: { vi: "Ma Kết", en: "Capricorn" },
    aquarius: { vi: "Bảo Bình", en: "Aquarius" },
    pisces: { vi: "Song Ngư", en: "Pisces" },
  };
  return localizeAstrologyLabel(labels[sign], language);
}
