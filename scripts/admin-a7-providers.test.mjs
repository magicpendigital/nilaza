// Admin redesign step A7 (spec 04/11 §3.10, §3.7 part 2; D3, D4): provider table, Kiểm tra khóa and per-feature
// model chains (max 4 steps) through list_ai_providers / set_ai_provider (migration 20261113140100), the
// admin-ai-provider-probe Edge Function and admin-model-router-config (steps, migration 20261113140000).
import assert from "node:assert/strict";
import fs from "node:fs";
import test, { after } from "node:test";
import { JSDOM } from "jsdom";

const read = (file) => fs.readFileSync(file, "utf8");
const openDoms = new Set();
after(() => { for (const dom of openDoms) dom.window.close(); });
const tick = (dom) => new Promise((resolve) => dom.window.setTimeout(resolve, 0));
const drain = async (dom) => { for (let i = 0; i < 10; i += 1) await tick(dom); };

const providerRows = () => [
  { provider: "openrouter", priority: 1, enabled: true, secretName: "OPENROUTER_API_KEY", allowedDataClass: "sensitive", phase: 0, configured: true, failures: 0, circuitOpen: false, lastProbeResult: "ok", lastProbeAt: "2026-11-13T01:00:00Z", attempts24h: 12, errors24h: 1 },
  { provider: "anthropic", priority: 2, enabled: false, secretName: "ANTHROPIC_API_KEY", allowedDataClass: "personal", phase: 2, configured: null, failures: 0, circuitOpen: false, attempts24h: 0, errors24h: 0 },
  { provider: "gemini", priority: 3, enabled: false, secretName: "GEMINI_API_KEY", allowedDataClass: "personal", phase: 3, configured: false, failures: 3, circuitOpen: true, openedUntil: "2026-11-13T02:00:00Z", attempts24h: 0, errors24h: 0 },
  { provider: "openai", priority: 4, enabled: false, secretName: "OPENAI_API_KEY", allowedDataClass: "personal", phase: 3, configured: null, failures: 0, circuitOpen: false, attempts24h: 0, errors24h: 0 },
  { provider: "deepseek", priority: 5, enabled: false, secretName: "DEEPSEEK_API_KEY", allowedDataClass: "public", phase: 3, configured: null, failures: 0, circuitOpen: false, attempts24h: 0, errors24h: 0 }
];
const tarotActive = {
  id: "00000000-0000-4000-8000-000000000001", feature: "tarot_reading", version: "tarot-<img src=x onerror=alert(1)>", status: "active",
  primary_provider: "openrouter", primary_model: "deepseek/deepseek-v4.1-flash", fallback_provider: "openrouter", fallback_model: "xiaomi/mimo-v2.6-flash",
  temperature: 0.64, max_output_tokens: 2000, response_schema: "tarot_reading_output_v3", fallback_when: ["provider_timeout"], safety_policy: { reasoning: { mode: "off" }, keep: true },
  steps: null, total_deadline_ms: null
};
const routesBody = (extra = {}) => ({ status: "connected", contractVersion: "model_route_publish_v2", routes: [tarotActive], history: [], stepsSupported: true, providers: [], ...extra });

