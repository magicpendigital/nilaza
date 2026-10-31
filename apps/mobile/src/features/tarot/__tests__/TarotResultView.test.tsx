import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { splitSummary, TarotResultDock, TarotResultView, type ResultCard } from "../TarotResultView";

const card = (id: string, position: string, name: string, body: string): ResultCard => ({
  id, position, name, originalName: id, reversed: false, image: { uri: id }, body, keywords: ["lựa chọn"], onOpenImage: jest.fn(), onLearn: jest.fn()
});

test("summary splits into a short heading and the rest", () => {
  expect(splitSummary("Bạn đã sẵn sàng mở lòng. Điều còn thiếu là một cuộc nói chuyện thật với người ấy.")).toEqual({
    title: "Bạn đã sẵn sàng mở lòng.", body: "Điều còn thiếu là một cuộc nói chuyện thật với người ấy."
  });
  expect(splitSummary("Một câu ngắn.")).toEqual({ body: "Một câu ngắn." });
});

test("cards open one at a time, missing blocks stay hidden, and the journal prompt is passed on", () => {
  const cards = [card("The Lovers", "Bạn", "Tình Nhân", "Đoạn AI cho Tình Nhân"), card("Two of Cups", "Mối quan hệ", "Hai Cốc", "Nghĩa có sẵn của Hai Cốc")];
  const onWriteJournal = jest.fn();
  const screen = render(
    <TarotResultView language="vi" question="Mình cần biết điều gì?" cards={cards} summary="Bạn đã sẵn sàng mở lòng. Điều còn thiếu là một cuộc nói chuyện thật."
      sourceLabel="Diễn giải AI theo 2 lá" extraSections={[]} reflection="Lần gần nhất mình thấy an toàn là khi nào?" onWriteJournal={onWriteJournal} />
  );
  expect(screen.getByText("Bạn đã sẵn sàng mở lòng.")).toBeTruthy();
  expect(screen.getByText("Đoạn AI cho Tình Nhân")).toBeTruthy();
  expect(screen.queryByText("Nghĩa có sẵn của Hai Cốc")).toBeNull();
  expect(screen.queryByText("Đọc thêm diễn giải")).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: /Mối quan hệ · Xuôi/ }));
  expect(screen.getByText("Nghĩa có sẵn của Hai Cốc")).toBeTruthy();
  expect(screen.queryByText("Đoạn AI cho Tình Nhân")).toBeNull();
  fireEvent.press(screen.getByText("Học thêm về lá này →"));
  expect(cards[1].onLearn).toHaveBeenCalled();
  fireEvent.press(screen.getByRole("button", { name: "Viết vào Nhật ký" }));
  expect(onWriteJournal).toHaveBeenCalledWith("Lần gần nhất mình thấy an toàn là khi nào?");
});

test("dock saves, asks further and keeps share and report behind the menu", () => {
  const props = { onSave: jest.fn(), onAskFurther: jest.fn(), onShare: jest.fn(), onReport: jest.fn() };
  const screen = render(<TarotResultDock language="vi" {...props} />);
  fireEvent.press(screen.getByRole("button", { name: "Lưu trải bài" }));
  fireEvent.press(screen.getByRole("button", { name: "Hỏi tiếp" }));
  expect(screen.queryByText("Báo cáo nội dung")).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: /Thêm: chia sẻ ảnh/ }));
  fireEvent.press(screen.getByText("Báo cáo nội dung"));
  expect(props.onSave).toHaveBeenCalled();
  expect(props.onAskFurther).toHaveBeenCalled();
  expect(props.onReport).toHaveBeenCalled();
  expect(props.onShare).not.toHaveBeenCalled();
});
