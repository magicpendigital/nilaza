import fs from "node:fs";

const CARDS_PATH = "packages/content/data/tarot-cards.json";
const MANIFEST_PATH = "assets/tarot/astral-pop-atelier/astral-pop-atelier-full-deck-manifest.json";

const canonicalCards = JSON.parse(fs.readFileSync(CARDS_PATH, "utf8"));
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const errors = [];

const hasText = (value) => typeof value === "string" && value.trim().length > 0;
const localizedFields = ["portrait", "cardStory", "visualPrompt"];
const promptMustInclude = [
  "inner artwork",
  "656 x 1130px",
  "No card frame",
  "no border",
  "no title",
  "no numbers",
  "no text",
  "no watermark",
  "no Rider-Waite copy",
  "no famous anime character resemblance",
  "no celebrity likeness",
  "no school uniform",
  "no childlike treatment",
  "no sexualized styling",
  "no horror occult imagery"
];
const promptMustIncludeVi = [
  "inner artwork",
  "656 x 1130px",
  "Không tạo khung bài",
  "không viền",
  "không tiêu đề",
  "không số",
  "không chữ",
  "không watermark",
  "không sao chép Rider-Waite",
  "không giống nhân vật anime nổi tiếng",
  "không celebrity likeness",
  "không school uniform",
  "không trẻ con hóa",
  "không sexualized styling",
  "không horror occult"
];

const assert = (condition, message) => {
  if (!condition) errors.push(message);
};

assert(manifest.deckId === "astral-pop-atelier", "Manifest deckId must be astral-pop-atelier");
assert(manifest.status === "full_deck_design_review", "Manifest status must be full_deck_design_review");
assert(manifest.name?.vi === "Astral Pop Atelier", "Vietnamese deck name must stay English: Astral Pop Atelier");
assert(manifest.name?.en === "Astral Pop Atelier", "English deck name must be Astral Pop Atelier");
assert(manifest.productionRules?.cardSize?.width === 1024, "Card width must be 1024");
assert(manifest.productionRules?.cardSize?.height === 1768, "Card height must be 1768");
assert(manifest.productionRules?.artworkArea?.width === 656, "Artwork width must be 656");
assert(manifest.productionRules?.artworkArea?.height === 1130, "Artwork height must be 1130");
assert(manifest.productionRules?.artworkOnly === true, "Manifest must declare artworkOnly true");
assert(Array.isArray(manifest.cards), "Manifest cards must be an array");
assert(manifest.cards?.length === 78, `Expected 78 Astral card designs, found ${manifest.cards?.length ?? 0}`);

const canonicalById = new Map(canonicalCards.map((card) => [card.id, card]));
const seen = new Set();
const arcanaCounts = { major: 0, minor: 0 };
const suitCounts = { wands: 0, cups: 0, swords: 0, pentacles: 0 };

for (const design of manifest.cards ?? []) {
  const canonical = canonicalById.get(design.cardId);
  assert(Boolean(canonical), `${design.cardId} does not exist in canonical tarot-cards.json`);
  assert(!seen.has(design.cardId), `${design.cardId} is duplicated`);
  seen.add(design.cardId);
  if (!canonical) continue;

  arcanaCounts[canonical.arcana] += 1;
  if (canonical.suit) suitCounts[canonical.suit] += 1;

  assert(design.title?.vi === canonical.name.en, `${design.cardId}.title.vi must use English title "${canonical.name.en}"`);
  assert(design.title?.en === canonical.name.en, `${design.cardId}.title.en must use English title "${canonical.name.en}"`);
  assert(design.arcana === canonical.arcana, `${design.cardId}.arcana must match canonical card`);
  assert(design.suit === canonical.suit, `${design.cardId}.suit must match canonical card`);
  assert(design.rank === canonical.rank, `${design.cardId}.rank must match canonical card`);
  assert(design.testingStatus === "ready_for_visual_prototype", `${design.cardId}.testingStatus must be ready_for_visual_prototype`);

  for (const field of localizedFields) {
    assert(hasText(design[field]?.vi), `${design.cardId}.${field}.vi is missing`);
    assert(hasText(design[field]?.en), `${design.cardId}.${field}.en is missing`);
  }

  for (const text of promptMustInclude) {
    assert(design.visualPrompt.en.includes(text), `${design.cardId}.visualPrompt.en missing required phrase: ${text}`);
  }
  for (const text of promptMustIncludeVi) {
    assert(design.visualPrompt.vi.includes(text), `${design.cardId}.visualPrompt.vi missing required phrase: ${text}`);
  }

  assert(design.visualPrompt.en.includes(canonical.name.en), `${design.cardId}.visualPrompt.en must mention the card title`);
  assert(design.visualPrompt.vi.includes(canonical.name.en), `${design.cardId}.visualPrompt.vi must mention the English card title`);

  const serialized = JSON.stringify(design).toLowerCase();
  for (const banned of ["rider waite style", "studio ghibli", "sailor moon", "naruto", "demon slayer", "chibi", "sexy", "schoolgirl"]) {
    assert(!serialized.includes(banned), `${design.cardId} contains banned visual reference: ${banned}`);
  }
}

for (const card of canonicalCards) {
  assert(seen.has(card.id), `Missing Astral design for ${card.id}`);
}

assert(arcanaCounts.major === 22, `Expected 22 major designs, found ${arcanaCounts.major}`);
assert(arcanaCounts.minor === 56, `Expected 56 minor designs, found ${arcanaCounts.minor}`);
for (const [suit, count] of Object.entries(suitCounts)) {
  assert(count === 14, `Expected 14 ${suit} designs, found ${count}`);
}

if (errors.length > 0) {
  console.error("Astral Pop Atelier design validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Astral Pop Atelier design validation passed.");
console.log(`Cards: ${manifest.cards.length}`);
console.log(`Major Arcana: ${arcanaCounts.major}`);
console.log(`Minor Arcana: ${arcanaCounts.minor}`);
for (const [suit, count] of Object.entries(suitCounts)) console.log(`${suit}: ${count}`);
