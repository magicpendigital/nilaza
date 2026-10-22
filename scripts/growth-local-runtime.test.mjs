import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  prepareJob, acceptAuthorPacket, renderJob, submitQa,
  inspectJob, reconcileJob, recordOwnerReview
} from "../packages/growth-runtime/runtime.mjs";

const realRepo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const briefId = "B01_open_question";
const jobId = "nilaza-test-001";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1cAAAAASUVORK5CYII=", "base64");
const json = target => JSON.parse(fs.readFileSync(target, "utf8"));
const writeJson = (target, value) => fs.writeFileSync(target, JSON.stringify(value, null, 2) + "\n", "utf8");
const digest = value => createHash("sha256").update(value).digest("hex");

function cleanup(root) {
  const relative = path.relative(fs.realpathSync.native(os.tmpdir()), fs.realpathSync.native(root));
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative), "test cleanup must remain under the temporary directory");
  fs.rmSync(root, { recursive: true, force: true });
}

function copyFixtureRepo(repoRoot) {
  // The canonical gate also validates its portable templates and role mappings.
  // Copy the same sanitized package set used by growth-pilot-config.test.mjs.
  for (const relative of ["packages/growth-contracts", "packages/growth-core", "packages/growth-fixtures", "packages/agent-config"]) {
    fs.cpSync(path.join(realRepo, relative), path.join(repoRoot, relative), { recursive: true });
  }
  const paths = new Set([
    "packages/growth-runtime/runtime.mjs",
    "packages/growth-runtime/renderer.mjs",
    "packages/growth-core/config/growth-agent-catalog.json",
    "packages/growth-core/config/quality-gates.json",
    "packages/growth-core/config/agent-runner-contract.json",
    "packages/growth-core/config/approval-state-machine.json",
    "packages/growth-core/config/metric-contract.json",
    "packages/growth-contracts/schemas/asset-package.schema.json",
    "packages/growth-contracts/schemas/qa-verdict.schema.json",
    "packages/content/data/brand-identity.json"
  ]);
  const plan = json(path.join(realRepo, "docs/feature-plans/growth-local-marketing-runtime-2026-10-01.json"));
  for (const item of plan.sourceReview) paths.add(item.path);
  const seedDirectory = path.join(realRepo, "packages/growth-nilaza");
  const discover = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) discover(target);
      else if (entry.isFile() && entry.name.endsWith(".json")) paths.add(path.relative(realRepo, target).replaceAll(path.sep, "/"));
    }
  };
  discover(seedDirectory);
  const findReferences = value => {
    if (typeof value === "string" && /^(docs|packages|apps|assets|design|scripts)\/[A-Za-z0-9_.\-/]+$/.test(value)) {
      const source = path.join(realRepo, value);
      if (fs.existsSync(source) && fs.statSync(source).isFile()) paths.add(value);
    } else if (Array.isArray(value)) value.forEach(findReferences);
    else if (value && typeof value === "object") Object.values(value).forEach(findReferences);
  };
  for (const relative of [...paths]) {
    if (relative.endsWith(".json")) findReferences(json(path.join(realRepo, relative)));
  }
  for (const relative of paths) {
    const destination = path.join(repoRoot, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(realRepo, relative), destination);
  }
}

async function withFixture(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "nilaza-local-runtime-test-"));
  const repoRoot = path.join(root, "repo");
  const storeRoot = path.join(root, "store");
  fs.mkdirSync(repoRoot);
  copyFixtureRepo(repoRoot);
  const context = { repoRoot, storeRoot, jobId };
  try { await callback(context, root); }
  finally { cleanup(root); }
}

function intake(role = "content_studio", overrides = {}) {
  return {
    identityKind: "operator_attested_local_session_provenance",
    intakeMode: "root_local_program_argument",
    sourceMode: "fixture",
    role,
    agentId: role === "content_studio" ? "fixture-author" : role === "independent_qa" ? "fixture-reviewer" : "fixture-owner",
    sessionId: role === "content_studio" ? "fixture-author-session" : role === "independent_qa" ? "fixture-review-session" : "fixture-owner-session",
    rootThreadId: "fixture-root-thread",
    attestedBy: "fixture-test-operator",
    attestedAt: "2026-10-01T00:00:00.000Z",
    ...overrides
  };
}

