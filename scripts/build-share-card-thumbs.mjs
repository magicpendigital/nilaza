// Builds the small card images used by the public share pages (apps/web/public/share/cards/<id>.webp) from the
// repo's own default deck (moon-garden). Each file must stay under 30 KB so the page loads fast on mobile data.
// Usage: node scripts/build-share-card-thumbs.mjs          (write)
//        node scripts/build-share-card-thumbs.mjs --check  (fail when a file is missing, too big or extra)
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const source = path.join(root, "apps/mobile/assets/runtime/tarot/moon-garden/cards");
const target = path.join(root, "apps/web/public/share/cards");
const maxBytes = 30 * 1024;
const cards = JSON.parse(fs.readFileSync(path.join(root, "packages/content/data/tarot-cards.json"), "utf8"));
const ids = cards.map((card) => card.id);
const check = process.argv.includes("--check");
const errors = [];

if (!check) fs.mkdirSync(target, { recursive: true });
for (const id of ids) {
  const input = path.join(source, `${id}.jpg`);
  const output = path.join(target, `${id}.webp`);
  if (!check) {
    if (!fs.existsSync(input)) { errors.push(`missing source ${input}`); continue; }
    // 300 px wide covers a 150 px card on a 2x screen; quality steps down until the file fits.
    for (const quality of [72, 64, 56, 48]) {
      await sharp(input).resize({ width: 300, withoutEnlargement: true }).webp({ quality, effort: 6 }).toFile(output);
      if (fs.statSync(output).size < maxBytes) break;
    }
  }
  if (!fs.existsSync(output)) errors.push(`missing ${path.relative(root, output)}`);
  else if (fs.statSync(output).size >= maxBytes) errors.push(`${path.relative(root, output)} is ${fs.statSync(output).size} bytes (limit ${maxBytes})`);
}
if (fs.existsSync(target)) {
  for (const name of fs.readdirSync(target)) if (!ids.includes(name.replace(/\.webp$/, ""))) errors.push(`unexpected file ${name}`);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
const total = ids.reduce((sum, id) => sum + fs.statSync(path.join(target, `${id}.webp`)).size, 0);
console.log(`Share card images ${check ? "valid" : "written"}: ${ids.length} files, ${Math.round(total / 1024)} KB total, largest under ${maxBytes / 1024} KB.`);
