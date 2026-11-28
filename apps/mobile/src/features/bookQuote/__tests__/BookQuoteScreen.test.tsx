import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { BookQuoteScreen } from "../BookQuoteScreen";
import { bookQuoteAuthor, bookQuoteTitle, dailyBookQuote, pickBookQuote } from "../content";
import { bookQuoteSavedStorageKey } from "../savedQuotes";

// The Free / Premium hook caches the published switch in device storage.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

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

const memoryStorage = (initial: Record<string, unknown> = {}) => {
  const data: Record<string, unknown> = { ...initial };
  return {
    data,
    loadJson: jest.fn(async (key: string, fallback: unknown) => (key in data ? data[key] : fallback)) as any,
    saveJson: jest.fn(async (key: string, value: unknown) => { data[key] = value; }) as any
  };
};

const dateKey = "2026-11-27";
const names: Record<string, string> = { "book-stoic-journal": "Nhật ký khắc kỷ", "book-dhammapada": "Kinh Pháp Cú" };
const baseProps = {
  language: "vi" as const, dateKey, personaName: (id: string) => names[id] ?? "người dẫn",
  onAskPersona: jest.fn(), onWriteJournal: jest.fn(), onEvent: jest.fn(), onBack: jest.fn(),
  showDrafts: false
};

beforeEach(() => jest.clearAllMocks());

test("shows today's quote for the chosen book with commentary, question, actions and footnote", () => {
  const expected = pickBookQuote("suy-tuong", dateKey, true)!;
  const screen = render(<BookQuoteScreen {...baseProps} book="suy-tuong" />);
  expect(screen.getByText("Lời người xưa")).toBeTruthy();
  expect(screen.getByTestId("book-quote-text").props.children).toBe(`“${expected.item.quote.vi}”`);
  expect(screen.getByText(expected.item.ref.vi)).toBeTruthy();
  expect(screen.getByText("LỜI BÌNH")).toBeTruthy();
  expect(screen.getByText(expected.item.gloss.vi)).toBeTruthy();
  expect(screen.getByText("CÂU HỎI CHO BẠN")).toBeTruthy();
  expect(screen.getByText(expected.item.question.vi)).toBeTruthy();
  expect(screen.getByText(expected.file.source.vietnamese)).toBeTruthy();
  expect(screen.getByText("Mỗi ngày chỉ một câu, chọn từ kho sách xưa. Ngày mai sẽ là một câu khác.")).toBeTruthy();
  // One line only: no per-book tabs and no other-books list (Owner 28/11/2026).
  expect(screen.queryByRole("tab")).toBeNull();
  expect(screen.queryByText("CÁC SÁCH KHÁC HÔM NAY")).toBeNull();
  expect(screen.queryByText(/năm cuốn/)).toBeNull();
  // No draft badge is shown to users.
  expect(screen.queryByText(/bản thử|draft|sample/i)).toBeNull();
  expect(baseProps.onEvent).toHaveBeenCalledWith("book_quote_opened", { book: "suy-tuong" });
});

test("reopening the same day shows the same quote", () => {
  const first = render(<BookQuoteScreen {...baseProps} book="kinh-dich" />).getByTestId("book-quote-text").props.children;
  const second = render(<BookQuoteScreen {...baseProps} book="kinh-dich" />).getByTestId("book-quote-text").props.children;
  expect(second).toBe(first);
});

test("opened without a book (Home, Explore) it shows the one line of the day from the whole library", () => {
  const expected = dailyBookQuote(dateKey)!;
  const screen = render(<BookQuoteScreen {...baseProps} />);
  expect(screen.getByTestId("book-quote-text").props.children).toBe(`“${expected.item.quote.vi}”`);
  expect(screen.getByText(`— ${bookQuoteAuthor(expected.book, "vi") === bookQuoteTitle(expected.book, "vi") ? bookQuoteTitle(expected.book, "vi") : `${bookQuoteAuthor(expected.book, "vi")} · ${bookQuoteTitle(expected.book, "vi")}`}`)).toBeTruthy();
  expect(baseProps.onEvent).toHaveBeenCalledWith("book_quote_opened", { book: expected.book });
});

test("ask, journal and back call through with today's quote", () => {
  const screen = render(<BookQuoteScreen {...baseProps} book="suy-tuong" />);
  fireEvent.press(screen.getByText("Hỏi tiếp Nhật ký khắc kỷ"));
  expect(baseProps.onAskPersona).toHaveBeenCalledWith(expect.objectContaining({ book: "suy-tuong", dateKey }));
  fireEvent.press(screen.getByText("Viết vào nhật ký"));
  expect(baseProps.onWriteJournal).toHaveBeenCalledWith(expect.objectContaining({ book: "suy-tuong" }));
  fireEvent.press(screen.getByLabelText("Quay lại"));
  expect(baseProps.onBack).toHaveBeenCalledTimes(1);
});

test("save toggles, persists to account storage and lists the saved quote", async () => {
  const storage = memoryStorage();
  const expected = pickBookQuote("suy-tuong", dateKey, true)!;
  const screen = render(<BookQuoteScreen {...baseProps} book="suy-tuong" storage={storage} />);
  await waitFor(() => expect(storage.loadJson).toHaveBeenCalled());
  fireEvent.press(screen.getByLabelText("Lưu câu này"));
  expect(screen.getByLabelText("Đã lưu. Bỏ lưu câu này")).toBeTruthy();
  expect(screen.getByText("CÂU BẠN ĐÃ LƯU")).toBeTruthy();
  await waitFor(() => expect((storage.data[bookQuoteSavedStorageKey] as any)?.items?.[0]?.id).toBe(expected.item.id));
  expect(baseProps.onEvent).toHaveBeenCalledWith("book_quote_saved", { book: "suy-tuong", saved: true });
  fireEvent.press(screen.getByLabelText("Đã lưu. Bỏ lưu câu này"));
  expect(screen.queryByText("CÂU BẠN ĐÃ LƯU")).toBeNull();
  await waitFor(() => expect((storage.data[bookQuoteSavedStorageKey] as any).items).toEqual([]));
});

