import { AstroTime } from "astronomy-engine";
import table from "./tai-utc-data.mjs";

export const timescaleVersion = "usno-utc-tt-2026-09-22-v1";
export function taiMinusUtc(jd) {
  let row;
  for(let i=table.rows.length-1;i>=0;i--) if(table.rows[i][0]<=jd){row=table.rows[i];break;}
  return row ? row[1] + (jd - 2400000.5 - row[2]) * row[3] : null;
}

/** No global DeltaT mutation: independent requests can safely use different dates.
 * Astronomy Engine's light-time iterations call AddDays; preserve this policy there too.
 * Before 1961 civil time is treated as UT1 using the engine historical DeltaT model.
 * Earth rotation uses UT1≈UTC. Future leap seconds are unknown, held at last published value.
 */
export class CivilAstroTime extends AstroTime {
  constructor(date) {
    super(date);
    const offset = taiMinusUtc(this.ut + 2451545);
    if (offset !== null) this.tt = this.ut + (offset + 32.184) / 86400;
  }
  AddDays(days) { return new CivilAstroTime(this.ut + days); }
}
