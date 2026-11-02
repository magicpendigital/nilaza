import { cardInline, cardSubtitle, cardTitle } from "../cardName";

const sixOfSwords = { vi: "Sáu Kiếm", en: "Six of Swords" };

test("the original name is the title and the Vietnamese name is the subtitle (Owner decision 2026-11-02)", () => {
  expect(cardTitle(sixOfSwords)).toBe("Six of Swords");
  expect(cardSubtitle(sixOfSwords, "vi")).toBe("Sáu Kiếm");
  expect(cardInline(sixOfSwords, "vi")).toBe("Six of Swords (Sáu Kiếm)");
});

test("English shows only the original name, and a name without a translation is not repeated", () => {
  expect(cardSubtitle(sixOfSwords, "en")).toBe("");
  expect(cardInline(sixOfSwords, "en")).toBe("Six of Swords");
  expect(cardInline({ vi: "The Fool", en: "The Fool" }, "vi")).toBe("The Fool");
});
