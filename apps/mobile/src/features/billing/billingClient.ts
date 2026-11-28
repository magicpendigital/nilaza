import { Platform } from "react-native";
import { billingPublicKeyForPlatform } from "../../runtimeConfig";
import { loadPurchasesModule } from "./purchasesModule";

/** Entitlement identifier configured in the store dashboard (one Premium for everything). */
export const BILLING_PREMIUM_ENTITLEMENT = "premium";

// Minimal structural view of the billing SDK (react-native-purchases 10.x). Only what Nilaza uses,
// so tests can inject a fake and the web bundle never needs the SDK.
export type SdkStoreProduct = { identifier: string; price: number; priceString: string; currencyCode: string };
export type SdkPackage = { identifier: string; packageType: string; product: SdkStoreProduct };
export type SdkOffering = { identifier: string; monthly: SdkPackage | null; annual: SdkPackage | null; availablePackages: SdkPackage[] };
export type SdkEntitlement = { identifier: string; isActive: boolean; willRenew: boolean; expirationDate: string | null };
export type SdkCustomerInfo = {
  entitlements: { active: Record<string, SdkEntitlement | undefined> };
  managementURL: string | null;
};
export type SdkError = { code?: string; userCancelled?: boolean | null };

export type PurchasesModule = {
  configure(configuration: { apiKey: string; appUserID?: string | null }): void;
  logIn(appUserID: string): Promise<{ customerInfo: SdkCustomerInfo; created: boolean }>;
  logOut(): Promise<SdkCustomerInfo>;
  getCustomerInfo(): Promise<SdkCustomerInfo>;
  getOfferings(): Promise<{ current: SdkOffering | null }>;
  purchasePackage(aPackage: SdkPackage): Promise<{ customerInfo: SdkCustomerInfo }>;
  restorePurchases(): Promise<SdkCustomerInfo>;
  addCustomerInfoUpdateListener(listener: (info: SdkCustomerInfo) => void): void;
  removeCustomerInfoUpdateListener(listener: (info: SdkCustomerInfo) => void): boolean;
};

// PURCHASES_ERROR_CODE values from the SDK (string enum), copied so tests and web need no SDK import.
const errorCodes = {
  cancelled: "1",
  storeProblem: "2",
  notAllowed: "3",
  invalid: "4",
  productUnavailable: "5",
  alreadyPurchased: "6",
  network: "10",
  invalidCredentials: "11",
  operationInProgress: "15",
  paymentPending: "20",
  configuration: "23",
  unsupported: "24",
  productRequestTimedOut: "32",
  offline: "35",
  belongsToOtherUser: "40",
} as const;

export type BillingPlan = "monthly" | "annual";
export type BillingPackage = {
  plan: BillingPlan;
  identifier: string;
  priceString: string;
  price: number;
  currencyCode: string;
};
export type BillingOffer = { monthly?: BillingPackage; annual?: BillingPackage };
export type BillingCustomer = {
  premiumActive: boolean;
  willRenew: boolean;
  expirationDate: string | null;
  managementUrl: string | null;
};
export type BillingErrorCode =
  | "unavailable"
  | "sign_in_required"
  | "network"
  | "store_problem"
  | "not_allowed"
  | "product_unavailable"
  | "already_owned"
  | "in_progress"
  | "other_account"
  | "unknown";

export type OfferResult = { status: "ok"; offer: BillingOffer } | { status: "error"; code: BillingErrorCode };
export type PurchaseResult =
  | { status: "purchased"; customer: BillingCustomer }
  | { status: "cancelled" }
  | { status: "pending" }
  | { status: "error"; code: BillingErrorCode };
export type RestoreResult = { status: "restored"; customer: BillingCustomer } | { status: "error"; code: BillingErrorCode };

