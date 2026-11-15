import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { AiDeepRead } from "../AiDeepRead";

const base = { language: "vi" as const, premiumOnSale: false, onWrite: jest.fn(), onOpenFull: jest.fn() };

test("while Premium is not on sale a locked account sees a plain note, never \"Sắp ra mắt\" (UX review K4)", () => {
  const screen = render(<AiDeepRead {...base} available={false} status="locked" />);
  expect(screen.getByText(/Một bài đọc riêng nối Mặt Trời/)).toBeTruthy();
  expect(screen.getByText("Bài đọc sâu chưa mở cho tài khoản này.")).toBeTruthy();
  expect(screen.queryByText("Có trong Premium")).toBeNull();
  expect(screen.queryByText(/Sắp ra mắt/)).toBeNull();
  expect(screen.queryByText(/Viết bài đọc sâu/)).toBeNull();
});

test("a guest is offered sign-in with the daily limit (UX review K4/U1)", () => {
  const onSignIn = jest.fn();
  const screen = render(<AiDeepRead {...base} available={false} status="locked" signInRequired onSignIn={onSignIn} />);
  fireEvent.press(screen.getByText("Đăng nhập để dùng · 1 lượt/ngày"));
  expect(onSignIn).toHaveBeenCalled();
  expect(screen.queryByText(/Premium/)).toBeNull();
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

test("a crisis answer shows the 115 support card instead of a plain error (UX review K5/U2)", () => {
  const screen = render(<AiDeepRead {...base} available status="error" crisis error="ignored" />);
  expect(screen.getByText("Gọi 115")).toBeTruthy();
  expect(screen.getByText(/hãy gọi 115/)).toBeTruthy();
});
