export const STORAGE_KEY = "nilaza.admin.content.v4";

export const rolePermissions = {
  owner: { canView: true, canEdit: true, canPublish: true, canDelete: true, canManageAssets: true },
  content_admin: { canView: true, canEdit: true, canPublish: true, canDelete: false, canManageAssets: true },
  // Owner decision 15/11 (migration 20261115090000): only owner publishes; admin drafts like editor.
  admin: { canView: true, canEdit: true, canPublish: false, canDelete: false, canManageAssets: true },
  editor: { canView: true, canEdit: true, canPublish: false, canDelete: false, canManageAssets: false },
  safety_reviewer: { canView: true, canEdit: false, canPublish: false, canDelete: false, canManageAssets: false },
  reviewer: { canView: true, canEdit: false, canPublish: false, canDelete: false, canManageAssets: false },
  viewer: { canView: true, canEdit: false, canPublish: false, canDelete: false, canManageAssets: false },
  regular_user: { canView: false, canEdit: false, canPublish: false, canDelete: false, canManageAssets: false }
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const localized = (value, locale = "en") => value?.[locale] ?? value?.en ?? value?.vi ?? "";
const now = () => new Date().toISOString();
// Next free number for custom ids (analysis AD-04): counting records reused a number after a deletion.
function nextCustomNumber(items, prefix) {
  const used = items.map((item) => item.id.startsWith(prefix) ? Number(item.id.slice(prefix.length)) : 0).filter(Number.isInteger);
  return Math.max(0, ...used) + 1;
}
const slugify = (value) => String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Read compatibility only: do not regenerate a cached draft from the seed or
// rewrite prose, edits, versions, timestamps, or audit history during a rename.
export function migrateLegacyDeckIdentity(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { data: value, changed: false, conflicts: [] };
  }
  const data = clone(value);
  const deckId = (id) => id === "tinh-quang" ? "celestial-reverie" : id;
  const cardId = (id) => typeof id === "string" && id.startsWith("tinh-quang--")
    ? `celestial-reverie--${id.slice("tinh-quang--".length)}` : id;
  const assetId = (id) => id === "tinh-quang-back" ? "celestial-reverie-back" : id;
  const reference = (id) => assetId(cardId(deckId(id)));
  const assetPath = (path) => {
    if (typeof path !== "string") return path;
    for (const prefix of ["assets/tarot/", "apps/mobile/assets/runtime/tarot/"]) {
      if (path.startsWith(`${prefix}tinh-quang/`)) {
        return `${prefix}celestial-reverie/${path.slice(`${prefix}tinh-quang/`.length)}`;
      }
      const extension = prefix === "assets/tarot/" ? "png" : "jpg";
      for (const role of ["covers", "backs"]) {
        if (path === `${prefix}deck-${role}/tinh-quang.${extension}`) {
          return `${prefix}deck-${role}/celestial-reverie.${extension}`;
        }
      }
    }
    return path;
  };
  const each = (entity, update) => {
    if (Array.isArray(data[entity])) data[entity].forEach((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) update(item);
    });
  };
  each("decks", (deck) => {
    const renamedDeck = deck.id === "tinh-quang" || deck.id === "celestial-reverie";
    if (Object.hasOwn(deck, "id")) deck.id = deckId(deck.id);
    if (renamedDeck && Object.hasOwn(deck, "slug")) deck.slug = deckId(deck.slug);
  });
  each("cards", (card) => {
    if (Object.hasOwn(card, "id")) card.id = cardId(card.id);
    if (Object.hasOwn(card, "deckId")) card.deckId = deckId(card.deckId);
    if (Object.hasOwn(card, "assetPath")) card.assetPath = assetPath(card.assetPath);
  });
  each("assets", (asset) => {
    if (Object.hasOwn(asset, "id")) asset.id = assetId(asset.id);
    if (Object.hasOwn(asset, "linkedTo")) asset.linkedTo = reference(asset.linkedTo);
    if (Object.hasOwn(asset, "path")) asset.path = assetPath(asset.path);
  });
  for (const entity of ["personas", "decks", "cards", "frontendContent"]) {
    each(entity, (item) => {
      for (const field of ["assetId", "mediaAssetId"]) {
        if (Object.hasOwn(item, field)) item[field] = assetId(item[field]);
      }
    });
  }
  const conflicts = [];
  for (const entity of ["decks", "cards", "assets"]) {
    const seen = new Map();
    if (!Array.isArray(data[entity])) continue;
    data[entity].forEach((item, index) => {
      if (typeof item?.id !== "string") return;
      const rows = seen.get(item.id) || [];
      rows.push(index);
      seen.set(item.id, rows);
    });
    for (const [id, indexes] of seen) {
      if (indexes.length > 1 && indexes.some((index) => value[entity][index]?.id !== id)) {
        conflicts.push({ entity, id, indexes });
      }
    }
  }
  // Never merge duplicate identities or throw into a cache loader's seed
  // fallback. The caller can retain the complete original draft and explain it.
  if (conflicts.length) return { data: clone(value), changed: false, conflicts };
  return { data, changed: JSON.stringify(data) !== JSON.stringify(value), conflicts };
}

