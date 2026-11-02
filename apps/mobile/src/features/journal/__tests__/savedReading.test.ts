import { savedReadingCards } from "../savedReading";

test("reads the synced snapshot shape with cardId, orientation and a localized position", () => {
  const snapshot = {
    type: "tarot_reading",
    spread: "three",
    cards: [
      { cardId: "minor-swords-six", spread: "three", orientation: "upright", positionLabel: { vi: "Quá khứ", en: "Past" } },
      { cardId: "major-13-death", spread: "three", orientation: "reversed", positionLabel: { vi: "Hiện tại", en: "Present" } }
    ]
  };
  expect(savedReadingCards(snapshot, "vi")).toEqual([
    { id: "minor-swords-six", reversed: false, position: "Quá khứ" },
    { id: "major-13-death", reversed: true, position: "Hiện tại" }
  ]);
  expect(savedReadingCards(snapshot, "en")[1].position).toBe("Present");
});

test("reads the drawn-card shape and skips unusable entries", () => {
  const snapshot = { type: "tarot_reading", cards: [{ id: "major-17-star", reversed: true, spread: "Lời khuyên" }, null, { name: "no id" }] };
  expect(savedReadingCards(snapshot, "vi")).toEqual([{ id: "major-17-star", reversed: true, position: "Lời khuyên" }]);
  expect(savedReadingCards({ type: "manual" }, "vi")).toEqual([]);
});
