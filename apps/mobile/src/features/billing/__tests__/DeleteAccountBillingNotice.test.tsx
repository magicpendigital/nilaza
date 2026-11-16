import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { DeleteAccountBillingNotice, deleteAccountBillingCopy } from "../DeleteAccountBillingNotice";
import { playSubscriptionsUrl } from "../PaywallPanel";
import { DeleteAccountPanel } from "../../profile/DeleteAccountPanel";

test("without Premium: a short neutral line and the Google Play link", () => {
  const openUrl = jest.fn(() => Promise.resolve());
  const screen = render(<DeleteAccountBillingNotice language="vi" premiumActive={false} openUrl={openUrl} />);
  expect(screen.getByTestId("delete-billing-notice")).toBeTruthy();
  expect(screen.getByText(deleteAccountBillingCopy.vi.neutral)).toBeTruthy();
  fireEvent.press(screen.getByLabelText("Mở gói đăng ký trên Google Play"));
  expect(openUrl).toHaveBeenCalledWith(playSubscriptionsUrl);
  expect(playSubscriptionsUrl).toBe("https://play.google.com/store/account/subscriptions?package=app.nilaza.mobile");
});

test("with Premium: a stronger warning that the subscription keeps running", () => {
  const screen = render(<DeleteAccountBillingNotice language="en" premiumActive openUrl={() => Promise.resolve()} />);
  expect(screen.getByTestId("delete-billing-notice-premium")).toBeTruthy();
  expect(screen.getByText(/does not cancel your Google Play subscription/)).toBeTruthy();
  expect(screen.getByText(/Payments & subscriptions → Subscriptions/)).toBeTruthy();
});

test("a failing link open does not throw", () => {
  const openUrl = jest.fn(() => Promise.reject(new Error("no handler")));
  const screen = render(<DeleteAccountBillingNotice language="vi" premiumActive openUrl={openUrl} />);
  expect(() => fireEvent.press(screen.getByTestId("delete-billing-notice-link"))).not.toThrow();
});

test("copy says Google Play cancellation plainly and never names the vendor", () => {
  for (const locale of [deleteAccountBillingCopy.vi, deleteAccountBillingCopy.en]) {
    const text = Object.values(locale).join(" ");
    expect(text).not.toMatch(/RevenueCat/i);
    expect(text).toMatch(/Google Play/);
  }
  expect(deleteAccountBillingCopy.vi.premium).toContain("không tự hủy");
  expect(deleteAccountBillingCopy.vi.premium).toContain("Google Play → Thanh toán và gói đăng ký → Gói đăng ký");
});

test("the delete screen shows the notice under its explanation", () => {
  const screen = render(
    <DeleteAccountPanel
      language="vi"
      onDelete={() => Promise.resolve(null)}
      notice={<DeleteAccountBillingNotice language="vi" premiumActive={false} openUrl={() => Promise.resolve()} />}
    />
  );
  expect(screen.getByTestId("delete-billing-notice")).toBeTruthy();
  expect(screen.getByText("Xóa vĩnh viễn")).toBeTruthy();
});
