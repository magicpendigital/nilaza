import { big3Model, readingModel, singleSunSign, todayCardModel } from "../shareCardContent";

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
