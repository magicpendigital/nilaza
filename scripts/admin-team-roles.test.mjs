// Thành viên & quyền (Owner request 14/11; roles.manage): member list, invite dialog with a live can / cannot list per
// role from get_admin_role_matrix, Owner warning + confirmation, change role and revoke behind a confirm step.
// Backend: migration 20261114090000_admin_team_roles.sql and the admin-team-invite Edge Function. The role map itself
// is replaced by 20261115090000_owner_only_publish.sql (Owner decision 15/11: only owner publishes content and AI).
// The PGlite test at the end runs when @electric-sql/pglite resolves, or when NILAZA_PGLITE_MODULE names its
// dist/index.js; otherwise it is skipped and only the static map check runs.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import test, { after } from "node:test";
import { JSDOM } from "jsdom";

const read = (file) => fs.readFileSync(file, "utf8");
const openDoms = new Set();
after(() => { for (const dom of openDoms) dom.window.close(); });
const tick = (dom) => new Promise((resolve) => dom.window.setTimeout(resolve, 0));
const drain = async (dom) => { for (let i = 0; i < 10; i += 1) await tick(dom); };

// Mirrors nilaza_private.roles_have_capability in the migration (the page renders whatever the RPC returns).
const capabilities = ["hub.read", "content.read", "content.draft", "content.publish", "content.delete", "ai.read", "ai.manage", "roles.manage", "overview.read", "notifications.dispatch", "safety.review"];
const matrix = () => ({
  capabilities,
  roles: [
    { role: "owner", capabilities: [...capabilities] },
    { role: "admin", capabilities: ["hub.read", "content.read", "content.draft", "ai.read", "overview.read", "notifications.dispatch", "safety.review"] },
    { role: "editor", capabilities: ["hub.read", "content.read", "content.draft", "ai.read"] },
    { role: "safety_reviewer", capabilities: ["hub.read", "content.read", "ai.read", "safety.review"] }
  ]
});
const members = () => [
  { userId: "u-owner", email: "owner@example.test", isMe: true, createdAt: "2026-09-01T00:00:00Z", lastSignInAt: "2026-11-14T01:00:00Z", activeRoles: ["owner"], assignments: [] },
  { userId: "u-editor", email: "<img src=x onerror=alert(1)>@example.test", isMe: false, createdAt: "2026-10-01T00:00:00Z", lastSignInAt: "2026-11-13T01:00:00Z", activeRoles: ["editor"], assignments: [] },
  { userId: "u-invited", email: "new@example.test", isMe: false, createdAt: "2026-11-14T00:00:00Z", invitedAt: "2026-11-14T00:00:00Z", lastSignInAt: null, activeRoles: ["safety_reviewer"], assignments: [] },
  { userId: "u-gone", email: "gone@example.test", isMe: false, createdAt: "2026-08-01T00:00:00Z", lastSignInAt: "2026-10-01T00:00:00Z", activeRoles: [], assignments: [{ id: "a1", role: "admin", status: "revoked" }] }
];

