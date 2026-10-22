import { isAnswerVersionRef, isOpaqueAnswerId, type AnswerProvenance } from "../../../packages/ai-contracts/answer-provenance.ts";
import { isFeedbackUuid } from "../../../packages/ai-contracts/feedback.ts";

export type AnswerReceiptInput = Omit<AnswerProvenance, "schemaVersion" | "generatedAt" | "appVersion" | "answerReceiptId"> & {
  userId: string;
  sectionIds: string[];
  promptAssemblyVersion?: string;
};
type Dependencies = { env?: { get?: (name: string) => string | undefined }; fetch?: typeof fetch };
const metadataKeys = ["feature", "interactionId", "attemptId", "clientRequestId", "locale", "sourceKind", "validationStatus", "persistenceStatus", "remoteId", "traceId", "providerRequestId", "promptVersionId", "promptVersion", "routeVersionId", "routeVersion", "responseSchema", "contentVersion", "calculationVersion", "chartContractVersion", "reportRevision", "promptAssemblyVersion"] as const;

/** Service-only producer. Never pass a user client or user Authorization header here.
 * Receipt metadata confirms this producer's observations, not legacy trace content. */
export async function writeAnswerReceipt(input: AnswerReceiptInput, deps: Dependencies = {}): Promise<{ receiptId: string; createdAt: string } | null> {
  const get = (key: string) => deps.env?.get ? deps.env.get(key) : typeof Deno === "undefined" ? undefined : Deno.env.get(key);
  const base = get("SUPABASE_URL"), key = get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key || !isFeedbackUuid(input.userId)) return null;
  let url: URL;
  try {
    url = new URL(base);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/"
      || url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) return null;
  } catch { return null; }
  if (!["tarot_reading", "astrology_insight"].includes(input.feature) || !["vi", "en"].includes(input.locale)
    || !["ai", "reference", "fallback", "blocked", "mock"].includes(input.sourceKind)
    || !["validated", "rejected", "not_applicable", "unknown"].includes(input.validationStatus)
    || !["stored", "failed", "skipped", "unknown"].includes(input.persistenceStatus)
    || input.sourceKind === "ai" && input.validationStatus !== "validated"
    || ![input.interactionId, input.attemptId, input.clientRequestId].every(isOpaqueAnswerId)
    || !Array.isArray(input.sectionIds) || input.sectionIds.length > 64 || !input.sectionIds.every(isOpaqueAnswerId)) return null;
  const metadata: Record<string, unknown> = {};
  for (const name of metadataKeys) {
    const value = input[name];
    if (value === undefined) continue;
    if (name === "reportRevision") {
      if (!Number.isSafeInteger(value) || Number(value) < 1) return null;
    } else if (name === "promptVersionId" ? !isAnswerVersionRef(value) : !isOpaqueAnswerId(value)) return null;
    metadata[name] = value;
  }
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await (deps.fetch ?? fetch)(new URL("rest/v1/rpc/record_ai_answer_receipt", url), {
      method: "POST", redirect: "error", signal: controller.signal,
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ owner_id: input.userId, metadata_input: metadata, section_ids_input: [...new Set(input.sectionIds)] })
    });
    if (!response.ok) return null;
    const body = await response.json();
    if (!isFeedbackUuid(body?.receiptId) || typeof body.createdAt !== "string" || !Number.isFinite(Date.parse(body.createdAt))) return null;
    return { receiptId: body.receiptId, createdAt: body.createdAt };
  } catch { return null; }
  finally { clearTimeout(timeout); }
}
