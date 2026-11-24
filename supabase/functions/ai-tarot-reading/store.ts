// P1-A: every tarot_readings write goes through the service role here (clients keep SELECT of their own rows only).
// The RPCs tarot_draw_claim / tarot_interpret_claim run under a per-user advisory lock (migration 20261115100000).
import type { DrawnCard } from "./draw.ts";

export type TarotReadingRow = {
  id: string; user_id: string; deck_id: string | null; deck_ref: { id?: string; slug?: string } | null; topic: string; spread: string;
  question: string | null; selected_cards: DrawnCard[]; interpretation: Record<string, unknown>; language: string; status: string;
  lock_key: string | null; lock_date: string | null; interpreted_at: string | null; clarifier: Record<string, unknown> | null;
  deleted_at: string | null; created_at: string;
  /** Batch C (2026-11-24): the free daily private note, written once (immutable after note_created_at). */
  note?: Record<string, unknown> | null; note_created_at?: string | null;
};
export type LimitReason = "draw_cap" | "delivered" | "attempts";
export type DrawClaim =
  | { status: "existing" | "created"; reading: TarotReadingRow }
  | { status: "limit"; reason: LimitReason };
export type InterpretClaim =
  | { status: "claimed"; attemptNumber: number; reading: TarotReadingRow }
  | { status: "completed"; reading: TarotReadingRow }
  | { status: "limit"; reason: LimitReason }
  | { status: "in_progress" | "not_found" | "deleted" };
export type NoteLimitReason = "note_daily" | "note_attempts";
export type NoteClaim =
  | { status: "claimed"; attemptNumber: number; reading: TarotReadingRow }
  | { status: "completed"; reading: TarotReadingRow }
  | { status: "limit"; reason: NoteLimitReason }
  | { status: "in_progress" | "not_found" | "deleted" };
export type FinalizeInput = {
  userId: string; id: string; claimToken: string; interpretation: Record<string, unknown>; interpretedAt: string;
  promptRecordId: string | null; promptVersionKey: string; promptVersion: string; routeVersionId: string | null;
  routeVersion: string | null; contentVersion: string | null;
};

export interface TarotStore {
  drawClaim(input: {
    userId: string; lockKey: string; lockDate: string; dayStart: string; topic: string; spread: string; question: string | null;
    language: string; deckId: string | null; deckRef: Record<string, string> | null; cards: DrawnCard[]; drawCap: number;
    deliveredLimit: number; attemptLimit: number;
  }): Promise<DrawClaim>;
  interpretClaim(input: { userId: string; id: string; claimToken: string; dayStart: string; deliveredLimit: number; attemptLimit: number; staleSeconds: number }): Promise<InterpretClaim>;
  read(userId: string, id: string): Promise<TarotReadingRow | null>;
  /** Writes the answer once; false when this claim no longer holds the row (taken over or already answered). */
  finalize(input: FinalizeInput): Promise<boolean>;
  /** Frees the claim after a failed model answer so a retry may run; the draw and its lock stay. */
  releaseClaim(userId: string, id: string, claimToken: string): Promise<void>;
  /** Adds the answer receipt id to a written interpretation (the only change the trigger allows). */
  linkReceipt(userId: string, id: string, interpretation: Record<string, unknown>): Promise<void>;
  setClarifier(userId: string, id: string, clarifier: Record<string, unknown>): Promise<boolean>;
  /** Batch C: claims the note of one draw (1 delivered note per Vietnam day, failed attempts capped; tarot_note_claim). */
  noteClaim(input: { userId: string; id: string; claimToken: string; dayStart: string; deliveredLimit: number; attemptLimit: number; staleSeconds: number }): Promise<NoteClaim>;
  /** Writes the note once; false when this claim no longer holds the row or a note already exists. */
  noteFinalize(input: { userId: string; id: string; claimToken: string; note: Record<string, unknown>; createdAt: string }): Promise<boolean>;
  /** Frees the note claim after a failure: the note was not delivered, so it is not used up. */
  noteRelease(userId: string, id: string, claimToken: string): Promise<void>;
  softDelete(userId: string, id: string, deletedAt: string): Promise<boolean>;
  deckIdForSlug(slug: string): Promise<string | null>;
  recordSafetyEvent(row: Record<string, unknown>): Promise<void>;
  recordUsage(row: Record<string, unknown>): Promise<boolean>;
}

