import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";

test("Admin shell keeps workspace documents alive while navigating and clears them on logout", async () => {
  const manifest = JSON.parse(fs.readFileSync("apps/admin/admin-capabilities.json", "utf8"));
  const html = fs.readFileSync("apps/admin/index.html", "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
  const dom = new JSDOM(html, {
    url: "http://localhost:4173/apps/admin/index.html#/content/personas",
    runScripts: "dangerously",
    pretendToBeVisual: true
  });
  const { window } = dom;
  let authListener;
  const client = {
    auth: {
      onAuthStateChange: listener => { authListener = listener; },
      getSession: async () => ({ data: { session: { user: { id: "owner-1" } } } }),
      getUser: async () => ({ data: { user: { id: "owner-1" } } }),
      signOut: async () => { authListener?.("SIGNED_OUT", null); }
    }
  };
  window.ENV = { SUPABASE_URL: "https://qa.supabase.co", SUPABASE_ANON_KEY: "public-test-key" };
  window.supabase = { createClient: () => client };
  window.NilazaAccess = {
    load: async (_client, user) => ({ userId: user.id, role: "owner", email: "owner@example.invalid" }),
    can: session => Boolean(session?.userId)
  };
  window.fetch = async () => ({ ok: true, json: async () => manifest });
  window.eval(fs.readFileSync("apps/admin/shell.js", "utf8"));
  const tick = () => new Promise(resolve => window.setTimeout(resolve, 0));
  await tick();

  const contentFrame = window.document.querySelector('[data-workspace-frame="content"]');
  assert.ok(contentFrame);
  const contentSrc = contentFrame.getAttribute("src");
  window.document.querySelector('[data-workspace="ai-studio"]').click();
  await tick();
  const studioFrame = window.document.querySelector('[data-workspace-frame="ai-studio"]');
  assert.ok(studioFrame);
  let clearedSensitiveState = 0;
  studioFrame.contentWindow.NilazaClearSensitiveAdminState = () => { clearedSensitiveState++; };
  assert.equal(window.document.querySelectorAll("[data-workspace-frame]").length, 2);
  window.document.querySelector('[data-workspace="content"]').click();
  await tick();
  assert.equal(window.document.querySelector('[data-workspace-frame="content"]'), contentFrame);
  assert.equal(contentFrame.getAttribute("src"), contentSrc);
  assert.equal(contentFrame.hidden, false);
  assert.equal(studioFrame.hidden, true);
  assert.equal(clearedSensitiveState, 1);

  window.document.querySelector("#logout-button").click();
  await tick();
  assert.equal(window.document.querySelectorAll("[data-workspace-frame]").length, 0);
  assert.equal(window.document.querySelector("#admin-shell").hidden, true);
  dom.window.close();
});

async function createShellAt(hash) {
  const manifest = JSON.parse(fs.readFileSync("apps/admin/admin-capabilities.json", "utf8"));
  const html = fs.readFileSync("apps/admin/index.html", "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
  const dom = new JSDOM(html, { url: `http://localhost:4173/apps/admin/index.html${hash}`, runScripts: "dangerously", pretendToBeVisual: true });
  const { window } = dom;
  window.ENV = { SUPABASE_URL: "https://qa.supabase.co", SUPABASE_ANON_KEY: "public-test-key" };
  window.supabase = { createClient: () => ({ auth: {
    onAuthStateChange: () => {},
    getSession: async () => ({ data: { session: { user: { id: "owner-parity" } } } }),
    getUser: async () => ({ data: { user: { id: "owner-parity" } } }),
    signOut: async () => {}
  } }) };
  window.NilazaAccess = { load: async () => ({ userId: "owner-parity", role: "owner", email: "owner@example.invalid" }), can: session => Boolean(session?.userId) };
  window.fetch = async () => ({ ok: true, json: async () => manifest });
  window.eval(fs.readFileSync("apps/admin/shell.js", "utf8"));
  await new Promise(resolve => window.setTimeout(resolve, 0));
  return dom;
}

test("Shell deep links and route changes retain reviewed feature/locale metadata", async () => {
  const dom = await createShellAt("#/ai-studio/prompt?feature=oracle_router&locale=en");
  const { window } = dom;
  const doc = window.document;
  const frame = doc.querySelector('[data-workspace-frame="ai-studio"]');
  assert.equal(frame.getAttribute("src"), "./ai-studio.html#prompt?feature=oracle_router&locale=en");
  assert.ok(doc.querySelector('[data-route="prompt"]').classList.contains("active"));
  doc.querySelector('[data-route="model-router"]').click();
  await new Promise(resolve => window.setTimeout(resolve, 0));
  assert.equal(window.location.hash, "#/ai-studio/model-router?feature=oracle_router&locale=en");
  assert.equal(frame.contentWindow.location.hash, "#model-router?feature=oracle_router&locale=en");
  window.location.hash = "#/ai-studio/prompt?feature=oracle_router&locale=en";
  await new Promise(resolve => window.setTimeout(resolve, 0));
  assert.equal(doc.querySelector('[data-workspace-frame="ai-studio"]'), frame);
  assert.equal(frame.contentWindow.location.hash, "#prompt?feature=oracle_router&locale=en");
  assert.ok(doc.querySelector('[data-route="prompt"]').classList.contains("active"));
  window.history.back();
  await new Promise(resolve => window.setTimeout(resolve, 30));
  assert.equal(window.location.hash, "#/ai-studio/model-router?feature=oracle_router&locale=en");
  assert.equal(frame.contentWindow.location.hash, "#model-router?feature=oracle_router&locale=en");
  dom.window.close();
});

test("Shell accepts only same-origin visible AI frame route metadata", async () => {
  const dom = await createShellAt("#/ai-studio/workflow");
  const { window } = dom;
  const frame = window.document.querySelector('[data-workspace-frame="ai-studio"]');
  const message = { type: "nilaza.admin.route", workspaceId: "ai-studio", route: "prompt", featureId: "oracle_router", locale: "vi", section: "" };
  const dispatch = (data, origin = window.location.origin, source = frame.contentWindow) => window.dispatchEvent(new window.MessageEvent("message", { data, origin, source }));
  for (const data of [{ ...message, featureId: "unknown" }, { ...message, locale: "vi-VN" }, { ...message, route: "unknown" }, { ...message, rawChat: "must-not-enter-url" }]) dispatch(data);
  dispatch(message, "https://untrusted.example.invalid");
  dispatch(message, window.location.origin, window);
  assert.equal(window.location.hash, "#/ai-studio/workflow");
  dispatch(message);
  await new Promise(resolve => window.setTimeout(resolve, 0));
  assert.equal(window.location.hash, "#/ai-studio/prompt?feature=oracle_router&locale=vi");
  assert.ok(window.document.querySelector('[data-route="prompt"]').classList.contains("active"));
  window.document.querySelector('[data-workspace="content"]').click();
  await new Promise(resolve => window.setTimeout(resolve, 0));
  const beforeHiddenMessage = window.location.hash;
  dispatch({ ...message, route: "trace-explorer" });
  assert.equal(window.location.hash, beforeHiddenMessage);
  assert.equal(frame.hidden, true);
  dom.window.close();
});

test("Shell keeps Trace as a declared route and strips non-route query fields", async () => {
  const dom = await createShellAt("#/ai-studio/trace-explorer?feature=astrology&locale=vi&question=private-marker&token=secret-marker");
  const { window } = dom;
  const frame = window.document.querySelector('[data-workspace-frame="ai-studio"]');
  assert.equal(frame.getAttribute("src"), "./ai-studio.html#trace-explorer?feature=astrology&locale=vi");
  assert.ok(window.document.querySelector('[data-route="trace-explorer"]').classList.contains("active"));
  dom.window.close();
});
