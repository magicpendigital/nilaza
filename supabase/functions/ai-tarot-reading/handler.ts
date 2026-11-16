// P1-A "Khoá kết quả Tarot — một sự kiện, một câu trả lời" (2026-11-15).
// draw: the server draws the cards (CSPRNG) once per (account, spread, topic, Vietnam day) and returns the same draw for
//       the same event; a different topic or spread is a new draw, at most TAROT_LOCK_POLICY.dailySpreadSoftCap a day.
//       Tarot v2 pack 0 (Owner 2026-11-16): a draw is free and is limited only by that cap, not by the AI allowance; when
//       Premium is on sale a Premium deck also needs a Premium account (403 premium_required).
// interpret: interprets only the stored draw; a written answer is replayed with no model call and no quota. A failed
//       model answer frees the claim so "Thử lại" interprets the same draw again (failed attempts capped per day).
// clarify: one extra server-drawn card with its library meaning (no model), written once.
// delete: soft delete; the row still holds the lock and counts for the day.
import type { ModelGenerationResult } from "../_shared/model-provider.ts";
import { sanitizeProviderMetadata } from "../_shared/model-provider.ts";
import {
  assembleTarotSystem, prepareTarotContext, tarotLibraryCard, tarotModelMessage, tarotPromptMetadata, tarotPromptTraceMetadata,
  type TarotPrompt
} from "../_shared/tarot-prompt.ts";
import type { PublishedTarotContent } from "../_shared/tarot-content.ts";
import { AiRequestError, guardAiJsonRequest } from "../_shared/ai-request-guard.ts";
import { answerCorsHeaders, readAnswerCorrelation } from "../_shared/answer-provenance.ts";
import { answerProvenanceSchema, isIncompleteAnswerFinishReason, type AnswerProvenance } from "../../../packages/ai-contracts/answer-provenance.ts";
import { checkTarotOutputText, tarotOutputSchema } from "../../../packages/ai-contracts/tarot-output.ts";
import { TAROT_LOCK_POLICY } from "../_shared/daily-attempts.ts";
import { featurePausedBody } from "../_shared/feature-switch.ts";
import { accountTierPolicy, tarotDailyLimits } from "../_shared/account-tier-policy.ts";
import { tarotDeckTier } from "../_shared/tarot-deck-tier.ts";
import { configuredDailyLimit, type ActiveFeatureConfig } from "../_shared/feature-config.ts";
import { drawClarifierCard, drawServerCards, normalizeTopicKey, sameDraw, tarotLockKey, vietnamDay, type RandomFill } from "./draw.ts";
import { TarotStoreError, type TarotReadingRow, type TarotStore } from "./store.ts";

// Structural copy of model-router's ModelTraceFinalization (this module stays free of remote imports for tests).
export type TarotTraceFinalization = { status: "ok" | "blocked" | "fallback" | "error"; output: Record<string, unknown> };
export type TarotGeneration = ModelGenerationResult & { finalizeTrace?: (input: TarotTraceFinalization) => Promise<void> };
export type TarotGenerateInput = {
  feature: "tarot_reading"; deadlineMs?: number; strictTraceRedaction: boolean; deferTraceFlush: boolean;
  traceContext: { userId: string; request: Request; clientRequestId?: string; metadata: Record<string, unknown> };
  system: string; messages: Array<{ role: "user"; content: string }>; fallbackText: string;
  acceptOutput: (text: string, finishReason?: string) => string | undefined;
};
export type TarotDeps = {
  authenticate: (token: string) => Promise<{ id: string; isAnonymous?: boolean } | null>;
  store: TarotStore;
  readContent: () => Promise<PublishedTarotContent | null>;
  featurePaused: () => Promise<boolean>;
  readFeatureConfig: () => Promise<ActiveFeatureConfig | null>;
  resolvePrompt: (language: "vi" | "en") => Promise<TarotPrompt>;
  contentVersion: (content: PublishedTarotContent | null) => Promise<string>;
  generate: (input: TarotGenerateInput) => Promise<TarotGeneration>;
  writeReceipt: (input: Record<string, unknown>) => Promise<{ receiptId: string } | null>;
  /** Server tier of the signed-in account (paid entitlement or the shared tier switch); only read for a Premium deck. */
  readTier?: (userId: string) => Promise<"premium" | "free">;
};
export type TarotHandlerOptions = { now?: () => Date; random?: RandomFill; claimToken?: () => string; premiumOnSale?: () => boolean };

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": answerCorsHeaders
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
}

