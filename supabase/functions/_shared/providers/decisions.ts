// Batch C (2026-11-24): decision APIs. Each returns one choice from a fixed list with probabilities and a confidence,
// never free text. Only the reader_router chain uses them (reader-router.ts). Shapes from the official docs, checked
// 2026-11-24 (not yet verified with a live call):
// - OpenRouter (alpha): POST https://openrouter.ai/api/alpha/decisions, Bearer OPENROUTER_API_KEY; body {model, state,
//   questions: {name: {type: "choice", instructions, criteria: {option: definition}}}}; answers keyed by question name
//   ({type: "choice", choice, probabilities: {option: p}, confidence} or {type: "refusal"}).
//   https://openrouter.ai/docs/guides/features/decisions.md , https://openrouter.ai/docs/guides/community/jev.md
// - OpenAI: POST https://api.openai.com/v1/decisions, Bearer OPENAI_API_KEY; body {model: "gpt-6-luna", input,
//   questions: [{name, type: "choice", instructions, choices: [{value, description}]}]}; answers is an array with name,
//   choice, probabilities [{value, probability}], confidence, or type "refusal". https://developers.openai.com/api/docs/guides/decisions
// - Gemini: POST https://generativelanguage.googleapis.com/v1beta/decisions, header x-goog-api-key: GEMINI_API_KEY; body
//   {model: "gemini-decision-1", input, questions: {name: {type: "choice", instructions, criteria}}}; answers keyed by
//   name. Free-tier data is used to improve Google products: use a paid key only.
//   https://aistudio.google.com/docs/models/gemini-decision-1
// Privacy: the caller sends only the question, topic, spread, card names and candidate descriptions. No user id is sent
// (the OpenRouter `user` field is deliberately left out). jev's data policy is not stated in the docs (unverified).
import { DECISION_PROVIDER_SECRET_NAMES, type DecisionProviderName } from "../model-provider.ts";

export type DecisionRequest = {
  provider: DecisionProviderName;
  model: string;
  /** Plain-text context (question, topic, spread, cards). Never user identifiers or history. */
  state: string;
  questionName: string;
  instructions: string;
  /** option key -> description; the answer must be one of these keys. */
  options: Record<string, string>;
  timeoutMs: number;
};
export type DecisionResult = {
  provider: DecisionProviderName;
  model: string;
  choice: string;
  confidence: number | null;
  probabilities: Record<string, number>;
  latencyMs: number;
  costUsd: number | null;
};
export type DecisionErrorCode =
  | "provider_unavailable" | "provider_timeout" | "network_error" | "rate_limit" | "provider_auth_error" | "provider_5xx"
  | "provider_error" | "refusal" | "malformed_response";

export class DecisionProviderError extends Error {
  constructor(readonly provider: DecisionProviderName, readonly code: DecisionErrorCode, readonly status?: number) {
    super(`${provider}: ${code}`);
    this.name = "DecisionProviderError";
  }
}

type EnvLike = { get: (key: string) => string | undefined };
type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export const DECISION_ENDPOINTS: Record<DecisionProviderName, string> = {
  openrouter_decisions: "https://openrouter.ai/api/alpha/decisions",
  openai_decisions: "https://api.openai.com/v1/decisions",
  gemini_decisions: "https://generativelanguage.googleapis.com/v1beta/decisions"
};

const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const probability = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;

/** The request body each provider documents, built from one choice question. */
export function decisionRequestBody(request: DecisionRequest): Record<string, unknown> {
  if (request.provider === "openai_decisions") {
    return {
      model: request.model, input: request.state,
      questions: [{
        name: request.questionName, type: "choice", instructions: request.instructions,
        choices: Object.entries(request.options).map(([value, description]) => ({ value, description }))
      }]
    };
  }
  const question = { type: "choice", instructions: request.instructions, criteria: { ...request.options } };
  return request.provider === "gemini_decisions"
    ? { model: request.model, input: request.state, questions: { [request.questionName]: question } }
    : { model: request.model, state: request.state, questions: { [request.questionName]: question } };
}

/** The one answer for questionName, or a typed failure. A refusal, a missing answer or an unknown choice is not an answer. */
export function parseDecisionAnswer(provider: DecisionProviderName, json: unknown, questionName: string, options: Record<string, string>) {
  const body = record(json);
  let answer: Record<string, unknown> | null = null;
  if (Array.isArray(body?.answers)) answer = record(body.answers.find(item => record(item)?.name === questionName));
  else answer = record(record(body?.answers)?.[questionName]);
  if (!answer) throw new DecisionProviderError(provider, "malformed_response");
  if (answer.type === "refusal") throw new DecisionProviderError(provider, "refusal");
  if (answer.type !== undefined && answer.type !== "choice") throw new DecisionProviderError(provider, "malformed_response");
  const choice = answer.choice;
  if (typeof choice !== "string" || !Object.hasOwn(options, choice)) throw new DecisionProviderError(provider, "malformed_response");
  const probabilities: Record<string, number> = {};
  if (Array.isArray(answer.probabilities)) {
    for (const item of answer.probabilities) {
      const entry = record(item);
      const p = probability(entry?.probability);
      if (typeof entry?.value === "string" && Object.hasOwn(options, entry.value) && p !== null) probabilities[entry.value] = p;
    }
  } else {
    for (const [key, value] of Object.entries(record(answer.probabilities) ?? {})) {
      const p = probability(value);
      if (Object.hasOwn(options, key) && p !== null) probabilities[key] = p;
    }
  }
  const cost = record(body?.usage)?.cost;
  return { choice, confidence: probability(answer.confidence), probabilities, costUsd: typeof cost === "number" && Number.isFinite(cost) ? cost : null };
}

/**
 * Calls one decision provider. A missing key is provider_unavailable (the chain moves to its next step without a
 * network call); the key value is read by name and only placed in the request header.
 */
export async function invokeDecision(request: DecisionRequest, env: EnvLike, fetchImpl: FetchLike = fetch): Promise<DecisionResult> {
  const apiKey = env.get(DECISION_PROVIDER_SECRET_NAMES[request.provider])?.trim();
  if (!apiKey) throw new DecisionProviderError(request.provider, "provider_unavailable");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (request.provider === "gemini_decisions") headers["x-goog-api-key"] = apiKey;
  else headers.Authorization = `Bearer ${apiKey}`;
  const started = Date.now();
  let response: Response;
  try {
    response = await fetchImpl(DECISION_ENDPOINTS[request.provider], {
      method: "POST", headers, body: JSON.stringify(decisionRequestBody(request)), signal: AbortSignal.timeout(Math.max(1, Math.floor(request.timeoutMs)))
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    throw new DecisionProviderError(request.provider, name === "TimeoutError" || name === "AbortError" ? "provider_timeout" : "network_error");
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    const status = response.status;
    throw new DecisionProviderError(request.provider,
      status === 401 || status === 403 ? "provider_auth_error" : status === 429 ? "rate_limit" : status >= 500 ? "provider_5xx" : "provider_error", status);
  }
  let json: unknown;
  try { json = await response.json(); } catch { throw new DecisionProviderError(request.provider, "malformed_response"); }
  const parsed = parseDecisionAnswer(request.provider, json, request.questionName, request.options);
  return { provider: request.provider, model: request.model, ...parsed, latencyMs: Date.now() - started };
}
