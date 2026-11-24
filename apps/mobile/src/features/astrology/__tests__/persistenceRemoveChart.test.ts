import { calculateChart } from "../../../../../../packages/astrology-core/calculator.mjs";
import { AccountScope } from "../../../auth/accountScope";
import { createAccountStorage } from "../../../auth/accountStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
import { astrologyStorageKey, freshAstrologyData, removeSavedChart } from "../persistence";

const input = {
  revision: 1,
  date: "2000-01-01",
  time: "12:00",
  precision: "exact" as const,
  place: { id: "fixture", source: "test", confirmed: true as const, latitude: 21, longitude: 105, timezone: "Asia/Ho_Chi_Minh" },
};
const report = (id: string) => ({ id, createdAt: "2026-11-24T00:00:00Z", placeName: "Fixture", input, chart: calculateChart(input) });
const note = (id: string) => ({ id, title: "t", prompt: "p", text: "x", createdAt: "2026-11-24T00:00:00Z" });

function storageFor(id: string) {
  const storage = createAccountStorage(new AccountScope({ status: "signed_in", user: { id } } as any));
  storage.markHydrated();
  return storage;
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

test("removing a saved chart drops it and its notes and keeps everything else", async () => {
  const storage = storageFor("qa-remove");
  const data = { ...freshAstrologyData(), nextRevision: 2, reports: [report("r1"), report("r2")], notes: [note("r1"), note("r2")] };
  data.library.bookmarks = ["aries"];
  await storage.saveJsonOrThrow(astrologyStorageKey, data);
  await removeSavedChart(storage, "r1");
  const loaded = await storage.loadJson(astrologyStorageKey, freshAstrologyData());
  expect(loaded.reports.map((chart) => chart.id)).toEqual(["r2"]);
  expect(loaded.notes.map((item) => item.id)).toEqual(["r2"]);
  expect(loaded.library.bookmarks).toEqual(["aries"]);
});

test("an unknown chart id changes nothing and unreadable data is never overwritten", async () => {
  const storage = storageFor("qa-remove-2");
  const data = { ...freshAstrologyData(), nextRevision: 2, reports: [report("r1")] };
  await storage.saveJsonOrThrow(astrologyStorageKey, data);
  const save = jest.spyOn(storage, "saveJsonOrThrow");
  await removeSavedChart(storage, "missing");
  expect(save).not.toHaveBeenCalled();
  await storage.saveJsonOrThrow(astrologyStorageKey, { broken: true });
  save.mockClear();
  await expect(removeSavedChart(storage, "r1")).rejects.toThrow("Invalid stored astrology data");
  expect(save).not.toHaveBeenCalled();
});