function harness({ rpc, request, team = { members: members(), invitesToday: 2, inviteDailyCap: 10 } } = {}) {
  const html = read("apps/admin/team.html").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<link[^>]*>/g, "");
  const dom = new JSDOM(html, { url: "http://localhost/team.html", runScripts: "outside-only", pretendToBeVisual: true });
  openDoms.add(dom);
  const w = dom.window, rpcs = [], requests = [];
  w.ENV = { SUPABASE_URL: "https://etfajmrwyywokgafzxsb.supabase.co/", SUPABASE_ANON_KEY: "public-test" };
  w.NilazaAdminSession = { userId: "u-owner", capabilities };
  w.NilazaAdminSessionPromise = Promise.resolve({ user: { id: "u-owner" } });
  w.NilazaAdminRpc = async (...args) => {
    rpcs.push(JSON.parse(JSON.stringify(args))); // plain objects from the page realm
    if (rpc) { const handled = await rpc(...args); if (handled !== undefined) return handled; }
    if (args[0] === "list_admin_team") return JSON.parse(JSON.stringify(team));
    if (args[0] === "get_admin_role_matrix") return matrix();
    if (args[0] === "set_admin_member_role") return { userId: args[1].target_user_id, role: args[1].role_input, changed: true };
    if (args[0] === "revoke_admin_member") return { userId: args[1].target_user_id, changed: true };
    throw Object.assign(Error("unexpected"), { code: "" });
  };
  w.NilazaAdminRequest = async (url, init, capability) => {
    const body = init.body ? JSON.parse(init.body) : null;
    requests.push({ url, method: init.method, capability, body });
    if (request) { const handled = await request(url, init, capability, body); if (handled) return handled; }
    return { ok: true, status: 200, json: async () => ({ status: "invited", userId: "u-new", role: body.role, invitesToday: 3, inviteDailyCap: 10 }) };
  };
  w.eval(read("apps/admin/team.js"));
  const doc = w.document;
  return { dom, w, doc, rpcs, requests, q: (selector) => doc.querySelector(selector), qa: (selector) => [...doc.querySelectorAll(selector)] };
}
const click = (h, selector) => { const element = h.q(selector); assert.ok(element, `missing ${selector}`); element.click(); };
const type = (h, selector, value) => { const field = h.q(selector); assert.ok(field, `missing ${selector}`); field.value = value; field.dispatchEvent(new h.w.Event("input", { bubbles: true })); };
const pick = (h, role) => { const radio = h.q(`[data-team-role][value="${role}"]`); assert.ok(radio, `missing role ${role}`); radio.checked = true; radio.dispatchEvent(new h.w.Event("change", { bubbles: true })); };
const listed = (h, kind) => h.qa(`[data-team-dialog] .team-caps ul.${kind} li[data-cap]`).map((li) => li.dataset.cap);

test("member list shows email, role, status, dates; escapes email; no actions on the Owner's own row", async () => {
  const h = harness();
  await drain(h.dom);
  assert.deepEqual(h.rpcs.map(([name, , cap]) => [name, cap]), [["list_admin_team", "roles.manage"], ["get_admin_role_matrix", "roles.manage"]]);
  assert.equal(h.qa("[data-team-member]").length, 4);
  assert.equal(h.q("img"), null, "email is escaped");
  assert.match(h.q('[data-team-member="u-editor"]').textContent, /<img src=x/);
  const me = h.q('[data-team-member="u-owner"]');
  assert.match(me.textContent, /bạn/);
  assert.equal(me.querySelector("[data-team-change], [data-team-revoke]"), null);
  assert.equal(h.q('[data-team-member="u-editor"]').dataset.state, "active");
  assert.match(h.q('[data-team-member="u-invited"]').textContent, /Đã mời, chưa đăng nhập/);
  assert.match(h.q('[data-team-member="u-invited"]').textContent, /Kiểm duyệt an toàn/);
  const gone = h.q('[data-team-member="u-gone"]');
  assert.equal(gone.dataset.state, "revoked");
  assert.match(gone.textContent, /Cấp lại quyền/);
  assert.equal(gone.querySelector("[data-team-revoke]"), null);
  assert.match(h.q("#team-status").textContent, /3 thành viên đang có quyền/);
  assert.equal(h.q("#team-invite").disabled, false);
  assert.ok(h.q("details.team-matrix"), "role legend from the server matrix");
  assert.doesNotMatch(h.doc.body.innerHTML, /token|access_token|action_link/i);
});

