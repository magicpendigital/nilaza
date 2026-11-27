// Saved quotes stay on this device, under the signed-in account's storage (prefix-wiped by "Xóa dữ liệu",
// included in "Xuất dữ liệu của tôi"). A guest has no account storage, so the list lives in memory only.
// Nothing here is sent in any request or event.
import type { BookQuoteBookId } from "./content";

export const bookQuoteSavedStorageKey = "nilaza.bookQuotes.saved.v1";
export const bookQuoteSavedMax = 200;

export type BookQuoteStorage = {
  loadJson<T>(key: string, fallback: T): Promise<T>;
  saveJson<T>(key: string, value: T): Promise<void>;
};

export type SavedBookQuote = {
  id: string;
  book: BookQuoteBookId;
  dateKey: string;
  savedAt: string;
  // Text snapshot in the language shown when saved, so the list still reads if the content file changes.
  ref: string;
  quote: string;
};

type Envelope = { schemaVersion: 1; items: SavedBookQuote[] };

const isSaved = (value: unknown): value is SavedBookQuote => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return ["id", "book", "dateKey", "savedAt", "ref", "quote"].every((key) => typeof item[key] === "string");
};

export async function loadSavedBookQuotes(storage: BookQuoteStorage): Promise<SavedBookQuote[]> {
  try {
    const saved = await storage.loadJson<Partial<Envelope> | null>(bookQuoteSavedStorageKey, null);
    if (!saved || saved.schemaVersion !== 1 || !Array.isArray(saved.items)) return [];
    return saved.items.filter(isSaved).slice(0, bookQuoteSavedMax);
  } catch {
    return [];
  }
}

export async function saveSavedBookQuotes(storage: BookQuoteStorage, items: SavedBookQuote[]): Promise<void> {
  await storage.saveJson<Envelope>(bookQuoteSavedStorageKey, { schemaVersion: 1, items: items.slice(0, bookQuoteSavedMax) });
}

// Saving the same item twice removes it (toggle). Newest first; the oldest drop off past the cap.
export function toggleSavedBookQuote(items: SavedBookQuote[], entry: SavedBookQuote): SavedBookQuote[] {
  if (items.some((item) => item.id === entry.id)) return items.filter((item) => item.id !== entry.id);
  return [entry, ...items].slice(0, bookQuoteSavedMax);
}

export const isBookQuoteSaved = (items: SavedBookQuote[], id: string) => items.some((item) => item.id === id);
