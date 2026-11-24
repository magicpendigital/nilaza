import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { WhoAmI, type WhoAmIProps } from "../WhoAmI";

const now = new Date(2026, 10, 25, 12);
const chart = {
  id: "r1",
  createdAt: "2026-11-20T00:00:00Z",
  placeName: "Hà Nội",
  input: { date: "2000-03-15" },
  chart: {
    placements: [{ body: "sun", sign: "pisces" }, { body: "moon", sign: "cancer" }],
    angles: [{ body: "ascendant", sign: "leo" }],
    sampledRanges: [],
    houses: [],
    time: { birthTimeKnown: true, precision: "exact" }
  }
} as any;
const entries = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ sourceType: index % 2 ? "tarot" : "manual", createdAt: new Date(2026, 10, 24 - index * 7, 9).toISOString() }) as const);

function renderWhoAmI(overrides: Partial<WhoAmIProps> = {}) {
  const props: WhoAmIProps = {
    language: "vi",
    name: "Linh",
    birthDate: "2000-03-15",
    birthTime: "08:30",
    birthTimeUnknown: false,
    birthPlace: "Hà Nội",
    savedCharts: { status: "ready", charts: [chart] },
    journalEntries: entries(5),
    syncsWithAccount: true,
    now,
    onOpenChart: jest.fn(),
    onDeleteChart: jest.fn(),
    onMakeChart: jest.fn(),
    onWriteJournal: jest.fn(),
    onEditBirth: jest.fn(),
    onEditName: jest.fn(),
    onExport: jest.fn(),
    onClearBirth: jest.fn(),
    ...overrides
  };
  return { props, screen: render(<WhoAmI {...props} />) };
}

test("identity card, chips, the one line and the recorded counts", () => {
  const { screen } = renderWhoAmI();
  expect(screen.getByText("Linh")).toBeTruthy();
  expect(screen.getByText("Sinh 15/03/2000 · 08:30 · Hà Nội")).toBeTruthy();
  expect(screen.getByLabelText("Mặt Trời Song Ngư")).toBeTruthy();
  expect(screen.getByLabelText("Mặt Trăng Cự Giải")).toBeTruthy();
  expect(screen.getByLabelText("Cung Mọc Sư Tử")).toBeTruthy();
  expect(screen.getByText("Người mơ mộng biết cách che chở.")).toBeTruthy();
  expect(screen.getByLabelText("5 mục Nhật ký")).toBeTruthy();
  expect(screen.getByLabelText("2 lần trải bài đã lưu")).toBeTruthy();
  expect(screen.getByLabelText("5 tuần liên tục có viết")).toBeTruthy();
  expect(screen.getByText("Sắp có")).toBeTruthy();
  expect(screen.getByText(/được đồng bộ với tài khoản/)).toBeTruthy();
});

test("below 5 journal entries a hint replaces the counts", () => {
  const { props, screen } = renderWhoAmI({ journalEntries: entries(3) });
  expect(screen.queryByLabelText(/mục Nhật ký$/)).toBeNull();
  expect(screen.getByText(/còn 2 mục/)).toBeTruthy();
  fireEvent.press(screen.getByText("Viết vào Nhật ký"));
  expect(props.onWriteJournal).toHaveBeenCalled();
});

test("without a saved chart there are no chips and no one line, only an invite", () => {
  const { props, screen } = renderWhoAmI({ savedCharts: { status: "ready", charts: [] }, birthDate: "", birthTime: "", birthPlace: "", syncsWithAccount: false });
  expect(screen.queryByLabelText(/Mặt Trời/)).toBeNull();
  expect(screen.queryByText("Bạn trong một câu")).toBeNull();
  expect(screen.getByText("Chưa có ngày sinh")).toBeTruthy();
  expect(screen.getByText("Chưa có báo cáo nào được lưu trên máy.")).toBeTruthy();
  expect(screen.queryByText("Xóa thông tin ngày sinh")).toBeNull();
  expect(screen.getByText(/lá số đã lưu nằm trên máy này/)).toBeTruthy();
  fireEvent.press(screen.getByText("Lập lá số"));
  expect(props.onMakeChart).toHaveBeenCalled();
});

test("saved charts open and delete through callbacks; data rows call their actions", () => {
  const { props, screen } = renderWhoAmI();
  fireEvent.press(screen.getByLabelText("Xem Lá số · 15/03/2000"));
  expect(props.onOpenChart).toHaveBeenCalledWith(chart);
  fireEvent.press(screen.getByLabelText("Xóa Lá số · 15/03/2000"));
  expect(props.onDeleteChart).toHaveBeenCalledWith(chart);
  fireEvent.press(screen.getByText("Sửa ngày, giờ, nơi sinh"));
  fireEvent.press(screen.getByText("Sửa tên hiển thị"));
  fireEvent.press(screen.getByText("Xuất dữ liệu"));
  fireEvent.press(screen.getByText("Xóa thông tin ngày sinh"));
  expect(props.onEditBirth).toHaveBeenCalled();
  expect(props.onEditName).toHaveBeenCalled();
  expect(props.onExport).toHaveBeenCalled();
  expect(props.onClearBirth).toHaveBeenCalled();
});

test("unreadable saved charts are reported without offering delete", () => {
  const { screen } = renderWhoAmI({ savedCharts: { status: "invalid", charts: [] } });
  expect(screen.getByText(/Chưa đọc được lá số đã lưu/)).toBeTruthy();
  expect(screen.queryByText("Xóa")).toBeNull();
});
