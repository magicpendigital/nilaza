import {
  STORAGE_KEY, buildInitialData, permissionsFor, createDraftPersona, createDraftDeck, createDraftAsset,
  updateEntity, publishEntity, archiveEntity, deleteEntity, restoreSeedRecord,
  recordLabel, countCardsForDeck, logAction, migrateLegacyDeckIdentity
} from "./content-model.mjs";
import { createContentSync, fromBundleRecord, toBundlePayload } from "./content-sync.js";
import {
  ITEM_KINDS, ENTITY_BY_KIND, MIGRATIONS, LIST_FILTERS, itemKey, itemPayloadFor, workingItemFrom, applyItemToData,
  diffItem, matchesFilter, translationGaps, missingImage, isMissingFunction, validateImageFile, imageObjectPath
} from "./content-items.js";

const session = await window.NilazaAdminSessionPromise;
// Buttons follow the capabilities the server checks (AD-14), not the role name. Older sessions without a
// capability list fall back to the role table.
const roleFallback = permissionsFor(session?.role);
const sessionCapabilities = Array.isArray(session?.capabilities) ? new Set(session.capabilities) : null;
const can = (capability) => sessionCapabilities ? sessionCapabilities.has(capability)
  : ({ "content.draft": roleFallback.canEdit, "content.publish": roleFallback.canPublish, "content.delete": roleFallback.canDelete }[capability] ?? roleFallback.canView);
const permissions = {
  canView: can("content.read"), canEdit: can("content.draft"), canPublish: can("content.publish"), canDelete: can("content.delete"),
  canManageAssets: sessionCapabilities ? can("content.draft") : roleFallback.canManageAssets
};
if (window.top !== window.self) document.body.classList.add("embedded");
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const local = (value, locale = state.locale) => value?.[locale] ?? value?.en ?? value?.vi ?? "";
const statusClass = (status) => ["active", "published", "draft", "review", "archived"].includes(status) ? status : "";

let manifest;
let repositorySeed;
let seedData;
let data;
let contentSync;
let remoteState;
let legacyIdentityConflictNotice = "";
const OUTBOX_KEY = "nilaza.admin.content.outbox.v1";
const unsavedRecords = new Set();
function reportUnsaved() {
  const count = unsavedRecords.size || (loadOutbox() ? 1 : 0);
  window.NilazaUnsaved?.set("content", count);
  const indicator = document.querySelector("#unsaved-count");
  if (indicator) {
    indicator.textContent = count ? `${count} thay đổi chưa lưu` : "";
    indicator.hidden = !count;
  }
  return count;
}
function markUnsaved(entity, id) {
  unsavedRecords.add(`${entity}/${id}`);
  if (items.mode === "items") rememberLocalEdit(entity, id);
  reportUnsaved();
}

// ---- Per-item drafts on the server (A3, D7) ----
// mode "items": the server has migration 20261113100000; data = published bundle + every open server draft + this
// browser's unsaved edits. mode "bundle": the older whole-bundle drafts and publish (fallback).
const items = { mode: "unknown", missing: "", drafts: new Map(), published: null, review: null, history: null, busy: false, imageMissing: false };
const LOCAL_EDITS_KEY = "nilaza.admin.content.item-edits.v1";
// Unsaved edits belong to one account on one Supabase project (same scoping as the AI Studio drafts), so another
// account on this browser, or staging versus production, never inherits them. Without an account nothing persists.
function localEditsStorageKey() {
  const account = session?.userId || window.NilazaAdminSession?.userId;
  if (!account) return null;
  const target = typeof window.NilazaAdminTransportTarget === "string" ? window.NilazaAdminTransportTarget : window.ENV?.SUPABASE_URL || "local-preview";
  return `${LOCAL_EDITS_KEY}:${encodeURIComponent(account)}:${encodeURIComponent(target)}`;
}
let localEdits = new Map();
function loadLocalEdits() {
  try {
    const key = localEditsStorageKey();
    if (!key) return new Map();
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return new Map((Array.isArray(value) ? value : []).filter((entry) => ITEM_KINDS[entry?.entity] && entry.item?.id === entry.id).map((entry) => [itemKey(entry.entity, entry.id), entry]));
  } catch (_error) { return new Map(); }
}
function persistLocalEdits() {
  try { const key = localEditsStorageKey(); if (key) localStorage.setItem(key, JSON.stringify([...localEdits.values()])); } catch (_error) { /* in-memory copy still holds the edit */ }
}
function rememberLocalEdit(entity, id) {
  const record = data[entity]?.find((item) => item.id === id);
  if (!record || !ITEM_KINDS[entity]) return;
  const key = itemKey(entity, id);
  const baseRevision = localEdits.get(key)?.baseRevision ?? items.drafts.get(key)?.revision ?? 0;
  localEdits.set(key, { entity, id, baseRevision, item: JSON.parse(JSON.stringify(record)) });
  persistLocalEdits();
}
function forgetLocalEdit(entity, id) {
  localEdits.delete(itemKey(entity, id));
  unsavedRecords.delete(`${entity}/${id}`);
  persistLocalEdits();
  reportUnsaved();
}
const itemRpc = (name, params, capability) => {
  if (typeof window.NilazaAdminRpc !== "function") throw Object.assign(Error("Admin RPC helper unavailable"), { missingFunction: true });
  return window.NilazaAdminRpc(name, params, capability);
};
const hasDraft = (entity, id) => items.drafts.has(itemKey(entity, id));
const hasLocalEdit = (entity, id) => unsavedRecords.has(`${entity}/${id}`);
const publishedItem = (entity, id) => items.published?.[entity]?.find((record) => record.id === id) || null;
const liveStatus = (entity, id) => items.mode === "items" ? publishedItem(entity, id)?.status || "" : data[entity]?.find((record) => record.id === id)?.status || "";
function itemErrorMessage(error) {
  if (error?.code === "40001") return "Người khác vừa lưu hoặc phát hành mục này. Bấm “Đồng bộ với máy chủ” để xem bản mới; thay đổi của bạn vẫn giữ trên trình duyệt này.";
  if (error?.code === "42501") return "Máy chủ từ chối: biên tập viên chỉ lưu nháp và không đổi được trạng thái đang dùng. Owner phát hành.";
  if (error?.code === "22023") return "Máy chủ từ chối dữ liệu hoặc ghi chú (ghi chú 5–500 ký tự; mục phải có nháp).";
  return `Không lưu được lên máy chủ: ${error?.message || "lỗi không rõ"}`;
}
function switchToBundleMode() {
  items.mode = "bundle";
  items.missing = MIGRATIONS.items;
  items.review = null; items.history = null;
}
async function loadItemDrafts() {
  if (typeof window.NilazaAdminRpc !== "function" || !contentSync) { items.mode = "bundle"; return false; }
  try {
    const rows = await itemRpc("list_content_item_drafts", {}, "content.read");
    items.drafts = new Map((Array.isArray(rows) ? rows : []).filter((row) => ENTITY_BY_KIND[row.kind]).map((row) => [`${row.kind}/${row.itemKey}`, row]));
    items.mode = "items"; items.missing = "";
    return true;
  } catch (error) {
    if (isMissingFunction(error)) { switchToBundleMode(); return false; }
    throw error;
  }
}
// Working data = published bundle, then every server draft, then this browser's unsaved edits (AD-03: nothing typed
// is silently replaced on reload).
function rebuildFromServer() {
  const published = remoteState?.published;
  if (!published) return false;
  items.published = fromBundleRecord(published);
  const previousAudit = Array.isArray(data?.audit) ? data.audit : [];
  data = { ...JSON.parse(JSON.stringify(items.published)), audit: previousAudit };
  for (const row of items.drafts.values()) {
    const entity = ENTITY_BY_KIND[row.kind];
    applyItemToData(data, entity, workingItemFrom(entity, row.payload, data));
  }
  unsavedRecords.clear();
  for (const edit of localEdits.values()) {
    applyItemToData(data, edit.entity, JSON.parse(JSON.stringify(edit.item)));
    unsavedRecords.add(`${edit.entity}/${edit.id}`);
  }
  setSyncState("published", published);
  reportUnsaved();
  return true;
}
async function reloadItems() {
  remoteState = await contentSync.load();
  if (await loadItemDrafts()) rebuildFromServer();
}
async function saveItem(entity, id, { quiet = false } = {}) {
  const key = itemKey(entity, id);
  const payload = itemPayloadFor(data, entity, id);
  const expected = localEdits.get(key)?.baseRevision ?? items.drafts.get(key)?.revision ?? 0;
  const row = await itemRpc("save_content_item_draft", { p_kind: ITEM_KINDS[entity], p_item_key: id, p_payload: payload, p_expected_revision: expected }, "content.draft");
  items.drafts.set(key, row);
  forgetLocalEdit(entity, id);
  saveData();
  if (!quiet) notify(`Đã lưu nháp lên máy chủ (phiên bản ${row.version}, lần lưu ${row.revision}). Người dùng app chưa thấy thay đổi này.`);
  return row;
}
async function saveMany(entries) {
  let done = 0;
  const queue = [...entries];
  const worker = async () => {
    while (queue.length) {
      const [entity, id] = queue.shift();
      await saveItem(entity, id, { quiet: true });
      done += 1;
      if (done % 10 === 0) notify(`Đang lưu nháp lên máy chủ… ${done}/${entries.length}`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, entries.length) }, worker));
  return done;
}
// Items one publish carries: the item itself, plus the 78 card drafts of a deck that is not published yet.
function publishKeysFor(entity, id) {
  const keys = [itemKey(entity, id)];
  if (entity === "decks" && !publishedItem("decks", id)) {
    for (const row of items.drafts.values()) if (row.kind === "card" && row.payload?.deckId === id) keys.push(`card/${row.itemKey}`);
  }
  return keys;
}
window.NilazaUnsaved?.setWorkspace("content");
// Vietnamese labels (A1); route ids stay the contract in admin-capabilities.json.
const routeLabels = { overview: "Tổng quan", personas: "Người dẫn", decks: "Bộ bài", cards: "Thư viện lá bài", assets: "Hình ảnh", frontend: "Văn bản trong app", documentation: "Hướng dẫn Owner" };
let state = {
  route: location.hash.slice(1) || "personas",
  locale: "vi",
  search: "",
  selectedPersonaId: null,
  selectedDeckId: null,
  selectedCardId: null,
  selectedAssetId: null,
  selectedFrontendId: null,
  ownerGuide: null,
  ownerGuideStatus: "idle"
  ,sync: { status: "local", version: null, publishedVersion: null }
  ,filters: { personas: "all", decks: "all", cards: "all", frontendContent: "all" }
};

