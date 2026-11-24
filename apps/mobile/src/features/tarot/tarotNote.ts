// Batch C (Owner approved 23/11/2026, proposal section 1): the free daily personal note and the optional AI reader
// suggestion, both answered by ai-tarot-reading. Pure parsers so the client contract is tested without a network.

export type TarotNoteExperiment = { campaignId: string; variant: string } | null;

export type TarotNote = { text: string; need: string; askThem: string };

export type TarotNoteOutcome =
  | { kind: "note"; note: TarotNote; noteStatus?: string; model?: string; experiment: TarotNoteExperiment; nextNoteAt?: string }
  | { kind: "used_today"; nextNoteAt?: string }
  /** Three failed tries today (429 reason note_attempts): not "used", not retryable until tomorrow. */
  | { kind: "attempts_today"; nextNoteAt?: string }
  /** A model safety block (not a crisis): calm, final for this draw, no retry. */
  | { kind: "blocked" }
  | { kind: "crisis" }
  | { kind: "in_progress"; retryAfterSeconds: number }
  /** attemptCounted: the server recorded a claim attempt for this failure (503 note_unavailable). */
  | { kind: "unavailable"; reason: "offline" | "busy" | "auth"; attemptCounted?: boolean };

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** The handler returns model as sanitized provider metadata ({provider, model, ...}) or null; only the model name is kept. */
export function modelName(value: unknown): string | undefined {
  if (typeof value === "string") return text(value) || undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return text((value as Record<string, unknown>).model) || undefined;
}

export function parseExperiment(value: unknown): TarotNoteExperiment {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const campaignId = text(record.campaignId);
  const variant = text(record.variant);
  return campaignId && variant ? { campaignId, variant } : null;
}

/** Maps one ai-tarot-reading {action:"note"} answer to what the note box shows. Never invents note text. */
export function parseTarotNoteResponse(status: number, body: Record<string, unknown>): TarotNoteOutcome {
  const error = text(body.error);
  if (status === 429 && error === "daily_limit_reached") {
    const nextNoteAt = text(body.nextNoteAt) || undefined;
    return text(body.reason) === "note_attempts" ? { kind: "attempts_today", nextNoteAt } : { kind: "used_today", nextNoteAt };
  }
  if (status === 409 && error === "note_in_progress") {
    const seconds = Number(body.retryAfterSeconds);
    return { kind: "in_progress", retryAfterSeconds: Math.min(Math.max(Number.isFinite(seconds) ? seconds : 5, 1), 10) };
  }
  if (status === 401) return { kind: "unavailable", reason: "auth" };
  if (status !== 200) {
    return typeof body.attemptCounted === "boolean"
      ? { kind: "unavailable", reason: "busy", attemptCounted: body.attemptCounted }
      : { kind: "unavailable", reason: "busy" };
  }
  const safety = body.safety && typeof body.safety === "object" ? body.safety as Record<string, unknown> : null;
  if (safety?.crisis === true) return { kind: "crisis" };
  if (body.moderationStatus === "blocked") return { kind: "blocked" };
  const note = body.note && typeof body.note === "object" && !Array.isArray(body.note) ? body.note as Record<string, unknown> : null;
  const noteText = text(note?.text);
  if (!note || !noteText) return { kind: "unavailable", reason: "busy" };
  return {
    kind: "note",
    note: { text: noteText, need: text(note.need), askThem: text(note.askThem) },
    noteStatus: text(body.noteStatus) || undefined,
    model: modelName(body.model),
    experiment: parseExperiment(body.experiment),
    nextNoteAt: text(body.nextNoteAt) || undefined
  };
}

export type ReaderSuggestionSource = "decision_model" | "llm" | "none";

export type ReaderAiSuggestion = {
  slug: string;
  confidence: number;
  intent: string | null;
  source: ReaderSuggestionSource;
  experiment: TarotNoteExperiment;
};

/** {action:"suggest_reader"} answer: only a slug from the candidates the app sent counts; anything else is ignored. */
export function parseReaderSuggestion(status: number, body: Record<string, unknown>, candidates: string[]): ReaderAiSuggestion | null {
  if (status !== 200) return null;
  const slug = text(body.slug);
  const source = body.source === "decision_model" || body.source === "llm" ? body.source : "none";
  if (!slug || source === "none" || !candidates.includes(slug)) return null;
  const confidence = Number(body.confidence);
  return {
    slug,
    confidence: Number.isFinite(confidence) ? Math.min(Math.max(confidence, 0), 1) : 0,
    intent: text(body.intent) || null,
    source,
    experiment: parseExperiment(body.experiment)
  };
}

export const MAX_NOTE_ATTEMPTS = 3;
