import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const check = process.argv.includes("--check");
const sourcePath = path.join(root, "packages", "agent-config", "council-contract.json");
const targetPath = path.join(root, "supabase", "functions", "_shared", "council-contract.ts");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

for (const key of ["id", "version", "endpoint", "responseSchema", "promptVersionId"]) {
  if (typeof source[key] !== "string" || !source[key].trim()) throw new Error(`Council contract ${key} is required.`);
}

const output = `// Generated from packages/agent-config/council-contract.json.\n// Verify with: npm run council:contract:check\nexport const councilContract = ${JSON.stringify({
  id: source.id,
  version: source.version,
  endpoint: source.endpoint,
  responseSchema: source.responseSchema,
  promptVersionId: source.promptVersionId,
  optionalResponseFields: source.optionalResponseFields ?? {}
}, null, 2)} as const;\n`;

const current = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
if (check) {
  if (current !== output) throw new Error("Council contract artifact is stale. Run npm run council:contract:generate.");
  console.log("Council contract artifact matches the canonical configuration.");
} else {
  fs.writeFileSync(targetPath, output, "utf8");
  console.log(`Generated ${path.relative(root, targetPath)}.`);
}
