import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { drawWebCard, elementPairKey, isShareVariant, meaningBody, parseMeaningFlag, parseOrientations, playReferrerUrl, readWebDraw, vnDateKey, quoteBookIndex, quoteBooks, quoteDateKey, quoteHash, quoteItemIndex, isZodiacId, parseCardIds, parseSharedSky, randomIndex, readShareArrival, shareMeta, sharePhaseNames, shareSurfaces, shareVariants, sunSignFromDateInput, sunSignOf, variantFromSearch, zodiac } from "../apps/web/src/lib/shareLanding.ts";
import { shareCtaOf } from "../apps/web/src/lib/shareCta.ts";

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

test("accepts only well formed, published card ids and at most four (the largest spread)", () => {
  const known = new Set(["major-00-fool", "major-17-the-star", "cups-02", "swords-03", "wands-01"]);
  assert.deepEqual(parseCardIds("major-00-fool,major-17-the-star", known), ["major-00-fool", "major-17-the-star"]);
  assert.deepEqual(parseCardIds("major-00-fool,<script>,unknown-card,major-00-fool", known), ["major-00-fool"]);
  assert.deepEqual(parseCardIds("major-00-fool,major-17-the-star,cups-02,swords-03,wands-01", known), ["major-00-fool", "major-17-the-star", "cups-02", "swords-03"]);
  assert.deepEqual(parseCardIds(null, known), []);
  assert.deepEqual(parseCardIds("", known), []);
});

test("reads a share arrival only from enumerated utm values", () => {
  assert.deepEqual(readShareArrival("?utm_source=share&utm_medium=invite&utm_campaign=astro_invite&utm_content=abc12345"), { fromShare: true, surface: "astro_invite", medium: "invite" });
  assert.deepEqual(readShareArrival("?utm_source=share&utm_medium=<b>&utm_campaign=free text"), { fromShare: true, surface: null, medium: null });
  assert.deepEqual(readShareArrival("?utm_source=newsletter&utm_medium=card&utm_campaign=today_card"), { fromShare: false, surface: null, medium: null });
  assert.deepEqual(readShareArrival(""), { fromShare: false, surface: null, medium: null });
  assert.deepEqual(readShareArrival("?utm_source=share&utm_medium=card&utm_campaign=numerology_map"), { fromShare: true, surface: "numerology_map", medium: "card" });
  assert.deepEqual(readShareArrival("?utm_source=share&utm_medium=card&utm_campaign=daily_sky"), { fromShare: true, surface: "daily_sky", medium: "card" });
  assert.deepEqual(readShareArrival("?utm_source=share&utm_medium=qr&utm_campaign=book_quote"), { fromShare: true, surface: "book_quote", medium: "qr" });
  assert.deepEqual(readShareArrival("?utm_source=share&utm_medium=QR&utm_campaign=book_quote"), { fromShare: true, surface: "book_quote", medium: null });
});

test("the website, the app and the share-events server list the same surfaces", () => {
  const listIn = (file) => {
    const match = /SHARE_SURFACES = (\[[^\]]+\])/.exec(fs.readFileSync(file, "utf8"));
    assert.ok(match, file);
    return JSON.parse(match[1]);
  };
  assert.deepEqual([...shareSurfaces], listIn("apps/mobile/src/features/share/shareEvents.ts"));
  assert.deepEqual([...shareSurfaces], listIn("supabase/functions/share-events/handler.ts"));
});

test("the old /share address picks the variant from utm_campaign and falls back to the card", () => {
  assert.equal(variantFromSearch("?utm_campaign=numerology_map"), "numbers");
  assert.equal(variantFromSearch("?utm_campaign=daily_sky"), "sky");
  assert.equal(variantFromSearch("?utm_campaign=tarot_reading"), "reading");
  assert.equal(variantFromSearch("?utm_campaign=today_card"), "card");
  assert.equal(variantFromSearch("?utm_campaign=book_quote"), "quote");
  assert.equal(variantFromSearch("?utm_campaign=<script>"), "card");
  assert.equal(variantFromSearch(""), "card");
  assert.ok(isShareVariant("sky"));
  assert.ok(!isShareVariant("compare"));
});

test("the app's share paths open the website pages that exist", () => {
  const app = fs.readFileSync("apps/mobile/src/features/share/shareLink.ts", "utf8");
  for (const variant of shareVariants) assert.match(app, new RegExp(`"share/${variant}"`));
});

