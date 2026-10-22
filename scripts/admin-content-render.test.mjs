import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { JSDOM } from "jsdom";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(read(file));

test("asset management renders visual previews for front-end media paths", async () => {
  const html = read("apps/admin/content.html").replace(/<script[^>]+src="\.\/workspace-guard\.js"><\/script>/, "").replace(/<script type="module" src="\.\/content\.js"><\/script>/, "");
  const dom = new JSDOM(html, {
    url: "http://localhost:4173/apps/admin/content.html#assets",
    pretendToBeVisual: true
  });

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.location = dom.window.location;
  globalThis.fetch = async (url) => {
    const request = String(url);
    if (request.includes("admin-capabilities.json")) return { ok: true, json: async () => json("apps/admin/admin-capabilities.json") };
    if (request.includes("generated/content-seed.json")) return { ok: true, json: async () => json("apps/admin/generated/content-seed.json") };
    return { ok: false, json: async () => ({}) };
  };
  dom.window.NilazaAdminSession = { email: "owner@nilaza.ai", role: "owner" };
  dom.window.NilazaAdminSessionPromise = Promise.resolve(dom.window.NilazaAdminSession);
  dom.window.NilazaRequireCapability = async () => true;

  await import(`${pathToFileURL(path.join(root, "apps/admin/content.js")).href}?asset-preview-test=${Date.now()}`);

  for (let attempt = 0; attempt < 20 && !dom.window.document.querySelector("[data-asset-preview]"); attempt += 1) {
    await new Promise((resolve) => dom.window.setTimeout(resolve, 10));
  }

  const previews = [...dom.window.document.querySelectorAll(".asset-preview")];
  const images = [...dom.window.document.querySelectorAll("[data-asset-preview]")];
  assert.ok(previews.length > 0, "Assets route should render preview containers.");
  assert.ok(images.length > 0, "Assets route should render image previews, not path-only cards.");
  assert.ok(images[0].getAttribute("src").startsWith("/assets/"), "Repository asset paths should resolve from the app root.");
  assert.match(dom.window.document.body.textContent, /Front-end preview/);
  assert.match(dom.window.document.body.textContent, /Open image/);

  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.localStorage;
  delete globalThis.location;
  delete globalThis.fetch;
});
