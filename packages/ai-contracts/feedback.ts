import { isOpaqueAnswerId, type AnswerFeature, type AnswerProvenance } from "./answer-provenance.ts";

export const AI_FEEDBACK_SCHEMA = "ai-feedback-v1" as const;
export const FEEDBACK_CATEGORIES = ["too_generic", "incorrect_facts", "unclear", "inappropriate", "language", "technical"] as const;
export type FeedbackCategory = typeof FEEDBACK_CATEGORIES[number];
export type FeedbackSubmission = {
  schemaVersion: typeof AI_FEEDBACK_SCHEMA;
  clientFeedbackId: string;
  feature: AnswerFeature;
  localAnswerId: string;
  answerReceiptId?: string;
  sectionId?: string;
  category: FeedbackCategory;
  language: "vi" | "en";
  /** A user/client claim. Never proof of provider execution. */
  sourceKind?: AnswerProvenance["sourceKind"];
};
export type FeedbackReceipt = {
  schemaVersion: typeof AI_FEEDBACK_SCHEMA;
  clientFeedbackId: string;
  feedbackId: string;
  receivedAt: string;
  correlationStatus: "verified_server" | "unverified_client";
};
export type FeedbackExportItem = FeedbackSubmission & FeedbackReceipt & {
  status: "open" | "investigating" | "resolved" | "dismissed";
  revision: number;
};
export type FeedbackExport = { schemaVersion: typeof AI_FEEDBACK_SCHEMA; items: FeedbackExportItem[] };
export const isFeedbackUuid = (value: unknown): value is string => typeof value === "string"
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const submissionKeys = new Set(["schemaVersion", "clientFeedbackId", "feature", "localAnswerId", "answerReceiptId", "sectionId", "category", "language", "sourceKind"]);

/** Strict metadata-only boundary. Reject excerpts, notes and arbitrary nested provenance. */
export function parseFeedbackSubmission(value: unknown): FeedbackSubmission | undefined {
  if (!object(value) || Object.keys(value).some(key => !submissionKeys.has(key))) return;
  if (value.schemaVersion !== AI_FEEDBACK_SCHEMA || !isFeedbackUuid(value.clientFeedbackId)
    || !["tarot_reading", "astrology_insight"].includes(String(value.feature))
    || !isOpaqueAnswerId(value.localAnswerId) || !FEEDBACK_CATEGORIES.includes(value.category as FeedbackCategory)
    || !["vi", "en"].includes(String(value.language))) return;
  if (value.answerReceiptId !== undefined && !isFeedbackUuid(value.answerReceiptId)
    || value.sectionId !== undefined && !isOpaqueAnswerId(value.sectionId)
    || value.sourceKind !== undefined && !["ai", "reference", "fallback", "blocked", "mock"].includes(String(value.sourceKind))) return;
  return { ...value } as FeedbackSubmission;
}

export function parseFeedbackReceipt(value: unknown, expectedClientFeedbackId?: string): FeedbackReceipt | undefined {
  if (!object(value) || value.schemaVersion !== AI_FEEDBACK_SCHEMA || !isFeedbackUuid(value.clientFeedbackId)
    || !isFeedbackUuid(value.feedbackId) || expectedClientFeedbackId !== undefined && value.clientFeedbackId !== expectedClientFeedbackId
    || !["verified_server", "unverified_client"].includes(String(value.correlationStatus))
    || typeof value.receivedAt !== "string" || value.receivedAt.length > 40 || !Number.isFinite(Date.parse(value.receivedAt))) return;
  return { schemaVersion: AI_FEEDBACK_SCHEMA, clientFeedbackId: value.clientFeedbackId, feedbackId: value.feedbackId,
    receivedAt: value.receivedAt, correlationStatus: value.correlationStatus as FeedbackReceipt["correlationStatus"] };
}

export function parseFeedbackExport(value: unknown): FeedbackExport | undefined {
  if (!object(value) || value.schemaVersion !== AI_FEEDBACK_SCHEMA || !Array.isArray(value.items) || value.items.length > 3000) return;
  const items: FeedbackExportItem[] = [];
  for (const raw of value.items) {
    if (!object(raw)) return;
    const submitted = Object.fromEntries(Object.entries(raw).filter(([key]) => submissionKeys.has(key)));
    const submission = parseFeedbackSubmission(submitted), receipt = parseFeedbackReceipt(raw);
    if (!submission || !receipt || !["open", "investigating", "resolved", "dismissed"].includes(String(raw.status))
      || !Number.isSafeInteger(raw.revision) || Number(raw.revision) < 1) return;
    items.push({ ...submission, ...receipt, status: raw.status as FeedbackExportItem["status"], revision: Number(raw.revision) });
  }
  return { schemaVersion: AI_FEEDBACK_SCHEMA, items };
}