function harness({ capabilities = ["ai.read", "ai.manage"], providers = providerRows(), routes = routesBody(), rpc, request } = {}) {
  const dom = new JSDOM('<!doctype html><body><main id="mp"></main></body>', { url: "http://localhost/ai-studio.html#providers", runScripts: "outside-only", pretendToBeVisual: true });
  openDoms.add(dom);
  const w = dom.window, c = w.document.querySelector("main"), rpcs = [], requests = [];
  w.ENV = { SUPABASE_URL: "https://etfajmrwyywokgafzxsb.supabase.co", SUPABASE_ANON_KEY: "public-test" };
  w.NilazaAdminTransportTarget = "https://etfajmrwyywokgafzxsb.supabase.co";
  w.NilazaAdminSession = { userId: "user-a7", capabilities };
  w.NilazaRequireCapability = async (capability) => w.NilazaAdminSession?.capabilities.includes(capability);
  w.NilazaAdminRpc = async (...args) => {
    rpcs.push(args);
    if (rpc) { const handled = await rpc(...args); if (handled !== undefined) return handled; }
    if (args[0] === "list_ai_providers") return JSON.parse(JSON.stringify(providers));
    throw Object.assign(Error("unexpected"), { code: "" });
  };
  w.NilazaAdminRequest = async (url, init, capability) => {
    const body = init.body ? JSON.parse(init.body) : null;
    requests.push({ url, method: init.method, capability, body });
    if (request) { const handled = await request(url, init, capability, body); if (handled) return handled; }
    if (init.method === "GET") return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(routes)) };
    const config = { id: "00000000-0000-4000-8000-0000000000aa", feature: body.feature, version: body.version, status: body.status, steps: body.steps.map((step) => ({ provider: step.provider, model: step.model, timeout_ms: step.timeoutMs, max_tokens: step.maxTokens, temperature: step.temperature, json_mode: step.jsonMode, reasoning: step.reasoning })), total_deadline_ms: body.totalDeadlineMs, primary_provider: body.steps[0].provider, primary_model: body.steps[0].model, created_at: "2026-11-13T03:00:00Z" };
    return { ok: true, status: 200, json: async () => ({ status: "published", version: body.version, configStatus: body.status, config }) };
  };
  w.eval(read("apps/admin/env-band.js"));
  w.eval(read("apps/admin/unsaved-changes.js"));
  w.eval(read("apps/admin/model-providers.js"));
  w.NilazaModelProviders.mount(c);
  return { dom, w, c, rpcs, requests, posts: () => requests.filter((item) => item.method === "POST") };
}
const click = (h, selector) => { const element = h.c.querySelector(selector); assert.ok(element, `missing ${selector}`); element.click(); };
const setValue = (h, selector, value, type = "input") => { const field = h.c.querySelector(selector); assert.ok(field, `missing ${selector}`); field.value = value; field.dispatchEvent(new h.w.Event(type, { bubbles: true })); };
const card = (h, id) => h.c.querySelector(`[data-chain-card="${id}"]`);

test("A7: provider table shows order, switch, key yes/no, data class, 24 h health and circuit; no key input anywhere", async () => {
  const h = harness();
  await drain(h.dom);
  assert.equal(h.rpcs[0][0], "list_ai_providers"); assert.equal(h.rpcs[0][2], "ai.read");
  assert.equal(h.requests[0].method, "GET"); assert.match(h.requests[0].url, /admin-model-router-config$/); assert.equal(h.requests[0].capability, "ai.read");
  const rows = [...h.c.querySelectorAll(".provider-table tbody tr")].map((tr) => tr.textContent.replace(/\s+/g, " "));
  assert.equal(rows.length, 5);
  assert.match(rows[0], /^\s*1\s*OpenRouter/); assert.match(rows[0], /Bật/); assert.match(rows[0], /Đã cấu hình/); assert.match(rows[0], /Nhạy cảm/); assert.match(rows[0], /12 lượt · 1 lỗi/); assert.match(rows[0], /Đóng/); assert.match(rows[0], /Ổn/);
  assert.match(rows[1], /Anthropic/); assert.match(rows[1], /Tắt/); assert.match(rows[1], /Chưa kiểm tra/); assert.match(rows[1], /Cá nhân/);
  assert.match(rows[2], /Chưa cấu hình/); assert.match(rows[2], /Mở tới/);
  assert.match(rows[4], /DeepSeek/); assert.match(rows[4], /Công khai/);
  assert.equal(h.c.querySelector('input[type="password"]'), null);
  assert.equal([...h.c.querySelectorAll("input,textarea")].some((input) => /key|khóa/i.test(`${input.id} ${input.name} ${input.placeholder}`)), false, "no key field");
  assert.match(h.c.textContent, /Admin không có ô nhập khóa/);
  assert.equal(h.c.innerHTML.includes("<img src=x"), false, "route version escaped");
  assert.match(h.c.textContent, /tarot-<img src=x onerror=alert\(1\)>/);
});

test("A7: missing tables or columns name the migration; the probe function missing names the deploy", async () => {
  const h = harness({ rpc: async (name) => { if (name === "list_ai_providers") throw Object.assign(Error("missing"), { code: "PGRST202", missingFunction: true }); }, routes: routesBody({ stepsSupported: false, stepsMigration: "20261113140000_model_route_steps.sql" }),
    request: async (url, init) => url.endsWith("admin-ai-provider-probe") ? { ok: false, status: 404, json: async () => ({}) } : undefined });
  await drain(h.dom);
  assert.match(h.c.textContent, /migration 20261113140100_ai_providers\.sql/);
  assert.match(card(h, "tarot_reading").textContent, /migration 20261113140000_model_route_steps\.sql/);
  assert.equal(card(h, "tarot_reading").querySelector("[data-chain-save]"), null, "no save before the steps migration");
  click(h, "#model-providers-probe");
  await drain(h.dom);
  assert.match(h.c.textContent, /chưa có hàm admin-ai-provider-probe/);
});

