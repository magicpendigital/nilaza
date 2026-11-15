import type { PurchasesModule, SdkCustomerInfo, SdkOffering, SdkPackage } from "../billingClient";

export function customerInfo(active: boolean, expirationDate = "2026-12-15T00:00:00Z"): SdkCustomerInfo {
  return {
    entitlements: { active: active ? { premium: { identifier: "premium", isActive: true, willRenew: true, expirationDate } } : {} },
    managementURL: "https://play.google.com/store/account/subscriptions",
  };
}

export function pkg(kind: "monthly" | "annual", price: number, priceString: string, currencyCode = "VND"): SdkPackage {
  return {
    identifier: kind === "monthly" ? "$rc_monthly" : "$rc_annual",
    packageType: kind === "monthly" ? "MONTHLY" : "ANNUAL",
    product: { identifier: `nilaza_premium:${kind}`, price, priceString, currencyCode },
  };
}

export function offering(packages: { monthly?: SdkPackage | null; annual?: SdkPackage | null } = {}): SdkOffering {
  const monthly = packages.monthly === undefined ? pkg("monthly", 99_000, "99.000 ₫") : packages.monthly;
  const annual = packages.annual === undefined ? pkg("annual", 799_000, "799.000 ₫") : packages.annual;
  return { identifier: "default", monthly, annual, availablePackages: [monthly, annual].filter(Boolean) as SdkPackage[] };
}

/** In-memory stand-in for the store SDK; records the order of calls. */
export function fakePurchases(overrides: Partial<PurchasesModule> = {}) {
  const calls: string[] = [];
  const listeners = new Set<(info: SdkCustomerInfo) => void>();
  const module: PurchasesModule = {
    configure: jest.fn((config: { apiKey: string; appUserID?: string | null }) => { calls.push(`configure:${config.appUserID}`); }),
    logIn: jest.fn(async (id: string) => { calls.push(`logIn:${id}`); return { customerInfo: customerInfo(false), created: false }; }),
    logOut: jest.fn(async () => { calls.push("logOut"); return customerInfo(false); }),
    getCustomerInfo: jest.fn(async () => { calls.push("getCustomerInfo"); return customerInfo(false); }),
    getOfferings: jest.fn(async () => { calls.push("getOfferings"); return { current: offering() }; }),
    purchasePackage: jest.fn(async (p: SdkPackage) => { calls.push(`purchase:${p.identifier}`); return { customerInfo: customerInfo(true) }; }),
    restorePurchases: jest.fn(async () => { calls.push("restore"); return customerInfo(true); }),
    addCustomerInfoUpdateListener: jest.fn((listener: (info: SdkCustomerInfo) => void) => { listeners.add(listener); }),
    removeCustomerInfoUpdateListener: jest.fn((listener: (info: SdkCustomerInfo) => void) => listeners.delete(listener)),
    ...overrides,
  };
  return { module, calls, emit: (info: SdkCustomerInfo) => listeners.forEach((listener) => listener(info)), listeners };
}
