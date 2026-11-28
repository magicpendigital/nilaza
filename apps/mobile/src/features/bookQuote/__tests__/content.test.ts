import {
  BOOK_QUOTE_FEATURE_ID, SHOW_DRAFT_BOOK_QUOTES, availableBookQuoteBooks, bookQuoteBookForPersona, bookQuoteBookOrder, bookQuoteDateKey, bookQuoteHandoff,
  bookQuoteFeatureTitle, dailyBookQuote, getBookQuoteFile, isBookQuoteFileVisible, pickBookQuote, stableHash, visibleBookQuoteItems
} from "../content";
import type { BookQuoteBookId } from "../content";

const bookQuoteDataDir = "../../../../../../packages/content/data/book-quotes";
const bookQuoteDataFiles = ["dao-duc-kinh", "suy-tuong", "kinh-phap-cu", "binh-phap-ton-tu", "kinh-dich"];
// Re-requires the module with every content file forced to draft, except the ones listed as approved.
function withBookQuoteStatuses<T>(approved: string[], load: () => T): T {
  let result: T | undefined;
  jest.isolateModules(() => {
    for (const book of bookQuoteDataFiles) {
      jest.doMock(`${bookQuoteDataDir}/${book}.json`, () => {
        const actual = jest.requireActual(`${bookQuoteDataDir}/${book}.json`);
        return approved.includes(book)
          ? { ...actual, review: { status: "approved", reviewer: "QA fixture", reviewedAt: "2026-11-27" } }
          : { ...actual, review: { status: "draft", reviewer: null, reviewedAt: null } };
      });
    }
    result = load();
  });
  return result as T;
}

test("feature id is one constant", () => {
  expect(BOOK_QUOTE_FEATURE_ID).toBe("book_quote");
});

test("loads all five books with their persona and items", () => {
  expect(bookQuoteBookOrder).toEqual(["dao-duc-kinh", "suy-tuong", "kinh-phap-cu", "binh-phap-ton-tu", "kinh-dich"]);
  const personas = {
    "dao-duc-kinh": "book-harmony-guide", "suy-tuong": "book-stoic-journal", "kinh-phap-cu": "book-dhammapada",
    "binh-phap-ton-tu": "book-strategic-thinker", "kinh-dich": "book-i-ching"
  } as const;
  for (const book of bookQuoteBookOrder) {
    const file = getBookQuoteFile(book);
    expect(file.book).toBe(book);
    expect(file.personaId).toBe(personas[book]);
    expect(file.items.length).toBeGreaterThan(0);
    expect(bookQuoteBookForPersona(file.personaId, true)).toBe(book);
  }
  expect(bookQuoteBookForPersona("archetype-inner-child-healer", true)).toBeUndefined();
  expect(bookQuoteBookForPersona(undefined, true)).toBeUndefined();
  expect(availableBookQuoteBooks(true)).toEqual(bookQuoteBookOrder);
});

test("the same date and book always give the same item; the item changes only with the date", () => {
  for (const book of bookQuoteBookOrder) {
    const first = pickBookQuote(book, "2026-11-27", true);
    const again = pickBookQuote(book, "2026-11-27", true);
    expect(first?.item.id).toBe(again?.item.id);
    expect(first?.dateKey).toBe("2026-11-27");
  }
  // Across a month every book shows more than one item, so the pick really moves with the date.
  for (const book of bookQuoteBookOrder) {
    const ids = new Set(Array.from({ length: 30 }, (_, day) => pickBookQuote(book, `2026-12-${String(day + 1).padStart(2, "0")}`, true)?.item.id));
    expect(ids.size).toBeGreaterThan(1);
  }
});

test("the hash is stable (FNV-1a) so a stored date never maps to a different quote after an update", () => {
  expect(stableHash("")).toBe(0x811c9dc5);
  expect(stableHash("a")).toBe(0xe40c292c);
  expect(stableHash("2026-11-27|suy-tuong")).toBe(stableHash("2026-11-27|suy-tuong"));
});

test("the local calendar date is used, not UTC", () => {
  expect(bookQuoteDateKey(new Date(2026, 10, 27, 23, 59))).toBe("2026-11-27");
  expect(bookQuoteDateKey(new Date(2026, 0, 5, 0, 1))).toBe("2026-01-05");
});

test("the line of the day is one item drawn from the whole library, stable for the day", () => {
  const today = dailyBookQuote("2026-11-27", true)!;
  expect(today.dateKey).toBe("2026-11-27");
  expect(dailyBookQuote("2026-11-27", true)?.item.id).toBe(today.item.id);
  expect(getBookQuoteFile(today.book).items.some((item) => item.id === today.item.id)).toBe(true);
  // Over two months the pick reaches several books and many lines, not one per book in turn.
  const days = Array.from({ length: 60 }, (_, day) => bookQuoteDateKey(new Date(2026, 11, day + 1)));
  const picks = days.map((day) => dailyBookQuote(day, true)!);
  expect(new Set(picks.map((pick) => pick.book)).size).toBeGreaterThan(2);
  expect(new Set(picks.map((pick) => pick.item.id)).size).toBeGreaterThan(40);
});

