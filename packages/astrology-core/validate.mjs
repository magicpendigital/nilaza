import validateSchema from "./schema-validator.mjs";
const signs = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
const bodies = ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto"];
const rules = {conjunction:[0,6],sextile:[60,4],square:[90,5],trine:[120,5],opposition:[180,6]};
const near = (a,b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b)<1e-7;
const distance = (a,b) => Math.abs(((a-b+540)%360)-180);
/** Structural + semantic validation, never an assertion that client data is authenticated. */
export function validateChart(chart) {
  if (!validateSchema(chart)) return ["schema_invalid"];
  const errors = [];
  const exact = chart.time.precision === "exact";
  if ((chart.time.precision === "unknown" ? chart.time.utc !== null : !chart.time.utc) || (exact && chart.time.range !== null) || (!exact && !chart.time.range)) errors.push("time_shape_conflict");
  if (chart.time.utc && !Number.isFinite(Date.parse(chart.time.utc))) errors.push("invalid_utc");
  if (chart.time.range && !(Date.parse(chart.time.range.start)<Date.parse(chart.time.range.endExclusive))) errors.push("invalid_range");
  if (chart.time.birthTimeKnown !== (chart.time.precision !== "unknown")) errors.push("precision_conflict");
  if (!exact && [chart.placements,chart.angles,chart.houses,chart.aspects].some(x=>x.length)) errors.push("uncertain_time_has_point_facts");
  if (exact && (chart.placements.length !== 10 || chart.sampledRanges.length)) errors.push("incomplete_exact_chart");
  if (!exact && chart.sampledRanges.length !== 10) errors.push("incomplete_ranges");
  const positions = [...chart.placements,...chart.angles];
  const coordinates = new Map();
  for(const p of positions) {
    if(coordinates.has(p.body)) errors.push("duplicate_body");
    coordinates.set(p.body,p.longitude);
    if(p.sign !== signs[Math.floor(p.longitude/30)] || !near(p.degree,p.longitude%30)) errors.push("position_sign_degree_mismatch");
  }
  if(chart.placements.some(p=>!bodies.includes(p.body)) || chart.angles.some(p=>!["ascendant","midheaven"].includes(p.body))) errors.push("body_kind_mismatch");
  if(exact && chart.angles.length !== (Math.abs(chart.time.location.latitude)>=89.999?0:2)) errors.push("angles_incomplete");
  const asc = coordinates.get("ascendant");
  if(chart.houses.length !== (asc===undefined?0:12)) errors.push("houses_incomplete");
  for(const [i,h] of chart.houses.entries()) {
    const lon = (Math.floor(asc/30)*30+i*30)%360;
    if(h.house!==i+1 || !near(h.longitude,lon) || h.sign!==signs[Math.floor(lon/30)]) errors.push("house_geometry_mismatch");
  }
  const seen = new Set();
  for(const a of chart.aspects) {
    const key = [a.bodyA,a.bodyB].sort().join(":");
    if(a.bodyA===a.bodyB || seen.has(key) || !bodies.includes(a.bodyA) || !bodies.includes(a.bodyB)) errors.push("invalid_aspect_pair");
    seen.add(key);
    const d=distance(coordinates.get(a.bodyA),coordinates.get(a.bodyB));
    const [angle,maxOrb]=rules[a.type];
    if(!near(d,a.exactSeparation) || !near(Math.abs(d-angle),a.orb) || a.orb>maxOrb) errors.push("aspect_geometry_mismatch");
  }
  for(const [i,a] of chart.placements.entries()) for(const b of chart.placements.slice(i+1)) {
    const d=distance(a.longitude,b.longitude);
    if(Object.values(rules).some(([angle,orb])=>Math.abs(d-angle)<=orb) && !seen.has([a.body,b.body].sort().join(":"))) errors.push("aspect_missing");
  }
  const rangeIds = new Set();
  for(const r of chart.sampledRanges) {
    if(!bodies.includes(r.body) || rangeIds.has(r.body) || r.minOffset>r.maxOffset || r.minOffset>0 || r.maxOffset<0) errors.push("invalid_sampled_range");
    rangeIds.add(r.body);
  }
  return [...new Set(errors)];
}
