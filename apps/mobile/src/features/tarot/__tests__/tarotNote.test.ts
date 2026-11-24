import { parseExperiment, parseReaderSuggestion, parseTarotNoteResponse } from "../tarotNote";

describe("parseTarotNoteResponse", () => {
  it("reads a note with its experiment", () => {
    const outcome = parseTarotNoteResponse(200, { note: { text: " Xin chào ", need: "Nghỉ", askThem: "" }, experiment: { campaignId: "c1", variant: "a" }, noteStatus: "created" });
    expect(outcome).toMatchObject({ kind: "note", note: { text: "Xin chào", need: "Nghỉ", askThem: "" }, experiment: { campaignId: "c1", variant: "a" }, noteStatus: "created" });
  });

  // Exact shapes returned by supabase/functions/ai-tarot-reading/handler.ts note().
  it("reads the real handler note answer (model is provider metadata, askThem may be null)", () => {
    const body = {
      drawId: "draw-1", note: { text: "Hôm nay hãy nghỉ một chút.", need: "Được lắng nghe", askThem: null },
      noteStatus: "created", moderationStatus: "passed", provenance: { promptVersion: "tarot_note_v1" },
      model: { provider: "openrouter", model: "google/gemini-2.5-flash", fallbackUsed: false },
      experiment: { campaignId: "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6", variant: "B" }, nextNoteAt: "2026-11-24T17:00:00.000Z"
    };
    expect(parseTarotNoteResponse(200, body)).toEqual({
      kind: "note", note: { text: "Hôm nay hãy nghỉ một chút.", need: "Được lắng nghe", askThem: "" }, noteStatus: "created",
      model: "google/gemini-2.5-flash", experiment: { campaignId: "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6", variant: "B" },
      nextNoteAt: "2026-11-24T17:00:00.000Z"
    });
    expect(parseTarotNoteResponse(200, { ...body, noteStatus: "replayed", model: null, experiment: null })).toMatchObject({ kind: "note", noteStatus: "replayed", model: undefined, experiment: null });
    expect(parseTarotNoteResponse(200, { note: null, moderationStatus: "blocked", safety: { crisis: true }, nextNoteAt: "x" })).toEqual({ kind: "crisis" });
    expect(parseTarotNoteResponse(429, { error: "daily_limit_reached", reason: "note_daily", nextNoteAt: "2026-11-24T17:00:00.000Z" }))
      .toEqual({ kind: "used_today", nextNoteAt: "2026-11-24T17:00:00.000Z" });
    expect(parseTarotNoteResponse(429, { error: "daily_limit_reached", reason: "note_attempts", nextNoteAt: "y" }).kind).toBe("used_today");
    expect(parseTarotNoteResponse(409, { error: "note_in_progress", retryAfterSeconds: 5 })).toEqual({ kind: "in_progress", retryAfterSeconds: 5 });
    expect(parseTarotNoteResponse(503, { error: "note_unavailable", drawId: "draw-1", attemptCounted: false, retryable: true })).toEqual({ kind: "unavailable", reason: "busy" });
  });

  it("maps limit, in progress, auth, crisis, blocked and empty answers", () => {
    expect(parseTarotNoteResponse(429, { error: "daily_limit_reached" }).kind).toBe("used_today");
    expect(parseTarotNoteResponse(409, { error: "note_in_progress", retryAfterSeconds: 99 })).toEqual({ kind: "in_progress", retryAfterSeconds: 10 });
    expect(parseTarotNoteResponse(401, {})).toEqual({ kind: "unavailable", reason: "auth" });
    expect(parseTarotNoteResponse(500, {})).toEqual({ kind: "unavailable", reason: "busy" });
    expect(parseTarotNoteResponse(200, { safety: { crisis: true }, note: { text: "x" } })).toEqual({ kind: "crisis" });
    expect(parseTarotNoteResponse(200, { note: { text: "x" }, moderationStatus: "blocked" }).kind).toBe("unavailable");
    expect(parseTarotNoteResponse(200, { note: { text: "  " } }).kind).toBe("unavailable");
  });
});

describe("parseReaderSuggestion", () => {
  const candidates = ["the-mystic", "the-love-oracle"];
  it("accepts only a candidate slug from a real model source", () => {
    expect(parseReaderSuggestion(200, { slug: "the-love-oracle", source: "llm", confidence: 2 }, candidates)).toMatchObject({ slug: "the-love-oracle", confidence: 1 });
    expect(parseReaderSuggestion(200, { slug: "other", source: "llm" }, candidates)).toBeNull();
    expect(parseReaderSuggestion(200, { slug: "the-mystic", source: "none" }, candidates)).toBeNull();
    expect(parseReaderSuggestion(500, { slug: "the-mystic", source: "llm" }, candidates)).toBeNull();
  });

  // Exact shapes returned by handler.ts suggestReaderAction().
  it("reads the real handler suggest_reader answers", () => {
    const body = { slug: "the-love-oracle", confidence: 0.82, intent: "love", source: "decision_model",
      model: { provider: "openrouter_decisions", model: "typesafe/jev-1.14" }, experiment: { campaignId: "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6", variant: "A" } };
    expect(parseReaderSuggestion(200, body, candidates)).toEqual({ slug: "the-love-oracle", confidence: 0.82, intent: "love", source: "decision_model",
      experiment: { campaignId: "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6", variant: "A" } });
    const none = { slug: null, confidence: null, intent: null, source: "none", model: null, experiment: null };
    expect(parseReaderSuggestion(200, none, candidates)).toBeNull();
    expect(parseReaderSuggestion(200, { ...none, safety: { crisis: true } }, candidates)).toBeNull();
    expect(parseReaderSuggestion(429, { error: "daily_limit_reached", reason: "reader_router_daily", nextAt: "z" }, candidates)).toBeNull();
  });

  it("drops a half experiment", () => {
    expect(parseExperiment({ campaignId: "c1" })).toBeNull();
    expect(parseExperiment(["x"])).toBeNull();
  });
});
