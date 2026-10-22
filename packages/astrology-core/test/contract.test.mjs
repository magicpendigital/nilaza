import test from "node:test";
import assert from "node:assert/strict";
import {calculateChart} from "../calculator.mjs";
import {validateChart} from "../validate.mjs";
import {CivilAstroTime,taiMinusUtc} from "../timescale.mjs";
const input={revision:1,date:"2000-01-01",time:"12:00",precision:"exact",place:{id:"test",source:"synthetic",confirmed:true,latitude:21,longitude:105,timezone:"Asia/Ho_Chi_Minh"}};
test("full exact, approximate, unknown outputs satisfy the executable contract",()=>{
 for(const precision of ["exact","approximate","unknown"]){
  const v={...input,precision};if(precision==="unknown")delete v.time;if(precision==="approximate")v.uncertaintyMinutes=40;
  assert.deepEqual(validateChart(calculateChart(v)),[]);
 }
});
test("semantic boundary rejects forged verification, duplicates, altered degrees, aspects, houses and unknown-time angles",()=>{
 const original=calculateChart(input);
 const mutations=[
  c=>c.calculationStatus="verified",
  c=>c.contractVersion="99.0",
  c=>c.placements[1]={...c.placements[0]},
  c=>c.placements[0].degree+=1,
  c=>c.aspects[0].bodyA="missing",
  c=>c.aspects[0].orb+=0.5,
  c=>c.aspects.pop(),
  c=>c.houses[0].longitude+=30,
  c=>c.time.precision="unknown",
  c=>c.time.location.latitude=NaN,
  c=>c.provenance.timescaleVersion="unreviewed"
 ];
 for(const mutate of mutations){const copy=structuredClone(original);mutate(copy);assert.ok(validateChart(copy).length);}
});
test("USNO time scale uses leap history, preserves light-time iteration policy and never changes global engine settings",()=>{
 assert.equal(taiMinusUtc(2457754.5),37);
 assert.equal(taiMinusUtc(2451545),32);
 const modern=new CivilAstroTime(new Date("2026-09-22T12:00:00Z"));
 assert.ok(Math.abs((modern.tt-modern.ut)*86400-69.184)<0.00001);
 const future=new CivilAstroTime(new Date("2099-12-31T12:00:00Z"));
 assert.ok(Math.abs((future.AddDays(-0.01).tt-future.AddDays(-0.01).ut)*86400-69.184)<0.00001);
 assert.equal(new CivilAstroTime(new Date("2026-09-22T12:00:00Z")).tt,modern.tt);
 assert.equal(taiMinusUtc(2415020.5),null);
});
