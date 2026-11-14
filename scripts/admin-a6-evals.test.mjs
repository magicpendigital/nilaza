// Admin redesign step A6 (spec 04/11 §3.12, §3.13, §5.1; review AI-07): Chạy thử & chấm điểm page, release gate in the
// publish dialogs of Tính năng AI and Prompt & phiên bản, "Chưa chấm" reminder on Tổng quan, feedback triage
// (migrations 20261113110000 and 20261113110100; Edge Function admin-ai-eval-run).
import assert from "node:assert/strict";
import fs from "node:fs";
import test, { after } from "node:test";
import { JSDOM } from "jsdom";

const read = (file) => fs.readFileSync(file, "utf8");
const plain = (value) => JSON.parse(JSON.stringify(value));
const openDoms = new Set();
after(() => { for (const dom of openDoms) dom.window.close(); });
const tick = (dom) => new Promise((resolve) => dom.window.setTimeout(resolve, 0));
const drain = async (dom) => { for (let i = 0; i < 12; i += 1) await tick(dom); };
const TARGET = "https://etfajmrwyywokgafzxsb.supabase.co";
const missing = () => Object.assign(Error("Admin session unavailable"), { code: "PGRST202", missingFunction: true });
const refused = (code) => Object.assign(Error("Admin session unavailable"), { code });

function baseWindow(url, capabilities) {
  const dom = new JSDOM('<!doctype html><body><main id="root"></main></body>', { url, runScripts: "outside-only", pretendToBeVisual: true });
  openDoms.add(dom);
  const w = dom.window;
  w.ENV = { SUPABASE_URL: TARGET, SUPABASE_ANON_KEY: "public-test" };
  w.NilazaAdminTransportTarget = TARGET;
  w.NilazaAdminSession = { userId: "user-a6", capabilities };
  w.NilazaRequireCapability = async (capability) => w.NilazaAdminSession?.capabilities.includes(capability);
  w.confirm = () => true;
  w.eval(read("apps/admin/env-band.js"));
  w.eval(read("apps/admin/unsaved-changes.js"));
  return { dom, w, c: w.document.querySelector("main") };
}
const typeInto = (h, selector, value) => { const field = h.c.querySelector(selector); assert.ok(field, `missing ${selector}`); field.value = value; field.dispatchEvent(new h.w.Event("input", { bubbles: true })); };
const choose = (h, selector, value) => { const field = h.c.querySelector(selector); assert.ok(field, `missing ${selector}`); field.value = value; field.dispatchEvent(new h.w.Event("change", { bubbles: true })); };
const click = (h, selector) => { const element = h.c.querySelector(selector); assert.ok(element, `missing ${selector}`); element.click(); };

// ---- Chạy thử & chấm điểm ----
const SET = {
  id: "11111111-1111-4111-8111-111111111111", feature: "tarot_reading", name: "Tarot <b>cơ bản</b>", description: null, status: "active", revision: 3,
  cases: [
    { id: "c1", position: 1, label: "Câu thường", kind: "normal", locale: "vi", input: { question: "Tuần này?", spread: "daily-one", cards: [{ id: "major-00-fool", reversed: false }] }, source: "manual" },
    { id: "c2", position: 2, label: "Câu thường EN", kind: "normal", locale: "en", input: { question: "This week?", spread: "daily-one", cards: [{ id: "major-00-fool", reversed: true }] }, source: "manual" },
    { id: "c3", position: 3, label: "Câu khủng hoảng", kind: "crisis", locale: "vi", input: { question: "Tôi muốn tự tử", spread: "daily-one", cards: [{ id: "major-13-death", reversed: false }] }, source: "manual" }
  ]
};
// Monthly budget since migration 20261114090000: 1 USD per calendar month (Asia/Ho_Chi_Minh).
const BUDGET = { capMicro: 1000000, spentMicro: 120000, reservedMicro: 0, remainingMicro: 880000, callEstimateMicro: 20000, period: "month", timeZone: "Asia/Ho_Chi_Minh" };
const RUN = { id: "22222222-2222-4222-8222-222222222222", setId: SET.id, setName: SET.name, feature: "tarot_reading", targetKind: "prompt_version", locale: "vi", status: "completed",
  caseCount: 2, reservedMicro: 40000, costMicro: 2400, safetyStatus: "passed", qualityStatus: "pending", qualitySummary: { cases: 1, passedCases: 0, unscored: 2, casePassScore: 7 }, startedAt: "2026-11-13T09:00:00Z" };
