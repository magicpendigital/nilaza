// Hạng model người dẫn (Owner decision 25/11/2026, docs/proposals/CHAT_KNOWLEDGE_CHARACTERS_2026-11-24.vi.md section 6):
// tier editor, persona -> tier map, Lưu nháp / Xem lại & phát hành through get_ai_persona_model_tiers /
// save_ai_persona_model_tiers_draft / publish_ai_persona_model_tiers (migration 20261125100000). The Admin spec copy, the
// JSON defaults and the SQL spec must match, and the client validator returns the SQL validator's codes.
import assert from "node:assert/strict";
import fs from "node:fs";
import test, { after } from "node:test";
import { JSDOM } from "jsdom";

const read = (file) => fs.readFileSync(file, "utf8");
const openDoms = new Set();
after(() => { for (const dom of openDoms) dom.window.close(); });
const tick = (dom) => new Promise((resolve) => dom.window.setTimeout(resolve, 0));
const drain = async (dom) => { for (let i = 0; i < 12; i += 1) await tick(dom); };
const JSON_SPEC = JSON.parse(read("packages/agent-config/persona-model-tiers.json"));
const MIGRATION = read("supabase/migrations/20261125100000_persona_model_tiers.sql");
const SEED = JSON.parse(read("apps/admin/generated/content-seed.json"));
const clone = (value) => JSON.parse(JSON.stringify(value));
const defaults = () => ({ tiers: clone(JSON_SPEC.tiers), personaTiers: clone(JSON_SPEC.personaTiers), platform: { wallClockMs: 150000 } });
const activeRow = (config = defaults(), version = 1) => ({ id: `r${version}`, version, status: "active", config, note: "Bản đầu tiên cho người dẫn", createdAt: "2026-11-25T01:00:00Z", publishedAt: "2026-11-25T02:00:00Z" });
const draftRow = (config, version = 2) => ({ id: `r${version}`, version, status: "draft", config, note: "Nháp", createdAt: "2026-11-25T03:00:00Z" });

function harness({ capabilities = ["ai.read", "ai.manage"], rows = [], rpc, seed = SEED } = {}) {
  const dom = new JSDOM('<!doctype html><body><main id="mp"></main></body>', { url: "http://localhost/ai-studio.html#model-tiers", runScripts: "outside-only", pretendToBeVisual: true });
  openDoms.add(dom);
  const w = dom.window, c = w.document.querySelector("main"), rpcs = [];
  w.ENV = { SUPABASE_URL: "https://etfajmrwyywokgafzxsb.supabase.co", SUPABASE_ANON_KEY: "public-test" };
  w.NilazaAdminTransportTarget = "https://etfajmrwyywokgafzxsb.supabase.co";
  w.NilazaAdminSession = { userId: "user-tiers", capabilities };
  w.NilazaRequireCapability = async (capability) => w.NilazaAdminSession?.capabilities.includes(capability);
  w.fetch = async (url) => {
    if (String(url).includes("content-seed.json") && seed) return { ok: true, json: async () => clone(seed) };
    return { ok: false, json: async () => ({}) };
  };
  w.NilazaAdminRpc = async (...args) => {
    rpcs.push(clone(args));
    if (rpc) { const handled = await rpc(...args); if (handled !== undefined) return handled; }
    if (args[0] === "get_ai_persona_model_tiers") return clone(rows);
    if (args[0] === "save_ai_persona_model_tiers_draft") return { id: "d1", version: 2, status: "draft", config: args[1].config_input, note: args[1].note_input, createdAt: "2026-11-25T03:00:00Z" };
    if (args[0] === "publish_ai_persona_model_tiers") {
      const draft = rows.find((row) => row.status === "draft");
      return { ...draft, status: "active", note: args[1].note_input, publishedAt: "2026-11-25T04:00:00Z", archivedVersion: 1 };
    }
    throw Object.assign(Error("unexpected"), { code: "" });
  };
  w.eval(read("apps/admin/env-band.js"));
  w.eval(read("apps/admin/unsaved-changes.js"));
  w.eval(read("apps/admin/persona-model-tiers.js"));
  w.NilazaPersonaModelTiers.mount(c);
  return { dom, w, c, rpcs, api: w.NilazaPersonaModelTiers, calls: (name) => rpcs.filter((item) => item[0] === name) };
}
const $ = (h, selector) => { const element = h.c.querySelector(selector); assert.ok(element, `missing ${selector}`); return element; };
const click = (h, selector) => $(h, selector).click();
const setValue = (h, selector, value) => { const field = $(h, selector); field.value = value; field.dispatchEvent(new h.w.Event("input", { bubbles: true })); };
const choose = (h, selector, value) => { const field = $(h, selector); field.value = value; field.dispatchEvent(new h.w.Event("change", { bubbles: true })); };
const sorted = (list) => [...list].sort();

