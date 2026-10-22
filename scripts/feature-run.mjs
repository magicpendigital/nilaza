import crypto from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeRepoPath, scopeCovers } from "./feature-preflight.mjs";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const scripts = Object.freeze({
  "web:dev": { command: "npm --workspace apps/web run dev --", area: "apps/web/", inputs: ["apps/web/", "packages/"], workspace: ["apps/web/package.json", "dev", "astro dev"] },
  "admin:dev": { command: "node scripts/serve-admin.mjs", area: "apps/admin/", inputs: ["apps/admin/", "packages/", "assets/"], entry: "scripts/serve-admin.mjs" },
  "mobile:dev": { command: "npm --workspace apps/mobile run dev --", area: "apps/mobile/", inputs: ["apps/mobile/", "packages/"], workspace: ["apps/mobile/package.json", "dev", "expo start --host localhost"] },
  "mobile:web": { command: "npm --workspace apps/mobile run web --", area: "apps/mobile/", inputs: ["apps/mobile/", "packages/"], workspace: ["apps/mobile/package.json", "web", "expo start --web --host localhost"] },
  "admin:seed": { command: "node scripts/build-admin-seed.mjs", inputs: ["packages/content/data/"], entry: "scripts/build-admin-seed.mjs", outputs: ["apps/admin/generated/content-seed.json"] },
  "prompt:consumers:generate": { command: "node scripts/build-prompt-consumers.mjs", inputs: ["packages/agent-config/prompt-composition/"], entry: "scripts/build-prompt-consumers.mjs", outputs: ["apps/admin/generated/prompt-composition/bundle.mjs", "apps/admin/generated/prompt-composition/compose.mjs", "apps/admin/generated/prompt-composition/manifest.json", "supabase/functions/_shared/prompt-composition/bundle.mjs", "supabase/functions/_shared/prompt-composition/compose.mjs", "supabase/functions/_shared/prompt-composition/manifest.json"] },
  "admin:growth:seed": { command: "node scripts/build-admin-growth.mjs", inputs: ["packages/growth-nilaza/"], entry: "scripts/build-admin-growth.mjs", outputs: ["apps/admin/generated/growth-operations.json"] },
  "public-help-corpus:build": { command: "node scripts/build-public-help-corpus.mjs", inputs: ["apps/web/src/content/help/", "apps/web/src/content/legal/"], entry: "scripts/build-public-help-corpus.mjs", outputs: ["packages/content/generated/public-help-corpus/manifest.json", "packages/content/generated/public-help-corpus/corpus.jsonl"] },
  "assets:generate": { command: "node scripts/generate-brand-assets.mjs", inputs: ["packages/content/data/brand-identity.json"], entry: "scripts/generate-brand-assets.mjs", outputs: ["packages/content/data/brand-exports.json"], brandOutputs: true },
  "council:contract:generate": { command: "node scripts/generate-council-contract.mjs", inputs: ["packages/agent-config/council-contract.json"], entry: "scripts/generate-council-contract.mjs", outputs: ["supabase/functions/_shared/council-contract.ts"] },
  "astrology:contract:generate": { command: "node scripts/generate-astrology-contract.mjs", inputs: ["packages/astrology-core/chart.schema.json", "packages/astrology-core/tai-utc.json"], entry: "scripts/generate-astrology-contract.mjs", outputs: ["packages/astrology-core/schema-validator.mjs", "packages/astrology-core/tai-utc-data.mjs"] },
  "astrology:ai-contract:generate": { command: "node scripts/generate-astrology-ai-contract.mjs", inputs: ["packages/agent-config/astrology-ai-insight/"], entry: "scripts/generate-astrology-ai-contract.mjs", outputs: ["supabase/functions/_shared/astrology-ai-insight-contract.ts"] }
});

const commonInputs = ["package.json", "package-lock.json", "scripts/feature-run.mjs", "scripts/feature-preflight.mjs"];
const textExtensions = /\.(?:md|json|mjs|js|jsx|ts|tsx|yaml|yml|txt|toml|sql|py|ps1|html|css|xml)$/i;
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
function sourceSha256(relativePath) {
  const bytes = fs.readFileSync(path.join(root, relativePath));
  return sha256(textExtensions.test(relativePath) ? bytes.toString("utf8").replace(/\r\n/g, "\n") : bytes);
}