export class TarotStoreError extends Error {
  constructor(readonly stage: string) { super(stage); this.name = "TarotStoreError"; }
}

// Minimal slice of supabase-js used here (the Edge Function passes the service-role client).
type Query = PromiseLike<{ data: unknown; error: unknown }> & {
  select(columns?: string): Query; insert(row: unknown): Query; update(row: unknown): Query;
  eq(column: string, value: unknown): Query; is(column: string, value: null): Query; maybeSingle(): Query;
};
export type ServiceClient = {
  from(table: string): Query;
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
};

const READING_COLUMNS = "id,user_id,deck_id,deck_ref,topic,spread,question,selected_cards,interpretation,language,status,lock_key,lock_date,interpreted_at,clarifier,deleted_at,created_at,note,note_created_at";
const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

function readingFrom(value: unknown, stage: string): TarotReadingRow {
  const row = record(value);
  if (!row || typeof row.id !== "string" || typeof row.user_id !== "string" || !Array.isArray(row.selected_cards)) throw new TarotStoreError(stage);
  return row as unknown as TarotReadingRow;
}

/** admin: service-role client for tarot_readings and the claim RPCs; caller: the user's own client for the writes that
 * already worked under RLS before P1-A (deck lookup, safety and usage telemetry). */
export function createSupabaseTarotStore(admin: ServiceClient, caller: ServiceClient): TarotStore {
  return {
    async drawClaim(input) {
      const { data, error } = await admin.rpc("tarot_draw_claim", {
        p_user_id: input.userId, p_lock_key: input.lockKey, p_lock_date: input.lockDate, p_day_start: input.dayStart,
        p_topic: input.topic, p_spread: input.spread, p_question: input.question, p_language: input.language,
        p_deck_id: input.deckId, p_deck_ref: input.deckRef, p_cards: input.cards, p_draw_cap: input.drawCap,
        p_delivered_limit: input.deliveredLimit, p_attempt_limit: input.attemptLimit
      });
      const result = record(data);
      if (error || !result) throw new TarotStoreError("draw_claim");
      if (result.status === "limit") return { status: "limit", reason: result.reason as LimitReason };
      if (result.status === "existing" || result.status === "created") return { status: result.status, reading: readingFrom(result.reading, "draw_claim") };
      throw new TarotStoreError("draw_claim");
    },
    async interpretClaim(input) {
      const { data, error } = await admin.rpc("tarot_interpret_claim", {
        p_user_id: input.userId, p_reading_id: input.id, p_claim_token: input.claimToken, p_day_start: input.dayStart,
        p_delivered_limit: input.deliveredLimit, p_attempt_limit: input.attemptLimit, p_stale_seconds: input.staleSeconds
      });
      const result = record(data);
      if (error || !result) throw new TarotStoreError("interpret_claim");
      switch (result.status) {
        case "claimed": return { status: "claimed", attemptNumber: Number(result.attemptNumber) || 1, reading: readingFrom(result.reading, "interpret_claim") };
        case "completed": return { status: "completed", reading: readingFrom(result.reading, "interpret_claim") };
        case "limit": return { status: "limit", reason: result.reason as LimitReason };
        case "in_progress": case "not_found": case "deleted": return { status: result.status };
        default: throw new TarotStoreError("interpret_claim");
      }
    },
    async read(userId, id) {
      const { data, error } = await admin.from("tarot_readings").select(READING_COLUMNS).eq("id", id).eq("user_id", userId).maybeSingle();
      if (error) throw new TarotStoreError("read");
      return data ? readingFrom(data, "read") : null;
    },
    async finalize(input) {
      const { data, error } = await admin.from("tarot_readings").update({
        interpretation: input.interpretation, status: "completed", interpreted_at: input.interpretedAt, claim_token: null, claimed_at: null,
        prompt_version_id: input.promptRecordId, prompt_version_key: input.promptVersionKey, prompt_version: input.promptVersion,
        route_version_id: input.routeVersionId, route_version: input.routeVersion, content_version: input.contentVersion
      }).eq("id", input.id).eq("user_id", input.userId).eq("claim_token", input.claimToken).is("interpreted_at", null).is("deleted_at", null)
        .select("id").maybeSingle();
      if (error) throw new TarotStoreError("finalize");
      return Boolean(record(data)?.id);
    },
    async releaseClaim(userId, id, claimToken) {
      try {
        await admin.from("tarot_readings").update({ claim_token: null, claimed_at: null })
          .eq("id", id).eq("user_id", userId).eq("claim_token", claimToken).is("interpreted_at", null);
      } catch { /* A stale claim is taken over after TAROT_LOCK_POLICY.claimStaleSeconds anyway. */ }
    },
    async linkReceipt(userId, id, interpretation) {
      try {
        // Preserve the verified link when this reading is reopened on another device.
        await admin.from("tarot_readings").update({ interpretation }).eq("id", id).eq("user_id", userId);
      } catch { /* Receipt enrichment cannot discard the already saved answer. */ }
    },
    async noteClaim(input) {
      const { data, error } = await admin.rpc("tarot_note_claim", {
        p_user_id: input.userId, p_reading_id: input.id, p_claim_token: input.claimToken, p_day_start: input.dayStart,
        p_delivered_limit: input.deliveredLimit, p_attempt_limit: input.attemptLimit, p_stale_seconds: input.staleSeconds
      });
      const result = record(data);
      if (error || !result) throw new TarotStoreError("note_claim");
      switch (result.status) {
        case "claimed": return { status: "claimed", attemptNumber: Number(result.attemptNumber) || 1, reading: readingFrom(result.reading, "note_claim") };
        case "completed": return { status: "completed", reading: readingFrom(result.reading, "note_claim") };
        case "limit": return { status: "limit", reason: result.reason === "note_attempts" ? "note_attempts" : "note_daily" };
        case "in_progress": case "not_found": case "deleted": return { status: result.status };
        default: throw new TarotStoreError("note_claim");
      }
    },
    async noteFinalize(input) {
      const { data, error } = await admin.from("tarot_readings").update({
        note: input.note, note_created_at: input.createdAt, note_claim_token: null, note_claimed_at: null
      }).eq("id", input.id).eq("user_id", input.userId).eq("note_claim_token", input.claimToken).is("note_created_at", null).is("deleted_at", null)
        .select("id").maybeSingle();
      if (error) throw new TarotStoreError("note_finalize");
      return Boolean(record(data)?.id);
    },
    async noteRelease(userId, id, claimToken) {
      try {
        await admin.from("tarot_readings").update({ note_claim_token: null, note_claimed_at: null })
          .eq("id", id).eq("user_id", userId).eq("note_claim_token", claimToken).is("note_created_at", null);
      } catch { /* A stale note claim is taken over after TAROT_LOCK_POLICY.claimStaleSeconds anyway. */ }
    },
    async setClarifier(userId, id, clarifier) {
      const { data, error } = await admin.from("tarot_readings").update({ clarifier })
        .eq("id", id).eq("user_id", userId).is("clarifier", null).is("deleted_at", null).select("id").maybeSingle();
      if (error) throw new TarotStoreError("clarifier");
      return Boolean(record(data)?.id);
    },
    async softDelete(userId, id, deletedAt) {
      const { data, error } = await admin.from("tarot_readings").update({ deleted_at: deletedAt, status: "deleted" })
        .eq("id", id).eq("user_id", userId).is("deleted_at", null).select("id").maybeSingle();
      if (error) throw new TarotStoreError("delete");
      return Boolean(record(data)?.id);
    },
    async deckIdForSlug(slug) {
      try {
        const { data } = await caller.from("tarot_decks").select("id").eq("slug", slug).maybeSingle();
        const id = record(data)?.id;
        return typeof id === "string" ? id : null;
      } catch { return null; }
    },
    async recordSafetyEvent(row) {
      try { await caller.from("safety_events").insert(row); } catch { /* Best effort, as before. */ }
    },
    async recordUsage(row) {
      try {
        const { error } = await caller.from("usage_events").insert(row);
        return !error;
      } catch { return false; } // Telemetry cannot discard an already persisted answer.
    }
  };
}
