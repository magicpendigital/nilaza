// Admin redesign step A2 (proposal 03/11 §5, approved by the Owner on 2026-11-13; spec 04/11 §1, §3.2, §3.6,
// §3.7 part 1, §3.13, §3.14): one Vietnamese left navigation filtered by capability, honest pages for work that
// needs backend, the Tổng quan page and the Tính năng AI page (switch + versioned config RPCs).
import assert from "node:assert/strict";
import fs from "node:fs";
import test, { after } from "node:test";
import vm from "node:vm";
import { JSDOM } from "jsdom";

const read = (file) => fs.readFileSync(file, "utf8");
// Objects built inside a jsdom window have that window's prototypes; compare plain JSON copies.
const plain = (value) => JSON.parse(JSON.stringify(value));
const manifest = JSON.parse(read("apps/admin/admin-capabilities.json"));
const allCapabilities = ["hub.read", "content.read", "content.draft", "content.publish", "ai.read", "ai.manage", "safety.review", "overview.read", "roles.manage"];
// shell.js keeps a session-expiry interval; close every window even when an assertion fails so a failure is reported, not a hang.
const openDoms = new Set();
after(() => { for (const dom of openDoms) dom.window.close(); });
const tick = (dom) => new Promise((resolve) => dom.window.setTimeout(resolve, 0));
const drain = async (dom) => { for (let i = 0; i < 6; i += 1) await tick(dom); };

async function shellAt(hash, capabilities = allCapabilities) {
  const html = read("apps/admin/index.html").replace(/<script[\s\S]*?<\/script>/g, "");
  const dom = new JSDOM(html, { url: `http://localhost:4173/apps/admin/index.html${hash}`, runScripts: "dangerously", pretendToBeVisual: true });
  openDoms.add(dom);
  const { window } = dom;
  window.ENV = { SUPABASE_URL: "https://etfajmrwyywokgafzxsb.supabase.co", SUPABASE_ANON_KEY: "public-test-key" };
  window.supabase = { createClient: () => ({ auth: {
    onAuthStateChange: () => {},
    getSession: async () => ({ data: { session: { user: { id: "owner-a2" } } } }),
    getUser: async () => ({ data: { user: { id: "owner-a2" } } }),
    signOut: async () => {}
  } }) };
  window.NilazaAccess = {
    load: async () => ({ userId: "owner-a2", role: "owner", email: "owner@example.invalid", capabilities }),
    can: (session, capability) => session?.capabilities?.includes(capability) === true
  };
  window.fetch = async () => ({ ok: true, json: async () => manifest });
  window.eval(read("apps/admin/env-band.js"));
  window.eval(read("apps/admin/unsaved-changes.js"));
  window.eval(read("apps/admin/shell.js"));
  await drain(dom);
  return dom;
}
const navLabels = (doc) => [...doc.querySelectorAll("#workspace-nav [data-nav]")].map((item) => item.textContent.trim());
const groupLabels = (doc) => [...doc.querySelectorAll("#workspace-nav .nav-group-label")].map((item) => item.textContent.trim());

test("one Vietnamese left navigation follows proposal 03/11 §5 and the top bar keeps environment, unsaved count and account", async () => {
  const dom = await shellAt("#/overview/home");
  const doc = dom.window.document;
  assert.deepEqual(groupLabels(doc), ["Nội dung", "AI", "Vận hành"]);
  assert.deepEqual(navLabels(doc), ["Tổng quan", "Người dẫn", "Bộ bài & 78 lá", "Văn bản trong app", "Tính năng AI", "Nhà cung cấp & Model", "Model và chiến dịch", "Hạng model người dẫn", "Prompt & phiên bản", "Chạy thử & chấm điểm", "Phản hồi người dùng", "Nhật ký AI", "Lịch sử thao tác", "Thành viên & quyền", "Tăng trưởng"]);
  assert.equal(doc.querySelector("#workspace-nav").getAttribute("aria-label"), "Điều hướng Admin");
  assert.equal(doc.querySelector('[data-nav="overview"]').getAttribute("aria-current"), "page");
  assert.equal(doc.querySelector("#environment-label").textContent, "Đang ghi vào: STAGING · Singapore");
  assert.match(doc.querySelector("#account-role").textContent, /owner@example\.invalid/);
  assert.ok(doc.querySelector("#unsaved-indicator"));
  assert.equal(doc.querySelector("#shell-breadcrumb").textContent, "Tổng quan");
  // The old workspace bar is gone: one navigation only.
  assert.equal(doc.querySelector("[data-workspace]"), null);
  // Phone width: the navigation stacks above the page.
  assert.match(read("apps/admin/shell.css"), /@media \(max-width: 820px\)[\s\S]*\.shell-body \{ display: flex; flex-direction: column; \}/);
  dom.window.close();
});

test("navigation items show only when the account has the capability", async () => {
  const content = await shellAt("#/content/personas", ["hub.read", "content.read"]);
  // A3: the shared timeline needs only hub.read, so content staff see "Lịch sử thao tác" too.
  assert.deepEqual(navLabels(content.window.document), ["Tổng quan", "Người dẫn", "Bộ bài & 78 lá", "Văn bản trong app", "Lịch sử thao tác"]);
  assert.deepEqual(groupLabels(content.window.document), ["Nội dung", "Vận hành"]);
  content.window.location.hash = "#/ai-studio/prompt";
  await drain(content);
  assert.equal(content.window.location.hash, "#/overview/home", "a deep link to a page without permission goes to the first permitted page");
  assert.equal(content.window.document.querySelector('[data-workspace-frame="ai-studio"]'), null);
  content.window.close();

  const aiOnly = await shellAt("#/ai-studio/features", ["hub.read", "ai.read"]);
  const labels = navLabels(aiOnly.window.document);
  assert.ok(labels.includes("Tính năng AI") && labels.includes("Nhật ký AI"));
  assert.ok(!labels.includes("Phản hồi người dùng"), "feedback also needs safety.review");
  assert.ok(!labels.includes("Người dẫn") && !labels.includes("Tăng trưởng"));
  // 14/11: "Thành viên & quyền" needs roles.manage (Owner only).
  assert.ok(!labels.includes("Thành viên & quyền"));
  aiOnly.window.close();
  const admin = await shellAt("#/team/members", ["hub.read", "content.read", "content.draft", "content.publish", "ai.read", "ai.manage", "overview.read", "notifications.dispatch", "safety.review"]);
  assert.ok(!navLabels(admin.window.document).includes("Thành viên & quyền"), "admin role has no roles.manage");
  assert.equal(admin.window.location.hash, "#/overview/home", "a deep link to the members page without roles.manage goes away");
  assert.equal(admin.window.document.querySelector('[data-workspace-frame="team"]'), null);
  admin.window.close();
});

