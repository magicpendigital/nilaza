import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { TarotDrawStep, type DrawSlot } from "../TarotDrawStep";
import { FLIGHT_TOTAL_MS } from "../ritualLayout";

const card = { name: "Tình Nhân", image: { uri: "lovers" }, reversed: true };
const threeSlots: DrawSlot[] = [{ label: "Bạn", card }, { label: "Người ấy" }, { label: "Mối quan hệ" }];

function renderStep(slots: DrawSlot[] = threeSlots, extra: Partial<React.ComponentProps<typeof TarotDrawStep>> = {}) {
  const props = { onSelectFan: jest.fn(), onClearSelection: jest.fn(), onOpenCard: jest.fn(), onDrawRest: jest.fn() };
  const element = (override: Partial<React.ComponentProps<typeof TarotDrawStep>> = {}) => (
    <TarotDrawStep language="vi" question="Mình cần biết điều gì?" slots={slots} backImage={{ uri: "back" }}
      selectedFanIndex={null} busy={false} status="Chạm một lá trong quạt bài · hôm nay còn 2 lượt" animate={false} fanStart={0} {...props} {...extra} {...override} />
  );
  const screen = render(element());
  return { screen, rerender: (override: Partial<React.ComponentProps<typeof TarotDrawStep>>) => screen.rerender(element(override)), ...props };
}

const fanCards = (screen: ReturnType<typeof render>) => screen.getAllByRole("button", { name: /Lá thứ \d+ trong bộ bài/ });

