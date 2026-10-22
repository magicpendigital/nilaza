import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { checkDatabaseTargetReference, evidenceSha256, migrationSetSha256, validateDatabaseTargetManifest } from "./database-target-gate.mjs";

const now = Date.parse("2026-10-04T08:00:00Z");
const checkedAt = "2026-10-04T07:00:00Z";
const target = { id: "synthetic-production", kind: "production", organizationId: "rzbpjfrndhrtxagpgdre", projectRef: "aaaaaaaaaaaaaaaaaaaa" };

function fixture(run) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "nilaza-target-gate-"));
  const write = (relative, value) => {
    const absolute = path.join(rootDir, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    const bytes = Buffer.from(typeof value === "string" ? value : JSON.stringify(value));
    fs.writeFileSync(absolute, bytes);
    return { path: relative, sha256: evidenceSha256(bytes) };
  };
  try {
    const profile = { schemaVersion: 1, projectId: "nilaza", targets: [target], environmentPolicy: { stagingOrganizationId: "drxbmvimiekeoeesgssp", productionOrganizationId: target.organizationId,
      databaseResourcePolicies: { production: { target, organizationPlan: "pro", compute: "micro", region: "ap-southeast-1", postgresMajor: 17, paidAddons: [] } } } };
    const profileSha256 = write("docs/release/release-profile.json", profile).sha256;
    const migrations = [write("supabase/migrations/20261004000000_synthetic_fixture.sql", "-- Synthetic fixture; never a production bootstrap.\nselect 1;\n")];
    const setHash = migrationSetSha256(migrations);
    const ledger = { target, status: "reconciled", localOnly: [], remoteOnly: [], migrationVersions: [], checkedAt };
    const metadata = { target, status: "ACTIVE_HEALTHY", checkedAt, postgresMajor: 17, compute: "micro", region: "ap-southeast-1", paidAddons: [], sideEffectsDisabled: true,
      organizationPlan: "pro", resourceSettingsVerified: true, quotaReview: "PASS", recoveryReview: "PASS" };
    const replay = { status: "PASS", migrationSetSha256: setHash, postgresMajor: 17, syntheticOnly: true, sideEffectsDisabled: true, finishedAt: checkedAt, grantsRlsAcceptance: "PASS", restoreAcceptance: "PASS" };
    const ledgerRef = write("evidence/ledger.json", ledger);
    const metadataRef = write("evidence/metadata.json", metadata), replayRef = write("evidence/replay.json", replay);
    const approval = { decision: "approved", target, operation: "bootstrap", migrationSetSha256: setHash, ledgerSha256: ledgerRef.sha256, targetMetadataSha256: metadataRef.sha256, replaySha256: replayRef.sha256, profileSha256, approvalReference: "Synthetic test decision only, no real owner authority.", approvedAt: checkedAt, expiresAt: "2026-10-05T07:00:00Z" };
    const manifest = { schemaVersion: 1, status: "ready_for_review", operation: "bootstrap", target, profileSha256, migrations, ledger: ledgerRef, targetMetadata: metadataRef, replay: replayRef, ownerApproval: write("evidence/approval.json", approval) };
    run({ rootDir, write, profile, manifest, ledger, metadata, replay, approval, validate: () => validateDatabaseTargetManifest(manifest, { rootDir, now }) });
  } finally {
    const absolute = path.resolve(rootDir);
    assert.ok(absolute.startsWith(`${path.resolve(os.tmpdir())}${path.sep}nilaza-target-gate-`));
    fs.rmSync(absolute, { recursive: true, force: true });
  }
}

test("complete synthetic evidence passes read-only validation without execution authority", () => fixture(({ validate }) => {
  assert.deepEqual(validate(), { resultType: "DatabaseTargetEvidenceValidation", status: "PASS", errors: [], blockers: [] });
}));

function freeFixture(f, kind = "production") {
  const freeTarget = { ...target, kind, organizationId: "drxbmvimiekeoeesgssp" };
  f.profile.targets = [freeTarget];
  f.profile.environmentPolicy[`${kind}OrganizationId`] = freeTarget.organizationId;
  f.profile.environmentPolicy.databaseResourcePolicies = { [kind]: { target: freeTarget, organizationPlan: "free", compute: "nano", region: "ap-southeast-1", postgresMajor: 17, paidAddons: [] } };
  f.manifest.target = freeTarget;
  f.ledger.target = freeTarget;
  Object.assign(f.metadata, { target: freeTarget, organizationPlan: "free", compute: "nano" });
  f.approval.target = freeTarget;
  return f;
}

function rebindFixture(f) {
  f.manifest.profileSha256 = f.write("docs/release/release-profile.json", f.profile).sha256;
  f.manifest.ledger = f.write("evidence/ledger.json", f.ledger);
  f.manifest.targetMetadata = f.write("evidence/metadata.json", f.metadata);
  f.manifest.replay = f.write("evidence/replay.json", f.replay);
  Object.assign(f.approval, { profileSha256: f.manifest.profileSha256, ledgerSha256: f.manifest.ledger.sha256, targetMetadataSha256: f.manifest.targetMetadata.sha256, replaySha256: f.manifest.replay.sha256 });
  f.manifest.ownerApproval = f.write("evidence/approval.json", f.approval);
}