test("every manifest route stays reachable and every navigation item resolves to a working page", async () => {
  const dom = await shellAt("#/overview/home");
  const { window } = dom;
  const doc = window.document;
  const nav = window.NilazaAdminNav;
  const covered = new Set(nav.visibleNav().flatMap((group) => group.items.flatMap((item) => item.visibleRoutes.map(([w, r]) => `${w}/${r}`))));
  for (const workspace of manifest.workspaces) for (const route of workspace.routes) assert.ok(covered.has(`${workspace.id}/${route.id}`), `${workspace.id}/${route.id} must stay reachable`);
  for (const button of [...doc.querySelectorAll("#workspace-nav [data-nav]")]) {
    const id = button.dataset.nav;
    doc.querySelector(`[data-nav="${id}"]`).click();
    await drain(dom);
    const [workspaceId, routeId] = window.location.hash.replace(/^#\//, "").split("?")[0].split("/");
    assert.equal(doc.querySelector(`[data-nav="${id}"]`).getAttribute("aria-current"), "page", id);
    if (workspaceId === "pending") {
      assert.equal(doc.querySelector("#pending-page").hidden, false, id);
      assert.match(doc.querySelector("#pending-page").textContent, /Chưa áp dụng — cần backend \(bước A[367]\)/, id);
      continue;
    }
    const workspace = manifest.workspaces.find((item) => item.id === workspaceId);
    assert.ok(workspace?.routes.some((route) => route.id === routeId), `${id} -> ${workspaceId}/${routeId}`);
    const frame = doc.querySelector(`[data-workspace-frame="${workspaceId}"]`);
    assert.ok(frame && !frame.hidden, id);
    assert.equal(frame.getAttribute("src").split("#")[0], `./${workspace.entry}`);
    assert.equal(doc.querySelector("#pending-page").hidden, true);
  }
  // A6: Chạy thử & chấm điểm opens the AI Studio Test route (ai-evals.js) instead of the pending page.
  doc.querySelector('[data-nav="evals"]').click();
  await drain(dom);
  assert.equal(window.location.hash, "#/ai-studio/test");
  assert.equal(doc.querySelector("#pending-page").hidden, true);
  assert.ok(!Object.hasOwn(window.NilazaAdminNav.pendingPages, "evals"), "the A2 pending page for evals is gone");
  // A7: "Nhà cung cấp & Model" opens the provider and chain page (no longer pending); the primary/fallback editor is a tab.
  doc.querySelector('[data-nav="providers"]').click();
  await drain(dom);
  assert.equal(window.location.hash, "#/ai-studio/providers");
  assert.equal(doc.querySelector("#pending-page").hidden, true);
  assert.equal(Object.hasOwn(window.NilazaAdminNav.pendingPages, "providers"), false);
  doc.querySelector('[data-route="model-router"]').click();
  await drain(dom);
  assert.equal(window.location.hash, "#/ai-studio/model-router");
  // A3: "Lịch sử thao tác" opens the shared timeline page (no longer a pending page); AI actions stay a tab.
  doc.querySelector('[data-nav="audit"]').click();
  await drain(dom);
  assert.equal(window.location.hash, "#/timeline/home");
  assert.equal(doc.querySelector("#pending-page").hidden, true);
  assert.equal(doc.querySelector('[data-workspace-frame="timeline"]').getAttribute("src").split("#")[0], "./timeline.html");
  assert.match(doc.querySelector("#route-bar").textContent, /Dòng thời gian chung[\s\S]*Thao tác AI/);
  doc.querySelector('[data-route="audit"]').click();
  await drain(dom);
  assert.equal(window.location.hash, "#/ai-studio/audit");
  // 14/11: "Thành viên & quyền" opens team.html (roles.manage).
  doc.querySelector('[data-nav="team"]').click();
  await drain(dom);
  assert.equal(window.location.hash, "#/team/members");
  assert.equal(doc.querySelector('[data-workspace-frame="team"]').getAttribute("src").split("#")[0], "./team.html");
  assert.equal(doc.querySelector("#shell-breadcrumb").textContent.includes("Thành viên & quyền"), true);
  dom.window.close();
});

// ---- Tính năng AI ----
function featuresHarness({ capabilities = ["ai.read", "ai.manage"], switches, configs, rpc } = {}) {
  const dom = new JSDOM('<!doctype html><body><main id="features"></main></body>', { url: "http://localhost/ai-studio.html#features", runScripts: "outside-only", pretendToBeVisual: true });
  openDoms.add(dom);
  const w = dom.window, c = w.document.querySelector("main"), calls = [];
  w.ENV = { SUPABASE_URL: "https://etfajmrwyywokgafzxsb.supabase.co", SUPABASE_ANON_KEY: "public-test" };
  w.NilazaAdminTransportTarget = "https://etfajmrwyywokgafzxsb.supabase.co";
  w.NilazaAdminSession = { userId: "admin-a2", capabilities };
  w.NilazaRequireCapability = async (capability) => w.NilazaAdminSession?.capabilities.includes(capability);
  const switchRows = switches ?? ["persona_chat", "oracle_router", "tarot_reading", "daily_insight", "astrology_insight", "ai_council", "astrology_report"].map((feature) => ({ feature, enabled: true, reason: null, updatedAt: "2026-11-13T00:00:00Z" }));
  w.NilazaAdminRpc = async (...args) => {
    calls.push(args);
    if (rpc) { const handled = await rpc(...args); if (handled !== undefined) return handled; }
    if (args[0] === "get_ai_feature_switches") return switchRows.map((row) => ({ ...row }));
    if (args[0] === "get_ai_feature_configs") return (configs ?? []).map((row) => ({ ...row }));
    throw Object.assign(Error("unexpected"), { code: "" });
  };
  w.eval(read("apps/admin/env-band.js"));
  w.eval(read("apps/admin/unsaved-changes.js"));
  w.eval(read("apps/admin/ai-features.js"));
  w.NilazaAiFeatures.mount(c);
  return { dom, w, c, calls, card: (id) => c.querySelector(`[data-feature-card="${id}"]`) };
}
const typeInto = (h, selector, value) => { const field = h.c.querySelector(selector); field.value = value; field.dispatchEvent(new h.w.Event("input", { bubbles: true })); };
const submit = (h, selector) => h.c.querySelector(selector).dispatchEvent(new h.w.Event("submit", { bubbles: true, cancelable: true }));

test("AI features show one card per feature with code defaults when no configuration is active", async () => {
  const h = featuresHarness({ configs: [] });
  await drain(h.dom);
  assert.deepEqual(h.calls.map((call) => [call[0], call[2]]), [["get_ai_feature_switches", "ai.read"], ["get_ai_feature_configs", "ai.read"]]);
  assert.deepEqual([...h.c.querySelectorAll("[data-feature-card]")].map((card) => card.dataset.featureCard), ["persona_chat", "oracle_router", "tarot_reading", "daily_insight", "astrology_insight", "ai_council", "astrology_report", "tarot_note", "reader_router", "numerology_private_message"]);
  for (const [id, title] of [["persona_chat", "Trò chuyện với người dẫn"], ["oracle_router", "Oracle"], ["tarot_reading", "Giải bài Tarot"], ["daily_insight", "Thông điệp hằng ngày"], ["astrology_insight", "Đọc sâu Chiêm tinh"], ["ai_council", "Hội đồng"], ["astrology_report", "Astrology report — đang gỡ, chỉ theo dõi"], ["tarot_note", "Ghi chú riêng Tarot"], ["reader_router", "Gợi ý người đọc (tầng AI)"], ["numerology_private_message", "Lời nhắn riêng Thần số học"]]) {
    assert.equal(h.card(id).querySelector("h3").textContent, title);
  }
  assert.match(h.card("persona_chat").textContent, /Mặc định: 5 lượt\/ngày \(đếm chung lượt với Oracle; mỗi bên chặn theo hạn mức của mình\)/);
  assert.match(h.card("oracle_router").textContent, /Mặc định: 5 lượt\/ngày/);
  assert.match(h.card("tarot_reading").textContent, /Mặc định: 1 lượt\/ngày/);
  assert.match(h.card("daily_insight").textContent, /Mặc định: 3 lượt\/ngày/);
  assert.match(h.card("astrology_insight").textContent, /Mặc định: 1 lượt\/ngày[\s\S]*mỗi model chờ tối đa 60 giây/);
  assert.match(h.card("ai_council").textContent, /Mặc định: 1 lượt\/ngày[\s\S]*Mặc định: 4 câu hỏi tiếp[\s\S]*mỗi model chờ tối đa 40 giây/);
  assert.equal(h.card("tarot_reading").querySelector('[data-cfg-field="followUps"]'), null, "follow-ups are Council only");
  assert.ok(h.card("ai_council").querySelector('[data-cfg-field="followUps"]'));
  assert.match(h.card("tarot_reading").textContent, /Đang chạy: mặc định trong mã/);
  assert.match(h.card("tarot_reading").textContent, /Nhóm dùng chung lượt\s*Chưa áp dụng/);
  assert.match(h.card("tarot_reading").textContent, /Trần chi phí mỗi lượt\s*Chưa áp dụng/);
  assert.equal(h.card("tarot_reading").querySelector("[data-cfg-review]").disabled, true, "nothing to publish before a draft exists");
  assert.equal(h.card("astrology_report").querySelector("[data-cfg-form]"), null, "the legacy report only has its switch");
  assert.ok(h.card("astrology_report").querySelector("[data-ai-switch-edit]"));
  const unlabeled = [...h.c.querySelectorAll("input, textarea, select")].filter((control) => control.labels.length === 0).map((control) => control.id);
  assert.deepEqual(unlabeled, []);
  h.dom.window.close();
});

test("AI features show the active version and the draft side by side", async () => {
  const h = featuresHarness({ configs: [
    { feature: "tarot_reading", version: 2, status: "draft", quotaDaily: 3, deadlineMs: 30000, copy: {}, note: "Thử 3 lượt" },
    { feature: "tarot_reading", version: 1, status: "active", quotaDaily: 2, deadlineMs: null, copy: { paused: { vi: "Tarot đang nghỉ", en: "Tarot is resting" } }, publishedAt: "2026-11-13T01:00:00Z" },
    { feature: "unknown_feature", version: 1, status: "active", quotaDaily: 9 }
  ] });
  await drain(h.dom);
  const text = h.card("tarot_reading").textContent;
  assert.match(text, /Đang chạy: phiên bản 1/);
  assert.match(text, /Có bản nháp phiên bản 2/);
  assert.match(text, /2 lượt\/ngày/);
  assert.match(text, /3 lượt\/ngày/);
  assert.match(text, /Tổng tối đa 30 giây/);
  assert.match(text, /Tarot đang nghỉ/);
  assert.equal(h.card("tarot_reading").querySelector('[data-cfg-field="quotaDaily"]').value, "3", "the form starts from the draft");
  assert.equal(h.card("tarot_reading").querySelector("[data-cfg-review]").disabled, false);
  assert.doesNotMatch(h.c.textContent, /unknown_feature/);
  h.dom.window.close();
});

test("Lưu nháp calls save_ai_feature_config_draft with named arguments and validates values first", async () => {
  const h = featuresHarness({ configs: [], rpc: async (name, params) => name === "save_ai_feature_config_draft"
    ? { feature: params.feature_input, version: 1, status: "draft", quotaDaily: params.payload.quotaDaily, deadlineMs: params.payload.deadlineMs, copy: params.payload.copy, note: params.payload.note }
    : undefined });
  await drain(h.dom);
  typeInto(h, "#cfg-tarot_reading-quotaDaily", "0");
  assert.equal(h.w.NilazaUnsaved.total(), 1, "an edited card counts as an unsaved change");
  submit(h, '[data-cfg-form="tarot_reading"]');
  await drain(h.dom);
  assert.equal(h.calls.filter((call) => call[0] === "save_ai_feature_config_draft").length, 0);
  assert.match(h.card("tarot_reading").textContent, /Lượt mỗi ngày: nhập số nguyên từ 1 đến 100/);
  typeInto(h, "#cfg-tarot_reading-quotaDaily", "2");
  typeInto(h, "#cfg-tarot_reading-deadlineSeconds", "30");
  typeInto(h, "#cfg-tarot_reading-quotaExhausted-vi", "Hôm nay bạn đã giải bài rồi.");
  submit(h, '[data-cfg-form="tarot_reading"]');
  await drain(h.dom);
  assert.match(h.card("tarot_reading").textContent, /cần cả tiếng Việt và tiếng Anh/);
  typeInto(h, "#cfg-tarot_reading-quotaExhausted-en", "You already had today's reading.");
  submit(h, '[data-cfg-form="tarot_reading"]');
  await drain(h.dom);
  const save = h.calls.find((call) => call[0] === "save_ai_feature_config_draft");
  assert.deepEqual(plain(save), ["save_ai_feature_config_draft", { feature_input: "tarot_reading", payload: { quotaDaily: 2, deadlineMs: 30000, copy: { quotaExhausted: { vi: "Hôm nay bạn đã giải bài rồi.", en: "You already had today's reading." } }, note: null } }, "ai.manage|ai.read+content.draft"]);
  assert.match(h.card("tarot_reading").textContent, /Đã lưu nháp phiên bản 1\. Người dùng chưa thấy/);
  assert.equal(h.w.NilazaUnsaved.total(), 0);
  assert.equal(h.card("tarot_reading").querySelector("[data-cfg-review]").disabled, false);
  // Council sends follow-ups; other features never do.
  typeInto(h, "#cfg-ai_council-followUps", "3");
  submit(h, '[data-cfg-form="ai_council"]');
  await drain(h.dom);
  const council = h.calls.filter((call) => call[0] === "save_ai_feature_config_draft").at(-1);
  assert.equal(council[1].feature_input, "ai_council");
  assert.equal(council[1].payload.followUps, 3);
  assert.equal(Object.hasOwn(save[1].payload, "followUps"), false);
  h.dom.window.close();
});

test("Xem lại & phát hành shows the diff and environment and needs a note of at least 10 characters", async () => {
  const configs = [
    { feature: "tarot_reading", version: 2, status: "draft", quotaDaily: 2, deadlineMs: null, copy: {}, note: null },
    { feature: "tarot_reading", version: 1, status: "active", quotaDaily: null, deadlineMs: null, copy: {}, publishedAt: "2026-11-12T00:00:00Z" }
  ];
  const h = featuresHarness({ configs, rpc: async (name, params) => name === "publish_ai_feature_config"
    ? { feature: params.feature_input, version: params.version_input, status: "active", quotaDaily: 2, deadlineMs: null, copy: {}, note: params.note_input, archivedVersion: 1 }
    : undefined });
  await drain(h.dom);
  h.card("tarot_reading").querySelector("[data-cfg-review]").click();
  await drain(h.dom);
  const dialog = h.c.querySelector("#ai-feature-dialog");
  assert.ok(dialog);
  assert.equal(dialog.getAttribute("role"), "dialog");
  assert.equal(h.c.querySelector("#ai-feature-dialog-environment").textContent, "Đang ghi vào: STAGING · Singapore");
  const changed = [...dialog.querySelectorAll("tr.changed")].map((row) => row.textContent);
  assert.equal(changed.length, 1);
  assert.match(changed[0], /Lượt mỗi người mỗi ngày\s*Mặc định: 1 lượt\/ngày\s*2 lượt\/ngày\s*Đổi/);
  const confirm = () => h.c.querySelector("[data-cfg-publish]");
  assert.equal(confirm().disabled, true);
  typeInto(h, "#ai-feature-publish-note", "ngắn");
  assert.equal(confirm().disabled, true);
  confirm().disabled = false;
  confirm().click();
  await drain(h.dom);
  assert.equal(h.calls.filter((call) => call[0] === "publish_ai_feature_config").length, 0, "no note of 10 characters, no publish");
  assert.equal(h.c.querySelector("#ai-feature-publish-note").labels.length, 1);
  typeInto(h, "#ai-feature-publish-note", "Tăng Tarot lên 2 lượt sau khi Owner duyệt");
  assert.equal(confirm().disabled, false);
  confirm().click();
  await drain(h.dom);
  assert.deepEqual(plain(h.calls.find((call) => call[0] === "publish_ai_feature_config")), ["publish_ai_feature_config", { feature_input: "tarot_reading", version_input: 2, note_input: "Tăng Tarot lên 2 lượt sau khi Owner duyệt" }, "ai.manage"]);
  assert.equal(h.c.querySelector("#ai-feature-dialog"), null);
  assert.match(h.card("tarot_reading").textContent, /Đã phát hành phiên bản 2/);
  assert.match(h.card("tarot_reading").textContent, /Đang chạy: phiên bản 2/);
  h.dom.window.close();
});

test("an account with ai.read only sees the values but no switch, save or publish control", async () => {
  const h = featuresHarness({ capabilities: ["ai.read"], configs: [{ feature: "tarot_reading", version: 2, status: "draft", quotaDaily: 2, copy: {} }] });
  await drain(h.dom);
  assert.match(h.c.textContent, /Bạn chỉ có quyền xem/);
  assert.equal(h.c.querySelector("[data-cfg-field], [data-cfg-save], [data-cfg-review], [data-ai-switch-edit]"), null);
  assert.match(h.card("tarot_reading").textContent, /2 lượt\/ngày/);
  assert.equal(h.calls.some((call) => call[2] === "ai.manage"), false);
  h.dom.window.close();
});

test("an editor (ai.read + content.draft) saves drafts but sees no publish or switch control (Owner decision 13/11)", async () => {
  const editor = ["hub.read", "content.read", "content.draft", "ai.read"];
  const h = featuresHarness({ capabilities: editor, configs: [
    { feature: "tarot_reading", version: 2, status: "draft", quotaDaily: 2, deadlineMs: null, copy: {}, note: null },
    { feature: "tarot_reading", version: 1, status: "active", quotaDaily: null, deadlineMs: null, copy: {}, publishedAt: "2026-11-12T00:00:00Z" }
  ], rpc: async (name, params) => name === "save_ai_feature_config_draft"
    ? { feature: params.feature_input, version: 1, status: "draft", quotaDaily: params.payload.quotaDaily, deadlineMs: params.payload.deadlineMs, copy: params.payload.copy, note: params.payload.note }
    : undefined });
  await drain(h.dom);
  assert.doesNotMatch(h.c.textContent, /Bạn chỉ có quyền xem/);
  assert.match(h.c.textContent, /Chỉ Owner bật\/tắt tính năng và phát hành/);
  assert.ok(h.card("tarot_reading").querySelector("[data-cfg-save]"), "editor sees Lưu nháp");
  assert.ok(h.card("tarot_reading").querySelector('[data-cfg-field="quotaDaily"]'), "editor sees the draft form");
  assert.equal(h.c.querySelector("[data-cfg-review], [data-cfg-publish], [data-ai-switch-edit]"), null, "no publish or switch control for editors");
  assert.equal(h.card("tarot_reading").querySelector("[data-cfg-editor-note]").textContent, "Chỉ Owner phát hành — bản nháp của bạn đã lưu, chờ Owner xem lại.");
  assert.match(h.card("daily_insight").querySelector("[data-cfg-editor-note]").textContent, /^Chỉ Owner phát hành\. Bấm Lưu nháp/);
  typeInto(h, "#cfg-daily_insight-quotaDaily", "4");
  submit(h, '[data-cfg-form="daily_insight"]');
  await drain(h.dom);
  assert.deepEqual(plain(h.calls.find((call) => call[0] === "save_ai_feature_config_draft")), ["save_ai_feature_config_draft", { feature_input: "daily_insight", payload: { quotaDaily: 4, deadlineMs: null, copy: {}, note: null } }, "ai.manage|ai.read+content.draft"]);
  assert.match(h.card("daily_insight").textContent, /Đã lưu nháp phiên bản 1\. Người dùng chưa thấy/);
  assert.equal(h.card("daily_insight").querySelector("[data-cfg-editor-note]").textContent, "Chỉ Owner phát hành — bản nháp của bạn đã lưu, chờ Owner xem lại.");
  assert.equal(h.calls.some((call) => call[2] === "ai.manage"), false, "an editor never calls an ai.manage RPC");
  assert.equal(h.c.querySelector("#ai-feature-dialog"), null);
  h.dom.window.close();

  // A database without 20261113090200 still refuses the editor: the page says why instead of a generic error.
  const old = featuresHarness({ capabilities: editor, configs: [], rpc: async (name) => {
    if (name === "save_ai_feature_config_draft") throw Object.assign(Error("Admin session unavailable"), { code: "42501", missingFunction: false });
    return undefined;
  } });
  await drain(old.dom);
  typeInto(old, "#cfg-tarot_reading-quotaDaily", "2");
  submit(old, '[data-cfg-form="tarot_reading"]');
  await drain(old.dom);
  assert.match(old.card("tarot_reading").textContent, /chưa có quyền lưu nháp trên máy chủ[\s\S]*20261113090200/);
  old.dom.window.close();

  // ai.read without content.draft (safety reviewer) stays read-only.
  const reviewer = featuresHarness({ capabilities: ["ai.read", "safety.review", "content.read"], configs: [] });
  await drain(reviewer.dom);
  assert.match(reviewer.c.textContent, /Bạn chỉ có quyền xem/);
  assert.equal(reviewer.c.querySelector("[data-cfg-save], [data-cfg-review], [data-cfg-field]"), null);
  reviewer.dom.window.close();
});

test("a missing configs RPC tells the Owner which migration to apply and the switch keeps working", async () => {
  const h = featuresHarness({ rpc: async (name, params) => {
    if (name === "get_ai_feature_configs") throw Object.assign(Error("Admin session unavailable"), { code: "PGRST202", missingFunction: true });
    if (name === "set_ai_feature_switch") return { feature: params.feature_input, enabled: params.enabled_input, reason: params.reason_input, updatedAt: "2026-11-13T02:00:00Z" };
    return undefined;
  } });
  await drain(h.dom);
  assert.match(h.card("tarot_reading").textContent, /Máy chủ chưa có bảng cấu hình — cần Owner áp migration 20261113090100/);
  assert.match(h.card("tarot_reading").textContent, /Mặc định: 1 lượt\/ngày/);
  assert.equal(h.c.querySelector("[data-cfg-save]"), null);
  h.card("tarot_reading").querySelector("[data-ai-switch-edit]").click();
  h.c.querySelector("#ai-switch-reason-tarot_reading").value = "ab";
  submit(h, '[data-ai-switch-form="tarot_reading"]');
  await drain(h.dom);
  assert.equal(h.calls.filter((call) => call[0] === "set_ai_feature_switch").length, 0, "a reason needs 3 characters");
  h.c.querySelector("#ai-switch-reason-tarot_reading").value = "Lỗi model";
  submit(h, '[data-ai-switch-form="tarot_reading"]');
  await drain(h.dom);
  assert.deepEqual(plain(h.calls.find((call) => call[0] === "set_ai_feature_switch")), ["set_ai_feature_switch", { feature_input: "tarot_reading", enabled_input: false, reason_input: "Lỗi model" }, "ai.manage"]);
  assert.match(h.card("tarot_reading").textContent, /Đang tắt/);
  h.dom.window.close();

  const failed = featuresHarness({ rpc: async (name) => { if (name === "get_ai_feature_configs") throw Object.assign(Error("PRIVATE detail"), { code: "XX000" }); return undefined; } });
  await drain(failed.dom);
  assert.match(failed.c.textContent, /Không tải được cấu hình/);
  assert.doesNotMatch(failed.c.textContent, /migration 20261113090100|PRIVATE/);
  failed.dom.window.close();
});

test("server text is escaped and an Oracle switch row missing on the server is explained", async () => {
  const h = featuresHarness({ switches: [{ feature: "tarot_reading", enabled: false, reason: '<img src=x onerror="alert(1)">', updatedAt: "<b>t</b>" }], configs: [{ feature: "tarot_reading", version: 1, status: "draft", quotaDaily: 1, copy: { paused: { vi: "<script>x</script>", en: "ok" } }, note: "<i>n</i>" }] });
  await drain(h.dom);
  assert.equal(h.c.querySelector("img, script, b, i"), null);
  assert.match(h.card("tarot_reading").textContent, /<img src=x/);
  assert.match(h.card("oracle_router").textContent, /Công tắc riêng cho Oracle cần migration 20261113090000/);
  h.dom.window.close();
});

test("the session helper marks a missing RPC so pages can explain it, and the config RPCs are allowlisted", async () => {
  const rpcCalls = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: "A" } } }),
      getSession: async () => ({ data: { session: { user: { id: "A" }, access_token: "synthetic-token" } } })
    },
    rpc: async (name, params) => {
      rpcCalls.push([name, params]);
      if (name === "get_admin_access") return { data: { userId: "A", roles: ["owner"], capabilities: ["hub.read", "ai.read", "ai.manage"] } };
      if (name === "get_ai_feature_configs") return { data: null, error: { code: "PGRST202", message: "Could not find the function public.get_ai_feature_configs" }, status: 404 };
      if (name === "save_ai_feature_config_draft") return { data: null, error: { code: "22023", message: "invalid_feature_config" }, status: 400 };
      return { data: [] };
    }
  };
  const w = { ENV: { SUPABASE_URL: "https://qa.supabase.co", SUPABASE_ANON_KEY: "public-test-key" }, supabase: { createClient: () => client }, addEventListener: () => {} };
  w.top = {}; w.self = w;
  const context = { window: w, document: { hidden: false, documentElement: { dataset: {} }, addEventListener: () => {} }, location: { pathname: "/ai-studio.html" }, URL, Headers, setTimeout, clearTimeout, fetch: async () => ({ ok: true }) };
  vm.runInNewContext(read("apps/admin/admin-access.js"), context);
  vm.runInNewContext(read("apps/admin/workspace-guard.js"), context);
  await w.NilazaAdminSessionPromise;
  await assert.rejects(w.NilazaAdminRpc("get_ai_feature_configs", {}, "ai.read"), (error) => error.missingFunction === true && error.code === "PGRST202" && !/Could not find/.test(error.message));
  await assert.rejects(w.NilazaAdminRpc("save_ai_feature_config_draft", { feature_input: "tarot_reading", payload: {} }, "ai.manage|ai.read+content.draft"), (error) => error.missingFunction === false && error.code === "22023");
  await assert.rejects(w.NilazaAdminRpc("save_ai_feature_config_draft", {}, "ai.read"), /Untrusted/);
  await assert.rejects(w.NilazaAdminRpc("save_ai_feature_config_draft", {}, "ai.manage"), /Untrusted/, "callers pass the exact draft rule");
  await assert.rejects(w.NilazaAdminRpc("publish_ai_feature_config", {}, "ai.read"), /Untrusted/);
  await assert.rejects(w.NilazaAdminRpc("publish_ai_feature_config", {}, "ai.manage|ai.read+content.draft"), /Untrusted/, "publish is never widened");
  assert.ok(rpcCalls.some(([name]) => name === "save_ai_feature_config_draft"));
});

