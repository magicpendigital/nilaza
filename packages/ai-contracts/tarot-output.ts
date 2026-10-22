export const tarotOutputSchema = "nilaza.tarot-output.v1";
type Localized = { vi?: string; en: string };
export type TarotOutput = { summary: string; reflection: string; sections: Array<{ key: string; title: Localized; body: Localized; cardIds?: string[] }> };

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
export function validateTarotOutput(value: unknown, locale: "vi" | "en", selectedCardIds: readonly string[]): TarotOutput | undefined {
  const v = record(value);
  if (!v || Object.keys(v).some(k => !["summary", "reflection", "sections"].includes(k))
    || !bounded(v.summary, 8000) || !bounded(v.reflection, 1500) || !Array.isArray(v.sections) || v.sections.length < 1 || v.sections.length > 16) return;
  const seen = new Set<string>();
  const sections: TarotOutput["sections"] = [];
  for (const item of v.sections) {
    const s = record(item);
    if (!s || Object.keys(s).some(k => !["key", "title", "body", "cardIds"].includes(k)) || typeof s.key !== "string" || !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(s.key) || seen.has(s.key)) return;
    seen.add(s.key);
    const title = localized(s.title, locale, 180), body = localized(s.body, locale, 6000);
    if (!title || !body) return;
    if (s.cardIds !== undefined && (!Array.isArray(s.cardIds) || s.cardIds.length > selectedCardIds.length || new Set(s.cardIds).size !== s.cardIds.length || s.cardIds.some(id => typeof id !== "string" || !selectedCardIds.includes(id)))) return;
    sections.push({ key: s.key, title, body, ...(Array.isArray(s.cardIds) ? { cardIds: s.cardIds as string[] } : {}) });
  }
  return { summary: v.summary.trim(), reflection: v.reflection.trim(), sections };
}

export function parseTarotOutput(text: string, locale: "vi" | "en", selectedCardIds: readonly string[]) {
  if (text.length > 110000) return;
  try { return validateTarotOutput(JSON.parse(text), locale, selectedCardIds); } catch { return; }
}
