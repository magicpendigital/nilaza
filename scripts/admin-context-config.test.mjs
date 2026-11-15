// Dữ liệu gửi cho AI (Owner request 14/11, docs/proposals/AI_CONTEXT_CONFIG_2026-11-14.vi.md): per-feature pipeline
// graph, data-block toggles and limits through get_ai_context_configs / save_ai_context_config_draft /
// publish_ai_context_config (migration 20261114090200). The Admin spec copy, the JSON spec and the SQL spec must match.
import assert from "node:assert/strict";
import fs from "node:fs";
import test, { after } from "node:test";
import { JSDOM } from "jsdom";

const read = (file) => fs.readFileSync(file, "utf8");
const openDoms = new Set();
after(() => { for (const dom of openDoms) dom.window.close(); });
const tick = (dom) => new Promise((resolve) => dom.window.setTimeout(resolve, 0));
const drain = async (dom) => { for (let i = 0; i < 10; i += 1) await tick(dom); };
const SPEC = JSON.parse(read("packages/agent-config/ai-context-blocks.json"));
const MIGRATION = read("supabase/migrations/20261114090200_ai_context_configs.sql");

const fullBlocks = (feature, override = {}) => Object.fromEntries(Object.entries(SPEC.features[feature].blocks).map(([id, block]) => [id, {
  enabled: true, ...Object.fromEntries(Object.entries(block.limits).map(([name, limit]) => [name, limit.max])), ...(override[id] || {})
}]));

function harness({ capabilities = ["ai.read", "ai.manage"], rows = [], rpc } = {}) {
  const dom = new JSDOM('<!doctype html><body><main id="mp"></main></body>', { url: "http://localhost/ai-studio.html#context", runScripts: "outside-only", pretendToBeVisual: true });
  openDoms.add(dom);
  const w = dom.window, c = w.document.querySelector("main"), rpcs = [];
  w.ENV = { SUPABASE_URL: "https://etfajmrwyywokgafzxsb.supabase.co", SUPABASE_ANON_KEY: "public-test" };
  w.NilazaAdminTransportTarget = "https://etfajmrwyywokgafzxsb.supabase.co";
  w.NilazaAdminSession = { userId: "user-ctx", capabilities };
  w.NilazaRequireCapability = async (capability) => w.NilazaAdminSession?.capabilities.includes(capability);
  w.NilazaAdminRpc = async (...args) => {
    rpcs.push(JSON.parse(JSON.stringify(args)));
    if (rpc) { const handled = await rpc(...args); if (handled !== undefined) return handled; }
    if (args[0] === "get_ai_context_configs") return JSON.parse(JSON.stringify(rows));
    if (args[0] === "save_ai_context_config_draft") {
      return { id: "d1", feature: args[1].feature_input, version: 2, status: "draft", blocks: args[1].blocks_input, note: args[1].note_input, createdAt: "2026-11-14T03:00:00Z" };
    }
    if (args[0] === "publish_ai_context_config") {
      const draft = rows.find((row) => row.feature === args[1].feature_input && row.status === "draft");
      return { ...draft, status: "active", publishedAt: "2026-11-14T04:00:00Z", archivedVersion: 1 };
    }
    throw Object.assign(Error("unexpected"), { code: "" });
  };
  w.eval(read("apps/admin/env-band.js"));
  w.eval(read("apps/admin/unsaved-changes.js"));
  w.eval(read("apps/admin/context-config.js"));
  w.NilazaContextConfig.mount(c);
  return { dom, w, c, rpcs, calls: (name) => rpcs.filter((item) => item[0] === name) };
}
const click = (h, selector) => { const element = h.c.querySelector(selector); assert.ok(element, `missing ${selector}`); element.click(); };
const setValue = (h, selector, value) => { const field = h.c.querySelector(selector); assert.ok(field, `missing ${selector}`); field.value = value; field.dispatchEvent(new h.w.Event("input", { bubbles: true })); };
const toggle = (h, blockId, checked) => { const box = h.c.querySelector(`[data-ctx-enabled="${blockId}"]`); assert.ok(box, `missing toggle ${blockId}`); box.checked = checked; box.dispatchEvent(new h.w.Event("change", { bubbles: true })); };

