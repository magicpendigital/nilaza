import { act, renderHook, waitFor } from "@testing-library/react-native";
import { createBillingClient } from "../billingClient";
import { ACTIVATION_POLL_DELAYS_MS, usePremium } from "../usePremium";
import type { SubscriptionRow } from "../premiumEntitlement";
import { fakePurchases } from "../__fakes__/fakePurchases";

const now = () => new Date("2026-11-15T00:00:00Z");
const activeRow: SubscriptionRow = { entitlement: "premium", status: "active", current_period_end: "2026-12-15T00:00:00Z" };
const unavailable = createBillingClient({ loadModule: () => null, apiKey: undefined });

afterEach(() => {
  jest.useRealTimers();
});

test("a valid account row makes the account Premium", async () => {
  const { result } = renderHook(() => usePremium({
    userId: "user-1", readSubscriptions: async () => [activeRow], billingEnabled: false, client: unavailable, now,
  }));
  await waitFor(() => expect(result.current.entitled).toBe(true));
  expect(result.current.serverEntitled).toBe(true);
  expect(result.current.periodEnd).toBe("2026-12-15T00:00:00Z");
  expect(result.current.billingAvailable).toBe(false);
});

test("a failed or missing read fails closed", async () => {
  const read = jest.fn(async (): Promise<SubscriptionRow[]> => { throw new Error("offline"); });
  const { result } = renderHook(() => usePremium({ userId: "user-1", readSubscriptions: read, billingEnabled: false, client: unavailable, now }));
  await waitFor(() => expect(read).toHaveBeenCalled());
  expect(result.current.entitled).toBe(false);
});

test("signed out is never Premium and nothing is read", async () => {
  const read = jest.fn(async () => [activeRow]);
  const { result } = renderHook(() => usePremium({ userId: undefined, readSubscriptions: read, billingEnabled: true, client: unavailable, now }));
  await act(async () => undefined);
  expect(read).not.toHaveBeenCalled();
  expect(result.current.entitled).toBe(false);
});

test("a new account forgets the previous account's Premium", async () => {
  const { result, rerender } = renderHook((props: { userId: string | undefined; rows: SubscriptionRow[] }) => usePremium({
    userId: props.userId, readSubscriptions: async () => props.rows, billingEnabled: false, client: unavailable, now,
  }), { initialProps: { userId: "user-1", rows: [activeRow] } });
  await waitFor(() => expect(result.current.entitled).toBe(true));
  rerender({ userId: "user-2", rows: [] });
  await act(async () => undefined);
  expect(result.current.entitled).toBe(false);
});

test("the store SDK is identified only when billing is enabled", async () => {
  const fake = fakePurchases();
  const client = createBillingClient({ loadModule: () => fake.module, apiKey: "goog_public_test_key" });
  const { rerender } = renderHook((props: { enabled: boolean }) => usePremium({
    userId: "user-1", readSubscriptions: async () => [], billingEnabled: props.enabled, client, now,
  }), { initialProps: { enabled: false } });
  await act(async () => undefined);
  expect(fake.module.configure).not.toHaveBeenCalled();
  rerender({ enabled: true });
  await waitFor(() => expect(fake.module.configure).toHaveBeenCalledWith({ apiKey: "goog_public_test_key", appUserID: "user-1" }));
});

test("after a purchase the account row is re-read until the server grants Premium", async () => {
  jest.useFakeTimers();
  let rows: SubscriptionRow[] = [];
  const read = jest.fn(async () => rows);
  const { result } = renderHook(() => usePremium({ userId: "user-1", readSubscriptions: read, billingEnabled: false, client: unavailable, now }));
  await act(async () => undefined);
  expect(read).toHaveBeenCalledTimes(1);

  act(() => result.current.onStoreUpdate({ premiumActive: true, willRenew: true, expirationDate: "2026-12-15T00:00:00Z", managementUrl: null }));
  // Shown as Premium straight away from the store, while the account row catches up.
  expect(result.current.entitled).toBe(true);
  expect(result.current.serverEntitled).toBe(false);
  expect(result.current.activating).toBe(true);

  await act(async () => { jest.advanceTimersByTime(ACTIVATION_POLL_DELAYS_MS[0]); });
  expect(read).toHaveBeenCalledTimes(2);
  expect(result.current.activating).toBe(true);

  rows = [activeRow];
  await act(async () => { jest.advanceTimersByTime(ACTIVATION_POLL_DELAYS_MS[1]); });
  expect(read).toHaveBeenCalledTimes(3);
  expect(result.current.serverEntitled).toBe(true);
  expect(result.current.activating).toBe(false);

  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(read).toHaveBeenCalledTimes(3);
});

test("activation polling stops after about 30 seconds", async () => {
  jest.useFakeTimers();
  const read = jest.fn(async (): Promise<SubscriptionRow[]> => []);
  const { result } = renderHook(() => usePremium({ userId: "user-1", readSubscriptions: read, billingEnabled: false, client: unavailable, now }));
  await act(async () => undefined);
  act(() => result.current.onStoreUpdate({ premiumActive: true, willRenew: true, expirationDate: null, managementUrl: null }));
  for (const delay of ACTIVATION_POLL_DELAYS_MS) {
    await act(async () => { jest.advanceTimersByTime(delay); });
  }
  await act(async () => undefined);
  expect(read).toHaveBeenCalledTimes(1 + ACTIVATION_POLL_DELAYS_MS.length);
  expect(result.current.activating).toBe(false);
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(read).toHaveBeenCalledTimes(1 + ACTIVATION_POLL_DELAYS_MS.length);
});
