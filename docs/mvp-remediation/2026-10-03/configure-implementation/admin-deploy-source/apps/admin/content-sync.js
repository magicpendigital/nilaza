import { buildInitialData } from "./content-model.mjs";

const BUNDLE_KEY = "nilaza_default";
const REQUIRED_ARRAYS = ["personas", "decks", "cards", "assets", "frontendContent"];
const CARD_CONTENT_FIELDS = ["name", "keywords", "intro", "personalityPortrait", "uprightMeaning", "reversedMeaning", "reflectionQuestion"];

const clone = (value) => JSON.parse(JSON.stringify(value));

function validPayload(payload) {
  return Boolean(payload && typeof payload === "object" && !Array.isArray(payload)
    && REQUIRED_ARRAYS.every((key) => Array.isArray(payload[key])));
}

export function toBundlePayload(data) {
  const baseCards = clone(data.baseCards || []);
  const baseById = new Map(baseCards.map((card) => [card.id, card]));
  const cards = (data.cards || []).map((card) => {
    const base = baseById.get(card.baseCardId || card.id);
    const overrides = card.overrides && typeof card.overrides === "object" && !Array.isArray(card.overrides)
      ? clone(card.overrides)
      : {};
    for (const field of CARD_CONTENT_FIELDS) {
      // Compact cards omit unchanged content fields. Preserve existing
      // overrides and skip omitted fields when normalizing a second time.
      if (!Object.prototype.hasOwnProperty.call(card, field)) continue;
      if (JSON.stringify(card[field]) !== JSON.stringify(base?.[field])) overrides[field] = clone(card[field]);
      else delete overrides[field];
    }
    return {
      id: card.id,
      baseCardId: card.baseCardId || card.id,
      deckId: card.deckId,
      status: card.status,
      assetPath: card.assetPath || "",
      updatedAt: card.updatedAt,
      updatedBy: card.updatedBy,
      ...(Object.keys(overrides).length ? { overrides } : {})
    };
  });
  return {
    schemaVersion: 4,
    sourceVersion: data.sourceVersion || "admin",
    personas: clone(data.personas || []),
    decks: clone(data.decks || []),
    baseCards: clone(data.baseCards || []),
    cards,
    assets: clone(data.assets || []),
    frontendContent: clone(data.frontendContent || [])
  };
}

export function fromBundleRecord(record) {
  if (!record || !validPayload(record.payload)) throw new Error("Invalid published content bundle");
  const payload = clone(record.payload);
  // Expand the compact deck-card representation back to the Admin's v4
  // working shape. Older/full bundles remain readable for backwards
  // compatibility with the first staging bootstrap.
  const compactCards = payload.cards.filter((card) => card.deckId && (card.overrides || card.baseCardId));
  if (compactCards.length && Array.isArray(payload.baseCards) && payload.baseCards.length) {
    const expanded = buildInitialData({
      sourceVersion: payload.sourceVersion,
      personas: payload.personas,
      decks: payload.decks,
      cards: payload.baseCards,
      assets: payload.assets,
      frontendContent: payload.frontendContent
    });
    const byId = new Map(expanded.cards.map((card) => [card.id, card]));
    for (const compact of compactCards) {
      const card = byId.get(compact.id);
      if (!card) continue;
      Object.assign(card, compact, compact.overrides || {});
      delete card.overrides;
    }
    payload.cards = expanded.cards;
    payload.baseCards = expanded.baseCards;
  }
  return {
    ...payload,
    schemaVersion: 4,
    sourceVersion: record.source_version || record.payload.sourceVersion || "remote"
  };
}

function currentUserId(session) {
  return session?.userId || session?.user?.id || "";
}

function readableError(error) {
  return error?.message || error?.details || "Content sync request failed";
}

export async function createContentSync() {
  if (!window.ENV?.SUPABASE_URL || !window.ENV?.SUPABASE_ANON_KEY || !window.supabase) return null;
  const client = window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY, {
    auth: { detectSessionInUrl: false }
  });
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError || !session?.user?.id) return null;

  const userId = session.user.id;
  const list = async () => {
    const { data, error } = await client
      .from("admin_content_bundles")
      .select("id,bundle_key,version,schema_version,source_version,payload,status,base_published_version,created_by,updated_by,published_at,updated_at")
      .eq("bundle_key", BUNDLE_KEY)
      .order("version", { ascending: false })
      .limit(100);
    if (error) throw new Error(readableError(error));
    const rows = Array.isArray(data) ? data : [];
    const published = rows.find((row) => row.status === "published") || null;
    const drafts = rows.filter((row) => ["draft", "review"].includes(row.status));
    return {
      rows,
      published,
      latestDraft: drafts[0] || null,
      ownDraft: drafts.find((row) => row.updated_by === userId) || null
    };
  };

  return {
    bundleKey: BUNDLE_KEY,
    userId,
    async load() {
      const result = await list();
      const selected = result.ownDraft || result.latestDraft || result.published;
      return { ...result, selected, payload: selected ? fromBundleRecord(selected) : null };
    },
    async saveDraft(data, basePublishedVersion) {
      const payload = toBundlePayload(data);
      if (!validPayload(payload)) throw new Error("Content bundle does not satisfy the Admin contract");
      const { data: row, error } = await client
        .from("admin_content_bundles")
        .insert({
          bundle_key: BUNDLE_KEY,
          schema_version: 4,
          source_version: payload.sourceVersion,
          payload,
          status: "draft",
          base_published_version: Number.isSafeInteger(basePublishedVersion) ? basePublishedVersion : null,
          created_by: userId,
          updated_by: userId
        })
        .select("id,bundle_key,version,schema_version,source_version,payload,status,base_published_version,created_by,updated_by,published_at,updated_at")
        .single();
      if (error || !row) throw new Error(readableError(error));
      return row;
    },
    async publish(bundleId, expectedPublishedVersion) {
      const { data, error } = await client.rpc("publish_content_bundle", {
        p_bundle_id: bundleId,
        p_expected_published_version: Number.isSafeInteger(expectedPublishedVersion) ? expectedPublishedVersion : null
      });
      if (error) throw new Error(readableError(error));
      return data;
    }
  };
}