test("the session helper lets an editor save a draft but never publish, and refuses ai.read alone", async () => {
  async function guardFor(capabilities) {
    const rpcCalls = [];
    const client = {
      auth: {
        getUser: async () => ({ data: { user: { id: "E" } } }),
        getSession: async () => ({ data: { session: { user: { id: "E" }, access_token: "synthetic-token" } } })
      },
      rpc: async (name) => {
        rpcCalls.push(name);
        if (name === "get_admin_access") return { data: { userId: "E", roles: [capabilities.includes("content.draft") ? "editor" : "safety_reviewer"], capabilities } };
        return { data: { feature: "tarot_reading", version: 1, status: "draft" } };
      }
    };
    const w = { ENV: { SUPABASE_URL: "https://qa.supabase.co", SUPABASE_ANON_KEY: "public-test-key" }, supabase: { createClient: () => client }, addEventListener: () => {} };
    w.top = {}; w.self = w;
    const context = { window: w, document: { hidden: false, documentElement: { dataset: {} }, addEventListener: () => {} }, location: { pathname: "/ai-studio.html" }, URL, Headers, setTimeout, clearTimeout, fetch: async () => ({ ok: true }) };
    vm.runInNewContext(read("apps/admin/admin-access.js"), context);
    vm.runInNewContext(read("apps/admin/workspace-guard.js"), context);
    await w.NilazaAdminSessionPromise;
    return { w, rpcCalls };
  }
  const editor = await guardFor(["hub.read", "content.read", "content.draft", "ai.read"]);
  const saved = await editor.w.NilazaAdminRpc("save_ai_feature_config_draft", { feature_input: "tarot_reading", payload: {} }, "ai.manage|ai.read+content.draft");
  assert.equal(saved.status, "draft");
  await assert.rejects(editor.w.NilazaAdminRpc("publish_ai_feature_config", { feature_input: "tarot_reading", version_input: 1, note_input: "editor tries publish" }, "ai.manage"), /permission denied/);
  await assert.rejects(editor.w.NilazaAdminRpc("set_ai_feature_switch", {}, "ai.manage"), /permission denied/);
  assert.equal(editor.rpcCalls.includes("publish_ai_feature_config") || editor.rpcCalls.includes("set_ai_feature_switch"), false);
  const reviewer = await guardFor(["hub.read", "content.read", "ai.read", "safety.review"]);
  await assert.rejects(reviewer.w.NilazaAdminRpc("save_ai_feature_config_draft", { feature_input: "tarot_reading", payload: {} }, "ai.manage|ai.read+content.draft"), /permission denied/);
  assert.equal(reviewer.rpcCalls.includes("save_ai_feature_config_draft"), false);
});

