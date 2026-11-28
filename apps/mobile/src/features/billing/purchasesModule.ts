import type { PurchasesModule } from "./billingClient";

// Web (and any non-native bundle): store purchases are not offered, and the billing SDK is kept out
// of the bundle. The native build resolves purchasesModule.native.ts instead.
export function loadPurchasesModule(): PurchasesModule | null {
  return null;
}
