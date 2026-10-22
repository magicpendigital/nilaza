import { mapDailyInsight, mapJournalRows, mapPersonaMessages, mergeJournal } from "../personalData";
import type { JournalEntry, Persona } from "../../types";

const local: JournalEntry = { id: "local-1", sourceType: "manual", title: "T", summary: "Local note", createdAt: "2026-09-02", syncStatus: "local" };

it("uses local_id to reconcile server Journal without duplicates and preserves unsynced notes", () => {
  const remote = mapJournalRows([{ id: "uuid", local_id: local.id, source_type: "manual", title: "T", summary: "Remote", created_at: local.createdAt }]);
  expect(mergeJournal([local], remote)).toEqual([local]);
  expect(mergeJournal([{ ...local, syncStatus: "synced" }], remote)).toEqual(remote);
  expect(mergeJournal([local], remote, [local.id])).toEqual([]);
  expect(mergeJournal([{ ...local, syncStatus: "synced" }], [])).toEqual([]);
  expect(mergeJournal([local], [])).toEqual([local]);
});

it("maps JSONB daily content, rejects objects in text and tolerates no persisted daily row", () => {
  const row = { id: "daily", date_key: "2026-09-02", created_at: "today", content: { title: "Hôm nay", text: "Nội dung", reflectionPrompt: "Câu hỏi" } };
  expect(mapDailyInsight(row)?.text).toBe("Nội dung");
  expect(mapDailyInsight({ ...row, content: JSON.stringify(row.content) })?.title).toBe("Hôm nay");
  expect(() => mapDailyInsight({ ...row, content: { ...row.content, text: {} } })).toThrow();
  expect(mapDailyInsight(null)).toBeNull();
});

it("an older GET cannot delete a newly saved/synced entry or overwrite an edit", () => {
  const synced: JournalEntry = { ...local, syncStatus: "synced" };
  expect(mergeJournal([synced], [], [], [])).toEqual([synced]);
  const edited = { ...synced, userNote: "New note" };
  expect(mergeJournal([edited], [], [], [synced])).toEqual([edited]);
  expect(mergeJournal([synced], [], [], [synced])).toEqual([]);
});

it("maps database persona UUID through slug and keeps its session id", () => {
  const rows = [{ id: "message", persona_id: "uuid", personas: { slug: "guide" }, session_id: "session", content: "Hello", role: "guide", created_at: "today" }];
  const result = mapPersonaMessages(rows, [{ id: "local-guide", slug: "guide" } as Persona]);
  expect(result[0]).toMatchObject({ personaId: "local-guide", uiMetadata: { sessionId: "session", remote: true } });
  expect(mapPersonaMessages(rows, [])).toEqual([]);
});
