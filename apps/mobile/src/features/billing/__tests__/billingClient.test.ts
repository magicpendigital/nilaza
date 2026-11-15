import { createBillingClient, mapBillingError, toBillingCustomer } from "../billingClient";
import { customerInfo, fakePurchases, offering, pkg } from "../__fakes__/fakePurchases";

const key = "goog_public_test_key";

test("without a key or native module nothing is available and nothing is bought", async () => {
  const { module } = fakePurchases();
  const noKey = createBillingClient({ loadModule: () => module, apiKey: undefined });
  expect(noKey.available).toBe(false);
  expect(await noKey.purchase("annual", "user-1")).toEqual({ status: "error", code: "unavailable" });
  const noModule = createBillingClient({ loadModule: () => null, apiKey: key });
  expect(noModule.available).toBe(false);
  expect(await noModule.identify("user-1")).toBeNull();
  expect(await noModule.restore("user-1")).toEqual({ status: "error", code: "unavailable" });
  expect(module.configure).not.toHaveBeenCalled();
});

test("a signed-out purchase asks for sign-in and never opens the store", async () => {
  const { module } = fakePurchases();
  const client = createBillingClient({ loadModule: () => module, apiKey: key });
  expect(client.available).toBe(true);
  expect(await client.purchase("monthly", undefined)).toEqual({ status: "error", code: "sign_in_required" });
  expect(await client.restore(undefined)).toEqual({ status: "error", code: "sign_in_required" });
  expect(module.configure).not.toHaveBeenCalled();
  expect(module.purchasePackage).not.toHaveBeenCalled();
});

test("the SDK is configured with the account id, never anonymously", async () => {
  const { module, calls } = fakePurchases();
  const client = createBillingClient({ loadModule: () => module, apiKey: key });
  await client.identify(undefined);
  expect(calls).toEqual([]);
  await client.identify("user-1");
  expect(module.configure).toHaveBeenCalledWith({ apiKey: key, appUserID: "user-1" });
});

test("a purchase logs the signed-in account in before buying", async () => {
  const { module, calls } = fakePurchases();
  const client = createBillingClient({ loadModule: () => module, apiKey: key });
  await client.identify("user-1");
  const result = await client.purchase("annual", "user-2");
  expect(result).toEqual({ status: "purchased", customer: expect.objectContaining({ premiumActive: true }) });
  expect(calls.indexOf("logIn:user-2")).toBeGreaterThanOrEqual(0);
  expect(calls.indexOf("logIn:user-2")).toBeLessThan(calls.indexOf("purchase:$rc_annual"));
});

test("a failed log-in never buys for the previous account", async () => {
  const { module } = fakePurchases({ logIn: jest.fn(async () => { throw { code: "10" }; }) });
  const client = createBillingClient({ loadModule: () => module, apiKey: key });
  await client.identify("user-1");
  expect(await client.purchase("annual", "user-2")).toEqual({ status: "error", code: "network" });
  expect(module.purchasePackage).not.toHaveBeenCalled();
});

test("plans come from the default offering with store price strings", async () => {
  const { module } = fakePurchases();
  const client = createBillingClient({ loadModule: () => module, apiKey: key });
  expect(await client.getOffer()).toEqual({ status: "error", code: "sign_in_required" });
  await client.identify("user-1");
  expect(await client.getOffer()).toEqual({
    status: "ok",
    offer: {
      monthly: { plan: "monthly", identifier: "$rc_monthly", priceString: "99.000 ₫", price: 99_000, currencyCode: "VND" },
      annual: { plan: "annual", identifier: "$rc_annual", priceString: "799.000 ₫", price: 799_000, currencyCode: "VND" },
    },
  });
});

test("packages are found in availablePackages when the shortcuts are empty", async () => {
  const monthly = pkg("monthly", 4.99, "$4.99", "USD");
  const { module } = fakePurchases({
    getOfferings: jest.fn(async () => ({ current: { identifier: "default", monthly: null, annual: null, availablePackages: [monthly] } })),
  });
  const client = createBillingClient({ loadModule: () => module, apiKey: key });
  await client.identify("user-1");
  const result = await client.getOffer();
  expect(result.status === "ok" && result.offer.monthly?.priceString).toBe("$4.99");
  expect(result.status === "ok" && result.offer.annual).toBeUndefined();
});

