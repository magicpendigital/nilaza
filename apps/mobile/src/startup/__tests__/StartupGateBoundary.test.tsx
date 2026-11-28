import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Text } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { createFeatureAccessService } from "../../features/access/featureAccessService";
import { defaultFeatureAccessConfig } from "../../features/access/featureAccessConfig";
import { StartupGate, playStoreUrls, startupGateCopy } from "../StartupGateBoundary";
import { BOOTSTRAP_STORAGE_KEY, DAY_MS, OFFLINE_GRACE_MS } from "../startupGate";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve())
}));

const t0 = Date.parse("2026-11-28T00:00:00Z");
const now = () => t0;
const answer = (releasePolicy: unknown = null, serverTime = t0, featureAccess: unknown = null) =>
  ({ serverTime: new Date(serverTime).toISOString(), releasePolicy, featureAccess });
const policy = { minVersion: "0.1.4", graceDays: 3, effectiveAt: "2026-11-28T00:00:00Z" };
const vi = startupGateCopy.vi;

function setup(fetchBootstrap: () => Promise<unknown>, extra: Partial<React.ComponentProps<typeof StartupGate>> = {}) {
  const featureAccess = createFeatureAccessService({ fetcher: async () => { throw new Error("not used"); }, now });
  const openUrl = jest.fn(async () => undefined);
  const screen = render(
    <StartupGate enabled fetchBootstrap={fetchBootstrap} appVersion="0.1.3" now={now} featureAccess={featureAccess}
      language="vi" openUrl={openUrl} {...extra}>
      <Text>APP CONTENT</Text>
    </StartupGate>
  );
  return { screen, featureAccess, openUrl };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

test("disabled (no Supabase configured): passes straight through without asking the server", () => {
  const fetchBootstrap = jest.fn();
  const screen = render(<StartupGate enabled={false} fetchBootstrap={fetchBootstrap}><Text>APP CONTENT</Text></StartupGate>);
  expect(screen.getByText("APP CONTENT")).toBeTruthy();
  expect(fetchBootstrap).not.toHaveBeenCalled();
});

test("online: renders nothing while checking (splash stays), then the app; stores the success and feeds feature access", async () => {
  let resolve: (value: unknown) => void = () => undefined;
  const fetchBootstrap = jest.fn(() => new Promise((done) => { resolve = done; }));
  const published = { version: 3, publishedAt: "2026-11-28T00:00:00Z", config: defaultFeatureAccessConfig() };
  const { screen, featureAccess } = setup(fetchBootstrap);
  expect(screen.toJSON()).toBeNull();
  await act(async () => { resolve(answer(null, t0 + 2000, published)); });
  await waitFor(() => expect(screen.getByText("APP CONTENT")).toBeTruthy());
  expect(screen.queryByTestId("startup-gate-offline-banner")).toBeNull();
  const stored = JSON.parse((await AsyncStorage.getItem(BOOTSTRAP_STORAGE_KEY)) ?? "null");
  expect(stored).toEqual({ lastSuccessAt: t0, policy: null, serverOffsetMs: 2000 });
  expect(featureAccess.get()).toMatchObject({ source: "remote", version: 3, checkedAt: t0 });
  expect(fetchBootstrap).toHaveBeenCalledTimes(1);
  expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
});

test("offline-blocked on a first start without network; Thử lại opens the app once the server answers", async () => {
  const fetchBootstrap = jest.fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(answer());
  const { screen } = setup(fetchBootstrap);
  await waitFor(() => expect(screen.getByTestId("startup-gate-offline-blocked")).toBeTruthy());
  expect(screen.getByText(vi.offlineTitle)).toBeTruthy();
  expect(screen.queryByText("APP CONTENT")).toBeNull();
  expect(SplashScreen.hideAsync).toHaveBeenCalled();
  const retry = screen.getByTestId("startup-gate-retry");
  expect(retry.props.accessibilityLabel).toBe(vi.retry);
  await act(async () => { fireEvent.press(retry); });
  await waitFor(() => expect(screen.getByText("APP CONTENT")).toBeTruthy());
  expect(screen.queryByTestId("startup-gate-offline-blocked")).toBeNull();
});

test("offline-grace inside 24 hours shows the app with the offline banner; a malformed answer counts as offline", async () => {
  await AsyncStorage.setItem(BOOTSTRAP_STORAGE_KEY, JSON.stringify({ lastSuccessAt: t0 - OFFLINE_GRACE_MS + 1, policy: null, serverOffsetMs: 0 }));
  const { screen } = setup(jest.fn(async () => ({ hello: "world" })));
  await waitFor(() => expect(screen.getByTestId("startup-gate-offline-banner")).toBeTruthy());
  expect(screen.getByText(vi.offlineBanner)).toBeTruthy();
  expect(screen.getByText("APP CONTENT")).toBeTruthy();
});

test("offline at exactly 24 hours is blocked", async () => {
  await AsyncStorage.setItem(BOOTSTRAP_STORAGE_KEY, JSON.stringify({ lastSuccessAt: t0 - OFFLINE_GRACE_MS, policy: null, serverOffsetMs: 0 }));
  const { screen } = setup(jest.fn(async () => { throw new Error("offline"); }));
  await waitFor(() => expect(screen.getByTestId("startup-gate-offline-blocked")).toBeTruthy());
});

test("a fetch that never answers is cut at the timeout", async () => {
  const { screen } = setup(jest.fn(() => new Promise(() => undefined)), { timeoutMs: 20 });
  await waitFor(() => expect(screen.getByTestId("startup-gate-offline-blocked")).toBeTruthy());
});

test("update-reminder: app stays usable, Play button and dismiss", async () => {
  const { screen, openUrl } = setup(jest.fn(async () => answer(policy, t0 + DAY_MS)));
  await waitFor(() => expect(screen.getByTestId("startup-gate-update-reminder")).toBeTruthy());
  expect(screen.getByText("APP CONTENT")).toBeTruthy();
  const play = screen.getByTestId("startup-gate-reminder-play");
  expect(play.props.accessibilityLabel).toBe(vi.openPlay);
  await act(async () => { fireEvent.press(play); });
  expect(openUrl).toHaveBeenCalledWith(playStoreUrls.market);
  fireEvent.press(screen.getByTestId("startup-gate-reminder-dismiss"));
  expect(screen.queryByTestId("startup-gate-update-reminder")).toBeNull();
  expect(screen.getByText("APP CONTENT")).toBeTruthy();
});

test("update-required after the grace days: full screen with the Play button (web listing as fallback)", async () => {
  const { screen, openUrl } = setup(jest.fn(async () => answer(policy, t0 + 3 * DAY_MS)));
  await waitFor(() => expect(screen.getByTestId("startup-gate-update-required")).toBeTruthy());
  expect(screen.getByText(vi.updateTitle)).toBeTruthy();
  expect(screen.queryByText("APP CONTENT")).toBeNull();
  openUrl.mockRejectedValueOnce(new Error("no Play app"));
  await act(async () => { fireEvent.press(screen.getByTestId("startup-gate-open-play")); });
  expect(openUrl).toHaveBeenNthCalledWith(1, playStoreUrls.market);
  expect(openUrl).toHaveBeenNthCalledWith(2, playStoreUrls.web);
  expect(playStoreUrls.web).toBe("https://play.google.com/store/apps/details?id=app.nilaza.mobile");
});

test("English copy", async () => {
  const { screen } = setup(jest.fn(async () => { throw new Error("offline"); }), { language: "en" });
  await waitFor(() => expect(screen.getByText(startupGateCopy.en.offlineTitle)).toBeTruthy());
  expect(screen.getByTestId("startup-gate-retry").props.accessibilityLabel).toBe(startupGateCopy.en.retry);
});

test("a failing storage write does not keep the splash: the app still opens", async () => {
  jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("disk full"));
  const { screen } = setup(jest.fn(async () => answer()));
  await waitFor(() => expect(screen.getByText("APP CONTENT")).toBeTruthy());
  expect(screen.queryByTestId("startup-gate-offline-banner")).toBeNull();
});