export type BillingClient = {
  /** False on web, Expo Go, a build without the native module or without a key. */
  readonly available: boolean;
  /** Ties the store customer to the signed-in account; undefined logs the previous account out. */
  identify(userId: string | undefined): Promise<BillingCustomer | null>;
  getOffer(): Promise<OfferResult>;
  purchase(plan: BillingPlan, userId: string | undefined): Promise<PurchaseResult>;
  restore(userId: string | undefined): Promise<RestoreResult>;
  subscribe(listener: (customer: BillingCustomer) => void): () => void;
};

export function toBillingCustomer(info: SdkCustomerInfo | null | undefined): BillingCustomer {
  const entitlement = info?.entitlements?.active?.[BILLING_PREMIUM_ENTITLEMENT];
  return {
    premiumActive: Boolean(entitlement?.isActive),
    willRenew: Boolean(entitlement?.willRenew),
    expirationDate: entitlement?.expirationDate ?? null,
    managementUrl: info?.managementURL ?? null,
  };
}

export function mapBillingError(error: unknown): BillingErrorCode | "cancelled" | "pending" {
  const value = (error ?? {}) as SdkError;
  if (value.userCancelled || value.code === errorCodes.cancelled) return "cancelled";
  switch (value.code) {
    case errorCodes.paymentPending: return "pending";
    case errorCodes.network:
    case errorCodes.offline:
    case errorCodes.productRequestTimedOut: return "network";
    case errorCodes.storeProblem: return "store_problem";
    case errorCodes.notAllowed:
    case errorCodes.invalid: return "not_allowed";
    case errorCodes.productUnavailable: return "product_unavailable";
    case errorCodes.alreadyPurchased: return "already_owned";
    case errorCodes.operationInProgress: return "in_progress";
    case errorCodes.belongsToOtherUser: return "other_account";
    case errorCodes.invalidCredentials:
    case errorCodes.configuration:
    case errorCodes.unsupported: return "unavailable";
    default: return "unknown";
  }
}

function toPackage(plan: BillingPlan, pkg: SdkPackage | null | undefined): BillingPackage | undefined {
  const product = pkg?.product;
  if (!pkg || !product || typeof product.priceString !== "string" || !product.priceString) return undefined;
  return { plan, identifier: pkg.identifier, priceString: product.priceString, price: product.price, currencyCode: product.currencyCode };
}

function findPackage(offering: SdkOffering, plan: BillingPlan): SdkPackage | null {
  const direct = plan === "monthly" ? offering.monthly : offering.annual;
  if (direct) return direct;
  const type = plan === "monthly" ? "MONTHLY" : "ANNUAL";
  const id = plan === "monthly" ? "$rc_monthly" : "$rc_annual";
  return offering.availablePackages?.find((item) => item.packageType === type || item.identifier === id) ?? null;
}

