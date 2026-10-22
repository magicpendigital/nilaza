import { calculateChart } from "../../../../../../packages/astrology-core/calculator.mjs";
import type { CandidateChart } from "../../../../../../packages/astrology-core/calculator.mjs";
import {
  buildAstrologyChartSelectionModel,
  findAstrologyChartSelection,
  findAstrologyChartSelectionByFactId,
  getAstrologySelectionKindLabel,
  getAstrologySelectionLabel,
  stableAstrologyAspectFactId,
} from "../chartSelection";

const input = {
  revision: 1,
  date: "1998-06-17",
  time: "05:41",
  precision: "exact" as const,
  place: {
    id: "private-place-id",
    source: "test",
    confirmed: true as const,
    latitude: 21.023456,
    longitude: 105.876543,
    timezone: "Asia/Ho_Chi_Minh",
  },
};

const exactChart = () => calculateChart(input);

describe("canonical astrology chart selection model", () => {
  it("builds stable selections and evidence refs without copying birth data", () => {
    const chart = exactChart();
    const model = buildAstrologyChartSelectionModel(chart);
    const sun = findAstrologyChartSelection(model, "body:sun");
    const firstAspect = model.aspects[0];

    expect(model.anglesAndHousesAvailable).toBe(true);
    expect(model.bodies.map((selection) => selection.id)).toEqual([
      "body:sun",
      "body:moon",
      "body:mercury",
      "body:venus",
      "body:mars",
      "body:jupiter",
      "body:saturn",
      "body:uranus",
      "body:neptune",
      "body:pluto",
      "body:ascendant",
      "body:midheaven",
    ]);
    expect(model.signs).toHaveLength(12);
    expect(model.houses).toHaveLength(12);
    expect(sun?.evidenceRefs).toEqual([
      {
        source: "calculated_chart",
        contractId: "nilaza.astrology.canonical-chart",
        contractVersion: "0.2.0",
        kind: "placement",
        factId: "placement.sun",
      },
    ]);
    expect(firstAspect?.evidenceRefs.map((ref) => ref.kind)).toEqual([
      "aspect",
      "placement",
      "placement",
    ]);

    const serialized = JSON.stringify(model);
    for (const privateValue of [
      input.date,
      input.time,
      input.place.id,
      input.place.timezone,
      String(input.place.latitude),
      String(input.place.longitude),
      chart.time.utc!,
    ]) {
      expect(serialized).not.toContain(privateValue);
    }
  });

  it("uses aspect IDs that are independent of endpoint and array order", () => {
    expect(stableAstrologyAspectFactId("sun", "trine", "jupiter")).toBe(
      stableAstrologyAspectFactId("jupiter", "trine", "sun"),
    );
    expect(stableAstrologyAspectFactId("sun", "trine", "jupiter")).toBe(
      "aspect.sun_jupiter.trine",
    );

    const chart = exactChart();
    const original = chart.aspects[0];
    const reversedChart: CandidateChart = {
      ...chart,
      aspects: [
        {
          ...original,
          id: "provider-or-array-index-may-change",
          bodyA: original.bodyB,
          bodyB: original.bodyA,
        },
        ...chart.aspects.slice(1),
      ],
    };
    expect(original).toMatchObject({
      bodyA: "sun",
      bodyB: "jupiter",
      type: "square",
    });
    const expectedId = stableAstrologyAspectFactId(
      "sun",
      "square",
      "jupiter",
    );
    expect(
      buildAstrologyChartSelectionModel(chart).aspects.map(({ id }) => id),
    ).toContain(expectedId);
    expect(
      buildAstrologyChartSelectionModel(reversedChart).aspects.map(
        ({ id }) => id,
      ),
    ).toContain(expectedId);
  });

  it.each(["approximate", "unknown"] as const)(
    "excludes uncertain angles and houses for %s birth time",
    (precision) => {
      const chart = exactChart();
      const uncertainChart = {
        ...chart,
        time: {
          ...chart.time,
          precision,
          birthTimeKnown: precision === "approximate",
          utc: precision === "approximate" ? chart.time.utc : null,
          range: {
            start: "1998-06-16T17:00:00Z",
            endExclusive: "1998-06-17T17:00:00Z",
          },
        },
      } as CandidateChart;
      const model = buildAstrologyChartSelectionModel(uncertainChart);

      expect(model.anglesAndHousesAvailable).toBe(false);
      expect(model.bodies.some((selection) => selection.sourceKind === "angle"))
        .toBe(false);
      expect(model.houses).toHaveLength(0);
      expect(
        model.aspects.some(
          (selection) =>
            selection.bodyA === "ascendant" ||
            selection.bodyB === "ascendant" ||
            selection.bodyA === "midheaven" ||
            selection.bodyB === "midheaven",
        ),
      ).toBe(false);
      expect(model.reasonCodes).toContain(
        "angles_and_houses_excluded_uncertain_time",
      );
      expect(
        model.signs.flatMap((selection) => selection.evidenceRefs),
      ).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: "angle" }),
          expect.objectContaining({ kind: "house" }),
        ]),
      );
    },
  );

  it("links signs and Whole Sign houses only to matching calculated facts", () => {
    const model = buildAstrologyChartSelectionModel(exactChart());
    const sun = model.bodies.find((selection) => selection.bodyId === "sun")!;
    const sunSign = model.signs.find(
      (selection) => selection.sign === sun.sign,
    )!;
    const sunHouse = model.houses.find(
      (selection) => selection.sign === sun.sign,
    )!;

    expect(sunSign.evidenceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ factId: "placement.sun" }),
        expect.objectContaining({ factId: `house.${sunHouse.house}` }),
      ]),
    );
    expect(sunHouse.evidenceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ factId: `house.${sunHouse.house}` }),
        expect.objectContaining({ factId: "placement.sun" }),
      ]),
    );
  });

  it("provides user-facing Vietnamese and English labels for every selection kind", () => {
    const model = buildAstrologyChartSelectionModel(exactChart());
    const sun = findAstrologyChartSelection(model, "body:sun")!;
    const gemini = findAstrologyChartSelection(model, "sign:gemini")!;
    const houseOne = findAstrologyChartSelection(model, "house:1")!;
    const aspect = model.aspects[0];

    expect(getAstrologySelectionLabel(sun, "vi")).toBe("Mặt Trời");
    expect(getAstrologySelectionLabel(sun, "en")).toBe("Sun");
    expect(getAstrologySelectionLabel(gemini, "vi")).toBe("Song Tử");
    expect(getAstrologySelectionLabel(houseOne, "en")).toBe("House 1");
    expect(getAstrologySelectionLabel(aspect, "vi")).not.toBe(
      getAstrologySelectionLabel(aspect, "en"),
    );
    expect(getAstrologySelectionKindLabel("aspect", "vi")).toBe("Góc hợp");
    expect(getAstrologySelectionKindLabel("aspect", "en")).toBe("Aspect");
  });

  it("uses the AI contract fact ID namespace and maps evidence back to UI", () => {
    const model = buildAstrologyChartSelectionModel(exactChart());
    const refs = model.selections.flatMap((selection) => selection.evidenceRefs);

    expect(refs.length).toBeGreaterThan(0);
    refs.forEach((ref) =>
      expect(ref.factId).toMatch(/^(placement|aspect|house)\.[a-z0-9][a-z0-9._-]*$/),
    );
    expect(
      findAstrologyChartSelectionByFactId(model, "placement.sun")?.id,
    ).toBe("body:sun");
    expect(
      findAstrologyChartSelectionByFactId(model, "placement.ascendant")?.id,
    ).toBe("body:ascendant");
    expect(findAstrologyChartSelectionByFactId(model, "house.1")?.id).toBe(
      "house:1",
    );
  });
});
