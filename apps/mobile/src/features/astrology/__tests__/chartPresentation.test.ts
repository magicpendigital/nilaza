import {
  astrologyCanonicalContractId,
  toAstrologyChartPresentation,
} from "../contracts";

describe("astrology chart presentation boundary", () => {
  it("does not unlock a personal wheel for a local preview", () => {
    const result = toAstrologyChartPresentation(
      {
        source: "local_fallback",
        placements: [
          { key: "sun", longitude: 10, sign: { id: "aries", degree: 10 } },
        ],
      },
      { provider: "local_fallback" },
    );
    expect(result.status).toBe("limited");
    expect(result.reasonCodes).toContain("local_preview_not_calculated");
  });

  it("does not accept legacy self-certification or an aspect contradicting the coordinates", () => {
    const result = toAstrologyChartPresentation({
      contractId: astrologyCanonicalContractId,
      contractVersion: "0.1.0",
      calculationStatus: "verified",
      provenance: { isReproducible: true },
      placements: [
        {
          body: "sun",
          longitude: 10,
          sign: "aries",
          degree: 10,
          confidence: "exact",
        },
        {
          body: "moon",
          longitude: 40,
          sign: "taurus",
          degree: 10,
          confidence: "exact",
        },
      ],
      aspects: [
        {
          bodyA: "sun",
          bodyB: "moon",
          type: "sextile",
          orb: 0,
          exactSeparation: 60,
          confidence: "exact",
        },
      ],
    });
    expect(result.status).toBe("limited");
    expect(result.facts.map((fact) => fact.id)).toEqual(["sun", "moon"]);
    expect(result.aspects).toHaveLength(0);
  });

  it("does not guess a malformed longitude or sign", () => {
    const result = toAstrologyChartPresentation(
      {
        placements: [
          { key: "sun", longitude: 361, sign: { id: "aries", degree: 1 } },
        ],
      },
      { provider: "astronomy-engine" },
    );
    expect(result.facts).toHaveLength(0);
    expect(result.status).toBe("limited");
    expect(result.reasonCodes).toContain("placement_facts_unavailable");
  });

  it("rejects a sign that conflicts with a longitude and blocks a chart that draws angles for unknown time", () => {
    const result = toAstrologyChartPresentation({
      contractId: astrologyCanonicalContractId,
      calculationStatus: "verified",
      provenance: { isReproducible: true },
      time: { birthTimeKnown: false },
      placements: [
        {
          body: "sun",
          longitude: 10,
          sign: "taurus",
          degree: 10,
          confidence: "exact",
        },
        {
          body: "moon",
          longitude: 40,
          sign: "taurus",
          degree: 10,
          confidence: "exact",
        },
      ],
      angles: [
        {
          key: "ascendant",
          longitude: 10,
          sign: "aries",
          degree: 10,
          confidence: "exact",
        },
      ],
    });
    expect(result.facts).toHaveLength(0);
    expect(result.status).toBe("limited");
    expect(result.reasonCodes).toContain("unknown_time_visual_conflict");
  });
});
