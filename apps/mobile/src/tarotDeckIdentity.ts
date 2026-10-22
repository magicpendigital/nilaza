/** Legacy persisted identities resolve without introducing alternate asset paths. */
export function canonicalTarotDeckId(deckId: string): string {
  return deckId === "tinh-quang" ? "celestial-reverie" : deckId;
}

export function findTarotDeckById<T>(byId: Record<string, T>, deckId: string): T | undefined {
  // Prefer the current local/published identity. A legacy published bundle is
  // still read as supplied; this never inserts a missing deck into that bundle.
  const canonicalId = canonicalTarotDeckId(deckId);
  return byId[canonicalId] ?? byId[deckId]
    ?? (canonicalId === "celestial-reverie" ? byId["tinh-quang"] : undefined);
}
