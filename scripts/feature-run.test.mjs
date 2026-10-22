import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { commandScopeErrors, dirtyCoverageErrors, dirtyExecutionPaths, executionSourcePaths, parseFeatureRunArgs, parsePorcelainPaths, requiredOutputPaths, sourceReviewErrors } from "./feature-run.mjs";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const hash = (relativePath) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath)).toString("utf8").replace(/\r\n/g, "\n")).digest("hex");

test("feature:run accepts only an allowlisted script and a scoped record", () => {
  assert.deepEqual(parseFeatureRunArgs(["--record", "docs/feature-plans/example.json", "--script", "admin:dev"]), {
    record: "docs/feature-plans/example.json", script: "admin:dev"
  });
  for (const args of [
    ["--record", "../outside.json", "--script", "admin:dev"],
    ["--record", "docs/feature-plans/example.json", "--script", "supabase:seed:apply"],
    ["--record", "docs/feature-plans/example.json", "--script", "admin:dev", "--", "--port", "4000"],
    ["--record", "docs/feature-plans/example.json", "--script", "admin:dev", "--script", "mobile:dev"]
  ]) assert.throws(() => parseFeatureRunArgs(args));
});

test("development commands need write scope in their owning surface", () => {
  assert.deepEqual(commandScopeErrors({ writeScope: ["apps/mobile/App.tsx"] }, "mobile:dev"), []);
  assert.match(commandScopeErrors({ writeScope: ["apps/admin/index.html"] }, "mobile:dev")[0], /apps\/mobile/);
  assert.deepEqual(commandScopeErrors({ writeScope: [null] }, "admin:dev"), ["Plan writeScope is invalid"]);
});

test("generators need every generated output in write scope", () => {
  assert.deepEqual(requiredOutputPaths("admin:growth:seed"), ["apps/admin/generated/growth-operations.json"]);
  assert.deepEqual(commandScopeErrors({ writeScope: ["apps/admin/generated/growth-operations.json"] }, "admin:growth:seed"), []);
  assert.match(commandScopeErrors({ writeScope: ["apps/admin/growth.js"] }, "admin:growth:seed")[0], /growth-operations\.json/);
  assert.deepEqual(executionSourcePaths("admin:growth:seed"), ["apps/admin/growth-operations-model.mjs", "scripts/build-admin-growth.mjs"]);
  const brandManifest = { outputs: [
    { path: "apps/web/public/logo.png" },
    { path: "apps/mobile/assets/logo.png" }
  ] };
  assert.deepEqual(requiredOutputPaths("assets:generate", brandManifest), [
    "packages/content/data/brand-exports.json",
    "apps/web/public/logo.png",
    "apps/mobile/assets/logo.png"
  ]);
  const errors = commandScopeErrors({ writeScope: ["packages/content/data/brand-exports.json", "apps/web/public/logo.png"] }, "assets:generate", brandManifest);
  assert.deepEqual(errors, ["Plan writeScope does not cover generated output: apps/mobile/assets/logo.png"]);
  assert.throws(() => requiredOutputPaths("assets:generate", { outputs: [{ path: "supabase/migrations/surprise.sql" }] }), /unexpected output path/);
  assert.deepEqual(commandScopeErrors({ writeScope: ["packages/content/generated/public-help-corpus/"] }, "public-help-corpus:build"), []);
});

test("prompt consumer generation cannot cover only one deployment surface", () => {
  const errors = commandScopeErrors({ writeScope: ["apps/admin/generated/prompt-composition/"] }, "prompt:consumers:generate");
  assert.equal(errors.length, 3);
  assert.ok(errors.every((error) => error.includes("supabase/functions/_shared/prompt-composition/")));
  assert.deepEqual(commandScopeErrors({ writeScope: ["apps/admin/generated/prompt-composition/", "supabase/functions/_shared/prompt-composition/"] }, "prompt:consumers:generate"), []);
});

test("git status parser includes staged, unstaged, untracked, and renamed paths", () => {
  assert.deepEqual(parsePorcelainPaths(" M apps/mobile/App.tsx\0M  packages/example.ts\0?? packages/new.ts\0R  apps/mobile/new.ts\0apps/mobile/old.ts\0"), [
    "apps/mobile/App.tsx", "packages/example.ts", "packages/new.ts", "apps/mobile/new.ts", "apps/mobile/old.ts"
  ]);
  assert.throws(() => parsePorcelainPaths("R  apps/mobile/new.ts\0"), /Incomplete rename/);
});

