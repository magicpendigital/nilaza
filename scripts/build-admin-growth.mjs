import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { GROWTH_SOURCE_FILES, growthPrivacyErrors, isGrowthSourceReference, validateGrowthSnapshot } from "../apps/admin/growth-operations-model.mjs";

export const GROWTH_OUTPUT_FILE = "apps/admin/generated/growth-operations.json";
const pick = (value, keys) => Object.fromEntries(keys.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]));
const serialize = snapshot => `${JSON.stringify(snapshot, null, 2)}\n`;
const sourceRootKeys = [
  ["schemaVersion", "tenantId", "brandPackVersion", "lastReviewedAt", "features"],
  ["schemaVersion", "tenantId", "sprintId", "briefs", "lastReviewedAt"],
  ["schemaVersion", "tenantId", "sprintId", "status", "artifactKind", "assetPackages", "lastReviewedAt"],
  ["schemaVersion", "tenantId", "sprintId", "mode", "externalAction", "implementedWorkflowIds", "deferredWorkflowIds", "identityBoundary", "externalReadiness", "dataPlane", "lastReviewedAt", "reviewNotes", "currentProductState", "nextGateOrder"],
  ["schemaVersion", "tenantId", "businessPackVersion", "marketScope", "northStar", "allowedDestinations", "channelCapability", "dataBoundary", "lastReviewedAt"],
  ["schemaVersion", "tenantId", "status", "rule", "events", "forbiddenDimensions", "lastReviewedAt", "measurementAvailability"],
  ["schemaVersion", "tenantId", "sprintId", "status", "dataSource", "crossTenantSharing", "currentHypotheses", "nonComparabilityRule", "nextEvidenceNeeded", "lastReviewedAt", "currentProductLimits"],
  ["schemaVersion", "tenantId", "status", "purpose", "sources", "prohibitedInputs", "lastReviewedAt"],
  ["schemaVersion", "tenantId", "reviewedAt", "status", "summary", "workflows", "tasks"]
];
const requireKnownKeys = (value, keys, location) => {
  if (Object.keys(value).some(key => !keys.includes(key))) throw new Error(`${location}: unreviewed source field is not allowed`);
};

