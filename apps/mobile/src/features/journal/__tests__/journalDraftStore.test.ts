import { createJournalDraftStore, readJournalDraft, type JournalDraftEnvelope } from "../journalDraftStore";
const note = (body: string) => ({ title: "QA", body, mood: "reflective" });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }

test("hydration gates edits and never empty-overwrites before the read ACK", async () => {
  const reading = deferred<unknown>(), write = jest.fn().mockResolvedValue(undefined);
  const store = createJournalDraftStore({ read: () => reading.promise, write, isActive: () => true });
  const hydration = store.hydrate();
  expect(store.getSnapshot().status).toBe("loading"); expect(await store.update(note("premature"))).toBe(false);
  expect(write).not.toHaveBeenCalled();
  reading.resolve({ schemaVersion: 1, revision: 4, draft: note("existing fictional draft") });
  expect(await hydration).toBe(true); expect(store.getSnapshot().draft.body).toBe("existing fictional draft");
});
test("corrupt/unreadable draft stays locked; retry recovers and schema ignores undeclared fields", async () => {
  const read = jest.fn().mockResolvedValueOnce({ schemaVersion: 2 }).mockResolvedValueOnce({ schemaVersion: 1, revision: 2, draft: note("recovered") });
  const write = jest.fn(), store = createJournalDraftStore({ read, write, isActive: () => true });
  expect(await store.hydrate()).toBe(false); expect(await store.update(note("overwrite"))).toBe(false);
  expect(write).not.toHaveBeenCalled(); expect(await store.retry()).toBe(true);
  for (const value of [[], { schemaVersion: 1, revision: -1, draft: note("x") }, { schemaVersion: 1, revision: 1, draft: { ...note("x"), title: "x".repeat(161) } }, { schemaVersion: 1, revision: 1, draft: { ...note("x"), body: "x".repeat(10001) } }]) expect(() => readJournalDraft(value)).toThrow();
  expect(readJournalDraft({ schemaVersion: 1, revision: 1, draft: { ...note("x"), secret: "DROP" } }).draft).toEqual(note("x"));
});
test("stale queued autosaves cannot resurrect after ACK clear and restart", async () => {
  const started = deferred<void>(), release = deferred<void>(); let persisted: unknown = null;
  const writes: JournalDraftEnvelope[] = [];
  const write = jest.fn(async (value: JournalDraftEnvelope) => { writes.push(value); if (writes.length === 1) { started.resolve(undefined); await release.promise; } persisted = value; });
  const store = createJournalDraftStore({ read: async () => null, write, isActive: () => true }); await store.hydrate();
  const first = store.update(note("first")); await started.promise;
  const second = store.update(note("latest")), submitted = store.beginSubmit()!;
  expect(submitted.draft.body).toBe("latest"); const clear = store.finishSubmit(submitted.revision, true);
  release.resolve(undefined); await Promise.all([first, second, clear]);
  expect(writes.map(value => value.draft.body)).toEqual(["first", ""]);
  const reboot = createJournalDraftStore({ read: async () => persisted, write, isActive: () => true }); await reboot.hydrate();
  expect(reboot.getSnapshot().draft.body).toBe("");
});
test("disk failure preserves memory; explicit retry waits for actual write ACK", async () => {
  const write = jest.fn().mockRejectedValueOnce(new Error("fixture disk fail")).mockResolvedValueOnce(undefined);
  const store = createJournalDraftStore({ read: async () => null, write, isActive: () => true }); await store.hydrate();
  expect(await store.update(note("retained"))).toBe(false); expect(store.getSnapshot().persistence).toBe("error");
  expect(store.getSnapshot().draft.body).toBe("retained"); expect(await store.retry()).toBe(true);
  expect(write.mock.calls[1][0].draft.body).toBe("retained");
});
test("failed clear locks new submits and retry only clears the already-saved note draft", async () => {
  const write = jest.fn().mockRejectedValueOnce(new Error("fixture clear fail")).mockResolvedValueOnce(undefined);
  const store = createJournalDraftStore({ read: async () => ({ schemaVersion: 1, revision: 7, draft: note("saved") }), write, isActive: () => true }); await store.hydrate();
  const submitted = store.beginSubmit()!; expect(store.beginSubmit()).toBeNull();
  expect(await store.finishSubmit(submitted.revision, true)).toBe(false);
  expect(store.getSnapshot().submission).toBe("clear_error"); expect(store.beginSubmit()).toBeNull();
  expect(await store.update(note("overwrite"))).toBe(false); expect(await store.retryClear()).toBe(true);
  expect(write.mock.calls.every(([value]) => value.draft.body === "")).toBe(true);
});
test("failed note ACK preserves draft and releases submission without any clear", async () => {
  const write = jest.fn().mockResolvedValue(undefined), store = createJournalDraftStore({ read: async () => null, write, isActive: () => true }); await store.hydrate();
  await store.update(note("unsaved")); write.mockClear(); const submitted = store.beginSubmit()!;
  expect(await store.finishSubmit(submitted.revision, false)).toBe(false); expect(write).not.toHaveBeenCalled();
  expect(store.getSnapshot().draft.body).toBe("unsaved"); expect(store.beginSubmit()).not.toBeNull();
});
test("closed account suppresses late hydration and all further actions", async () => {
  let active = true; const reading = deferred<unknown>(), listener = jest.fn(), write = jest.fn();
  const store = createJournalDraftStore({ read: () => reading.promise, write, isActive: () => active }); store.subscribe(listener);
  const hydration = store.hydrate(); listener.mockClear(); active = false;
  reading.resolve({ schemaVersion: 1, revision: 1, draft: note("A only") }); expect(await hydration).toBe(false);
  expect(listener).not.toHaveBeenCalled(); expect(await store.update(note("edit"))).toBe(false); expect(await store.retry()).toBe(false);
  expect(store.beginSubmit()).toBeNull(); expect(write).not.toHaveBeenCalled();
});
test("account closes during disk write: late ACK never publishes", async () => {
  let active = true; const started = deferred<void>(), acknowledged = deferred<void>();
  const write = jest.fn(async () => { started.resolve(undefined); await acknowledged.promise; });
  const store = createJournalDraftStore({ read: async () => null, write, isActive: () => active }); await store.hydrate();
  const listener = jest.fn(); store.subscribe(listener); const writing = store.update(note("pending")); await started.promise;
  listener.mockClear(); active = false; acknowledged.resolve(undefined);
  expect(await writing).toBe(false); expect(listener).not.toHaveBeenCalled(); expect(await store.flush()).toBe(false);
});