export function createBillingClient(deps: {
  loadModule: () => PurchasesModule | null;
  apiKey: string | undefined;
}): BillingClient {
  const apiKey = deps.apiKey?.trim();
  let module: PurchasesModule | null | undefined;
  const sdk = () => {
    if (module === undefined) module = apiKey ? deps.loadModule() : null;
    return module;
  };
  const available = Boolean(apiKey && sdk());
  let configured = false;
  // The store app user id currently logged in; set only after logIn (or configure) succeeded.
  let identifiedUserId: string | undefined;
  // Identity changes run one after another; purchases wait for the last one to settle.
  let identity: Promise<unknown> = Promise.resolve();
  let offering: SdkOffering | null = null;

  const identify = (userId: string | undefined) => {
    const run = identity.catch(() => undefined).then(async (): Promise<BillingCustomer | null> => {
      const purchases = sdk();
      if (!purchases || !apiKey) return null;
      if (!userId) {
        // Never configure anonymously: nothing can be bought without an account.
        if (configured && identifiedUserId) {
          identifiedUserId = undefined;
          offering = null;
          await purchases.logOut().catch(() => undefined);
        }
        return null;
      }
      if (!configured) {
        purchases.configure({ apiKey, appUserID: userId });
        configured = true;
        identifiedUserId = userId;
        return toBillingCustomer(await purchases.getCustomerInfo());
      }
      if (identifiedUserId === userId) return toBillingCustomer(await purchases.getCustomerInfo());
      identifiedUserId = undefined;
      offering = null;
      const result = await purchases.logIn(userId);
      identifiedUserId = userId;
      return toBillingCustomer(result.customerInfo);
    });
    identity = run;
    return run;
  };

  const ready = async (userId: string | undefined): Promise<PurchasesModule | BillingErrorCode> => {
    const purchases = sdk();
    if (!purchases || !apiKey) return "unavailable";
    if (!userId) return "sign_in_required";
    await identity.catch(() => undefined);
    // The webhook ignores anonymous ids: the account must be logged in to the store SDK first.
    if (!configured || identifiedUserId !== userId) {
      try {
        await identify(userId);
      } catch (error) {
        const code = mapBillingError(error);
        return code === "cancelled" || code === "pending" ? "unknown" : code;
      }
    }
    return identifiedUserId === userId ? purchases : "sign_in_required";
  };

  return {
    available,
    identify,
    async getOffer() {
      const purchases = sdk();
      if (!purchases || !configured || !identifiedUserId) return { status: "error", code: purchases ? "sign_in_required" : "unavailable" };
      try {
        const offerings = await purchases.getOfferings();
        offering = offerings.current;
        if (!offering) return { status: "error", code: "product_unavailable" };
        const offer: BillingOffer = {
          monthly: toPackage("monthly", findPackage(offering, "monthly")),
          annual: toPackage("annual", findPackage(offering, "annual")),
        };
        if (!offer.monthly && !offer.annual) return { status: "error", code: "product_unavailable" };
        return { status: "ok", offer };
      } catch (error) {
        const code = mapBillingError(error);
        return { status: "error", code: code === "cancelled" || code === "pending" ? "unknown" : code };
      }
    },
    async purchase(plan, userId) {
      const purchases = await ready(userId);
      if (typeof purchases === "string") return { status: "error", code: purchases };
      try {
        if (!offering) offering = (await purchases.getOfferings()).current;
        const pkg = offering ? findPackage(offering, plan) : null;
        if (!pkg) return { status: "error", code: "product_unavailable" };
        // Re-check after awaits: an account switch must not buy for the previous account.
        if (identifiedUserId !== userId) return { status: "error", code: "sign_in_required" };
        const result = await purchases.purchasePackage(pkg);
        return { status: "purchased", customer: toBillingCustomer(result.customerInfo) };
      } catch (error) {
        const code = mapBillingError(error);
        if (code === "cancelled") return { status: "cancelled" };
        if (code === "pending") return { status: "pending" };
        return { status: "error", code };
      }
    },
    async restore(userId) {
      const purchases = await ready(userId);
      if (typeof purchases === "string") return { status: "error", code: purchases };
      try {
        return { status: "restored", customer: toBillingCustomer(await purchases.restorePurchases()) };
      } catch (error) {
        const code = mapBillingError(error);
        return { status: "error", code: code === "cancelled" || code === "pending" ? "unknown" : code };
      }
    },
    subscribe(listener) {
      const purchases = sdk();
      if (!purchases || !configured) return () => undefined;
      const forward = (info: SdkCustomerInfo) => {
        if (identifiedUserId) listener(toBillingCustomer(info));
      };
      purchases.addCustomerInfoUpdateListener(forward);
      return () => { purchases.removeCustomerInfoUpdateListener(forward); };
    },
  };
}

let sharedClient: BillingClient | undefined;

/** App-wide client: the SDK may be configured only once per process. */
export function getBillingClient(): BillingClient {
  sharedClient ??= createBillingClient({ loadModule: loadPurchasesModule, apiKey: billingPublicKeyForPlatform(Platform.OS) });
  return sharedClient;
}
