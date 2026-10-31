import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import cards from "../../../../../../packages/content/data/tarot-cards.json";
import { getTarotCardGuide } from "../cardGuide";
import { TarotCardGuide } from "../TarotCardGuide";

test("every card has a complete guide in both languages", () => {
  for (const card of cards) {
    for (const language of ["vi", "en"] as const) {
      const guide = getTarotCardGuide(card.id, language);
      expect(guide).not.toBeNull();
      expect(guide!.topics.map((topic) => topic.id)).toEqual(["love", "career", "self"]);
      for (const text of [...guide!.topics.map((topic) => topic.body), guide!.misconception, guide!.element, guide!.astrology]) expect(text.trim().length).toBeGreaterThan(0);
    }
  }
  expect(getTarotCardGuide("not-a-card", "vi")).toBeNull();
});

test("guide carries the Owner-approved support, other readings and astrology notes", () => {
  expect(getTarotCardGuide("minor-swords-ten", "vi")!.supportNote).toContain("115");
  expect(getTarotCardGuide("minor-cups-three", "vi")!.otherReadings).toContain("Waite");
  expect(getTarotCardGuide("minor-wands-knight", "vi")!.notes[0]).toContain("Hiệp Sĩ");
  const world = getTarotCardGuide("major-21-world", "en")!;
  expect(world.notes).toHaveLength(2);
  expect(getTarotCardGuide("major-00-fool", "vi")!.modernPlanet).toBe("Sao Thiên Vương");
});

function renderGuide(drawnReversed?: boolean) {
  const card = cards.find((item) => item.id === "major-06-lovers")!;
  const onPrevious = jest.fn();
  const onOpenImage = jest.fn();
  const screen = render(
    <TarotCardGuide language="vi" name={card.name.vi} originalName={card.name.en} arcanaLabel="Ẩn chính · VI" image={{ uri: "card" }}
      uprightMeaning="Nghĩa xuôi" reversedMeaning="Nghĩa ngược" drawnReversed={drawnReversed} guide={getTarotCardGuide(card.id, "vi")}
      practice={card.reflectionQuestion.vi} onOpenImage={onOpenImage}
      previous={{ name: "Giáo Hoàng", onPress: onPrevious }} next={{ name: "Cỗ Xe", onPress: jest.fn() }} />
  );
  return { screen, onPrevious, onOpenImage };
}

test("library view opens upright with topics, misreading, practice and neighbours", () => {
  const { screen, onPrevious, onOpenImage } = renderGuide();
  expect(screen.getByText("Tình Nhân")).toBeTruthy();
  expect(screen.getByText("The Lovers")).toBeTruthy();
  expect(screen.getByText("Nguyên tố: Khí")).toBeTruthy();
  expect(screen.getByText("Chiêm tinh: Song Tử")).toBeTruthy();
  expect(screen.getByText("Nghĩa xuôi")).toBeTruthy();
  expect(screen.getByText("Trong tình yêu")).toBeTruthy();
  expect(screen.getByText("Hay bị hiểu nhầm")).toBeTruthy();
  expect(screen.getByText("Thực hành")).toBeTruthy();
  expect(screen.queryByText(/Trong trải bài/)).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "Lá trước: Giáo Hoàng" }));
  expect(onPrevious).toHaveBeenCalled();
  fireEvent.press(screen.getByRole("imagebutton"));
  expect(onOpenImage).toHaveBeenCalledWith(false);
});

test("a reversed card from a reading opens on Ngược and hides the upright topics", () => {
  const { screen, onOpenImage } = renderGuide(true);
  expect(screen.getByText("Trong trải bài: Ngược")).toBeTruthy();
  expect(screen.getByText("Nghĩa ngược")).toBeTruthy();
  expect(screen.queryByText("Trong tình yêu")).toBeNull();
  fireEvent.press(screen.getByRole("imagebutton"));
  expect(onOpenImage).toHaveBeenCalledWith(true);
  fireEvent.press(screen.getByRole("tab", { name: "Xuôi" }));
  expect(screen.getByText("Trong tình yêu")).toBeTruthy();
});