function authorPacket() {
  return {
    schemaVersion: "1.0.0", jobId, briefId,
    copy: {
      vi: { headline: "Một câu hỏi, ba bước nhỏ", body: "Gọi tên điều đang ở lại, nhìn lại một giả định và chọn bước nhỏ vừa đủ.", caption: "Một khoảng mở để lắng nghe mình.", cta: "Tham gia danh sách chờ", altText: "Ba thẻ đặt ba câu hỏi để tự phản chiếu." },
      en: { headline: "One question, three small steps", body: "Name what stays with you, notice an assumption, and choose one small step.", caption: "A space to listen to yourself.", cta: "Join the waitlist", altText: "Three cards offer questions for self-reflection." }
    },
    slides: [
      { vi: { headline: "Điều gì đang ở lại?", body: "Gọi tên một điều bạn muốn nhìn kỹ hơn.", altText: "Thẻ thứ nhất mở một câu hỏi." }, en: { headline: "What stays with you?", body: "Name one thing you want to look at more closely.", altText: "The first card opens a question." } },
      { vi: { headline: "Mình đang giả định gì?", body: "Một giả định nào có thể nhìn lại?", altText: "Thẻ thứ hai mời nhìn lại một giả định." }, en: { headline: "What am I assuming?", body: "What assumption could you reconsider?", altText: "The second card invites a closer look at an assumption." } },
      { vi: { headline: "Bước nhỏ nào là vừa đủ?", body: "Chọn một thử nghiệm nhỏ cho hôm nay.", altText: "Thẻ thứ ba mời chọn một bước nhỏ." }, en: { headline: "What small step feels enough?", body: "Choose one small experiment for today.", altText: "The third card invites one small step." } }
    ]
  };
}

async function prepare(context, overrides = {}) {
  return prepareJob({ ...context, briefId, idempotencyKey: "nilaza-fixture-stable-key", sourceMode: "fixture", ...overrides });
}

async function accept(context, overrides = {}) {
  return acceptAuthorPacket({ ...context, packet: authorPacket(), trustedIntake: intake(), ...overrides });
}

async function fixtureRenderer({ outputDir, packet }) {
  const files = [];
  for (const locale of ["vi", "en"]) {
    for (let slide = 1; slide <= 3; slide++) {
      const file = "slide-" + locale + "-" + String(slide).padStart(2, "0") + ".png";
      fs.writeFileSync(path.join(outputDir, file), png);
      files.push(file);
    }
  }
  fs.writeFileSync(path.join(outputDir, "review.html"), "<!doctype html><html lang=\"en\"><title>Synthetic fixture review</title><body>Fixture only</body></html>", "utf8");
  writeJson(path.join(outputDir, "copy.json"), packet.copy);
  writeJson(path.join(outputDir, "layout.json"), { classification: "synthetic_fixture", renderer: "test-pixel-fixture" });
  files.push("review.html", "copy.json", "layout.json");
  return { files, rendererVersion: "synthetic-test-renderer-v1" };
}

function jobDirectory(context) { return path.join(context.storeRoot, "jobs", context.jobId); }

function tree(root) {
  if (!fs.existsSync(root)) return [];
  const result = [];
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.isFile()) result.push({ path: path.relative(root, target).replaceAll(path.sep, "/"), sha256: digest(fs.readFileSync(target)) });
    }
  };
  visit(root);
  return result.sort((a, b) => a.path.localeCompare(b.path));
}

function requiredHash(value, keys, label) {
  const found = keys.map(key => value?.[key]).find(item => typeof item === "string" && item.length > 0);
  assert.ok(found, label + " must be present");
  return found;
}