// ---- Tổng quan ----
async function overviewHarness({ capabilities = ["hub.read", "ai.read", "safety.review"], rpc } = {}) {
  const html = read("apps/admin/overview.html").replace(/<script[\s\S]*?<\/script>/g, "");
  const dom = new JSDOM(html, { url: "http://localhost/overview.html#home", runScripts: "outside-only", pretendToBeVisual: true });
  openDoms.add(dom);
  const w = dom.window, calls = [];
  w.NilazaAdminSession = { userId: "admin-a2", capabilities };
  w.NilazaAdminSessionPromise = Promise.resolve(w.NilazaAdminSession);
  const now = Date.now();
  w.NilazaAdminRpc = async (...args) => {
    calls.push(args);
    if (rpc) { const handled = await rpc(...args); if (handled !== undefined) return handled; }
    if (args[0] === "get_ai_feature_switches") return [{ feature: "tarot_reading", enabled: false, reason: "Chi phí tăng" }, { feature: "persona_chat", enabled: true }];
    if (args[0] === "get_ai_feedback_inbox") return [{ feedbackId: "1" }, { feedbackId: "2" }, { feedbackId: "3" }];
    if (args[0] === "search_ai_trace_runs") return [{ feature: "tarot_reading", status: "error", created_at: new Date(now - 3600e3).toISOString() }, { feature: "ai_council", status: "error", created_at: new Date(now - 3 * 86400e3).toISOString() }];
    return [];
  };
  w.eval(read("apps/admin/overview.js"));
  await drain(dom);
  return { dom, w, calls, doc: w.document };
}

