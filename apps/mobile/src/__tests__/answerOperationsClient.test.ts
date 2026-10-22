import { generateTarotReading, submitAiFeedback, deleteAllAiFeedback } from "../backendClient";
import { createAnswerAttempt } from "../../../../packages/ai-contracts/answer-provenance";
import { AccountScope } from "../auth/accountScope";

const options = { baseUrl: "https://synthetic.invalid/functions/v1", authToken: "synthetic-token" };
const payload = { schemaVersion: "ai-feedback-v1" as const, clientFeedbackId: "00000000-0000-4000-8000-000000000001", feature: "tarot_reading" as const, localAnswerId: "reading_1", category: "too_generic" as const, language: "vi" as const };
const receipt = { schemaVersion: "ai-feedback-v1", clientFeedbackId: payload.clientFeedbackId, feedbackId: "00000000-0000-4000-8000-000000000002", receivedAt: "2026-10-14T00:00:00Z", correlationStatus: "unverified_client" };
const originalFetch = global.fetch;
beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; });

test("feedback validates payload and matching receipt before acknowledging delivery", async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => receipt });
  expect(await submitAiFeedback(payload, options)).toEqual(receipt);
  expect((fetch as jest.Mock).mock.calls[0][0]).toBe("https://synthetic.invalid/functions/v1/ai-feedback");
  expect(JSON.parse((fetch as jest.Mock).mock.calls[0][1].body)).toEqual(payload);
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ ...receipt, clientFeedbackId: "00000000-0000-4000-8000-000000000003" }) });
  await expect(submitAiFeedback(payload, options)).rejects.toMatchObject({ code: "invalid_feedback_receipt" });
  await expect(submitAiFeedback({ ...payload, note: "private content" } as any, options)).rejects.toMatchObject({ code: "invalid_feedback" });
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("feedback network failure stays distinguishable from server rejection or invalid delete acknowledgement", async () => {
  (fetch as jest.Mock).mockRejectedValueOnce(new Error("offline"));
  await expect(submitAiFeedback(payload, options)).rejects.toMatchObject({ code: "network_unavailable" });
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) });
  await expect(submitAiFeedback(payload, options)).rejects.toMatchObject({ code: "rate_limited" });
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ status: "ok" }) });
  await expect(deleteAllAiFeedback(options)).rejects.toMatchObject({ code: "invalid_feedback_receipt" });
});

test("feedback completion cannot cross an account boundary while JSON is being read", async () => {
  const scope = new AccountScope({ status: "signed_in", user: { id: "user-a" }, backendSession: { accessToken: "a" } } as any);
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => { scope.close(); return receipt; } });
  await expect(submitAiFeedback(payload, { ...options, session: scope })).rejects.toMatchObject({ code: "account_closed" });
});

test("Tarot sends retry correlation, accepts local prompt reference, and rejects another attempt", async () => {
  const first = createAnswerAttempt("tarot_reading", "en"), retry = createAnswerAttempt("tarot_reading", "en", first.interactionId);
  const input = { language: "en", selectedCards: [{ id: "major-00-fool" }], deck: {}, topic: "open", spread: "daily-one", question: "Reflect?" } as any;
  const provenance = { schemaVersion: "nilaza.answer-provenance.v1", ...retry, feature: "tarot_reading", locale: "en", sourceKind: "ai", generatedAt: "2026-10-14T00:00:00Z", validationStatus: "validated", persistenceStatus: "stored", promptVersionId: "local:tarot_reading_system@v1:en" };
  const result = { summary: "Summary", reflection: "Question?", sections: [{ key: "theme", title: { en: "Theme" }, body: { en: "Grounded detail" }, cardIds: ["major-00-fool"] }], moderationStatus: "passed", provenance };
  const fallback = () => ({ summary: "Reference", reflection: "Question?", moderationStatus: "fallback" as const });
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => result });
  expect((await generateTarotReading(input, fallback, options, retry)).provenance?.attemptId).toBe(retry.attemptId);
  expect((fetch as jest.Mock).mock.calls[0][1].headers["x-nilaza-interaction-id"]).toBe(first.interactionId);
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ ...result, provenance: { ...provenance, attemptId: first.attemptId } }) });
  expect((await generateTarotReading(input, fallback, options, retry)).provenance?.validationStatus).toBe("rejected");
});
