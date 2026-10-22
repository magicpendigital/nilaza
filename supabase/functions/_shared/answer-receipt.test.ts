import { writeAnswerReceipt, type AnswerReceiptInput } from "./answer-receipt.ts";
import { createFeedbackHandler } from "../ai-feedback/handler.ts";
const assert = (value: unknown) => { if (!value) throw Error("assertion failed"); };
const owner = "00000000-0000-4000-8000-000000000001";
const receiptId = "00000000-0000-4000-8000-000000000002";
const input: AnswerReceiptInput = { userId: owner, feature: "tarot_reading", locale: "vi", interactionId: "i-1", attemptId: "a-1", clientRequestId: "r-1", sourceKind: "ai", validationStatus: "validated", persistenceStatus: "stored", sectionIds: ["summary", "summary"], promptVersionId: "local:tarot_reading_system@v2:vi" };
const env = { get: (key: string) => key === "SUPABASE_URL" ? "https://synthetic.invalid" : "synthetic-service-key" };
Deno.test("receipt producer sends only allowlisted metadata with service auth and refuses redirects", async () => {
  let called = false;
  const result = await writeAnswerReceipt({ ...input, rawQuestion: "must-not-send" } as AnswerReceiptInput, { env, fetch: async (url, options) => {
    called = true;
    assert(String(url) === "https://synthetic.invalid/rest/v1/rpc/record_ai_answer_receipt");
    assert(options?.redirect === "error");
    assert(new Headers(options?.headers).get("Authorization") === "Bearer synthetic-service-key");
    const payload = JSON.parse(String(options?.body));
    assert(payload.owner_id === owner && payload.section_ids_input.length === 1);
    assert(!String(options?.body).includes("must-not-send"));
    assert(payload.metadata_input.promptVersionId === input.promptVersionId);
    return Response.json({ receiptId, createdAt: "2026-10-16T00:00:00Z" });
  } });
  assert(called && result?.receiptId === receiptId);
});
Deno.test("receipt producer fails softly for invalid input, missing config, errors and malformed acknowledgements", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; return Response.json({ receiptId: "wrong", createdAt: "today" }); };
  for (const value of [{ ...input, validationStatus: "rejected" }, { ...input, userId: "bad" }, { ...input, sectionIds: ["private words"] }])
    assert(await writeAnswerReceipt(value as AnswerReceiptInput, { env, fetch: fetcher }) === null);
  assert(await writeAnswerReceipt(input, { env: { get: () => undefined }, fetch: fetcher }) === null);
  assert(calls === 0);
  assert(await writeAnswerReceipt(input, { env, fetch: fetcher }) === null);
  assert(await writeAnswerReceipt(input, { env, fetch: async () => { throw Error("private upstream error"); } }) === null);
});
const payload = { schemaVersion: "ai-feedback-v1", clientFeedbackId: owner, feature: "tarot_reading", localAnswerId: "r-1", category: "too_generic", language: "vi" };
const ack = { schemaVersion: "ai-feedback-v1", clientFeedbackId: owner, feedbackId: receiptId, receivedAt: "2026-10-16T00:00:00Z", correlationStatus: "unverified_client" };
const req = (body: unknown = payload, auth = true) => new Request("https://synthetic.invalid/ai-feedback", { method: "POST", headers: { "Content-Type": "application/json", ...(auth ? { Authorization: "Bearer synthetic-user" } : {}) }, body: JSON.stringify(body) });
function handler(data: unknown = ack, error?: { code?: string; message?: string }, anonymous = false) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const run = createFeedbackHandler(() => ({ authenticate: async () => ({ id: owner, isAnonymous: anonymous }), rpc: async (name, args) => { calls.push({ name, args }); return { data, error }; } }));
  return { calls, run };
}
Deno.test("feedback authenticates before reading payload and enforces metadata-only body", async () => {
  const h = handler();
  const unauth = req(payload, false);
  assert((await h.run(unauth)).status === 401 && !unauth.bodyUsed);
  assert((await handler(ack, undefined, true).run(req())).status === 401);
  for (const extra of [{ notes: "private" }, { provenance: {} }, { operation: "export", notes: "private" }])
    assert((await h.run(req({ ...payload, ...extra }))).status === 400);
  assert(h.calls.length === 0);
  assert((await h.run(req({ ...payload, localAnswerId: "x".repeat(33000) }))).status === 413);
});
Deno.test("feedback requires matching acknowledgement and never returns raw RPC errors", async () => {
  const h = handler(); const response = await h.run(req());
  assert(response.status === 200 && response.headers.get("Cache-Control") === "no-store");
  assert(h.calls[0].name === "submit_ai_feedback");
  assert((await handler({ ...ack, clientFeedbackId: receiptId }).run(req())).status === 502);
  for (const [message, status] of [["feedback_conflict", 409], ["feedback_rate_limited", 429], ["answer_receipt_unavailable", 400], ["private SQL error", 503]] as const) {
    const result = await handler(null, { message }).run(req());
    assert(result.status === status && !(await result.text()).includes("private SQL error"));
  }
});
Deno.test("feedback own export/delete enforce exact commands and response shape", async () => {
  const h = handler(2);
  assert((await h.run(req({ operation: "delete_all" }))).status === 200);
  assert(h.calls[0].args.feedback_id_input === null);
  assert((await h.run(req({ operation: "delete", feedbackId: receiptId }))).status === 200);
  assert(h.calls[1].args.feedback_id_input === receiptId);
  assert((await h.run(req({ operation: "delete_all", userId: receiptId }))).status === 400);
  assert((await handler(-1).run(req({ operation: "delete_all" }))).status === 502);
  assert((await handler([]).run(req({ operation: "export" }))).status === 200);
  assert((await handler([{ notes: "private" }]).run(req({ operation: "export" }))).status === 502);
});
