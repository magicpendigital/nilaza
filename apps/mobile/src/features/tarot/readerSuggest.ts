import type { Language } from "../../types";
import { cardInline } from "./cardName";

// Batch C (Owner approved 23/11/2026, proposal section 2): the Tarot follow-up reader is suggested from what the person
// asks, not from the deck alone. This is the free, on-device rule tier: it sends nothing anywhere. Score per reader =
// chosen topic (largest weight) + question keywords (Vietnamese with and without diacritics, English) + card facts
// (Cups, Swords, Majors) + a small deck tie-breaker. Persona themes come from personas-archetypes.json.

export type ReaderIntent = "love" | "career" | "decision" | "healing" | "shadow" | "dreams" | "self" | "depth";
export type ReaderChosenTopic = "love" | "career" | "self" | "decision" | "open";

export type ReaderCardInput = {
  cardId: string;
  orientation: "upright" | "reversed";
  positionKey: string;
  suit?: "wands" | "cups" | "swords" | "pentacles" | null;
  arcana?: "major" | "minor";
  /** Localized card name; the reason sentence names 1–2 drawn cards. */
  name?: { vi?: string; en?: string };
};

export type ReaderGuideInput = {
  slug: string;
  themes: string[];
  name?: { vi?: string; en?: string };
};

export type ReaderSuggestInput = {
  topic: ReaderChosenTopic | string;
  question: string;
  cards: ReaderCardInput[];
  deckId: string;
  guides: ReaderGuideInput[];
  language?: Language;
  /** AI tier answer (already checked against the candidates): this slug leads, the rest keep their rule order. */
  forcePrimary?: string;
};

export type ReaderReasonKey = "topic_and_cards" | "cards_only" | "deck_default";

export type ReaderAlternative = { slug: string; reason: string };

export type ReaderSuggestion = {
  primary: string;
  alternatives: ReaderAlternative[];
  /** 0..1; below LOW_CONFIDENCE the app may ask the optional AI tier. */
  confidence: number;
  lowConfidence: boolean;
  /** The question's main topic (from the chosen topic and the words in the question), null when nothing said it. */
  matchedTopic: ReaderIntent | null;
  /** A second intent the words carry (for the second chip), e.g. a decision inside a love question. */
  secondaryIntent: ReaderIntent | null;
  reasonKey: ReaderReasonKey;
  reasonParams: { topic: ReaderIntent | null; cardIds: string[] };
  reason: string;
  matchLines: { topic: string | null; cards: string };
  openers: [string, string];
  scores: Record<string, number>;
};

/** Deck → reader default. Kept only as a tie-breaker (it used to be the whole rule). */
export const TAROT_GUIDE_DECK_DEFAULTS: Record<string, string> = {
  "moon-garden": "inner-child-healer",
  "rose-mirror": "the-love-oracle",
  "golden-thread": "the-clear-strategist",
  "star-seeker": "the-star-weaver",
  "stellar-mosaic": "the-clear-strategist",
  "astral-pop-atelier": "the-shadow-mirror"
};

export const LOW_CONFIDENCE = 0.46;
const TOPIC_WEIGHT = 3;
const KEYWORD_WEIGHT = 2;
const KEYWORD_CAP = 4;
const DECK_TIE_BREAK = 0.25;

// How strongly a persona theme serves each intent.
const intentThemes: Record<ReaderIntent, Record<string, number>> = {
  love: { love: 2, relationships: 1.5, self_worth: 0.5, boundaries: 0.3 },
  career: { career: 2, strategy: 1, growth: 0.5, decision: 0.5 },
  decision: { decision: 2, strategy: 1, career: 0.3 },
  healing: { inner_child: 2, self_care: 1, emotional_clarity: 1, boundaries: 0.5 },
  shadow: { shadow_work: 1.5, identity: 1, emotion: 0.5 },
  dreams: { dreams: 2, identity: 0.5, genz: 0.5 },
  self: { self_reflection: 1, identity: 0.5, emotional_clarity: 0.5, intuition: 0.5 },
  depth: { intuition: 1.5, mood: 0.5, self_reflection: 0.5 }
};

