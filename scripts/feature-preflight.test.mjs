import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { changedPathsSince, collectRecordErrors, normalizeRepoPath, scopeCovers, uncoveredFeaturePaths, unreviewedChangedSkills } from "./feature-preflight.mjs";

const root = process.cwd();
const source = (relativePath) => ({
  path: relativePath,
  sha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath)).toString("utf8").replace(/\r\n/g, "\n")).digest("hex"),
  reason: "Current repository authority reviewed for this task."
});

function validRecord() {
  return {
    schemaVersion: 1,
    taskId: "preflight-test-task",
    ownerAgent: "feature-owner-agent",
    lane: "agent_workflow_governance",
    goal: "Keep feature changes within a reviewed plan and scope.",
    successCriteria: ["The scoped change has a manager-testable acceptance path."],
    writeScope: ["scripts/feature-preflight.mjs"],
    untouchedSurfaces: ["Mobile, Admin, and backend runtime behavior remain unchanged."],
    impact: {
      entryPoint: "Agent command flow before feature implementation starts.",
      dataWrite: "The preflight itself writes no app or user data.",
      backendContract: "No backend contract is changed by this task.",
      adminVisibility: "No Admin runtime screen is changed by this task.",
      privacySafety: "No private payload is accepted in the plan record.",
      observability: "The command reports pass or fail without telemetry.",
      rollback: "Revert the scoped repository files if validation fails."
    },
    canonicalContracts: ["The existing governance policy remains the contract for agent handoffs."],
    allowedDataClasses: ["sanitized_project_context"],
    sourceReview: [source("AGENTS.md"), source("docs/AGENT_TASK_ROUTER.md"), source("docs/PLAN_QC_PROTOCOL.md"), source("docs/AGENT_RUNBOOK.md")],
    skillReview: [{ name: "nilaza-plan-qc", decision: "verified-current", evidence: "Reviewed against the current project process and implementation scope." }],
    dependencyReview: { usesVolatileExternalKnowledge: false, evidence: "No external package or changing API is involved in this task." },
    externalSourceReview: [],
    securityReview: {
      authzRls: "No authentication or RLS change is part of this task.",
      sensitiveData: "No user content or sensitive input is used for this task.",
      secretsLogging: "No credentials are accepted or logged by the preflight.",
      externalInput: "Record paths are constrained to the repository root.",
      dependencies: "No dependency is added or updated for this task.",
      migrationRelease: "No database write, deployment, or release is planned.",
      stopCondition: "Stop if source review, skill drift, or security checks fail.",
      unresolvedHighRisks: []
    },
    workingTreeReview: { paths: [], note: "The scoped files have been reviewed before editing." },
    validationCommands: ["npm run feature:preflight:test"],
    managerTestPath: "Run the preflight on a scoped plan and read the pass or fail result.",
    residualRisk: "The agent still has to assess semantic correctness and runtime behavior.",
    externalActions: { databaseWrite: false }
  };
}

test("a complete scoped plan passes without running its declared commands", () => {
  assert.deepEqual(collectRecordErrors(validRecord(), "docs/feature-plans/test.json").errors, []);
});

test("source drift and unreviewed high risk fail closed", () => {
  const record = validRecord();
  record.sourceReview[0].sha256 = "0".repeat(64);
  record.securityReview.unresolvedHighRisks = ["Access check is not implemented"];
  const errors = collectRecordErrors(record, "docs/feature-plans/test.json").errors.join("\n");
  assert.match(errors, /sourceReview is stale: AGENTS\.md/);
  assert.match(errors, /Unresolved high or critical risks/);
});

test("database writes stop at the blocked migration ledger", () => {
  const record = validRecord();
  record.externalActions = { databaseWrite: true, databaseOwnerApprovalReference: "Owner review recorded in project task." };
  assert.match(collectRecordErrors(record, "docs/feature-plans/test.json").errors.join("\n"), /Database write blocked by migration ledger/);
});

test("explicit database targets cannot bypass missing or unsafe manifests", () => {
  const record = validRecord();
  record.externalActions = { databaseWrite: true, databaseOwnerApprovalReference: "Owner review recorded in project task.", databaseTarget: { id: "nilaza-production", kind: "production", organizationId: "rzbpjfrndhrtxagpgdre", projectRef: "aaaaaaaaaaaaaaaaaaaa" } };
  assert.match(collectRecordErrors(record, "docs/feature-plans/test.json").errors.join("\n"), /missing file\/hash evidence/);
  record.externalActions.databaseTargetManifest = { path: "../outside.json", sha256: "0".repeat(64) };
  assert.match(collectRecordErrors(record, "docs/feature-plans/test.json").errors.join("\n"), /unsafe repository path/);
});

test("scope traversal, forbidden data and undeclared skill changes are rejected", () => {
  const record = validRecord();
  record.writeScope = ["../outside", "skills/", "skills/nilaza-plan-qc/SKILL.md"];
  record.allowedDataClasses = ["provider_secret"];
  const errors = collectRecordErrors(record, "docs/feature-plans/test.json").errors.join("\n");
  assert.match(errors, /Invalid or overbroad writeScope path/);
  assert.match(errors, /Forbidden data class/);
  assert.match(errors, /must be marked updated/);
  assert.equal(normalizeRepoPath("../outside"), null);
  assert.equal(scopeCovers(["apps/mobile/"], "apps/mobile/App.tsx"), true);
  assert.equal(scopeCovers(["apps/mobile/"], "apps/mobile-extra/App.tsx"), false);
});

