import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Share } from "react-native";
import { releasePending } from "../captureShareCard";
import { ShareCardSheet } from "../ShareCardSheet";
import { todayCardModel } from "../shareCardContent";
import { shareLinkMessage } from "../shareLink";

// The first render in a cold Jest worker can take several seconds.
jest.setTimeout(20000);

const mockCaptureRef = jest.fn();
const mockReleaseCapture = jest.fn();
const mockIsAvailable = jest.fn();
const mockShareAsync = jest.fn();
const mockSetString = jest.fn();
const mockNativeOpen = jest.fn();

jest.mock("react-native-view-shot", () => ({
  captureRef: (...args: unknown[]) => mockCaptureRef(...args),
  releaseCapture: (...args: unknown[]) => mockReleaseCapture(...args)
}));
jest.mock("react-native-share", () => ({
  __esModule: true,
  default: { open: (...args: unknown[]) => mockNativeOpen(...args) }
}));
jest.mock("expo-clipboard", () => ({
  setStringAsync: (...args: unknown[]) => mockSetString(...args)
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
  releasePending();
  jest.clearAllMocks();
  mockIsAvailable.mockResolvedValue(true);
  mockCaptureRef.mockResolvedValue("file:///cache/card.png");
  mockShareAsync.mockResolvedValue(undefined);
  mockSetString.mockResolvedValue(true);
  mockNativeOpen.mockResolvedValue({ success: true });
  jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
});

it("captures the card at 1080x1350, shares the image with the message in one share and records both events", async () => {
  const { screen, onEvent } = setup();
  fireEvent.press(screen.getByText("Chia sẻ ảnh"));
  await waitFor(() => expect(mockNativeOpen).toHaveBeenCalled());
  expect(mockCaptureRef).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ width: 1080, height: 1350, format: "png" }));
  const options = mockNativeOpen.mock.calls[0][0];
  expect(options).toMatchObject({ url: "file:///cache/card.png", type: "image/png", failOnCancel: false });
  expect(options.message).toBe(shareLinkMessage("vi", "today_card", url, model));
  expect(options.message).toContain("Ngôi Sao");
  expect(options.message).toContain(url);
  expect(mockShareAsync).not.toHaveBeenCalled();
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
  expect(mockNativeOpen).not.toHaveBeenCalled();
  expect(mockReleaseCapture).not.toHaveBeenCalled();
});

it("points to the link button when image sharing is unavailable", async () => {
  mockNativeOpen.mockRejectedValue(new Error("not_available"));
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

it("copies the message with the tracked link before the share sheet opens and tells the person to paste it", async () => {
  const order: string[] = [];
  mockSetString.mockImplementation(async () => { order.push("copy"); return true; });
  mockShareAsync.mockImplementation(async () => { order.push("share"); });
  const { screen } = setup();
  fireEvent.press(screen.getByText("Chia sẻ ảnh"));
  await waitFor(() => expect(screen.getByText(/Đã sao chép lời nhắn kèm link/)).toBeTruthy());
  expect(screen.getByText(/không hiện lời nhắn cùng ảnh/)).toBeTruthy();
  expect(mockSetString).toHaveBeenCalledWith(shareLinkMessage("vi", "today_card", url, model));
  expect(mockSetString.mock.calls[0][0]).toContain(url);
  expect(order).toEqual(["copy"]);
  expect(mockNativeOpen).toHaveBeenCalled();
});

it("falls back to sharing the image alone when the native share fails", async () => {
  mockNativeOpen.mockRejectedValue(new Error("not_available"));
  const { screen, onEvent } = setup();
  fireEvent.press(screen.getByText("Chia sẻ ảnh"));
  await waitFor(() => expect(mockShareAsync).toHaveBeenCalledWith("file:///cache/card.png", expect.objectContaining({ mimeType: "image/png" })));
  await waitFor(() => expect(onEvent).toHaveBeenCalledWith("share_completed", { surface: "today_card", action: "image", outcome: "returned" }));
});

it("does not report cancelling the share sheet as a failure", async () => {
  mockNativeOpen.mockResolvedValue({ dismissedAction: true, success: false, message: "CANCELED" });
  const { screen, onEvent } = setup();
  fireEvent.press(screen.getByText("Chia sẻ ảnh"));
  await waitFor(() => expect(onEvent).toHaveBeenCalledWith("share_completed", { surface: "today_card", action: "image", outcome: "returned" }));
  expect(screen.queryByText(/Chưa chia sẻ được/)).toBeNull();
  expect(mockShareAsync).not.toHaveBeenCalled();
});

it("keeps the temporary image until the next share and releases it then", async () => {
  const { screen } = setup();
  fireEvent.press(screen.getByText("Chia sẻ ảnh"));
  await waitFor(() => expect(mockNativeOpen).toHaveBeenCalledTimes(1));
  expect(mockReleaseCapture).not.toHaveBeenCalledWith("file:///cache/card.png");
  await waitFor(() => expect(screen.getByText(/Đã sao chép/)).toBeTruthy());
  mockCaptureRef.mockResolvedValue("file:///cache/card2.png");
  fireEvent.press(screen.getByText("Chia sẻ ảnh"));
  await waitFor(() => expect(mockNativeOpen).toHaveBeenCalledTimes(2));
  expect(mockReleaseCapture).toHaveBeenCalledWith("file:///cache/card.png");
});

it("still shares the image when the clipboard fails, without claiming the text was copied", async () => {
  mockSetString.mockRejectedValue(new Error("clipboard denied"));
  const { screen, onEvent } = setup();
  fireEvent.press(screen.getByText("Chia sẻ ảnh"));
  await waitFor(() => expect(mockNativeOpen).toHaveBeenCalled());
  await waitFor(() => expect(onEvent).toHaveBeenCalledWith("share_completed", { surface: "today_card", action: "image", outcome: "returned" }));
  expect(screen.queryByText(/Đã sao chép/)).toBeNull();
});

it("does not touch the clipboard when only the link text is shared", async () => {
  const { screen } = setup();
  fireEvent.press(screen.getByText("Gửi kèm link"));
  await waitFor(() => expect(Share.share).toHaveBeenCalled());
  expect(mockSetString).not.toHaveBeenCalled();
});
