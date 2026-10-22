import fs from "node:fs/promises";
import { createHash } from "node:crypto";
if (!process.argv.includes("--refresh"))
  throw new Error(
    "Explicit --refresh is required; normal tests never access the network.",
  );
const directory = new URL(
  "../packages/astrology-core/fixtures/",
  import.meta.url,
);
await fs.mkdir(directory, { recursive: true });
const dates = [
  "1900-01-01T12:00:00Z",
  "1950-06-15T12:00:00Z",
  "2000-01-01T12:00:00Z",
  "2026-09-22T12:00:00Z",
  "2099-12-31T12:00:00Z",
];
for (let i = 0; i < 45; i++) dates.push(`${1901 + (i * 29) % 125}-${String(1 + i % 12).padStart(2,"0")}-${String(1 + (i * 7) % 27).padStart(2,"0")}T${String((i * 5) % 24).padStart(2,"0")}:${String((i * 13) % 60).padStart(2,"0")}:00Z`);
dates.sort();
const targets = {
  Sun: 10,
  Moon: 301,
  Mercury: 199,
  Venus: 299,
  Mars: 499,
  Jupiter: 599,
  Saturn: 699,
  Uranus: 799,
  Neptune: 899,
  Pluto: 999,
};
const references = [];
for (const [body, id] of Object.entries(targets)) {
  const query = {
    format: "json",
    COMMAND: `'${id}'`,
    CENTER: "'500@399'",
    EPHEM_TYPE: "'OBSERVER'",
    QUANTITIES: "'31'",
    TLIST: `'${dates.map((d) => Date.parse(d) / 86400000 + 2440587.5).join(",")}'`,
    CSV_FORMAT: "'YES'",
    CAL_FORMAT: "'JD'",
    ANG_FORMAT: "'DEG'",
    EXTRA_PREC: "'YES'",
  };
  const url =
    "https://ssd.jpl.nasa.gov/api/horizons.api?" + new URLSearchParams(query);
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Horizons HTTP ${response.status}`);
  const raw = await response.text(),
    payload = JSON.parse(raw);
  if (payload.error || !payload.result?.includes("$$SOE"))
    throw new Error(payload.error ?? "No ephemeris table");
  await fs.writeFile(
    new URL(`${body.toLowerCase()}-horizons.json`, directory),
    raw,
  );
  const rows = payload.result
    .split("$$SOE")[1]
    .split("$$EOE")[0]
    .trim()
    .split("\n");
  if (rows.length !== dates.length)
    throw new Error("Unexpected Horizons row count");
  rows.forEach((line, i) => {
    const cells = line.split(",").map((x) => x.trim());
    const longitude = Number(cells[3]);
    if (!cells[3] || Math.abs(Number(cells[0]) - (Date.parse(dates[i]) / 86400000 + 2440587.5)) > 0.00001 || !Number.isFinite(longitude) || longitude < 0 || longitude >= 360)
      throw new Error("Invalid reference longitude");
    references.push({
      body,
      utc: dates[i],
      longitude,
      rawFile: `${body.toLowerCase()}-horizons.json`,
      rawSha256: createHash("sha256").update(raw).digest("hex"),
    });
  });
  console.log(`Saved ${body}: ${rows.length} independent positions`);
}
await fs.writeFile(
  new URL("reference.json", directory),
  JSON.stringify(
    {
      source: "NASA/JPL Horizons",
      retrievedAt: new Date().toISOString(),
      quantity: 31,
      center: "500@399",
      timeScale: "UT",
      kind: "500_positions_at_50_utc_instants",
      limitations: [
        "Apparent ecliptic-of-date; review Horizons frame/time conventions before accepting a release threshold.",
        "No independent ASC/MC reference in this suite.",
        "Historic UT versus engine UTC/DeltaT handling remains part of error budget.",
      ],
      references,
    },
    null,
    2,
  ) + "\n",
);

