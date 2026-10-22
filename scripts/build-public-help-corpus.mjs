import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const schemaVersion = "nilaza.public-help-corpus.v1";
const maxChunkLength = 1400;
const outputRoot = path.resolve("packages/content/generated/public-help-corpus");
const manifestPath = path.join(outputRoot, "manifest.json");
const corpusPath = path.join(outputRoot, "corpus.jsonl");
const checkOnly = process.argv.includes("--check");

const sources = [
  { kind: "help", root: path.resolve("apps/web/src/content/help"), route: (locale, slug) => `/${locale}/help/${slug}` },
  { kind: "legal", root: path.resolve("apps/web/src/content/legal"), route: (locale, slug) => `/${locale}/${slug}` }
];

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function parseScalar(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return trimmed.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function parseDocument(file, kind, route) {
  const source = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error(`${file}: invalid or missing frontmatter`);

  const metadata = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    metadata[line.slice(0, separator).trim()] = parseScalar(line.slice(separator + 1));
  }

  for (const field of ["title", "description", "locale", "slug", "updatedAt"]) {
    if (!metadata[field]) throw new Error(`${file}: missing ${field}`);
  }

  const locale = metadata.locale;
  const slug = metadata.slug;
  const documentId = `${kind}:${locale}:${slug}`;
  const sections = parseSections(match[2], metadata.title);
  const chunks = [];

  sections.forEach((section, sectionIndex) => {
    splitText(section.text).forEach((part, partIndex) => {
      const text = [metadata.title, section.heading, part].filter(Boolean).join("\n");
      const checksum = hash(text);
      chunks.push({
        schema_version: schemaVersion,
        chunk_id: `${documentId}:${sectionIndex + 1}:${partIndex + 1}:${checksum.slice(0, 12)}`,
        document_id: documentId,
        kind,
        locale,
        slug,
        title: metadata.title,
        description: metadata.description,
        section: section.heading,
        status: kind === "help" ? metadata.status : "published",
        category: kind === "help" ? metadata.category : "Policy",
        updated_at: metadata.updatedAt,
        public_url_path: route(locale, slug),
        text,
        checksum_sha256: checksum
      });
    });
  });

  return {
    document: {
      document_id: documentId,
      kind,
      locale,
      slug,
      title: metadata.title,
      updated_at: metadata.updatedAt,
      public_url_path: route(locale, slug),
      source_path: toPosix(path.relative(process.cwd(), file)),
      checksum_sha256: hash(source),
      chunk_count: chunks.length
    },
    chunks
  };
}

function cleanMarkdown(value) {
  return value
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .split("\n")
    .map(line => line.replace(/^>\s?/, "").replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseSections(markdown, fallbackHeading) {
  const sections = [];
  let heading = fallbackHeading;
  let body = [];
  const flush = () => {
    const text = cleanMarkdown(body.join("\n"));
    if (text) sections.push({ heading, text });
    body = [];
  };

  for (const line of markdown.split("\n")) {
    const match = line.match(/^#{2,3}\s+(.+)$/);
    if (match) {
      flush();
      heading = cleanMarkdown(match[1]);
    } else {
      body.push(line);
    }
  }
  flush();
  return sections;
}

function splitText(text) {
  if (text.length <= maxChunkLength) return [text];
  const chunks = [];
  let current = "";
  const append = value => {
    if (!current) current = value;
    else if (`${current}\n\n${value}`.length <= maxChunkLength) current = `${current}\n\n${value}`;
    else { chunks.push(current); current = value; }
  };

  for (const paragraph of text.split(/\n{2,}/)) {
    if (paragraph.length <= maxChunkLength) { append(paragraph); continue; }
    let segment = "";
    for (const word of paragraph.split(/\s+/)) {
      if (`${segment} ${word}`.trim().length > maxChunkLength) { append(segment); segment = word; }
      else segment = `${segment} ${word}`.trim();
    }
    if (segment) append(segment);
  }
  if (current) chunks.push(current);
  return chunks;
}

const parsed = [];
for (const source of sources) {
  for (const locale of ["en", "vi"]) {
    const directory = path.join(source.root, locale);
    for (const name of fs.readdirSync(directory).filter(name => /\.mdx?$/.test(name)).sort()) {
      parsed.push(parseDocument(path.join(directory, name), source.kind, source.route));
    }
  }
}

parsed.sort((a, b) => a.document.document_id.localeCompare(b.document.document_id));
const documents = parsed.map(item => item.document);
const chunks = parsed.flatMap(item => item.chunks);
const updatedAt = documents.map(item => item.updated_at).sort().at(-1);
const manifest = {
  schema_version: schemaVersion,
  content_updated_at: updatedAt,
  audience: "public",
  allowed_source_roots: sources.map(source => toPosix(path.relative(process.cwd(), source.root))),
  excluded_sources: ["docs/NILAZA_ADMIN_AI_STUDIO_OWNER_GUIDE.md", "packages/agent-config", "supabase/functions"],
  assistant_policy: {
    allowed: ["product_information", "help_navigation", "feature_status", "privacy_and_safety", "waitlist_and_beta"],
    prohibited: ["personalized_spiritual_reading", "professional_advice", "account_action", "billing_action", "internal_configuration"],
    citation_required: true,
    unknown_answer: "Say that the public guides do not contain the answer and link to the closest relevant guide."
  },
  locale_counts: Object.fromEntries(["en", "vi"].map(locale => [locale, documents.filter(item => item.locale === locale).length])),
  document_count: documents.length,
  chunk_count: chunks.length,
  documents
};

const manifestOutput = `${JSON.stringify(manifest, null, 2)}\n`;
const corpusOutput = `${chunks.map(chunk => JSON.stringify(chunk)).join("\n")}\n`;

if (checkOnly) {
  const errors = [];
  if (!fs.existsSync(manifestPath) || fs.readFileSync(manifestPath, "utf8") !== manifestOutput) errors.push("public help corpus manifest is missing or stale");
  if (!fs.existsSync(corpusPath) || fs.readFileSync(corpusPath, "utf8") !== corpusOutput) errors.push("public help corpus JSONL is missing or stale");
  if (chunks.some(chunk => chunk.text.length > maxChunkLength + chunk.title.length + chunk.section.length + 2)) errors.push("public help corpus contains an oversized chunk");
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
  console.log(`Public help corpus current: ${documents.length} documents, ${chunks.length} chunks, ${schemaVersion}.`);
} else {
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(manifestPath, manifestOutput);
  fs.writeFileSync(corpusPath, corpusOutput);
  console.log(`Built public help corpus: ${documents.length} documents, ${chunks.length} chunks, ${schemaVersion}.`);
}
