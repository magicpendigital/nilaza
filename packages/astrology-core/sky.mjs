import * as A from "astronomy-engine";
import { bodyLongitudeAt, signs } from "./calculator.mjs";

// Daily sky helpers (Lô 2, spec ASTRO_NUMEROLOGY_IMPLEMENTATION section 6). Geocentric, same
// true-ecliptic-of-date frame as the chart calculator, so the Today screen and the chart agree.

export const moonQuarterKinds = ["new", "first_quarter", "full", "last_quarter"];

const signIndexAt = (body, ms) => Math.floor(bodyLongitudeAt(body, new Date(ms)) / 30);

/** The Moon at one instant: sign, degree in sign, lit fraction (0..1), elongation (0 new .. 180 full). */
export function moonStateAt(date) {
  const longitude = bodyLongitudeAt("Moon", date);
  const elongation = A.MoonPhase(date);
  return {
    longitude,
    sign: signs[Math.floor(longitude / 30)],
    degree: longitude % 30,
    illumination: A.Illumination(A.Body.Moon, date).phase_fraction,
    elongation,
    waxing: elongation < 180,
  };
}

/**
 * Sign changes of a body inside [start, end): hourly scan, then bisection to under a second.
 * The Moon spends at least 1.9 days in a sign, so an hourly step cannot skip one.
 */
export function signChangesBetween(body, start, end, stepMs = 3600000) {
  const changes = [];
  const stop = end.getTime();
  let t0 = start.getTime();
  let s0 = signIndexAt(body, t0);
  while (t0 < stop) {
    const t1 = Math.min(t0 + stepMs, stop);
    const s1 = signIndexAt(body, t1);
    if (s1 !== s0) {
      let lo = t0, hi = t1;
      while (hi - lo > 500) {
        const mid = Math.floor((lo + hi) / 2);
        if (signIndexAt(body, mid) === s0) lo = mid;
        else hi = mid;
      }
      if (hi < stop) changes.push({ at: new Date(hi), from: signs[s0], to: signs[s1] });
    }
    t0 = t1;
    s0 = s1;
  }
  return changes;
}

/** Exact moments of the four main Moon phases inside [start, end). */
export function moonQuartersBetween(start, end) {
  const result = [];
  let quarter = A.SearchMoonQuarter(start);
  while (quarter.time.date.getTime() < end.getTime()) {
    result.push({ kind: moonQuarterKinds[quarter.quarter], at: quarter.time.date });
    quarter = A.NextMoonQuarter(quarter);
  }
  return result;
}

/** The next new or full Moon at or after `start`. */
export function nextNewOrFullMoon(start) {
  let quarter = A.SearchMoonQuarter(start);
  while (quarter.quarter % 2 === 1) quarter = A.NextMoonQuarter(quarter);
  return { kind: moonQuarterKinds[quarter.quarter], at: quarter.time.date };
}
