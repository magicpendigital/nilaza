import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { GoalsScreen } from "../GoalsScreen";

const choices = [
  { id: "love", label: "Tình yêu" },
  { id: "career", label: "Công việc" },
  { id: "decision", label: "Ra quyết định" }
];

test("onboarding follows the design with optional birth date and sign", () => {
  const props = {
    language: "vi" as const, choices, selected: ["love"], saving: false, error: "",
    onToggle: jest.fn(), onContinue: jest.fn(), onSkip: jest.fn(), birthDate: "2000-03-15", onBirthDateChange: jest.fn()
  };
  const screen = render(<GoalsScreen {...props} sign={{ id: "pisces", label: "Song Ngư" }} />);
  expect(screen.getByText("Bước 2/2")).toBeTruthy();
  expect(screen.getByText("Điều gì đang ở trong lòng bạn?")).toBeTruthy();
  expect(screen.getByRole("checkbox", { name: "Tình yêu" }).props.accessibilityState.checked).toBe(true);
  fireEvent.press(screen.getByText("Ra quyết định"));
  expect(props.onToggle).toHaveBeenCalledWith("decision");
  expect(screen.getByText("Song Ngư")).toBeTruthy();
  expect(screen.getByText("Lưu trên máy bạn; xóa bất cứ lúc nào trong mục Tôi.")).toBeTruthy();
  fireEvent.press(screen.getByText("Vào Nilaza"));
  expect(props.onContinue).toHaveBeenCalled();
  fireEvent.press(screen.getByText("Để sau"));
  expect(props.onSkip).toHaveBeenCalled();
});

test("without a birth date no sign line is shown", () => {
  const screen = render(<GoalsScreen language="vi" choices={choices} selected={[]} saving={false} error="" onToggle={jest.fn()}
    onContinue={jest.fn()} onSkip={jest.fn()} birthDate="" onBirthDateChange={jest.fn()} />);
  expect(screen.queryByText(/Bạn thuộc cung/)).toBeNull();
});