test("context config: the Admin spec copy equals the JSON spec and the SQL spec", () => {
  const h = harness();
  assert.deepEqual(JSON.parse(JSON.stringify(h.w.NilazaContextConfig.spec)), SPEC);
  const literal = MIGRATION.match(/\$spec\$([\s\S]*?)\$spec\$/);
  assert.ok(literal, "SQL spec literal present");
  const sql = JSON.parse(literal[1]);
  for (const [feature, value] of Object.entries(SPEC.features).filter(([, item]) => item.configurable)) {
    const expected = Object.fromEntries(Object.entries(value.blocks).map(([id, block]) => [id, Object.fromEntries(Object.entries(block.limits).map(([name, limit]) => [name, [limit.min, limit.max]]))]));
    const actual = sql[feature] ?? sql.features?.[feature];
    assert.ok(actual, `SQL spec has ${feature}`);
    const normalized = Object.fromEntries(Object.entries(actual.blocks ?? actual).map(([id, block]) => [id, Object.fromEntries(Object.entries(block.limits ?? block).map(([name, limit]) => [name, Array.isArray(limit) ? limit : [limit.min, limit.max]]))]));
    assert.deepEqual(normalized, expected, `${feature} SQL limits`);
  }
  assert.deepEqual(Object.keys(SPEC.features).filter((id) => SPEC.features[id].configurable), ["persona_chat", "daily_insight", "ai_council"]);
});

test("context config: graph draws input → blocks → prompt → model → checks → answer with locks and today's defaults", async () => {
  const h = harness();
  await drain(h.dom);
  assert.deepEqual(h.calls("get_ai_context_configs")[0], ["get_ai_context_configs", {}, "ai.read"]);
  const svg = h.c.querySelector("svg.ctx-graph");
  assert.ok(svg, "graph rendered");
  assert.equal(svg.getAttribute("role"), "img");
  const heads = [...svg.querySelectorAll(".ctx-col-head")].map((node) => node.textContent);
  assert.deepEqual(heads, ["Đầu vào", "Khối dữ liệu", "Lớp prompt", "Chuỗi model", "Kiểm tra đầu ra", "Câu trả lời"]);
  for (const id of Object.keys(SPEC.features.persona_chat.blocks)) assert.ok(svg.querySelector(`[data-ctx-block="${id}"].ctx-node-on`), `${id} on by default`);
  for (const item of SPEC.features.persona_chat.locked) {
    const node = svg.querySelector(`[data-ctx-node="locked:${item.id}"]`);
    assert.ok(node?.classList.contains("ctx-node-locked"), `${item.id} locked`);
    assert.ok(node.querySelector(".ctx-lock"), `${item.id} lock glyph`);
    assert.match(h.c.querySelector(`[data-ctx-locked="${item.id}"]`).textContent, new RegExp(item.reason.slice(0, 20)));
  }
  assert.match(h.c.textContent, /Đang chạy: mặc định trong mã/);
  assert.match(h.c.querySelector("[data-ctx-class]").textContent, /Nhạy cảm/);
  assert.equal(h.c.querySelector("#ctx-persona_chat-history-turns").value, "8");
  assert.equal(h.c.querySelector("#ctx-persona_chat-history-turns").max, "8");
  assert.ok(h.c.querySelector('[data-ctx-review="persona_chat"]').disabled, "no draft yet → publish disabled");
  assert.match(h.c.textContent, /không thể gửi nhiều hơn|Chỉ có thể gửi ít hơn hôm nay/);
});

test("context config: toggling a block marks it unsaved, updates the graph, and Lưu nháp sends every block", async () => {
  const h = harness();
  await drain(h.dom);
  toggle(h, "history", false);
  assert.equal(h.w.NilazaUnsaved.total(), 1);
  assert.ok(h.c.querySelector('[data-ctx-block="history"]').classList.contains("ctx-node-off"));
  assert.ok(h.c.querySelector(".ctx-edge-off"), "dashed edge for the off block");
  assert.ok(h.c.querySelector("#ctx-persona_chat-history-turns").disabled, "limits of an off block are disabled");
  setValue(h, "#ctx-persona_chat-goals-maxItems", "3");
  click(h, '[data-ctx-save="persona_chat"]');
  await drain(h.dom);
  const [name, params, rule] = h.calls("save_ai_context_config_draft")[0];
  assert.equal(name, "save_ai_context_config_draft");
  assert.equal(rule, "ai.manage|ai.read+content.draft");
  assert.equal(params.feature_input, "persona_chat");
  assert.deepEqual(params.blocks_input, fullBlocks("persona_chat", { history: { enabled: false }, goals: { maxItems: 3 } }));
  assert.equal(params.note_input, null);
  assert.equal(h.w.NilazaUnsaved.total(), 0);
  assert.match(h.c.textContent, /Đã lưu nháp phiên bản 2/);
  assert.equal(h.c.querySelector('[data-ctx-review="persona_chat"]').disabled, false, "draft saved → publish available");
});

