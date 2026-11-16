// P1-A "một sự kiện, một câu trả lời": helpers for the server-drawn Tarot reading of a signed-in account.
// The server draws the cards (CSPRNG) once per account, spread, topic and Vietnam day; the app only shows them,
// asks to interpret that drawId and replays the stored answer. Guests keep the local draw.

export type Localized = { vi?: string; en: string };
export type TarotServerCard = { id: string; positionKey: string; reversed: boolean };
export type TarotClarifier = {
  cardId: string;
  reversed: boolean;
  name: Localized;
  meaning: Localized;
  reflectionQuestion: Localized;
  drawnAt?: string;
};
export type TarotServerDraw = {
  drawId: string;
  status: "queued" | "completed";
  replayed: boolean;
  spread: string;
  topic: string;
  lockDate?: string;
  nextDrawAt?: string;
  cards: TarotServerCard[];
  clarifier?: TarotClarifier;
};

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const shortString = (value: unknown, limit = 120): value is string => typeof value === "string" && value.length > 0 && value.length <= limit;
const isoTime = (value: unknown): value is string => typeof value === "string" && value.length <= 40 && Number.isFinite(Date.parse(value));

function localized(value: unknown, limit = 2000): Localized | null {
  const item = record(value);
  if (!item || typeof item.en !== "string" || item.en.length > limit) return null;
  if (item.vi !== undefined && (typeof item.vi !== "string" || item.vi.length > limit)) return null;
  return { en: item.en, ...(typeof item.vi === "string" ? { vi: item.vi } : {}) };
}

