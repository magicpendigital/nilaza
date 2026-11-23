// Lô C1 (value report 21/11, Owner approved): reading context the AI needs to read the spread as one story instead of
// card by card. spreadGuide says what each position asks and how positions relate; cardFacts are counts computed from the
// drawn cards (never guessed by the model); topicMeanings are the approved per-topic meanings of each drawn card in its
// orientation (tarot-card-guide.json upright, tarot-reading-layers.json reversed). Everything is deterministic and comes
// from bundled content: no user history, journal or birth data.
import canonicalCards from "../../../packages/content/data/tarot-cards.json" with { type: "json" };
import cardGuide from "../../../packages/content/data/tarot-card-guide.json" with { type: "json" };
import layers from "../../../packages/content/data/tarot-reading-layers.json" with { type: "json" };

type Language = "vi" | "en";
type Text = { vi?: string; en?: string };
type PositionGuide = { key: string; asks: string; caution?: string };
type SpreadGuideSource = { purpose: string; positions: PositionGuide[]; relations: Array<{ between: [number, number]; how: string }> };

// Written for the model (instructions, not displayed copy), so English only. Position keys match tarot-prompt.ts.
const spreadGuides: Record<string, SpreadGuideSource> = {
  "daily-one": {
    purpose: "One card as a message for today, read against the question.",
    positions: [{ key: "daily", asks: "The theme worth carrying through today and one way to live it." }],
    relations: []
  },
  "past-present-future": {
    purpose: "How the situation has moved and where it may lean if nothing changes.",
    positions: [
      { key: "past", asks: "What has shaped the situation so far.", caution: "Do not claim a specific past event happened." },
      { key: "present", asks: "What is most alive in the situation now." },
      { key: "potential", asks: "Where things may lean if the current pattern continues.", caution: "A possibility the user can change, never a fixed outcome." }
    ],
    relations: [
      { between: [0, 1], how: "How the past card feeds or still colours the present card." },
      { between: [1, 2], how: "What in the present opens or limits the potential." }
    ]
  },
  "situation-challenge-advice": {
    purpose: "Name the situation, the friction inside it and one way through.",
    positions: [
      { key: "situation", asks: "The ground the question stands on." },
      { key: "challenge", asks: "The friction to work with, inside or around the user." },
      { key: "advice", asks: "A way through the challenge.", caution: "Offer it as an option, not an order." }
    ],
    relations: [
      { between: [0, 1], how: "Where the challenge sits within the situation." },
      { between: [1, 2], how: "How the advice card is a way through the challenge card, even when they sound opposed." }
    ]
  },
  "love-three": {
    purpose: "What each side brings and the space between them, seen from the user's side.",
    positions: [
      { key: "you", asks: "What the user brings into the relationship." },
      { key: "other", asks: "How the other person appears from the user's side.", caution: "Never state the other person's real thoughts, feelings or intentions; suggest a question the user could ask them instead." },
      { key: "relationship", asks: "The dynamic the two create together." }
    ],
    relations: [
      { between: [0, 1], how: "Where what the user brings meets or misses how the other person appears." },
      { between: [0, 2], how: "How both sides shape the relationship card." }
    ]
  },
  "crossroads-four": {
    purpose: "Compare stepping forward with holding still, then a lens for choosing.",
    positions: [
      { key: "standing", asks: "Where the user stands before choosing." },
      { key: "forward", asks: "What stepping forward may bring or ask of the user." },
      { key: "still", asks: "What holding still may keep or cost." },
      { key: "advice", asks: "A lens for choosing that applies to both paths.", caution: "It is not the answer; the choice stays with the user." }
    ],
    relations: [
      { between: [1, 2], how: "Contrast the two paths honestly; neither is presented as fated." },
      { between: [0, 3], how: "How the lens card speaks to where the user stands." }
    ]
  }
};

