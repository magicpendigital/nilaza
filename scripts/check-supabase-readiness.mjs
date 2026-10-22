import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();

// Mirror Expo/Supabase local dotenv discovery for the readiness report. Values
// are used only for presence checks and are never printed. EAS environments
// remain the source of truth for cloud builds.
function loadDotEnv(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    const value = match[2].replace(/^['"]|['"]$/g, "");
    if (value) process.env[match[1]] = value;
  }
}

for (const file of [".env", ".env.local", "apps/mobile/.env", "apps/mobile/.env.local", "supabase/.env.local"]) loadDotEnv(file);

const requiredFunctions = [
  "ai-feedback",
  "ai-oracle-turn",
  "ai-persona-chat",
  "ai-council",
  "ai-tarot-reading",
  "ai-daily-insight",
  "ai-daily-zodiac-pulse",
  "ai-astrology-report",
  "ai-astrology-insight",
  "profile-upsert",
  "journal-entries",
  "admin-ai-council-config",
  "admin-model-router-config",
  "admin-astrology-prompt-config",
  "admin-ai-trace-qa-payload",
  "admin-documentation",
  "marketing-waitlist",
  "notification-register-device",
  "notification-preferences",
  "notification-inbox",
  "notification-send-test",
  "notification-dispatch",
  "notification-receipts"
];

const requiredMigrations = [
  "20261014074711_model_route_publish_contract_v2.sql",
  "20261014080754_ai_feedback_receipts_v1.sql",
  "202606120001_mvp_schema.sql",
  "20260622000000_upgrade_mvp.sql",
  "20260622000001_weekly_reflection_cron.sql",
  "20260626000000_ai_council_contract.sql",
  "20260626000001_journal_mobile_contract.sql",
  "20260626000002_ai_council_admin_config.sql",
  "20260627000000_astrology_backend_contract.sql",
  "20260630000000_model_route_versions.sql",
  "20260706000000_oracle_contract.sql",
  "20260710000000_notifications_contract.sql",
  "20260902131408_owner_capability_boundary.sql",
  "20260903033047_reconcile_owner_prerequisites.sql",
  "20260908000000_oracle_model_route.sql",
  "20260909014614_ai_trace_observability.sql",
  "20260919202005_ai_council_rounds_v2.sql",
  "20260909020528_marketing_waitlist_and_admin_documentation.sql",
  "20260913143958_marketing_consent_suppression_foundation.sql",
  "20260913184421_growth_waitlist_aggregate_read_model.sql",
  "20260926152118_ai_studio_operations.sql"
];

const requiredSeedTokens = [
  "public.personas",
  "public.tarot_decks",
  "public.tarot_cards",
  "public.prompt_versions",
  "Persona chat skill prompt versions",
  "'persona_chat' and owner_type = 'persona'",
  "active_prompt_version_id",
  "public.ai_council_config_versions",
  "public.ai_council_template_versions",
  "public.model_route_versions",
  "astrology_report"
];

const requiredMobileEnv = [
  "EXPO_PUBLIC_NILAZA_API_URL",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY"
];

const requiredFunctionEnv = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "OPENAI_API_KEY",
  "OPENROUTER_API_KEY",
  "GEMINI_API_KEY",
  "ANTHROPIC_API_KEY"
];

const optionalObservabilityEnv = [
  "AI_TRACE_ENABLED",
  "AI_TRACE_ENVIRONMENT",
  "LANGFUSE_PUBLIC_KEY",
  "LANGFUSE_SECRET_KEY"
];

const forbiddenPublicEnv = [
  "EXPO_PUBLIC_OPENAI_API_KEY",
  "EXPO_PUBLIC_OPENROUTER_API_KEY",
  "EXPO_PUBLIC_GEMINI_API_KEY",
  "EXPO_PUBLIC_ANTHROPIC_API_KEY",
  "EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "EXPO_PUBLIC_SERVICE_ROLE_KEY"
];

const results = [];

function fileExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function add(status, label, detail) {
  results.push({ status, label, detail });
}

function commandExists(command) {
  if (process.platform === "win32") {
    return spawnSync("where.exe", [command], { encoding: "utf8" }).status === 0;
  }
  return spawnSync("sh", ["-lc", `command -v ${command}`], { encoding: "utf8" }).status === 0;
}

function envStatus(name) {
  return typeof process.env[name] === "string" && process.env[name].trim().length > 0;
}

