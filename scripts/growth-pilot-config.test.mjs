import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateGrowthPilot } from "./validate-growth-pilot.mjs";

const sourceRoot = process.cwd();
const createWorkspaceCopy = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "growth-pilot-"));
  const paths = ["packages/growth-contracts", "packages/growth-core", "packages/growth-fixtures", "packages/growth-nilaza", "packages/agent-config"];
  for (const relativePath of paths) {
    const source = path.join(sourceRoot, relativePath);
    const target = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(source, target, { recursive: true });
  }
  return root;
};

const writeJson = (root, relativePath, value) => fs.writeFileSync(path.join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`, "utf8");
const readJson = (root, relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

test("valid Sprint 01 framework passes its internal integrity checks", () => {
  const result = validateGrowthPilot(sourceRoot);
  assert.deepEqual(result.errors, []);
  assert.equal(result.summary.nilazaAssetCount, 12);
  assert.equal(result.summary.externallyBlockedAssetCount, 12);
  assert.equal(result.summary.nilazaExternalMarketing, "blocked_by_product_and_execution_gates");
});

test("a claim whose internal surface permission is removed blocks the dependent draft", () => {
  const root = createWorkspaceCopy();
  try {
    const truth = readJson(root, "packages/growth-nilaza/product-truth.json");
    truth.features[0].claims[0].allowedSurfaces = ["public_organic_candidate"];
    writeJson(root, "packages/growth-nilaza/product-truth.json", truth);
    const result = validateGrowthPilot(root);
    assert.ok(result.errors.some((error) => error.includes("outside internal_draft")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a deterministic prediction injected into a draft is blocked", () => {
  const root = createWorkspaceCopy();
  try {
    const assets = readJson(root, "packages/growth-nilaza/content-drafts/sprint-01.json");
    assets.assetPackages[0].copy.vi.caption = "Tarot biết chắc điều gì sẽ xảy ra với bạn.";
    writeJson(root, "packages/growth-nilaza/content-drafts/sprint-01.json", assets);
    const result = validateGrowthPilot(root);
    assert.ok(result.errors.some((error) => error.includes("deterministic_prediction")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a Nilaza reference injected into the second-tenant template is blocked", () => {
  const root = createWorkspaceCopy();
  try {
    const template = readJson(root, "packages/growth-fixtures/tenant-template/business-pack.json");
    template.notes = "Reuse Nilaza logo and claim.";
    writeJson(root, "packages/growth-fixtures/tenant-template/business-pack.json", template);
    const result = validateGrowthPilot(root);
    assert.ok(result.errors.some((error) => error.includes("identity token")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a raw email injected into an internal asset draft is blocked", () => {
  const root = createWorkspaceCopy();
  try {
    const assets = readJson(root, "packages/growth-nilaza/content-drafts/sprint-01.json");
    assets.assetPackages[0].copy.en.caption = "Contact test@example.com for a private reading.";
    writeJson(root, "packages/growth-nilaza/content-drafts/sprint-01.json", assets);
    const result = validateGrowthPilot(root);
    assert.ok(result.errors.some((error) => error.includes("sensitive_data_leak")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a foreign-tenant token injected into a Nilaza asset is blocked by the identity boundary", () => {
  const root = createWorkspaceCopy();
  try {
    const assets = readJson(root, "packages/growth-nilaza/content-drafts/sprint-01.json");
    assets.assetPackages[0].copy.en.caption = "FOREIGN_TENANT_BRAND belongs in this draft.";
    writeJson(root, "packages/growth-nilaza/content-drafts/sprint-01.json", assets);
    const result = validateGrowthPilot(root);
    assert.ok(result.errors.some((error) => error.includes("cross_tenant_leak")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a short video without a storyboard and transcript is blocked", () => {
  const root = createWorkspaceCopy();
  try {
    const assets = readJson(root, "packages/growth-nilaza/content-drafts/sprint-01.json");
    delete assets.assetPackages[3].visualBrief.storyboard;
    delete assets.assetPackages[3].visualBrief.captionTranscript;
    writeJson(root, "packages/growth-nilaza/content-drafts/sprint-01.json", assets);
    const result = validateGrowthPilot(root);
    assert.ok(result.errors.some((error) => error.includes("three-scene storyboard")));
    assert.ok(result.errors.some((error) => error.includes("bilingual caption transcripts")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
