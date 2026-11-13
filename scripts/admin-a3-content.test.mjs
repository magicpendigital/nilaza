// Admin redesign step A3 (spec ADMIN_SCREENS_SPEC_2026-11-04 rows D7, D8, D10; sections 3.3-3.5, 3.15; review
// AD-01, AD-03, AD-06, AD-07, AD-08, AD-14/15): per-item server drafts and publish with review, history and restore,
// list filters, image upload, the shared timeline page and the whole-bundle fallback when migrations are missing.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test, { after } from "node:test";
import { JSDOM } from "jsdom";
import { buildInitialData } from "../apps/admin/content-model.mjs";
import { toBundlePayload } from "../apps/admin/content-sync.js";
import {
  translationGaps, missingImage, diffItem, matchesFilter, validateImageFile, imageObjectPath, itemPayloadFor,
  workingItemFrom, isMissingFunction, MIGRATIONS
} from "../apps/admin/content-items.js";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(read(file));
const seed = json("apps/admin/generated/content-seed.json");
const plain = (value) => JSON.parse(JSON.stringify(value));
const openDoms = new Set();
after(() => { for (const dom of openDoms) dom.window.close(); });
const OWNER = ["hub.read", "content.read", "content.draft", "content.publish", "content.delete", "ai.read", "ai.manage", "roles.manage", "overview.read"];
const EDITOR = ["hub.read", "content.read", "content.draft", "ai.read"];

// ---- Pure helpers ----
test("translation gaps, missing image and list filters follow spec 3.3-3.5", () => {
  const data = buildInitialData(seed);
  const persona = plain(data.personas[0]);
  assert.deepEqual(translationGaps("personas", persona), []);
  persona.description = { vi: "Mô tả", en: "" };
  assert.deepEqual(translationGaps("personas", persona), ["description.en"]);
  const card = plain(data.cards[0]);
  card.keywords = { vi: ["a"], en: [] };
  assert.deepEqual(translationGaps("cards", card), ["keywords.en"]);
  assert.equal(missingImage(card), true);
  assert.equal(missingImage({ assetPath: "https://x/y.png" }), false);
  const ctx = { hasDraft: (_e, id) => id === "a", hasLocalEdit: (_e, id) => id === "b", liveStatus: (_e, id) => (id === "c" ? "active" : "") };
  assert.equal(matchesFilter("personas", { id: "a", status: "active" }, "draft", ctx), true);
  assert.equal(matchesFilter("personas", { id: "c", status: "active" }, "draft", ctx), false);
  assert.equal(matchesFilter("personas", { id: "c", status: "active" }, "live", ctx), true);
  assert.equal(matchesFilter("personas", { id: "z", status: "draft" }, "draft", ctx), true);
  assert.equal(matchesFilter("cards", { id: "b" }, "unpublished", ctx), true);
  assert.equal(matchesFilter("cards", { id: "c" }, "unpublished", ctx), false);
  assert.equal(matchesFilter("cards", { id: "c", assetPath: "" }, "missing-image", ctx), true);
});

test("card drafts use the compact bundle form and expand back, including a field reverted to the base card", () => {
  const data = buildInitialData(seed);
  const card = data.cards.find((item) => item.deckId === "moon-garden");
  card.name = { ...card.name, vi: "Kẻ Khờ (Moon)" };
  const payload = itemPayloadFor(data, "cards", card.id);
  assert.deepEqual(Object.keys(payload).sort(), ["assetPath", "baseCardId", "deckId", "id", "overrides", "status", "updatedAt", "updatedBy"]);
  assert.deepEqual(payload.overrides, { name: card.name });
  const working = workingItemFrom("cards", payload, data);
  assert.equal(working.name.vi, "Kẻ Khờ (Moon)");
  assert.deepEqual(working.uprightMeaning, data.baseCards.find((base) => base.id === card.baseCardId).uprightMeaning);
  // Reverting to the base text drops the override, so the expanded card shows the base text again.
  card.name = plain(data.baseCards.find((base) => base.id === card.baseCardId).name);
  const reverted = itemPayloadFor(data, "cards", card.id);
  assert.equal(reverted.overrides, undefined);
  assert.deepEqual(workingItemFrom("cards", reverted, data).name, card.name);
});

