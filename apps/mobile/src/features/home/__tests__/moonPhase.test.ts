import { moonLitPath, moonPhaseFor, moonPhaseLabel } from "../moonPhase";

it("names the phase on published 2024 lunar dates", () => {
  expect(moonPhaseFor(new Date("2024-01-11T11:57:00Z")).id).toBe("new");
  expect(moonPhaseFor(new Date("2024-01-18T03:53:00Z")).id).toBe("first_quarter");
  expect(moonPhaseFor(new Date("2024-01-25T17:54:00Z")).id).toBe("full");
  expect(moonPhaseFor(new Date("2024-02-02T23:18:00Z")).id).toBe("last_quarter");
});

it("handles dates before the reference new moon", () => {
  const phase = moonPhaseFor(new Date("1999-12-22T17:31:00Z"));
  expect(phase.id).toBe("full");
  expect(phase.ageDays).toBeGreaterThanOrEqual(0);
});

it("draws nothing at new moon and the lit side by direction", () => {
  expect(moonLitPath(moonPhaseFor(new Date("2024-01-11T11:57:00Z")), 17, 13)).toBeNull();
  const waxing = moonLitPath(moonPhaseFor(new Date("2024-01-15T00:00:00Z")), 17, 13);
  const waning = moonLitPath(moonPhaseFor(new Date("2024-02-06T00:00:00Z")), 17, 13);
  expect(waxing).toContain("0 0 1 17 30");
  expect(waning).toContain("0 0 0 17 30");
});

it("has Vietnamese names and hints", () => {
  expect(moonPhaseLabel("full", "vi").name).toBe("Trăng tròn");
  expect(moonPhaseLabel("full", "en").hint.length).toBeGreaterThan(10);
});
