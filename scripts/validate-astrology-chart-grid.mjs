import fs from "node:fs";
import {calculateChart,circularDifference} from "../packages/astrology-core/calculator.mjs";
import {validateChart} from "../packages/astrology-core/validate.mjs";
// Independent scalar trigonometry, without Astronomy Engine vectors/rotations/obliquity.
// USNO approximate apparent sidereal time + mean obliquity (linear century term).
// Reference: https://aa.usno.navy.mil/faq/GAST . This is an independent METHOD,
// not a vendor-certified external natal chart. Planet references are NASA/JPL separately.
const rad=Math.PI/180, norm=x=>((x%360)+360)%360;
function referenceAngles(date,lat,lon) {
 const jd=Date.parse(date)/86400000+2440587.5,D=jd-2451545,T=D/36525;
 const eps=(23.4393-0.01300*T)*rad;
 const L=(280.47+0.98565*D)*rad,omega=(125.04-0.052954*D)*rad;
 const dpsi=-0.000319*Math.sin(omega)-0.000024*Math.sin(2*L); // hours
 const gast=18.697374558+24.06570982441908*D+0.000026*T*T+dpsi*Math.cos(eps);
 const theta=(gast*15+lon)*rad;
 let asc=norm(Math.atan2(Math.cos(theta),-Math.sin(theta)*Math.cos(eps)-Math.tan(lat*rad)*Math.sin(eps))/rad);
 // At high latitudes select the eastern, not western, root of the horizon intersection.
 const east = l => -Math.sin(theta)*Math.cos(l*rad)+Math.cos(theta)*Math.sin(l*rad)*Math.cos(eps);
 if(east(asc)<0)asc=norm(asc+180);
 const mc=norm(Math.atan2(Math.sin(theta),Math.cos(theta)*Math.cos(eps))/rad);
 return {ascendant:asc,midheaven:mc};
}
const reference=JSON.parse(fs.readFileSync("packages/astrology-core/fixtures/reference.json","utf8"));
const instants=[...new Set(reference.references.map(r=>r.utc))];
const geo=[[21.0285,105.8542],[48.8566,2.3522],[40.7128,-74.006],[-33.8688,151.2093],[27.7172,85.324],[-33.9249,18.4241],[64.1466,-21.9426],[1.3521,103.8198],[0,0],[-55,-67]];
const results=instants.map((utc,i)=>{
 const [latitude,longitude]=geo[i%geo.length];
 const chart=calculateChart({revision:1,date:utc.slice(0,10),time:utc.slice(11,16),precision:"exact",place:{id:`synthetic-grid-${i}`,source:"synthetic_test",confirmed:true,latitude,longitude,timezone:"UTC"}});
 const expected=referenceAngles(utc,latitude,longitude);
 const differences=Object.fromEntries(chart.angles.map(a=>[a.body,circularDifference(a.longitude,expected[a.body])]));
 const validationErrors=validateChart(chart);
 return {utc,latitude,longitude,validationErrors,independentAngleDifferences: differences,passed:!validationErrors.length&&Object.values(differences).every(d=>d<=0.1)};
});
const report={scope:"50_full_charts_10_geographies_and_independent_scalar_angle_formula",thresholdDegrees:0.1,formulaSource:"https://aa.usno.navy.mil/faq/GAST",limitations:["Not an external certified full-chart vendor benchmark.","UT1 approximated by UTC; no observed Earth orientation parameters.","Approximate independent formula is for regression cross-checks, not a guarantee at polar latitudes."],total:results.length,passed:results.filter(r=>r.passed).length,maxAngleDifferenceDegrees:Math.max(...results.flatMap(r=>Object.values(r.independentAngleDifferences))),results};
if(process.argv.includes("--write-report"))fs.writeFileSync("packages/astrology-core/chart-grid-report.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({...report,results:results.filter(r=>!r.passed)},null,2));
if(report.total!==50||report.passed!==report.total)process.exitCode=1;