for (const kind of ["staging", "production"]) test(`Free/Nano ${kind} passes only with complete synthetic evidence`, () => fixture((f) => {
  freeFixture(f, kind); rebindFixture(f);
  assert.equal(f.validate().status, "PASS");
}));

const freeCases = [
  ["missing policy", (f) => { delete f.profile.environmentPolicy.databaseResourcePolicies; }, /resource policy is missing/],
  ["wrong policy ref", (f) => { f.profile.environmentPolicy.databaseResourcePolicies.production.target = { ...f.manifest.target, projectRef: "bbbbbbbbbbbbbbbbbbbb" }; }, /bind exact target/],
  ["Micro metadata", (f) => { f.metadata.compute = "micro"; }, /owner-selected resource policy/],
  ["unknown compute", (f) => { f.metadata.compute = null; }, /owner-selected resource policy/],
  ["missing plan", (f) => { delete f.metadata.organizationPlan; }, /owner-selected resource policy/],
  ["paid plan", (f) => { f.metadata.organizationPlan = "pro"; }, /owner-selected resource policy/],
  ["paid add-on", (f) => { f.metadata.paidAddons = ["pitr"]; }, /owner-selected resource policy/],
  ["missing add-on inventory", (f) => { f.metadata.paidAddons = null; }, /owner-selected resource policy/],
  ["unverified settings", (f) => { f.metadata.resourceSettingsVerified = false; }, /reviews require verified evidence/],
  ["missing quota", (f) => { delete f.metadata.quotaReview; }, /reviews require verified evidence/],
  ["unreviewed recovery", (f) => { f.metadata.recoveryReview = "BLOCKED"; }, /reviews require verified evidence/],
  ["empty allowlist", (f) => { f.profile.targets = []; }, /not registered/],
  ["malformed policy", (f) => { f.profile.environmentPolicy.databaseResourcePolicies.production = []; }, /resource policy is missing/],
  ["unsupported Free compute policy", (f) => { f.profile.environmentPolicy.databaseResourcePolicies.production.compute = "micro"; }, /Resource policy must specify/],
  ["side effects still enabled", (f) => { f.metadata.sideEffectsDisabled = false; }, /side effects disabled/]
];
for (const [name, mutate, reason] of freeCases) test(`Free ${name} fails closed even after rehashing evidence`, () => fixture((f) => {
  freeFixture(f); mutate(f); rebindFixture(f);
  const result = f.validate();
  assert.notEqual(result.status, "PASS");
  assert.match([...result.errors, ...result.blockers].join("\n"), reason);
}));

test("Free staging cannot bypass resource checks by changing environment", () => fixture((f) => {
  freeFixture(f, "staging"); f.metadata.compute = "micro"; rebindFixture(f);
  assert.match(f.validate().blockers.join("\n"), /owner-selected resource policy/);
}));

