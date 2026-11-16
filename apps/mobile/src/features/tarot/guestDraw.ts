import { loadJson, removeJson, saveJson } from "../../storage";
import { utc7DateKey, type TarotGuestDraw, type TarotServerCard } from "./serverDraw";

// Tarot v2 pack 1 (Owner 2026-11-16, option A): what the device remembers of a signed-out draw. A random install id (not a
// user id, never tied to a name or an email) and the last guest draw of the Vietnam day. After sign-in the id goes to the
// server draw, which derives the same cards; the stored draw only lets Home offer "open the card you drew".
export const guestDeviceIdKey = "nilaza.tarot.guestDeviceId";
export const guestDrawKey = "nilaza.tarot.guestDraw";

export type StoredGuestDraw = { deviceId: string; spread: string; topic: string; lockDate: string; cards: TarotServerCard[] };

const DEVICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isGuestDeviceId = (value: unknown): value is string => typeof value === "string" && DEVICE_ID.test(value);

/** A random UUID v4: crypto.getRandomValues when the runtime has it, Math.random only as the last resort (it is an id, not a secret). */
export function newGuestDeviceId(random: () => number = () => Math.random()): string {
  const bytes = new Uint8Array(16);
  const cryptoApi = (globalThis as { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } }).crypto;
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes);
  else for (let index = 0; index < 16; index += 1) bytes[index] = Math.floor(random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The stored guest draw if it is well formed and still the same Vietnam day; anything else is dropped (a new day is a new event). */
export function parseStoredGuestDraw(value: unknown, today: string = utc7DateKey()): StoredGuestDraw | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (!isGuestDeviceId(item.deviceId) || typeof item.spread !== "string" || typeof item.topic !== "string" || item.lockDate !== today) return null;
  if (!Array.isArray(item.cards) || item.cards.length < 1 || item.cards.length > 10) return null;
  const cards: TarotServerCard[] = [];
  for (const raw of item.cards) {
    const card = raw as Partial<TarotServerCard> | null;
    if (!card || typeof card.id !== "string" || typeof card.positionKey !== "string" || typeof card.reversed !== "boolean") return null;
    cards.push({ id: card.id, positionKey: card.positionKey, reversed: card.reversed });
  }
  return { deviceId: item.deviceId, spread: item.spread, topic: item.topic, lockDate: item.lockDate, cards };
}

/** The install id, created once and kept: the same device always asks for the same guest event. */
export async function loadOrCreateGuestDeviceId(): Promise<string> {
  const stored = await loadJson<string | null>(guestDeviceIdKey, null);
  if (isGuestDeviceId(stored)) return stored;
  const created = newGuestDeviceId();
  await saveJson(guestDeviceIdKey, created);
  return created;
}

export async function saveGuestDraw(deviceId: string, draw: TarotGuestDraw): Promise<void> {
  await saveJson<StoredGuestDraw>(guestDrawKey, { deviceId, spread: draw.spread, topic: draw.topic, lockDate: draw.lockDate, cards: draw.cards });
}

export async function loadGuestDraw(today: string = utc7DateKey()): Promise<StoredGuestDraw | null> {
  return parseStoredGuestDraw(await loadJson<unknown>(guestDrawKey, null), today);
}

export async function clearGuestDraw(): Promise<void> {
  await removeJson(guestDrawKey);
}
