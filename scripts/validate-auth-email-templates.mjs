import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "supabase/templates/auth/manifest.json"), "utf8"));
const authentication = ["confirmation", "recovery", "invite", "magic_link", "email_change", "reauthentication"];
const security = ["password_changed_notification", "email_changed_notification", "phone_changed_notification", "identity_linked_notification", "identity_unlinked_notification", "mfa_factor_enrolled_notification", "mfa_factor_unenrolled_notification"];
assert.deepEqual([...manifest.templates.map(item => item.id)].sort(), [...authentication, ...security].sort(), "Inventory must cover all supported Auth/security actions exactly once");
assert.equal(manifest.activationStatus, "applied-partial");
const LOCALE_IF = '{{ if eq (printf "%v" .Data.locale) "en" }}';
assert.equal(manifest.localeExpression, LOCALE_IF);
const localized = ["confirmation", "recovery", "invite", "password_changed_notification"];
assert.deepEqual(manifest.appliedTemplates, ["confirmation", "recovery", "invite"], "Only Owner-approved templates are applied");
assert.deepEqual(manifest.pilotActions, ["confirmation", "recovery"]);
for (const item of manifest.templates) {
  assert.equal(item.subjectKey, `mailer_subjects_${item.id}`);
  assert.equal(item.contentKey, `mailer_templates_${item.id}_content`);
  assert.equal(item.category, authentication.includes(item.id) ? "authentication" : "security");
  assert.match(item.subject, /\S.* \/ .*\S/, "Subject must include VI and EN");
  assert.equal(item.htmlFile, `supabase/templates/auth/${item.id}.html`);
  const raw = fs.readFileSync(path.join(root, item.htmlFile), "utf8");
  assert.equal(Boolean(item.localeBranch), localized.includes(item.id), "Locale branch only on the reviewed templates");
  let html = raw;
  if (item.localeBranch) {
    // One reviewed branch: English when user_metadata.locale is "en", Vietnamese otherwise. .Data is compared, never printed.
    assert.equal(raw.split(LOCALE_IF).length - 1, 1, "Exactly one locale branch");
    assert.equal((raw.match(/{{ else }}/g) || []).length, 1);
    assert.equal((raw.match(/{{ end }}/g) || []).length, 1);
    assert.ok(raw.indexOf('lang="en"') < raw.indexOf("{{ else }}") && raw.indexOf('lang="vi"', raw.indexOf("<body")) > raw.indexOf("{{ else }}"), "English branch first, Vietnamese default");
    assert.ok(item.liveSubject.startsWith(LOCALE_IF) && item.liveSubject.endsWith("{{ end }}") && (item.liveSubject.match(/{{/g) || []).length === 3, "Subject uses the same branch only");
    html = raw.replace(LOCALE_IF, "").replace("{{ else }}", "").replace("{{ end }}", "");
  }
  const copies = item.localeBranch ? 2 : 1;
  assert.ok(html.includes('lang="vi"') && html.includes('lang="en"'), "Both language sections required");
  assert.ok(html.includes('name="viewport"') && html.includes('role="presentation"'), "Mobile layout required");
  const variables = [...html.matchAll(/{{\s*\.([\w.]+)\s*}}/g)].map(match => match[1]);
  const expected = item.id === "reauthentication" ? ["Token"] : item.category === "authentication" ? ["ConfirmationURL"] : [];
  assert.deepEqual(item.allowedVariables, expected);
  assert.deepEqual(variables, expected.flatMap(name => Array(copies).fill(name)), "Only supported action variables may appear, once per language");
  assert.equal((html.match(/{{/g) || []).length, expected.length * copies, "No unreviewed Go expressions");
  for (const match of html.matchAll(/href="([^"]+)"/g)) assert.equal(match[1], "{{ .ConfirmationURL }}", "No guessed domains or replacement redirect links");
  assert.ok(!/<script|<form|<iframe|https?:\/\/|\.Data|\.Email|\.Phone|access_token|refresh_token|sk-proj-|sb_secret_/i.test(html), "No tracking, external assets, secrets or private metadata");
  assert.ok(!/unsubscribe|unlimited|bảo mật tuyệt đối|không giới hạn/i.test(html), "Auth templates must not claim marketing or unsupported guarantees");
  assert.ok(html.includes("#0E5A5A") && html.includes("#F7F1E6"), "Use approved brand colors");
}
console.log(`Auth email templates validated: ${manifest.templates.length} templates; applied: ${manifest.appliedTemplates.join(", ")}.`);