/** The Vietnam (UTC+7) calendar day of `date` as YYYY-MM-DD: the day the server locks a reading to. */
export function utc7DateKey(date: Date = new Date()): string {
  return new Date(date.getTime() + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Index of today's Home card: the same for the whole Vietnam day and the same account, whatever the profile says
 * (goal or tone changes no longer swap the card). FNV-1a over "account:date"; display only, not a Tarot draw.
 */
export function dailyCardIndex(userId: string | null | undefined, dateKey: string, count: number): number {
  if (!Number.isInteger(count) || count <= 0) return 0;
  const seed = `${userId || "guest"}:${dateKey}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % count;
}

export function parseTarotClarifier(value: unknown): TarotClarifier | null {
  const item = record(value);
  if (!item || !shortString(item.cardId, 80) || typeof item.reversed !== "boolean") return null;
  const name = localized(item.name, 200), meaning = localized(item.meaning), reflectionQuestion = localized(item.reflectionQuestion, 600);
  if (!name || !meaning || !reflectionQuestion) return null;
  return { cardId: item.cardId, reversed: item.reversed, name, meaning, reflectionQuestion, ...(isoTime(item.drawnAt) ? { drawnAt: item.drawnAt } : {}) };
}

/** Validates the server's draw answer; anything unexpected is refused (the app then shows an error, never local cards). */
export function parseTarotServerDraw(value: unknown): TarotServerDraw | null {
  const item = record(value);
  if (!item || !shortString(item.drawId, 64) || !shortString(item.spread, 40) || !shortString(item.topic, 40)) return null;
  if (item.status !== "queued" && item.status !== "completed") return null;
  if (!Array.isArray(item.cards) || item.cards.length < 1 || item.cards.length > 10) return null;
  const cards: TarotServerCard[] = [];
  for (const raw of item.cards) {
    const card = record(raw);
    if (!card || !shortString(card.id, 80) || !shortString(card.positionKey, 40) || typeof card.reversed !== "boolean") return null;
    cards.push({ id: card.id, positionKey: card.positionKey, reversed: card.reversed });
  }
  if (new Set(cards.map(card => card.id)).size !== cards.length) return null;
  const clarifier = item.clarifier === undefined ? undefined : parseTarotClarifier(item.clarifier);
  if (clarifier === null) return null;
  return {
    drawId: item.drawId, status: item.status, replayed: item.replayed === true, spread: item.spread, topic: item.topic, cards,
    ...(typeof item.lockDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.lockDate) ? { lockDate: item.lockDate } : {}),
    ...(isoTime(item.nextDrawAt) ? { nextDrawAt: item.nextDrawAt } : {}),
    ...(clarifier ? { clarifier } : {})
  };
}

/** The server cards as app cards, in the server's order, with the spread's position labels; null when any card is unknown. */
export function mapServerCards<T extends { id: string }>(server: TarotServerCard[], catalog: T[], labels: string[]): Array<T & { reversed: boolean; spread: string }> | null {
  const byId = new Map(catalog.map(card => [card.id, card]));
  const mapped = server.map((card, index) => {
    const source = byId.get(card.id);
    return source ? { ...source, reversed: card.reversed, spread: labels[index] ?? card.positionKey } : null;
  });
  return mapped.every(Boolean) ? mapped as Array<T & { reversed: boolean; spread: string }> : null;
}

/** "0:00 ngày 17/11" (Vietnam time) for the moment a new reading opens; a safe fallback when the time is unknown. */
export function formatTarotUnlockTime(nextDrawAt: string | undefined, language: "vi" | "en"): string {
  const time = nextDrawAt ? Date.parse(nextDrawAt) : Number.NaN;
  if (!Number.isFinite(time)) return language === "vi" ? "đầu ngày mai (giờ Việt Nam)" : "the start of tomorrow (Vietnam time)";
  const local = new Date(time + VIETNAM_OFFSET_MS);
  const hour = local.getUTCHours(), minute = String(local.getUTCMinutes()).padStart(2, "0");
  const day = local.getUTCDate(), month = local.getUTCMonth() + 1;
  return language === "vi"
    ? `${hour}:${minute} ngày ${day}/${month} (giờ Việt Nam)`
    : `${hour}:${minute} on ${day}/${month} (Vietnam time)`;
}

/** Shown above a reading the server replayed: the same event keeps its answer. Gentle, no streak or loss wording. */
export function tarotLockedNote(language: "vi" | "en", nextDrawAt?: string): string {
  const at = formatTarotUnlockTime(nextDrawAt, language);
  return language === "vi"
    ? `Lá bài này vẫn còn điều muốn nói. Hãy ngồi với nó thêm một chút: bạn có thể rút một lá làm rõ, ghi lại cảm nhận, hoặc mở trải bài mới cho chủ đề này vào ${at}.`
    : `This card still has something to say. Sit with it a little longer: you can draw one clarifying card, write down how it feels, or open a new reading on this topic at ${at}.`;
}

/** Why the server did not open a new draw today (429 / 409), in the same gentle voice. */
export function tarotLimitMessage(language: "vi" | "en", reason: string | undefined, nextDrawAt?: string): string {
  const at = formatTarotUnlockTime(nextDrawAt, language);
  if (reason === "deleted") {
    return language === "vi"
      ? `Trải bài cho chủ đề này hôm nay đã được cất đi. Bạn có thể mở trải bài mới cho chủ đề này vào ${at}.`
      : `Today's reading on this topic was put away. You can open a new reading on this topic at ${at}.`;
  }
  if (reason === "delivered") {
    // Tarot v2 pack 0: the AI allowance, not the draw. The cards and the reference reading stay with the person.
    return language === "vi"
      ? `Hôm nay bạn đã dùng hết lượt phân tích bằng AI. Các lá và bài đọc có sẵn vẫn ở đây; lượt mới mở vào ${at}.`
      : `You have used today's AI analysis. Your cards and the reference reading stay here; it opens again at ${at}.`;
  }
  if (reason === "attempts") {
    return language === "vi"
      ? `Hôm nay Nilaza chưa diễn giải được sau vài lần thử. Các lá của bạn vẫn được giữ; bạn có thể thử lại vào ${at}.`
      : `Nilaza could not finish the interpretation after a few tries today. Your cards are kept; you can try again at ${at}.`;
  }
  return language === "vi"
    ? `Hôm nay bạn đã mở đủ trải bài. Những lá đã rút vẫn ở đây để bạn ngồi cùng; trải bài mới mở vào ${at}.`
    : `You have opened today's readings. The cards you drew are still here to sit with; new readings open at ${at}.`;
}
