import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const profilePath = "docs/release/release-profile.json";
const hashPattern = /^[a-f0-9]{64}$/;
const identityPattern = /^[a-z]{20}$/;
const targetFields = ["id", "kind", "organizationId", "projectRef"];
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const sameTarget = (left, right) => isObject(left) && isObject(right) && targetFields.every((key) => left[key] === right[key]);
export const evidenceSha256 = (bytes) => crypto.createHash("sha256").update(bytes.toString("utf8").replace(/\r\n/g, "\n")).digest("hex");
export const migrationSetSha256 = (migrations) => evidenceSha256(Buffer.from(JSON.stringify(migrations)));

function readFile(rootDir, relativePath) {
  if (typeof relativePath !== "string" || !relativePath || /[\\:*?\[\]\0]/.test(relativePath)
    || relativePath.startsWith("/") || relativePath.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("unsafe repository path");
  }
  const root = fs.realpathSync(rootDir);
  const absolute = fs.realpathSync(path.resolve(root, relativePath));
  if (!absolute.startsWith(`${root}${path.sep}`) || !fs.statSync(absolute).isFile()) throw new Error("file outside repository or not a file");
  return fs.readFileSync(absolute);
}

function loadReference(reference, rootDir, label, errors, blockers) {
  if (!isObject(reference) || !reference.path || !reference.sha256) {
    blockers.push(`${label}: missing file/hash evidence`);
    return null;
  }
  if (!hashPattern.test(reference.sha256)) { errors.push(`${label}: invalid SHA-256`); return null; }
  try {
    const bytes = readFile(rootDir, reference.path);
    if (evidenceSha256(bytes) !== reference.sha256) { errors.push(`${label}: stale or mismatched file hash`); return null; }
    const value = JSON.parse(bytes.toString("utf8"));
    if (!isObject(value)) throw new Error("evidence must be an object");
    return value;
  } catch { errors.push(`${label}: unreadable JSON or unsafe repository path`); return null; }
}

function freshTimestamp(value, now, maxAgeMs) {
  const timestamp = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(timestamp) && timestamp <= now + 300000 && timestamp >= now - maxAgeMs;
}

