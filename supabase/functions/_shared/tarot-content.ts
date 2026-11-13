// Admin A6 / E4 (review AD-05): Tarot card meanings and the deck reading style come from the content bundle the Owner
// published in Admin (get_published_content_bundle, migration 20260917172721) when it holds valid data, and from
// packages/content/data/tarot-cards.json otherwise. Card selection stays deterministic in the app: this module only
// supplies text for card IDs that were already chosen and validated against the canonical 78 cards.
// Bundle shape (apps/admin/content-sync.js toBundlePayload): decks[] {id, slug, status, readingStyle{vi,en}},
// baseCards[] (canonical cards, possibly edited), cards[] deck cards {id "<deck>--<card>", baseCardId, deckId, overrides?}
// or older full deck cards with the fields inline. Every text field is checked; an invalid field keeps the canonical text.

export type Localized = { vi: string; en: string };
export type TarotCardText = { name: Localized; uprightMeaning: Localized; reversedMeaning: Localized; reflectionQuestion: Localized };
export type TarotCardField = keyof TarotCardText;
export const TAROT_CARD_FIELDS: readonly TarotCardField[] = Object.freeze(["name", "uprightMeaning", "reversedMeaning", "reflectionQuestion"]);
const FIELD_LIMITS: Record<TarotCardField, number> = { name: 120, uprightMeaning: 4000, reversedMeaning: 4000, reflectionQuestion: 1000 };
const READING_STYLE_LIMIT = 600;
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,159}$/;

export type PublishedTarotContent = {
  source: "published_content_bundle";
  /** content-bundle:<version>, safe for answer receipts. */
  version: string;
  baseCards: Map<string, Partial<TarotCardText>>;
  deckCards: Map<string, Partial<TarotCardText>>;
  decks: Map<string, { id: string; slug: string; readingStyle?: Localized }>;
};

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;
function text(value: unknown, limit: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.trim();
  if (!clean || clean.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(clean)) return undefined;
  return clean;
}
function localized(value: unknown, limit: number): Localized | undefined {
  const obj = record(value);
  if (!obj) return undefined;
  const vi = text(obj.vi, limit), en = text(obj.en, limit);
  return vi && en ? { vi, en } : undefined;
}
function cardText(source: RecordValue | null): Partial<TarotCardText> {
  const result: Partial<TarotCardText> = {};
  if (!source) return result;
  for (const field of TAROT_CARD_FIELDS) {
    const value = localized(source[field], FIELD_LIMITS[field]);
    if (value) result[field] = value;
  }
  return result;
}

/** Parses the RPC result; null when it is not a usable published bundle (the caller then uses tarot-cards.json). */
export function parsePublishedTarotContent(value: unknown): PublishedTarotContent | null {
  const bundle = record(value);
  const payload = record(bundle?.payload);
  if (!bundle || !payload || (bundle.status !== undefined && bundle.status !== "published")) return null;
  const version = typeof bundle.version === "number" || (typeof bundle.version === "string" && /^[0-9]{1,18}$/.test(bundle.version))
    ? String(bundle.version) : null;
  if (!version || !Array.isArray(payload.decks) || !Array.isArray(payload.cards)) return null;
  const decks = new Map<string, { id: string; slug: string; readingStyle?: Localized }>();
  for (const item of payload.decks) {
    const deck = record(item);
    const id = typeof deck?.id === "string" && ID.test(deck.id) ? deck.id : null;
    if (!deck || !id || deck.status === "archived") continue;
    const slug = typeof deck.slug === "string" && ID.test(deck.slug) ? deck.slug : id;
    const style = localized(deck.readingStyle, READING_STYLE_LIMIT);
    const entry = { id, slug, ...(style ? { readingStyle: style } : {}) };
    decks.set(id, entry);
    decks.set(slug, entry);
  }
  const baseCards = new Map<string, Partial<TarotCardText>>();
  for (const item of Array.isArray(payload.baseCards) ? payload.baseCards : []) {
    const card = record(item);
    if (card && typeof card.id === "string" && ID.test(card.id)) baseCards.set(card.id, cardText(card));
  }
  const deckCards = new Map<string, Partial<TarotCardText>>();
  for (const item of payload.cards) {
    const card = record(item);
    if (!card || typeof card.deckId !== "string" || !ID.test(card.deckId)) continue;
    const baseId = typeof card.baseCardId === "string" && ID.test(card.baseCardId) ? card.baseCardId
      : typeof card.id === "string" && card.id.startsWith(`${card.deckId}--`) ? card.id.slice(card.deckId.length + 2) : null;
    if (!baseId || card.status === "archived") continue;
    // Compact cards keep edits in overrides; older full cards carry the fields inline.
    const fields = { ...cardText(card), ...cardText(record(card.overrides)) };
    if (Object.keys(fields).length) deckCards.set(`${card.deckId}--${baseId}`, fields);
  }
  return { source: "published_content_bundle", version: `content-bundle:${version}`, baseCards, deckCards, decks };
}

/** Text for one canonical card in a deck: canonical, then the bundle's base card, then the deck card edits. */
export function publishedCardText(content: PublishedTarotContent | null | undefined, deckKey: string | undefined, cardId: string,
  canonical: TarotCardText): TarotCardText {
  if (!content) return canonical;
  const deck = deckKey ? content.decks.get(deckKey) : undefined;
  return { ...canonical, ...(content.baseCards.get(cardId) ?? {}), ...(deck ? content.deckCards.get(`${deck.id}--${cardId}`) ?? {} : {}) };
}

export function publishedReadingStyle(content: PublishedTarotContent | null | undefined, deckKey: string | undefined): Localized | undefined {
  return deckKey ? content?.decks.get(deckKey)?.readingStyle : undefined;
}

export const TAROT_CONTENT_CACHE_MS = 60_000;
export const TAROT_CONTENT_READ_TIMEOUT_MS = 1_500;
let cache: { at: number; value: PublishedTarotContent | null } | null = null;
export function resetTarotContentCache() { cache = null; }

/**
 * The published bundle for Tarot, cached for a minute. Never throws: a missing RPC, an error, a slow read (1.5 s) or an
 * invalid bundle all return null so the reading uses tarot-cards.json.
 */
export async function readPublishedTarotContent(
  supabase: { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> } | null | undefined,
  now: () => number = Date.now
): Promise<PublishedTarotContent | null> {
  if (!supabase) return null;
  if (cache && now() - cache.at < TAROT_CONTENT_CACHE_MS) return cache.value;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const read = Promise.resolve(supabase.rpc("get_published_content_bundle", { p_bundle_key: "nilaza_default" }))
      .then(({ data, error }) => error ? null : parsePublishedTarotContent(data), () => null);
    const value = await Promise.race([read, new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), TAROT_CONTENT_READ_TIMEOUT_MS); })]);
    // A failed or empty read is retried after 15 seconds instead of a minute.
    cache = { at: value ? now() : now() - TAROT_CONTENT_CACHE_MS + 15_000, value };
    return value;
  } catch {
    return null;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
