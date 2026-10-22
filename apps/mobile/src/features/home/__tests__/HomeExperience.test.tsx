import React from "react";
import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { HomeExperience } from "../HomeExperience";

it("opens the exact recent entry while the Journal secondary action opens the list", () => {
  const onOpenRecent = jest.fn(), onJournal = jest.fn();
  const screen = render(<HomeExperience language="vi" greeting="Chào An" revealed onReveal={jest.fn()} onChat={jest.fn()}
    onJournal={onJournal} onOpenRecent={onOpenRecent} onNotifications={jest.fn()} unread={0} reflection={<Text>Reflection</Text>}
    cardBack={{ uri: "test-card-back" }} recent={[{ id: "saved-reading-2", title: "Bài đọc đã lưu", date: "14/10/2026" }]} />);
  fireEvent.press(screen.getByText("Bài đọc đã lưu"));
  expect(onOpenRecent).toHaveBeenCalledWith("saved-reading-2");
  expect(onJournal).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText("Mở Nhật ký"));
  expect(onJournal).toHaveBeenCalledTimes(1);
});

it("opens the reflection and keeps Chat and Journal reachable after a revisit", () => {
  const onReveal = jest.fn(), onChat = jest.fn(), onJournal = jest.fn();
  const props = { language: "vi" as const, greeting: "Chào An", revealed: false, onReveal, onChat, onJournal, onNotifications: jest.fn(), unread: 0, reflection: <Text>Same daily card</Text>, cardBack: { uri: "test-card-back" }, recent: [] };
  const screen = render(<HomeExperience {...props} />);
  fireEvent.press(screen.getByText("Bắt đầu phút phản chiếu"));
  expect(onReveal).not.toHaveBeenCalled();
  expect(screen.queryByText("Same daily card")).toBeNull();
  fireEvent.press(screen.getAllByLabelText("Đóng")[0]);
  expect(onReveal).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText("Bắt đầu phút phản chiếu"));
  fireEvent.press(screen.getByLabelText("Chạm để mở lá bài hôm nay"));
  expect(onReveal).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Same daily card")).toBeTruthy();
  fireEvent.press(screen.getAllByLabelText("Đóng")[0]);
  screen.rerender(<HomeExperience {...props} revealed />);
  fireEvent.press(screen.getByText("Xem lại phút phản chiếu"));
  expect(onReveal).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Same daily card")).toBeTruthy();
  fireEvent.press(screen.getAllByLabelText("Đóng")[0]);
  fireEvent.press(screen.getByText("Trò chuyện"));
  fireEvent.press(screen.getByText("Mở Nhật ký"));
  expect(onChat).toHaveBeenCalledTimes(1); expect(onJournal).toHaveBeenCalledTimes(1);
});
