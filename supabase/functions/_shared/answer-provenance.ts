import { createAnswerAttempt, isOpaqueAnswerId, parseAnswerCorrelation, type AnswerFeature } from "../../../packages/ai-contracts/answer-provenance.ts";
import { AiRequestError } from "./ai-request-guard.ts";

export const answerCorsHeaders = "authorization, x-client-info, apikey, content-type, x-nilaza-interaction-id, x-nilaza-attempt-id, x-nilaza-client-request-id";

export function readAnswerCorrelation(req: Request, feature: AnswerFeature, locale: "vi" | "en", requestId?: string) {
  const values = { interactionId: req.headers.get("x-nilaza-interaction-id"), attemptId: req.headers.get("x-nilaza-attempt-id"), clientRequestId: req.headers.get("x-nilaza-client-request-id") };
  if (requestId !== undefined && !isOpaqueAnswerId(requestId)) throw new AiRequestError(400, "invalid_answer_correlation");
  if (Object.values(values).every(value => value === null)) return createAnswerAttempt(feature, locale, undefined, requestId);
  const parsed = parseAnswerCorrelation(values);
  if (!parsed || requestId && parsed.clientRequestId !== requestId) throw new AiRequestError(400, "invalid_answer_correlation");
  return parsed;
}
