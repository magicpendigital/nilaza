import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildInitialData, migrateLegacyDeckIdentity } from "../apps/admin/content-model.mjs";
import { fromBundleRecord, toBundlePayload } from "../apps/admin/content-sync.js";

const seed = JSON.parse(fs.readFileSync(new URL("../apps/admin/generated/content-seed.json", import.meta.url), "utf8"));

test("content sync keeps the full Admin shape while compacting deck cards", () => {
  const data = buildInitialData(seed);
  const payload = toBundlePayload(data);
  assert.equal(payload.personas.length, 17);
  assert.equal(payload.decks.length, seed.decks.length);
  assert.equal(payload.baseCards.length, 78);
  assert.equal(payload.cards.length, seed.decks.length * 78);
  assert.equal(payload.cards[0].overrides, undefined, "unchanged card copy should not be duplicated");

  const restored = fromBundleRecord({ payload, source_version: seed.sourceVersion });
  assert.equal(restored.cards.length, data.cards.length);
  assert.deepEqual(restored.cards.find((card) => card.id === data.cards[0].id).uprightMeaning, data.cards[0].uprightMeaning);
  assert.equal(restored.frontendContent.length, data.frontendContent.length);
});

test("content sync can normalize an already compact payload", () => {
  const data = buildInitialData(seed);
  const compact = toBundlePayload(data);
  assert.deepEqual(toBundlePayload(compact), compact);
});

function legacyCompactDraft() {
  const data = buildInitialData({
    ...seed,
    sourceVersion: "synthetic-legacy-review-v1",
    decks: [{ id: "tinh-quang", slug: "tinh-quang", status: "review", name: { vi: "Tinh Quang", en: "Celestial Reverie" } }]
  });
  data.cards[7].intro = { vi: "Bản sửa QA cần được giữ.", en: "Retain this synthetic draft edit." };
  data.cards[7].status = "draft";
  data.cards[7].updatedAt = "2026-10-18T03:04:05Z";
  data.cards[7].updatedBy = "synthetic-reviewer";
  data.cards[7].assetPath = "assets/tarot/tinh-quang/cards/major-07-chariot.png";
  const payload = toBundlePayload(data);
  payload.cards[7].overrides.customMetadata = { note: "Keep unknown override fields too" };
  return payload;
}

test("legacy compact card IDs migrate before expansion so all 78 cards and edited overrides survive", () => {
  const payload = legacyCompactDraft();
  const original = structuredClone(payload);
  const restored = fromBundleRecord({ payload, source_version: "remote-reviewed-version" });
  assert.deepEqual(payload, original);
  assert.equal(restored.decks[0].id, "celestial-reverie");
  assert.equal(restored.sourceVersion, "remote-reviewed-version");
  assert.equal(restored.cards.length, 78);
  assert.ok(restored.cards.every(card => card.id === `celestial-reverie--${card.baseCardId}` && card.deckId === "celestial-reverie"));
  const edited = restored.cards[7];
  assert.deepEqual(edited.intro, original.cards[7].overrides.intro);
  assert.deepEqual(edited.customMetadata, original.cards[7].overrides.customMetadata);
  assert.equal(edited.status, "draft");
  assert.equal(edited.updatedAt, "2026-10-18T03:04:05Z");
  assert.equal(edited.updatedBy, "synthetic-reviewer");
  assert.equal(edited.assetPath, "assets/tarot/celestial-reverie/cards/major-07-chariot.png");
  const roundTrip = fromBundleRecord({ payload: toBundlePayload(restored) });
  assert.deepEqual(roundTrip.cards[7].intro, edited.intro);
  assert.deepEqual(roundTrip.cards[7].overrides.customMetadata, original.cards[7].overrides.customMetadata);
  assert.deepEqual(roundTrip.cards[7].customMetadata, original.cards[7].overrides.customMetadata);
  assert.equal(roundTrip.cards[7].status, edited.status);
});

test("a read-migrated outbox preserves its base version, queue time, unknown envelope fields and compact overrides", () => {
  const outbox = { payload: legacyCompactDraft(), basePublishedVersion: 19, queuedAt: "2026-10-18T04:05:06Z", clientMetadata: { retry: 2 } };
  const original = structuredClone(outbox);
  const migrated = { ...outbox, payload: migrateLegacyDeckIdentity(outbox.payload).data };
  assert.deepEqual(outbox, original);
  assert.deepEqual({ ...migrated, payload: null }, { ...original, payload: null });
  assert.deepEqual(migrated.payload.cards[7].overrides, original.payload.cards[7].overrides);
  assert.equal(migrated.payload.cards[7].id, "celestial-reverie--major-07-chariot");
  assert.equal(migrated.payload.sourceVersion, original.payload.sourceVersion);
  assert.deepEqual(migrateLegacyDeckIdentity(migrated.payload).data, migrated.payload);
});

test("conflicting legacy and canonical bundle IDs fail visibly before expanding or discarding any edited record", () => {
  const payload = legacyCompactDraft();
  payload.cards.push({ ...structuredClone(payload.cards[0]), id: `celestial-reverie--${payload.cards[0].baseCardId}`, ownerNote: "Distinct edit" });
  const original = structuredClone(payload);
  assert.throws(() => fromBundleRecord({ payload }), error => error.code === "legacy_deck_identity_conflict" && /Original records and edits are preserved/.test(error.message));
  assert.deepEqual(payload, original);
});

test("unmatched compact drafts remain intact across legacy expansion and repeated serialization", () => {
  const payload = legacyCompactDraft();
  const orphan = {
    id: "tinh-quang--synthetic-unmatched-card", baseCardId: "synthetic-unmatched-card", deckId: "tinh-quang",
    status: "review", assetPath: "assets/custom/owner-art.png", updatedAt: "2026-10-18T05:06:07Z", updatedBy: "synthetic-reviewer",
    overrides: { intro: { vi: "Bản nháp chưa có trong seed.", en: "A draft not present in this seed." }, customNote: { retained: true } }
  };
  payload.cards.push(orphan);
  const before = structuredClone(payload);
  const expected = { ...structuredClone(orphan), id: "celestial-reverie--synthetic-unmatched-card", deckId: "celestial-reverie" };
  const restored = fromBundleRecord({ payload });
  assert.deepEqual(payload, before);
  assert.equal(restored.cards.length, 79);
  assert.deepEqual(restored.cards.find(card => card.id === expected.id), expected);
  const repeated = fromBundleRecord({ payload: toBundlePayload(restored) });
  assert.equal(repeated.cards.length, 79);
  assert.deepEqual(repeated.cards.find(card => card.id === expected.id), expected);
});