const chosenTopicSignal: Record<string, Partial<Record<ReaderIntent, number>>> = {
  love: { love: TOPIC_WEIGHT },
  career: { career: TOPIC_WEIGHT },
  decision: { decision: TOPIC_WEIGHT },
  self: { self: 2, healing: 0.5, shadow: 0.5 },
  open: {}
};

/**
 * Keyword lists. `plain` entries are matched on the text without diacritics (so "nguoi cu" and "người cũ" both count);
 * `accented` entries only on the accented text, for words whose bare form is ambiguous ("giận" vs "gian" in "thời gian").
 */
const keywordLists: Record<Exclude<ReaderIntent, "self" | "depth">, { plain: string[]; accented: string[] }> = {
  love: {
    plain: [
      "nguoi cu", "nguoi yeu", "ny cu", "crush", "chia tay", "to tinh", "map mo", "nguoi ay", "anh ay", "co ay",
      "hen ho", "tinh cam", "tinh yeu", "quay lai voi", "nhan lai", "vo minh", "vo toi", "chong minh", "chong toi",
      "ban trai", "ban gai", "ket hon", "thich minh", "yeu minh", "yeu lai", "that long",
      "ex", "boyfriend", "girlfriend", "partner", "breakup", "break up", "husband", "wife", "dating", "relationship",
      "in love", "love", "marry", "marriage", "situationship"
    ],
    accented: ["vợ", "chồng", "yêu", "người thương", "cưới"]
  },
  career: {
    plain: [
      "sep", "dong nghiep", "doi viec", "nghi viec", "chuyen viec", "xin viec", "tang luong", "luong", "phong van",
      "kinh doanh", "cong viec", "cong ty", "du an", "thang chuc", "chuyen nhom", "khach hang", "khoi nghiep", "su nghiep",
      "boss", "coworker", "colleague", "career", "job", "salary", "raise", "interview", "quit", "business", "promotion",
      "work", "manager", "startup"
    ],
    accented: ["việc làm"]
  },
  healing: {
    plain: [
      "ton thuong", "ba me", "bo me", "cha me", "hoi nho", "tu ti", "kiet suc", "chua lanh", "co don", "bi bo roi",
      "lo au", "met moi", "tram cam", "khoc", "gia dinh", "anh chi em", "tu trach", "buong bo",
      "hurt", "trauma", "parents", "childhood", "burnout", "burned out", "exhausted", "insecure", "heal", "healing",
      "lonely", "anxious", "family"
    ],
    accented: []
  },
  decision: {
    plain: [
      "nen hay khong", "co nen", "nen khong", "chon", "lua chon", "quyet dinh", "hay la", "phan van", "nen lam gi",
      "should i", "decide", "decision", "choose", "choice", "or not", "which one"
    ],
    accented: []
  },
  shadow: {
    plain: [
      "ghen ti", "ghen", "doi ky", "so sanh", "toi la ai", "minh la ai", "ban than that", "phan toi", "xau ho",
      "jealous", "envy", "angry", "anger", "who am i", "identity", "shame", "compare"
    ],
    accented: ["giận"]
  },
  dreams: {
    plain: ["uoc mo", "giac mo", "hy vong", "tuong lai", "dream", "dreams", "hope", "future"],
    accented: []
  }
};

