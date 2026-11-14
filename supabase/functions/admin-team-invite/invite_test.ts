import { inviteRedirect, mapRpcError, normalizeEmail, parseInviteRequest, TEAM_MIGRATION } from "./invite.ts";

function assert(value: unknown, label: string) { if (!value) throw new Error(label); }
function equal(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}

Deno.test("team invite: email is trimmed, lowercased and checked like the database", () => {
  equal(normalizeEmail("  New.Person@Example.COM "), "new.person@example.com", "normalized");
  for (const bad of ["", "no-at", "a@b", "two@@example.com", "sp ace@example.com", "x@example.", "tab\t@example.com",
    `${"a".repeat(250)}@example.com`, 42, null]) {
    equal(normalizeEmail(bad), null, `refused ${JSON.stringify(bad)}`);
  }
});

Deno.test("team invite: request shape, role list and owner confirmation", () => {
  const good = parseInviteRequest({ email: "Editor@Example.com", role: "editor" });
  assert(good.ok && good.value.email === "editor@example.com" && good.value.role === "editor" && good.value.confirmOwner === false, "editor ok");
  equal(parseInviteRequest(null), { ok: false, error: "invalid_request" }, "null body");
  equal(parseInviteRequest([]), { ok: false, error: "invalid_request" }, "array body");
  equal(parseInviteRequest({ email: "a@example.com", role: "editor", redirectTo: "https://evil.example" }),
    { ok: false, error: "invalid_request" }, "unknown keys refused (no caller-chosen redirect)");
  equal(parseInviteRequest({ email: "bad", role: "editor" }), { ok: false, error: "invalid_email" }, "bad email");
  equal(parseInviteRequest({ email: "a@example.com", role: "root" }), { ok: false, error: "invalid_role" }, "bad role");
  equal(parseInviteRequest({ email: "a@example.com", role: "owner" }), { ok: false, error: "owner_confirm_required" }, "owner needs confirmation");
  equal(parseInviteRequest({ email: "a@example.com", role: "owner", confirmOwner: "yes" }), { ok: false, error: "invalid_request" },
    "confirmOwner must be boolean");
  const owner = parseInviteRequest({ email: "a@example.com", role: "owner", confirmOwner: true });
  assert(owner.ok && owner.value.confirmOwner, "owner with confirmation");
  for (const role of ["admin", "safety_reviewer"]) assert(parseInviteRequest({ email: "a@example.com", role }).ok, role);
});

Deno.test("team invite: redirect must be a clean https URL (http only for a local Admin)", () => {
  equal(inviteRedirect("https://admin.example.com/recovery.html"), "https://admin.example.com/recovery.html", "https ok");
  equal(inviteRedirect("http://localhost:4173/recovery.html"), "http://localhost:4173/recovery.html", "local http ok");
  for (const bad of [undefined, "", "not a url", "http://admin.example.com/recovery.html", "https://user:pass@admin.example.com/",
    "https://admin.example.com/recovery.html?next=x", "https://admin.example.com/recovery.html#token", "javascript:alert(1)"]) {
    equal(inviteRedirect(bad), null, `refused ${bad}`);
  }
});

Deno.test("team invite: database codes map to fixed answers without server text", () => {
  equal(mapRpcError("42501"), { status: 403, error: "not_authorized" }, "42501");
  equal(mapRpcError("NZT01").error, "self_change", "NZT01");
  equal(mapRpcError("NZT02").error, "last_owner", "NZT02");
  equal(mapRpcError("NZT03").error, "owner_confirm_required", "NZT03");
  equal(mapRpcError("NZT04").status, 404, "NZT04");
  equal(mapRpcError("NZT05"), { status: 429, error: "invite_limit" }, "NZT05");
  equal(mapRpcError("NZT06"), { status: 409, error: "email_unconfirmed" }, "NZT06");
  equal(mapRpcError("PGRST202"), { status: 503, error: "migration_missing", migration: TEAM_MIGRATION }, "missing function");
  equal(mapRpcError(undefined), { status: 500, error: "invite_failed" }, "unknown");
  equal(mapRpcError({ message: "secret detail" }), { status: 500, error: "invite_failed" }, "non-string code");
});
