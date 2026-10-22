import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROMPT_BUNDLE, serializeBundlePayload } from "../packages/agent-config/prompt-composition/bundle.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const names = ["bundle.mjs", "compose.mjs"];
const sourceDirectory = "packages/agent-config/prompt-composition";
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
export const promptConsumerDirectories = Object.freeze([
  "apps/admin/generated/prompt-composition",
  "supabase/functions/_shared/prompt-composition"
]);

export function promptConsumerArtifacts() {
  const locks = JSON.parse(fs.readFileSync(path.join(root, sourceDirectory, "version-locks.json"), "utf8"));
  const payloadHash = sha256(serializeBundlePayload());
  if (payloadHash !== PROMPT_BUNDLE.bundleSha256 || locks.bundleId !== PROMPT_BUNDLE.manifest.id
    || locks.versions?.[PROMPT_BUNDLE.manifest.version] !== payloadHash) {
    throw new Error("Canonical prompt bundle does not match its immutable version lock");
  }
  const sources = names.map((name) => {
    const source = `${sourceDirectory}/${name}`;
    const bytes = fs.readFileSync(path.join(root, source));
    return { name, source, bytes, sha256: sha256(bytes) };
  });
  const manifest = Buffer.from(`${JSON.stringify({
    schemaVersion: "nilaza-prompt-consumer-v1",
    bundleId: PROMPT_BUNDLE.manifest.id,
    bundleVersion: PROMPT_BUNDLE.manifest.version,
    bundleSha256: payloadHash,
    usagePolicyVersion: PROMPT_BUNDLE.manifest.usagePolicy.version,
    providerActivation: "gated",
    files: sources.map(({ name, source, sha256 }) => ({ name, source, sha256 }))
  }, null, 2)}\n`, "utf8");
  return promptConsumerDirectories.flatMap((directory) => [
    ...sources.map(({ name, bytes }) => ({ path: `${directory}/${name}`, bytes })),
    { path: `${directory}/manifest.json`, bytes: manifest }
  ]);
}

export function promptConsumerParityErrors(artifacts, read = (relative) => fs.readFileSync(path.join(root, relative))) {
  const errors = [];
  for (const artifact of artifacts) {
    try {
      const bytes = read(artifact.path);
      if (!Buffer.isBuffer(bytes) || !bytes.equals(artifact.bytes)) errors.push(`Prompt consumer differs: ${artifact.path}`);
    } catch {
      errors.push(`Prompt consumer missing or unreadable: ${artifact.path}`);
    }
  }
  return errors;
}

export function buildPromptConsumers({ check = false } = {}) {
  const artifacts = promptConsumerArtifacts();
  if (check) {
    const errors = promptConsumerParityErrors(artifacts);
    if (errors.length) throw new Error(errors.join("\n"));
  } else {
    for (const artifact of artifacts) {
      const target = path.join(root, artifact.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, artifact.bytes);
    }
  }
  return artifacts.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some((argument) => argument !== "--check")) throw new Error("Only --check is supported");
  const check = process.argv.includes("--check");
  console.log(`${check ? "Verified" : "Generated"} ${buildPromptConsumers({ check })} canonical prompt consumer files; provider activation remains gated`);
}
