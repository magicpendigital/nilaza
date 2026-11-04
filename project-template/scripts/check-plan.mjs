#!/usr/bin/env node
// Lightweight process check with no dependencies.
//   node scripts/check-plan.mjs                 -> PLAN.md freshness + every feature-plan record
//   node scripts/check-plan.mjs --record <file> -> one feature-plan record
import fs from "node:fs";
import path from "node:path";

const MAX_PLAN_AGE_DAYS = 14;
const required = ["taskId", "lane", "goal", "successCriteria", "writeScope", "untouchedSurfaces", "impact", "securityReview", "validationCommands", "managerTestPath", "residualRisk"];
const impactFields = ["entryPoint", "dataWrite", "backendContract", "adminVisibility", "privacySafety", "observability", "rollback"];
const errors = [];

function checkRecord(file) {
  let record;
  try { record = JSON.parse(fs.readFileSync(file, "utf8")); } catch (error) { errors.push(`${file}: invalid JSON (${error.message})`); return; }
  const text = JSON.stringify(record);
  if (text.includes("{{")) errors.push(`${file}: still contains {{placeholders}}`);
  for (const key of required) if (record[key] === undefined || record[key] === "" || (Array.isArray(record[key]) && key !== "untouchedSurfaces" && record[key].length === 0)) errors.push(`${file}: missing ${key}`);
  for (const key of impactFields) if (!record.impact?.[key]) errors.push(`${file}: impact.${key} is empty`);
  if (!Array.isArray(record.securityReview?.unresolvedHighRisks)) errors.push(`${file}: securityReview.unresolvedHighRisks must be a list`);
  else if (record.securityReview.unresolvedHighRisks.length) errors.push(`${file}: unresolved high risks - stop and ask the Owner`);
}

const recordIndex = process.argv.indexOf("--record");
if (recordIndex > 0) {
  checkRecord(process.argv[recordIndex + 1]);
} else {
  const plan = fs.existsSync("PLAN.md") ? fs.readFileSync("PLAN.md", "utf8") : null;
  if (!plan) errors.push("PLAN.md is missing");
  else {
    if (plan.includes("{{")) errors.push("PLAN.md still contains {{placeholders}}");
    const match = plan.match(/(\d{4}-\d{2}-\d{2})|(\d{2})\/(\d{2})\/(\d{4})/);
    const date = match ? new Date(match[1] || `${match[4]}-${match[3]}-${match[2]}`) : null;
    if (!date || Number.isNaN(date.getTime())) errors.push("PLAN.md has no last-updated date");
    else if ((Date.now() - date.getTime()) / 86400000 > MAX_PLAN_AGE_DAYS) errors.push(`PLAN.md is older than ${MAX_PLAN_AGE_DAYS} days`);
  }
  const folder = path.join("docs", "feature-plans");
  for (const name of fs.existsSync(folder) ? fs.readdirSync(folder) : []) {
    if (name.endsWith(".json") && !name.startsWith("_")) checkRecord(path.join(folder, name));
  }
}

if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
else console.log("Plan check passed.");
