import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { permissionsFor } from "../apps/admin/content-model.mjs";
import { adminRuntimeConfig, adminPublicPath } from "./admin-runtime-config.mjs";
const window = {};
test("local QA injection exposes only public project settings and serves no repository secrets", () => {
  assert.equal(adminRuntimeConfig({}), "");
  assert.match(adminRuntimeConfig({ NILAZA_QA_SUPABASE_URL: "https://qa.supabase.co", NILAZA_QA_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" }), /window.__NILAZA_ENV__/);
  for (const key of ["sb_secret_test", "sk-test", `header.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`]) {
    assert.throws(() => adminRuntimeConfig({ NILAZA_QA_SUPABASE_URL: "https://qa.supabase.co", NILAZA_QA_SUPABASE_PUBLISHABLE_KEY: key }));
  }
  assert.throws(() => adminRuntimeConfig({ NILAZA_QA_SUPABASE_URL: "https://attacker.invalid", NILAZA_QA_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" }));
  for (const path of [".env", ".git/config", "apps/mobile/.env.local", "apps/admin/.env", "apps/admin/../../.env", "supabase/config.toml"]) assert.equal(adminPublicPath(path), false);
  for (const path of ["apps/admin/config.js", "apps/admin/content.html", "apps/admin/ai-studio.html", "packages/agent-config/model-routes.json", "assets/features/hero.png"]) assert.equal(adminPublicPath(path), true);
});
vm.runInNewContext(fs.readFileSync("apps/admin/admin-access.js", "utf8"), { window });
test("server multi-role capabilities use canonical roles, unknown contracts fail closed", () => {
  const user = { id: "A", email: "qa@invalid" };
  const session = window.NilazaAccess.parse({ userId: "A", roles: ["editor", "owner"], capabilities: ["hub.read", "roles.manage"] }, user);
  assert.equal(session.role, "owner");
  assert.equal(window.NilazaAccess.can(session, "roles.manage"), true);
  for (const data of [{ userId: "B", roles: ["owner"], capabilities: [] }, { userId: "A", roles: ["content_admin"], capabilities: [] }, { userId: "A", roles: [], capabilities: ["hub.read"] }]) assert.throws(() => window.NilazaAccess.parse(data, user));
  assert.equal(permissionsFor("editor").canEdit, true);
  assert.equal(permissionsFor("editor").canPublish, false);
  // Owner decision 15/11 (20261115090000): only owner publishes; admin keeps drafting.
  assert.equal(permissionsFor("admin").canPublish, false);
  assert.equal(permissionsFor("admin").canEdit, true);
  assert.equal(permissionsFor("owner").canPublish, true);
  assert.equal(permissionsFor("safety_reviewer").canEdit, false);
});
test("fresh access failure or revocation cannot reuse old authority", async () => {
  const user = { id: "A" };
  assert.equal(window.NilazaAccess.can(await window.NilazaAccess.load({ rpc: async () => ({ data: { userId: "A", roles: [], capabilities: [] } }) }, user), "hub.read"), false);
  await assert.rejects(window.NilazaAccess.load({ rpc: async () => ({ error: "offline" }) }, user));
  // A network failure is marked transient so the shell can offer a retry; a database denial is not.
  await assert.rejects(window.NilazaAccess.load({ rpc: async () => ({ error: { message: "Failed to fetch" } }) }, user), (error) => error.transient === true);
  await assert.rejects(window.NilazaAccess.load({ rpc: async () => ({ error: { code: "42501", message: "denied" } }) }, user), (error) => error.transient === false);
});

async function workspaceHarness(pathname = "/ai-studio.html", capabilities = ["ai.read", "ai.manage"]) {
  const calls = [];
  const state = { id: "A", sessionId: "A", allowed: true, onSession: null, authWait: null, authCalls: 0, rpcCalls: [], rpcWait: null, fetchWait: null };
  const client = {
    auth: {
      getUser: async () => { state.authCalls++; await state.authWait; return { data: { user: { id: state.id } } }; },
      getSession: async () => {
        state.onSession?.();
        return { data: { session: { user: { id: state.sessionId }, access_token: "synthetic-token" } } };
      }
    },
    rpc: async (name) => { state.rpcCalls.push(name); if (name === "get_ai_trace_detail") await state.rpcWait; return { data: { userId: state.id, roles: state.allowed ? ["owner"] : [], capabilities: state.allowed ? capabilities : [] } }; }
  };
  const events = {};
  const w = { ENV: { SUPABASE_URL: "https://qa.supabase.co", SUPABASE_ANON_KEY: "public-test-key" }, supabase: { createClient: () => client }, addEventListener: (name, fn) => { events[name] = fn; } };
  const document = { hidden: false, documentElement: { dataset: {} }, addEventListener: (name, fn) => { events[name] = fn; } };
  w.top = {}; w.self = w;
  const context = { window: w, document, location: { pathname }, URL, Headers, setTimeout, clearTimeout, fetch: async (...args) => { calls.push(args); await state.fetchWait; return { ok: true }; } };
  vm.runInNewContext(fs.readFileSync("apps/admin/admin-access.js", "utf8"), context);
  vm.runInNewContext(fs.readFileSync("apps/admin/workspace-guard.js", "utf8"), context);
  await w.NilazaAdminSessionPromise;
  return { w, calls, state, document, events };
}

test("verified account change or access loss clears previously visible sensitive state", async () => {
  const { w, state } = await workspaceHarness();
  let cleared = 0;
  w.NilazaClearSensitiveAdminState = () => { cleared++; };
  await w.NilazaRequireCapability("ai.read");
  assert.equal(cleared, 0);
  state.id = "B"; state.sessionId = "B";
  await w.NilazaRequireCapability("ai.read");
  assert.equal(cleared, 1);
  state.allowed = false;
  assert.equal(await w.NilazaRequireCapability("ai.read"), false);
  assert.equal(cleared, 2);
});

test("workspace transport restricts credentials to exact project/admin route and forbids redirects", async () => {
  const { w, calls } = await workspaceHarness();
  const endpoint = "https://qa.supabase.co/functions/v1/admin-ai-council-config";
  await w.NilazaAdminRequest(endpoint, { method: "POST", redirect: "follow", credentials: "include" }, "ai.manage");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].headers.get("Authorization"), "Bearer synthetic-token");
  assert.equal(calls[0][1].redirect, "error");
  assert.equal(calls[0][1].credentials, "omit");
  for (const url of [endpoint.replace("qa.supabase.co", "attacker.invalid"), endpoint + "?redirect=elsewhere", endpoint + "#token", endpoint.replace("https://", "http://"), endpoint.replace("https://", "https://user:password@"), "https://qa.supabase.co/functions/v1/unreviewed", "https://qa.supabase.co/rest/v1/admin_role_assignments"]) {
    await assert.rejects(w.NilazaAdminRequest(url, { method: "POST" }, "ai.manage"), /Untrusted/);
  }
  await assert.rejects(w.NilazaAdminRequest(endpoint, { method: "POST" }, "ai.read"), /Untrusted/);
  await assert.rejects(w.NilazaAdminRequest(endpoint, { method: "POST" }), /Untrusted/);
  assert.equal(calls.length, 1);
});

test("AI trace RPC transport is read-only and allowlisted behind ai.read", async () => {
  const { w } = await workspaceHarness();
  for (const name of ["get_ai_trace_runs", "get_ai_trace_detail", "search_ai_trace_runs", "get_ai_admin_audit_events"]) {
    const data = await w.NilazaAdminRpc(name, { limit_count: 10 }, "ai.read");
    assert.equal(data.userId, "A");
  }
  await assert.rejects(w.NilazaAdminRpc("search_ai_trace_runs", {}, "roles.manage"), /Untrusted/);
  await assert.rejects(w.NilazaAdminRpc("get_ai_trace_runs", {}, "ai.manage"), /Untrusted/);
  await assert.rejects(w.NilazaAdminRpc("delete_ai_trace_runs", {}, "ai.read"), /Untrusted/);
});

test("Astrology prompt endpoints use ai.read/ai.manage and QA payload reveal requires Owner capability", async () => {
  const endpoint = "https://qa.supabase.co/functions/v1/admin-astrology-prompt-config";
  const owner = await workspaceHarness("/ai-studio.html", ["ai.read", "ai.manage", "roles.manage"]);
  await owner.w.NilazaAdminRequest(endpoint, { method: "GET" }, "ai.read");
  await owner.w.NilazaAdminRequest(endpoint, { method: "POST" }, "ai.manage");
  const qaEndpoint = "https://qa.supabase.co/functions/v1/admin-ai-trace-qa-payload";
  await owner.w.NilazaAdminRequest(qaEndpoint, { method: "POST" }, "roles.manage");
  assert.equal(owner.calls.length, 3);
  await assert.rejects(owner.w.NilazaAdminRequest(qaEndpoint, { method: "GET" }, "roles.manage"), /Untrusted/);
  await assert.rejects(owner.w.NilazaAdminRequest(qaEndpoint, { method: "POST" }, "ai.read"), /Untrusted/);

  const reviewer = await workspaceHarness("/ai-studio.html", ["ai.read"]);
  await assert.rejects(reviewer.w.NilazaAdminRequest(qaEndpoint, { method: "POST" }, "roles.manage"), /permission denied/);
  assert.equal(reviewer.calls.length, 0);
});

test("Growth Operations workspace is protected by overview.read", async () => {
  const allowed = await workspaceHarness("/growth.html", ["overview.read"]);
  assert.equal(allowed.document.documentElement.dataset.adminAuthorized, "true");
  const denied = await workspaceHarness("/growth.html", ["content.read"]);
  assert.equal(denied.document.documentElement.dataset.adminAuthorized, "false");
  assert.equal(denied.w.NilazaAdminSession, null);
});

test("workspace transport denies revoked, switched, or invalidated sessions before fetch", async () => {
  const { w, calls, state, document, events } = await workspaceHarness();
  const send = () => w.NilazaAdminRequest("https://qa.supabase.co/functions/v1/admin-model-router-config", { method: "POST" }, "ai.manage");
  state.allowed = false;
  await assert.rejects(send(), /permission denied/);
  state.allowed = true; state.sessionId = "B";
  await assert.rejects(send(), /session unavailable/);
  state.sessionId = "A";
  state.onSession = () => { document.hidden = true; events.visibilitychange(); };
  await assert.rejects(send(), /session unavailable/);
  assert.equal(calls.length, 0);
});

test("overlapping focus and action checks share one request without restoring stale access", async () => {
  const { w, state, events, document } = await workspaceHarness();
  let release;
  state.authWait = new Promise(resolve => { release = resolve; });
  const baseline = state.authCalls;
  events.focus(); events.focus();
  const allowed = w.NilazaRequireCapability("ai.manage");
  assert.equal(state.authCalls, baseline + 1);
  assert.equal(document.documentElement.dataset.adminAuthorized, "true");
  assert.equal(w.NilazaAdminSession, null);
  document.hidden = true; events.visibilitychange();
  release();
  assert.equal(await allowed, false);
  assert.equal(w.NilazaAdminSession, null);
  document.hidden = false; state.authWait = null;
  assert.equal(await w.NilazaRequireCapability("ai.manage"), true);
  assert.equal(document.documentElement.dataset.adminAuthorized, "true");
});

test("workspace authorization gate preserves layout and includes visible recovery UI", () => {
  const css = fs.readFileSync("apps/admin/workspace-guard.css", "utf8");
  assert.match(css, /body\s*\{\s*visibility: hidden/);
  assert.doesNotMatch(css, /body\s*\{[^}]*display:\s*none/);
  for (const file of ["ai-studio.html", "content.html", "growth.html"]) {
    const html = fs.readFileSync(`apps/admin/${file}`, "utf8");
    assert.match(html, /workspace-guard.css/);
    assert.doesNotMatch(html, /body\{display:none\}/);
  }
  assert.match(fs.readFileSync("apps/admin/workspace-guard.js", "utf8"), /Thử lại \/ Retry/);
});

for (const field of ["SUPABASE_URL", "SUPABASE_ANON_KEY"]) {
  test(`Workspace transport requires reload when configured ${field} changes`, async () => {
    const { w, calls, state, document } = await workspaceHarness();
    const initialRpcs = state.rpcCalls.length;
    let cleared = 0;
    w.NilazaClearSensitiveAdminState = () => { cleared++; };
    assert.equal(w.NilazaAdminTransportTarget, "https://qa.supabase.co");
    assert.equal(Object.getOwnPropertyDescriptor(w, "NilazaAdminTransportTarget").writable, false);
    const oldValue = w.ENV[field];
    w.ENV[field] = field === "SUPABASE_URL" ? "https://different.supabase.co" : "different-public-key";
    await assert.rejects(w.NilazaAdminRpc("get_ai_trace_detail", {}, "ai.read"), /reload required/);
    await assert.rejects(w.NilazaAdminRequest("https://different.supabase.co/functions/v1/admin-model-router-config", {}, "ai.read"), /reload required/);
    assert.equal(await w.NilazaRequireCapability("ai.read"), false);
    assert.equal(w.NilazaAdminSession, null);
    assert.equal(document.documentElement.dataset.adminAuthorized, "false");
    assert.equal(state.rpcCalls.length, initialRpcs, "no old-client RPC is attributed to a new target");
    assert.equal(calls.length, 0, "no session token is sent to the changed target");
    assert.equal(cleared, 1);
    w.ENV[field] = oldValue;
    assert.equal(await w.NilazaRequireCapability("ai.read"), false, "restoring ENV alone cannot revive invalidated authority");
  });
}

test("Target change during authorization or token refresh cannot dispatch an Admin request", async () => {
  const endpoint = "https://qa.supabase.co/functions/v1/admin-model-router-config";
  const pendingAuth = await workspaceHarness();
  let releaseAuth;
  pendingAuth.state.authWait = new Promise(resolve => { releaseAuth = resolve; });
  const baselineRpcs = pendingAuth.state.rpcCalls.length;
  const operation = pendingAuth.w.NilazaAdminRequest(endpoint, { method: "POST" }, "ai.manage");
  pendingAuth.w.ENV.SUPABASE_URL = "https://different.supabase.co";
  releaseAuth();
  await assert.rejects(operation, /reload required/);
  assert.equal(pendingAuth.state.rpcCalls.length, baselineRpcs);
  assert.equal(pendingAuth.calls.length, 0);
  const pendingSession = await workspaceHarness();
  pendingSession.state.onSession = () => { pendingSession.w.ENV.SUPABASE_URL = "https://different.supabase.co"; };
  await assert.rejects(pendingSession.w.NilazaAdminRequest(endpoint, { method: "POST" }, "ai.manage"), /reload required/);
  assert.equal(pendingSession.calls.length, 0);
});

test("Target changes discard in-flight trace and Edge responses from the pinned project", async () => {
  const pendingRpc = await workspaceHarness();
  let releaseRpc;
  pendingRpc.state.rpcWait = new Promise(resolve => { releaseRpc = resolve; });
  const read = pendingRpc.w.NilazaAdminRpc("get_ai_trace_detail", {}, "ai.read");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pendingRpc.state.rpcCalls.at(-1), "get_ai_trace_detail");
  pendingRpc.w.ENV.SUPABASE_URL = "https://different.supabase.co";
  releaseRpc();
  await assert.rejects(read, /reload required/);
  const pendingFetch = await workspaceHarness();
  let releaseFetch;
  pendingFetch.state.fetchWait = new Promise(resolve => { releaseFetch = resolve; });
  const request = pendingFetch.w.NilazaAdminRequest("https://qa.supabase.co/functions/v1/admin-documentation", {}, "ai.read");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pendingFetch.calls.length, 1);
  assert.equal(pendingFetch.calls[0][0], "https://qa.supabase.co/functions/v1/admin-documentation");
  pendingFetch.w.ENV.SUPABASE_URL = "https://different.supabase.co";
  releaseFetch();
  await assert.rejects(request, /reload required/);
});

test("failed foreground verification locks the workspace and a fresh retry restores access", async () => {
  const { w, state, document, calls } = await workspaceHarness();
  assert.equal(document.documentElement.dataset.adminAuthorized, "true");
  state.allowed = false;
  assert.equal(await w.NilazaRequireCapability("ai.manage"), false);
  assert.equal(document.documentElement.dataset.adminAuthorized, "false");
  assert.equal(w.NilazaAdminSession, null);
  state.allowed = true;
  assert.equal(await w.NilazaRequireCapability("ai.manage"), true);
  assert.equal(document.documentElement.dataset.adminAuthorized, "true");
  assert.equal(w.NilazaAdminSession.userId, "A");
  assert.equal(calls.length, 0);
});
