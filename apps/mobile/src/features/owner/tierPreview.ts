export type AccountTier = "free" | "premium";
export type OwnerTierPreview = "account" | AccountTier;
export type ContentAccessTier = "free" | "premium" | "premium-preview";

export const premiumPriceHypothesisVnd = {
  monthly: 99_000,
  annual: 799_000,
} as const;

export function resolveDisplayedTier(input: {
  accountTier: AccountTier;
  isOwner: boolean;
  preview: OwnerTierPreview;
}): AccountTier {
  if (input.isOwner && input.preview !== "account") return input.preview;
  return input.accountTier;
}

export function isOwnerTierPreviewActive(input: {
  isOwner: boolean;
  preview: OwnerTierPreview;
}): boolean {
  return input.isOwner && input.preview !== "account";
}

// Owner decision 2026-10-23: the first Play release is free and sells nothing, so
// content marked "premium-preview" is open to every account. Set to false once
// purchases exist to restore the locks; Astrology AI keeps its server entitlement.
export const FREE_LAUNCH = true;

export function effectiveContentTier(tier: ContentAccessTier): ContentAccessTier {
  return FREE_LAUNCH && tier === "premium-preview" ? "free" : tier;
}

/** This only resolves what the client may display. The server still owns entitlement checks. */
export function canViewContentTier(
  requiredTier: ContentAccessTier,
  displayedTier: AccountTier,
): boolean {
  return effectiveContentTier(requiredTier) === "free" || displayedTier === "premium";
}

export function getAnnualPriceHypothesisMath() {
  const monthlyAnnualTotal = premiumPriceHypothesisVnd.monthly * 12;
  const savings = monthlyAnnualTotal - premiumPriceHypothesisVnd.annual;
  return {
    monthlyAnnualTotal,
    savings,
    savingsPercent: (savings / monthlyAnnualTotal) * 100,
    annualMonthlyEquivalent: premiumPriceHypothesisVnd.annual / 12,
  };
}