test("invite dialog: live can / cannot list follows the role; Owner needs a warning and a confirmation", async () => {
  const h = harness();
  await drain(h.dom);
  click(h, "#team-invite");
  assert.ok(h.q('[data-team-dialog="invite"]'));
  assert.deepEqual(h.qa("[data-team-role]").map((input) => input.value), ["owner", "admin", "editor", "safety_reviewer"]);
  assert.equal(h.q("[data-team-role]:checked").value, "editor", "default role is the least powerful drafting role");
  assert.deepEqual(listed(h, "can"), ["hub.read", "content.read", "content.draft", "ai.read"]);
  assert.ok(listed(h, "cannot").includes("content.publish") && listed(h, "cannot").includes("roles.manage"));
  assert.match(h.q("[data-team-dialog]").textContent, /Soạn và lưu bản nháp nội dung/);
  assert.match(h.q("[data-team-dialog]").textContent, /Hôm nay bạn đã mời 2\/10 email/);
  const submit = h.q("[data-team-submit]");
  assert.equal(submit.disabled, true, "no email yet");
  type(h, "[data-team-email]", "not-an-email");
  assert.equal(submit.disabled, true);
  type(h, "[data-team-email]", "Friend@Example.test");
  assert.equal(submit.disabled, false);
  pick(h, "safety_reviewer");
  assert.ok(listed(h, "can").includes("safety.review") && !listed(h, "can").includes("content.draft"));
  assert.equal(h.q("[data-team-owner-warning]").hidden, true);
  pick(h, "owner");
  assert.equal(listed(h, "cannot").length, 0);
  assert.equal(h.q("[data-team-owner-warning]").hidden, false);
  assert.match(h.q("[data-team-owner-warning]").textContent, /toàn quyền/);
  assert.equal(h.q("[data-team-submit]").disabled, true, "Owner needs the confirmation box");
  const confirm = h.q("[data-team-owner-confirm]");
  confirm.checked = true; confirm.dispatchEvent(new h.w.Event("change", { bubbles: true }));
  assert.equal(h.q("[data-team-submit]").disabled, false);
  assert.equal(h.q("[data-team-email]").value, "Friend@Example.test", "typed email survives live updates");
  pick(h, "admin");
  assert.equal(h.q("[data-team-owner-warning]").hidden, true);
  pick(h, "owner");
  assert.equal(h.q("[data-team-owner-confirm]").checked, false, "switching roles clears the Owner confirmation");
  h.q("[data-team-owner-confirm]").checked = true; h.q("[data-team-owner-confirm]").dispatchEvent(new h.w.Event("change", { bubbles: true }));
  click(h, "[data-team-submit]");
  await drain(h.dom);
  assert.equal(h.requests.length, 1);
  assert.deepEqual(h.requests[0], { url: "https://etfajmrwyywokgafzxsb.supabase.co/functions/v1/admin-team-invite", method: "POST", capability: "roles.manage", body: { email: "friend@example.test", role: "owner", confirmOwner: true } });
  assert.equal(h.q("[data-team-dialog]"), null);
  assert.match(h.q("[data-team-notice]").textContent, /Đã gửi email mời tới friend@example\.test với vai trò Owner/);
  assert.equal(h.rpcs.filter(([name]) => name === "list_admin_team").length, 2, "list reloads after a change");
});

test("invite results for existing accounts, and Vietnamese errors for every refusal", async () => {
  let reply = { status: 200, body: { status: "assigned", userId: "u-x", role: "admin" } };
  const h = harness({ request: async () => ({ ok: reply.status < 300, status: reply.status, json: async () => reply.body }) });
  await drain(h.dom);
  const invite = async (email = "x@example.test", role = "admin") => {
    if (!h.q('[data-team-dialog="invite"]')) click(h, "#team-invite");
    type(h, "[data-team-email]", email);
    pick(h, role);
    click(h, "[data-team-submit]");
    await drain(h.dom);
  };
  await invite();
  assert.match(h.q("[data-team-notice]").textContent, /đã có tài khoản Nilaza.*Quản trị.*không gửi email/);
  reply = { status: 200, body: { status: "already_member", userId: "u-editor", roles: ["editor"] } };
  await invite();
  assert.match(h.q("[data-team-notice]").textContent, /đã là thành viên \(Biên tập viên\)/);
  const cases = [
    [{ status: 429, body: { error: "invite_limit" } }, /đủ số lời mời/],
    [{ status: 409, body: { error: "self_change" } }, /chính mình/],
    [{ status: 409, body: { error: "email_unconfirmed" } }, /chưa được xác nhận/],
    [{ status: 400, body: { error: "invalid_email" } }, /Email chưa đúng/],
    [{ status: 503, body: { error: "invite_not_configured", env: "ADMIN_INVITE_REDIRECT_URL" } }, /ADMIN_INVITE_REDIRECT_URL/],
    [{ status: 503, body: { error: "migration_missing", migration: "20261114090000_admin_team_roles.sql" } }, /20261114090000_admin_team_roles\.sql/],
    [{ status: 404, body: {} }, /chưa có hàm admin-team-invite/],
    [{ status: 403, body: { error: "not_authorized" } }, /không có quyền quản lý thành viên/],
    [{ status: 500, body: { error: "something-new" } }, /Chưa gửi được lời mời/]
  ];
  for (const [next, message] of cases) {
    reply = next;
    await invite();
    assert.ok(h.q('[data-team-dialog="invite"]'), "dialog stays open on refusal");
    assert.match(h.q("[data-team-dialog-error]").textContent, message);
    assert.equal(h.q("[data-team-submit]").disabled, false, "can retry");
  }
  click(h, "[data-team-cancel]");
  assert.equal(h.q("[data-team-dialog]"), null);
});

