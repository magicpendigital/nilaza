import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { TarotDrawStep } from "../TarotDrawStep";

const card = { name: "Tình Nhân", image: { uri: "lovers" }, reversed: true };

function renderStep(slots = [{ label: "Bạn", card }, { label: "Người ấy" }, { label: "Mối quan hệ" }]) {
  const props = { onSelectFan: jest.fn(), onOpenCard: jest.fn(), onDrawRest: jest.fn(), onChangeDeck: jest.fn() };
  const screen = render(
    <TarotDrawStep language="vi" question="Mình cần biết điều gì?" slots={slots} backImage={{ uri: "back" }}
      selectedFanIndex={null} busy={false} status="Chạm một lá trong quạt bài · hôm nay còn 2 lượt" {...props} />
  );
  return { screen, ...props };
}

test("names the next position, keeps the allowance line and offers to reveal the rest", () => {
  const { screen, onSelectFan, onDrawRest, onOpenCard } = renderStep();
  expect(screen.getByText("Mình cần biết điều gì?")).toBeTruthy();
  // Slot label and the emphasised position in the prompt.
  expect(screen.getAllByText("Người ấy")).toHaveLength(2);
  expect(screen.getByText(/Chọn lá cho vị trí/)).toBeTruthy();
  expect(screen.getByText("Chạm một lá trong quạt bài · hôm nay còn 2 lượt")).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Lá thứ 5 trong quạt" }));
  expect(onSelectFan).toHaveBeenCalledWith(4);
  fireEvent.press(screen.getByRole("button", { name: "Lật cả 2 lá ngay" }));
  expect(onDrawRest).toHaveBeenCalled();
  fireEvent.press(screen.getByRole("imagebutton", { name: /Bạn: Tình Nhân/ }));
  expect(onOpenCard).toHaveBeenCalledWith(0);
});

test("when every position is filled the fan and reveal-all go away", () => {
  const { screen } = renderStep([{ label: "Thông điệp", card }]);
  expect(screen.getByText(/Các lá đã sẵn sàng/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /trong quạt/ })).toBeNull();
  expect(screen.queryByText(/Lật cả/)).toBeNull();
});