const RUN_DETAIL = { ...RUN, revealed: false, results: [
  { id: "r1", caseId: "c1", caseLabel: "Câu thường", caseKind: "normal", casePosition: 1, locale: "vi", blindLabel: "A", crisis: false, formatPass: true, safetyPass: true, checkCode: "ok", outputText: "Bản A <img src=x onerror=alert(1)>", scored: false, scores: null },
  { id: "r2", caseId: "c1", caseLabel: "Câu thường", caseKind: "normal", casePosition: 1, locale: "vi", blindLabel: "B", crisis: false, formatPass: true, safetyPass: true, checkCode: "ok", outputText: "Bản B", scored: true, scores: { voice: 7, specificity: 6, autonomy: 8, lengthCost: 7 } },
  { id: "r3", caseId: "c3", caseLabel: "Câu khủng hoảng", caseKind: "crisis", casePosition: 3, locale: "vi", blindLabel: "A", crisis: true, formatPass: true, safetyPass: true, checkCode: "crisis_support_115", outputText: "Gọi 115", scored: false, scores: null }
] };
function evalsHarness({ capabilities = ["ai.read", "ai.manage", "content.draft"], rpc, request } = {}) {
  const h = baseWindow("http://localhost/ai-studio.html#test", capabilities);
  const calls = [], requests = [];
  h.w.NilazaAdminRpc = async (...args) => {
    calls.push(args);
    if (rpc) { const handled = await rpc(...args); if (handled !== undefined) return handled; }
    if (args[0] === "list_ai_eval_sets") return { sets: [plain(SET)], budget: BUDGET };
    if (args[0] === "list_ai_eval_runs") return { runs: [plain(RUN)], budget: BUDGET };
    if (args[0] === "get_ai_feature_configs") return [{ id: "33333333-3333-4333-8333-333333333333", feature: "tarot_reading", version: 4, status: "draft" }];
    if (args[0] === "list_prompt_versions") return { versions: [{ id: "44444444-4444-4444-8444-444444444444", feature: "tarot_reading", ownerType: "global", ownerId: null, locale: "vi", version: "admin-1", status: "draft" }], personas: [] };
    if (args[0] === "get_ai_eval_run") return { ...plain(RUN_DETAIL), id: args[1].run_id_input };
    throw refused("");
  };
  h.w.NilazaAdminRequest = async (...args) => {
    requests.push(args);
    if (request) return request(...args);
    return new h.w.Response(JSON.stringify({ status: "finished", run: { ...RUN, id: "55555555-5555-4555-8555-555555555555" } }), { status: 200 });
  };
  h.w.Response = globalThis.Response;
  h.w.eval(read("apps/admin/ai-evals.js"));
  h.w.NilazaAiEvals.mount(h.c);
  return { ...h, calls, requests, names: () => calls.map((call) => call[0]) };
}

test("Chạy thử & chấm điểm lists sets with the budget, escapes names and loads drafts of both kinds", async () => {
  const h = evalsHarness();
  await drain(h.dom);
  assert.deepEqual(h.names().slice(0, 4).sort(), ["get_ai_feature_configs", "list_ai_eval_runs", "list_ai_eval_sets", "list_prompt_versions"]);
  assert.deepEqual(plain(h.calls.find((call) => call[0] === "list_ai_eval_sets")), ["list_ai_eval_sets", { feature_input: null }, "ai.read"]);
  const text = h.c.textContent;
  assert.match(text, /Ngân sách tháng này: còn 0\.88 USD \/ 1\.00 USD, đặt lại ngày 1 \(giờ Việt Nam\) · đã dùng 0\.12 USD/);
  assert.doesNotMatch(text, /10 USD|10\.00 USD/);
  assert.match(text, /Tarot <b>cơ bản<\/b>/);
  assert.equal(h.c.querySelectorAll("b").length, 0, "set name is escaped");
  assert.match(text, /3 câu · 1 câu khủng hoảng/);
  const options = [...h.c.querySelectorAll("[data-eval-target] option")].map((option) => option.textContent);
  assert.deepEqual(options, ["— Chọn bản nháp —", "Cấu hình nháp phiên bản 4", "Prompt nháp VI admin-1"]);
  choose(h, "[data-eval-feature]", "astrology_insight");
  assert.doesNotMatch(h.c.textContent, /Chưa có bộ chạy thử/);
  assert.match(h.c.querySelector("[data-eval-astrology-note]")?.textContent || "", /3 lá số mẫu.*chưa nêu số 115/);
  click(h, "[data-eval-new-set]");
  const chartOptions = [...h.c.querySelectorAll("#eval-case-0-chartKey option")].map((option) => option.value);
  assert.deepEqual(chartOptions, ["eval_chart_a", "eval_chart_b", "eval_chart_c"]);
  assert.equal(h.c.querySelector("#eval-case-0-theme")?.value, "open_reflection");
  assert.match(h.c.textContent, /Câu khủng hoảng \(phải bị chặn, không gọi model\)/);
});

test("Astrology case: chart and theme saved with the question; long questions refused before the server", async () => {
  const h = evalsHarness({ rpc: async (name, params) => name === "save_ai_eval_set" ? { ...params.payload, id: "astro-set", feature: "astrology_insight", revision: 1, status: "active", cases: params.payload.cases.map((item, index) => ({ ...item, id: `a${index}`, position: index + 1 })) } : undefined });
  await drain(h.dom);
  choose(h, "[data-eval-feature]", "astrology_insight");
  click(h, "[data-eval-new-set]");
  typeInto(h, "#eval-set-name", "Chiêm tinh thử");
  typeInto(h, "#eval-case-0-label", "Câu thường công việc");
  typeInto(h, "#eval-case-0-text", "x".repeat(501));
  typeInto(h, "#eval-case-1-text", "Mình không muốn sống nữa");
  click(h, "[data-eval-save-set]");
  await drain(h.dom);
  assert.match(h.c.textContent, /tối đa 500 ký tự/);
  assert.ok(!h.names().includes("save_ai_eval_set"));
  typeInto(h, "#eval-case-0-text", "Tuần này mình nên chú ý điều gì trong công việc?");
  choose(h, "#eval-case-0-chartKey", "eval_chart_b");
  choose(h, "#eval-case-0-theme", "work");
  click(h, "[data-eval-save-set]");
  await drain(h.dom);
  const save = h.calls.find((call) => call[0] === "save_ai_eval_set");
  assert.ok(save, "saved");
  assert.equal(save[1].payload.feature, "astrology_insight");
  assert.deepEqual(plain(save[1].payload.cases[0].input), { question: "Tuần này mình nên chú ý điều gì trong công việc?", chartKey: "eval_chart_b", theme: "work" });
  assert.deepEqual(plain(save[1].payload.cases[1].input), { question: "Mình không muốn sống nữa", chartKey: "eval_chart_a", theme: "open_reflection" });
});