type CanonicalCard = { id: string; arcana: string; number: number | null; suit: string | null; rank: string | null; element: string | null };
const cardsById = new Map((canonicalCards as CanonicalCard[]).map(card => [card.id, card]));
const guideCards = (cardGuide as { cards: Record<string, { topics?: Record<string, Text> }> }).cards;
const reversedTopics = (layers as { reversedTopics: Record<string, Record<string, Text>> }).reversedTopics;
const focusPairs = (layers as { focus: Record<string, { cards: number[] }> }).focus;
const GUIDE_TOPICS = ["love", "career", "self"];
const COURT_RANKS = ["page", "knight", "queen", "king"];
const TENSION: Array<[string, string]> = [["fire", "water"], ["air", "earth"]];
const HARMONY: Array<[string, string]> = [["fire", "air"], ["water", "earth"]];

export type ReadingGuideCard = { id: string; reversed: boolean; positionKey: string };

export function tarotSpreadGuide(spread: string) {
  const source = Object.hasOwn(spreadGuides, spread) ? spreadGuides[spread] : null;
  if (!source) return null;
  const focus = Object.hasOwn(focusPairs, spread) ? focusPairs[spread].cards : null;
  return {
    id: spread, purpose: source.purpose, readOrder: source.positions.map(position => position.key),
    positions: source.positions.map(position => ({ ...position })),
    relations: source.relations.map(relation => ({ between: [...relation.between], how: relation.how })),
    ...(focus ? { focusBetween: [...focus] } : {})
  };
}

function count(values: string[]) {
  const result: Record<string, number> = {};
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return result;
}

export function tarotCardFacts(cards: ReadingGuideCard[]) {
  const sources = cards.map(card => cardsById.get(card.id)).filter((card): card is CanonicalCard => Boolean(card));
  const minors = sources.filter(card => card.arcana === "minor");
  const suits = count(minors.map(card => card.suit ?? "").filter(Boolean));
  const elements = count(sources.map(card => card.element ?? "").filter(Boolean));
  const ranked = Object.entries(suits).sort((a, b) => b[1] - a[1]);
  const dominantSuit = sources.length >= 3 && ranked.length && ranked[0][1] >= 2 && (ranked.length === 1 || ranked[0][1] > ranked[1][1]) ? ranked[0][0] : null;
  const pairs = (list: Array<[string, string]>) => list.filter(([a, b]) => elements[a] && elements[b]).map(([a, b]) => `${a}-${b}`);
  const numbers = count(minors.filter(card => typeof card.number === "number" && card.number <= 10).map(card => String(card.number)));
  return {
    total: cards.length,
    majors: sources.filter(card => card.arcana === "major").length,
    reversed: cards.filter(card => card.reversed).length,
    suits, elements, dominantSuit,
    elementTension: pairs(TENSION), elementHarmony: pairs(HARMONY),
    repeatedNumbers: Object.entries(numbers).filter(([, n]) => n >= 2).map(([number]) => Number(number)),
    courtCards: minors.filter(card => COURT_RANKS.includes(card.rank ?? "")).map(card => card.id),
    aces: minors.filter(card => card.number === 1).map(card => card.id)
  };
}

/**
 * The approved meaning of each drawn card for the topic in its orientation; empty for the decision and open topics.
 * These texts speak to the user ("you"), so the "other" position gets none: read there, they would invite the model to
 * describe the other person's inner life (the free reading also reads that position through the card portrait).
 */
export function tarotTopicMeanings(cards: ReadingGuideCard[], topic: string, language: Language) {
  if (!GUIDE_TOPICS.includes(topic)) return [];
  return cards.filter(card => card.positionKey !== "other").flatMap(card => {
    const text = card.reversed ? reversedTopics[card.id]?.[topic] : guideCards[card.id]?.topics?.[topic];
    const value = text?.[language] ?? text?.en;
    return value ? [{ id: card.id, positionKey: card.positionKey, orientation: card.reversed ? "reversed" : "upright", meaning: value }] : [];
  });
}

export function tarotReadingGuide(input: { spread: string; topic: string; language: Language; cards: ReadingGuideCard[] }) {
  return {
    spreadGuide: tarotSpreadGuide(input.spread),
    cardFacts: tarotCardFacts(input.cards),
    topicMeanings: tarotTopicMeanings(input.cards, input.topic, input.language)
  };
}
