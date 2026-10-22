import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "supabase/templates/auth/manifest.json"), "utf8"));
const authentication = ["confirmation", "recovery", "invite", "magic_link", "email_change", "reauthentication"];
const security = ["password_changed_notification", "email_changed_notification", "phone_changed_notification", "identity_linked_notification", "identity_unlinked_notification", "mfa_factor_enrolled_notification", "mfa_factor_unenrolled_notification"];
assert.deepEqual([...manifest.templates.map(item => item.id)].sort(), [...authentication, ...security].sort(), "Inventory must cover all supported Auth/security actions exactly once");
assert.equal(manifest.activationStatus, "prepared-not-applied");
assert.deepEqual(manifest.pilotActions, ["confirmation", "recovery"]);
for (const item of manifest.templates) {
  assert.equal(item.subjectKey, `mailer_subjects_${item.id}`);
  assert.equal(item.contentKey, `mailer_templates_${item.id}_content`);
  assert.equal(item.category, authentication.includes(item.id) ? "authentication" : "security");
  assert.match(item.subject, /\S.* \/ .*\S/, "Subject must include VI and EN");
  assert.equal(item.htmlFile, `supabase/templates/auth/${item.id}.html`);
  const html = fs.readFileSync(path.join(root, item.htmlFile), "utf8");
  assert.ok(html.includes('lang="vi"') && html.includes('lang="en"'), "Both language sections required");
  assert.ok(html.includes('name="viewport"') && html.includes('role="presentation"'), "Mobile layout required");
  const variables = [...html.matchAll(/{{\s*\.([\w.]+)\s*}}/g)].map(match => match[1]);
  const expected = item.id === "reauthentication" ? ["Token"] : item.category === "authentication" ? ["ConfirmationURL"] : [];
  assert.deepEqual(item.allowedVariables, expected);
  assert.deepEqual(variables, expected, "Only supported action variables may appear, once each");
  assert.equal((html.match(/{{/g) || []).length, expected.length, "No unreviewed Go expressions");
  for (const match of html.matchAll(/href="([^"]+)"/g)) assert.equal(match[1], "{{ .ConfirmationURL }}", "No guessed domains or replacement redirect links");
  assert.ok(!/<script|<form|<iframe|https?:\/\/|\.Data|\.Email|\.Phone|access_token|refresh_token|sk-proj-|sb_secret_/i.test(html), "No tracking, external assets, secrets or private metadata");
  assert.ok(!/unsubscribe|unlimited|bảo mật tuyệt đối|không giới hạn/i.test(html), "Auth templates must not claim marketing or unsupported guarantees");
  assert.ok(html.includes("#0E5A5A") && html.includes("#F7F1E6"), "Use approved brand colors");
}
console.log(`Auth email templates validated: ${manifest.templates.length} bilingual templates; prepared only, no live send.`);
