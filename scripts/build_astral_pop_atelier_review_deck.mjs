import fs from "node:fs";

const MANIFEST_PATH = "assets/tarot/astral-pop-atelier/astral-pop-atelier-full-deck-manifest.json";
const OUT_PATH = "docs/ASTRAL_POP_ATELIER_FULL_DECK_REVIEW.md";

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

const groups = [
  ["Major Arcana", (card) => card.arcana === "major"],
  ["Wands / Spark Studio", (card) => card.suit === "wands"],
  ["Cups / Tide Room", (card) => card.suit === "cups"],
  ["Swords / Signal Hall", (card) => card.suit === "swords"],
  ["Pentacles / Earth Lab", (card) => card.suit === "pentacles"]
];

const cardBlock = (card) => [
  `### ${card.title.en}`,
  "",
  `- Card ID: \`${card.cardId}\``,
  `- Keywords VI: ${card.keywords.vi.join(", ")}`,
  `- Keywords EN: ${card.keywords.en.join(", ")}`,
  `- Portrait VI: ${card.portrait.vi}`,
  `- Card story VI: ${card.cardStory.vi}`,
  `- Visual prompt VI: ${card.visualPrompt.vi}`,
  `- Visual prompt EN: ${card.visualPrompt.en}`,
  ""
].join("\n");

const body = [
  "# Astral Pop Atelier Full Deck Review",
  "",
  "Last updated: 2026-06-14",
  "",
  "This is the manager-readable review file for the complete 78-card Astral Pop Atelier design set. The production source of truth remains the JSON manifest.",
  "",
  "## Source Files",
  "",
  "- Full manifest: `assets/tarot/astral-pop-atelier/astral-pop-atelier-full-deck-manifest.json`",
  "- Deck bible: `docs/ASTRAL_POP_ATELIER_DECK_BIBLE.md`",
  "- Checklist: `docs/ASTRAL_POP_ATELIER_REVIEW_CHECKLIST.md`",
  "",
  "## Deck Summary",
  "",
  `- Name VI/EN: ${manifest.name.vi}`,
  `- Status: ${manifest.status}`,
  `- Version: ${manifest.version}`,
  `- Short description VI: ${manifest.shortDescription.vi}`,
  `- Visual direction VI: ${manifest.visualDirection.vi}`,
  "",
  ...groups.flatMap(([title, predicate]) => [
    `## ${title}`,
    "",
    ...manifest.cards.filter(predicate).map(cardBlock)
  ])
].join("\n");

fs.writeFileSync(OUT_PATH, `${body}\n`, "utf8");
console.log(`Wrote Astral Pop Atelier full deck review to ${OUT_PATH}`);
