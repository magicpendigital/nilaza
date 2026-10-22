import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { MythologyWorld } from "../MythologyWorld";
jest.setTimeout(15000);

test("library works without birth data, navigates to Pisces and wraps to Aries", async () => {
  const screen = render(<MythologyWorld language="vi" onBack={jest.fn()} />);
  await waitFor(() =>
    expect(screen.getByText("Bước qua ngưỡng cửa")).toBeTruthy(),
  );
  fireEvent.press(screen.getByTestId("sign-hit-pisces"));
  expect(screen.getByText("Giữa hai dòng chảy")).toBeTruthy();
  await act(async () => {fireEvent.press(screen.getByText("Mở câu chuyện & đọc sâu →"));});
  expect(screen.getByText("02 / DỊ BẢN & ĐIỀU CẦN PHÂN BIỆT")).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Chương tiếp →" }));
  expect(screen.getByText("Bước qua ngưỡng cửa")).toBeTruthy();
  expect(screen.queryByText(/BẢN ĐỒ MINH HỌA/)).toBeNull();
});
test("demo is explicitly labelled; selecting Moon preserves its longitude through zoom", async () => {
  const screen = render(<MythologyWorld language="en" onBack={jest.fn()} />);
  await act(async () => {});
  fireEvent.press(screen.getByRole("button", { name: "View example chart" }));
  expect(screen.getByText(/EXAMPLE CHART/)).toBeTruthy();
  fireEvent.press(screen.getByText("Moon"));
  expect(screen.getByText(/15.90/)).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Zoom in" }));
  expect(screen.getByText(/15.90/)).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Reset" }));
  expect(screen.queryByText(/15.90/)).toBeNull();
});
