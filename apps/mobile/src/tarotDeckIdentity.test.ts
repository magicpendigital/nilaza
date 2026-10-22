import { canonicalTarotDeckId, findTarotDeckById } from "./tarotDeckIdentity";

describe("Tarot persisted deck identity", () => {
  const current = { id: "celestial-reverie", accessTier: "free" };

  it("reopens a legacy selection or Journal reference with the current deck", () => {
    const index = { "celestial-reverie": current };
    expect(findTarotDeckById(index, "tinh-quang")).toBe(current);
    expect(canonicalTarotDeckId("tinh-quang")).toBe(current.id);
    expect(findTarotDeckById(index, current.id)).toBe(current);
  });

  it("does not invent a deck omitted by a published bundle", () => {
    expect(findTarotDeckById({ "moon-garden": { id: "moon-garden" } }, "tinh-quang")).toBeUndefined();
  });

  it("preserves a legacy-only published deck identity and prefers the canonical record when both exist", () => {
    const legacy = { id: "tinh-quang", accessTier: "free" };
    expect(findTarotDeckById({ "tinh-quang": legacy }, "tinh-quang")).toBe(legacy);
    expect(findTarotDeckById({ "tinh-quang": legacy }, current.id)).toBe(legacy);
    expect(findTarotDeckById({ "tinh-quang": legacy, "celestial-reverie": current }, "tinh-quang")).toBe(current);
  });

  it("leaves other deck IDs and saved input objects unchanged", () => {
    const snapshot = { deckId: "tinh-quang", question: "Synthetic saved question" };
    const before = JSON.stringify(snapshot);
    canonicalTarotDeckId(snapshot.deckId);
    expect(JSON.stringify(snapshot)).toBe(before);
    expect(canonicalTarotDeckId("rose-mirror")).toBe("rose-mirror");
    expect(findTarotDeckById({}, "unknown")).toBeUndefined();
  });
});