test("change role and revoke both need a confirm step and send the right RPC", async () => {
  const h = harness();
  await drain(h.dom);
  click(h, '[data-team-change="u-editor"]');
  assert.ok(h.q('[data-team-dialog="role"]'));
  assert.equal(h.q("[data-team-role]:checked").value, "editor");
  assert.equal(h.q("[data-team-submit]").disabled, true, "same role cannot be submitted");
  assert.equal(h.rpcs.some(([name]) => name === "set_admin_member_role"), false, "opening the dialog changes nothing");
  pick(h, "admin");
  assert.ok(listed(h, "can").includes("content.draft") && listed(h, "can").includes("ai.read"));
  assert.ok(listed(h, "cannot").includes("content.publish") && listed(h, "cannot").includes("ai.manage"), "Owner decision 15/11: admin does not publish");
  assert.match(h.q("[data-team-dialog]").textContent, /Không phát hành/);
  click(h, "[data-team-submit]");
  await drain(h.dom);
  assert.deepEqual(h.rpcs.find(([name]) => name === "set_admin_member_role"), ["set_admin_member_role", { target_user_id: "u-editor", role_input: "admin", confirm_owner: false }, "roles.manage"]);
  assert.match(h.q("[data-team-notice]").textContent, /sang vai trò Quản trị/);

  click(h, '[data-team-change="u-editor"]');
  pick(h, "owner");
  assert.equal(h.q("[data-team-submit]").disabled, true);
  h.q("[data-team-owner-confirm]").checked = true; h.q("[data-team-owner-confirm]").dispatchEvent(new h.w.Event("change", { bubbles: true }));
  click(h, "[data-team-submit]");
  await drain(h.dom);
  assert.deepEqual(h.rpcs.filter(([name]) => name === "set_admin_member_role").at(-1)[1], { target_user_id: "u-editor", role_input: "owner", confirm_owner: true });

  click(h, '[data-team-revoke="u-invited"]');
  assert.ok(h.q('[data-team-dialog="revoke"]'));
  assert.match(h.q("[data-team-dialog]").textContent, /new@example\.test.*mất toàn bộ quyền/);
  assert.equal(h.rpcs.some(([name]) => name === "revoke_admin_member"), false);
  click(h, "[data-team-submit]");
  await drain(h.dom);
  assert.deepEqual(h.rpcs.find(([name]) => name === "revoke_admin_member"), ["revoke_admin_member", { target_user_id: "u-invited" }, "roles.manage"]);
  assert.match(h.q("[data-team-notice]").textContent, /Đã thu hồi quyền của new@example\.test/);
});