test("diff splits localized fields per language and ignores bookkeeping fields", () => {
  const rows = diffItem({ name: { vi: "A", en: "A" }, status: "active", updatedAt: "1" }, { name: { vi: "B", en: "A" }, status: "active", updatedAt: "2", themes: ["x", "y"] });
  assert.deepEqual(rows, [{ field: "name", locale: "vi", before: "A", after: "B" }, { field: "themes", locale: "", before: "", after: "x, y" }]);
});

test("image checks: PNG/JPEG/WebP up to 1 MB, new object name per upload in the item's folder", () => {
  assert.match(validateImageFile({ type: "image/svg+xml", size: 10 }), /PNG, JPEG hoặc WebP/);
  assert.match(validateImageFile({ type: "image/png", size: 1048577 }), /lớn hơn 1 MB/);
  assert.equal(validateImageFile({ type: "image/webp", size: 1048576 }), "");
  assert.equal(imageObjectPath("cards", "moon-garden--major-00-fool", { type: "image/jpeg" }, 42), "cards/moon-garden--major-00-fool-42.jpg");
  assert.equal(imageObjectPath("assets", "../x y", { type: "image/png" }, 1), "assets/x-y-1.png");
  assert.equal(isMissingFunction({ code: "PGRST202" }), true);
  assert.equal(isMissingFunction({ missingFunction: true }), true);
  assert.equal(isMissingFunction({ code: "42501" }), false);
});