test("context config: a limit above today's value or not a whole number is refused before the RPC", async () => {
  const h = harness();
  await drain(h.dom);
  setValue(h, "#ctx-persona_chat-history-turns", "9");
  click(h, '[data-ctx-save="persona_chat"]');
  await drain(h.dom);
  assert.equal(h.calls("save_ai_context_config_draft").length, 0);
  assert.match(h.c.querySelector('[data-ctx-message="persona_chat"]').textContent, /từ 1 đến 8/);
  assert.throws(() => h.w.NilazaContextConfig.buildBlocks("ai_council", { blocks: { history: { enabled: true, limits: { turns: "2.5" } } } }), /từ 1 đến 12/);
  const empty = h.w.NilazaContextConfig.buildBlocks("daily_insight", { blocks: {} });
  assert.deepEqual(JSON.parse(JSON.stringify(empty.blocks)), fullBlocks("daily_insight"), "empty form = today's defaults");
});

test("context config: resolve matches the Edge rule (off only when enabled === false; limits clamped; junk → max)", () => {
  const h = harness();
  const resolved = h.w.NilazaContextConfig.resolve("persona_chat", { blocks: { history: { enabled: "no", turns: 99, chars: 3.5 }, goals: { enabled: false, maxItems: 0 }, unknown: { enabled: false } } });
  assert.deepEqual(JSON.parse(JSON.stringify(resolved.history)), { enabled: true, limits: { turns: 8, chars: 800 } });
  assert.deepEqual(JSON.parse(JSON.stringify(resolved.goals)), { enabled: false, limits: { maxItems: 1, maxChars: 60 } });
  assert.equal("unknown" in resolved, false);
  const allPublic = h.w.NilazaContextConfig.resolve("daily_insight", { blocks: Object.fromEntries(["nickname", "goals", "tone", "recentMood"].map((id) => [id, { enabled: false }])) });
  assert.equal(h.w.NilazaContextConfig.requestClass("daily_insight", allPublic), "sensitive", "never below the feature floor");
});

test("context config: Xem lại & phát hành shows the diff, needs a 10–500 character note and publishes the draft version", async () => {
  const rows = [
    { feature: "persona_chat", version: 1, status: "active", blocks: fullBlocks("persona_chat"), publishedAt: "2026-11-13T01:00:00Z" },
    { feature: "persona_chat", version: 2, status: "draft", blocks: fullBlocks("persona_chat", { history: { turns: 4 }, nickname: { enabled: false } }), note: "bớt lịch sử" }
  ];
  const h = harness({ rows });
  await drain(h.dom);
  assert.match(h.c.textContent, /Đang chạy: phiên bản 1/);
  assert.match(h.c.textContent, /Có bản nháp phiên bản 2/);
  click(h, '[data-ctx-review="persona_chat"]');
  const dialog = h.c.querySelector("#ctx-dialog");
  assert.ok(dialog, "dialog open");
  assert.equal(dialog.getAttribute("aria-modal"), "true");
  const changed = [...dialog.querySelectorAll("tr.changed[data-ctx-diff]")].map((row) => row.dataset.ctxDiff);
  assert.deepEqual(changed, ["nickname", "history"]);
  assert.match(dialog.querySelector('[data-ctx-diff="history"]').textContent, /Số lượt 8 \(như hôm nay\)[\s\S]*Số lượt 4/);
  assert.match(dialog.querySelector('[data-ctx-diff="nickname"]').textContent, /Không gửi/);
  assert.match(dialog.textContent, /không qua cổng chạy thử/);
  const confirm = () => h.c.querySelector('[data-ctx-publish="persona_chat"]');
  assert.ok(confirm().disabled, "note required");
  setValue(h, "#ctx-publish-note", "ngắn");
  assert.ok(confirm().disabled, "short note refused");
  setValue(h, "#ctx-publish-note", "Bớt lịch sử còn 4 lượt và tắt tên gọi");
  assert.equal(confirm().disabled, false);
  confirm().click();
  await drain(h.dom);
  assert.deepEqual(h.calls("publish_ai_context_config")[0], ["publish_ai_context_config", { feature_input: "persona_chat", version_input: 2, note_input: "Bớt lịch sử còn 4 lượt và tắt tên gọi" }, "ai.manage"]);
  assert.equal(h.c.querySelector("#ctx-dialog"), null, "dialog closed");
  assert.match(h.c.textContent, /Đã phát hành phiên bản 2/);
  assert.match(h.c.textContent, /Đang chạy: phiên bản 2/);
});

