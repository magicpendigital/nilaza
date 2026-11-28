// "Lời người xưa" (book_quote; Admin label "Một câu cho hôm nay"): one line a day from the whole library. Version 1 runs fully on the device: no request, no AI call, no SQL.
// One JSON file per book in packages/content/data/book-quotes/; `npm run validate:data` checks them.
import daoDucKinh from "../../../../../packages/content/data/book-quotes/dao-duc-kinh.json";
import suyTuong from "../../../../../packages/content/data/book-quotes/suy-tuong.json";
import kinhPhapCu from "../../../../../packages/content/data/book-quotes/kinh-phap-cu.json";
import binhPhap from "../../../../../packages/content/data/book-quotes/binh-phap-ton-tu.json";
import kinhDich from "../../../../../packages/content/data/book-quotes/kinh-dich.json";
import { localizedText } from "../../i18n";
import type { Language } from "../../types";

// The single feature id for analytics, entitlement and future gating. Kept here only.
export const BOOK_QUOTE_FEATURE_ID = "book_quote" as const;

export type BookQuoteBookId = "dao-duc-kinh" | "suy-tuong" | "kinh-phap-cu" | "binh-phap-ton-tu" | "kinh-dich";
type Text2 = { vi: string; en: string };

export type BookQuoteItem = {
  id: string;
  ref: Text2;
  quote: Text2;
  gloss: Text2;
  question: Text2;
  tags?: string[];
};

export type BookQuoteReviewStatus = "draft" | "reviewed" | "approved";

export type BookQuoteFile = {
  schemaVersion: 1;
  book: BookQuoteBookId;
  personaId: string;
  title: Text2;
  source: { original: string; englishBase: string; vietnamese: string };
  review: { status: BookQuoteReviewStatus | string; reviewer: string | null; reviewedAt: string | null; note?: string };
  sample?: boolean;
  sampleNote?: string;
  items: BookQuoteItem[];
};

// Tab order on the screen and the Home rotation order.
export const bookQuoteBookOrder: BookQuoteBookId[] = ["dao-duc-kinh", "suy-tuong", "kinh-phap-cu", "binh-phap-ton-tu", "kinh-dich"];

const files: Record<BookQuoteBookId, BookQuoteFile> = {
  "dao-duc-kinh": daoDucKinh as BookQuoteFile,
  "suy-tuong": suyTuong as BookQuoteFile,
  "kinh-phap-cu": kinhPhapCu as BookQuoteFile,
  "binh-phap-ton-tu": binhPhap as BookQuoteFile,
  "kinh-dich": kinhDich as BookQuoteFile
};

// Short tab labels; the full title comes from the content file.
const tabLabels: Record<BookQuoteBookId, Text2> = {
  "dao-duc-kinh": { vi: "Đạo Đức Kinh", en: "Tao Te Ching" },
  "suy-tuong": { vi: "Suy tưởng", en: "Meditations" },
  "kinh-phap-cu": { vi: "Pháp Cú", en: "Dhammapada" },
  "binh-phap-ton-tu": { vi: "Binh pháp", en: "Art of War" },
  "kinh-dich": { vi: "Kinh Dịch", en: "I Ching" }
};

// Author line under the quote. The Vietnamese is always Nilaza's own translation.
const authors: Record<BookQuoteBookId, Text2> = {
  "dao-duc-kinh": { vi: "Lão Tử", en: "Laozi" },
  "suy-tuong": { vi: "Marcus Aurelius", en: "Marcus Aurelius" },
  "kinh-phap-cu": { vi: "Kinh Pháp Cú", en: "The Dhammapada" },
  "binh-phap-ton-tu": { vi: "Tôn Tử", en: "Sunzi" },
  "kinh-dich": { vi: "Kinh Dịch", en: "The I Ching" }
};

// Draft gate: only files whose review.status is "approved" are shown to users. A file becomes "approved" only
// after it passes content review (nilaza-content-review) AND the Owner approves it. Sample files are never
// approved (validate:data fails if one is), so with sample content every entry point stays hidden.
// Tests pass showDrafts = true to exercise the screen with the sample files.
export const SHOW_DRAFT_BOOK_QUOTES = false;

export function isBookQuoteFileVisible(file: BookQuoteFile, showDrafts = SHOW_DRAFT_BOOK_QUOTES): boolean {
  return showDrafts || file.review.status === "approved";
}