// ---- Content workspace harness ----
function publishedRow(mutate) {
  const payload = toBundlePayload(buildInitialData(seed));
  mutate?.(payload);
  return { id: "bundle-7", bundle_key: "nilaza_default", version: 7, schema_version: 4, source_version: seed.sourceVersion, payload, status: "published", updated_by: "owner-id", updated_at: "2026-11-13T00:00:00Z" };
}
// A small in-memory server for the per-item RPCs (the SQL itself is verified with PGlite separately).
function fakeServer({ missing = false, row = publishedRow() } = {}) {
  const drafts = new Map();
  const history = new Map();
  let version = 7;
  return {
    drafts, history, row,
    rpc(name, params) {
      if (missing) throw Object.assign(Error("Admin session unavailable"), { code: "PGRST202", missingFunction: true });
      const key = params.p_kind && `${params.p_kind}/${params.p_item_key}`;
      if (name === "list_content_item_drafts") return [...drafts.values()];
      if (name === "save_content_item_draft") {
        const current = drafts.get(key);
        if ((current?.revision ?? 0) !== (params.p_expected_revision ?? 0)) throw Object.assign(Error("Admin session unavailable"), { code: "40001" });
        const saved = { kind: params.p_kind, itemKey: params.p_item_key, version: current?.version ?? (history.get(key)?.length ?? 0) + 1, revision: (current?.revision ?? 0) + 1, status: "draft", payload: params.p_payload, updatedByEmail: "staff@example.invalid", updatedAt: "2026-11-13T10:00:00Z" };
        drafts.set(key, saved);
        return saved;
      }
      if (name === "publish_content_items") {
        version += 1;
        for (const k of params.p_keys) {
          const draft = drafts.get(k);
          drafts.delete(k);
          history.set(k, [{ ...draft, status: "published", note: params.p_note, bundleVersion: version, publishedAt: "2026-11-13T11:00:00Z" }, ...(history.get(k) || []).map((h) => ({ ...h, status: "archived" }))]);
        }
        return { bundleVersion: version, previousVersion: version - 1, published: params.p_keys, personasSynced: params.p_keys.filter((k) => k.startsWith("persona/")).map(() => "aristotle") };
      }
      if (name === "list_content_item_history") return [...(drafts.has(key) ? [drafts.get(key)] : []), ...(history.get(key) || [])];
      if (name === "restore_content_item_version") {
        const source = (history.get(key) || []).find((h) => h.version === params.p_version);
        const restored = { ...source, status: "draft", version: (history.get(key)?.length ?? 0) + 1, revision: 1, restoredFromVersion: source.version };
        drafts.set(key, restored);
        return restored;
      }
      if (name === "discard_content_item_draft") return drafts.delete(key);
      throw Error(`unexpected rpc ${name}`);
    }
  };
}
async function contentAt(route, { capabilities = OWNER, server = fakeServer(), upload, userId = "staff-1", preseed } = {}) {
  const html = read("apps/admin/content.html").replace(/<script[^>]+src="\.\/workspace-guard\.js"><\/script>/, "").replace(/<script type="module" src="\.\/content\.js"><\/script>/, "");
  const dom = new JSDOM(html, { url: `http://localhost:4173/apps/admin/content.html#${route}`, pretendToBeVisual: true });
  openDoms.add(dom);
  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.localStorage = window.localStorage;
  globalThis.location = window.location;
  globalThis.fetch = async (url) => {
    const request = String(url);
    if (request.includes("admin-capabilities.json")) return { ok: true, json: async () => json("apps/admin/admin-capabilities.json") };
    if (request.includes("generated/content-seed.json")) return { ok: true, json: async () => json("apps/admin/generated/content-seed.json") };
    return { ok: false, json: async () => ({}) };
  };
  const calls = [];
  const query = { select: () => query, eq: () => query, order: () => query, limit: async () => ({ data: [server.row], error: null }) };
  const bucket = {
    upload: async (objectPath, file, options) => { calls.push(["upload", objectPath, options]); return upload ? upload(objectPath, file) : { data: { path: objectPath }, error: null }; },
    getPublicUrl: (objectPath) => ({ data: { publicUrl: `https://etfajmrwyywokgafzxsb.supabase.co/storage/v1/object/public/content-images/${objectPath}` } })
  };
  window.ENV = { SUPABASE_URL: "https://etfajmrwyywokgafzxsb.supabase.co", SUPABASE_ANON_KEY: "public-test-key" };
  window.supabase = { createClient: () => ({ auth: { getSession: async () => ({ data: { session: { user: { id: userId } } }, error: null }) }, from: () => query, storage: { from: (name) => { calls.push(["bucket", name]); return bucket; } } }) };
  window.NilazaAdminSession = { email: "staff@example.invalid", role: capabilities.includes("content.publish") ? "owner" : "editor", userId, capabilities };
  window.NilazaAdminSessionPromise = Promise.resolve(window.NilazaAdminSession);
  window.NilazaRequireCapability = async (capability) => capabilities.includes(capability);
  window.NilazaAdminRpc = async (name, params, capability) => { calls.push([name, plain(params), capability]); return plain(await server.rpc(name, params)); };
  window.confirm = () => true;
  window.prompt = () => null;
  preseed?.(window);
  await import(`${pathToFileURL(path.join(root, "apps/admin/content.js")).href}?a3=${Date.now()}-${Math.random()}`);
  const doc = window.document;
  for (let attempt = 0; attempt < 50 && !doc.querySelector("#workspace-content").children.length; attempt += 1) await new Promise((resolve) => window.setTimeout(resolve, 10));
  return { dom, window, doc, calls, server, rpcCalls: () => calls.filter((call) => call[0] !== "upload" && call[0] !== "bucket") };
}
// Unsaved edits are stored per account and Supabase project (no cross-account leak).
const editsKey = `nilaza.admin.content.item-edits.v1:staff-1:${encodeURIComponent("https://etfajmrwyywokgafzxsb.supabase.co")}`;
const settle = async (h) => { for (let i = 0; i < 10; i += 1) await new Promise((resolve) => h.window.setTimeout(resolve, 5)); };
const click = async (h, selector) => { const element = h.doc.querySelector(selector); assert.ok(element, selector); element.click(); await settle(h); };
function type(h, selector, value) {
  const field = h.doc.querySelector(selector);
  field.value = value;
  field.dispatchEvent(new h.window.Event("input", { bubbles: true }));
  field.dispatchEvent(new h.window.Event("change", { bubbles: true }));
}
function cleanup() { for (const key of ["window", "document", "localStorage", "location", "fetch"]) delete globalThis[key]; }