test("names the next position, keeps the allowance line and offers random pick and reveal-all", () => {
  const { screen, onSelectFan, onDrawRest, onOpenCard } = renderStep();
  expect(screen.getByText("Mình cần biết điều gì?")).toBeTruthy();
  // Slot label and the emphasised position in the prompt.
  expect(screen.getAllByText("Người ấy")).toHaveLength(2);
  expect(screen.getByText(/Chọn lá cho vị trí/)).toBeTruthy();
  expect(screen.getByText("Chạm một lá trong quạt bài · hôm nay còn 2 lượt")).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Lá thứ 1 trong bộ bài" }));
  expect(onSelectFan).toHaveBeenCalledWith(0);
  expect(screen.getByRole("button", { name: "Rút ngẫu nhiên" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Đổi bộ bài" })).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "Lật cả 2 lá ngay" }));
  expect(onDrawRest).toHaveBeenCalled();
  fireEvent.press(screen.getByRole("imagebutton", { name: /Bạn: Tình Nhân/ }));
  expect(onOpenCard).toHaveBeenCalledWith(0);
});

test("when every position is filled the fan, random pick and reveal-all go away", () => {
  const { screen } = renderStep([{ label: "Thông điệp", card }]);
  expect(screen.getByText(/Các lá đã sẵn sàng/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /trong bộ bài/ })).toBeNull();
  expect(screen.queryByText(/Lật cả/)).toBeNull();
  expect(screen.queryByText("Rút ngẫu nhiên")).toBeNull();
});

test("switching the selected card keeps every card in the fan and raises only the new one", () => {
  const { screen, rerender } = renderStep();
  const before = fanCards(screen).length;
  expect(before).toBeGreaterThanOrEqual(9);
  rerender({ selectedFanIndex: 1 });
  expect(fanCards(screen)).toHaveLength(before);
  expect(screen.getByRole("button", { name: "Lá thứ 2 trong bộ bài", selected: true })).toBeTruthy();
  rerender({ selectedFanIndex: 3 });
  expect(fanCards(screen)).toHaveLength(before);
  expect(screen.getByRole("button", { name: "Lá thứ 4 trong bộ bài", selected: true })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Lá thứ 2 trong bộ bài", selected: false })).toBeTruthy();
  // Every card still renders its artwork.
  expect(screen.UNSAFE_getAllByType(require("react-native").Image).length).toBeGreaterThanOrEqual(before);
});

test("the deck can be spun to reach cards that were not on screen", () => {
  const { screen, onClearSelection } = renderStep(threeSlots, { reduceMotion: true });
  expect(screen.queryByRole("button", { name: "Lá thứ 8 trong bộ bài" })).toBeNull();
  act(() => { fireEvent.press(screen.getByRole("button", { name: "Xoay bộ bài sang phải" })); });
  // Spinning puts a raised card back so "Turn this card" never points at a card out of sight.
  expect(onClearSelection).toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Lá thứ 8 trong bộ bài" })).toBeTruthy();
  act(() => { fireEvent.press(screen.getByRole("button", { name: "Xoay bộ bài sang trái" })); });
  expect(screen.queryByRole("button", { name: "Lá thứ 8 trong bộ bài" })).toBeNull();
});

test("without the flight a drawn card shows in its slot straight away", () => {
  const { screen, rerender } = renderStep();
  rerender({ slots: [{ label: "Bạn", card }, { label: "Người ấy", card: { ...card, name: "Nữ Tư Tế" } }, { label: "Mối quan hệ" }] });
  expect(screen.getByRole("imagebutton", { name: /Người ấy: Nữ Tư Tế/ })).toBeTruthy();
});

describe("card flight", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const layoutEvent = (width: number, height: number, x = 0, y = 0) => ({ nativeEvent: { layout: { x, y, width, height } } });

  test("a newly drawn card flies before it lands in its slot, and tapping the scrim skips it", () => {
    const onFlightChange = jest.fn();
    const { screen, rerender } = renderStep(threeSlots, { animate: true, onFlightChange });
    fireEvent(screen.getByTestId("draw-root"), "layout", layoutEvent(342, 700));
    fireEvent(screen.getByTestId("draw-slots"), "layout", layoutEvent(342, 190, 0, 90));
    threeSlots.forEach((_, index) => fireEvent(screen.getByTestId(`draw-slot-${index}`), "layout", layoutEvent(96, 190, index * 108, 0)));
    fireEvent(screen.getByTestId("draw-fan"), "layout", layoutEvent(342, 230, 0, 330));

    rerender({ selectedFanIndex: 2 });
    rerender({ selectedFanIndex: null, slots: [{ label: "Bạn", card }, { label: "Người ấy", card: { ...card, name: "Nữ Tư Tế", reversed: false } }, { label: "Mối quan hệ" }] });
    // Mid-flight: the caption names the card, the slot is still empty.
    expect(screen.getByText("Nữ Tư Tế")).toBeTruthy();
    expect(screen.queryByRole("imagebutton", { name: /Người ấy: Nữ Tư Tế/ })).toBeNull();
    // The drawn card has left the deck.
    expect(screen.queryByRole("button", { name: "Lá thứ 3 trong bộ bài" })).toBeNull();
    // While it waits face down the person is asked to hold the question in mind, and the owner is told a flight is running.
    expect(screen.getByText("Giữ câu hỏi của bạn trong tâm trí")).toBeTruthy();
    expect(onFlightChange).toHaveBeenLastCalledWith(true);

    act(() => { jest.advanceTimersByTime(FLIGHT_TOTAL_MS + 500); });
    expect(onFlightChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("imagebutton", { name: /Người ấy: Nữ Tư Tế/ })).toBeTruthy();
    expect(screen.queryByText("Bỏ qua hiệu ứng")).toBeNull();
  });
});

describe("four-card spread", () => {
  const fourSlots: DrawSlot[] = [{ label: "Điểm bạn đang đứng" }, { label: "Nếu bước tới" }, { label: "Nếu giữ nguyên" }, { label: "Lời nhắc" }];

  test("shows four numbered positions, names the next one and counts the cards left to turn", () => {
    const { screen } = renderStep(fourSlots);
    // Empty positions are decoration for screen readers, so look at them with hidden elements included.
    ["1", "2", "3", "4"].forEach((number) => expect(screen.getByText(number, { includeHiddenElements: true })).toBeTruthy());
    expect(screen.getAllByText("Điểm bạn đang đứng")).toHaveLength(2); // slot label and the prompt
    expect(screen.getByRole("button", { name: "Lật cả 4 lá ngay" })).toBeTruthy();
  });

  test("a card drawn in the third slot lands there while the fourth waits", () => {
    const { screen, rerender } = renderStep([{ label: "A", card }, { label: "B", card }, { label: "C" }, { label: "D" }]);
    rerender({ slots: [{ label: "A", card }, { label: "B", card }, { label: "C", card: { ...card, name: "Mặt Trời" } }, { label: "D" }] });
    expect(screen.getByRole("imagebutton", { name: /C: Mặt Trời/ })).toBeTruthy();
    expect(screen.queryByRole("imagebutton", { name: /^D:/ })).toBeNull();
    // One card left: "reveal all" would be the same as turning it, so the link is gone.
    expect(screen.queryByText(/Lật cả/)).toBeNull();
    expect(screen.getByText(/Chọn lá cho vị trí/)).toBeTruthy();
  });
});

test("notices and errors show above the deck, not hidden below it", () => {
  const { screen } = renderStep(threeSlots, { children: <></> });
  screen.rerender(
    <TarotDrawStep language="vi" question="Câu hỏi" slots={threeSlots} backImage={{ uri: "back" }} selectedFanIndex={null} busy={false} animate={false} fanStart={0}
      onSelectFan={jest.fn()} onOpenCard={jest.fn()}>
      <></>
      {React.createElement(require("react-native").Text, null, "thong-bao-loi")}
    </TarotDrawStep>
  );
  const tree = JSON.stringify(screen.toJSON());
  expect(tree.indexOf("thong-bao-loi")).toBeGreaterThan(-1);
  expect(tree.indexOf("thong-bao-loi")).toBeLessThan(tree.indexOf('"draw-fan"'));
});

test("slot width follows the number of cards and a single drawn card is larger than an empty slot", () => {
  const { StyleSheet } = require("react-native");
  const widthOf = (screen: ReturnType<typeof render>, index: number) => StyleSheet.flatten(screen.getByTestId(`draw-slot-${index}`).props.style).width as number;
  const empty = renderStep([{ label: "Thông điệp" }]);
  const drawn = renderStep([{ label: "Thông điệp", card }]);
  expect(widthOf(drawn.screen, 0)).toBeGreaterThan(widthOf(empty.screen, 0));
  const four = renderStep([{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }]);
  expect(widthOf(four.screen, 0) * 4).toBeLessThan(400);
});
