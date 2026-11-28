// Miễn phí / Premium (Owner decision 27/11/2026, docs/proposals/NEW_REFLECTION_MODALITIES_2026-11-27.vi.md section 10):
// Free / Premium switch and limits per on-device feature, draft, preview as a free user, Owner publish with a reason,
// change log and one-click rollback (apps/admin/feature-access.js, migration 20261127090000). The JSON spec, the SQL spec,
// the Admin copy and the app defaults must match, and the client validator returns the SQL validator's codes.
import assert from "node:assert/strict";
import fs from "node:fs";
import test, { after } from "node:test";
import { JSDOM } from "jsdom";

const read = (file) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const openDoms = new Set();
after(() => { for (const dom of openDoms) dom.window.close(); });
const tick = (dom) => new Promise((resolve) => dom.window.setTimeout(resolve, 0));
const drain = async (dom) => { for (let i = 0; i < 12; i += 1) await tick(dom); };
const JSON_SPEC = JSON.parse(read("packages/agent-config/feature-access.json"));
const MIGRATION = read("supabase/migrations/20261127090000_feature_access_configs.sql");
const clone = (value) => JSON.parse(JSON.stringify(value));
const defaults = () => clone(JSON_SPEC.defaults);
const premiumRune = () => {
  const config = defaults();
  config.features.rune_draw = { tier: "premium", free: { kind: "per_day", count: 1 }, premium: { kind: "per_day", count: 3 } };
  return config;
};
const row = (version, status, config, extra = {}) => ({
  id: `r${version}`, version, status, config, note: status === "draft" ? "Nháp" : `Phát hành bản ${version} cho thử`,
  createdAt: `2026-11-27T0${version}:00:00Z`, createdByEmail: "editor@example.test",
  ...(status === "draft" ? {} : { publishedAt: `2026-11-27T0${version}:30:00Z`, publishedByEmail: "owner@example.test" }), ...extra
});
const AUDIENCE = { totalAccounts: 120, premiumAccounts: 7, freeAccounts: 113, countedAt: "2026-11-27T09:00:00Z" };
const SWITCHES = [{ feature: "persona_chat", enabled: true, reason: null }, { feature: "ai_council", enabled: false, reason: "Tạm dừng <b>bảo trì</b>" }];

function harness({ capabilities = ["ai.read", "ai.manage"], rows = [], rpc } = {}) {
  const dom = new JSDOM('<!doctype html><body><main id="fa"></main></body>', { url: "http://localhost/ai-studio.html#access", runScripts: "outside-only", pretendToBeVisual: true });
  openDoms.add(dom);
  const w = dom.window, c = w.document.querySelector("main"), rpcs = [];
  w.ENV = { SUPABASE_URL: "https://etfajmrwyywokgafzxsb.supabase.co", SUPABASE_ANON_KEY: "public-test" };
  w.NilazaAdminTransportTarget = "https://etfajmrwyywokgafzxsb.supabase.co";
  w.NilazaAdminSession = { userId: "user-access", capabilities };
  w.NilazaRequireCapability = async (capability) => w.NilazaAdminSession?.capabilities.includes(capability);
  w.NilazaAdminRpc = async (...args) => {
    rpcs.push(clone(args));
    if (rpc) { const handled = await rpc(...args); if (handled !== undefined) return handled; }
    if (args[0] === "get_feature_access_configs") return clone(rows);
    if (args[0] === "get_feature_access_audience") return clone(AUDIENCE);
    if (args[0] === "get_ai_feature_switches") return clone(SWITCHES);
    if (args[0] === "save_feature_access_draft") return { ...row(9, "draft", args[1].config_input), note: args[1].note_input };
    if (args[0] === "publish_feature_access_config") {
      const draft = rows.find((item) => item.status === "draft");
      return { ...draft, status: "active", note: args[1].reason_input, publishedAt: "2026-11-27T10:00:00Z", archivedVersion: args[1].expected_active_version };
    }
    if (args[0] === "rollback_feature_access_config") {
      const source = rows.filter((item) => item.status === "archived").sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))[0];
      return { ...row(8, "active", source.config), note: args[1].reason_input, restoredFromVersion: source.version, archivedVersion: args[1].expected_active_version };
    }
    throw Object.assign(Error("unexpected"), { code: "" });
  };
  w.eval(read("apps/admin/env-band.js"));
  w.eval(read("apps/admin/unsaved-changes.js"));
  w.eval(read("apps/admin/feature-access.js"));
  w.NilazaFeatureAccess.mount(c);
  return { dom, w, c, rpcs, api: w.NilazaFeatureAccess, calls: (name) => rpcs.filter((item) => item[0] === name) };
}
const $ = (h, selector) => { const element = h.c.querySelector(selector); assert.ok(element, `missing ${selector}`); return element; };
const click = (h, selector) => $(h, selector).click();
const setValue = (h, selector, value) => { const field = $(h, selector); field.value = value; field.dispatchEvent(new h.w.Event("input", { bubbles: true })); };
const choose = (h, selector, value) => { const field = $(h, selector); field.value = value; field.dispatchEvent(new h.w.Event("change", { bubbles: true })); };
const pick = (h, selector) => { const field = $(h, selector); field.checked = true; field.dispatchEvent(new h.w.Event("change", { bubbles: true })); };

