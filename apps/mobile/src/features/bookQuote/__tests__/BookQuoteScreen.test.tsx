import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { BookQuoteScreen } from "../BookQuoteScreen";
import { bookQuoteTitle, pickBookQuote } from "../content";
import { bookQuoteSavedStorageKey } from "../savedQuotes";

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
  onAskPersona: jest.fn(), onWriteJournal: jest.fn(), onEvent: jest.fn(), onBack: jest.fn()
};

beforeEach(() => jest.clearAllMocks());

test("shows today's quote for the chosen book with commentary, question, actions and footnote", () => {
  const expected = pickBookQuote("suy-tuong", dateKey)!;
  const screen = render(<BookQuoteScreen {...baseProps} initialBook="suy-tuong" />);
  expect(screen.getByText("Một câu cho hôm nay")).toBeTruthy();
  expect(screen.getByTestId("book-quote-text").props.children).toBe(`“${expected.item.quote.vi}”`);
  expect(screen.getByText(expected.item.ref.vi)).toBeTruthy();
  expect(screen.getByText("LỜI BÌNH")).toBeTruthy();
  expect(screen.getByText(expected.item.gloss.vi)).toBeTruthy();
  expect(screen.getByText("CÂU HỎI CHO BẠN")).toBeTruthy();
  expect(screen.getByText(expected.item.question.vi)).toBeTruthy();
  expect(screen.getByText("Nilaza dịch từ nguyên văn")).toBeTruthy();
  expect(screen.getByText("Mỗi sách một câu mỗi ngày; mở lại trong ngày vẫn là câu này.")).toBeTruthy();
  expect(screen.getByText("CÁC SÁCH KHÁC HÔM NAY")).toBeTruthy();
  // No draft badge is shown to users.
  expect(screen.queryByText(/bản thử|draft|sample/i)).toBeNull();
  expect(baseProps.onEvent).toHaveBeenCalledWith("book_quote_opened", { book: "suy-tuong" });
});

test("reopening the same day shows the same quote", () => {
  const first = render(<BookQuoteScreen {...baseProps} initialBook="kinh-dich" />).getByTestId("book-quote-text").props.children;
  const second = render(<BookQuoteScreen {...baseProps} initialBook="kinh-dich" />).getByTestId("book-quote-text").props.children;
  expect(second).toBe(first);
});

test("tabs and the other-books list switch the book", () => {
  const screen = render(<BookQuoteScreen {...baseProps} initialBook="suy-tuong" />);
  const tab = screen.getByRole("tab", { name: bookQuoteTitle("kinh-phap-cu", "vi") });
  fireEvent.press(tab);
  expect(screen.getByTestId("book-quote-text").props.children).toBe(`“${pickBookQuote("kinh-phap-cu", dateKey)!.item.quote.vi}”`);
  expect(screen.getByRole("tab", { name: bookQuoteTitle("kinh-phap-cu", "vi") }).props.accessibilityState).toEqual({ selected: true });
  const daoQuote = pickBookQuote("dao-duc-kinh", dateKey)!;
  fireEvent.press(screen.getByLabelText(`${bookQuoteTitle("dao-duc-kinh", "vi")}. ${daoQuote.item.quote.vi}`));
  expect(screen.getByTestId("book-quote-text").props.children).toBe(`“${daoQuote.item.quote.vi}”`);
});

test("ask, journal and back call through with today's quote", () => {
  const screen = render(<BookQuoteScreen {...baseProps} initialBook="suy-tuong" />);
  fireEvent.press(screen.getByText("Hỏi tiếp Nhật ký khắc kỷ"));
  expect(baseProps.onAskPersona).toHaveBeenCalledWith(expect.objectContaining({ book: "suy-tuong", dateKey }));
  fireEvent.press(screen.getByText("Viết vào nhật ký"));
  expect(baseProps.onWriteJournal).toHaveBeenCalledWith(expect.objectContaining({ book: "suy-tuong" }));
  fireEvent.press(screen.getByLabelText("Quay lại"));
  expect(baseProps.onBack).toHaveBeenCalledTimes(1);
});

test("save toggles, persists to account storage and lists the saved quote", async () => {
  const storage = memoryStorage();
  const expected = pickBookQuote("suy-tuong", dateKey)!;
  const screen = render(<BookQuoteScreen {...baseProps} initialBook="suy-tuong" storage={storage} />);
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
  const signedIn = render(<BookQuoteScreen {...baseProps} initialBook="suy-tuong" storage={storage} />);
  expect(await signedIn.findByText("Câu đã lưu trước")).toBeTruthy();
  signedIn.unmount();
  const guest = render(<BookQuoteScreen {...baseProps} initialBook="suy-tuong" />);
  fireEvent.press(guest.getByLabelText("Lưu câu này"));
  expect(guest.getByText("Bạn đang dùng thử: câu đã lưu chỉ giữ đến khi đóng ứng dụng.")).toBeTruthy();
});

test("English labels", () => {
  const screen = render(<BookQuoteScreen {...baseProps} language="en" initialBook="kinh-phap-cu" />);
  expect(screen.getByText("A line for today")).toBeTruthy();
  expect(screen.getByText("COMMENTARY")).toBeTruthy();
  expect(screen.getByText("A QUESTION FOR YOU")).toBeTruthy();
  expect(screen.getByText("Ask Kinh Pháp Cú more")).toBeTruthy();
});
