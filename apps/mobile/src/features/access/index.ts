// Free / Premium switch per on-device feature (Owner 27/11/2026). Fed by the start-up bootstrap (src/startup);
// wired into BookQuoteScreen (book_quote).
export * from "./featureAccessConfig";
export * from "./featureAccessService";
export { useFeatureAccess } from "./useFeatureAccess";
export { PremiumBadge, PremiumGate, premiumGateCopy } from "./PremiumGate";
