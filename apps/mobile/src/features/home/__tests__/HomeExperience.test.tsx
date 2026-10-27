import React from "react";
import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { HomeExperience, homeGoalSuggestion } from "../HomeExperience";

const baseProps = {
  language: "vi" as const, greeting: "Chào An", now: new Date("2024-01-25T12:00:00Z"), revealed: false, streak: 0,
  onReveal: jest.fn(), onAsk: jest.fn(), onAstrology: jest.fn(), onGoalSuggestion: jest.fn(), onJournal: jest.fn(), onNotifications: jest.fn(),
  zodiac: { hasBirthDate: false, sign: "", line: "" }, unread: 0, reflection: <Text>Same daily card</Text>, cardBack: { uri: "test-card-back" }, recent: []
};

beforeEach(() => jest.clearAllMocks());

it("opens the exact recent entry while the Journal link opens the list", () => {
  const onOpenRecent = jest.fn(), onJournal = jest.fn();
  const screen = render(<HomeExperience {...baseProps} onJournal={onJournal} onOpenRecent={onOpenRecent}
    recent={[{ id: "saved-reading-2", title: "Bài đọc đã lưu", date: "14/10/2026" }]} />);
  fireEvent.press(screen.getByText("Bài đọc đã lưu"));
  expect(onOpenRecent).toHaveBeenCalledWith("saved-reading-2");
  expect(onJournal).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText("Mở Nhật ký"));
  expect(onJournal).toHaveBeenCalledTimes(1);
});

it("reveals only after tapping the card and shows the actions after reveal", () => {
  const onReveal = jest.fn();
  const props = { ...baseProps, onReveal, reflectionActions: <Text>Card actions</Text> };
  const screen = render(<HomeExperience {...props} />);
  fireEvent.press(screen.getByLabelText("Lật lá hôm nay"));
  expect(onReveal).not.toHaveBeenCalled();
  expect(screen.queryByText("Same daily card")).toBeNull();
  expect(screen.queryByText("Card actions")).toBeNull();
  fireEvent.press(screen.getByLabelText("Chạm để mở lá bài hôm nay"));
  expect(onReveal).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Same daily card")).toBeTruthy();
  expect(screen.getByText("Card actions")).toBeTruthy();
  fireEvent.press(screen.getAllByLabelText("Đóng")[0]);
  screen.rerender(<HomeExperience {...props} revealed />);
  fireEvent.press(screen.getByLabelText("Xem lại lá hôm nay"));
  expect(onReveal).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Same daily card")).toBeTruthy();
});

it("passes typed and suggested questions to Oracle without sending them", () => {
  const onAsk = jest.fn();
  const screen = render(<HomeExperience {...baseProps} onAsk={onAsk} primaryGoal="love" />);
  fireEvent.changeText(screen.getByLabelText("Hỏi Nilaza"), "  Mình nên làm gì tiếp?  ");
  fireEvent.press(screen.getByLabelText("Mở trò chuyện với câu hỏi này"));
  expect(onAsk).toHaveBeenLastCalledWith("Mình nên làm gì tiếp?");
  fireEvent.press(screen.getByText("Có nên nhắn lại không?"));
  expect(onAsk).toHaveBeenLastCalledWith("Có nên nhắn lại không?");
});

it("personalizes the suggestion by the first goal and shows sky and streak", () => {
  const onGoalSuggestion = jest.fn(), onAstrology = jest.fn();
  const screen = render(<HomeExperience {...baseProps} primaryGoal="love" streak={3} onGoalSuggestion={onGoalSuggestion} onAstrology={onAstrology}
    zodiac={{ hasBirthDate: true, sign: "Song Ngư", line: "Một lời nhắn nhẹ." }} />);
  fireEvent.press(screen.getByLabelText("Trải bài tình yêu. Một câu hỏi về mối quan hệ"));
  expect(onGoalSuggestion).toHaveBeenCalledWith("love");
  expect(screen.getByText("Trăng tròn")).toBeTruthy();
  expect(screen.getByText("Song Ngư · hôm nay")).toBeTruthy();
  expect(screen.getByLabelText("Chuỗi 3 ngày")).toBeTruthy();
  fireEvent.press(screen.getByText("Một lời nhắn nhẹ."));
  expect(onAstrology).toHaveBeenCalledTimes(1);
});

it("falls back to a self reading for goals without their own suggestion", () => {
  expect(homeGoalSuggestion("healing", "vi").topic).toBe("self");
  expect(homeGoalSuggestion(undefined, "en").title).toBe("A reading about you");
  expect(homeGoalSuggestion("career", "en").topic).toBe("career");
});
