// Tarot v2 pack 1 (Owner 2026-11-16, option A): the guest draw. A person who is not signed in still gets cards issued by the
// server, derived from an HMAC of a server secret, a random per-install device id, the spread, the topic and the Vietnam day.
// The same inputs always give the same cards (a stateless lock: asking again is not a redraw) and the client cannot choose
// them or compute them offline. After sign-in the account's first draw for the same event derives the same cards from the
// same device id, so the guest keeps the cards they saw. Nothing is stored and no model is called.
import { drawServerCards, type DrawnCard, type RandomFill } from "../ai-tarot-reading/draw.ts";

const DEVICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LABEL = "tarot-guest-v1";
const BLOCKS = 32; // 32 HMAC blocks = 256 32-bit words; a 10-card spread needs about 20 of them
const MIN_SECRET_LENGTH = 32;

export const isGuestDeviceId = (value: unknown): value is string => typeof value === "string" && DEVICE_ID.test(value);

/** A secret shorter than 32 characters counts as not set, so a weak value never silently weakens the lock. */
export const usableGuestSecret = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length >= MIN_SECRET_LENGTH ? value.trim() : undefined;

const encode = (text: string) => new TextEncoder().encode(text);

/** A bounded, deterministic word stream for one (device, spread, topic, day); it throws instead of ever repeating or guessing. */
export async function guestRandomFill(secret: string, deviceId: string, spread: string, topic: string, dateKey: string): Promise<RandomFill> {
  const key = await crypto.subtle.importKey("raw", encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const pool = new Uint8Array(BLOCKS * 32);
  for (let block = 0; block < BLOCKS; block += 1) {
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, encode([LABEL, deviceId.toLowerCase(), spread, topic, dateKey, block].join("|"))));
    pool.set(mac, block * 32);
  }
  const view = new DataView(pool.buffer);
  let offset = 0;
  return target => {
    for (let index = 0; index < target.length; index += 1) {
      if (offset + 4 > pool.length) throw new Error("guest_stream_exhausted");
      target[index] = view.getUint32(offset);
      offset += 4;
    }
  };
}

/** The cards of one guest event; the same call is made by the guest function and by the account's adopting draw. */
export async function deriveGuestCards(secret: string, deviceId: string, spread: string, topic: string, dateKey: string): Promise<DrawnCard[]> {
  return drawServerCards(spread, await guestRandomFill(secret, deviceId, spread, topic, dateKey));
}
