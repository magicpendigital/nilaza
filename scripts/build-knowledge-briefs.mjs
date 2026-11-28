// Knowledge briefs (docs/proposals/CHAT_KNOWLEDGE_CHARACTERS_2026-11-24.vi.md, layer 3): the content team writes
// packages/content/data/knowledge-briefs/<slug>.vi.md plus index.json (personaId -> file). Edge Functions cannot read
// markdown at runtime, so this script bundles the part sent to the model (sections 2-9) into
// supabase/functions/_shared/knowledge-briefs.generated.ts.
//
//   node scripts/build-knowledge-briefs.mjs          regenerate
//   node scripts/build-knowledge-briefs.mjs --check  fail when the generated module is stale (wired into validate:backend)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
export const BRIEF_DIRECTORY = "packages/content/data/knowledge-briefs";
export const GENERATED_PATH = "supabase/functions/_shared/knowledge-briefs.generated.ts";
/** A brief longer than this (characters, sections 2-9) is refused: it would crowd the history out of the prompt. */
export const MAX_BRIEF_CHARS = 40_000;
const FILE_NAME = /^[a-z0-9][a-z0-9-]{0,79}\.vi\.md$/;
const PERSONA_ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
const VERSION = /^[A-Za-z0-9._-]{1,40}$/;

const sha256 = (text) => crypto.createHash("sha256").update(text, "utf8").digest("hex");

/** index.json may be an array, {briefs: [...]}, or a map personaId -> file name | {file, ...}. */
export function normalizeIndex(raw) {
  const list = Array.isArray(raw) ? raw
    : Array.isArray(raw?.briefs) ? raw.briefs
    : raw && typeof raw === "object"
      ? Object.entries(raw).map(([personaId, value]) => typeof value === "string" ? { personaId, file: value } : { personaId, ...(value ?? {}) })
      : [];
  return list.filter((entry) => entry && typeof entry === "object");
}

/** Sections 2-9 when headings are numbered ("## 2. ..."); otherwise the body without the H1 title and lead quote. */
export function extractModelSections(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const numbered = lines.some((line) => /^##\s+\d+\.\s/.test(line));
  if (numbered) {
    let section = null;
    const kept = [];
    for (const line of lines) {
      const heading = /^##\s+(\d+)\.\s/.exec(line);
      if (heading) section = Number(heading[1]);
      else if (/^#{1,2}\s/.test(line)) section = null;
      if (section !== null && section >= 2 && section <= 9) kept.push(line);
    }
    return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  let start = 0;
  while (start < lines.length && (/^#\s/.test(lines[start]) || /^>/.test(lines[start]) || !lines[start].trim())) start += 1;
  return lines.slice(start).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function collectBriefs({ read = (relative) => fs.readFileSync(path.join(root, relative), "utf8"), exists = (relative) => fs.existsSync(path.join(root, relative)) } = {}) {
  const errors = [];
  const briefs = [];
  const indexPath = `${BRIEF_DIRECTORY}/index.json`;
  if (!exists(indexPath)) return { briefs, errors };
  let raw;
  try { raw = JSON.parse(read(indexPath)); } catch (error) {
    errors.push(`${indexPath} is not valid JSON: ${error.message}`);
    return { briefs, errors };
  }
  const seen = new Set();
  for (const entry of normalizeIndex(raw)) {
    const personaId = entry.personaId;
    const file = entry.file;
    if (typeof personaId !== "string" || !PERSONA_ID.test(personaId)) { errors.push(`${indexPath}: invalid personaId ${JSON.stringify(personaId)}`); continue; }
    if (typeof file !== "string" || !FILE_NAME.test(file)) { errors.push(`${indexPath}: ${personaId} has an invalid file ${JSON.stringify(file)}`); continue; }
    if (seen.has(personaId)) { errors.push(`${indexPath}: ${personaId} is listed twice`); continue; }
    seen.add(personaId);
    const relative = `${BRIEF_DIRECTORY}/${file}`;
    if (!exists(relative)) { errors.push(`${relative} is listed in index.json but missing`); continue; }
    const text = extractModelSections(read(relative));
    if (!text) { errors.push(`${relative} has no content for the model (sections 2-9)`); continue; }
    if (text.length > MAX_BRIEF_CHARS) { errors.push(`${relative}: sections 2-9 have ${text.length} characters, above ${MAX_BRIEF_CHARS}`); continue; }
    const hash = sha256(text);
    const declared = typeof entry.version === "string" && VERSION.test(entry.version) ? entry.version : null;
    briefs.push({
      personaId,
      slug: typeof entry.slug === "string" && PERSONA_ID.test(entry.slug) ? entry.slug : file.replace(/\.vi\.md$/, ""),
      title: {
        vi: typeof entry.titleVi === "string" ? entry.titleVi.slice(0, 120) : "",
        en: typeof entry.titleEn === "string" ? entry.titleEn.slice(0, 120) : ""
      },
      version: declared ? `${declared}+${hash.slice(0, 8)}` : `sha-${hash.slice(0, 12)}`,
      status: typeof entry.status === "string" && /^[a-z_]{1,40}$/.test(entry.status) ? entry.status : "unknown",
      sha256: hash,
      language: "vi",
      text
    });
  }
  briefs.sort((a, b) => a.personaId.localeCompare(b.personaId));
  return { briefs, errors };
}

export function renderGeneratedModule(briefs) {
  return [
    "// GENERATED by scripts/build-knowledge-briefs.mjs from packages/content/data/knowledge-briefs. Do not edit by hand:",
    "// run `npm run knowledge:briefs:generate` after changing a brief. Only sections 2-9 (the part meant for the model) are kept.",
    "export type KnowledgeBrief = {",
    "  personaId: string;",
    "  slug: string;",
    "  title: { vi: string; en: string };",
    "  version: string;",
    "  status: string;",
    "  sha256: string;",
    "  language: \"vi\";",
    "  text: string;",
    "};",
    "",
    `export const KNOWLEDGE_BRIEFS: readonly KnowledgeBrief[] = ${JSON.stringify(briefs, null, 2)};`,
    ""
  ].join("\n");
}

/** Errors for validate:backend: an invalid brief index or a stale generated module. */
export function knowledgeBriefCheckErrors() {
  const { briefs, errors } = collectBriefs();
  const expected = renderGeneratedModule(briefs);
  const target = path.join(root, GENERATED_PATH);
  const actual = fs.existsSync(target) ? fs.readFileSync(target, "utf8").replace(/\r\n/g, "\n") : null;
  if (actual !== expected) errors.push(`${GENERATED_PATH} is stale or missing; run npm run knowledge:briefs:generate`);
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--check")) {
    const errors = knowledgeBriefCheckErrors();
    if (errors.length) {
      console.error("Knowledge brief check failed:");
      for (const error of errors) console.error(`- ${error}`);
      process.exit(1);
    }
    console.log("Knowledge briefs are current.");
  } else {
    const { briefs, errors } = collectBriefs();
    if (errors.length) {
      console.error("Knowledge brief build failed:");
      for (const error of errors) console.error(`- ${error}`);
      process.exit(1);
    }
    fs.writeFileSync(path.join(root, GENERATED_PATH), renderGeneratedModule(briefs), "utf8");
    console.log(`Wrote ${GENERATED_PATH} (${briefs.length} briefs).`);
  }
}
