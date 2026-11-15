import { annualSavingsPercent } from "../annualSavings";

test("99k a month against 799k a year saves about 33%", () => {
  expect(annualSavingsPercent({ monthlyPrice: 99_000, annualPrice: 799_000, monthlyCurrency: "VND", annualCurrency: "VND" })).toBe(33);
});

test("no saving is shown when the yearly plan is not cheaper", () => {
  expect(annualSavingsPercent({ monthlyPrice: 99_000, annualPrice: 1_188_000, monthlyCurrency: "VND", annualCurrency: "VND" })).toBeUndefined();
  expect(annualSavingsPercent({ monthlyPrice: 99_000, annualPrice: 1_500_000, monthlyCurrency: "VND", annualCurrency: "VND" })).toBeUndefined();
  // Below 1% after rounding is not worth a label.
  expect(annualSavingsPercent({ monthlyPrice: 100, annualPrice: 1_199 })).toBeUndefined();
});

test("unknown, invalid or mixed-currency prices show no saving", () => {
  expect(annualSavingsPercent({ monthlyPrice: undefined, annualPrice: 799_000 })).toBeUndefined();
  expect(annualSavingsPercent({ monthlyPrice: 0, annualPrice: 799_000 })).toBeUndefined();
  expect(annualSavingsPercent({ monthlyPrice: Number.NaN, annualPrice: 799_000 })).toBeUndefined();
  expect(annualSavingsPercent({ monthlyPrice: 4.99, annualPrice: 799_000, monthlyCurrency: "USD", annualCurrency: "VND" })).toBeUndefined();
});