export function buildAdminGrowthSnapshot(workspaceRoot = process.cwd()) {
  const root = path.resolve(workspaceRoot);
  const records = GROWTH_SOURCE_FILES.map((relativePath, index) => {
    const raw = fs.readFileSync(path.join(root, relativePath));
    let value;
    try { value = JSON.parse(raw.toString("utf8")); }
    catch { throw new Error(`${relativePath}: valid JSON source required`); }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${relativePath}: object source required`);
    const privacyErrors = growthPrivacyErrors(value);
    if (privacyErrors.length) throw new Error(`${relativePath}: privacy boundary rejected (${privacyErrors.join("; ")})`);
    if (value.tenantId !== "nilaza") throw new Error(`${relativePath}: Nilaza tenant required`);
    requireKnownKeys(value, sourceRootKeys[index], relativePath);
    return { path: relativePath, sha256: createHash("sha256").update(raw).digest("hex"), value };
  });
  const [productTruth, briefs, drafts, readiness, business, measurement, learning, research, roadmap] = records.map(item => item.value);
  if (!Array.isArray(briefs.briefs) || !Array.isArray(drafts.assetPackages)) throw new Error("Growth brief and draft source arrays are required");
  const briefKeys = ["id", "hypothesis", "claimRefs", "formats", "destinationId", "primaryMetric", "guardrails"];
  const assetKeys = ["id", "tenantId", "briefId", "version", "status", "artifactKind", "lifecycleState", "format", "claimRefs", "copy", "visualBrief", "qa", "approval", "externalReadiness", "measurement", "productionRecord", "destination", "reviewUpdate"];
  briefs.briefs.forEach(item => requireKnownKeys(item, briefKeys, "Growth brief"));
  drafts.assetPackages.forEach(item => requireKnownKeys(item, assetKeys, "Growth draft"));
  const snapshot = {
    schemaVersion: 1,
    classification: "repository_growth_snapshot",
    tenantId: "nilaza",
    reviewedAt: roadmap.reviewedAt,
    sourceFiles: records.map(({ path, sha256 }) => ({ path, sha256 })),
    meta: {
      mode: "read_only", executionAuthority: "none", qaEvidence: "self_reported_seed_metadata_not_independent_review",
      publicReadiness: "blocked", sourceFreshness: "checked_against_canonical_files"
    },
    productTruth: pick(productTruth, ["schemaVersion", "tenantId", "brandPackVersion", "lastReviewedAt", "features"]),
    briefs: briefs.briefs.map(item => pick(item, briefKeys)),
    assets: drafts.assetPackages.map(item => pick(item, assetKeys.filter(key => key !== "tenantId"))),
    readiness: pick(readiness, ["schemaVersion", "tenantId", "sprintId", "mode", "externalAction", "implementedWorkflowIds", "deferredWorkflowIds", "externalReadiness", "lastReviewedAt", "reviewNotes", "currentProductState", "nextGateOrder"]),
    business: pick(business, ["schemaVersion", "tenantId", "businessPackVersion", "marketScope", "northStar", "allowedDestinations", "channelCapability"]),
    measurement: pick(measurement, ["schemaVersion", "tenantId", "status", "rule", "events", "forbiddenDimensions", "lastReviewedAt", "measurementAvailability"]),
    learning: pick(learning, ["schemaVersion", "tenantId", "sprintId", "status", "dataSource", "crossTenantSharing", "currentHypotheses", "nonComparabilityRule", "nextEvidenceNeeded", "lastReviewedAt", "currentProductLimits"]),
    research: pick(research, ["schemaVersion", "tenantId", "status", "purpose", "sources", "lastReviewedAt"]),
    roadmap: pick(roadmap, ["schemaVersion", "tenantId", "reviewedAt", "status", "summary", "workflows", "tasks"])
  };
  const validation = validateGrowthSnapshot(snapshot);
  if (!validation.valid) throw new Error(`Growth snapshot contract rejected (${validation.errors.join("; ")})`);
  const evidenceReferences = new Map(snapshot.productTruth.features.flatMap(item => item.evidence.map(entry => [entry.id, entry.reference])));
  const references = new Set([
    ...snapshot.productTruth.features.flatMap(item => item.evidence.map(entry => entry.reference)),
    ...snapshot.assets.map(item => item.visualBrief.reference),
    ...snapshot.assets.flatMap(item => (item.reviewUpdate?.evidenceRefs || []).map(reference => isGrowthSourceReference(reference) ? reference : evidenceReferences.get(reference))),
    ...snapshot.research.sources.map(item => item.reference),
    ...snapshot.measurement.events.flatMap(item => (item.sourceBindings || []).map(entry => entry.path)),
    ...snapshot.roadmap.tasks.flatMap(item => item.evidenceRefs)
  ]);
  for (const reference of references) {
    const resolved = path.resolve(root, reference);
    if (!resolved.startsWith(`${root}${path.sep}`) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) throw new Error(`Growth evidence reference does not resolve: ${reference}`);
  }
  return snapshot;
}

export function checkAdminGrowthSnapshot(workspaceRoot = process.cwd()) {
  const expected = serialize(buildAdminGrowthSnapshot(workspaceRoot));
  const outputPath = path.join(path.resolve(workspaceRoot), GROWTH_OUTPUT_FILE);
  return { current: fs.existsSync(outputPath) && fs.readFileSync(outputPath, "utf8") === expected, outputPath };
}

export function writeAdminGrowthSnapshot(workspaceRoot = process.cwd()) {
  const snapshot = buildAdminGrowthSnapshot(workspaceRoot);
  const outputPath = path.join(path.resolve(workspaceRoot), GROWTH_OUTPUT_FILE);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serialize(snapshot), "utf8");
  return { snapshot, outputPath };
}

const modulePath = fileURLToPath(import.meta.url);
if (path.resolve(process.argv[1] || "") === modulePath) {
  try {
    if (process.argv.slice(2).some(value => value !== "--check")) throw new Error("Only --check is supported");
    if (process.argv.includes("--check")) {
      const result = checkAdminGrowthSnapshot();
      if (!result.current) throw new Error("Growth Operations snapshot is stale; run npm run admin:growth:seed after reviewing canonical inputs");
      console.log("Growth Operations snapshot matches all reviewed canonical sources.");
    } else {
      writeAdminGrowthSnapshot();
      console.log("Built deterministic read-only Growth Operations snapshot; no publishing or sending authority.");
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
