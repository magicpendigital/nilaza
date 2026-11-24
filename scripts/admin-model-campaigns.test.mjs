// Admin "Model và chiến dịch" (apps/admin/model-campaigns.js; migration 20261124090100, Edge Function
// admin-model-campaigns): one card per feature with the running chain, campaign metrics per variant, and confirmed
// start / pause / end / pick-winner actions. Runs the module in JSDOM with a fake transport.
import assert from "node:assert/strict";
import fs from "node:fs";
import test, { after } from "node:test";
import { JSDOM } from "jsdom";

const read = (file) => fs.readFileSync(file, "utf8");
const openDoms = new Set();
after(() => { for (const dom of openDoms) dom.window.close(); });
const drain = async (dom) => { for (let i = 0; i < 10; i += 1) await new Promise((resolve) => dom.window.setTimeout(resolve, 0)); };

const CAMPAIGN = "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6";
const ROUTE_ID = "00000000-0000-4000-8000-000000000001";
const step = (model) => ({ provider: "openrouter", model, timeoutMs: 30000, maxTokens: 1500, temperature: 0.5, jsonMode: true, reasoning: null });
const tarotActive = {
  id: ROUTE_ID, feature: "tarot_reading", version: "tarot-<img src=x onerror=alert(1)>", status: "active", primary_provider: "openrouter", primary_model: "a/one",
  steps: [{ provider: "openrouter", model: "a/one", timeout_ms: 30000, max_tokens: 2000, temperature: 0.6, json_mode: true, reasoning: null }, { provider: "openrouter", model: "a/two", timeout_ms: 30000, max_tokens: 2000, temperature: 0.6, json_mode: false, reasoning: null }],
  total_deadline_ms: 90000
};
const running = () => ({
  id: CAMPAIGN, feature: "tarot_reading", name: "Tarot <b>rẻ hơn</b>", status: "running", audience: { signedInOnly: true }, stopRules: { maxFormatFailRate: 0.05 }, winnerVariant: null,
  variants: [
    { key: "A", label: "Đang chạy", trafficPercent: 50, route: { steps: tarotActive.steps, total_deadline_ms: 90000 } },
    { key: "B", label: "Thử", trafficPercent: 50, route: { steps: [{ provider: "openrouter", model: "b/one", timeout_ms: 30000, max_tokens: 1500, temperature: 0.5, json_mode: true, reasoning: null }], total_deadline_ms: null } }
  ]
});
const metricsBody = () => ({ [CAMPAIGN]: { variants: [
  { variant: "A", calls: 150, enoughData: true, avgCostMicro: 1000, costMultiplier: 1, p95LatencyMs: 8200, formatFailRate: 0.01, modelFallbackRate: 0.02, cannedFallbackRate: 0, errorRate: 0, noteYesRate: 0.75, noteFeedbackYes: 30, noteFeedbackNo: 10, stopRuleBreached: [] },
  { variant: "B", calls: 40, enoughData: false, avgCostMicro: 500, formatFailRate: 0.2, stopRuleBreached: [] }
] } });

function harness({ capabilities = ["ai.read", "ai.manage"], campaigns = [running()], campaignsResponse, post } = {}) {
  const dom = new JSDOM('<!doctype html><body><main id="mc"></main></body>', { url: "http://localhost/ai-studio.html#campaigns", runScripts: "outside-only", pretendToBeVisual: true });
  openDoms.add(dom);
  const w = dom.window, c = w.document.querySelector("main"), requests = [];
  w.ENV = { SUPABASE_URL: "https://etfajmrwyywokgafzxsb.supabase.co", SUPABASE_ANON_KEY: "public-test" };
  w.NilazaAdminTransportTarget = "https://etfajmrwyywokgafzxsb.supabase.co";
  w.NilazaAdminSession = { userId: "user-mc", capabilities };
  w.NilazaRequireCapability = async (capability) => w.NilazaAdminSession?.capabilities.includes(capability);
  w.NilazaAdminRequest = async (url, init, capability) => {
    const body = init.body ? JSON.parse(init.body) : null;
    requests.push({ url, method: init.method, capability, body });
    if (url.endsWith("/admin-model-router-config")) return { ok: true, status: 200, json: async () => ({ status: "connected", routes: [tarotActive], history: [] }) };
    if (init.method === "GET") return campaignsResponse ?? { ok: true, status: 200, json: async () => ({ status: "connected", campaigns: JSON.parse(JSON.stringify(campaigns)), metrics: metricsBody(), minCalls: 100 }) };
    if (post) return post(body);
    return { ok: true, status: 200, json: async () => ({ status: "ok", action: body.action, campaign: { id: CAMPAIGN } }) };
  };
  w.eval(read("apps/admin/env-band.js"));
  w.eval(read("apps/admin/unsaved-changes.js"));
  w.eval(read("apps/admin/model-campaigns.js"));
  w.NilazaModelCampaigns.mount(c);
  return { dom, w, c, requests, posts: () => requests.filter((item) => item.method === "POST") };
}
const click = (h, selector) => { const element = h.c.querySelector(selector); assert.ok(element, `missing ${selector}`); element.click(); };
const setValue = (h, selector, value) => { const field = h.c.querySelector(selector); assert.ok(field, `missing ${selector}`); field.value = value; field.dispatchEvent(new h.w.Event("input", { bubbles: true })); };

