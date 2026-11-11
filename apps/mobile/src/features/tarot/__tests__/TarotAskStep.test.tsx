import React from "react";
import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";
import { colors } from "../../../theme";
import { TarotAskStep } from "../TarotAskStep";

const topics = [{ id: "love" as const, label: "Tình yêu" }, { id: "career" as const, label: "Công việc" }];
const spreads = [
  { id: "daily-one", cards: 1, title: "1 lá", detail: "Nhanh, một lời nhắn" },
  { id: "past-present-future", cards: 3, title: "3 lá", detail: "Quá khứ · Hiện tại · Tiềm năng" }
];

function renderAsk() {
  return render(
    <TarotAskStep language="vi" question="" onQuestionChange={jest.fn()} topic="love" topics={topics} onTopicChange={jest.fn()}
      examples={[]} spreads={spreads} spreadId="past-present-future" onSpreadChange={jest.fn()}
      deck={{ name: "Rose Mirror", detail: "Gợi ý", cover: { uri: "cover" } }} onChangeDeck={jest.fn()} />
  );
}

const hexOrRgba = (value: unknown) => String(value);

test("selected topic and spread use the gold selected style, never the rose one", () => {
  const screen = renderAsk();
  const chip = StyleSheet.flatten(screen.getByRole("button", { name: "Tình yêu" }).props.style);
  expect(chip.backgroundColor).toBe(colors.gold);
  expect(chip.borderColor).toBe(colors.gold);
  const other = StyleSheet.flatten(screen.getByRole("button", { name: "Công việc" }).props.style);
  expect(other.backgroundColor).toBeUndefined();

  const spread = StyleSheet.flatten(screen.getByRole("button", { name: /^3 lá\./ }).props.style);
  expect(spread.borderColor).toBe(colors.gold);
  expect(hexOrRgba(spread.backgroundColor)).toContain("201, 164, 92");
  expect(hexOrRgba(spread.backgroundColor)).not.toContain("201, 130, 141");
});
