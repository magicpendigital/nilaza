import React from "react";
import { Text, Linking } from "react-native";
import { act, render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import { EmailConfirmationBoundary } from "../EmailConfirmationBoundary";
const mockVerify = jest.fn(async (_url: string) => undefined);
jest.mock("../emailConfirmation", () => ({ isConfirmationUrl: (url: string) => url.startsWith("nilaza://auth/confirm"), verifyEmailConfirmation: (url: string) => mockVerify(url) }));
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
jest.mock("../../a2ui", () => {
  const { View, Text, Pressable } = require("react-native");
  return { ScreenShell: View, SecondaryButton: ({ label, onPress }: any) => <Pressable onPress={onPress}><Text>{label}</Text></Pressable> };
});
beforeEach(() => { jest.clearAllMocks(); jest.spyOn(Linking, "addEventListener").mockReturnValue({ remove: jest.fn() }); });
afterEach(() => jest.restoreAllMocks());
it("withholds account data until verification and requires an explicit return", async () => {
  jest.spyOn(Linking, "getInitialURL").mockResolvedValue("nilaza://auth/confirm#synthetic");
  let release!: () => void;
  mockVerify.mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
  const mount = jest.fn();
  function Account() { mount(); return <Text>Account data</Text>; }
  render(<EmailConfirmationBoundary><Account /></EmailConfirmationBoundary>);
  await waitFor(() => expect(mockVerify).toHaveBeenCalled());
  expect(mount).not.toHaveBeenCalled();
  await act(async () => release());
  expect(screen.getByText(/Email đã được xác nhận/)).toBeTruthy();
  expect(mount).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText("English"));
  expect(screen.getByText(/Email confirmed/)).toBeTruthy();
  fireEvent.press(screen.getByText("Return to app"));
  expect(screen.getByText("Account data")).toBeTruthy();
});
it("normal startup passes through and expired callbacks show a recoverable error", async () => {
  jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
  const normal = render(<EmailConfirmationBoundary><Text>Account data</Text></EmailConfirmationBoundary>);
  await screen.findByText("Account data"); normal.unmount();
  jest.spyOn(Linking, "getInitialURL").mockResolvedValue("nilaza://auth/confirm#expired");
  mockVerify.mockRejectedValueOnce(new Error("link"));
  render(<EmailConfirmationBoundary><Text>Account data</Text></EmailConfirmationBoundary>);
  await screen.findByText(/Liên kết không hợp lệ/);
  expect(screen.queryByText("Account data")).toBeNull();
  fireEvent.press(screen.getByText("Quay lại ứng dụng"));
  expect(screen.getByText("Account data")).toBeTruthy();
});
it("a new callback supersedes an old in-flight result", async () => {
  jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
  let listener!: (event: { url: string }) => void;
  jest.spyOn(Linking, "addEventListener").mockImplementation((_type, callback) => { listener = callback; return { remove: jest.fn() }; });
  render(<EmailConfirmationBoundary><Text>Account data</Text></EmailConfirmationBoundary>);
  await screen.findByText("Account data");
  let release!: () => void;
  mockVerify.mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; })).mockRejectedValueOnce(new Error("link"));
  await act(async () => listener({ url: "nilaza://auth/confirm#first" }));
  await act(async () => listener({ url: "nilaza://auth/confirm#second" }));
  await screen.findByText(/Liên kết không hợp lệ/);
  await act(async () => release());
  expect(screen.queryByText(/Email đã được xác nhận/)).toBeNull();
});