test("feature access: JSON spec = SQL spec = Admin copy = app defaults; account policy mode matches", () => {
  const h = harness();
  const spec = clone(h.api.spec);
  for (const key of ["refreshMinutes", "dayOffsetMinutes", "tiers", "limitKinds", "bounds", "editableFeatures", "allowedKinds", "labels", "defaults", "serverManaged"]) {
    assert.deepEqual(spec[key], JSON_SPEC[key], key);
  }
  const sqlSpec = JSON.parse(MIGRATION.match(/\$spec\$([\s\S]*?)\$spec\$/)[1]);
  assert.deepEqual(sqlSpec, { tiers: JSON_SPEC.tiers, limitKinds: JSON_SPEC.limitKinds, bounds: JSON_SPEC.bounds, editableFeatures: JSON_SPEC.editableFeatures, allowedKinds: JSON_SPEC.allowedKinds });
  const policy = JSON.parse(read("packages/agent-config/account-tier-policy.json"));
  assert.equal(h.api.accountPolicyMode, policy.mode);
  // App copy (apps/mobile/src/features/access/featureAccessConfig.ts) carries the same JSON literal.
  const app = read("apps/mobile/src/features/access/featureAccessConfig.ts");
  const literal = app.match(/\/\* @feature-access-defaults \*\/ (\{[\s\S]*?\n\}) as const;/);
  assert.ok(literal, "app defaults literal");
  const appSpec = JSON.parse(literal[1]);
  for (const key of ["refreshMinutes", "dayOffsetMinutes", "limitKinds", "bounds", "editableFeatures", "allowedKinds", "defaults"]) assert.deepEqual(appSpec[key], JSON_SPEC[key], `app ${key}`);
  // Every server-managed id is a real AI feature switch / config name (labels as on the AI features page).
  const features = read("apps/admin/ai-features.js");
  for (const item of JSON_SPEC.serverManaged) assert.ok(features.includes(`"${item.id}"`), item.id);
});

