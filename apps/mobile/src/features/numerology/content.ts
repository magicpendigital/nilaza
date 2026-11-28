import blocks from "../../../../../packages/content/data/numerology-blocks.json";
import extraBlocks from "../../../../../packages/content/data/numerology-reading-extra.json";
import type { Language } from "../../types";
import type { ArrowId, NumerologyNumber } from "./calc";
import type { CompatRelation } from "./compat";

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

// Lô 5 keys (layer 3 "Nhịp thời gian", layer 4 "Hợp số", the "Lời nhắn riêng" card). Typed by hand so this module
// does not depend on JSON type inference for keys that are added in the same batch.
type Digits = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type TimeBlocks = {
  personalYear: { frame: Text } & Record<Digits, { title: Text; leans: Text; question: Text }>;
  personalMonth: { frame: Text } & Record<Digits, Text>;
  personalDay: { frame: Text } & Record<Digits, Text>;
  pinnacles: { frame: Text; stages: Record<"1" | "2" | "3" | "4", Text>; numbers: Record<Digits | "11" | "22", Text> };
  challenges: { frame: Text } & Record<"0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8", Text>;
  relationship: {
    frame: Text;
    numbers: Record<Digits, Text>;
    pairs: Record<CompatRelation, { common: Text; tension: Text }>;
    privacyNote: Text;
  };
  privateMessage: Record<PrivateMessageKey, Text>;
};
// 2026-11-25: the card strings of the private message (action, consent, result and refusal lines).
const PRIVATE_MESSAGE_KEYS = ["title", "soon", "body", "sends", "action", "consentTitle", "consentBody", "consentConfirm", "consentCancel",
  "loading", "resultTitle", "premiumNote", "dailyLimit", "unavailable", "retry", "blocked"] as const;
type PrivateMessageKey = typeof PRIVATE_MESSAGE_KEYS[number];
export type PrivateMessageCopy = Record<PrivateMessageKey, string>;
const time = blocks as unknown as TimeBlocks;
const digitKey = (n: number) => String(n) as Digits;

export const personalYearFrame = (language: Language) => pick(time.personalYear.frame, language);
export function personalYearBlock(year: number, language: Language) {
  const block = time.personalYear[digitKey(year)];
  return { title: pick(block.title, language), leans: pick(block.leans, language), question: pick(block.question, language) };
}
export const personalMonthFrame = (language: Language) => pick(time.personalMonth.frame, language);
export const personalMonthLine = (month: number, language: Language) => pick(time.personalMonth[digitKey(month)], language);
export const personalDayFrame = (language: Language) => pick(time.personalDay.frame, language);
export const personalDayLine = (day: number, language: Language) => pick(time.personalDay[digitKey(day)], language);

export const pinnacleFrame = (language: Language) => pick(time.pinnacles.frame, language);
export const pinnacleStageLine = (stage: 1 | 2 | 3 | 4, language: Language) => pick(time.pinnacles.stages[String(stage) as "1"], language);
/** 11 and 22 have their own pinnacle line (the shade of 2 and 4). */
export const pinnacleNumberLine = (number: NumerologyNumber, language: Language) =>
  pick(time.pinnacles.numbers[String(number.value) as Digits | "11" | "22"], language);

export const challengeFrame = (language: Language) => pick(time.challenges.frame, language);
export const challengeLine = (value: number, language: Language) => pick(time.challenges[String(value) as "0"], language);

export const relationshipFrame = (language: Language) => pick(time.relationship.frame, language);
/** Relationship line for a number; 11 and 22 read as their root. */
export const relationshipLine = (number: NumerologyNumber, language: Language) => pick(time.relationship.numbers[digitKey(number.root)], language);
export function relationshipPair(relation: CompatRelation, language: Language) {
  const pair = time.relationship.pairs[relation];
  return { common: pick(pair.common, language), tension: pick(pair.tension, language) };
}
export const relationshipPrivacyNote = (language: Language) => pick(time.relationship.privacyNote, language);

export function privateMessageCard(language: Language): PrivateMessageCopy {
  const card = time.privateMessage;
  return Object.fromEntries(PRIVATE_MESSAGE_KEYS.map((key) => [key, pick(card[key], language)])) as PrivateMessageCopy;
}

// 2026-11-26: richer chart and Hợp số copy, in its own file so the Owner-approved store (which the deployed
// private-message function bundles) stays untouched. It carries its own review block.
type ExtraStore = {
  review: { status?: unknown; reviewer?: unknown };
  chart: Record<"presentCount" | "strongest" | "noRepeat" | "row" | "repeatHint" | "emptyHint" | "times", Text>;
  digits: Record<Digits, { title: Text; present: Text; many: Text; absent: Text }>;
  relationship: {
    you: Text; other: Text; needsTitle: Text; questionTitle: Text; summary: Text; summaryItem: Text;
    badges: Record<CompatRelation, Text>;
    needs: Record<Digits, Text>;
    questions: Record<CompatRelation, Text>;
  };
};
const extra = extraBlocks as unknown as ExtraStore;
export const numerologyExtraReviewed = extra.review.status === "approved" && typeof extra.review.reviewer === "string" && extra.review.reviewer.trim().length > 0;

/** Fills "{name}" slots. */
export const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));

export type ChartCopyKey = keyof ExtraStore["chart"];
export const chartCopy = (key: ChartCopyKey, language: Language) => pick(extra.chart[key], language);
/** Title and the reading that fits the count: present once, repeated, or absent. */
export function digitReading(digit: number, count: number, language: Language) {
  const block = extra.digits[digitKey(digit)];
  return {
    title: pick(block.title, language),
    body: pick(count === 0 ? block.absent : block.present, language),
    many: count > 1 ? pick(block.many, language) : undefined
  };
}
export function relationshipExtra(language: Language) {
  const r = extra.relationship;
  return { you: pick(r.you, language), other: pick(r.other, language), needsTitle: pick(r.needsTitle, language), questionTitle: pick(r.questionTitle, language),
    summary: pick(r.summary, language), summaryItem: pick(r.summaryItem, language) };
}
export const relationBadge = (relation: CompatRelation, language: Language) => pick(extra.relationship.badges[relation], language);
export const relationQuestion = (relation: CompatRelation, language: Language) => pick(extra.relationship.questions[relation], language);
/** What a person with this number needs from the other; 11 and 22 read as their root. */
export const relationshipNeed = (number: NumerologyNumber, language: Language) => pick(extra.relationship.needs[digitKey(number.root)], language);

/** Every string in both stores, for the banned-word test. */
export const allNumerologyText = (): string[] => {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") out.push(value);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  const { review: _review, version: _version, ...text } = blocks;
  walk(text);
  walk({ chart: extra.chart, digits: extra.digits, relationship: extra.relationship });
  return out;
};
