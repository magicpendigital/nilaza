import fs from "node:fs";
import crypto from "node:crypto";

// Isolated hosted builds must carry the reviewed compiler and exact manifest.
const promptDirectory = "generated/prompt-composition";
const manifest = JSON.parse(fs.readFileSync(`${promptDirectory}/manifest.json`, "utf8"));
if (manifest.schemaVersion !== "nilaza-prompt-consumer-v1" || manifest.providerActivation !== "gated"
  || !Array.isArray(manifest.files) || manifest.files.length !== 2
  || manifest.files.map(file => file.name).sort().join(",") !== "bundle.mjs,compose.mjs") {
  throw new Error("Invalid packaged prompt manifest");
}
for (const file of manifest.files) {
  const checksum = crypto.createHash("sha256").update(fs.readFileSync(`${promptDirectory}/${file.name}`)).digest("hex");
  if (checksum !== file.sha256) throw new Error(`Packaged prompt checksum mismatch: ${file.name}`);
}
const { PROMPT_BUNDLE, serializeBundlePayload } = await import("./generated/prompt-composition/bundle.mjs");
const bundleChecksum = crypto.createHash("sha256").update(serializeBundlePayload()).digest("hex");
if (manifest.bundleId !== PROMPT_BUNDLE.manifest.id || manifest.bundleVersion !== PROMPT_BUNDLE.manifest.version
  || manifest.bundleSha256 !== PROMPT_BUNDLE.bundleSha256 || manifest.bundleSha256 !== bundleChecksum
  || manifest.usagePolicyVersion !== PROMPT_BUNDLE.manifest.usagePolicy.version) {
  throw new Error("Packaged prompt provenance mismatch");
}

const url = process.env.NILAZA_QA_SUPABASE_URL;
const key = process.env.NILAZA_QA_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  throw new Error("Hosted Admin deploy requires NILAZA_QA_SUPABASE_URL and NILAZA_QA_SUPABASE_PUBLISHABLE_KEY");
}

const project = new URL(url);
if (project.protocol !== "https:" || !/^[a-z0-9]+\.supabase\.co$/.test(project.hostname)
  || project.port || project.pathname !== "/" || project.username || project.password || project.search || project.hash) {
  throw new Error("Expected a hosted Supabase project URL");
}

const isPublishable = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key) || (() => {
  try { return JSON.parse(Buffer.from(key.split(".")[1], "base64url")).role === "anon"; } catch { return false; }
})();
if (!isPublishable) throw new Error("Only a publishable/anon key may enter the browser");

const runtimeConfig = `window.__NILAZA_ENV__=${JSON.stringify({
  SUPABASE_URL: project.origin,
  SUPABASE_ANON_KEY: key
})};\n`;
fs.writeFileSync("config.js", runtimeConfig, "utf8");

const inlineConfig = `<script>${runtimeConfig}window.ENV={SUPABASE_URL:window.__NILAZA_ENV__.SUPABASE_URL,SUPABASE_ANON_KEY:window.__NILAZA_ENV__.SUPABASE_ANON_KEY};</script>`;
for (const fileName of fs.readdirSync(".")) {
  if (!fileName.endsWith(".html")) continue;
  const filePath = `./${fileName}`;
  const html = fs.readFileSync(filePath, "utf8");
  const updated = html.replace(/<script src="\.\/config\.js[^\"]*"><\/script>/, `${inlineConfig}\n$&`);
  if (updated === html) throw new Error(`Could not inject runtime config into ${fileName}`);
  fs.writeFileSync(filePath, updated, "utf8");
}
console.log("Wrote hosted Admin runtime config");