test("server refusals map to Vietnamese text (last owner, self change, not a member)", async () => {
  let code = "NZT02";
  const h = harness({ rpc: async (name) => { if (name === "set_admin_member_role" || name === "revoke_admin_member") throw Object.assign(Error("refused"), { code }); } });
  await drain(h.dom);
  for (const [next, message] of [["NZT02", /Owner cuối cùng/], ["NZT01", /chính mình/], ["NZT04", /Không tìm thấy thành viên/], ["NZT03", /đánh dấu xác nhận/], ["42501", /không có quyền/]]) {
    code = next;
    if (!h.q('[data-team-dialog="revoke"]')) click(h, '[data-team-revoke="u-editor"]');
    click(h, "[data-team-submit]");
    await drain(h.dom);
    assert.match(h.q("[data-team-dialog-error]").textContent, message);
  }
  h.doc.dispatchEvent(new h.w.KeyboardEvent("keydown", { key: "Escape" }));
  assert.equal(h.q("[data-team-dialog]"), null);
});

test("missing backend names the migration and keeps the invite button off", async () => {
  const h = harness({ rpc: async () => { throw Object.assign(Error("missing"), { code: "PGRST202", missingFunction: true }); } });
  await drain(h.dom);
  assert.ok(h.q("[data-team-missing]"));
  assert.match(h.q("[data-team-missing]").textContent, /20261114090000_admin_team_roles\.sql/);
  assert.match(h.q("[data-team-missing]").textContent, /admin-team-invite/);
  assert.equal(h.q("#team-invite").disabled, true);
});

test("session change clears the member list", async () => {
  const h = harness();
  await drain(h.dom);
  h.w.NilazaClearSensitiveAdminState();
  assert.equal(h.qa("[data-team-member]").length, 0);
  assert.equal(h.w.NilazaTeam.state.members.length, 0);
});

test("wiring: guard allowlist, shell, config.toml, function never logs or returns the invite link", () => {
  const guard = read("apps/admin/workspace-guard.js");
  assert.match(guard, /"team\.html": "roles\.manage"/);
  assert.match(guard, /"\/functions\/v1\/admin-team-invite": \{ POST: "roles\.manage" \}/);
  for (const name of ["list_admin_team", "get_admin_role_matrix", "set_admin_member_role", "revoke_admin_member"]) assert.match(guard, new RegExp(`${name}: "roles\\.manage"`));
  assert.doesNotMatch(guard, /admin_team_invite_begin|admin_team_invite_finish/, "service-role RPCs are never callable from the browser");
  const manifest = JSON.parse(read("apps/admin/admin-capabilities.json"));
  assert.deepEqual(manifest.workspaces.find((item) => item.id === "team").requiredCapabilities, ["roles.manage"]);
  assert.match(read("supabase/config.toml").replaceAll("\r\n", "\n"), /\[functions\.admin-team-invite\]\nverify_jwt = true/);
  const fn = read("supabase/functions/admin-team-invite/index.ts");
  assert.doesNotMatch(fn, /console\./);
  assert.doesNotMatch(fn, /action_link|properties/);
  assert.match(fn, /capability: "roles\.manage"/);
  assert.match(read("supabase/functions/admin-team-invite/invite.ts"), /ADMIN_INVITE_REDIRECT_URL/);
  const sql = read("supabase/migrations/20261114090000_admin_team_roles.sql");
  for (const name of ["list_admin_team", "get_admin_role_matrix", "set_admin_member_role", "revoke_admin_member", "admin_team_invite_begin", "admin_team_invite_finish"]) assert.match(sql, new RegExp(`function public\\.${name}\\(`));
  assert.match(sql, /revoke all on function public\.admin_team_invite_begin\([^)]*\),\s*public\.admin_team_invite_finish\([^)]*\) from public, anon, authenticated;/);
  assert.match(read("package.json"), /scripts\/admin-team-roles\.test\.mjs/);
});

// Owner decision 15/11 (20261115090000_owner_only_publish.sql) ---------------------------------------------------
const roleMapOf = (file) => {
  const sql = read(file).replaceAll("\r\n", "\n");
  const body = sql.slice(sql.lastIndexOf("create or replace function nilaza_private.roles_have_capability"));
  return Object.fromEntries([...body.slice(0, body.indexOf("$$;")).matchAll(/when '([a-z.]+)' then roles && array\[([^\]]*)\]/g)]
    .map(([, cap, list]) => [cap, list.split(",").map((item) => item.trim().replaceAll("'", ""))]));
};
const OWNER_ONLY_PUBLISH = "supabase/migrations/20261115090000_owner_only_publish.sql";