type Localized = Record<string, string | undefined>;
function localize(value: Localized | undefined, language: string, fallback: string) {
  if (!value) return fallback;
  return value[language] ?? value.en ?? value.vi ?? fallback;
}

function drawIdOf(input: Record<string, unknown>): string {
  if (input.drawId === undefined || input.drawId === null) throw new AiRequestError(400, "draw_required");
  if (typeof input.drawId !== "string" || !UUID.test(input.drawId)) throw new AiRequestError(400, "invalid_draw_id");
  return input.drawId.toLowerCase();
}

function isCompleted(row: TarotReadingRow) {
  return Boolean(row.interpreted_at) || row.lock_key === null;
}

function cardsOf(row: TarotReadingRow) {
  return row.selected_cards.map(card => ({ id: card.id, positionKey: card.positionKey, reversed: card.reversed === true }));
}

async function dailyLimits(deps: TarotDeps) {
  // AI-02 (Owner 2026-11-04): one delivered AI reading per local day; failed attempts capped. Admin A4: the active
  // ai_feature_configs row may set the delivered readings per day; the failed-attempt allowance stays.
  const featureConfig = await deps.readFeatureConfig();
  const policy = tarotDailyLimits();
  const delivered = configuredDailyLimit(featureConfig, policy.delivered);
  return {
    featureConfig, delivered, attempts: delivered + (policy.attempts - policy.delivered),
    // Tarot v2 pack 0 (Owner 2026-11-16): drawing costs no model call, so the AI allowance (delivered, attempts) no longer
    // limits it; the same-topic lock and this soft cap do. The AI limits still apply in interpret.
    drawCap: TAROT_LOCK_POLICY.dailySpreadSoftCap
  };
}

/** A stored answer exactly as it was written; no model call, no quota. */
function replayBody(row: TarotReadingRow, nextDrawAt: string) {
  return {
    ...row.interpretation, persistenceStatus: "stored", remoteId: row.id, drawId: row.id, replayed: true,
    status: "completed", spread: row.spread, topic: row.topic, question: row.question, language: row.language,
    lockDate: row.lock_date, nextDrawAt, cards: cardsOf(row), ...(row.clarifier ? { clarifier: row.clarifier } : {})
  };
}

function drawBody(row: TarotReadingRow, replayed: boolean, nextDrawAt: string) {
  const completed = isCompleted(row);
  return {
    drawId: row.id, status: completed ? "completed" : "queued", replayed, spread: row.spread, topic: row.topic,
    question: row.question, language: row.language, lockDate: row.lock_date, nextDrawAt, cards: cardsOf(row),
    ...(completed ? { reading: replayBody(row, nextDrawAt) } : {}), ...(row.clarifier ? { clarifier: row.clarifier } : {})
  };
}

const lockedBody = (reason: string, nextDrawAt: string, drawId?: string) =>
  ({ error: "tarot_reading_locked", reason, nextDrawAt, ...(drawId ? { drawId } : {}) });

