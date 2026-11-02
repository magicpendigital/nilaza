import type { Language } from "../../types";

type CardName = { vi?: string; en?: string } & Partial<Record<string, string>>;

// Owner decision 2026-11-02: the original (English) card name leads everywhere; in Vietnamese the
// approved Vietnamese name follows as a smaller line under titles, or in brackets inside sentences.
export function cardTitle(name: CardName): string {
  return (name.en ?? name.vi ?? "").trim();
}

/** Vietnamese name under the title; empty in English or when the names match. */
export function cardSubtitle(name: CardName, language: Language): string {
  if (language === "en") return "";
  const local = (name[language] ?? name.vi ?? "").trim();
  return local && local !== cardTitle(name) ? local : "";
}

/** "Six of Swords (Sáu Kiếm)" for sentences, toasts, shares and screen readers. */
export function cardInline(name: CardName, language: Language): string {
  const subtitle = cardSubtitle(name, language);
  return subtitle ? `${cardTitle(name)} (${subtitle})` : cardTitle(name);
}