export function foldVietnamese(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

function wordPad(text: string) {
  return ` ${text.replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
}

/** Keyword hits per intent in a question (each intent capped so one long rant cannot drown the chosen topic). */
export function detectQuestionIntents(question: string): Partial<Record<ReaderIntent, number>> {
  const accented = wordPad(question.toLowerCase().normalize("NFC"));
  const plain = wordPad(foldVietnamese(question));
  const hits: Partial<Record<ReaderIntent, number>> = {};
  for (const [intent, list] of Object.entries(keywordLists) as Array<[ReaderIntent, { plain: string[]; accented: string[] }]>) {
    let count = 0;
    for (const word of list.plain) if (plain.includes(` ${word} `)) count += 1;
    for (const word of list.accented) if (accented.includes(` ${word} `)) count += 1;
    if (count) hits[intent] = Math.min(KEYWORD_CAP, count * KEYWORD_WEIGHT);
  }
  return hits;
}

function cardSignals(cards: ReaderCardInput[]): Partial<Record<ReaderIntent, number>> {
  const total = cards.length || 1;
  const cups = cards.filter((card) => card.suit === "cups").length;
  const swords = cards.filter((card) => card.suit === "swords").length;
  const earthy = cards.filter((card) => card.suit === "pentacles" || card.suit === "wands").length;
  const majors = cards.filter((card) => card.arcana === "major").length;
  const signals: Partial<Record<ReaderIntent, number>> = {};
  if (cups >= 2 || (cups >= 1 && cups / total >= 0.5)) { signals.love = 0.5; signals.healing = 0.5; }
  if (swords >= 2 || (swords >= 1 && swords / total >= 0.5)) signals.decision = 0.8;
  if (earthy >= 2) signals.career = 0.4;
  if (majors >= 2 || (majors >= 1 && majors / total >= 0.5)) signals.depth = 0.8;
  return signals;
}

function normalizedThemes(themes: string[]) {
  return [...new Set(themes.map((theme) => theme.toLowerCase().replace(/-/g, "_")))];
}

export function guideAffinity(themes: string[], intent: ReaderIntent): number {
  const weights = intentThemes[intent];
  return normalizedThemes(themes).reduce((sum, theme) => sum + (weights[theme] ?? 0), 0);
}

/** The intent a reader serves best (its "domain"), used by the mismatch nudge. */
export function guideDomain(themes: string[]): ReaderIntent {
  const order: ReaderIntent[] = ["love", "career", "healing", "shadow", "dreams", "decision", "depth", "self"];
  return order.reduce((best, intent) => (guideAffinity(themes, intent) > guideAffinity(themes, best) ? intent : best), order[0]);
}

/** True when the picked reader does not serve the detected topic (and another reader would). */
export function isReaderMismatch(themes: string[], topic: ReaderIntent | null): boolean {
  if (!topic || topic === "self" || topic === "depth") return false;
  return guideAffinity(themes, topic) < 1;
}

const topicLabels: Record<ReaderIntent, { vi: string; en: string; chipVi: string; chipEn: string }> = {
  love: { vi: "tình cảm", en: "love and relationships", chipVi: "Tình cảm", chipEn: "Love" },
  career: { vi: "công việc", en: "work", chipVi: "Công việc", chipEn: "Work" },
  decision: { vi: "một lựa chọn cần quyết", en: "a choice to make", chipVi: "Quyết định", chipEn: "Decision" },
  healing: { vi: "chữa lành cảm xúc", en: "emotional healing", chipVi: "Chữa lành", chipEn: "Healing" },
  shadow: { vi: "cảm xúc khó gọi tên và bản sắc", en: "hard feelings and identity", chipVi: "Cảm xúc sâu", chipEn: "Inner feelings" },
  dreams: { vi: "ước mơ và hy vọng", en: "dreams and hope", chipVi: "Ước mơ", chipEn: "Dreams" },
  self: { vi: "chính bạn", en: "yourself", chipVi: "Bản thân", chipEn: "Yourself" },
  depth: { vi: "chiều sâu bên trong", en: "inner depth", chipVi: "Chiều sâu", chipEn: "Depth" }
};

export function readerTopicPhrase(topic: ReaderIntent, language: Language) {
  return language === "en" ? topicLabels[topic].en : topicLabels[topic].vi;
}

export function readerTopicChip(topic: ReaderIntent, language: Language) {
  return language === "en" ? topicLabels[topic].chipEn : topicLabels[topic].chipVi;
}

// What each reader usually leads (mismatch nudge) and the "if you want…" line for alternatives.
const guideDomainCopy: Record<string, { domainVi: string; domainEn: string; ifVi: string; ifEn: string }> = {
  "the-love-oracle": { domainVi: "tình cảm và ranh giới", domainEn: "love and boundaries", ifVi: "Nếu bạn muốn nhìn kỹ cảm xúc giữa hai người và nói điều thật một cách dịu dàng.", ifEn: "If you want to look closely at what passes between two people and say the true thing gently." },
  "the-clear-strategist": { domainVi: "công việc và quyết định", domainEn: "work and decisions", ifVi: "Nếu bạn muốn sắp xếp lựa chọn rõ ràng và tìm một bước tiếp theo cụ thể.", ifEn: "If you want to lay out the options clearly and find one concrete next step." },
  "inner-child-healer": { domainVi: "chữa lành và những cảm xúc mong manh", domainEn: "healing and tender feelings", ifVi: "Nếu bạn muốn được nâng đỡ trước, rồi mới tính chuyện làm gì.", ifEn: "If you want to feel supported first, before deciding what to do." },
  "the-shadow-mirror": { domainVi: "phần bóng tối và bản sắc", domainEn: "the shadow side and identity", ifVi: "Nếu bạn muốn soi phần mình đang né tránh trong chuyện này.", ifEn: "If you want to see the part of this you may be avoiding." },
  "the-star-weaver": { domainVi: "ước mơ, hy vọng và trực giác hình ảnh", domainEn: "dreams, hope and imagery", ifVi: "Nếu bạn muốn nhìn chuyện này qua hình ảnh và một chút hy vọng.", ifEn: "If you want to see this through imagery and a little hope." },
  "the-mystic": { domainVi: "biểu tượng và trực giác", domainEn: "symbols and intuition", ifVi: "Nếu bạn muốn đọc sâu biểu tượng của từng lá và lắng nghe trực giác.", ifEn: "If you want to read deeper into each card's symbols and listen to intuition." }
};

export function readerDomainPhrase(slug: string, themes: string[], language: Language) {
  const copy = guideDomainCopy[slug];
  if (copy) return language === "en" ? copy.domainEn : copy.domainVi;
  return readerTopicPhrase(guideDomain(themes), language);
}

function alternativeReason(slug: string, themes: string[], language: Language) {
  const copy = guideDomainCopy[slug];
  if (copy) return language === "en" ? copy.ifEn : copy.ifVi;
  const phrase = readerTopicPhrase(guideDomain(themes), language);
  return language === "en" ? `If you want to look at this through ${phrase}.` : `Nếu bạn muốn nhìn chuyện này qua góc ${phrase}.`;
}

function cardDisplayName(card: ReaderCardInput, language: Language) {
  return card.name ? cardInline(card.name, language) : card.cardId;
}

// The 1–2 drawn cards that best support the topic: Cups for feelings, Swords/Pentacles/Wands for choices and work, Majors for depth.
function supportingCards(cards: ReaderCardInput[], topic: ReaderIntent | null): ReaderCardInput[] {
  const prefer: Record<ReaderIntent, (card: ReaderCardInput) => boolean> = {
    love: (card) => card.suit === "cups",
    healing: (card) => card.suit === "cups",
    decision: (card) => card.suit === "swords",
    career: (card) => card.suit === "pentacles" || card.suit === "wands" || card.suit === "swords",
    shadow: (card) => card.arcana === "major" || card.orientation === "reversed",
    dreams: (card) => card.arcana === "major",
    depth: (card) => card.arcana === "major",
    self: (card) => card.arcana === "major"
  };
  const matching = topic ? cards.filter(prefer[topic]) : [];
  const picked = [...matching, ...cards.filter((card) => !matching.includes(card))];
  return picked.slice(0, Math.min(2, picked.length));
}

function joinNames(names: string[], language: Language) {
  if (names.length < 2) return names[0] ?? "";
  return `${names[0]} ${language === "en" ? "and" : "và"} ${names[1]}`;
}

function guideName(guide: ReaderGuideInput | undefined, language: Language) {
  if (!guide) return "";
  return (language === "en" ? guide.name?.en ?? guide.name?.vi : guide.name?.vi ?? guide.name?.en) ?? guide.slug;
}

const openerTemplates: Record<ReaderIntent, { vi: [string, string]; en: [string, string] }> = {
  love: {
    vi: ["Điều mình thật sự mong ở mối quan hệ này là gì?", "Lá {card} đang nói gì về cách mình thương một người?"],
    en: ["What do I truly hope for in this relationship?", "What is {card} saying about the way I love?"]
  },
  career: {
    vi: ["Bước nhỏ nào mình làm được trong tuần này cho công việc?", "Lá {card} gợi ý mình cân nhắc điều gì trước khi quyết?"],
    en: ["What small step can I take for my work this week?", "What does {card} ask me to weigh before I decide?"]
  },
  decision: {
    vi: ["Mình đang sợ mất điều gì nếu chọn sai?", "Lá {card} nghiêng về hướng nào cho lựa chọn này?"],
    en: ["What am I afraid to lose if I choose wrong?", "Which way does {card} lean for this choice?"]
  },
  healing: {
    vi: ["Phần nào trong mình đang cần được nâng đỡ lúc này?", "Lá {card} chạm vào điều gì mình còn mang theo?"],
    en: ["Which part of me needs support right now?", "What is {card} touching that I still carry?"]
  },
  shadow: {
    vi: ["Cảm xúc này đang che điều gì mình chưa muốn nhìn?", "Lá {card} soi ra phần nào của mình?"],
    en: ["What might this feeling be covering that I avoid looking at?", "Which part of me does {card} bring to light?"]
  },
  dreams: {
    vi: ["Điều mình hy vọng nhất trong chuyện này là gì?", "Lá {card} vẽ ra hình ảnh nào cho mình?"],
    en: ["What do I hope for most in this?", "What picture does {card} draw for me?"]
  },
  self: {
    vi: ["Trải bài này muốn mình chú ý điều gì nhất?", "Lá {card} liên quan thế nào tới câu hỏi của mình?"],
    en: ["What does this spread most want me to notice?", "How does {card} relate to my question?"]
  },
  depth: {
    vi: ["Trải bài này muốn mình chú ý điều gì nhất?", "Biểu tượng nào trong lá {card} đáng để mình ngẫm?"],
    en: ["What does this spread most want me to notice?", "Which symbol in {card} is worth sitting with?"]
  }
};

/** The rule tier. Pure and deterministic: same input, same suggestion. */
export function suggestTarotReader(input: ReaderSuggestInput): ReaderSuggestion {
  const language: Language = input.language === "en" ? "en" : "vi";
  const guides = input.guides.filter((guide, index, list) => list.findIndex((item) => item.slug === guide.slug) === index);
  const topicSignal = chosenTopicSignal[input.topic] ?? {};
  const keywordSignal = detectQuestionIntents(input.question ?? "");
  const cardSignal = cardSignals(input.cards);

  const statedSignal: Partial<Record<ReaderIntent, number>> = { ...topicSignal };
  for (const [intent, value] of Object.entries(keywordSignal) as Array<[ReaderIntent, number]>) statedSignal[intent] = (statedSignal[intent] ?? 0) + value;
  const signal: Partial<Record<ReaderIntent, number>> = { ...statedSignal };
  for (const [intent, value] of Object.entries(cardSignal) as Array<[ReaderIntent, number]>) signal[intent] = (signal[intent] ?? 0) + value;

  const deckDefault = TAROT_GUIDE_DECK_DEFAULTS[input.deckId];
  const scores: Record<string, number> = {};
  for (const guide of guides) {
    let score = 0;
    for (const [intent, value] of Object.entries(signal) as Array<[ReaderIntent, number]>) score += value * guideAffinity(guide.themes, intent);
    if (guide.slug === deckDefault) score += DECK_TIE_BREAK;
    scores[guide.slug] = Math.round(score * 1000) / 1000;
  }
  const ranked = [...guides].sort((a, b) => (scores[b.slug] - scores[a.slug])
    || (a.slug === deckDefault ? -1 : b.slug === deckDefault ? 1 : 0)
    || (a.slug === "the-mystic" ? -1 : b.slug === "the-mystic" ? 1 : 0)
    || a.slug.localeCompare(b.slug));
  const forced = input.forcePrimary && ranked.find((guide) => guide.slug === input.forcePrimary);
  const ordered = forced ? [forced, ...ranked.filter((guide) => guide !== forced)] : ranked;

  const statedEntries = (Object.entries(statedSignal) as Array<[ReaderIntent, number]>).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
  const hasSignal = statedEntries.some(([intent]) => intent !== "self") || Boolean(Object.keys(keywordSignal).length);
  const matchedTopic = statedEntries[0]?.[0] ?? null;
  const secondaryIntent = (Object.entries(keywordSignal) as Array<[ReaderIntent, number]>)
    .filter(([intent]) => intent !== matchedTopic)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const top = scores[ranked[0]?.slug] ?? 0;
  const second = scores[ranked[1]?.slug] ?? 0;
  const gap = Math.max(0, top - second);
  const strength = Math.min(1, gap / 4);
  const confidence = Math.round((hasSignal ? 0.3 + 0.65 * strength : 0.3 * strength) * 100) / 100;
  const lowConfidence = !hasSignal || gap < 1;

  const primaryGuide = ordered[0];
  const cardTopic = matchedTopic ?? ((Object.entries(cardSignal) as Array<[ReaderIntent, number]>).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null);
  const support = supportingCards(input.cards, cardTopic);
  const cardNames = support.map((card) => cardDisplayName(card, language));
  const cardsText = joinNames(cardNames, language);
  const name = guideName(primaryGuide, language);
  const reasonKey: ReaderReasonKey = matchedTopic ? "topic_and_cards" : support.length ? "cards_only" : "deck_default";
  let reason: string;
  if (reasonKey === "topic_and_cards" && matchedTopic) {
    const phrase = readerTopicPhrase(matchedTopic, language);
    reason = language === "en"
      ? `You are asking about ${phrase}, and ${cardsText} in your spread ${support.length > 1 ? "point" : "points"} the same way. ${name} is a good fit to go on from here.`
      : `Bạn đang hỏi về ${phrase}, và ${cardsText} trong trải bài cũng chạm đúng chỗ đó. ${name} hợp để cùng bạn đi tiếp từ đây.`;
  } else if (reasonKey === "cards_only") {
    reason = language === "en"
      ? `Your question leaves the topic open, so Nilaza looked at ${cardsText} in your spread. ${name} reads ${readerDomainPhrase(primaryGuide?.slug ?? "", primaryGuide?.themes ?? [], language)} well.`
      : `Câu hỏi để ngỏ chủ đề, nên Nilaza dựa vào ${cardsText} trong trải bài. ${name} quen dẫn chuyện ${readerDomainPhrase(primaryGuide?.slug ?? "", primaryGuide?.themes ?? [], language)}.`;
  } else {
    reason = language === "en" ? `${name} suits this deck. You can change the reader at any time.` : `${name} hợp với bộ bài này. Bạn có thể đổi người dẫn bất cứ lúc nào.`;
  }

  const openerTopic: ReaderIntent = matchedTopic ?? cardTopic ?? "self";
  const leadCard = cardNames[0] ?? (language === "en" ? "this card" : "này");
  const templates = openerTemplates[openerTopic][language];
  const openers: [string, string] = [templates[0], templates[1].replace("{card}", leadCard)];

  return {
    primary: primaryGuide?.slug ?? "the-mystic",
    alternatives: ordered.slice(1, 3).map((guide) => ({ slug: guide.slug, reason: alternativeReason(guide.slug, guide.themes, language) })),
    confidence,
    lowConfidence: forced ? false : lowConfidence,
    matchedTopic,
    secondaryIntent,
    reasonKey,
    reasonParams: { topic: matchedTopic, cardIds: support.map((card) => card.cardId) },
    reason,
    matchLines: {
      topic: matchedTopic ? readerTopicChip(matchedTopic, language) : null,
      cards: cardsText
    },
    openers,
    scores
  };
}
