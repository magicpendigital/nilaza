import React from "react";
import { readFileSync } from "fs";
import { join } from "path";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { createBillingClient, type BillingClient } from "../billingClient";
import { PaywallPanel, playSubscriptionsUrl } from "../PaywallPanel";
import type { PremiumState } from "../usePremium";
import { fakePurchases, offering, pkg } from "../__fakes__/fakePurchases";

const key = "goog_public_test_key";

function premiumState(client: BillingClient, overrides: Partial<PremiumState> = {}): PremiumState {
  return {
    entitled: false,
    serverEntitled: false,
    activating: false,
    customer: null,
    periodEnd: undefined,
    billingAvailable: client.available,
    onStoreUpdate: jest.fn(),
    refresh: jest.fn(),
    client,
    ...overrides,
  };
}

function storeClient(overrides: Parameters<typeof fakePurchases>[0] = {}) {
  const fake = fakePurchases(overrides);
  return { fake, client: createBillingClient({ loadModule: () => fake.module, apiKey: key }) };
}

test("signed out: asks to sign in and shows no plans", () => {
  const { client } = storeClient();
  const onSignIn = jest.fn();
  const screen = render(<PaywallPanel language="vi" userId={undefined} premium={premiumState(client)} onSignIn={onSignIn} />);
  expect(screen.getByTestId("paywall-sign-in")).toBeTruthy();
  fireEvent.press(screen.getByText("Đăng nhập"));
  expect(onSignIn).toHaveBeenCalled();
  expect(screen.queryByTestId("paywall-buy")).toBeNull();
  expect(screen.getByText("Điều khoản")).toBeTruthy();
});

test("no store on this device: an honest note, no buy button", () => {
  const client = createBillingClient({ loadModule: () => null, apiKey: undefined });
  const screen = render(<PaywallPanel language="vi" userId="user-1" premium={premiumState(client)} />);
  expect(screen.getByTestId("paywall-unavailable")).toBeTruthy();
  expect(screen.queryByTestId("paywall-buy")).toBeNull();
});

test("plans show the store prices, renewal, cancel path and a computed saving", async () => {
  const { client } = storeClient();
  const openUrl = jest.fn(async () => undefined);
  const screen = render(<PaywallPanel language="vi" userId="user-1" premium={premiumState(client)} openUrl={openUrl} />);
  await waitFor(() => expect(screen.getByTestId("paywall-plans")).toBeTruthy());
  expect(screen.getByText("799.000 ₫ / năm")).toBeTruthy();
  expect(screen.getByText("99.000 ₫ / tháng")).toBeTruthy();
  expect(screen.getByText("Tiết kiệm khoảng 33% so với trả theo tháng")).toBeTruthy();
  expect(screen.getByText(/tự gia hạn cho đến khi bạn hủy/)).toBeTruthy();
  expect(screen.getByText(/Google Play → Thanh toán và gói đăng ký → Gói đăng ký/)).toBeTruthy();
  expect(screen.getByText("Đăng ký Premium · 799.000 ₫ / năm")).toBeTruthy();
  expect(screen.getByTestId("paywall-restore")).toBeTruthy();
  expect(screen.queryByText(/không giới hạn/i)).toBeNull();
  expect(screen.queryByText(/40%/)).toBeNull();
  fireEvent.press(screen.getByText("Quyền riêng tư"));
  expect(openUrl).toHaveBeenCalledWith(expect.stringContaining("privacy"));
});

test("no saving label when the yearly plan is not cheaper", async () => {
  const { client } = storeClient({
    getOfferings: jest.fn(async () => ({ current: offering({ annual: pkg("annual", 1_500_000, "1.500.000 ₫") }) })),
  });
  const screen = render(<PaywallPanel language="vi" userId="user-1" premium={premiumState(client)} />);
  await waitFor(() => expect(screen.getByTestId("paywall-plans")).toBeTruthy());
  expect(screen.queryByText(/Tiết kiệm/)).toBeNull();
});

test("buying the monthly plan hands the store result to the account", async () => {
  const { client, fake } = storeClient();
  const premium = premiumState(client);
  const screen = render(<PaywallPanel language="en" userId="user-1" premium={premium} />);
  await waitFor(() => expect(screen.getByTestId("paywall-plans")).toBeTruthy());
  fireEvent.press(screen.getByTestId("paywall-plan-monthly"));
  fireEvent.press(screen.getByTestId("paywall-buy"));
  await waitFor(() => expect(premium.onStoreUpdate).toHaveBeenCalledWith(expect.objectContaining({ premiumActive: true })));
  expect(fake.calls).toContain("purchase:$rc_monthly");
});

