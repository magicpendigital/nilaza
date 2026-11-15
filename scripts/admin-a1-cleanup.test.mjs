// Admin redesign step A1 (proposal 03/11 §6, spec 04/11 §4): no legacy controls, no pasted
// credentials, one meaning per button, unsaved-change warning, Vietnamese by default, labelled inputs.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test, { after } from "node:test";
import { JSDOM } from "jsdom";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const adminPages = fs.readdirSync(path.join(root, "apps/admin")).filter((file) => file.endsWith(".html"));
// Credential-like fields only; model settings such as "Reasoning token cap" are fine.
const credentialPattern = /jwt|access[-_ ]?token|admin[-_ ]?token|\banon\b|anon[-_ ]?key|api[-_ ]?key|apikey|endpoint|secret|bearer/i;
// Tab clicks start async reads (audit, traces); let them finish before closing the window.
const drain = async (dom) => { for (let tick = 0; tick < 5; tick += 1) await new Promise((resolve) => dom.window.setTimeout(resolve, 0)); };
const settle = (dom) => new Promise((resolve) => dom.window.setTimeout(resolve, 0));
// shell.js keeps a session-expiry interval alive; close its window even when an assertion fails so a failure is reported, not a hang.
const openDoms = new Set();
after(() => { for (const dom of openDoms) dom.window.close(); });

function studioDom({ storage = {}, environment = { SUPABASE_URL: "https://qa.supabase.co" }, adminRequest } = {}) {
  const html = read("apps/admin/ai-studio.html")
    .replace(/<script src="\.\/workspace-guard\.js"><\/script>/, "")
    .replace(/<script src="\.\/(?:app|unsaved-changes|workflow-catalog|workflow-view)\.js"><\/script>/g, "");
  const dom = new JSDOM(html, { url: "http://localhost:4173/apps/admin/ai-studio.html", runScripts: "dangerously", pretendToBeVisual: true });
  dom.window.crypto.randomUUID = randomUUID;
  for (const [key, value] of Object.entries(storage)) dom.window.localStorage.setItem(key, value);
  dom.window.ENV = environment;
  dom.window.NilazaAdminSession = { userId: "fictional-admin", role: "owner", capabilities: ["ai.read", "ai.manage"] };
  dom.window.NilazaRequireCapability = async (capability) => dom.window.NilazaAdminSession?.capabilities?.includes(capability) === true;
  dom.window.NilazaAdminRequest = adminRequest || (async () => ({ ok: true, json: async () => ({ status: "connected", contractVersion: "model_route_publish_v2", providers: [], routes: [], history: [] }) }));
  dom.window.eval(read("apps/admin/env-band.js"));
  dom.window.eval(read("apps/admin/unsaved-changes.js"));
  dom.window.eval(read("apps/admin/workflow-catalog.js"));
  dom.window.eval(read("apps/admin/workflow-view.js"));
  dom.window.eval(read("apps/admin/feedback-inbox.js"));
  dom.window.eval(read("apps/admin/app.js"));
  return dom;
}

function unlabeledControls(container) {
  return [...container.querySelectorAll("input, select, textarea")]
    .filter((control) => control.type !== "hidden" && !control.closest("[hidden]") && control.labels.length === 0)
    .map((control) => control.id || control.outerHTML.slice(0, 80));
}

test("every Admin page declares Vietnamese as its language", () => {
  assert.ok(adminPages.length >= 5);
  for (const page of adminPages) assert.match(read(`apps/admin/${page}`), /<html lang="vi"/, page);
});

test("the Legacy sample controls and the local prompt box are gone", async () => {
  const html = read("apps/admin/ai-studio.html");
  const app = read("apps/admin/app.js");
  assert.doesNotMatch(html, /Legacy|workflow-reference|inspector-body|workflow-canvas/);
  assert.doesNotMatch(app, /Legacy (?:local prompt|sample|browser draft)|id="prompt-edit"|id="detail-prompt"|id="save-prompt"|workflow-sample-payload/);
  const dom = studioDom();
  const doc = dom.window.document;
  for (const tab of doc.querySelectorAll(".tab")) {
    tab.click();
    assert.doesNotMatch(doc.body.textContent, /Legacy/, tab.dataset.detail);
  }
  await drain(dom);
  dom.window.close();
});