test("an empty offering reports the product as unavailable", async () => {
  const { module } = fakePurchases({ getOfferings: jest.fn(async () => ({ current: offering({ monthly: null, annual: null }) })) });
  const client = createBillingClient({ loadModule: () => module, apiKey: key });
  await client.identify("user-1");
  expect(await client.getOffer()).toEqual({ status: "error", code: "product_unavailable" });
  expect(await client.purchase("monthly", "user-1")).toEqual({ status: "error", code: "product_unavailable" });
});

test("cancel, pending and network outcomes are told apart", async () => {
  const cancelled = fakePurchases({ purchasePackage: jest.fn(async () => { throw { code: "1", userCancelled: true }; }) });
  expect(await createBillingClient({ loadModule: () => cancelled.module, apiKey: key }).purchase("monthly", "user-1")).toEqual({ status: "cancelled" });

  const pending = fakePurchases({ purchasePackage: jest.fn(async () => { throw { code: "20" }; }) });
  expect(await createBillingClient({ loadModule: () => pending.module, apiKey: key }).purchase("monthly", "user-1")).toEqual({ status: "pending" });

  const offline = fakePurchases({ purchasePackage: jest.fn(async () => { throw { code: "10" }; }) });
  expect(await createBillingClient({ loadModule: () => offline.module, apiKey: key }).purchase("monthly", "user-1")).toEqual({ status: "error", code: "network" });
});

test("restore returns the store customer for the signed-in account", async () => {
  const { module, calls } = fakePurchases();
  const client = createBillingClient({ loadModule: () => module, apiKey: key });
  expect(await client.restore("user-1")).toEqual({ status: "restored", customer: expect.objectContaining({ premiumActive: true }) });
  expect(calls).toEqual(["configure:user-1", "getCustomerInfo", "restore"]);
});

test("signing out logs the store customer out", async () => {
  const { module, calls } = fakePurchases();
  const client = createBillingClient({ loadModule: () => module, apiKey: key });
  await client.identify("user-1");
  await client.identify(undefined);
  expect(calls).toContain("logOut");
  expect(await client.getOffer()).toEqual({ status: "error", code: "sign_in_required" });
});

test("store updates reach subscribers until they unsubscribe", async () => {
  const fake = fakePurchases();
  const client = createBillingClient({ loadModule: () => fake.module, apiKey: key });
  const listener = jest.fn();
  client.subscribe(listener);
  expect(fake.listeners.size).toBe(0); // not configured yet
  await client.identify("user-1");
  const stop = client.subscribe(listener);
  fake.emit(customerInfo(true));
  expect(listener).toHaveBeenCalledWith(expect.objectContaining({ premiumActive: true }));
  stop();
  expect(fake.listeners.size).toBe(0);
});

test("error codes map to plain outcomes", () => {
  expect(mapBillingError({ userCancelled: true })).toBe("cancelled");
  expect(mapBillingError({ code: "6" })).toBe("already_owned");
  expect(mapBillingError({ code: "40" })).toBe("other_account");
  expect(mapBillingError({ code: "23" })).toBe("unavailable");
  expect(mapBillingError({ code: "35" })).toBe("network");
  expect(mapBillingError(new Error("boom"))).toBe("unknown");
  expect(mapBillingError(undefined)).toBe("unknown");
});

test("only the premium entitlement counts", () => {
  expect(toBillingCustomer(customerInfo(true)).premiumActive).toBe(true);
  expect(toBillingCustomer({
    entitlements: { active: { other: { identifier: "other", isActive: true, willRenew: true, expirationDate: null } } },
    managementURL: null,
  }).premiumActive).toBe(false);
  expect(toBillingCustomer(null)).toEqual({ premiumActive: false, willRenew: false, expirationDate: null, managementUrl: null });
});
