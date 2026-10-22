import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const outputPath = path.join(root, "apps/admin/generated/content-seed.json");
const sourcePaths = [
  "packages/content/data/personas-figures.json",
  "packages/content/data/personas-books.json",
  "packages/content/data/personas-archetypes.json",
  "packages/content/data/tarot-decks.json",
  "packages/content/data/tarot-cards.json",
  "packages/content/data/tarot-deck-backs.json"
];
const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const rawSources = sourcePaths.map((relativePath) => ({ relativePath, contents: fs.readFileSync(path.join(root, relativePath), "utf8") }));
const sourceVersion = crypto.createHash("sha256").update(rawSources.map((item) => `${item.relativePath}\0${item.contents}`).join("\0")).digest("hex");
const figures = read(sourcePaths[0]);
const books = read(sourcePaths[1]);
const archetypes = read(sourcePaths[2]);
const decks = read(sourcePaths[3]);
const cards = read(sourcePaths[4]);
const deckBacks = read(sourcePaths[5]);

const allPersonas = [...figures, ...books, ...archetypes];

const personaAssets = allPersonas.map((persona) => ({
  id: `asset-persona-${persona.slug}`,
  name: `${persona.name.en} portrait`,
  type: "persona",
  path: `assets/personas/thumbnails/${persona.slug}.png`,
  status: "review",
  linkedTo: persona.id,
  updatedAt: "2026-06-24T00:00:00.000Z",
  updatedBy: "repository-seed"
}));
const deckAssets = deckBacks.map((asset) => ({
  id: asset.id,
  name: `${decks.find((deck) => deck.id === asset.deckId)?.name?.en || asset.deckId} deck back`,
  type: "deck-back",
  path: asset.assetPath,
  status: "published",
  linkedTo: asset.deckId,
  updatedAt: "2026-06-24T00:00:00.000Z",
  updatedBy: "repository-seed"
}));
const frontendContent = [
  {
    id: "home-daily-insight",
    placement: "home.dailyInsight",
    status: "published",
    title: { vi: "Thông điệp hôm nay", en: "Today's insight" },
    body: { vi: "Một khoảng lặng nhỏ có thể giúp bạn nghe rõ điều mình thực sự cần.", en: "A small pause may help you hear what you truly need." },
    ctaLabel: { vi: "Khám phá", en: "Explore" },
    updatedAt: "2026-06-24T00:00:00.000Z",
    updatedBy: "repository-seed"
  },
  {
    id: "explore-tarot-hero",
    placement: "explore.tarotHero",
    status: "published",
    title: { vi: "Rút một lá bài", en: "Draw a tarot card" },
    body: { vi: "Đặt một ý định và mở ra góc nhìn phản chiếu.", en: "Set an intention and open a reflective perspective." },
    ctaLabel: { vi: "Bắt đầu", en: "Begin" },
    updatedAt: "2026-06-24T00:00:00.000Z",
    updatedBy: "repository-seed"
  },
  {
    id: "premium-preview",
    placement: "profile.premiumPreview",
    status: "review",
    title: { vi: "Nilaza Premium", en: "Nilaza Premium" },
    body: { vi: "Mở khóa nhiều guide, trải bài sâu hơn và lịch sử journal đầy đủ.", en: "Unlock more guides, deeper readings, and full journal history." },
    ctaLabel: { vi: "Xem quyền lợi", en: "View benefits" },
    updatedAt: "2026-06-24T00:00:00.000Z",
    updatedBy: "repository-seed"
  }
];

const seed = {
  schemaVersion: 1,
  sourceVersion,
  sourcePaths,
  personas: allPersonas,
  decks,
  cards,
  assets: [...personaAssets, ...deckAssets],
  frontendContent
};
const expected = `${JSON.stringify(seed, null, 2)}\n`;
const check = process.argv.includes("--check");
if (check) {
  const actual = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (actual !== expected) {
    console.error("Admin content seed is stale. Run: npm run admin:seed");
    process.exit(1);
  }
  console.log(`Admin content seed is current (${sourceVersion.slice(0, 12)}).`);
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, expected, "utf8");
  console.log(`Generated ${path.relative(root, outputPath)} from ${sourcePaths.length} repository sources.`);
}