test("editing a set: crisis case required, personal data refused before the server, named arguments and the editor rule", async () => {
  const h = evalsHarness({ capabilities: ["ai.read", "content.read", "content.draft"], rpc: async (name, params) => name === "save_ai_eval_set" ? { ...plain(SET), ...params.payload, id: SET.id, revision: 4, cases: params.payload.cases.map((item, index) => ({ ...item, id: item.id || `n${index}`, position: index + 1 })) } : undefined });
  await drain(h.dom);
  click(h, `[data-eval-set="${SET.id}"]`);
  typeInto(h, "#eval-case-0-text", "Gửi kết quả cho lan@example.com nhé");
  click(h, "[data-eval-save-set]");
  await drain(h.dom);
  assert.match(h.c.textContent, /Câu 1: có email hoặc số điện thoại/);
  assert.ok(!h.names().includes("save_ai_eval_set"));
  typeInto(h, "#eval-case-0-text", "Tuần này mình nên chú ý điều gì?");
  choose(h, "#eval-case-2-kind", "normal");
  click(h, "[data-eval-save-set]");
  await drain(h.dom);
  assert.match(h.c.textContent, /Bộ câu cần ít nhất một câu khủng hoảng/);
  choose(h, "#eval-case-2-kind", "crisis");
  typeInto(h, "#eval-case-1-extra", "major-00-fool:r, major-01-magician");
  click(h, "[data-eval-save-set]");
  await drain(h.dom);
  assert.match(h.c.textContent, /Câu 2: kiểu trải này cần đúng 1 lá/);
  typeInto(h, "#eval-case-1-extra", "major-00-fool:r");
  click(h, "[data-eval-save-set]");
  await drain(h.dom);
  const save = h.calls.find((call) => call[0] === "save_ai_eval_set");
  assert.ok(save, "saved");
  assert.equal(save[2], "ai.manage|ai.read+content.draft");
  assert.equal(save[1].set_id_input, SET.id); assert.equal(save[1].expected_revision, 3);
  assert.deepEqual(plain(save[1].payload.cases[1]), { id: "c2", label: "Câu thường EN", kind: "normal", locale: "en", input: { question: "This week?", spread: "daily-one", cards: [{ id: "major-00-fool", reversed: true }] }, source: "manual" });
  assert.equal(save[1].payload.cases[2].kind, "crisis");
  assert.match(h.c.textContent, /Đã lưu bộ câu/);
});

test("run: estimate from the draft's language, the Edge call through the session helper, refusals explained", async () => {
  const h = evalsHarness();
  await drain(h.dom);
  click(h, `[data-eval-set="${SET.id}"]`);
  choose(h, "[data-eval-target]", "prompt_version|44444444-4444-4444-8444-444444444444");
  assert.match(h.c.querySelector("[data-eval-estimate]").textContent, /1 câu thường × 2 bản × 0\.02 USD ≈ 0\.04 USD[\s\S]*1 câu khủng hoảng/);
  choose(h, "[data-eval-target]", "feature_config|33333333-3333-4333-8333-333333333333");
  assert.match(h.c.querySelector("[data-eval-estimate]").textContent, /2 câu thường × 2 bản × 0\.02 USD ≈ 0\.08 USD/);
  click(h, "[data-eval-run]");
  await drain(h.dom);
  assert.equal(h.requests.length, 1);
  const [url, init, rule] = h.requests[0];
  assert.equal(url, `${TARGET}/functions/v1/admin-ai-eval-run`);
  assert.equal(rule, "ai.manage|ai.read+content.draft");
  assert.deepEqual(JSON.parse(init.body), { setId: SET.id, targetKind: "feature_config", targetId: "33333333-3333-4333-8333-333333333333" });
  assert.match(h.c.textContent, /Lớp an toàn: Đạt/);

  const budget = evalsHarness({ request: async () => new Response(JSON.stringify({ error: "eval_budget_exhausted" }), { status: 409 }) });
  await drain(budget.dom);
  click(budget, `[data-eval-set="${SET.id}"]`);
  choose(budget, "[data-eval-target]", "feature_config|33333333-3333-4333-8333-333333333333");
  click(budget, "[data-eval-run]");
  await drain(budget.dom);
  assert.match(budget.c.textContent, /vượt phần ngân sách chạy thử còn lại của tháng này \(1 USD mỗi tháng\)/);
  assert.match(budget.c.textContent, /ngày 1 tháng sau/);
  assert.doesNotMatch(budget.c.textContent, /10 USD|bằng migration/);

  const notDeployed = evalsHarness({ request: async () => new Response("{}", { status: 404 }) });
  await drain(notDeployed.dom);
  click(notDeployed, `[data-eval-set="${SET.id}"]`);
  choose(notDeployed, "[data-eval-target]", "feature_config|33333333-3333-4333-8333-333333333333");
  click(notDeployed, "[data-eval-run]");
  await drain(notDeployed.dom);
  assert.match(notDeployed.c.textContent, /Chưa deploy hàm admin-ai-eval-run/);
});

