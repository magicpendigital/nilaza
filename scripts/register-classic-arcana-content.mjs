import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deckId = "classic-arcana";
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const writeJson = (relativePath, value) => {
  fs.writeFileSync(path.join(root, relativePath), JSON.stringify(value, null, 2) + "\n", "utf8");
};

const manifestPath = path.join(root, "assets", "tarot", deckId, `${deckId}-full-deck-manifest.json`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const decks = readJson("packages/content/data/tarot-decks.json");
const canonicalCards = readJson("packages/content/data/tarot-cards.json");
const cardDesignSets = readJson("packages/content/data/tarot-card-designs.json");
const deckBacks = readJson("packages/content/data/tarot-deck-backs.json");
const deck = decks.find((item) => item.id === deckId);
const cardIds = new Set(canonicalCards.map((card) => card.id));

if (!deck?.cardIntroductions) throw new Error(`${deckId} is missing its localized card introductions`);
if (manifest.cards.length !== 78 || new Set(manifest.cards.map((card) => card.cardId)).size !== 78) {
  throw new Error(`${deckId} manifest must contain 78 unique cards`);
}
if (manifest.cards.some((card) => !cardIds.has(card.cardId) || !deck.cardIntroductions[card.cardId])) {
  throw new Error(`${deckId} manifest has a missing or unexpected canonical card`);
}

const designSet = {
  deckId,
  style: {
    vi: "Tranh khắc vùng Bắc Ý tô màu thủ công, nét mực than rõ, giấy ngà cũ; chàm bụi, đỏ đất, vàng đất và xanh sage. Hình tượng nguyên bản, quen thuộc, cân đối và dễ đọc trên màn hình nhỏ.",
    en: "Original European hand-colored printmaking cues, clear charcoal contours, aged ivory paper, dusty ultramarine, faded vermilion, ochre, and muted sage. Familiar archetypes, balanced compositions, and mobile legibility."
  },
  cardBackPrompt: {
    vi: "Mặt sau Classic Arcana theo bố cục đối xứng xoay 180 độ: giấy ngà ấm, khung hoa lá kiểu in cổ, hai Cốc đối xứng ở hai đầu, đồng Pentacle, Kiếm bắt chéo và hoa thị ở tâm. Dùng chàm bụi, đỏ đất, vàng đất và xanh sage; không chữ, không số, không watermark.",
    en: "Classic Arcana card back with 180-degree rotational symmetry: warm ivory paper, an antique floral print border, paired cups at opposite ends, Pentacles, crossed Swords, and a central rosette. Use dusty indigo, faded red, ochre, and sage; no text, numbers, or watermark."
  },
  cards: manifest.cards.map((manifestCard) => {
    const intro = deck.cardIntroductions[manifestCard.cardId];
    const canonicalCard = canonicalCards.find((card) => card.id === manifestCard.cardId);
    return {
      cardId: manifestCard.cardId,
      title: canonicalCard.name,
      visualPrompt: {
        vi: `Minh họa ${canonicalCard.name.en} theo phong cách in màu thủ công vùng Bắc Ý của bộ Classic Arcana. ${intro.vi}`,
        en: `Classic Arcana hand-colored print illustration of ${canonicalCard.name.en}. ${intro.en}`
      },
      artworkPath: manifestCard.artworkPath,
      cardPath: manifestCard.cardPath,
      testingStatus: "ready_for_visual_prototype"
    };
  })
};

const cardBack = {
  id: `${deckId}-back`,
  deckId,
  status: "ready_for_mvp",
  assetPath: `assets/tarot/deck-backs/${deckId}.png`,
  cardSize: { width: 1024, height: 1768 },
  safeArea: { x: 96, y: 128, width: 832, height: 1512 },
  usage: {
    vi: "Hiển thị mặt sau đối xứng của bộ Classic Arcana trong màn chờ người dùng chạm để rút bài.",
    en: "Show the symmetrical Classic Arcana card back while the user waits to tap and draw."
  },
  visualDirection: {
    vi: "Giấy ngà ấm, khung in hoa lá, Cốc, Pentacle, Kiếm bắt chéo và hoa thị đặt đối xứng để mặt sau không đổi chiều khi lật.",
    en: "Warm ivory paper, a floral print border, cups, Pentacles, crossed Swords, and a centered rosette arranged symmetrically so the back reads in either orientation."
  },
  qualityChecks: ["1024x1768", "same_ratio_as_tarot_cards", "no_text", "safe_area_clear", "deck_style_matched", "rotationally_symmetric"]
};

writeJson("packages/content/data/tarot-card-designs.json", [
  ...cardDesignSets.filter((item) => item.deckId !== deckId),
  designSet
]);
writeJson("packages/content/data/tarot-deck-backs.json", [
  ...deckBacks.filter((item) => item.deckId !== deckId),
  cardBack
]);

console.log(`Registered ${designSet.cards.length} ${deckId} visual briefs and its deck-back metadata.`);