function readCompatibleDraft(value) {
  const migration = migrateLegacyDeckIdentity(value);
  if (migration.conflicts.length) {
    legacyIdentityConflictNotice = "Legacy deck identity conflict. All original records and local edits are preserved. Reconcile duplicate deck, card, or asset IDs before syncing; no automatic reset or merge was performed.";
  }
  return migration.data;
}
function loadSavedData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return saved?.schemaVersion === 4 ? readCompatibleDraft(saved) : null;
  } catch (_error) { return null; }
}
function saveData(message) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (message) notify(message);
  } catch (error) { notify(`Could not save local review data: ${error.message}`, true); }
}

function loadOutbox() {
  try {
    const value = JSON.parse(localStorage.getItem(OUTBOX_KEY) || "null");
    return value?.payload && Array.isArray(value.payload.personas)
      ? { ...value, payload: readCompatibleDraft(value.payload) } : null;
  } catch (_error) { return null; }
}
function saveOutbox(payload, basePublishedVersion) {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify({
      payload: toBundlePayload(payload),
      basePublishedVersion: Number.isSafeInteger(basePublishedVersion) ? basePublishedVersion : null,
      queuedAt: new Date().toISOString()
    }));
  } catch (_error) { /* local data remains the primary offline fallback */ }
}
function clearOutbox() { try { localStorage.removeItem(OUTBOX_KEY); } catch (_error) {} }
function setSyncState(status, record = null) {
  state.sync = {
    status,
    version: record?.version ?? state.sync.version ?? null,
    publishedVersion: remoteState?.published?.version ?? state.sync.publishedVersion ?? null
  };
}
function applyRemoteBundle(record) {
  const remoteData = fromBundleRecord(record);
  const previousAudit = Array.isArray(data?.audit) ? data.audit : [];
  data = {
    ...remoteData,
    audit: [{
      id: `audit-remote-${record.version}`,
      action: `Loaded online content bundle v${record.version}`,
      editorId: record.updated_by || "online",
      createdAt: record.updated_at || new Date().toISOString()
    }, ...previousAudit].slice(0, 50)
  };
  setSyncState(record.status === "published" ? "published" : "draft", record);
}
async function syncFromServer({ notifyUser = true } = {}) {
  if (legacyIdentityConflictNotice) {
    setSyncState("pending");
    notify(legacyIdentityConflictNotice, true);
    return;
  }
  if (!contentSync) {
    setSyncState("local");
    if (notifyUser) notify("Online content sync is not configured; local fallback is active.");
    return;
  }
  if (items.mode === "items") {
    try {
      await reloadItems();
      if (notifyUser) notify(items.mode === "items"
        ? `Đã tải bản đang dùng (gói v${remoteState?.published?.version ?? "?"}) và ${items.drafts.size} nháp trên máy chủ.${localEdits.size ? ` Giữ ${localEdits.size} thay đổi chưa lưu trên trình duyệt này.` : ""}`
        : `Phát hành từng mục chưa bật trên máy chủ (cần migration ${MIGRATIONS.items}); dùng cách cũ cả gói.`);
    } catch (error) {
      setSyncState("pending");
      if (notifyUser) notify(`Không tải được từ máy chủ; dữ liệu trên trình duyệt vẫn giữ: ${error.message}`, true);
    }
    render();
    return;
  }
  try {
    const pending = loadOutbox();
    if (legacyIdentityConflictNotice) throw new Error(legacyIdentityConflictNotice);
    if (pending) {
      const uploaded = await contentSync.saveDraft(pending.payload, pending.basePublishedVersion);
      clearOutbox();
      remoteState = { ...(remoteState || {}), selected: uploaded, ownDraft: uploaded };
      setSyncState("draft", uploaded);
    }
    remoteState = await contentSync.load();
    if (remoteState.payload) {
      applyRemoteBundle(remoteState.selected);
      saveData();
      // Local edits are now replaced by (or already contained in) the server bundle.
      unsavedRecords.clear();
      reportUnsaved();
    } else setSyncState("online-empty");
    if (notifyUser) notify(remoteState.payload ? "Content synced from online staging." : "Online staging has no published bundle yet.");
    render();
  } catch (error) {
    if (error.code === "legacy_deck_identity_conflict") legacyIdentityConflictNotice = error.message;
    setSyncState("pending");
    if (notifyUser) notify(`Online sync failed; local data is safe: ${error.message}`, true);
  }
}
async function persistRemote({ publish = false } = {}) {
  if (legacyIdentityConflictNotice) {
    setSyncState("pending");
    notify(legacyIdentityConflictNotice, true);
    return;
  }
  if (!contentSync) {
    setSyncState("local");
    return;
  }
  const payload = toBundlePayload(data);
  const basePublishedVersion = remoteState?.published?.version ?? null;
  try {
    const draft = await contentSync.saveDraft(payload, basePublishedVersion);
    remoteState = { ...(remoteState || {}), selected: draft, ownDraft: draft };
    clearOutbox();
    unsavedRecords.clear();
    reportUnsaved();
    setSyncState("draft", draft);
    if (publish) {
      await contentSync.publish(draft.id, basePublishedVersion);
      remoteState = await contentSync.load();
      if (!remoteState.payload) throw new Error("Published bundle could not be reloaded");
      applyRemoteBundle(remoteState.selected);
      clearOutbox();
      notify(`Published online content bundle v${remoteState.selected.version}.`);
    } else notify(`Draft saved online as v${draft.version}.`);
    saveData();
    render();
  } catch (error) {
    saveOutbox(payload, basePublishedVersion);
    reportUnsaved();
    setSyncState("pending");
    notify(`Saved locally; online sync is pending: ${error.message}`, true);
    render();
  }
}
function notify(message, isError = false) {
  const notice = $("#notice");
  notice.textContent = legacyIdentityConflictNotice || message;
  notice.className = `notice${isError || legacyIdentityConflictNotice ? " error" : ""}`;
  notice.hidden = false;
  window.clearTimeout(notify.timer);
  if (!legacyIdentityConflictNotice) notify.timer = window.setTimeout(() => { notice.hidden = true; }, 4200);
}
function selectDefaults() {
  state.selectedPersonaId ||= data.personas[0]?.id;
  state.selectedDeckId ||= data.decks[0]?.id;
  const selectedDeckCards = data.cards.filter((card) => card.deckId === state.selectedDeckId);
  if (!data.cards.some((card) => card.id === state.selectedCardId)) state.selectedCardId = selectedDeckCards[0]?.id;
  state.selectedAssetId ||= data.assets[0]?.id;
  state.selectedFrontendId ||= data.frontendContent[0]?.id;
}
function setRoute(route) {
  state.route = route;
  location.hash = route;
  try { window.parent.location.hash = `#/content/${route}`; } catch (_error) {}
  render();
}
function titleFor(route) {
  return routeLabels[route] || manifest.workspaces.find((item) => item.id === "content").routes.find((item) => item.id === route)?.label || "Nội dung";
}
function descriptionFor(route) {
  return {
    overview: "Tình trạng nội dung, bản gốc trong repo và thao tác gần đây.",
    personas: "Nội dung song ngữ, gói truy cập, ghi chú minh bạch và prompt của từng người dẫn.",
    decks: "Tên, phong cách hình ảnh, giọng đọc và trạng thái phát hành của bộ bài.",
    cards: "Nghĩa lá bài riêng cho từng bộ, câu hỏi suy ngẫm, trạng thái và hình ảnh.",
    assets: "Xem trước hình ảnh app dùng, đường dẫn lưu trữ; không xóa được khi nội dung còn dùng.",
    frontend: "Văn bản song ngữ hiển thị trong app, duyệt theo từng khối.",
    documentation: "Hướng dẫn riêng cho Owner; mỗi lần mở được ghi nhật ký."
  }[route] || "Quản lý nội dung.";
}
function renderNav() {
  const routes = manifest.workspaces.find((item) => item.id === "content").routes;
  $("#content-nav").innerHTML = routes.map((route) => `<button class="nav-item ${route.id === state.route ? "active" : ""}" data-route="${route.id}" ${route.id === state.route ? 'aria-current="page"' : ""}>${escapeHtml(routeLabels[route.id] || route.label)}</button>`).join("");
}
function renderHeader() {
  $("#page-title").textContent = titleFor(state.route);
  $("#page-description").textContent = descriptionFor(state.route);
  const create = {
    personas: `<button class="button primary" data-action="create-persona" ${permissions.canEdit ? "" : "disabled"}>Thêm người dẫn</button>`,
    decks: `<button class="button primary" data-action="create-deck" ${permissions.canEdit ? "" : "disabled"}>Thêm bộ bài + 78 lá</button>`,
    assets: `<button class="button primary" data-action="create-asset" ${permissions.canManageAssets ? "" : "disabled"}>Thêm hình ảnh (nháp)</button>`
  }[state.route] || "";
  $("#header-actions").innerHTML = create;
}
const kindLabels = { persona: "Người dẫn", deck: "Bộ bài", card: "Lá bài", frontend: "Văn bản", asset: "Hình ảnh" };
const routeForEntity = { personas: "personas", decks: "decks", cards: "cards", frontendContent: "frontend", assets: "assets" };
function modeNote() {
  if (items.mode === "items") return `<p class="permission-note" data-item-mode="items">Lưu nháp lưu từng mục lên máy chủ; “Xem lại & phát hành” chỉ phát hành đúng mục đó, không kéo theo nháp của người khác.</p>`;
  if (items.missing) return `<p class="permission-note" data-item-mode="bundle">Phát hành từng mục chưa bật: cần Owner áp dụng migration <code>${escapeHtml(items.missing)}</code>. Đang dùng cách cũ: lưu và phát hành cả gói nội dung.</p>`;
  return "";
}
function pendingDraftsPanel() {
  if (items.mode !== "items") return "";
  const rows = [...items.drafts.values()].slice(0, 30).map((row) => {
    const entity = ENTITY_BY_KIND[row.kind];
    const record = data[entity]?.find((item) => item.id === row.itemKey);
    return `<div class="audit-row"><div><strong>${escapeHtml(kindLabels[row.kind])} · ${escapeHtml(recordLabel(record || row.payload, state.locale))}</strong><span>${escapeHtml(row.updatedByEmail || "—")} · lần lưu ${escapeHtml(row.revision)}</span></div><button class="button" data-open-item="${escapeHtml(entity)}" data-id="${escapeHtml(row.itemKey)}">Mở</button></div>`;
  }).join("");
  return `<div class="panel" data-pending-drafts><h2>Nháp chờ phát hành (${items.drafts.size})</h2>${rows || "<p>Không có nháp nào trên máy chủ.</p>"}${items.drafts.size > 30 ? `<p>Hiện 30 mục mới nhất.</p>` : ""}</div>`;
}
function renderOverview() {
  const audit = data.audit.slice(0, 10).map((item) => `<div class="audit-row"><div><strong>${escapeHtml(item.action)}</strong><span>${escapeHtml(item.editorId)}</span></div><span>${new Date(item.createdAt).toLocaleString()}</span></div>`).join("");
  const resetButton = items.mode === "items"
    ? `<button class="button danger" data-action="drop-local-edits" ${localEdits.size ? "" : "disabled"}>Bỏ thay đổi chưa lưu trên trình duyệt</button>`
    : `<button class="button danger" data-action="reset-data" ${permissions.canEdit ? "" : "disabled"}>Đặt lại về bản gốc</button>`;
  return `
    <div class="metrics">
      ${metric("Personas", data.personas.length)}${metric("Tarot decks", data.decks.length)}${metric("Deck cards", data.cards.length)}${metric("Assets", data.assets.length)}${metric("Content blocks", data.frontendContent.length)}
    </div>
    ${modeNote()}
    <div class="overview-grid">
      ${pendingDraftsPanel()}
      <div class="panel"><h2>Recent admin actions</h2>${audit || "<p>No local admin changes yet.</p>"}</div>
      <div class="panel"><h2>Content contract</h2><p>Supabase is the shared source for versioned content bundles. Local storage remains an offline cache/outbox, so another authorized Admin can review the same draft and runtime clients read only the published bundle.</p><p><strong>Role:</strong> ${escapeHtml(session.role)}<br><strong>Seed:</strong> ${escapeHtml(repositorySeed.sourceVersion)}<br><strong>Sync:</strong> ${escapeHtml(state.sync.status)}${state.sync.version ? ` · v${escapeHtml(state.sync.version)}` : ""}</p><div class="action-bar"><button class="button" data-action="sync-now">Đồng bộ với máy chủ</button><button class="button primary" data-action="publish-seed" ${permissions.canPublish ? "" : "disabled"}>Xem lại & phát hành bản gốc</button>${resetButton}</div></div>
    </div>`;
}
function metric(label, value) { return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`; }
function localeSwitch() {
  return `<div class="locale-switch"><button class="locale-button ${state.locale === "vi" ? "active" : ""}" data-locale="vi" aria-pressed="${state.locale === "vi"}">Tiếng Việt</button><button class="locale-button ${state.locale === "en" ? "active" : ""}" data-locale="en" aria-pressed="${state.locale === "en"}">English</button></div>`;
}
function filterSelect(entity) {
  const options = entity === "cards" ? LIST_FILTERS.cards : LIST_FILTERS.default;
  const current = state.filters[entity] || "all";
  return `<label class="visually-hidden" for="list-filter-${entity}">Lọc danh sách</label><select id="list-filter-${entity}" data-list-filter="${entity}">${options.map(([value, label]) => `<option value="${value}" ${value === current ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select>`;
}
function listToolbar(placeholder, extra = "", entity = "") {
  return `<div class="list-toolbar"><label class="visually-hidden" for="content-search">Tìm kiếm</label><input id="content-search" type="search" data-search placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(state.search)}" />${extra}${entity ? filterSelect(entity) : ""}</div>`;
}
const entityForType = { persona: "personas", deck: "decks", card: "cards", frontend: "frontendContent" };
const filterContext = { hasDraft, hasLocalEdit, liveStatus };
function visibleRecords(records, entity) {
  const query = state.search.trim().toLowerCase();
  const filter = state.filters[entity] || "all";
  return records.filter((item) => (!query || `${recordLabel(item, state.locale)} ${item.id} ${item.slug || ""}`.toLowerCase().includes(query))
    && matchesFilter(entity, item, filter, filterContext));
}
function itemChips(entity, item) {
  const chips = [`<span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span>`];
  if (hasLocalEdit(entity, item.id)) chips.push(`<span class="status review" data-chip="unsaved">Chưa lưu</span>`);
  else if (hasDraft(entity, item.id)) chips.push(`<span class="status draft" data-chip="draft">Nháp chờ phát hành</span>`);
  if (entity === "cards" && missingImage(item)) chips.push(`<span class="status archived" data-chip="no-image">Thiếu ảnh</span>`);
  if (translationGaps(entity, item).length) chips.push(`<span class="status archived" data-chip="missing-translation">Thiếu bản dịch</span>`);
  return `<span class="chip-stack">${chips.join("")}</span>`;
}
function recordRows(records, type, activeId, subtitle) {
  const entity = entityForType[type];
  const rows = visibleRecords(records, entity);
  return rows.map((item) => `
    <button class="record-row ${item.id === activeId ? "active" : ""}" data-select="${type}" data-id="${escapeHtml(item.id)}">
      <div><strong>${escapeHtml(recordLabel(item, state.locale))}</strong><span>${escapeHtml(subtitle(item))}</span><small>${escapeHtml(item.updatedBy || "seed")}</small></div>
      ${itemChips(entity, item)}
    </button>`).join("") || `<div class="empty"><p>Không có mục nào khớp bộ lọc.</p></div>`;
}
function countNote(records, entity) {
  const shown = visibleRecords(records, entity).length;
  return shown === records.length ? "" : `<p class="count-note list-count" data-list-count>${shown}/${records.length} mục khớp bộ lọc</p>`;
}
function field(label, value, entity, id, name, options = {}) {
  // Changing an item's status is a publish decision (AD-15); editors see it read-only.
  const disabled = !permissions.canEdit || options.readonly || (name === "status" && !permissions.canPublish);
  const attrs = `data-bind data-entity="${entity}" data-id="${escapeHtml(id)}" data-field="${name}"${options.locale ? ` data-locale="${options.locale}"` : ""}${options.format ? ` data-format="${options.format}"` : ""}`;
  const cls = `field${options.full ? " full" : ""}`;
  const inputId = `field-${entity}-${id}-${name}${options.locale ? `-${options.locale}` : ""}`.replace(/[^A-Za-z0-9_-]/g, "_");
  const labelTag = `<label for="${escapeHtml(inputId)}">${label}</label>`;
  if (options.type === "textarea") return `<div class="${cls}">${labelTag}<textarea id="${escapeHtml(inputId)}" ${attrs} ${disabled ? "disabled" : ""}>${escapeHtml(value)}</textarea>${options.hint ? `<small>${escapeHtml(options.hint)}</small>` : ""}</div>`;
  if (options.options) return `<div class="${cls}">${labelTag}<select id="${escapeHtml(inputId)}" ${attrs} ${disabled ? "disabled" : ""}>${options.options.map((option) => `<option value="${escapeHtml(option)}" ${value === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></div>`;
  return `<div class="${cls}">${labelTag}<input id="${escapeHtml(inputId)}" ${attrs} value="${escapeHtml(value)}" ${disabled ? "disabled" : ""} /></div>`;
}
function assetUrl(path) {
  const value = String(path || "").trim().replaceAll("\\", "/");
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith("/")) return value;
  return `/${value.replace(/^(\.\/)+/, "")}`;
}
function assetPreview(item) {
  const src = assetUrl(item.path);
  const label = escapeHtml(item.name || item.id);
  if (!src) {
    return `<div class="asset-preview empty-preview"><span>No preview yet</span><small>Add a storage path to preview this image.</small></div>`;
  }
  return `<figure class="asset-preview">
    <img src="${escapeHtml(src)}" alt="${label}" loading="lazy" data-asset-preview />
    <figcaption><span>Xem trước như trên app · Front-end preview</span><a href="${escapeHtml(src)}" target="_blank" rel="noreferrer">Mở ảnh · Open image</a></figcaption>
    <div class="preview-fallback"><span>Preview unavailable</span><small>${escapeHtml(item.path)}</small></div>
  </figure>`;
}
const fieldLabels = { name: "Tên", role: "Vai trò hiển thị", description: "Mô tả", transparency: "Ghi chú minh bạch", prompt: "Prompt", suggestedPrompts: "Câu gợi ý", status: "Trạng thái", accessTier: "Gói truy cập", vibe: "Không khí", visualDirection: "Định hướng hình ảnh", keywords: "Từ khóa", uprightMeaning: "Nghĩa xuôi", reversedMeaning: "Nghĩa ngược", reflectionQuestion: "Câu hỏi suy ngẫm", assetPath: "Đường dẫn hình", title: "Tiêu đề", body: "Nội dung", ctaLabel: "Nhãn nút", path: "Đường dẫn lưu trữ", linkedTo: "Gắn với", type: "Loại" };
function reviewPanel(entity, id, item) {
  if (items.review?.key !== itemKey(entity, id)) return "";
  const before = publishedItem(entity, id);
  const rows = diffItem(before || {}, item);
  const keys = publishKeysFor(entity, id);
  const env = window.NilazaDescribeEnvironment?.(window.ENV)?.label || "STAGING";
  const pendingSave = hasLocalEdit(entity, id);
  const nothing = !pendingSave && !hasDraft(entity, id);
  const table = rows.length
    ? `<table class="diff-table"><thead><tr><th scope="col">Trường</th><th scope="col">Đang dùng</th><th scope="col">Bản mới</th></tr></thead><tbody>${rows.map((row) => `<tr><th scope="row">${escapeHtml(fieldLabels[row.field] || row.field)}${row.locale ? ` · ${escapeHtml(row.locale.toUpperCase())}` : ""}</th><td>${escapeHtml(row.before) || "<em>(trống)</em>"}</td><td>${escapeHtml(row.after) || "<em>(trống)</em>"}</td></tr>`).join("")}</tbody></table>`
    : `<p>Không có khác biệt với bản đang dùng.</p>`;
  return `<section class="review-panel" data-review-panel aria-label="Xem lại trước khi phát hành">
    <h3>Xem lại & phát hành: ${escapeHtml(recordLabel(item, state.locale))}</h3>
    <p class="count-note">Đang ghi vào: <strong>${escapeHtml(env)}</strong> · ${before ? "so với bản đang dùng trong app" : "mục mới, chưa có trong app"} · chỉ phát hành ${keys.length === 1 ? "mục này" : `mục này kèm ${keys.length - 1} lá của bộ bài mới`}; nháp của mục khác giữ nguyên.</p>
    ${table}
    ${pendingSave ? `<p class="permission-note">Có thay đổi chưa lưu: bấm phát hành sẽ lưu nháp trước.</p>` : ""}
    <div class="field full"><label for="publish-note">Ghi chú thay đổi (bắt buộc, 5–500 ký tự)</label><textarea id="publish-note" data-publish-note maxlength="500">${escapeHtml(items.review.note || "")}</textarea></div>
    <div class="action-bar"><button class="button primary" data-action="confirm-publish" data-entity="${entity}" data-id="${escapeHtml(id)}" ${nothing || items.busy ? "disabled" : ""}>Phát hành ${keys.length === 1 ? "mục này" : `${keys.length} mục`}</button><button class="button" data-action="close-review">Đóng</button></div>
    ${nothing ? `<p class="count-note">Mục này không có nháp chờ phát hành.</p>` : ""}
  </section>`;
}
const versionStatus = { draft: "Nháp", published: "Đang dùng", archived: "Bản cũ" };
function historyPanel(entity, id) {
  const key = itemKey(entity, id);
  if (items.history?.key !== key) return "";
  let body = `<p>Đang tải lịch sử…</p>`;
  if (items.history.status === "error") body = `<p>Không tải được lịch sử. Thử lại.</p>`;
  if (items.history.status === "ok") {
    const rows = items.history.rows;
    body = rows.length ? `<ol class="history-list">${rows.map((row) => `<li data-history-version="${escapeHtml(row.version)}"><div><strong>Phiên bản ${escapeHtml(row.version)} · ${escapeHtml(versionStatus[row.status] || row.status)}</strong><span>${escapeHtml(row.updatedByEmail || "—")} · ${escapeHtml(new Date(row.publishedAt || row.updatedAt).toLocaleString())}${row.bundleVersion ? ` · gói v${escapeHtml(row.bundleVersion)}` : ""}${row.restoredFromVersion ? ` · khôi phục từ v${escapeHtml(row.restoredFromVersion)}` : ""}</span>${row.note ? `<small>${escapeHtml(row.note)}</small>` : ""}</div>${row.status === "draft" ? "" : `<button class="button" data-action="restore-version" data-entity="${entity}" data-id="${escapeHtml(id)}" data-version="${escapeHtml(row.version)}" ${permissions.canEdit ? "" : "disabled"}>Khôi phục</button>`}</li>`).join("")}</ol>`
      : `<p>Chưa có phiên bản từng mục. Bản đang dùng đến từ gói nội dung v${escapeHtml(remoteState?.published?.version ?? "?")}.</p>`;
  }
  return `<section class="history-panel" data-history-panel aria-label="Lịch sử phiên bản"><div class="detail-header"><h3>Lịch sử phiên bản</h3><button class="button" data-action="close-history">Đóng</button></div><p class="count-note">Khôi phục tạo một nháp mới từ phiên bản cũ; lịch sử không bị xóa và app chỉ đổi khi Owner phát hành.</p>${body}</section>`;
}
function itemActionBar(entity, id, item, { restore = true } = {}) {
  const key = itemKey(entity, id);
  const draft = items.drafts.get(key);
  const isLive = Boolean(publishedItem(entity, id));
  const publishButton = permissions.canPublish
    ? `<button class="button primary" data-action="publish" data-entity="${entity}" data-id="${escapeHtml(id)}">Xem lại & phát hành</button>`
    : `<button class="button primary" disabled title="Biên tập viên chỉ lưu nháp">Chờ Owner phát hành</button>`;
  const stateText = hasLocalEdit(entity, id) ? "Có thay đổi chưa lưu trên trình duyệt này."
    : draft ? `Nháp trên máy chủ: lần lưu ${draft.revision} bởi ${draft.updatedByEmail || "—"}, ${new Date(draft.updatedAt).toLocaleString()}.`
    : isLive ? "Đang giống bản trong app." : "Mục mới, chưa lưu lên máy chủ.";
  return `<p class="count-note" data-item-state>${escapeHtml(stateText)}${permissions.canPublish ? "" : " Chờ Owner phát hành."}</p>
    ${reviewPanel(entity, id, item)}
    <div class="action-bar">
    <button class="button" data-action="save" data-entity="${entity}" data-id="${escapeHtml(id)}" ${permissions.canEdit && !items.busy ? "" : "disabled"}>Lưu nháp</button>
    ${publishButton}
    <button class="button" data-action="history" data-entity="${entity}" data-id="${escapeHtml(id)}">Lịch sử</button>
    ${draft ? `<button class="button" data-action="discard-draft" data-entity="${entity}" data-id="${escapeHtml(id)}" ${permissions.canEdit ? "" : "disabled"}>Bỏ nháp</button>` : ""}
    <button class="button" data-action="archive" data-entity="${entity}" data-id="${escapeHtml(id)}" ${permissions.canPublish ? "" : "disabled"}>Lưu trữ</button>
    ${restore ? `<button class="button" data-action="restore" data-entity="${entity}" data-id="${escapeHtml(id)}" ${permissions.canEdit ? "" : "disabled"}>Khôi phục bản gốc</button>` : ""}
    <button class="button danger" data-action="delete" data-entity="${entity}" data-id="${escapeHtml(id)}" ${permissions.canDelete && !isLive && ["draft", "archived"].includes(item.status) ? "" : "disabled"} ${isLive ? 'title="Mục đang dùng: Lưu trữ rồi phát hành"' : ""}>Xóa vĩnh viễn</button>
  </div>${historyPanel(entity, id)}`;
}
function actionBar(entity, id, item, options = {}) {
  if (items.mode === "items") return itemActionBar(entity, id, item, options);
  const { restore = true } = options;
  return `${modeNote()}<div class="action-bar">
    <button class="button" data-action="save" data-entity="${entity}" data-id="${escapeHtml(id)}" ${permissions.canEdit ? "" : "disabled"}>Lưu nháp</button>
    <button class="button primary" data-action="publish" data-entity="${entity}" data-id="${escapeHtml(id)}" ${permissions.canPublish ? "" : "disabled"}>Xem lại & phát hành</button>
    <button class="button" data-action="archive" data-entity="${entity}" data-id="${escapeHtml(id)}" ${permissions.canEdit ? "" : "disabled"}>Lưu trữ</button>
    ${restore ? `<button class="button" data-action="restore" data-entity="${entity}" data-id="${escapeHtml(id)}" ${permissions.canEdit ? "" : "disabled"}>Khôi phục bản gốc</button>` : ""}
    <button class="button danger" data-action="delete" data-entity="${entity}" data-id="${escapeHtml(id)}" ${permissions.canDelete && ["draft", "archived"].includes(item.status) ? "" : "disabled"}>Xóa vĩnh viễn</button>
  </div>`;
}
// Image upload (AD-08, D8): to the content-images bucket with the signed-in session; the path field gets the URL.
function uploadControl(entity, id) {
  if (!contentSync?.uploadImage) return "";
  const inputId = `upload-${entity}-${id}`.replace(/[^A-Za-z0-9_-]/g, "_");
  if (items.imageMissing) return `<p class="permission-note" data-upload-missing>Tải ảnh lên cần Owner tạo kho ảnh content-images (migration <code>${escapeHtml(MIGRATIONS.bucket)}</code>). Tạm thời vẫn nhập được đường dẫn có sẵn.</p>`;
  return `<div class="upload-row"><label class="button upload-button" for="${escapeHtml(inputId)}">Tải ảnh lên (PNG, JPEG, WebP · tối đa 1 MB)<input id="${escapeHtml(inputId)}" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" data-upload-image data-entity="${entity}" data-id="${escapeHtml(id)}" ${permissions.canEdit && !items.busy ? "" : "disabled"} /></label><small class="count-note">Ảnh được lưu công khai để app tải; đường dẫn mới điền vào ô đường dẫn, rồi Lưu nháp.</small></div>`;
}
function renderPersonas() {
  const item = data.personas.find((record) => record.id === state.selectedPersonaId) || data.personas[0];
  if (!item) return `<div class="empty"><p>No personas. Add a persona draft to begin.</p></div>`;
  const detail = `<div class="detail-header"><div><h2>${escapeHtml(local(item.name))}</h2><p>${escapeHtml(item.id)} · updated by ${escapeHtml(item.updatedBy)}</p></div><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></div>
    ${localeSwitch()}<p class="permission-note">${permissions.canEdit ? (items.mode === "items" ? (permissions.canPublish ? "Lưu nháp lưu mục này lên máy chủ; app chỉ đổi khi bạn phát hành." : "Bạn lưu nháp; Owner xem lại và phát hành. Trạng thái do Owner đổi.") : "Editable draft. Save synchronizes to online staging when available; local outbox protects offline work.") : "Read-only role. Sign in as owner or content admin to edit."}</p>
    <div class="form-grid">
      ${field("Mã định danh (ID)", item.id, "personas", item.id, "id", { readonly:true })}${field("Đường dẫn ngắn (slug)", item.slug, "personas", item.id, "slug", { readonly:true })}
      ${field("Trạng thái", item.status, "personas", item.id, "status", { options:["draft","review","active","archived"] })}${field("Gói truy cập", item.accessTier, "personas", item.id, "accessTier", { options:["free","premium-preview","premium"] })}
      ${field("Tên hiển thị", local(item.name), "personas", item.id, "name", { locale:state.locale })}${field("Vai trò hiển thị", local(item.role), "personas", item.id, "role", { locale:state.locale })}
      ${field("Mô tả", local(item.description), "personas", item.id, "description", { locale:state.locale, type:"textarea", full:true })}
      ${field("Ghi chú minh bạch", local(item.transparency), "personas", item.id, "transparency", { locale:state.locale, type:"textarea", full:true })}
      ${field("Prompt người dẫn", local(item.prompt), "personas", item.id, "prompt", { locale:state.locale, type:"textarea", full:true })}
      ${field("Câu gợi ý (cách nhau bằng dấu phẩy)", (item.suggestedPrompts?.[state.locale] || []).join(", "), "personas", item.id, "suggestedPrompts", { locale:state.locale, format:"list", type:"textarea", full:true })}
    </div>${actionBar("personas", item.id, item)}`;
  return `<div class="split-view"><div class="list-panel">${listToolbar("Tìm người dẫn…", "", "personas")}${countNote(data.personas, "personas")}<div class="record-list">${recordRows(data.personas,"persona",item.id,(record)=>`${record.slug} · ${record.accessTier}`)}</div></div><div class="detail-panel">${detail}</div></div>`;
}
function renderDecks() {
  const item = data.decks.find((record) => record.id === state.selectedDeckId) || data.decks[0];
  if (!item) return `<div class="empty"><p>No decks. Add a deck to seed its 78 card drafts.</p></div>`;
  const detail = `<div class="detail-header"><div><h2>${escapeHtml(local(item.name))}</h2><p>${escapeHtml(item.id)} · ${countCardsForDeck(data,item.id)} card records</p></div><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></div>
    ${localeSwitch()}<p class="permission-note">New decks always receive a separate 78-card draft library.</p><div class="form-grid">
      ${field("Mã bộ bài (ID)",item.id,"decks",item.id,"id",{readonly:true})}${field("Đường dẫn ngắn (slug)",item.slug,"decks",item.id,"slug",{readonly:true})}
      ${field("Trạng thái",item.status,"decks",item.id,"status",{options:["draft","review","active","archived"]})}${field("Gói truy cập",item.accessTier,"decks",item.id,"accessTier",{options:["free","premium-preview","premium"]})}
      ${field("Tên bộ bài",local(item.name),"decks",item.id,"name",{locale:state.locale})}${field("Không khí",local(item.vibe),"decks",item.id,"vibe",{locale:state.locale})}
      ${field("Mô tả",local(item.description),"decks",item.id,"description",{locale:state.locale,type:"textarea",full:true})}
      ${field("Định hướng hình ảnh",local(item.visualDirection),"decks",item.id,"visualDirection",{locale:state.locale,type:"textarea",full:true})}
      ${field("Giọng đọc / prompt",local(item.prompt),"decks",item.id,"prompt",{locale:state.locale,type:"textarea",full:true})}
    </div><div class="action-bar"><button class="button" data-action="open-deck-cards" data-id="${escapeHtml(item.id)}">Open 78-card library</button></div>${actionBar("decks",item.id,item)}`;
  return `<div class="split-view"><div class="list-panel">${listToolbar("Tìm bộ bài…", "", "decks")}${countNote(data.decks, "decks")}<div class="record-list">${recordRows(data.decks,"deck",item.id,(record)=>`${countCardsForDeck(data,record.id)} cards · ${record.accessTier}`)}</div></div><div class="detail-panel">${detail}</div></div>`;
}
function renderCards() {
  const deckOptions = data.decks.map((deck) => `<option value="${escapeHtml(deck.id)}" ${deck.id===state.selectedDeckId?"selected":""}>${escapeHtml(local(deck.name))}</option>`).join("");
  const cards = data.cards.filter((card)=>card.deckId===state.selectedDeckId);
  let item = cards.find((record)=>record.id===state.selectedCardId) || cards[0];
  if (item) state.selectedCardId=item.id;
  if (!item) return `<div class="empty"><p>This deck has no card records.</p></div>`;
  const detail = `<div class="detail-header"><div><h2>${escapeHtml(local(item.name))}</h2><p>${escapeHtml(item.baseCardId)} · ${escapeHtml(item.deckId)}</p></div><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></div>
    ${localeSwitch()}<p class="permission-note">Card wording is deck-specific. Editing this card does not overwrite other decks.</p><div class="form-grid">
      ${field("Mã lá (ID)",item.id,"cards",item.id,"id",{readonly:true})}${field("Trạng thái",item.status,"cards",item.id,"status",{options:["draft","review","published","archived"]})}
      ${field("Tên lá",local(item.name),"cards",item.id,"name",{locale:state.locale})}${field("Từ khóa",(item.keywords?.[state.locale]||[]).join(", "),"cards",item.id,"keywords",{locale:state.locale,format:"list"})}
      ${field("Nghĩa xuôi",local(item.uprightMeaning),"cards",item.id,"uprightMeaning",{locale:state.locale,type:"textarea",full:true})}
      ${field("Nghĩa ngược",local(item.reversedMeaning),"cards",item.id,"reversedMeaning",{locale:state.locale,type:"textarea",full:true})}
      ${field("Câu hỏi suy ngẫm",local(item.reflectionQuestion),"cards",item.id,"reflectionQuestion",{locale:state.locale,type:"textarea",full:true})}
      ${field("Đường dẫn hình",item.assetPath||"","cards",item.id,"assetPath",{full:true})}
    </div>${uploadControl("cards", item.id)}${actionBar("cards",item.id,item)}`;
  return `<div class="split-view"><div class="list-panel">${listToolbar("Tìm lá bài…",`<label class="visually-hidden" for="deck-filter">Bộ bài</label><select id="deck-filter" data-deck-filter>${deckOptions}</select>`, "cards")}${countNote(cards, "cards")}<div class="record-list">${recordRows(cards,"card",item.id,(record)=>`${record.baseCardId} · ${record.arcana}`)}</div></div><div class="detail-panel">${detail}</div></div>`;
}
function renderAssets() {
  const assetRecords = data.assets.filter((item)=>!state.search||`${item.name} ${item.path} ${item.type}`.toLowerCase().includes(state.search.toLowerCase()));
  return `${listToolbar("Tìm hình ảnh…")}<p class="permission-note">Assets may be deleted only when draft/archived and no content record depends on them. Image previews show the same repository media path the front end uses.</p><div class="asset-grid">${assetRecords.map((item)=>`<div class="asset-card"><div class="detail-header"><h3>${escapeHtml(item.name)}</h3><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></div>${assetPreview(item)}<div class="form-grid">${field("Tên",item.name,"assets",item.id,"name",{full:true})}${field("Loại",item.type,"assets",item.id,"type",{options:["tarot-card","deck-back","persona","frontend","share-card"],full:true})}${field("Trạng thái",item.status,"assets",item.id,"status",{options:["draft","review","published","archived"],full:true})}${field("Đường dẫn lưu trữ",item.path,"assets",item.id,"path",{full:true})}${field("Gắn với",item.linkedTo||"","assets",item.id,"linkedTo",{full:true})}</div>${uploadControl("assets", item.id)}${actionBar("assets",item.id,item,{restore:false})}</div>`).join("")||`<div class="empty"><p>No matching assets.</p></div>`}</div>`;
}
function renderFrontend() {
  const item=data.frontendContent.find((record)=>record.id===state.selectedFrontendId)||data.frontendContent[0];
  if(!item)return `<div class="empty"><p>No app-facing content blocks.</p></div>`;
  const detail=`<div class="detail-header"><div><h2>${escapeHtml(local(item.title))}</h2><p>${escapeHtml(item.placement)} · ${escapeHtml(item.id)}</p></div><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></div>${localeSwitch()}<p class="permission-note">Published app content is loaded through the shared Supabase bundle; local storage is the offline fallback.</p><div class="form-grid">${field("Trạng thái",item.status,"frontendContent",item.id,"status",{options:["draft","review","published","archived"]})}${field("Vị trí",item.placement,"frontendContent",item.id,"placement",{readonly:true})}${field("Tiêu đề",local(item.title),"frontendContent",item.id,"title",{locale:state.locale,full:true})}${field("Nội dung",local(item.body),"frontendContent",item.id,"body",{locale:state.locale,type:"textarea",full:true})}${field("Nhãn nút",local(item.ctaLabel),"frontendContent",item.id,"ctaLabel",{locale:state.locale,full:true})}</div>${actionBar("frontendContent",item.id,item)}`;
  return `<div class="split-view"><div class="list-panel">${listToolbar("Tìm khối văn bản…", "", "frontendContent")}${countNote(data.frontendContent, "frontendContent")}<div class="record-list">${recordRows(data.frontendContent,"frontend",item.id,(record)=>record.placement)}</div></div><div class="detail-panel">${detail}</div></div>`;
}
function renderDocumentation() {
  if (state.ownerGuideStatus === "loading") return `<div class="owner-guide-state"><p>Đang tải tài liệu bảo vệ… / Loading protected documentation…</p></div>`;
  if (state.ownerGuideStatus === "error") return `<div class="owner-guide-state"><p>Không thể tải Owner Guide. Kiểm tra phiên Admin, Edge Function và migration audit. / Unable to load the Owner Guide.</p><button class="button" data-action="reload-owner-guide">Thử lại / Retry</button></div>`;
  if (!state.ownerGuide) return `<div class="owner-guide-state"><p>Tài liệu chỉ được tải sau khi xác minh quyền <code>ai.read</code>.</p><button class="button primary" data-action="load-owner-guide">Mở Owner Guide / Open</button></div>`;
  return `<div class="owner-guide"><div class="owner-guide-toolbar"><div><span class="status active">Protected</span><h2>${escapeHtml(state.ownerGuide.title)}</h2><p>Không nằm trong bundle static. Mỗi lần tải được ghi vào audit log. / Not shipped in the static bundle; reads are audited.</p></div><button class="button" data-action="reload-owner-guide">Tải lại / Reload</button></div><pre>${escapeHtml(state.ownerGuide.content)}</pre></div>`;
}
async function loadOwnerGuide() {
  if (state.ownerGuideStatus === "loading") return;
  state.ownerGuideStatus = "loading"; render();
  try {
    const endpoint = `${window.ENV.SUPABASE_URL.replace(/\/$/, "")}/functions/v1/admin-documentation`;
    const response = await window.NilazaAdminRequest(endpoint, { method: "GET" }, "ai.read");
    const body = await response.json();
    if (!response.ok || typeof body.content !== "string") throw Error("documentation_unavailable");
    state.ownerGuide = body; state.ownerGuideStatus = "ready";
  } catch (_error) { state.ownerGuideStatus = "error"; }
  render();
}
function render() {
  selectDefaults(); renderNav(); renderHeader();
  $("#source-version").textContent = state.sync.version ? `Online v${state.sync.version} · ${state.sync.status}` : `${repositorySeed.sourceVersion.slice(0,12)} · ${state.sync.status}`;
  const output={overview:renderOverview,personas:renderPersonas,decks:renderDecks,cards:renderCards,assets:renderAssets,frontend:renderFrontend,documentation:renderDocumentation}[state.route]||renderOverview;
  $("#workspace-content").innerHTML=output();
}

// Destructive actions ask first and say what happens (analysis AD-02). Reset and publish-seed overwrite
// shared content, so they also need the environment name typed.
function confirmDestructive(action, entity, id) {
  const env = window.NilazaDescribeEnvironment?.(window.ENV)?.label || "STAGING";
  const word = env.split(" ")[0];
  if (action === "publish") {
    const note = window.prompt(`Xem lại & phát hành ${entity}/${id}
Đang ghi vào: ${env}
Lưu ý: phát hành gửi cả gói nội dung hiện tại, gồm mọi thay đổi chưa phát hành khác.
Ghi chú thay đổi (bắt buộc, ít nhất 5 ký tự):`);
    if (typeof note !== "string" || note.trim().length < 5) return false;
    confirmDestructive.note = note.trim();
    return true;
  }
  if (action === "delete") return window.confirm(`Xóa vĩnh viễn ${entity}/${id}? Không thể hoàn tác.
Permanently delete ${entity}/${id}? This cannot be undone.`);
  if (action === "archive") return window.confirm(`Lưu trữ ${entity}/${id}? App sẽ không dùng bản ghi này nữa sau lần publish tới.
Archive ${entity}/${id}? The app stops using it after the next publish.`);
  if (action === "reset-data" || action === "publish-seed") {
    const what = action === "reset-data"
      ? "Thay toàn bộ dữ liệu đang sửa bằng bản gốc trong repo và đồng bộ online. / Replace all edited data with the repository seed and sync online."
      : "Ghi đè TOÀN BỘ nội dung online bằng bản gốc và publish ngay. / Overwrite ALL online content with the seed and publish now.";
    const typed = window.prompt(`${what}
Môi trường: ${env}
Gõ ${word} để xác nhận / Type ${word} to confirm:`);
    return typeof typed === "string" && typed.trim().toUpperCase() === word.toUpperCase();
  }
  return true;
}

// Per-item actions (mode "items"). Returns true when the action was handled here.
const ITEM_ACTIONS = new Set(["save", "publish", "confirm-publish", "close-review", "history", "close-history", "restore-version", "discard-draft", "archive", "restore", "delete", "create-persona", "create-deck", "create-asset", "drop-local-edits"]);
async function handleItemAction(action, entity, id, button) {
  if (action === "close-review") { items.review = null; render(); return; }
  if (action === "close-history") { items.history = null; render(); return; }
  if (action === "drop-local-edits") {
    if (!window.confirm(`Bỏ ${localEdits.size} thay đổi chưa lưu trên trình duyệt này? Nháp trên máy chủ giữ nguyên.`)) return;
    localEdits.clear(); persistLocalEdits(); rebuildFromServer(); saveData(); render();
    notify("Đã bỏ thay đổi chưa lưu; đang hiển thị bản trên máy chủ.");
    return;
  }
  if (action === "history") {
    if (!await window.NilazaRequireCapability?.("content.read")) throw Error("Permission denied. Verify your current access.");
    const key = itemKey(entity, id);
    items.history = { key, status: "loading", rows: [] }; render();
    try {
      const rows = await itemRpc("list_content_item_history", { p_kind: ITEM_KINDS[entity], p_item_key: id, p_limit: 50 }, "content.read");
      if (items.history?.key === key) items.history = { key, status: "ok", rows: Array.isArray(rows) ? rows : [] };
    } catch (error) {
      if (isMissingFunction(error)) switchToBundleMode();
      else if (items.history?.key === key) items.history = { key, status: "error", rows: [] };
    }
    render();
    return;
  }
  if (action === "publish") {
    if (!permissions.canPublish) throw Error("Chỉ Owner phát hành. Bạn đã lưu nháp; Owner sẽ xem lại.");
    items.review = { key: itemKey(entity, id), note: "" }; items.history = null; render();
    document.querySelector("#publish-note")?.focus();
    return;
  }
  if (action === "confirm-publish") {
    const note = String(document.querySelector("#publish-note")?.value || items.review?.note || "").trim();
    if (note.length < 5 || note.length > 500) { notify("Ghi chú thay đổi cần 5–500 ký tự.", true); return; }
    if (!await window.NilazaRequireCapability?.("content.publish")) throw Error("Chỉ Owner phát hành.");
    items.busy = true; render();
    try {
      if (hasLocalEdit(entity, id)) await saveItem(entity, id, { quiet: true });
      const keys = publishKeysFor(entity, id);
      const result = await itemRpc("publish_content_items", { p_keys: keys, p_note: note, p_expected_published_version: remoteState?.published?.version ?? null }, "content.publish");
      items.review = null;
      await reloadItems();
      const synced = Array.isArray(result?.personasSynced) && result.personasSynced.length ? ` Đã cập nhật người dẫn cho chat: ${result.personasSynced.join(", ")}.` : "";
      notify(`Đã phát hành ${keys.length} mục (gói nội dung v${result?.bundleVersion ?? "?"}). Nháp của các mục khác giữ nguyên.${synced}`);
    } finally { items.busy = false; render(); }
    return;
  }
  if (action === "restore-version") {
    if (!await window.NilazaRequireCapability?.("content.draft")) throw Error("Permission denied. Verify your current access.");
    if (hasLocalEdit(entity, id) && !window.confirm("Thay đổi chưa lưu của mục này sẽ bị thay bằng phiên bản khôi phục. Tiếp tục?")) return;
    const key = itemKey(entity, id);
    const row = await itemRpc("restore_content_item_version", { p_kind: ITEM_KINDS[entity], p_item_key: id, p_version: Number(button.dataset.version), p_expected_revision: items.drafts.get(key)?.revision ?? 0 }, "content.draft");
    items.drafts.set(key, row);
    forgetLocalEdit(entity, id);
    applyItemToData(data, entity, workingItemFrom(entity, row.payload, data));
    items.history = null; saveData(); render();
    notify(`Đã tạo nháp mới từ phiên bản ${row.restoredFromVersion}. App chỉ đổi khi Owner phát hành.`);
    return;
  }
  if (action === "discard-draft") {
    if (!window.confirm("Bỏ nháp trên máy chủ của mục này? Bản đang dùng trong app giữ nguyên.")) return;
    if (!await window.NilazaRequireCapability?.("content.draft")) throw Error("Permission denied. Verify your current access.");
    const key = itemKey(entity, id);
    await itemRpc("discard_content_item_draft", { p_kind: ITEM_KINDS[entity], p_item_key: id, p_expected_revision: items.drafts.get(key)?.revision ?? null }, "content.draft");
    items.drafts.delete(key);
    forgetLocalEdit(entity, id);
    const live = publishedItem(entity, id);
    if (live) applyItemToData(data, entity, JSON.parse(JSON.stringify(live)));
    else data[entity] = data[entity].filter((record) => record.id !== id);
    // A deck that was never published takes its 78 card drafts with it.
    if (entity === "decks" && !live) {
      for (const row of [...items.drafts.values()].filter((draft) => draft.kind === "card" && draft.payload?.deckId === id)) {
        await itemRpc("discard_content_item_draft", { p_kind: "card", p_item_key: row.itemKey, p_expected_revision: null }, "content.draft");
        items.drafts.delete(`card/${row.itemKey}`);
        forgetLocalEdit("cards", row.itemKey);
      }
      data.cards = data.cards.filter((card) => card.deckId !== id || publishedItem("cards", card.id));
    }
    items.review = null; saveData(); render();
    notify("Đã bỏ nháp; đang hiển thị bản trong app.");
    return;
  }
  if (action === "delete") {
    if (publishedItem(entity, id)) throw Error("Mục đang dùng trong app không xóa được. Dùng Lưu trữ rồi phát hành.");
    if (!confirmDestructive(action, entity, id)) return;
    if (!await window.NilazaRequireCapability?.("content.delete")) throw Error("Permission denied. Verify your current access.");
    const key = itemKey(entity, id);
    if (items.drafts.has(key)) await itemRpc("discard_content_item_draft", { p_kind: ITEM_KINDS[entity], p_item_key: id, p_expected_revision: null }, "content.draft");
    items.drafts.delete(key);
    forgetLocalEdit(entity, id);
    deleteEntity(data, entity, id, session.email);
    state.selectedPersonaId = null; state.selectedDeckId = null; state.selectedCardId = null;
    saveData(); render();
    notify("Đã xóa mục chưa từng phát hành.");
    return;
  }
  if (action === "archive" || action === "restore") {
    if (!confirmDestructive(action, entity, id)) return;
    if (action === "archive") {
      if (!await window.NilazaRequireCapability?.("content.publish")) throw Error("Chỉ Owner đổi trạng thái.");
      archiveEntity(data, entity, id, session.email);
    } else {
      if (!await window.NilazaRequireCapability?.("content.draft")) throw Error("Permission denied. Verify your current access.");
      restoreSeedRecord(data, seedData, entity, id, session.email);
      if (!permissions.canPublish) { const record = data[entity].find((item) => item.id === id); const live = liveStatus(entity, id); if (record && live) record.status = live; }
    }
    markUnsaved(entity, id); saveData(); render();
    await saveItem(entity, id);
    render();
    return;
  }
  if (!await window.NilazaRequireCapability?.("content.draft")) throw Error("Permission denied. Verify your current access.");
  if (action === "save") { await saveItem(entity, id); render(); return; }
  if (action === "create-persona") {
    const item = createDraftPersona(data, session.email); state.selectedPersonaId = item.id; setRoute("personas");
    await saveItem("personas", item.id); render(); return;
  }
  if (action === "create-asset") {
    const item = createDraftAsset(data, session.email); render();
    await saveItem("assets", item.id); render(); return;
  }
  if (action === "create-deck") {
    const item = createDraftDeck(data, session.email);
    state.selectedDeckId = item.id; state.selectedCardId = data.cards.find((card) => card.deckId === item.id)?.id;
    for (const card of data.cards.filter((record) => record.deckId === item.id)) markUnsaved("cards", card.id);
    markUnsaved("decks", item.id); saveData(); setRoute("decks");
    items.busy = true; render();
    try {
      const saved = await saveMany([["decks", item.id], ...data.cards.filter((card) => card.deckId === item.id).map((card) => ["cards", card.id])]);
      notify(`Đã lưu nháp bộ bài mới và ${saved - 1} lá lên máy chủ. Owner phát hành cả bộ bằng “Xem lại & phát hành” của bộ bài.`);
    } finally { items.busy = false; render(); }
  }
}

async function handleAction(button) {
  const action=button.dataset.action, entity=button.dataset.entity, id=button.dataset.id;
  try {
    if (action === "load-owner-guide" || action === "reload-owner-guide") { await loadOwnerGuide(); return; }
    if (items.mode === "items" && ITEM_ACTIONS.has(action)) {
      try { await handleItemAction(action, entity, id, button); }
      catch (error) {
        items.busy = false;
        if (isMissingFunction(error)) { switchToBundleMode(); render(); notify(`Máy chủ chưa có phát hành từng mục (cần migration ${MIGRATIONS.items}); quay lại cách cũ cả gói. Thay đổi vẫn giữ trên trình duyệt.`, true); return; }
        render();
        notify(error?.code ? itemErrorMessage(error) : error.message, true);
      }
      return;
    }
    if (!confirmDestructive(action, entity, id)) return;
    const capability = action === "open-deck-cards" || action === "sync-now" ? "content.read" : action === "delete" || action === "reset-data" ? "content.delete" : ["publish", "publish-seed", "archive", "restore"].includes(action) ? "content.publish" : "content.draft";
    if (!await window.NilazaRequireCapability?.(capability)) throw Error("Permission denied. Verify your current access.");
    if (action === "sync-now") { await syncFromServer(); return; }
    let shouldPersist = false;
    let shouldPublish = false;
    if (action === "publish-seed") {
      data = JSON.parse(JSON.stringify(seedData));
      shouldPersist = true; shouldPublish = true;
    }
    const record = data[entity]?.find(item => item.id === id);
    if (action === "save" && record && !["draft", "review"].includes(record.status) && !await window.NilazaRequireCapability?.("content.publish")) throw Error("Editors can only change drafts.");
    if(action==="create-persona"){const item=createDraftPersona(data,session.email);state.selectedPersonaId=item.id;setRoute("personas");shouldPersist=true;}
    else if(action==="create-deck"){const item=createDraftDeck(data,session.email);state.selectedDeckId=item.id;state.selectedCardId=data.cards.find((card)=>card.deckId===item.id)?.id;setRoute("decks");shouldPersist=true;}
    else if(action==="create-asset"){createDraftAsset(data,session.email);render();shouldPersist=true;}
    else if(action==="save"){logAction(data,`Saved ${entity}/${id} draft`,session.email);notify("Draft saved locally; syncing online…");shouldPersist=true;}
    else if(action==="publish"){publishEntity(data,entity,id,session.email);logAction(data,`Ghi chú phát hành ${entity}/${id}: ${confirmDestructive.note || ""}`,session.email);notify("Đang phát hành gói nội dung…");shouldPersist=true;shouldPublish=true;}
    else if(action==="archive"){archiveEntity(data,entity,id,session.email);notify("Record archived locally; syncing online…");shouldPersist=true;}
    else if(action==="restore"){restoreSeedRecord(data,seedData,entity,id,session.email);notify("Repository seed restored locally; syncing online…");shouldPersist=true;}
    else if(action==="delete"){deleteEntity(data,entity,id,session.email);state.selectedPersonaId=null;state.selectedDeckId=null;state.selectedCardId=null;notify("Record deleted locally; syncing online…");shouldPersist=true;}
    else if(action==="reset-data"){data=buildInitialData(repositorySeed);seedData=JSON.parse(JSON.stringify(data));notify("Local review data reset from repository seed; syncing online…");shouldPersist=true;}
    else if(action==="open-deck-cards"){state.selectedDeckId=id;state.selectedCardId=data.cards.find((card)=>card.deckId===id)?.id;setRoute("cards");}
    saveData(); render();
    if (shouldPersist) await persistRemote({ publish: shouldPublish });
    // The seed bootstrap publishes a whole bundle; per-item drafts stay drafts and are shown on top again.
    if (action === "publish-seed" && items.mode === "items") { await reloadItems(); render(); }
  } catch(error){notify(error.message,true);}
}

document.addEventListener("click",(event)=>{
  const route=event.target.closest("[data-route]");if(route){state.search="";setRoute(route.dataset.route);return;}
  const locale=event.target.closest("[data-locale]");if(locale){state.locale=locale.dataset.locale;render();return;}
  const select=event.target.closest("[data-select]");if(select){const type=select.dataset.select;if(type==="persona")state.selectedPersonaId=select.dataset.id;if(type==="deck")state.selectedDeckId=select.dataset.id;if(type==="card")state.selectedCardId=select.dataset.id;if(type==="frontend")state.selectedFrontendId=select.dataset.id;render();return;}
  const open=event.target.closest("[data-open-item]");if(open){const entity=open.dataset.openItem, id=open.dataset.id;if(entity==="personas")state.selectedPersonaId=id;if(entity==="decks")state.selectedDeckId=id;if(entity==="cards"){const card=data.cards.find((record)=>record.id===id);if(card)state.selectedDeckId=card.deckId;state.selectedCardId=id;}if(entity==="frontendContent")state.selectedFrontendId=id;state.search="";setRoute(routeForEntity[entity]||"overview");return;}
  const action=event.target.closest("[data-action]");if(action)handleAction(action);
});
// In per-item mode editors may propose changes to live items (the draft is reviewed before publish), but never
// change status; in the whole-bundle fallback they keep the older rule (draft records only).
function canEditField(item, fieldName) {
  if (!item || !permissions.canEdit) return false;
  if (permissions.canPublish) return true;
  if (fieldName === "status") return false;
  return items.mode === "items" || item.status === "draft";
}
function stageBoundValue(target) {
  const entity=target.dataset.entity, id=target.dataset.id, fieldName=target.dataset.field;
  const item=data[entity]?.find((record)=>record.id===id);
  if(!canEditField(item, fieldName))return;
  const value=target.dataset.format==="list"?String(target.value).split(",").map((part)=>part.trim()).filter(Boolean):target.value;
  if(target.dataset.locale)item[fieldName]={...(item[fieldName]||{}),[target.dataset.locale]:value};
  else item[fieldName]=value;
  item.updatedAt=new Date().toISOString();item.updatedBy=session.email;
  saveData();
  markUnsaved(entity, id);
}
document.addEventListener("input",(event)=>{
  if(event.target.matches("[data-search]")){
    // Re-rendering replaces the input; put focus and caret back so typing continues (analysis AD-16).
    const caret=event.target.selectionStart;state.search=event.target.value;render();
    const search=document.querySelector("[data-search]");if(search){search.focus();search.setSelectionRange?.(caret,caret);}
    return;
  }
  if(event.target.matches("[data-publish-note]")&&items.review){items.review.note=event.target.value;return;}
  if(event.target.matches("[data-bind]"))stageBoundValue(event.target);
});
async function uploadImage(input) {
  const entity = input.dataset.entity, id = input.dataset.id, file = input.files?.[0];
  input.value = "";
  const problem = validateImageFile(file);
  if (problem) { notify(problem, true); return; }
  if (!contentSync?.uploadImage || !await window.NilazaRequireCapability?.("content.draft")) { notify("Cần quyền lưu nháp để tải ảnh lên.", true); return; }
  const record = data[entity]?.find((item) => item.id === id);
  const fieldName = entity === "assets" ? "path" : "assetPath";
  if (!canEditField(record, fieldName)) { notify("Bạn không sửa được mục này.", true); return; }
  items.busy = true; render(); notify("Đang tải ảnh lên…");
  try {
    const url = await contentSync.uploadImage(imageObjectPath(entity, id, file), file);
    updateEntity(data, entity, id, fieldName, url, { editorId: session.email });
    markUnsaved(entity, id); saveData();
    notify("Đã tải ảnh lên. Bấm Lưu nháp để lưu đường dẫn mới; app chỉ đổi khi phát hành.");
  } catch (error) {
    if (error?.missingBucket) { items.imageMissing = true; notify(`Chưa có kho ảnh content-images: cần Owner áp dụng migration ${MIGRATIONS.bucket}.`, true); }
    else notify(error?.denied ? "Máy chủ từ chối tải ảnh (cần quyền lưu nháp; chỉ PNG, JPEG, WebP tối đa 1 MB)." : `Không tải được ảnh: ${error?.message || "lỗi không rõ"}`, true);
  } finally { items.busy = false; render(); }
}
document.addEventListener("change",(event)=>{
  if(event.target.matches("[data-deck-filter]")){state.selectedDeckId=event.target.value;state.selectedCardId=data.cards.find((card)=>card.deckId===state.selectedDeckId)?.id;render();return;}
  if(event.target.matches("[data-list-filter]")){state.filters[event.target.dataset.listFilter]=event.target.value;render();return;}
  if(event.target.matches("[data-upload-image]")){uploadImage(event.target);return;}
  if(!event.target.matches("[data-bind]"))return;
  const current = data[event.target.dataset.entity]?.find((record) => record.id === event.target.dataset.id);
  if(!canEditField(current, event.target.dataset.field))return;
  try{updateEntity(data,event.target.dataset.entity,event.target.dataset.id,event.target.dataset.field,event.target.value,{locale:event.target.dataset.locale,format:event.target.dataset.format,editorId:session.email});saveData("Đã lưu trên trình duyệt này; bấm Lưu nháp để lưu lên máy chủ.");markUnsaved(event.target.dataset.entity,event.target.dataset.id);render();}catch(error){notify(error.message,true);}
});
document.addEventListener("error",(event)=>{
  if(event.target.matches?.("[data-asset-preview]"))event.target.closest(".asset-preview")?.classList.add("preview-missing");
},true);
window.addEventListener("hashchange",()=>{const route=location.hash.slice(1);if(route&&route!==state.route){state.route=route;state.search="";render();}});

async function init(){
  const [manifestResponse,seedResponse]=await Promise.all([fetch("./admin-capabilities.json",{cache:"no-store"}),fetch("./generated/content-seed.json",{cache:"no-store"})]);
  if(!manifestResponse.ok||!seedResponse.ok)throw new Error("Admin manifest or generated repository seed could not be loaded.");
  manifest=await manifestResponse.json();repositorySeed=await seedResponse.json();seedData=buildInitialData(repositorySeed);data=loadSavedData()||JSON.parse(JSON.stringify(seedData));
  const pendingOutbox = loadOutbox();
  localEdits = loadLocalEdits();
  contentSync = await createContentSync();
  if (legacyIdentityConflictNotice) setSyncState("pending");
  else if (contentSync) {
    try {
      remoteState = await contentSync.load();
      // Per-item mode reads only the published bundle plus server drafts (AD-06: an older own draft never wins).
      const itemMode = await loadItemDrafts();
      if (itemMode && rebuildFromServer()) { saveData(); if (localEdits.size) notify(`Giữ ${localEdits.size} thay đổi chưa lưu từ lần trước trên trình duyệt này; bấm Lưu nháp để lưu lên máy chủ.`); }
      // Per-item publish builds on a published bundle; until the first one exists the seed bootstrap path is used.
      else if (itemMode) { items.mode = "bundle"; items.missing = ""; if (remoteState.payload) { applyRemoteBundle(remoteState.selected); saveData(); } else setSyncState("online-empty"); }
      else if (pendingOutbox) setSyncState("pending");
      else if (remoteState.payload) { applyRemoteBundle(remoteState.selected); saveData(); }
      else setSyncState("online-empty");
    } catch (error) {
      setSyncState("local");
      if (error.code === "legacy_deck_identity_conflict") legacyIdentityConflictNotice = error.message;
    }
  }
  if(legacyIdentityConflictNotice)notify(legacyIdentityConflictNotice,true);
  else if(data.sourceVersion!==repositorySeed.sourceVersion)notify("Repository seed changed. Existing local review edits are preserved; reset when ready.");
  render();
  reportUnsaved();
}
init().catch((error)=>{$("#workspace-content").innerHTML=`<div class="empty"><p>${escapeHtml(error.message)}</p></div>`;});
