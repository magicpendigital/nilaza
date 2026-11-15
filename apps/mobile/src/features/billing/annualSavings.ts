/**
 * Saving of the annual plan against twelve monthly payments, from the real store prices.
 * Returns a whole percent only when the annual plan is actually cheaper (Owner, 15/11: no fixed
 * "-40%" label); undefined when either price is unknown, not positive, in different currencies,
 * or the rounded saving is below 1%.
 */
export function annualSavingsPercent(input: {
  monthlyPrice?: number | null;
  annualPrice?: number | null;
  monthlyCurrency?: string | null;
  annualCurrency?: string | null;
}): number | undefined {
  const { monthlyPrice, annualPrice, monthlyCurrency, annualCurrency } = input;
  if (typeof monthlyPrice !== "number" || typeof annualPrice !== "number") return undefined;
  if (!Number.isFinite(monthlyPrice) || !Number.isFinite(annualPrice) || monthlyPrice <= 0 || annualPrice <= 0) return undefined;
  if (monthlyCurrency && annualCurrency && monthlyCurrency !== annualCurrency) return undefined;
  const twelveMonths = monthlyPrice * 12;
  if (annualPrice >= twelveMonths) return undefined;
  const percent = Math.round(((twelveMonths - annualPrice) / twelveMonths) * 100);
  return percent >= 1 ? percent : undefined;
}
