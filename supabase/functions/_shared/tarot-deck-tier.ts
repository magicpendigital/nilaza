import decks from "../../../packages/content/data/tarot-decks.json" with { type: "json" };

// Tarot v2 pack 0 (Owner 2026-11-16): the deck tier is a server-side fact, never taken from the client. A deck whose
// accessTier is not "free" (premium-preview today) needs Premium to draw once Premium is on sale. Unknown or missing
// deck ids count as free, as before: the deck only picks the art and reading style, and prepareTarotContext validates it.
export type TarotDeckTier = "free" | "premium";

const tiers = new Map<string, TarotDeckTier>();
for (const deck of decks as Array<{ id?: string; slug?: string; accessTier?: string }>) {
  const tier: TarotDeckTier = deck.accessTier === "free" ? "free" : "premium";
  if (typeof deck.id === "string") tiers.set(deck.id, tier);
  if (typeof deck.slug === "string") tiers.set(deck.slug, tier);
}

export function tarotDeckTier(idOrSlug: string | undefined | null): TarotDeckTier {
  return idOrSlug ? tiers.get(idOrSlug) ?? "free" : "free";
}
