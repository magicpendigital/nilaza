import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  calculateChart,
  calculationVersion,
  circularDifference,
} from "../packages/astrology-core/calculator.mjs";
const root = new URL("../packages/astrology-core/fixtures/", import.meta.url);
const reference = JSON.parse(
  fs.readFileSync(new URL("reference.json", root), "utf8"),
);
const cache = new Map();
const results = reference.references.map((item) => {
  const raw = fs.readFileSync(new URL(item.rawFile, root));
  if (createHash("sha256").update(raw).digest("hex") !== item.rawSha256)
    throw new Error("Reference checksum mismatch");
  const chart = cache.get(item.utc) ?? calculateChart({
    revision: 1,
    date: item.utc.slice(0, 10),
    time: item.utc.slice(11, 16),
    precision: "exact",
    place: {
      id: "synthetic-reference",
      source: "fixture",
      confirmed: true,
      latitude: 0,
      longitude: 0,
      timezone: "UTC",
    },
  });
  cache.set(item.utc, chart);
  const actual = chart.placements.find(
    (p) => p.body === item.body.toLowerCase(),
  ).longitude;
  const difference = circularDifference(actual, item.longitude);
  return { ...item, actual, difference, passed: difference <= 0.01 };
});
const failed = results.filter((r) => !r.passed);
const report = {
  calculationVersion,
  referenceSource: reference.source,
  scope: reference.kind,
  provisionalThresholdDegrees: 0.01,
  passed: results.length - failed.length,
  total: results.length,
  maxDifferenceDegrees: Math.max(...results.map((r) => r.difference)),
  gate: failed.length ? "blocked" : "longitude_subset_passed_not_full_A3",
  limitations: reference.limitations,
  results,
};
if (process.argv.includes("--write-report"))
  fs.writeFileSync(
    new URL("../packages/astrology-core/accuracy-report.json", import.meta.url),
    JSON.stringify(report, null, 2) + "\n",
  );
console.log(
  JSON.stringify(
    {
      gate: report.gate,
      passed: report.passed,
      total: report.total,
      maxDifferenceDegrees: report.maxDifferenceDegrees,
      failed,
    },
    null,
    2,
  ),
);
if (failed.length) process.exitCode = 1;
