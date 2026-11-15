// Admin A3 (spec ADMIN_SCREENS_SPEC_2026-11-04 rows D7, D8; sections 3.3-3.5): pure helpers for per-item drafts,
// publish review, list filters and image upload checks. No DOM and no network here, so the rules are testable.
import { compactCard } from "./content-sync.js";

export const ITEM_KINDS = Object.freeze({ personas: "persona", decks: "deck", cards: "card", frontendContent: "frontend", assets: "asset" });
export const ENTITY_BY_KIND = Object.freeze(Object.fromEntries(Object.entries(ITEM_KINDS).map(([entity, kind]) => [kind, entity])));
// Migration file each feature needs; shown to the Owner when the server does not have it yet.
export const MIGRATIONS = Object.freeze({
  items: "20261113100000_admin_content_items.sql",
  timeline: "20261113100100_admin_timeline.sql",
  bucket: "20261113100200_content_images_bucket.sql"
});
export const IMAGE_MAX_BYTES = 1024 * 1024;
export const IMAGE_TYPES = Object.freeze({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" });
const IMAGE_FOLDERS = Object.freeze({ personas: "personas", decks: "decks", cards: "cards", frontendContent: "frontend", assets: "assets" });

const clone = (value) => JSON.parse(JSON.stringify(value));
const filled = (value) => Array.isArray(value) ? value.some((part) => String(part ?? "").trim()) : String(value ?? "").trim().length > 0;

export const itemKey = (entity, id) => `${ITEM_KINDS[entity]}/${id}`;

// Fields that must exist in both Vietnamese and English for the "Thiếu bản dịch" filter.
const LOCALIZED_FIELDS = Object.freeze({
  personas: ["name", "role", "description", "transparency"],
  decks: ["name", "description", "vibe"],
  cards: ["name", "keywords", "uprightMeaning", "reversedMeaning", "reflectionQuestion"],
  frontendContent: ["title", "body"],
  assets: []
});

export function translationGaps(entity, item) {
  const gaps = [];
  for (const field of LOCALIZED_FIELDS[entity] || []) {
    for (const locale of ["vi", "en"]) if (!filled(item?.[field]?.[locale])) gaps.push(`${field}.${locale}`);
  }
  return gaps;
}

export const missingImage = (card) => !String(card?.assetPath ?? "").trim();

// The draft payload saved to the server for one item: cards use the compact bundle form, others a plain copy.
export function itemPayloadFor(data, entity, id) {
  const item = data[entity]?.find((record) => record.id === id);
  if (!item) throw new Error(`Unknown ${entity} record: ${id}`);
  if (entity !== "cards") return clone(item);
  const base = (data.baseCards || []).find((card) => card.id === (item.baseCardId || item.id));
  return compactCard(item, base);
}

// The Admin working shape of a saved payload: cards are expanded from their base card plus overrides, exactly as
// fromBundleRecord expands a published bundle (an omitted field means "same as the base card").
export function workingItemFrom(entity, payload, data) {
  if (entity !== "cards") return clone(payload);
  const base = (data.baseCards || []).find((card) => card.id === (payload.baseCardId || payload.id));
  if (!base) return clone(payload);
  const card = { ...clone(base), id: payload.id, baseCardId: payload.baseCardId || base.id, deckId: payload.deckId };
  Object.assign(card, clone(payload), clone(payload.overrides || {}));
  if (!payload.overrides) delete card.overrides;
  return card;
}

export function applyItemToData(data, entity, item) {
  const list = data[entity] || (data[entity] = []);
  const index = list.findIndex((record) => record.id === item.id);
  if (index >= 0) list[index] = item;
  else list.push(item);
  return item;
}

const IGNORED_DIFF_FIELDS = new Set(["updatedAt", "updatedBy", "overrides"]);
const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const show = (value) => value === undefined || value === null ? "" : Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : String(value);

// Field-by-field difference between the published item (before) and the draft (after); localized objects are split
// per language so a VI-only change shows as one row.
export function diffItem(before, after) {
  const rows = [];
  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])].filter((key) => !IGNORED_DIFF_FIELDS.has(key));
  for (const field of keys) {
    const a = before?.[field], b = after?.[field];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    if ((isPlainObject(a) || a === undefined) && (isPlainObject(b) || b === undefined)) {
      for (const sub of [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])]) {
        if (JSON.stringify(a?.[sub]) !== JSON.stringify(b?.[sub])) rows.push({ field, locale: sub, before: show(a?.[sub]), after: show(b?.[sub]) });
      }
    } else rows.push({ field, locale: "", before: show(a), after: show(b) });
  }
  return rows;
}

// List filters. ctx: { hasDraft(entity, id), hasLocalEdit(entity, id), liveStatus(entity, id) }.
export const LIST_FILTERS = Object.freeze({
  default: [["all", "Tất cả"], ["live", "Đang dùng"], ["draft", "Nháp"], ["missing-translation", "Thiếu bản dịch"]],
  cards: [["all", "Tất cả"], ["missing-translation", "Thiếu bản dịch"], ["missing-image", "Thiếu ảnh"], ["unpublished", "Sửa chưa phát hành"]]
});
export function matchesFilter(entity, item, filter, ctx) {
  const pending = ctx.hasDraft(entity, item.id) || ctx.hasLocalEdit(entity, item.id);
  switch (filter) {
    case "live": return ["active", "published"].includes(ctx.liveStatus(entity, item.id));
    case "draft": return pending || ["draft", "review"].includes(item.status);
    case "missing-translation": return translationGaps(entity, item).length > 0;
    case "missing-image": return missingImage(item);
    case "unpublished": return pending;
    default: return true;
  }
}

export function isMissingFunction(error) {
  const code = String(error?.code || "");
  return Boolean(error?.missingFunction) || code === "PGRST202" || code === "42883";
}

// Empty string when the file can be uploaded; otherwise a Vietnamese reason.
export function validateImageFile(file) {
  if (!file) return "Chưa chọn tệp ảnh.";
  if (!Object.hasOwn(IMAGE_TYPES, file.type)) return "Chỉ nhận ảnh PNG, JPEG hoặc WebP.";
  if (file.size > IMAGE_MAX_BYTES) return `Ảnh lớn hơn 1 MB (${(file.size / 1048576).toFixed(1)} MB). Hãy nén ảnh rồi tải lại.`;
  return "";
}

// Object name inside content-images: <folder>/<item id>-<time>.<ext>. A new name per upload, so a published path
// never changes under the app.
export function imageObjectPath(entity, id, file, now = Date.now()) {
  const folder = IMAGE_FOLDERS[entity] || "assets";
  const safeId = String(id).replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "image";
  return `${folder}/${safeId}-${now}.${IMAGE_TYPES[file.type]}`;
}
