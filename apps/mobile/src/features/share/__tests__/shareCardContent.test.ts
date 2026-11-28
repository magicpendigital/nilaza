import { big3Model, bookQuoteModel, dailySkyModel, numerologyModel, readingModel, singleSunSign, todayCardModel } from "../shareCardContent";

it("builds the daily-sky card from the public sky only", () => {
  const model = dailySkyModel({ language: "vi", moonSign: "taurus", phaseName: "Trăng tròn", headline: "Một ngày để chậm lại. " + "x".repeat(300) });
  expect(model.surface).toBe("daily_sky");
  expect(model.eyebrow).toBe("Bầu trời hôm nay");
  expect(model.title).toBe("Trăng ở Kim Ngưu");
  expect(model.rows).toEqual([{ glyph: "☽", label: "Pha trăng", value: "Trăng tròn" }]);
  expect(model.message.length).toBeLessThanOrEqual(150);
  expect(model.images).toEqual([]);
  expect(model.signName).toBeUndefined();
  expect(model.cardNames).toBeUndefined();
  expect(dailySkyModel({ language: "en", moonSign: "leo", phaseName: "", headline: "A slow day." }).title).toBe("Moon in Leo");
});

const image = { uri: "card" };
const everyText = (model: ReturnType<typeof todayCardModel>) =>
  JSON.stringify([model.eyebrow, model.title, model.lines, model.rows, model.message, model.note, model.footer]);

it("builds the today card from the card name and the first sentence of its public meaning", () => {
  const model = todayCardModel({ language: "vi", cardName: "Ngôi Sao", meaning: "Hy vọng quay lại nhẹ nhàng. Hãy đi chậm và quan sát điều đang thay đổi.", image });
  expect(model.surface).toBe("today_card");
  expect(model.title).toBe("Ngôi Sao");
  expect(model.message).toBe("Hy vọng quay lại nhẹ nhàng.");
  expect(model.footer).toBe("nilaza.magicpendigital.com");
  expect(model.images).toHaveLength(1);
});

it("clips a very long meaning instead of printing it all", () => {
  const model = todayCardModel({ language: "en", cardName: "The Star", meaning: "word ".repeat(200), image });
  expect(model.message.length).toBeLessThanOrEqual(150);
});

it("prints card names and positions for a reading and marks reversed cards", () => {
  const model = readingModel({
    language: "en",
    cards: [
      { position: "Past", name: "The Fool", reversed: false, image },
      { position: "Present", name: "The Star", reversed: true, image }
    ],
    summary: "A gentle shift is possible when you slow down. More follows.",
    question: "Should I quit my job at Acme?"
  });
  expect(model.lines).toEqual(["Past · The Fool", "Present · The Star · Reversed"]);
  expect(model.images.map((item) => item.reversed)).toEqual([false, true]);
  expect(model.message).toBe("A gentle shift is possible when you slow down.");
});

it("keeps all four cards of the largest spread and no more", () => {
  const card = (n: number) => ({ position: `P${n}`, name: `Card ${n}`, reversed: n % 2 === 0, image });
  const four = readingModel({ language: "en", cards: [1, 2, 3, 4].map(card), summary: "Hold steady." });
  expect(four.images).toHaveLength(4);
  expect(four.lines).toHaveLength(4);
  expect(four.title).toBe("4 cards");
  expect(four.cardNames).toEqual(["Card 1", "Card 2", "Card 3", "Card 4"]);
  const five = readingModel({ language: "vi", cards: [1, 2, 3, 4, 5].map(card), summary: "Hold steady." });
  expect(five.images).toHaveLength(4);
  expect(five.title).toBe("4 lá bài");
});

it("keeps the question, notes and mood out of the reading card even when the input carries them", () => {
  const privateInput = {
    language: "en" as const,
    cards: [{ position: "Now", name: "The Star", reversed: false, image }],
    summary: "Should I quit my job at Acme? The cards suggest waiting for a calmer week.",
    question: "Should I quit my job at Acme?",
    note: "my boss is called Linh",
    mood: "anxious",
    birthDate: "1994-03-02"
  };
  const model = readingModel(privateInput);
  const text = everyText(model);
  for (const secret of ["Acme", "Linh", "anxious", "1994"]) expect(text).not.toContain(secret);
  expect(model.message).toBe("");
});

it("shows only certain signs on the Big 3 card and never a birth detail", () => {
  const model = big3Model({ language: "en", sun: ["leo"], moon: ["cancer", "leo"], rising: "virgo", timeKnown: false, headline: "The warm-hearted creator" });
  expect(model.rows.map((row) => row.label)).toEqual(["Sun"]);
  expect(model.rows[0].value).toBe("Leo");
  expect(model.title).toBe("The warm-hearted creator");
});

it("adds Moon and Rising only when the birth time is exact and the Moon has one sign", () => {
  const model = big3Model({ language: "vi", sun: ["leo"], moon: ["cancer"], rising: "virgo", timeKnown: true });
  expect(model.rows.map((row) => row.label)).toEqual(["Mặt Trời", "Mặt Trăng", "Cung mọc"]);
  expect(model.title).toBe("Bầu trời của mình");
});

it("returns a Sun sign for links only when the chart gives exactly one", () => {
  expect(singleSunSign(["leo"])).toBe("leo");
  expect(singleSunSign(["leo", "virgo"])).toBeNull();
  expect(singleSunSign([])).toBeNull();
});

