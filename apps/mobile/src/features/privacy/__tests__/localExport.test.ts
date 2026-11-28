import { buildLocalExport } from "../localExport";
const journal = () => ({ schemaVersion: 1, revision: 0, hiddenIds: [], pending: [], entries: [
  { id: "qa-note", title: "QA", summary: "Fictional reflection", createdAt: "2026-10-01", sourceType: "manual", sourceSnapshot: { question: "QA?", access_token: "NEVER_EXPORT" } }
] });

test("exports actual local content, excludes credentials and never reads global/auth/operator keys", async () => {
  const read = jest.fn(async (key: string) => key === "nilaza.profile"
    ? { nickname: "QA", authToken: "NEVER_EXPORT", nested: { api_key: "NEVER_EXPORT", goal: "practice" } }
    : key === "nilaza.messages" ? [{ id: "qa-message", text: "Fictional QA message" }] : null);
  const json = await buildLocalExport({ userId: "qa-owner", active: () => true, read: read as any, journalSnapshot: journal });
  expect(json).not.toContain("NEVER_EXPORT");
  const result = JSON.parse(json);
  expect(result.scope).toBe("saved_data_on_this_device");
  expect(result.data.journal[0].summary).toBe("Fictional reflection");
  expect(result.data.personaMessages[0].text).toBe("Fictional QA message");
  expect(result.data.profile.nested).toEqual({ goal: "practice" });
  expect(result.data.journalDraft).toEqual({ title: "", body: "", mood: "reflective" });
  expect(read.mock.calls.map(([key]) => key).every(key => key.startsWith("nilaza.") && !/auth|prompt|devicePush/.test(key))).toBe(true);
});

test("includes only validated declared saved draft fields and refuses corrupt drafts", async () => {
  const read = async (key: string) => key === "nilaza.journalDraft.v1" ? {
    schemaVersion: 1, revision: 3, draft: { title: "QA draft", body: "Fictional unsaved reflection", mood: "calm", authToken: "NEVER_EXPORT" }
  } : null;
  const json = await buildLocalExport({ userId: "qa", active: () => true, read: read as any, journalSnapshot: journal });
  expect(JSON.parse(json).data.journalDraft).toEqual({ title: "QA draft", body: "Fictional unsaved reflection", mood: "calm" });
  expect(json).not.toContain("NEVER_EXPORT");
  await expect(buildLocalExport({ userId: "qa", active: () => true, journalSnapshot: journal,
    read: (async (key: string) => key === "nilaza.journalDraft.v1" ? { schemaVersion: 9 } : null) as any
  })).rejects.toThrow("Invalid Journal draft");
});

test("account closure during reads prevents export", async () => {
  let active = true;
  await expect(buildLocalExport({ userId: "qa-A", active: () => active,
    read: async () => { active = false; return null as any; }, journalSnapshot: journal })).rejects.toThrow("Account closed");
});

test("corrupt envelope or storage failure never produces an empty/partial export", async () => {
  await expect(buildLocalExport({ userId: "qa", active: () => true, read: async () => null as any,
    journalSnapshot: () => ({ ...journal(), schemaVersion: 2 }) })).rejects.toThrow("Invalid Journal");
  await expect(buildLocalExport({ userId: "qa", active: () => true,
    read: async () => { throw new Error("failed read"); }, journalSnapshot: journal })).rejects.toThrow("failed read");
});

test("includes saved book quotes (Một câu cho hôm nay)", async () => {
  const saved = { schemaVersion: 1, items: [{ id: "st-04-03", book: "suy-tuong", dateKey: "2026-11-27", savedAt: "2026-11-27T08:00:00.000Z", ref: "Quyển 4 · đoạn 3", quote: "Câu thử" }] };
  const read = jest.fn(async (key: string) => key === "nilaza.bookQuotes.saved.v1" ? saved : null);
  const json = await buildLocalExport({ userId: "qa", active: () => true, read: read as any, journalSnapshot: journal });
  expect(JSON.parse(json).data.bookQuotesSaved).toEqual(saved);
  expect(read.mock.calls.map(([key]) => key)).toContain("nilaza.bookQuotes.saved.v1");
});

test("includes the saved Number Map report (kept on this device only)", async () => {
  const saved = { schemaVersion: 1, numbersHash: "0a1b2c3d", createdAt: "2026-11-28T08:00:00.000Z", language: "vi", promptVersion: "2026-11-28-numerology-report-v1",
    sections: [{ id: "you", title: "Con người bạn", body: "Đoạn thử.", blockIds: ["numbers.7"] }], questions: ["Câu một?", "Câu hai?", "Câu ba?"] };
  const read = jest.fn(async (key: string) => key === "nilaza.numerology.report.v1" ? saved : null);
  const json = await buildLocalExport({ userId: "qa", active: () => true, read: read as any, journalSnapshot: journal });
  expect(JSON.parse(json).data.numerologyReport).toEqual(saved);
});
