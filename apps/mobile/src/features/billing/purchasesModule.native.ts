import { NativeModules, Platform } from "react-native";
import type { PurchasesModule } from "./billingClient";

// Android and iOS; iOS only sells once its public key is set (see billingPublicKeyForPlatform). Expo Go
// and builds without the native module get no purchases at all, rather than the SDK's simulated preview mode.
export function loadPurchasesModule(): PurchasesModule | null {
  if ((Platform.OS !== "android" && Platform.OS !== "ios") || !NativeModules.RNPurchases) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require("react-native-purchases") as { default?: PurchasesModule };
    return loaded.default ?? null;
  } catch {
    return null;
  }
}