test("feature access: client validator returns the SQL validator codes", () => {
  const { api } = harness();
  assert.deepEqual([...api.validate(defaults())], []);
  assert.deepEqual([...api.validate([])], ["config_not_object"]);
  assert.deepEqual([...api.validate({ features: [] })], ["features_not_object"]);
  const missing = defaults(); delete missing.features.rune_draw; missing.extra = 1;
  assert.deepEqual([...api.validate(missing)].sort(), ["feature_missing:rune_draw", "unknown_key:extra"]);
  // Same broken config as scripts/feature-access-sql.test.mjs, same codes.
  const bad = defaults();
  bad.features.tarot_reading = { tier: "free" };
  bad.features.book_quote.tier = "gold";
  bad.features.book_quote.colour = "red";
  bad.features.boi_kieu.free = { kind: "per_day", count: 0 };
  bad.features.boi_kieu.premium = { kind: "per_day", count: 1.5 };
  bad.features.rune_draw.free = { kind: "retake_after_days", days: 30 };
  bad.features.big_five.free = { kind: "retake_after_days", days: 366 };
  bad.features.big_five.premium = { kind: "unlimited", count: 3 };
  bad.features.enneagram.free = { kind: "forever" };
  bad.features.enneagram.premium = "unlimited";
  const codes = [...api.validate(bad)].sort();
  assert.deepEqual(codes, [
    "big_five:free:days", "big_five:premium:unknown_key:count", "boi_kieu:free:count", "boi_kieu:premium:count",
    "book_quote:tier", "book_quote:unknown_key:colour", "enneagram:free:kind", "enneagram:premium:not_object",
    "rune_draw:free:kind_not_allowed", "unknown_feature:tarot_reading"
  ]);
  for (const code of codes) assert.doesNotMatch(api.describeError(code), /^Lỗi cấu hình/, code);
  assert.equal(api.describeLimit("book_quote", { kind: "per_item_per_day", count: 1 }), "1 lần mỗi cuốn sách mỗi ngày");
  assert.equal(api.describeLimit("big_five", { kind: "retake_after_days", days: 30 }), "Làm lại sau 30 ngày");
  assert.match(api.freeUserView("rune_draw", premiumRune().features.rune_draw), /nhãn Premium.*Nội dung đã lưu trước đó vẫn xem được/);
});

test("feature access: missing migration keeps the built-in defaults read-only and honest", async () => {
  const h = harness({ rpc: (name) => { if (name === "get_feature_access_configs") throw Object.assign(Error("x"), { code: "PGRST202", missingFunction: true }); } });
  await drain(h.dom);
  assert.ok(h.c.querySelector("[data-fa-missing]"));
  assert.match(h.c.textContent, /20261127090000_feature_access_configs\.sql/);
  assert.equal(h.c.querySelector("[data-fa-save]"), null);
  assert.ok($(h, '[data-fa-tier="rune_draw"][value="free"]').checked);
  assert.ok($(h, '[data-fa-tier="rune_draw"]').disabled);
  assert.match($(h, "[data-fa-app-note]").textContent, /chưa được nối/);
});

test("feature access: editor switches Rune to Premium, previews as a free user and saves a draft but cannot publish", async () => {
  const h = harness({ capabilities: ["ai.read", "content.draft"], rows: [row(1, "active", defaults())] });
  await drain(h.dom);
  assert.match($(h, "[data-fa-running]").textContent, /phiên bản 1/);
  assert.equal(h.c.querySelector("[data-fa-review]"), null);
  assert.ok(h.c.querySelector("[data-fa-owner-only]"));
  pick(h, '[data-fa-tier="rune_draw"][value="premium"]');
  choose(h, '[data-fa-kind="rune_draw:premium"]', "per_day");
  setValue(h, '[data-fa-amount="rune_draw:premium"]', "3");
  assert.ok($(h, '[data-fa-row="rune_draw"]').classList.contains("changed"));
  // Bad number: the same code the server would return, and save is blocked.
  setValue(h, '[data-fa-amount="boi_kieu:free"]', "0");
  assert.ok(h.c.querySelector('[data-fa-error="boi_kieu:free:count"]'));
  assert.ok($(h, "[data-fa-save]").disabled);
  setValue(h, '[data-fa-amount="boi_kieu:free"]', "1");
  assert.equal($(h, "[data-fa-save]").disabled, false);
  // Changing a kind keeps a valid amount; unlimited drops it.
  choose(h, '[data-fa-kind="book_quote:free"]', "per_day");
  choose(h, '[data-fa-kind="book_quote:premium"]', "unlimited");
  assert.equal(h.c.querySelector('[data-fa-amount="book_quote:premium"]'), null);
  // Preview as a free user: running vs after, audience counts and the closed-test policy.
  click(h, "[data-fa-preview-toggle]");
  const preview = $(h, "[data-fa-preview-panel]");
  assert.match($(h, '[data-fa-preview="rune_draw"]').textContent, /Mở: 1 lần mỗi ngày.*Khóa: thấy nhãn Premium/);
  assert.ok($(h, '[data-fa-preview="rune_draw"]').classList.contains("changed"));
  assert.match(preview.textContent, /120 tài khoản: 7 có Premium đã mua, 113 không có Premium đã mua/);
  assert.match(preview.textContent, /chỉ đổi những gì khách chưa đăng nhập thấy/);
  assert.match(preview.textContent, /không bị xóa hay khóa/);
  click(h, "[data-fa-save]");
  await drain(h.dom);
  const saves = h.calls("save_feature_access_draft");
  assert.equal(saves.length, 1);
  assert.equal(saves[0][2], "ai.manage|ai.read+content.draft");
  const sent = saves[0][1].config_input;
  assert.deepEqual(sent.features.rune_draw, { tier: "premium", free: { kind: "per_day", count: 1 }, premium: { kind: "per_day", count: 3 } });
  assert.deepEqual(sent.features.book_quote, { tier: "free", free: { kind: "per_day", count: 1 }, premium: { kind: "unlimited" } });
  assert.match($(h, "[data-fa-message]").textContent, /Đã lưu nháp phiên bản 9/);
  assert.equal(h.calls("publish_feature_access_config").length, 0);
});

