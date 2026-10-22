import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(repoRoot, "packages", "content", "data", "feature-visuals.json");
const runtimeFiles = [
  path.join(repoRoot, "apps", "mobile", "src", "visualAssets.ts"),
  path.join(repoRoot, "apps", "mobile", "App.tsx")
];

const errors = [];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`Cannot parse ${path.relative(repoRoot, filePath)}: ${error.message}`);
    return [];
  }
}

const visuals = readJson(manifestPath);
const ids = new Set();

for (const visual of visuals) {
  if (!visual.id || typeof visual.id !== "string") errors.push("Each feature visual needs a string id.");
  if (ids.has(visual.id)) errors.push(`Duplicate feature visual id: ${visual.id}`);
  ids.add(visual.id);

  if (!visual.feature || typeof visual.feature !== "string") errors.push(`${visual.id}: feature is required.`);
  if (!Array.isArray(visual.allowedUse) || visual.allowedUse.length === 0) errors.push(`${visual.id}: allowedUse must list where the visual may appear.`);
  if (!visual.assetPath || typeof visual.assetPath !== "string") errors.push(`${visual.id}: assetPath is required.`);
  if (!visual.visualIntent?.en || !visual.visualIntent?.vi) errors.push(`${visual.id}: visualIntent needs vi and en.`);
  if (!Array.isArray(visual.forbiddenAssociations) || visual.forbiddenAssociations.length === 0) errors.push(`${visual.id}: forbiddenAssociations must be explicit.`);

  if (/^https?:\/\//i.test(visual.assetPath) || visual.assetPath.includes("uri:")) {
    errors.push(`${visual.id}: feature visuals must be local files, not remote URIs.`);
  }

  const normalizedAssetPath = visual.assetPath.replaceAll("\\", "/");
  const resolvedAssetPath = path.join(repoRoot, normalizedAssetPath);
  if (!fs.existsSync(resolvedAssetPath)) {
    errors.push(`${visual.id}: asset does not exist at ${visual.assetPath}`);
  }

  if (!normalizedAssetPath.startsWith("assets/features/")) {
    errors.push(`${visual.id}: feature visual must live under assets/features/.`);
  }

  if (/assets\/(tarot|personas)\//.test(normalizedAssetPath)) {
    errors.push(`${visual.id}: feature visual must not point at tarot or persona assets.`);
  }
}

for (const filePath of runtimeFiles) {
  if (!fs.existsSync(filePath)) continue;
  const relativePath = path.relative(repoRoot, filePath);
  const source = fs.readFileSync(filePath, "utf8");
  if (/uri\s*:|https?:\/\//i.test(source)) {
    errors.push(`${relativePath}: remote image URI found in mobile visual runtime.`);
  }

  const suspiciousFeatureBlocks = [
    { label: "Astrology", banned: /(editorialDeckImages|getDeckBackImage|getPersonaThumbnail|fallbackCardImage)/ },
    { label: "Face Reading", banned: /(editorialDeckImages|getDeckBackImage|getPersonaThumbnail|fallbackCardImage)/ },
    { label: "Daily Reflection", banned: /(editorialDeckImages|getDeckBackImage|getPersonaThumbnail|fallbackCardImage)/ },
    { label: "AI Council", banned: /(editorialDeckImages|getDeckBackImage|fallbackCardImage)/ }
  ];

  for (const block of suspiciousFeatureBlocks) {
    const blockPattern = new RegExp(`label=["']${block.label}["'][\\s\\S]{0,420}`, "g");
    for (const match of source.matchAll(blockPattern)) {
      if (block.banned.test(match[0])) {
        errors.push(`${relativePath}: ${block.label} feature block appears to use tarot/persona fallback imagery.`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error("Visual asset validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Visual asset validation passed for ${visuals.length} feature visuals.`);