test("reads the public sky of a day only when all four values are valid", () => {
  assert.deepEqual(parseSharedSky("?m=taurus&k=mid&p=full&d=2026-11-24"), { moonSign: "taurus", decan: "mid", phase: "full", date: { year: 2026, month: 11, day: 24 } });
  for (const search of [
    "?m=dragon&k=mid&p=full&d=2026-11-24",
    "?m=taurus&k=middle&p=full&d=2026-11-24",
    "?m=taurus&k=mid&p=blood&d=2026-11-24",
    "?m=taurus&k=mid&p=full&d=2026-02-30",
    "?m=taurus&k=mid&p=full&d=24/11/2026",
    "?m=taurus&k=mid&p=full",
    ""
  ]) assert.equal(parseSharedSky(search), null, search);
});

test("the website phase names match the app", () => {
  const app = fs.readFileSync("apps/mobile/src/features/home/moonPhase.ts", "utf8");
  for (const [id, name] of Object.entries(sharePhaseNames)) {
    assert.ok(app.includes(`${id}: { vi: "${name.vi}", en: "${name.en}"`), id);
  }
});

test("every phase and decan in the sky content has text on the website", async () => {
  const { default: sky } = await import("../packages/content/data/astrology-daily-sky.json", { with: { type: "json" } });
  for (const sign of zodiac) for (const decan of ["early", "mid", "late"]) assert.ok(sky.moonSign[sign.id].tone[decan].vi && sky.moonSign[sign.id].tone[decan].en, `${sign.id} ${decan}`);
});

test("the visitor's own draw picks inside the deck", () => {
  assert.equal(randomIndex(78, () => 0), 0);
  assert.equal(randomIndex(78, () => 0.999999), 77);
  for (let i = 0; i < 200; i += 1) { const index = randomIndex(78); assert.ok(index >= 0 && index < 78); }
});

test("every card has a small web image under 30 KB", async () => {
  const { default: cards } = await import("../packages/content/data/tarot-cards.json", { with: { type: "json" } });
  for (const card of cards) {
    const file = `apps/web/public/share/cards/${card.id}.webp`;
    assert.ok(fs.existsSync(file), file);
    assert.ok(fs.statSync(file).size < 30 * 1024, file);
  }
});

test("the call to action is the waitlist until a valid Play address is set", () => {
  const waitlist = shareCtaOf("vi", "");
  assert.equal(waitlist.kind, "waitlist");
  assert.equal(waitlist.href, "#join");
  assert.equal(waitlist.label, "Đăng ký thử bản Android");
  assert.equal(shareCtaOf("vi", "https://evil.example/play.google.com").kind, "waitlist");
  const play = shareCtaOf("en", "https://play.google.com/store/apps/details?id=com.example.app");
  assert.equal(play.kind, "play");
  assert.equal(play.href, "https://play.google.com/store/apps/details?id=com.example.app");
});

test("share page copy stays non-predictive and has a preview for each variant", () => {
  const texts = [];
  for (const locale of ["vi", "en"]) {
    for (const variant of [...shareVariants, "auto"]) {
      const meta = shareMeta(locale, variant);
      assert.ok(meta.title.length > 10 && meta.title.length <= 70, `${locale} ${variant} title`);
      assert.ok(meta.description.length > 40 && meta.description.length <= 200, `${locale} ${variant} description`);
      texts.push(meta.title, meta.description);
    }
    for (const variant of [undefined, "card", "reading"]) {
      for (const url of ["", "https://play.google.com/store/apps/details?id=com.example.app"]) {
        const cta = shareCtaOf(locale, url, variant);
        texts.push(cta.label, cta.benefit, cta.privacy);
      }
    }
  }
  const page = fs.readFileSync("apps/web/src/components/share/ShareLanding.astro", "utf8") + fs.readFileSync("apps/web/src/components/share/ShareTrust.astro", "utf8");
  texts.push(page);
  for (const text of texts) {
    assert.doesNotMatch(text, /(?<!\p{L})(sẽ|phải|chắc chắn)(?!\p{L})|\bwill (definitely|surely)\b|guarantee/iu);
  }
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
  assert.ok(isPublicAnalyticsEvent("share_landing_try"));
  // Even if a caller passed the date or the number, only the allowed keys leave the page.
  trackPublicEvent("share_landing_try", { locale: "vi", source: "share", variant: "numbers", birth: "1990-01-01", number: 7, card: "major-00-fool" });
  assert.deepEqual(seen[2], { eventName: "share_landing_try", properties: { locale: "vi", source: "share", variant: "numbers" } });
  delete globalThis.window;
});

