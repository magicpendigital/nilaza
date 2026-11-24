import { parseExperiment, parseReaderSuggestion, parseTarotNoteResponse } from "../tarotNote";

describe("parseTarotNoteResponse", () => {
  it("reads a note with its experiment", () => {
    const outcome = parseTarotNoteResponse(200, { note: { text: " Xin chào ", need: "Nghỉ", askThem: "" }, experiment: { campaignId: "c1", variant: "a" }, noteStatus: "generated" });
    expect(outcome).toMatchObject({ kind: "note", note: { text: "Xin chào", need: "Nghỉ", askThem: "" }, experiment: { campaignId: "c1", variant: "a" }, noteStatus: "generated" });
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

  it("drops a half experiment", () => {
    expect(parseExperiment({ campaignId: "c1" })).toBeNull();
    expect(parseExperiment(["x"])).toBeNull();
  });
});
