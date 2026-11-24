import archetypes from "../../../../../../packages/content/data/personas-archetypes.json";
import cardData from "../../../../../../packages/content/data/tarot-cards.json";
import {
  detectQuestionIntents,
  foldVietnamese,
  guideDomain,
  isReaderMismatch,
  suggestTarotReader,
  TAROT_GUIDE_DECK_DEFAULTS,
  type ReaderCardInput,
  type ReaderSuggestInput
} from "../readerSuggest";

const TAROT_SLUGS = ["the-mystic", "inner-child-healer", "the-love-oracle", "the-shadow-mirror", "the-clear-strategist", "the-star-weaver"];
const guides = (archetypes as Array<{ slug: string; themes: string[]; name: { vi: string; en: string } }>)
  .filter((persona) => TAROT_SLUGS.includes(persona.slug))
  .map((persona) => ({ slug: persona.slug, themes: persona.themes, name: persona.name }));
const allCards = (Array.isArray(cardData) ? cardData : (cardData as { cards: unknown[] }).cards) as Array<{ id: string; arcana: "major" | "minor"; suit: ReaderCardInput["suit"]; name: { vi: string; en: string } }>;

function card(id: string, reversed = false, positionKey = "card"): ReaderCardInput {
  const found = allCards.find((item) => item.id === id);
  if (!found) throw new Error(`unknown card ${id}`);
  return { cardId: id, orientation: reversed ? "reversed" : "upright", positionKey, suit: found.suit, arcana: found.arcana, name: found.name };
}

const neutralCards = [card("minor-wands-three"), card("minor-pentacles-four"), card("minor-wands-seven")];

function suggest(partial: Partial<ReaderSuggestInput>) {
  return suggestTarotReader({ topic: "open", question: "", cards: neutralCards, deckId: "moon-garden", guides, language: "vi", ...partial });
}

describe("suggestTarotReader: Owner failure cases", () => {
  it("a work question on Moon Garden no longer suggests Inner Child Healer", () => {
    const result = suggest({ topic: "career", question: "Sếp mới hay soi, mình có nên xin chuyển nhóm?", deckId: "moon-garden" });
    expect(TAROT_GUIDE_DECK_DEFAULTS["moon-garden"]).toBe("inner-child-healer");
    expect(result.primary).toBe("the-clear-strategist");
    expect(result.matchedTopic).toBe("career");
    expect(result.alternatives.map((alt) => alt.slug)).not.toContain("the-clear-strategist");
  });

  it("a love question on Golden Thread no longer suggests Clear Strategist", () => {
    const result = suggest({ topic: "love", question: "Người ấy có thật lòng với mình không?", deckId: "golden-thread" });
    expect(TAROT_GUIDE_DECK_DEFAULTS["golden-thread"]).toBe("the-clear-strategist");
    expect(result.primary).toBe("the-love-oracle");
    expect(result.matchedTopic).toBe("love");
  });
});

describe("suggestTarotReader: question keywords", () => {
  it.each([
    ["Mình có nên nhắn lại cho người cũ không?", "the-love-oracle"],
    ["Mối quan hệ mập mờ này sẽ đi về đâu?", "the-love-oracle"],
    ["Mình có nên tỏ tình với crush không?", "the-love-oracle"],
    ["Vợ chồng mình cãi nhau suốt", "the-love-oracle"],
    ["Tháng này mình có nên đòi tăng lương?", "the-clear-strategist"],
    ["Mình có nên nghỉ việc để kinh doanh riêng?", "the-clear-strategist"],
    ["Ngày mai phỏng vấn, mình cần chuẩn bị tâm thế gì?", "the-clear-strategist"],
    ["Mình đang kiệt sức, cần thay đổi điều gì?", "inner-child-healer"],
    ["Ba mẹ không hiểu mình từ hồi nhỏ", "inner-child-healer"],
    ["Sao mình hay tự ti và dễ tổn thương?", "inner-child-healer"],
    ["Vì sao mình hay ghen tị với bạn bè?", "the-shadow-mirror"],
    ["Rốt cuộc tôi là ai?", "the-shadow-mirror"]
  ])("open topic: %s → %s", (question, expected) => {
    expect(suggest({ question }).primary).toBe(expected);
  });

  it("Vietnamese without diacritics works the same", () => {
    expect(suggest({ question: "minh co nen nhan lai cho nguoi cu khong" }).primary).toBe("the-love-oracle");
    expect(suggest({ question: "sep moi hay soi, co nen doi viec" }).primary).toBe("the-clear-strategist");
    expect(suggest({ question: "minh dang kiet suc va tu ti" }).primary).toBe("inner-child-healer");
  });

  it("English questions work", () => {
    expect(suggest({ question: "Should I text my ex?", language: "en" }).primary).toBe("the-love-oracle");
    expect(suggest({ question: "My boss ignores me, should I quit my job?", language: "en" }).primary).toBe("the-clear-strategist");
    expect(suggest({ question: "I feel burned out and lonely", language: "en" }).primary).toBe("inner-child-healer");
  });

  it("does not read 'thời gian' as anger or 'cuối tuần' as marriage", () => {
    const hits = detectQuestionIntents("Cuối tuần này mình có thời gian rảnh");
    expect(hits.shadow).toBeUndefined();
    expect(hits.love).toBeUndefined();
  });

  it("folds Vietnamese diacritics and đ", () => {
    expect(foldVietnamese("Đổi việc, người cũ")).toBe("doi viec, nguoi cu");
  });
});

