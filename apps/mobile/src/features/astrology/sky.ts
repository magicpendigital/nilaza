import { bodyLongitudeAt, signs, type CandidateChart } from "../../../../../packages/astrology-core/calculator.mjs";
import type { AstrologySignId } from "./contracts";

export type BigThree = { sun: AstrologySignId; moon: AstrologySignId; rising?: AstrologySignId };

// Sun and Moon always; Rising only when the birth time gives an ascendant.
export function bigThreeOf(chart: CandidateChart): BigThree | null {
  const sign = (body: string) => chart.placements.find((item) => item.body === body)?.sign as AstrologySignId | undefined;
  const sun = sign("sun");
  const moon = sign("moon");
  if (!sun || !moon) return null;
  const rising = chart.angles.find((item) => item.body === "ascendant")?.sign as AstrologySignId | undefined;
  return { sun, moon, ...(rising ? { rising } : {}) };
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