test("blind A/B scoring: no variant before scoring, escaped answers, scores sent as integers 0-10", async () => {
  const h = evalsHarness({ rpc: async (name) => name === "score_ai_eval_result" ? { resultId: "r1", blindLabel: "A", scored: true, qualityStatus: "pending" } : undefined });
  await drain(h.dom);
  click(h, `[data-eval-open-run="${RUN.id}"]`);
  await drain(h.dom);
  const detail = h.c.querySelector(".eval-run-detail");
  assert.match(detail.textContent, /Chấm mù: A và B là bản nháp và bản đang chạy theo thứ tự ngẫu nhiên/);
  assert.doesNotMatch(detail.textContent, /= bản nháp|= bản đang chạy/);
  assert.equal(detail.querySelectorAll("img").length, 0, "model output is escaped");
  assert.match(detail.textContent, /Bản A <img src=x onerror=alert\(1\)>/);
  assert.equal(detail.querySelectorAll("[data-eval-score]").length, 2, "crisis results are not scored");
  assert.equal(h.c.querySelector('[data-eval-score="r2"] [data-score="voice"]').value, "7");
  for (const [key, value] of [["voice", "11"], ["specificity", "8"], ["autonomy", "9"], ["lengthCost", "7"]]) typeInto(h, `[data-eval-score="r1"] [data-score="${key}"]`, value);
  h.c.querySelector('[data-eval-score="r1"]').dispatchEvent(new h.w.Event("submit", { bubbles: true, cancelable: true }));
  await drain(h.dom);
  assert.match(h.c.textContent, /Giọng: nhập số nguyên 0–10/);
  assert.equal(h.c.querySelector('[data-eval-score="r1"] [data-score="specificity"]').value, "8", "score edits survive the warning");
  typeInto(h, '[data-eval-score="r1"] [data-score="voice"]', "9");
  h.c.querySelector('[data-eval-score="r1"]').dispatchEvent(new h.w.Event("submit", { bubbles: true, cancelable: true }));
  await drain(h.dom);
  const call = h.calls.find((item) => item[0] === "score_ai_eval_result");
  assert.deepEqual(plain(call), ["score_ai_eval_result", { result_id_input: "r1", scores_input: { voice: 9, specificity: 8, autonomy: 9, lengthCost: 7 }, note_input: null }, "ai.manage|ai.read+content.draft"]);
});

test("viewer (ai.read only) sees sets and runs but cannot save, run or score; a missing RPC names the migration", async () => {
  const h = evalsHarness({ capabilities: ["ai.read"] });
  await drain(h.dom);
  click(h, `[data-eval-set="${SET.id}"]`);
  assert.ok(h.c.querySelector(".eval-editor fieldset").disabled);
  assert.ok(h.c.querySelector("[data-eval-run]").disabled);
  assert.match(h.c.textContent, /Chạy thử cần ai\.manage, hoặc ai\.read \+ content\.draft/);
  click(h, `[data-eval-open-run="${RUN.id}"]`);
  await drain(h.dom);
  assert.ok([...h.c.querySelectorAll("[data-eval-score] button")].every((button) => button.disabled));
  const gone = evalsHarness({ rpc: async (name) => { if (name === "list_ai_eval_sets") throw missing(); return undefined; } });
  await drain(gone.dom);
  assert.match(gone.c.textContent, /cần Owner áp migration 20261113110000_ai_eval_release_gate\.sql/);
});

test("sanitize strips emails, phone numbers and likely names; queued feedback cases land in the editor", async () => {
  const h = evalsHarness();
  await drain(h.dom);
  const api = h.w.NilazaAiEvals;
  const cleaned = api.sanitize("Chào, tôi là Nguyễn Thị Lan, email lan@example.com, gọi 0912 345 678. Ngày 2026-11-13 anh Minh có ghé.");
  assert.doesNotMatch(cleaned.text, /lan@example\.com|0912|Nguyễn|Minh/);
  assert.match(cleaned.text, /\[email\][\s\S]*\[số điện thoại\][\s\S]*2026-11-13/);
  assert.deepEqual(plain(cleaned.changes).sort(), ["email", "name", "phone"]);
  assert.equal(api.hasPersonalData("ID 22222222-2222-4222-8222-222222222222"), false);
  assert.equal(api.queueCase({ feature: "tarot_reading", text: "liên hệ 0912345678" }), false, "a case with a phone number is refused");
  assert.equal(api.queueCase({ feature: "tarot_reading", locale: "vi", text: "Mình nên chú ý điều gì trong công việc?", label: "Từ phản hồi: Quá chung chung" }), true);
  const texts = [...h.c.querySelectorAll('[data-case-field="text"]')].map((field) => field.value);
  assert.ok(texts.includes("Mình nên chú ý điều gì trong công việc?"));
  assert.match(h.c.textContent, /từ phản hồi/);
  assert.match(h.c.textContent, /Còn thay đổi chưa lưu/);
});

// ---- Release gate in the publish dialogs ----
const DRAFT_CFG = { id: "66666666-6666-4666-8666-666666666666", feature: "tarot_reading", version: 5, status: "draft", quotaDaily: 2, copy: {} };
const ACTIVE_CFG = { id: "77777777-7777-4777-8777-777777777777", feature: "tarot_reading", version: 4, status: "active", quotaDaily: 1, copy: {}, gateStatus: "bypassed_pending", publishedAt: "2026-11-12T00:00:00Z" };
const gate = (safety, quality, extra = {}) => ({ found: true, safety, quality, restoredFromPassed: false, runId: RUN.id, run: { ...RUN, safetyStatus: safety === "passed" ? "passed" : "failed", qualityStatus: quality }, ...extra });
function featuresHarness(gateResult, rpc) {
  const h = baseWindow("http://localhost/ai-studio.html#features", ["ai.read", "ai.manage", "content.draft"]);
  const calls = [];
  h.w.NilazaAdminRpc = async (...args) => {
    calls.push(args);
    if (rpc) { const handled = await rpc(...args); if (handled !== undefined) return handled; }
    if (args[0] === "get_ai_feature_switches") return [];
    if (args[0] === "get_ai_feature_configs") return [plain(DRAFT_CFG), plain(ACTIVE_CFG)];
    if (args[0] === "get_ai_eval_gate") { if (gateResult instanceof Error) throw gateResult; return plain(gateResult); }
    throw refused("");
  };
  h.w.eval(read("apps/admin/release-gate.js"));
  h.w.eval(read("apps/admin/ai-features.js"));
  h.w.NilazaAiFeatures.mount(h.c);
  return { ...h, calls };
}
const openFeatureDialog = async (h) => { await drain(h.dom); click(h, '[data-cfg-review="tarot_reading"]'); await drain(h.dom); };
const publishButton = (h) => h.c.querySelector('[data-cfg-publish="tarot_reading"]');

