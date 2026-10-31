import { bodyLongitudeAt, signs, type CandidateChart } from "../../../../../packages/astrology-core/calculator.mjs";
import type { AstrologySignId } from "./contracts";

// Each body lists the signs it can be in: one with an exact birth time, the sampled
// possibilities otherwise. Rising needs an exact time.
export type BigThree = { sun: AstrologySignId[]; moon: AstrologySignId[]; rising?: AstrologySignId; timeKnown: boolean };

// Signs a body or angle can be in. Angles (ascendant, midheaven) exist only with an exact time.
export function signOptionsOf(chart: CandidateChart, body: string): AstrologySignId[] {
  const exact = [...chart.placements, ...chart.angles].find((item) => item.body === body)?.sign;
  if (exact) return [exact as AstrologySignId];
  return ((chart.sampledRanges ?? []).find((item) => item.body === body)?.possibleSigns ?? []) as AstrologySignId[];
}

export function bigThreeOf(chart: CandidateChart): BigThree | null {
  const sun = signOptionsOf(chart, "sun");
  const moon = signOptionsOf(chart, "moon");
  if (!sun.length || !moon.length) return null;
  const rising = chart.angles.find((item) => item.body === "ascendant")?.sign as AstrologySignId | undefined;
  return { sun, moon, ...(rising ? { rising } : {}), timeKnown: chart.time.precision === "exact" };
}

export function moonSignAt(date: Date): AstrologySignId {
  return signs[Math.floor(bodyLongitudeAt("Moon", date) / 30)] as AstrologySignId;
}

// Whole Sign house the Moon is crossing today, or null when the chart has no houses (unknown birth time).
export function moonHouseToday(chart: CandidateChart, now: Date): { house: number; sign: AstrologySignId } | null {
  if (!chart.time.birthTimeKnown || !chart.houses.length) return null;
  const sign = moonSignAt(now);
  const house = chart.houses.find((item) => item.sign === sign)?.house;
  return house ? { house, sign } : null;
}
