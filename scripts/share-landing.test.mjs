import assert from "node:assert/strict";
import test from "node:test";
import { elementPairKey, isZodiacId, parseCardIds, readShareArrival, sunSignFromDateInput, sunSignOf, zodiac } from "../apps/web/src/lib/shareLanding.ts";

test("finds the Sun sign on both sides of every boundary", () => {
  const cases = [
    [3, 20, "pisces"], [3, 21, "aries"], [4, 19, "aries"], [4, 20, "taurus"], [5, 20, "taurus"], [5, 21, "gemini"],
    [6, 20, "gemini"], [6, 21, "cancer"], [7, 22, "cancer"], [7, 23, "leo"], [8, 22, "leo"], [8, 23, "virgo"],
    [9, 22, "virgo"], [9, 23, "libra"], [10, 22, "libra"], [10, 23, "scorpio"], [11, 21, "scorpio"], [11, 22, "sagittarius"],
    [12, 21, "sagittarius"], [12, 22, "capricorn"], [12, 31, "capricorn"], [1, 1, "capricorn"], [1, 19, "capricorn"],
    [1, 20, "aquarius"], [2, 18, "aquarius"], [2, 19, "pisces"], [2, 29, "pisces"]
  ];
  for (const [month, day, sign] of cases) assert.equal(sunSignOf(month, day), sign, `${month}/${day}`);
});

test("rejects dates that do not exist", () => {
  for (const [month, day] of [[0, 1], [13, 1], [2, 30], [4, 31], [1, 0], [1.5, 3]]) assert.equal(sunSignOf(month, day), null);
});

test("reads the Sun sign from a date input value and ignores the year", () => {
  assert.equal(sunSignFromDateInput("1994-08-02"), "leo");
  assert.equal(sunSignFromDateInput("2001-08-02"), "leo");
  assert.equal(sunSignFromDateInput("not a date"), null);
  assert.equal(sunSignFromDateInput(""), null);
  assert.equal(sunSignFromDateInput("1994-02-31"), null);
});

test("lists twelve signs with three of each element in the app order", () => {
  assert.equal(zodiac.length, 12);
  for (const element of ["fire", "earth", "air", "water"]) assert.equal(zodiac.filter((sign) => sign.element === element).length, 3);
  assert.ok(isZodiacId("leo"));
  assert.ok(!isZodiacId("dragon"));
  assert.ok(!isZodiacId(undefined));
});

test("builds the element pair key in a fixed order for either direction", () => {
  assert.equal(elementPairKey("leo", "gemini"), "fire-air");
  assert.equal(elementPairKey("gemini", "leo"), "fire-air");
  assert.equal(elementPairKey("aries", "leo"), "fire-fire");
  assert.equal(elementPairKey("pisces", "virgo"), "earth-water");
});

test("the pair keys match the published Owner-approved content", async () => {
  const { default: content } = await import("../packages/content/data/astrology-synastry.json", { with: { type: "json" } });
  const keys = new Set(Object.keys(content.elementPairs));
  for (const a of zodiac) for (const b of zodiac) assert.ok(keys.has(elementPairKey(a.id, b.id)), `${a.id}-${b.id}`);
});

test("accepts only well formed, published card ids and at most three", () => {
  const known = new Set(["major-00-fool", "major-17-the-star", "cups-02", "swords-03", "wands-01"]);
  assert.deepEqual(parseCardIds("major-00-fool,major-17-the-star", known), ["major-00-fool", "major-17-the-star"]);
  assert.deepEqual(parseCardIds("major-00-fool,<script>,unknown-card,major-00-fool", known), ["major-00-fool"]);
  assert.deepEqual(parseCardIds("major-00-fool,major-17-the-star,cups-02,swords-03", known), ["major-00-fool", "major-17-the-star", "cups-02"]);
  assert.deepEqual(parseCardIds(null, known), []);
  assert.deepEqual(parseCardIds("", known), []);
});

test("reads a share arrival only from enumerated utm values", () => {
  assert.deepEqual(readShareArrival("?utm_source=share&utm_medium=invite&utm_campaign=astro_invite&utm_content=abc12345"), { fromShare: true, surface: "astro_invite", medium: "invite" });
  assert.deepEqual(readShareArrival("?utm_source=share&utm_medium=<b>&utm_campaign=free text"), { fromShare: true, surface: null, medium: null });
  assert.deepEqual(readShareArrival("?utm_source=newsletter&utm_medium=card&utm_campaign=today_card"), { fromShare: false, surface: null, medium: null });
  assert.deepEqual(readShareArrival(""), { fromShare: false, surface: null, medium: null });
});

test("public analytics accepts the two share events and drops free text and unknown properties", async () => {
  const seen = [];
  globalThis.CustomEvent = class { constructor(name, init) { this.type = name; this.detail = init?.detail; } };
  globalThis.window = { dispatchEvent: (event) => seen.push(event.detail), zaraz: undefined };
  const { trackPublicEvent, isPublicAnalyticsEvent } = await import("../apps/web/src/lib/analytics.ts");
  assert.ok(isPublicAnalyticsEvent("share_link_opened"));
  assert.ok(isPublicAnalyticsEvent("signup_from_share"));
  trackPublicEvent("share_link_opened", { locale: "vi", source: "share", surface: "tarot_reading", medium: "card", email: "leak@example.com", note: "free text" });
  trackPublicEvent("signup_from_share", { locale: "en", source: "share", surface: "astro_invite", medium: "invite" });
  assert.deepEqual(seen[0], { eventName: "share_link_opened", properties: { locale: "vi", source: "share", surface: "tarot_reading", medium: "card" } });
  assert.deepEqual(seen[1], { eventName: "signup_from_share", properties: { locale: "en", source: "share", surface: "astro_invite", medium: "invite" } });
  delete globalThis.window;
});