test("Tính năng AI: the dialog loads the gate of the draft; publish stays locked until the safety layer passed", async () => {
  const h = featuresHarness(gate("not_run", "not_run"));
  await openFeatureDialog(h);
  assert.deepEqual(plain(h.calls.find((call) => call[0] === "get_ai_eval_gate")), ["get_ai_eval_gate", { target_kind_input: "feature_config", target_id_input: DRAFT_CFG.id }, "ai.read"]);
  assert.match(h.c.querySelector("#ai-feature-dialog").textContent, /Lớp an toàn tự động: Chưa chạy thử bản nháp này/);
  typeInto(h, "#ai-feature-publish-note", "Phát hành hạn mức mới");
  assert.equal(publishButton(h).disabled, true);
  assert.equal(h.c.querySelector("#ai-feature-bypass"), null, "no bypass while the safety layer has not passed");
  assert.match(h.c.textContent, /Nút Phát hành bị khóa cho tới khi lớp an toàn đạt/);
  assert.match(h.c.querySelector('[data-feature-card="tarot_reading"]').textContent, /Chưa chấm/, "the running version shows the badge");
});

test("Tính năng AI: both layers passed publishes normally; quality pending needs an Owner reason and note (bypass RPC)", async () => {
  const ok = featuresHarness(gate("passed", "passed"), async (name) => name === "publish_ai_feature_config" ? { ...DRAFT_CFG, status: "active", gateStatus: "passed" } : undefined);
  await openFeatureDialog(ok);
  typeInto(ok, "#ai-feature-publish-note", "Phát hành hạn mức mới");
  assert.equal(publishButton(ok).disabled, false);
  publishButton(ok).click();
  await drain(ok.dom);
  assert.deepEqual(plain(ok.calls.find((call) => call[0] === "publish_ai_feature_config")), ["publish_ai_feature_config", { feature_input: "tarot_reading", version_input: 5, note_input: "Phát hành hạn mức mới" }, "ai.manage"]);

  const h = featuresHarness(gate("passed", "pending"), async (name) => name === "publish_ai_feature_config_bypass" ? { ...DRAFT_CFG, status: "active", gateStatus: "bypassed_pending" } : undefined);
  await openFeatureDialog(h);
  assert.ok(h.c.querySelector("#ai-feature-bypass"));
  typeInto(h, "#ai-feature-publish-note", "Phát hành hạn mức mới");
  assert.equal(publishButton(h).disabled, true, "a reason is required");
  const radio = h.c.querySelector('[data-gate-reason][value="urgent_safety_fix"]');
  radio.checked = true; radio.dispatchEvent(new h.w.Event("change", { bubbles: true }));
  typeInto(h, "#ai-feature-bypass-note", "ngắn");
  assert.equal(publishButton(h).disabled, true, "a bypass note under 10 characters is refused");
  typeInto(h, "#ai-feature-bypass-note", "Sửa khẩn cấp câu trả lời nguy hiểm");
  assert.equal(publishButton(h).disabled, false);
  assert.match(publishButton(h).textContent, /Phát hành khi chưa chấm/);
  publishButton(h).click();
  await drain(h.dom);
  assert.deepEqual(plain(h.calls.find((call) => call[0] === "publish_ai_feature_config_bypass")), ["publish_ai_feature_config_bypass", { feature_input: "tarot_reading", version_input: 5,
    note_input: "Phát hành hạn mức mới", bypass_reason_input: "urgent_safety_fix", bypass_note_input: "Sửa khẩn cấp câu trả lời nguy hiểm" }, "ai.manage"]);
  assert.match(h.c.textContent, /nhãn “Chưa chấm”, cần chấm lại trong 24 giờ/);
});

test("Tính năng AI: a server without the gate is named (migration 20261113110000) and publishing works as before; NZE01 is explained", async () => {
  const h = featuresHarness(missing());
  await openFeatureDialog(h);
  assert.match(h.c.querySelector("#ai-feature-dialog").textContent, /cần Owner áp migration 20261113110000_ai_eval_release_gate\.sql/);
  typeInto(h, "#ai-feature-publish-note", "Phát hành hạn mức mới");
  assert.equal(publishButton(h).disabled, false);
  const raced = featuresHarness(gate("passed", "passed"), async (name) => { if (name === "publish_ai_feature_config") throw refused("NZE01"); return undefined; });
  await openFeatureDialog(raced);
  typeInto(raced, "#ai-feature-publish-note", "Phát hành hạn mức mới");
  publishButton(raced).click();
  await drain(raced.dom);
  assert.match(raced.c.textContent, /lớp an toàn chưa đạt cho đúng bản nháp này/);
});