function normalizePersona(persona) {
  return {
    ...clone(persona),
    status: persona.status === "active" ? "active" : (persona.status || "draft"),
    role: clone(persona.displayRole || persona.role || persona.sourceInspiration || { vi: "AI guide phản tư", en: "Reflective AI guide" }),
    description: clone(persona.shortDescription || persona.description || { vi: "", en: "" }),
    transparency: clone(persona.transparencyNote || persona.transparency || { vi: "", en: "" }),
    prompt: clone(persona.prompt || {
      vi: `Bạn là ${localized(persona.name, "vi")}, một AI guide minh bạch, ấm áp và súc tích.`,
      en: `You are ${localized(persona.name, "en")}, a transparent, warm, and concise AI guide.`
    }),
    updatedAt: persona.updatedAt || now(),
    updatedBy: persona.updatedBy || "seed"
  };
}

function normalizeDeck(deck) {
  return {
    ...clone(deck),
    status: deck.status === "active" ? "active" : (deck.status || "draft"),
    description: clone(deck.shortDescription || deck.description || { vi: "", en: "" }),
    themes: clone(deck.theme || deck.themes || []),
    prompt: clone(deck.prompt || deck.readingStyle || { vi: "", en: "" }),
    updatedAt: deck.updatedAt || now(),
    updatedBy: deck.updatedBy || "seed"
  };
}

function cardForDeck(card, deckId) {
  return {
    ...clone(card),
    id: `${deckId}--${card.id}`,
    baseCardId: card.id,
    deckId,
    status: card.status || "published",
    assetPath: card.assetPath || "",
    updatedAt: card.updatedAt || now(),
    updatedBy: card.updatedBy || "seed"
  };
}

export function buildInitialData(seed) {
  const baseCards = clone(seed.cards || []);
  const decks = (seed.decks || []).map(normalizeDeck);
  return {
    schemaVersion: 4,
    sourceVersion: seed.sourceVersion || "development",
    personas: (seed.personas || []).map(normalizePersona),
    decks,
    baseCards,
    cards: decks.flatMap((deck) => baseCards.map((card) => cardForDeck(card, deck.id))),
    assets: clone(seed.assets || []),
    frontendContent: clone(seed.frontendContent || []),
    audit: [{ id: `audit-${Date.now()}`, action: "Loaded repository seed", editorId: "system", createdAt: now() }]
  };
}

export function permissionsFor(role) {
  return rolePermissions[role] || rolePermissions.regular_user;
}

export function createDraftPersona(data, editorId = "owner@nilaza.ai") {
  const number = nextCustomNumber(data.personas, "persona-custom-");
  const id = `persona-custom-${number}`;
  const persona = normalizePersona({
    id,
    slug: `custom-guide-${number}`,
    type: "custom_guide",
    status: "draft",
    accessTier: "free",
    name: { vi: `Guide mới ${number}`, en: `New guide ${number}` },
    displayRole: { vi: "AI guide phản tư tùy chỉnh", en: "Custom reflective AI guide" },
    shortDescription: { vi: "Bản nháp persona mới.", en: "New persona draft." },
    transparencyNote: { vi: "Đây là AI guide, không phải người thật.", en: "This is an AI guide, not a real person." },
    suggestedPrompts: { vi: ["Tôi nên nhìn điều này như thế nào?"], en: ["How should I look at this?"] },
    tone: ["warm", "reflective"], themes: ["self"]
  });
  persona.updatedBy = editorId;
  data.personas.unshift(persona);
  logAction(data, `Created persona draft ${id}`, editorId);
  return persona;
}