test("owner: Lưu nháp saves one item to the server, review shows the diff and publishes only that item with a note", async () => {
  const h = await contentAt("personas");
  try {
    assert.deepEqual(h.rpcCalls().map((call) => [call[0], call[2]]), [["list_content_item_drafts", "content.read"]]);
    assert.match(h.doc.querySelector("[data-item-state]").textContent, /Đang giống bản trong app/);
    type(h, '[data-entity="personas"][data-field="description"][data-locale="vi"]', "Mô tả mới cho Aristotle");
    await settle(h);
    assert.ok(h.doc.querySelector('[data-select="persona"][data-id="figure-aristotle"] [data-chip="unsaved"]'), "unsaved chip");
    assert.equal(JSON.parse(h.window.localStorage.getItem(editsKey)).length, 1, "AD-03: the edit survives a reload");
    await click(h, '[data-action="save"][data-id="figure-aristotle"]');
    const save = h.rpcCalls().find((call) => call[0] === "save_content_item_draft");
    assert.equal(save[2], "content.draft");
    assert.equal(save[1].p_kind, "persona"); assert.equal(save[1].p_item_key, "figure-aristotle"); assert.equal(save[1].p_expected_revision, 0);
    assert.equal(save[1].p_payload.description.vi, "Mô tả mới cho Aristotle");
    assert.ok(h.doc.querySelector('[data-select="persona"][data-id="figure-aristotle"] [data-chip="draft"]'), "draft chip after save");
    assert.equal(JSON.parse(h.window.localStorage.getItem(editsKey)).length, 0);
    assert.equal(h.rpcCalls().filter((call) => call[0] === "publish_content_bundle").length, 0);

    await click(h, '[data-action="publish"][data-id="figure-aristotle"]');
    const panel = h.doc.querySelector("[data-review-panel]");
    assert.ok(panel, "review panel");
    assert.match(panel.textContent, /Mô tả · VI/);
    assert.match(panel.textContent, /Mô tả mới cho Aristotle/);
    assert.match(panel.textContent, /chỉ phát hành mục này; nháp của mục khác giữ nguyên/);
    assert.ok(h.doc.querySelector('label[for="publish-note"]'));
    await click(h, '[data-action="confirm-publish"]');
    assert.equal(h.rpcCalls().filter((call) => call[0] === "publish_content_items").length, 0, "no publish without a note");
    assert.match(h.doc.querySelector("#notice").textContent, /5–500 ký tự/);
    type(h, "#publish-note", "Cập nhật mô tả Aristotle");
    await click(h, '[data-action="confirm-publish"]');
    const publish = h.rpcCalls().find((call) => call[0] === "publish_content_items");
    assert.deepEqual(publish[1], { p_keys: ["persona/figure-aristotle"], p_note: "Cập nhật mô tả Aristotle", p_expected_published_version: 7 });
    assert.equal(publish[2], "content.publish");
    assert.match(h.doc.querySelector("#notice").textContent, /Đã phát hành 1 mục \(gói nội dung v8\)[\s\S]*aristotle/);
    assert.equal(h.doc.querySelector("[data-review-panel]"), null);
  } finally { cleanup(); }
});

test("history lists versions and Khôi phục creates a new draft from an old version (AD-07)", async () => {
  const server = fakeServer();
  server.history.set("persona/figure-aristotle", [
    { kind: "persona", itemKey: "figure-aristotle", version: 2, status: "published", note: "Bản hai", bundleVersion: 9, payload: { ...plainPersona(), description: { vi: "hai", en: "two" } }, updatedByEmail: "owner@example.invalid", updatedAt: "2026-11-12T00:00:00Z", publishedAt: "2026-11-12T00:00:00Z" },
    { kind: "persona", itemKey: "figure-aristotle", version: 1, status: "archived", note: "Bản một", bundleVersion: 8, payload: { ...plainPersona(), description: { vi: "một", en: "one" } }, updatedByEmail: "owner@example.invalid", updatedAt: "2026-11-11T00:00:00Z", publishedAt: "2026-11-11T00:00:00Z" }
  ]);
  const h = await contentAt("personas", { capabilities: EDITOR, server });
  try {
    await click(h, '[data-action="history"][data-id="figure-aristotle"]');
    const panel = h.doc.querySelector("[data-history-panel]");
    assert.match(panel.textContent, /Phiên bản 2 · Đang dùng[\s\S]*Bản hai[\s\S]*Phiên bản 1 · Bản cũ[\s\S]*Bản một/);
    await click(h, '[data-history-version="1"] [data-action="restore-version"]');
    const restore = h.rpcCalls().find((call) => call[0] === "restore_content_item_version");
    assert.deepEqual(restore[1], { p_kind: "persona", p_item_key: "figure-aristotle", p_version: 1, p_expected_revision: 0 });
    assert.equal(restore[2], "content.draft");
    assert.equal(h.doc.querySelector('[data-entity="personas"][data-field="description"][data-locale="vi"]').value, "một");
    assert.match(h.doc.querySelector("#notice").textContent, /nháp mới từ phiên bản 1/);
    assert.ok(h.doc.querySelector('[data-action="discard-draft"][data-id="figure-aristotle"]'));
  } finally { cleanup(); }
});
function plainPersona() { return plain(buildInitialData(seed).personas[0]); }

