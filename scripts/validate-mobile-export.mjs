import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exportArgument = process.argv[2] ?? "apps/mobile/.codex-expo-export-responsive";
const exportRoot = path.resolve(repoRoot, exportArgument);
const maxBytes = 120 * 1024 * 1024;

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

if (!fs.existsSync(exportRoot)) {
  console.error(`Mobile export not found: ${path.relative(repoRoot, exportRoot)}`);
  process.exit(1);
}

const files = walk(exportRoot);
const totalBytes = files.reduce((sum, filePath) => sum + fs.statSync(filePath).size, 0);
if (totalBytes > maxBytes) {
  console.error(`Mobile export is ${(totalBytes / 1024 / 1024).toFixed(2)} MB; release limit is 120 MB.`);
  process.exit(1);
}

const baselineBytes = 400.5 * 1024 * 1024;
const reduction = (1 - totalBytes / baselineBytes) * 100;
console.log(`Mobile export validation passed: ${(totalBytes / 1024 / 1024).toFixed(2)} MB (${reduction.toFixed(1)}% below the 400.5 MB baseline).`);
