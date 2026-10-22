import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { GROWTH_SOURCE_FILES, claimReview, growthPrivacyErrors, validateGrowthSnapshot } from "../apps/admin/growth-operations-model.mjs";
import { buildAdminGrowthSnapshot, checkAdminGrowthSnapshot, writeAdminGrowthSnapshot } from "./build-admin-growth.mjs";

const workspaceRoot = fileURLToPath(new URL("..", import.meta.url));
const fixtureWorkspace = callback => {
  const fixtureParent = path.resolve(os.tmpdir());
  const fixtureRoot = path.resolve(fs.mkdtempSync(path.join(fixtureParent, "nilaza-admin-growth-")));
  assert.ok(fixtureRoot.startsWith(`${fixtureParent}${path.sep}nilaza-admin-growth-`), "temporary fixture must stay within its named parent");
  try {
    const references = new Set();
    const collect = value => {
      if (typeof value === "string" && /^(?:docs|packages|assets|design|apps|scripts)\/[A-Za-z0-9_.\-/]+$/.test(value) && !value.split("/").includes("..")) references.add(value);
      else if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === "object") Object.values(value).forEach(collect);
    };
    for (const relativePath of GROWTH_SOURCE_FILES) {
      const contents = fs.readFileSync(path.join(workspaceRoot, relativePath));
      fs.mkdirSync(path.dirname(path.join(fixtureRoot, relativePath)), { recursive: true });
      fs.writeFileSync(path.join(fixtureRoot, relativePath), contents);
      collect(JSON.parse(contents.toString("utf8")));
    }
    // Only create empty reference markers. Tests never copy evidence document bodies.
    for (const relativePath of references) {
      const referencePath = path.resolve(fixtureRoot, relativePath);
      assert.ok(referencePath.startsWith(`${fixtureRoot}${path.sep}`));
      if (fs.existsSync(referencePath)) continue;
      fs.mkdirSync(path.dirname(referencePath), { recursive: true });
      fs.writeFileSync(referencePath, "");
    }
    callback(fixtureRoot);
  } finally { fs.rmSync(fixtureRoot, { recursive: true, force: true }); }
};
const editSource = (fixtureRoot, relativePath, change) => {
  const sourcePath = path.join(fixtureRoot, relativePath);
  const value = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  change(value);
  fs.writeFileSync(sourcePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

test("Growth projection is deterministic, selected and bound to every canonical source", () => {
  const first = buildAdminGrowthSnapshot(workspaceRoot);
  assert.deepEqual(first, buildAdminGrowthSnapshot(workspaceRoot));
  assert.equal(first.classification, "repository_growth_snapshot");
  assert.equal(first.meta.executionAuthority, "none");
  assert.equal(first.meta.qaEvidence, "self_reported_seed_metadata_not_independent_review");
  assert.deepEqual(first.sourceFiles.map(item => item.path), GROWTH_SOURCE_FILES);
  for (const source of first.sourceFiles) assert.equal(source.sha256, createHash("sha256").update(fs.readFileSync(path.join(workspaceRoot, source.path))).digest("hex"));
  assert.equal(Object.hasOwn(first.readiness, "identityBoundary"), false);
  assert.equal(Object.hasOwn(first.business, "dataBoundary"), false);
  assert.equal(validateGrowthSnapshot(first, { now: "2026-09-30" }).valid, true);
});

test("current product evidence preserves integrated Astrology and dated Tarot QA without granting release authority", () => {
  const snapshot = buildAdminGrowthSnapshot(workspaceRoot);
  const astrology = snapshot.productTruth.features.find(feature => feature.id === "nilaza_astrology_preparation");
  const tarot = snapshot.productTruth.features.find(feature => feature.id === "nilaza_tarot_reflection");
  assert.match(astrology.status, /^integrated_/);
  assert.match(tarot.status, /^integrated_/);
  const astrologyReview = claimReview(snapshot, "nilaza_astrology_in_preparation", { now: "2026-10-01" });
  const tarotReview = claimReview(snapshot, "nilaza_tarot_as_reflection", { now: "2026-10-01" });
  assert.equal(astrologyReview.usable, true);
  assert.ok(astrologyReview.evidence.some(evidence => evidence.reference === "docs/ASTROLOGY_ANDROID_QA_2026-09-23.vi.md"));
  assert.ok(astrologyReview.evidence.some(evidence => evidence.reference === "docs/reviews/2026-09-30/REPORT.vi.md"));
  assert.match(astrologyReview.claim.copy.en, /integrated.*deterministic birth charts.*mythology/i);
  assert.match(astrologyReview.claim.copy.en, /remain incomplete/i);
  assert.ok(tarotReview.evidence.some(evidence => evidence.reference === "docs/TAROT_RELEASE_QA_2026-09-29.vi.md"));
  assert.ok(tarotReview.evidence.some(evidence => evidence.reference === "docs/ANDROID_NATIVE_RELEASE_BUILD_2026-09-30.vi.md"));
  for (const review of [astrologyReview, tarotReview]) {
    assert.equal(review.executionAuthority, "none");
    assert.deepEqual(review.claim.allowedSurfaces, ["internal_draft"]);
    assert.equal(review.claim.status, "internal_only");
  }
  assert.equal(snapshot.meta.publicReadiness, "blocked");
  assert.equal(snapshot.readiness.externalAction, "forbidden");
  for (const asset of snapshot.assets) {
    assert.deepEqual(asset.approval, { status: "not_submitted", artifactHash: null, targetChannel: null, expiry: null });
    assert.equal(asset.externalReadiness.status, "blocked");
  }
});

test("generated Growth snapshot remains identical to its canonical projection", () => {
  assert.equal(checkAdminGrowthSnapshot(workspaceRoot).current, true);
});

test("snapshot freshness detects canonical copy changes and returns to parity after regeneration", () => fixtureWorkspace(fixtureRoot => {
  writeAdminGrowthSnapshot(fixtureRoot);
  assert.equal(checkAdminGrowthSnapshot(fixtureRoot).current, true);
  editSource(fixtureRoot, "packages/growth-nilaza/content-drafts/sprint-01.json", value => { value.assetPackages[0].copy.en.caption += " Reviewed internal draft."; });
  assert.equal(checkAdminGrowthSnapshot(fixtureRoot).current, false);
  writeAdminGrowthSnapshot(fixtureRoot);
  assert.equal(checkAdminGrowthSnapshot(fixtureRoot).current, true);
}));

test("privacy rejects sensitive fields before projection, including a field that would be omitted", () => fixtureWorkspace(fixtureRoot => {
  editSource(fixtureRoot, "packages/growth-nilaza/briefs/sprint-01.json", value => { value.birthProfile = { note: "private test input" }; });
  assert.throws(() => buildAdminGrowthSnapshot(fixtureRoot), /privacy boundary rejected.*forbidden private field/);
}));

test("malformed canonical JSON fails without printing its raw content", () => fixtureWorkspace(fixtureRoot => {
  fs.writeFileSync(path.join(fixtureRoot, "packages/growth-nilaza/briefs/sprint-01.json"), "SYNTHETIC_PRIVATE_PAYLOAD_INVALID_JSON", "utf8");
  assert.throws(() => buildAdminGrowthSnapshot(fixtureRoot), error => /valid JSON source required/.test(error.message) && !error.message.includes("SYNTHETIC_PRIVATE_PAYLOAD"));
}));

test("unreviewed source fields fail before projection rather than becoming hidden inputs", () => fixtureWorkspace(fixtureRoot => {
  editSource(fixtureRoot, "packages/growth-nilaza/content-drafts/sprint-01.json", value => { value.assetPackages[0].unreviewedNotes = "A synthetic unsupported record."; });
  assert.throws(() => buildAdminGrowthSnapshot(fixtureRoot), /unreviewed source field is not allowed/);
}));

test("raw contact strings and provider tokens never pass the snapshot boundary", () => {
  assert.ok(growthPrivacyErrors({ note: "qa-person@example.test" }).length);
  assert.ok(growthPrivacyErrors({ note: "Contact +1 202 555 0182" }).length);
  assert.ok(growthPrivacyErrors({ note: "sk-proj-abcdefghijklmnopqrstuv" }).length);
  assert.equal(growthPrivacyErrors({ channelCapability: { email: "not_active" } }).length, 0);
  assert.ok(growthPrivacyErrors({ channelCapability: { email: "qa-person@example.test" } }).length);
});

test("a nested tenant mismatch is rejected rather than hidden by selected fields", () => fixtureWorkspace(fixtureRoot => {
  editSource(fixtureRoot, "packages/growth-nilaza/content-drafts/sprint-01.json", value => { value.assetPackages[0].tenantId = "other-business"; });
  assert.throws(() => buildAdminGrowthSnapshot(fixtureRoot), /Nilaza tenant required/);
}));

test("expired claims or evidence remain inspectable but never usable as current evidence", () => {
  const snapshot = buildAdminGrowthSnapshot(workspaceRoot);
  const feature = snapshot.productTruth.features[0];
  feature.evidence[0].expiresAt = "2026-09-29";
  const verdict = validateGrowthSnapshot(snapshot, { now: "2026-09-30" });
  assert.equal(verdict.valid, true);
  assert.ok(verdict.expiredEvidence.includes(feature.evidence[0].id));
  assert.ok(verdict.expiredClaims.includes(feature.claims[0].id));
  assert.equal(claimReview(snapshot, feature.claims[0].id, { now: "2026-09-30" }).usable, false);
  assert.equal(claimReview(snapshot, feature.claims[0].id, { now: "2026-09-30" }).status, "expired");
  feature.evidence[0].expiresAt = "2026-09-30";
  assert.equal(claimReview(snapshot, feature.claims[0].id, { now: "2026-09-30T23:59:00Z" }).usable, true);
});

test("unknown claim/evidence references and approval grants fail closed", () => {
  const snapshot = buildAdminGrowthSnapshot(workspaceRoot);
  snapshot.assets[0].claimRefs = ["unknown_claim"];
  snapshot.productTruth.features[0].claims[0].evidenceRefs = ["missing_evidence"];
  snapshot.assets[1].approval.status = "approved_for_execution";
  const verdict = validateGrowthSnapshot(snapshot);
  assert.equal(verdict.valid, false);
  assert.ok(verdict.errors.some(item => item.includes("unresolved brief or claim")));
  assert.ok(verdict.errors.some(item => item.includes("valid evidence refs required")));
  assert.ok(verdict.errors.some(item => item.includes("execution approval is forbidden")));
  assert.equal(claimReview(snapshot, "unknown_claim").usable, false);
});

test("unknown nested fields and missing locale content cannot reach a renderer", () => {
  const snapshot = buildAdminGrowthSnapshot(workspaceRoot);
  snapshot.assets[0].visualBrief.unreviewedField = "unexpected";
  delete snapshot.assets[1].copy.vi.body;
  const verdict = validateGrowthSnapshot(snapshot);
  assert.equal(verdict.valid, false);
  assert.ok(verdict.errors.some(item => item.includes("unknown field")));
  assert.ok(verdict.errors.some(item => item.includes("required field missing")));
});

test("roadmap references must resolve and declared task dependencies cannot form cycles", () => fixtureWorkspace(fixtureRoot => {
  const snapshot = buildAdminGrowthSnapshot(fixtureRoot);
  snapshot.roadmap.tasks[0].dependencies = [snapshot.roadmap.tasks[1].id];
  snapshot.roadmap.tasks[1].dependencies = [snapshot.roadmap.tasks[0].id];
  assert.ok(validateGrowthSnapshot(snapshot).errors.some(item => item.includes("circular dependency")));
  editSource(fixtureRoot, "packages/growth-nilaza/operations/roadmap.json", value => { value.tasks[0].evidenceRefs = ["docs/not-existing-reviewed-evidence.md"]; });
  assert.throws(() => buildAdminGrowthSnapshot(fixtureRoot), /evidence reference does not resolve/);
}));

test("copy-review evidence resolves to canonical evidence IDs or existing repository files", () => fixtureWorkspace(fixtureRoot => {
  const update = evidenceRefs => ({ reviewedAt: "2026-09-30", owner: "growth_editor", reason: "Source-context review requires new editorial acceptance.", evidenceRefs });
  editSource(fixtureRoot, "packages/growth-nilaza/content-drafts/sprint-01.json", value => { value.assetPackages[0].reviewUpdate = update(["brand_guidelines_open_reflection_v1"]); });
  assert.equal(buildAdminGrowthSnapshot(fixtureRoot).assets[0].reviewUpdate.evidenceRefs[0], "brand_guidelines_open_reflection_v1");
  editSource(fixtureRoot, "packages/growth-nilaza/content-drafts/sprint-01.json", value => { value.assetPackages[0].reviewUpdate = update(["unknown_evidence"]); });
  assert.throws(() => buildAdminGrowthSnapshot(fixtureRoot), /unresolved review evidence/);
  editSource(fixtureRoot, "packages/growth-nilaza/content-drafts/sprint-01.json", value => { value.assetPackages[0].reviewUpdate = update(["docs/not-existing-copy-review.md"]); });
  assert.throws(() => buildAdminGrowthSnapshot(fixtureRoot), /evidence reference does not resolve/);
}));
