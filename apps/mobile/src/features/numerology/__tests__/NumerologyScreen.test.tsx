import React from "react";
import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { NumerologyScreen } from "../NumerologyScreen";
import { numerologyStorageKey } from "../store";

jest.mock("@react-native-community/datetimepicker", () => ({ __esModule: true, default: () => null }));

const memoryStorage = (initial: Record<string, unknown> = {}) => {
  const data: Record<string, unknown> = { ...initial };
  return {
    data,
    loadJson: jest.fn(async (key: string, fallback: unknown) => (key in data ? data[key] : fallback)),
    saveJson: jest.fn(async (key: string, value: unknown) => { data[key] = value; })
  } as any;
};

const enter = (screen: ReturnType<typeof render>, day: string, month: string, year: string) => {
  fireEvent.changeText(screen.getByLabelText("Ngày"), day);
  fireEvent.changeText(screen.getByLabelText("Tháng"), month);
  fireEvent.changeText(screen.getByLabelText("Năm"), year);
};

test("nothing is computed until the date exists", () => {
  const screen = render(<NumerologyScreen language="vi" initialBirthDate="" onBack={jest.fn()} />);
  fireEvent.press(screen.getByText("Xem bản đồ số của mình"));
  expect(screen.queryByTestId("number-lifePath")).toBeNull();
  enter(screen, "29", "2", "2001");
  fireEvent.press(screen.getByText("Xem bản đồ số của mình"));
  expect(screen.queryByTestId("number-lifePath")).toBeNull();
});

test("a guest with a date and no name sees life path 11/2 and the grid, with no name numbers", () => {
  const onEvent = jest.fn();
  const screen = render(<NumerologyScreen language="vi" initialBirthDate="" onEvent={onEvent} onBack={jest.fn()} />);
  enter(screen, "15", "3", "2000");
  fireEvent.press(screen.getByText("Xem bản đồ số của mình"));
  expect(screen.getByLabelText("Số chủ đạo 11/2")).toBeTruthy();
  expect(screen.getByLabelText("Số ngày sinh 6")).toBeTruthy();
  expect(screen.queryByTestId("number-expression")).toBeNull();
  expect(screen.getByText(/Thêm họ tên để xem thêm 3 số/)).toBeTruthy();
  expect(screen.getByTestId("numerology-grid").props.accessibilityLabel).toContain("1 ×1");
  expect(screen.getByTestId("arrow-1-2-3")).toBeTruthy();
  expect(JSON.stringify(screen.getByTestId("arrows-empty-note").props.children)).toContain("7-8-9");
  expect(screen.getByTestId("numerology-draft-note")).toBeTruthy();
  expect(onEvent).toHaveBeenCalledWith("numerology_computed", { hasName: false });
});

test("with a name the three name numbers appear and the name is saved on the device", async () => {
  const storage = memoryStorage();
  const screen = render(<NumerologyScreen language="vi" storage={storage} initialBirthDate="2000-03-15" onBack={jest.fn()} />);
  fireEvent.changeText(screen.getByLabelText("Họ tên khai sinh"), "Phạm Gia Linh");
  fireEvent.press(screen.getByText("Xem bản đồ số của mình"));
  expect(screen.getByLabelText("Số biểu đạt 8")).toBeTruthy();
  expect(screen.getByLabelText("Số linh hồn 2")).toBeTruthy();
  expect(screen.getByLabelText("Số nhân cách 6")).toBeTruthy();
  await waitFor(() => expect(storage.data[numerologyStorageKey]).toEqual({ schemaVersion: 1, name: "Phạm Gia Linh" }));
});

test("a saved name fills the box", async () => {
  const storage = memoryStorage({ [numerologyStorageKey]: { schemaVersion: 1, name: "Lê Yến" } });
  const screen = render(<NumerologyScreen language="vi" storage={storage} initialBirthDate="2000-03-15" onBack={jest.fn()} />);
  await waitFor(() => expect(screen.getByLabelText("Họ tên khai sinh").props.value).toBe("Lê Yến"));
});

