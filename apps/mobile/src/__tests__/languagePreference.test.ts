import AsyncStorage from "@react-native-async-storage/async-storage";
import { deviceLanguageKey, loadDeviceLanguagePreference, saveDeviceLanguagePreference } from "../languagePreference";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

describe("device language preference", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("returns null before any language was picked, so the phone language applies", async () => {
    await expect(loadDeviceLanguagePreference()).resolves.toBeNull();
  });

  it("keeps a language picked on a signed-out screen across restarts", async () => {
    await saveDeviceLanguagePreference("vi");
    await expect(loadDeviceLanguagePreference()).resolves.toBe("vi");
    await saveDeviceLanguagePreference("en");
    await expect(loadDeviceLanguagePreference()).resolves.toBe("en");
  });

  it("stores only the language code under one device-wide key", async () => {
    await saveDeviceLanguagePreference("vi");
    await expect(AsyncStorage.getItem(deviceLanguageKey)).resolves.toBe("vi");
  });

  it("ignores unknown stored values", async () => {
    await AsyncStorage.setItem(deviceLanguageKey, "fr");
    await expect(loadDeviceLanguagePreference()).resolves.toBeNull();
  });

  it("treats a storage failure as no preference", async () => {
    const spy = jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("disk"));
    await expect(loadDeviceLanguagePreference()).resolves.toBeNull();
    spy.mockRestore();
  });
});