test("editor (Owner decision 6): saves drafts of live items, cannot change status or publish, sees chờ Owner phát hành", async () => {
  const h = await contentAt("personas", { capabilities: EDITOR });
  try {
    assert.equal(h.doc.querySelector('[data-action="publish"]'), null);
    const waiting = [...h.doc.querySelectorAll(".action-bar .button.primary")].find((button) => /Chờ Owner phát hành/.test(button.textContent));
    assert.ok(waiting?.disabled, "disabled Chờ Owner phát hành");
    assert.equal(h.doc.querySelector('[data-entity="personas"][data-field="status"]').disabled, true, "status is a publish decision");
    assert.equal(h.doc.querySelector('[data-action="archive"]').disabled, true);
    type(h, '[data-entity="personas"][data-field="name"][data-locale="vi"]', "Aristotle (sửa)");
    await click(h, '[data-action="save"][data-id="figure-aristotle"]');
    const save = h.rpcCalls().find((call) => call[0] === "save_content_item_draft");
    assert.equal(save[1].p_payload.name.vi, "Aristotle (sửa)");
    assert.equal(save[1].p_payload.status, "active", "status unchanged");
    assert.match(h.doc.querySelector("[data-item-state]").textContent, /Chờ Owner phát hành/);
  } finally { cleanup(); }
});

test("a stale save is refused and the edit stays on this browser", async () => {
  const server = fakeServer();
  server.drafts.set("persona/figure-aristotle", { kind: "persona", itemKey: "figure-aristotle", version: 1, revision: 3, status: "draft", payload: plainPersona(), updatedByEmail: "other@example.invalid", updatedAt: "2026-11-13T09:00:00Z" });
  const h = await contentAt("personas", { server });
  try {
    assert.ok(h.doc.querySelector('[data-select="persona"][data-id="figure-aristotle"] [data-chip="draft"]'), "server draft shown on load");
    server.drafts.get("persona/figure-aristotle").revision = 4; // someone else saved meanwhile
    type(h, '[data-entity="personas"][data-field="name"][data-locale="vi"]', "Tên mới");
    await click(h, '[data-action="save"][data-id="figure-aristotle"]');
    assert.equal(h.rpcCalls().find((call) => call[0] === "save_content_item_draft")[1].p_expected_revision, 3);
    assert.match(h.doc.querySelector("#notice").textContent, /Người khác vừa lưu hoặc phát hành mục này/);
    assert.ok(h.doc.querySelector('[data-select="persona"][data-id="figure-aristotle"] [data-chip="unsaved"]'));
  } finally { cleanup(); }
});

test("unsaved edits of one account are not loaded for another account on the same browser", async () => {
  const edit = { entity: "personas", id: "figure-aristotle", baseRevision: 0, item: { ...plainPersona(), name: { vi: "Tên người khác", en: "Other name" } } };
  const h = await contentAt("personas", { userId: "staff-2", preseed: (window) => { window.localStorage.setItem(editsKey, JSON.stringify([edit])); window.localStorage.setItem("nilaza.admin.content.item-edits.v1", JSON.stringify([edit])); } });
  try {
    assert.equal(h.doc.querySelector('[data-select="persona"][data-id="figure-aristotle"] [data-chip="unsaved"]'), null, "staff-1's edit is not applied for staff-2");
    assert.doesNotMatch(h.doc.body.textContent, /Tên người khác/);
  } finally { cleanup(); }
});

