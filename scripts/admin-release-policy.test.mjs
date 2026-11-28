// Phiên bản app tối thiểu (Owner decisions 27-28/11/2026, docs/proposals/STARTUP_GATE_SERVER_CONTENT_2026-11-27.vi.md;
// record docs/feature-plans/startup-gate-2026-11-28.json): the Owner (ai.manage) sets the minimum app version and the
// reminder days with a reason; everyone else with ai.read sees the current value read-only, with who, when and why
// (apps/admin/release-policy.js, migration 20261128090000). The client checks match the SQL checks.
import assert from "node:assert/strict";
import fs from "node:fs";
import test, { after } from "node:test";
import { JSDOM } from "jsdom";

const read = (file) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const openDoms = new Set();
after(() => { for (const dom of openDoms) dom.window.close(); });
const tick = (dom) => new Promise((resolve) => dom.window.setTimeout(resolve, 0));
const drain = async (dom) => { for (let i = 0; i < 12; i += 1) await tick(dom); };
const clone = (value) => JSON.parse(JSON.stringify(value));
const MIGRATION = read("supabase/migrations/20261128090000_app_release_policy.sql");
const policyRow = (version, minVersion, extra = {}) => ({
  id: `p${version}`, version, status: "active", minVersion, graceDays: 3, reason: `Bản ${minVersion} sửa lỗi đăng nhập`,
  effectiveAt: `2026-11-28T0${version}:00:00Z`, createdAt: `2026-11-28T0${version}:00:00Z`, createdBy: "u-owner", createdByEmail: "owner@example.test", ...extra
});

function harness({ capabilities = ["ai.read", "ai.manage"], state = { current: null, history: [] }, rpc } = {}) {
  const dom = new JSDOM('<!doctype html><body><main id="rp"></main></body>', { url: "http://localhost/ai-studio.html#access", runScripts: "outside-only", pretendToBeVisual: true });
  openDoms.add(dom);
  const w = dom.window, c = w.document.querySelector("main"), rpcs = [];
  w.ENV = { SUPABASE_URL: "https://etfajmrwyywokgafzxsb.supabase.co", SUPABASE_ANON_KEY: "public-test" };
  w.NilazaAdminTransportTarget = "https://etfajmrwyywokgafzxsb.supabase.co";
  w.NilazaAdminSession = { userId: "user-release", capabilities };
  w.NilazaRequireCapability = async (capability) => w.NilazaAdminSession?.capabilities.includes(capability);
  w.NilazaAdminRpc = async (...args) => {
    rpcs.push(clone(args));
    if (rpc) { const handled = await rpc(...args); if (handled !== undefined) return handled; }
    if (args[0] === "get_app_release_policies") return clone(state);
    if (args[0] === "set_app_release_policy") {
      return policyRow(9, args[1].min_version_input, { graceDays: args[1].grace_days_input, reason: args[1].reason_input });
    }
    throw Object.assign(Error("unexpected"), { code: "" });
  };
  w.eval(read("apps/admin/env-band.js"));
  w.eval(read("apps/admin/release-policy.js"));
  w.NilazaReleasePolicy.mount(c);
  return { dom, w, c, rpcs };
}
function type(w, c, selector, value) {
  const field = c.querySelector(selector);
  field.value = value;
  field.dispatchEvent(new w.Event("input", { bubbles: true }));
}

test("client checks mirror the SQL checks", () => {
  const { w } = harness();
  const api = w.NilazaReleasePolicy;
  for (const good of ["", "  ", "0.1.4", "1.0.0", "10.20.30", "999999.0.0"]) assert.equal(api.validateVersion(good), null, good);
  for (const bad of ["0.1", "0.1.4.1", "v0.1.4", "01.1.4", "0.1.4-beta", "1000000.0.0", "a.b.c"]) assert.notEqual(api.validateVersion(bad), null, bad);
  for (const good of ["0", "3", "30"]) assert.equal(api.validateGraceDays(good), null);
  for (const bad of ["", "-1", "31", "1.5", "ba"]) assert.notEqual(api.validateGraceDays(bad), null);
  assert.notEqual(api.validateReason("ngắn"), null);
  assert.equal(api.validateReason("Bản 0.1.4 sửa lỗi"), null);
  assert.notEqual(api.validateReason("x".repeat(501)), null);
  // Same version regex and limits as the migration.
  assert.match(MIGRATION, /\^\(0\|\[1-9\]\[0-9\]\{0,5\}\)\\\.\(0\|\[1-9\]\[0-9\]\{0,5\}\)\\\.\(0\|\[1-9\]\[0-9\]\{0,5\}\)\$/);
  assert.match(MIGRATION, /grace_days_input not between 0 and 30/);
  assert.match(MIGRATION, /char_length\(clean_reason\) not between 10 and 500/);
  assert.match(api.describePolicy(null), /mọi bản app đều mở được/);
  assert.match(api.describePolicy({ minVersion: "0.1.4", graceDays: 0 }), /phải cập nhật ngay/);
  assert.match(api.describePolicy({ minVersion: "0.1.4", graceDays: 3 }), /trong 3 ngày/);
});

