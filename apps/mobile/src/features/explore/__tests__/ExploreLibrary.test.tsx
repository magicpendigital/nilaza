import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { ExploreHome } from "../ExploreHome";
import { CardLibrary, type LibraryCard } from "../../tarot/CardLibrary";

const image = { uri: "https://example.com/card.png" };

test("Explore follows the design and keeps face reading as coming soon", () => {
  const handlers = { onTarot: jest.fn(), onLibrary: jest.fn(), onAstrology: jest.fn(), onAllDecks: jest.fn(), onAllGuides: jest.fn() };
  const onDeck = jest.fn();
  const onCouncil = jest.fn();
  const screen = render(
    <ExploreHome language="vi" deckCount={8} {...handlers}
      decks={[{ mood: "Tình yêu", deckName: "Rose Mirror", image, onPress: onDeck }]}
      guides={[{ key: "council", title: "Hội đồng 3 góc nhìn", detail: "Ba người dẫn cùng soi một quyết định", thumbnails: [image], onPress: onCouncil }]} />
  );
  expect(screen.getByText("78 lá · 8 bộ bài · có giải nghĩa theo câu hỏi của bạn")).toBeTruthy();
  fireEvent.press(screen.getByText("Trải bài"));
  fireEvent.press(screen.getByText("Học 78 lá"));
  fireEvent.press(screen.getByText("Xem 8 bộ"));
  fireEvent.press(screen.getByLabelText("Tình yêu: Rose Mirror"));
  fireEvent.press(screen.getByText("Hội đồng 3 góc nhìn"));
  expect(handlers.onTarot).toHaveBeenCalled();
  expect(handlers.onLibrary).toHaveBeenCalled();
  expect(handlers.onAllDecks).toHaveBeenCalled();
  expect(onDeck).toHaveBeenCalled();
  expect(onCouncil).toHaveBeenCalled();
  expect(screen.getByLabelText("Xem tướng mặt, sắp có")).toBeTruthy();
  // The approved synastry wording never promises whether two people "match".
  expect(screen.queryByText(/hợp nhau/)).toBeNull();
});

test("the library counts learned cards and filters by group", () => {
  const cards: LibraryCard[] = [
    { id: "major-06", group: "major", name: "Tình Nhân", sub: "VI · The Lovers", image, learned: true },
    { id: "major-17", group: "major", name: "Ngôi Sao", sub: "XVII · The Star", image, learned: false },
    { id: "cups-01", group: "cups", name: "Át Cốc", sub: "Ace of Cups", image, learned: false }
  ];
  const onOpen = jest.fn();
  const screen = render(<CardLibrary language="vi" deckName="Rose Mirror" cards={cards} onOpen={onOpen} onPreview={jest.fn()} />);
  expect(screen.getByText("Bộ Rose Mirror")).toBeTruthy();
  expect(screen.getByText("Đã học 1/3")).toBeTruthy();
  fireEvent.press(screen.getByText("Ẩn chính · 2"));
  expect(screen.getByText("22 chặng của một hành trình lớn, từ bước đầu tò mò đến khi khép một vòng.")).toBeTruthy();
  expect(screen.queryByText("Át Cốc")).toBeNull();
  fireEvent.press(screen.getByText("Cốc"));
  expect(screen.getByText("Ace of Cups")).toBeTruthy();
  fireEvent.press(screen.getByText("Át Cốc"));
  expect(onOpen).toHaveBeenCalledWith("cups-01");
});