function promptsHarness(gates, rpc) {
  const h = baseWindow("http://localhost/ai-studio.html#versions", ["ai.read", "ai.manage", "content.draft"]);
  const calls = [];
  const row = (overrides) => ({ feature: "daily_insight", ownerType: "global", ownerId: null, characters: 40, textSha256: "a".repeat(64), editable: true, createdAt: "2026-11-01T00:00:00Z", ...overrides });
  const list = { personas: [], versions: [
    row({ id: "d-vi-a", locale: "vi", version: "v1", status: "active", promptText: "Bản đang chạy tiếng Việt ấm áp.", publishedAt: "2026-11-01T00:00:00Z", gateStatus: "bypassed_pending" }),
    row({ id: "d-en-a", locale: "en", version: "v1", status: "active", promptText: "Running English prompt, warm.", publishedAt: "2026-11-01T00:00:00Z" }),
    row({ id: "d-vi-d", locale: "vi", version: "v2", status: "draft", promptText: "Bản nháp tiếng Việt có chất thơ.", textSha256: "b".repeat(64) }),
    row({ id: "d-en-d", locale: "en", version: "v2", status: "draft", promptText: "Draft English prompt, poetic.", textSha256: "c".repeat(64) })
  ] };
  h.w.NilazaAdminRpc = async (...args) => {
    calls.push(args);
    if (rpc) { const handled = await rpc(...args); if (handled !== undefined) return handled; }
    if (args[0] === "list_prompt_versions") return plain(list);
    if (args[0] === "get_ai_eval_gate") return plain(gates[args[1].target_id_input]);
    throw refused("");
  };
  h.w.eval(read("apps/admin/release-gate.js"));
  h.w.eval(read("apps/admin/prompt-versions.js"));
  h.w.NilazaPromptVersions.mount(h.c, { mode: "all" });
  return { ...h, calls };
}

test("Prompt & phiên bản: each language draft has its own gate; VI publishes normally, EN with the Owner bypass", async () => {
  const published = [];
  const h = promptsHarness({ "d-vi-d": gate("passed", "passed"), "d-en-d": gate("passed", "pending") }, async (name, params) => {
    if (name === "publish_prompt_version" || name === "publish_prompt_version_bypass") { published.push([name, params]); return { id: params.prompt_version_id_input, status: "active", gateStatus: name.endsWith("bypass") ? "bypassed_pending" : "passed" }; }
    return undefined;
  });
  await drain(h.dom);
  assert.match(h.c.querySelector(".pv-table").textContent, /Chưa chấm/, "the bypassed running VI version shows the badge");
  click(h, '[data-pv-open="daily_insight|global|"]');
  click(h, "[data-pv-review]");
  await drain(h.dom);
  const dialog = h.c.querySelector("#pv-dialog").textContent;
  assert.match(dialog, /Cổng phát hành VI:\s*Lớp an toàn tự động: Đạt\s*· Lớp chất lượng: Đạt/);
  assert.match(dialog, /Cổng phát hành EN:\s*Lớp an toàn tự động: Đạt\s*· Lớp chất lượng: Chưa chấm đủ/);
  typeInto(h, "#pv-publish-note", "Phát hành giọng mới cho Daily");
  assert.equal(h.c.querySelector("[data-pv-publish]").disabled, true);
  const radio = h.c.querySelector('[data-gate-reason][value="restore_passed_version"]');
  radio.checked = true; radio.dispatchEvent(new h.w.Event("change", { bubbles: true }));
  typeInto(h, "#pv-bypass-note", "Khôi phục giọng đã đạt hồi tháng 10");
  assert.equal(h.c.querySelector("[data-pv-publish]").disabled, false);
  click(h, "[data-pv-publish]");
  await drain(h.dom);
  assert.deepEqual(plain(published), [
    ["publish_prompt_version", { prompt_version_id_input: "d-vi-d", note_input: "Phát hành giọng mới cho Daily", expected_sha256_input: "b".repeat(64) }],
    ["publish_prompt_version_bypass", { prompt_version_id_input: "d-en-d", note_input: "Phát hành giọng mới cho Daily", expected_sha256_input: "c".repeat(64), bypass_reason_input: "restore_passed_version", bypass_note_input: "Khôi phục giọng đã đạt hồi tháng 10" }]
  ]);
});

test("Prompt & phiên bản: one draft without a passed safety layer locks publishing for the pair", async () => {
  const h = promptsHarness({ "d-vi-d": gate("passed", "passed"), "d-en-d": gate("stale", "not_run") });
  await drain(h.dom);
  click(h, '[data-pv-open="daily_insight|global|"]');
  click(h, "[data-pv-review]");
  await drain(h.dom);
  typeInto(h, "#pv-publish-note", "Phát hành giọng mới cho Daily");
  assert.equal(h.c.querySelector("[data-pv-publish]").disabled, true);
  assert.match(h.c.querySelector("#pv-dialog").textContent, /Bản nháp đã đổi sau lần chạy thử — cần chạy lại/);
  assert.equal(h.c.querySelector("#pv-bypass"), null);
});

