import type { AccountScope } from "../../auth/accountScope";
import type { AccountStorage } from "../../auth/accountStorage";
import {
  AI_FEEDBACK_SCHEMA, parseFeedbackSubmission, parseFeedbackReceipt,
  type FeedbackSubmission, type FeedbackReceipt,
} from "../../../../../packages/ai-contracts/feedback";

export const feedbackStorageKey = "nilaza.aiFeedback.v1";
export const feedbackRetentionDays = 30;
export const feedbackQueueLimit = 50;
export type FeedbackQueueItem = {
  payload: FeedbackSubmission;
  status: "queued" | "sending" | "sent" | "failed";
  createdAt: string;
  updatedAt: string;
  attempts: number;
  receipt?: FeedbackReceipt;
  failure?: "network" | "rejected" | "invalid_receipt" | "answer_receipt_unavailable";
};
export type FeedbackQueueState = { schemaVersion: 1; items: FeedbackQueueItem[]; deletionPending?: true };
export type FeedbackTarget = Pick<FeedbackSubmission, "feature" | "localAnswerId">;
type Storage = Pick<AccountStorage, "loadJson" | "saveJsonOrThrow">;
export class FeedbackQueueError extends Error {
  constructor(readonly code: "session_closed" | "invalid_queue" | "invalid_submission" | "queue_full" | "storage_write_failed" | "receipt_not_saved" | "queue_busy" | "deletion_pending" | "delete_not_saved") { super(code); }
}
const locks = new WeakMap<AccountScope, Promise<unknown>>();
const inFlight = new WeakMap<AccountScope, Map<string, Promise<FeedbackQueueItem>>>();
const controls = new WeakMap<AccountScope, { deleting: boolean }>();
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const timestamp = (value: unknown) => typeof value === "string" && value.length <= 40 && Number.isFinite(Date.parse(value));
const fresh = (): FeedbackQueueState => ({ schemaVersion: 1, items: [] });

/** Refuse corrupt state instead of replacing a queue with an empty success. */
export function readFeedbackQueue(value: unknown): FeedbackQueueState {
  if (value === null || value === undefined) return fresh();
  if (!object(value) || value.schemaVersion !== 1 || Object.keys(value).some(key => !["schemaVersion", "items", "deletionPending"].includes(key))
    || value.deletionPending !== undefined && value.deletionPending !== true
    || !Array.isArray(value.items) || value.items.length > feedbackQueueLimit) throw new FeedbackQueueError("invalid_queue");
  const ids = new Set<string>();
  const items = value.items.map(raw => {
    if (!object(raw) || Object.keys(raw).some(key => !["payload", "status", "createdAt", "updatedAt", "attempts", "receipt", "failure"].includes(key))) throw new FeedbackQueueError("invalid_queue");
    const payload = parseFeedbackSubmission(raw.payload);
    const receipt = raw.receipt === undefined ? undefined : parseFeedbackReceipt(raw.receipt, payload?.clientFeedbackId);
    if (!payload || ids.has(payload.clientFeedbackId) || !["queued", "sending", "sent", "failed"].includes(String(raw.status))
      || !timestamp(raw.createdAt) || !timestamp(raw.updatedAt) || !Number.isSafeInteger(raw.attempts) || Number(raw.attempts) < 0
      || raw.receipt !== undefined && !receipt || raw.status === "sent" && !receipt
      || raw.status !== "sent" && receipt || raw.failure !== undefined && !["network", "rejected", "invalid_receipt", "answer_receipt_unavailable"].includes(String(raw.failure))) throw new FeedbackQueueError("invalid_queue");
    ids.add(payload.clientFeedbackId);
    return { payload, status: raw.status, createdAt: raw.createdAt, updatedAt: raw.updatedAt, attempts: raw.attempts,
      ...(receipt ? { receipt } : {}), ...(raw.failure ? { failure: raw.failure } : {}) } as FeedbackQueueItem;
  });
  return { schemaVersion: 1, items, ...(value.deletionPending ? { deletionPending: true } : {}) };
}

export function newFeedbackId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // A random identifier only, never an authentication token or authority claim.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
    const random = Math.floor(Math.random() * 16);
    return (char === "x" ? random : (random & 3) | 8).toString(16);
  });
}
const sameTarget = (item: FeedbackQueueItem, target: FeedbackTarget) => item.payload.feature === target.feature && item.payload.localAnswerId === target.localAnswerId;
function sameSubmission(first: FeedbackSubmission, second: FeedbackSubmission) {
  return ["feature", "localAnswerId", "answerReceiptId", "sectionId", "category", "language", "sourceKind"].every(key => first[key as keyof FeedbackSubmission] === second[key as keyof FeedbackSubmission]);
}