// Read-only evidence validation. This does not execute SQL or grant release authority.
export function validateDatabaseTargetManifest(manifest, { rootDir = repositoryRoot, expectedTarget, now = Date.now() } = {}) {
  const errors = [], blockers = [];
  const finish = () => ({ resultType: "DatabaseTargetEvidenceValidation", status: errors.length ? "FAIL" : blockers.length ? "BLOCKED" : "PASS", errors, blockers });
  if (!isObject(manifest) || manifest.schemaVersion !== 1) { errors.push("Manifest schemaVersion must be 1"); return finish(); }
  if (!["draft", "ready_for_review"].includes(manifest.status)) errors.push("Manifest status must be draft or ready_for_review");
  if (manifest.status === "draft") blockers.push("Manifest is a draft; no execution readiness");
  if (!["bootstrap", "forward"].includes(manifest.operation)) errors.push("Only bootstrap or forward operations are supported; repair is prohibited");
  const target = manifest.target;
  if (!isObject(target) || !target.projectRef) { blockers.push("Exact project target has not been selected and verified"); return finish(); }
  if (typeof target.id !== "string" || !target.id.trim() || !["staging", "production"].includes(target.kind) || !identityPattern.test(target.projectRef) || !identityPattern.test(target.organizationId)) {
    errors.push("Target identity must include valid id, environment, organizationId and projectRef");
  }
  if (expectedTarget !== undefined && !sameTarget(target, expectedTarget)) errors.push("Plan databaseTarget does not match manifest target");
  let profile;
  try {
    const bytes = readFile(rootDir, profilePath);
    profile = JSON.parse(bytes.toString("utf8"));
    if (!isObject(profile) || profile.schemaVersion !== 1 || profile.projectId !== "nilaza") throw new Error("invalid release profile");
    if (manifest.profileSha256 !== evidenceSha256(bytes)) errors.push("Release profile hash is missing or stale");
  } catch { errors.push("Release profile is missing or invalid"); return finish(); }
  if (!Array.isArray(profile.targets) || !profile.targets.some((entry) => sameTarget(entry, target))) blockers.push("Target is not registered in the independent release allowlist");
  const expectedOrganization = profile.environmentPolicy?.[`${target.kind}OrganizationId`];
  if (!expectedOrganization || expectedOrganization !== target.organizationId) errors.push("Target violates release environment organization boundary");
  const resourcePolicy = profile.environmentPolicy?.databaseResourcePolicies?.[target.kind];
  if (!isObject(resourcePolicy)) blockers.push("Exact target resource policy is missing");
  else {
    if (!sameTarget(resourcePolicy.target, target)) errors.push("Resource policy does not bind exact target identity");
    const supportedSize = resourcePolicy.organizationPlan === "free" ? "nano" : resourcePolicy.organizationPlan === "pro" ? "micro" : null;
    if (!supportedSize || resourcePolicy.compute !== supportedSize || resourcePolicy.region !== "ap-southeast-1"
      || resourcePolicy.postgresMajor !== 17 || !Array.isArray(resourcePolicy.paidAddons) || resourcePolicy.paidAddons.length) {
      errors.push("Resource policy must specify reviewed Free/Nano or Pro/Micro, Singapore, Postgres17 and no paid add-ons");
    }
  }

  const ledger = loadReference(manifest.ledger, rootDir, "Target ledger", errors, blockers);
  if (ledger) {
    if (!sameTarget(ledger.target, target)) errors.push("Target ledger identity mismatch");
    if (ledger.status !== "reconciled") blockers.push(`Target ledger blocks database write: ${String(ledger.status)}`);
    if (!Array.isArray(ledger.localOnly) || !Array.isArray(ledger.remoteOnly) || ledger.localOnly.length || ledger.remoteOnly.length) blockers.push("Target ledger has unresolved migration divergence");
    if (!freshTimestamp(ledger.checkedAt, now, 86400000)) blockers.push("Target ledger readback is missing or older than 24 hours");
    if (!Array.isArray(ledger.migrationVersions) || !ledger.migrationVersions.every((version) => /^\d{12,14}$/.test(version))) errors.push("Target ledger migrationVersions is invalid");
    else if (manifest.operation === "bootstrap" && ledger.migrationVersions.length) errors.push("Bootstrap requires verified empty migration history");
  }
  const migrations = manifest.migrations;
  if (!Array.isArray(migrations) || migrations.length === 0) blockers.push("Exact ordered SQL migration set is missing");
  let previousVersion = "";
  const seen = new Set();
  for (const item of Array.isArray(migrations) ? migrations : []) {
    if (!isObject(item) || Object.keys(item).sort().join(",") !== "path,sha256" || !hashPattern.test(item.sha256)) { errors.push("Migration entry must contain only path and SHA-256"); continue; }
    const match = /^supabase\/migrations\/(\d{12,14})_[a-z0-9_]+\.sql$/.exec(item.path);
    if (!match) { errors.push("Migration must be an explicit canonical Supabase SQL path"); continue; }
    const version = match[1];
    if (version === "20260925160325") errors.push("Foreign MCY migration is prohibited in Nilaza execution history");
    if (seen.has(version) || (previousVersion && version <= previousVersion)) errors.push("Migration versions must be unique and ordered");
    if (Array.isArray(ledger?.migrationVersions) && ledger.migrationVersions.includes(version)) errors.push("Planned migration is already applied in target history");
    seen.add(version); previousVersion = version;
    try { if (evidenceSha256(readFile(rootDir, item.path)) !== item.sha256) errors.push(`Migration hash mismatch: ${item.path}`); }
    catch { errors.push(`Migration file is missing or unsafe: ${item.path}`); }
  }
  const setHash = Array.isArray(migrations) ? migrationSetSha256(migrations) : null;
  const metadata = loadReference(manifest.targetMetadata, rootDir, "Target metadata", errors, blockers);
  if (metadata) {
    if (!sameTarget(metadata.target, target)) errors.push("Observed target metadata identity mismatch");
    if (!freshTimestamp(metadata.checkedAt, now, 86400000)) blockers.push("Target metadata is missing or older than 24 hours");
    if (metadata.status !== "ACTIVE_HEALTHY" || metadata.sideEffectsDisabled !== true) blockers.push("Target must be healthy with provider/jobs/signup side effects disabled");
    if (isObject(resourcePolicy) && (metadata.organizationPlan !== resourcePolicy.organizationPlan || metadata.compute !== resourcePolicy.compute
      || metadata.region !== resourcePolicy.region || metadata.postgresMajor !== resourcePolicy.postgresMajor
      || !Array.isArray(metadata.paidAddons) || metadata.paidAddons.length)) blockers.push("Observed resources do not match exact owner-selected resource policy");
    if (metadata.resourceSettingsVerified !== true || metadata.quotaReview !== "PASS" || metadata.recoveryReview !== "PASS") {
      blockers.push("Resource settings, quota and recovery reviews require verified evidence");
    }
  }
  const replay = loadReference(manifest.replay, rootDir, "Clean replay", errors, blockers);
  if (replay) {
    if (replay.status !== "PASS" || replay.syntheticOnly !== true || replay.sideEffectsDisabled !== true) blockers.push("Clean replay must pass using synthetic data with outbound side effects disabled");
    if (replay.migrationSetSha256 !== setHash || replay.postgresMajor !== metadata?.postgresMajor) errors.push("Replay does not bind exact SQL set and observed Postgres version");
    if (!freshTimestamp(replay.finishedAt, now, 7 * 86400000)) blockers.push("Clean replay is missing or older than seven days");
    if (replay.grantsRlsAcceptance !== "PASS" || replay.restoreAcceptance !== "PASS") blockers.push("Grant/RLS and restore acceptance are required separately in replay evidence");
  }
  const approval = loadReference(manifest.ownerApproval, rootDir, "Owner approval", errors, blockers);
  if (approval) {
    if (approval.decision !== "approved") blockers.push("Database owner has not approved this exact candidate");
    if (!sameTarget(approval.target, target) || approval.operation !== manifest.operation || approval.migrationSetSha256 !== setHash || approval.ledgerSha256 !== manifest.ledger?.sha256 || approval.profileSha256 !== manifest.profileSha256 || approval.targetMetadataSha256 !== manifest.targetMetadata?.sha256 || approval.replaySha256 !== manifest.replay?.sha256) errors.push("Owner approval does not bind exact target, operation, SQL, ledger, metadata, replay and release profile");
    if (typeof approval.approvalReference !== "string" || approval.approvalReference.trim().length < 12) blockers.push("Owner decision reference is missing");
    const expires = Date.parse(approval.expiresAt);
    if (!freshTimestamp(approval.approvedAt, now, 7 * 86400000) || !Number.isFinite(expires) || expires <= now || expires > Date.parse(approval.approvedAt) + 7 * 86400000) blockers.push("Owner approval is expired or has an invalid approval window");
  }
  return finish();
}

export function checkDatabaseTargetReference(reference, expectedTarget, { rootDir = repositoryRoot, now } = {}) {
  const errors = [], blockers = [];
  if (!isObject(expectedTarget)) errors.push("Explicit databaseTarget identity is required");
  const manifest = loadReference(reference, rootDir, "Database target manifest", errors, blockers);
  const result = manifest ? validateDatabaseTargetManifest(manifest, { rootDir, expectedTarget, now }) : { errors: [], blockers: [] };
  errors.push(...result.errors); blockers.push(...result.blockers);
  return { resultType: "DatabaseTargetEvidenceValidation", status: errors.length ? "FAIL" : blockers.length ? "BLOCKED" : "PASS", errors, blockers };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== "--manifest") throw new Error("Usage: node scripts/database-target-gate.mjs --manifest <repository JSON path>");
    const manifest = JSON.parse(readFile(repositoryRoot, process.argv[3]).toString("utf8"));
    const result = validateDatabaseTargetManifest(manifest);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === "PASS" ? 0 : result.status === "BLOCKED" ? 2 : 1;
  } catch { console.error("Database target gate failed: invalid arguments, JSON or repository path"); process.exitCode = 1; }
}