test("the feature has one refined title, with no book count", () => {
  expect(bookQuoteFeatureTitle("vi")).toBe("Lời người xưa");
  expect(bookQuoteFeatureTitle("en")).toBe("Words of the ancients");
});

test("the shipped content is Owner-approved, so all five books reach users with the gate closed", () => {
  expect(SHOW_DRAFT_BOOK_QUOTES).toBe(false);
  for (const book of bookQuoteBookOrder) {
    const file = getBookQuoteFile(book);
    expect(file.review.status).toBe("approved");
    expect(file.sample).toBeUndefined();
    expect(isBookQuoteFileVisible(file)).toBe(true);
    expect(pickBookQuote(book, "2026-11-27")).not.toBeNull();
    expect(bookQuoteBookForPersona(file.personaId)).toBe(book);
  }
  expect(availableBookQuoteBooks()).toEqual(bookQuoteBookOrder);
  expect(dailyBookQuote("2026-11-27")).not.toBeNull();
  expect(getBookQuoteFile("kinh-dich").items).toHaveLength(64);
});

test("draft gate: a file that is not approved never reaches users", () => {
  const file = getBookQuoteFile("suy-tuong");
  expect(isBookQuoteFileVisible({ ...file, review: { status: "draft", reviewer: null, reviewedAt: null } })).toBe(false);
  expect(isBookQuoteFileVisible({ ...file, review: { status: "reviewed", reviewer: "QA", reviewedAt: "2026-11-27" } })).toBe(false);
  expect(visibleBookQuoteItems({ ...file, review: { status: "reviewed", reviewer: "QA", reviewedAt: "2026-11-27" } })).toEqual([]);
  const gated = withBookQuoteStatuses([], () => require("../content") as typeof import("../content"));
  for (const book of gated.bookQuoteBookOrder) {
    expect(gated.pickBookQuote(book, "2026-11-27")).toBeNull();
    expect(gated.bookQuoteBookForPersona(gated.getBookQuoteFile(book).personaId)).toBeUndefined();
  }
  // No books: App passes no onBookQuote to Explore, and Home gets no card.
  expect(gated.availableBookQuoteBooks()).toEqual([]);
  expect(gated.dailyBookQuote("2026-11-27")).toBeNull();
});

test("an approved file is the only one shown, on every entry point, with the gate closed", () => {
  const gated = withBookQuoteStatuses(["suy-tuong"], () => require("../content") as typeof import("../content"));
  expect(gated.availableBookQuoteBooks()).toEqual(["suy-tuong"]);
  expect(gated.bookQuoteBookForPersona("book-stoic-journal")).toBe("suy-tuong");
  expect(gated.bookQuoteBookForPersona("book-i-ching")).toBeUndefined();
  expect(gated.dailyBookQuote("2026-11-27")?.book).toBe("suy-tuong");
  expect(gated.dailyBookQuote("2026-11-28")?.book).toBe("suy-tuong");
  expect(gated.pickBookQuote("kinh-dich", "2026-11-27")).toBeNull();
});

test("chat hand-off stays inside the server limits and carries the quote, not anything personal", () => {
  const quote = pickBookQuote("kinh-phap-cu", "2026-11-27", true)!;
  const handoff = bookQuoteHandoff(quote, "vi");
  expect(handoff.sourceType).toBe("book_quote");
  expect(handoff.sourceLabel.length).toBeLessThanOrEqual(80);
  expect(handoff.userQuestion.length).toBeLessThanOrEqual(300);
  expect(handoff.safeSummary.length).toBeLessThanOrEqual(600);
  expect(handoff.sourceLabel).toContain("Kinh Pháp Cú");
  expect(handoff.safeSummary).toContain(quote.item.quote.vi);
  expect(handoff.sourceId).toBe(`kinh-phap-cu:${quote.item.id}:2026-11-27`);
  expect(bookQuoteHandoff(quote, "en").sourceLabel).toContain("Dhammapada");
});

// The website's quote page (apps/web/src/lib/shareLanding.ts) repeats this rotation so a QR scanned on the day it
// was shared opens the same line. scripts/share-landing.test.mjs pins the same table; change both together.
describe("daily rotation shared with the website", () => {
  const table: [string, string, string, string, string][] = [
    ["2026-11-28", "kinh-dich", "kd-09", "kinh-phap-cu", "pc-025"],
    ["2026-12-31", "suy-tuong", "st-07-61", "dao-duc-kinh", "ddk-004"],
    ["2027-01-01", "kinh-dich", "kd-07", "suy-tuong", "st-02-05"],
    ["2027-02-28", "suy-tuong", "st-07-26", "kinh-dich", "kd-12"],
    ["2028-02-29", "binh-phap-ton-tu", "bp-08-04", "dao-duc-kinh", "ddk-023"]
  ];
  it.each(table)("%s", (dateKey, book, itemId, otherBook, otherItemId) => {
    const home = dailyBookQuote(dateKey);
    expect(home?.book).toBe(book);
    expect(home?.item.id).toBe(itemId);
    expect(pickBookQuote(otherBook as BookQuoteBookId, dateKey)?.item.id).toBe(otherItemId);
  });
});
