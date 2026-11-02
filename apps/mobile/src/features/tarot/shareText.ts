import type { Language } from "../../types";

export type ShareCardLine = { position: string; name: string; reversed: boolean };

function firstSentence(text: string): string {
  const match = text.trim().match(/^[\s\S]{12,220}?[.!?…](?=\s|$)/);
  return (match ? match[0] : "").trim();
}

/**
 * Text that leaves the device when a reading is shared (analysis TA-11): card names, positions and
 * orientation, at most one message sentence and the Nilaza line. The question and private notes are
 * never included; a summary sentence that quotes the question is dropped.
 */
export function readingShareText(input: { cards: ShareCardLine[]; summary: string; question?: string | null; language: Language }): string {
  const vi = input.language === "vi";
  const lines = input.cards.map((card) => `${card.position} · ${card.name} · ${card.reversed ? (vi ? "Ngược" : "Reversed") : (vi ? "Xuôi" : "Upright")}`);
  const sentence = firstSentence(input.summary);
  const question = (input.question ?? "").trim().toLowerCase();
  const quotesQuestion = question.length >= 8 && sentence.toLowerCase().includes(question.slice(0, Math.min(question.length, 24)));
  return [
    ...lines,
    ...(sentence && !quotesQuestion ? ["", sentence] : []),
    "",
    vi ? "Nilaza — để tự phản chiếu" : "Nilaza — for self-reflection"
  ].join("\n");
}
