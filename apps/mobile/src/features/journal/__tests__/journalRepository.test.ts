import { createJournalRepository, createJournalSaveCoordinator, JournalAck, JournalMutation, JournalState, readJournalState } from "../journalRepository";
import type { JournalEntry } from "../../../types";

const entry = (id = "one"): JournalEntry => ({ id, sourceType: "manual", title: "QA note", summary: "Fictional reflection", createdAt: "2026-10-01T00:00:00Z", syncStatus: "local" });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, no) => { resolve = done; reject = no; });
  return { promise, resolve, reject };
}
function harness(saved: unknown = null, legacy: JournalEntry[] = []) {
  let disk: JournalState | null = null;
  let active = true;
  let online = true;
  const persist = jest.fn(async (state: JournalState) => { disk = JSON.parse(JSON.stringify(state)); });
  const send = jest.fn(async (mutation: JournalMutation): Promise<JournalAck> => ({ status: "synced", localId: mutation.localId, operation: mutation.operation, remoteId: "00000000-0000-4000-8000-000000000001" }));
  const onChange = jest.fn();
  const onLocalFailure = jest.fn(), onSyncFailure = jest.fn();
  const repo = createJournalRepository({ active: () => active, canSync: () => online, persist, send, onChange, onLocalFailure, onSyncFailure });
  repo.initialize(saved, legacy, []);
  return { repo, persist, send, onChange, onLocalFailure, onSyncFailure, disk: () => disk,
    offline: () => { online = false; }, online: () => { online = true; }, close: () => { active = false; } };
}

it("acknowledges disk before making an entry visible; failure retains the previous state", async () => {
  const h = harness();
  h.persist.mockRejectedValueOnce(new Error("disk full"));
  h.onChange.mockClear();
  await expect(h.repo.upsert(entry())).rejects.toThrow("disk full");
  expect(h.onChange).not.toHaveBeenCalled();
  expect(h.repo.snapshot().entries).toEqual([]);
  expect(h.onLocalFailure).toHaveBeenCalledTimes(1);
  expect(h.onLocalFailure).toHaveBeenCalledWith("mutation");
  await h.repo.upsert(entry());
  expect(h.disk()!.entries).toEqual(h.repo.snapshot().entries);
  expect(h.disk()!.pending[0].operation).toBe("upsert");
});

it("duplicate callers wait for the same failed save, then can explicitly retry", async () => {
  const coordinator = createJournalSaveCoordinator(), gate = deferred<boolean>();
  const save = jest.fn(() => gate.promise);
  const first = coordinator.run("tarot:qa", save), second = coordinator.run("tarot:qa", save);
  expect(first).toBe(second);
  await Promise.resolve();
  expect(save).toHaveBeenCalledTimes(1);
  gate.resolve(false);
  await expect(first).resolves.toBe(false);
  await expect(second).resolves.toBe(false);
  await expect(coordinator.run("tarot:qa", async () => true)).resolves.toBe(true);
});

it("cloud merge disk failure is a sync failure and keeps the acknowledged local state", async () => {
  const h = harness();
  await h.repo.upsert(entry());
  const before = h.repo.snapshot();
  h.persist.mockRejectedValueOnce(new Error("disk full"));
  await expect(h.repo.mergeRemote([entry("remote")], before.entries)).rejects.toThrow("disk full");
  expect(h.repo.snapshot()).toBe(before);
  expect(h.onLocalFailure).toHaveBeenLastCalledWith("sync");
});

it("retains offline edits and deletion across restart and retries only the final operation", async () => {
  const h = harness();
  h.offline();
  await h.repo.upsert(entry());
  await h.repo.update("one", { userNote: "Keep this fictional thought" });
  expect(await h.repo.flush()).toBe(false);
  expect(h.send).not.toHaveBeenCalled();
  const restart = harness(h.disk());
  expect(restart.repo.snapshot().entries[0].userNote).toBe("Keep this fictional thought");
  await restart.repo.remove(["one"]);
  const afterDelete = harness(restart.disk());
  await afterDelete.repo.mergeRemote([{ ...entry(), syncStatus: "synced" }], []);
  expect(afterDelete.repo.snapshot().entries).toEqual([]);
  expect(await afterDelete.repo.flush()).toBe(true);
  expect(afterDelete.send).toHaveBeenCalledTimes(1);
  expect(afterDelete.send.mock.calls[0][0].operation).toBe("delete");
  expect(afterDelete.disk()!.pending).toEqual([]);
  expect(afterDelete.disk()!.hiddenIds).toContain("one");
});

it("an older in-flight save cannot resurrect a deleted entry", async () => {
  const h = harness();
  await h.repo.upsert(entry());
  const ack = deferred<JournalAck>();
  const sent = deferred<void>();
  h.send.mockImplementationOnce(async () => { sent.resolve(); return ack.promise; });
  const flushing = h.repo.flush();
  await sent.promise;
  await h.repo.remove(["one"]);
  ack.resolve({ status: "synced", remoteId: "remote-old" });
  expect(await flushing).toBe(true);
  expect(h.repo.snapshot().entries).toEqual([]);
  expect(h.send.mock.calls.map(call => call[0].operation)).toEqual(["upsert", "delete"]);
});

