import { mergeJournal } from "../../auth/personalData";
import type { JournalEntry } from "../../types";

export const journalStateKey = "nilaza.journalState.v1";
export type JournalMutation = { localId: string; revision: number } & (
  { operation: "upsert"; entry: JournalEntry } | { operation: "delete" }
);
export type JournalState = { schemaVersion: 1; revision: number; entries: JournalEntry[]; hiddenIds: string[]; pending: JournalMutation[] };
export type JournalAck = { status: "synced"; remoteId?: string; operation?: "upsert" | "delete"; localId?: string };

/** Duplicate callers share the actual outcome, including a failed disk write. */
export function createJournalSaveCoordinator() {
  const pending = new Map<string, Promise<boolean>>();
  return { run(key: string | null, save: () => Promise<boolean>): Promise<boolean> {
    if (!key) return Promise.resolve().then(save);
    const existing = pending.get(key);
    if (existing) return existing;
    const result = Promise.resolve().then(save).finally(() => { if (pending.get(key) === result) pending.delete(key); });
    pending.set(key, result);
    return result;
  } };
}

function entryValid(value: unknown): value is JournalEntry {
  const item = value as JournalEntry | null;
  return Boolean(item && typeof item.id === "string" && item.id.length > 0 &&
    typeof item.title === "string" && typeof item.summary === "string" && typeof item.createdAt === "string" &&
    ["daily", "chat", "tarot", "astrology", "manual", "share_card"].includes(item.sourceType));
}

/** Corrupt or future envelopes fail hydration; they must never become an empty save. */
export function readJournalState(value: unknown): JournalState {
  const state = value as JournalState | null;
  if (!state || state.schemaVersion !== 1 || !Number.isSafeInteger(state.revision) || state.revision < 0 ||
    !Array.isArray(state.entries) || !state.entries.every(entryValid) ||
    !Array.isArray(state.hiddenIds) || !state.hiddenIds.every(id => typeof id === "string") ||
    !Array.isArray(state.pending) || !state.pending.every(mutation => mutation &&
      typeof mutation.localId === "string" && Number.isSafeInteger(mutation.revision) && mutation.revision > 0 && mutation.revision <= state.revision &&
      (mutation.operation === "delete" || (mutation.operation === "upsert" && entryValid(mutation.entry) && mutation.entry.id === mutation.localId)))) throw new Error("Invalid Journal state");
  if (new Set(state.entries.map(entry => entry.id)).size !== state.entries.length ||
    new Set(state.pending.map(mutation => mutation.localId)).size !== state.pending.length) throw new Error("Duplicate Journal IDs");
  if (state.entries.some(entry => state.hiddenIds.includes(entry.id)) || state.pending.some(mutation =>
    mutation.operation === "delete" ? !state.hiddenIds.includes(mutation.localId) :
      !state.entries.some(entry => entry.id === mutation.localId) || state.hiddenIds.includes(mutation.localId))) throw new Error("Inconsistent Journal mutation state");
  return state;
}

