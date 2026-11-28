import assert from "node:assert/strict";
import test from "node:test";
import { moonQuartersBetween, moonStateAt, nextNewOrFullMoon, signChangesBetween } from "../sky.mjs";

// Expected values: spec ASTRO_NUMEROLOGY_IMPLEMENTATION_2026-11-23 section 6.5 (engine, cross-checked with DE421).
const near = (actual, iso, seconds = 60) => assert.ok(Math.abs(actual.getTime() - Date.parse(iso)) <= seconds * 1000, `${actual.toISOString()} vs ${iso}`);

test("Moon on 23/11/2026 noon UTC+7: Taurus 11.4 degrees, 97% lit", () => {
  const moon = moonStateAt(new Date("2026-11-23T05:00:00Z"));
  assert.equal(moon.sign, "taurus");
  assert.ok(Math.abs(moon.degree - 11.4) < 0.1);
  assert.equal(Math.round(moon.illumination * 100), 97);
  assert.equal(moon.waxing, true);
});

test("sign changes land on the spec times", () => {
  const cases = [
    ["2026-11-24T00:00:00+07:00", "taurus", "gemini", "2026-11-24T18:09:38+07:00"],
    ["2027-01-29T00:00:00+07:00", "libra", "scorpio", "2027-01-29T00:21:15+07:00"],
    ["2026-12-12T00:00:00+07:00", "capricorn", "aquarius", "2026-12-12T23:05:38+07:00"],
    ["2024-02-29T00:00:00+07:00", "libra", "scorpio", "2024-02-29T10:09:10+07:00"],
    ["2028-03-01T00:00:00+07:00", "aries", "taurus", "2028-03-01T04:41:44+07:00"],
  ];
  for (const [dayStart, from, to, at] of cases) {
    const start = new Date(dayStart);
    const changes = signChangesBetween("Moon", start, new Date(start.getTime() + 86400000));
    assert.equal(changes.length, 1, dayStart);
    assert.equal(changes[0].from, from);
    assert.equal(changes[0].to, to);
    near(changes[0].at, at, 5);
  }
  // 29/02/2028 has no change.
  const leap = new Date("2028-02-29T00:00:00+07:00");
  assert.equal(signChangesBetween("Moon", leap, new Date(leap.getTime() + 86400000)).length, 0);
});

test("full Moon 24/11/2026 21:54 and new Moon 06/02/2027 22:56 (UTC+7)", () => {
  const quarters = moonQuartersBetween(new Date("2026-11-24T00:00:00+07:00"), new Date("2026-11-25T00:00:00+07:00"));
  assert.deepEqual(quarters.map((q) => q.kind), ["full"]);
  near(quarters[0].at, "2026-11-24T21:54:00+07:00");
  const next = nextNewOrFullMoon(new Date("2027-02-01T00:00:00+07:00"));
  assert.equal(next.kind, "new");
  near(next.at, "2027-02-06T22:56:00+07:00");
});

test("the Moon changes sign at most once per 24 hours", () => {
  let start = new Date("2026-12-01T00:00:00+07:00");
  for (let day = 0; day < 60; day += 1) {
    const end = new Date(start.getTime() + 86400000);
    assert.ok(signChangesBetween("Moon", start, end).length <= 1);
    start = end;
  }
});
