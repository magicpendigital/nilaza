import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ledgerPath = path.join(root, "supabase", "migration-ledger.json");
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
const required = ["projectRef", "checkedAt", "status", "localOnly", "remoteOnly", "requiredBeforeDatabaseWrite"];
const errors = [];

for (const key of required) {
  if (ledger[key] === undefined || ledger[key] === null || ledger[key] === "") errors.push(`Migration ledger is missing ${key}`);
}
for (const id of [...(ledger.localOnly || []), ...(ledger.remoteOnly || [])]) {
  if (!/^\d{12,14}$/.test(id)) errors.push(`Migration ledger id is invalid: ${id}`);
}
const acceptedStatuses = ["blocked_pending_reconciliation", "review_pending_owner_approval", "reconciled"];
if (!acceptedStatuses.includes(ledger.status)) {
  errors.push(`Migration ledger status is invalid: ${ledger.status}`);
}
if (ledger.status === "blocked_pending_reconciliation" && (!ledger.localOnly?.length && !ledger.remoteOnly?.length)) {
  errors.push("Blocked migration ledger must identify at least one local-only or remote-only migration");
}
if (ledger.status === "review_pending_owner_approval" && !ledger.localOnly?.length) {
  errors.push("Owner review pending requires at least one local migration that has not been verified remotely");
}
if (!Array.isArray(ledger.requiredBeforeDatabaseWrite) || ledger.requiredBeforeDatabaseWrite.length < 3) {
  errors.push("Migration ledger needs explicit database-write prerequisites");
}

if (errors.length) {
  console.error("Supabase migration ledger validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (ledger.status === "reconciled") {
  console.log("Supabase migration ledger is reconciled. Database push/repair may proceed only when a separate reviewed plan and database-owner approval are in place.");
} else if (ledger.status === "review_pending_owner_approval") {
  console.log("Supabase migration SQL is awaiting database-owner review/approval. Do not apply migrations, deploy dependent functions, or run database repair/push.");
} else {
  console.log("Supabase migration ledger is blocked pending reconciliation. Database push/repair must not run.");
}