const cases = [
  ["empty target allowlist", (f) => { f.profile.targets = []; f.manifest.profileSha256 = f.write("docs/release/release-profile.json", f.profile).sha256; }, /not registered/],
  ["wrong environment organization", (f) => { f.profile.environmentPolicy.productionOrganizationId = "bbbbbbbbbbbbbbbbbbbb"; f.manifest.profileSha256 = f.write("docs/release/release-profile.json", f.profile).sha256; }, /organization boundary/],
  ["wrong target ledger", (f) => { f.ledger.target = { ...target, projectRef: "bbbbbbbbbbbbbbbbbbbb" }; f.manifest.ledger = f.write("evidence/ledger.json", f.ledger); }, /ledger identity mismatch/],
  ["blocked target ledger", (f) => { f.ledger.status = "blocked_pending_reconciliation"; f.manifest.ledger = f.write("evidence/ledger.json", f.ledger); }, /ledger blocks/],
  ["divergent history", (f) => { f.ledger.remoteOnly = ["20260925160325"]; f.manifest.ledger = f.write("evidence/ledger.json", f.ledger); }, /unresolved migration divergence/],
  ["malformed history fails without throwing", (f) => { f.ledger.migrationVersions = 42; f.manifest.ledger = f.write("evidence/ledger.json", f.ledger); }, /migrationVersions is invalid/],
  ["stale ledger", (f) => { f.ledger.checkedAt = "2026-10-01T08:00:00Z"; f.manifest.ledger = f.write("evidence/ledger.json", f.ledger); }, /older than 24 hours/],
  ["SQL content drift", (f) => { f.write(f.manifest.migrations[0].path, "select 2;\n"); }, /Migration hash mismatch/],
  ["SQL path traversal", (f) => { f.manifest.migrations[0].path = "supabase/migrations/../evidence.sql"; }, /canonical Supabase SQL path/],
  ["duplicate SQL version", (f) => { f.manifest.migrations.push(f.manifest.migrations[0]); }, /unique and ordered/],
  ["foreign MCY migration", (f) => { f.manifest.migrations = [f.write("supabase/migrations/20260925160325_initial_mcy_schema.sql", "select 1;")]; }, /Foreign MCY/],
  ["already applied SQL", (f) => { f.ledger.migrationVersions = ["20261004000000"]; f.manifest.ledger = f.write("evidence/ledger.json", f.ledger); }, /already applied/],
  ["unbound replay", (f) => { f.replay.migrationSetSha256 = "0".repeat(64); f.manifest.replay = f.write("evidence/replay.json", f.replay); }, /Replay does not bind/],
  ["replay with outbound dispatch", (f) => { f.replay.sideEffectsDisabled = false; f.manifest.replay = f.write("evidence/replay.json", f.replay); }, /outbound side effects disabled/],
  ["missing RLS acceptance", (f) => { f.replay.grantsRlsAcceptance = "BLOCKED"; f.manifest.replay = f.write("evidence/replay.json", f.replay); }, /Grant\/RLS and restore/],
  ["Small outside budget", (f) => { f.metadata.compute = "small"; f.manifest.targetMetadata = f.write("evidence/metadata.json", f.metadata); }, /owner-selected resource policy/],
  ["PITR outside budget", (f) => { f.metadata.paidAddons = ["pitr"]; f.manifest.targetMetadata = f.write("evidence/metadata.json", f.metadata); }, /owner-selected resource policy/],
  ["wrong approval target", (f) => { f.approval.target = { ...target, projectRef: "bbbbbbbbbbbbbbbbbbbb" }; f.manifest.ownerApproval = f.write("evidence/approval.json", f.approval); }, /Owner approval does not bind/],
  ["expired approval", (f) => { f.approval.expiresAt = checkedAt; f.manifest.ownerApproval = f.write("evidence/approval.json", f.approval); }, /approval is expired/],
  ["missing evidence", (f) => { delete f.manifest.replay; }, /missing file\/hash evidence/],
  ["JSON null evidence", (f) => { f.manifest.replay = f.write("evidence/replay.json", "null"); }, /unreadable JSON/],
  ["approval invalidated by updated metadata", (f) => { f.metadata.checkedAt = "2026-10-04T07:30:00Z"; f.manifest.targetMetadata = f.write("evidence/metadata.json", f.metadata); }, /Owner approval does not bind/],
  ["stale evidence hash", (f) => { f.manifest.targetMetadata.sha256 = "0".repeat(64); }, /stale or mismatched/],
  ["unsafe evidence path", (f) => { f.manifest.replay.path = "../outside.json"; }, /unsafe repository path/],
  ["repair operation", (f) => { f.manifest.operation = "repair"; }, /repair is prohibited/],
  ["malformed profile", (f) => { f.write("docs/release/release-profile.json", "null"); }, /Release profile is missing or invalid/]
];
for (const [name, mutate, reason] of cases) test(`${name} fails closed`, () => fixture((f) => {
  mutate(f);
  const result = f.validate();
  assert.notEqual(result.status, "PASS");
  assert.match([...result.errors, ...result.blockers].join("\n"), reason);
}));

test("reference binds manifest bytes and complete expected target", () => fixture(({ manifest, rootDir, write }) => {
  const reference = write("evidence/manifest.json", manifest);
  assert.equal(checkDatabaseTargetReference(reference, target, { rootDir, now }).status, "PASS");
  assert.match(checkDatabaseTargetReference(reference, { ...target, kind: "staging" }, { rootDir, now }).errors.join("\n"), /does not match/);
  assert.match(checkDatabaseTargetReference(reference, undefined, { rootDir, now }).errors.join("\n"), /identity is required/);
  reference.sha256 = "0".repeat(64);
  assert.notEqual(checkDatabaseTargetReference(reference, target, { rootDir, now }).status, "PASS");
}));

test("draft with no project is BLOCKED, including when approval-looking fields exist", () => {
  const result = validateDatabaseTargetManifest({ schemaVersion: 1, status: "draft", operation: "bootstrap", target: { ...target, projectRef: null }, ownerApproval: { decision: "approved" } });
  assert.equal(result.status, "BLOCKED");
  assert.match(result.blockers.join("\n"), /Exact project target/);
});

test("malformed manifests never become PASS", () => {
  for (const value of [null, [], "approved", 1, {}, { schemaVersion: 1, status: "ready_for_review", operation: "bootstrap" }]) assert.notEqual(validateDatabaseTargetManifest(value).status, "PASS");
});

test("text evidence hashes normalize Windows newlines", () => {
  assert.equal(evidenceSha256(Buffer.from("a\r\nb\r\n")), evidenceSha256(Buffer.from("a\nb\n")));
});

test("CLI draft exits BLOCKED with code2 and unsafe path exits FAIL with code1", () => {
  const script = path.join(process.cwd(), "scripts/database-target-gate.mjs");
  const draft = spawnSync(process.execPath, [script, "--manifest", "docs/production/2026-10-04/database-target.draft.json"], { encoding: "utf8" });
  assert.equal(draft.status, 2, draft.stderr);
  assert.equal(JSON.parse(draft.stdout).status, "BLOCKED");
  const unsafe = spawnSync(process.execPath, [script, "--manifest", "../outside.json"], { encoding: "utf8" });
  assert.equal(unsafe.status, 1);
});
