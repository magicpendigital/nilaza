import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { BirthDateFields, BirthTimeFields } from "../BirthFields";

let mockPickerProps: { onChange: (event: { type: string }, date?: Date) => void; mode: string } | null = null;
jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: (props: typeof mockPickerProps) => { mockPickerProps = props; return null; }
}));

test("the device calendar fills the birth date boxes (analysis AS-04)", () => {
  const onChange = jest.fn();
  const screen = render(<BirthDateFields language="vi" value="" onChange={onChange} />);
  fireEvent.press(screen.getByRole("button", { name: "Chọn trên lịch" }));
  expect(mockPickerProps?.mode).toBe("date");
  act(() => mockPickerProps?.onChange({ type: "set" }, new Date(1995, 5, 15, 12)));
  expect(onChange).toHaveBeenLastCalledWith("1995-06-15");
  expect(screen.getByLabelText("Năm").props.value).toBe("1995");
});

test("the device clock fills hour, minute and morning or afternoon", () => {
  const onChange = jest.fn();
  const screen = render(<BirthTimeFields language="vi" value="" onChange={onChange} />);
  fireEvent.press(screen.getByRole("button", { name: "Chọn giờ trên đồng hồ" }));
  act(() => mockPickerProps?.onChange({ type: "set" }, new Date(2000, 0, 1, 20, 5)));
  expect(onChange).toHaveBeenLastCalledWith("20:05");
  expect(screen.getByLabelText("Giờ").props.value).toBe("8");
});

test("typing 15 with Sáng selected switches to Chiều and saves 15:30 (UX review K6)", () => {
  const onChange = jest.fn();
  const screen = render(<BirthTimeFields language="vi" value="" onChange={onChange} />);
  fireEvent.changeText(screen.getByLabelText("Phút"), "30");
  fireEvent.changeText(screen.getByLabelText("Giờ"), "15");
  expect(onChange).toHaveBeenLastCalledWith("15:30");
  expect(screen.getByRole("radio", { name: "Chiều" }).props.accessibilityState).toEqual({ selected: true });
  fireEvent.press(screen.getByRole("radio", { name: "Sáng" }));
  expect(onChange).toHaveBeenLastCalledWith("03:30");
  expect(screen.getByLabelText("Giờ").props.value).toBe("3");
});

test("an impossible minute or hour shows an inline message and clears the time", () => {
  const onChange = jest.fn();
  const screen = render(<BirthTimeFields language="vi" value="" onChange={onChange} />);
  fireEvent.changeText(screen.getByLabelText("Giờ"), "9");
  fireEvent.changeText(screen.getByLabelText("Phút"), "75");
  expect(onChange).toHaveBeenLastCalledWith("");
  expect(screen.getByText("Phút chỉ từ 0 đến 59.")).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText("Phút"), "10");
  fireEvent.changeText(screen.getByLabelText("Giờ"), "25");
  expect(onChange).toHaveBeenLastCalledWith("");
  expect(screen.getByText("Giờ chỉ từ 0 đến 23.")).toBeTruthy();
});