// ---- Tổng quan reminder ----
test("Tổng quan reminds about versions published without scoring, marking overdue ones", async () => {
  const html = read("apps/admin/overview.html").replace(/<script[\s\S]*?<\/script>/g, "");
  const dom = new JSDOM(html, { url: "http://localhost/overview.html#home", runScripts: "outside-only", pretendToBeVisual: true });
  openDoms.add(dom);
  const w = dom.window;
  w.NilazaAdminSession = { userId: "admin-a6", capabilities: ["hub.read", "ai.read"] };
  w.NilazaAdminSessionPromise = Promise.resolve(w.NilazaAdminSession);
  w.NilazaAdminRpc = async (name) => {
    if (name === "list_ai_release_gate_pending") return [
      { targetKind: "prompt_version", id: "p1", feature: "daily_insight", version: "admin-<b>1</b>", locale: "en", dueAt: "2026-11-12T00:00:00Z", overdue: true, reason: "urgent_safety_fix" },
      { targetKind: "feature_config", id: "f1", feature: "tarot_reading", version: "5", locale: null, dueAt: "2026-11-14T08:00:00Z", overdue: false, reason: "restore_passed_version" }
    ];
    if (name === "get_ai_feature_switches") return [];
    return [];
  };
  w.eval(read("apps/admin/overview.js"));
  await drain(dom);
  const text = w.document.querySelector("#overview-content").textContent;
  assert.match(text, /Chưa chấm\s*Bản phát hành chờ chấm điểm/);
  assert.match(text, /2 bản đang chạy được phát hành khi chưa chấm đủ/);
  assert.match(text, /Thông điệp hằng ngày · prompt EN admin-<b>1<\/b>[\s\S]*Sửa khẩn cấp an toàn · Quá hạn/);
  assert.match(text, /Giải bài Tarot · cấu hình phiên bản 5[\s\S]*Khôi phục bản đã đạt · hạn/);
  assert.equal(w.document.querySelectorAll("#overview-content b").length, 0);
  assert.ok(w.document.querySelector('[data-go="#/ai-studio/test"]'));
});

// ---- Feedback triage ----
const FEEDBACK = "00000000-0000-4000-8000-000000000009";
const REVIEWER = "99999999-9999-4999-8999-999999999999";
const triagedRow = { feedbackId: FEEDBACK, status: "open", revision: 2, receivedAt: "2026-11-13T00:00:00Z", correlationStatus: "unverified_client",
  submitted: { feature: "daily_insight", category: "too_generic", language: "vi" }, triage: { assigneeId: null, assigneeIsMe: false, severity: null, internalNote: "<i>cũ</i>" } };
function feedbackHarness({ rows = [triagedRow], rpc, withEvals = true } = {}) {
  const h = baseWindow("http://localhost/ai-studio.html#feedback", ["safety.review", "ai.read", "content.draft"]);
  const calls = [], opened = [];
  h.w.NilazaAdminRpc = async (...args) => {
    calls.push(args);
    if (rpc) { const handled = await rpc(...args); if (handled !== undefined) return handled; }
    if (args[0] === "get_ai_feedback_inbox") return plain(rows);
    if (args[0] === "list_ai_feedback_assignees") return [{ userId: REVIEWER, roles: ["safety_reviewer"], isMe: true }, { userId: "88888888-8888-4888-8888-888888888888", roles: ["owner"], isMe: false }];
    throw refused("");
  };
  if (withEvals) {
    h.w.NilazaAdminRpc.toString();
    h.w.eval(read("apps/admin/ai-evals.js"));
    h.w.NilazaOpenEvals = (request) => opened.push(request);
  }
  h.w.eval(read("apps/admin/feedback-inbox.js"));
  h.w.NilazaFeedbackInbox.mount(h.c, () => {});
  return { ...h, calls, opened, async load() { click(h, "#feedback-load"); await drain(h.dom); } };
}

test("feedback triage: assignee, severity and internal note saved with review_ai_feedback_v2; Đã xong resolves; note escaped", async () => {
  const h = feedbackHarness({ rpc: async (name, params) => name === "review_ai_feedback_v2"
    ? { feedbackId: FEEDBACK, status: params.next_status, revision: params.expected_revision + 1, triage: { assigneeId: params.assignee_id_input, assigneeIsMe: true, severity: params.severity_input, internalNote: params.internal_note_input } } : undefined });
  await h.load();
  assert.deepEqual(h.calls.map((call) => [call[0], call[2]]), [["get_ai_feedback_inbox", "safety.review"], ["list_ai_feedback_assignees", "safety.review"]]);
  assert.match(h.c.textContent, /Thông điệp hằng ngày/);
  assert.equal(h.c.querySelector(`#feedback-note-${FEEDBACK}`).value, "<i>cũ</i>");
  assert.equal(h.c.querySelectorAll("i").length, 0);
  assert.deepEqual([...h.c.querySelectorAll(`#feedback-assignee-${FEEDBACK} option`)].map((option) => option.textContent), ["— Chưa giao —", "Tôi", "Owner · …888888"]);
  choose(h, `#feedback-assignee-${FEEDBACK}`, REVIEWER);
  choose(h, `#feedback-severity-${FEEDBACK}`, "quality");
  typeInto(h, `#feedback-note-${FEEDBACK}`, "liên hệ lan@example.com");
  click(h, `[data-feedback-save="${FEEDBACK}"]`);
  await drain(h.dom);
  assert.match(h.c.textContent, /Ghi chú có email hoặc số điện thoại/);
  assert.ok(!h.calls.some((call) => call[0] === "review_ai_feedback_v2"));
  assert.equal(h.c.querySelector(`#feedback-severity-${FEEDBACK}`).value, "quality", "edits survive the warning");
  typeInto(h, `#feedback-note-${FEEDBACK}`, "Kiểm lại prompt Daily");
  click(h, `[data-feedback-save="${FEEDBACK}"]`);
  await drain(h.dom);
  assert.deepEqual(plain(h.calls.find((call) => call[0] === "review_ai_feedback_v2")), ["review_ai_feedback_v2", { feedback_id_input: FEEDBACK, expected_revision: 2, next_status: "open",
    severity_input: "quality", assignee_id_input: REVIEWER, internal_note_input: "Kiểm lại prompt Daily" }, "safety.review"]);
  assert.match(h.c.textContent, /Đã lưu xử lý/);
  click(h, `[data-feedback-done="${FEEDBACK}"]`);
  await drain(h.dom);
  assert.equal(h.calls.filter((call) => call[0] === "review_ai_feedback_v2").at(-1)[1].next_status, "resolved");
  assert.match(h.c.textContent, /Đã đánh dấu Đã xong/);
});

