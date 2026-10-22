import fs from 'node:fs';
import * as A from 'astronomy-engine';
import {circularDifference} from '../packages/astrology-core/calculator.mjs';
const rawPath=new URL('../packages/astrology-core/fixtures/moon-timescale-diagnostic.json',import.meta.url);
if(process.argv.includes('--refresh')) {
  const query=new URLSearchParams({format:'json',COMMAND:"'301'",CENTER:"'500@399'",EPHEM_TYPE:"'OBSERVER'",QUANTITIES:"'30,31'",TLIST:"'2488069.0'",CSV_FORMAT:"'YES'",CAL_FORMAT:"'JD'",EXTRA_PREC:"'YES'"});
  const response=await fetch('https://ssd.jpl.nasa.gov/api/horizons.api?'+query,{signal:AbortSignal.timeout(30000)});
  if(!response.ok) throw new Error(`Horizons HTTP ${response.status}`);
  fs.writeFileSync(rawPath,await response.text());
}
const payload=JSON.parse(fs.readFileSync(rawPath,'utf8'));
if(payload.error || !payload.result?.includes('$$SOE')) throw new Error(payload.error??'Missing reference table');
const cells=payload.result.split('$$SOE')[1].split('$$EOE')[0].trim().split(',').map(s=>s.trim());
const deltaT=Number(cells[3]),reference=Number(cells[4]);
if(!cells[3]||!cells[4]||!Number.isFinite(deltaT)||!Number.isFinite(reference))throw new Error('Invalid diagnostic row');
const ordinary=new A.AstroTime(new Date('2099-12-31T12:00:00Z'));
// Diagnostic only: Horizons TDB differs from TT by <= ~2ms. Never use this one value as an application-wide correction.
const aligned=A.AstroTime.FromTerrestrialTime(ordinary.ut+deltaT/86400);
const lon=t=>A.Ecliptic(A.GeoVector(A.Body.Moon,t,true)).elon;
const report={utc:'2099-12-31T12:00:00Z',engineDeltaTSeconds:(ordinary.tt-ordinary.ut)*86400,horizonsTdbMinusUtSeconds:deltaT,defaultDifferenceDegrees:circularDifference(lon(ordinary),reference),timeAlignedDiagnosticDifferenceDegrees:circularDifference(lon(aligned),reference),decision:'Time-scale mismatch isolated. Default calculator remains blocked; no global delta-T override or lowered threshold.',limits:['TDB approximated as TT for diagnosis only.','Future leap seconds and UT1/EOP are not known.','A versioned trusted time-scale policy is still required before production.']};
fs.writeFileSync(new URL('../packages/astrology-core/timescale-diagnostic.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
