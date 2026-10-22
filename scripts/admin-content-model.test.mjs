import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildInitialData, permissionsFor, createDraftPersona, createDraftDeck, updateEntity,
  publishEntity, archiveEntity, deleteEntity, canSafelyDelete, migrateLegacyDeckIdentity
} from "../apps/admin/content-model.mjs";

const seed = JSON.parse(fs.readFileSync(new URL("../apps/admin/generated/content-seed.json", import.meta.url), "utf8"));
const fresh = () => buildInitialData(seed);

test("owner can administer while regular mobile users cannot view admin data", () => {
  assert.equal(permissionsFor("owner").canDelete, true);
  assert.equal(permissionsFor("content_admin").canPublish, true);
  assert.equal(permissionsFor("reviewer").canEdit, false);
  assert.equal(permissionsFor("regular_user").canView, false);
});

test("repository seed creates a deck-specific card library", () => {
  const data = fresh();
  assert.equal(data.cards.length, data.decks.length * 78);
  for (const deck of data.decks) assert.equal(data.cards.filter((card) => card.deckId === deck.id).length, 78);
});

test("new deck creates exactly 78 editable card drafts", () => {
  const data = fresh();
  const deck = createDraftDeck(data, "owner@nilaza.ai");
  const cards = data.cards.filter((card) => card.deckId === deck.id);
  assert.equal(cards.length, 78);
  assert.ok(cards.every((card) => card.status === "draft"));
});

test("persona localized edits survive serialization and publish", () => {
  const data = fresh();
  const persona = createDraftPersona(data, "content@nilaza.ai");
  updateEntity(data, "personas", persona.id, "description", "Nội dung thử nghiệm", { locale: "vi", editorId: "content@nilaza.ai" });
  publishEntity(data, "personas", persona.id, "content@nilaza.ai");
  const restored = JSON.parse(JSON.stringify(data));
  const record = restored.personas.find((item) => item.id === persona.id);
  assert.equal(record.description.vi, "Nội dung thử nghiệm");
  assert.equal(record.status, "active");
  assert.equal(record.updatedBy, "content@nilaza.ai");
});

test("permanent deletion is limited to draft or archived records", () => {
  const data = fresh();
  const persona = createDraftPersona(data);
  assert.equal(canSafelyDelete(data, "personas", persona.id).allowed, true);
  publishEntity(data, "personas", persona.id);
  assert.equal(canSafelyDelete(data, "personas", persona.id).allowed, false);
  archiveEntity(data, "personas", persona.id);
  deleteEntity(data, "personas", persona.id);
  assert.equal(data.personas.some((item) => item.id === persona.id), false);
});

test("deleting an archived custom deck also removes its 78 dependent cards", () => {
  const data = fresh();
  const deck = createDraftDeck(data);
  archiveEntity(data, "decks", deck.id);
  deleteEntity(data, "decks", deck.id);
  assert.equal(data.cards.some((card) => card.deckId === deck.id), false);
});

function legacyDraft() {
  const value = buildInitialData({
    ...seed,
    sourceVersion: "synthetic-owner-edits-v1",
    decks: [{ id: "tinh-quang", slug: "tinh-quang", status: "review", name: { vi: "Tinh Quang", en: "Celestial Reverie" } }],
    assets: [{ id: "tinh-quang-back", type: "deck-back", linkedTo: "tinh-quang", path: "assets/tarot/deck-backs/tinh-quang.png", status: "draft" }]
  });
  value.decks[0].description = { vi: "Bản nháp tự viết cần giữ lại.", en: "Keep this unsaved review draft." };
  value.cards[4].intro = { vi: "Ghi chú riêng cho bản nháp QA.", en: "Synthetic per-card draft edit." };
  value.cards[4].overrides = { reflectionQuestion: { vi: "Mình muốn thử điều gì?", en: "What might I try?" }, customField: { originalText: "tinh-quang" } };
  value.cards[4].assetPath = `assets/tarot/tinh-quang/cards/${value.cards[4].baseCardId}.png`;
  value.cards[4].assetId = "tinh-quang-back";
  value.cards[4].status = "review";
  value.audit = [{ id: "synthetic-audit", action: "Edited tinh-quang draft", createdAt: "2026-10-18T01:02:03Z" }];
  value.customData = { queuedAt: "2026-10-18T02:03:04Z", note: "tinh-quang must remain in prose" };
  return value;
}

