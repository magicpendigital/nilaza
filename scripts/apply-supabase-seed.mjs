import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const seedPath = path.join(root, "supabase", "seed.generated.sql");
const dryRun = process.argv.includes("--dry-run");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function count(pattern, text) {
  return (text.match(pattern) ?? []).length;
}

function runPsql(dbUrl, args) {
  return spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function failPsql(result, message) {
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  fail(message);
}

if (!fs.existsSync(seedPath)) {
  fail("Missing supabase/seed.generated.sql. Run: npm run supabase:seed:generate");
}

const seedSql = fs.readFileSync(seedPath, "utf8");
const checks = [
  ["transaction_begin", /\bbegin;/i.test(seedSql)],
  ["transaction_commit", /\bcommit;/i.test(seedSql)],
  ["personas", seedSql.includes("public.personas")],
  ["prompt_versions", seedSql.includes("public.prompt_versions")],
  ["persona_skill_prompts", seedSql.includes("Persona chat skill prompt versions")],
  ["persona_prompt_pointer", seedSql.includes("active_prompt_version_id")],
  ["ai_council_config", seedSql.includes("public.ai_council_config_versions")],
  ["model_route_versions", seedSql.includes("public.model_route_versions")]
];

const failed = checks.filter(([, ok]) => !ok).map(([label]) => label);
if (failed.length) fail(`Generated seed failed verification: ${failed.join(", ")}`);

const summary = {
  seed: path.relative(root, seedPath),
  personaRows: count(/insert into public\.personas /g, seedSql),
  globalPromptRows: count(/owner_type, owner_id, version, status, locale, prompt_text/g, seedSql) - count(/'persona_chat', 'persona'/g, seedSql),
  personaSkillPromptRows: count(/'persona_chat', 'persona'/g, seedSql),
  activePersonaPromptPointers: count(/active_prompt_version_id/g, seedSql),
  aiCouncilTemplateRows: count(/insert into public\.ai_council_template_versions/g, seedSql),
  modelRouteRows: count(/insert into public\.model_route_versions/g, seedSql)
};

console.log(JSON.stringify(summary, null, 2));

if (dryRun) {
  console.log("Dry run only. To apply, set SUPABASE_DB_URL or DATABASE_URL and run: npm run supabase:seed:apply");
  process.exit(0);
}

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  fail("Missing SUPABASE_DB_URL or DATABASE_URL. Refusing to apply seed without an explicit database URL.");
}

const result = runPsql(dbUrl, ["-f", seedPath]);

if (result.error) {
  fail(`Failed to run psql. Install PostgreSQL client tools or apply supabase/seed.generated.sql with Supabase SQL editor. ${result.error.message}`);
}

if (result.status !== 0) {
  failPsql(result, "Supabase seed apply failed.");
}

const verificationSql = `
with counts as (
  select
    (select count(*) from public.personas) as personas,
    (select count(*) from public.prompt_versions where owner_type = 'global') as global_prompt_versions,
    (select count(*) from public.prompt_versions where feature = 'persona_chat' and owner_type = 'persona' and status = 'active') as persona_skill_prompt_versions,
    (select count(*) from public.personas where active_prompt_version_id is not null) as active_persona_prompt_pointers,
    (select count(*) from public.ai_council_template_versions) as ai_council_template_versions,
    (select count(*) from public.model_route_versions where status in ('active', 'experimental')) as model_route_versions
)
select personas || '|' || global_prompt_versions || '|' || persona_skill_prompt_versions || '|' || active_persona_prompt_pointers || '|' || ai_council_template_versions || '|' || model_route_versions
from counts;
`;

const verifyResult = runPsql(dbUrl, ["-t", "-A", "-c", verificationSql]);
if (verifyResult.error) {
  fail(`Failed to verify Supabase seed with psql. ${verifyResult.error.message}`);
}
if (verifyResult.status !== 0) {
  failPsql(verifyResult, "Supabase seed verification query failed.");
}

const [personas, globalPromptVersions, personaSkillPromptVersions, activePersonaPromptPointers, aiCouncilTemplateVersions, modelRouteVersions] = verifyResult.stdout
  .trim()
  .split("|")
  .map((value) => Number.parseInt(value, 10));

const appliedSummary = {
  personas,
  globalPromptVersions,
  personaSkillPromptVersions,
  activePersonaPromptPointers,
  aiCouncilTemplateVersions,
  modelRouteVersions
};

console.log(JSON.stringify({ applied: appliedSummary }, null, 2));

const expected = [
  ["personas", personas >= 10],
  ["globalPromptVersions", globalPromptVersions >= 10],
  ["personaSkillPromptVersions", personaSkillPromptVersions >= 20],
  ["activePersonaPromptPointers", activePersonaPromptPointers >= 10],
  ["aiCouncilTemplateVersions", aiCouncilTemplateVersions >= 4],
  ["modelRouteVersions", modelRouteVersions >= 5]
];
const missing = expected.filter(([, ok]) => !ok).map(([label]) => label);
if (missing.length) {
  fail(`Supabase seed verification failed: ${missing.join(", ")}`);
}

console.log("Supabase seed applied and verified successfully.");
