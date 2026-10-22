import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function inventory(relative) {
  const directory = path.resolve(root, relative);
  if (!directory.startsWith(root + path.sep)) throw new Error("Measurement path must stay inside this repository");
  if (!fs.existsSync(directory)) return { status: "missing", files: 0, bytes: 0 };
  const files = [];
  function visit(current) {
    for (const item of fs.readdirSync(current, { withFileTypes: true })) {
      if (item.isSymbolicLink()) continue;
      const target = path.join(current, item.name);
      if (item.isDirectory()) visit(target);
      else if (item.isFile()) files.push({ path: path.relative(directory, target), bytes: fs.statSync(target).size });
    }
  }
  if (fs.statSync(directory).isDirectory()) visit(directory);
  else files.push({ path: path.basename(directory), bytes: fs.statSync(directory).size });
  return { status: "measured", files: files.length, bytes: files.reduce((sum, item) => sum + item.bytes, 0),
    mib: Number((files.reduce((sum, item) => sum + item.bytes, 0) / 1048576).toFixed(3)) };
}
const decks = JSON.parse(fs.readFileSync(path.join(root, "packages/content/data/tarot-decks.json"), "utf8"));
const tarot = decks.map(deck => ({ deckId: deck.id, ...inventory(`apps/mobile/assets/runtime/tarot/${deck.id === "stellar-mosaic" ? "stellar-academy" : deck.id}`) }));
const astrologyImageFiles = fs.readdirSync(path.join(root, "apps/mobile/assets/runtime/features"))
  .filter(name => name.startsWith("astrology"))
  .map(name => inventory(`apps/mobile/assets/runtime/features/${name}`));
const astrologyImageBytes = astrologyImageFiles.reduce((sum, item) => sum + item.bytes, 0);
const result = {
  measuredAt: new Date().toISOString(), unit: "bytes (MiB = 1048576 bytes)",
  tarot, defaultDeck: "moon-garden",
  tarotBacks: inventory("apps/mobile/assets/runtime/tarot/deck-backs"),
  tarotCovers: inventory("apps/mobile/assets/runtime/tarot/deck-covers"),
  astrologyImages: { status: "measured", files: astrologyImageFiles.length, bytes: astrologyImageBytes, mib: Number((astrologyImageBytes / 1048576).toFixed(3)) },
  astrologyGuides: inventory("packages/content/data/astrology-zodiac-guides.json"),
  astrologyChapters: inventory("packages/content/data/astrology-mythology-chapters.json"),
  astrologyDepth: inventory("packages/content/data/astrology-mythology-depth.json"),
  astrologyPlaces: inventory("packages/astrology-core/places.json"),
  learningDepth: inventory("packages/content/data/tarot-learning-depth.json"),
  builds: {},
  limitation: "Uncompressed source/export measurements. They do not predict compressed APK/IPA download size or authorize remote pack activation.",
  hybridPilot: {
    candidate: "rose-mirror", defaultDeckOffline: "moon-garden",
    status: "awaiting approved asset origin and pack publication",
    acceptance: ["versioned manifest with all 78 card IDs and file hashes", "authenticated entitlement where applicable", "partial download resume and hash verification", "atomic cache promotion and rollback", "offline access to downloaded files", "no loss of saved reading text when a pack is removed"],
  },
};
for (let index = 2; index < process.argv.length; index += 2) {
  const option = process.argv[index], value = process.argv[index + 1];
  if (!value || !["--web-dir", "--android-dir"].includes(option)) throw new Error("Use --web-dir <repo path> or --android-dir <repo path>");
  result.builds[option.slice(2)] = inventory(value);
}
console.log(JSON.stringify(result, null, 2));
