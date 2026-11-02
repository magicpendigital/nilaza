import type { Language } from "../../types";

export type SavedReadingCard = { id: string; reversed: boolean; position?: string };

type RawCard = {
  id?: unknown;
  cardId?: unknown;
  reversed?: unknown;
  orientation?: unknown;
  spread?: unknown;
  positionLabel?: unknown;
};

function positionText(raw: RawCard, language: Language): string | undefined {
  const label = raw.positionLabel;
  if (typeof label === "string" && label.trim()) return label.trim();
  if (label && typeof label === "object") {
    const localized = (label as Record<string, unknown>)[language] ?? (label as Record<string, unknown>).vi ?? (label as Record<string, unknown>).en;
    if (typeof localized === "string" && localized.trim()) return localized.trim();
  }
  // Older drawn cards kept the position label in `spread`; synced snapshots use `spread` for the spread id.
  return raw.id !== undefined && typeof raw.spread === "string" && raw.spread.trim() ? raw.spread.trim() : undefined;
}

/**
 * Cards of a saved Tarot reading (analysis JO-05). Reads both the drawn-card shape
 * ({id, reversed, spread}) and the synced snapshot shape ({cardId, orientation, positionLabel}).
 */
export function savedReadingCards(snapshot: unknown, language: Language): SavedReadingCard[] {
  const saved = snapshot as { type?: string; cards?: unknown } | undefined;
  if (saved?.type !== "tarot_reading" || !Array.isArray(saved.cards)) return [];
  return saved.cards.slice(0, 10).flatMap((value) => {
    const raw = (value ?? {}) as RawCard;
    const id = typeof raw.id === "string" ? raw.id : typeof raw.cardId === "string" ? raw.cardId : "";
    if (!id) return [];
    const reversed = raw.reversed === true || raw.orientation === "reversed";
    const position = positionText(raw, language);
    return [{ id, reversed, ...(position ? { position } : {}) }];
  });
}
