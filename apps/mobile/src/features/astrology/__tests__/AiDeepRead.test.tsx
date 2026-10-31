import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { AiDeepRead } from "../AiDeepRead";

const base = { language: "vi" as const, premiumOnSale: false, onWrite: jest.fn(), onOpenFull: jest.fn() };

test("free accounts see what the AI adds and Premium as coming soon", () => {
  const screen = render(<AiDeepRead {...base} available={false} status="locked" />);
  expect(screen.getByText(/Một bài đọc riêng nối Mặt Trời/)).toBeTruthy();
  fireEvent.press(screen.getByText("Có trong Premium"));
  expect(screen.getByText("Sắp ra mắt.")).toBeTruthy();
  expect(screen.queryByText(/Viết bài đọc sâu/)).toBeNull();
});

test("Premium writes one deep read a day and then shows it", () => {
  const onWrite = jest.fn();
  const ready = render(<AiDeepRead {...base} onWrite={onWrite} available status="ready" />);
  fireEvent.press(ready.getByText("Viết bài đọc sâu · 1 lượt/ngày"));
  expect(onWrite).toHaveBeenCalled();
  const onOpenFull = jest.fn();
  const done = render(<AiDeepRead {...base} onOpenFull={onOpenFull} available status="success" answer={{ title: "Ba nhịp của bạn", paragraphs: ["Đoạn đầu."] }} />);
  expect(done.getByText("Ba nhịp của bạn")).toBeTruthy();
  fireEvent.press(done.getByText("Đọc đầy đủ"));
  expect(onOpenFull).toHaveBeenCalled();
});

test("a failed request shows its message", () => {
  const screen = render(<AiDeepRead {...base} available status="error" error="Hôm nay bạn đã dùng lượt AI Chiêm tinh." />);
  expect(screen.getByText("Hôm nay bạn đã dùng lượt AI Chiêm tinh.")).toBeTruthy();
});
