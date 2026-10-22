import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = path.join(repoRoot, "apps", "mobile", "assets", "runtime");
const maxRuntimeBytes = 90 * 1024 * 1024;
const maxSingleAssetBytes = 700 * 1024;

// The runtime manifest is the static maps consumed by Metro, not the master artwork.
// Stellar Mosaic intentionally retains the historical folder/cover name only.
export function validateTarotManifest({ decks, cards, appSource, visualSource, listFiles, isFile }) {
  const errors = [];
  const parse = (name, text) => ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const app = parse("App.tsx", appSource);
  const visuals = parse("visualAssets.ts", visualSource);
  const declarations = new Map();
  const collect = node => {
    if (ts.isVariableDeclaration(node)) declarations.set(node.name.getText(), node.initializer);
    ts.forEachChild(node, collect);
  };
  collect(app);
  collect(visuals);
  const object = (node, label) => {
    const result = new Map();
    if (!node || !ts.isObjectLiteralExpression(node)) {
      errors.push(`${label}: missing static object map`);
      return result;
    }
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property) || !property.name ||
          !(ts.isStringLiteral(property.name) || ts.isIdentifier(property.name))) {
        errors.push(`${label}: unsupported manifest entry`);
        continue;
      }
      const key = property.name.text;
      if (result.has(key)) errors.push(`${label}: duplicate entry ${key}`);
      result.set(key, property.initializer);
    }
    return result;
  };
  const exactIds = (actual, expected, label) => {
    const missing = expected.filter(id => !actual.includes(id));
    const extra = actual.filter(id => !expected.includes(id));
    if (missing.length || extra.length || new Set(actual).size !== actual.length) {
      errors.push(`${label}: missing [${missing.join(", ")}], unexpected [${extra.join(", ")}], entries ${actual.length}/${expected.length}`);
    }
  };
  const deckIds = decks.map(deck => deck.id);
  const cardIds = cards.map(card => card.id);
  if (cardIds.length !== 78 || new Set(cardIds).size !== 78) errors.push("Tarot seed must contain exactly 78 unique card IDs");
  if (new Set(deckIds).size !== deckIds.length) errors.push("Tarot seed contains duplicate deck IDs");
  const cardMaps = object(declarations.get("deckCardImages"), "App.tsx deckCardImages");
  const deckVisuals = object(declarations.get("deckVisuals"), "visualAssets.ts deckVisuals");
  exactIds([...cardMaps.keys()], deckIds, "App.tsx decks");
  exactIds([...deckVisuals.keys()], deckIds, "visualAssets.ts decks");
  const requirePath = node => node && ts.isCallExpression(node) && node.expression.getText() === "require" &&
    node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]) ? node.arguments[0].text : undefined;
  for (const id of deckIds) {
    const folder = id === "stellar-mosaic" ? "stellar-academy" : id;
    const directory = `tarot/${folder}/cards`;
    const files = listFiles(directory);
    exactIds(files, cardIds.map(cardId => `${cardId}.jpg`), `${id} runtime cards`);
    const mapping = cardMaps.get(id);
    if (mapping && ts.isCallExpression(mapping) && mapping.expression.getText() === "buildCardImageMap") {
      const context = mapping.arguments[0];
      if (!context || !ts.isCallExpression(context) || context.expression.getText() !== "require.context" ||
          context.arguments[0]?.text !== `./assets/runtime/${directory}` ||
          context.arguments[1]?.kind !== ts.SyntaxKind.FalseKeyword || !context.arguments[2] ||
          !ts.isRegularExpressionLiteral(context.arguments[2])) {
        errors.push(`${id}: invalid card context, expected ${directory} (non-recursive)`);
      } else {
        const [, pattern, flags] = context.arguments[2].text.match(/^\/(.*)\/([a-z]*)$/) ?? [];
        try {
          const regex = new RegExp(pattern, flags);
          exactIds(files.filter(file => { regex.lastIndex = 0; return regex.test(`./${file}`); }),
            cardIds.map(cardId => `${cardId}.jpg`), `${id} imported cards`);
        } catch { errors.push(`${id}: invalid card context regex`); }
      }
    } else {
      const entries = object(mapping && ts.isIdentifier(mapping) ? declarations.get(mapping.text) : mapping, `${id} card map`);
      exactIds([...entries.keys()], cardIds, `${id} static cards`);
      for (const [cardId, value] of entries) {
        if (requirePath(value) !== `./assets/runtime/${directory}/${cardId}.jpg`) errors.push(`${id}/${cardId}: incorrect static card path`);
      }
    }
    const roles = object(deckVisuals.get(id), `${id} visuals`);
    for (const role of ["cover", "back"]) {
      const asset = `tarot/deck-${role}s/${role === "cover" ? folder : id}.jpg`;
      if (!isFile(asset)) errors.push(`${id}: missing runtime ${role}: ${asset}`);
      if (requirePath(roles.get(role)) !== `../assets/runtime/${asset}`) errors.push(`${id}: incorrect ${role} mapping, expected ${asset}`);
    }
  }
  for (const [helper, role] of [["getDeckBackImage", "back"], ["getDeckThumbnailImage", "cover"]]) {
    const fn = app.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === helper);
    const returned = fn?.body?.statements.find(ts.isReturnStatement)?.expression;
    if (!returned || !ts.isCallExpression(returned) || returned.expression.getText() !== "getDeckVisual" ||
        returned.arguments[0]?.getText() !== "deckId" || returned.arguments[1]?.text !== role) {
      errors.push(`App.tsx ${helper}: must use getDeckVisual(deckId, "${role}")`);
    }
  }
  return errors;
}