function qaArguments(context, inspection, overrides = {}) {
  const candidate = inspection.candidate;
  const qualityGate = json(path.join(context.repoRoot, "packages/growth-core/config/quality-gates.json"));
  const manifest = inspection.creativeManifest;
  const artifactHash = requiredHash(manifest, ["candidateHash", "artifactHash"], "candidate hash");
  return {
    ...context,
    inputFingerprint: requiredHash(inspection.job, ["inputFingerprint"], "input fingerprint"),
    creativeBundleHash: requiredHash(manifest, ["creativeBundleHash", "bundleHash"], "creative bundle hash"),
    trustedIntake: intake("independent_qa"),
    verdict: {
      tenantId: "nilaza", artifactId: candidate.id, artifactVersion: candidate.version, artifactHash,
      rubricVersion: "growth_core_1", verdict: "pass", hardFailureCodes: [],
      softScores: Object.fromEntries(qualityGate.softDimensions.map(dimension => [dimension, 4])),
      reviewerRole: "independent_qa", reviewedAt: new Date().toISOString()
    },
    ...overrides
  };
}

async function renderedFixture(context, renderer = fixtureRenderer) {
  await prepare(context);
  await accept(context);
  await renderJob({ ...context, renderer });
  return inspectJob(context);
}

test("fixture replay and process-style reopening reuse one immutable candidate and one rendered bundle", async () => {
  await withFixture(async context => {
    let renders = 0;
    const renderer = async options => { renders++; return fixtureRenderer(options); };
    const first = await renderedFixture(context, renderer);
    assert.equal(first.sourceMode, "fixture");
    assert.equal(first.integrity.valid, true);
    const before = tree(jobDirectory(context)).filter(entry => entry.path.startsWith("candidates/") || entry.path.startsWith("renders/") || entry.path.startsWith("manifests/"));
    await prepare(context);
    await accept(context, { trustedIntake: intake("content_studio", { attestedAt: "2026-10-01T00:00:01.000Z" }) });
    await renderJob({ ...context, renderer });
    const reopened = await inspectJob({ ...context });
    assert.equal(renders, 1);
    assert.equal(reopened.receipts.length, first.receipts.length, "same-actor retry must not create new receipts");
    assert.equal(reopened.sourceMode, "fixture");
    assert.deepEqual(tree(jobDirectory(context)).filter(entry => entry.path.startsWith("candidates/") || entry.path.startsWith("renders/") || entry.path.startsWith("manifests/")), before);
    assert.equal(reopened.integrity.valid, true);
  });
});

test("changing input under the same idempotency key never silently overwrites prior work", async () => {
  await withFixture(async context => {
    await prepare(context);
    const jobBefore = fs.readFileSync(path.join(jobDirectory(context), "job.json"));
    const source = path.join(context.repoRoot, "packages/growth-nilaza/product-truth.json");
    const value = json(source);
    value.lastReviewedAt = "2026-10-02";
    writeJson(source, value);
    try { await prepare(context); } catch { /* rejecting stale replay is also safe */ }
    const stale = await inspectJob(context);
    assert.equal(stale.integrity.valid, false);
    assert.equal(stale.state, "invalidated");
    assert.deepEqual(fs.readFileSync(path.join(jobDirectory(context), "job.json")), jobBefore);
  });
});

test("same author agent or session cannot supply independent QA", async () => {
  await withFixture(async context => {
    const inspection = await renderedFixture(context);
    for (const identity of [
      { agentId: "fixture-author" },
      { sessionId: "fixture-author-session" }
    ]) {
      await assert.rejects(async () => submitQa(qaArguments(context, inspection, { trustedIntake: intake("independent_qa", identity) })), /independen|author|review|identity|session/i);
    }
    assert.equal(fs.existsSync(path.join(jobDirectory(context), "qa", "v1.json")), false);
  });
});

test("QA binds both creative bytes and the current input fingerprint", async () => {
  await withFixture(async context => {
    const inspection = await renderedFixture(context);
    const args = qaArguments(context, inspection);
    await assert.rejects(async () => submitQa({ ...args, creativeBundleHash: "sha256:" + "0".repeat(64) }), { code: "QA_BINDING_REJECTED" });
    await assert.rejects(async () => submitQa({ ...args, inputFingerprint: "sha256:" + "1".repeat(64) }), { code: "QA_BINDING_REJECTED" });
    await assert.rejects(async () => submitQa({ ...args, verdict: { ...args.verdict, artifactHash: "sha256:" + "2".repeat(64) } }), { code: "QA_BINDING_REJECTED" });
    await assert.rejects(async () => submitQa({ ...args, verdict: { ...args.verdict, rubricVersion: "unbound-fixture-rubric" } }), { code: "QA_BINDING_REJECTED" });
    assert.equal(fs.existsSync(path.join(jobDirectory(context), "qa", "v1.json")), false);
  });
});