test("a cancelled purchase is not shown as an error", async () => {
  const { client } = storeClient({ purchasePackage: jest.fn(async () => { throw { code: "1", userCancelled: true }; }) });
  const premium = premiumState(client);
  const screen = render(<PaywallPanel language="en" userId="user-1" premium={premium} />);
  await waitFor(() => expect(screen.getByTestId("paywall-plans")).toBeTruthy());
  fireEvent.press(screen.getByTestId("paywall-buy"));
  await waitFor(() => expect(screen.getByText(/Subscribe ·/)).toBeTruthy());
  expect(premium.onStoreUpdate).not.toHaveBeenCalled();
  expect(screen.queryByRole("alert")).toBeNull();
});

test("a pending payment and a network failure are explained", async () => {
  const pending = storeClient({ purchasePackage: jest.fn(async () => { throw { code: "20" }; }) });
  const first = render(<PaywallPanel language="en" userId="user-1" premium={premiumState(pending.client)} />);
  await waitFor(() => expect(first.getByTestId("paywall-plans")).toBeTruthy());
  fireEvent.press(first.getByTestId("paywall-buy"));
  await waitFor(() => expect(first.getByText(/Payment is pending/)).toBeTruthy());

  const offline = storeClient({ purchasePackage: jest.fn(async () => { throw { code: "10" }; }) });
  const second = render(<PaywallPanel language="en" userId="user-1" premium={premiumState(offline.client)} />);
  await waitFor(() => expect(second.getByTestId("paywall-plans")).toBeTruthy());
  fireEvent.press(second.getByTestId("paywall-buy"));
  await waitFor(() => expect(second.getByText(/No connection/)).toBeTruthy());
});

test("offers that fail to load can be retried", async () => {
  let fail = true;
  const { client } = storeClient({
    getOfferings: jest.fn(async () => { if (fail) throw { code: "10" }; return { current: offering() }; }),
  });
  const screen = render(<PaywallPanel language="en" userId="user-1" premium={premiumState(client)} />);
  await waitFor(() => expect(screen.getByTestId("paywall-error")).toBeTruthy());
  fail = false;
  fireEvent.press(screen.getByText("Try again"));
  await waitFor(() => expect(screen.getByTestId("paywall-plans")).toBeTruthy());
});

test("restore reports what it found", async () => {
  const { client } = storeClient();
  const premium = premiumState(client);
  const screen = render(<PaywallPanel language="en" userId="user-1" premium={premium} />);
  await waitFor(() => expect(screen.getByTestId("paywall-plans")).toBeTruthy());
  fireEvent.press(screen.getByTestId("paywall-restore"));
  await waitFor(() => expect(screen.getByText("Restored. Premium is open for this account.")).toBeTruthy());
  expect(premium.refresh).toHaveBeenCalled();
});

test("an active plan shows its date, activation note and Manage plan", () => {
  const { client } = storeClient();
  const openUrl = jest.fn(async () => undefined);
  const premium = premiumState(client, {
    entitled: true,
    activating: true,
    periodEnd: "2026-12-15T00:00:00Z",
    customer: { premiumActive: true, willRenew: false, expirationDate: "2026-12-15T00:00:00Z", managementUrl: null },
  });
  const screen = render(<PaywallPanel language="vi" userId="user-1" premium={premium} openUrl={openUrl} />);
  expect(screen.getByTestId("paywall-active")).toBeTruthy();
  expect(screen.getByText("Premium dùng đến 15/12/2026.")).toBeTruthy();
  expect(screen.getByTestId("paywall-activating")).toBeTruthy();
  expect(screen.queryByTestId("paywall-buy")).toBeNull();
  fireEvent.press(screen.getByText("Quản lý gói"));
  expect(openUrl).toHaveBeenCalledWith(playSubscriptionsUrl);
});

test("the purchase screen never hard-codes a price, credits or the vendor name", () => {
  const source = readFileSync(join(__dirname, "..", "PaywallPanel.tsx"), "utf8");
  expect(source).not.toMatch(/99[.,]?000|799[.,]?000|99k|799k/i);
  expect(source).not.toMatch(/credit|Nil\b|không giới hạn|unlimited/i);
  expect(source).not.toMatch(/RevenueCat/i);
});