test("model tiers: the Admin spec copy equals the JSON defaults and the SQL spec literal", () => {
  const h = harness();
  const spec = clone(h.api.spec);
  for (const key of ["tierKeys", "defaultTier", "outputStyles", "bounds", "tiers", "personaTiers"]) assert.deepEqual(spec[key], JSON_SPEC[key], key);
  const { description, ...platform } = JSON_SPEC.platform;
  assert.ok(description);
  assert.deepEqual(spec.platform, platform);
  const literal = MIGRATION.match(/\$spec\$([\s\S]*?)\$spec\$/);
  assert.ok(literal, "SQL spec literal present");
  const sql = JSON.parse(literal[1]);
  assert.deepEqual(spec.tierKeys, sql.tierKeys);
  assert.deepEqual(spec.outputStyles, sql.outputStyles);
  assert.deepEqual(spec.providers, sql.providers);
  assert.deepEqual(spec.reasoningModes, sql.reasoningModes);
  assert.deepEqual(spec.platform.wallClockMsAllowed, sql.wallClockMsAllowed);
  assert.deepEqual(spec.bounds, sql.bounds);
});

test("model tiers: the client validator returns the SQL validator's codes", () => {
  const { api } = harness();
  const v = (config) => sorted(api.validate(config));
  assert.deepEqual(v(defaults()), []);
  assert.deepEqual(v({ tiers: { standard: {} } }), []);
  assert.deepEqual(v(null), ["config_not_object"]);
  assert.deepEqual(v([]), ["config_not_object"]);
  assert.deepEqual(v({ tiers: [], extra: 1 }), ["tiers_not_object", "unknown_key:extra"]);
  assert.deepEqual(v({ tiers: { deep_knowledge: JSON_SPEC.tiers.deep_knowledge } }), ["standard_tier_missing"]);
  assert.deepEqual(v({ tiers: { standard: {}, gold: {}, premium: 3 } }), ["premium:not_object", "unknown_tier:gold"]);
  const deep = clone(JSON_SPEC.tiers.deep_knowledge);
  const bad = {
    ...deep, label: { vi: "   ", en: "x".repeat(41) }, useActiveRoute: false, colour: "red",
    steps: [{ provider: "openrouter", model: "deepseek/deepseek-v4.1-flash" }, { provider: "mistral", model: "m" }, { provider: "openai", model: "-bad", extra: 1 }],
    temperature: 1.6, maxOutputTokens: 256.5, timeoutMs: 300001, primaryShare: 0.2, costCapMicro: 999,
    reasoning: { mode: "huge" }, history: { turns: 12 }, outputStyle: "poetic"
  };
  assert.deepEqual(v({ tiers: { standard: {}, deep_knowledge: bad } }), sorted([
    "deep_knowledge:unknown_key:colour", "deep_knowledge:label", "deep_knowledge:step", "deep_knowledge:step",
    "deep_knowledge:temperature", "deep_knowledge:maxOutputTokens", "deep_knowledge:timeoutMs", "deep_knowledge:primaryShare",
    "deep_knowledge:costCapMicro", "deep_knowledge:reasoning", "deep_knowledge:history", "deep_knowledge:outputStyle"
  ]));
  assert.deepEqual(v({ tiers: { standard: { useActiveRoute: "yes", steps: deep.steps } } }), ["standard:steps_need_useActiveRoute_false", "standard:useActiveRoute"]);
  assert.deepEqual(v({ tiers: { standard: { useActiveRoute: false } } }), ["standard:steps"]);
  assert.deepEqual(v({ tiers: { standard: { useActiveRoute: false, steps: Array(5).fill(deep.steps[0]) } } }), ["standard:steps"]);
  assert.deepEqual(v({ tiers: { standard: { reasoning: { mode: "off", maxTokens: 63 } } } }), ["standard:reasoning"]);
  assert.deepEqual(v({ tiers: { standard: { reasoning: { mode: "low", maxTokens: 64 }, history: { turns: 0, chars: 100 } } } }), []);
  assert.deepEqual(v({ tiers: { standard: {} }, personaTiers: { "book-i-ching": "deep_knowledge", "Bad Key": "standard", "figure-laozi": 3 } }),
    ["persona_key:Bad Key", "persona_tier:book-i-ching", "persona_tier:figure-laozi"]);
  assert.deepEqual(v({ tiers: { standard: {} }, personaTiers: [] }), ["personaTiers_not_object"]);
  assert.deepEqual(v({ tiers: { standard: {} }, platform: { wallClockMs: 300000 } }), ["platform"]);
  assert.deepEqual(v({ tiers: { standard: {} }, platform: { wallClockMs: 400000 } }), []);
  for (const code of ["deep_knowledge:timeoutMs", "persona_tier:book-i-ching", "platform", "standard_tier_missing", "premium:step"]) {
    const text = api.describeError(code, defaults());
    assert.ok(text && !/undefined/.test(text), `${code} has a Vietnamese message`);
  }
  assert.match(api.describeError("deep_knowledge:timeoutMs", defaults()), /^Tri thức sâu: Tổng thời gian chờ phải từ 5 đến 300 giây/);
});

