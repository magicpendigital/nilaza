import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import golden from "../../../../../../docs/proposals/data/numerology-golden-2026-11-23.json";
import { BirthDateFields, birthDateIssue, daysInMonth, isLeapYear, validBirthDate } from "../BirthFields";

jest.mock("@react-native-community/datetimepicker", () => ({ __esModule: true, default: () => null }));

// Lô 1, cases from docs/proposals/ASTRO_NUMEROLOGY_IMPLEMENTATION_2026-11-23.vi.md (section 3, item 11).
const today = new Date(2026, 10, 24, 12);
const split = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return [String(Number(d)), String(Number(m)), y] as const;
};

test("the golden set is the version the Owner chose", () => {
  expect(golden.status).toContain("masters11_22_only");
});

test.each(["1900-02-29", "2001-02-29", "2000-04-31", "2000-03-00"])("%s cannot be a birth date", (iso) => {
  const [y, m, d] = iso.split("-");
  expect(birthDateIssue(d, m, y, today)).not.toBeNull();
  expect(validBirthDate(d, m, y, today)).toBe("");
});

test.each(["2000-02-29", "2004-02-29"])("%s is a real leap day", (iso) => {
  expect(validBirthDate(...split(iso), today)).toBe(iso);
});

test("every birth date in the golden set is accepted", () => {
  const births = [...new Set(golden.personalCycles.map((item) => item.birth))];
  expect(births.length).toBeGreaterThan(0);
  for (const iso of births) expect(validBirthDate(...split(iso), today)).toBe(iso);
});

test("leap years and month lengths follow the Gregorian calendar", () => {
  expect([1900, 2000, 2001, 2004, 2100].map(isLeapYear)).toEqual([false, true, false, true, false]);
  expect(daysInMonth(2, 1999)).toBe(28);
  expect(daysInMonth(2)).toBe(29);
  expect(daysInMonth(4, 2000)).toBe(30);
  expect(daysInMonth(12, 2000)).toBe(31);
});

test("each wrong box is named while typing, and a future date is refused", () => {
  expect(birthDateIssue("32", "", "", today)).toEqual({ field: "day", kind: "range" });
  expect(birthDateIssue("0", "", "", today)).toBeNull(); // still typing 01-09
  expect(birthDateIssue("15", "13", "", today)).toEqual({ field: "month", kind: "range" });
  expect(birthDateIssue("15", "3", "1899", today)).toMatchObject({ field: "year", kind: "range" });
  expect(birthDateIssue("31", "4", "", today)).toMatchObject({ kind: "monthLength", month: 4, days: 30 });
  expect(birthDateIssue("25", "11", "2026", today)).toEqual({ field: "year", kind: "future" });
  expect(birthDateIssue("24", "11", "2026", today)).toBeNull();
});

test("the boxes show the message and hand the screen an empty date until it is real", () => {
  const onChange = jest.fn();
  const screen = render(<BirthDateFields language="vi" value="" onChange={onChange} />);
  expect(screen.getByText("Ngày sinh (dương lịch)")).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText("Ngày"), "30");
  fireEvent.changeText(screen.getByLabelText("Tháng"), "2");
  fireEvent.changeText(screen.getByLabelText("Năm"), "1999");
  expect(onChange).toHaveBeenLastCalledWith("");
  expect(screen.getByText("Tháng 2 năm 1999 chỉ có 28 ngày. Kiểm tra lại ngày sinh nhé.")).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText("Ngày"), "28");
  expect(onChange).toHaveBeenLastCalledWith("1999-02-28");
  expect(screen.queryByRole("alert")).toBeNull();
});

test("a saved date that arrives later fills the boxes, and the label can be hidden", () => {
  const screen = render(<BirthDateFields language="en" value="" onChange={jest.fn()} label={false} />);
  expect(screen.queryByText("Birth date (Gregorian)")).toBeNull();
  screen.rerender(<BirthDateFields language="en" value="2000-03-15" onChange={jest.fn()} label={false} />);
  expect(screen.getByLabelText("Day").props.value).toBe("15");
  expect(screen.getByLabelText("Month").props.value).toBe("03");
  expect(screen.getByLabelText("Year").props.value).toBe("2000");
});
