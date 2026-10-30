import guide from "../../../../../packages/content/data/tarot-card-guide.json";
import type { Language } from "../../types";

// Owner-approved card guide (2026-10-30): per-topic upright meanings, a common misreading,
// optional other readings and support notes, and Golden Dawn correspondences.
export const tarotCardGuideVersion = guide.version;

type Text = { vi: string; en: string };
type GuideCard = {
  topics: Record<"love" | "career" | "self", Text>;
  misconception: Text;
  otherReadings?: Text;
  supportNote?: Text;
  element: Text;
  astrology: Text;
  modernPlanet?: Text;
  noteKeys?: string[];
  extraNote?: Text;
};

export type TarotGuideTopic = { id: "love" | "career" | "self"; label: string; body: string };
export type TarotCardGuide = {
  topics: TarotGuideTopic[];
  misconception: string;
  otherReadings?: string;
  supportNote?: string;
  element: string;
  astrology: string;
  modernPlanet?: string;
  notes: string[];
};

const topicLabels = {
  love: { vi: "Trong tình yêu", en: "In love" },
  career: { vi: "Trong công việc", en: "At work" },
  self: { vi: "Với bản thân", en: "With yourself" }
} as const;

export function getTarotCardGuide(cardId: string, language: Language): TarotCardGuide | null {
  const card = (guide.cards as Record<string, GuideCard>)[cardId];
  if (!card) return null;
  const locale = language === "vi" ? "vi" : "en";
  const pick = (text?: Text) => text?.[locale];
  const shared = guide.sharedNotes as Record<string, Text>;
  return {
    topics: (Object.keys(topicLabels) as Array<keyof typeof topicLabels>).map((id) => ({ id, label: topicLabels[id][locale], body: card.topics[id][locale] })),
    misconception: card.misconception[locale],
    otherReadings: pick(card.otherReadings),
    supportNote: pick(card.supportNote),
    element: card.element[locale],
    astrology: card.astrology[locale],
    modernPlanet: pick(card.modernPlanet),
    notes: [...(card.noteKeys ?? []).map((key) => shared[key]?.[locale]).filter((note): note is string => Boolean(note)), ...(card.extraNote ? [card.extraNote[locale]] : [])]
  };
}
