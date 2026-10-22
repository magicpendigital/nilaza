import { answerCorrelationHeaders, createAnswerAttempt, parseAnswerProvenance } from "../../../packages/ai-contracts/answer-provenance.ts";
import { readAnswerCorrelation } from "./answer-provenance.ts";
function assert(value: unknown) { if (!value) throw new Error("assertion failed"); }
Deno.test("answer correlation keeps interaction on retry, never reuses attempt or request", () => {
  const first = createAnswerAttempt("tarot_reading", "vi"), next = createAnswerAttempt("tarot_reading", "vi", first.interactionId);
  assert(first.interactionId === next.interactionId && first.attemptId !== next.attemptId && first.clientRequestId !== next.clientRequestId);
  const request = new Request("https://example.invalid", { headers: answerCorrelationHeaders(first) });
  assert(readAnswerCorrelation(request, "tarot_reading", "vi").attemptId === first.attemptId);
  let rejected = false; try { readAnswerCorrelation(request, "astrology_insight", "vi", "wrong_request"); } catch { rejected = true; } assert(rejected);
});
Deno.test("provenance rejects mismatched attempt, invalid AI state and private fields in IDs", () => {
  const correlation = createAnswerAttempt("tarot_reading", "vi");
  const value = { schemaVersion: "nilaza.answer-provenance.v1", feature: "tarot_reading", ...correlation, locale: "vi", sourceKind: "ai", generatedAt: "2026-10-14T00:00:00.000Z", validationStatus: "validated", persistenceStatus: "failed", promptVersion: "v2", rawQuestion: "private" };
  const parsed = parseAnswerProvenance(value, { correlation });
  assert(parsed && !("rawQuestion" in parsed));
  assert(!parseAnswerProvenance({ ...value, attemptId: "different" }, { correlation }));
  assert(!parseAnswerProvenance({ ...value, validationStatus: "rejected" }));
  assert(!parseAnswerProvenance({ ...value, promptVersion: "private question here" }));
  assert(!parseAnswerProvenance({ ...value, generatedAt: "invalid" }));
});
