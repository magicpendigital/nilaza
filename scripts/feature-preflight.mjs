import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkDatabaseTargetReference } from "./database-target-gate.mjs";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const coreSources = ["AGENTS.md", "docs/AGENT_TASK_ROUTER.md", "docs/PLAN_QC_PROTOCOL.md"];
const impactFields = ["entryPoint", "dataWrite", "backendContract", "adminVisibility", "privacySafety", "observability", "rollback"];
const securityFields = ["authzRls", "sensitiveData", "secretsLogging", "externalInput", "dependencies", "migrationRelease", "stopCondition"];
const featurePrefixes = ["apps/", "packages/", "supabase/", "scripts/", "assets/", "skills/", "design/", "docs/", ".github/"];
const featureFiles = new Set(["AGENTS.md", "DESIGN.md", ".gitignore", ".npmrc", "deno.lock", "package.json", "package-lock.json", "vercel.json"]);
const planPrefix = "docs/feature-plans/";
const overbroadScopes = new Set(["apps/", "packages/", "supabase/", "scripts/", "assets/", "skills/", "design/", "docs/", ".github/", ".github/workflows/"]);
const skillRoutes = [
  { name: "nilaza-brand-experience", matches: (entry) => entry === "DESIGN.md" || entry === "docs/BRAND_GUIDELINES.md" || entry.startsWith("assets/brand/") || entry.startsWith("design/launch/") || entry.startsWith("apps/web/") },
  { name: "nilaza-tarot-deck-production", matches: (entry) => entry.startsWith("assets/tarot/") || entry.startsWith("packages/content/data/tarot-") || entry === "packages/agent-config/tarot-card-skills.json" || entry === "docs/TAROT_CONTENT_SYSTEM.md" },
  { name: "nilaza-tarot-content-qc", matches: (entry) => entry.startsWith("packages/content/data/tarot-") || entry === "packages/agent-config/tarot-card-skills.json" || entry === "docs/TAROT_CONTENT_SYSTEM.md" },
  { name: "nilaza-tarot-art-qc", matches: (entry) => entry.startsWith("assets/tarot/") || entry === "docs/TAROT_CONTENT_SYSTEM.md" }
];
const hexSha256 = /^[a-f0-9]{64}$/i;
const textExtensions = /\.(?:md|json|mjs|js|jsx|ts|tsx|yaml|yml|txt|toml|sql|py|ps1|html|css|xml)$/i;

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
function sourceSha256(relativePath, absolutePath) {
  const bytes = fs.readFileSync(absolutePath);
  return sha256(textExtensions.test(relativePath) ? bytes.toString("utf8").replace(/\r\n/g, "\n") : bytes);
}
const nonempty = (value) => typeof value === "string" && value.trim().length >= 12 && !/^(todo|tbd|n\/a|none|placeholder)$/i.test(value.trim());
const withinRoot = (candidate) => candidate === root || candidate.startsWith(`${root}${path.sep}`);

export function normalizeRepoPath(value, { directory = false } = {}) {
  if (typeof value !== "string" || !value.trim() || /[\\:*?\[\]\0]/.test(value)) return null;
  const raw = value.replace(/\/$/, "");
  if (!raw || raw.startsWith("/") || raw.split("/").some((part) => part === ".." || part === "." || !part)) return null;
  const normalized = path.posix.normalize(raw);
  if (normalized !== raw) return null;
  return directory && value.endsWith("/") ? `${normalized}/` : normalized;
}

export function scopeCovers(scope, relativePath) {
  return scope.some((entry) => entry.endsWith("/") ? relativePath.startsWith(entry) : relativePath === entry);
}

