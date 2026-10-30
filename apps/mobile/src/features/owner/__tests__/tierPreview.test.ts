import {
  canViewContentTier,
  getAnnualPriceHypothesisMath,
  isOwnerTierPreviewActive,
  premiumPriceHypothesisVnd,
  resolveDisplayedTier,
} from "../tierPreview";

describe("Owner account tier preview", () => {
  it("fails closed for users without the verified owner role", () => {
    expect(
      resolveDisplayedTier({ accountTier: "free", isOwner: false, preview: "premium" }),
    ).toBe("free");
    expect(isOwnerTierPreviewActive({ isOwner: false, preview: "premium" })).toBe(false);
  });

  it("uses the real account tier until an owner selects a preview", () => {
    expect(
      resolveDisplayedTier({ accountTier: "premium", isOwner: true, preview: "account" }),
    ).toBe("premium");
    expect(isOwnerTierPreviewActive({ isOwner: true, preview: "account" })).toBe(false);
  });

  it("keeps premium content for the displayed Premium view", () => {
    expect(canViewContentTier("free", "free")).toBe(true);
    expect(canViewContentTier("premium", "free")).toBe(false);
    expect(canViewContentTier("premium-preview", "free")).toBe(false);
    expect(canViewContentTier("premium", "premium")).toBe(true);
    expect(canViewContentTier("premium-preview", "premium")).toBe(true);
  });

  it("calculates the proposed annual price against twelve monthly payments", () => {
    const math = getAnnualPriceHypothesisMath();
    expect(premiumPriceHypothesisVnd).toEqual({ monthly: 99_000, annual: 799_000 });
    expect(math.monthlyAnnualTotal).toBe(1_188_000);
    expect(math.savings).toBe(389_000);
    expect(math.savingsPercent).toBeCloseTo(32.7441, 3);
    expect(math.annualMonthlyEquivalent).toBeCloseTo(66_583.33, 2);
  });
});
