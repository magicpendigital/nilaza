import test from "node:test";
import assert from "node:assert/strict";
import { resolveBirthInput } from "../time.mjs";
const input = (patch = {}) => ({
  revision: 1,
  date: "2000-01-01",
  time: "12:00",
  precision: "exact",
  place: {
    id: "synthetic",
    source: "test_fixture",
    confirmed: true,
    latitude: 0,
    longitude: 0,
    timezone: "UTC",
  },
  ...patch,
});
const zone = (timezone) => ({ ...input().place, timezone });
const rejects = (value, code) =>
  assert.throws(
    () => resolveBirthInput(value),
    (e) => e.code === code,
  );
test("historical timezone cases: UTC, Nepal quarter-hour and local date rollover", () => {
  assert.equal(resolveBirthInput(input()).utc, "2000-01-01T12:00:00Z");
  assert.equal(
    resolveBirthInput(input({ time: "00:15", place: zone("Asia/Kathmandu") }))
      .utc,
    "1999-12-31T18:30:00Z",
  );
  assert.equal(
    resolveBirthInput(
      input({ date: "1985-01-01", place: zone("Asia/Kathmandu") }),
    ).offsetSeconds,
    19800,
  );
});
test("reject invalid Gregorian dates, unsupported range, malformed input and missing place", () => {
  for (const date of [
    "1900-02-29",
    "2023-02-29",
    "2026-04-31",
    "2026-13-01",
    "2000-1-1",
  ])
    rejects(input({ date }), "invalid_date");
  assert.equal(
    resolveBirthInput(input({ date: "2000-02-29" })).utc,
    "2000-02-29T12:00:00Z",
  );
  rejects(input({ date: "1899-12-31" }), "date_out_of_supported_range");
  rejects(input({ time: "24:00" }), "invalid_time");
  rejects(
    input({ place: { ...zone("UTC"), confirmed: false } }),
    "place_confirmation_required",
  );
  rejects(
    input({ place: { ...zone("UTC"), latitude: NaN } }),
    "invalid_coordinates",
  );
  rejects(input({ place: zone("+07:00") }), "iana_timezone_required");
  rejects(input({ place: zone("Nowhere/Imaginary") }), "invalid_timezone");
});
test("New York spring gap is rejected even when caller requests later", () => {
  for (const occurrence of [undefined, "earlier", "later"])
    rejects(
      input({
        date: "2024-03-10",
        time: "02:30",
        place: zone("America/New_York"),
        occurrence,
      }),
      "nonexistent_local_time",
    );
});
test("New York fall overlap requires explicit occurrence; client offset cannot override", () => {
  const birth = input({
    date: "2024-11-03",
    time: "01:30",
    place: zone("America/New_York"),
  });
  rejects(birth, "ambiguous_local_time");
  assert.equal(
    resolveBirthInput({ ...birth, occurrence: "earlier" }).utc,
    "2024-11-03T05:30:00Z",
  );
  assert.equal(
    resolveBirthInput({ ...birth, occurrence: "later" }).utc,
    "2024-11-03T06:30:00Z",
  );
  rejects(
    { ...birth, occurrence: "later", expectedOffsetSeconds: -14400 },
    "offset_conflicts_with_timezone",
  );
});
test("Lord Howe half-hour transitions and Apia skipped day", () => {
  const birth = input({
    date: "2024-04-07",
    time: "01:45",
    place: zone("Australia/Lord_Howe"),
  });
  rejects(birth, "ambiguous_local_time");
  const earlier = resolveBirthInput({ ...birth, occurrence: "earlier" }),
    later = resolveBirthInput({ ...birth, occurrence: "later" });
  assert.equal(Date.parse(later.utc) - Date.parse(earlier.utc), 30 * 60000);
  rejects(
    input({
      date: "2024-10-06",
      time: "02:15",
      place: zone("Australia/Lord_Howe"),
    }),
    "nonexistent_local_time",
  );
  rejects(
    input({
      date: "2011-12-30",
      time: undefined,
      precision: "unknown",
      place: zone("Pacific/Apia"),
    }),
    "nonexistent_local_date",
  );
});
test("unknown time produces a 23/25-hour day interval, never noon", () => {
  for (const [date, hours] of [
    ["2024-03-10", 23],
    ["2024-11-03", 25],
  ]) {
    const value = resolveBirthInput(
      input({
        date,
        time: undefined,
        precision: "unknown",
        place: zone("America/New_York"),
      }),
    );
    assert.equal(value.utc, null);
    assert.equal(value.birthTimeKnown, false);
    assert.equal(
      (Date.parse(value.range.endExclusive) - Date.parse(value.range.start)) /
        3600000,
      hours,
    );
  }
  rejects(input({ precision: "unknown" }), "unknown_time_must_be_empty");
});
test("approximate uncertainty must be explicit and retained", () => {
  rejects(input({ precision: "approximate" }), "uncertainty_minutes_required");
  const value = resolveBirthInput(
    input({ precision: "approximate", uncertaintyMinutes: 45 }),
  );
  assert.equal(
    Date.parse(value.range.endExclusive) - Date.parse(value.range.start),
    90 * 60000,
  );
  rejects(input({ occurrence: "later" }), "occurrence_not_applicable");
  rejects(input({ uncertaintyMinutes: 20 }), "exact_time_uncertainty_conflict");
});