// Same table as apps/mobile/src/features/bookQuote/__tests__/content.test.ts: the web and the app pick the same line.
test("the quote page picks the same daily line as the app", () => {
  const files = quoteBooks.map((book) => JSON.parse(fs.readFileSync(`packages/content/data/book-quotes/${book.id}.json`, "utf8"))).filter((file) => file.review.status === "approved" && file.items.length);
  const table = [
    ["2026-11-28", "dao-duc-kinh", "ddk-042", "kinh-phap-cu", "pc-025"],
    ["2026-12-31", "binh-phap-ton-tu", "bp-10-27", "dao-duc-kinh", "ddk-004"],
    ["2027-01-01", "kinh-dich", "kd-22", "suy-tuong", "st-02-05"],
    ["2027-02-28", "kinh-phap-cu", "pc-380", "kinh-dich", "kd-12"],
    ["2028-02-29", "binh-phap-ton-tu", "bp-11-35", "dao-duc-kinh", "ddk-023"]
  ];
  const lineOf = (file, dateKey) => file.items[quoteItemIndex(file.book, dateKey, file.items.length)].id;
  for (const [dateKey, book, itemId, otherBook, otherItemId] of table) {
    const home = files[quoteBookIndex(dateKey, files.length)];
    assert.equal(home.book, book, dateKey);
    assert.equal(lineOf(home, dateKey), itemId, dateKey);
    assert.equal(lineOf(files.find((file) => file.book === otherBook), dateKey), otherItemId, dateKey);
  }
  assert.equal(quoteHash(""), 0x811c9dc5);
  assert.equal(quoteDateKey(new Date(2027, 0, 5, 23, 30)), "2027-01-05");
  assert.equal(quoteItemIndex("kinh-dich", "2027-01-01", 0), -1);
  assert.equal(quoteBookIndex("2027-01-01", 0), -1);
});

test("the quote page lists the app's books in the app's order and publishes only approved lines", () => {
  const app = fs.readFileSync("apps/mobile/src/features/bookQuote/content.ts", "utf8");
  const order = JSON.parse(/bookQuoteBookOrder: BookQuoteBookId\[\] = (\[[^\]]+\])/.exec(app)[1]);
  assert.deepEqual(quoteBooks.map((book) => book.id), order);
  for (const book of quoteBooks) assert.ok(app.includes(`"${book.id}": { vi: "${book.label.vi}", en: "${book.label.en}" }`), `${book.id} label`);
  const page = fs.readFileSync("apps/web/src/components/share/ShareLanding.astro", "utf8");
  assert.match(page, /review\.status === "approved"/);
  // Only the quote, reference and question reach the page: never the gloss or tags.
  assert.match(page, /\[pick\(item\.quote\), pick\(item\.ref\), pick\(item\.question\)\]/);
  assert.doesNotMatch(page, /item\.gloss/);
});

test("every share variant page has its own preview image", () => {
  const page = fs.readFileSync("apps/web/src/pages/[locale]/share/[variant].astro", "utf8");
  assert.match(page, /image=\{`\/share\/og\/\$\{variant\}-\$\{locale\}\.png`\}/);
  for (const variant of shareVariants) for (const locale of ["vi", "en"]) assert.ok(fs.existsSync(`apps/web/public/share/og/${variant}-${locale}.png`), `${variant}-${locale}`);
  const builder = fs.readFileSync("scripts/build-share-og.mjs", "utf8");
  assert.deepEqual(JSON.parse(/const variants = (\[[^\]]+\])/.exec(builder)[1]), [...shareVariants]);
});

// Tarot share landing T1 (Owner decisions 28/11/2026): orientation in the link, meaning flag, one web draw a day.
test("reads card orientation from o= and treats anything else as upright", () => {
  assert.deepEqual(parseOrientations("10", 2), [true, false]);
  assert.deepEqual(parseOrientations("1", 3), [true, false, false]);
  assert.deepEqual(parseOrientations(null, 2), [false, false]);
  for (const bad of ["", "2", "1a", "11111", "<b>", "1,0"]) assert.deepEqual(parseOrientations(bad, 2), [false, false], bad);
  assert.deepEqual(parseOrientations("1", 0), []);
});

test("shows the meaning only when the link says m=1", () => {
  assert.equal(parseMeaningFlag("1"), true);
  for (const value of [null, "", "0", "true", "11"]) assert.equal(parseMeaningFlag(value), false);
});

