import {
  STORAGE_KEY, buildInitialData, permissionsFor, createDraftPersona, createDraftDeck, createDraftAsset,
  updateEntity, publishEntity, archiveEntity, deleteEntity, restoreSeedRecord,
  recordLabel, countCardsForDeck, logAction, migrateLegacyDeckIdentity
} from "./content-model.mjs";
import { createContentSync, fromBundleRecord, toBundlePayload } from "./content-sync.js";

const session = await window.NilazaAdminSessionPromise;
const permissions = permissionsFor(session?.role);
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
  return manifest.workspaces.find((item) => item.id === "content").routes.find((item) => item.id === route)?.label || "Content Operations";
}
function descriptionFor(route) {
  return {
    overview: "Review content health, repository seed, and recent admin actions.",
    personas: "Manage localized persona content, access tier, transparency, and prompt profiles.",
    decks: "Manage deck identity, visual direction, reading voice, and release state.",
    cards: "Edit deck-specific card meanings, reflections, status, and artwork references.",
    assets: "Review front-end media visually, manage storage paths, and prevent deletion while content depends on them.",
    frontend: "Manage localized app-facing copy as reviewable content blocks.",
    documentation: "Read the private Owner Guide through an audited, capability-protected backend endpoint."
  }[route] || "Manager-friendly content operations.";
}
function renderNav() {
  const routes = manifest.workspaces.find((item) => item.id === "content").routes;
  $("#content-nav").innerHTML = routes.map((route) => `<button class="nav-item ${route.id === state.route ? "active" : ""}" data-route="${route.id}">${escapeHtml(route.label)}</button>`).join("");
}
function renderHeader() {
  $("#page-title").textContent = titleFor(state.route);
  $("#page-description").textContent = descriptionFor(state.route);
  const create = {
    personas: `<button class="button primary" data-action="create-persona" ${permissions.canEdit ? "" : "disabled"}>Add persona</button>`,
    decks: `<button class="button primary" data-action="create-deck" ${permissions.canEdit ? "" : "disabled"}>Add deck + 78 cards</button>`,
    assets: `<button class="button primary" data-action="create-asset" ${permissions.canManageAssets ? "" : "disabled"}>Create draft asset</button>`
  }[state.route] || "";
  $("#header-actions").innerHTML = create;
}
function renderOverview() {
  const audit = data.audit.slice(0, 10).map((item) => `<div class="audit-row"><div><strong>${escapeHtml(item.action)}</strong><span>${escapeHtml(item.editorId)}</span></div><span>${new Date(item.createdAt).toLocaleString()}</span></div>`).join("");
  return `
    <div class="metrics">
      ${metric("Personas", data.personas.length)}${metric("Tarot decks", data.decks.length)}${metric("Deck cards", data.cards.length)}${metric("Assets", data.assets.length)}${metric("Content blocks", data.frontendContent.length)}
    </div>
    <div class="overview-grid">
      <div class="panel"><h2>Recent admin actions</h2>${audit || "<p>No local admin changes yet.</p>"}</div>
      <div class="panel"><h2>Content contract</h2><p>Supabase is the shared source for versioned content bundles. Local storage remains an offline cache/outbox, so another authorized Admin can review the same draft and runtime clients read only the published bundle.</p><p><strong>Role:</strong> ${escapeHtml(session.role)}<br><strong>Seed:</strong> ${escapeHtml(repositorySeed.sourceVersion)}<br><strong>Sync:</strong> ${escapeHtml(state.sync.status)}${state.sync.version ? ` · v${escapeHtml(state.sync.version)}` : ""}</p><div class="action-bar"><button class="button" data-action="sync-now">Sync online</button><button class="button primary" data-action="publish-seed" ${permissions.canPublish ? "" : "disabled"}>Publish local seed online</button><button class="button danger" data-action="reset-data" ${permissions.canEdit ? "" : "disabled"}>Reset local review data</button></div></div>
    </div>`;
}
function metric(label, value) { return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`; }
function localeSwitch() {
  return `<div class="locale-switch"><button class="locale-button ${state.locale === "vi" ? "active" : ""}" data-locale="vi">Vietnamese</button><button class="locale-button ${state.locale === "en" ? "active" : ""}" data-locale="en">English</button></div>`;
}
function listToolbar(placeholder, extra = "") {
  return `<div class="list-toolbar"><input type="search" data-search placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(state.search)}" />${extra}</div>`;
}
function recordRows(items, type, activeId, subtitle) {
  const query = state.search.trim().toLowerCase();
  return items.filter((item) => !query || `${recordLabel(item, state.locale)} ${item.id} ${item.slug || ""}`.toLowerCase().includes(query)).map((item) => `
    <button class="record-row ${item.id === activeId ? "active" : ""}" data-select="${type}" data-id="${escapeHtml(item.id)}">
      <div><strong>${escapeHtml(recordLabel(item, state.locale))}</strong><span>${escapeHtml(subtitle(item))}</span><small>${escapeHtml(item.updatedBy || "seed")}</small></div>
      <span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
    </button>`).join("") || `<div class="empty"><p>No matching records.</p></div>`;
}
function field(label, value, entity, id, name, options = {}) {
  const disabled = !permissions.canEdit || options.readonly;
  const attrs = `data-bind data-entity="${entity}" data-id="${escapeHtml(id)}" data-field="${name}"${options.locale ? ` data-locale="${options.locale}"` : ""}${options.format ? ` data-format="${options.format}"` : ""}`;
  const cls = `field${options.full ? " full" : ""}`;
  if (options.type === "textarea") return `<div class="${cls}"><label>${label}</label><textarea ${attrs} ${disabled ? "disabled" : ""}>${escapeHtml(value)}</textarea>${options.hint ? `<small>${escapeHtml(options.hint)}</small>` : ""}</div>`;
  if (options.options) return `<div class="${cls}"><label>${label}</label><select ${attrs} ${disabled ? "disabled" : ""}>${options.options.map((option) => `<option value="${escapeHtml(option)}" ${value === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></div>`;
  return `<div class="${cls}"><label>${label}</label><input ${attrs} value="${escapeHtml(value)}" ${disabled ? "disabled" : ""} /></div>`;
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
    <figcaption><span>Front-end preview</span><a href="${escapeHtml(src)}" target="_blank" rel="noreferrer">Open image</a></figcaption>
    <div class="preview-fallback"><span>Preview unavailable</span><small>${escapeHtml(item.path)}</small></div>
  </figure>`;
}
function actionBar(entity, id, item, { restore = true } = {}) {
  return `<div class="action-bar">
    <button class="button" data-action="save" data-entity="${entity}" data-id="${escapeHtml(id)}" ${permissions.canEdit ? "" : "disabled"}>Save draft</button>
    <button class="button primary" data-action="publish" data-entity="${entity}" data-id="${escapeHtml(id)}" ${permissions.canPublish ? "" : "disabled"}>Publish</button>
    <button class="button" data-action="archive" data-entity="${entity}" data-id="${escapeHtml(id)}" ${permissions.canEdit ? "" : "disabled"}>Archive</button>
    ${restore ? `<button class="button" data-action="restore" data-entity="${entity}" data-id="${escapeHtml(id)}" ${permissions.canEdit ? "" : "disabled"}>Restore seed</button>` : ""}
    <button class="button danger" data-action="delete" data-entity="${entity}" data-id="${escapeHtml(id)}" ${permissions.canDelete && ["draft", "archived"].includes(item.status) ? "" : "disabled"}>Delete permanently</button>
  </div>`;
}
function renderPersonas() {
  const item = data.personas.find((record) => record.id === state.selectedPersonaId) || data.personas[0];
  if (!item) return `<div class="empty"><p>No personas. Add a persona draft to begin.</p></div>`;
  const detail = `<div class="detail-header"><div><h2>${escapeHtml(local(item.name))}</h2><p>${escapeHtml(item.id)} · updated by ${escapeHtml(item.updatedBy)}</p></div><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></div>
    ${localeSwitch()}<p class="permission-note">${permissions.canEdit ? "Editable draft. Save synchronizes to online staging when available; local outbox protects offline work." : "Read-only role. Sign in as owner or content admin to edit."}</p>
    <div class="form-grid">
      ${field("Canonical ID", item.id, "personas", item.id, "id", { readonly:true })}${field("Slug", item.slug, "personas", item.id, "slug", { readonly:true })}
      ${field("Status", item.status, "personas", item.id, "status", { options:["draft","review","active","archived"] })}${field("Access tier", item.accessTier, "personas", item.id, "accessTier", { options:["free","premium-preview","premium"] })}
      ${field("Display name", local(item.name), "personas", item.id, "name", { locale:state.locale })}${field("Display role", local(item.role), "personas", item.id, "role", { locale:state.locale })}
      ${field("Description", local(item.description), "personas", item.id, "description", { locale:state.locale, type:"textarea", full:true })}
      ${field("Transparency note", local(item.transparency), "personas", item.id, "transparency", { locale:state.locale, type:"textarea", full:true })}
      ${field("Persona prompt", local(item.prompt), "personas", item.id, "prompt", { locale:state.locale, type:"textarea", full:true })}
      ${field("Suggested prompts", (item.suggestedPrompts?.[state.locale] || []).join(", "), "personas", item.id, "suggestedPrompts", { locale:state.locale, format:"list", type:"textarea", full:true })}
    </div>${actionBar("personas", item.id, item)}`;
  return `<div class="split-view"><div class="list-panel">${listToolbar("Search personas…")}<div class="record-list">${recordRows(data.personas,"persona",item.id,(record)=>`${record.slug} · ${record.accessTier}`)}</div></div><div class="detail-panel">${detail}</div></div>`;
}
function renderDecks() {
  const item = data.decks.find((record) => record.id === state.selectedDeckId) || data.decks[0];
  if (!item) return `<div class="empty"><p>No decks. Add a deck to seed its 78 card drafts.</p></div>`;
  const detail = `<div class="detail-header"><div><h2>${escapeHtml(local(item.name))}</h2><p>${escapeHtml(item.id)} · ${countCardsForDeck(data,item.id)} card records</p></div><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></div>
    ${localeSwitch()}<p class="permission-note">New decks always receive a separate 78-card draft library.</p><div class="form-grid">
      ${field("Deck ID",item.id,"decks",item.id,"id",{readonly:true})}${field("Slug",item.slug,"decks",item.id,"slug",{readonly:true})}
      ${field("Status",item.status,"decks",item.id,"status",{options:["draft","review","active","archived"]})}${field("Access tier",item.accessTier,"decks",item.id,"accessTier",{options:["free","premium-preview","premium"]})}
      ${field("Deck name",local(item.name),"decks",item.id,"name",{locale:state.locale})}${field("Vibe",local(item.vibe),"decks",item.id,"vibe",{locale:state.locale})}
      ${field("Description",local(item.description),"decks",item.id,"description",{locale:state.locale,type:"textarea",full:true})}
      ${field("Visual direction",local(item.visualDirection),"decks",item.id,"visualDirection",{locale:state.locale,type:"textarea",full:true})}
      ${field("Reading prompt/style",local(item.prompt),"decks",item.id,"prompt",{locale:state.locale,type:"textarea",full:true})}
    </div><div class="action-bar"><button class="button" data-action="open-deck-cards" data-id="${escapeHtml(item.id)}">Open 78-card library</button></div>${actionBar("decks",item.id,item)}`;
  return `<div class="split-view"><div class="list-panel">${listToolbar("Search decks…")}<div class="record-list">${recordRows(data.decks,"deck",item.id,(record)=>`${countCardsForDeck(data,record.id)} cards · ${record.accessTier}`)}</div></div><div class="detail-panel">${detail}</div></div>`;
}
function renderCards() {
  const deckOptions = data.decks.map((deck) => `<option value="${escapeHtml(deck.id)}" ${deck.id===state.selectedDeckId?"selected":""}>${escapeHtml(local(deck.name))}</option>`).join("");
  const cards = data.cards.filter((card)=>card.deckId===state.selectedDeckId);
  let item = cards.find((record)=>record.id===state.selectedCardId) || cards[0];
  if (item) state.selectedCardId=item.id;
  if (!item) return `<div class="empty"><p>This deck has no card records.</p></div>`;
  const detail = `<div class="detail-header"><div><h2>${escapeHtml(local(item.name))}</h2><p>${escapeHtml(item.baseCardId)} · ${escapeHtml(item.deckId)}</p></div><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></div>
    ${localeSwitch()}<p class="permission-note">Card wording is deck-specific. Editing this card does not overwrite other decks.</p><div class="form-grid">
      ${field("Card ID",item.id,"cards",item.id,"id",{readonly:true})}${field("Status",item.status,"cards",item.id,"status",{options:["draft","review","published","archived"]})}
      ${field("Card name",local(item.name),"cards",item.id,"name",{locale:state.locale})}${field("Keywords",(item.keywords?.[state.locale]||[]).join(", "),"cards",item.id,"keywords",{locale:state.locale,format:"list"})}
      ${field("Upright meaning",local(item.uprightMeaning),"cards",item.id,"uprightMeaning",{locale:state.locale,type:"textarea",full:true})}
      ${field("Reversed meaning",local(item.reversedMeaning),"cards",item.id,"reversedMeaning",{locale:state.locale,type:"textarea",full:true})}
      ${field("Reflection question",local(item.reflectionQuestion),"cards",item.id,"reflectionQuestion",{locale:state.locale,type:"textarea",full:true})}
      ${field("Artwork path",item.assetPath||"","cards",item.id,"assetPath",{full:true})}
    </div>${actionBar("cards",item.id,item)}`;
  return `<div class="split-view"><div class="list-panel">${listToolbar("Search cards…",`<select data-deck-filter>${deckOptions}</select>`)}<div class="record-list">${recordRows(cards,"card",item.id,(record)=>`${record.baseCardId} · ${record.arcana}`)}</div></div><div class="detail-panel">${detail}</div></div>`;
}
function renderAssets() {
  const items = data.assets.filter((item)=>!state.search||`${item.name} ${item.path} ${item.type}`.toLowerCase().includes(state.search.toLowerCase()));
  return `${listToolbar("Search assets…")}<p class="permission-note">Assets may be deleted only when draft/archived and no content record depends on them. Image previews show the same repository media path the front end uses.</p><div class="asset-grid">${items.map((item)=>`<div class="asset-card"><div class="detail-header"><h3>${escapeHtml(item.name)}</h3><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></div>${assetPreview(item)}<div class="form-grid">${field("Name",item.name,"assets",item.id,"name",{full:true})}${field("Type",item.type,"assets",item.id,"type",{options:["tarot-card","deck-back","persona","frontend","share-card"],full:true})}${field("Status",item.status,"assets",item.id,"status",{options:["draft","review","published","archived"],full:true})}${field("Storage path",item.path,"assets",item.id,"path",{full:true})}${field("Linked to",item.linkedTo||"","assets",item.id,"linkedTo",{full:true})}</div>${actionBar("assets",item.id,item,{restore:false})}</div>`).join("")||`<div class="empty"><p>No matching assets.</p></div>`}</div>`;
}
function renderFrontend() {
  const item=data.frontendContent.find((record)=>record.id===state.selectedFrontendId)||data.frontendContent[0];
  if(!item)return `<div class="empty"><p>No app-facing content blocks.</p></div>`;
  const detail=`<div class="detail-header"><div><h2>${escapeHtml(local(item.title))}</h2><p>${escapeHtml(item.placement)} · ${escapeHtml(item.id)}</p></div><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></div>${localeSwitch()}<p class="permission-note">Published app content is loaded through the shared Supabase bundle; local storage is the offline fallback.</p><div class="form-grid">${field("Status",item.status,"frontendContent",item.id,"status",{options:["draft","review","published","archived"]})}${field("Placement",item.placement,"frontendContent",item.id,"placement",{readonly:true})}${field("Title",local(item.title),"frontendContent",item.id,"title",{locale:state.locale,full:true})}${field("Body",local(item.body),"frontendContent",item.id,"body",{locale:state.locale,type:"textarea",full:true})}${field("CTA label",local(item.ctaLabel),"frontendContent",item.id,"ctaLabel",{locale:state.locale,full:true})}</div>${actionBar("frontendContent",item.id,item)}`;
  return `<div class="split-view"><div class="list-panel">${listToolbar("Search content blocks…")}<div class="record-list">${recordRows(data.frontendContent,"frontend",item.id,(record)=>record.placement)}</div></div><div class="detail-panel">${detail}</div></div>`;
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

async function handleAction(button) {
  const action=button.dataset.action, entity=button.dataset.entity, id=button.dataset.id;
  try {
    if (action === "load-owner-guide" || action === "reload-owner-guide") { await loadOwnerGuide(); return; }
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
    else if(action==="publish"){publishEntity(data,entity,id,session.email);notify("Publishing online content bundle…");shouldPersist=true;shouldPublish=true;}
    else if(action==="archive"){archiveEntity(data,entity,id,session.email);notify("Record archived locally; syncing online…");shouldPersist=true;}
    else if(action==="restore"){restoreSeedRecord(data,seedData,entity,id,session.email);notify("Repository seed restored locally; syncing online…");shouldPersist=true;}
    else if(action==="delete"){deleteEntity(data,entity,id,session.email);state.selectedPersonaId=null;state.selectedDeckId=null;state.selectedCardId=null;notify("Record deleted locally; syncing online…");shouldPersist=true;}
    else if(action==="reset-data"){data=buildInitialData(repositorySeed);seedData=JSON.parse(JSON.stringify(data));notify("Local review data reset from repository seed; syncing online…");shouldPersist=true;}
    else if(action==="open-deck-cards"){state.selectedDeckId=id;state.selectedCardId=data.cards.find((card)=>card.deckId===id)?.id;setRoute("cards");}
    saveData(); render();
    if (shouldPersist) await persistRemote({ publish: shouldPublish });
  } catch(error){notify(error.message,true);}
}

document.addEventListener("click",(event)=>{
  const route=event.target.closest("[data-route]");if(route){state.search="";setRoute(route.dataset.route);return;}
  const locale=event.target.closest("[data-locale]");if(locale){state.locale=locale.dataset.locale;render();return;}
  const select=event.target.closest("[data-select]");if(select){const type=select.dataset.select;if(type==="persona")state.selectedPersonaId=select.dataset.id;if(type==="deck")state.selectedDeckId=select.dataset.id;if(type==="card")state.selectedCardId=select.dataset.id;if(type==="frontend")state.selectedFrontendId=select.dataset.id;render();return;}
  const action=event.target.closest("[data-action]");if(action)handleAction(action);
});
function stageBoundValue(target) {
  const entity=target.dataset.entity, id=target.dataset.id, fieldName=target.dataset.field;
  const item=data[entity]?.find((record)=>record.id===id);
  if(!item||!permissions.canEdit||(!permissions.canPublish && (item.status !== "draft" || fieldName === "status")))return;
  const value=target.dataset.format==="list"?String(target.value).split(",").map((part)=>part.trim()).filter(Boolean):target.value;
  if(target.dataset.locale)item[fieldName]={...(item[fieldName]||{}),[target.dataset.locale]:value};
  else item[fieldName]=value;
  item.updatedAt=new Date().toISOString();item.updatedBy=session.email;
  saveData();
}
document.addEventListener("input",(event)=>{
  if(event.target.matches("[data-search]")){
    // Re-rendering replaces the input; put focus and caret back so typing continues (analysis AD-16).
    const caret=event.target.selectionStart;state.search=event.target.value;render();
    const search=document.querySelector("[data-search]");if(search){search.focus();search.setSelectionRange?.(caret,caret);}
    return;
  }
  if(event.target.matches("[data-bind]"))stageBoundValue(event.target);
});
document.addEventListener("change",(event)=>{
  if(event.target.matches("[data-deck-filter]")){state.selectedDeckId=event.target.value;state.selectedCardId=data.cards.find((card)=>card.deckId===state.selectedDeckId)?.id;render();return;}
  if(!event.target.matches("[data-bind]"))return;
  const current = data[event.target.dataset.entity]?.find((record) => record.id === event.target.dataset.id);
  if(!permissions.canEdit || !current || (!permissions.canPublish && (event.target.dataset.field === "status" || current.status !== "draft")))return;
  try{updateEntity(data,event.target.dataset.entity,event.target.dataset.id,event.target.dataset.field,event.target.value,{locale:event.target.dataset.locale,format:event.target.dataset.format,editorId:session.email});saveData("Change saved locally.");render();}catch(error){notify(error.message,true);}
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
  contentSync = await createContentSync();
  if (legacyIdentityConflictNotice) setSyncState("pending");
  else if (contentSync) {
    try {
      remoteState = await contentSync.load();
      if (pendingOutbox) setSyncState("pending");
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
}
init().catch((error)=>{$("#workspace-content").innerHTML=`<div class="empty"><p>${escapeHtml(error.message)}</p></div>`;});