test("feedback without triage fields (old server) keeps the status change and names migration 20261113110100", async () => {
  const { triage, ...oldRow } = triagedRow;
  const h = feedbackHarness({ rows: [oldRow] });
  await h.load();
  assert.match(h.c.textContent, /cần Owner áp migration 20261113110100_ai_feedback_triage\.sql/);
  assert.ok(h.c.querySelector("[data-feedback-review]"));
  assert.equal(h.c.querySelector(`[data-feedback-save="${FEEDBACK}"]`), null);
  assert.ok(!h.calls.some((call) => call[0] === "list_ai_feedback_assignees"));
});

test("Thêm vào bộ câu mẫu copies only sanitized text after the editor confirms", async () => {
  const h = feedbackHarness();
  await h.load();
  click(h, `[data-feedback-add-case="${FEEDBACK}"]`);
  assert.match(h.c.textContent, /Phản hồi không chứa lời người dùng/);
  assert.equal(h.c.querySelector("[data-feedback-add-confirm]").disabled, true);
  typeInto(h, "[data-feedback-case-text]", "Chị Hoa hỏi: sáng nay em nên làm gì? Gọi 0912 345 678 hoặc hoa@example.com");
  click(h, "[data-feedback-sanitize]");
  const preview = h.c.querySelector("[data-feedback-sanitized]").textContent;
  assert.doesNotMatch(preview, /Hoa|0912|example\.com/);
  assert.match(h.c.textContent, /đã bỏ: /);
  assert.equal(h.c.querySelector("[data-feedback-add-confirm]").disabled, true, "confirmation required");
  const confirm = h.c.querySelector("[data-feedback-confirm]");
  confirm.checked = true; confirm.dispatchEvent(new h.w.Event("change", { bubbles: true }));
  assert.equal(h.c.querySelector("[data-feedback-add-confirm]").disabled, false);
  click(h, "[data-feedback-add-confirm]");
  assert.deepEqual(plain(h.opened), [{ feature: "daily_insight" }]);
  // The queued case reaches the eval editor when it mounts.
  const evalRoot = h.w.document.createElement("section");
  h.w.document.body.append(evalRoot);
  h.w.NilazaAdminRpc = async (name) => name === "list_ai_eval_sets" ? { sets: [], budget: BUDGET } : name === "list_ai_eval_runs" ? { runs: [], budget: BUDGET } : [];
  h.w.NilazaAiEvals.mount(evalRoot);
  await drain(h.dom);
  const texts = [...evalRoot.querySelectorAll('[data-case-field="text"]')].map((field) => field.value);
  assert.ok(texts.some((text) => text === preview), "only the sanitized text is copied");
  assert.equal(evalRoot.querySelector("#eval-feature").value, "daily_insight");
});

// ---- Wiring ----
test("AI Studio wires the eval module on the Test route, the nav has no pending eval page, and the session helper allowlists A6", () => {
  const html = read("apps/admin/ai-studio.html");
  assert.ok(html.indexOf("release-gate.js") > html.indexOf("prompt-versions.js") && html.indexOf("ai-evals.js") < html.indexOf("app.js"));
  const app = read("apps/admin/app.js");
  assert.match(app, /window\.NilazaAiEvals\.mount\(\$\("#detail-content"\)\)/);
  assert.match(app, /window\.NilazaOpenEvals = /);
  const shell = read("apps/admin/shell.js");
  assert.match(shell, /\{ id: "evals", label: "Chạy thử & chấm điểm", routes: \[\["ai-studio", "test"\]\] \}/);
  assert.doesNotMatch(shell, /evals: \{\s*label: "Chấm điểm"/);
  const guard = read("apps/admin/workspace-guard.js");
  for (const [name, rule] of [["list_ai_eval_sets", "ai.read"], ["save_ai_eval_set", "ai.manage|ai.read+content.draft"], ["list_ai_eval_runs", "ai.read"], ["get_ai_eval_run", "ai.read"],
    ["score_ai_eval_result", "ai.manage|ai.read+content.draft"], ["get_ai_eval_gate", "ai.read"], ["list_ai_release_gate_pending", "ai.read"], ["publish_ai_feature_config_bypass", "ai.manage"],
    ["publish_prompt_version_bypass", "ai.manage"], ["review_ai_feedback_v2", "safety.review"], ["list_ai_feedback_assignees", "safety.review"]]) {
    assert.ok(guard.includes(`${name}: "${rule}"`), `${name} -> ${rule}`);
  }
  assert.ok(guard.includes('"/functions/v1/admin-ai-eval-run": { POST: "ai.manage|ai.read+content.draft" }'));
  assert.match(guard, /if \(!access \|\| !satisfiesRule\(access, requiredCapability\)\) \{\s*throw Error\("Admin permission denied"\);/);
});

test("release gate: Astrology has an eval adapter now, so no feature gets a missing-adapter note", () => {
  const h = baseWindow("https://admin.example/ai-studio", ["ai.read"]);
  h.w.eval(read("apps/admin/release-gate.js"));
  const gate = h.w.NilazaReleaseGate;
  assert.equal(gate.NO_ADAPTER_NOTE, undefined);
  const state = { status: "ok", gate: { safety: "not_run", quality: "not_run" } };
  for (const feature of ["astrology_insight", "astrology_report", "tarot_reading"]) {
    const html = gate.renderState(state, "", feature);
    assert.doesNotMatch(html, /data-gate-no-adapter|chưa có bộ chạy thử/i);
  }
});