export function parseFeatureRunArgs(argv) {
  let record;
  let script;
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === "--record" && record === undefined) record = argv[++index];
    else if (option === "--script" && script === undefined) script = argv[++index];
    else throw new Error(`Unsupported feature:run argument: ${option}`);
  }
  const normalized = normalizeRepoPath(record);
  if (!normalized || normalized !== record || !normalized.startsWith("docs/feature-plans/") || !normalized.endsWith(".json")) {
    throw new Error("--record must name a repository JSON file under docs/feature-plans/");
  }
  if (!Object.hasOwn(scripts, script)) throw new Error(`Unsupported feature:run script: ${String(script)}`);
  return { record, script };
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

export function parsePorcelainPaths(output) {
  const fields = output.split("\0");
  const paths = [];
  for (let index = 0; index < fields.length; index += 1) {
    const item = fields[index];
    if (!item) continue;
    if (item.length < 4 || item[2] !== " ") throw new Error("Unexpected git status output");
    paths.push(item.slice(3).replaceAll("\\", "/"));
    if (/[RC]/.test(item.slice(0, 2))) {
      const original = fields[++index];
      if (!original) throw new Error("Incomplete rename/copy in git status output");
      paths.push(original.replaceAll("\\", "/"));
    }
  }
  return [...new Set(paths)];
}

export function dirtyExecutionPaths(pathspecs, cwd = root) {
  const output = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--", ...pathspecs], {
    cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
  });
  return parsePorcelainPaths(output);
}

function localImportPaths(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  const imports = [];
  const pattern = /\b(?:import|export)\s+(?:[^"']*?\s+from\s*)?["'](\.\.?\/[^"']+)["']|\bimport\s*\(\s*["'](\.\.?\/[^"']+)["']\s*\)/g;
  for (const match of source.matchAll(pattern)) {
    const candidate = path.posix.normalize(path.posix.join(path.posix.dirname(relativePath), match[1] || match[2]));
    const normalized = normalizeRepoPath(candidate);
    if (!normalized || !/\.(?:mjs|js|json)$/.test(normalized) || !fs.existsSync(path.join(root, normalized))) {
      throw new Error(`Unresolved local import in ${relativePath}; review the entry script before execution`);
    }
    imports.push(normalized);
  }
  return imports;
}

export function executionSourcePaths(script) {
  const entry = scripts[script]?.entry;
  if (!entry) return [];
  const seen = new Set();
  const pending = [entry];
  while (pending.length) {
    const current = pending.pop();
    if (seen.has(current)) continue;
    seen.add(current);
    pending.push(...localImportPaths(current));
  }
  return [...seen].sort();
}

export function sourceReviewErrors(record, sourcePaths) {
  const reviewed = new Map((record?.sourceReview || []).map((item) => [item.path, item.sha256]));
  const errors = [];
  for (const sourcePath of sourcePaths) {
    const absolute = path.join(root, sourcePath);
    const recordedHash = reviewed.get(sourcePath);
    if (!recordedHash) errors.push(`Execution source must be bound in sourceReview: ${sourcePath}`);
    else if (!fs.existsSync(absolute) || sourceSha256(sourcePath) !== recordedHash.toLowerCase()) errors.push(`Execution source changed since sourceReview: ${sourcePath}`);
  }
  return errors;
}

export function dirtyCoverageErrors(record, dirtyPaths) {
  const scope = record?.writeScope || [];
  const reviewed = new Map((record?.sourceReview || []).map((item) => [item.path, item.sha256]));
  const errors = [];
  for (const dirtyPath of dirtyPaths) {
    if (scopeCovers(scope, dirtyPath)) continue;
    const expected = reviewed.get(dirtyPath);
    const absolute = path.join(root, dirtyPath);
    if (!expected || !fs.existsSync(absolute) || sourceSha256(dirtyPath) !== expected.toLowerCase()) {
      errors.push(`Dirty execution input is outside writeScope and current sourceReview: ${dirtyPath}`);
    }
  }
  return errors;
}

function executionInputPaths(script, brandManifest) {
  const spec = scripts[script];
  const paths = [...commonInputs, ...spec.inputs, ...executionSourcePaths(script)];
  if (spec.brandOutputs) {
    for (const asset of brandManifest?.assets || []) {
      const candidate = normalizeRepoPath(asset?.path);
      if (!candidate || !/^(?:assets\/brand\/open-reflection\/v1\/|assets\/features\/open-reflection-(?:home|welcome)\.png$)/.test(candidate)) {
        throw new Error("Brand manifest has an unexpected source path");
      }
      paths.push(candidate);
    }
  }
  return [...new Set(paths)];
}

