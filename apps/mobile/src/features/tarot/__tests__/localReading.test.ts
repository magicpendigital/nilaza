import cards from "../../../../../../packages/content/data/tarot-cards.json";
import layers from "../../../../../../packages/content/data/tarot-reading-layers.json";
import { composeLocalReading, deepReadingHook, readingTheme, type LocalReadingCard } from "../localReading";

type RawCard = (typeof cards)[number];
const byId = new Map((cards as RawCard[]).map((card) => [card.id, card]));
const draw = (id: string, reversed = false): LocalReadingCard => ({ ...(byId.get(id) as unknown as LocalReadingCard), reversed });

// Generic advice and disclaimers the Owner rejected on 21/11, plus certainty and healing claims.
const banned = ["AI chưa hoàn tất", "Lá không đọc được suy nghĩ", "không phải kết cục", "chắc chắn sẽ", "định mệnh", "chữa lành", "tiên tri", "will definitely", "destiny"];

// Value report batch B (Owner 2026-11-21, feedback the same day): every part of the free reading names the drawn cards.
describe("local Tarot reading (five layers)", () => {
  it("tells the story of the drawn cards by name and keyword, then the tension worth noticing", () => {
    const reading = composeLocalReading({
      cards: [draw("minor-cups-two"), draw("minor-swords-three", true), draw("minor-cups-six")],
      spread: "love-three", topic: "love", topicLabel: "Tình yêu",
      question: "Mình có nên nhắn lại cho bạn ấy không?", language: "vi"
    });
    expect(reading.summary.startsWith("Với câu hỏi “Mình có nên nhắn lại cho bạn ấy không?”, bạn đang mang vào mối quan hệ đáp lại (Hai Cốc)")).toBe(true);
    expect(reading.summary).toContain("đau lòng đang bị kìm lại (Ba Kiếm)");
    expect(reading.summary).toContain("Nhiều lá Cốc");
    expect(reading.summary).toContain("Điều đáng chú ý nhất: bạn mang đáp lại, còn phía người ấy hiện lên với đau lòng đang bị kìm lại.");
    expect(reading.sections).toEqual([{ key: "small_step", title: layers.stepTitle, body: layers.steps.love.cups }]);
    expect(reading.reflection).toBe(layers.journal.love.cups.vi);
    for (const word of banned) expect(reading.summary).not.toContain(word);
  });

  it("opens each card with its position voice on the card's own keywords", () => {
    const reading = composeLocalReading({
      cards: [draw("minor-wands-eight"), draw("major-16-tower", true), draw("minor-pentacles-four")],
      spread: "situation-challenge-advice", topic: "career", topicLabel: "Công việc", question: "", language: "vi"
    });
    expect(reading.cardInterpretations[1].vi.startsWith("Ma sát quanh sự thật bất ngờ và sụp đổ nằm ở bên trong bạn nhiều hơn bên ngoài.")).toBe(true);
    expect(reading.cardInterpretations[1].vi).toContain(layers.reversedTopics["major-16-tower"].career.vi);
    expect(reading.cardInterpretations[2].en.startsWith("A way worth trying: lean on holding resources and security.")).toBe(true);
    expect(reading.summary.startsWith("Với chủ đề công việc, bạn đang ở giữa chuyển động (Tám Gậy)")).toBe(true);
    for (const body of reading.cardInterpretations) for (const word of banned) expect(body.vi).not.toContain(word);
  });

  it("reads the other person's position through the card's portrait, not a text written to 'you'", () => {
    const reading = composeLocalReading({
      cards: [draw("major-00-fool", true), draw("major-01-magician", true), draw("minor-cups-two", true)],
      spread: "love-three", topic: "love", topicLabel: "Tình yêu", question: "", language: "vi"
    });
    expect(reading.cardInterpretations[0].vi).toContain(layers.reversedTopics["major-00-fool"].love.vi);
    expect(reading.cardInterpretations[1].vi).toContain(byId.get("major-01-magician")!.intro.vi.split("The Magician").join(byId.get("major-01-magician")!.name.vi));
    expect(reading.summary).toContain("Nhiều lá ngược");
    expect(reading.summary).toContain("Ẩn chính");
    expect(reading.cardInterpretations[1].vi).not.toContain("The Magician");
    expect(reading.cardInterpretations[1].vi).toContain(byId.get("major-01-magician")!.name.vi);
  });

  it("names element tension and repeated numbers, and handles one card in English", () => {
    const mixed = composeLocalReading({
      cards: [draw("minor-wands-three"), draw("minor-cups-three"), draw("minor-swords-five")],
      spread: "past-present-future", topic: "self", topicLabel: "Self", question: "", language: "en"
    });
    expect(mixed.summary).toContain("Fire and Water appear together");
    expect(mixed.summary).toContain("The number 3 repeats");
    expect(mixed.summary).toContain("from expansion (Three of Wands), through friendship (Three of Cups), toward conflict (Five of Swords)");

    const one = composeLocalReading({
      cards: [draw("major-17-star")], spread: "daily-one", topic: "open", topicLabel: "Open", question: "", language: "en"
    });
    expect(one.summary).toBe("On open, The Star brings today's theme of hope.");
    expect(one.cardInterpretations[0].en.startsWith("Today your card turns on hope and faith.")).toBe(true);
    expect(one.reflection).toBe(layers.journal.open.major.en);
  });

  it("gives Decision and Open questions their own small step and journal question", () => {
    const cardsDrawn = [draw("minor-swords-two"), draw("minor-swords-seven", true), draw("minor-cups-four")];
    const decision = composeLocalReading({ cards: cardsDrawn, spread: "past-present-future", topic: "decision", topicLabel: "Quyết định", question: "", language: "vi" });
    expect(decision.sections[0].body).toEqual(layers.steps.decision.swords);
    expect(decision.reflection).toBe(layers.journal.decision.swords.vi);
    const open = composeLocalReading({ cards: cardsDrawn, spread: "past-present-future", topic: "open", topicLabel: "Mở", question: "", language: "vi" });
    expect(open.sections[0].body).toEqual(layers.steps.open.swords);
    expect(open.reflection).toBe(layers.journal.open.swords.vi);
  });

  it("has a reversed meaning for every card and topic, without English names in Vietnamese", () => {
    for (const card of cards as RawCard[]) {
      for (const topic of ["love", "career", "self"] as const) {
        const reading = composeLocalReading({ cards: [draw(card.id, true)], spread: "daily-one", topic, topicLabel: topic, question: "", language: "vi" });
        expect(reading.cardInterpretations[0].vi).toContain(layers.reversedTopics[card.id as keyof typeof layers.reversedTopics][topic].vi);
        for (const word of banned) expect(reading.cardInterpretations[0].vi).not.toContain(word);
        expect(reading.cardInterpretations[0].vi).not.toContain(card.name.en);
      }
    }
  });

  it("names the two cards in the deep-reading invitation", () => {
    const hook = deepReadingHook([draw("minor-wands-eight"), draw("major-16-tower"), draw("minor-pentacles-four")], "situation-challenge-advice", "vi");
    expect(hook.startsWith("Giữa Tòa Tháp và Bốn Tiền")).toBe(true);
    expect(deepReadingHook([draw("major-17-star")], "daily-one", "vi")).toBe("");
  });

  it("picks the leading energy", () => {
    expect(readingTheme([draw("major-00-fool"), draw("minor-cups-two")])).toBe("major");
    expect(readingTheme([draw("minor-swords-two"), draw("minor-swords-three"), draw("minor-cups-two")])).toBe("swords");
    expect(readingTheme([draw("minor-wands-two"), draw("minor-cups-two"), draw("major-00-fool")])).toBe("wands");
  });
});