test("the web day is the Vietnam day, like the app's daily draw", async () => {
  const { utc7DateKey } = await import("../apps/mobile/src/features/tarot/serverDraw.ts").catch(() => ({}));
  const moments = ["2026-11-28T16:59:59Z", "2026-11-28T17:00:00Z", "2026-12-31T20:00:00Z"];
  assert.deepEqual(moments.map((at) => vnDateKey(new Date(at))), ["2026-11-28", "2026-11-29", "2027-01-01"]);
  if (utc7DateKey) for (const at of moments) assert.equal(vnDateKey(new Date(at)), utc7DateKey(new Date(at)));
});

test("one draw a day: a stored draw is reused only when valid and from today", () => {
  const known = new Set(["major-00-fool", "major-01-magician"]);
  const today = "2026-11-29";
  const saved = JSON.stringify({ id: "major-00-fool", reversed: true, day: today });
  assert.deepEqual(readWebDraw(saved, today, known), { id: "major-00-fool", reversed: true, day: today });
  assert.equal(readWebDraw(saved, "2026-11-30", known), null);
  for (const bad of [null, "", "{", "null", "[]", JSON.stringify({ id: "unknown-card", reversed: false, day: today }), JSON.stringify({ id: "major-00-fool", reversed: "yes", day: today }), JSON.stringify({ id: "<img>", reversed: false, day: today })]) {
    assert.equal(readWebDraw(bad, today, known), null, String(bad));
  }
});

test("the web draw skips the friend's cards and uses both orientations", () => {
  const ids = ["a1", "b2", "c3"];
  const sequence = (values) => { let index = 0; return () => values[index++ % values.length]; };
  assert.deepEqual(drawWebCard(ids, ["a1"], "2026-11-29", sequence([0, 0.2])), { id: "b2", reversed: true, day: "2026-11-29" });
  assert.deepEqual(drawWebCard(ids, ["a1"], "2026-11-29", sequence([0.99, 0.7])), { id: "c3", reversed: false, day: "2026-11-29" });
  assert.equal(drawWebCard(ids, ids, "2026-11-29", sequence([0, 0.9])).id, "a1");
});

test("library meanings read naturally under the page label", async () => {
  assert.equal(meaningBody("Lá bài gợi một khởi đầu mới."), "Một khởi đầu mới.");
  assert.equal(meaningBody("The card suggests a new start."), "A new start.");
  assert.equal(meaningBody("Lá bài mời bạn lắng nghe."), "Lá bài mời bạn lắng nghe.");
  const cards = JSON.parse(fs.readFileSync("packages/content/data/tarot-cards.json", "utf8"));
  for (const card of cards) {
    for (const locale of ["vi", "en"]) {
      for (const text of [card.uprightMeaning[locale], card.reversedMeaning[locale]]) {
        const body = meaningBody(text);
        assert.ok(body.length > 20 && !/^(Lá bài gợi|The card suggests)/.test(body), `${card.id} ${locale}`);
        assert.equal(body.charAt(0), body.charAt(0).toLocaleUpperCase("vi"), `${card.id} ${locale} starts with a capital`);
      }
    }
  }
});

test("the Play link carries only the surface and the drawn card as an install referrer", () => {
  const base = "https://play.google.com/store/apps/details?id=com.example.app";
  const plain = new URL(playReferrerUrl(base, null));
  assert.equal(plain.searchParams.get("id"), "com.example.app");
  assert.deepEqual(Object.fromEntries(new URLSearchParams(plain.searchParams.get("referrer"))), { utm_source: "share", utm_medium: "web", utm_campaign: "share_landing" });
  const drawn = new URL(playReferrerUrl(base, { id: "major-00-fool", reversed: true, day: "2026-11-29" }));
  assert.deepEqual(Object.fromEntries(new URLSearchParams(drawn.searchParams.get("referrer"))), { utm_source: "share", utm_medium: "web", utm_campaign: "share_landing", c: "major-00-fool", o: "1", d: "2026-11-29" });
});

test("Tarot pages promise what only the app gives", () => {
  for (const locale of ["vi", "en"]) {
    assert.notEqual(shareCtaOf(locale, "", "card").benefit, shareCtaOf(locale, "", "numbers").benefit);
    assert.match(shareCtaOf(locale, "", "reading").benefit, locale === "vi" ? /chuyện của chính mình/ : /your own situation/);
  }
});