export function requiredOutputPaths(script, brandManifest = null) {
  const spec = scripts[script];
  if (!spec) throw new Error(`Unsupported feature:run script: ${String(script)}`);
  const outputs = [...(spec.outputs || [])];
  if (spec.brandOutputs) {
    if (!Array.isArray(brandManifest?.outputs) || brandManifest.outputs.length === 0) throw new Error("Brand output manifest is empty or malformed");
    for (const output of brandManifest.outputs) {
      const candidate = normalizeRepoPath(output?.path);
      if (!candidate || !/^apps\/(mobile\/assets\/|mobile\/android\/app\/src\/main\/res\/|web\/public\/|admin\/assets\/|admin\/favicon)/.test(candidate)) {
        throw new Error("Brand manifest has an unexpected output path");
      }
      outputs.push(candidate);
    }
  }
  return [...new Set(outputs)];
}

export function commandScopeErrors(record, script, brandManifest = null) {
  const spec = scripts[script];
  if (!spec) return [`Unsupported feature:run script: ${String(script)}`];
  const scope = record?.writeScope;
  if (!Array.isArray(scope) || !scope.every((entry) => typeof entry === "string" && normalizeRepoPath(entry, { directory: true }) === entry)) return ["Plan writeScope is invalid"];
  if (spec.area && !scope.some((entry) => entry.startsWith(spec.area))) return [`Plan writeScope must include a path under ${spec.area} for ${script}`];
  return requiredOutputPaths(script, brandManifest)
    .filter((output) => !scopeCovers(scope, output))
    .map((output) => `Plan writeScope does not cover generated output: ${output}`);
}

function verifyNpmScripts(script) {
  const spec = scripts[script];
  const rootPackage = readJson("package.json");
  if (rootPackage.scripts?.[script] !== spec.command) throw new Error(`npm script ${script} changed; review the feature:run allowlist before execution`);
  if (rootPackage.scripts?.[`pre${script}`] || rootPackage.scripts?.[`post${script}`]) throw new Error(`npm lifecycle hook for ${script} requires explicit review`);
  if (spec.workspace) {
    const [file, name, expected] = spec.workspace;
    const workspace = readJson(file);
    if (workspace.scripts?.[name] !== expected || workspace.scripts?.[`pre${name}`] || workspace.scripts?.[`post${name}`]) {
      throw new Error(`Workspace script ${file}:${name} changed; review the feature:run allowlist before execution`);
    }
  }
}

async function main() {
  const { record, script } = parseFeatureRunArgs(process.argv.slice(2));
  verifyNpmScripts(script);
  try {
    execFileSync(process.execPath, [path.join(root, "scripts/feature-preflight.mjs"), "--record", record], { cwd: root, stdio: "inherit" });
  } catch {
    throw new Error(`Feature preflight did not pass; ${script} was not started`);
  }

  const plan = readJson(record);
  const brandManifest = script === "assets:generate" ? readJson("packages/content/data/brand-identity.json") : null;
  const scopeErrors = commandScopeErrors(plan, script, brandManifest);
  if (scopeErrors.length) throw new Error(`${script} was not started:\n- ${scopeErrors.join("\n- ")}`);
  const sources = executionSourcePaths(script);
  const reviewErrors = sourceReviewErrors(plan, sources);
  if (reviewErrors.length) throw new Error(`${script} was not started:\n- ${reviewErrors.join("\n- ")}`);
  const dirty = dirtyExecutionPaths(executionInputPaths(script, brandManifest));
  const dirtyErrors = dirtyCoverageErrors(plan, dirty);
  if (dirtyErrors.length) throw new Error(`${script} was not started:\n- ${dirtyErrors.join("\n- ")}`);

  const npmCli = process.env.npm_execpath;
  if (!npmCli || !path.isAbsolute(npmCli) || !fs.existsSync(npmCli)) throw new Error("Run feature:run through npm so its local npm CLI can be located");
  console.log(`Feature preflight passed; starting allowlisted ${script}.`);
  const child = spawn(process.execPath, [npmCli, "run", script], { cwd: root, stdio: "inherit", env: process.env });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  child.on("error", (error) => { console.error(`Could not start ${script}: ${error.message}`); process.exitCode = 1; });
  child.on("exit", (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(`Feature run blocked: ${error.message}`); process.exitCode = 1; });
}
