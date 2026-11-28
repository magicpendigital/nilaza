import React from "react";
import { readFileSync } from "fs";
import { join } from "path";
import { fireEvent, render } from "@testing-library/react-native";
import { PremiumLockNotice } from "../PremiumLockNotice";

test("while the paywall is shown, a locked deck explains itself and offers the Premium plans", () => {
  const onOpenPremium = jest.fn();
  const screen = render(<PremiumLockNotice language="vi" kind="deck" onOpenPremium={onOpenPremium} />);
  expect(screen.getByText("Dành cho Premium")).toBeTruthy();
  expect(screen.getByText("Bạn xem trước bộ bài thoải mái. Rút bài với bộ này cần gói Premium.")).toBeTruthy();
  const button = screen.getByRole("button", { name: "Xem gói Premium" });
  fireEvent.press(button);
  expect(onOpenPremium).toHaveBeenCalledTimes(1);
});

test("without the paywall, a locked guide shows only the label and explanation, no buy path", () => {
  const screen = render(<PremiumLockNotice language="vi" kind="guide" />);
  expect(screen.getByText("Dành cho Premium")).toBeTruthy();
  expect(screen.getByText("Đọc giới thiệu miễn phí. Trò chuyện với người dẫn này cần gói Premium.")).toBeTruthy();
  expect(screen.queryByTestId("premium-lock-view-plans")).toBeNull();
  expect(screen.queryByText("Xem gói Premium")).toBeNull();
  expect(screen.queryByText(/Sắp ra mắt/)).toBeNull();
});

test("English wording matches the Vietnamese meaning", () => {
  const screen = render(<PremiumLockNotice language="en" kind="guide" onOpenPremium={jest.fn()} />);
  expect(screen.getByText("For Premium")).toBeTruthy();
  expect(screen.getByText("Reading the introduction is free. Chatting with this guide needs Premium.")).toBeTruthy();
  expect(screen.getByRole("button", { name: "See Premium plans" })).toBeTruthy();
});

test("App passes the Premium button only while the paywall is enabled and no longer says 'Sắp ra mắt' for decks or guides", () => {
  const app = readFileSync(join(__dirname, "..", "..", "..", "..", "App.tsx"), "utf8");
  const wiring = [...app.matchAll(/onOpenPremium=\{([^}]*)\}/g)].map((match) => match[1].trim());
  expect(wiring.length).toBeGreaterThan(0);
  for (const value of wiring) expect(["paywallEnabled ? openPremium : undefined", "onOpenPremium"]).toContain(value);
  expect(app).not.toMatch(/Sắp ra mắt|Coming soon|sẽ mở khi gói Premium ra mắt|opens when Premium launches/);
});
