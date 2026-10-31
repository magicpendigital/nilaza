import { composeBirthDate, composeBirthTime, splitBirthTime } from "../BirthFields";

test("day, month and year become the calculator's date only when complete", () => {
  expect(composeBirthDate("15", "3", "2000")).toBe("2000-03-15");
  expect(composeBirthDate("5", "12", "1999")).toBe("1999-12-05");
  expect(composeBirthDate("15", "3", "200")).toBe("");
  expect(composeBirthDate("", "3", "2000")).toBe("");
});

test("12-hour time with Sáng/Chiều becomes 24-hour time and back", () => {
  expect(composeBirthTime("2", "30", true)).toBe("14:30");
  expect(composeBirthTime("12", "05", false)).toBe("00:05");
  expect(composeBirthTime("12", "", true)).toBe("12:00");
  expect(composeBirthTime("", "30", true)).toBe("");
  expect(splitBirthTime("14:30")).toEqual({ hour: "2", minute: "30", afternoon: true });
  expect(splitBirthTime("00:05")).toEqual({ hour: "12", minute: "05", afternoon: false });
});
