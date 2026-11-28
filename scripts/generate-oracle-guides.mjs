// Generates supabase/functions/_shared/oracle-guides.generated.ts: the guides Oracle may suggest.
// The slug list comes from the persona data, so a new persona cannot be forgotten; --check fails on drift.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const check = process.argv.includes("--check");
const dataDir = path.join(root, "packages", "content", "data");
const targetPath = path.join(root, "supabase", "functions", "_shared", "oracle-guides.generated.ts");
const read = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));

const slugs = ["personas-archetypes.json", "personas-books.json", "personas-figures.json"]
  .flatMap((name) => read(name))
  .filter((persona) => persona.status === "active")
  .map((persona) => persona.slug);
const reasons = read("oracle-guide-reasons.json").reasons;

const missing = slugs.filter((slug) => !reasons[slug]);
const extra = Object.keys(reasons).filter((slug) => !slugs.includes(slug));
if (missing.length || extra.length || new Set(slugs).size !== slugs.length) {
  throw new Error(`oracle-guide-reasons.json must match the active personas exactly. Missing: [${missing.join(", ")}]. Unknown: [${extra.join(", ")}].`);
}

const guides = Object.fromEntries(slugs.map((slug) => [slug, reasons[slug]]));
const output = `// Generated from packages/content/data/personas-*.json and oracle-guide-reasons.json. Do not edit by hand.\n// Regenerate with: npm run oracle:guides:generate (verify with oracle:guides:check, also run by validate:data).\nexport const ORACLE_GUIDES: Record<string, string> = ${JSON.stringify(guides, null, 2)};\n`;

const current = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8").replace(/\r\n/g, "\n") : "";
if (check) {
  if (current !== output) throw new Error("Oracle guide list is stale. Run npm run oracle:guides:generate.");
  console.log("Oracle guide list matches the persona data.");
} else {
  fs.writeFileSync(targetPath, output, "utf8");
  console.log(`Generated ${path.relative(root, targetPath)} (${slugs.length} guides).`);
}