test("A7: a viewer sees chains and providers read-only, without Kiểm tra khóa or save buttons", async () => {
  const h = harness({ capabilities: ["ai.read"] });
  await drain(h.dom);
  assert.equal(h.c.querySelector("#model-providers-probe"), null);
  assert.equal(h.c.querySelector("[data-provider-edit]"), null);
  assert.equal(h.c.querySelector("[data-chain-save]"), null);
  assert.equal(h.c.querySelector("[data-chain-review]"), null);
  assert.ok([...card(h, "tarot_reading").querySelectorAll("select,input")].every((field) => field.disabled));
  assert.match(card(h, "tarot_reading").textContent, /chỉ có quyền xem/);
});

test("A7: the chain editor allows at most 4 steps, catalogue models only, and warns about skipped providers", async () => {
  const h = harness();
  await drain(h.dom);
  const tarot = () => card(h, "tarot_reading");
  assert.equal(tarot().querySelectorAll(".chain-table tbody tr").length, 2, "legacy primary + fallback shown as 2 steps");
  assert.equal(tarot().querySelector('[data-chain-field="timeoutS"]').value, "40", "legacy wait 40 s");
  click(h, '[data-chain-add="tarot_reading"]'); click(h, '[data-chain-add="tarot_reading"]');
  assert.equal(tarot().querySelectorAll(".chain-table tbody tr").length, 4);
  assert.equal(tarot().querySelector('[data-chain-add="tarot_reading"]').disabled, true, "no fifth step");
  setValue(h, '#chain-tarot_reading-2-provider', "anthropic", "change");
  const models = [...tarot().querySelectorAll("#chain-tarot_reading-2-model option")].map((option) => option.value);
  assert.deepEqual(models, ["claude-haiku-4-5", "claude-sonnet-4-5"]);
  assert.equal(tarot().querySelector("#chain-tarot_reading-2-model").tagName, "SELECT", "no free-text model field");
  assert.match(tarot().textContent, /Sẽ bị bỏ qua: đang tắt/);
  setValue(h, '#chain-tarot_reading-3-provider', "deepseek", "change");
  assert.match(tarot().textContent, /chỉ được nhận dữ liệu công khai/);
});

test("A7: Lưu nháp posts a draft chain with per-step settings and keeps the route's safety policy", async () => {
  const h = harness();
  await drain(h.dom);
  click(h, '[data-chain-add="tarot_reading"]');
  setValue(h, '#chain-tarot_reading-2-provider', "anthropic", "change");
  setValue(h, '#chain-tarot_reading-2-timeoutS', "25");
  setValue(h, '#chain-tarot_reading-2-reasoning', "low", "change");
  setValue(h, '#chain-tarot_reading-deadline', "100");
  card(h, "tarot_reading").querySelector("[data-chain-form]").dispatchEvent(new h.w.Event("submit", { bubbles: true, cancelable: true }));
  await drain(h.dom);
  const [post] = h.posts();
  assert.ok(post, "draft posted");
  assert.match(post.url, /admin-model-router-config$/); assert.equal(post.capability, "ai.manage");
  assert.equal(post.body.status, "draft"); assert.equal(post.body.feature, "tarot_reading"); assert.equal(post.body.contractVersion, "model_route_publish_v2");
  assert.equal(post.body.expectedActiveId, tarotActive.id);
  assert.equal(post.body.steps.length, 3);
  assert.deepEqual(post.body.steps[2], { provider: "anthropic", model: "claude-haiku-4-5", timeoutMs: 25000, maxTokens: 2000, temperature: 0.64, jsonMode: false, reasoning: { mode: "low" } });
  assert.equal(post.body.steps[0].timeoutMs, 40000);
  assert.equal(post.body.totalDeadlineMs, 100000);
  assert.deepEqual(post.body.safetyPolicy, tarotActive.safety_policy, "safety policy kept"); assert.deepEqual(post.body.fallbackWhen, ["provider_timeout"]);
  assert.equal(post.body.responseSchema, "tarot_reading_output_v3");
  assert.match(card(h, "tarot_reading").textContent, /Đã lưu nháp .*Người dùng chưa thấy/);
});