export function createDraftDeck(data, editorId = "owner@nilaza.ai") {
  const number = nextCustomNumber(data.decks, "custom-deck-");
  const id = `custom-deck-${number}`;
  const deck = normalizeDeck({
    id, slug: id, status: "draft", accessTier: "free",
    name: { vi: `Bộ bài mới ${number}`, en: `New deck ${number}` },
    shortDescription: { vi: "Bản nháp bộ bài mới.", en: "New tarot deck draft." },
    vibe: { vi: "Ấm áp, phản tư", en: "Warm, reflective" },
    visualDirection: { vi: "Chưa xác định", en: "To be defined" },
    readingStyle: { vi: "Diễn giải biểu tượng và kết thúc bằng câu hỏi phản tư.", en: "Symbolic interpretation ending with a reflection question." },
    theme: ["self"]
  });
  deck.updatedBy = editorId;
  data.decks.unshift(deck);
  data.cards.push(...data.baseCards.map((card) => ({ ...cardForDeck(card, id), status: "draft", updatedBy: editorId })));
  logAction(data, `Created deck draft ${id} with 78 card drafts`, editorId);
  return deck;
}

export function createDraftAsset(data, editorId = "owner@nilaza.ai") {
  const number = nextCustomNumber(data.assets, "asset-custom-");
  const asset = { id: `asset-custom-${number}`, name: `Draft asset ${number}`, type: "frontend", path: "", status: "draft", linkedTo: "", updatedAt: now(), updatedBy: editorId };
  data.assets.unshift(asset);
  logAction(data, `Created asset draft ${asset.id}`, editorId);
  return asset;
}

export function updateEntity(data, entity, id, field, value, { locale, editorId = "owner@nilaza.ai", format } = {}) {
  const item = data[entity]?.find((record) => record.id === id);
  if (!item) throw new Error(`Unknown ${entity} record: ${id}`);
  const nextValue = format === "list" ? String(value).split(",").map((part) => part.trim()).filter(Boolean) : value;
  if (locale) item[field] = { ...(item[field] || {}), [locale]: nextValue };
  else item[field] = nextValue;
  item.updatedAt = now();
  item.updatedBy = editorId;
  logAction(data, `Updated ${entity}/${id}.${field}${locale ? `.${locale}` : ""}`, editorId);
  return item;
}

export function publishEntity(data, entity, id, editorId = "owner@nilaza.ai") {
  const item = data[entity]?.find((record) => record.id === id);
  if (!item) throw new Error(`Unknown ${entity} record: ${id}`);
  item.status = ["personas", "decks"].includes(entity) ? "active" : "published";
  item.updatedAt = now(); item.updatedBy = editorId;
  logAction(data, `Published ${entity}/${id}`, editorId);
  return item;
}

export function archiveEntity(data, entity, id, editorId = "owner@nilaza.ai") {
  const item = data[entity]?.find((record) => record.id === id);
  if (!item) throw new Error(`Unknown ${entity} record: ${id}`);
  item.status = "archived"; item.updatedAt = now(); item.updatedBy = editorId;
  logAction(data, `Archived ${entity}/${id}`, editorId);
  return item;
}

export function canSafelyDelete(data, entity, id) {
  const item = data[entity]?.find((record) => record.id === id);
  if (!item || !["draft", "archived"].includes(item.status)) return { allowed: false, reason: "Only draft or archived records can be permanently deleted." };
  if (entity === "assets") {
    const inUse = data.personas.some((record) => record.mediaAssetId === id) || data.cards.some((record) => record.assetId === id) || data.frontendContent.some((record) => record.assetId === id);
    if (inUse || item.linkedTo) return { allowed: false, reason: "Asset is still linked to content." };
  }
  return { allowed: true, reason: "Safe to delete." };
}

export function deleteEntity(data, entity, id, editorId = "owner@nilaza.ai") {
  const safety = canSafelyDelete(data, entity, id);
  if (!safety.allowed) throw new Error(safety.reason);
  data[entity] = data[entity].filter((record) => record.id !== id);
  if (entity === "decks") data.cards = data.cards.filter((card) => card.deckId !== id);
  logAction(data, `Permanently deleted ${entity}/${id}`, editorId);
}

export function restoreSeedRecord(data, seedData, entity, id, editorId = "owner@nilaza.ai") {
  const seedItem = seedData[entity]?.find((record) => record.id === id);
  if (!seedItem) throw new Error("This custom record does not have a repository seed.");
  const index = data[entity].findIndex((record) => record.id === id);
  data[entity][index] = clone(seedItem);
  logAction(data, `Restored repository seed for ${entity}/${id}`, editorId);
  return data[entity][index];
}

export function logAction(data, action, editorId) {
  data.audit.unshift({ id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`, action, editorId, createdAt: now() });
  data.audit = data.audit.slice(0, 100);
}

export function recordLabel(item, locale = "en") {
  return localized(item?.name || item?.title, locale) || item?.id || "Untitled";
}

export function countCardsForDeck(data, deckId) {
  return data.cards.filter((card) => card.deckId === deckId).length;
}

export function suggestedSlug(name) { return slugify(name); }