it("serializes overlapping note/mood edits without losing either patch", async () => {
  const h = harness();
  await h.repo.upsert(entry());
  await Promise.all([h.repo.update("one", { mood: "hopeful" }), h.repo.update("one", { userNote: "Ten quiet minutes" })]);
  expect(h.repo.snapshot().entries[0]).toMatchObject({ mood: "hopeful", userNote: "Ten quiet minutes" });
  expect(h.repo.snapshot().pending).toHaveLength(1);
  await h.repo.flush();
  expect(h.send.mock.calls[0][0]).toMatchObject({ operation: "upsert", entry: { mood: "hopeful", userNote: "Ten quiet minutes" } });
});

it("clear includes a save queued immediately before it", async () => {
  const h = harness();
  await Promise.all([h.repo.upsert(entry()), h.repo.clear()]);
  expect(h.repo.snapshot().entries).toEqual([]);
  expect(h.disk()!.pending).toMatchObject([{ operation: "delete", localId: "one" }]);
});

it("keeps a remote failure retryable and does not erase it on a successful read", async () => {
  const h = harness();
  await h.repo.upsert(entry());
  h.send.mockRejectedValueOnce(new Error("network offline"));
  expect(await h.repo.flush()).toBe(false);
  await h.repo.mergeRemote([], h.repo.snapshot().entries);
  expect(h.repo.snapshot().pending).toHaveLength(1);
  expect(h.repo.snapshot().entries).toHaveLength(1);
  expect(await h.repo.flush()).toBe(true);
  expect(h.repo.snapshot().entries[0].syncStatus).toBe("synced");
});

it("a closed account cannot apply a late ACK or another queued write", async () => {
  const h = harness();
  await h.repo.upsert(entry());
  const ack = deferred<JournalAck>(), sent = deferred<void>();
  h.send.mockImplementationOnce(async () => { sent.resolve(); return ack.promise; });
  const flushing = h.repo.flush();
  await sent.promise;
  h.onChange.mockClear(); h.persist.mockClear();
  h.close(); ack.resolve({ status: "synced", remoteId: "remote-old" });
  expect(await flushing).toBe(false);
  await expect(h.repo.upsert(entry("late"))).rejects.toThrow("not ready");
  expect(h.persist).not.toHaveBeenCalled();
  expect(h.onChange).not.toHaveBeenCalled();
});

it("rejects corrupt/future envelopes without silently restoring legacy data", () => {
  expect(() => harness({ schemaVersion: 2 }, [entry()])).toThrow("Invalid Journal state");
  expect(() => readJournalState({ schemaVersion: 1, revision: 0, entries: [], hiddenIds: [], pending: [{ localId: "x", revision: 2, operation: "delete" }] })).toThrow();
});

it("durably applies another client's tombstone and cancels its stale pending edit", async () => {
  const h = harness();
  await h.repo.upsert(entry());
  await h.repo.update("one", { userNote: "Fictional unsent edit" });
  await h.repo.mergeRemote([], h.repo.snapshot().entries, ["one"]);
  expect(h.repo.snapshot().entries).toEqual([]);
  expect(h.repo.snapshot().pending).toEqual([]);
  const restart = harness(h.disk());
  await restart.repo.mergeRemote([entry()], []);
  expect(restart.repo.snapshot().entries).toEqual([]);
  expect(await restart.repo.flush()).toBe(true);
  expect(restart.send).not.toHaveBeenCalled();
});

it("an old failed write cannot poison the state after a remote tombstone supersedes it", async () => {
  const h = harness();
  await h.repo.upsert(entry());
  const result = deferred<JournalAck>(), sent = deferred<void>();
  h.send.mockImplementationOnce(async () => { sent.resolve(); return result.promise; });
  const flushing = h.repo.flush();
  await sent.promise;
  await h.repo.mergeRemote([], h.repo.snapshot().entries, ["one"]);
  result.reject(new Error("Entry deleted on server"));
  expect(await flushing).toBe(true);
  expect(h.onSyncFailure).not.toHaveBeenCalledWith(true);
  expect(h.repo.snapshot().entries).toEqual([]);
});

it("remote tombstones cannot hide data until the local write is acknowledged", async () => {
  const h = harness();
  await h.repo.upsert(entry());
  const before = h.repo.snapshot();
  h.persist.mockRejectedValueOnce(new Error("disk full"));
  await expect(h.repo.mergeRemote([], before.entries, ["one"])).rejects.toThrow("disk full");
  expect(h.repo.snapshot()).toBe(before);
  expect(h.repo.snapshot().pending).toHaveLength(1);
  expect(h.onLocalFailure).toHaveBeenLastCalledWith("sync");
});
