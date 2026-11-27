import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { ExploreHome } from "../ExploreHome";
import { availableBookQuoteBooks } from "../../bookQuote/content";

const baseProps = {
  language: "vi" as const, deckCount: 8, onTarot: jest.fn(), onLibrary: jest.fn(), onAstrology: jest.fn(), onNumerology: jest.fn(),
  onAllDecks: jest.fn(), decks: [], guides: [], onAllGuides: jest.fn()
};

test("the Soi chiếu group holds only live rows and opens Một câu cho hôm nay", () => {
  const onBookQuote = jest.fn();
  const screen = render(<ExploreHome {...baseProps} onBookQuote={onBookQuote} />);
  expect(screen.getByText("Soi chiếu")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("Một câu cho hôm nay. Một câu từ năm cuốn sách xưa, kèm lời bình và một câu hỏi."));
  expect(onBookQuote).toHaveBeenCalledTimes(1);
});

test("without a target the group is hidden, so there is no dead tile", () => {
  const screen = render(<ExploreHome {...baseProps} />);
  expect(screen.queryByText("Soi chiếu")).toBeNull();
  expect(screen.queryByText("Một câu cho hôm nay")).toBeNull();
});

test("with only draft book quotes the App gate passes no target, so the card is hidden", () => {
  // Same expression App.tsx uses for onBookQuote.
  const onBookQuote = availableBookQuoteBooks().length > 0 ? jest.fn() : undefined;
  expect(onBookQuote).toBeUndefined();
  const screen = render(<ExploreHome {...baseProps} onBookQuote={onBookQuote} />);
  expect(screen.queryByText("Soi chiếu")).toBeNull();
});
