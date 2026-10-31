export type BirthInput = {
  revision: number;
  date: string;
  time?: string;
  precision: "exact" | "approximate" | "unknown";
  uncertaintyMinutes?: number;
  occurrence?: "earlier" | "later";
  expectedOffsetSeconds?: number;
  place: {
    id: string;
    source: string;
    confirmed: true;
    latitude: number;
    longitude: number;
    timezone: string;
  };
};
export type Position = {
  body: string;
  longitude: number;
  sign: string;
  degree: number;
  confidence: "approximate";
  speedDegreesPerDay?: number;
  retrograde?: boolean | null;
  nearStation?: boolean;
  nearSignBoundary?: boolean;
};
export type CandidateChart = {
  contractId: "nilaza.astrology.canonical-chart";
  contractVersion: "0.2.0";
  calculationStatus: "candidate";
  conventions: {
    zodiac: "tropical";
    coordinateSystem: "geocentric_true_ecliptic_of_date";
    houseSystem: "whole_sign";
    aspectPolicy: "major-5-v1";
    aberration: true;
    refraction: false;
  };
  time: {
    revision: number;
    precision: BirthInput["precision"];
    birthTimeKnown: boolean;
    utc: string | null;
    range: { start: string; endExclusive: string } | null;
    offsetSeconds: number | null;
    occurrence: "earlier" | "later" | null;
    location: Omit<BirthInput["place"], "timezone">;
    provenance: {
      resolver: string;
      timezone: string;
      tzdata: string;
      icu: string;
    };
  };
  provenance: {
    engine: "astronomy-engine";
    engineVersion: "2.1.19";
    calculationVersion: string;
    isReproducible: boolean;
    accuracyEvidence: null;
  };
  placements: Position[];
  angles: Position[];
  houses: {
    house: number;
    longitude: number;
    sign: string;
    confidence: "approximate";
  }[];
  aspects: {
    id: string;
    bodyA: string;
    bodyB: string;
    type: string;
    orb: number;
    exactSeparation: number;
    confidence: "approximate";
    nearOrbBoundary: boolean;
  }[];
  sampledRanges: {
    body: string;
    sampleStartLongitude: number;
    minOffset: number;
    maxOffset: number;
    possibleSigns: string[];
    method: "15_minute_sampling_not_rigorous_bounds";
  }[];
  uncertainties: { code: string; severity: "blocking" | "warning" }[];
};
export function calculateChart(input: BirthInput): CandidateChart;
export function calculateAngles(
  date: Date,
  latitude: number,
  longitudeEast: number,
): Position[];
export function calculateAspects(
  placements: Position[],
): CandidateChart["aspects"];
export function circularDifference(a: number, b: number): number;
export function normalize(n: number): number;
export function bodyLongitudeAt(body: string, date: Date): number;
export const calculationVersion: string;
export const signs: string[];
export const bodies: string[];
