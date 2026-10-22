import fs from "node:fs";
import { createHash } from "node:crypto";
const input = fs.readFileSync(".cache/astrology/cities15000/cities15000.txt");
const regions = new Map(fs.readFileSync(".cache/astrology/admin1CodesASCII.txt","utf8").trim().split(/\r?\n/).map(line=>{const c=line.split("\t");return [c[0],c[1]];}));
// GeoNames CC BY 4.0. No user query leaves the device. Include subdivision for homonyms.
const places = input.toString("utf8").trim().split(/\r?\n/).map(line => {
  const c = line.split("\t");
  return { id: c[0], name: c[1], ascii: c[2], country: c[8], region: regions.get(`${c[8]}.${c[10]}`)??c[10], latitude: Number(c[4]), longitude: Number(c[5]), timezone: c[17], population: Number(c[14]) };
}).filter(p => p.timezone && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)).sort((a,b) => b.population-a.population);
fs.writeFileSync("packages/astrology-core/places.json", JSON.stringify({ version: "geonames-cities15000-2026-09-22", source: "https://download.geonames.org/export/dump/cities15000.zip", license: "CC BY 4.0", originalSha256: createHash("sha256").update(input).digest("hex"), places })+"\n");
console.log(`Built ${places.length} offline city records`);
