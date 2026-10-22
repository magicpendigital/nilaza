import fs from "node:fs";
import path from "node:path";

const source = path.resolve("docs/NILAZA_ADMIN_AI_STUDIO_OWNER_GUIDE.md");
const target = path.resolve("supabase/functions/admin-documentation/owner-guide.ts");
if (!fs.existsSync(source)) throw new Error(`Missing ${source}`);
const content = fs.readFileSync(source, "utf8");
const output = `// Generated from docs/NILAZA_ADMIN_AI_STUDIO_OWNER_GUIDE.md. Do not edit by hand.\nexport const ownerGuideMarkdown = ${JSON.stringify(content)};\n`;
if (process.argv.includes("--check")) {
  if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== output) throw new Error("Owner guide bundle is stale. Run node scripts/build-admin-owner-guide.mjs");
  console.log("Owner guide bundle is current.");
} else { fs.writeFileSync(target, output); console.log(`Wrote ${target}`); }