export function visibleBookQuoteItems(file: BookQuoteFile, showDrafts = SHOW_DRAFT_BOOK_QUOTES): BookQuoteItem[] {
  return isBookQuoteFileVisible(file, showDrafts) ? file.items : [];
}

export function getBookQuoteFile(book: BookQuoteBookId): BookQuoteFile {
  return files[book];
}

export function availableBookQuoteBooks(showDrafts = SHOW_DRAFT_BOOK_QUOTES): BookQuoteBookId[] {
  return bookQuoteBookOrder.filter((book) => visibleBookQuoteItems(files[book], showDrafts).length > 0);
}

// The book whose guide this persona is, only when that book has visible quotes (so no button leads to an empty screen).
export function bookQuoteBookForPersona(personaId: string | undefined, showDrafts = SHOW_DRAFT_BOOK_QUOTES): BookQuoteBookId | undefined {
  if (!personaId) return undefined;
  const book = bookQuoteBookOrder.find((id) => files[id].personaId === personaId);
  return book && visibleBookQuoteItems(files[book], showDrafts).length > 0 ? book : undefined;
}

export const bookQuoteTabLabel = (book: BookQuoteBookId, language: Language) => localizedText(tabLabels[book], language);
export const bookQuoteTitle = (book: BookQuoteBookId, language: Language) => localizedText(files[book].title, language);
export const bookQuoteAuthor = (book: BookQuoteBookId, language: Language) => localizedText(authors[book], language);

// Local calendar date as YYYY-MM-DD. Using the phone's local date keeps one quote for the user's whole day.
export function bookQuoteDateKey(at: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

// FNV-1a 32-bit: small, stable across platforms and JS engines.
export function stableHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export type BookQuoteOfDay = { book: BookQuoteBookId; dateKey: string; item: BookQuoteItem; file: BookQuoteFile };

// Same date + same book => same item, every time. Different books hash differently, so they can differ.
export function pickBookQuote(book: BookQuoteBookId, dateKey: string, showDrafts = SHOW_DRAFT_BOOK_QUOTES): BookQuoteOfDay | null {
  const file = files[book];
  const items = visibleBookQuoteItems(file, showDrafts);
  if (!items.length) return null;
  const item = items[stableHash(`${dateKey}|${book}`) % items.length];
  return { book, dateKey, item, file };
}

// Owner decision 28/11/2026: one line a day, drawn from the whole library (every visible book together), not one per
// book. The same date gives the same line on Home and on the screen; the library can grow without a fixed book count.
export function dailyBookQuote(dateKey: string, showDrafts = SHOW_DRAFT_BOOK_QUOTES): BookQuoteOfDay | null {
  const pool = availableBookQuoteBooks(showDrafts)
    .flatMap((book) => visibleBookQuoteItems(files[book], showDrafts).map((item) => ({ book, item })));
  if (!pool.length) return null;
  const { book, item } = pool[stableHash(`${dateKey}|library`) % pool.length];
  return { book, dateKey, item, file: files[book] };
}

/** Name of the daily line across the app (Home, Explore, the screen). Admin keeps the internal label "Một câu cho hôm nay". */
export const bookQuoteFeatureTitle = (language: Language) => (language === "vi" ? "Lời người xưa" : "Words of the ancients");

export const bookQuoteText = (item: BookQuoteItem, field: "ref" | "quote" | "gloss" | "question", language: Language) =>
  localizedText(item[field], language);

// Hand-off to the existing persona chat. The server only reads sourceLabel (<=80), userQuestion (<=300) and
// safeSummary (<=600), so the quote and gloss go into safeSummary, trimmed here before they leave the device.
export function bookQuoteHandoff(quote: BookQuoteOfDay, language: Language) {
  const clip = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value);
  const title = bookQuoteTitle(quote.book, language);
  const ref = bookQuoteText(quote.item, "ref", language);
  const text = bookQuoteText(quote.item, "quote", language);
  const gloss = bookQuoteText(quote.item, "gloss", language);
  const question = bookQuoteText(quote.item, "question", language);
  return {
    sourceType: "book_quote" as const,
    sourceId: `${quote.book}:${quote.item.id}:${quote.dateKey}`,
    sourceLabel: clip(`${title} · ${ref}`, 80),
    userQuestion: clip(question, 300),
    safeSummary: clip(`"${text}" ${gloss}`, 600)
  };
}
