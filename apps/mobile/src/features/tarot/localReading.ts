import type { Language } from "../../types";
import { cardInline } from "./cardName";

// Value report batch A (Owner 2026-11-21): the free reading must read as a reading of *this* question,
// built only from the drawn cards' traditional meanings. No meta text about the AI, no predictions.

export type LocalReadingCard = {
  name: { vi?: string; en?: string };
  arcana: string;
  suit?: string | null;
  keywords: { vi?: string[]; en?: string[] };
  reversed: boolean;
  spread?: string;
};

type Suit = "wands" | "cups" | "swords" | "pentacles";

const suitPattern: Record<Suit, { vi: string; en: string }> = {
  cups: {
    vi: "nhiều lá Cups cho thấy chuyện này nằm ở cảm xúc và sự kết nối nhiều hơn là chuyện đúng sai.",
    en: "several Cups suggest this is more about feelings and connection than about right or wrong."
  },
  wands: {
    vi: "nhiều lá Wands cho thấy một thôi thúc muốn hành động, muốn bắt đầu điều gì đó.",
    en: "several Wands point to an urge to act and to start something."
  },
  swords: {
    vi: "nhiều lá Swords cho thấy suy nghĩ, những điều chưa nói ra và nhu cầu nhìn rõ đang chiếm chỗ lớn.",
    en: "several Swords point to thoughts, things left unsaid and a need for clarity."
  },
  pentacles: {
    vi: "nhiều lá Pentacles cho thấy chuyện này gắn với những điều cụ thể: thời gian, tiền bạc, sức lực.",
    en: "several Pentacles tie this to concrete things: time, money and energy."
  }
};

function keywordPair(card: LocalReadingCard, vi: boolean): string {
  const list = (vi ? card.keywords.vi : card.keywords.en) ?? card.keywords.en ?? card.keywords.vi ?? [];
  const words = list.slice(0, 2).map((word) => word.trim()).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0];
  return `${words[0]} ${vi ? "và" : "and"} ${words[1]}`;
}

function patternSentence(cards: LocalReadingCard[], vi: boolean): string {
  if (cards.length < 2) return "";
  const half = cards.length / 2;
  const majors = cards.filter((card) => card.arcana === "major").length;
  if (majors >= half) {
    return vi
      ? "phần lớn các lá thuộc Major Arcana, gợi ý đây là một giai đoạn có sức nặng hơn chuyện thường ngày."
      : "most cards are Major Arcana, which suggests a period that weighs more than everyday matters.";
  }
  const counts = new Map<Suit, number>();
  for (const card of cards) {
    if (card.suit && card.suit in suitPattern) counts.set(card.suit as Suit, (counts.get(card.suit as Suit) ?? 0) + 1);
  }
  const [topSuit, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [undefined, 0];
  const tie = [...counts.values()].filter((count) => count === topCount).length > 1;
  if (topSuit && topCount >= 2 && !tie) return vi ? suitPattern[topSuit].vi : suitPattern[topSuit].en;
  return vi
    ? "các lá trải ra nhiều hướng, như có vài lực cùng kéo bạn một lúc."
    : "the cards spread in several directions, as if a few forces are pulling at once.";
}

function cardSentence(card: LocalReadingCard, index: number, language: Language): string {
  const vi = language === "vi";
  const position = card.spread?.trim() || (vi ? `lá thứ ${index + 1}` : `card ${index + 1}`);
  const name = cardInline(card.name, language);
  const words = keywordPair(card, vi);
  if (!words) return vi ? `Ở vị trí ${position} là ${name}.` : `In the ${position} position sits ${name}.`;
  if (card.reversed) {
    return vi
      ? `Ở vị trí ${position}, ${name} ngược gợi rằng ${words} đang bị chặn lại hoặc cần được nhìn lại.`
      : `In the ${position} position, ${name} reversed suggests ${words} are blocked or need a second look.`;
  }
  return vi ? `Ở vị trí ${position}, ${name} nói về ${words}.` : `In the ${position} position, ${name} speaks of ${words}.`;
}

export function composeLocalTarotSummary(
  cards: LocalReadingCard[],
  question: string,
  topicLabel: string,
  language: Language
): string {
  const vi = language === "vi";
  const trimmed = question.trim();
  const opening = trimmed
    ? vi ? `Với câu hỏi “${trimmed}”, ` : `For your question “${trimmed}”, `
    : vi ? `Với chủ đề ${topicLabel.toLowerCase()}, ` : `On ${topicLabel.toLowerCase()}, `;
  const pattern = patternSentence(cards, vi)
    || (vi ? "lá bạn rút hôm nay là một gợi ý để soi lại chính mình." : "the card you drew today is a prompt to look at yourself.");
  const reversedCount = cards.filter((card) => card.reversed).length;
  const reversedNote = cards.length >= 2 && reversedCount >= cards.length / 2
    ? vi ? " Nhiều lá ngược cho thấy năng lượng đang quay vào bên trong hoặc bị chặn lại." : " Several reversed cards show energy turning inward or held back."
    : "";
  const perCard = cards.map((card, index) => cardSentence(card, index, language)).join(" ");
  const closing = vi
    ? "Hãy để ý lá khiến bạn dừng lại lâu nhất: điều nó gợi ra có thể là phần câu hỏi này đang thật sự chạm tới. Ý nghĩa từng lá nằm ngay bên dưới."
    : "Notice the card you linger on longest: what it brings up may be what this question is really touching. Each card's meaning is just below.";
  return `${opening}${pattern}${reversedNote} ${perCard} ${closing}`;
}
