import { birthTimeIssue, composeBirthDate, composeBirthTime, followBirthHour, splitBirthTime, toggleBirthHour } from "../BirthFields";

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
  expect(splitBirthTime("00:05")).toEqual({ hour: "0", minute: "05", afternoon: false });
  expect(splitBirthTime("12:40")).toEqual({ hour: "12", minute: "40", afternoon: true });
});

// UX review K6/U3 (2026-11-15): typing 15 with Sáng used to save 03:xx.
test.each([
  ["0", false, "00:10"],
  ["0", true, "00:10"],
  ["11", false, "11:10"],
  ["11", true, "23:10"],
  ["12", false, "00:10"],
  ["12", true, "12:10"],
  ["13", false, "13:10"],
  ["13", true, "13:10"],
  ["15", false, "15:10"],
  ["23", false, "23:10"],
  ["23", true, "23:10"]
])("hour %s with afternoon=%s saves %s", (hour, afternoon, expected) => {
  expect(composeBirthTime(hour, "10", afternoon)).toBe(expected);
});

test("hours above 23 and minutes above 59 are rejected with a reason", () => {
  expect(composeBirthTime("24", "00", false)).toBe("");
  expect(birthTimeIssue("24", "00")).toBe("hour");
  expect(composeBirthTime("10", "60", false)).toBe("");
  expect(birthTimeIssue("10", "60")).toBe("minute");
  expect(composeBirthTime("10", "75", true)).toBe("");
  expect(birthTimeIssue("10", "75")).toBe("minute");
  expect(birthTimeIssue("23", "59")).toBeNull();
  expect(birthTimeIssue("", "")).toBeNull();
});

test("the Sáng/Chiều toggle follows a 24-hour hour, and tapping it converts back", () => {
  expect(followBirthHour("15", false)).toBe(true);
  expect(followBirthHour("0", true)).toBe(false);
  expect(followBirthHour("12", false)).toBe(false);
  expect(followBirthHour("7", true)).toBe(true);
  expect(toggleBirthHour("15", false)).toBe("3");
  expect(toggleBirthHour("0", true)).toBe("12");
  expect(toggleBirthHour("7", true)).toBe("7");
});