test("Tổng quan shows AI switch lights, new feedback and recent AI errors from existing RPCs, and no invented cost", async () => {
  const h = await overviewHarness();
  assert.deepEqual(h.calls.map((call) => [call[0], call[2]]).sort(), [["get_ai_cost_summary", "ai.read"], ["get_ai_feature_switches", "ai.read"], ["get_ai_feedback_inbox", "safety.review"], ["list_ai_release_gate_pending", "ai.read"], ["search_ai_trace_runs", "ai.read"]]);
  assert.doesNotMatch(h.doc.querySelector("#overview-content").textContent, /Chưa chấm/, "no reminder when nothing waits for scoring");
  assert.deepEqual(plain(h.calls.find((call) => call[0] === "get_ai_feedback_inbox")[1]), { limit_count: 100, status_filter: "open", feature_filter: null });
  assert.equal(h.calls.find((call) => call[0] === "search_ai_trace_runs")[1].status_filter, "error");
  const text = h.doc.querySelector("#overview-content").textContent;
  assert.match(text, /Giải bài Tarot\s*Đang tắt · Chi phí tăng/);
  assert.match(text, /Trò chuyện với người dẫn\s*Đang bật/);
  assert.match(text, /Oracle\s*Chưa có công tắc trên máy chủ này/);
  assert.match(text, /Phản hồi mới\s*3/);
  assert.match(text, /Lỗi AI gần đây\s*1/, "only errors from the last 24 hours are counted");
  assert.doesNotMatch(text, /Chưa có số liệu chi phí/, "the placeholder line is gone (P1-C)");
  assert.match(text, /Chi phí AI\s*7 ngày/);
  assert.match(text, /Không tải được số liệu chi phí/, "an invalid answer is not shown as numbers");
  assert.equal(h.doc.querySelectorAll(".light.off").length, 1);
  h.dom.window.close();

  const contentOnly = await overviewHarness({ capabilities: ["hub.read", "content.read"] });
  assert.equal(contentOnly.calls.length, 0);
  assert.doesNotMatch(contentOnly.doc.querySelector("#overview-content").textContent, /Phản hồi mới|Tính năng AI|Lỗi AI|Chi phí AI/);
  contentOnly.dom.window.close();

  const failing = await overviewHarness({ rpc: async (name) => { if (name === "get_ai_feedback_inbox") throw Error("PRIVATE"); return undefined; } });
  assert.match(failing.doc.querySelector("#overview-content").textContent, /Không tải được phản hồi/);
  assert.doesNotMatch(failing.doc.body.textContent, /PRIVATE/);
  failing.dom.window.close();
});