export function createFeedbackQueue(options: {
  storage: Storage; scope: AccountScope;
  send: (payload: FeedbackSubmission) => Promise<FeedbackReceipt>;
  now?: () => Date;
}) {
  const { storage, scope } = options;
  const now = () => options.now?.() ?? new Date();
  const active = () => { if (!scope.active || !scope.userId) throw new FeedbackQueueError("session_closed"); };
  const flight = inFlight.get(scope) ?? new Map<string, Promise<FeedbackQueueItem>>();
  const control = controls.get(scope) ?? { deleting: false };
  inFlight.set(scope, flight);
  controls.set(scope, control);
  const ordered = <T>(operation: () => Promise<T>): Promise<T> => {
    const pending = (locks.get(scope) ?? Promise.resolve()).catch(() => undefined).then(() => { active(); return operation(); });
    locks.set(scope, pending.catch(() => undefined));
    return pending;
  };
  const read = async () => {
    active();
    const state = readFeedbackQueue(await storage.loadJson<unknown>(feedbackStorageKey, null));
    active();
    const cutoff = now().getTime() - feedbackRetentionDays * 86400000;
    return { ...state, items: state.items.filter(item => Date.parse(item.createdAt) >= cutoff).map(item =>
      item.status === "sending" && !flight.has(item.payload.clientFeedbackId) ? { ...item, status: "queued" as const } : item) };
  };
  const write = async (state: FeedbackQueueState) => {
    active();
    try { await storage.saveJsonOrThrow(feedbackStorageKey, state); }
    catch { active(); throw new FeedbackQueueError("storage_write_failed"); }
    active();
  };
  const load = () => ordered(async () => {
    const state = await read();
    await write(state); // Persist expiry/recovery, including after an interrupted app process.
    return state;
  });
  const enqueue = (input: Omit<FeedbackSubmission, "schemaVersion" | "clientFeedbackId">) => ordered(async () => {
    if (control.deleting) throw new FeedbackQueueError("queue_busy");
    const payload = parseFeedbackSubmission({ ...input, schemaVersion: AI_FEEDBACK_SCHEMA, clientFeedbackId: newFeedbackId() });
    if (!payload) throw new FeedbackQueueError("invalid_submission");
    const state = await read();
    if (state.deletionPending) throw new FeedbackQueueError("deletion_pending");
    const duplicate = state.items.find(item => sameSubmission(item.payload, payload));
    if (duplicate) return duplicate;
    while (state.items.length >= feedbackQueueLimit) {
      const sent = state.items.findIndex(item => item.status === "sent");
      if (sent < 0) throw new FeedbackQueueError("queue_full");
      state.items.splice(sent, 1);
    }
    const date = now().toISOString();
    const item: FeedbackQueueItem = { payload, status: "queued", createdAt: date, updatedAt: date, attempts: 0 };
    await write({ schemaVersion: 1, items: [...state.items, item] });
    return item;
  });
  const deliver = (clientFeedbackId: string): Promise<FeedbackQueueItem> => {
    if (control.deleting) return Promise.reject(new FeedbackQueueError("queue_busy"));
    const existing = flight.get(clientFeedbackId);
    if (existing) return existing;
    const operation = (async () => {
      const sending = await ordered(async () => {
        if (control.deleting) throw new FeedbackQueueError("queue_busy");
        const state = await read();
        if (state.deletionPending) throw new FeedbackQueueError("deletion_pending");
        const item = state.items.find(entry => entry.payload.clientFeedbackId === clientFeedbackId);
        if (!item) throw new FeedbackQueueError("invalid_submission");
        if (item.status === "sent") return item;
        const next = { ...item, status: "sending" as const, failure: undefined, attempts: item.attempts + 1, updatedAt: now().toISOString() };
        await write({ schemaVersion: 1, items: state.items.map(entry => entry === item ? next : entry) });
        return next;
      });
      if (sending.status === "sent") return sending;
      active();
      let receipt: FeedbackReceipt | undefined;
      let failure: FeedbackQueueItem["failure"];
      try {
        const response = await options.send(sending.payload);
        active();
        receipt = parseFeedbackReceipt(response, clientFeedbackId);
        if (!receipt) failure = "invalid_receipt";
      } catch (error) {
        active();
        const code = String((error as { code?: string })?.code);
        failure = ["network_unavailable", "request_timeout"].includes(code) ? "network" : code === "answer_receipt_unavailable" ? code : "rejected";
      }
      return ordered(async () => {
        const state = await read();
        const current = state.items.find(item => item.payload.clientFeedbackId === clientFeedbackId);
        if (!current) throw new FeedbackQueueError("invalid_submission");
        const next: FeedbackQueueItem = { ...current, updatedAt: now().toISOString(),
          status: receipt ? "sent" : failure === "network" ? "queued" : "failed",
          ...(receipt ? { receipt, failure: undefined } : { failure }),
        };
        try { await write({ schemaVersion: 1, items: state.items.map(item => item === current ? next : item) }); }
        catch (error) { if (receipt && scope.active) throw new FeedbackQueueError("receipt_not_saved"); throw error; }
        return next;
      });
    })();
    flight.set(clientFeedbackId, operation);
    void operation.finally(() => { if (flight.get(clientFeedbackId) === operation) flight.delete(clientFeedbackId); }).catch(() => undefined);
    return operation;
  };
  const retryQueued = async (target: FeedbackTarget) => {
    const state = await load();
    if (state.deletionPending) return state;
    for (const item of state.items.filter(entry => sameTarget(entry, target) && entry.status === "queued").slice(0, 3)) {
      active();
      const result = await deliver(item.payload.clientFeedbackId);
      if (result.status !== "sent") break;
    }
    return load();
  };
  const deleteAll = async (deleteServer: () => Promise<void>) => {
    active();
    if (control.deleting) throw new FeedbackQueueError("queue_busy");
    control.deleting = true;
    try {
      // Finish accepted sends before deleting, so a late receipt cannot recreate local state.
      await Promise.allSettled([...flight.values()]);
      active();
      // Durable deletion intent prevents a crash or failed final write from replaying old submissions.
      await ordered(async () => write({ ...await read(), deletionPending: true }));
      await deleteServer();
      active();
      try { await ordered(() => write(fresh())); }
      catch { active(); throw new FeedbackQueueError("delete_not_saved"); }
    } finally { control.deleting = false; }
  };
  return { load, enqueue, deliver, retryQueued, deleteAll };
}
