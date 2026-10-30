import { accountTierPolicy, resolveAccountTier } from "../accountTierPolicy";

const created = "2026-11-01T08:00:00.000Z";
const at = (iso: string) => new Date(iso);

describe("account tier policy", () => {
  it("makes every signed-in account Premium in the closed-test default", () => {
    expect(resolveAccountTier({ signedIn: true })).toBe("premium");
    expect(resolveAccountTier({ signedIn: false })).toBe("free");
  });

  it("gives a new account Premium for 24 hours, then Free", () => {
    const policy = { mode: "new_account_trial" as const, trialHours: 24, premiumOnSale: false };
    expect(resolveAccountTier({ policy, signedIn: true, accountCreatedAt: created, now: at("2026-11-01T08:00:00.000Z") })).toBe("premium");
    expect(resolveAccountTier({ policy, signedIn: true, accountCreatedAt: created, now: at("2026-11-02T07:59:59.000Z") })).toBe("premium");
    expect(resolveAccountTier({ policy, signedIn: true, accountCreatedAt: created, now: at("2026-11-02T08:00:00.000Z") })).toBe("free");
  });

  it("fails closed when the trial cannot be measured", () => {
    const policy = { mode: "new_account_trial" as const, trialHours: 24, premiumOnSale: false };
    expect(resolveAccountTier({ policy, signedIn: true })).toBe("free");
    expect(resolveAccountTier({ policy, signedIn: true, accountCreatedAt: "not-a-date" })).toBe("free");
    expect(resolveAccountTier({ policy, signedIn: true, accountCreatedAt: created, now: at("2026-10-31T08:00:00.000Z") })).toBe("free");
  });

  it("does not promote Premium while nothing is on sale", () => {
    expect(accountTierPolicy.premiumOnSale).toBe(false);
  });

  it("keeps everyone Free in free mode", () => {
    expect(resolveAccountTier({ policy: { mode: "free", trialHours: 24, premiumOnSale: false }, signedIn: true })).toBe("free");
  });
});