test("no Admin surface accepts a JWT, anon key, provider key or endpoint URL", async () => {
  for (const file of fs.readdirSync(path.join(root, "apps/admin")).filter((name) => /\.(?:html|js)$/.test(name))) {
    const source = read(`apps/admin/${file}`);
    assert.doesNotMatch(source, /id="(?:council|model-router)-admin-(?:jwt|anon-key|endpoint)"/, file);
    assert.doesNotMatch(source, /Paste admin user's Supabase access token|Admin JWT token/, file);
  }
  const dom = studioDom();
  const doc = dom.window.document;
  await settle(dom);
  for (const featureId of ["ai_council", "tarot_reading", "astrology"]) {
    doc.querySelector(`[data-feature="${featureId}"]`).click();
    for (const tab of doc.querySelectorAll(".tab")) {
      tab.click();
      for (const control of doc.querySelectorAll("#detail-content input, #detail-content textarea")) {
        const descriptor = [control.id, control.name, control.placeholder, control.getAttribute("aria-label"), ...[...control.labels].map((label) => label.textContent)].join(" ");
        assert.doesNotMatch(descriptor, credentialPattern, `${featureId}/${tab.dataset.detail}: ${control.id}`);
        assert.notEqual(control.type, "password", `${featureId}/${tab.dataset.detail}`);
      }
    }
  }
  await drain(dom);
  dom.window.close();
});

test("server calls go through the signed-in session helper, never a plain fetch", async () => {
  const fetched = [];
  const dom = studioDom({ adminRequest: null });
  delete dom.window.NilazaAdminRequest;
  dom.window.fetch = async (url) => { fetched.push(String(url)); return { ok: true, json: async () => ({}) }; };
  const doc = dom.window.document;
  doc.querySelector('[data-feature="ai_council"]').click();
  doc.querySelector('[data-detail="councilBuilder"]').click();
  doc.querySelector("#council-load-config")?.click();
  await settle(dom);
  assert.deepEqual(fetched.filter((url) => url.includes("/functions/v1/")), []);
  dom.window.close();
});

test("each primary button has one meaning", async () => {
  const dom = studioDom();
  const doc = dom.window.document;
  await settle(dom);
  const button = doc.querySelector("#publish-button");
  const reason = doc.querySelector("#publish-locked-reason");

  doc.querySelector('[data-feature="tarot_reading"]').click();
  doc.querySelector('[data-detail="modelRouter"]').click();
  assert.equal(button.textContent, "Xem lại & phát hành");
  assert.equal(button.hidden, false);
  assert.equal(reason.hidden, true);

  doc.querySelector('[data-detail="prompt"]').click();
  assert.equal(button.textContent, "Lưu nháp trên trình duyệt này — chưa lên máy chủ");
  assert.match(doc.querySelector("#detail-content").textContent, /Chưa áp dụng — cần backend/);

  doc.querySelector('[data-feature="ai_council"]').click();
  doc.querySelector('[data-detail="councilBuilder"]').click();
  assert.equal(button.hidden, true, "a locked publish is hidden, not a disabled 'Publish'");
  assert.equal(reason.hidden, false);
  assert.match(reason.textContent, /Chưa phát hành được Hội đồng/);

  doc.querySelector('[data-feature="notifications"]').click();
  doc.querySelector('[data-detail="modelRouter"]').click();
  assert.equal(button.hidden, true);
  assert.match(reason.textContent, /Chưa phát hành được model/);

  doc.querySelector('[data-detail="personaStudio"]').click();
  doc.querySelector('[data-feature="persona_chat"]').click();
  assert.match(doc.querySelector("#detail-content").textContent, /Chưa áp dụng — cần backend/);
  dom.window.close();

  const content = read("apps/admin/content.js");
  assert.match(content, />Lưu nháp<\/button>/);
  assert.match(content, />Xem lại & phát hành<\/button>/);
  assert.doesNotMatch(content, />Publish<\/button>|>Save draft<\/button>/);
});

test("publish review shows what changes and the environment, and needs a note", async () => {
  const posts = [];
  const dom = studioDom({
    environment: { SUPABASE_URL: "https://etfajmrwyywokgafzxsb.supabase.co" },
    adminRequest: async (url, options) => {
      if (options.method === "POST") { posts.push(url); return { ok: false, statusText: "stop", json: async () => ({ error: "stop" }) }; }
      return { ok: true, json: async () => ({ status: "connected", contractVersion: "model_route_publish_v2", providers: [], routes: [], history: [] }) };
    }
  });
  const doc = dom.window.document;
  await settle(dom);
  doc.querySelector('[data-feature="tarot_reading"]').click();
  doc.querySelector('[data-detail="modelRouter"]').click();
  doc.querySelector("#publish-button").click();
  await settle(dom);
  assert.equal(doc.querySelector("#modal").hidden, false);
  assert.match(doc.querySelector("#publish-summary").textContent, /tarot_reading · /);
  assert.match(doc.querySelector("#publish-environment").textContent, /Đang ghi vào: STAGING · Singapore/);
  const confirm = doc.querySelector("#confirm-publish");
  assert.equal(confirm.disabled, true);
  confirm.disabled = false;
  confirm.click();
  await settle(dom);
  assert.equal(posts.length, 0, "no note, no publish");
  const note = doc.querySelector("#publish-note");
  assert.equal(note.labels.length, 1);
  note.value = "Đổi model Tarot sau khi chạy thử";
  note.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  assert.equal(confirm.disabled, false);
  dom.window.close();
});

test("unsaved-change guard warns before leaving and reports a count", async () => {
  const dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost:4173/apps/admin/content.html", runScripts: "dangerously" });
  dom.window.eval(read("apps/admin/unsaved-changes.js"));
  const leave = () => { const event = new dom.window.Event("beforeunload", { cancelable: true }); dom.window.dispatchEvent(event); return event.defaultPrevented; };
  assert.equal(leave(), false);
  assert.equal(dom.window.NilazaUnsaved.set("content", 2), 2);
  assert.equal(leave(), true);
  assert.equal(dom.window.NilazaUnsaved.label(), "2 thay đổi chưa lưu");
  dom.window.NilazaUnsaved.set("content", 0);
  assert.equal(leave(), false);
  dom.window.close();

  // Each editing workspace loads the guard and reports its own count.
  for (const page of ["index.html", "content.html", "ai-studio.html"]) assert.match(read(`apps/admin/${page}`), /unsaved-changes\.js/, page);
  assert.match(read("apps/admin/content.js"), /NilazaUnsaved\?\.set\("content"/);
  assert.match(read("apps/admin/app.js"), /NilazaUnsaved\?\.set\("ai-studio"/);

  const routeDraft = JSON.stringify({ tarot_reading: { provider: "openrouter", model: "unsaved-model" } });
  const studio = studioDom({ storage: { "nilaza.admin.aiStudio.draft.v2:fictional-admin:https%3A%2F%2Fqa.supabase.co": routeDraft } });
  await settle(studio);
  assert.equal(studio.window.NilazaUnsaved.total(), 1);
  assert.equal(studio.window.document.querySelector("#unsaved-count").textContent, "1 thay đổi chưa lưu");
  const event = new studio.window.Event("beforeunload", { cancelable: true });
  studio.window.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  studio.window.close();
});

test("the shell top bar shows unsaved changes reported by a workspace frame", async () => {
  const manifest = JSON.parse(read("apps/admin/admin-capabilities.json"));
  const html = read("apps/admin/index.html").replace(/<script[\s\S]*?<\/script>/g, "");
  const dom = new JSDOM(html, { url: "http://localhost:4173/apps/admin/index.html#/content/personas", runScripts: "dangerously", pretendToBeVisual: true });
  openDoms.add(dom);
  const { window } = dom;
  window.ENV = { SUPABASE_URL: "https://qa.supabase.co", SUPABASE_ANON_KEY: "public-test-key" };
  window.supabase = { createClient: () => ({ auth: {
    onAuthStateChange: () => {},
    getSession: async () => ({ data: { session: { user: { id: "owner-a1" } } } }),
    getUser: async () => ({ data: { user: { id: "owner-a1" } } }),
    signOut: async () => {}
  } }) };
  window.NilazaAccess = { load: async () => ({ userId: "owner-a1", role: "owner", email: "owner@example.invalid" }), can: (session) => Boolean(session?.userId) };
  window.fetch = async () => ({ ok: true, json: async () => manifest });
  window.eval(read("apps/admin/unsaved-changes.js"));
  window.eval(read("apps/admin/shell.js"));
  await settle(dom);
  const doc = window.document;
  assert.equal(doc.documentElement.lang, "vi");
  assert.match(doc.querySelector("#workspace-nav").textContent, /Nội dung/);
  assert.match(doc.querySelector("#workspace-nav").textContent, /Người dẫn/);
  const frame = doc.querySelector('[data-workspace-frame="content"]');
  const indicator = doc.querySelector("#unsaved-indicator");
  assert.equal(indicator.hidden, true);
  window.dispatchEvent(new window.MessageEvent("message", { data: { type: "nilaza.admin.unsaved", workspaceId: "content", count: 3 }, origin: "https://untrusted.example.invalid", source: frame.contentWindow }));
  assert.equal(indicator.hidden, true, "other origins are ignored");
  window.dispatchEvent(new window.MessageEvent("message", { data: { type: "nilaza.admin.unsaved", workspaceId: "content", count: 3 }, origin: window.location.origin, source: frame.contentWindow }));
  assert.equal(indicator.hidden, false);
  assert.equal(indicator.textContent, "3 thay đổi chưa lưu");
  const event = new window.Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  dom.window.close();
});

test("sign-in and session messages are told apart by cause", () => {
  const source = read("apps/admin/shell.js");
  const start = source.indexOf("function signInErrorMessage");
  const end = source.indexOf("window.NilazaSessionNoticeMessage");
  const body = source.slice(start, end).replace("window.NilazaSignInErrorMessage = signInErrorMessage;", "");
  const { signIn, notice } = new Function(`${body}; return { signIn: signInErrorMessage, notice: sessionNoticeMessage };`)();
  assert.match(signIn({ code: "invalid_credentials", status: 400 }), /mật khẩu chưa đúng/);
  assert.match(signIn({ message: "Failed to fetch" }), /Không kết nối được máy chủ/);
  assert.match(notice("denied"), /chưa có quyền quản trị/);
  assert.match(notice("expired"), /đã hết hạn/);
  assert.match(notice("expiring", 3), /sắp hết hạn \(còn khoảng 3 phút\)/);
  const html = read("apps/admin/index.html");
  assert.match(html, /Chưa có quyền quản trị/);
  assert.match(html, /id="session-expiry-notice"/);
});

test("every form control has an associated label", async () => {
  for (const page of ["index.html", "recovery.html"]) {
    const dom = new JSDOM(read(`apps/admin/${page}`).replace(/<script[\s\S]*?<\/script>/g, ""));
    assert.deepEqual(unlabeledControls(dom.window.document), [], page);
    dom.window.close();
  }
  const studio = studioDom();
  const doc = studio.window.document;
  await settle(studio);
  for (const featureId of ["tarot_reading", "ai_council", "astrology", "oracle_router"]) {
    doc.querySelector(`[data-feature="${featureId}"]`).click();
    for (const tab of doc.querySelectorAll(".tab")) {
      tab.click();
      assert.deepEqual(unlabeledControls(doc.querySelector("#detail-content")), [], `${featureId}/${tab.dataset.detail}`);
    }
  }
  doc.querySelector("#publish-button").click();
  await settle(studio);
  assert.deepEqual(unlabeledControls(doc.querySelector("#publish-dialog")), []);
  await drain(studio);
  studio.window.close();
});

test("Content fields are labelled and keep bilingual VI/EN editing", async () => {
  const html = read("apps/admin/content.html").replace(/<script[^>]+src="\.\/workspace-guard\.js"><\/script>/, "").replace(/<script type="module" src="\.\/content\.js"><\/script>/, "");
  const dom = new JSDOM(html, { url: "http://localhost:4173/apps/admin/content.html#personas", pretendToBeVisual: true });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.location = dom.window.location;
  globalThis.fetch = async (url) => {
    const request = String(url);
    if (request.includes("admin-capabilities.json")) return { ok: true, json: async () => JSON.parse(read("apps/admin/admin-capabilities.json")) };
    if (request.includes("generated/content-seed.json")) return { ok: true, json: async () => JSON.parse(read("apps/admin/generated/content-seed.json")) };
    return { ok: false, json: async () => ({}) };
  };
  dom.window.NilazaAdminSession = { email: "owner@nilaza.ai", role: "owner" };
  dom.window.NilazaAdminSessionPromise = Promise.resolve(dom.window.NilazaAdminSession);
  dom.window.NilazaRequireCapability = async () => true;
  await import(`${pathToFileURL(path.join(root, "apps/admin/content.js")).href}?a1-labels=${Date.now()}`);
  for (let attempt = 0; attempt < 20 && !dom.window.document.querySelector("[data-bind]"); attempt += 1) await new Promise((resolve) => dom.window.setTimeout(resolve, 10));
  const doc = dom.window.document;
  assert.ok(doc.querySelector("[data-bind]"));
  assert.deepEqual(unlabeledControls(doc.querySelector("#workspace-content")), []);
  assert.equal(doc.querySelector("#page-title").textContent, "Người dẫn");
  assert.ok(doc.querySelector('[data-locale="vi"]') && doc.querySelector('[data-locale="en"]'), "VI/EN content editing stays");
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.localStorage;
  delete globalThis.location;
  delete globalThis.fetch;
  dom.window.close();
});

test("Content styles keep the hidden attribute effective for the unsaved-count pill", () => {
  // .unsaved-count sets display; without a [hidden] rule an empty pill would always show in Content.
  assert.match(read("apps/admin/content.css"), /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
});