test("model tiers: effective wait follows tierDeadlineMs (Free 135 s streamed, 135 s plain; paid 300 s streamed, 140 s plain)", () => {
  const { api } = harness();
  assert.equal(api.effectiveWaitMs(300000, 150000, true), 135000);
  assert.equal(api.effectiveWaitMs(300000, 150000, false), 135000);
  assert.equal(api.effectiveWaitMs(300000, 400000, true), 300000);
  assert.equal(api.effectiveWaitMs(300000, 400000, false), 140000);
  assert.equal(api.effectiveWaitMs(60000, 150000, true), 60000);
  assert.match(api.formatBudget(30000), /^\$0\.03 mỗi tin nhắn \(≈ \$30 cho 1\.000 tin nhắn\)/);
  assert.equal(api.parseField("seconds", "200"), 200000);
  assert.equal(api.parseField("usd", "0,05"), 50000);
  assert.equal(api.parseField("percent", "65"), 0.65);
  assert.equal(api.parseField("int", "12a"), "12a", "unparseable text stays raw so the validator reports it");
  assert.equal(api.parseField("int", " "), undefined);
});

test("model tiers: no published version shows the code defaults, every tier field and all personas from the seed", async () => {
  const h = harness();
  await drain(h.dom);
  assert.deepEqual(h.calls("get_ai_persona_model_tiers")[0], ["get_ai_persona_model_tiers", {}, "ai.read"]);
  assert.match($(h, "[data-pmt-running]").textContent, /mặc định trong mã/);
  assert.ok(h.c.querySelector('[data-pmt-tier-card="standard"]') && h.c.querySelector('[data-pmt-tier-card="deep_knowledge"]'));
  assert.equal(h.c.querySelector('[data-pmt-tier-card="premium"]'), null);
  assert.ok(h.c.querySelector('[data-pmt-tier-add="premium"]'));
  for (const path of ["label.vi", "label.en", "maxOutputTokens", "temperature", "timeoutMs", "primaryShare", "costCapMicro", "history.turns", "history.chars", "reasoning.maxTokens"]) {
    assert.ok(h.c.querySelector(`[data-pmt-tier="deep_knowledge"][data-pmt-path="${path}"]`), `deep_knowledge ${path}`);
  }
  assert.equal($(h, '[data-pmt-tier="deep_knowledge"][data-pmt-path="timeoutMs"]').value, "300");
  assert.equal($(h, '[data-pmt-tier="deep_knowledge"][data-pmt-path="costCapMicro"]').value, "0.03");
  assert.equal($(h, '[data-pmt-tier="deep_knowledge"][data-pmt-path="primaryShare"]').value, "65");
  assert.equal($(h, '[data-pmt-step="deep_knowledge:0:model"]').value, "deepseek/deepseek-v4.1-flash");
  assert.equal($(h, '[data-pmt-step="deep_knowledge:1:model"]').value, "xiaomi/mimo-v2.6-flash");
  assert.equal($(h, "#pmt-deep_knowledge-reasoning-mode").value, "medium");
  assert.equal($(h, "#pmt-deep_knowledge-style").value, "knowledge");
  const wait = $(h, '[data-pmt-wait="deep_knowledge"]').textContent;
  assert.match(wait, /tối đa 135 s/);
  assert.match(wait, /Đặt 300 s nhưng gói Free chỉ cho 135 s/);
  assert.match(wait, /300 s cần chuyển Supabase sang gói trả phí/);
  assert.match($(h, '[data-pmt-budget="deep_knowledge"]').textContent, /\$0\.03 mỗi tin nhắn/);
  const rows = [...h.c.querySelectorAll("[data-pmt-persona-row]")];
  assert.equal(rows.length, SEED.personas.length);
  assert.equal(rows.length, 19);
  for (const persona of SEED.personas) assert.match($(h, `[data-pmt-persona-row="${persona.id}"]`).textContent, new RegExp(persona.name.vi.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal($(h, '[data-pmt-persona="book-i-ching"]').value, "deep_knowledge");
  assert.equal($(h, '[data-pmt-persona="figure-laozi"]').value, "");
  assert.match($(h, '[data-pmt-persona="figure-laozi"]').selectedOptions[0].textContent, /Mặc định \(Thường\)/);
  assert.match($(h, "[data-pmt-errors]").textContent, /hợp lệ/);
  assert.match(h.c.textContent, /Bật\/tắt & hạn mức/);
});

test("model tiers: editing marks unsaved, refuses invalid values before the RPC, and Lưu nháp sends the whole config", async () => {
  const h = harness({ rows: [activeRow()] });
  await drain(h.dom);
  setValue(h, '[data-pmt-tier="deep_knowledge"][data-pmt-path="timeoutMs"]', "400");
  assert.ok(h.c.querySelector('[data-pmt-error="deep_knowledge:timeoutMs"]'), "out of range shown");
  assert.equal($(h, "[data-pmt-save]").disabled, true);
  assert.match(h.w.NilazaUnsaved.label(), /^1 thay đổi chưa lưu/);
  setValue(h, '[data-pmt-tier="deep_knowledge"][data-pmt-path="timeoutMs"]', "200");
  assert.equal(h.c.querySelector("[data-pmt-error]"), null);
  assert.match($(h, '[data-pmt-wait="deep_knowledge"]').textContent, /Đặt 200 s nhưng gói Free chỉ cho 135 s/);
  setValue(h, '[data-pmt-tier="deep_knowledge"][data-pmt-path="costCapMicro"]', "0,05");
  choose(h, '[data-pmt-persona="book-i-ching"]', "");
  choose(h, '[data-pmt-persona="figure-laozi"]', "deep_knowledge");
  setValue(h, "[data-pmt-note]", "Chờ lâu hơn");
  assert.equal($(h, "[data-pmt-review]").disabled, true, "publish waits for the draft to be saved");
  click(h, "[data-pmt-save]");
  await drain(h.dom);
  const [name, params, rule] = h.calls("save_ai_persona_model_tiers_draft")[0];
  assert.equal(name, "save_ai_persona_model_tiers_draft");
  assert.equal(rule, "ai.manage|ai.read+content.draft");
  assert.equal(params.note_input, "Chờ lâu hơn");
  assert.equal(params.config_input.tiers.deep_knowledge.timeoutMs, 200000);
  assert.equal(params.config_input.tiers.deep_knowledge.costCapMicro, 50000);
  assert.equal(params.config_input.personaTiers["book-i-ching"], undefined);
  assert.equal(params.config_input.personaTiers["figure-laozi"], "deep_knowledge");
  assert.deepEqual(params.config_input.platform, { wallClockMs: 150000 });
  assert.deepEqual(clone(h.api.validate(params.config_input)), []);
  assert.match($(h, "[data-pmt-message]").textContent, /Đã lưu nháp phiên bản 2/);
  assert.equal(h.w.NilazaUnsaved.label(), "Không có thay đổi chưa lưu");
  assert.equal($(h, "[data-pmt-review]").disabled, false);
});

test("model tiers: own models toggle, step add/remove, premium tier add/remove and the paid wall clock", async () => {
  const h = harness();
  await drain(h.dom);
  const own = $(h, "#pmt-standard-own");
  own.checked = true; own.dispatchEvent(new h.w.Event("change", { bubbles: true }));
  assert.ok(h.c.querySelector('[data-pmt-step="standard:0:model"]'), "standard got its own steps");
  click(h, '[data-pmt-step-add="standard"]');
  click(h, '[data-pmt-step-add="standard"]');
  assert.ok(h.c.querySelector('[data-pmt-error="standard:step"]'), "an empty model id is refused");
  click(h, '[data-pmt-step-remove="standard:3"]');
  setValue(h, '[data-pmt-step="standard:2:model"]', "openai/gpt-5.1-mini");
  assert.equal(h.c.querySelector("[data-pmt-error]"), null);
  const off = $(h, "#pmt-standard-own");
  off.checked = false; off.dispatchEvent(new h.w.Event("change", { bubbles: true }));
  assert.equal(h.c.querySelector('[data-pmt-step="standard:0:model"]'), null);
  click(h, '[data-pmt-tier-add="premium"]');
  assert.ok(h.c.querySelector('[data-pmt-tier-card="premium"]'));
  choose(h, '[data-pmt-persona="figure-confucius"]', "premium");
  choose(h, "[data-pmt-platform]", "400000");
  assert.match($(h, '[data-pmt-wait="deep_knowledge"]').textContent, /tối đa 300 s khi chữ hiện dần/);
  click(h, '[data-pmt-tier-remove="premium"]');
  assert.equal($(h, '[data-pmt-persona="figure-confucius"]').value, "", "persona moved back to the default tier");
  assert.match($(h, "[data-pmt-message]").textContent, /1 người dẫn chuyển về Mặc định/);
  click(h, "[data-pmt-save]");
  await drain(h.dom);
  const config = h.calls("save_ai_persona_model_tiers_draft")[0][1].config_input;
  assert.equal(config.tiers.premium, undefined);
  assert.deepEqual(config.tiers.standard, { label: { vi: "Thường", en: "Standard" }, useActiveRoute: true, outputStyle: "concise" });
  assert.deepEqual(config.platform, { wallClockMs: 400000 });
});

test("model tiers: Xem lại & phát hành shows the diff, needs a 10–500 character note and publishes the draft version", async () => {
  const changed = defaults();
  changed.tiers.deep_knowledge.timeoutMs = 200000;
  delete changed.personaTiers["book-i-ching"];
  const rows = [draftRow(changed), activeRow()];
  const h = harness({ rows });
  await drain(h.dom);
  click(h, "[data-pmt-review]");
  const dialog = $(h, "#pmt-dialog");
  assert.equal(dialog.getAttribute("role"), "dialog");
  assert.equal(dialog.getAttribute("aria-modal"), "true");
  const changedRows = [...h.c.querySelectorAll("[data-pmt-diff].changed")].map((row) => row.getAttribute("data-pmt-diff"));
  assert.ok(changedRows.includes("Tri thức sâu · Tổng thời gian chờ"));
  assert.ok(changedRows.some((key) => key.startsWith("Người dẫn · ") && key.includes("book-i-ching")));
  assert.match($(h, '[data-pmt-diff="Tri thức sâu · Tổng thời gian chờ"]').textContent, /300 s.*200 s/);
  assert.match(dialog.textContent, /thay phiên bản đang chạy 1/);
  const confirm = $(h, "[data-pmt-publish]");
  assert.equal(confirm.disabled, true);
  setValue(h, "#pmt-publish-note", "ngắn");
  assert.equal($(h, "[data-pmt-publish]").disabled, true);
  setValue(h, "#pmt-publish-note", "Giảm chờ Tri thức sâu còn 200 giây");
  assert.equal($(h, "[data-pmt-publish]").disabled, false);
  click(h, "[data-pmt-publish]");
  await drain(h.dom);
  assert.deepEqual(h.calls("publish_ai_persona_model_tiers")[0], ["publish_ai_persona_model_tiers", { version_input: 2, note_input: "Giảm chờ Tri thức sâu còn 200 giây" }, "ai.manage"]);
  assert.equal(h.c.querySelector("#pmt-dialog"), null);
  assert.match($(h, "[data-pmt-message]").textContent, /Đã phát hành phiên bản 2/);
  assert.match($(h, "[data-pmt-running]").textContent, /phiên bản 2/);
});

test("model tiers: Escape closes the review dialog without publishing", async () => {
  const h = harness({ rows: [draftRow(defaults()), activeRow()] });
  await drain(h.dom);
  click(h, "[data-pmt-review]");
  $(h, "#pmt-dialog").dispatchEvent(new h.w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(h.c.querySelector("#pmt-dialog"), null);
  assert.equal(h.calls("publish_ai_persona_model_tiers").length, 0);
});

test("model tiers: an editor saves a draft but cannot publish; read-only staff get no inputs", async () => {
  const editor = harness({ capabilities: ["ai.read", "content.draft"], rows: [draftRow(defaults()), activeRow()] });
  await drain(editor.dom);
  assert.ok(editor.c.querySelector("[data-pmt-save]"));
  assert.equal(editor.c.querySelector("[data-pmt-review]"), null);
  assert.match($(editor, "[data-pmt-owner-only]").textContent, /Chỉ Owner \(quyền ai\.manage\) phát hành/);
  setValue(editor, '[data-pmt-tier="deep_knowledge"][data-pmt-path="maxOutputTokens"]', "6000");
  click(editor, "[data-pmt-save]");
  await drain(editor.dom);
  assert.equal(editor.calls("save_ai_persona_model_tiers_draft").length, 1);

  const reader = harness({ capabilities: ["ai.read"], rows: [activeRow()] });
  await drain(reader.dom);
  assert.ok(reader.c.querySelector("[data-pmt-readonly]"));
  assert.equal(reader.c.querySelector("[data-pmt-save]"), null);
  assert.ok([...reader.c.querySelectorAll("input, select")].every((field) => field.disabled), "every field disabled");
});

test("model tiers: a missing migration says so and keeps the defaults visible; server errors are Vietnamese", async () => {
  const missing = harness({ rpc: async () => { throw Object.assign(Error("missing"), { code: "PGRST202", missingFunction: true }); } });
  await drain(missing.dom);
  const note = $(missing, "[data-pmt-missing]");
  assert.match(note.textContent, /Chưa áp migration/);
  assert.match(note.textContent, /20261125100000/);
  assert.equal(missing.c.querySelector("[data-pmt-save]"), null);
  assert.equal(missing.c.querySelectorAll("[data-pmt-persona-row]").length, 19);

  const refused = harness({ rows: [activeRow()], rpc: async (name) => { if (name === "save_ai_persona_model_tiers_draft") throw Object.assign(Error("x"), { code: "22023" }); } });
  await drain(refused.dom);
  setValue(refused, '[data-pmt-tier="deep_knowledge"][data-pmt-path="maxOutputTokens"]', "6000");
  click(refused, "[data-pmt-save]");
  await drain(refused.dom);
  assert.match($(refused, "[data-pmt-message]").textContent, /Máy chủ không nhận cấu hình này/);

  const noSeed = harness({ seed: null });
  await drain(noSeed.dom);
  assert.match(noSeed.c.textContent, /Không tải được danh sách người dẫn/);
  assert.ok(noSeed.c.querySelector('[data-pmt-persona-row="book-i-ching"]'), "mapped personas still listed");
});

test("model tiers: server text is escaped and leaving the route clears the page", async () => {
  const config = defaults();
  config.tiers.deep_knowledge.label = { vi: "<img src=x onerror=alert(1)>", en: "Deep" };
  const row = { ...activeRow(config), note: "<script>alert(1)</script>" };
  const seed = { ...SEED, personas: [{ ...SEED.personas[0], name: { vi: "<b>Ari</b>", en: "Ari" } }, ...SEED.personas.slice(1)] };
  const h = harness({ rows: [row], seed });
  await drain(h.dom);
  assert.equal(h.c.querySelector("img"), null);
  assert.equal(h.c.querySelector("script"), null);
  assert.equal(h.c.querySelector("[data-pmt-persona-row] b"), null);
  assert.match(h.c.textContent, /<script>alert\(1\)<\/script>/);
  h.w.location.hash = "#campaigns";
  h.w.dispatchEvent(new h.w.HashChangeEvent("hashchange"));
  assert.match(h.c.textContent, /Phiên đã thay đổi/);
});

test("model tiers: registered in AI Studio (script order, route, nav, RPC allowlist, capabilities)", () => {
  const html = read("apps/admin/ai-studio.html");
  assert.match(html, /<script src="\.\/context-config\.js"><\/script>\s*<script src="\.\/persona-model-tiers\.js"><\/script>\s*<script src="\.\/app\.js"><\/script>/);
  const app = read("apps/admin/app.js");
  assert.match(app, /"model-tiers": "personaModelTiers"/);
  assert.match(app, /window\.NilazaPersonaModelTiers\.mount\(detailPanel\)/);
  assert.match(app, /state\.detail === "personaModelTiers"\) return "none"/);
  assert.match(app, /window\.NilazaPersonaModelTiers\?\.clear\(\)/);
  const shell = read("apps/admin/shell.js");
  assert.match(shell, /"model-tiers": "Hạng model người dẫn"/);
  assert.match(shell, /\{ id: "model-tiers", label: "Hạng model người dẫn", routes: \[\["ai-studio", "model-tiers"\]\] \}/);
  const guard = read("apps/admin/workspace-guard.js");
  assert.match(guard, /get_ai_persona_model_tiers: "ai\.read"/);
  assert.match(guard, /save_ai_persona_model_tiers_draft: "ai\.manage\|ai\.read\+content\.draft"/);
  assert.match(guard, /publish_ai_persona_model_tiers: "ai\.manage"/);
  const caps = JSON.parse(read("apps/admin/admin-capabilities.json"));
  const routes = JSON.stringify(caps);
  assert.match(routes, /"id":"model-tiers"/);
  for (const name of ["get_ai_persona_model_tiers", "save_ai_persona_model_tiers_draft", "publish_ai_persona_model_tiers"]) assert.match(MIGRATION, new RegExp(`function public\\.${name}\\(`));
});
