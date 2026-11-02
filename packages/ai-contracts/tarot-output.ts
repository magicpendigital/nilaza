export const tarotOutputSchema = "nilaza.tarot-output.v1";
type Localized = { vi?: string; en: string };
export type TarotOutput = { summary: string; reflection: string; sections: Array<{ key: string; title: Localized; body: Localized; cardIds?: string[] }> };
/** Why an answer was rejected; a content-free code safe for traces. */
export type TarotOutputRejection = "too_long" | "fenced_json" | "not_json" | "not_object" | "extra_key" | "summary" | "reflection" | "sections"
  | "section_shape" | "section_key" | "title" | "body" | "card_ids";
export type TarotOutputCheck = { output: TarotOutput; reason?: undefined } | { output?: undefined; reason: TarotOutputRejection };

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
function bounded(value: unknown, limit: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= limit;
}
function localized(value: unknown, locale: "vi" | "en", limit: number): Localized | undefined {
  const obj = record(value);
  if (!obj || Object.keys(obj).some(k => !["en", "vi"].includes(k)) || !bounded(obj[locale], limit)) return;
  if (Object.values(obj).some(v => !bounded(v, limit))) return;
  return { en: String(obj.en ?? obj.vi).trim(), ...(typeof obj.vi === "string" ? { vi: obj.vi.trim() } : {}) };
}

/** Structure and explicit references only; prose still needs quality/safety evaluation. */
export function checkTarotOutput(value: unknown, locale: "vi" | "en", selectedCardIds: readonly string[]): TarotOutputCheck {
  const v = record(value);
  if (!v) return { reason: "not_object" };
  if (Object.keys(v).some(k => !["summary", "reflection", "sections"].includes(k))) return { reason: "extra_key" };
  if (!bounded(v.summary, 8000)) return { reason: "summary" };
  if (!bounded(v.reflection, 1500)) return { reason: "reflection" };
  if (!Array.isArray(v.sections) || v.sections.length < 1 || v.sections.length > 16) return { reason: "sections" };
  const seen = new Set<string>();
  const sections: TarotOutput["sections"] = [];
  for (const item of v.sections) {
    const s = record(item);
    if (!s || Object.keys(s).some(k => !["key", "title", "body", "cardIds"].includes(k))) return { reason: "section_shape" };
    if (typeof s.key !== "string" || !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(s.key) || seen.has(s.key)) return { reason: "section_key" };
    seen.add(s.key);
    const title = localized(s.title, locale, 180), body = localized(s.body, locale, 6000);
    if (!title) return { reason: "title" };
    if (!body) return { reason: "body" };
    if (s.cardIds !== undefined && (!Array.isArray(s.cardIds) || s.cardIds.length > selectedCardIds.length || new Set(s.cardIds).size !== s.cardIds.length || s.cardIds.some(id => typeof id !== "string" || !selectedCardIds.includes(id)))) return { reason: "card_ids" };
    sections.push({ key: s.key, title, body, ...(Array.isArray(s.cardIds) ? { cardIds: s.cardIds as string[] } : {}) });
  }
  return { output: { summary: v.summary.trim(), reflection: v.reflection.trim(), sections } };
}

export function validateTarotOutput(value: unknown, locale: "vi" | "en", selectedCardIds: readonly string[]): TarotOutput | undefined {
  return checkTarotOutput(value, locale, selectedCardIds).output;
}

/** Only bounded, complete, unwrapped JSON is accepted; the reason names what failed. */
export function checkTarotOutputText(text: string, locale: "vi" | "en", selectedCardIds: readonly string[]): TarotOutputCheck {
  if (text.length > 110000) return { reason: "too_long" };
  let value: unknown;
  try { value = JSON.parse(text); } catch { return { reason: /^\s*```/.test(text) ? "fenced_json" : "not_json" }; }
  return checkTarotOutput(value, locale, selectedCardIds);
}

export function parseTarotOutput(text: string, locale: "vi" | "en", selectedCardIds: readonly string[]) {
  return checkTarotOutputText(text, locale, selectedCardIds).output;
}
