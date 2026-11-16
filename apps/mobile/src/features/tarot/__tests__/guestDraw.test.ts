import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearGuestDraw, guestDeviceIdKey, guestDrawKey, isGuestDeviceId, loadGuestDraw, loadOrCreateGuestDeviceId, newGuestDeviceId, parseStoredGuestDraw, saveGuestDraw } from "../guestDraw";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

// Tarot v2 pack 1: what the device remembers of a signed-out draw.
describe("guest draw on the device", () => {
  const draw = { spread: "daily-one", topic: "open", lockDate: "2026-11-16", cards: [{ id: "major-00-the-fool", positionKey: "daily", reversed: true }] };

  beforeEach(async () => { await AsyncStorage.clear(); });

  it("makes a random v4 install id that the server accepts, and a different one each time", () => {
    const ids = Array.from({ length: 20 }, () => newGuestDeviceId());
    for (const id of ids) {
      expect(isGuestDeviceId(id)).toBe(true);
      expect(id[14]).toBe("4");
      expect("89ab").toContain(id[19]);
    }
    expect(new Set(ids).size).toBe(20);
    expect(isGuestDeviceId(newGuestDeviceId(() => 0.5))).toBe(true);
    for (const bad of [undefined, null, 3, "", "abc", "8d2b6f1e5c3a4e7b9a102f4c6d8e0a13"]) expect(isGuestDeviceId(bad)).toBe(false);
  });

  it("creates the install id once and keeps it; a damaged value is replaced", async () => {
    const first = await loadOrCreateGuestDeviceId();
    expect(await loadOrCreateGuestDeviceId()).toBe(first);
    await AsyncStorage.setItem(guestDeviceIdKey, JSON.stringify("not-an-id"));
    const replaced = await loadOrCreateGuestDeviceId();
    expect(isGuestDeviceId(replaced)).toBe(true);
    expect(replaced).not.toBe("not-an-id");
  });

  it("stores the guest draw with the install id, returns it the same Vietnam day only, and clears it", async () => {
    const deviceId = await loadOrCreateGuestDeviceId();
    await saveGuestDraw(deviceId, draw);
    expect(await loadGuestDraw("2026-11-16")).toEqual({ deviceId, ...draw });
    expect(await loadGuestDraw("2026-11-17")).toBeNull();
    await clearGuestDraw();
    expect(await loadGuestDraw("2026-11-16")).toBeNull();
    expect(await AsyncStorage.getItem(guestDrawKey)).toBeNull();
  });

  it("refuses a stored draw that is damaged or has no valid install id", () => {
    const good = { deviceId: "8d2b6f1e-5c3a-4e7b-9a10-2f4c6d8e0a13", ...draw };
    expect(parseStoredGuestDraw(good, "2026-11-16")).toEqual(good);
    for (const bad of [null, [], "x", { ...good, deviceId: "nope" }, { ...good, cards: [] }, { ...good, cards: [{ id: "a" }] }, { ...good, lockDate: 5 }]) {
      expect(parseStoredGuestDraw(bad, "2026-11-16")).toBeNull();
    }
  });
});