test("loads previously saved quotes; a guest keeps them in memory with a note", async () => {
  const storage = memoryStorage({ [bookQuoteSavedStorageKey]: { schemaVersion: 1, items: [
    { id: "pc-005", book: "kinh-phap-cu", dateKey: "2026-11-20", savedAt: "2026-11-20T08:00:00.000Z", ref: "Kệ 5", quote: "Câu đã lưu trước" }
  ] } });
  const signedIn = render(<BookQuoteScreen {...baseProps} book="suy-tuong" storage={storage} />);
  expect(await signedIn.findByText("Câu đã lưu trước")).toBeTruthy();
  signedIn.unmount();
  const guest = render(<BookQuoteScreen {...baseProps} book="suy-tuong" />);
  fireEvent.press(guest.getByLabelText("Lưu câu này"));
  expect(guest.getByText("Bạn đang dùng thử: câu đã lưu chỉ giữ đến khi đóng ứng dụng.")).toBeTruthy();
});

test("English labels", () => {
  const screen = render(<BookQuoteScreen {...baseProps} language="en" book="kinh-phap-cu" />);
  expect(screen.getByText("Words of the ancients")).toBeTruthy();
  expect(screen.getByText("Just one line a day, drawn from the old books. Tomorrow brings another.")).toBeTruthy();
  expect(screen.getByText("COMMENTARY")).toBeTruthy();
  expect(screen.getByText("A QUESTION FOR YOU")).toBeTruthy();
  expect(screen.getByText("Ask Kinh Pháp Cú more")).toBeTruthy();
  expect(screen.getByText("English: F. Max Müller 1881 (public domain)")).toBeTruthy();
});

test("with the gate closed and only draft files, a calm empty state shows and Back still works", () => {
  // Share the test's React and React Native with the re-required screen, so hooks run in one renderer.
  const Gated = withBookQuoteStatuses([], () => {
    jest.doMock("react", () => React);
    jest.doMock("react-native", () => jest.requireActual("react-native"));
    return (require("../BookQuoteScreen") as typeof import("../BookQuoteScreen")).BookQuoteScreen;
  });
  const screen = render(<Gated {...baseProps} book="suy-tuong" />);
  expect(screen.getByText("Nội dung đang được hoàn thiện.")).toBeTruthy();
  expect(screen.queryByTestId("book-quote-text")).toBeNull();
  expect(screen.queryAllByRole("tab")).toHaveLength(0);
  expect(screen.queryByText("Lưu câu này")).toBeNull();
  expect(baseProps.onEvent).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText("Quay lại"));
  expect(baseProps.onBack).toHaveBeenCalledTimes(1);
  const english = render(<Gated {...baseProps} language="en" />);
  expect(english.getByText("This content is being finished.")).toBeTruthy();
});

describe("Free / Premium switch (book_quote)", () => {
  const { createFeatureAccessService } = require("../../access/featureAccessService") as typeof import("../../access/featureAccessService");
  const { defaultFeatureAccessConfig } = require("../../access/featureAccessConfig") as typeof import("../../access/featureAccessConfig");
  const premiumBookQuote = () => {
    const config = defaultFeatureAccessConfig();
    config.features.book_quote = { ...config.features.book_quote, tier: "premium" };
    return createFeatureAccessService({ fetcher: async () => ({ version: 2, publishedAt: null, config }), storageKey: "test.bookQuote.access" });
  };

  test("default config (Free): the quote shows for everyone", async () => {
    const service = createFeatureAccessService({ fetcher: async () => null, storageKey: "test.bookQuote.access" });
    const screen = render(<BookQuoteScreen {...baseProps} book="suy-tuong" featureAccessService={service} />);
    await waitFor(() => expect(service.get().source).toBe("remote"));
    expect(screen.getByTestId("book-quote-text")).toBeTruthy();
    expect(screen.queryByTestId("premium-gate-book_quote")).toBeNull();
  });

  test("published as Premium: locked for a free account, saved quotes stay visible, open for Premium", async () => {
    const storage = memoryStorage({
      [bookQuoteSavedStorageKey]: { schemaVersion: 1, items: [{ id: "saved-1", book: "suy-tuong", dateKey, savedAt: "2026-11-26T00:00:00Z", ref: "II.1", quote: "Câu đã lưu" }] }
    });
    const onOpenPremium = jest.fn();
    const screen = render(<BookQuoteScreen {...baseProps} book="suy-tuong" storage={storage} featureAccessService={premiumBookQuote()} onOpenPremium={onOpenPremium} />);
    await waitFor(() => expect(screen.getByTestId("premium-gate-book_quote")).toBeTruthy());
    expect(screen.queryByTestId("book-quote-text")).toBeNull();
    await waitFor(() => expect(screen.getByText("Câu đã lưu")).toBeTruthy());
    fireEvent.press(screen.getByTestId("premium-gate-open"));
    expect(onOpenPremium).toHaveBeenCalledTimes(1);

    const premiumService = premiumBookQuote();
    const premium = render(<BookQuoteScreen {...baseProps} book="suy-tuong" isPremium featureAccessService={premiumService} />);
    await waitFor(() => expect(premiumService.get().version).toBe(2));
    await waitFor(() => expect(premium.getByTestId("book-quote-text")).toBeTruthy());
    expect(premium.queryByTestId("premium-gate-book_quote")).toBeNull();
  });
});
