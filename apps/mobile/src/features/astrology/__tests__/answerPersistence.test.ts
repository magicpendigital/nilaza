import response from "../../../../../../packages/agent-config/astrology-ai-insight/fixtures/valid-response.json";
import request from "../../../../../../packages/agent-config/astrology-ai-insight/fixtures/valid-request.json";
import responseSchema from "../../../../../../packages/agent-config/astrology-ai-insight/response.schema.json";
import requestSchema from "../../../../../../packages/agent-config/astrology-ai-insight/request.schema.json";
import { matchesAstrologyAiSchema, validAstrologyAiResponse, validAstrologyAiSavedContext, type AstrologyAiSavedContext } from "../astrologyAiValidation";
import { validSavedAstrologyAiInsight } from "../persistence";
import { astrologyAnswerSectionIds, toAstrologyAiGuideAnswer } from "../astrologyAiInsight";

const context = { chart: request.chart, selectedFactIds: request.selectedFactIds, facts: request.facts, caveats: request.caveats } as AstrologyAiSavedContext;
const provenance = {
  schemaVersion: "nilaza.answer-provenance.v1", feature: "astrology_insight", locale: "vi", sourceKind: "mock",
  interactionId: "interaction_test", attemptId: "attempt_test", clientRequestId: response.requestId,
  remoteId: response.reportId, traceId: "0123456789abcdef0123456789abcdef", providerRequestId: "provider_request_separate",
  promptVersion: response.metadata.promptVersion, routeVersion: "2026-10-14", generatedAt: response.metadata.generatedAt,
  validationStatus: "validated", persistenceStatus: "stored",
};

test("canonical response and every selected fact/caveat remain intact through a JSON saved answer", () => {
  const saved = { schemaVersion: "nilaza.astrology.saved-ai-insight.v1", response, context, provenance, savedAt: "2026-10-14T12:00:00Z" };
  const reopened = JSON.parse(JSON.stringify(saved));
  expect(validSavedAstrologyAiInsight(reopened)).toBe(true);
  expect(reopened).toEqual(saved);
  expect(reopened.context).not.toHaveProperty("userFocus");
  expect(JSON.stringify(reopened.context)).not.toMatch(/birthDate|birthTime|latitude|longitude|timezone/);
  const answer = toAstrologyAiGuideAnswer(reopened.response, reopened.context.caveats, reopened.provenance);
  expect(answer.language).toBe("vi");
  expect(answer.provenance?.providerRequestId).not.toBe(answer.provenance?.clientRequestId);
  expect(answer.sections).toHaveLength(response.patterns.length + response.tensions.length + response.focusSections.length + response.reflectionQuestions.length);
  expect(astrologyAnswerSectionIds(reopened.response)).toContain(`focusSections:${response.focusSections[0].id}`);
});

test("invalid output, context and mismatched correlation are rejected before success or saving", () => {
  expect(validAstrologyAiResponse(response, context, { requestId: response.requestId, language: "vi" })).toBe(true);
  expect(validAstrologyAiResponse(response, context, { requestId: "different_request" })).toBe(false);
  expect(validAstrologyAiResponse({ ...response, patterns: [] }, context)).toBe(false);
  expect(validAstrologyAiResponse({ ...response, evidenceFactIds: ["placement.invented"] }, context)).toBe(false);
  expect(validAstrologyAiResponse({ ...response, metadata: { ...response.metadata, reportRevision: 999 } }, context)).toBe(false);
  expect(validAstrologyAiSavedContext({ ...context, userFocus: { question: "must not be saved" } })).toBe(false);
  const saved = { schemaVersion: "nilaza.astrology.saved-ai-insight.v1", response, context, savedAt: "2026-10-14T12:00:00Z" };
  expect(validSavedAstrologyAiInsight(saved)).toBe(true); // Older server has no provenance yet.
  expect(validSavedAstrologyAiInsight({ ...saved, provenance: { ...provenance, clientRequestId: "wrong_request" } })).toBe(false);
  expect(validSavedAstrologyAiInsight({ ...saved, provenance: { ...provenance, question: "private text" } })).toBe(false);
  expect(validSavedAstrologyAiInsight({ ...saved, response: { ...response, rawAnswer: "unvalidated" } })).toBe(false);
  expect(validAstrologyAiResponse({ ...response, constructor: "untrusted extra property" }, context)).toBe(false);
});

test("schema interpreter supports canonical keyword surface and fails closed on unknown constraints", () => {
  expect(matchesAstrologyAiSchema(response, responseSchema)).toBe(true);
  expect(matchesAstrologyAiSchema(request, requestSchema)).toBe(true);
  expect(matchesAstrologyAiSchema(response, { ...responseSchema, madeUpConstraint: true })).toBe(false);
  expect(matchesAstrologyAiSchema({ ...response, synthesis: "short" }, responseSchema)).toBe(false);
  const duplicateEvidence = { ...response, evidenceFactIds: [response.evidenceFactIds[0], response.evidenceFactIds[0]] };
  expect(matchesAstrologyAiSchema(duplicateEvidence, responseSchema)).toBe(false);
  const invalidFact = { ...context, facts: { ...context.facts, placements: context.facts.placements.map((fact, i) => i ? fact : { ...fact, degree: 30 }) } };
  expect(validAstrologyAiSavedContext(invalidFact)).toBe(false);
  const cyclic: any = {}; cyclic.value = cyclic;
  expect(matchesAstrologyAiSchema(cyclic, responseSchema)).toBe(false);
});