test("legacy cache migration keeps all 78 edits and metadata without mutating its input", () => {
  const original = legacyDraft();
  const before = structuredClone(original);
  const result = migrateLegacyDeckIdentity(original);
  assert.deepEqual(original, before);
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.changed, true);
  assert.equal(result.data.decks[0].id, "celestial-reverie");
  assert.equal(result.data.decks[0].slug, "celestial-reverie");
  assert.equal(result.data.cards.length, 78);
  assert.ok(result.data.cards.every(card => card.id === `celestial-reverie--${card.baseCardId}` && card.deckId === "celestial-reverie"));
  const expected = structuredClone(before);
  expected.decks[0].id = expected.decks[0].slug = "celestial-reverie";
  for (const card of expected.cards) {
    card.id = `celestial-reverie--${card.baseCardId}`;
    card.deckId = "celestial-reverie";
  }
  expected.cards[4].assetPath = `assets/tarot/celestial-reverie/cards/${expected.cards[4].baseCardId}.png`;
  expected.cards[4].assetId = "celestial-reverie-back";
  Object.assign(expected.assets[0], { id: "celestial-reverie-back", linkedTo: "celestial-reverie", path: "assets/tarot/deck-backs/celestial-reverie.png" });
  assert.deepEqual(result.data, expected, "only allowlisted identities and standard asset paths may change");
  assert.deepEqual(migrateLegacyDeckIdentity(result.data), { data: expected, changed: false, conflicts: [] });
});

test("legacy migration translates standard paths and references while preserving custom paths and unrelated records", () => {
  const value = legacyDraft();
  value.decks.push({ id: "custom-deck-1", slug: "tinh-quang", name: { vi: "Giữ nguyên", en: "Unchanged" } });
  value.cards[0].assetPath = "https://example.test/tinh-quang/art.png";
  value.cards[1].assetPath = "assets/custom/tinh-quang/art.png";
  value.cards[2].assetPath = "apps/mobile/assets/runtime/tarot/tinh-quang/cards/major-02-high-priestess.jpg";
  value.personas[0].mediaAssetId = "tinh-quang-back";
  value.frontendContent[0].assetId = "tinh-quang-back";
  value.assets.push({ id: "owner-custom", linkedTo: "tinh-quang--major-00-fool", path: "apps/mobile/assets/runtime/tarot/deck-covers/tinh-quang.jpg", ownerMetadata: { path: "assets/tarot/tinh-quang/archive.png" } });
  const result = migrateLegacyDeckIdentity(value);
  assert.deepEqual(result.data.decks[1], value.decks[1]);
  assert.equal(result.data.cards[0].assetPath, value.cards[0].assetPath);
  assert.equal(result.data.cards[1].assetPath, value.cards[1].assetPath);
  assert.equal(result.data.cards[2].assetPath, "apps/mobile/assets/runtime/tarot/celestial-reverie/cards/major-02-high-priestess.jpg");
  assert.equal(result.data.personas[0].mediaAssetId, "celestial-reverie-back");
  assert.equal(result.data.frontendContent[0].assetId, "celestial-reverie-back");
  assert.deepEqual(result.data.assets[1], { ...value.assets[1], linkedTo: "celestial-reverie--major-00-fool", path: "apps/mobile/assets/runtime/tarot/deck-covers/celestial-reverie.jpg" });
  const partial = { schemaVersion: 4, decks: [{}], cards: [null, {}], assets: [{}], retained: true };
  assert.deepEqual(migrateLegacyDeckIdentity(partial), { data: partial, changed: false, conflicts: [] });
});

test("old/new identity collisions retain the complete original cache and every edit instead of merging or throwing", () => {
  for (const entity of ["decks", "cards", "assets"]) {
    const value = legacyDraft();
    const collision = structuredClone(value[entity][0]);
    collision.id = entity === "decks" ? "celestial-reverie" : entity === "assets" ? "celestial-reverie-back" : `celestial-reverie--${collision.baseCardId}`;
    collision.ownerNote = "Separate synthetic edit that must not be discarded";
    value[entity].push(collision);
    const before = structuredClone(value);
    const result = migrateLegacyDeckIdentity(value);
    assert.equal(result.changed, false);
    assert.equal(result.conflicts.length, 1);
    assert.equal(result.conflicts[0].entity, entity);
    assert.deepEqual(result.data, before);
    assert.deepEqual(value, before);
  }
});