test("feature access: Owner publishes the draft with a reason and the expected active version", async () => {
  const rows = [row(2, "draft", premiumRune()), row(1, "active", defaults())];
  const h = harness({ rows });
  await drain(h.dom);
  click(h, "[data-fa-review]");
  assert.ok($(h, "#fa-dialog"));
  assert.match($(h, "#fa-dialog").textContent, /Đang ghi vào:/);
  assert.ok($(h, '[data-fa-diff="Rune · Gói"]').classList.contains("changed"));
  assert.match($(h, "[data-fa-dialog-audience]").textContent, /120 tài khoản/);
  assert.ok($(h, "[data-fa-confirm]").disabled, "reason required");
  setValue(h, "#fa-reason", "ngắn");
  assert.ok($(h, "[data-fa-confirm]").disabled);
  setValue(h, "#fa-reason", "Rune chuyển sang Premium cho đợt thử");
  assert.equal($(h, "[data-fa-confirm]").disabled, false);
  click(h, "[data-fa-confirm]");
  await drain(h.dom);
  const calls = h.calls("publish_feature_access_config");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1], { version_input: 2, expected_active_version: 1, reason_input: "Rune chuyển sang Premium cho đợt thử" });
  assert.equal(calls[0][2], "ai.manage");
  assert.match($(h, "[data-fa-message]").textContent, /Đã phát hành phiên bản 2\. App nhận trong khoảng 5 phút/);
  assert.equal(h.c.querySelector("#fa-dialog"), null);
  // Change log shows who, when, before -> after and the reason.
  const entry = $(h, '[data-fa-history="2"]');
  assert.match(entry.textContent, /Rune · Gói: Miễn phí → Premium/);
  assert.match(entry.textContent, /Rune chuyển sang Premium cho đợt thử/);
});

test("feature access: conflict and permission errors are explained", async () => {
  const rows = [row(2, "draft", premiumRune()), row(1, "active", defaults())];
  const h = harness({ rows, rpc: (name) => { if (name === "publish_feature_access_config") throw Object.assign(Error("x"), { code: "40001" }); } });
  await drain(h.dom);
  click(h, "[data-fa-review]");
  setValue(h, "#fa-reason", "Lý do đủ dài để phát hành");
  click(h, "[data-fa-confirm]");
  await drain(h.dom);
  assert.match($(h, "[data-fa-message]").textContent, /Có người vừa phát hành/);
});