it("exposes only public names for the share message: card names for cards, one calculated Sun sign for charts", () => {
  const today = todayCardModel({ language: "vi", cardName: "Ngôi Sao", meaning: "Hy vọng.", image });
  expect(today.cardNames).toEqual(["Ngôi Sao"]);
  const reading = readingModel({
    language: "vi",
    cards: [
      { position: "Quá khứ", name: "Ngôi Sao", reversed: false, image },
      { position: "Hiện tại", name: "Mặt Trăng", reversed: true, image }
    ],
    summary: "Một bước nhỏ.",
    question: "Tôi có nên nghỉ việc không?"
  });
  expect(reading.cardNames).toEqual(["Ngôi Sao", "Mặt Trăng"]);
  expect(JSON.stringify(reading.cardNames)).not.toContain("nghỉ việc");
  expect(big3Model({ language: "en", sun: ["leo"], moon: [], timeKnown: false }).signName).toBe("Leo");
  expect(big3Model({ language: "en", sun: ["leo", "virgo"], moon: [], timeKnown: false }).signName).toBeUndefined();
});

test("the number-map card shows numbers only and keeps the reflection note", () => {
  const model = numerologyModel({ language: "vi", lifePath: "11/2", birthday: "6", expression: "8", lifePathTitle: "Người lắng nghe" });
  expect(model.surface).toBe("numerology_map");
  expect(model.rows.map((row) => row.value)).toEqual(["11/2", "6", "8"]);
  expect(model.title).toBe("Người lắng nghe");
  expect(model.note).toContain("không phải dự đoán");
  expect(model.cardNames).toBeUndefined();
  expect(model.signName).toBeUndefined();
  expect(numerologyModel({ language: "en", lifePath: "7", birthday: "3" }).rows).toHaveLength(2);
});

test("v2: each feature carries its own skin and invite line inside the shared frame", () => {
  const image = { uri: "card" };
  expect(todayCardModel({ language: "vi", cardName: "Ngôi Sao", meaning: "Hy vọng.", image })).toMatchObject({ skin: "tarot", invite: "Bạn rút thử xem lá của bạn là gì?" });
  expect(numerologyModel({ language: "vi", lifePath: "7", birthday: "3" })).toMatchObject({ skin: "numbers", invite: "Còn bạn là số mấy? Tính trong 10 giây" });
  expect(bookQuoteModel({ language: "vi", quote: "Câu.", source: "Đạo Đức Kinh · Chương 9", question: "Hỏi?" })).toMatchObject({ skin: "quote", invite: "Nhận một câu mỗi sáng từ kho tri thức cổ" });
  expect(readingModel({ language: "vi", cards: [], summary: "" }).skin).toBe("classic");
  expect(big3Model({ language: "vi", sun: [], moon: [], timeKnown: false }).skin).toBe("classic");
});

test("v2 Tarot skin: English name as title, Vietnamese small line, at most three keywords", () => {
  const model = todayCardModel({ language: "vi", cardName: "Ngôi Sao (The Star)", meaning: "Hy vọng.", image: { uri: "card" }, englishName: "The Star", localName: "Ngôi Sao", keywords: ["hy vọng", "chữa lành", "niềm tin", "thừa"] });
  expect(model.title).toBe("The Star");
  expect(model.subtitle).toBe("Ngôi Sao");
  expect(model.keywords).toEqual(["hy vọng", "chữa lành", "niềm tin"]);
  expect(model.cardNames).toEqual(["Ngôi Sao (The Star)"]);
  const english = todayCardModel({ language: "en", cardName: "The Star", meaning: "Hope.", image: { uri: "card" }, englishName: "The Star", localName: "Ngôi Sao" });
  expect(english.subtitle).toBeUndefined();
});

test("v2 Numbers skin: big number, lit root, approved light and question, number chips only", () => {
  const model = numerologyModel({ language: "vi", lifePath: "11/2", birthday: "6", expression: "8", lifePathTitle: "Người lắng nghe", lifePathRoot: 2, light: "Bạn nghe được điều người khác bỏ qua.", question: "Hôm nay bạn muốn lắng nghe ai?" });
  expect(model.numbers).toEqual({
    kindLabel: "Số chủ đạo",
    value: "11/2",
    root: 2,
    notes: [{ label: "Điểm sáng", text: "Bạn nghe được điều người khác bỏ qua." }, { label: "Câu hỏi", text: "Hôm nay bạn muốn lắng nghe ai?" }],
    chips: ["Ngày sinh · 6", "Biểu đạt · 8"]
  });
  expect(numerologyModel({ language: "en", lifePath: "7", birthday: "3", lifePathRoot: 22 }).numbers?.root).toBe(0);
  expect(JSON.stringify(model)).not.toMatch(/\d{1,2}\/\d{1,2}\/\d{4}|19\d\d|20\d\d/);
});

test("v2 Quote skin: only the approved quote, its source and its question", () => {
  const model = bookQuoteModel({ language: "en", quote: "x".repeat(400), source: "Tao Te Ching · Chapter 9", question: "When is enough?" });
  expect(model.surface).toBe("book_quote");
  expect(model.quote?.text.length).toBeLessThanOrEqual(320);
  expect(model.quote).toMatchObject({ source: "Tao Te Ching · Chapter 9", questionLabel: "A question for me", question: "When is enough?" });
  expect(model.images).toEqual([]);
});
