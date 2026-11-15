import { billingTestEnabled } from "../../runtimeConfig";
import { premiumOnSale } from "../owner/accountTierPolicy";

/**
 * Whether the purchase screen may be shown. Ordinary builds show it only while Premium is on sale
 * (shared policy, still false). A closed-test build with EXPO_PUBLIC_BILLING_TEST=true shows it so
 * license testers can try a purchase; the flag never changes the account tier.
 */
export function isPaywallEnabled(input: { onSale?: boolean; billingTest?: boolean } = {}): boolean {
  return Boolean(input.onSale ?? premiumOnSale) || Boolean(input.billingTest ?? billingTestEnabled);
}

export const paywallEnabled = isPaywallEnabled();