test("volatile claims need recent primary sources and plan secrets are blocked", () => {
  const record = validRecord();
  record.dependencyReview.usesVolatileExternalKnowledge = true;
  record.externalSourceReview = [{ url: "https://example.com/docs", checkedAt: "2020-01-01", reason: "Official versioned documentation was reviewed." }];
  record.goal += ` sk-proj-${"A".repeat(24)}`;
  const errors = collectRecordErrors(record, "docs/feature-plans/test.json").errors.join("\n");
  assert.match(errors, /checkedAt must be within the past 30 days/);
  assert.match(errors, /Plan may contain a credential/);
});

test("PR coverage requires a record scope for each feature change", () => {
  const changed = ["apps/mobile/App.tsx", "skills/nilaza-plan-qc/SKILL.md", "docs/FEATURE_PRD.md", ".gitignore", "docs/feature-plans/task.json"];
  assert.deepEqual(uncoveredFeaturePaths(changed, [["apps/mobile/"]]), ["skills/nilaza-plan-qc/SKILL.md", "docs/FEATURE_PRD.md", ".gitignore"]);
  assert.deepEqual(uncoveredFeaturePaths(changed, [["apps/mobile/"], ["skills/nilaza-plan-qc/SKILL.md"], ["docs/FEATURE_PRD.md"], [".gitignore"]]), []);
});

test("changed skill files require an explicit updated decision even under directory scope", () => {
  const changed = ["skills/nilaza-plan-qc/SKILL.md"];
  const known = new Set(["nilaza-plan-qc"]);
  assert.deepEqual(unreviewedChangedSkills(changed, [{ skillReview: [{ name: "nilaza-plan-qc", decision: "verified-current" }] }], known), ["nilaza-plan-qc"]);
  assert.deepEqual(unreviewedChangedSkills(changed, [{ skillReview: [{ name: "nilaza-plan-qc", decision: "updated" }] }], known), []);
  assert.deepEqual(unreviewedChangedSkills(["skills/removed-skill/SKILL.md"], [], known), ["removed-skill"]);
});

test("clear brand and Tarot scopes require their task skills to be reviewed", () => {
  const record = validRecord();
  record.writeScope = ["assets/brand/open-reflection/v1/", "packages/content/data/tarot-cards.json", "assets/tarot/classic-arcana/"];
  const errors = collectRecordErrors(record, "docs/feature-plans/test.json").errors.join("\n");
  for (const name of ["nilaza-brand-experience", "nilaza-tarot-deck-production", "nilaza-tarot-content-qc", "nilaza-tarot-art-qc"]) assert.match(errors, new RegExp(`skillReview must include ${name}`));
  for (const name of ["nilaza-brand-experience", "nilaza-tarot-deck-production", "nilaza-tarot-content-qc", "nilaza-tarot-art-qc"]) {
    record.skillReview.push({ name, decision: "verified-current", evidence: "Reviewed current task route and reviewed source against the planned work." });
  }
  assert.deepEqual(collectRecordErrors(record, "docs/feature-plans/test.json").errors, []);
});

test("Git change discovery includes deletions and preserves Unicode filenames", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "nilaza-preflight-test-"));
  const git = (...args) => execFileSync("git", args, { cwd: temp, encoding: "utf8", stdio: "pipe" }).trim();
  const commit = (message) => git("-c", "user.name=Nilaza QC", "-c", "user.email=qc@example.invalid", "commit", "--quiet", "-m", message);
  try {
    git("init", "--quiet");
    fs.mkdirSync(path.join(temp, "apps", "mobile"), { recursive: true });
    fs.writeFileSync(path.join(temp, "apps", "mobile", "obsolete.ts"), "old\n");
    git("add", ".");
    commit("initial");
    const beforeDeletion = git("rev-parse", "HEAD");
    fs.unlinkSync(path.join(temp, "apps", "mobile", "obsolete.ts"));
    git("add", "-A");
    commit("delete obsolete feature file");
    assert.deepEqual(changedPathsSince(beforeDeletion, temp), ["apps/mobile/obsolete.ts"]);
    assert.deepEqual(uncoveredFeaturePaths(changedPathsSince(beforeDeletion, temp), []), ["apps/mobile/obsolete.ts"]);

    const beforeUnicode = git("rev-parse", "HEAD");
    fs.mkdirSync(path.join(temp, "docs"), { recursive: true });
    fs.writeFileSync(path.join(temp, "docs", "Tính năng mới.md"), "review\n");
    git("add", ".");
    commit("add feature design notes");
    assert.deepEqual(changedPathsSince(beforeUnicode, temp), ["docs/Tính năng mới.md"]);
  } finally {
    if (temp.startsWith(`${os.tmpdir()}${path.sep}nilaza-preflight-test-`)) fs.rmSync(temp, { recursive: true, force: true });
  }
});
