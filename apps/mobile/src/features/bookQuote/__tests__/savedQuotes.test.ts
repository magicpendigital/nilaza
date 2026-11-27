import AsyncStorage from "@react-native-async-storage/async-storage";
import { AccountScope } from "../../../auth/accountScope";
import { createAccountStorage } from "../../../auth/accountStorage";
import { createEmailAuthState } from "../../../auth/localAuth";
import { buildLocalExport } from "../../privacy/localExport";
import {
  bookQuoteSavedMax, bookQuoteSavedStorageKey, isBookQuoteSaved, loadSavedBookQuotes, saveSavedBookQuotes, toggleSavedBookQuote,
  type SavedBookQuote
} from "../savedQuotes";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

const entry = (id: string): SavedBookQuote => ({
  id, book: "suy-tuong", dateKey: "2026-11-27", savedAt: "2026-11-27T08:00:00.000Z", ref: "Quyển 4 · đoạn 3", quote: "Câu thử"
});

const memoryStorage = (initial: Record<string, unknown> = {}) => {
  const data: Record<string, unknown> = { ...initial };
  return {
    data,
    loadJson: jest.fn(async (key: string, fallback: unknown) => (key in data ? data[key] : fallback)) as any,
    saveJson: jest.fn(async (key: string, value: unknown) => { data[key] = value; }) as any
  };
};

test("storage key lives under the account prefix namespace", () => {
  expect(bookQuoteSavedStorageKey.startsWith("nilaza.")).toBe(true);
});

test("toggle saves newest first and a second tap removes it", () => {
  let items: SavedBookQuote[] = [];
  items = toggleSavedBookQuote(items, entry("a"));
  items = toggleSavedBookQuote(items, entry("b"));
  expect(items.map((item) => item.id)).toEqual(["b", "a"]);
  expect(isBookQuoteSaved(items, "a")).toBe(true);
  items = toggleSavedBookQuote(items, entry("a"));
  expect(items.map((item) => item.id)).toEqual(["b"]);
});

test("the list is capped", () => {
  let items: SavedBookQuote[] = [];
  for (let index = 0; index < bookQuoteSavedMax + 5; index += 1) items = toggleSavedBookQuote(items, entry(`q-${index}`));
  expect(items).toHaveLength(bookQuoteSavedMax);
  expect(items[0].id).toBe(`q-${bookQuoteSavedMax + 4}`);
});

test("round-trips through storage and ignores corrupt data", async () => {
  const storage = memoryStorage();
  await saveSavedBookQuotes(storage, [entry("a")]);
  expect(storage.data[bookQuoteSavedStorageKey]).toEqual({ schemaVersion: 1, items: [entry("a")] });
  expect(await loadSavedBookQuotes(storage)).toEqual([entry("a")]);
  expect(await loadSavedBookQuotes(memoryStorage({ [bookQuoteSavedStorageKey]: { schemaVersion: 2, items: [entry("a")] } }))).toEqual([]);
  expect(await loadSavedBookQuotes(memoryStorage({ [bookQuoteSavedStorageKey]: { schemaVersion: 1, items: [{ id: 1 }, entry("b")] } }))).toEqual([entry("b")]);
  const failing = { loadJson: async () => { throw new Error("read failed"); }, saveJson: async () => undefined } as any;
  expect(await loadSavedBookQuotes(failing)).toEqual([]);
});

test("saved quotes appear in the data export and are wiped by the account clear (Xóa dữ liệu)", async () => {
  await AsyncStorage.clear();
  const scope = new AccountScope(createEmailAuthState("qa-quote", "qa-quote@example.test"));
  const storage = createAccountStorage(scope);
  storage.markHydrated();
  await saveSavedBookQuotes(storage, [entry("st-04-03")]);
  const json = await buildLocalExport({
    userId: scope.userId!, active: () => true, read: storage.loadJson,
    journalSnapshot: () => ({ schemaVersion: 1, revision: 0, hiddenIds: [], pending: [], entries: [] })
  });
  expect(JSON.parse(json).data.bookQuotesSaved.items[0].id).toBe("st-04-03");
  await storage.clear();
  expect(await loadSavedBookQuotes(storage)).toEqual([]);
});
