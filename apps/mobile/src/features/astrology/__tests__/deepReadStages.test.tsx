import React from "react";
import { act, render } from "@testing-library/react-native";
import { AiDeepRead, deepReadStage } from "../AiDeepRead";

test("the deep read stage follows the wait time (Owner 2026-11-03)", () => {
  expect(deepReadStage(0).vi).toBe("Đang đọc các vị trí trong lá số");
  expect(deepReadStage(30).vi).toBe("Đang nối các góc hợp và suy ngẫm");
  expect(deepReadStage(75).vi).toBe("Đang viết bài đọc");
});

test("while loading the card lists the stages and says they are time-based", () => {
  jest.useFakeTimers();
  const screen = render(<AiDeepRead language="vi" available premiumOnSale={false} status="loading" onWrite={jest.fn()} onOpenFull={jest.fn()} />);
  expect(screen.getByText("Đang đọc các vị trí trong lá số")).toBeTruthy();
  expect(screen.getByText(/không phải tiến độ thật/)).toBeTruthy();
  act(() => { jest.advanceTimersByTime(12_000); });
  expect(screen.getByText("Đang nối các góc hợp và suy ngẫm")).toBeTruthy();
  jest.useRealTimers();
});
