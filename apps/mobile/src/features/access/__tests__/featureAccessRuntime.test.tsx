import React from "react";
import { act, fireEvent, render, renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text } from "react-native";
import { defaultFeatureAccessConfig, resolveFeatureAccess, type FeatureAccessConfig } from "../featureAccessConfig";
import { createFeatureAccessService, FEATURE_ACCESS_STORAGE_KEY } from "../featureAccessService";
import { useFeatureAccess } from "../useFeatureAccess";
import { PremiumBadge, PremiumGate, premiumGateCopy } from "../PremiumGate";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

function premiumRune(): FeatureAccessConfig {
  const config = defaultFeatureAccessConfig();
  config.features.rune_draw = { tier: "premium", free: { kind: "per_day", count: 1 }, premium: { kind: "unlimited" } };
  return config;
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("feature access service", () => {
  test("starts with the built-in defaults, takes a valid published copy and caches it", async () => {
    const fetcher = jest.fn(async () => ({ version: 2, publishedAt: "2026-11-27T01:00:00Z", config: premiumRune() }));
    const service = createFeatureAccessService({ fetcher, now: () => 1_000 });
    expect(service.get()).toMatchObject({ source: "default", version: null });
    const next = await service.refresh();
    expect(next).toMatchObject({ source: "remote", version: 2, checkedAt: 1_000 });
    expect(next.config.features.rune_draw.tier).toBe("premium");
    const cached = JSON.parse((await AsyncStorage.getItem(FEATURE_ACCESS_STORAGE_KEY)) ?? "null");
    expect(cached).toMatchObject({ version: 2, checkedAt: 1_000 });
  });

  test("offline: a new install uses the cache from storage, and a failed or malformed answer keeps it", async () => {
    await AsyncStorage.setItem(FEATURE_ACCESS_STORAGE_KEY, JSON.stringify({ version: 5, publishedAt: null, config: premiumRune(), checkedAt: 50 }));
    const fetcher = jest.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ version: 6, config: { features: { rune_draw: "everything" } } });
    const service = createFeatureAccessService({ fetcher, now: () => 1_000 });
    expect(await service.hydrate()).toMatchObject({ source: "cache", version: 5 });
    expect(await service.refresh()).toMatchObject({ source: "cache", version: 5 });
    expect(await service.refresh()).toMatchObject({ source: "cache", version: 5 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  test("accept: the start-up bootstrap payload is used without a second request", async () => {
    const fetcher = jest.fn(async () => { throw new Error("should not be called"); });
    const service = createFeatureAccessService({ fetcher, now: () => 2_000 });
    expect(await service.accept({ version: 4, publishedAt: null, config: premiumRune() }, 1_500)).toMatchObject({ source: "remote", version: 4, checkedAt: 1_500 });
    // Within the refresh window the hook's refresh keeps the accepted copy.
    expect(await service.refresh()).toMatchObject({ source: "remote", version: 4 });
    expect(fetcher).not.toHaveBeenCalled();
    expect(JSON.parse((await AsyncStorage.getItem(FEATURE_ACCESS_STORAGE_KEY)) ?? "null")).toMatchObject({ version: 4 });
    // A malformed payload keeps the copy in use; null (nothing published) goes back to the defaults.
    expect(await service.accept({ version: 5, config: "nope" })).toMatchObject({ version: 4 });
    expect(await service.accept(null)).toMatchObject({ source: "remote", version: null });
    expect(await AsyncStorage.getItem(FEATURE_ACCESS_STORAGE_KEY)).toBeNull();
  });

  test("a broken cache falls back to the defaults", async () => {
    await AsyncStorage.setItem(FEATURE_ACCESS_STORAGE_KEY, JSON.stringify({ version: 5, config: { features: {} } }));
    const service = createFeatureAccessService({ fetcher: async () => { throw new Error("offline"); } });
    expect(await service.refresh()).toMatchObject({ source: "default", version: null });
  });

  test("nothing published means the defaults and clears an old cached copy", async () => {
    await AsyncStorage.setItem(FEATURE_ACCESS_STORAGE_KEY, JSON.stringify({ version: 5, publishedAt: null, config: premiumRune(), checkedAt: 50 }));
    const service = createFeatureAccessService({ fetcher: async () => null, now: () => 1_000 });
    const next = await service.refresh();
    expect(next).toMatchObject({ source: "remote", version: null, checkedAt: 1_000 });
    expect(next.config).toEqual(defaultFeatureAccessConfig());
    expect(await AsyncStorage.getItem(FEATURE_ACCESS_STORAGE_KEY)).toBeNull();
  });

  test("asks the server at most once per refresh window unless forced, and shares one request", async () => {
    let clock = 0;
    const fetcher = jest.fn(async () => ({ version: 1, publishedAt: null, config: defaultFeatureAccessConfig() }));
    const service = createFeatureAccessService({ fetcher, now: () => clock, refreshMs: 300_000 });
    await Promise.all([service.refresh(), service.refresh()]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    clock = 299_999;
    await service.refresh();
    expect(fetcher).toHaveBeenCalledTimes(1);
    clock = 300_000;
    await service.refresh();
    expect(fetcher).toHaveBeenCalledTimes(2);
    await service.refresh({ force: true });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});

describe("useFeatureAccess", () => {
  test("free account: locked once the published copy makes the feature Premium; Premium account keeps access", async () => {
    const service = createFeatureAccessService({ fetcher: async () => ({ version: 3, publishedAt: null, config: premiumRune() }) });
    const free = renderHook(() => useFeatureAccess("rune_draw", { isPremium: false, service }));
    expect(free.result.current.state).toBe("open");
    await waitFor(() => expect(free.result.current.state).toBe("locked"));
    expect(free.result.current).toMatchObject({ premiumLabel: true, configVersion: 3, source: "remote", canViewSaved: true });
    const paid = renderHook(() => useFeatureAccess("rune_draw", { isPremium: true, service }));
    expect(paid.result.current).toMatchObject({ state: "open", limit: { kind: "unlimited" } });
    const off = renderHook(() => useFeatureAccess("rune_draw", { isPremium: true, switchedOff: true, service }));
    expect(off.result.current.state).toBe("off");
    free.unmount(); paid.unmount(); off.unmount();
  });

  test("refreshes every 5 minutes while mounted", async () => {
    jest.useFakeTimers();
    try {
      const fetcher = jest.fn(async () => ({ version: 1, publishedAt: null, config: defaultFeatureAccessConfig() }));
      let clock = 0;
      const service = createFeatureAccessService({ fetcher, now: () => clock });
      const hook = renderHook(() => useFeatureAccess("boi_kieu", { isPremium: false, service }));
      await act(async () => { await Promise.resolve(); });
      await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
      clock = 5 * 60_000;
      await act(async () => { jest.advanceTimersByTime(5 * 60_000); });
      await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
      hook.unmount();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("PremiumGate", () => {
  const config = premiumRune();

  test("open shows the feature, off shows nothing", () => {
    const open = render(
      <PremiumGate access={resolveFeatureAccess({ featureId: "boi_kieu", config, isPremium: false })} language="vi">
        <Text>Bói Kiều</Text>
      </PremiumGate>
    );
    expect(open.getByText("Bói Kiều")).toBeTruthy();
    const off = render(
      <PremiumGate access={resolveFeatureAccess({ featureId: "boi_kieu", config, isPremium: false, switchedOff: true })} language="vi">
        <Text>Bói Kiều</Text>
      </PremiumGate>
    );
    expect(off.queryByText("Bói Kiều")).toBeNull();
    expect(off.toJSON()).toBeNull();
  });

  test("locked shows the Premium label, keeps saved content reassurance, and opens the Premium screen", () => {
    const onOpenPremium = jest.fn();
    const screen = render(
      <PremiumGate access={resolveFeatureAccess({ featureId: "rune_draw", config, isPremium: false })} language="vi" onOpenPremium={onOpenPremium}>
        <Text>Rút rune</Text>
      </PremiumGate>
    );
    expect(screen.queryByText("Rút rune")).toBeNull();
    expect(screen.getByTestId("premium-gate-rune_draw")).toBeTruthy();
    expect(screen.getByTestId("premium-badge")).toBeTruthy();
    expect(screen.getByText(premiumGateCopy.vi.body)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Xem Premium"));
    expect(onOpenPremium).toHaveBeenCalledTimes(1);
  });

  test("locked without a Premium handler still explains instead of an empty screen", () => {
    const screen = render(
      <PremiumGate access={resolveFeatureAccess({ featureId: "rune_draw", config, isPremium: false })} language="en">
        <Text>Rune</Text>
      </PremiumGate>
    );
    expect(screen.getByText(premiumGateCopy.en.title)).toBeTruthy();
    expect(screen.getByTestId("premium-gate-no-action")).toBeTruthy();
    expect(screen.queryByTestId("premium-gate-open")).toBeNull();
  });

  test("badge renders on its own", () => {
    expect(render(<PremiumBadge language="en" testID="b" />).getByText("Premium")).toBeTruthy();
  });
});
