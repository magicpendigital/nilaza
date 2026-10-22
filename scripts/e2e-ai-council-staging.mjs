import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contract = JSON.parse(fs.readFileSync(path.join(root, "packages", "agent-config", "council-contract.json"), "utf8"));
const required = [
  "NILAZA_E2E_SUPABASE_URL",
  "NILAZA_E2E_SUPABASE_ANON_KEY",
  "NILAZA_E2E_EMAIL",
  "NILAZA_E2E_PASSWORD",
  "NILAZA_E2E_COUNCIL_INPUT_JSON"
];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Missing required staging E2E environment values: ${missing.join(", ")}`);

let input;
try {
  input = JSON.parse(process.env.NILAZA_E2E_COUNCIL_INPUT_JSON);
} catch {
  throw new Error("NILAZA_E2E_COUNCIL_INPUT_JSON must be valid JSON. Do not put private user content in it.");
}
if (!input || typeof input !== "object" || !Array.isArray(input.selectedPersonas) || input.selectedPersonas.length < 2) {
  throw new Error("Staging E2E Council input needs a sanitized userMessage and at least two staging selectedPersonas.");
}

const baseUrl = process.env.NILAZA_E2E_SUPABASE_URL.replace(/\/$/, "");
const apiKey = process.env.NILAZA_E2E_SUPABASE_ANON_KEY;
const login = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: apiKey, "Content-Type": "application/json" },
  body: JSON.stringify({ email: process.env.NILAZA_E2E_EMAIL, password: process.env.NILAZA_E2E_PASSWORD })
});
if (!login.ok) throw new Error(`Staging E2E authentication failed with HTTP ${login.status}`);
const session = await login.json();
if (!session.access_token) throw new Error("Staging E2E authentication returned no access token");

const response = await fetch(`${baseUrl}/functions/v1/ai-council`, {
  method: "POST",
  headers: {
    apikey: apiKey,
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    ...input,
    councilId: "ai_council",
    councilContractVersion: contract.version
  })
});
const payload = await response.json().catch(() => null);
if (!response.ok) throw new Error(`Authenticated AI Council E2E failed with HTTP ${response.status}`);
if (payload?.schemaVersion !== contract.responseSchema) throw new Error("AI Council response schema does not match the canonical contract");
if (payload?.councilContractVersion !== contract.version) throw new Error("AI Council response contract version does not match the canonical contract");
if (!Array.isArray(payload?.turns) || payload.turns.length < 2) throw new Error("AI Council response did not include the expected multi-guide turns");

console.log(`Authenticated AI Council staging E2E passed (${payload.turns.length} turns; no request content logged).`);