function resolveExistingFile(relativePath) {
  const normalized = normalizeRepoPath(relativePath);
  if (!normalized) return null;
  const absolute = path.resolve(root, normalized);
  if (!withinRoot(absolute) || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return null;
  if (!withinRoot(fs.realpathSync(absolute))) return null;
  return absolute;
}

function git(args, cwd = root) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

export function changedPathsSince(base, cwd = root) {
  // NUL output preserves Unicode, whitespace, and literal quotes in Git paths.
  // --no-renames reports both sides of a rename, including the deleted source.
  return git(["diff", "--name-only", "-z", "--no-renames", `${base}...HEAD`], cwd).split("\0").filter(Boolean);
}

function dirtyPaths(scope) {
  if (!scope.length) return [];
  const output = git(["status", "--porcelain=v1", "-z", "--untracked-files=all", "--", ...scope.map((entry) => entry.replace(/\/$/, ""))]);
  const fields = output.split("\0").filter(Boolean);
  const paths = [];
  for (let index = 0; index < fields.length; index += 1) {
    const item = fields[index];
    paths.push(item.slice(3).replaceAll("\\", "/"));
    if (/^[RC]/.test(item) || /^[ MARCUD?!][RC]/.test(item)) index += 1;
  }
  return [...new Set(paths)].sort();
}

export function isFeaturePath(relativePath) {
  return !relativePath.startsWith(planPrefix) && (featureFiles.has(relativePath) || featurePrefixes.some((prefix) => relativePath.startsWith(prefix)));
}

export function uncoveredFeaturePaths(changedPaths, scopes) {
  return changedPaths.filter(isFeaturePath).filter((relativePath) => !scopes.some((scope) => scopeCovers(scope, relativePath)));
}

export function unreviewedChangedSkills(changedPaths, records, knownSkills) {
  const names = new Set();
  for (const changedPath of changedPaths) {
    const [, name] = /^skills\/([^/]+)\//.exec(changedPath) || [];
    if (name) names.add(name);
  }
  return [...names].filter((name) => !knownSkills.has(name) || !records.some((record) => record.skillReview?.some((item) => item.name === name && item.decision === "updated")));
}

function parseArgs(argv) {
  const options = { ci: false, record: null, base: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--ci") options.ci = true;
    else if (arg === "--record") options.record = argv[++index];
    else if (arg === "--base") options.base = argv[++index];
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (options.ci && (!options.base || options.record)) throw new Error("CI mode requires --base <commit> and no --record");
  if (!options.ci && (!options.record || options.base)) throw new Error("Local mode requires --record <docs/feature-plans/task.json>");
  return options;
}

export function collectRecordErrors(record, relativePath, { checkWorkingTree = false } = {}) {
  const errors = [];
  const requireText = (value, label) => { if (!nonempty(value)) errors.push(`${label} needs a concrete explanation (12+ characters)`); };
  const requireList = (value, label) => { if (!Array.isArray(value) || value.length === 0) errors.push(`${label} must be a nonempty list`); };
  if (record.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  for (const field of ["taskId", "ownerAgent", "lane", "goal", "managerTestPath", "residualRisk"]) requireText(record[field], field);
  requireList(record.successCriteria, "successCriteria");
  for (const value of record.successCriteria || []) requireText(value, "successCriteria item");
  requireList(record.writeScope, "writeScope");
  const scope = [];
  for (const entry of record.writeScope || []) {
    const normalized = normalizeRepoPath(entry, { directory: true });
    if (!normalized || normalized !== entry || entry.startsWith(planPrefix) || overbroadScopes.has(entry)) errors.push(`Invalid or overbroad writeScope path: ${String(entry)}`);
    else scope.push(normalized);
  }
  requireList(record.untouchedSurfaces, "untouchedSurfaces");
  for (const value of record.untouchedSurfaces || []) requireText(value, "untouchedSurfaces item");
  for (const field of impactFields) requireText(record.impact?.[field], `impact.${field}`);
  requireList(record.canonicalContracts, "canonicalContracts");
  for (const value of record.canonicalContracts || []) requireText(value, "canonicalContracts item");
  requireList(record.validationCommands, "validationCommands");
  for (const value of record.validationCommands || []) requireText(value, "validationCommands item");
  for (const field of securityFields) requireText(record.securityReview?.[field], `securityReview.${field}`);
  if (!Array.isArray(record.securityReview?.unresolvedHighRisks)) errors.push("securityReview.unresolvedHighRisks must be a list");
  else if (record.securityReview.unresolvedHighRisks.length) errors.push("Unresolved high or critical risks block feature implementation");

  const policy = JSON.parse(fs.readFileSync(path.join(root, "packages/agent-config/agent-execution-policy.json"), "utf8"));
  requireList(record.allowedDataClasses, "allowedDataClasses");
  for (const value of record.allowedDataClasses || []) {
    if (policy.forbiddenDataClasses.includes(value)) errors.push(`Forbidden data class in plan: ${value}`);
  }

  requireList(record.sourceReview, "sourceReview");
  const reviewed = new Set();
  for (const source of record.sourceReview || []) {
    const sourcePath = normalizeRepoPath(source?.path);
    if (!sourcePath) { errors.push("sourceReview contains an invalid path"); continue; }
    reviewed.add(sourcePath);
    const absolute = resolveExistingFile(sourcePath);
    if (!absolute) errors.push(`sourceReview source missing or outside repository: ${sourcePath}`);
    else if (!hexSha256.test(source.sha256 || "") || sourceSha256(sourcePath, absolute) !== source.sha256.toLowerCase()) errors.push(`sourceReview is stale: ${sourcePath}`);
    requireText(source.reason, `sourceReview ${sourcePath} reason`);
  }
  for (const required of coreSources) if (!reviewed.has(required)) errors.push(`sourceReview must include ${required}`);
  if (reviewed.size <= coreSources.length) errors.push("sourceReview needs at least one task-specific source");

  const manifest = JSON.parse(fs.readFileSync(path.join(root, "skills/manifest.json"), "utf8"));
  const knownSkills = new Set(manifest.skills.map((skill) => skill.name));
  requireList(record.skillReview, "skillReview");
  const reviewedSkills = new Map();
  for (const skill of record.skillReview || []) {
    if (!knownSkills.has(skill?.name)) errors.push(`Unknown reviewed skill: ${String(skill?.name)}`);
    if (!["updated", "verified-current"].includes(skill?.decision)) errors.push(`Invalid skill decision: ${String(skill?.decision)}`);
    requireText(skill?.evidence, `skillReview ${String(skill?.name)} evidence`);
    reviewedSkills.set(skill?.name, skill?.decision);
  }
  if (!reviewedSkills.has("nilaza-plan-qc")) errors.push("skillReview must include nilaza-plan-qc");
  for (const route of skillRoutes) {
    if (scope.some(route.matches) && !reviewedSkills.has(route.name)) errors.push(`skillReview must include ${route.name} for the declared writeScope`);
  }
  for (const entry of scope) {
    if (!entry.startsWith("skills/")) continue;
    const skillName = entry.split("/")[1];
    if (knownSkills.has(skillName) && reviewedSkills.get(skillName) !== "updated") errors.push(`Skill ${skillName} is in writeScope and must be marked updated`);
  }

  if (!record.dependencyReview || typeof record.dependencyReview.usesVolatileExternalKnowledge !== "boolean") errors.push("dependencyReview.usesVolatileExternalKnowledge must be boolean");
  requireText(record.dependencyReview?.evidence, "dependencyReview.evidence");
  if (!Array.isArray(record.externalSourceReview)) errors.push("externalSourceReview must be a list");
  if (record.dependencyReview?.usesVolatileExternalKnowledge && !record.externalSourceReview?.length) errors.push("Volatile external knowledge requires current primary-source evidence");
  for (const source of record.externalSourceReview || []) {
    if (typeof source.url !== "string" || !source.url.startsWith("https://")) errors.push("externalSourceReview URL must use HTTPS");
    requireText(source.reason, "externalSourceReview reason");
    const checkedAt = Date.parse(`${source.checkedAt}T00:00:00Z`);
    const age = Date.now() - checkedAt;
    if (!Number.isFinite(checkedAt) || age < -86400000 || age > 30 * 86400000) errors.push("externalSourceReview checkedAt must be within the past 30 days");
  }

  if (typeof record.externalActions?.databaseWrite !== "boolean") errors.push("externalActions.databaseWrite must be boolean");
  if (record.externalActions?.databaseWrite) {
    if (record.externalActions.databaseTargetManifest !== undefined || record.externalActions.databaseTarget !== undefined) {
      const result = checkDatabaseTargetReference(record.externalActions.databaseTargetManifest, record.externalActions.databaseTarget);
      errors.push(...result.errors.map((message) => `Database target gate: ${message}`), ...result.blockers.map((message) => `Database write blocked by target gate: ${message}`));
    } else {
      const ledger = JSON.parse(fs.readFileSync(path.join(root, "supabase/migration-ledger.json"), "utf8"));
      if (ledger.status !== "reconciled") errors.push(`Database write blocked by migration ledger status: ${ledger.status}`);
    }
    requireText(record.externalActions.databaseOwnerApprovalReference, "externalActions.databaseOwnerApprovalReference");
  }

  if (checkWorkingTree && scope.length) {
    const dirty = dirtyPaths(scope);
    const acknowledged = new Set(record.workingTreeReview?.paths || []);
    for (const dirtyPath of dirty) if (!acknowledged.has(dirtyPath)) errors.push(`Unreviewed local change in writeScope: ${dirtyPath}`);
    if (dirty.length) requireText(record.workingTreeReview?.note, "workingTreeReview.note");
    try { git(["diff", "--check", "--", ...scope.map((entry) => entry.replace(/\/$/, ""))]); git(["diff", "--cached", "--check", "--", ...scope.map((entry) => entry.replace(/\/$/, ""))]); }
    catch { errors.push("Whitespace/error check failed in writeScope (git diff --check)"); }
  }

  const serialized = JSON.stringify(record);
  if (/(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})/.test(serialized)) errors.push("Plan may contain a credential; remove it before preflight");
  return { errors, scope, relativePath };
}

function loadRecord(relativePath, options) {
  if (!relativePath?.startsWith(planPrefix) || !relativePath.endsWith(".json")) throw new Error("Record must be a JSON file under docs/feature-plans/");
  const absolute = resolveExistingFile(relativePath);
  if (!absolute) throw new Error(`Record missing or outside repository: ${relativePath}`);
  const record = JSON.parse(fs.readFileSync(absolute, "utf8"));
  return { record, ...collectRecordErrors(record, relativePath, options) };
}

function runCheck(script, args = []) {
  execFileSync(process.execPath, [path.join(root, "scripts", script), ...args], { cwd: root, stdio: "pipe" });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const checked = [];
  const errors = [];
  if (options.ci) {
    const changed = changedPathsSince(options.base);
    const featureChanges = changed.filter(isFeaturePath);
    const records = changed.filter((value) => value.startsWith(planPrefix) && value.endsWith(".json") && resolveExistingFile(value));
    for (const deletedRecord of changed.filter((value) => value.startsWith(planPrefix) && value.endsWith(".json") && !resolveExistingFile(value))) errors.push(`Preflight record was deleted: ${deletedRecord}`);
    if (featureChanges.length && !records.length) errors.push("Feature-affecting PR changes require a changed docs/feature-plans/*.json record");
    for (const recordPath of records) {
      const result = loadRecord(recordPath, { checkWorkingTree: false });
      checked.push(result);
      errors.push(...result.errors.map((message) => `${recordPath}: ${message}`));
    }
    for (const changedPath of uncoveredFeaturePaths(featureChanges, checked.map((result) => result.scope))) errors.push(`PR change has no declared writeScope: ${changedPath}`);
    const knownSkills = new Set(JSON.parse(fs.readFileSync(path.join(root, "skills/manifest.json"), "utf8")).skills.map((skill) => skill.name));
    for (const skillName of unreviewedChangedSkills(featureChanges, checked.map((result) => result.record), knownSkills)) errors.push(`Changed skill requires a manifest entry and updated skillReview decision: ${skillName}`);
  } else {
    const result = loadRecord(options.record.replaceAll("\\", "/"), { checkWorkingTree: true });
    checked.push(result);
    errors.push(...result.errors.map((message) => `${result.relativePath}: ${message}`));
  }
  for (const [script, args] of [["validate-repo-skills.mjs", []], ["validate-agent-governance.mjs", []]]) {
    try { runCheck(script, args); }
    catch { errors.push(`${script} failed; review its output with the matching npm validation command`); }
  }
  if (!options.ci) {
    try { runCheck("sync-project-skills.mjs", ["--check"]); }
    catch { errors.push("Installed project skills differ from reviewed repository sources; run npm run skills:check for details"); }
  }
  if (errors.length) {
    console.error("Feature preflight failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Feature preflight passed (${checked.length} record${checked.length === 1 ? "" : "s"}). This checks evidence and scope; the agent still reviews the plan and residual risk.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) { console.error(`Feature preflight failed: ${error.message}`); process.exitCode = 1; }
}
