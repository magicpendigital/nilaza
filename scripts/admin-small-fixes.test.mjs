import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { JSDOM } from "jsdom";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("every Admin page pins supabase-js instead of the floating @2", () => {
  for (const page of fs.readdirSync(path.join(root, "apps/admin")).filter((file) => file.endsWith(".html"))) {
    assert.doesNotMatch(read(`apps/admin/${page}`), /supabase-js@2"/, page);
  }
});

test("sign-in errors are told apart", () => {
  const source = read("apps/admin/shell.js");
  const body = source.slice(source.indexOf("function signInErrorMessage"), source.indexOf("window.NilazaSignInErrorMessage"));
  const message = new Function(`${body}; return signInErrorMessage;`)();
  assert.match(message({ code: "invalid_credentials", status: 400 }), /mật khẩu chưa đúng/);
  assert.match(message({ code: "email_not_confirmed", status: 400 }), /chưa được xác nhận/);
  assert.match(message({ status: 429, message: "rate limit" }), /quá nhiều lần/);
  assert.match(message({ message: "Failed to fetch" }), /Không kết nối/);
});

test("typing in Content search keeps focus on the search box", async () => {
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
  await import(`${pathToFileURL(path.join(root, "apps/admin/content.js")).href}?search-focus-test=${Date.now()}`);
  for (let attempt = 0; attempt < 20 && !dom.window.document.querySelector("[data-search]"); attempt += 1) {
    await new Promise((resolve) => dom.window.setTimeout(resolve, 10));
  }
  const search = dom.window.document.querySelector("[data-search]");
  search.focus();
  search.value = "ar";
  search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  const after = dom.window.document.querySelector("[data-search]");
  assert.equal(dom.window.document.activeElement, after);
  assert.equal(after.value, "ar");
  dom.window.close();
});
