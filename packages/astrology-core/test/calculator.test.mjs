import test from "node:test";
import assert from "node:assert/strict";
import * as A from "astronomy-engine";
import {
  calculateChart,
  calculateAspects,
  circularDifference,
} from "../calculator.mjs";
const input = (patch = {}) => ({
  revision: 1,
  date: "2000-01-01",
  time: "12:00",
  precision: "exact",
  place: {
    id: "synthetic",
    source: "test_fixture",
    confirmed: true,
    latitude: 51.48,
    longitude: 0,
    timezone: "UTC",
  },
  ...patch,
});
test("same input gives same chart, keeps precision and never self-certifies", () => {
  const chart = calculateChart(input());
  assert.deepEqual(chart, calculateChart(input()));
  assert.equal(chart.calculationStatus, "candidate");
  assert.equal(chart.provenance.accuracyEvidence, null);
  assert.equal(chart.placements.length, 10);
  assert.equal(chart.houses.length, 12);
  assert.ok(
    chart.placements.every(
      (p) =>
        p.longitude >= 0 && p.longitude < 360 && p.degree === p.longitude % 30,
    ),
  );
});
test("uncertain birth omits all point facts and angles, exposes explicitly sampled ranges", () => {
  for (const patch of [
    { precision: "unknown", time: undefined },
    { precision: "approximate", uncertaintyMinutes: 30 },
  ]) {
    const chart = calculateChart(input(patch));
    assert.equal(chart.placements.length, 0);
    assert.equal(chart.angles.length, 0);
    assert.equal(chart.houses.length, 0);
    assert.equal(chart.aspects.length, 0);
    assert.equal(chart.sampledRanges.length, 10);
    assert.ok(
      chart.sampledRanges.every(
        (p) => p.method === "15_minute_sampling_not_rigorous_bounds",
      ),
    );
  }
});
test("circular difference and orb classification use unrounded coordinates", () => {
  assert.ok(Math.abs(circularDifference(359.999, 0.001) - 0.002) < 1e-9);
  assert.equal(
    calculateAspects([
      { body: "sun", longitude: 359 },
      { body: "moon", longitude: 4.99999 },
    ])[0].type,
    "conjunction",
  );
  assert.equal(
    calculateAspects([
      { body: "sun", longitude: 359 },
      { body: "moon", longitude: 5.00001 },
    ]).length,
    0,
  );
});
test("ASC lies on east horizon and MC on upper meridian across 60 geography/time cases", () => {
  for (const latitude of [-70, -33, 0, 21, 51, 70])
    for (const longitude of [-122, 0, 105, 151, 179])
      for (const date of ["2000-01-01", "2026-09-22"]) {
        const chart = calculateChart(
          input({ date, place: { ...input().place, latitude, longitude } }),
        );
        for (const angle of chart.angles) {
          const l = (angle.longitude * Math.PI) / 180,
            d = new Date(chart.time.utc);
          const ecliptic = new A.Vector(Math.cos(l), Math.sin(l), 0, d);
          const h = A.RotateVector(
            A.Rotation_EQJ_HOR(d, new A.Observer(latitude, longitude, 0)),
            A.RotateVector(A.Rotation_ECT_EQJ(d), ecliptic),
          );
          if (angle.body === "ascendant") {
            assert.ok(Math.abs(h.z) < 1e-10);
            assert.ok(h.y < 0);
          } else {
            assert.ok(Math.abs(h.y) < 1e-10);
            assert.ok(h.z > 0);
          }
        }
      }
  assert.equal(
    calculateChart(input({ place: { ...input().place, latitude: 90 } })).angles
      .length,
    0,
  );
});
