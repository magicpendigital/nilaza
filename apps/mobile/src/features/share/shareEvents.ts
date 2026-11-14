// Values the server accepts for share measurement. supabase/functions/share-events/handler.ts holds the same lists;
// a test compares them so the two cannot drift apart.
export const SHARE_EVENT_NAMES = ["share_tapped", "share_completed"] as const;
export const SHARE_SURFACES = ["today_card", "tarot_reading", "astro_big3", "astro_invite"] as const;
export const SHARE_ACTIONS = ["image", "link"] as const;
export const SHARE_OUTCOMES = ["returned", "unavailable", "failed"] as const;

export type ShareEventPayload = {
  name: (typeof SHARE_EVENT_NAMES)[number];
  surface: (typeof SHARE_SURFACES)[number];
  action: (typeof SHARE_ACTIONS)[number];
  outcome?: (typeof SHARE_OUTCOMES)[number];
};

const has = <T extends string>(list: readonly T[], value: unknown): value is T => typeof value === "string" && (list as readonly string[]).includes(value);

/** Builds the payload from the sheet's event, or null for anything the server would reject. Only enumerated values pass. */
export function toShareEventPayload(name: string, meta: { surface?: unknown; action?: unknown; outcome?: unknown }): ShareEventPayload | null {
  if (!has(SHARE_EVENT_NAMES, name) || !has(SHARE_SURFACES, meta.surface) || !has(SHARE_ACTIONS, meta.action)) return null;
  if (name === "share_completed") return has(SHARE_OUTCOMES, meta.outcome) ? { name, surface: meta.surface, action: meta.action, outcome: meta.outcome } : null;
  return { name, surface: meta.surface, action: meta.action };
}