test("A7: invalid chains are refused in the browser with a Vietnamese reason and no request", async () => {
  const h = harness();
  await drain(h.dom);
  const submit = () => card(h, "tarot_reading").querySelector("[data-chain-form]").dispatchEvent(new h.w.Event("submit", { bubbles: true, cancelable: true }));
  setValue(h, '#chain-tarot_reading-deadline', "150"); submit(); await drain(h.dom);
  assert.match(card(h, "tarot_reading").textContent, /Tổng thời gian tối đa \(giây\): nhập số từ 5 đến 140/);
  setValue(h, '#chain-tarot_reading-deadline', "30"); submit(); await drain(h.dom);
  assert.match(card(h, "tarot_reading").textContent, /Mỗi bước phải chờ ít hơn hoặc bằng tổng thời gian tối đa/);
  setValue(h, '#chain-tarot_reading-deadline', ""); setValue(h, '#chain-tarot_reading-0-timeoutS', "120"); submit(); await drain(h.dom);
  assert.match(card(h, "tarot_reading").textContent, /vượt 140 giây/);
  assert.equal(h.posts().length, 0);
});

test("A7: Xem lại & phát hành shows the step diff and environment, needs a note, then publishes the reviewed chain", async () => {
  const h = harness();
  await drain(h.dom);
  click(h, '[data-chain-add="tarot_reading"]');
  setValue(h, '#chain-tarot_reading-2-provider', "anthropic", "change");
  click(h, '[data-chain-review="tarot_reading"]');
  const dialog = h.c.querySelector("#chain-dialog");
  assert.ok(dialog);
  assert.match(dialog.textContent, /Đang ghi vào:/);
  const changed = [...dialog.querySelectorAll(".diff-table tbody tr")].map((tr) => tr.textContent.replace(/\s+/g, " "));
  assert.match(changed[0], /Giữ nguyên/); assert.match(changed[2], /Thêm/); assert.match(changed[2], /Anthropic · claude-haiku-4-5/);
  assert.match(dialog.textContent, /Bước 3 sẽ bị bỏ qua khi chạy: đang tắt/);
  assert.match(dialog.textContent, /Bị chặn vì an toàn thì không chuyển sang bước khác/);
  const publish = () => h.c.querySelector("[data-chain-publish]");
  assert.equal(publish().disabled, true);
  setValue(h, "#chain-publish-note", "ngắn");
  assert.equal(publish().disabled, true);
  setValue(h, "#chain-publish-note", "Thêm Anthropic làm bước 3 khi OpenRouter lỗi");
  assert.equal(publish().disabled, false);
  publish().click();
  await drain(h.dom);
  const [post] = h.posts();
  assert.equal(post.body.status, "active"); assert.equal(post.body.note, "Thêm Anthropic làm bước 3 khi OpenRouter lỗi"); assert.equal(post.body.steps.length, 3);
  assert.equal(h.c.querySelector("#chain-dialog"), null);
  assert.match(card(h, "tarot_reading").textContent, /Đã phát hành/);
});

test("A7: a 412 from the server names the steps migration", async () => {
  const h = harness({ request: async (url, init) => init.method === "POST" ? { ok: false, status: 412, json: async () => ({ code: "migration_missing" }) } : undefined });
  await drain(h.dom);
  card(h, "tarot_reading").querySelector("[data-chain-form]").dispatchEvent(new h.w.Event("submit", { bubbles: true, cancelable: true }));
  await drain(h.dom);
  assert.match(card(h, "tarot_reading").textContent, /migration 20261113140000_model_route_steps\.sql/);
});