describe("suggestTarotReader: weights", () => {
  it("the chosen topic outweighs a single stray keyword", () => {
    const result = suggest({ topic: "career", question: "Mình muốn hiểu crush nghĩ gì về dự án chung" });
    expect(result.primary).toBe("the-clear-strategist");
  });

  it("a decision topic suggests Clear Strategist", () => {
    expect(suggest({ topic: "decision", question: "Nên chọn A hay B?" }).primary).toBe("the-clear-strategist");
  });

  it("many Cups lean an open question toward feelings", () => {
    const cups = [card("minor-cups-two"), card("minor-cups-three"), card("minor-cups-ace")];
    const result = suggest({ cards: cups, deckId: "golden-thread" });
    expect(["the-love-oracle", "inner-child-healer"]).toContain(result.primary);
  });

  it("many Swords lean an open question toward a decision", () => {
    const swords = [card("minor-swords-two"), card("minor-swords-three"), card("minor-swords-ace")];
    expect(suggest({ cards: swords, deckId: "moon-garden" }).primary).toBe("the-clear-strategist");
  });

  it("many Majors lean an open question toward The Mystic", () => {
    const majors = [card("major-00-fool"), card("major-01-magician"), card("major-02-high-priestess")];
    expect(suggest({ cards: majors, deckId: "golden-thread" }).primary).toBe("the-mystic");
  });

  it("the deck only breaks ties: no signal keeps the deck reader", () => {
    const mixed = [card("minor-wands-three"), card("minor-cups-four"), card("minor-swords-four")];
    expect(suggest({ deckId: "rose-mirror", cards: mixed }).primary).toBe("the-love-oracle");
    expect(suggest({ deckId: "astral-pop-atelier", cards: mixed }).primary).toBe("the-shadow-mirror");
  });

  it("is deterministic", () => {
    const input = { topic: "love", question: "người yêu cũ quay lại", deckId: "star-seeker" };
    expect(suggest(input)).toEqual(suggest(input));
  });
});

describe("suggestTarotReader: confidence", () => {
  it("is low with no topic, keyword or card signal", () => {
    const result = suggest({ cards: [card("minor-wands-three"), card("minor-cups-four"), card("minor-swords-four")] });
    expect(result.lowConfidence).toBe(true);
    expect(result.confidence).toBeLessThan(0.46);
    expect(result.matchedTopic).toBeNull();
  });

  it("is high when topic and words agree", () => {
    const result = suggest({ topic: "love", question: "chia tay người yêu cũ" });
    expect(result.lowConfidence).toBe(false);
    expect(result.confidence).toBeGreaterThan(0.6);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("forcePrimary (the AI tier) leads and the rule order keeps the alternatives", () => {
    const result = suggest({ topic: "career", question: "đổi việc", forcePrimary: "the-star-weaver" });
    expect(result.primary).toBe("the-star-weaver");
    expect(result.alternatives[0].slug).toBe("the-clear-strategist");
    expect(result.lowConfidence).toBe(false);
  });

  it("ignores a forced slug outside the candidates", () => {
    expect(suggest({ topic: "career", forcePrimary: "not-a-reader" }).primary).toBe("the-clear-strategist");
  });
});

describe("suggestTarotReader: output copy", () => {
  it("names the question topic and 1–2 drawn cards with Vietnamese names", () => {
    const cards = [card("minor-cups-two", false, "you"), card("major-16-tower", true, "them"), card("minor-wands-three")];
    const result = suggest({ topic: "love", question: "Người ấy có thật lòng không?", cards });
    expect(result.reason).toContain("tình cảm");
    expect(result.reason).toContain("Two of Cups (Hai Cốc)");
    expect(result.reasonKey).toBe("topic_and_cards");
    expect(result.reasonParams.cardIds[0]).toBe("minor-cups-two");
    expect(result.matchLines.topic).toBe("Tình cảm");
    expect(result.matchLines.cards).toContain("Hai Cốc");
  });

  it("gives two openers, two alternatives with 'Nếu bạn muốn' and no duplicates", () => {
    const result = suggest({ topic: "career", question: "lương thấp" });
    expect(result.openers).toHaveLength(2);
    expect(result.openers[1]).toMatch(/^Lá /);
    expect(result.alternatives).toHaveLength(2);
    for (const alt of result.alternatives) expect(alt.reason).toMatch(/^Nếu bạn muốn/);
    expect(new Set([result.primary, ...result.alternatives.map((alt) => alt.slug)]).size).toBe(3);
  });

  it("speaks English", () => {
    const result = suggest({ topic: "love", question: "my ex", language: "en", cards: [card("minor-cups-two")] });
    expect(result.reason).toMatch(/^You are asking about love/);
    expect(result.reason).toContain("Two of Cups");
    expect(result.reason).not.toContain("Hai Cốc");
    expect(result.alternatives[0].reason).toMatch(/^If you want/);
  });

  it("detects a secondary decision intent inside a love question", () => {
    const result = suggest({ topic: "love", question: "Có nên quay lại với người cũ không?" });
    expect(result.matchedTopic).toBe("love");
    expect(result.secondaryIntent).toBe("decision");
  });
});

describe("mismatch helpers", () => {
  const themesOf = (slug: string) => guides.find((guide) => guide.slug === slug)!.themes;

  it("each reader has the expected domain", () => {
    expect(guideDomain(themesOf("the-love-oracle"))).toBe("love");
    expect(guideDomain(themesOf("the-clear-strategist"))).toBe("career");
    expect(guideDomain(themesOf("inner-child-healer"))).toBe("healing");
  });

  it("flags Clear Strategist for a love question and not Love Oracle", () => {
    expect(isReaderMismatch(themesOf("the-clear-strategist"), "love")).toBe(true);
    expect(isReaderMismatch(themesOf("the-love-oracle"), "love")).toBe(false);
    expect(isReaderMismatch(themesOf("inner-child-healer"), "career")).toBe(true);
    expect(isReaderMismatch(themesOf("the-mystic"), null)).toBe(false);
  });
});
