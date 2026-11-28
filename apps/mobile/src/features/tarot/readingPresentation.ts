import type { LocalizedText, TarotCard, TarotReadingSection } from "../../types";

function localized(value: unknown, language: string): LocalizedText | null {
  if (typeof value === "string" && value.trim()) return { [language === "vi" ? "vi" : "en"]: value.trim(), en: value.trim() };
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const en = typeof source.en === "string" ? source.en.trim() : "";
  const vi = typeof source.vi === "string" ? source.vi.trim() : "";
  return en || vi ? { en: en || vi, ...(vi ? { vi } : {}) } : null;
}

/** Preserve valid sections without guessing that their array order maps to cards. */
export function normalizeTarotSections(value: unknown, language: string): TarotReadingSection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const title = localized(item.title, language);
    const body = localized(item.body, language);
    if (!title || !body) return [];
    const cardIds = Array.isArray(item.cardIds) && item.cardIds.length <= 10 && item.cardIds.every((id: unknown) => typeof id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(id)) ? [...item.cardIds] as string[] : undefined;
    return [{ key: typeof item.key === "string" && item.key.trim() ? item.key : `section_${index + 1}`, title, body, ...(cardIds ? { cardIds } : {}) }];
  });
}

export function tarotSnapshotMeaning(card: TarotCard & { reversed?: boolean }, saved: unknown, language: string): string {
  const source = saved && typeof saved === "object" ? (saved as { interpretation?: unknown }).interpretation : undefined;
  const meaning = localized(source, language) ?? (card.reversed ? card.reversedMeaning : card.uprightMeaning);
  return (language === "vi" ? meaning.vi : meaning.en) || meaning.en || meaning.vi || "";
}

export function tarotResultSource(moderationStatus: string | undefined): "ai" | "reference" | "blocked" {
  return moderationStatus === "passed" ? "ai" : moderationStatus === "blocked" ? "blocked" : "reference";
}

/** The source line under the summary. A server draw not yet analysed is Nilaza's own reference reading, not an AI failure. */
export function tarotSourceLabel(input: { source: "ai" | "reference" | "blocked"; hasDrawId: boolean; cardCount: number; language: string }): string {
  const vi = input.language === "vi";
  if (input.source === "ai") return vi ? `Diễn giải AI theo ${input.cardCount} lá và câu hỏi của bạn · không phải dự đoán chắc chắn` : `AI interpretation of your ${input.cardCount} cards and question · not a certain prediction`;
  if (input.source === "blocked") return vi ? "Phản hồi an toàn" : "Safety response";
  return input.hasDrawId
    ? (vi ? "Bài đọc Nilaza · theo ý nghĩa truyền thống của các lá · không phải dự đoán chắc chắn" : "Nilaza reading · from the cards' traditional meanings · not a certain prediction")
    : (vi ? "Ý nghĩa có sẵn · AI chưa hoàn tất" : "Reference meanings · AI not completed");
}
