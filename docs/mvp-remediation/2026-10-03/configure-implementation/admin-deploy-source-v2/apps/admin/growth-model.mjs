export const allowedLocales = new Set(["all", "vi", "en"]);

export function selectLocale(value) {
  return allowedLocales.has(value) ? value : "all";
}

export function percent(numerator, denominator) {
  if (!Number.isFinite(numerator) || numerator < 0 || !Number.isFinite(denominator) || denominator <= 0) return "Unavailable";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export function validateWaitlistAggregate(data) {
  const count = value => value === null || (Number.isSafeInteger(value) && value >= 0);
  const text = value => typeof value === "string" && value.length <= 1000;
  if (!["live_aggregate", "synthetic_review_fixture"].includes(data?.classification) || !text(data.source)) return false;
  if (data.classification === "live_aggregate" && !Number.isFinite(Date.parse(data.generatedAt))) return false;
  if (data.classification === "synthetic_review_fixture" && !text(data.snapshotDate)) return false;
  if (typeof data.deliveryHealth?.providerConnected !== "boolean" || !Array.isArray(data.steps) || !Array.isArray(data.suppressions)) return false;
  for (const key of ["all", "vi", "en"]) {
    if (!["requested", "confirmed", "engaged", "invited", "accepted", "unsubscribed", "bounced", "complained"].every(field => count(data.segments?.[key]?.[field]))) return false;
    if (!["queued", "retry", "deadLetter"].every(field => count(data.deliveryHealth[key]?.[field]))) return false;
    if (!data.steps.every(step => text(step.id) && text(step.label) && text(step.timing) && count(step[key]?.eligible) && count(step[key]?.advanced))) return false;
    if (!data.suppressions.every(item => text(item.reason) && text(item.behavior) && count(item.counts?.[key]))) return false;
  }
  return true;
}

export function displayValue(value) {
  return value === null || value === undefined ? "—" : String(value);
}

export function viewModel(data, locale = "all") {
  const key = selectLocale(locale);
  const segment = data.segments[key];
  return {
    key,
    segment,
    classification: data.classification,
    isLive: data.classification === "live_aggregate",
    confirmationRate: percent(segment.confirmed, segment.requested),
    acceptanceRate: percent(segment.accepted, segment.invited),
    engagementRate: percent(segment.engaged, segment.confirmed),
    steps: data.steps.map(step => ({ ...step, metrics: step[key] })),
    deliveryHealth: data.deliveryHealth[key] || data.deliveryHealth,
    suppressions: data.suppressions.map(item => ({
      ...item,
      count: item.counts ? item.counts[key] : item.count
    }))
  };
}
