import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { buildAdminGrowthSnapshot } from "../../scripts/build-admin-growth.mjs";
import { validateGrowthPilot } from "../../scripts/validate-growth-pilot.mjs";
import { containsSensitiveData, lintCandidate, requiredSoftDimensions, validateContractInstance } from "../../scripts/growth-framework-validator.mjs";
import { computeReviewableArtifactHash } from "../../scripts/validate-growth-tenant-artifacts.mjs";

export const RUNTIME_VERSION = "nilaza-local-session-runtime-v1";
export const SOURCE_MODES = Object.freeze(["actual_ai_session_handback", "fixture"]);
export const IDENTITY_KIND = "operator_attested_local_session_provenance";
export const OPERATING_GROUPS = Object.freeze({
  direction_product_truth: Object.freeze(["growth_orchestrator", "research_jtbd", "product_truth_claim_guard", "positioning_experiment"]),
  creative_delivery: Object.freeze(["content_studio", "distribution_planner"]),
  independent_quality: Object.freeze(["independent_qa"]),
  measurement_learning: Object.freeze(["journey_measurement"])
});
const jobPattern = /^[a-z][a-z0-9-]{2,79}$/;
const hashPattern = /^sha256:[a-f0-9]{64}$/;
const maxPacketBytes = 65536;
const maxFileBytes = 16 * 1024 * 1024;
const maxBundleBytes = 64 * 1024 * 1024;
const fixedSourcePaths = [
  "packages/growth-core/config/growth-agent-catalog.json",
  "packages/growth-core/config/quality-gates.json",
  "packages/growth-core/config/agent-runner-contract.json",
  "packages/content/data/brand-identity.json",
  "packages/growth-contracts/schemas/asset-package.schema.json",
  "packages/growth-contracts/schemas/qa-verdict.schema.json",
  "packages/growth-runtime/runtime.mjs",
  "packages/growth-runtime/renderer.mjs"
];
const copyFields = ["headline", "body", "caption", "cta", "altText"];
const slideFields = ["headline", "body", "altText"];
const json = value => JSON.stringify(value, null, 2) + "\n";
const canonicalize = value => Array.isArray(value) ? value.map(canonicalize) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonicalize(value[k])])) : value;
export const computePayloadHash = value => "sha256:" + createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
const hashBytes = value => "sha256:" + createHash("sha256").update(value).digest("hex");
const now = () => new Date().toISOString();
function fail(code, message = code) { const error = new Error(message); error.code = code; throw error; }
function plain(value) { return value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function keys(value, allowed, required = allowed) {
  if (!plain(value) || Object.keys(value).some(k => !allowed.includes(k)) || required.some(k => !Object.hasOwn(value, k))) fail("INVALID_RECORD", "Record fields are incomplete or not allowed.");
}
function text(value, max = 5000) { if (typeof value !== "string" || !value.trim() || value.length > max) fail("INVALID_TEXT", "A bounded non-empty string is required."); }
function timestamp(value) { if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) fail("INVALID_TIMESTAMP"); }
function safeText(value) {
  text(value);
  if (containsSensitiveData(value) || /\b(?:sk|sb_secret)[-_][A-Za-z0-9_-]{12,}|\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|\bBearer\s+[A-Za-z0-9._-]{12,}/i.test(value)) fail("PRIVATE_MATERIAL_REJECTED", "Private material is not permitted.");
}
function inside(parent, child, allowSame = false) {
  const relative = path.relative(parent, child);
  return (allowSame && relative === "") || (relative !== "" && !relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative));
}
function assertNoLinks(target, { create = false, directory = false } = {}) {
  const absolute = path.resolve(target);
  let cursor = path.parse(absolute).root;
  for (const component of absolute.slice(cursor.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component);
    let entry;
    try { entry = fs.lstatSync(cursor); } catch (e) {
      if (e.code !== "ENOENT") throw e;
      if (create && (cursor !== absolute || directory)) { fs.mkdirSync(cursor); entry = fs.lstatSync(cursor); }
      else break;
    }
    if (entry?.isSymbolicLink()) fail("UNSAFE_PATH", "Links and junctions are not allowed in runtime paths.");
  }
  if (directory && fs.existsSync(absolute) && !fs.statSync(absolute).isDirectory()) fail("UNSAFE_PATH");
  return absolute;
}
function safeStore(storeRoot, repoRoot, create = false) {
  text(storeRoot, 2000);
  const store = assertNoLinks(storeRoot, { create, directory: true });
  if (store === path.parse(store).root || (repoRoot && path.resolve(repoRoot) === store)) fail("UNSAFE_STORE_ROOT");
  if (repoRoot) {
    for (const prefix of ["apps", "assets", "packages", "docs", ".git"]) if (inside(path.resolve(repoRoot, prefix), store, true)) fail("PUBLIC_OR_SOURCE_STORE_FORBIDDEN");
  }
  return store;
}
function within(root, relative, { createParent = false } = {}) {
  if (typeof relative !== "string" || relative.includes("\\") || path.isAbsolute(relative) || relative.split("/").some(c => !c || c === "." || c === "..")) fail("UNSAFE_PATH");
  const target = path.resolve(root, ...relative.split("/"));
  if (!inside(path.resolve(root), target)) fail("UNSAFE_PATH");
  assertNoLinks(path.dirname(target), { create: createParent, directory: true });
  assertNoLinks(target);
  if (fs.existsSync(path.dirname(target)) && !inside(fs.realpathSync(root), fs.realpathSync(path.dirname(target)), true)) fail("UNSAFE_PATH");
  return target;
}
function readJson(target) {
  try { return JSON.parse(fs.readFileSync(target, "utf8")); }
  catch (e) { if (e.code === "ENOENT") fail("MISSING_RECORD", "A runtime record is missing."); fail("CORRUPT_RECORD", "A runtime record cannot be decoded."); }
}
function exclusive(target, value) {
  const fd = fs.openSync(target, "wx", 0o600);
  try { fs.writeFileSync(fd, typeof value === "string" ? value : json(value), "utf8"); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function atomic(target, value) {
  const temporary = target + ".tmp-" + randomUUID();
  exclusive(temporary, value);
  fs.renameSync(temporary, target);
}
function lock(store, operation, callback) {
  const target = within(store, "runtime.lock");
  let fd;
  try { fd = fs.openSync(target, "wx", 0o600); }
  catch (e) { if (e.code === "EEXIST") fail("RUNTIME_BUSY", "Another local runtime operation holds the store lock."); throw e; }
  fs.writeFileSync(fd, json({ pid: process.pid, operation, createdAt: now() }));
  fs.fsyncSync(fd); fs.closeSync(fd);
  const release = () => { if (fs.existsSync(target)) fs.unlinkSync(target); };
  try {
    const result = callback();
    if (result && typeof result.then === "function") return result.finally(release);
    release(); return result;
  } catch (e) { release(); throw e; }
}
function jobRoot(store, jobId) {
  if (!jobPattern.test(jobId || "")) fail("INVALID_JOB_ID");
  return within(store, "jobs/" + jobId);
}
function writeJob(root, relative, value, mutable = false) {
  const target = within(root, relative, { createParent: true });
  if (mutable) atomic(target, value); else exclusive(target, value);
}
function readJob(root, relative) { return readJson(within(root, relative)); }
function receiptFiles(root) {
  const directory = within(root, "receipts");
  return fs.existsSync(directory) ? fs.readdirSync(directory).filter(n => /^\d{6}-[a-z_]+\.json$/.test(n)).sort() : [];
}
function readReceipts(root) {
  let previous = null;
  return receiptFiles(root).map((file, index) => {
    const receipt = readJob(root, "receipts/" + file);
    const { receiptHash, ...body } = receipt;
    if (receipt.sequence !== index + 1 || receipt.previousReceiptHash !== previous || computePayloadHash(body) !== receiptHash) fail("RECEIPT_INTEGRITY_ERROR");
    previous = receiptHash;
    return receipt;
  });
}
function append(root, job, state, stage, nextState, details = {}) {
  const prior = readReceipts(root);
  const updated = { ...state, state: nextState, sequence: prior.length + 1, updatedAt: now() };
  const body = {
    schemaVersion: "1.0.0", jobId: job.jobId, tenantId: "nilaza", workflowId: job.workflowId,
    inputReferenceHashes: job.sourceReferences, outputReference: "inputs/snapshot.json", outputHash: job.inputSnapshotHash,
    redactionVerdict: "not_run", lintVerdict: "not_run", qaVerdict: "not_run", humanDecisionState: "pending",
    sequence: prior.length + 1, stage, occurredAt: now(), stateAfter: nextState,
    sourceMode: job.sourceMode, inputFingerprint: job.inputFingerprint,
    previousReceiptHash: prior.at(-1)?.receiptHash || null, jobHash: computePayloadHash(job),
    externalAuthority: "none", stateSnapshot: updated, ...details
  };
  const receipt = { ...body, receiptHash: computePayloadHash(body) };
  writeJob(root, "receipts/" + String(body.sequence).padStart(6, "0") + "-" + stage + ".json", receipt);
  writeJob(root, "state.json", updated, true);
  return updated;
}
function sourcePath(repoRoot, relative) {
  if (!/^(?:packages|scripts|assets|docs)\//.test(relative)) fail("UNSAFE_SOURCE_REFERENCE");
  return within(repoRoot, relative);
}
function captureSources(repoRoot, snapshot) {
  const paths = new Set([
    ...snapshot.sourceFiles.map(x => x.path),
    ...snapshot.research.sources.map(source => source.reference),
    ...snapshot.productTruth.features.flatMap(feature => feature.evidence.map(evidence => evidence.reference))
  ]);
  for (const relative of fixedSourcePaths) if (fs.existsSync(sourcePath(repoRoot, relative))) paths.add(relative);
  const manifest = readJson(sourcePath(repoRoot, "packages/content/data/brand-identity.json"));
  const visit = value => {
    if (typeof value === "string" && value.startsWith("assets/brand/open-reflection/v1/")) {
      const candidate = sourcePath(repoRoot, value);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) paths.add(value);
    } else if (Array.isArray(value)) value.forEach(visit);
    else if (plain(value)) Object.values(value).forEach(visit);
  };
  visit(manifest);
  if (paths.size > 300) fail("SOURCE_LIMIT_EXCEEDED");
  return [...paths].sort().map(relativePath => ({ relativePath, sha256: hashBytes(fs.readFileSync(sourcePath(repoRoot, relativePath))) }));
}
function sourceIssues(repoRoot, job) {
  return job.sourceReferences.flatMap(reference => {
    try { return hashBytes(fs.readFileSync(sourcePath(repoRoot, reference.relativePath))) === reference.sha256 ? [] : ["source_changed:" + reference.relativePath]; }
    catch { return ["source_missing_or_unsafe:" + reference.relativePath]; }
  });
}
function validateJobRecord(job) {
  if (!plain(job) || !jobPattern.test(job.jobId) || job.tenantId !== "nilaza" || job.workflowId !== "W2_content_factory" || job.mode !== "draft_only" || job.externalAction !== "forbidden" || !SOURCE_MODES.includes(job.sourceMode) || !hashPattern.test(job.inputFingerprint) || !hashPattern.test(job.inputSnapshotHash) || !hashPattern.test(job.inputSeedHash) || !Array.isArray(job.sourceReferences) || job.sourceReferences.length < 9 || job.sourceReferences.length > 300 || job.limits?.maxRenderRetries !== 2) fail("INVALID_JOB_RECORD");
  for (const source of job.sourceReferences) if (!hashPattern.test(source.sha256) || !/^(?:packages|scripts|assets|docs)\//.test(source.relativePath) || source.relativePath.includes("..") || source.relativePath.includes("\\")) fail("INVALID_JOB_RECORD");
}
function frozenInputIssues(root, job) {
  return [["inputs/snapshot.json", job.inputSnapshotHash], ["inputs/seed.json", job.inputSeedHash]].flatMap(([relative, expected]) => {
    try { return computePayloadHash(readJob(root, relative)) === expected ? [] : ["frozen_input_changed:" + relative]; }
    catch { return ["frozen_input_missing_or_corrupt:" + relative]; }
  });
}
function load(storeRoot, jobId, repoRoot) {
  const store = safeStore(storeRoot, repoRoot);
  const root = jobRoot(store, jobId);
  const job = readJob(root, "job.json");
  validateJobRecord(job);
  if (job.jobId !== jobId) fail("INVALID_JOB_RECORD");
  const state = readJob(root, "state.json");
  const receipts = readReceipts(root);
  if (!receipts.length || receipts.some(receipt => receipt.jobHash !== computePayloadHash(job))) fail("JOB_INTEGRITY_ERROR");
  const latest = receipts.at(-1).stateSnapshot;
  const stateMatches = computePayloadHash(state) === computePayloadHash(latest);
  return { store, root, job, state, receipts, stateMatches, inputIssues: frozenInputIssues(root, job) };
}
function intake(value, role, job) {
  keys(value, ["identityKind", "intakeMode", "sourceMode", "role", "agentId", "sessionId", "rootThreadId", "attestedBy", "attestedAt"]);
  if (value.identityKind !== IDENTITY_KIND || !["root_local_program_argument", "owner_cli_attestation"].includes(value.intakeMode) || value.role !== role || value.sourceMode !== job.sourceMode) fail("UNTRUSTED_INTAKE", "Separate operator-attested intake matching the job lineage is required.");
  for (const field of ["agentId", "sessionId", "rootThreadId", "attestedBy"]) { text(value[field], 300); if (/[\r\n]/.test(value[field])) fail("UNTRUSTED_INTAKE"); }
  timestamp(value.attestedAt);
  return structuredClone(value);
}
function validatePacket(packet, job, snapshot) {
  keys(packet, ["schemaVersion", "jobId", "briefId", "copy", "slides", "research", "strategy"], ["schemaVersion", "jobId", "briefId", "copy", "slides"]);
  if (packet.schemaVersion !== "1.0.0" || packet.jobId !== job.jobId || packet.briefId !== job.briefId || Buffer.byteLength(JSON.stringify(packet)) > maxPacketBytes) fail("INVALID_AUTHOR_PACKET");
  keys(packet.copy, ["vi", "en"]);
  for (const locale of ["vi", "en"]) { keys(packet.copy[locale], copyFields); copyFields.forEach(field => safeText(packet.copy[locale][field])); }
  if (!Array.isArray(packet.slides) || packet.slides.length !== 3) fail("INVALID_SLIDE_COUNT", "The pilot requires exactly three bilingual slides.");
  for (const slide of packet.slides) {
    keys(slide, ["vi", "en"]);
    for (const locale of ["vi", "en"]) { keys(slide[locale], slideFields); slideFields.forEach(field => safeText(slide[locale][field])); }
  }
  const allowedResearchRefs = new Set(snapshot.research.sources.map(x => x.reference));
  if (packet.research !== undefined) {
    keys(packet.research, ["facts", "hypotheses", "sourceRefs"], []);
    for (const field of ["facts", "hypotheses", "sourceRefs"]) {
      if (packet.research[field] === undefined) continue;
      if (!Array.isArray(packet.research[field]) || packet.research[field].length > 20) fail("INVALID_RESEARCH_PACKET");
      packet.research[field].forEach(safeText);
      if (field === "sourceRefs" && packet.research[field].some(ref => !allowedResearchRefs.has(ref))) fail("UNAPPROVED_RESEARCH_SOURCE");
    }
  }
  if (packet.strategy !== undefined) {
    keys(packet.strategy, ["proposals", "notes"], []);
    for (const value of Object.values(packet.strategy)) { if (!Array.isArray(value) || value.length > 20) fail("INVALID_STRATEGY_PACKET"); value.forEach(safeText); }
  }
  const payload = [packet.copy, packet.slides, packet.research, packet.strategy].filter(Boolean);
  const codes = lintCandidate({ text: JSON.stringify(payload), surface: "internal_draft", hasVi: true, hasEn: true, evidenceVerified: true, requiredLocales: ["vi", "en"], copyLocales: ["vi", "en"], knownForeignBrandTokens: ["FOREIGN_TENANT_BRAND"] });
  if (codes.length) fail("AUTHOR_LINT_BLOCKED", "Author packet failed deterministic controls: " + codes.join(","));
}
function currentOrFail(repoRoot, job) {
  const mismatches = sourceIssues(repoRoot, job);
  if (mismatches.length) fail("SOURCE_CHANGED", "Prepared source inputs changed; create a new job.");
}
function verifyCandidate(root, state) {
  if (!state.candidateReference) return null;
  const candidate = readJob(root, state.candidateReference);
  if (computeReviewableArtifactHash(candidate) !== state.candidateHash) fail("CANDIDATE_INTEGRITY_ERROR");
  if (computePayloadHash(readJob(root, state.authorPacketReference)) !== state.authorPacketHash) fail("AUTHOR_PACKET_INTEGRITY_ERROR");
  if (computePayloadHash(readJob(root, state.authorIntakeReference)) !== state.authorIntakeHash) fail("AUTHOR_INTAKE_INTEGRITY_ERROR");
  return candidate;
}
function walkFiles(directory, prefix = "") {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const relative = prefix + entry.name;
    if (entry.isSymbolicLink()) fail("UNSAFE_RENDER_PATH");
    return entry.isDirectory() ? walkFiles(path.join(directory, entry.name), relative + "/") : [relative];
  }).sort();
}
function inspectBundle(root, state) {
  if (!state.creativeManifestReference) return null;
  const manifest = readJob(root, state.creativeManifestReference);
  const { bundleHash, ...body } = manifest;
  if (computePayloadHash(body) !== bundleHash || state.creativeBundleHash !== bundleHash) fail("CREATIVE_MANIFEST_INTEGRITY_ERROR");
  const directory = within(root, manifest.outputDirectory);
  const actual = walkFiles(directory);
  if (JSON.stringify(actual) !== JSON.stringify(manifest.files.map(x => x.relativePath).sort())) fail("CREATIVE_FILE_SET_CHANGED");
  for (const file of manifest.files) {
    const bytes = fs.readFileSync(within(directory, file.relativePath));
    if (bytes.length !== file.byteLength || hashBytes(bytes) !== file.sha256) fail("CREATIVE_FILE_INTEGRITY_ERROR");
  }
  return manifest;
}
export function prepareJob({ repoRoot, storeRoot, jobId, briefId, idempotencyKey, sourceMode = "actual_ai_session_handback" }) {
  if (!jobPattern.test(jobId || "")) fail("INVALID_JOB_ID");
  if (!SOURCE_MODES.includes(sourceMode)) fail("INVALID_SOURCE_MODE");
  text(idempotencyKey, 200);
  if (!/^[A-Za-z0-9:_-]+$/.test(idempotencyKey)) fail("INVALID_IDEMPOTENCY_KEY");
  const repo = assertNoLinks(repoRoot, { directory: true });
  const validation = validateGrowthPilot(repo);
  if (validation.errors.length) fail("GROWTH_READINESS_BLOCKED", "Canonical Growth validation must pass before preparing an internal job.");
  const snapshot = buildAdminGrowthSnapshot(repo);
  const brief = snapshot.briefs.find(x => x.id === briefId);
  if (!brief || !brief.formats.includes("carousel")) fail("UNSUPPORTED_BRIEF", "The local pilot requires a canonical carousel brief.");
  const seed = snapshot.assets.find(x => x.briefId === briefId && x.format === "carousel");
  if (!seed) fail("UNSUPPORTED_BRIEF");
  const sourceReferences = captureSources(repo, snapshot);
  const inputFingerprint = computePayloadHash({ sourceReferences, briefId, format: "carousel", locales: ["vi", "en"], sourceMode, runtimeVersion: RUNTIME_VERSION });
  const store = safeStore(storeRoot, repo, true);
  return lock(store, "prepare", () => {
    const keyHash = computePayloadHash(idempotencyKey).slice(7);
    const keyPath = within(store, "keys/" + keyHash + ".json", { createParent: true });
    if (fs.existsSync(keyPath)) {
      const existing = readJson(keyPath);
      if (existing.inputFingerprint !== inputFingerprint) fail("IDEMPOTENCY_CONFLICT", "The same key cannot be reused with changed inputs.");
      return { ...inspectJob({ repoRoot: repo, storeRoot: store, jobId: existing.jobId }), idempotent: true };
    }
    const fingerprintPath = within(store, "fingerprints/" + inputFingerprint.slice(7) + ".json", { createParent: true });
    if (fs.existsSync(fingerprintPath)) {
      const existing = readJson(fingerprintPath);
      exclusive(keyPath, { jobId: existing.jobId, inputFingerprint });
      return { ...inspectJob({ repoRoot: repo, storeRoot: store, jobId: existing.jobId }), idempotent: true };
    }
    const root = jobRoot(store, jobId);
    if (fs.existsSync(root)) fail("JOB_ID_CONFLICT");
    assertNoLinks(root, { create: true, directory: true });
    const job = {
      schemaVersion: "1.0.0", jobId, tenantId: "nilaza", workflowId: "W2_content_factory", briefId,
      createdAt: now(), runtimeVersion: RUNTIME_VERSION, mode: "draft_only", externalAction: "forbidden",
      sourceMode, identityKind: IDENTITY_KIND, idempotencyKey, inputFingerprint, sourceReferences,
      inputSnapshotHash: computePayloadHash(snapshot), inputSeedHash: computePayloadHash({ brief, seed }),
      inputArtifactReferences: sourceReferences.map(reference => reference.relativePath), outputArtifactType: "concept_copy_package",
      allowedDataClasses: ["sanitized_tenant_config", "approved_public_research", "licensed_or_approved_asset_reference"],
      format: "carousel", locales: ["vi", "en"], promptVersion: "root-session-handback-v1",
      qualityGateVersion: "growth_core_1", limits: { maxRenderRetries: 2, maxRepairCycles: 2, maxPacketBytes, maxFileBytes, maxBundleBytes }
    };
    writeJob(root, "job.json", job);
    writeJob(root, "inputs/snapshot.json", snapshot);
    writeJob(root, "inputs/seed.json", { brief, seed });
    const initial = { state: "prepared", sequence: 0, revision: 0, renderAttempts: 0, ownerDecision: "pending", createdAt: now() };
    append(root, job, initial, "prepare", "prepared", { redactionVerdict: "pass", lintVerdict: "not_run", qaVerdict: "not_run", humanDecisionState: "pending", roles: ["growth_orchestrator", "product_truth_claim_guard"], operationKind: "local_readiness_check" });
    exclusive(fingerprintPath, { jobId, inputFingerprint });
    exclusive(keyPath, { jobId, inputFingerprint });
    return { ...inspectJob({ repoRoot: repo, storeRoot: store, jobId }), idempotent: false };
  });
}
export function acceptAuthorPacket({ repoRoot, storeRoot, jobId, packet, trustedIntake }) {
  const loaded = load(storeRoot, jobId, repoRoot);
  return lock(loaded.store, "author", () => {
    const { root, job } = loaded;
    let { state } = loaded;
    currentOrFail(repoRoot, job);
    if (loaded.inputIssues.length) fail("INPUT_SNAPSHOT_INTEGRITY_ERROR");
    if (!loaded.stateMatches) fail("STATE_RECONCILIATION_REQUIRED");
    const provenance = intake(trustedIntake, "content_studio", job);
    const snapshot = readJob(root, "inputs/snapshot.json");
    validatePacket(packet, job, snapshot);
    const packetHash = computePayloadHash(packet);
    if (state.authorPacketHash === packetHash) {
      const archived = readJob(root, state.authorIntakeReference);
      verifyCandidate(root, state);
      timestamp(archived.attestedAt);
      const { attestedAt: archivedAttestedAt, ...archivedIdentity } = archived;
      const { attestedAt: incomingAttestedAt, ...incomingIdentity } = provenance;
      if (computePayloadHash(archivedIdentity) !== computePayloadHash(incomingIdentity)) fail("INTAKE_CONFLICT");
      return { ...inspectJob({ repoRoot, storeRoot: loaded.store, jobId }), idempotent: true };
    }
    if (!["prepared", "qa_revision_required", "owner_revision_requested"].includes(state.state)) fail("INVALID_TRANSITION");
    if (state.revision >= 3) fail("REPAIR_BUDGET_EXHAUSTED");
    const revision = state.revision + 1;
    const base = "candidates/v" + revision;
    const { seed } = readJob(root, "inputs/seed.json");
    const candidate = {
      ...structuredClone(seed), id: "runtime-" + jobId + "-v" + revision, tenantId: "nilaza",
      version: "1.0." + (revision - 1), artifactKind: "concept_copy_package",
      status: "draft_internal", lifecycleState: "draft_internal",
      copy: structuredClone(packet.copy),
      qa: { automatedVerdict: "pass", independentQaStatus: "not_reviewed", hardFailureCodes: [], softScores: {}, reviewerRole: "independent_review_pending", repairCycles: revision - 1 },
      approval: { status: "not_submitted", artifactHash: null, targetChannel: null, expiry: null },
      externalReadiness: { status: "blocked", blockingGates: [...seed.externalReadiness.blockingGates] },
      productionRecord: {
        skillVersion: RUNTIME_VERSION, source: job.sourceMode,
        modelVersion: "operator-attested-ai-session-model-unrecorded", timeEstimateMinutes: null,
        costUsd: null, costStatus: "unavailable_session_cost",
        authorPacketHash: packetHash, sourceFingerprint: job.inputFingerprint
      }
    };
    delete candidate.reviewUpdate;
    const errors = validateContractInstance(repoRoot, "schemas/asset-package.schema.json", candidate, "runtime candidate");
    if (errors.length) fail("CANDIDATE_SCHEMA_REJECTED", "Generated candidate does not match the canonical asset contract.");
    writeJob(root, base + "/packet.json", packet);
    writeJob(root, base + "/candidate.json", candidate);
    writeJob(root, base + "/intake.json", provenance);
    state = { ...state, revision, renderAttempts: 0, authorPacketHash: packetHash,
      candidateReference: base + "/candidate.json", candidateHash: computeReviewableArtifactHash(candidate),
      authorPacketReference: base + "/packet.json", authorIntakeReference: base + "/intake.json", authorIntakeHash: computePayloadHash(provenance),
      creativeManifestReference: null, creativeBundleHash: null, qaReference: null, qaHash: null, ownerReviewReference: null, ownerReviewHash: null, ownerDecision: "pending" };
    state = append(root, job, state, "research", "author_packet_accepted", { roles: ["research_jtbd", "product_truth_claim_guard"], operationKind: packet.research ? (job.sourceMode === "fixture" ? "fixture_research_handback" : "actual_session_research_handback") : "research_not_supplied", inputReferenceHashes: job.sourceReferences, outputReference: base + "/packet.json", outputHash: packetHash, trustedIntakeReference: base + "/intake.json" });
    state = append(root, job, state, "strategy", "author_packet_accepted", { roles: ["positioning_experiment", "growth_orchestrator"], operationKind: packet.strategy ? (job.sourceMode === "fixture" ? "fixture_strategy_handback" : "actual_session_strategy_handback") : "strategy_not_supplied", outputReference: base + "/packet.json", outputHash: packetHash, trustedIntakeReference: base + "/intake.json" });
    append(root, job, state, "author", "awaiting_render", { roles: ["content_studio"], operationKind: "session_content_handback", outputReference: base + "/candidate.json", outputHash: state.candidateHash, trustedIntakeReference: base + "/intake.json", redactionVerdict: "pass", lintVerdict: "pass", qaVerdict: "not_run", humanDecisionState: "pending" });
    return inspectJob({ repoRoot, storeRoot: loaded.store, jobId });
  });
}
function fileRecord(outputDir, file) {
  if (typeof file !== "string" || !/^[a-z0-9][a-z0-9._-]{0,100}\.(?:png|svg|html|json)$/i.test(file)) fail("UNSAFE_RENDER_PATH");
  const target = within(outputDir, file);
  const info = fs.lstatSync(target);
  if (!info.isFile() || info.size <= 0 || info.size > maxFileBytes) fail("INVALID_RENDER_FILE");
  const bytes = fs.readFileSync(target);
  const extension = path.extname(file).toLowerCase();
  const entry = { relativePath: file, sha256: hashBytes(bytes), byteLength: bytes.length, mimeType: ({ ".png": "image/png", ".svg": "image/svg+xml", ".html": "text/html", ".json": "application/json" })[extension] };
  if (extension === ".png") {
    if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.toString("ascii", 12, 16) !== "IHDR") fail("INVALID_PNG");
    entry.width = bytes.readUInt32BE(16); entry.height = bytes.readUInt32BE(20);
    if (entry.width < 1 || entry.height < 1 || entry.width > 8192 || entry.height > 8192) fail("INVALID_IMAGE_DIMENSIONS");
  }
  const slide = /^slide-(vi|en)-(0[1-3])\.png$/.exec(file);
  if (slide) { entry.locale = slide[1]; entry.pageIndex = Number(slide[2]); }
  return entry;
}
export async function renderJob({ repoRoot, storeRoot, jobId, renderer }) {
  const loaded = load(storeRoot, jobId, repoRoot);
  return lock(loaded.store, "render", async () => {
    const { root, job } = loaded;
    let { state } = loaded;
    currentOrFail(repoRoot, job);
    if (loaded.inputIssues.length) fail("INPUT_SNAPSHOT_INTEGRITY_ERROR");
    if (!loaded.stateMatches) fail("STATE_RECONCILIATION_REQUIRED");
    if (["awaiting_independent_qa", "awaiting_owner_review", "fixture_complete", "owner_kept_internal"].includes(state.state)) {
      verifyCandidate(root, state); inspectBundle(root, state);
      return { ...inspectJob({ repoRoot, storeRoot: loaded.store, jobId }), idempotent: true };
    }
    if (!["awaiting_render", "render_retryable", "render_interrupted"].includes(state.state)) fail("INVALID_TRANSITION");
    if (state.renderAttempts >= 3) fail("RENDER_RETRY_BUDGET_EXHAUSTED");
    if (typeof renderer !== "function") fail("RENDERER_REQUIRED");
    const candidate = verifyCandidate(root, state);
    const packet = readJob(root, state.authorPacketReference);
    if (computePayloadHash(packet) !== state.authorPacketHash) fail("AUTHOR_PACKET_INTEGRITY_ERROR");
    const attempt = state.renderAttempts + 1;
    const outputDirectory = "renders/v" + state.revision + "/attempt-" + String(attempt).padStart(2, "0") + "/files";
    const outputDir = within(root, outputDirectory, { createParent: true });
    assertNoLinks(outputDir, { create: true, directory: true });
    state = append(root, job, { ...state, renderAttempts: attempt, currentOutputDirectory: outputDirectory }, "render_started", "rendering", { renderAttempt: attempt, renderRetryCount: attempt - 1, operationKind: "trusted_local_renderer" });
    try {
      const result = await renderer({ repoRoot, outputDir, packet: structuredClone(packet), candidate: structuredClone(candidate) });
      currentOrFail(repoRoot, job);
    if (loaded.inputIssues.length) fail("INPUT_SNAPSHOT_INTEGRITY_ERROR");
      if (!plain(result) || !Array.isArray(result.files) || result.files.length !== 9 || new Set(result.files).size !== result.files.length) fail("INVALID_RENDER_MANIFEST", "The three-slide bilingual pilot requires six PNGs and three review sidecars.");
      const expected = ["slide-vi-01.png", "slide-vi-02.png", "slide-vi-03.png", "slide-en-01.png", "slide-en-02.png", "slide-en-03.png", "review.html", "copy.json", "layout.json"].sort();
      if (JSON.stringify([...result.files].sort()) !== JSON.stringify(expected) || JSON.stringify(walkFiles(outputDir)) !== JSON.stringify(expected)) fail("INVALID_RENDER_FILE_SET");
      const files = result.files.map(file => fileRecord(outputDir, file)).sort((a, b) => a.relativePath.localeCompare(b.relativePath));
      if (files.reduce((sum, file) => sum + file.byteLength, 0) > maxBundleBytes) fail("RENDER_OUTPUT_LIMIT");
      const body = { schemaVersion: "1.0.0", jobId, tenantId: "nilaza", sourceMode: job.sourceMode,
        candidateHash: state.candidateHash, inputFingerprint: job.inputFingerprint,
        rendererVersion: typeof result.rendererVersion === "string" ? result.rendererVersion : "trusted-local-renderer-v1",
        format: "carousel", locales: ["vi", "en"], outputDirectory, files,
        deterministicRenderVerdict: "pass", visualReviewStatus: "not_reviewed", externalAuthority: "none" };
      const manifest = { ...body, bundleHash: computePayloadHash(body) };
      const manifestReference = "manifests/v" + state.revision + ".json";
      writeJob(root, manifestReference, manifest);
      state = append(root, job, { ...state, creativeManifestReference: manifestReference, creativeBundleHash: manifest.bundleHash }, "render", "awaiting_independent_qa", { roles: ["content_studio", "distribution_planner"], operationKind: "local_creative_render_and_package", outputReference: manifestReference, outputHash: manifest.bundleHash, redactionVerdict: "pass", lintVerdict: "pass", qaVerdict: "not_run", humanDecisionState: "pending", renderAttempt: attempt, renderRetryCount: attempt - 1 });
      return inspectJob({ repoRoot, storeRoot: loaded.store, jobId });
    } catch (error) {
      const failureCode = typeof error?.code === "string" && /^[A-Z0-9_]{1,80}$/.test(error.code) ? error.code : "RENDERER_FAILED";
      const terminal = failureCode === "SOURCE_CHANGED" || ["UNSAFE_RENDER_PATH", "UNSAFE_PATH", "PRIVATE_MATERIAL_REJECTED"].includes(failureCode) || attempt >= 3;
      append(root, job, state, "render_failed", failureCode === "SOURCE_CHANGED" ? "invalidated" : terminal ? "failed" : "render_retryable", { failureCode, renderAttempt: attempt, renderRetryCount: attempt - 1, outputVerified: false });
      return inspectJob({ repoRoot, storeRoot: loaded.store, jobId });
    }
  });
}
function validateQa(verdict, candidate, job) {
  keys(verdict, ["tenantId", "artifactId", "artifactVersion", "artifactHash", "rubricVersion", "verdict", "hardFailureCodes", "softScores", "reviewerRole", "reviewedAt"]);
  if (Buffer.byteLength(JSON.stringify(verdict)) > maxPacketBytes) fail("QA_PAYLOAD_LIMIT");
  for (const field of ["tenantId", "artifactId", "artifactVersion", "artifactHash", "rubricVersion", "verdict", "reviewerRole", "reviewedAt"]) safeText(verdict[field]);
  if (!Array.isArray(verdict.hardFailureCodes) || verdict.hardFailureCodes.length > 50 || !plain(verdict.softScores) || Object.keys(verdict.softScores).some(key => !requiredSoftDimensions.includes(key))) fail("INVALID_QA_RECORD");
  verdict.hardFailureCodes.forEach(code => { text(code, 100); });
  if (Object.values(verdict.softScores).some(score => !Number.isFinite(score) || score < 0 || score > 4)) fail("QA_SCORE_REJECTED");
  const errors = validateContractInstance(job.repoRoot, "schemas/qa-verdict.schema.json", verdict, "runtime QA");
  if (errors.length || verdict.tenantId !== "nilaza" || verdict.artifactId !== candidate.id || verdict.artifactVersion !== candidate.version || verdict.artifactHash !== computeReviewableArtifactHash(candidate) || verdict.reviewerRole !== "independent_qa" || verdict.rubricVersion !== job.qualityGateVersion) fail("QA_BINDING_REJECTED");
  timestamp(verdict.reviewedAt); text(verdict.rubricVersion, 200);
  const knownCodes = new Set(JSON.parse(fs.readFileSync(sourcePath(job.repoRoot, "packages/growth-core/config/quality-gates.json"), "utf8")).hardFailCodes);
  if (verdict.hardFailureCodes.some(code => !knownCodes.has(code))) fail("UNKNOWN_QA_FINDING");
  if (verdict.verdict === "pass") {
    if (verdict.hardFailureCodes.length || !plain(verdict.softScores) || Object.keys(verdict.softScores).sort().join(",") !== [...requiredSoftDimensions].sort().join(",")) fail("QA_SCORE_REJECTED");
    const scores = requiredSoftDimensions.map(key => verdict.softScores[key]);
    if (scores.some(score => !Number.isFinite(score) || score < 3 || score > 4) || scores.reduce((a, b) => a + b, 0) / scores.length < 3.25) fail("QA_SCORE_REJECTED");
  }
}
export function submitQa({ repoRoot, storeRoot, jobId, verdict, creativeBundleHash, inputFingerprint, trustedIntake }) {
  const loaded = load(storeRoot, jobId, repoRoot);
  return lock(loaded.store, "qa", () => {
    const { root, job } = loaded;
    let { state } = loaded;
    currentOrFail(repoRoot, job);
    if (loaded.inputIssues.length) fail("INPUT_SNAPSHOT_INTEGRITY_ERROR");
    if (!loaded.stateMatches) fail("STATE_RECONCILIATION_REQUIRED");
    const reviewer = intake(trustedIntake, "independent_qa", job);
    const author = readJob(root, state.authorIntakeReference);
    if (computePayloadHash(author) !== state.authorIntakeHash) fail("AUTHOR_INTAKE_INTEGRITY_ERROR");
    if (reviewer.agentId === author.agentId || reviewer.sessionId === author.sessionId) fail("QA_NOT_INDEPENDENT", "The reviewer must have a different agent and session from the author.");
    const candidate = verifyCandidate(root, state);
    const manifest = inspectBundle(root, state);
    if (!manifest || creativeBundleHash !== manifest.bundleHash || inputFingerprint !== job.inputFingerprint) fail("QA_BINDING_REJECTED");
    validateQa(verdict, candidate, { ...job, repoRoot });
    const envelope = { schemaVersion: "1.0.0", sourceMode: job.sourceMode, identityKind: IDENTITY_KIND, inputFingerprint, creativeBundleHash, candidateHash: state.candidateHash, verdict, trustedIntake: reviewer };
    if (state.qaReference) {
      const existing = readJob(root, state.qaReference);
      if (computePayloadHash(existing) === computePayloadHash(envelope)) return { ...inspectJob({ repoRoot, storeRoot: loaded.store, jobId }), idempotent: true };
      fail("QA_ALREADY_RECORDED");
    }
    if (state.state !== "awaiting_independent_qa") fail("INVALID_TRANSITION");
    const qaReference = "qa/v" + state.revision + ".json";
    writeJob(root, qaReference, envelope);
    state = { ...state, qaReference, qaHash: computePayloadHash(envelope) };
    const next = verdict.verdict === "block" ? "qa_blocked" : verdict.verdict === "revise" ? "qa_revision_required" : job.sourceMode === "fixture" ? "fixture_complete" : "awaiting_owner_review";
    append(root, job, state, "qa", next, { roles: ["independent_qa"], operationKind: job.sourceMode === "fixture" ? "fixture_review" : "independent_session_review", candidateHash: state.candidateHash, creativeBundleHash, outputReference: qaReference, outputHash: state.qaHash, qaVerdict: verdict.verdict, humanDecisionState: "pending", identityKind: IDENTITY_KIND });
    append(root, job, readJob(root, "state.json"), "learning", next, { roles: ["journey_measurement"], operationKind: "operational_learning_only", productKpiStatus: "not_collected", qaOutcome: verdict.verdict, humanDecisionState: "pending" });
    return inspectJob({ repoRoot, storeRoot: loaded.store, jobId });
  });
}
export function inspectJob({ repoRoot, storeRoot, jobId }) {
  const loaded = load(storeRoot, jobId, repoRoot);
  const { root, job, state, receipts } = loaded;
  const issues = [...loaded.inputIssues, ...(repoRoot ? sourceIssues(repoRoot, job) : [])];
  if (!loaded.stateMatches) issues.push("state_reconciliation_required");
  let candidate = null, packet = null, creativeManifest = null, qa = null, ownerReview = null;
  try {
    candidate = verifyCandidate(root, state);
    if (state.authorPacketReference) { packet = readJob(root, state.authorPacketReference); if (computePayloadHash(packet) !== state.authorPacketHash) issues.push("author_packet_hash_changed"); }
    creativeManifest = inspectBundle(root, state);
    if (state.qaReference) { qa = readJob(root, state.qaReference); if (computePayloadHash(qa) !== state.qaHash) issues.push("qa_record_hash_changed"); }
    if (state.ownerReviewReference) { ownerReview = readJob(root, state.ownerReviewReference); if (computePayloadHash(ownerReview) !== state.ownerReviewHash) issues.push("owner_review_hash_changed"); }
  } catch (e) { issues.push(e.code || "artifact_integrity_error"); }
  return { jobId, state: issues.length ? "invalidated" : state.state, recordedState: state.state, sourceMode: job.sourceMode,
    job, history: receipts.map(x => ({ sequence: x.sequence, stage: x.stage, state: x.stateAfter, occurredAt: x.occurredAt })),
    receipts, candidate, packet, creativeManifest, qa, ownerReview,
    integrity: { valid: issues.length === 0, issues }, sourceStatus: issues.some(x => x.startsWith("source_")) ? "stale" : "current",
    productKpiStatus: "not_collected", externalAuthority: "none", humanDecisionState: state.ownerDecision,
    renderAttempts: state.renderAttempts };
}
export function reconcileJob({ repoRoot, storeRoot, jobId }) {
  const store = safeStore(storeRoot, repoRoot);
  const lockPath = within(store, "runtime.lock");
  if (fs.existsSync(lockPath)) {
    const held = readJson(lockPath);
    if (!Number.isSafeInteger(held.pid) || held.pid <= 0) fail("INVALID_LOCK");
    let alive = true;
    try { process.kill(held.pid, 0); } catch (e) { if (e.code === "ESRCH") alive = false; }
    if (alive) fail("RUNTIME_BUSY");
    fs.renameSync(lockPath, within(store, "recovered-lock-" + randomUUID() + ".json"));
  }
  return lock(store, "reconcile", () => {
    const loaded = load(store, jobId, repoRoot);
    const { root, job } = loaded;
    let { state } = loaded;
    if (!loaded.stateMatches) {
      state = loaded.receipts.at(-1).stateSnapshot;
      writeJob(root, "state.json", state, true);
    }
    const inspection = inspectJob({ repoRoot, storeRoot: store, jobId });
    if (!inspection.integrity.valid) {
      append(root, job, state, "reconcile", "invalidated", { failureCode: "REVIEW_INPUT_INTEGRITY_CHANGED", mismatchedReferences: inspection.integrity.issues, qaVerdict: "invalidated", humanDecisionState: "pending" });
    } else if (state.state === "rendering") {
      const manifestReference = "manifests/v" + state.revision + ".json";
      if (fs.existsSync(within(root, manifestReference))) {
        const manifest = readJob(root, manifestReference);
        const recovered = { ...state, creativeManifestReference: manifestReference, creativeBundleHash: manifest.bundleHash };
        inspectBundle(root, recovered);
        append(root, job, recovered, "reconcile", "awaiting_independent_qa", { operationKind: "verified_render_recovery", qaVerdict: "not_run", humanDecisionState: "pending" });
      } else {
        append(root, job, state, "reconcile", state.renderAttempts >= 3 ? "failed" : "render_interrupted", { failureCode: "RENDER_INTERRUPTED", outputVerified: false, qaVerdict: "not_run", humanDecisionState: "pending" });
      }
    }
    return inspectJob({ repoRoot, storeRoot: store, jobId });
  });
}
export function recordOwnerReview({ repoRoot, storeRoot, jobId, decision = "pending", reason, trustedIntake }) {
  const loaded = load(storeRoot, jobId, repoRoot);
  return lock(loaded.store, "owner_review", () => {
    const { root, job, state } = loaded;
    currentOrFail(repoRoot, job);
    if (loaded.inputIssues.length) fail("INPUT_SNAPSHOT_INTEGRITY_ERROR");
    if (!loaded.stateMatches || !inspectJob({ repoRoot, storeRoot: loaded.store, jobId }).integrity.valid) fail("STALE_OWNER_REVIEW");
    if (job.sourceMode !== "actual_ai_session_handback" || state.state !== "awaiting_owner_review") fail("OWNER_REVIEW_NOT_READY");
    const provenance = intake(trustedIntake, "owner", job);
    if (!["pending", "revise", "accepted_internal"].includes(decision)) fail("EXTERNAL_APPROVAL_FORBIDDEN");
    safeText(reason);
    const review = { schemaVersion: "1.0.0", jobId, decision, reason, reviewedAt: now(), candidateHash: state.candidateHash, creativeBundleHash: state.creativeBundleHash, qaHash: state.qaHash, trustedIntake: provenance, externalAuthority: "none" };
    const reference = "owner-review/v" + state.revision + "-" + String(state.sequence + 1) + ".json";
    writeJob(root, reference, review);
    const next = decision === "pending" ? "awaiting_owner_review" : decision === "revise" ? "owner_revision_requested" : "owner_kept_internal";
    append(root, job, { ...state, ownerDecision: decision, ownerReviewReference: reference, ownerReviewHash: computePayloadHash(review) }, "owner_review", next, { operationKind: "local_operator_review_only", humanDecisionState: decision, outputReference: reference, outputHash: computePayloadHash(review), externalAuthority: "none" });
    return inspectJob({ repoRoot, storeRoot: loaded.store, jobId });
  });
}
export function listJobs({ repoRoot, storeRoot }) {
  const store = safeStore(storeRoot, repoRoot);
  const directory = within(store, "jobs");
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isDirectory() && jobPattern.test(entry.name)).map(entry => inspectJob({ repoRoot, storeRoot: store, jobId: entry.name }));
}
