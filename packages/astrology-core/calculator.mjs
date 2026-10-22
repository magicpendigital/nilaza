import * as A from "astronomy-engine";
import { CivilAstroTime, timescaleVersion } from "./timescale.mjs";
import { resolveBirthInput } from "./time.mjs";

export const calculationVersion = "nilaza-a3-utc-tt-2";
export const signs = [
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
];
export const bodies = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
];
export const normalize = (n) => ((n % 360) + 360) % 360;
export const circularDifference = (a, b) =>
  Math.abs(((a - b + 540) % 360) - 180);
const signedDifference = (a, b) => normalize(a - b + 180) - 180;
const longitude = (body, date) =>
  normalize(A.Ecliptic(A.GeoVector(A.Body[body], new CivilAstroTime(date), true)).elon);
const conventions = {
  zodiac: "tropical",
  coordinateSystem: "geocentric_true_ecliptic_of_date",
  houseSystem: "whole_sign",
  aspectPolicy: "major-5-v1",
  aberration: true,
  refraction: false,
};
const aspectRules = [
  ["conjunction", 0, 6],
  ["sextile", 60, 4],
  ["square", 90, 5],
  ["trine", 120, 5],
  ["opposition", 180, 6],
];
const fact = (body, lon, extra = {}) => ({
  body,
  longitude: lon,
  sign: signs[Math.floor(lon / 30)],
  degree: lon % 30,
  confidence: "approximate",
  ...extra,
});

/** Geometric intersections in the same true-ecliptic frame as placements; no atmosphere. */
export function calculateAngles(date, latitude, longitudeEast) {
  date = new CivilAstroTime(date);
  const observer = new A.Observer(latitude, longitudeEast, 0);
  const toHorizon = (v) =>
    A.RotateVector(
      A.Rotation_EQJ_HOR(date, observer),
      A.RotateVector(A.Rotation_ECT_EQJ(date), v),
    );
  const x = toHorizon(new A.Vector(1, 0, 0, date)),
    y = toHorizon(new A.Vector(0, 1, 0, date));
  if (Math.abs(latitude) >= 89.999 || Math.hypot(x.z, y.z) < 1e-8) return [];
  const projection = (l, axis) =>
    x[axis] * Math.cos((l * Math.PI) / 180) +
    y[axis] * Math.sin((l * Math.PI) / 180);
  let asc = normalize((Math.atan2(-x.z, y.z) * 180) / Math.PI);
  if (projection(asc, "y") > 0) asc = normalize(asc + 180); // HOR y points west; ASC is the eastern intersection.
  let mc = normalize((Math.atan2(-x.y, y.y) * 180) / Math.PI);
  if (projection(mc, "z") < 0) mc = normalize(mc + 180);
  return [fact("ascendant", asc), fact("midheaven", mc)];
}

export function calculateAspects(placements) {
  const aspects = [];
  for (let i = 0; i < placements.length; i++)
    for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i],
        b = placements[j],
        separation = circularDifference(a.longitude, b.longitude);
      for (const [type, angle, maxOrb] of aspectRules) {
        const orb = Math.abs(separation - angle);
        if (orb <= maxOrb)
          aspects.push({
            id: `${a.body}:${b.body}:${type}`,
            bodyA: a.body,
            bodyB: b.body,
            type,
            orb,
            exactSeparation: separation,
            confidence: "approximate",
            nearOrbBoundary: maxOrb - orb < 0.02,
          });
      }
    }
  return aspects;
}

/** Local candidate only. Never labels its own calculations independently verified. */
export function calculateChart(input) {
  const time = resolveBirthInput(input);
  const base = {
    contractId: "nilaza.astrology.canonical-chart",
    contractVersion: "0.2.0",
    calculationStatus: "candidate",
    conventions,
    time,
    provenance: {
      engine: "astronomy-engine",
      engineVersion: "2.1.19",
      calculationVersion,
      isReproducible: time.provenance.tzdata !== "runtime_version_unavailable",
      accuracyEvidence: null,
      timescaleVersion,
      earthRotation: "UT1_approximated_by_UTC",
      futureLeapSeconds: "held_at_last_published_value",
    },
    uncertainties: [
      { code: "independent_accuracy_not_verified", severity: "blocking" },
    ],
  };
  if (time.precision !== "exact") {
    // Do not turn a representative noon/midpoint into personal facts. Range handling is explicit.
    const start = new Date(time.range.start).getTime(),
      end = new Date(time.range.endExclusive).getTime();
    const intervals = bodies.map((body) => {
      const samples = [];
      for (let ms = start; ms < end; ms += 15 * 60 * 1000)
        samples.push(longitude(body, new Date(ms)));
      samples.push(longitude(body, new Date(end - 1)));
      const offsets = samples.map((v) => signedDifference(v, samples[0]));
      return {
        body: body.toLowerCase(),
        sampleStartLongitude: samples[0],
        minOffset: Math.min(...offsets),
        maxOffset: Math.max(...offsets),
        possibleSigns: [
          ...new Set(samples.map((v) => signs[Math.floor(v / 30)])),
        ],
        method: "15_minute_sampling_not_rigorous_bounds",
      };
    });
    return {
      ...base,
      placements: [],
      angles: [],
      houses: [],
      aspects: [],
      sampledRanges: intervals,
      uncertainties: [
        ...base.uncertainties,
        { code: "birth_time_uncertain", severity: "blocking" },
        { code: "sampled_range_not_certified", severity: "warning" },
      ],
    };
  }
  const date = new Date(time.utc);
  const placements = bodies.map((body) => {
    const lon = longitude(body, date);
    const speed =
      signedDifference(
        longitude(body, new Date(date.getTime() + 30 * 60000)),
        longitude(body, new Date(date.getTime() - 30 * 60000)),
      ) * 24;
    return fact(body.toLowerCase(), lon, {
      speedDegreesPerDay: speed,
      retrograde: Math.abs(speed) < 0.0001 ? null : speed < 0,
      nearStation: Math.abs(speed) < 0.01,
      nearSignBoundary: Math.min(lon % 30, 30 - (lon % 30)) < 0.02,
    });
  });
  const angles = calculateAngles(
    date,
    time.location.latitude,
    time.location.longitude,
  );
  const asc = angles.find((a) => a.body === "ascendant");
  const houses = asc
    ? Array.from({ length: 12 }, (_, i) => ({
        house: i + 1,
        longitude: normalize(Math.floor(asc.longitude / 30) * 30 + i * 30),
        sign: signs[(Math.floor(asc.longitude / 30) + i) % 12],
        confidence: "approximate",
      }))
    : [];
  const uncertainties = [...base.uncertainties];
  if (!asc)
    uncertainties.push({
      code: "angles_undefined_at_pole",
      severity: "warning",
    });
  if (Math.abs(time.location.latitude) > 66)
    uncertainties.push({
      code: "high_latitude_review_required",
      severity: "warning",
    });
  return {
    ...base,
    placements,
    angles,
    houses,
    aspects: calculateAspects(placements),
    sampledRanges: [],
    uncertainties,
  };
}