test("A7: Kiểm tra khóa calls the probe function with ai.manage and shows Vietnamese results", async () => {
  const h = harness({ request: async (url) => url.endsWith("admin-ai-provider-probe") ? { ok: true, status: 200, json: async () => ({ status: "checked", recorded: true, results: [
    { provider: "openrouter", result: "ok", httpStatus: 200, configured: true }, { provider: "anthropic", result: "no_credit", httpStatus: 402, configured: true },
    { provider: "gemini", result: "bad_key", httpStatus: 401 }, { provider: "openai", result: "not_configured" }, { provider: "deepseek", result: "unreachable" }] }) } : undefined });
  await drain(h.dom);
  click(h, "#model-providers-probe");
  await drain(h.dom);
  const probe = h.requests.find((item) => item.url.endsWith("admin-ai-provider-probe"));
  assert.equal(probe.method, "POST"); assert.equal(probe.capability, "ai.manage");
  const text = h.c.querySelector(".probe-results").textContent;
  for (const label of ["OpenRouter: Ổn", "Anthropic: Hết tiền", "Sai khóa", "Chưa cấu hình", "Không gọi được"]) assert.match(text, new RegExp(label));
  assert.ok(h.rpcs.filter((call) => call[0] === "list_ai_providers").length >= 2, "provider list reloaded after the check");
});

test("A7: changing a provider needs a reason and sends set_ai_provider with ai.manage; DeepSeek stays public", async () => {
  const h = harness({ rpc: async (name, params) => name === "set_ai_provider" ? { provider: params.provider_input, priority: params.payload.priority, enabled: params.payload.enabled, allowedDataClass: params.payload.allowedDataClass, secretName: "ANTHROPIC_API_KEY", phase: 2 } : undefined });
  await drain(h.dom);
  click(h, '[data-provider-edit="deepseek"]');
  assert.deepEqual([...h.c.querySelectorAll("#provider-class-deepseek option")].map((option) => option.value), ["public"]);
  click(h, "[data-provider-cancel]");
  click(h, '[data-provider-edit="anthropic"]');
  const form = () => h.c.querySelector('[data-provider-form="anthropic"]');
  form().querySelector('[data-provider-field="enabled"]').checked = true;
  form().dispatchEvent(new h.w.Event("submit", { bubbles: true, cancelable: true }));
  await drain(h.dom);
  assert.equal(h.rpcs.some((call) => call[0] === "set_ai_provider"), false, "no call without a reason");
  assert.match(h.c.textContent, /Ghi lý do từ 10 tới 300 ký tự/);
  form().querySelector('[data-provider-field="enabled"]').checked = true;
  form().querySelector('[data-provider-field="note"]').value = "Owner đã đặt khóa Anthropic trên staging";
  form().querySelector('[data-provider-field="allowedDataClass"]').value = "sensitive";
  form().dispatchEvent(new h.w.Event("submit", { bubbles: true, cancelable: true }));
  await drain(h.dom);
  const call = h.rpcs.find((item) => item[0] === "set_ai_provider");
  assert.equal(call[2], "ai.manage");
  assert.deepEqual(JSON.parse(JSON.stringify(call[1])), { provider_input: "anthropic", payload: { enabled: true, priority: 2, allowedDataClass: "sensitive", note: "Owner đã đặt khóa Anthropic trên staging" } });
  assert.match(h.c.textContent, /Đã lưu Anthropic/);
});

test("A7: wiring: route, navigation, script order, request allowlist and the 2-model editor guard", () => {
  const manifest = JSON.parse(read("apps/admin/admin-capabilities.json"));
  assert.ok(manifest.workspaces.find((item) => item.id === "ai-studio").routes.some((route) => route.id === "providers"));
  const shell = read("apps/admin/shell.js");
  assert.match(shell, /id: "providers", label: "Nhà cung cấp & Model", routes: \[\["ai-studio", "providers"\], \["ai-studio", "model-router"\]\]/);
  const html = read("apps/admin/ai-studio.html");
  assert.ok(html.indexOf("model-providers.js") > 0 && html.indexOf("model-providers.js") < html.indexOf("./app.js"));
  const guard = read("apps/admin/workspace-guard.js");
  assert.match(guard, /"\/functions\/v1\/admin-ai-provider-probe": \{ POST: "ai\.manage" \}/);
  assert.match(guard, /list_ai_providers: "ai\.read"/); assert.match(guard, /set_ai_provider: "ai\.manage"/);
  assert.doesNotMatch(guard, /record_ai_provider_probe/, "the service-role RPC is never callable from Admin");
  const app = read("apps/admin/app.js");
  assert.match(app, /function activeModelRouteChain/);
  assert.match(app, /!activeModelRouteChain\(current\)/, "the 2-model editor cannot overwrite a step chain");
  assert.doesNotMatch(app, /Model publication unavailable|Publishing model route config|Backend connected|None · no fallback/);
});
