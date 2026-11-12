import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Share } from "react-native";
import { ShareCardSheet } from "../ShareCardSheet";
import { todayCardModel } from "../shareCardContent";

// The first render in a cold Jest worker can take several seconds.
jest.setTimeout(20000);

const mockCaptureRef = jest.fn();
const mockReleaseCapture = jest.fn();
const mockIsAvailable = jest.fn();
const mockShareAsync = jest.fn();

jest.mock("react-native-view-shot", () => ({
  captureRef: (...args: unknown[]) => mockCaptureRef(...args),
  releaseCapture: (...args: unknown[]) => mockReleaseCapture(...args)
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: () => mockIsAvailable(),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args)
}));

const model = todayCardModel({ language: "vi", cardName: "Ngôi Sao", meaning: "Hy vọng quay lại nhẹ nhàng.", image: { uri: "card" } });
const url = "https://nilaza.magicpendigital.com/vi/share?utm_source=share";

function setup(primary?: "image" | "link") {
  const onEvent = jest.fn();
  const onClose = jest.fn();
  const screen = render(<ShareCardSheet visible language="vi" model={model} url={url} primary={primary} onClose={onClose} onEvent={onEvent} />);
  return { screen, onEvent, onClose };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsAvailable.mockResolvedValue(true);
  mockCaptureRef.mockResolvedValue("file:///cache/card.png");
  mockShareAsync.mockResolvedValue(undefined);
  jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
});

it("captures the card at 1080x1350, shares the image, records both events and cleans the temporary file", async () => {
  const { screen, onEvent } = setup();
  fireEvent.press(screen.getByText("Chia sẻ ảnh"));
  await waitFor(() => expect(mockShareAsync).toHaveBeenCalled());
  expect(mockCaptureRef).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ width: 1080, height: 1350, format: "png" }));
  expect(mockShareAsync).toHaveBeenCalledWith("file:///cache/card.png", expect.objectContaining({ mimeType: "image/png" }));
  await waitFor(() => expect(mockReleaseCapture).toHaveBeenCalledWith("file:///cache/card.png"));
  expect(onEvent).toHaveBeenNthCalledWith(1, "share_tapped", { surface: "today_card", action: "image" });
  expect(onEvent).toHaveBeenNthCalledWith(2, "share_completed", { surface: "today_card", action: "image", outcome: "returned" });
});

it("sends the tracked link as text and records the same two events", async () => {
  const { screen, onEvent } = setup();
  fireEvent.press(screen.getByText("Gửi kèm link"));
  await waitFor(() => expect(Share.share).toHaveBeenCalled());
  const message = (Share.share as jest.Mock).mock.calls[0][0].message as string;
  expect(message).toContain(url);
  await waitFor(() => expect(onEvent).toHaveBeenCalledWith("share_completed", { surface: "today_card", action: "link", outcome: "returned" }));
});

it("reports failure without crashing when capture throws and still cleans nothing", async () => {
  mockCaptureRef.mockRejectedValue(new Error("snapshot failed"));
  const { screen, onEvent } = setup();
  fireEvent.press(screen.getByText("Chia sẻ ảnh"));
  await waitFor(() => expect(onEvent).toHaveBeenCalledWith("share_completed", { surface: "today_card", action: "image", outcome: "failed" }));
  expect(screen.getByText(/Chưa chia sẻ được/)).toBeTruthy();
  expect(mockShareAsync).not.toHaveBeenCalled();
  expect(mockReleaseCapture).not.toHaveBeenCalled();
});

it("points to the link button when image sharing is unavailable", async () => {
  mockIsAvailable.mockResolvedValue(false);
  const { screen, onEvent } = setup();
  fireEvent.press(screen.getByText("Chia sẻ ảnh"));
  await waitFor(() => expect(onEvent).toHaveBeenCalledWith("share_completed", { surface: "today_card", action: "image", outcome: "unavailable" }));
  expect(screen.getByText(/chưa hỗ trợ chia sẻ ảnh/)).toBeTruthy();
});

it("leads with the invite button for invite flows and tells the person what is not sent", () => {
  const { screen } = setup("link");
  expect(screen.getByText("Gửi lời mời")).toBeTruthy();
  expect(screen.getByText(/không được gửi đi/)).toBeTruthy();
});

it("closes from the close button", () => {
  const { screen, onClose } = setup();
  fireEvent.press(screen.getByText("Đóng"));
  expect(onClose).toHaveBeenCalled();
});
