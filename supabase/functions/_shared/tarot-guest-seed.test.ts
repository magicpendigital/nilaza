import { assert, assertEquals, assertNotEquals, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { deriveGuestCards, guestRandomFill, isGuestDeviceId, usableGuestSecret } from "./tarot-guest-seed.ts";
import { canonicalTarotCardIds } from "./tarot-prompt.ts";

const SECRET = "synthetic-test-secret-only-0123456789abcdef";
const DEVICE = "8d2b6f1e-5c3a-4e7b-9a10-2f4c6d8e0a13";

Deno.test("guest draw: the same event always gives the same cards, so asking again is not a redraw", async () => {
  const first = await deriveGuestCards(SECRET, DEVICE, "past-present-future", "love", "2026-11-16");
  const again = await deriveGuestCards(SECRET, DEVICE, "past-present-future", "love", "2026-11-16");
  assertEquals(first, again);
  assertEquals(first.map(card => card.positionKey), ["past", "present", "potential"]);
  assertEquals(new Set(first.map(card => card.id)).size, 3, "cards are distinct");
  for (const card of first) assert(canonicalTarotCardIds().includes(card.id));
  // The device id is case-insensitive text, not a second identity.
  assertEquals(await deriveGuestCards(SECRET, DEVICE.toUpperCase(), "past-present-future", "love", "2026-11-16"), first);
});

Deno.test("guest draw: any change of device, spread, topic, day or secret gives a different event", async () => {
  const base = await deriveGuestCards(SECRET, DEVICE, "daily-one", "open", "2026-11-16");
  const others = await Promise.all([
    deriveGuestCards(SECRET, "11111111-2222-4333-8444-555555555555", "daily-one", "open", "2026-11-16"),
    deriveGuestCards(SECRET, DEVICE, "daily-one", "love", "2026-11-16"),
    deriveGuestCards(SECRET, DEVICE, "daily-one", "open", "2026-11-17"),
    deriveGuestCards(SECRET + "-other", DEVICE, "daily-one", "open", "2026-11-16")
  ]);
  // One card of 78 and an orientation can collide by chance, so compare the four draws together instead of each one.
  const keys = new Set([base, ...others].map(cards => `${cards[0].id}:${cards[0].reversed}`));
  assert(keys.size >= 4, "the draws differ across device, topic, day and secret");
});

Deno.test("guest draw: it fills every spread, stays inside the bounded stream and keeps the cards uniform enough to use", async () => {
  for (const [spread, count] of [["daily-one", 1], ["love-three", 3], ["crossroads-four", 4]] as const) {
    const cards = await deriveGuestCards(SECRET, DEVICE, spread, "open", "2026-11-16");
    assertEquals(cards.length, count);
  }
  // Across many devices every card and both orientations appear: nothing is stuck on one value.
  const seen = new Set<string>();
  let reversed = 0;
  for (let index = 0; index < 400; index += 1) {
    const id = `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
    const [card] = await deriveGuestCards(SECRET, id, "daily-one", "open", "2026-11-16");
    seen.add(card.id);
    if (card.reversed) reversed += 1;
  }
  assert(seen.size > 60, `many different cards over 400 devices (${seen.size})`);
  assert(reversed > 140 && reversed < 260, `about half reversed (${reversed})`);
  const fill = await guestRandomFill(SECRET, DEVICE, "daily-one", "open", "2026-11-16");
  const words = new Uint32Array(256);
  fill(words);
  assertEquals(words.length, 256);
  let thrown = false;
  try { fill(new Uint32Array(1)); } catch (error) { thrown = (error as Error).message === "guest_stream_exhausted"; }
  assert(thrown, "an exhausted stream throws instead of repeating or guessing");
  await assertRejects(async () => { await deriveGuestCards(SECRET, DEVICE, "not-a-spread", "open", "2026-11-16"); });
});

Deno.test("guest draw: the device id must be a UUID and a short secret counts as not set", () => {
  assert(isGuestDeviceId(DEVICE));
  for (const bad of [undefined, null, 5, "", "not-a-uuid", `${DEVICE}x`, "8d2b6f1e5c3a4e7b9a102f4c6d8e0a13"]) assertEquals(isGuestDeviceId(bad), false);
  assertEquals(usableGuestSecret(SECRET), SECRET);
  assertEquals(usableGuestSecret(`  ${SECRET}  `), SECRET);
  for (const weak of [undefined, null, 12345, "", "short", "x".repeat(31)]) assertEquals(usableGuestSecret(weak), undefined);
  assertNotEquals(SECRET, "");
});
