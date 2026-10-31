import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { JSDOM } from "jsdom";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function band(env, inFrame = false) {
  const dom = new JSDOM("<body><main></main></body>", { runScripts: "outside-only", url: "https://admin.example.test/" });
  dom.window.ENV = env;
  if (inFrame) Object.defineProperty(dom.window, "top", { value: {} });
  dom.window.eval(read("apps/admin/env-band.js"));
  return dom.window.document.querySelector("#nilaza-env-band")?.textContent ?? null;
}

test("the band names the configured backend and never guesses production", () => {
  assert.match(band({ SUPABASE_URL: "https://akgrokwnkfqnfjqrildi.supabase.co" }), /STAGING · QA/);
  assert.match(band({ SUPABASE_URL: "https://etfajmrwyywokgafzxsb.supabase.co" }), /STAGING · Singapore/);
  assert.match(band({ SUPABASE_URL: "https://someotherref.supabase.co" }), /BACKEND CHƯA RÕ/);
  assert.match(band({}), /CHƯA CẤU HÌNH/);
  assert.match(band({ SUPABASE_URL: "https://someotherref.supabase.co", NILAZA_ENVIRONMENT: "production" }), /PRODUCTION/);
  assert.equal(band({ SUPABASE_URL: "https://akgrokwnkfqnfjqrildi.supabase.co" }, true), null);
});

test("reset needs the environment name typed; a wrong answer changes nothing", async () => {
  const html = read("apps/admin/content.html").replace(/<script[^>]+src="\.\/workspace-guard\.js"><\/script>/, "").replace(/<script type="module" src="\.\/content\.js"><\/script>/, "");
  const dom = new JSDOM(html, { url: "http://localhost:4173/apps/admin/content.html#overview", pretendToBeVisual: true });
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
  const capabilityChecks = [];
  dom.window.NilazaAdminSession = { email: "owner@nilaza.ai", role: "owner" };
  dom.window.NilazaAdminSessionPromise = Promise.resolve(dom.window.NilazaAdminSession);
  dom.window.NilazaRequireCapability = async (capability) => { capabilityChecks.push(capability); return true; };
  const prompts = [];
  dom.window.prompt = (message) => { prompts.push(message); return "nope"; };
  await import(`${pathToFileURL(path.join(root, "apps/admin/content.js")).href}?env-band-test=${Date.now()}`);
  for (let attempt = 0; attempt < 20 && !dom.window.document.querySelector('[data-action="reset-data"]'); attempt += 1) {
    await new Promise((resolve) => dom.window.setTimeout(resolve, 10));
  }
  dom.window.document.querySelector('[data-action="reset-data"]').click();
  await new Promise((resolve) => dom.window.setTimeout(resolve, 20));
  assert.equal(prompts.length, 1);
  assert.match(prompts[0], /Gõ STAGING/);
  assert.equal(capabilityChecks.includes("content.delete"), false);
  dom.window.close();
});