export function createTarotHandler(configure: (req: Request) => TarotDeps | null, options: TarotHandlerOptions = {}) {
  const now = options.now ?? (() => new Date());
  const newClaimToken = options.claimToken ?? (() => crypto.randomUUID());
  const premiumOnSale = options.premiumOnSale ?? (() => accountTierPolicy.premiumOnSale === true);

  async function draw(deps: TarotDeps, userId: string, input: Record<string, unknown>) {
    const topic = normalizeTopicKey(input.topic);
    const spread = input.spread === undefined ? "daily-one" : input.spread;
    if (!topic || typeof spread !== "string") throw new AiRequestError(400, "invalid_tarot_input");
    let context;
    try {
      // Validates spread, language, deck identifiers and question with the same rules as an interpretation.
      context = prepareTarotContext({ language: input.language, deck: input.deck, topic, spread, question: input.question,
        selectedCards: drawServerCards(spread, options.random) }, null);
    } catch { throw new AiRequestError(400, "invalid_tarot_input"); }
    // Emergency switch from Admin (AD-10): no new draw while Tarot AI rests, so no draw waits without its answer.
    if (await deps.featurePaused()) return json(featurePausedBody, 503);
    // Premium deck (Q4, Owner 2026-11-16): only once Premium is on sale; the tier is read on the server and fails closed.
    if (premiumOnSale() && tarotDeckTier(context.deck?.id ?? context.deck?.slug) !== "free") {
      const tier = deps.readTier ? await deps.readTier(userId) : "free";
      if (tier !== "premium") return json({ error: "premium_required", reason: "premium_deck" }, 403);
    }
    const day = vietnamDay(now());
    const nextDrawAt = day.nextDayStart.toISOString();
    const lockKey = await tarotLockKey(userId, spread, topic, day.dateKey);
    const limits = await dailyLimits(deps);
    const deckRef = context.deck?.id || context.deck?.slug
      ? Object.fromEntries(Object.entries({ id: context.deck.id, slug: context.deck.slug }).filter(([, value]) => value)) as Record<string, string>
      : null;
    const deckId = context.deck?.slug ? await deps.store.deckIdForSlug(context.deck.slug) : null;
    const claim = await deps.store.drawClaim({
      userId, lockKey, lockDate: day.dateKey, dayStart: day.dayStart.toISOString(), topic, spread, question: context.question,
      language: context.language, deckId, deckRef, cards: context.selectedCards.map(card => ({ id: card.id, positionKey: card.positionKey, reversed: card.reversed })),
      drawCap: limits.drawCap, deliveredLimit: limits.delivered, attemptLimit: limits.attempts
    });
    if (claim.status === "limit") return json({ error: "daily_limit_reached", reason: claim.reason, nextDrawAt }, 429);
    if (claim.reading.deleted_at) return json(lockedBody("deleted", nextDrawAt), 409);
    return json(drawBody(claim.reading, claim.status === "existing", nextDrawAt));
  }

  async function interpret(deps: TarotDeps, userId: string, input: Record<string, unknown>, req: Request, trace: { finalize?: TarotGeneration["finalizeTrace"] }) {
    const drawId = drawIdOf(input);
    const nextDrawAt = vietnamDay(now()).nextDayStart.toISOString();
    const row = await deps.store.read(userId, drawId);
    if (!row) return json({ error: "draw_not_found" }, 404);
    if (row.deleted_at) return json(lockedBody("deleted", nextDrawAt, row.id), 409);
    // Cards from the client are accepted only when they are exactly the stored draw.
    if (input.selectedCards !== undefined && !sameDraw(row.selected_cards, input.selectedCards)) return json({ error: "draw_mismatch", drawId: row.id }, 409);
    const language = row.language === "en" ? "en" : "vi";
    const correlation = readAnswerCorrelation(req, "tarot_reading", language);
    if (isCompleted(row)) return json(replayBody(row, nextDrawAt));
    if (await deps.featurePaused()) return json(featurePausedBody, 503);
    const limits = await dailyLimits(deps);
    const claimToken = newClaimToken();
    const claim = await deps.store.interpretClaim({
      userId, id: row.id, claimToken, dayStart: vietnamDay(now()).dayStart.toISOString(), deliveredLimit: limits.delivered,
      attemptLimit: limits.attempts, staleSeconds: TAROT_LOCK_POLICY.claimStaleSeconds
    });
    if (claim.status === "not_found") return json({ error: "draw_not_found" }, 404);
    if (claim.status === "deleted") return json(lockedBody("deleted", nextDrawAt, row.id), 409);
    if (claim.status === "completed") return json(replayBody(claim.reading, nextDrawAt));
    if (claim.status === "limit") return json({ error: "daily_limit_reached", reason: claim.reason, nextDrawAt }, 429);
    // Another request is interpreting this draw right now: the app waits briefly and asks again (it then gets the answer).
    if (claim.status !== "claimed") return json({ error: "reading_in_progress", drawId: row.id, retryAfterSeconds: 5 }, 409);

    let settled = false;
    try {
      // E4: card text and the deck reading style from the published content bundle when valid, else tarot-cards.json.
      const publishedContent = await deps.readContent();
      const context = prepareTarotContext({ language, deck: row.deck_ref, topic: row.topic, spread: row.spread, question: row.question,
        selectedCards: row.selected_cards }, publishedContent);
      const cards = context.selectedCards;
      const cardIds = cards.map(card => card.id);
      const cardNames = cards.map(card => localize(card.name, language, card.id)).join(", ");
      const summary = language === "vi"
        ? `Các lá đã chọn (${cardNames}) được diễn giải như một công cụ tự phản chiếu, không phải dự đoán chắc chắn. Hãy dùng trải bài này để nhìn rõ cảm xúc, nhu cầu và lựa chọn nhỏ tiếp theo.`
        : `The selected cards (${cardNames}) are interpreted as a self-reflection tool, not a certain prediction. Use this spread to clarify your feeling, need, and next small choice.`;
      const reflection = cards.map(card => localize(card.reflectionQuestion, language, "")).find(Boolean)
        || (language === "vi" ? "Điều gì trong mình đang xin được lắng nghe kỹ hơn?" : "What part of me is asking to be heard more carefully?");

      const prompt = await deps.resolvePrompt(language);
      const promptMetadata = tarotPromptMetadata(prompt, context.cardContextSource);
      const promptVersionId = prompt.promptVersionId;
      const contentVersion = await deps.contentVersion(publishedContent);
      const generation = await deps.generate({
        feature: "tarot_reading",
        deadlineMs: limits.featureConfig?.deadlineMs,
        strictTraceRedaction: true,
        deferTraceFlush: true,
        traceContext: {
          userId, request: req, clientRequestId: correlation.clientRequestId,
          metadata: {
            ...correlation, responseSchema: tarotOutputSchema, contentVersion, deckSlug: context.deck?.slug ?? null, spread: context.spread,
            cardCount: cards.length, language, promptVersionId, cardContextSource: context.cardContextSource,
            deckReadingStyleSent: Boolean(context.deck && "readingStyle" in context.deck), drawId: row.id,
            attemptNumber: claim.attemptNumber, ...tarotPromptTraceMetadata(prompt)
          }
        },
        system: assembleTarotSystem(prompt, language),
        messages: [{ role: "user", content: tarotModelMessage(context) }],
        fallbackText: JSON.stringify({ summary, reflection }),
        // LLM phase 0: a malformed primary answer tries the fallback model once before the canned text.
        acceptOutput: (text, finishReason) => isIncompleteAnswerFinishReason(finishReason) ? "incomplete" : checkTarotOutputText(text, language, cardIds).reason
      });
      trace.finalize = generation.finalizeTrace;
      const outputCheck = generation.moderationStatus === "passed" && !isIncompleteAnswerFinishReason(generation.finishReason)
        ? checkTarotOutputText(generation.text, language, cardIds) : undefined;
      const validated = outputCheck?.output;
      const parsed = validated ?? { summary, reflection, sections: [] };
      const moderationStatus = generation.moderationStatus === "blocked" ? "blocked" : validated ? "passed" : "fallback";
      const model = sanitizeProviderMetadata(generation);
      const provenance: AnswerProvenance = {
        schemaVersion: answerProvenanceSchema, feature: "tarot_reading", ...correlation, locale: language,
        sourceKind: moderationStatus === "passed" ? "ai" : moderationStatus === "blocked" ? "blocked" : "fallback",
        generatedAt: now().toISOString(), validationStatus: validated ? "validated" : generation.moderationStatus === "passed" ? "rejected" : "not_applicable",
        persistenceStatus: "unknown", promptVersionId, promptVersion: prompt.promptVersion, promptAssemblyVersion: promptMetadata.promptAssemblyVersion,
        routeVersionId: generation.routeVersionId, routeVersion: generation.routeVersion, traceId: generation.traceId,
        providerRequestId: generation.requestId, responseSchema: tarotOutputSchema, contentVersion
      };
      const rejection = outputCheck?.reason ? { rejection: { code: outputCheck.reason } } : {};
      const base = { drawId: row.id, spread: row.spread, topic: row.topic, question: row.question, language, lockDate: row.lock_date, nextDrawAt, cards: cardsOf(row) };

      if (moderationStatus === "fallback") {
        // No usable AI answer: nothing is locked and no delivered reading is used; the same draw may be retried.
        await deps.store.releaseClaim(userId, row.id, claimToken);
        settled = true;
        provenance.persistenceStatus = "skipped";
        await trace.finalize?.({ status: provenance.validationStatus === "rejected" ? "error" : "fallback", output: {
          stage: provenance.validationStatus === "rejected" ? "validation" : "response", validationStatus: provenance.validationStatus,
          persistenceStatus: "skipped", usageRecorded: false, ...rejection } });
        const receipt = await deps.writeReceipt({ ...provenance, userId, sectionIds: ["summary", "reflection"] });
        if (receipt) provenance.answerReceiptId = receipt.receiptId;
        return json({ summary: parsed.summary, reflection: parsed.reflection, sections: [], ...promptMetadata, moderationStatus, provenance, model,
          persistenceStatus: "skipped", status: "queued", replayed: false, retryable: true, ...base });
      }

      if (generation.moderationStatus === "blocked") {
        await deps.store.recordSafetyEvent({ user_id: userId, feature: "tarot", reason: "blocked_topic",
          summary: `tarot_reading blocked: ${generation.safetyReason ?? "safety_filter"}`, status: "open" });
      }
      const interpretation = { ...parsed, ...promptMetadata, moderationStatus, provenance: { ...provenance, persistenceStatus: "stored" as const, remoteId: row.id }, model };
      let written = false;
      try {
        written = await deps.store.finalize({
          userId, id: row.id, claimToken, interpretation, interpretedAt: now().toISOString(), promptRecordId: prompt.promptRecordId,
          promptVersionKey: promptVersionId, promptVersion: prompt.promptVersion, routeVersionId: generation.routeVersionId ?? null,
          routeVersion: generation.routeVersion ?? null, contentVersion
        });
      } catch (error) {
        if (!(error instanceof TarotStoreError)) throw error;
      }
      if (!written) {
        // Another request answered this draw first, or the save failed: show the stored answer if there is one.
        const current = await deps.store.read(userId, row.id).catch(() => null);
        settled = true;
        if (current && isCompleted(current) && !current.deleted_at) {
          await trace.finalize?.({ status: "error", output: { stage: "persist", validationStatus: provenance.validationStatus, persistenceStatus: "superseded", usageRecorded: false } });
          return json(replayBody(current, nextDrawAt));
        }
        await deps.store.releaseClaim(userId, row.id, claimToken);
        await trace.finalize?.({ status: "error", output: { stage: "persist", validationStatus: provenance.validationStatus, persistenceStatus: "failed", usageRecorded: false } });
        return json({ error: "reading_not_saved", drawId: row.id, retryable: true }, 503);
      }
      settled = true;
      provenance.persistenceStatus = "stored";
      provenance.remoteId = row.id;
      const usageRecorded = await deps.store.recordUsage({
        user_id: userId, event_name: "tarot_reading_generated", feature: "tarot_reading",
        metadata: { deckSlug: context.deck?.slug ?? null, spread: context.spread, cardCount: cards.length, persistence: "stored", drawId: row.id, ...promptMetadata, model }
      });
      await trace.finalize?.({ status: moderationStatus === "passed" ? "ok" : moderationStatus, output: { stage: "response",
        validationStatus: provenance.validationStatus, persistenceStatus: "stored", usageRecorded, ...rejection } });
      const receipt = await deps.writeReceipt({ ...provenance, userId, sectionIds: ["summary", "reflection", ...parsed.sections.map(section => section.key)] });
      if (receipt) {
        provenance.answerReceiptId = receipt.receiptId;
        await deps.store.linkReceipt(userId, row.id, { ...interpretation, provenance: { ...interpretation.provenance, answerReceiptId: receipt.receiptId } });
      }
      return json({ summary: parsed.summary, reflection: parsed.reflection, sections: parsed.sections, ...promptMetadata, moderationStatus, provenance, model,
        persistenceStatus: "stored", remoteId: row.id, status: "completed", replayed: false, ...base });
    } finally {
      if (!settled) await deps.store.releaseClaim(userId, row.id, claimToken);
    }
  }

  async function clarify(deps: TarotDeps, userId: string, input: Record<string, unknown>) {
    const drawId = drawIdOf(input);
    const row = await deps.store.read(userId, drawId);
    if (!row || row.lock_key === null) return json({ error: "draw_not_found" }, 404);
    if (row.deleted_at) return json(lockedBody("deleted", vietnamDay(now()).nextDayStart.toISOString(), row.id), 409);
    if (row.clarifier) return json({ drawId: row.id, clarifier: row.clarifier, replayed: true });
    if (!row.interpreted_at) return json({ error: "reading_not_ready", drawId: row.id }, 409);
    const content = await deps.readContent();
    const deckKey = row.deck_ref?.id || row.deck_ref?.slug || undefined;
    const card = drawClarifierCard(row.selected_cards.map(selected => selected.id), options.random);
    const library = tarotLibraryCard(content, deckKey, card.id, card.reversed);
    const clarifier = {
      cardId: library.id, reversed: library.reversed, orientation: library.orientation, positionKey: "clarifier", source: "server_csprng",
      name: library.name, meaning: library.meaning, reflectionQuestion: library.reflectionQuestion,
      contentVersion: await deps.contentVersion(content), drawnAt: now().toISOString()
    };
    if (await deps.store.setClarifier(userId, row.id, clarifier)) return json({ drawId: row.id, clarifier, replayed: false });
    // Another request wrote it first (or the reading was deleted meanwhile): return what is stored.
    const current = await deps.store.read(userId, row.id);
    if (current?.clarifier && !current.deleted_at) return json({ drawId: row.id, clarifier: current.clarifier, replayed: true });
    return json({ error: "service_unavailable" }, 503);
  }

  async function remove(deps: TarotDeps, userId: string, input: Record<string, unknown>) {
    const drawId = drawIdOf(input);
    const row = await deps.store.read(userId, drawId);
    if (!row) return json({ error: "draw_not_found" }, 404);
    if (!row.deleted_at) await deps.store.softDelete(userId, row.id, now().toISOString());
    return json({ drawId: row.id, deleted: true });
  }

  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const trace: { finalize?: TarotGeneration["finalizeTrace"] } = {};
    try {
      const deps = configure(req);
      const { input, userId } = await guardAiJsonRequest(req, {
        configured: Boolean(deps),
        authenticate: async token => deps ? await deps.authenticate(token) : null
      });
      if (!deps) return json({ error: "ai_unavailable" }, 503);
      const action = input.action ?? (input.drawId !== undefined ? "interpret" : undefined);
      if (action === "draw") return await draw(deps, userId, input);
      if (action === "interpret") return await interpret(deps, userId, input, req, trace);
      if (action === "clarify") return await clarify(deps, userId, input);
      if (action === "delete") return await remove(deps, userId, input);
      // Builds before P1-A sent their own cards without a draw; the server no longer interprets client-chosen cards.
      throw new AiRequestError(400, action === undefined ? "draw_required" : "invalid_tarot_action");
    } catch (error) {
      await trace.finalize?.({ status: "error", output: { stage: "request", errorCode: "service_unavailable" } }).catch(() => undefined);
      if (error instanceof AiRequestError) return json({ error: error.code }, error.status);
      if (error instanceof TarotStoreError) return json({ error: "usage_check_unavailable" }, 503);
      return json({ error: "service_unavailable" }, 503);
    }
  };
}
