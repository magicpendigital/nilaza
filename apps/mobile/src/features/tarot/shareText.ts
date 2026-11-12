import type { Language } from "../../types";

export type ShareCardLine = { position: string; name: string; reversed: boolean };

export function firstSentence(text: string): string {
  const match = text.trim().match(/^[\s\S]{12,220}?[.!?…](?=\s|$)/);
  return (match ? match[0] : "").trim();
}

/** One message sentence from a reading summary, or "" when it would quote the person's question. */
export function safeReadingSentence(summary: string, question?: string | null): string {
  const sentence = firstSentence(summary);
  const asked = (question ?? "").trim().toLowerCase();
  const quotesQuestion = asked.length >= 8 && sentence.toLowerCase().includes(asked.slice(0, Math.min(asked.length, 24)));
  return quotesQuestion ? "" : sentence;
}

/**
 * Text that leaves the device when a reading is shared (analysis TA-11): card names, positions and
 * orientation, at most one message sentence and the Nilaza line. The question and private notes are
 * never included; a summary sentence that quotes the question is dropped.
 */
export function readingShareText(input: { cards: ShareCardLine[]; summary: string; question?: string | null; language: Language }): string {
  const vi = input.language === "vi";
  const lines = input.cards.map((card) => `${card.position} · ${card.name} · ${card.reversed ? (vi ? "Ngược" : "Reversed") : (vi ? "Xuôi" : "Upright")}`);
  const sentence = safeReadingSentence(input.summary, input.question);
  return [
    ...lines,
    ...(sentence ? ["", sentence] : []),
    "",
    vi ? "Nilaza — để tự phản chiếu" : "Nilaza — for self-reflection"
  ].join("\n");
}