test("Tổng quan Chi phí AI: table by feature, estimate and unverified labels, budget display, periods and empty state", async () => {
  const summary = (days) => ({ daysBack: days, fromDay: "2026-11-09", toDay: "2026-11-15", timezone: "Asia/Ho_Chi_Minh",
    totals: { calls: 12, turns: 10, costMicro: 7000 }, eval: { calls: 2, costMicro: 900 },
    features: [
      { feature: "tarot_reading", calls: 10, turns: 10, costMicro: 5500, turnCostP50: 550, turnCostP95: 955, turnCostP99: 991, failedCalls: 0, fallbackCalls: 0, estimatedCalls: 3, unknownCalls: 0, unverifiedPriceCalls: 0 },
      { feature: "persona_chat", calls: 2, turns: 1, costMicro: 1500, turnCostP50: 1500, turnCostP95: 1500, turnCostP99: 1500, failedCalls: 1, fallbackCalls: 1, estimatedCalls: 0, unknownCalls: 1, unverifiedPriceCalls: 1 }
    ],
    perUserDay: { userDays: 3, hidden: true, minUserDays: 5 },
    budget: { campaigns: null, defaultTurnCapMicro: 20000 } });
  const h = await overviewHarness({ rpc: async (name, args) => (name === "get_ai_cost_summary" ? summary(args.days_back) : undefined) });
  const content = () => h.doc.querySelector("#overview-content").textContent;
  assert.deepEqual(plain(h.calls.find((call) => call[0] === "get_ai_cost_summary")[1]), { days_back: 7 });
  const rows = [...h.doc.querySelectorAll(".cost-table tbody tr")].map((row) => [...row.children].map((cell) => cell.textContent.replace(/\s+/g, " ").trim()).join(" | "));
  assert.equal(rows.length, 2);
  assert.match(rows[0], /^Giải bài Tarot \| 10 \| 10 \| 0,0055 USD \| 0,00055 USD \/ 0,000955 USD \/ 0,000991 USD \| 0% \/ 0% \|/);
  assert.match(rows[0], /ước tính 3 lần ước tính/);
  assert.match(rows[1], /^Trò chuyện với người dẫn \| 1 \| 2 \|.*\| 50% \/ 50% \|/);
  assert.match(rows[1], /1 lần chưa rõ giá/);
  assert.match(rows[1], /giá chưa xác minh 1 lần/);
  assert.match(content(), /Giả định pilot Free: 1 USD\/ngày \(quyết định 15\/11, chưa cấu hình\)/);
  assert.match(content(), /g1-2026-10-02: 5,00 USD\/ngày, 50,00 USD\/14 ngày — chưa kích hoạt/);
  assert.match(content(), /Trần mỗi lượt trong bộ định tuyến: 0,02 USD/);
  assert.match(content(), /cần ít nhất 5 người-ngày/);
  assert.match(content(), /Chạy thử của Admin \(không tính ở trên\): 2 lần/);
  assert.doesNotMatch(content(), /userId|user_id/);
  h.doc.querySelector('[data-cost-days="30"]').click();
  await drain(h.dom);
  assert.deepEqual(plain(h.calls.filter((call) => call[0] === "get_ai_cost_summary").at(-1)[1]), { days_back: 30 });
  assert.equal(h.doc.querySelector('[data-cost-days="30"]').getAttribute("aria-pressed"), "true");
  assert.equal(h.calls.filter((call) => call[0] === "get_ai_feature_switches").length, 1, "only the cost block reloads");
  h.dom.window.close();

  const empty = await overviewHarness({ rpc: async (name) => (name === "get_ai_cost_summary" ? { ...summary(7), features: [], totals: { calls: 0, turns: 0, costMicro: 0 } } : undefined) });
  assert.match(empty.doc.querySelector("#overview-content").textContent, /Chưa có lượt nào trong khoảng này/);
  empty.dom.window.close();

  const missing = await overviewHarness({ rpc: async (name) => { if (name === "get_ai_cost_summary") throw Object.assign(Error("missing"), { missingFunction: true }); return undefined; } });
  assert.match(missing.doc.querySelector("#overview-content").textContent, /migration 20261115120000 chưa áp/);
  missing.dom.window.close();
});

test("trace detail keeps raw JSON collapsed under Chi tiết kỹ thuật and feedback labels are Vietnamese", () => {
  const app = read("apps/admin/app.js");
  const start = app.indexOf("function renderTraceExplorerDetail()");
  const body = app.slice(start, app.indexOf("async function loadTraceExplorer()"));
  assert.match(body, /<details class=\\"technical-details code-card\\"><summary>Chi tiết kỹ thuật/);
  assert.doesNotMatch(body, /<details class=\\"code-card\\" open>/, "spans are no longer expanded JSON by default");
  const feedback = read("apps/admin/feedback-inbox.js");
  assert.doesNotMatch(feedback, / \/ (?:Load|Loading|Saving|Status|Feedback|Session|Backend|Could)/);
  assert.match(feedback, /open: "Mới", investigating: "Đang xem", resolved: "Đã xong", dismissed: "Bỏ qua"/);
});
