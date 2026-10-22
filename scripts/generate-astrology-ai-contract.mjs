import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = path.join(root, "packages/agent-config/astrology-ai-insight/contract.json");
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const schemaAt = (entry) => JSON.parse(fs.readFileSync(path.join(root, entry.path), "utf8"));
const request = schemaAt(contract.requestSchema);
const invocation = schemaAt(contract.invocationSchema);
const response = schemaAt(contract.responseSchema);

const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(request);
ajv.compile(request);
ajv.compile(invocation);
ajv.compile(response);

const outputPath = path.join(root, "supabase/functions/_shared/astrology-ai-insight-contract.ts");
const generated = [
  "// Generated from packages/agent-config/astrology-ai-insight/contract.json and its schemas.",
  "// Recreate with: npm run astrology:ai-contract:generate",
  `export const ASTROLOGY_AI_CONTRACT = ${JSON.stringify(contract, null, 2)} as const;`,
  `export const ASTROLOGY_AI_REQUEST_SCHEMA = ${JSON.stringify(request, null, 2)} as const;`,
  `export const ASTROLOGY_AI_INVOCATION_SCHEMA = ${JSON.stringify(invocation, null, 2)} as const;`,
  `export const ASTROLOGY_AI_RESPONSE_SCHEMA = ${JSON.stringify(response, null, 2)} as const;`,
  ""
].join("\n");

const check = process.argv.includes("--check");
const stdout = process.argv.includes("--stdout");
if (stdout) {
  process.stdout.write(generated);
} else if (check) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (existing !== generated) {
    console.error("Generated Astrology AI contract is stale; run npm run astrology:ai-contract:generate.");
    process.exitCode = 1;
  } else {
    console.log("Generated Astrology AI runtime schemas are up to date.");
  }
} else {
  fs.writeFileSync(outputPath, generated);
  console.log("Generated Astrology AI runtime schemas.");
}
