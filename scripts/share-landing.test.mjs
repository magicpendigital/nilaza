import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { elementPairKey, isShareVariant, quoteBookIndex, quoteBooks, quoteDateKey, quoteHash, quoteItemIndex, isZodiacId, parseCardIds, parseSharedSky, randomIndex, readShareArrival, shareMeta, sharePhaseNames, shareSurfaces, shareVariants, sunSignFromDateInput, sunSignOf, variantFromSearch, zodiac } from "../apps/web/src/lib/shareLanding.ts";
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
    const cta = shareCtaOf(locale, "");
    texts.push(cta.label, cta.benefit, cta.privacy);
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