test("context config: Escape closes the review dialog without publishing", async () => {
  const rows = [{ feature: "persona_chat", version: 1, status: "draft", blocks: fullBlocks("persona_chat") }];
  const h = harness({ rows });
  await drain(h.dom);
  click(h, '[data-ctx-review="persona_chat"]');
  assert.ok(h.c.querySelector("#ctx-dialog"));
  h.c.dispatchEvent(new h.w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(h.c.querySelector("#ctx-dialog"), null);
  assert.equal(h.calls("publish_ai_context_config").length, 0);
});

test("context config: an editor can save a draft but has no publish button; read-only staff get no inputs", async () => {
  const editor = harness({ capabilities: ["ai.read", "content.draft"] });
  await drain(editor.dom);
  assert.equal(editor.c.querySelector("[data-ctx-review]"), null);
  assert.match(editor.c.textContent, /Chỉ Owner phát hành/);
  toggle(editor, "tone", false);
  click(editor, '[data-ctx-save="persona_chat"]');
  await drain(editor.dom);
  assert.equal(editor.calls("save_ai_context_config_draft").length, 1);

  const viewer = harness({ capabilities: ["ai.read"] });
  await drain(viewer.dom);
  assert.equal(viewer.c.querySelector("[data-ctx-save]"), null);
  assert.ok([...viewer.c.querySelectorAll("[data-ctx-enabled], [data-ctx-limit]")].every((input) => input.disabled));
  assert.match(viewer.c.textContent, /chỉ có quyền xem/);
  toggle(viewer, "tone", false);
  assert.equal(viewer.w.NilazaUnsaved.total(), 0, "viewer edits ignored");

  const none = harness({ capabilities: [] });
  await drain(none.dom);
  assert.match(none.c.textContent, /Cần quyền xem AI/);
  assert.equal(none.calls("get_ai_context_configs").length, 0);
});

test("context config: read-only features show the fields table and no inputs", async () => {
  const h = harness();
  await drain(h.dom);
  for (const id of ["oracle_router", "tarot_reading", "astrology_insight", "astrology_report"]) {
    click(h, `[data-ctx-feature="${id}"]`);
    assert.match(h.c.textContent, /Chỉ xem\./);
    assert.equal(h.c.querySelector("[data-ctx-form], [data-ctx-enabled], [data-ctx-save]"), null, `${id} has no controls`);
    const rows = h.c.querySelectorAll(".config-table tbody tr");
    assert.equal(rows.length, SPEC.features[id].fields.length);
    assert.ok(h.c.querySelectorAll(".ctx-node-readonly .ctx-lock").length === SPEC.features[id].fields.length);
  }
  assert.match(h.c.textContent, /gửi nguyên ngày, giờ và nơi sinh/);
});

test("context config: a missing migration says so and keeps today's behaviour; server errors are Vietnamese", async () => {
  const missing = harness({ rpc: (name) => { if (name === "get_ai_context_configs") throw Object.assign(Error("missing"), { missingFunction: true }); } });
  await drain(missing.dom);
  assert.match(missing.c.textContent, /migration 20261114090200/);
  assert.match(missing.c.textContent, /vẫn gửi dữ liệu như hôm nay/);
  assert.equal(missing.c.querySelector("[data-ctx-save]"), null);

  const refused = harness({ rpc: (name) => { if (name === "save_ai_context_config_draft") throw Object.assign(Error("x"), { code: "22023" }); } });
  await drain(refused.dom);
  toggle(refused, "tone", false);
  click(refused, '[data-ctx-save="persona_chat"]');
  await drain(refused.dom);
  assert.match(refused.c.querySelector('[data-ctx-message="persona_chat"]').textContent, /Máy chủ không nhận/);
  assert.equal(refused.w.NilazaUnsaved.total(), 1, "unsaved edit kept after a refusal");
});

test("context config: server text is escaped and leaving the route clears the page", async () => {
  const rows = [{ feature: "persona_chat", version: 3, status: "active", blocks: fullBlocks("persona_chat"), publishedAt: "<img src=x onerror=alert(1)>" }];
  const h = harness({ rows });
  await drain(h.dom);
  assert.equal(h.c.innerHTML.includes("<img src=x"), false);
  assert.match(h.c.textContent, /<img src=x onerror=alert\(1\)>/);
  h.w.location.hash = "#providers";
  h.w.dispatchEvent(new h.w.HashChangeEvent("hashchange"));
  assert.match(h.c.textContent, /Phiên đã thay đổi/);
});
