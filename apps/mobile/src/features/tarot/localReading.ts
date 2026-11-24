import guide from "../../../../../packages/content/data/tarot-card-guide.json";
import layers from "../../../../../packages/content/data/tarot-reading-layers.json";
import type { Language } from "../../types";

// Value report batch A (Owner 2026-11-21): the free reading reads *this* question, with no meta text about the AI.
// Batch B (Owner 2026-11-21): the reading is composed from the five-layer library in tarot-reading-layers.json.
// Owner feedback 21/11: every sentence names the drawn cards and their keywords (story thread, position voice,
// the one tension worth noticing) instead of generic reading advice or disclaimers. Still local and reflective:
// nothing predicts an outcome or claims to know what another person thinks.

type Text = { vi: string; en: string };
type Suit = "wands" | "cups" | "swords" | "pentacles";
type GuideTopic = "love" | "career" | "self";
type StepTopic = GuideTopic | "decision" | "open";
type Theme = "major" | Suit;

export type LocalReadingCard = {
  id?: string;
  name: { vi?: string; en?: string };
  arcana: string;
  suit?: string | null;
  number?: number;
  rank?: string | null;
  element?: string;
  keywords: { vi?: string[]; en?: string[] };
  intro?: { vi?: string; en?: string };
  uprightMeaning?: { vi?: string; en?: string };
  reversedMeaning?: { vi?: string; en?: string };
  reversed: boolean;
  spread?: string;
};

export type LocalReadingPosition = { vi?: string; en?: string };

export type LocalReading = {
  summary: string;
  reflection: string;
  cardInterpretations: Text[];
  sections: Array<{ key: string; title: Text; body: Text }>;
};

type Layers = {
  version: string;
  positionRoles: Record<string, string[]>;
  roles: Record<string, { upright: Text; reversed: Text }>;
  threads: Record<string, Text>;
  reversedMark: Text;
  focus: Record<string, { cards: [number, number]; text: Text }>;
  deepHook: Text;
  combinations: {
    majorsMajority: Text;
    suit: Record<Suit, Text>;
    mixed: Text;
    single: Text;
    reversedMajority: Text;
    elementTension: Record<string, Text>;
    elementHarmony: Record<string, Text>;
    courtsMany: Text;
    acesMany: Text;
    repeatedNumber: Text;
  };
  stepTitle: Text;
  steps: Record<StepTopic, Record<Theme, Text>>;
  journal: Record<StepTopic, Record<Theme, Text>>;
  reversedTopics: Record<string, Partial<Record<GuideTopic, Text>>>;
};

const library = layers as unknown as Layers;
const guideCards = guide.cards as unknown as Record<string, { topics: Record<GuideTopic, Text> }>;
export const tarotReadingLayersVersion = library.version;

const suits: Suit[] = ["wands", "cups", "swords", "pentacles"];
const courtRanks = new Set(["page", "knight", "queen", "king"]);

const pick = (text: Text | undefined, vi: boolean) => (text ? (vi ? text.vi : text.en) : "");
const isSuit = (value: unknown): value is Suit => typeof value === "string" && (suits as string[]).includes(value);
const guideTopic = (topic: string): GuideTopic | null => (topic === "love" || topic === "career" || topic === "self" ? topic : null);
// Small step and journal question: each topic has its own set; an unknown topic reads as an open question.
const stepTopic = (topic: string): StepTopic => (topic === "decision" ? "decision" : guideTopic(topic) ?? "open");

function capitalize(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? values[key] : match));
}

/** Card intros were written with the English card name; a Vietnamese reading shows the approved Vietnamese name instead. */
function localizeCardName(text: string, card: LocalReadingCard, vi: boolean): string {
  if (!vi || !card.name.en || !card.name.vi) return text;
  return text.split(card.name.en).join(card.name.vi);
}

/** The card's name in the reading language (approved Vietnamese name in Vietnamese). */
function cardName(card: LocalReadingCard, vi: boolean): string {
  return (vi ? card.name.vi : card.name.en) || card.name.en || card.name.vi || "";
}

function keywords(card: LocalReadingCard, vi: boolean): string[] {
  const list = (vi ? card.keywords.vi : card.keywords.en) ?? card.keywords.en ?? card.keywords.vi ?? [];
  return list.map((word) => word.trim()).filter(Boolean);
}

/** The card's leading keyword; marked as held back when the card is reversed. */
function leadKeyword(card: LocalReadingCard, vi: boolean): string {
  const word = keywords(card, vi)[0] ?? cardName(card, vi);
  return card.reversed ? fill(pick(library.reversedMark, vi), { kw: word }) : word;
}

