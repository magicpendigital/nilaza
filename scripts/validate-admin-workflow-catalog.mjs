import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
export const workflowApi = require("../apps/admin/workflow-catalog.js");
export const FEATURE_IDS = Object.freeze(["oracle_router", "persona_chat", "ai_council", "tarot_reading", "daily_insight", "notifications", "astrology", "face_reading"]);
const states = ["implemented-source", "candidate-disabled", "deferred"];
const privacy = ["public", "metadata", "personal", "sensitive", "credential-reference"];
const kinds = ["trigger", "guard", "context", "prompt", "model", "branch", "storage", "output", "gate", "transport"];
const allowedSpans = ["openai", "openrouter", "gemini", "anthropic"].flatMap((provider) => ["llm." + provider + ".primary", "llm." + provider + ".fallback"]);
export const normalizedSourceHash = (source) => createHash("sha256").update(source.replace(/\r\n?/g, "\n")).digest("hex");
const safePath = (path) => typeof path === "string" && path.length < 240 && !path.includes("\\")
  && !path.split("/").some((part) => part === ".." || part === "." || !part)
  && /^(supabase\/functions\/|supabase\/migrations\/20260909014614_ai_trace_observability\.sql$|packages\/(agent-config|ai-contracts|astrology-core|content)\/|apps\/mobile\/|docs\/FEATURE_PRD\.md$)/.test(path)
  && !/(^|\/)\.env(?:\.|$)/.test(path);
const string = (value, limit = 2000) => typeof value === "string" && value.trim().length > 0 && value.length <= limit;
const localized = (value) => value && !Array.isArray(value) && string(value.vi) && string(value.en);
const identifier = (value) => typeof value === "string" && /^[a-z][a-z0-9_]*$/.test(value);