test("role map: only owner publishes content and AI settings; every other capability unchanged", () => {
  const before = roleMapOf("supabase/migrations/20261114090000_admin_team_roles.sql");
  const now = roleMapOf(OWNER_ONLY_PUBLISH);
  assert.deepEqual(Object.keys(now), capabilities, "same 11 capabilities, same order");
  assert.deepEqual(now["content.publish"], ["owner"]);
  assert.deepEqual(now["ai.manage"], ["owner"]);
  for (const cap of capabilities.filter((item) => !["content.publish", "ai.manage"].includes(item))) assert.deepEqual(now[cap], before[cap], cap);
  assert.deepEqual(before["content.publish"], ["owner", "admin"], "the previous map is what 20261114090000 applied");
  // Draft rule ai.read + content.draft (Owner decision 13/11) stays open for admin and editor.
  for (const role of ["admin", "editor"]) assert.ok(now["ai.read"].includes(role) && now["content.draft"].includes(role), role);
  // The mock matrix used by the page tests above mirrors the migration.
  for (const { role, capabilities: caps } of matrix().roles) assert.deepEqual(caps, capabilities.filter((cap) => now[cap].includes(role)), role);
  const sql = read(OWNER_ONLY_PUBLISH).replaceAll("\r\n", "\n");
  assert.match(sql, /create or replace function nilaza_private\.roles_have_capability\(roles text\[\], capability text\) returns boolean\nlanguage sql immutable set search_path = '' as \$\$/);
  assert.match(sql, /revoke all on function nilaza_private\.roles_have_capability\(text\[\], text\) from public, anon;/);
  assert.match(sql, /grant execute on function nilaza_private\.roles_have_capability\(text\[\], text\) to authenticated, service_role;/);
  const statements = sql.replace(/--[^\n]*/g, "");
  assert.doesNotMatch(statements, /(?<!\.)\b(insert|update|delete|drop|alter|truncate)\b/i,"function body only, no data or schema change");
  assert.match(read("apps/admin/team.js"), /admin: "[^"]*Không phát hành/);
});

async function loadPglite() {
  const target = process.env.NILAZA_PGLITE_MODULE;
  try { return (await import(target ? pathToFileURL(target).href : "@electric-sql/pglite")).PGlite; } catch { return null; }
}