test("Owner sees the current value with who, when and why, and sets a new minimum with a reason", async () => {
  const current = policyRow(2, "0.1.3");
  const older = { ...policyRow(1, null, { reason: "Bỏ tối thiểu <b>thử</b>" }), status: "archived" };
  const { dom, w, c, rpcs } = harness({ state: { current, history: [current, older] } });
  await drain(dom);
  const shown = c.querySelector("[data-rp-current]").textContent;
  assert.match(shown, /0\.1\.3/);
  assert.match(shown, /owner@example\.test/);
  assert.match(shown, /2026-11-28T02:00:00Z/);
  assert.match(shown, /sửa lỗi đăng nhập/);
  assert.ok(c.querySelector('[data-rp-history="1"]'), "older settings are listed");
  assert.equal(c.querySelector("b"), null, "reasons are escaped");
  const save = () => c.querySelector("[data-rp-save]");
  assert.equal(c.querySelector("#rp-min-version").value, "0.1.3");
  assert.equal(save().disabled, true, "a reason is required");
  type(w, c, "#rp-min-version", "0.1");
  type(w, c, "#rp-reason", "Bản 0.1.4 sửa lỗi đồng bộ nhật ký");
  assert.equal(save().disabled, true, "malformed version blocks saving");
  type(w, c, "#rp-min-version", "0.1.4");
  type(w, c, "#rp-grace-days", "5");
  assert.equal(save().disabled, false);
  assert.match(c.querySelector("[data-rp-preview]").textContent, /cũ hơn 0\.1\.4.*5 ngày/);
  save().click();
  await drain(dom);
  const call = rpcs.find((item) => item[0] === "set_app_release_policy");
  assert.deepEqual(call, ["set_app_release_policy", { min_version_input: "0.1.4", grace_days_input: 5, reason_input: "Bản 0.1.4 sửa lỗi đồng bộ nhật ký" }, "ai.manage"]);
  assert.match(c.querySelector("[data-rp-message]").textContent, /Đã lưu: phiên bản tối thiểu 0\.1\.4, nhắc 5 ngày/);
  assert.match(c.querySelector("[data-rp-current]").textContent, /0\.1\.4/);
  assert.ok(c.querySelector('[data-rp-history="2"]'), "the previous value moves to the history");
});

test("a blank version clears the minimum", async () => {
  const current = policyRow(2, "0.1.4");
  const { dom, w, c, rpcs } = harness({ state: { current, history: [current] } });
  await drain(dom);
  type(w, c, "#rp-min-version", "");
  type(w, c, "#rp-reason", "Bỏ tối thiểu sau khi thử xong");
  c.querySelector("[data-rp-save]").click();
  await drain(dom);
  assert.equal(rpcs.find((item) => item[0] === "set_app_release_policy")[1].min_version_input, null);
  assert.match(c.querySelector("[data-rp-message]").textContent, /Đã bỏ phiên bản tối thiểu/);
  assert.match(c.querySelector("[data-rp-current]").textContent, /không đặt tối thiểu/);
});

test("without ai.manage the value is read-only and nothing can be set", async () => {
  const current = policyRow(2, "0.1.4");
  const { dom, c, rpcs } = harness({ capabilities: ["ai.read"], state: { current, history: [current] } });
  await drain(dom);
  assert.match(c.querySelector("[data-rp-current]").textContent, /0\.1\.4/);
  assert.equal(c.querySelector("[data-rp-form]"), null);
  assert.equal(c.querySelector("[data-rp-save]"), null);
  assert.ok(c.querySelector("[data-rp-readonly]"));
  assert.deepEqual(rpcs.map((item) => item[0]), ["get_app_release_policies"]);
});

test("without ai.read nothing is loaded or shown", async () => {
  const { dom, c, rpcs } = harness({ capabilities: [] });
  await drain(dom);
  assert.equal(rpcs.length, 0);
  assert.equal(c.textContent.trim(), "");
});

test("server refusals and a missing migration are explained", async () => {
  const refused = harness({ state: { current: null, history: [] }, rpc: async (name) => { if (name === "set_app_release_policy") throw Object.assign(Error("no"), { code: "42501" }); } });
  await drain(refused.dom);
  assert.match(refused.c.querySelector("[data-rp-current]").textContent, /chưa đặt/);
  type(refused.w, refused.c, "#rp-min-version", "0.1.4");
  type(refused.w, refused.c, "#rp-reason", "Bản 0.1.4 sửa lỗi đăng nhập");
  refused.c.querySelector("[data-rp-save]").click();
  await drain(refused.dom);
  assert.match(refused.c.querySelector("[data-rp-message]").textContent, /không có quyền ai\.manage/);
  const missing = harness({ rpc: async (name) => { if (name === "get_app_release_policies") throw Object.assign(Error("missing"), { missingFunction: true }); } });
  await drain(missing.dom);
  assert.match(missing.c.querySelector("[data-rp-missing]").textContent, /20261128090000_app_release_policy\.sql/);
});

test("wiring: AI Studio loads the module, the guard maps the RPCs, and it mounts under Miễn phí / Premium", () => {
  const html = read("apps/admin/ai-studio.html"), app = read("apps/admin/app.js"), guard = read("apps/admin/workspace-guard.js");
  assert.ok(html.indexOf('src="./release-policy.js"') > html.indexOf('src="./feature-access.js"'));
  assert.ok(html.indexOf('src="./release-policy.js"') < html.indexOf('src="./app.js"'));
  assert.match(guard, /get_app_release_policies: "ai\.read"/);
  assert.match(guard, /set_app_release_policy: "ai\.manage"/);
  assert.match(app, /NilazaReleasePolicy\.mount\(releaseRoot\)/);
  assert.match(app, /if \(state\.detail !== "featureAccess"\) window\.NilazaReleasePolicy\?\.clear\(\);/);
  // The migration grants match: the Admin reader and setter for signed-in staff (RPCs check capabilities), the app read for everyone.
  assert.match(MIGRATION, /grant execute on function public\.get_app_bootstrap\(\) to anon, authenticated/);
});