/** Source freshness is mandatory; injected reads allow meaningful no-write tests. */
export function validateWorkflowCatalog(catalog, options = {}) {
  const errors = [];
  const fail = (condition, message) => { if (!condition) errors.push(message); };
  const readSource = options.readSource || ((path) => readFileSync(resolve(root, path), "utf8"));
  const digests = new Map();
  fail(catalog?.schemaVersion === 1 && string(catalog?.version, 100), "catalog version/schema invalid");
  fail(/^\d{4}-\d{2}-\d{2}$/.test(catalog?.reviewedAt || ""), "reviewedAt invalid");
  fail(Array.isArray(catalog?.sourceDigests) && catalog.sourceDigests.length > 0, "source digests required");
  for (const item of catalog?.sourceDigests || []) {
    if (!safePath(item?.path) || !/^[a-f0-9]{64}$/.test(item?.sha256 || "")) { errors.push("invalid source digest path/hash"); continue; }
    fail(!digests.has(item.path), "duplicate source digest: " + item.path);
    digests.set(item.path, item.sha256);
    try { fail(normalizedSourceHash(readSource(item.path)) === item.sha256, "stale source: " + item.path); }
    catch { errors.push("source unavailable: " + item.path); }
  }
  // Provider/status allowlists themselves depend on these executable contracts.
  for (const path of ["supabase/functions/_shared/ai-trace.ts", "supabase/functions/_shared/model-provider.ts", "supabase/migrations/20260909014614_ai_trace_observability.sql"]) {
    fail(digests.has(path), "trace contract digest missing: " + path);
  }
  const refs = (items, label) => {
    fail(Array.isArray(items) && items.length > 0, label + " sourceRefs missing");
    for (const item of items || []) {
      fail(safePath(item?.path) && digests.has(item.path), label + " unbound sourceRef");
      fail(item?.symbol === undefined || string(item.symbol, 200), label + " invalid source symbol");
    }
  };
  const features = Array.isArray(catalog?.features) ? catalog.features : [];
  fail(features.length === FEATURE_IDS.length && new Set(features.map((feature) => feature?.id)).size === FEATURE_IDS.length
    && FEATURE_IDS.every((id) => features.some((feature) => feature.id === id)), "exact eight feature IDs required");
  const signatures = [];
  let nodeCount = 0, edgeCount = 0, portCount = 0;
  for (const feature of features) {
    const label = feature?.id || "invalid feature";
    fail(FEATURE_IDS.includes(feature.id) && localized(feature.title) && states.includes(feature.sourceState), label + " feature metadata invalid");
    fail(Array.isArray(feature.caveats) && feature.caveats.length > 0 && feature.caveats.every(localized), label + " caveats required");
    refs(feature.sourceRefs, label);
    fail(Array.isArray(feature.nodes) && feature.nodes.length > 0 && Array.isArray(feature.edges), label + " graph nodes/edges missing");
    fail(Array.isArray(feature.traceFeatures) && feature.traceFeatures.every((item) => string(item, 80)) && new Set(feature.traceFeatures).size === feature.traceFeatures.length, label + " trace feature allowlist invalid");
    const nodes = new Map();
    for (const item of feature.nodes || []) {
      fail(identifier(item.id) && !nodes.has(item.id), label + " duplicate/invalid node");
      nodes.set(item.id, item);
      fail(localized(item.label) && localized(item.description) && kinds.includes(item.kind) && states.includes(item.sourceState), label + "." + item.id + " metadata invalid");
      fail(Number.isFinite(item.x) && Number.isFinite(item.y) && item.x >= 0 && item.y >= 0, label + "." + item.id + " coordinates invalid");
      refs(item.sourceRefs, label + "." + item.id);
      for (const direction of ["inputs", "outputs"]) {
        fail(Array.isArray(item[direction]), label + "." + item.id + " ports missing");
        const names = new Set();
        for (const port of item[direction] || []) {
          fail(string(port.name, 80) && !names.has(port.name) && string(port.type, 100) && localized(port.usage) && privacy.includes(port.privacy), label + "." + item.id + " invalid/duplicate port");
          names.add(port.name);
          fail(string(port[direction === "inputs" ? "source" : "destination"], 300), label + "." + item.id + " port provenance missing");
          portCount++;
        }
      }
      fail(Array.isArray(item.traceSpanNames) && item.traceSpanNames.every((name) => allowedSpans.includes(name))
        && new Set(item.traceSpanNames).size === item.traceSpanNames.length && (!item.traceSpanNames.length || item.kind === "model"), label + "." + item.id + " unsafe trace binding");
      nodeCount++;
    }
    const coordinates = [...nodes.values()];
    for (let i = 0; i < coordinates.length; i++) {
      for (let j = i + 1; j < coordinates.length; j++) {
        fail(Math.abs(coordinates[i].x - coordinates[j].x) >= 270 || Math.abs(coordinates[i].y - coordinates[j].y) >= 160, label + " overlapping node cards");
      }
    }
    const edges = new Set();
    for (const item of feature.edges || []) {
      fail(identifier(item.id) && !edges.has(item.id), label + " duplicate/invalid edge");
      edges.add(item.id);
      const from = nodes.get(item.from), to = nodes.get(item.to);
      fail(from && to && from !== to, label + "." + item.id + " missing/self node endpoint");
      fail(["control", "data"].includes(item.kind) && localized(item.label) && localized(item.condition), label + "." + item.id + " edge meaning invalid");
      refs(item.sourceRefs, label + "." + item.id);
      fail(Array.isArray(item.mappings) && (item.kind === "data" ? item.mappings.length > 0 : item.mappings.length === 0), label + "." + item.id + " mapping kind invalid");
      const mappings = new Set();
      for (const mapping of item.mappings || []) {
        const out = from?.outputs?.find((port) => port.name === mapping.from), input = to?.inputs?.find((port) => port.name === mapping.to);
        fail(out && input && out.type === input.type && localized(mapping.usage), label + "." + item.id + " port mapping/type mismatch");
        const key = mapping.from + ">" + mapping.to;
        fail(!mappings.has(key), label + "." + item.id + " duplicate mapping");
        mappings.add(key);
      }
      edgeCount++;
    }
    signatures.push(JSON.stringify([(feature.nodes || []).map((item) => [item.id, item.kind]), (feature.edges || []).map((item) => [item.from, item.to])]));
  }
  fail(new Set(signatures).size === FEATURE_IDS.length, "feature graphs must have distinct actual structures");
  for (const id of ["oracle_router", "notifications", "face_reading"]) {
    const feature = features.find((item) => item.id === id);
    fail(feature?.traceFeatures?.length === 0 && feature?.nodes?.every((item) => item.kind !== "model" && item.traceSpanNames.length === 0), id + " must not claim an LLM trace/provider node");
  }
  fail(features.find((item) => item.id === "oracle_router")?.sourceState === "candidate-disabled", "Oracle must disclose candidate-disabled source state");
  fail(features.find((item) => item.id === "face_reading")?.sourceState === "deferred", "Face must disclose deferred source state");
  return { status: errors.length ? "fail" : "pass", features: features.length, nodes: nodeCount, edges: edgeCount, ports: portCount, sourceDigests: digests.size, errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateWorkflowCatalog(workflowApi.catalog);
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length) process.exitCode = 1;
}
