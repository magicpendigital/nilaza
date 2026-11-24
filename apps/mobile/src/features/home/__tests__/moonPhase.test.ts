import { fixedZone } from "../../astrology/localDay";
import { moonLitPath, moonPhaseFor, moonPhaseLabel } from "../moonPhase";

const utc = fixedZone(0);

it("names a main phase only on the local day that holds its exact moment", () => {
  expect(moonPhaseFor(new Date("2024-01-11T08:00:00Z"), utc).id).toBe("new");
  expect(moonPhaseFor(new Date("2024-01-18T20:00:00Z"), utc).id).toBe("first_quarter");
  expect(moonPhaseFor(new Date("2024-01-25T01:00:00Z"), utc).id).toBe("full");
  expect(moonPhaseFor(new Date("2024-02-02T05:00:00Z"), utc).id).toBe("last_quarter");
  // The day after a full Moon it is waning, not "full" any more.
  expect(moonPhaseFor(new Date("2024-01-26T12:00:00Z"), utc).id).toBe("waning_gibbous");
});

it("keeps the exact moment of the day's main phase", () => {
  const full = moonPhaseFor(new Date("2024-01-25T01:00:00Z"), utc);
  expect(full.exactAt?.toISOString().slice(0, 13)).toBe("2024-01-25T17");
});

it("names in-between phases by how lit the Moon is", () => {
  expect(moonPhaseFor(new Date("2024-01-14T12:00:00Z"), utc).id).toBe("waxing_crescent");
  expect(moonPhaseFor(new Date("2024-01-22T12:00:00Z"), utc).id).toBe("waxing_gibbous");
  expect(moonPhaseFor(new Date("2024-02-06T12:00:00Z"), utc).id).toBe("waning_crescent");
});

it("draws nothing at new moon and the lit side by direction", () => {
  expect(moonLitPath(moonPhaseFor(new Date("2024-01-11T11:57:00Z"), utc), 17, 13)).toBeNull();
  const waxing = moonLitPath(moonPhaseFor(new Date("2024-01-15T00:00:00Z"), utc), 17, 13);
  const waning = moonLitPath(moonPhaseFor(new Date("2024-02-06T00:00:00Z"), utc), 17, 13);
  expect(waxing).toContain("0 0 1 17 30");
  expect(waning).toContain("0 0 0 17 30");
});

it("has Vietnamese names without 'rằm' and hints", () => {
  expect(moonPhaseLabel("full", "vi").name).toBe("Trăng tròn");
  expect(moonPhaseLabel("new", "vi").name).toBe("Trăng mới");
  expect(moonPhaseLabel("full", "en").hint.length).toBeGreaterThan(10);
});