test("feature access: change log and one-click rollback to the previous version", async () => {
  const rows = [row(3, "active", defaults()), row(2, "archived", premiumRune()), row(1, "archived", defaults())];
  const h = harness({ rows });
  await drain(h.dom);
  const log = [...h.c.querySelectorAll("[data-fa-history]")].map((item) => item.dataset.faHistory);
  assert.deepEqual(log, ["3", "2", "1"]);
  assert.match($(h, '[data-fa-history="3"]').textContent, /Rune · Gói: Premium → Miễn phí/);
  assert.match($(h, '[data-fa-history="2"]').textContent, /owner@example\.test/);
  assert.match($(h, "[data-fa-rollback-open]").textContent, /phiên bản 2/);
  click(h, "[data-fa-rollback-open]");
  assert.match($(h, "#fa-dialog-title").textContent, /Quay lại phiên bản 2/);
  setValue(h, "#fa-reason", "Quay lại vì người dùng phản hồi");
  click(h, "[data-fa-confirm]");
  await drain(h.dom);
  const calls = h.calls("rollback_feature_access_config");
  assert.deepEqual(calls[0][1], { expected_active_version: 3, reason_input: "Quay lại vì người dùng phản hồi" });
  assert.equal(calls[0][2], "ai.manage");
  assert.match($(h, "[data-fa-message]").textContent, /phiên bản 8 chạy cấu hình của phiên bản 2/);
  // Editors never see the rollback button.
  const editor = harness({ capabilities: ["ai.read", "content.draft"], rows });
  await drain(editor.dom);
  assert.equal(editor.c.querySelector("[data-fa-rollback-open]"), null);
});

test("feature access: AI features are read-only with their switch state; server text is escaped; leaving clears", async () => {
  const rows = [{ ...row(1, "active", defaults()), note: "<script>alert(1)</script>", publishedByEmail: "<img src=x onerror=alert(1)>" }];
  const h = harness({ rows });
  await drain(h.dom);
  assert.match($(h, '[data-fa-server="ai_council"]').textContent, /Đang tắt · Tạm dừng <b>bảo trì<\/b>/);
  assert.match($(h, '[data-fa-server="persona_chat"]').textContent, /Đang bật/);
  assert.match($(h, '[data-fa-server="tarot_reading"]').textContent, /Không có công tắc khẩn cấp riêng/);
  assert.equal(h.c.querySelector("[data-fa-server] select, [data-fa-server] input"), null);
  assert.equal(h.c.querySelector("script"), null);
  assert.equal(h.c.querySelector("img"), null);
  assert.equal(h.c.querySelector("[data-fa-server] b"), null);
  h.w.location.hash = "#features";
  h.w.dispatchEvent(new h.w.HashChangeEvent("hashchange"));
  assert.match(h.c.textContent, /Phiên đã thay đổi/);
});

test("feature access: registered in AI Studio (script order, route, nav, RPC allowlist, capabilities)", () => {
  const html = read("apps/admin/ai-studio.html");
  assert.match(html, /<script src="\.\/ai-features\.js"><\/script>\s*<script src="\.\/feature-access\.js"><\/script>\s*<script src="\.\/prompt-versions\.js"><\/script>/);
  const app = read("apps/admin/app.js");
  assert.match(app, /access: "featureAccess"/);
  // Since 28/11 it mounts in its own box inside the panel, with the minimum app version box under it.
  assert.match(app, /window\.NilazaFeatureAccess\.mount\(accessRoot\)/);
  assert.match(app, /state\.detail === "featureAccess"[^\n]*\) return "none"/);
  assert.match(app, /window\.NilazaFeatureAccess\?\.clear\(\)/);
  const shell = read("apps/admin/shell.js");
  assert.match(shell, /access: "Miễn phí \/ Premium"/);
  assert.match(shell, /routes: \[\["ai-studio", "features"\], \["ai-studio", "access"\], \["ai-studio", "context"\], \["ai-studio", "workflow"\]\]/);
  const guard = read("apps/admin/workspace-guard.js");
  assert.match(guard, /get_feature_access_configs: "ai\.read"/);
  assert.match(guard, /save_feature_access_draft: "ai\.manage\|ai\.read\+content\.draft"/);
  assert.match(guard, /publish_feature_access_config: "ai\.manage"/);
  assert.match(guard, /rollback_feature_access_config: "ai\.manage"/);
  assert.match(guard, /get_feature_access_audience: "ai\.read"/);
  // The app's read is not an Admin RPC.
  assert.doesNotMatch(guard, /get_feature_access_config:/);
  assert.match(JSON.stringify(JSON.parse(read("apps/admin/admin-capabilities.json"))), /"id":"access"/);
  for (const name of ["get_feature_access_configs", "save_feature_access_draft", "publish_feature_access_config", "rollback_feature_access_config", "get_feature_access_audience", "get_feature_access_config"]) {
    assert.match(MIGRATION, new RegExp(`function public\\.${name}\\(`));
  }
});