test("passing fixture QA stays fixture_complete and cannot create Owner or external approval", async () => {
  await withFixture(async context => {
    const inspection = await renderedFixture(context);
    await submitQa(qaArguments(context, inspection));
    const reviewed = await inspectJob(context);
    assert.equal(reviewed.state, "fixture_complete");
    assert.equal(reviewed.sourceMode, "fixture");
    await assert.rejects(async () => recordOwnerReview({ ...context, decision: "approved_execution_envelope", reason: "fixture external state injection", trustedIntake: intake("owner") }), { code: "OWNER_REVIEW_NOT_READY" });
    const safe = await inspectJob(context);
    assert.equal(safe.state, "fixture_complete");
    assert.ok(!JSON.stringify(safe.ownerReview || {}).includes("approved_execution_envelope"));
  });
});

test("source drift invalidates an existing review without rerendering on inspection or reconciliation", async () => {
  await withFixture(async context => {
    let renders = 0;
    const renderer = async options => { renders++; return fixtureRenderer(options); };
    const inspection = await renderedFixture(context, renderer);
    await submitQa(qaArguments(context, inspection));
    const source = path.join(context.repoRoot, "packages/growth-core/config/quality-gates.json");
    const value = json(source);
    value.internalLibraryThreshold.minimumMeanScore += 0.01;
    writeJson(source, value);
    const stale = await inspectJob(context);
    assert.equal(stale.integrity.valid, false);
    assert.equal(stale.state, "invalidated");
    await reconcileJob(context);
    assert.equal((await inspectJob(context)).state, "invalidated");
    assert.equal(renders, 1);
  });
});

test("corrupting rendered bytes blocks QA and never fabricates a replacement output", async () => {
  await withFixture(async context => {
    const inspection = await renderedFixture(context);
    const output = tree(jobDirectory(context)).find(entry => entry.path.startsWith("renders/") && entry.path.endsWith(".png"));
    assert.ok(output);
    const outputPath = path.join(jobDirectory(context), output.path);
    fs.writeFileSync(outputPath, "corrupted fixture image", "utf8");
    await assert.rejects(async () => submitQa(qaArguments(context, inspection)), /hash|integrity|corrupt|invalidat|render|manifest/i);
    const reopened = await inspectJob(context);
    assert.equal(reopened.integrity.valid, false);
    assert.equal(fs.readFileSync(outputPath, "utf8"), "corrupted fixture image");
  });
});

test("corrupt persisted JSON fails closed without echoing its sensitive sentinel", async () => {
  await withFixture(async context => {
    await prepare(context);
    const receiptDirectory = path.join(jobDirectory(context), "receipts");
    const firstReceipt = fs.readdirSync(receiptDirectory).find(name => name.endsWith(".json"));
    assert.ok(firstReceipt);
    const sentinel = "PRIVATE_FIXTURE_SENTINEL";
    fs.writeFileSync(path.join(receiptDirectory, firstReceipt), "{" + sentinel, "utf8");
    try {
      const inspection = await inspectJob(context);
      assert.equal(inspection.integrity.valid, false);
      assert.ok(!JSON.stringify(inspection.integrity).includes(sentinel));
    } catch (error) {
      assert.ok(!error.message.includes(sentinel));
      assert.equal(error.code, "CORRUPT_RECORD");
    }
  });
});

test("nested private data and foreign-tenant fields are rejected before author-packet persistence", async () => {
  for (const mutate of [
    packet => { packet.strategy = { proposals: [], notes: ["fixture-contact@example.invalid"] }; },
    packet => { packet.research = { facts: [], hypotheses: [], sourceRefs: [], rawJournal: "private fixture note" }; },
    packet => { packet.tenantId = "another-business"; }
  ]) {
    await withFixture(async context => {
      await prepare(context);
      const packet = authorPacket();
      mutate(packet);
      await assert.rejects(async () => accept(context, { packet }), error => ["PRIVATE_MATERIAL_REJECTED", "INVALID_RECORD"].includes(error.code));
      assert.equal(fs.existsSync(path.join(jobDirectory(context), "candidates", "v1", "packet.json")), false);
    });
  }
});

