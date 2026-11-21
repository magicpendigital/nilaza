import { composeLocalTarotSummary, type LocalReadingCard } from "../localReading";

const card = (over: Partial<LocalReadingCard>): LocalReadingCard => ({
  name: { en: "Two of Cups", vi: "Hai Cốc" },
  arcana: "minor",
  suit: "cups",
  keywords: { vi: ["kết nối", "đồng điệu", "cân bằng"], en: ["connection", "attunement", "balance"] },
  reversed: false,
  spread: "Hiện tại",
  ...over
});

// Value report batch A (Owner 2026-11-21): the free reading reads this question, with no meta text about the AI.
describe("local Tarot summary", () => {
  it("opens with the question, names the dominant suit and walks each card by position", () => {
    const text = composeLocalTarotSummary(
      [card({ spread: "Điều đang có" }), card({ name: { en: "Six of Cups", vi: "Sáu Cốc" }, spread: "Điều cần chú ý" }), card({ suit: "swords", spread: "Bước nhỏ" })],
      "Mình có nên nhắn lại cho bạn ấy không?", "Tình yêu", "vi");
    expect(text.startsWith("Với câu hỏi “Mình có nên nhắn lại cho bạn ấy không?”,")).toBe(true);
    expect(text).toContain("nhiều lá Cups");
    expect(text).toContain("Ở vị trí Điều đang có, Two of Cups (Hai Cốc) nói về kết nối và đồng điệu.");
    expect(text).toContain("Ở vị trí Bước nhỏ");
    for (const banned of ["AI chưa hoàn tất", "giống nhau", "chưa có diễn giải", "diễn giải AI"]) expect(text).not.toContain(banned);
  });

  it("calls out major arcana, reversals and falls back to the topic", () => {
    const text = composeLocalTarotSummary(
      [card({ arcana: "major", suit: null, reversed: true }), card({ arcana: "major", suit: null, reversed: true }), card({})],
      "  ", "Công việc", "vi");
    expect(text.startsWith("Với chủ đề công việc,")).toBe(true);
    expect(text).toContain("Major Arcana");
    expect(text).toContain("Nhiều lá ngược");
    expect(text).toContain("ngược gợi rằng kết nối và đồng điệu đang bị chặn lại");
  });

  it("handles one card and English", () => {
    const one = composeLocalTarotSummary([card({ spread: "" })], "", "Self", "en");
    expect(one.startsWith("On self, the card you drew today")).toBe(true);
    expect(one).toContain("In the card 1 position, Two of Cups speaks of connection and attunement.");
    expect(one).not.toMatch(/AI/);
  });
});
