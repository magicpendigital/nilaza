import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { promptConsumerArtifacts, promptConsumerParityErrors } from "./build-prompt-consumers.mjs";
import { composePromptPreview as canonicalCompose, PROMPT_BUNDLE } from "../packages/agent-config/prompt-composition/compose.mjs";
import { composePromptPreview as adminCompose } from "../apps/admin/generated/prompt-composition/compose.mjs";
import { composePromptPreview as edgeCompose } from "../supabase/functions/_shared/prompt-composition/compose.mjs";

test("Admin and Edge packaged sources and manifests exactly match the canonical bundle", () => {
  const artifacts = promptConsumerArtifacts();
  assert.equal(artifacts.length, 6);
  assert.deepEqual(promptConsumerParityErrors(artifacts), []);
});

test("missing or changed consumer files fail parity without disclosing their contents", () => {
  const artifacts = promptConsumerArtifacts();
  const changed = Buffer.from("private fixture body");
  const errors = promptConsumerParityErrors(artifacts, (relative) => {
    if (relative.endsWith("/manifest.json")) throw new Error("private diagnostic");
    return changed;
  });
  assert.equal(errors.length, 6);
  assert.ok(errors.every((error) => !error.includes("private")));
});

for (const locale of ["vi", "en"]) {
  test(`${locale}: both packaged consumers compile the same message envelope and provenance`, () => {
    const input = { bundleVersion: PROMPT_BUNDLE.manifest.version, feature: "oracle_router", locale, tone: "gentle", question: "Fictional reflection fixture" };
    const canonical = canonicalCompose(input);
    assert.equal(canonical.providerReady, false);
    assert.equal(canonical.budget.tokens.status, "not-assessed");
    assert.deepEqual(adminCompose(input), canonical);
    assert.deepEqual(edgeCompose(input), canonical);
  });
}

test("isolated hosted build rejects a changed packaged compiler before writing public config", () => {
  const repository = fileURLToPath(new URL("../", import.meta.url));
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(temporaryRoot, "nilaza-hosted-prompt-"));
  try {
    const promptDirectory = path.join(directory, "generated/prompt-composition");
    fs.mkdirSync(promptDirectory, { recursive: true });
    for (const name of ["bundle.mjs", "compose.mjs", "manifest.json"]) fs.copyFileSync(path.join(repository, "apps/admin/generated/prompt-composition", name), path.join(promptDirectory, name));
    fs.copyFileSync(path.join(repository, "apps/admin/build-hosted-config.mjs"), path.join(directory, "build-hosted-config.mjs"));
    fs.writeFileSync(path.join(directory, "index.html"), '<script src="./config.js"></script>');
    const options = { cwd: directory, encoding: "utf8", env: { ...process.env, NILAZA_QA_SUPABASE_URL: "https://fixture.supabase.co", NILAZA_QA_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture" } };
    const valid = spawnSync(process.execPath, ["build-hosted-config.mjs"], options);
    assert.equal(valid.status, 0, valid.stderr);
    assert.match(fs.readFileSync(path.join(directory, "config.js"), "utf8"), /fixture\.supabase\.co/);
    fs.unlinkSync(path.join(directory, "config.js"));
    fs.appendFileSync(path.join(promptDirectory, "compose.mjs"), "\n// unreviewed drift\n");
    const invalid = spawnSync(process.execPath, ["build-hosted-config.mjs"], options);
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /Packaged prompt checksum mismatch/);
    assert.equal(fs.existsSync(path.join(directory, "config.js")), false);
  } finally {
    const resolved = path.resolve(directory);
    if (!resolved.startsWith(`${temporaryRoot}${path.sep}`) || !path.basename(resolved).startsWith("nilaza-hosted-prompt-")) throw new Error("Unsafe fixture cleanup path");
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