test("the share request carries numbers only: no name, no birth date", () => {
  const onOpenShare = jest.fn();
  const screen = render(<NumerologyScreen language="vi" initialBirthDate="2000-03-15" onOpenShare={onOpenShare} onBack={jest.fn()} />);
  fireEvent.changeText(screen.getByLabelText("Họ tên khai sinh"), "Phạm Gia Linh");
  fireEvent.press(screen.getByText("Xem bản đồ số của mình"));
  fireEvent.press(screen.getByText("Chia sẻ thẻ"));
  expect(onOpenShare).toHaveBeenCalledTimes(1);
  const request = onOpenShare.mock.calls[0][0];
  const text = JSON.stringify(request);
  expect(request.model.surface).toBe("numerology_map");
  expect(request.model.rows.map((row: { value: string }) => row.value)).toEqual(["11/2", "6", "8"]);
  for (const secret of ["Phạm", "Gia", "Linh", "2000", "03-15"]) expect(text).not.toContain(secret);
});

test("Back from the result returns to the form, Back from the form leaves the screen", () => {
  const onBack = jest.fn();
  const screen = render(<NumerologyScreen language="en" initialBirthDate="2000-03-15" onBack={onBack} />);
  fireEvent.press(screen.getByText("See my number map"));
  fireEvent.press(screen.getByLabelText("Back"));
  expect(screen.getByText("See my number map")).toBeTruthy();
  expect(onBack).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText("Back"));
  expect(onBack).toHaveBeenCalled();
});

test("the birth-date-first link ignores the typed name and does not save it", async () => {
  const storage = memoryStorage();
  const screen = render(<NumerologyScreen language="vi" storage={storage} initialBirthDate="2000-03-15" onBack={jest.fn()} />);
  fireEvent.changeText(screen.getByLabelText("Họ tên khai sinh"), "Phạm Gia Linh");
  fireEvent.press(screen.getByText("Chưa muốn nhập tên? Xem các số từ ngày sinh trước"));
  expect(screen.getByLabelText("Số chủ đạo 11/2")).toBeTruthy();
  expect(screen.queryByTestId("number-expression")).toBeNull();
  await act(async () => {});
  expect(storage.data[numerologyStorageKey]).toBeUndefined();
});

test("tapping a number tile opens its reading, and a grid cell opens its own line", () => {
  const screen = render(<NumerologyScreen language="vi" initialBirthDate="2000-03-15" onBack={jest.fn()} />);
  fireEvent.press(screen.getByText("Xem bản đồ số của mình"));
  expect(screen.queryByTestId("reading-birthday")).toBeNull();
  fireEvent.press(screen.getByLabelText("Số ngày sinh 6"));
  expect(screen.getByTestId("reading-birthday")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("Ô số 7, trống"));
  expect(screen.getByText("Ô số 7 · trống")).toBeTruthy();
});

test("the how-it-is-worked-out steps show the master number and its root", () => {
  const screen = render(<NumerologyScreen language="vi" initialBirthDate="2000-03-15" onBack={jest.fn()} />);
  fireEvent.press(screen.getByText("Xem bản đồ số của mình"));
  fireEvent.press(screen.getByText("Cách tính"));
  const steps = within(screen.getByTestId("numerology-how-steps"));
  expect(steps.getByText(/giữ lại vì là số bậc thầy/)).toBeTruthy();
  expect(steps.getByText(/ghi là 11\/2/)).toBeTruthy();
});

test("a name with digits or symbols gets a gentle note and still works", () => {
  const screen = render(<NumerologyScreen language="vi" initialBirthDate="2000-03-15" onBack={jest.fn()} />);
  fireEvent.changeText(screen.getByLabelText("Họ tên khai sinh"), "Linh 2");
  expect(screen.getByText(/Tên có ký tự lạ/)).toBeTruthy();
  fireEvent.press(screen.getByText("Xem bản đồ số của mình"));
  expect(screen.getByTestId("number-expression")).toBeTruthy();
});

test("the screen makes no network request", async () => {
  const fetchMock = jest.fn(() => { throw new Error("network"); });
  const original = globalThis.fetch;
  (globalThis as { fetch: unknown }).fetch = fetchMock;
  const screen = render(<NumerologyScreen language="vi" initialBirthDate="2000-03-15" onBack={jest.fn()} />);
  await act(async () => { fireEvent.press(screen.getByText("Xem bản đồ số của mình")); });
  expect(fetchMock).not.toHaveBeenCalled();
  (globalThis as { fetch: unknown }).fetch = original;
});
