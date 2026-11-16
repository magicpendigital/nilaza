import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createTarotHandler, type TarotDeps, type TarotGenerateInput, type TarotGeneration } from "./handler.ts";
import { TarotStoreError, type DrawClaim, type InterpretClaim, type TarotReadingRow, type TarotStore } from "./store.ts";
import type { RandomFill } from "./draw.ts";
import { canonicalTarotCardIds } from "../_shared/tarot-prompt.ts";
import type { ActiveFeatureConfig } from "../_shared/feature-config.ts";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const NOON_VN = "2026-11-15T05:00:00.000Z";
const deck = { id: "moon-garden", slug: "moon-garden" };

/**
 * In-memory TarotStore with the semantics of tarot_draw_claim / tarot_interpret_claim and the update trigger
 * (migration 20261115100000; the SQL itself is exercised by scripts/tarot-reading-lock-sql.test.mjs on PGlite).
 * Each method runs to completion synchronously, as the per-user advisory lock serialises the RPCs in Postgres.
 */
function memoryStore(clock: () => Date) {
  const rows = new Map<string, TarotReadingRow & { claim_token: string | null; claimed_at: number | null }>();
  const attempts: Array<{ userId: string; at: number; drawId: string }> = [];
  const usage: Record<string, unknown>[] = [];
  const safety: Record<string, unknown>[] = [];
  const calls: string[] = [];
  let failFinalize = false;
  let sequence = 0;
  const visible = (row: TarotReadingRow & { claim_token?: unknown; claimed_at?: unknown }) => {
    const { claim_token: _token, claimed_at: _claimed, ...rest } = row;
    return structuredClone(rest) as TarotReadingRow;
  };
  const delivered = (userId: string, dayStart: string) => [...rows.values()].filter(row => row.user_id === userId
    && (row.interpretation as { moderationStatus?: string }).moderationStatus === "passed" && row.created_at >= dayStart).length;
  const attemptCount = (userId: string, dayStart: string) => attempts.filter(item => item.userId === userId && item.at >= Date.parse(dayStart)).length;
  const store: TarotStore = {
    async drawClaim(input): Promise<DrawClaim> {
      calls.push("drawClaim");
      const existing = [...rows.values()].find(row => row.lock_key === input.lockKey);
      if (existing) {
        if (existing.user_id !== input.userId) throw new Error("tarot_lock_key_conflict");
        return { status: "existing", reading: visible(existing) };
      }
      if ([...rows.values()].filter(row => row.user_id === input.userId && row.lock_date === input.lockDate).length >= input.drawCap) return { status: "limit", reason: "draw_cap" };
      // Tarot v2 pack 0 (Owner 2026-11-16): like the SQL, a draw applies only the draw cap; delivered and attempt limits
      // belong to interpretClaim.
      sequence += 1;
      const id = `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
      const row = {
        id, user_id: input.userId, deck_id: input.deckId, deck_ref: input.deckRef, topic: input.topic, spread: input.spread,
        question: input.question, selected_cards: structuredClone(input.cards), interpretation: {}, language: input.language, status: "queued",
        lock_key: input.lockKey, lock_date: input.lockDate, interpreted_at: null, clarifier: null, deleted_at: null,
        created_at: clock().toISOString(), claim_token: null, claimed_at: null
      };
      rows.set(id, row);
      return { status: "created", reading: visible(row) };
    },
    async interpretClaim(input): Promise<InterpretClaim> {
      calls.push("interpretClaim");
      const row = rows.get(input.id);
      if (!row || row.user_id !== input.userId) return { status: "not_found" };
      if (row.deleted_at) return { status: "deleted" };
      if (row.interpreted_at || row.lock_key === null) return { status: "completed", reading: visible(row) };
      if (row.claim_token && row.claimed_at !== null && row.claimed_at > clock().getTime() - input.staleSeconds * 1000) return { status: "in_progress" };
      if (delivered(input.userId, input.dayStart) >= input.deliveredLimit) return { status: "limit", reason: "delivered" };
      const count = attemptCount(input.userId, input.dayStart);
      if (count >= input.attemptLimit) return { status: "limit", reason: "attempts" };
      attempts.push({ userId: input.userId, at: clock().getTime(), drawId: row.id });
      row.claim_token = input.claimToken;
      row.claimed_at = clock().getTime();
      return { status: "claimed", attemptNumber: count + 1, reading: visible(row) };
    },
    async read(userId, id) {
      calls.push("read");
      const row = rows.get(id);
      return row && row.user_id === userId ? visible(row) : null;
    },
    async finalize(input) {
      calls.push("finalize");
      if (failFinalize) throw new TarotStoreError("finalize");
      const row = rows.get(input.id);
      if (!row || row.user_id !== input.userId || row.claim_token !== input.claimToken || row.interpreted_at || row.deleted_at) return false;
      Object.assign(row, { interpretation: structuredClone(input.interpretation), status: "completed", interpreted_at: input.interpretedAt, claim_token: null, claimed_at: null });
      return true;
    },
    async releaseClaim(userId, id, claimToken) {
      calls.push("releaseClaim");
      const row = rows.get(id);
      if (row && row.user_id === userId && row.claim_token === claimToken && !row.interpreted_at) Object.assign(row, { claim_token: null, claimed_at: null });
    },
    async linkReceipt(userId, id, interpretation) {
      calls.push("linkReceipt");
      const row = rows.get(id);
      if (!row || row.user_id !== userId) return;
      // The trigger allows only adding provenance.answerReceiptId to a written interpretation.
      const before = structuredClone(row.interpretation) as { provenance?: Record<string, unknown> };
      const after = structuredClone(interpretation) as { provenance?: Record<string, unknown> };
      assert(before.provenance && !before.provenance.answerReceiptId && typeof after.provenance?.answerReceiptId === "string");
      delete after.provenance!.answerReceiptId;
      assertEquals(after, before, "only the receipt id may be added to a written interpretation");
      row.interpretation = structuredClone(interpretation);
    },
    async setClarifier(userId, id, clarifier) {
      calls.push("setClarifier");
      const row = rows.get(id);
      if (!row || row.user_id !== userId || row.clarifier || row.deleted_at) return false;
      row.clarifier = structuredClone(clarifier);
      return true;
    },
    async softDelete(userId, id, deletedAt) {
      calls.push("softDelete");
      const row = rows.get(id);
      if (!row || row.user_id !== userId || row.deleted_at) return false;
      Object.assign(row, { deleted_at: deletedAt, status: "deleted" });
      return true;
    },
    async deckIdForSlug() { return null; },
    async recordSafetyEvent(row) { safety.push(row); },
    async recordUsage(row) { usage.push(row); return true; }
  };
  return { store, rows, attempts, usage, safety, calls, failFinalize: (value: boolean) => { failFinalize = value; } };
}

type Reply = { status?: "passed" | "fallback" | "blocked"; text?: string };
const goodAnswer = (cardIds: string[]) => JSON.stringify({
  summary: "A gentle invitation to notice one small step.", reflection: "What small step feels honest today?",
  sections: [{ key: "card", title: { en: "Card", vi: "Lá bài" }, body: { en: "Notice one small, reversible step.", vi: "Hãy để ý một bước nhỏ." }, cardIds }]
});

function setup(options: { now?: string; random?: RandomFill; paused?: boolean; quotaDaily?: number; user?: string | null; premiumOnSale?: boolean; tier?: "premium" | "free" | "error" } = {}) {
  let now = new Date(options.now ?? NOON_VN);
  const clock = () => now;
  const memory = memoryStore(clock);
  const generations: TarotGenerateInput[] = [];
  const finalizations: Array<{ status: string; output: Record<string, unknown> }> = [];
  const receipts: Record<string, unknown>[] = [];
  const replies: Reply[] = [];
  let gate: Promise<void> | null = null;
  let paused = options.paused ?? false;
  let user = options.user === undefined ? USER : options.user;
  let tokenSequence = 0;
  let tierReads = 0;
  const deps = (): TarotDeps => ({
    authenticate: async () => user ? { id: user, isAnonymous: false } : null,
    store: memory.store,
    readContent: async () => null,
    featurePaused: async () => paused,
    readFeatureConfig: async () => options.quotaDaily ? { feature: "tarot_reading", version: 1, quotaDaily: options.quotaDaily, copy: {} } as ActiveFeatureConfig : null,
    resolvePrompt: async language => ({ promptText: "Reflect gently.", promptVersionId: `local:tarot_reading_system@test:${language}`, promptRecordId: null,
      promptVersion: "test", promptLocale: language, promptSource: "local_canonical", promptStatus: "local_degraded", promptFallbackReason: "lookup_unavailable" }),
    contentVersion: async () => "sha256:test",
    generate: async input => {
      generations.push(input);
      if (gate) await gate;
      const reply = replies.shift() ?? {};
      const cardIds = JSON.parse(input.messages[0].content).selectedCards.map((card: { id: string }) => card.id);
      const result: TarotGeneration = {
        text: reply.text ?? (reply.status === "fallback" ? input.fallbackText : goodAnswer(cardIds)), provider: "openai", model: "synthetic",
        routeVersion: "route-test", routeVersionId: "route-test-id", fallbackUsed: reply.status === "fallback", attempts: [], latencyMs: 1, usage: {},
        moderationStatus: reply.status ?? "passed", traceId: "trace-test",
        finalizeTrace: async value => { finalizations.push(value); }
      };
      return result;
    },
    writeReceipt: async input => { receipts.push(input); return { receiptId: "00000000-0000-4000-8000-0000000000aa" }; },
    readTier: async () => { tierReads += 1; if (options.tier === "error") throw new Error("tier_unavailable"); return options.tier ?? "free"; }
  });
  const handler = createTarotHandler(() => deps(), {
    now: clock, random: options.random, premiumOnSale: () => options.premiumOnSale === true, claimToken: () => `00000000-0000-4000-9000-${String(++tokenSequence).padStart(12, "0")}`
  });
  const call = async (body: Record<string, unknown>) => {
    const response = await handler(new Request("https://x.test/ai-tarot-reading", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer token-abc" }, body: JSON.stringify(body)
    }));
    return { status: response.status, body: await response.json() as Record<string, any> };
  };
  const draw = (extra: Record<string, unknown> = {}) => call({ action: "draw", language: "en", deck, spread: "daily-one", topic: "self", question: "What should I notice?", ...extra });
  const interpret = (drawId: string, extra: Record<string, unknown> = {}) => call({ action: "interpret", drawId, ...extra });
  return {
    ...memory, generations, finalizations, receipts, call, draw, interpret, tierReads: () => tierReads,
    reply: (...values: Reply[]) => { replies.push(...values); },
    hold: () => { let release!: () => void; gate = new Promise(resolve => { release = resolve; }); return () => { gate = null; release(); }; },
    setNow: (value: string) => { now = new Date(value); },
    setPaused: (value: boolean) => { paused = value; },
    setUser: (value: string | null) => { user = value; }
  };
}

Deno.test("draw: the server chooses the cards (client cards are ignored) and returns drawId plus the cards", async () => {
  const t = setup();
  const result = await t.draw({ selectedCards: [{ id: "major-00-fool", reversed: false }] });
  assertEquals(result.status, 200);
  assertEquals(result.body.status, "queued");
  assertEquals(result.body.replayed, false);
  assert(/^[0-9a-f-]{36}$/.test(result.body.drawId));
  assertEquals(result.body.cards.length, 1);
  assertEquals(result.body.cards[0].positionKey, "daily");
  assert(canonicalTarotCardIds().includes(result.body.cards[0].id));
  assertEquals(result.body.lockDate, "2026-11-15");
  assertEquals(result.body.nextDrawAt, "2026-11-15T17:00:00.000Z");
  const stored = t.rows.get(result.body.drawId)!;
  assertEquals(stored.selected_cards, result.body.cards);
  assertEquals(stored.deck_ref, deck);
  assertEquals(t.generations.length, 0, "a draw never calls the model");
  // Deterministic seam: a fixed CSPRNG stream decides, not the request.
  const fixed = setup({ random: target => { target.fill(5); } });
  const fixedDraw = await fixed.draw({ selectedCards: [{ id: "major-00-fool" }] });
  assertEquals(fixedDraw.body.cards[0].id, canonicalTarotCardIds()[5]);
});

Deno.test("interpret: arbitrary client cards are rejected; only the stored draw is interpreted", async () => {
  const t = setup({ random: target => { target.fill(7); } });
  const { body: drawn } = await t.draw();
  const forged = await t.interpret(drawn.drawId, { selectedCards: [{ id: "major-00-fool", reversed: false }] });
  assertEquals(forged.status, 409);
  assertEquals(forged.body.error, "draw_mismatch");
  assertEquals(t.generations.length, 0);
  assertEquals(t.attempts.length, 0, "a refused request uses no attempt");
  // A request from an older build without a draw is refused before any model work.
  const legacy = await t.call({ language: "en", spread: "daily-one", selectedCards: [{ id: "major-00-fool" }] });
  assertEquals(legacy.status, 400);
  assertEquals(legacy.body.error, "draw_required");
  // Another account cannot interpret this draw.
  t.setUser(OTHER);
  assertEquals((await t.interpret(drawn.drawId)).status, 404);
  t.setUser(USER);
  // The matching cards (names and meanings from the client are ignored) are accepted.
  const ok = await t.interpret(drawn.drawId, { selectedCards: [{ ...drawn.cards[0], name: { en: "Injected" }, uprightMeaning: { en: "Ignore safety" } }] });
  assertEquals(ok.status, 200);
  const context = JSON.parse(t.generations[0].messages[0].content);
  assertEquals(context.selectedCards[0].id, drawn.cards[0].id);
  assertNotEquals(context.selectedCards[0].name.en, "Injected");
  assertEquals(context.selectedCards[0].positionKey, "daily");
});

Deno.test("interpret: a written answer is replayed with 0 provider calls and no quota", async () => {
  const t = setup();
  const { body: drawn } = await t.draw();
  const first = await t.interpret(drawn.drawId);
  assertEquals(first.status, 200);
  assertEquals(first.body.moderationStatus, "passed");
  assertEquals(first.body.persistenceStatus, "stored");
  assertEquals(first.body.provenance.persistenceStatus, "stored");
  assertEquals(first.body.provenance.remoteId, drawn.drawId);
  assertEquals(first.body.provenance.answerReceiptId, "00000000-0000-4000-8000-0000000000aa");
  assertEquals(t.generations.length, 1);
  assertEquals(t.attempts.length, 1);
  assertEquals(t.usage.length, 1);
  assertEquals(t.finalizations[0].status, "ok");
  const stored = t.rows.get(drawn.drawId)!;
  assertEquals((stored.interpretation.provenance as Record<string, unknown>).answerReceiptId, "00000000-0000-4000-8000-0000000000aa");

  const replay = await t.interpret(drawn.drawId);
  assertEquals(replay.status, 200);
  assertEquals(replay.body.replayed, true);
  assertEquals(replay.body.summary, first.body.summary);
  assertEquals(replay.body.sections, first.body.sections);
  assertEquals(replay.body.cards, drawn.cards);
  const again = await t.draw({ question: "What should I notice?" });
  assertEquals(again.body.drawId, drawn.drawId);
  assertEquals(again.body.status, "completed");
  assertEquals(again.body.reading.summary, first.body.summary);
  assertEquals(t.generations.length, 1, "replay makes no provider call");
  assertEquals(t.attempts.length, 1, "replay uses no attempt");
  assertEquals(t.usage.length, 1);
});

Deno.test("interpret: two concurrent requests make 1 model call and 1 answer", async () => {
  const t = setup();
  const { body: drawn } = await t.draw();
  const release = t.hold();
  const firstPromise = t.interpret(drawn.drawId);
  await new Promise(resolve => setTimeout(resolve, 0));
  const second = await t.interpret(drawn.drawId);
  assertEquals(second.status, 409);
  assertEquals(second.body.error, "reading_in_progress");
  release();
  const first = await firstPromise;
  assertEquals(first.status, 200);
  assertEquals(t.generations.length, 1);
  const third = await t.interpret(drawn.drawId);
  assertEquals(third.body.replayed, true);
  assertEquals(third.body.summary, first.body.summary);
  assertEquals(t.generations.length, 1);
});

Deno.test("draw: two concurrent draws of the same event store one row and return the same cards", async () => {
  const t = setup({ quotaDaily: 5 });
  const [a, b] = await Promise.all([t.draw({ topic: "career" }), t.draw({ topic: "career", question: "Another wording" })]);
  assertEquals([a.status, b.status], [200, 200]);
  assertEquals(a.body.drawId, b.body.drawId);
  assertEquals(a.body.cards, b.body.cards);
  assertEquals([a.body.replayed, b.body.replayed].sort(), [false, true]);
  assertEquals(t.rows.size, 1);
});

Deno.test("draw: a rephrased question with the same topic gets the old draw and reading", async () => {
  const t = setup();
  const { body: drawn } = await t.draw({ topic: "love", question: "Will they call me?" });
  await t.interpret(drawn.drawId);
  const rephrased = await t.draw({ topic: "love", question: "Is he going to call me back??" });
  assertEquals(rephrased.status, 200);
  assertEquals(rephrased.body.drawId, drawn.drawId);
  assertEquals(rephrased.body.cards, drawn.cards);
  assertEquals(rephrased.body.question, "Will they call me?");
  assertEquals(rephrased.body.replayed, true);
  assertEquals(rephrased.body.reading.replayed, true);
  assertEquals(t.generations.length, 1);
});

Deno.test("draw: a different topic or spread is a new draw within the soft cap, whatever the AI allowance (Tarot v2 pack 0)", async () => {
  // Free policy: 1 delivered AI reading a day. The AI allowance no longer limits drawing (Owner 2026-11-16, Q1).
  const free = setup();
  const first = await free.draw({ topic: "love" });
  await free.interpret(first.body.drawId);
  assertEquals(free.generations.length, 1);
  const otherTopic = await free.draw({ topic: "career" });
  assertEquals(otherTopic.status, 200, "a draw costs no model call, so the used AI reading does not block it");
  assertEquals(otherTopic.body.status, "queued");
  assertEquals(free.generations.length, 1, "a draw never calls the model");
  // The AI allowance still stops the second interpretation: delivered limit applies in interpret, not in draw.
  const second = await free.interpret(otherTopic.body.drawId);
  assertEquals(second.status, 429);
  assertEquals(second.body.reason, "delivered");
  assertEquals(free.generations.length, 1);
  // The soft cap of 3 draws a day is the only draw limit: love, career and a third, then 429 draw_cap.
  const spread = await free.draw({ topic: "love", spread: "past-present-future" });
  assertEquals(spread.status, 200);
  assertEquals(spread.body.cards.length, 3);
  const fourth = await free.draw({ topic: "decision" });
  assertEquals(fourth.status, 429);
  assertEquals(fourth.body.error, "daily_limit_reached");
  assertEquals(fourth.body.reason, "draw_cap");
  assertEquals(fourth.body.nextDrawAt, "2026-11-15T17:00:00.000Z");
  // The same event still answers within the cap, including after the cap is reached.
  assertEquals((await free.draw({ topic: "career" })).body.drawId, otherTopic.body.drawId);
  assertEquals((await free.draw({ topic: "love" })).body.drawId, first.body.drawId);
  // Unknown topic text is refused, not turned into a fresh key.
  assertEquals((await free.draw({ topic: "my secret question" })).status, 400);
  // A configured higher AI quota changes nothing about drawing.
  const t = setup({ quotaDaily: 5 });
  const ids = [(await t.draw({ topic: "love" })).body.drawId, (await t.draw({ topic: "career" })).body.drawId, (await t.draw({ topic: "love", spread: "past-present-future" })).body.drawId];
  assertEquals(new Set(ids).size, 3);
  assertEquals((await t.draw({ topic: "decision" })).body.reason, "draw_cap");
});

Deno.test("draw: a Premium deck needs a Premium account only while Premium is on sale; the tier is read on the server", async () => {
  const premiumDeck = { id: "golden-thread" };
  // Not on sale (closed test, today): every deck draws and the tier is not even read.
  const notOnSale = setup({ tier: "free" });
  assertEquals((await notOnSale.draw({ deck: premiumDeck })).status, 200);
  assertEquals(notOnSale.tierReads(), 0);
  // On sale, Free account: the Premium deck is refused before any store work, a free deck still draws.
  const onSale = setup({ premiumOnSale: true, tier: "free" });
  const refused = await onSale.draw({ deck: premiumDeck });
  assertEquals(refused.status, 403);
  assertEquals(refused.body.error, "premium_required");
  assertEquals(onSale.rows.size, 0);
  assertEquals((await onSale.draw({ deck: { id: "rose-mirror" } })).status, 200);
  // The slug is checked too, not only the id.
  assertEquals((await onSale.draw({ deck: { slug: "star-seeker" } })).status, 403);
  // On sale, Premium account: it draws.
  const premium = setup({ premiumOnSale: true, tier: "premium" });
  assertEquals((await premium.draw({ deck: premiumDeck })).status, 200);
  // On sale and the tier cannot be read: fail closed with a service error, never a free pass.
  const broken = setup({ premiumOnSale: true, tier: "error" });
  assertEquals((await broken.draw({ deck: premiumDeck })).status, 503);
  assertEquals(broken.rows.size, 0);
});

Deno.test("draw: crossing 0h UTC+7 gives a new key and a new draw", async () => {
  const t = setup({ now: "2026-11-15T16:59:00.000Z" });
  const before = await t.draw();
  await t.interpret(before.body.drawId);
  assertEquals(before.body.lockDate, "2026-11-15");
  t.setNow("2026-11-15T16:59:59.000Z");
  assertEquals((await t.draw()).body.drawId, before.body.drawId);
  t.setNow("2026-11-15T17:00:01.000Z");
  const after = await t.draw();
  assertEquals(after.status, 200);
  assertEquals(after.body.lockDate, "2026-11-16");
  assertNotEquals(after.body.drawId, before.body.drawId);
  assertEquals(after.body.status, "queued");
  assertEquals(t.rows.get(before.body.drawId)!.lock_key !== t.rows.get(after.body.drawId)!.lock_key, true);
});

Deno.test("an AI failure burns neither the lock nor the delivered reading; failed attempts stop at 3 a day", async () => {
  const t = setup();
  const { body: drawn } = await t.draw();
  t.reply({ status: "fallback" });
  const failed = await t.interpret(drawn.drawId);
  assertEquals(failed.status, 200);
  assertEquals(failed.body.moderationStatus, "fallback");
  assertEquals(failed.body.retryable, true);
  assertEquals(failed.body.drawId, drawn.drawId);
  assertEquals(failed.body.persistenceStatus, "skipped");
  assertEquals(failed.body.provenance.sourceKind, "fallback");
  const row = t.rows.get(drawn.drawId)!;
  assertEquals(row.interpreted_at, null);
  assertEquals(row.claim_token, null, "the claim is released for a retry");
  assertEquals(t.usage.length, 0);
  // Malformed model output is a fallback too.
  t.reply({ text: '{"summary":"cut off"' });
  const rejected = await t.interpret(drawn.drawId);
  assertEquals(rejected.body.moderationStatus, "fallback");
  assertEquals(rejected.body.provenance.validationStatus, "rejected");
  assertEquals(t.finalizations.at(-1)!.output.stage, "validation");
  // "Thử lại" interprets the same draw: same cards, answer stored.
  const retry = await t.interpret(drawn.drawId);
  assertEquals(retry.status, 200);
  assertEquals(retry.body.moderationStatus, "passed");
  assertEquals(retry.body.cards, drawn.cards);
  assertEquals(t.generations.length, 3);
  assertEquals(JSON.parse(t.generations[0].messages[0].content).selectedCards[0].id, JSON.parse(t.generations[2].messages[0].content).selectedCards[0].id);

  const capped = setup();
  const { body: capDraw } = await capped.draw();
  capped.reply({ status: "fallback" }, { status: "fallback" }, { status: "fallback" });
  for (let i = 0; i < 3; i += 1) assertEquals((await capped.interpret(capDraw.drawId)).body.moderationStatus, "fallback");
  const fourth = await capped.interpret(capDraw.drawId);
  assertEquals(fourth.status, 429);
  assertEquals(fourth.body.reason, "attempts");
  assertEquals(capped.generations.length, 3);
});

Deno.test("a failed save frees the claim and asks for a retry instead of showing an unsaved answer", async () => {
  const t = setup();
  const { body: drawn } = await t.draw();
  t.failFinalize(true);
  const failed = await t.interpret(drawn.drawId);
  assertEquals(failed.status, 503);
  assertEquals(failed.body.error, "reading_not_saved");
  assertEquals(failed.body.retryable, true);
  assertEquals(t.finalizations[0].status, "error");
  assertEquals(t.finalizations[0].output.stage, "persist");
  assertEquals(t.rows.get(drawn.drawId)!.claim_token, null);
  t.failFinalize(false);
  const retry = await t.interpret(drawn.drawId);
  assertEquals(retry.status, 200);
  assertEquals(retry.body.persistenceStatus, "stored");
});

Deno.test("a blocked answer is written once with a safety event and replayed, never re-asked", async () => {
  const t = setup();
  const { body: drawn } = await t.draw();
  t.reply({ status: "blocked", text: JSON.stringify({ summary: "Please reach out for support.", reflection: "Who can be with you now?" }) });
  const blocked = await t.interpret(drawn.drawId);
  assertEquals(blocked.status, 200);
  assertEquals(blocked.body.moderationStatus, "blocked");
  assertEquals(blocked.body.provenance.sourceKind, "blocked");
  assertEquals(blocked.body.sections, []);
  assertEquals(t.safety.length, 1);
  assertEquals(t.safety[0].reason, "blocked_topic");
  assertEquals(t.finalizations[0].status, "blocked");
  const replay = await t.interpret(drawn.drawId);
  assertEquals(replay.body.moderationStatus, "blocked");
  assertEquals(t.generations.length, 1);
});

Deno.test("clarifier: at most one per reading, server-drawn, library meaning, no model, own reading only", async () => {
  const t = setup();
  const { body: drawn } = await t.draw({ spread: "past-present-future" });
  const early = await t.call({ action: "clarify", drawId: drawn.drawId });
  assertEquals(early.status, 409);
  assertEquals(early.body.error, "reading_not_ready");
  await t.interpret(drawn.drawId);
  const generationsBefore = t.generations.length;
  const first = await t.call({ action: "clarify", drawId: drawn.drawId });
  assertEquals(first.status, 200);
  assertEquals(first.body.replayed, false);
  const clarifier = first.body.clarifier;
  assertEquals(clarifier.source, "server_csprng");
  assertEquals(clarifier.positionKey, "clarifier");
  assert(canonicalTarotCardIds().includes(clarifier.cardId));
  assertEquals(drawn.cards.some((card: { id: string }) => card.id === clarifier.cardId), false);
  assert(typeof clarifier.meaning.en === "string" && clarifier.meaning.en.length > 0);
  assert(typeof clarifier.name.vi === "string" && clarifier.name.vi.length > 0);
  const second = await t.call({ action: "clarify", drawId: drawn.drawId });
  assertEquals(second.body.replayed, true);
  assertEquals(second.body.clarifier, clarifier);
  assertEquals(t.generations.length, generationsBefore, "the clarifier never calls the model");
  // The stored reading carries it on replay.
  assertEquals((await t.interpret(drawn.drawId)).body.clarifier, clarifier);
  t.setUser(OTHER);
  assertEquals((await t.call({ action: "clarify", drawId: drawn.drawId })).status, 404);
});

Deno.test("soft delete keeps the lock: the event is not redrawn the same day", async () => {
  const t = setup({ quotaDaily: 5 });
  const { body: drawn } = await t.draw();
  await t.interpret(drawn.drawId);
  const removed = await t.call({ action: "delete", drawId: drawn.drawId });
  assertEquals(removed.body.deleted, true);
  const redraw = await t.draw();
  assertEquals(redraw.status, 409);
  assertEquals(redraw.body.error, "tarot_reading_locked");
  assertEquals(redraw.body.reason, "deleted");
  assertEquals((await t.interpret(drawn.drawId)).status, 409);
  assertEquals(t.generations.length, 1);
});

Deno.test("paused AI, missing auth and malformed requests stop before any store or model work", async () => {
  const paused = setup({ paused: true });
  const result = await paused.draw();
  assertEquals(result.status, 503);
  assertEquals(result.body.error, "feature_paused");
  assertEquals(paused.rows.size, 0);
  const anonymous = setup({ user: null });
  assertEquals((await anonymous.draw()).status, 401);
  assertEquals(anonymous.calls.length, 0);
  const t = setup();
  assertEquals((await t.call({ action: "interpret", drawId: "not-a-uuid" })).body.error, "invalid_draw_id");
  assertEquals((await t.call({ action: "reroll" })).body.error, "invalid_tarot_action");
  assertEquals((await t.draw({ spread: "seven-card" })).status, 400);
  assertEquals(t.calls.length, 0);
  // A draw made before the pause can still be replayed, but not newly interpreted.
  const late = setup();
  const { body: drawn } = await late.draw();
  late.setPaused(true);
  assertEquals((await late.interpret(drawn.drawId)).body.error, "feature_paused");
  assertEquals(late.generations.length, 0);
});