test("an author cannot relabel a fixture as actual AI-session execution", async () => {
  await withFixture(async context => {
    await prepare(context);
    await assert.rejects(async () => accept(context, { trustedIntake: intake("content_studio", { sourceMode: "actual_ai_session_handback" }) }), { code: "UNTRUSTED_INTAKE" });
    assert.equal((await inspectJob(context)).sourceMode, "fixture");
  });
});

test("job identifiers and renderer paths cannot escape the designated local store", async () => {
  await withFixture(async (context, root) => {
    await assert.rejects(async () => prepare(context, { jobId: "../escaped-job" }), /job|path|identifier|safe/i);
    await prepare(context);
    await accept(context);
    const outside = path.join(root, "escaped.png");
    fs.writeFileSync(outside, png);
    const renderer = async () => ({ files: ["../../../../../../escaped.png"], rendererVersion: "unsafe-fixture-renderer" });
    const failedRender = await renderJob({ ...context, renderer });
    assert.ok(["render_retryable", "failed"].includes(failedRender.state));
    assert.deepEqual(fs.readFileSync(outside), png);
    assert.ok(!(await inspectJob(context)).creativeManifest);
  });
});

test("a symbolic-link store cannot redirect local writes to another directory", async t => {
  await withFixture(async (context, root) => {
    const outside = path.join(root, "outside");
    const linkedStore = path.join(root, "linked-store");
    fs.mkdirSync(outside);
    try { fs.symlinkSync(outside, linkedStore, process.platform === "win32" ? "junction" : "dir"); }
    catch (error) { t.skip("Filesystem cannot create containment test link: " + (error.code || "unknown")); return; }
    try {
      await assert.rejects(async () => prepare({ ...context, storeRoot: linkedStore }), /link|junction|store|real|directory|contain/i);
      assert.deepEqual(fs.readdirSync(outside), []);
    } finally { fs.unlinkSync(linkedStore); }
  });
});

test("local fixture jobs never synthesize product funnel metrics or invoke network APIs", async () => {
  await withFixture(async context => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => { calls++; throw new Error("network forbidden in local fixture test"); };
    try {
      const inspection = await renderedFixture(context);
      await submitQa(qaArguments(context, inspection));
      const final = await inspectJob(context);
      assert.equal(calls, 0);
      assert.equal(final.sourceMode, "fixture");
      assert.equal(final.state, "fixture_complete");
      const measurement = json(path.join(context.repoRoot, "packages/growth-nilaza/measurement/event-ownership-map.json"));
      assert.equal(measurement.status, "definition_only");
      const learning = json(path.join(context.repoRoot, "packages/growth-nilaza/learning/sprint-01-learning-note.json"));
      assert.equal(learning.status, "not_collected");
      assert.equal(learning.dataSource, "synthetic_only");
      for (const receipt of final.receipts) {
        assert.notEqual(receipt.status, "executed");
        assert.notEqual(receipt.humanDecisionState, "approved");
      }
    } finally { globalThis.fetch = originalFetch; }
  });
});




test("renderer failures are durably bounded to the initial attempt plus two retries", async () => {
  await withFixture(async context => {
    await prepare(context);
    await accept(context);
    let attempts = 0;
    const sentinel = "PRIVATE_FIXTURE_RENDERER_ERROR";
    const renderer = async () => { attempts++; throw new Error(sentinel); };
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await renderJob({ ...context, renderer });
      assert.equal(result.state, attempt < 3 ? "render_retryable" : "failed");
      assert.ok(!result.creativeManifest);
      assert.ok(!JSON.stringify(result).includes(sentinel), "receipt must contain a safe failure code, not renderer error text");
      const reopened = await inspectJob({ ...context });
      assert.equal(reopened.state, result.state);
    }
    await assert.rejects(async () => renderJob({ ...context, renderer }), /state|transition|retry|attempt|failed/i);
    assert.equal(attempts, 3);
    assert.equal((await inspectJob(context)).state, "failed");
  });
});