for (const migration of requiredMigrations) {
  add(fileExists(`supabase/migrations/${migration}`) ? "pass" : "fail", `migration:${migration}`, "Required Supabase migration file");
}

for (const functionName of requiredFunctions) {
  const functionPath = `supabase/functions/${functionName}/index.ts`;
  if (!fileExists(functionPath)) {
    add("fail", `function:${functionName}`, "Missing Edge Function entrypoint");
    continue;
  }
  const source = read(functionPath);
  const oracleFactory = functionName === "ai-oracle-turn"
    && source.includes("export function createOracleHandler(")
    && source.includes("serve(createOracleHandler())");
  const waitlistFactory = functionName === "marketing-waitlist"
    && source.includes('import { createWaitlistHandler } from "./handler.ts"')
    && source.includes("serve(createWaitlistHandler(");
  const hasServe = /serve\(async\s+(?:\(req\)|req)\s*=>/.test(source) || oracleFactory || waitlistFactory;
  const hasCors = source.includes("Access-Control-Allow-Origin") || (waitlistFactory && read("supabase/functions/marketing-waitlist/handler.ts").includes("Access-Control-Allow-Origin"));
  add(hasServe && hasCors ? "pass" : "fail", `function:${functionName}`, "Entrypoint has serve handler and CORS");
}

if (fileExists("supabase/seed.generated.sql")) {
  const seedSql = read("supabase/seed.generated.sql");
  for (const token of requiredSeedTokens) {
    add(seedSql.includes(token) ? "pass" : "fail", `seed:${token}`, "Generated seed contains required table payload");
  }
} else {
  add("fail", "seed:generated-sql", "Run npm run supabase:seed:generate");
}

if (fileExists("supabase/seed.sql")) {
  const seedEntrypoint = read("supabase/seed.sql");
  add(seedEntrypoint.includes("\\ir seed.generated.sql") ? "pass" : "fail", "seed:entrypoint", "Supabase seed.sql includes generated seed payload");
} else {
  add("fail", "seed:entrypoint", "Missing supabase/seed.sql entrypoint");
}

const packageJson = JSON.parse(read("package.json"));
for (const scriptName of ["validate:backend", "validate:data", "admin:check", "supabase:seed:generate", "supabase:seed:verify", "supabase:seed:apply"]) {
  add(packageJson.scripts?.[scriptName] ? "pass" : "fail", `script:${scriptName}`, "Expected package script exists");
}

for (const command of ["supabase", "deno", "git"]) {
  add(commandExists(command) ? "pass" : "warn", `tool:${command}`, "Needed for live deploy/typecheck workflows");
}

for (const envName of requiredMobileEnv) {
  add(envStatus(envName) ? "pass" : "warn", `env:${envName}`, "Needed when running mobile against Supabase staging");
}

for (const envName of requiredFunctionEnv) {
  add(envStatus(envName) ? "pass" : "warn", `env:${envName}`, "Provided by Supabase Functions runtime after deploy");
}

for (const envName of optionalObservabilityEnv) {
  const detail = envName === "AI_TRACE_ENVIRONMENT"
    ? "Required before enabling Astrology AI; set staging or production in the function environment"
    : "Optional AI trace/Langfuse setting; configure per environment";
  add(envStatus(envName) ? "pass" : "warn", `env:${envName}`, detail);
}

for (const envName of forbiddenPublicEnv) {
  add(!envStatus(envName) ? "pass" : "fail", `public-secret:${envName}`, "Provider/service secrets must not use EXPO_PUBLIC_*");
}

const counts = results.reduce(
  (acc, result) => {
    acc[result.status] += 1;
    return acc;
  },
  { pass: 0, warn: 0, fail: 0 }
);

for (const result of results) {
  const icon = result.status === "pass" ? "PASS" : result.status === "warn" ? "WARN" : "FAIL";
  console.log(`${icon} ${result.label} - ${result.detail}`);
}

console.log("");
console.log(`Supabase readiness: ${counts.pass} pass, ${counts.warn} warn, ${counts.fail} fail`);
if (counts.fail > 0) {
  console.error("Supabase readiness failed. Fix FAIL items before attempting staging deploy.");
  process.exit(1);
}

console.log(counts.warn > 0 ? "Supabase artifacts are ready with machine/env warnings." : "Supabase artifacts and local machine checks are ready.");