test("PGlite: owner-only publish map on the real capability functions, role matrix and AI config RPCs", async (t) => {
  const PGlite = await loadPglite();
  if (!PGlite) { t.skip("PGlite not installed; set NILAZA_PGLITE_MODULE to @electric-sql/pglite/dist/index.js"); return; }
  const mig = (name) => read(`supabase/migrations/${name}`).replaceAll("\r\n", "\n");
  const db = await PGlite.create();
  try {
    const ROLES = ["owner", "admin", "editor", "safety_reviewer"];
    const CAPS = [...capabilities, "unknown.cap"];
    const users = Array.from({ length: 16 }, () => randomUUID());
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, email varchar(255), encrypted_password text, raw_user_meta_data jsonb,
        created_at timestamptz default now(), invited_at timestamptz, email_confirmed_at timestamptz, last_sign_in_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated, anon, service_role;
      grant execute on function auth.uid() to authenticated, anon, service_role;
      create table public.admin_role_assignments (id uuid primary key default gen_random_uuid(),
        user_id uuid not null references auth.users(id) on delete cascade,
        role text not null check (role in ('owner', 'admin', 'editor', 'safety_reviewer')),
        status text not null default 'active' check (status in ('active', 'revoked')),
        created_at timestamptz not null default now(), unique (user_id, role));
      create table public.admin_audit_logs(id uuid primary key default gen_random_uuid(), admin_user_id uuid references auth.users(id) on delete set null,
        action text not null, target_table text, target_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
      alter table public.admin_role_assignments enable row level security;
      create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select false $$;
      create policy "admins can manage admin role assignments" on public.admin_role_assignments for all using (public.is_admin()) with check (public.is_admin());
      grant select, insert, update, delete on public.admin_role_assignments to authenticated;`);
    for (const [index, id] of users.entries()) {
      await db.query("insert into auth.users(id, email) values ($1, $2)", [id, `member${index}@example.test`]);
      for (const [bit, role] of ROLES.entries()) if (index & (1 << bit)) await db.query("insert into public.admin_role_assignments(user_id, role) values ($1, $2)", [id, role]);
    }
    const single = (role) => users[1 << ROLES.indexOf(role)];
    const boundary = mig("20260902131408_owner_capability_boundary.sql");
    await db.exec(boundary.slice(0, boundary.indexOf("-- Preserve each table's existing own-user operations")));
    await db.exec(mig("20261114090000_admin_team_roles.sql"));
    const as = (actor, sql, params = []) => db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [actor ?? ""]);
      return (await tx.query(sql, params)).rows;
    });
    const snapshot = async () => {
      const out = {};
      for (const id of users) {
        const caps = {};
        for (const cap of CAPS) caps[cap] = (await as(id, "select nilaza_private.has_capability($1) as v", [cap]))[0].v;
        out[id] = { caps, isAdmin: (await as(id, "select public.is_admin() as v"))[0].v, access: (await as(id, "select public.get_admin_access() as v"))[0].v.capabilities };
      }
      return out;
    };
    const before = await snapshot();
    await db.exec(mig("20261115090000_owner_only_publish.sql"));
    await db.exec(mig("20261115090000_owner_only_publish.sql"));
    const after = await snapshot();
    for (const [index, id] of users.entries()) {
      const hasOwner = Boolean(index & 1), hasAdmin = Boolean(index & 2);
      for (const cap of CAPS) {
        const expected = ["ai.manage", "content.publish"].includes(cap) && hasAdmin && !hasOwner ? false : before[id].caps[cap];
        assert.equal(after[id].caps[cap], expected, `roles ${index} ${cap}`);
      }
      assert.equal(after[id].isAdmin, after[id].caps["ai.manage"], `is_admin follows ai.manage for roles ${index}`);
      assert.deepEqual([...after[id].access].sort(), capabilities.filter((cap) => after[id].caps[cap]).sort(),`get_admin_access for roles ${index}`);
    }
    const admin = after[single("admin")].caps;
    assert.equal(admin["ai.manage"], false); assert.equal(admin["content.publish"], false); assert.equal(after[single("admin")].isAdmin, false);
    assert.ok(admin["ai.read"] && admin["content.draft"] && admin["safety.review"] && admin["overview.read"] && admin["notifications.dispatch"]);
    assert.equal(after[single("owner")].caps["ai.manage"], true); assert.equal(after[single("owner")].caps["content.publish"], true);
    for (const role of ["editor", "safety_reviewer"]) assert.deepEqual(after[single(role)], before[single(role)], role);
    const roleMatrix = (await as(single("owner"), "select public.get_admin_role_matrix() as v"))[0].v;
    assert.deepEqual(roleMatrix, matrix(), "the page's matrix equals the database answer");
    assert.equal((await db.query("select count(*)::int as n from public.admin_role_assignments")).rows[0].n, 32, "no role row touched");

    // AI feature config RPCs (20261113090100 + editor drafts 20261113090200): admin saves a draft, only owner publishes.
    await db.exec(mig("20261113090100_ai_feature_configs.sql"));
    await db.exec(mig("20261113090200_ai_feature_config_editor_drafts.sql"));
    const draft = (await as(single("admin"), "select public.save_ai_feature_config_draft('tarot_reading', $1::jsonb) as v", [JSON.stringify({ quotaDaily: 2 })]))[0].v;
    assert.equal(draft.status, "draft");
    await assert.rejects(as(single("admin"), "select public.publish_ai_feature_config('tarot_reading', $1, 'Admin tries to publish') as v", [draft.version]), (error) => error.code === "42501");
    const published = (await as(single("owner"), "select public.publish_ai_feature_config('tarot_reading', $1, 'Owner publishes the draft') as v", [draft.version]))[0].v;
    assert.equal(published.status, "active");
  } finally {
    await db.close();
  }
});
