import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { validateTarotManifest } from "./validate-mobile-runtime-assets.mjs";

const read = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const baseline = {
  decks: JSON.parse(read("packages/content/data/tarot-decks.json")),
  cards: JSON.parse(read("packages/content/data/tarot-cards.json")),
  appSource: read("apps/mobile/App.tsx"),
  visualSource: read("apps/mobile/src/visualAssets.ts"),
  listFiles: () => baseline.cards.map(card => `${card.id}.jpg`),
  isFile: () => true
};
const validate = overrides => validateTarotManifest({ ...baseline, ...overrides });
const fails = (overrides, message) => assert.ok(validate(overrides).some(error => error.includes(message)), validate(overrides).join("\n"));

test("current source manifest covers every seeded deck and Stellar aliases", () => {
  assert.deepEqual(validate({}), []);
});
test("a deck removed from App cannot escape coverage validation", () => {
  fails({ appSource: baseline.appSource.replace(/^  "rose-mirror": buildCardImageMap.*\r?\n/m, "") }, "App.tsx decks: missing [rose-mirror]");
});
test("missing, unexpected, and duplicate card IDs fail", () => {
  fails({ listFiles: () => baseline.listFiles().slice(1) }, "runtime cards: missing");
  fails({ listFiles: () => [...baseline.listFiles(), "unknown.jpg"] }, "unexpected [unknown.jpg]");
  fails({ cards: [...baseline.cards.slice(1), baseline.cards[1]] }, "78 unique card IDs");
});
test("missing static map and mis-keyed artwork fail", () => {
  fails({ appSource: baseline.appSource.replace("const moonGardenCardImages:", "const removedCardImages:") }, "moon-garden card map: missing");
  fails({ appSource: baseline.appSource.replace("cards/major-00-fool.jpg", "cards/major-01-magician.jpg") }, "incorrect static card path");
});
test("cover/back must exist and have a manifest entry", () => {
  for (const role of ["cover", "back"]) {
    fails({ isFile: asset => !asset.includes(`deck-${role}s/rose-mirror.jpg`) }, `missing runtime ${role}`);
    fails({ visualSource: baseline.visualSource.replace(`    ${role}: require("../assets/runtime/tarot/deck-${role}s/rose-mirror.jpg")`, "") }, `incorrect ${role} mapping`);
  }
});
test("Stellar card, cover, back, and public deck ID aliases cannot drift", () => {
  fails({ appSource: baseline.appSource.replace("tarot/stellar-academy/cards", "tarot/star-seeker/cards") }, "stellar-mosaic: invalid card context");
  fails({ visualSource: baseline.visualSource.replace("deck-covers/stellar-academy.jpg", "deck-covers/stellar-mosaic.jpg") }, "stellar-mosaic: incorrect cover mapping");
  fails({ visualSource: baseline.visualSource.replace("deck-backs/stellar-mosaic.jpg", "deck-backs/stellar-academy.jpg") }, "stellar-mosaic: incorrect back mapping");
  fails({ visualSource: baseline.visualSource.replace('"stellar-mosaic": {', '"stellar-academy": {') }, "visualAssets.ts decks: missing [stellar-mosaic]");
});
test("context filter must actually import all cards", () => {
  fails({ appSource: baseline.appSource.replace('/\\.jpg$/', '/major.*\\.jpg$/') }, "rose-mirror imported cards: missing");
});
test("App helpers must preserve cover/back roles", () => {
  fails({ appSource: baseline.appSource.replace('return getDeckVisual(deckId, "back")', 'return getDeckVisual(deckId, "cover")') }, "App.tsx getDeckBackImage");
});
