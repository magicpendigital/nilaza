import { calculateChart } from "../../../../../../packages/astrology-core/calculator.mjs";
import { buildAstrologyAiInvocation, toAstrologyAiGuideAnswer } from "../astrologyAiInsight";
import { stableAstrologyAspectFactId } from "../chartSelection";

function savedChart() {
  const input = {
    revision: 1,
    date: "1998-08-12",
    precision: "exact" as const,
    time: "08:30",
    place: {
      id: "test-hanoi",
      source: "test",
      confirmed: true,
      latitude: 21.0285,
      longitude: 105.8542,
      timezone: "Asia/Bangkok"
    }
  };
  return {
    id: "chart-1-1800000000000",
    createdAt: "2026-09-25T00:00:00.000Z",
    placeName: "Test fixture",
    input,
    chart: calculateChart(input)
  };
}

test("AI projection sends only allowlisted, selected calculated facts and current-focus consent", () => {
  const request = buildAstrologyAiInvocation({
    savedChart: savedChart(),
    language: "vi",
    question: "Tôi muốn hiểu các nhu cầu của mình trong công việc."
  });
  const serialized = JSON.stringify(request).toLowerCase();
  expect(request.consent).toEqual({ accepted: true, version: "astrology_ai_fact_sharing_v1" });
  expect(request).not.toHaveProperty("qaTraceConsent");
  expect(request.chart.calculationVersion).toBe("nilaza-a3-utc-tt-2");
  expect(request.selectedFactIds.length).toBeLessThanOrEqual(30);
  expect(request.facts.placements.length).toBeGreaterThan(0);
  expect(request.selectedFactIds).toEqual(expect.arrayContaining(request.facts.placements.map((fact) => fact.factId)));
  for (const forbidden of ["birthdate", "birthtime", "birthplace", "latitude", "longitude", "timezone", "journal", "chat history"]) {
    expect(serialized).not.toContain(forbidden);
  }
  expect(serialized).not.toContain("1998-08-12");
  expect(serialized).not.toContain("08:30");
  expect(serialized).not.toContain("21.0285");
});

test("staging QA trace capture is absent by default and requires a separate explicit opt-in", () => {
  const base = {
    savedChart: savedChart(),
    language: "en" as const,
    question: "What can I reflect on?"
  };
  const normalRequest = buildAstrologyAiInvocation(base);
  const optedInRequest = buildAstrologyAiInvocation({ ...base, qaTraceConsentAccepted: true });
  expect(normalRequest).not.toHaveProperty("qaTraceConsent");
  expect(optedInRequest.qaTraceConsent).toEqual({ accepted: true, version: "astrology_ai_qa_trace_v1" });
});

test("uncertain-time chart cannot be projected as personal placements", () => {
  const exact = savedChart();
  const { time: _exactTime, ...baseInput } = exact.input;
  const approximateInput = { ...baseInput, precision: "unknown" as const };
  const approximate = { ...exact, input: approximateInput, chart: calculateChart(approximateInput) };
  expect(() => buildAstrologyAiInvocation({ savedChart: approximate, language: "en", question: "What can I reflect on?" }))
    .toThrow("chart_facts_unavailable");
});

test("a selected wider-orb aspect and a non-primary house survive the bounded fact projection", () => {
  const saved = savedChart();
  const target = [...saved.chart.aspects].sort((a, b) => b.orb - a.orb)[0];
  const id = stableAstrologyAspectFactId(target.bodyA as never, target.type as never, target.bodyB as never);
  const request = buildAstrologyAiInvocation({ savedChart: saved, language: "en", question: "Reflect on this aspect and House 6", preferredFactIds: [id, "house.6", "untrusted.fact"] });
  expect(request.selectedFactIds).toContain(id);
  expect(request.selectedFactIds).toContain("house.6");
  expect(request.selectedFactIds).not.toContain("untrusted.fact");
  expect(request.selectedFactIds.length).toBeLessThanOrEqual(30);
});

test("AI response is mapped into a readable guide answer with evidence IDs", () => {
  const answer = toAstrologyAiGuideAnswer({
    schemaVersion: "nilaza.astrology.ai-insight.response.v1",
    requestId: "req_astrology_123456",
    reportId: "12345678-1234-1234-1234-123456789012",
    language: "en",
    headline: "A useful reflection",
    synthesis: "A grounded synthesis.",
    evidenceFactIds: ["placement.sun"],
    patterns: [],
    tensions: [],
    focusSections: [],
    reflectionQuestions: [],
    suggestedFollowUps: [],
    metadata: {
      contractId: "nilaza.astrology.ai-insight",
      contractVersion: "1.0.0",
      responseSchema: "astrology_ai_insight_v1",
      promptVersionId: "astrology_interpretation_system",
      promptVersion: "2026-09-25-ai-insight-v1",
      chartContractVersion: "0.2.0",
      calculationVersion: "nilaza-a3-utc-tt-2",
      reportRevision: 1,
      interpretationMode: "evidence_bound_reflection",
      moderationStatus: "passed",
      providerMode: "staging",
      disclaimerKey: "astrology_reflection_not_prediction",
      generatedAt: "2026-09-25T00:00:00.000Z"
    }
  });
  expect(answer.title).toBe("A useful reflection");
  expect(answer.paragraphs).toEqual(["A grounded synthesis."]);
  expect(answer.evidenceIds).toEqual(["placement.sun"]);
  expect(answer.eyebrow).toContain("STAGING");
});
