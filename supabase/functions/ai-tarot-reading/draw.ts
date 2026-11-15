// P1-A server draw: cards come only from the platform CSPRNG (crypto.getRandomValues), and one event
// (account, spread, topic, Vietnam day) is identified by a lock key so the same event always returns the same draw.
import { localDayStart } from "../_shared/account-tier-policy.ts";
import { canonicalTarotCardIds, tarotSpreadPositionKeys } from "../_shared/tarot-prompt.ts";

export type RandomFill = (target: Uint32Array) => void;
export type DrawnCard = { id: string; positionKey: string; reversed: boolean };

/** The fixed topic catalogue of the app (TarotTopic). A rephrased question keeps its topic, so it keeps its draw. */
export const TAROT_TOPICS = ["love", "career", "self", "decision", "open"] as const;
export type TarotTopicKey = typeof TAROT_TOPICS[number];
export const VIETNAM_OFFSET_MINUTES = 420;
const DAY_MS = 86_400_000;

const platformFill: RandomFill = target => { crypto.getRandomValues(target); };

/** Uniform integer in [0, maxExclusive) by rejection sampling over 32-bit CSPRNG words (no modulo bias). */
export function secureRandomInt(maxExclusive: number, fill: RandomFill = platformFill): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 0x1_0000_0000) throw new RangeError("invalid_random_range");
  const limit = Math.floor(0x1_0000_0000 / maxExclusive) * maxExclusive;
  const word = new Uint32Array(1);
  for (let tries = 0; tries < 64; tries += 1) {
    fill(word);
    if (word[0] < limit) return word[0] % maxExclusive;
  }
  throw new Error("csprng_unavailable");
}

/** Draws distinct canonical cards for every position of the spread (partial Fisher–Yates) with a random orientation. */
export function drawServerCards(spread: string, fill: RandomFill = platformFill): DrawnCard[] {
  const positions = tarotSpreadPositionKeys(spread);
  if (!positions) throw new Error("Invalid Tarot spread");
  const ids = canonicalTarotCardIds();
  for (let index = 0; index < positions.length; index += 1) {
    const pick = index + secureRandomInt(ids.length - index, fill);
    [ids[index], ids[pick]] = [ids[pick], ids[index]];
  }
  return positions.map((positionKey, index) => ({ id: ids[index], positionKey, reversed: secureRandomInt(2, fill) === 1 }));
}

/** One clarifier card that is not already in the reading. */
export function drawClarifierCard(exclude: string[], fill: RandomFill = platformFill): { id: string; reversed: boolean } {
  const taken = new Set(exclude);
  const ids = canonicalTarotCardIds().filter(id => !taken.has(id));
  if (!ids.length) throw new Error("No clarifier card left");
  return { id: ids[secureRandomInt(ids.length, fill)], reversed: secureRandomInt(2, fill) === 1 };
}

export function normalizeTopicKey(value: unknown): TarotTopicKey | null {
  if (value === undefined || value === null || value === "") return "open";
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase();
  return (TAROT_TOPICS as readonly string[]).includes(key) ? key as TarotTopicKey : null;
}

/** The Vietnam (UTC+7) day of `now`: its date key, its start and the start of the next day (when a new draw opens). */
export function vietnamDay(now: Date) {
  const dayStart = localDayStart(now, VIETNAM_OFFSET_MINUTES);
  const dateKey = new Date(dayStart.getTime() + VIETNAM_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
  return { dateKey, dayStart, nextDayStart: new Date(dayStart.getTime() + DAY_MS) };
}

/** sha256(tarot-lock-v1|user|spread|topic|date) as 64 hex characters; the question text is deliberately not part of it. */
export async function tarotLockKey(userId: string, spread: string, topic: TarotTopicKey, dateKey: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(["tarot-lock-v1", userId, spread, topic, dateKey].join("|")));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}

/** Same cards, order and orientation as the stored draw (names or meanings sent by the client are ignored). */
export function sameDraw(stored: DrawnCard[], client: unknown): boolean {
  if (!Array.isArray(client) || client.length !== stored.length) return false;
  return stored.every((card, index) => {
    const value = client[index] as { id?: unknown; reversed?: unknown; orientation?: unknown } | null;
    if (!value || typeof value !== "object" || value.id !== card.id) return false;
    const reversed = value.orientation === "reversed" || value.reversed === true;
    if (value.reversed !== undefined && typeof value.reversed !== "boolean") return false;
    if (value.orientation !== undefined && value.orientation !== "upright" && value.orientation !== "reversed") return false;
    return reversed === card.reversed;
  });
}
