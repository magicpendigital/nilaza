import { AccountScope } from "../../../auth/accountScope";
import { createFeedbackQueue, feedbackStorageKey, readFeedbackQueue, type FeedbackQueueState } from "../feedbackQueue";
import { AI_FEEDBACK_SCHEMA, type FeedbackSubmission, type FeedbackReceipt } from "../../../../../../packages/ai-contracts/feedback";

const scopeFor = (id = "qa-account") => new AccountScope({ status: "signed_in", user: { id } } as any);
const input = { feature: "tarot_reading" as const, localAnswerId: "request_synthetic", category: "too_generic" as const, language: "vi" as const, sourceKind: "reference" as const };
const now = () => new Date("2026-10-14T12:00:00Z");
const receipt = (payload: FeedbackSubmission): FeedbackReceipt => ({ schemaVersion: AI_FEEDBACK_SCHEMA, clientFeedbackId: payload.clientFeedbackId,
  feedbackId: "11111111-1111-4111-8111-111111111111", receivedAt: now().toISOString(), correlationStatus: "unverified_client" });
function memory(initial: unknown = null) {
  let value = initial;
  return { read: () => value as FeedbackQueueState, storage: {
    loadJson: jest.fn(async () => value), saveJsonOrThrow: jest.fn(async (_key, next) => { value = JSON.parse(JSON.stringify(next)); }),
  } as any };
}

test("durable enqueue precedes network, retries reuse one ID and a receipt is required", async () => {
  const mem = memory(), scope = scopeFor();
  const send = jest.fn(async (payload: FeedbackSubmission) => {
    expect(mem.read().items[0].status).toBe("sending");
    if (send.mock.calls.length === 1) throw { code: "network_unavailable" };
    return receipt(payload);
  });
  const queue = createFeedbackQueue({ storage: mem.storage, scope, send, now });
  const item = await queue.enqueue(input);
  expect(send).not.toHaveBeenCalled();
  expect(mem.read().items[0].status).toBe("queued");
  expect((await queue.deliver(item.payload.clientFeedbackId)).status).toBe("queued");
  const reopened = createFeedbackQueue({ storage: mem.storage, scope, send, now });
  await reopened.retryQueued(input);
  expect(send.mock.calls[0][0]).toEqual(send.mock.calls[1][0]);
  expect(mem.read().items[0].status).toBe("sent");
  expect(mem.read().items[0].receipt?.clientFeedbackId).toBe(item.payload.clientFeedbackId);
  expect((await reopened.enqueue(input)).payload.clientFeedbackId).toBe(item.payload.clientFeedbackId);
  await reopened.deliver(item.payload.clientFeedbackId);
  expect(send).toHaveBeenCalledTimes(2);
});

test("disk failure prevents a new submission and concurrent delivery cannot double send", async () => {
  const mem = memory(), scope = scopeFor(), send = jest.fn(async (payload: FeedbackSubmission) => receipt(payload));
  const queue = createFeedbackQueue({ storage: mem.storage, scope, send, now });
  mem.storage.saveJsonOrThrow.mockRejectedValueOnce(new Error("synthetic disk full"));
  await expect(queue.enqueue(input)).rejects.toMatchObject({ code: "storage_write_failed" });
  expect(send).not.toHaveBeenCalled();
  const [first, duplicate] = await Promise.all([queue.enqueue(input), queue.enqueue(input)]);
  expect(first.payload.clientFeedbackId).toBe(duplicate.payload.clientFeedbackId);
  await Promise.all([queue.deliver(first.payload.clientFeedbackId), queue.deliver(first.payload.clientFeedbackId)]);
  expect(send).toHaveBeenCalledTimes(1);
});

test("mismatched receipt is failed, expired answer link stays explicit, private text is rejected", async () => {
  const mem = memory(), scope = scopeFor();
  const send = jest.fn(async (payload: FeedbackSubmission) => ({ ...receipt(payload), clientFeedbackId: "22222222-2222-4222-8222-222222222222" }));
  const queue = createFeedbackQueue({ storage: mem.storage, scope, send, now });
  const item = await queue.enqueue(input);
  expect(await queue.deliver(item.payload.clientFeedbackId)).toMatchObject({ status: "failed", failure: "invalid_receipt" });
  send.mockRejectedValueOnce({ code: "answer_receipt_unavailable" });
  expect(await queue.deliver(item.payload.clientFeedbackId)).toMatchObject({ status: "failed", failure: "answer_receipt_unavailable" });
  await expect(queue.enqueue({ ...input, rawAnswer: "never send" } as any)).rejects.toMatchObject({ code: "invalid_submission" });
  expect(mem.read().items).toHaveLength(1);
});

