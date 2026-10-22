import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import cards from "../../../../../../packages/content/data/tarot-cards.json";
import { ReadingDetails } from "../../../a2ui/ReadingDetails";
import { normalizeTarotSections, tarotSnapshotMeaning, tarotResultSource } from "../readingPresentation";
import { getTarotLearningSections } from "../learning";

test("three distinct AI sections survive a JSON save/reopen and remain accessible beyond the summary", () => {
  const response = { summary: "One synthesis", sections: ["past", "present", "potential"].map(key => ({
    key, title: { en: key }, body: { en: `Contextual interpretation for ${key}` },
  })) };
  const snapshot = JSON.parse(JSON.stringify({ sections: normalizeTarotSections(response.sections, "en") }));
  const screen = render(<ReadingDetails label="Read full" collapseLabel="Collapse" sections={snapshot.sections.map((item: any) => ({ id: item.key, title: item.title.en, body: item.body.en }))} />);
  expect(screen.queryByText("Contextual interpretation for potential")).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: /Read full/ }));
  for (const key of ["past", "present", "potential"]) expect(screen.getByText(`Contextual interpretation for ${key}`)).toBeTruthy();
});

test("saved orientation meaning wins over a changed canonical library and legacy snapshots still work", () => {
  const card = { ...cards[0], reversed: true, reversedMeaning: { vi: "Nghĩa mới", en: "Updated library meaning" } } as any;
  const saved = JSON.parse(JSON.stringify({ interpretation: { vi: "Nghĩa đã lưu", en: "Original saved meaning" } }));
  expect(tarotSnapshotMeaning(card, saved, "vi")).toBe("Nghĩa đã lưu");
  expect(tarotSnapshotMeaning(card, saved, "en")).toBe("Original saved meaning");
  expect(tarotSnapshotMeaning(card, {}, "en")).toBe("Updated library meaning");
});

test("malformed optional sections cannot crash rendering or masquerade as card meanings", () => {
  expect(normalizeTarotSections([null, { body: {} }, { title: 3 }, { key: "free", title: "An overall theme", body: "Not tied to a card" }], "en"))
    .toEqual([{ key: "free", title: { en: "An overall theme" }, body: { en: "Not tied to a card" } }]);
  expect(normalizeTarotSections({ title: "not an array" }, "vi")).toEqual([]);
  expect(tarotResultSource("fallback")).toBe("reference");
  expect(tarotResultSource("passed")).toBe("ai");
  expect(tarotResultSource("blocked")).toBe("blocked");
});

test("representative teaching covers Major, numbered Minor and Court in VI/EN with the same section structure", () => {
  const ids = ["major-00-fool", "major-09-hermit", "minor-cups-two", "minor-swords-four", "minor-pentacles-eight", "minor-wands-queen"];
  for (const id of ids) {
    expect(cards.some(card => card.id === id)).toBe(true);
    const vi = getTarotLearningSections(id, "vi"), en = getTarotLearningSections(id, "en");
    expect(vi.map(section => section.id)).toEqual(en.map(section => section.id));
    expect(vi).toHaveLength(6);
    expect(vi.every(section => section.body && section.body !== en.find(other => other.id === section.id)?.body)).toBe(true);
  }
  expect(getTarotLearningSections("missing-card", "vi")).toEqual([]);
});
