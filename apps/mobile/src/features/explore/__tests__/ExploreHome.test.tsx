import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { ExploreHome } from "../ExploreHome";
import { availableBookQuoteBooks } from "../../bookQuote/content";

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

const baseProps = {
  language: "vi" as const, deckCount: 8, onTarot: jest.fn(), onLibrary: jest.fn(), onAstrology: jest.fn(), onNumerology: jest.fn(),
  onAllDecks: jest.fn(), decks: [], guides: [], onAllGuides: jest.fn()
};

test("the Soi chiếu group holds only live rows and opens Lời người xưa, with no book count", () => {
  const onBookQuote = jest.fn();
  const screen = render(<ExploreHome {...baseProps} onBookQuote={onBookQuote} />);
  expect(screen.getByText("Soi chiếu")).toBeTruthy();
  expect(screen.queryByText(/năm cuốn/)).toBeNull();
  fireEvent.press(screen.getByLabelText("Lời người xưa. Mỗi ngày một câu từ kho sách xưa, kèm lời bình và một câu hỏi để lặng ngẫm."));
  expect(onBookQuote).toHaveBeenCalledTimes(1);
});

test("without a target the group is hidden, so there is no dead tile", () => {
  const screen = render(<ExploreHome {...baseProps} />);
  expect(screen.queryByText("Soi chiếu")).toBeNull();
  expect(screen.queryByText("Lời người xưa")).toBeNull();
});

test("App gate: with the approved content the card shows; with only draft files it is hidden", () => {
  // Same expression App.tsx uses for onBookQuote.
  expect(availableBookQuoteBooks().length).toBeGreaterThan(0);
  const draftOnly = withBookQuoteStatuses([], () => (require("../../bookQuote/content") as typeof import("../../bookQuote/content")).availableBookQuoteBooks());
  const onBookQuote = draftOnly.length > 0 ? jest.fn() : undefined;
  expect(onBookQuote).toBeUndefined();
  const screen = render(<ExploreHome {...baseProps} onBookQuote={onBookQuote} />);
  expect(screen.queryByText("Soi chiếu")).toBeNull();
});
