import { calculateChart } from "../../../../../../packages/astrology-core/calculator.mjs";
import { AccountScope } from "../../../auth/accountScope";
import { createAccountStorage } from "../../../auth/accountStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
import {
  astrologyStorageKey,
  clearAstrologyBirthData,
  freshAstrologyData,
  localCalendarLabel,
  validAstrologyData,
  validDisplayZone,
} from "../persistence";
const input = {
  revision: 1,
  date: "2000-01-01",
  time: "12:00",
  precision: "exact" as const,
  place: {
    id: "fixture",
    source: "test",
    confirmed: true as const,
    latitude: 21,
    longitude: 105,
    timezone: "Asia/Ho_Chi_Minh",
  },
};
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});
test("display zones give different local dates without altering a saved birth instant", () => {
  const time = new Date("2026-09-22T01:00:00Z");
  expect(localCalendarLabel(time, "Asia/Ho_Chi_Minh", "en")).toContain(
    "22 September",
  );
  expect(localCalendarLabel(time, "America/Los_Angeles", "en")).toContain(
    "21 September",
  );
  expect(validDisplayZone("not/a-zone")).toBe(false);
  const d = {
    ...freshAstrologyData(),
    nextRevision: 2,
    reports: [
      {
        id: "r1",
        createdAt: time.toISOString(),
        placeName: "Fixture",
        input,
        chart: calculateChart(input),
      },
    ],
  };
  const before = d.reports[0].chart.time.utc;
  d.displayZone = "America/Los_Angeles";
  expect(validAstrologyData(d)).toBe(true);
  expect(d.reports[0].chart.time.utc).toBe(before);
  d.reports[0].chart.placements[0].longitude = Infinity;
  expect(validAstrologyData(d)).toBe(false);
});
test("saved reports stay in their account; clearing birth data preserves library and notes, acknowledges failure", async () => {
  const make = (id: string) => {
    const scope = new AccountScope({
      status: "signed_in",
      user: { id },
    } as any);
    const storage = createAccountStorage(scope);
    storage.markHydrated();
    return { scope, storage };
  };
  const a = make("qa-A"),
    b = make("qa-B");
  const d = {
    ...freshAstrologyData(),
    nextRevision: 2,
    reports: [
      {
        id: "r1",
        createdAt: "2026-09-22T00:00:00Z",
        placeName: "Fixture",
        input,
        chart: calculateChart(input),
      },
    ],
  };
  d.library.bookmarks = ["aries"];
  await a.storage.saveJsonOrThrow(astrologyStorageKey, d);
  expect(
    (await b.storage.loadJson(astrologyStorageKey, freshAstrologyData()))
      .reports,
  ).toHaveLength(0);
  await clearAstrologyBirthData(a.storage);
  const loaded = await a.storage.loadJson(
    astrologyStorageKey,
    freshAstrologyData(),
  );
  expect(loaded.reports).toHaveLength(0);
  expect(loaded.library.bookmarks).toEqual(["aries"]);
  a.scope.close();
  await expect(
    a.storage.saveJsonOrThrow(astrologyStorageKey, d),
  ).rejects.toThrow();
});