test("one card per feature with the running chain; metrics table is accessible and escapes text", async () => {
  const h = harness();
  await drain(h.dom);
  assert.equal(h.c.querySelectorAll("[data-campaign-card]").length, 8);
  const tarot = h.c.querySelector('[data-campaign-card="tarot_reading"]');
  assert.match(tarot.textContent, /1\. a\/one → 2\. a\/two/);
  assert.equal(h.c.querySelector("img"), null, "route version and campaign name are escaped");
  assert.equal(h.c.querySelector("b"), null);
  const table = tarot.querySelector("table.campaign-metrics");
  assert.ok(table.querySelector("caption"));
  assert.ok([...table.querySelectorAll("thead th")].every((th) => th.getAttribute("scope") === "col"));
  const rows = [...table.querySelectorAll("tbody tr")];
  assert.equal(rows.length, 2);
  assert.match(rows[0].textContent, /75%/);
  assert.match(rows[1].textContent, /chưa đủ dữ liệu/, "fewer than 100 calls hides the rates");
  assert.match(rows[1].textContent, /40 \/ 100/);
  assert.match(h.c.textContent, /Quy tắc dừng chỉ cảnh báo/);
  assert.deepEqual(h.requests.map((item) => [item.url.split("/").pop(), item.method, item.capability]).sort(), [["admin-model-campaigns", "GET", "ai.read"], ["admin-model-router-config", "GET", "ai.read"]]);
});

test("read-only admins see metrics but no action buttons", async () => {
  const h = harness({ capabilities: ["ai.read"] });
  await drain(h.dom);
  assert.equal(h.c.querySelectorAll("[data-campaign-action], [data-campaign-new]").length, 0);
  assert.match(h.c.textContent, /chỉ có quyền xem/);
});

test("pause asks for confirmation in a modal dialog before posting", async () => {
  const h = harness();
  await drain(h.dom);
  click(h, '[data-campaign-action="pause"]');
  const dialog = h.c.querySelector('[role="dialog"]');
  assert.equal(dialog.getAttribute("aria-modal"), "true");
  assert.equal(h.posts().length, 0);
  click(h, "[data-dialog-confirm]");
  await drain(h.dom);
  assert.deepEqual(h.posts()[0].body, { action: "pause", campaignId: CAMPAIGN });
  assert.equal(h.posts()[0].capability, "ai.manage");
  assert.equal(h.c.querySelector('[role="dialog"]'), null);
});

test("pick winner needs a variant and a 10-500 character note and sends the active route id", async () => {
  const h = harness();
  await drain(h.dom);
  click(h, '[data-campaign-action="pick_winner"]');
  assert.ok(h.c.querySelector("[data-dialog-confirm]").disabled);
  const radio = h.c.querySelector('[data-dialog-variant="B"]');
  radio.checked = true; radio.dispatchEvent(new h.w.Event("change", { bubbles: true }));
  assert.match(h.c.textContent, /chưa đủ 100 lượt gọi/);
  setValue(h, "#campaign-dialog-note", "ngắn");
  assert.ok(h.c.querySelector("[data-dialog-confirm]").disabled);
  setValue(h, "#campaign-dialog-note", "B rẻ hơn một nửa, lỗi định dạng thấp");
  assert.equal(h.c.querySelector("[data-dialog-confirm]").disabled, false);
  click(h, "[data-dialog-confirm]");
  await drain(h.dom);
  const body = h.posts()[0].body;
  assert.equal(body.action, "pick_winner");
  assert.equal(body.variant, "B");
  assert.equal(body.expectedActiveId, ROUTE_ID);
  assert.match(body.publishRequestId, /^[0-9a-f-]{36}$/);
});

