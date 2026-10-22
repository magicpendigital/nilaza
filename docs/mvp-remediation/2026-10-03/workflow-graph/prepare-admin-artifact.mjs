import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPromptConsumers } from "../../../../scripts/build-prompt-consumers.mjs";

const evidence = fileURLToPath(new URL("./", import.meta.url));
const repository = path.resolve(evidence, "../../../..");
if (process.argv.length > 2) throw new Error("No arguments are supported");
const sourceRoot = "admin-deploy-source";
const destination = path.join(evidence, sourceRoot);
const adminFiles = [
  ".vercelignore", "admin-access.js", "admin-capabilities.json", "ai-studio.html", "app.js", "workflow-catalog.js", "workflow-view.js", "build-hosted-config.mjs", "config.js",
  "content-model.mjs", "content-sync.js", "content.css", "content.html", "content.js", "favicon.svg",
  "growth-model.mjs", "growth-operations-model.mjs", "growth.css", "growth.html", "growth.js", "index.html", "marketing-automation-sample.json",
  "recovery-core.js", "recovery.html", "recovery.js", "shell.css", "shell.js", "styles.css", "vercel.json", "workspace-guard.css", "workspace-guard.js",
  "generated/content-seed.json", "generated/growth-operations.json", "generated/prompt-composition/bundle.mjs", "generated/prompt-composition/compose.mjs", "generated/prompt-composition/manifest.json"
];
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
function assetPaths(relative) {
  const absolute = path.join(repository, relative);
  if (fs.lstatSync(absolute).isSymbolicLink()) throw new Error("Symlink excluded from reviewed deployment");
  if (!fs.statSync(absolute).isDirectory()) return [relative];
  return fs.readdirSync(absolute).sort().flatMap(name => assetPaths(`${relative}/${name}`));
}
buildPromptConsumers({ check: true });
if (fs.existsSync(destination)) throw new Error("Artifact directory already exists; review a new artifact path instead of overwriting evidence");
const paths = [...adminFiles.map(name => `apps/admin/${name}`), ...assetPaths("apps/admin/assets")].sort();
const files = paths.map(relative => {
  const bytes = fs.readFileSync(path.join(repository, relative));
  if (/\.(?:mjs|js|json|html|css)$/i.test(relative) && /(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})/.test(bytes.toString("utf8"))) throw new Error(`Credential pattern excluded: ${relative}`);
  const target = path.join(destination, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
});
const project = JSON.parse(fs.readFileSync(path.join(repository, "apps/admin/.vercel/project.json"), "utf8"));
if (project.projectId !== "prj_cjpkCLLKMUaH6x4Bw6PK6cklx1qL" || project.orgId !== "team_BGXDJYYYe7LSDoGDjWRBFlJH") throw new Error("Unexpected Vercel target");
fs.mkdirSync(path.join(destination, ".vercel"), { recursive: true });
fs.writeFileSync(path.join(destination, ".vercel/project.json"), `${JSON.stringify(project)}\n`);
const manifest = {
  schemaVersion: "nilaza-reviewed-admin-artifact-v1", projectId: project.projectId, teamId: project.orgId,
  sourceRoot, artifactSha256: sha256(JSON.stringify(files)), files,
  backendTarget: "akgrokwnkfqnfjqrildi", cleanQaCutover: false,
  excluded: ["environment files", "README/AGENTS/skills/internal docs", "customer records", "QA payloads", "backend functions", "native/web builds"],
  staticWorkflowClassification: "generic non-confidential structural/source metadata only; no backend code, private payload or internal guide shipped",
  staticPromptClassification: "generic non-confidential preview seed; static workspace guard does not protect downloaded files"
};
fs.writeFileSync(path.join(evidence, "admin-artifact-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Prepared ${files.length} reviewed Admin files (${files.reduce((sum, file) => sum + file.bytes, 0)} bytes), SHA-256 ${manifest.artifactSha256}`);