test("restart after a partial renderer failure keeps the candidate and produces one valid retry bundle", async () => {
  await withFixture(async context => {
    await prepare(context);
    await accept(context);
    const candidateBefore = tree(jobDirectory(context)).filter(entry => entry.path.startsWith("candidates/"));
    let attempts = 0;
    const renderer = async options => {
      attempts++;
      if (attempts === 1) {
        fs.writeFileSync(path.join(options.outputDir, "partial.png"), png);
        throw new Error("synthetic transient renderer failure");
      }
      return fixtureRenderer(options);
    };
    const failed = await renderJob({ ...context, renderer });
    assert.equal(failed.state, "render_retryable");
    assert.ok(!failed.creativeManifest);
    assert.equal((await inspectJob({ ...context })).state, "render_retryable");
    const retried = await renderJob({ ...context, renderer });
    assert.equal(retried.integrity.valid, true);
    assert.ok(retried.creativeManifest);
    assert.deepEqual(tree(jobDirectory(context)).filter(entry => entry.path.startsWith("candidates/")), candidateBefore);
    await submitQa(qaArguments(context, retried));
    await renderJob({ ...context, renderer });
    assert.equal(attempts, 2);
    assert.equal((await inspectJob(context)).state, "fixture_complete");
  });
});


test("frozen input snapshots and seed archives cannot be changed after prepare", async () => {
  for (const relative of ["inputs/snapshot.json", "inputs/seed.json"]) {
    await withFixture(async context => {
      await prepare(context);
      const target = path.join(jobDirectory(context), relative);
      const archived = json(target);
      archived.fixtureTamperMarker = "changed frozen archive";
      writeJson(target, archived);
      const inspection = await inspectJob(context);
      assert.equal(inspection.integrity.valid, false);
      assert.equal(inspection.state, "invalidated");
      await assert.rejects(async () => accept(context), /input|snapshot|seed|integrity|invalidat/i);
      assert.equal(fs.existsSync(path.join(jobDirectory(context), "candidates", "v1", "packet.json")), false);
    });
  }
});

test("author provenance is immutable and cannot be rewritten before independent QA", async () => {
  await withFixture(async context => {
    const rendered = await renderedFixture(context);
    const target = path.join(jobDirectory(context), "candidates", "v1", "intake.json");
    const provenance = json(target);
    provenance.agentId = "rewritten-fixture-author";
    writeJson(target, provenance);
    const inspection = await inspectJob(context);
    assert.equal(inspection.integrity.valid, false);
    assert.equal(inspection.state, "invalidated");
    await assert.rejects(async () => submitQa(qaArguments(context, rendered)), /intake|provenance|integrity|invalidat/i);
    assert.equal(fs.existsSync(path.join(jobDirectory(context), "qa", "v1.json")), false);
  });
});




test("changed author actor cannot reuse an accepted packet or replace archived provenance", async () => {
  await withFixture(async context => {
    await prepare(context);
    await accept(context);
    const before = tree(jobDirectory(context)).filter(entry => entry.path.startsWith("candidates/") || entry.path.startsWith("receipts/"));
    await assert.rejects(async () => accept(context, { trustedIntake: intake("content_studio", { agentId: "another-fixture-author" }) }), /intake|identity|actor|conflict/i);
    assert.deepEqual(tree(jobDirectory(context)).filter(entry => entry.path.startsWith("candidates/") || entry.path.startsWith("receipts/")), before);
  });
});

test("changing approved evidence or research documents invalidates prior hash-bound QA", async () => {
  await withFixture(async context => {
    const rendered = await renderedFixture(context);
    await submitQa(qaArguments(context, rendered));
    const source = path.join(context.repoRoot, "docs/BRAND_GUIDELINES.md");
    assert.ok(fs.existsSync(source));
    fs.appendFileSync(source, "\nFixture-only source change after independent QA.\n", "utf8");
    const stale = await inspectJob(context);
    assert.equal(stale.integrity.valid, false);
    assert.equal(stale.state, "invalidated");
    await reconcileJob(context);
    assert.equal((await inspectJob(context)).state, "invalidated");
  });
});