export function createJournalRepository(options: {
  active: () => boolean; canSync: () => boolean;
  persist: (state: JournalState) => Promise<void>;
  send: (mutation: JournalMutation) => Promise<JournalAck>;
  onChange: (state: JournalState) => void;
  onLocalFailure: (context: "mutation" | "sync") => void; onSyncFailure: (failed: boolean) => void;
}) {
  let state: JournalState | null = null;
  let localQueue: Promise<unknown> = Promise.resolve();
  let syncing: Promise<boolean> | null = null;
  const current = () => {
    if (!options.active() || !state) throw new Error("Journal account is not ready");
    return state;
  };
  function ordered<T>(operation: () => Promise<T>): Promise<T> {
    const next = localQueue.then(operation);
    localQueue = next.catch(() => undefined);
    return next;
  }
  async function commit(next: JournalState, context: "mutation" | "sync" = "sync") {
    current();
    readJournalState(next);
    try { await options.persist(next); } catch (error) {
      if (options.active()) options.onLocalFailure(context);
      throw error;
    }
    current();
    state = next;
    options.onChange(next);
  }
  async function upsertNow(entry: JournalEntry) {
    const before = current(), revision = before.revision + 1;
    const nextEntry = { ...entry, syncStatus: "local" as const };
    await commit({ ...before, revision,
      entries: [nextEntry, ...before.entries.filter(item => item.id !== entry.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      hiddenIds: before.hiddenIds.filter(id => id !== entry.id),
      pending: [...before.pending.filter(item => item.localId !== entry.id), { operation: "upsert", localId: entry.id, revision, entry: nextEntry }]
    }, "mutation");
  }
  async function removeNow(ids: string[]) {
    const before = current(), unique = [...new Set(ids)];
    const pending = before.pending.filter(item => !unique.includes(item.localId));
    let revision = before.revision;
    unique.forEach(localId => pending.push({ operation: "delete", localId, revision: ++revision }));
    await commit({ ...before, revision, entries: before.entries.filter(entry => !unique.includes(entry.id)),
      hiddenIds: [...new Set([...before.hiddenIds, ...unique])], pending }, "mutation");
  }
  return {
    initialize(saved: unknown, legacy: JournalEntry[], hiddenIds: string[]) {
      if (!options.active()) return;
      if (saved !== null) state = readJournalState(saved);
      else {
        if (!legacy.every(entryValid)) throw new Error("Invalid legacy Journal");
        const hidden = [...new Set(hiddenIds)];
        const entries = legacy.filter(entry => !hidden.includes(entry.id));
        const pending: JournalMutation[] = [];
        let revision = 0;
        for (const entry of entries.filter(item => item.syncStatus !== "synced")) pending.push({ operation: "upsert", localId: entry.id, entry, revision: ++revision });
        for (const localId of hidden) pending.push({ operation: "delete", localId, revision: ++revision });
        state = readJournalState({ schemaVersion: 1, revision, entries, hiddenIds: hidden, pending });
      }
      options.onChange(state);
    },
    snapshot: () => current(),
    upsert(entry: JournalEntry) {
      if (!entryValid(entry)) return Promise.reject(new Error("Invalid Journal entry"));
      return ordered(() => upsertNow(entry));
    },
    update(id: string, patch: Partial<Pick<JournalEntry, "mood" | "userNote">>) {
      return ordered(async () => {
        const entry = current().entries.find(item => item.id === id);
        if (!entry) throw new Error("Journal entry is unavailable");
        await upsertNow({ ...entry, ...patch });
      });
    },
    remove(ids: string[]) {
      return ordered(() => removeNow(ids));
    },
    clear() {
      return ordered(() => removeNow(current().entries.map(entry => entry.id)));
    },
    mergeRemote(remote: JournalEntry[], baseline: JournalEntry[], deletedIds: string[] = []) {
      return ordered(async () => {
        const before = current();
        if (!deletedIds.every(id => typeof id === "string" && id.length > 0)) throw new Error("Invalid Journal tombstone");
        const deleted = new Set(deletedIds);
        const hiddenIds = [...new Set([...before.hiddenIds, ...deletedIds])];
        const pending = before.pending.filter(mutation => !deleted.has(mutation.localId));
        await commit({ ...before, hiddenIds, pending, entries: mergeJournal(before.entries, remote, hiddenIds, baseline) });
        if (pending.length === 0 && before.pending.some(mutation => deleted.has(mutation.localId))) options.onSyncFailure(false);
      });
    },
    flush(): Promise<boolean> {
      if (syncing) return syncing;
      if (!options.active() || !state || !options.canSync()) return Promise.resolve(false);
      syncing = (async () => {
        // Legacy pending work becomes durable before its first remote write.
        await ordered(() => commit(current()));
        while (options.active() && options.canSync()) {
          const mutation = current().pending[0];
          if (!mutation) { options.onSyncFailure(false); return true; }
          let ack: JournalAck;
          try {
            ack = await options.send(mutation);
            if (ack.status !== "synced" || (mutation.operation === "upsert" && !ack.remoteId) ||
              (mutation.operation === "delete" && (ack.operation !== "delete" || ack.localId !== mutation.localId))) throw new Error("Unacknowledged Journal mutation");
          } catch {
            // A verified remote tombstone or newer local edit supersedes this
            // request, including its failure. Continue with the final mutation.
            if (options.active() && state && !state.pending.some(item => item.localId === mutation.localId && item.revision === mutation.revision)) continue;
            if (options.active()) options.onSyncFailure(true);
            return false;
          }
          if (!options.active()) return false;
          await ordered(async () => {
            const before = current();
            // A newer edit/delete supersedes an in-flight ACK for this ID.
            if (!before.pending.some(item => item.localId === mutation.localId && item.revision === mutation.revision)) return;
            await commit({ ...before,
              pending: before.pending.filter(item => item.localId !== mutation.localId || item.revision !== mutation.revision),
              entries: mutation.operation === "upsert" ? before.entries.map(entry => entry.id === mutation.localId
                ? { ...entry, remoteId: ack.remoteId, syncStatus: "synced" as const } : entry) : before.entries
            });
          });
        }
        return false;
      })().catch(() => false).finally(() => { syncing = null; });
      return syncing;
    }
  };
}
