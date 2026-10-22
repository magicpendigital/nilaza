import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const root = new URL("../", import.meta.url);
const data = JSON.parse(
  fs.readFileSync(
    new URL("packages/content/data/astrology-mythology-chapters.json", root),
    "utf8",
  ),
);
const signs = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];
const guideData = JSON.parse(
  fs.readFileSync(
    new URL("packages/content/data/astrology-zodiac-guides.json", root),
    "utf8",
  ),
);
const expectedPatterns = {
  aries: ["fire", "cardinal"],
  taurus: ["earth", "fixed"],
  gemini: ["air", "mutable"],
  cancer: ["water", "cardinal"],
  leo: ["fire", "fixed"],
  virgo: ["earth", "mutable"],
  libra: ["air", "cardinal"],
  scorpio: ["water", "fixed"],
  sagittarius: ["fire", "mutable"],
  capricorn: ["earth", "cardinal"],
  aquarius: ["air", "fixed"],
  pisces: ["water", "mutable"],
};
assert.equal(guideData.system, "western-tropical");
assert.deepEqual(guideData.signs.map((sign) => sign.id), signs);
assert.deepEqual(
  guideData.taxonomyReferences.map((reference) => reference.id),
  ["elements", "modalities"],
);
for (const reference of guideData.taxonomyReferences) {
  assert.equal(new URL(reference.url).protocol, "https:");
  for (const lang of ["vi", "en"])
    assert.ok(reference.title?.[lang]?.trim(), `guide.reference.${reference.id}.${lang}`);
}
for (const field of ["intro", "placementNote"])
  for (const lang of ["vi", "en"])
    assert.ok(guideData[field]?.[lang]?.trim(), `guide.${field}.${lang}`);
for (const [id, expected] of Object.entries(expectedPatterns)) {
  const sign = guideData.signs.find((item) => item.id === id);
  assert.ok(sign, `Missing sign guide: ${id}`);
  assert.deepEqual([sign.element, sign.modality], expected, `${id} taxonomy`);
  for (const field of ["archetype", "meaning", "resource", "invitation", "question"])
    for (const lang of ["vi", "en"])
      assert.ok(
        sign[field]?.[lang]?.trim(),
        `guide.${id}.${field}.${lang}: missing bilingual copy`,
      );
  for (const field of ["meaning", "resource", "invitation", "question"])
    for (const lang of ["vi", "en"])
      assert.ok(
        sign[field][lang].trim().length >= 40,
        `guide.${id}.${field}.${lang}: too short to be useful`,
      );
}
for (const [groupName, expectedIds] of [
  ["elements", ["fire", "earth", "air", "water"]],
  ["modalities", ["cardinal", "fixed", "mutable"]],
]) {
  assert.deepEqual(Object.keys(guideData[groupName]).sort(), [...expectedIds].sort());
  for (const id of expectedIds)
    for (const field of ["name", "description"])
      for (const lang of ["vi", "en"])
        assert.ok(
          guideData[groupName][id][field]?.[lang]?.trim(),
          `guide.${groupName}.${id}.${field}.${lang}`,
        );
}
const depth=JSON.parse(fs.readFileSync(new URL("packages/content/data/astrology-mythology-depth.json",root),"utf8"));
assert.deepEqual(depth.chapters.map(c=>c.id),signs);
for(const chapter of depth.chapters){
  assert.match(chapter.section,/^II\.\d+$/);
  for(const field of ["story","variants","lens","practice"])for(const lang of ["vi","en"]){
    assert.ok(chapter[field][lang].trim().length>=140,`${chapter.id}.${field}.${lang}: insufficient editorial content`);
  }
}
const art=JSON.parse(fs.readFileSync(new URL("assets/features/astrology/chapter-art-generation.json",root),"utf8"));
assert.deepEqual(art.records.map(r=>r.id),signs);
for(const item of art.records){
 for(const [pathField,hashField] of [["master","masterSha256"],["runtime","runtimeSha256"]]){
  const bytes=fs.readFileSync(new URL(item[pathField],root));
  assert.equal(createHash("sha256").update(bytes).digest("hex"),item[hashField]);
  if(pathField==="runtime")assert.ok(bytes.length<300*1024,`${item.id}: runtime budget exceeded`);
 }
}
assert.deepEqual(
  data.chapters.map((c) => c.id),
  signs,
);
assert.equal(new Set(data.sources.map((s) => s.id)).size, data.sources.length);
for (const chapter of data.chapters) {
  for (const field of ["name", "title", "myth", "reflection", "question"])
    for (const lang of ["vi", "en"])
      assert.ok(
        chapter[field]?.[lang]?.trim(),
        `${chapter.id}.${field}.${lang}`,
      );
  assert.ok(data.sources.some((s) => s.id === chapter.source));
}
for (const source of data.sources)
  assert.equal(new URL(source.url).protocol, "https:");
const master = fs.readFileSync(
  new URL("assets/features/astrology/sanctuary.png", root),
);
const runtime = fs.readFileSync(
  new URL("apps/mobile/assets/runtime/features/astrology-sanctuary.jpg", root),
);
assert.ok(runtime.length < 300 * 1024, "Mythology hero exceeds 300KB budget");
const provenance = JSON.parse(
  fs.readFileSync(
    new URL("assets/features/astrology/sanctuary.provenance.json", root),
    "utf8",
  ),
);
assert.equal(
  createHash("sha256").update(master).digest("hex"),
  provenance.masterSha256,
);
assert.equal(
  createHash("sha256").update(runtime).digest("hex"),
  provenance.runtimeSha256,
);
console.log(
  `Astrology content candidate: 12 bilingual sign guides and mythology chapters, 12 individual paintings plus portal; taxonomy, sources, content layers, checksums and 300KB image budgets pass. Owner/native review remains separate.`,
);