test("account closure rejects a delayed response without acknowledging it in another account", async () => {
  const a = memory(), b = memory(), scope = scopeFor("A");
  let complete: (value: FeedbackReceipt) => void = () => {};
  const send = jest.fn((_: FeedbackSubmission) => new Promise<FeedbackReceipt>(resolve => { complete = resolve; }));
  const queue = createFeedbackQueue({ storage: a.storage, scope, send, now });
  const item = await queue.enqueue(input), pending = queue.deliver(item.payload.clientFeedbackId);
  while (!send.mock.calls.length) await Promise.resolve();
  scope.close(); complete(receipt(item.payload));
  await expect(pending).rejects.toMatchObject({ code: "session_closed" });
  const other = createFeedbackQueue({ storage: b.storage, scope: scopeFor("B"), send, now });
  expect((await other.load()).items).toHaveLength(0);
  expect(a.read().items[0].receipt).toBeUndefined();
});

test("a failed local receipt write recovers by replaying the same submission", async () => {
  const mem = memory(), scope = scopeFor(), send = jest.fn(async (payload: FeedbackSubmission) => receipt(payload));
  const queue = createFeedbackQueue({ storage: mem.storage, scope, send, now });
  const item = await queue.enqueue(input);
  const original = mem.storage.saveJsonOrThrow.getMockImplementation();
  mem.storage.saveJsonOrThrow.mockImplementation(async (key: string, state: FeedbackQueueState) => {
    if (state.items[0]?.status === "sent") { mem.storage.saveJsonOrThrow.mockImplementation(original); throw new Error("disk full after ack"); }
    return original(key, state);
  });
  await expect(queue.deliver(item.payload.clientFeedbackId)).rejects.toMatchObject({ code: "receipt_not_saved" });
  const reopened = createFeedbackQueue({ storage: mem.storage, scope, send, now });
  expect((await reopened.load()).items[0].status).toBe("queued");
  await reopened.retryQueued(input);
  expect(send.mock.calls[0][0].clientFeedbackId).toBe(send.mock.calls[1][0].clientFeedbackId);
  expect(mem.read().items[0].status).toBe("sent");
});

test("bounded retention removes expired records and corrupt data is never overwritten", async () => {
  const mem = memory(), scope = scopeFor(), send = jest.fn(async (payload: FeedbackSubmission) => receipt(payload));
  const queue = createFeedbackQueue({ storage: mem.storage, scope, send, now });
  const item = await queue.enqueue(input);
  const full = Array.from({ length: 50 }, (_, index) => ({ ...item, payload: { ...item.payload, clientFeedbackId: `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`, localAnswerId: `answer_${index}` } }));
  await mem.storage.saveJsonOrThrow(feedbackStorageKey, { schemaVersion: 1, items: full });
  await expect(queue.enqueue(input)).rejects.toMatchObject({ code: "queue_full" });
  const expired = createFeedbackQueue({ storage: mem.storage, scope, send, now: () => new Date("2026-12-01T00:00:00Z") });
  expect((await expired.load()).items).toHaveLength(0);
  const bad = memory({ schemaVersion: 999, items: [] });
  await expect(createFeedbackQueue({ storage: bad.storage, scope: scopeFor(), send }).load()).rejects.toMatchObject({ code: "invalid_queue" });
  expect(bad.storage.saveJsonOrThrow).not.toHaveBeenCalled();
  expect(() => readFeedbackQueue({ schemaVersion: 1, items: [{ ...item, rawAnswer: "private" }] })).toThrow();
});

test("durable delete intent prevents a failed local cleanup from recreating deleted server feedback", async () => {
  const mem = memory(), scope = scopeFor(), send = jest.fn(async (payload: FeedbackSubmission) => receipt(payload));
  const queue = createFeedbackQueue({ storage: mem.storage, scope, send, now });
  await queue.enqueue(input);
  const original = mem.storage.saveJsonOrThrow.getMockImplementation();
  const deleteServer = jest.fn(async () => {
    expect(mem.read().deletionPending).toBe(true);
    mem.storage.saveJsonOrThrow.mockRejectedValueOnce(new Error("final clear failed"));
  });
  await expect(queue.deleteAll(deleteServer)).rejects.toMatchObject({ code: "delete_not_saved" });
  expect(mem.read().deletionPending).toBe(true);
  const reopened = createFeedbackQueue({ storage: mem.storage, scope, send, now });
  await reopened.retryQueued(input);
  expect(send).not.toHaveBeenCalled();
  await expect(reopened.enqueue({ ...input, category: "unclear" })).rejects.toMatchObject({ code: "deletion_pending" });
  mem.storage.saveJsonOrThrow.mockImplementation(original);
  await reopened.deleteAll(async () => {});
  expect(mem.read()).toEqual({ schemaVersion: 1, items: [] });
});
