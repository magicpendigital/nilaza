// Read-only live smoke: no user token, no provider calls, no DB mutations.
const projectRef = process.argv[2];
if (!["uannkrywhxzrulufgqvx", "akgrokwnkfqnfjqrildi"].includes(projectRef)) {
  throw Error("Select the verified Nilaza production or staging project ref");
}
const functions = [
  "admin-ai-council-config", "admin-model-router-config", "ai-astrology-report",
  "ai-council", "ai-daily-insight", "ai-daily-zodiac-pulse", "ai-oracle-turn",
  "ai-persona-chat", "ai-tarot-reading", "journal-entries", "notification-dispatch",
  "notification-inbox", "notification-preferences", "notification-receipts",
  "notification-register-device", "notification-send-test", "profile-upsert"
];
const results = [];
for (const name of functions) {
  const url = `https://${projectRef}.supabase.co/functions/v1/${name}`;
  const options = await fetch(url, { method: "OPTIONS", signal: AbortSignal.timeout(20000), redirect: "error" });
  const preflight = await options.text();
  const denied = await fetch(url, { method: "POST", body: "{}", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(20000), redirect: "error" });
  await denied.text();
  const result = { name, optionsStatus: options.status, noTokenStatus: denied.status, passed: options.status === 200 && preflight === "ok" && denied.status === 401 };
  results.push(result);
  console.log(JSON.stringify(result));
}
const passed = results.every(r => r.passed);
console.log(JSON.stringify({ projectRef, functions: results.length, passed }));
if (!passed) process.exitCode = 1;