// Active personas are a product surface, not a best-effort artwork lookup. Keep
// every active persona explicitly mapped to its reviewed v2 thumbnail and cover,
// so a renamed seed cannot silently fall back to another guide's portrait.
export function validatePersonaManifest({ personas, visualSource, isFile, masterFile, imageSize }) {
  const errors = [];
  const source = ts.createSourceFile("visualAssets.ts", visualSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let personaVisuals;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "personaVisuals") personaVisuals = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (!personaVisuals || !ts.isObjectLiteralExpression(personaVisuals)) {
    return ["visualAssets.ts personaVisuals: missing static object map"];
  }

  const requirePath = node => node && ts.isCallExpression(node) && node.expression.getText(source) === "require" &&
    node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]) ? node.arguments[0].text : undefined;
  const visualEntries = new Map();
  for (const entry of personaVisuals.properties) {
    if (!ts.isPropertyAssignment(entry) || !(ts.isStringLiteral(entry.name) || ts.isIdentifier(entry.name)) || !ts.isObjectLiteralExpression(entry.initializer)) {
      errors.push("visualAssets.ts personaVisuals: unsupported manifest entry");
      continue;
    }
    const roles = new Map();
    for (const role of entry.initializer.properties) {
      if (ts.isPropertyAssignment(role) && (ts.isStringLiteral(role.name) || ts.isIdentifier(role.name))) {
        roles.set(role.name.text, requirePath(role.initializer));
      }
    }
    visualEntries.set(entry.name.text, roles);
  }

  const activePersonas = personas.filter(persona => persona?.status === "active" && typeof persona.slug === "string");
  const activeSlugs = activePersonas.map(persona => persona.slug);
  const unexpected = [...visualEntries.keys()].filter(slug => !activeSlugs.includes(slug));
  const missing = activeSlugs.filter(slug => !visualEntries.has(slug));
  if (missing.length || unexpected.length || new Set(activeSlugs).size !== activeSlugs.length) {
    errors.push(`personaVisuals: missing [${missing.join(", ")}], unexpected [${unexpected.join(", ")}], entries ${visualEntries.size}/${activeSlugs.length}`);
  }

  for (const persona of activePersonas) {
    const roles = visualEntries.get(persona.slug);
    for (const [role, directory, expectedSize] of [
      ["thumbnail", "thumbnails", [800, 800]],
      ["cover", "covers", [1200, 1500]]
    ]) {
      const expectedRuntime = `../assets/runtime/personas/${directory}/${persona.slug}-v2.jpg`;
      const actualRuntime = roles?.get(role);
      if (actualRuntime !== expectedRuntime) {
        errors.push(`${persona.slug}: ${role} must explicitly use ${expectedRuntime}`);
        continue;
      }
      const runtimeAsset = `personas/${directory}/${persona.slug}-v2.jpg`;
      const masterAsset = `personas/${directory}/${persona.slug}-v2.jpg`;
      if (!isFile(runtimeAsset)) errors.push(`${persona.slug}: missing runtime ${runtimeAsset}`);
      if (!masterFile(masterAsset)) {
        errors.push(`${persona.slug}: missing reviewed master ${masterAsset}`);
        continue;
      }
      const dimensions = imageSize(masterAsset);
      if (!dimensions || dimensions.width !== expectedSize[0] || dimensions.height !== expectedSize[1]) {
        errors.push(`${persona.slug}: ${role} master must be ${expectedSize[0]}x${expectedSize[1]}`);
      }
    }
  }
  return errors;
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function main() {
if (!fs.existsSync(runtimeRoot)) {
  console.error("Mobile runtime assets are missing. Run scripts/build-mobile-runtime-assets.ps1.");
  process.exit(1);
}

const files = walk(runtimeRoot);
const totalBytes = files.reduce((sum, filePath) => sum + fs.statSync(filePath).size, 0);
const oversized = files.filter((filePath) => fs.statSync(filePath).size > maxSingleAssetBytes);
const sourceFiles = [
  path.join(repoRoot, "apps", "mobile", "App.tsx"),
  ...walk(path.join(repoRoot, "apps", "mobile", "src")).filter(file => /\.[jt]sx?$/.test(file))
];
const staleRuntimeReferences = sourceFiles.flatMap((filePath) => {
  const source = fs.readFileSync(filePath, "utf8");
  return source.includes("../../assets/tarot/") ||
    source.includes("../../../assets/tarot/") ||
    source.includes("../../../assets/personas/") ||
    source.includes("../../../../assets/brand/") ||
    source.includes("design/stitch/")
    ? [path.relative(repoRoot, filePath)]
    : [];
});

const errors = [];
errors.push(...validateTarotManifest({
  decks: JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/content/data/tarot-decks.json"), "utf8")),
  cards: JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/content/data/tarot-cards.json"), "utf8")),
  appSource: fs.readFileSync(path.join(repoRoot, "apps/mobile/App.tsx"), "utf8"),
  visualSource: fs.readFileSync(path.join(repoRoot, "apps/mobile/src/visualAssets.ts"), "utf8"),
  listFiles: directory => {
    const target = path.join(runtimeRoot, directory);
    return fs.existsSync(target) ? fs.readdirSync(target, { withFileTypes: true }).filter(entry => entry.isFile()).map(entry => entry.name) : [];
  },
  isFile: asset => fs.existsSync(path.join(runtimeRoot, asset)) && fs.statSync(path.join(runtimeRoot, asset)).isFile()
}));
const personaSeedFiles = ["personas-figures.json", "personas-books.json", "personas-archetypes.json"];
const personas = personaSeedFiles.flatMap(file => JSON.parse(fs.readFileSync(path.join(repoRoot, "packages", "content", "data", file), "utf8")));
const imageSize = asset => {
  const target = path.join(repoRoot, "assets", asset);
  const data = fs.readFileSync(target);
  const isPng = data.length >= 24 && data.toString("ascii", 1, 4) === "PNG";
  if (isPng) return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) { offset += 1; continue; }
    const marker = data[offset + 1];
    const length = data.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: data.readUInt16BE(offset + 7), height: data.readUInt16BE(offset + 5) };
    }
    if (!length || marker === 0xda) break;
    offset += 2 + length;
  }
  return null;
};
errors.push(...validatePersonaManifest({
  personas,
  visualSource: fs.readFileSync(path.join(repoRoot, "apps", "mobile", "src", "visualAssets.ts"), "utf8"),
  isFile: asset => fs.existsSync(path.join(runtimeRoot, asset)) && fs.statSync(path.join(runtimeRoot, asset)).isFile(),
  masterFile: asset => fs.existsSync(path.join(repoRoot, "assets", asset)) && fs.statSync(path.join(repoRoot, "assets", asset)).isFile(),
  imageSize
}));
const expectedCardIds = new Set(JSON.parse(fs.readFileSync(path.join(repoRoot, "packages/content/data/tarot-cards.json"), "utf8")).map(card => card.id));
for (const filePath of sourceFiles) {
  const source = ts.createSourceFile(filePath, fs.readFileSync(filePath, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "moonGardenCardImages" && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      const ids = new Set(node.initializer.properties.map(property => property.name && ts.isStringLiteral(property.name) ? property.name.text : ""));
      const missing = [...expectedCardIds].filter(id => !ids.has(id));
      if (missing.length) errors.push(`Incomplete static Moon Garden map: missing ${missing.length} cards`);
    }
    if (ts.isCallExpression(node) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
      const reference = node.arguments[0].text;
      const runtimeReference = reference.includes("assets/runtime/");
      const target = path.resolve(path.dirname(filePath), reference);
      const call = node.expression.getText(source);
      if (runtimeReference && call === "require" && !fs.existsSync(target)) {
        errors.push(`Missing runtime import in ${path.relative(repoRoot, filePath)}: ${reference}`);
      }
      if (runtimeReference && call === "require.context") {
        const pattern = node.arguments[2]?.getText(source).match(/^\/(.*)\/([a-z]*)$/);
        if (!fs.existsSync(target) || !pattern) {
          errors.push(`Invalid runtime asset context: ${reference}`);
        } else {
          const regex = new RegExp(pattern[1], pattern[2]);
          const matches = fs.readdirSync(target).filter(name => { regex.lastIndex = 0; return regex.test(`./${name}`); });
          if (matches.length === 0) errors.push(`Empty runtime asset context: ${reference}`);
          if (reference.endsWith("/cards")) {
            const ids = new Set(matches.map(name => path.parse(name).name));
            const missing = [...expectedCardIds].filter(id => !ids.has(id));
            if (missing.length > 0) errors.push(`Incomplete deck ${reference}: missing ${missing.length} cards`);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
if (totalBytes > maxRuntimeBytes) {
  errors.push(`Runtime assets are ${(totalBytes / 1024 / 1024).toFixed(2)} MB; limit is 90 MB.`);
}
if (oversized.length > 0) {
  errors.push(`Assets over 700 KB: ${oversized.map((filePath) => path.relative(runtimeRoot, filePath)).join(", ")}`);
}
if (staleRuntimeReferences.length > 0) {
  errors.push(`Mobile source still references master artwork: ${staleRuntimeReferences.join(", ")}`);
}

if (errors.length > 0) {
  console.error("Mobile runtime asset validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Mobile runtime asset validation passed: ${files.length} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MB.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
