import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { TodayCardActions, TodayCardReflection } from "../TodayCardReflection";

const moods = [{ id: "calm", label: "Bình an" }, { id: "curious", label: "Tò mò" }];

it("shows the question once and marks the chosen mood as selected", () => {
  const onMood = jest.fn();
  const screen = render(<TodayCardReflection language="vi" cardImage={{ uri: "card" }} cardName="The Star" deckName="Rose Mirror" keywords={["hy vọng"]}
    meaning="Một khởi đầu dịu." question="Điều gì giúp bạn tin lại?" microAction="Viết ba điều." moods={moods} selectedMood="curious" onMood={onMood} disclaimer="Chỉ để tự phản chiếu." />);
  expect(screen.getAllByText("Điều gì giúp bạn tin lại?")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Tò mò" }).props.accessibilityState).toEqual({ selected: true });
  expect(screen.getByRole("button", { name: "Bình an" }).props.accessibilityState).toEqual({ selected: false });
  fireEvent.press(screen.getByText("Bình an"));
  expect(onMood).toHaveBeenCalledWith("calm");
});

it("offers save, ask deeper and share, and locks save once saved", () => {
  const onSave = jest.fn(), onAskDeeper = jest.fn(), onShare = jest.fn();
  const screen = render(<TodayCardActions language="vi" saved={false} onSave={onSave} onAskDeeper={onAskDeeper} onShare={onShare} />);
  fireEvent.press(screen.getByText("Lưu vào Nhật ký"));
  fireEvent.press(screen.getByText("Hỏi sâu hơn"));
  fireEvent.press(screen.getByLabelText("Chia sẻ"));
  expect([onSave, onAskDeeper, onShare].map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1]);
  screen.rerender(<TodayCardActions language="vi" saved onSave={onSave} onAskDeeper={onAskDeeper} onShare={onShare} />);
  fireEvent.press(screen.getByText("Đã lưu"));
  expect(onSave).toHaveBeenCalledTimes(1);
});

it("lets the person answer the question and shows the saved answer read-only", () => {
  const onNoteChange = jest.fn();
  const props = { language: "vi" as const, cardImage: { uri: "card" }, cardName: "The Star", deckName: "Rose Mirror", keywords: [], meaning: "Một khởi đầu dịu.",
    question: "Điều gì giúp bạn tin lại?", microAction: "Viết ba điều.", moods, onMood: jest.fn(), disclaimer: "Chỉ để tự phản chiếu." };
  const screen = render(<TodayCardReflection {...props} note="" onNoteChange={onNoteChange} />);
  fireEvent.changeText(screen.getByLabelText("Trả lời câu hỏi hôm nay"), "Mình cần ngủ sớm.");
  expect(onNoteChange).toHaveBeenCalledWith("Mình cần ngủ sớm.");
  screen.rerender(<TodayCardReflection {...props} note="Mình cần ngủ sớm." onNoteChange={onNoteChange} savedNote="Mình cần ngủ sớm." />);
  expect(screen.queryByLabelText("Trả lời câu hỏi hôm nay")).toBeNull();
  expect(screen.getByText("Mình cần ngủ sớm.")).toBeTruthy();
});