test("a failing feature-access cache does not keep the splash: the app still opens", async () => {
  const { screen, featureAccess } = setup(jest.fn(async () => answer()));
  jest.spyOn(featureAccess, "accept").mockRejectedValue(new Error("cache failed"));
  await waitFor(() => expect(screen.getByText("APP CONTENT")).toBeTruthy());
  expect(screen.queryByTestId("startup-gate-offline-banner")).toBeNull();
});

test("foreground recheck after more than 5 minutes keeps the app mounted", async () => {
  let clock = t0;
  const listeners: Array<(state: string) => void> = [];
  const spy = jest.spyOn(AppState, "addEventListener").mockImplementation(((_: string, listener: (state: string) => void) => {
    listeners.push(listener);
    return { remove: jest.fn() };
  }) as never);
  const fetchBootstrap = jest.fn()
    .mockResolvedValueOnce(answer())
    .mockRejectedValueOnce(new Error("offline"));
  const { screen } = setup(fetchBootstrap, { now: () => clock });
  await waitFor(() => expect(screen.getByText("APP CONTENT")).toBeTruthy());
  clock = t0 + 60_000;
  await act(async () => { listeners.forEach((listener) => listener("active")); });
  expect(fetchBootstrap).toHaveBeenCalledTimes(1);
  clock = t0 + 5 * 60_000 + 1;
  await act(async () => { listeners.forEach((listener) => listener("active")); });
  await waitFor(() => expect(screen.getByTestId("startup-gate-offline-banner")).toBeTruthy());
  expect(fetchBootstrap).toHaveBeenCalledTimes(2);
  expect(screen.getByText("APP CONTENT")).toBeTruthy();
  spy.mockRestore();
});
