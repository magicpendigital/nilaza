import React from "react";
import { Text, Linking } from "react-native";
import { act, render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import { PasswordRecoveryBoundary } from "../PasswordRecoveryBoundary";
const mockAccept = jest.fn(async () => undefined);
const mockUpdate = jest.fn(async () => undefined);
jest.mock("../passwordRecovery", () => ({
  isRecoveryUrl: (url: string) => url.startsWith("nilaza://auth/recovery"),
  createPasswordRecovery: () => ({ accept: mockAccept, update: mockUpdate })
}));
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
jest.mock("../../a2ui", () => {
  const { View, Text, Pressable } = require("react-native");
  return {
    ScreenShell: View,
    SecondaryButton: ({ label, onPress }: any) => <Pressable onPress={onPress}><Text>{label}</Text></Pressable>,
    RitualButton: ({ label, onPress, disabled }: any) => <Pressable onPress={onPress} disabled={disabled}><Text>{label}</Text></Pressable>
  };
});
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, "addEventListener").mockReturnValue({ remove: jest.fn() });
});
afterEach(() => jest.restoreAllMocks());
it("does not mount private account data while a recovery link is being verified", async () => {
  jest.spyOn(Linking, "getInitialURL").mockResolvedValue("nilaza://auth/recovery#synthetic");
  let resolve!: () => void;
  mockAccept.mockImplementationOnce(() => new Promise<void>(done => { resolve = done; }));
  const mount = jest.fn();
  function PrivateAccount() { mount(); return <Text>Private account</Text>; }
  render(<PasswordRecoveryBoundary><PrivateAccount /></PasswordRecoveryBoundary>);
  await waitFor(() => expect(mockAccept).toHaveBeenCalled());
  expect(mount).not.toHaveBeenCalled();
  await act(async () => resolve());
  expect(screen.getByLabelText("Mật khẩu mới (ít nhất 12 ký tự)")).toBeTruthy();
  expect(mount).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText("Quay lại ứng dụng"));
  expect(screen.getByText("Private account")).toBeTruthy();
});
it("normal startup mounts the account and invalid recovery shows no password form", async () => {
  jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
  const result = render(<PasswordRecoveryBoundary><Text>Private account</Text></PasswordRecoveryBoundary>);
  await screen.findByText("Private account"); result.unmount();
  jest.spyOn(Linking, "getInitialURL").mockResolvedValue("nilaza://auth/recovery#expired");
  mockAccept.mockRejectedValueOnce(new Error("link"));
  render(<PasswordRecoveryBoundary><Text>Private account</Text></PasswordRecoveryBoundary>);
  await screen.findByText(/Liên kết không hợp lệ/);
  expect(screen.queryByText("Private account")).toBeNull();
  expect(screen.queryByLabelText("Mật khẩu mới (ít nhất 12 ký tự)")).toBeNull();
});
