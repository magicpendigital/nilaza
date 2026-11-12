import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { colors } from "../../../theme";
import { TarotAskStep } from "../TarotAskStep";

const topics = [{ id: "love" as const, label: "Tình yêu" }, { id: "career" as const, label: "Công việc" }];
const spreads = [
  { id: "daily-one", cards: 1, title: "1 lá", detail: "Nhanh, một lời nhắn" },
  { id: "past-present-future", cards: 3, title: "3 lá", detail: "Quá khứ · Hiện tại · Tiềm năng" }
];

const allSpreads = [
  ...spreads,
  { id: "situation-challenge-advice", cards: 3, title: "3 lá", detail: "Tình huống · Thử thách · Lời nhắc" },
  { id: "love-three", cards: 3, title: "3 lá tình yêu", detail: "Bạn · Người ấy · Mối quan hệ" },
  { id: "crossroads-four", cards: 4, title: "4 lá", detail: "Ngã rẽ: nên hay không" }
];

function renderAsk(options: { spreads?: typeof spreads; spreadId?: string; onSpreadChange?: jest.Mock } = {}) {
  return render(
    <TarotAskStep language="vi" question="" onQuestionChange={jest.fn()} topic="love" topics={topics} onTopicChange={jest.fn()}
      examples={[]} spreads={options.spreads ?? spreads} spreadId={options.spreadId ?? "past-present-future"} onSpreadChange={options.onSpreadChange ?? jest.fn()}
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

test("the Love and Crossroads spreads sit beside the existing three, wrap in rows of three and can be chosen", () => {
  const onSpreadChange = jest.fn();
  const screen = renderAsk({ spreads: allSpreads, spreadId: "love-three", onSpreadChange });
  expect(screen.getAllByRole("button", { name: /Bạn · Người ấy · Mối quan hệ/ })).toHaveLength(1);
  const love = screen.getByRole("button", { name: /^3 lá tình yêu\./ });
  expect(StyleSheet.flatten(love.props.style).borderColor).toBe(colors.gold);
  expect(StyleSheet.flatten(love.props.style).flexBasis).toBe("31%");
  // Five tiles need two rows, so the container wraps.
  let row = love.parent;
  while (row && StyleSheet.flatten(row.props.style)?.flexWrap !== "wrap") row = row.parent;
  expect(row).toBeTruthy();
  const crossroads = screen.getByRole("button", { name: /^4 lá\. Ngã rẽ/ });
  expect(StyleSheet.flatten(crossroads.props.style).borderColor).not.toBe(colors.gold);
  fireEvent.press(crossroads);
  expect(onSpreadChange).toHaveBeenCalledWith("crossroads-four");
});
