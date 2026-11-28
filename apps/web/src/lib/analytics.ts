export const publicAnalyticsEvents = [
  "help_search",
  "help_no_result",
  "help_article_open",
  "waitlist_cta_click",
  "waitlist_success",
  "share_link_opened",
  "signup_from_share",
  // A visitor tried the page's own tool (drew a card, worked out a number, compared signs). Carries the variant only:
  // never the card, the number, the date or anything typed.
  "share_landing_try"
] as const;

export type PublicAnalyticsEvent = (typeof publicAnalyticsEvents)[number];

type PublicAnalyticsValue = string | number | boolean;
type PublicAnalyticsProperties = Record<string, PublicAnalyticsValue | null | undefined>;

const eventNames = new Set<string>(publicAnalyticsEvents);
const propertyNames = new Set([
  "article",
  "locale",
  "medium",
  "query_length",
  "result_count",
  "result_type",
  "source",
  "surface",
  "target",
  "variant"
]);

type ZarazWindow = Window & {
  zaraz?: {
    track?: (eventName: string, properties?: Record<string, PublicAnalyticsValue>) => Promise<unknown> | unknown;
  };
};

export function isPublicAnalyticsEvent(value: string): value is PublicAnalyticsEvent {
  return eventNames.has(value);
}

export function trackPublicEvent(eventName: PublicAnalyticsEvent, properties: PublicAnalyticsProperties = {}) {
  if (typeof window === "undefined") return;

  const safeProperties = Object.fromEntries(
    Object.entries(properties).filter(
      ([key, value]) => propertyNames.has(key) && value != null && ["string", "number", "boolean"].includes(typeof value)
    )
  ) as Record<string, PublicAnalyticsValue>;

  window.dispatchEvent(new CustomEvent("nilaza:analytics", { detail: { eventName, properties: safeProperties } }));

  const track = (window as ZarazWindow).zaraz?.track;
  if (typeof track !== "function") return;

  try {
    void Promise.resolve(track(eventName, safeProperties)).catch(() => undefined);
  } catch {
    // Analytics must never interrupt the user flow.
  }
}
