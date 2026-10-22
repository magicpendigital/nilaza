/** Metadata only. A client copy is not proof of execution; the server receipt is checked separately. */
export const answerProvenanceSchema = "nilaza.answer-provenance.v1" as const;
export type AnswerFeature = "tarot_reading" | "astrology_insight";
export type AnswerCorrelation = { interactionId: string; attemptId: string; clientRequestId: string };
export type AnswerProvenance = AnswerCorrelation & {
  schemaVersion: typeof answerProvenanceSchema;
  feature: AnswerFeature;
  locale: "vi" | "en";
  sourceKind: "ai" | "reference" | "fallback" | "blocked" | "mock";
  generatedAt: string;
  validationStatus: "validated" | "rejected" | "not_applicable" | "unknown";
  persistenceStatus: "stored" | "failed" | "skipped" | "unknown";
  remoteId?: string;
  traceId?: string;
  providerRequestId?: string;
  promptVersionId?: string;
  promptVersion?: string;
  promptAssemblyVersion?: string;
  routeVersionId?: string;
  routeVersion?: string;
  responseSchema?: string;
  contentVersion?: string;
  calculationVersion?: string;
  chartContractVersion?: string;
  reportRevision?: number;
  appVersion?: string;
  answerReceiptId?: string;
};

export function isOpaqueAnswerId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value);
}

export function isAnswerVersionRef(value: unknown): value is string {
  return isOpaqueAnswerId(value) || typeof value === "string" && value.length <= 128 && /^local:[A-Za-z0-9_.:-]+@[A-Za-z0-9_.:-]+$/.test(value);
}

function opaqueId(prefix: string) {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${id}`;
}

/** Retry retains interactionId but gets a new attempt and request. Never include a question or profile data. */
export function createAnswerAttempt(_feature: AnswerFeature, _locale: "vi" | "en", previousInteractionId?: string, clientRequestId?: string): AnswerCorrelation {
  return {
    interactionId: isOpaqueAnswerId(previousInteractionId) ? previousInteractionId : opaqueId("interaction"),
    attemptId: opaqueId("attempt"),
    clientRequestId: isOpaqueAnswerId(clientRequestId) ? clientRequestId : opaqueId("request"),
  };
}

export function parseAnswerCorrelation(value: unknown): AnswerCorrelation | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const v = value as Record<string, unknown>;
  if (!isOpaqueAnswerId(v.interactionId) || !isOpaqueAnswerId(v.attemptId) || !isOpaqueAnswerId(v.clientRequestId)) return;
  return { interactionId: v.interactionId, attemptId: v.attemptId, clientRequestId: v.clientRequestId };
}

const optionalIds = ["remoteId", "traceId", "providerRequestId", "promptVersionId", "promptVersion", "promptAssemblyVersion", "routeVersionId", "routeVersion", "responseSchema", "contentVersion", "calculationVersion", "chartContractVersion", "appVersion", "answerReceiptId"] as const;

export function parseAnswerProvenance(value: unknown, expected?: { feature?: AnswerFeature; locale?: "vi" | "en"; correlation?: AnswerCorrelation }): AnswerProvenance | undefined {
  const correlation = parseAnswerCorrelation(value);
  if (!correlation) return;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== answerProvenanceSchema || !["tarot_reading", "astrology_insight"].includes(String(v.feature))
    || !["vi", "en"].includes(String(v.locale)) || !["ai", "reference", "fallback", "blocked", "mock"].includes(String(v.sourceKind))
    || !["validated", "rejected", "not_applicable", "unknown"].includes(String(v.validationStatus))
    || !["stored", "failed", "skipped", "unknown"].includes(String(v.persistenceStatus))
    || typeof v.generatedAt !== "string" || v.generatedAt.length > 40 || !/^\d{4}-\d{2}-\d{2}T/.test(v.generatedAt) || !Number.isFinite(Date.parse(v.generatedAt))) return;
  if (expected?.feature && v.feature !== expected.feature || expected?.locale && v.locale !== expected.locale) return;
  if (expected?.correlation && Object.keys(correlation).some(key => correlation[key as keyof AnswerCorrelation] !== expected.correlation![key as keyof AnswerCorrelation])) return;
  if (v.sourceKind === "ai" && v.validationStatus !== "validated") return;
  const result = { ...correlation, schemaVersion: answerProvenanceSchema, feature: v.feature, locale: v.locale, sourceKind: v.sourceKind, generatedAt: v.generatedAt, validationStatus: v.validationStatus, persistenceStatus: v.persistenceStatus } as AnswerProvenance;
  for (const key of optionalIds) {
    if (v[key] === undefined) continue;
    if (!(key === "promptVersionId" ? isAnswerVersionRef(v[key]) : isOpaqueAnswerId(v[key]))) return;
    result[key] = v[key] as string;
  }
  if (v.reportRevision !== undefined) {
    if (!Number.isSafeInteger(v.reportRevision) || Number(v.reportRevision) < 1) return;
    result.reportRevision = Number(v.reportRevision);
  }
  return result;
}

export function answerCorrelationHeaders(value: AnswerCorrelation) {
  return { "x-nilaza-interaction-id": value.interactionId, "x-nilaza-attempt-id": value.attemptId, "x-nilaza-client-request-id": value.clientRequestId };
}

export function isIncompleteAnswerFinishReason(value: string | undefined) {
  return !!value && ["length", "max_tokens", "max_output_tokens", "content_filter"].includes(value.toLowerCase());
}
