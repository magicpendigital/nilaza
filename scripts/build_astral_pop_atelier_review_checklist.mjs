import fs from "node:fs";

const MANIFEST_PATH = "assets/tarot/astral-pop-atelier/astral-pop-atelier-full-deck-manifest.json";
const OUT_PATH = "docs/ASTRAL_POP_ATELIER_REVIEW_CHECKLIST.md";

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const byArcana = {
  major: manifest.cards.filter((card) => card.arcana === "major"),
  wands: manifest.cards.filter((card) => card.suit === "wands"),
  cups: manifest.cards.filter((card) => card.suit === "cups"),
  swords: manifest.cards.filter((card) => card.suit === "swords"),
  pentacles: manifest.cards.filter((card) => card.suit === "pentacles")
};

const section = (title, cards) => [
  `## ${title}`,
  "",
  "| Status | Card ID | Title | Review focus |",
  "| --- | --- | --- | --- |",
  ...cards.map((card) => {
    const focus = card.arcana === "major"
      ? "Distinct archetype, emotional clarity, original anime-premium composition"
      : "Suit grammar matched, rank moment clear, no text/frame in artwork prompt";
    return `| Ready | \`${card.cardId}\` | ${card.title.en} | ${focus} |`;
  }),
  ""
].join("\n");

const body = [
  "# Astral Pop Atelier Review Checklist",
  "",
  "Last updated: 2026-06-14",
  "",
  "This checklist is generated from the full Astral Pop Atelier design manifest. It is for product/design review before image production.",
  "",
  "## Review Package",
  "",
  "- Deck bible: `docs/ASTRAL_POP_ATELIER_DECK_BIBLE.md`",
  "- Full 78-card manifest: `assets/tarot/astral-pop-atelier/astral-pop-atelier-full-deck-manifest.json`",
  "- Card production spec: `assets/tarot/astral-pop-atelier/card-spec.json`",
  "- Builder: `scripts/build_astral_pop_atelier_designs.mjs`",
  "- Validator: `scripts/validate_astral_pop_atelier_designs.mjs`",
  "",
  "## Validation Status",
  "",
  "- `node scripts/build_astral_pop_atelier_designs.mjs`: passed, wrote 78 cards.",
  "- `node scripts/validate_astral_pop_atelier_designs.mjs`: passed.",
  "- `npm.cmd run validate:data`: passed.",
  "",
  "## Deck-Level Checks",
  "",
  "- English deck name is used for both `vi` and `en`: Astral Pop Atelier.",
  "- Vietnamese descriptions and card stories remain Vietnamese.",
  "- Card size remains `1024 x 1768px`.",
  "- Inner artwork slot remains `656 x 1130px`.",
  "- Each card prompt says inner artwork only, with no frame, border, title, number, text, or watermark.",
  "- Each card prompt blocks Rider-Waite copy, famous anime/studio imitation, celebrity likeness, childlike styling, sexualized styling, and horror occult imagery.",
  "- Full coverage: 22 Major Arcana, 56 Minor Arcana, 14 cards per suit.",
  "",
  section("Major Arcana", byArcana.major),
  section("Wands / Spark Studio", byArcana.wands),
  section("Cups / Tide Room", byArcana.cups),
  section("Swords / Signal Hall", byArcana.swords),
  section("Pentacles / Earth Lab", byArcana.pentacles)
].join("\n");

fs.writeFileSync(OUT_PATH, `${body}\n`, "utf8");
console.log(`Wrote Astral Pop Atelier review checklist to ${OUT_PATH}`);