test("a conflict shows a Vietnamese message and keeps the dialog", async () => {
  const h = harness({ post: () => ({ ok: false, status: 409, json: async () => ({ error: "Conflict", code: "conflict" }) }) });
  await drain(h.dom);
  click(h, '[data-campaign-action="end"]');
  click(h, "[data-dialog-confirm]");
  await drain(h.dom);
  assert.match(h.c.querySelector('[role="alert"]').textContent, /trạng thái đã đổi/);
  assert.ok(h.c.querySelector('[role="dialog"]'));
});

test("new campaign editor copies the running chain, checks traffic and saves a draft", async () => {
  const h = harness({ campaigns: [] });
  await drain(h.dom);
  click(h, '[data-campaign-new="tarot_reading"]');
  setValue(h, "#campaign-name", "Thử model rẻ");
  assert.match(h.c.querySelector("#variant-route-0").value, /"model": "a\/one"/, "variant A starts from the running chain");
  setValue(h, "#variant-route-1", JSON.stringify({ steps: [step("b/one")] }));
  setValue(h, "#variant-traffic-1", "40");
  click(h, "[data-editor-save]");
  assert.match(h.c.querySelector('[role="alert"]').textContent, /Tổng tỷ lệ phải là 100%/);
  assert.equal(h.posts().length, 0);
  setValue(h, "#variant-traffic-1", "50");
  setValue(h, "#campaign-max-format", "5");
  click(h, "[data-editor-save]");
  await drain(h.dom);
  const body = h.posts()[0].body;
  assert.equal(body.action, "save_draft");
  assert.equal(body.feature, "tarot_reading");
  assert.deepEqual(body.variants.map((item) => [item.key, item.trafficPercent, item.route.steps.length]), [["A", 50, 2], ["B", 50, 1]]);
  assert.deepEqual(body.stopRules, { maxFormatFailRate: 0.05 });
  assert.deepEqual(body.audience, { signedInOnly: true });
  assert.equal(body.variants[0].route.steps[0].timeoutMs, 30000, "snake_case steps become camelCase");
});

test("buildDraft refuses bad JSON and bad steps", () => {
  const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/ai-studio.html", runScripts: "outside-only" });
  openDoms.add(dom);
  dom.window.eval(read("apps/admin/model-campaigns.js"));
  const { buildDraft } = dom.window.NilazaModelCampaigns;
  const editor = (route) => ({ feature: "tarot_note", name: "Ghi chú", startsAt: "", endsAt: "", locales: [], maxFormatFailPct: "", maxCostMultiplier: "",
    variants: [{ key: "A", label: "", traffic: "50", route: JSON.stringify({ steps: [step("a/b")] }) }, { key: "B", label: "", traffic: "50", route }] });
  assert.throws(() => buildDraft(editor("{")), /JSON/);
  assert.throws(() => buildDraft(editor(JSON.stringify({ steps: [{ ...step("x"), provider: "mistral" }] }))), /nhà cung cấp/);
  assert.throws(() => buildDraft(editor(JSON.stringify({ steps: [] }))), /1–4 bước/);
  assert.equal(buildDraft(editor(JSON.stringify({ steps: [step("c/d")] }))).variants[1].label, "Bản B");
});

test("a missing migration names it instead of failing silently", async () => {
  const h = harness({ campaignsResponse: { ok: false, status: 412, json: async () => ({ error: "Migration missing", code: "migration_missing" }) } });
  await drain(h.dom);
  assert.match(h.c.textContent, /20261124090100_model_campaigns\.sql/);
  assert.equal(h.c.querySelectorAll("[data-campaign-new]").length, 0);
});

test("navigation, capabilities, guard and script tag register the page", () => {
  const capabilities = JSON.parse(read("apps/admin/admin-capabilities.json"));
  const studio = capabilities.workspaces.find((item) => item.id === "ai-studio");
  assert.ok(studio.routes.some((route) => route.id === "campaigns"));
  assert.match(read("apps/admin/ai-studio.html"), /<script src="\.\/model-campaigns\.js"><\/script>\s*<script src="\.\/context-config\.js">/);
  assert.match(read("apps/admin/workspace-guard.js"), /"\/functions\/v1\/admin-model-campaigns": \{ GET: "ai\.read", POST: "ai\.manage" \}/);
  assert.match(read("apps/admin/shell.js"), /\{ id: "campaigns", label: "Model và chiến dịch", routes: \[\["ai-studio", "campaigns"\]\] \}/);
  const app = read("apps/admin/app.js");
  assert.match(app, /campaigns: "modelCampaigns"/);
  assert.match(app, /window\.NilazaModelCampaigns\.mount\(detailPanel\)/);
});