function keywordPair(card: LocalReadingCard, vi: boolean): string {
  const words = keywords(card, vi).slice(0, 2);
  if (words.length === 0) return cardName(card, vi);
  if (words.length === 1) return words[0];
  return `${words[0]} ${vi ? "và" : "and"} ${words[1]}`;
}

/** The energy that leads the spread: Major Arcana when they are at least half, otherwise the one dominant suit. */
export function readingTheme(cards: LocalReadingCard[]): Theme {
  if (cards.length === 0) return "major";
  const majors = cards.filter((card) => card.arcana === "major").length;
  if (majors >= cards.length / 2) return "major";
  const counts = new Map<Suit, number>();
  for (const card of cards) if (isSuit(card.suit)) counts.set(card.suit, (counts.get(card.suit) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [topSuit, topCount] = sorted[0] ?? [undefined, 0];
  const tie = sorted.filter(([, count]) => count === topCount).length > 1;
  if (topSuit && !tie) return topSuit;
  const first = cards.find((card) => isSuit(card.suit));
  return first && isSuit(first.suit) ? first.suit : "major";
}

function patternSentence(cards: LocalReadingCard[], vi: boolean): string {
  const c = library.combinations;
  if (cards.length < 2) return "";
  const majors = cards.filter((card) => card.arcana === "major").length;
  if (majors >= cards.length / 2) return pick(c.majorsMajority, vi);
  const counts = new Map<Suit, number>();
  for (const card of cards) if (isSuit(card.suit)) counts.set(card.suit, (counts.get(card.suit) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [topSuit, topCount] = sorted[0] ?? [undefined, 0];
  const tie = sorted.filter(([, count]) => count === topCount).length > 1;
  if (topSuit && topCount >= 2 && !tie) return pick(c.suit[topSuit], vi);
  return pick(c.mixed, vi);
}

/** L3: up to two combination facts beyond the leading energy (elements, court cards, aces, repeated numbers). */
function combinationFacts(cards: LocalReadingCard[], vi: boolean): string[] {
  if (cards.length < 2) return [];
  const c = library.combinations;
  const facts: string[] = [];
  const elements = new Set(cards.map((card) => card.element).filter(Boolean));
  for (const pair of ["fire-water", "air-earth"]) {
    const [a, b] = pair.split("-");
    if (elements.has(a) && elements.has(b)) facts.push(pick(c.elementTension[pair], vi));
  }
  if (facts.length === 0) {
    for (const pair of ["fire-air", "water-earth"]) {
      const [a, b] = pair.split("-");
      if (elements.has(a) && elements.has(b)) facts.push(pick(c.elementHarmony[pair], vi));
    }
  }
  const minors = cards.filter((card) => card.arcana === "minor");
  if (minors.filter((card) => card.rank && courtRanks.has(card.rank)).length >= 2) facts.push(pick(c.courtsMany, vi));
  if (minors.filter((card) => card.rank === "ace").length >= 2) facts.push(pick(c.acesMany, vi));
  else {
    const numberCounts = new Map<number, number>();
    for (const card of minors) {
      if (typeof card.number === "number" && card.number >= 2 && card.number <= 10) numberCounts.set(card.number, (numberCounts.get(card.number) ?? 0) + 1);
    }
    const repeated = [...numberCounts.entries()].find(([, count]) => count >= 2);
    if (repeated) facts.push(fill(pick(c.repeatedNumber, vi), { number: String(repeated[0]) }));
  }
  return facts.filter(Boolean).slice(0, 2);
}

/** The story thread: every drawn card by name and leading keyword, in the spread's own logic. */
function threadSentence(cards: LocalReadingCard[], spread: string, vi: boolean): string {
  const template = pick(library.threads[spread], vi);
  if (!template || (library.positionRoles[spread]?.length ?? 0) !== cards.length) {
    const parts = cards.map((card) => `${leadKeyword(card, vi)} (${cardName(card, vi)})`);
    return vi ? `các lá nói về ${parts.join(", ")}.` : `the cards speak of ${parts.join(", ")}.`;
  }
  const values: Record<string, string> = {};
  cards.forEach((card, index) => {
    values[`card${index + 1}`] = cardName(card, vi);
    values[`kw${index + 1}`] = leadKeyword(card, vi);
  });
  return fill(template, values);
}

/** The one tension worth noticing between two cards of the spread. */
function focusSentence(cards: LocalReadingCard[], spread: string, vi: boolean): string {
  const focus = library.focus[spread];
  if (!focus) return "";
  const [a, b] = focus.cards.map((index) => cards[index]);
  if (!a || !b) return "";
  return fill(pick(focus.text, vi), { kwA: leadKeyword(a, vi), kwB: leadKeyword(b, vi), cardA: cardName(a, vi), cardB: cardName(b, vi) });
}

/** L1: the card's meaning for this topic and orientation; general meaning when no topic text exists yet. */
function cardMeaning(card: LocalReadingCard, topic: string, role: string | undefined, vi: boolean): string {
  // The other person's position reads the card's own portrait, which is not written to "you".
  if (role === "other") return localizeCardName(pick(card.intro as Text | undefined, vi) || "", card, vi);
  const key = guideTopic(topic);
  const general = (card.reversed ? card.reversedMeaning : card.uprightMeaning) ?? {};
  const fallback = (vi ? general.vi : general.en) || general.en || general.vi || "";
  if (!key || !card.id) return localizeCardName(fallback, card, vi);
  const text = card.reversed ? library.reversedTopics[card.id]?.[key] : guideCards[card.id]?.topics?.[key];
  return localizeCardName(pick(text, vi) || fallback, card, vi);
}

/** L2: the position voice built on the card's own keywords, e.g. "The friction sits in revelation and collapse." */
function positionVoice(role: string | undefined, card: LocalReadingCard, vi: boolean): string {
  const frame = role ? library.roles[role] : undefined;
  if (!frame) return "";
  return capitalize(fill(pick(card.reversed ? frame.reversed : frame.upright, vi), { kw: keywordPair(card, vi) }));
}

function cardBody(spread: string, topic: string, card: LocalReadingCard, index: number, vi: boolean): string {
  const role = library.positionRoles[spread]?.[index];
  return [positionVoice(role, card, vi), cardMeaning(card, topic, role, vi)].filter(Boolean).join(" ");
}

function summaryText(cards: LocalReadingCard[], spread: string, question: string, topicLabel: string, language: Language): string {
  const vi = language === "vi";
  const trimmed = question.trim();
  const opening = trimmed
    ? vi ? `Với câu hỏi “${trimmed}”, ` : `For your question “${trimmed}”, `
    : vi ? `Với chủ đề ${topicLabel.toLowerCase()}, ` : `On ${topicLabel.toLowerCase()}, `;
  const reversedCount = cards.filter((card) => card.reversed).length;
  const parts = [
    `${opening}${threadSentence(cards, spread, vi)}`,
    capitalize(patternSentence(cards, vi)),
    cards.length >= 2 && reversedCount >= cards.length / 2 ? pick(library.combinations.reversedMajority, vi) : "",
    ...combinationFacts(cards, vi).map(capitalize),
    focusSentence(cards, spread, vi)
  ];
  return parts.filter(Boolean).join(" ");
}

/**
 * The free Nilaza reading for a draw. Card bodies are given in both languages so a saved reading keeps them;
 * the summary, step and journal question follow the display language.
 */
export function composeLocalReading(input: {
  cards: LocalReadingCard[];
  positions?: LocalReadingPosition[];
  spread: string;
  topic: string;
  topicLabel: string;
  question: string;
  language: Language;
}): LocalReading {
  const { cards, spread, topic, topicLabel, question, language } = input;
  const theme = readingTheme(cards);
  const vi = language === "vi";
  return {
    summary: summaryText(cards, spread, question, topicLabel, language),
    reflection: pick(library.journal[stepTopic(topic)][theme], vi),
    cardInterpretations: cards.map((card, index) => ({
      vi: cardBody(spread, topic, card, index, true),
      en: cardBody(spread, topic, card, index, false)
    })),
    sections: [{ key: "small_step", title: library.stepTitle, body: library.steps[stepTopic(topic)][theme] }]
  };
}

/**
 * The line above the deep-reading button: it names the two cards whose meeting point is particular to this
 * question, so the invitation is about value already visible on screen rather than about what is withheld.
 */
export function deepReadingHook(cards: LocalReadingCard[], spread: string, language: Language): string {
  if (cards.length < 2) return "";
  const vi = language === "vi";
  const [ia, ib] = library.focus[spread]?.cards ?? [0, cards.length - 1];
  const a = cards[ia];
  const b = cards[ib];
  if (!a || !b) return "";
  return fill(pick(library.deepHook, vi), { cardA: cardName(a, vi), cardB: cardName(b, vi) });
}