test("dirty input inventory sees real staged, unstaged, and untracked files", () => {
  const tempRoot = fs.realpathSync(os.tmpdir());
  const checkout = fs.mkdtempSync(path.join(tempRoot, "nilaza-feature-run-"));
  const git = (...args) => execFileSync("git", args, { cwd: checkout, stdio: "pipe" });
  try {
    fs.mkdirSync(path.join(checkout, "apps/mobile"), { recursive: true });
    fs.writeFileSync(path.join(checkout, "apps/mobile/staged.ts"), "before\n");
    fs.writeFileSync(path.join(checkout, "apps/mobile/unstaged.ts"), "before\n");
    git("init", "-q");
    git("config", "user.name", "Nilaza test");
    git("config", "user.email", "test@nilaza.invalid");
    git("add", ".");
    git("-c", "commit.gpgsign=false", "commit", "-qm", "fixture");
    fs.writeFileSync(path.join(checkout, "apps/mobile/staged.ts"), "after\n");
    git("add", "apps/mobile/staged.ts");
    fs.writeFileSync(path.join(checkout, "apps/mobile/unstaged.ts"), "after\n");
    fs.writeFileSync(path.join(checkout, "apps/mobile/tệp mới.ts"), "new\n");
    assert.deepEqual(dirtyExecutionPaths(["apps/mobile/"], checkout).sort(), [
      "apps/mobile/staged.ts", "apps/mobile/tệp mới.ts", "apps/mobile/unstaged.ts"
    ].sort());
  } finally {
    const resolved = path.resolve(checkout);
    if (!resolved.startsWith(`${tempRoot}${path.sep}`) || !path.basename(resolved).startsWith("nilaza-feature-run-")) {
      throw new Error("Unsafe test checkout cleanup path");
    }
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});

test("local entry scripts and imported helpers require current sourceReview hashes", () => {
  const sources = executionSourcePaths("admin:dev");
  assert.deepEqual(sources, ["scripts/admin-runtime-config.mjs", "scripts/serve-admin.mjs"]);
  const reviewed = { sourceReview: sources.map((sourcePath) => ({ path: sourcePath, sha256: hash(sourcePath) })) };
  assert.deepEqual(sourceReviewErrors(reviewed, sources), []);
  assert.match(sourceReviewErrors({ sourceReview: reviewed.sourceReview.slice(1) }, sources)[0], /admin-runtime-config/);
  assert.match(sourceReviewErrors({ sourceReview: [{ path: sources[0], sha256: "0".repeat(64) }, reviewed.sourceReview[1]] }, sources)[0], /changed since sourceReview/);
});

test("dirty execution inputs need declared scope or a matching sourceReview hash", () => {
  const record = {
    writeScope: ["apps/mobile/index.js"],
    sourceReview: [{ path: "package.json", sha256: hash("package.json") }]
  };
  assert.deepEqual(dirtyCoverageErrors(record, ["apps/mobile/index.js", "package.json"]), []);
  assert.match(dirtyCoverageErrors(record, ["apps/mobile/App.tsx"])[0], /outside writeScope/);
  assert.match(dirtyCoverageErrors(record, ["package-lock.json"])[0], /outside writeScope/);
  assert.match(dirtyCoverageErrors({ ...record, sourceReview: [{ path: "package.json", sha256: "0".repeat(64) }] }, ["package.json"])[0], /outside writeScope/);
});

test("a failed preflight never starts an allowlisted generator", () => {
  const result = spawnSync(process.execPath, ["scripts/feature-run.mjs", "--record", "docs/feature-plans/missing.json", "--script", "admin:seed"], {
    cwd: root, encoding: "utf8", env: { ...process.env, npm_execpath: path.join(root, "scripts/feature-run.test.mjs") }
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Feature preflight did not pass; admin:seed was not started/);
  assert.doesNotMatch(result.stdout, /Generated apps\/admin\/generated\/content-seed\.json/);
});