test("78-card list filters Thiếu bản dịch / Thiếu ảnh / Sửa chưa phát hành and image upload fills the path", async () => {
  const row = publishedRow((payload) => {
    const card = payload.cards.find((item) => item.id === "moon-garden--major-00-fool");
    card.assetPath = "assets/tarot/moon-garden/major-00-fool.png";
    const other = payload.cards.find((item) => item.id === "moon-garden--major-01-magician");
    other.overrides = { name: { vi: "Nhà Ảo Thuật", en: "" } };
  });
  const server = fakeServer({ row });
  server.drafts.set("card/moon-garden--major-02-high-priestess", { kind: "card", itemKey: "moon-garden--major-02-high-priestess", version: 1, revision: 1, status: "draft", payload: { id: "moon-garden--major-02-high-priestess", baseCardId: "major-02-high-priestess", deckId: "moon-garden", status: "published", assetPath: "", overrides: { name: { vi: "Nữ Tư Tế", en: "The High Priestess" } } }, updatedByEmail: "staff@example.invalid", updatedAt: "2026-11-13T09:00:00Z" });
  const h = await contentAt("cards", { server });
  try {
    const shown = () => [...h.doc.querySelectorAll('[data-select="card"]')].map((button) => button.dataset.id);
    assert.equal(shown().length, 78);
    const filter = h.doc.querySelector('[data-list-filter="cards"]');
    assert.deepEqual([...filter.options].map((option) => option.textContent), ["Tất cả", "Thiếu bản dịch", "Thiếu ảnh", "Sửa chưa phát hành"]);
    for (const [value, expected] of [["missing-translation", ["moon-garden--major-01-magician"]], ["unpublished", ["moon-garden--major-02-high-priestess"]]]) {
      h.doc.querySelector('[data-list-filter="cards"]').value = value;
      h.doc.querySelector('[data-list-filter="cards"]').dispatchEvent(new h.window.Event("change", { bubbles: true }));
      assert.deepEqual(shown(), expected, value);
    }
    h.doc.querySelector('[data-list-filter="cards"]').value = "missing-image";
    h.doc.querySelector('[data-list-filter="cards"]').dispatchEvent(new h.window.Event("change", { bubbles: true }));
    assert.equal(shown().length, 77);
    assert.match(h.doc.querySelector("[data-list-count]").textContent, /77\/78/);

    // Upload: wrong type is refused before any network call; a PNG is uploaded and fills Đường dẫn hình.
    const pick = (file) => { const input = h.doc.querySelector("[data-upload-image]"); Object.defineProperty(input, "files", { value: [file], configurable: true }); input.dispatchEvent(new h.window.Event("change", { bubbles: true })); };
    pick(new h.window.File(["<svg/>"], "x.svg", { type: "image/svg+xml" }));
    await settle(h);
    assert.match(h.doc.querySelector("#notice").textContent, /Chỉ nhận ảnh PNG, JPEG hoặc WebP/);
    assert.equal(h.calls.filter((call) => call[0] === "upload").length, 0);
    const cardId = h.doc.querySelector("[data-upload-image]").dataset.id;
    pick(new h.window.File([new Uint8Array(10)], "card.png", { type: "image/png" }));
    await settle(h);
    const upload = h.calls.find((call) => call[0] === "upload");
    assert.match(upload[1], new RegExp(`^cards/${cardId}-\\d+\\.png$`));
    assert.equal(upload[2].upsert, false);
    assert.ok(h.calls.some((call) => call[0] === "bucket" && call[1] === "content-images"));
    assert.match(h.doc.querySelector(`[data-entity="cards"][data-id="${cardId}"][data-field="assetPath"]`).value, /\/storage\/v1\/object\/public\/content-images\/cards\//);
    h.doc.querySelector('[data-list-filter="cards"]').value = "all";
    h.doc.querySelector('[data-list-filter="cards"]').dispatchEvent(new h.window.Event("change", { bubbles: true }));
    assert.ok(h.doc.querySelector(`[data-select="card"][data-id="${cardId}"] [data-chip="unsaved"]`));
  } finally { cleanup(); }
});

test("missing content-images bucket: upload says which migration the Owner must apply", async () => {
  const h = await contentAt("cards", { upload: async () => ({ data: null, error: { message: "Bucket not found", statusCode: "404" } }) });
  try {
    const input = h.doc.querySelector("[data-upload-image]");
    Object.defineProperty(input, "files", { value: [new h.window.File([new Uint8Array(4)], "a.webp", { type: "image/webp" })], configurable: true });
    input.dispatchEvent(new h.window.Event("change", { bubbles: true }));
    await settle(h);
    assert.match(h.doc.querySelector("[data-upload-missing]").textContent, new RegExp(MIGRATIONS.bucket));
    assert.match(h.doc.querySelector("#notice").textContent, /cần Owner áp dụng migration 20261113100200_content_images_bucket\.sql/);
  } finally { cleanup(); }
});

test("without migration 20261113100000 the page keeps the whole-bundle path and names the migration", async () => {
  const h = await contentAt("personas", { server: fakeServer({ missing: true }) });
  try {
    const note = h.doc.querySelector('[data-item-mode="bundle"]');
    assert.ok(note, "bundle-mode note");
    assert.match(note.textContent, /20261113100000_admin_content_items\.sql/);
    assert.equal(h.doc.querySelector("[data-item-state]"), null);
    assert.ok(h.doc.querySelector('[data-action="publish"]'), "old publish button stays");
    assert.equal(h.doc.querySelector('[data-action="history"]'), null);
  } finally { cleanup(); }
});

test("filters for personas: Đang dùng / Nháp / Thiếu bản dịch", async () => {
  const server = fakeServer();
  server.drafts.set("persona/figure-laozi", { kind: "persona", itemKey: "figure-laozi", version: 1, revision: 1, status: "draft", payload: plain(buildInitialData(seed).personas.find((p) => p.id === "figure-laozi")), updatedByEmail: "staff@example.invalid", updatedAt: "2026-11-13T09:00:00Z" });
  const h = await contentAt("personas", { server });
  try {
    const filter = h.doc.querySelector('[data-list-filter="personas"]');
    assert.deepEqual([...filter.options].map((option) => option.textContent), ["Tất cả", "Đang dùng", "Nháp", "Thiếu bản dịch"]);
    filter.value = "draft";
    filter.dispatchEvent(new h.window.Event("change", { bubbles: true }));
    assert.deepEqual([...h.doc.querySelectorAll('[data-select="persona"]')].map((button) => button.dataset.id), ["figure-laozi"]);
    const live = h.doc.querySelector('[data-list-filter="personas"]');
    live.value = "live";
    live.dispatchEvent(new h.window.Event("change", { bubbles: true }));
    assert.equal(h.doc.querySelectorAll('[data-select="persona"]').length, seed.personas.filter((p) => p.status === "active").length);
  } finally { cleanup(); }
});

// ---- Timeline page ----
function timelineHarness(rpc) {
  const html = read("apps/admin/timeline.html").replace(/<script[\s\S]*?<\/script>/g, "");
  const dom = new JSDOM(html, { url: "http://localhost/apps/admin/timeline.html", runScripts: "outside-only", pretendToBeVisual: true });
  openDoms.add(dom);
  const w = dom.window, calls = [];
  w.NilazaAdminSession = { userId: "u1", capabilities: ["hub.read"] };
  w.NilazaAdminSessionPromise = Promise.resolve(w.NilazaAdminSession);
  w.NilazaAdminRpc = async (...args) => { calls.push(plain(args)); return rpc(...args); };
  w.eval(read("apps/admin/timeline.js"));
  return { dom, w, doc: w.document, calls };
}
const tick = async (w) => { for (let i = 0; i < 6; i += 1) await new Promise((resolve) => w.setTimeout(resolve, 0)); };
const timelineRow = (i, action, extra = {}) => ({ source: "audit", id: `r${i}`, createdAt: new Date(Date.UTC(2026, 10, 13, 12, 0, 0) - i * 60000).toISOString(), actorEmail: "owner@example.invalid", action, targetTable: "x", details: {}, note: null, ...extra });

test("Lịch sử thao tác reads get_admin_timeline (hub.read), labels actions in Vietnamese, filters and pages backwards", async () => {
  const first = [timelineRow(0, "content.items.publish", { note: "Cập nhật mô tả", details: { items: ["persona/figure-aristotle"], bundleVersion: 8 } }), timelineRow(1, "ai.feature_switch", { note: "QA pause", details: { feature: "oracle_router", enabled: false } }),
    ...Array.from({ length: 48 }, (_, i) => timelineRow(i + 2, "content.item.draft", { details: { kind: "card", key: `c${i}`, version: 1 } }))];
  const h = timelineHarness((name, params) => (params.p_before ? [timelineRow(60, "safety.review", { details: { status: "reviewed" } })] : first));
  await tick(h.w);
  assert.deepEqual(h.calls[0], ["get_admin_timeline", { p_limit: 50, p_before: null }, "hub.read"]);
  const rows = [...h.doc.querySelectorAll("[data-timeline-row]")];
  assert.equal(rows.length, 50);
  assert.match(rows[0].textContent, /Phát hành nội dung[\s\S]*owner@example\.invalid[\s\S]*Người dẫn figure-aristotle · gói v8[\s\S]*Cập nhật mô tả/);
  assert.match(rows[1].textContent, /Bật\/tắt tính năng AI[\s\S]*Tính năng oracle_router · tắt[\s\S]*QA pause/);
  const filter = h.doc.querySelector("#timeline-filter");
  assert.ok(h.doc.querySelector('label[for="timeline-filter"]'));
  filter.value = "ai";
  filter.dispatchEvent(new h.w.Event("change", { bubbles: true }));
  assert.equal(h.doc.querySelectorAll("[data-timeline-row]").length, 1);
  filter.value = "all";
  filter.dispatchEvent(new h.w.Event("change", { bubbles: true }));
  h.doc.querySelector("[data-timeline-more]").click();
  await tick(h.w);
  assert.deepEqual(h.calls[1], ["get_admin_timeline", { p_limit: 50, p_before: first[49].createdAt }, "hub.read"]);
  assert.equal(h.doc.querySelectorAll("[data-timeline-row]").length, 51);
  assert.equal(h.doc.querySelector("[data-timeline-more]"), null);
  assert.doesNotMatch(h.doc.body.innerHTML, /<script/);
});

test("Lịch sử thao tác names migration 20261113100100 when the RPC is missing", async () => {
  const h = timelineHarness(() => { throw Object.assign(Error("Admin session unavailable"), { code: "PGRST202", missingFunction: true }); });
  await tick(h.w);
  assert.match(h.doc.querySelector("[data-timeline-missing]").textContent, /20261113100100_admin_timeline\.sql/);
  assert.equal(h.doc.querySelector("[data-go]").dataset.go, "#/ai-studio/audit");
});

// ---- Contract checks ----
test("RPC allowlist, manifest and migrations keep the A3 permission rules", () => {
  const guard = read("apps/admin/workspace-guard.js");
  for (const [name, capability] of [["list_content_item_drafts", "content.read"], ["list_content_item_history", "content.read"], ["save_content_item_draft", "content.draft"], ["restore_content_item_version", "content.draft"], ["discard_content_item_draft", "content.draft"], ["publish_content_items", "content.publish"], ["get_admin_timeline", "hub.read"]]) {
    assert.ok(guard.includes(`${name}: "${capability}"`), name);
  }
  assert.ok(guard.includes('"timeline.html": "hub.read"'));
  const manifest = json("apps/admin/admin-capabilities.json");
  const timeline = manifest.workspaces.find((workspace) => workspace.id === "timeline");
  assert.equal(timeline.entry, "timeline.html");
  assert.deepEqual(timeline.requiredCapabilities, ["hub.read"]);
  assert.ok(manifest.workspaces.find((workspace) => workspace.id === "content") && manifest.workspaces.find((workspace) => workspace.id === "ai-studio"), "content and AI Studio stay separate workspaces");
  assert.doesNotMatch(read("apps/admin/content.js"), /from "\.\/app\.js"/);
  const items = read(`supabase/migrations/${MIGRATIONS.items}`);
  for (const fn of ["list_content_item_drafts", "save_content_item_draft", "discard_content_item_draft", "list_content_item_history", "restore_content_item_version", "publish_content_items"]) {
    assert.match(items, new RegExp(`create function public\\.${fn}\\([\\s\\S]*?security definer set search_path = ''`), fn);
  }
  assert.match(items, /revoke all on table public\.admin_content_item_versions from public, anon, authenticated/);
  assert.match(items, /has_capability\('content\.publish'\)/);
  const timelineSql = read(`supabase/migrations/${MIGRATIONS.timeline}`);
  assert.match(timelineSql, /has_capability\('hub\.read'\)/);
  assert.match(timelineSql, /revoke all on function public\.get_admin_timeline\(integer, timestamptz\) from public, anon, authenticated/);
  const bucket = read(`supabase/migrations/${MIGRATIONS.bucket}`);
  assert.match(bucket, /'content-images', 'content-images', true, 1048576, array\['image\/png', 'image\/jpeg', 'image\/webp'\]/);
  assert.match(bucket, /has_capability\('content\.draft'\)/);
  assert.doesNotMatch(bucket, /image\/svg/);
});
