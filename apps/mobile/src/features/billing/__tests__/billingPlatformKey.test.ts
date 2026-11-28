import { billingPublicKeyForPlatform } from "../../../runtimeConfig";

describe("billingPublicKeyForPlatform", () => {
  const keys = { android: " android-key ", ios: "ios-key" };

  it("returns the key of the running platform", () => {
    expect(billingPublicKeyForPlatform("android", keys)).toBe("android-key");
    expect(billingPublicKeyForPlatform("ios", keys)).toBe("ios-key");
  });

  it("gives web and unknown platforms no key", () => {
    expect(billingPublicKeyForPlatform("web", keys)).toBeUndefined();
    expect(billingPublicKeyForPlatform("windows", keys)).toBeUndefined();
  });

  it("keeps iOS off while its key is empty, without touching Android", () => {
    expect(billingPublicKeyForPlatform("ios", { android: "a", ios: "  " })).toBeUndefined();
    expect(billingPublicKeyForPlatform("ios", { android: "a" })).toBeUndefined();
    expect(billingPublicKeyForPlatform("android", { android: "a" })).toBe("a");
  });
});
