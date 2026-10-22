export const journalDraftStorageKey = "nilaza.journalDraft.v1";
const moods = ["calm", "curious", "reflective", "hopeful", "stuck"] as const;
export type JournalDraft = { title: string; body: string; mood: string };
export type JournalDraftEnvelope = { schemaVersion: 1; revision: number; draft: JournalDraft };
export type JournalDraftSnapshot = {
  status: "unloaded" | "loading" | "ready" | "read_error";
  revision: number; draft: JournalDraft;
  persistence: "idle" | "saving" | "error";
  submission: "idle" | "saving" | "clearing" | "clear_error";
};
const empty = (): JournalDraft => ({ title: "", body: "", mood: "reflective" });
function validDraft(value: unknown): value is JournalDraft {
  const draft = value as JournalDraft | null;
  return Boolean(draft && !Array.isArray(draft) && typeof draft.title === "string" && draft.title.length <= 160 &&
    typeof draft.body === "string" && draft.body.length <= 10000 && typeof draft.mood === "string" &&
    (moods as readonly string[]).includes(draft.mood));
}
export function readJournalDraft(value: unknown): JournalDraftEnvelope {
  if (value === null) return { schemaVersion: 1, revision: 0, draft: empty() };
  const envelope = value as JournalDraftEnvelope | null;
  if (!envelope || Array.isArray(envelope) || envelope.schemaVersion !== 1 ||
    !Number.isSafeInteger(envelope.revision) || envelope.revision < 0 || !validDraft(envelope.draft)) throw new Error("Invalid Journal draft");
  return { schemaVersion: 1, revision: envelope.revision,
    draft: { title: envelope.draft.title, body: envelope.draft.body, mood: envelope.draft.mood } };
}

export function createJournalDraftStore(options: {
  read: () => Promise<unknown>;
  write: (envelope: JournalDraftEnvelope) => Promise<void>;
  isActive: () => boolean;
}) {
  let snapshot: JournalDraftSnapshot = { status: "unloaded", revision: 0, draft: empty(), persistence: "idle", submission: "idle" };
  const listeners = new Set<() => void>();
  let hydration: Promise<boolean> | null = null;
  let queue: Promise<boolean> = Promise.resolve(true);
  function publish(next: JournalDraftSnapshot) {
    if (!options.isActive()) return;
    snapshot = next;
    for (const listener of listeners) listener();
  }
  function persist(draft: JournalDraft, revision: number, clearing = false): Promise<boolean> {
    const envelope: JournalDraftEnvelope = { schemaVersion: 1, revision, draft: { ...draft } };
    const operation = queue.catch(() => false).then(async () => {
      // Collapse stale autosaves; an already-started write stays before clear.
      if (!options.isActive() || snapshot.revision !== revision) return false;
      try { await options.write(envelope); }
      catch {
        if (options.isActive() && snapshot.revision === revision) publish({ ...snapshot, persistence: "error",
          submission: clearing ? "clear_error" : snapshot.submission });
        return false;
      }
      if (!options.isActive() || snapshot.revision !== revision) return false;
      publish({ ...snapshot, draft: clearing ? empty() : snapshot.draft, persistence: "idle",
        submission: clearing ? "idle" : snapshot.submission });
      return true;
    });
    queue = operation;
    return operation;
  }
  function hydrate(): Promise<boolean> {
    if (!options.isActive()) return Promise.resolve(false);
    if (snapshot.status === "ready") return Promise.resolve(true);
    if (hydration) return hydration;
    publish({ ...snapshot, status: "loading" });
    hydration = (async () => {
      try {
        const value = readJournalDraft(await options.read());
        if (!options.isActive()) return false;
        publish({ status: "ready", revision: value.revision, draft: value.draft, persistence: "idle", submission: "idle" });
        return true;
      } catch {
        if (options.isActive()) publish({ ...snapshot, status: "read_error" });
        return false;
      }
    })().finally(() => { hydration = null; });
    return hydration;
  }
  function retryClear(): Promise<boolean> {
    if (!options.isActive() || snapshot.status !== "ready" || snapshot.submission !== "clear_error") return Promise.resolve(false);
    publish({ ...snapshot, persistence: "saving", submission: "clearing" });
    return persist(empty(), snapshot.revision, true);
  }
  return {
    getSnapshot: () => snapshot,
    isActive: options.isActive,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    hydrate,
    update(draft: JournalDraft): Promise<boolean> {
      if (!options.isActive() || snapshot.status !== "ready" || snapshot.submission !== "idle" || !validDraft(draft)) return Promise.resolve(false);
      const revision = snapshot.revision + 1;
      if (!Number.isSafeInteger(revision)) return Promise.resolve(false);
      const copy = { title: draft.title, body: draft.body, mood: draft.mood };
      publish({ ...snapshot, revision, draft: copy, persistence: "saving" });
      return persist(copy, revision);
    },
    retry(): Promise<boolean> {
      if (!options.isActive()) return Promise.resolve(false);
      if (snapshot.status !== "ready") return hydrate();
      if (snapshot.submission === "clear_error") return retryClear();
      if (snapshot.submission !== "idle") return Promise.resolve(false);
      publish({ ...snapshot, persistence: "saving" });
      return persist(snapshot.draft, snapshot.revision);
    },
    async flush() {
      await queue;
      return options.isActive() && snapshot.status === "ready" && snapshot.persistence === "idle";
    },
    beginSubmit(): { draft: JournalDraft; revision: number } | null {
      if (!options.isActive() || snapshot.status !== "ready" || snapshot.submission !== "idle" || !snapshot.draft.body.trim()) return null;
      const captured = { draft: { ...snapshot.draft }, revision: snapshot.revision };
      publish({ ...snapshot, submission: "saving" });
      return captured;
    },
    finishSubmit(revision: number, saved: boolean): Promise<boolean> {
      if (!options.isActive() || snapshot.submission !== "saving" || snapshot.revision !== revision) return Promise.resolve(false);
      if (!saved) { publish({ ...snapshot, submission: "idle" }); return Promise.resolve(false); }
      const nextRevision = revision + 1;
      if (!Number.isSafeInteger(nextRevision)) { publish({ ...snapshot, submission: "clear_error", persistence: "error" }); return Promise.resolve(false); }
      publish({ ...snapshot, revision: nextRevision, submission: "clearing", persistence: "saving" });
      return persist(empty(), nextRevision, true);
    },
    retryClear
  };
}
export type JournalDraftStore = ReturnType<typeof createJournalDraftStore>;
