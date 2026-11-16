import { assert, assertEquals, assertNotEquals, assertThrows } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  drawClarifierCard, drawServerCards, normalizeTopicKey, sameDraw, secureRandomInt, tarotLockKey, vietnamDay, type RandomFill
} from "./draw.ts";
import { canonicalTarotCardIds, tarotSpreadPositionKeys } from "../_shared/tarot-prompt.ts";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const SPREADS = ["daily-one", "past-present-future", "situation-challenge-advice", "love-three", "crossroads-four"];

/** Replays fixed 32-bit words, then repeats the last one. */
function fixedFill(words: number[]): RandomFill & { used: () => number } {
  let index = 0;
  const fill = ((target: Uint32Array) => {
    for (let i = 0; i < target.length; i += 1) target[i] = words[Math.min(index++, words.length - 1)];
  }) as RandomFill & { used: () => number };
  fill.used = () => index;
  return fill;
}

Deno.test("the draw never uses Math.random: the source avoids it and a throwing Math.random does not matter", async () => {
  for (const file of ["./draw.ts", "./handler.ts", "./store.ts", "./index.ts"]) {
    const source = await Deno.readTextFile(new URL(file, import.meta.url));
    assertEquals(/Math\s*\.\s*random/.test(source), false, `${file} must not use Math.random`);
    if (file === "./draw.ts") assert(source.includes("crypto.getRandomValues"), "draw.ts must use the platform CSPRNG");
  }
  const original = Math.random;
  Math.random = () => { throw new Error("Math.random must not be used for Tarot draws"); };
  try {
    for (const spread of SPREADS) drawServerCards(spread);
    drawClarifierCard(["major-00-fool"]);
    secureRandomInt(78);
  } finally {
    Math.random = original;
  }
});

Deno.test("secureRandomInt rejects biased words and fails closed when the CSPRNG never yields a usable word", () => {
  // limit for 78 is floor(2^32 / 78) * 78; words at or above it are rejected (no modulo bias).
  const limit = Math.floor(0x1_0000_0000 / 78) * 78;
  const fill = fixedFill([0xffff_ffff, limit, 155]);
  assertEquals(secureRandomInt(78, fill), 155 % 78);
  assertEquals(fill.used(), 3);
  assertThrows(() => secureRandomInt(78, fixedFill([0xffff_ffff])), Error, "csprng_unavailable");
  assertThrows(() => secureRandomInt(0), RangeError);
  assertThrows(() => secureRandomInt(1.5), RangeError);
  for (let i = 0; i < 200; i += 1) {
    const value = secureRandomInt(5);
    assert(value >= 0 && value < 5 && Number.isInteger(value));
  }
});

Deno.test("server draws give distinct canonical cards for every position of each spread", () => {
  const canonical = new Set(canonicalTarotCardIds());
  assertEquals(canonical.size, 78);
  for (const spread of SPREADS) {
    for (let run = 0; run < 25; run += 1) {
      const cards = drawServerCards(spread);
      assertEquals(cards.map(card => card.positionKey), tarotSpreadPositionKeys(spread));
      assertEquals(new Set(cards.map(card => card.id)).size, cards.length);
      for (const card of cards) {
        assert(canonical.has(card.id), card.id);
        assertEquals(typeof card.reversed, "boolean");
      }
    }
  }
  assertThrows(() => drawServerCards("unknown-spread"), Error, "Invalid Tarot spread");
  // A fixed CSPRNG stream gives a fixed draw (seam for the handler tests).
  assertEquals(drawServerCards("daily-one", fixedFill([0, 1])), [{ id: canonicalTarotCardIds()[0], positionKey: "daily", reversed: true }]);
});

Deno.test("the clarifier never repeats a card already in the reading", () => {
  const ids = canonicalTarotCardIds();
  const exclude = ids.slice(0, 77);
  for (let run = 0; run < 10; run += 1) assertEquals(drawClarifierCard(exclude).id, ids[77]);
  assertThrows(() => drawClarifierCard(ids), Error, "No clarifier card left");
});

Deno.test("topics come from the app catalogue; a missing topic is open, an unknown one is refused", () => {
  assertEquals(normalizeTopicKey(undefined), "open");
  assertEquals(normalizeTopicKey(""), "open");
  assertEquals(normalizeTopicKey(" Love "), "love");
  assertEquals(normalizeTopicKey("career"), "career");
  assertEquals(normalizeTopicKey("Tình yêu của tôi"), null);
  assertEquals(normalizeTopicKey(42), null);
});

Deno.test("the Vietnam day turns at 0h UTC+7 (17:00 UTC)", () => {
  const before = vietnamDay(new Date("2026-11-15T16:59:59.999Z"));
  const after = vietnamDay(new Date("2026-11-15T17:00:00.000Z"));
  assertEquals(before.dateKey, "2026-11-15");
  assertEquals(after.dateKey, "2026-11-16");
  assertEquals(before.dayStart.toISOString(), "2026-11-14T17:00:00.000Z");
  assertEquals(before.nextDayStart.toISOString(), "2026-11-15T17:00:00.000Z");
  assertEquals(after.dayStart.toISOString(), "2026-11-15T17:00:00.000Z");
  assertEquals(vietnamDay(new Date("2026-11-15T00:30:00Z")).dateKey, "2026-11-15");
});

Deno.test("the lock key covers account, spread, topic and Vietnam day but never the question text", async () => {
  const base = await tarotLockKey(USER, "daily-one", "love", "2026-11-15");
  assert(/^[0-9a-f]{64}$/.test(base));
  assertEquals(await tarotLockKey(USER, "daily-one", "love", "2026-11-15"), base);
  assertNotEquals(await tarotLockKey(OTHER, "daily-one", "love", "2026-11-15"), base);
  assertNotEquals(await tarotLockKey(USER, "love-three", "love", "2026-11-15"), base);
  assertNotEquals(await tarotLockKey(USER, "daily-one", "career", "2026-11-15"), base);
  assertNotEquals(await tarotLockKey(USER, "daily-one", "love", "2026-11-16"), base);
  const midnight = vietnamDay(new Date("2026-11-15T16:59:59Z")).dateKey, next = vietnamDay(new Date("2026-11-15T17:00:01Z")).dateKey;
  assertNotEquals(await tarotLockKey(USER, "daily-one", "love", midnight), await tarotLockKey(USER, "daily-one", "love", next));
});

Deno.test("sameDraw accepts only the exact stored cards, order and orientation", () => {
  const stored = [{ id: "major-00-fool", positionKey: "past", reversed: false }, { id: "major-01-magician", positionKey: "present", reversed: true }];
  assert(sameDraw(stored, [{ id: "major-00-fool", reversed: false, name: { en: "ignored" } }, { id: "major-01-magician", orientation: "reversed" }]));
  assertEquals(sameDraw(stored, [{ id: "major-01-magician", reversed: true }, { id: "major-00-fool" }]), false);
  assertEquals(sameDraw(stored, [{ id: "major-00-fool" }, { id: "major-01-magician", reversed: false }]), false);
  assertEquals(sameDraw(stored, [{ id: "major-00-fool" }]), false);
  assertEquals(sameDraw(stored, [{ id: "major-00-fool", reversed: "no" }, { id: "major-01-magician", reversed: true }]), false);
  assertEquals(sameDraw(stored, "major-00-fool"), false);
});
