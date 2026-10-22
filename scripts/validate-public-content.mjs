import fs from "node:fs";
import path from "node:path";

const helpRoot = path.resolve("apps/web/src/content/help");
const legalRoot = path.resolve("apps/web/src/content/legal");
const publicRoot = path.resolve("apps/web");
const errors = [];
const pairs = new Map();
const forbidden = [
  /bảo mật tuyệt đối/iu,
  /absolute security/iu,
  /không giới hạn/iu,
  /unlimited use/iu,
  /chắc chắn sẽ xảy ra/iu,
  /will definitely happen/iu
];

for (const locale of ["vi", "en"]) {
  const directory = path.join(helpRoot, locale);
  for (const name of fs.readdirSync(directory).filter(name => /\.mdx?$/.test(name))) {
    const file = path.join(directory, name);
    const text = fs.readFileSync(file, "utf8");
    for (const field of ["title", "description", "locale", "slug", "category", "order", "updatedAt", "status"]) {
      if (!new RegExp(`^${field}:`, "m").test(text)) errors.push(`${file}: missing ${field}`);
    }
    const slug = text.match(/^slug:\s*["']?([^"'\r\n]+)["']?/m)?.[1]?.trim();
    const declared = text.match(/^locale:\s*(vi|en)\s*$/m)?.[1];
    if (declared !== locale) errors.push(`${file}: locale must be ${locale}`);
    if (slug) pairs.set(slug, new Set([...(pairs.get(slug) || []), locale]));
    for (const pattern of forbidden) if (pattern.test(text)) errors.push(`${file}: contains forbidden production claim ${pattern}`);
  }
}

for (const [slug, languages] of pairs) if (languages.size !== 2) errors.push(`${slug}: missing VI/EN pair`);
const legalPairs = new Map();
for (const locale of ["vi", "en"]) {
  const directory = path.join(legalRoot, locale);
  for (const name of fs.readdirSync(directory).filter(name => /\.mdx?$/.test(name))) {
    const file = path.join(directory, name);
    const text = fs.readFileSync(file, "utf8");
    for (const field of ["title", "description", "locale", "slug", "updatedAt"]) {
      if (!new RegExp(`^${field}:`, "m").test(text)) errors.push(`${file}: missing ${field}`);
    }
    const slug = text.match(/^slug:\s*["']?([^"'\r\n]+)["']?/m)?.[1]?.trim();
    const declared = text.match(/^locale:\s*(vi|en)\s*$/m)?.[1];
    if (declared !== locale) errors.push(`${file}: locale must be ${locale}`);
    if (slug) legalPairs.set(slug, new Set([...(legalPairs.get(slug) || []), locale]));
    for (const pattern of forbidden) if (pattern.test(text)) errors.push(`${file}: contains forbidden production claim ${pattern}`);
  }
}
for (const slug of ["privacy", "terms", "safety"]) if (legalPairs.get(slug)?.size !== 2) errors.push(`${slug}: missing VI/EN legal pair`);
const publicFiles = [];
function visit(directory) { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { const target = path.join(directory, entry.name); if (entry.isDirectory() && !["node_modules", "dist", ".astro"].includes(entry.name)) visit(target); else if (entry.isFile()) publicFiles.push(target); } }
visit(publicRoot);
for (const file of publicFiles) {
  const text = fs.readFileSync(file, "utf8");
  if (/NILAZA_ADMIN_AI_STUDIO_OWNER_GUIDE|admin-model-router-config|OPENAI_API_KEY/.test(text) && !file.endsWith("README.md")) errors.push(`${file}: leaks an owner-only identifier`);
}

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`Public content valid: ${pairs.size} bilingual help topics and ${legalPairs.size} bilingual legal topics; owner-only identifiers absent.`);
