import blocks from "../../../../../packages/content/data/numerology-blocks.json";
import type { Language } from "../../types";
import type { ArrowId, NumerologyNumber } from "./calc";

type Text = { vi: string; en: string };
const pick = (text: Text, language: Language) => (language === "vi" ? text.vi : text.en);

export type NumerologyKind = "lifePath" | "birthday" | "expression" | "soulUrge" | "personality";
export const numerologyKinds: NumerologyKind[] = ["lifePath", "birthday", "expression", "soulUrge", "personality"];

/** False until a named human reviewer approves the text; the screen says so while it is false. */
export const numerologyContentReviewed = blocks.review.status === "approved" && Boolean(blocks.review.reviewer);

export const kindTitle = (kind: NumerologyKind, language: Language) => pick(blocks.kinds[kind].title, language);
export const kindFrame = (kind: NumerologyKind, language: Language) => pick(blocks.kinds[kind].frame, language);

export type NumberBlock = { title: string; leans: string; light: string; trap: string; question: string; masterNote?: string };

/** The block for a number. 11 and 22 read as the block of their root (2 and 4) plus a note on the shade. */
export function numberBlock(number: NumerologyNumber, language: Language): NumberBlock {
  const block = blocks.numbers[String(number.root) as keyof typeof blocks.numbers];
  const master = number.master ? blocks.masters[String(number.value) as keyof typeof blocks.masters] : undefined;
  return {
    title: pick(block.title, language),
    leans: pick(block.leans, language),
    light: pick(block.light, language),
    trap: pick(block.trap, language),
    question: pick(block.question, language),
    ...(master ? { masterNote: pick(master, language) } : {})
  };
}

export const digitLine = (digit: number, language: Language) => pick(blocks.digits[String(digit) as keyof typeof blocks.digits] as Text, language);
export const digitNote = (language: Language) => pick(blocks.digits.note, language);
export const arrowLabel = (id: ArrowId, language: Language) => pick(blocks.arrows[id].label, language);
export const arrowText = (id: ArrowId, language: Language) => pick(blocks.arrows[id].text, language);
export const arrowNotes = (language: Language) => ({ empty: pick(blocks.arrows.emptyNote, language), label: pick(blocks.arrows.labelNote, language) });

/** Every string in the store, for the banned-word test. */
export const allNumerologyText = (): string[] => {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") out.push(value);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  const { review: _review, version: _version, ...text } = blocks;
  walk(text);
  return out;
};
