import {
  BOOK_QUOTE_FEATURE_ID, SHOW_DRAFT_BOOK_QUOTES, availableBookQuoteBooks, bookQuoteBookForPersona, bookQuoteBookOrder, bookQuoteDateKey, bookQuoteHandoff,
  getBookQuoteFile, homeBookQuote, homeBookQuoteBook, isBookQuoteFileVisible, pickBookQuote, stableHash, visibleBookQuoteItems
} from "../content";

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

test("Home rotates one book per day through all five books", () => {
  const days = ["2026-11-27", "2026-11-28", "2026-11-29", "2026-11-30", "2026-12-01"];
  const shown = days.map((day) => homeBookQuoteBook(day, true));
  expect(new Set(shown).size).toBe(5);
  expect(homeBookQuoteBook("2026-12-02", true)).toBe(shown[0]);
  const today = homeBookQuote("2026-11-27", true);
  expect(today?.book).toBe(shown[0]);
  expect(today?.item.id).toBe(pickBookQuote(shown[0]!, "2026-11-27", true)?.item.id);
});

test("draft gate is closed by default: with every file still draft nothing reaches users", () => {
  expect(SHOW_DRAFT_BOOK_QUOTES).toBe(false);
  for (const book of bookQuoteBookOrder) {
    const file = getBookQuoteFile(book);
    expect(file.review.status).toBe("draft");
    expect(isBookQuoteFileVisible(file)).toBe(false);
    expect(visibleBookQuoteItems(file)).toEqual([]);
    expect(pickBookQuote(book, "2026-11-27")).toBeNull();
    // The persona page button has no book to open.
    expect(bookQuoteBookForPersona(file.personaId)).toBeUndefined();
  }
  // No books: App passes no onBookQuote to Explore, and Home gets no card.
  expect(availableBookQuoteBooks()).toEqual([]);
  expect(homeBookQuoteBook("2026-11-27")).toBeNull();
  expect(homeBookQuote("2026-11-27")).toBeNull();
  const file = getBookQuoteFile("suy-tuong");
  expect(isBookQuoteFileVisible({ ...file, review: { status: "reviewed", reviewer: "QA", reviewedAt: "2026-11-27" } })).toBe(false);
  expect(isBookQuoteFileVisible({ ...file, review: { status: "approved", reviewer: "QA", reviewedAt: "2026-11-27" } })).toBe(true);
});

test("an approved file is the only one shown, on every entry point, with the gate closed", () => {
  jest.isolateModules(() => {
    jest.doMock("../../../../../../packages/content/data/book-quotes/suy-tuong.json", () => {
      const actual = jest.requireActual("../../../../../../packages/content/data/book-quotes/suy-tuong.json");
      return { ...actual, sample: false, review: { status: "approved", reviewer: "QA fixture", reviewedAt: "2026-11-27" } };
    });
    const gated = require("../content") as typeof import("../content");
    expect(gated.availableBookQuoteBooks()).toEqual(["suy-tuong"]);
    expect(gated.bookQuoteBookForPersona("book-stoic-journal")).toBe("suy-tuong");
    expect(gated.bookQuoteBookForPersona("book-i-ching")).toBeUndefined();
    expect(gated.homeBookQuote("2026-11-27")?.book).toBe("suy-tuong");
    expect(gated.homeBookQuote("2026-11-28")?.book).toBe("suy-tuong");
    expect(gated.pickBookQuote("kinh-dich", "2026-11-27")).toBeNull();
  });
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
