import { calculateChart } from "../../../../../../packages/astrology-core/calculator.mjs";
import { buildSafeAstrologyContext } from "../handoff";
import {
  validAstrologyData,
  freshAstrologyData,
  SavedChart,
} from "../persistence";
const input = {
  revision: 1,
  date: "1998-06-17",
  time: "05:41",
  precision: "exact" as const,
  place: {
    id: "private-place-unique",
    source: "test",
    confirmed: true as const,
    latitude: 21.023456,
    longitude: 105.876543,
    timezone: "Asia/Ho_Chi_Minh",
  },
};
const report: SavedChart = {
  id: "chart-1",
  createdAt: "2026-09-22T01:00:00Z",
  input,
  placeName: "Private birth location",
  chart: calculateChart(input),
};
test("chat handoff contains symbolic signs but excludes raw birth and precision data", () => {
  const context = buildSafeAstrologyContext(report, "vi"),
    serialized = JSON.stringify(context);
  expect(context.astrology?.sunSign).toBe("gemini");
  for (const privateValue of [
    input.date,
    input.time,
    input.place.id,
    input.place.timezone,
    String(input.place.latitude),
    String(input.place.longitude),
    report.placeName,
    report.chart.time.utc!,
  ])
    expect(serialized).not.toContain(privateValue);
  const unknown = { ...input, time: undefined, precision: "unknown" as const };
  const reduced = buildSafeAstrologyContext(
    { ...report, input: unknown, chart: calculateChart(unknown) },
    "en",
  );
  expect(reduced.astrology?.sunSign).toBeUndefined();
  expect(reduced.astrology?.risingSign).toBeUndefined();
  expect(reduced.astrology?.sections).toHaveLength(0);
});
test("stored chart cannot be reopened under a different birth input or location", () => {
  const data = { ...freshAstrologyData(), nextRevision: 2, reports: [report] };
  expect(validAstrologyData(data)).toBe(true);
  expect(
    validAstrologyData({
      ...data,
      reports: [{ ...report, input: { ...input, date: "bad-date" } }],
    }),
  ).toBe(false);
  expect(
    validAstrologyData({
      ...data,
      reports: [
        {
          ...report,
          input: { ...input, place: { ...input.place, latitude: 0 } },
        },
      ],
    }),
  ).toBe(false);
});
