import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const evidence = fileURLToPath(new URL("./", import.meta.url));
const cli = "C:/Users/Admin/AppData/Local/npm-cache/_npx/89025e7ac52fe028/node_modules/vercel/dist/vc.js";
const stable = process.argv.includes("--stable");
if (process.argv.slice(2).some(arg => arg !== "--stable")) throw new Error("Only --stable is supported");
const deploymentRecord = JSON.parse(fs.readFileSync(path.join(evidence, "admin-deployment.json"), "utf8"));
if (deploymentRecord.projectId !== "prj_cjpkCLLKMUaH6x4Bw6PK6cklx1qL" || !/^https:\/\/nilaza-admin-staging-[a-z0-9]+-magicpens-projects\.vercel\.app$/.test(deploymentRecord.deploymentUrl)) throw new Error("Unexpected reviewed deployment target");
const deployment = stable ? "https://nilaza-admin-staging.vercel.app" : deploymentRecord.deploymentUrl;
const destination = path.join(evidence, stable ? "remote-stable" : "remote-reviewed");
fs.mkdirSync(destination, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(evidence, "admin-artifact-manifest.json"), "utf8"));
const files = ["app.js", "styles.css", "shell.js", "workspace-guard.js", "admin-capabilities.json", "workflow-catalog.js", "workflow-view.js", "generated/prompt-composition/bundle.mjs", "generated/prompt-composition/compose.mjs", "generated/prompt-composition/manifest.json", "generated/content-seed.json", "generated/growth-operations.json", "config.js"];
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
async function download(name) {
  const output = path.join(destination, name.replaceAll("/", "__"));
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, "curl", `/${name}`, "--deployment", deployment, "--scope", "magicpens-projects", "--", "--silent", "--show-error", "--fail", "--output", output], { cwd: path.join(evidence, manifest.sourceRoot), stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.resume(); child.stderr.resume();
    child.on("error", () => reject(new Error(`Remote asset request unavailable: ${name}`)));
    child.on("close", code => code === 0 ? resolve() : reject(new Error(`Remote asset request failed: ${name} (${code})`)));
  });
  const bytes = fs.readFileSync(output);
  if (name === "config.js") {
    const configMatch = bytes.toString("utf8").match(/^window\.__NILAZA_ENV__=(\{.*\});/);
    if (!configMatch) throw new Error("Hosted public config was not returned");
    const config = JSON.parse(configMatch[1]);
    if (config.SUPABASE_URL !== "https://akgrokwnkfqnfjqrildi.supabase.co") throw new Error("Unexpected hosted backend target");
    const key = config.SUPABASE_ANON_KEY;
    let publicKey = typeof key === "string" && /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
    if (!publicKey) { try { publicKey = JSON.parse(Buffer.from(key.split(".")[1], "base64url")).role === "anon"; } catch { /* fail closed */ } }
    if (!publicKey) throw new Error("Hosted browser config must use a public key");
    return { path: name, backendTarget: manifest.backendTarget, publicKeyVerified: true, privateKeyPrinted: false };
  }
  const expected = manifest.files.find(file => file.path === `apps/admin/${name}`);
  const actual = sha256(bytes);
  if (!expected || actual !== expected.sha256) throw new Error(`Hosted artifact parity failed: ${name}`);
  return { path: name, sha256: actual, exactArtifactParity: true };
}
const results = [];
for (let index = 0; index < files.length; index += 3) {
  results.push(...await Promise.all(files.slice(index, index + 3).map(download)));
  console.log(`Verified ${results.length}/${files.length} hosted artifact/config paths`);
}
fs.writeFileSync(path.join(evidence, `${stable ? "admin-stable-parity" : "admin-reviewed-parity"}.json`), `${JSON.stringify({ verifiedAt: new Date().toISOString(), deployment, artifactSha256: manifest.artifactSha256, verified: results, actualProviderCall: false, actualDatabaseWrite: false }, null, 2)}\n`);
