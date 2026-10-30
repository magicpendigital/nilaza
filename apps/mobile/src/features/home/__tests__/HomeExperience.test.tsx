import React from "react";
import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { HomeExperience, homeGoalSuggestion, homeSubtitle } from "../HomeExperience";

const baseProps = {
  language: "vi" as const, greeting: "Chào An", now: new Date("2024-01-25T12:00:00Z"), revealed: false, streak: 0,
  onReveal: jest.fn(), onAsk: jest.fn(), onAstrology: jest.fn(), onGoalSuggestion: jest.fn(), onJournal: jest.fn(), onNotifications: jest.fn(), onWritePrompt: jest.fn(),
  zodiac: { hasBirthDate: false, sign: "", line: "" }, unread: 0, reflection: <Text>Same daily card</Text>, cardBack: { uri: "test-card-back" }
};

beforeEach(() => jest.clearAllMocks());

it("opens the exact latest entry while the Journal link opens the list", () => {
  const onOpenRecent = jest.fn(), onJournal = jest.fn();
  const screen = render(<HomeExperience {...baseProps} onJournal={onJournal} onOpenRecent={onOpenRecent}
    latest={{ id: "saved-reading-2", title: "Bài đọc đã lưu", meta: "Trải 3 lá · hôm qua · đã lưu", thumbs: [{ uri: "a" }, { uri: "b" }, { uri: "c" }] }} />);
  expect(screen.getByText("Trải 3 lá · hôm qua · đã lưu")).toBeTruthy();
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

it("changes topic locally and routes the rail cards to tarot, Oracle prefill and a journal prompt", () => {
  const onGoalSuggestion = jest.fn(), onAsk = jest.fn(), onWritePrompt = jest.fn();
  const screen = render(<HomeExperience {...baseProps} primaryGoal="love" onGoalSuggestion={onGoalSuggestion} onAsk={onAsk} onWritePrompt={onWritePrompt} />);
  expect(screen.getByText("Dành cho bạn · Tình yêu")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("Hỏi về một người. Kể Nilaza nghe về người ấy"));
  expect(onAsk).toHaveBeenLastCalledWith("Mình đang nghĩ về một người và muốn hiểu rõ cảm xúc của mình.");
  fireEvent.press(screen.getByText("Viết về một mối quan hệ"));
  expect(onWritePrompt).toHaveBeenLastCalledWith("Viết về một mối quan hệ");
  fireEvent.press(screen.getByText("Đổi chủ đề"));
  expect(screen.getByText("Dành cho bạn · Sự nghiệp")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("Trải bài sự nghiệp. Một câu hỏi về công việc"));
  expect(onGoalSuggestion).toHaveBeenLastCalledWith("career");
  fireEvent.press(screen.getByText("Đổi chủ đề"));
  expect(screen.getByText("Dành cho bạn · Bản thân")).toBeTruthy();
  fireEvent.press(screen.getByText("Đổi chủ đề"));
  expect(screen.getByText("Dành cho bạn · Tình yêu")).toBeTruthy();
});

it("matches the subtitle to the time of day", () => {
  expect(homeSubtitle(new Date(2026, 9, 30, 7, 0), "vi")).toBe("Một phút cho riêng mình trước khi bắt đầu ngày.");
  expect(homeSubtitle(new Date(2026, 9, 30, 13, 0), "vi")).toBe("Dừng lại một chút giữa ngày.");
  expect(homeSubtitle(new Date(2026, 9, 30, 22, 0), "vi")).toBe("Ba phút cho riêng mình trước khi ngủ.");
});
