import React from "react";
import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { NumerologyReport } from "../NumerologyReport";
import { SavedNumerologyReportRow } from "../SavedReportRow";
import { buildNumerologyMap, localToday } from "../calc";
import { buildReportPayload } from "../aiPayload";
import { allReportText, numerologyReportReviewed } from "../reportContent";
import { numerologyReportStorageKey, readSavedReport, reportNumbersHash } from "../reportStore";

const memoryStorage = (initial: Record<string, unknown> = {}) => {
  const data: Record<string, unknown> = { ...initial };
  return {
    data,
    loadJson: jest.fn(async (key: string, fallback: unknown) => (key in data ? data[key] : fallback)),
    saveJson: jest.fn(async (key: string, value: unknown) => { data[key] = value; })
  } as any;
};

const name = "Phạm Gia Linh";
const map = buildNumerologyMap("2000-03-15", name)!;
const currentHash = () => reportNumbersHash(buildReportPayload(map, localToday(), "vi"));
const result = {
  sections: [
    { id: "you", title: "Con người bạn", body: "Đoạn AI phần một.", blockIds: ["numbers.2"] },
    { id: "name", title: "Họ tên của bạn", body: "Đoạn AI về họ tên.", blockIds: ["numbers.8"] },
    { id: "chart", title: "Biểu đồ ngày sinh", body: "Đoạn AI về biểu đồ.", blockIds: ["digits.1"] },
    { id: "year", title: "Năm nay và tháng này", body: "Đoạn AI về năm.", blockIds: ["personalYear.1"] },
    { id: "pinnacle", title: "Chặng đang đi", body: "Đoạn AI về chặng.", blockIds: ["pinnacles.stages.1"] },
    { id: "relationship", title: "Trong các mối quan hệ", body: "Đoạn AI về quan hệ.", blockIds: ["relationship.numbers.2"] },
    { id: "questions", title: "Ba câu hỏi để viết", body: "Ba câu để bạn viết.", blockIds: ["numbers.2.question"] }
  ],
  questions: ["Câu thứ nhất?", "Câu thứ hai?", "Câu thứ ba?"],
  language: "vi" as const,
  promptVersion: "2026-11-28-numerology-report-v1",
  createdAt: "2026-11-28T03:00:00.000Z"
};

test("without a request function: Sắp có, a table of seven parts, Part 1 from local content and Parts 2-7 dimmed", () => {
  const screen = render(<NumerologyReport map={map} language="vi" />);
  expect(screen.getByTestId("numerology-report-soon").props.children).toBe("Sắp có");
  fireEvent.press(screen.getByTestId("numerology-report-open"));
  const toc = screen.getByTestId("numerology-report-toc");
  for (const part of ["Phần 1 · Con người bạn", "Phần 2 · Họ tên của bạn", "Phần 7 · Ba câu hỏi để viết"]) expect(within(toc).getByText(part)).toBeTruthy();
  expect(within(screen.getByTestId("numerology-report-part-you")).getByText(/không dùng AI/)).toBeTruthy();
  expect(screen.getByTestId("numerology-report-locked")).toBeTruthy();
  expect(within(screen.getByTestId("numerology-report-part-chart")).getByText("Những chữ số có mặt và các đường đầy hoặc trống.")).toBeTruthy();
  expect(screen.queryByTestId("numerology-report-action")).toBeNull();
  expect(screen.queryByText(/\d+:\d+:\d+/)).toBeNull(); // no countdown anywhere
  if (!numerologyReportReviewed) expect(screen.getByTestId("numerology-report-draft")).toBeTruthy();
  fireEvent.press(screen.getByTestId("numerology-report-close"));
  expect(screen.getByTestId("numerology-report-card")).toBeTruthy();
});

test("Premium flow: consent, one request with numbers only, the report is saved on the device and reused", async () => {
  const storage = memoryStorage();
  const onRequestReport = jest.fn(async () => ({ kind: "report" as const, report: result }));
  const screen = render(<NumerologyReport map={map} language="vi" storage={storage} onRequestReport={onRequestReport} />);
  fireEvent.press(screen.getByTestId("numerology-report-open"));
  fireEvent.press(screen.getByTestId("numerology-report-action"));
  expect(within(screen.getByTestId("numerology-report-consent")).getByText(/máy chủ không giữ nội dung/)).toBeTruthy();
  fireEvent.press(screen.getByTestId("numerology-report-cancel"));
  expect(onRequestReport).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId("numerology-report-action"));
  await act(async () => { fireEvent.press(screen.getByTestId("numerology-report-send")); });

  expect(onRequestReport).toHaveBeenCalledTimes(1);
  const sent = JSON.stringify((onRequestReport.mock.calls[0] as unknown[])[0]);
  for (const secret of [name, "Linh", "2000", "15/03"]) expect(sent).not.toContain(secret);
  expect(within(screen.getByTestId("numerology-report-part-chart")).getByText("Đoạn AI về biểu đồ.")).toBeTruthy();
  expect(screen.getByText("3. Câu thứ ba?")).toBeTruthy();
  expect(screen.getByTestId("numerology-report-ai-label")).toBeTruthy();
  expect(screen.queryByTestId("numerology-report-action")).toBeNull(); // same numbers: reuse, no new request

  const saved = readSavedReport(storage.data[numerologyReportStorageKey]);
  expect(saved?.numbersHash).toBe(currentHash());
  expect(saved?.sections).toHaveLength(7);
  expect(JSON.stringify(storage.data[numerologyReportStorageKey])).not.toContain("Linh");
});

test("a saved report with the same numbers is shown without a button; a changed number set offers Tạo lại", async () => {
  const same = memoryStorage({ [numerologyReportStorageKey]: { schemaVersion: 1, numbersHash: currentHash(), ...result } });
  const first = render(<NumerologyReport map={map} language="vi" storage={same} onRequestReport={jest.fn()} />);
  await waitFor(() => expect(first.getByText("Tạo lúc 28/11/2026")).toBeTruthy());
  fireEvent.press(first.getByTestId("numerology-report-open"));
  expect(first.getByTestId("numerology-report-saved")).toBeTruthy();
  expect(first.queryByTestId("numerology-report-stale")).toBeNull();
  expect(first.queryByTestId("numerology-report-action")).toBeNull();
  first.unmount();

  const old = memoryStorage({ [numerologyReportStorageKey]: { schemaVersion: 1, numbersHash: "00000000", ...result } });
  const second = render(<NumerologyReport map={map} language="vi" storage={old} onRequestReport={jest.fn()} />);
  await waitFor(() => expect(second.getByText("Tạo lúc 28/11/2026")).toBeTruthy());
  fireEvent.press(second.getByTestId("numerology-report-open"));
  expect(second.getByTestId("numerology-report-stale")).toBeTruthy();
  expect(within(second.getByTestId("numerology-report-action")).getByText("Tạo lại")).toBeTruthy();
});

test("premium_required keeps Parts 2-7 dimmed with the Premium note; soon turns the card into Sắp có", async () => {
  const premium = render(<NumerologyReport map={map} language="vi" storage={memoryStorage()} onRequestReport={jest.fn(async () => ({ kind: "premium_required" as const }))} />);
  fireEvent.press(premium.getByTestId("numerology-report-open"));
  fireEvent.press(premium.getByTestId("numerology-report-action"));
  await act(async () => { fireEvent.press(premium.getByTestId("numerology-report-send")); });
  expect(premium.getByTestId("numerology-report-note").props.children).toBe("Báo cáo tổng hợp nằm trong gói Premium.");
  expect(premium.getByTestId("numerology-report-locked")).toBeTruthy();
  premium.unmount();

  const soon = render(<NumerologyReport map={map} language="vi" storage={memoryStorage()} onRequestReport={jest.fn(async () => ({ kind: "soon" as const }))} />);
  fireEvent.press(soon.getByTestId("numerology-report-open"));
  fireEvent.press(soon.getByTestId("numerology-report-action"));
  await act(async () => { fireEvent.press(soon.getByTestId("numerology-report-send")); });
  expect(soon.getByTestId("numerology-report-soon")).toBeTruthy();
  expect(soon.queryByTestId("numerology-report-action")).toBeNull();
});

test("a failure offers Thử lại and never saves anything", async () => {
  const storage = memoryStorage();
  const onRequestReport = jest.fn(async () => ({ kind: "unavailable" as const, reason: "busy" as const }));
  const screen = render(<NumerologyReport map={map} language="vi" storage={storage} onRequestReport={onRequestReport} />);
  fireEvent.press(screen.getByTestId("numerology-report-open"));
  fireEvent.press(screen.getByTestId("numerology-report-action"));
  await act(async () => { fireEvent.press(screen.getByTestId("numerology-report-send")); });
  expect(screen.getByTestId("numerology-report-retry")).toBeTruthy();
  expect(storage.saveJson).not.toHaveBeenCalled();
});

test("WhoAmI row: Xem lại shows the saved text, Xóa asks once before deleting", async () => {
  const onDelete = jest.fn();
  const report = { schemaVersion: 1 as const, numbersHash: "abc", ...result };
  const screen = render(<SavedNumerologyReportRow report={report} language="vi" onDelete={onDelete} />);
  expect(screen.getByText("Báo cáo tổng hợp Bản đồ số")).toBeTruthy();
  fireEvent.press(screen.getByTestId("whoami-numerology-report-view"));
  expect(within(screen.getByTestId("saved-report-body")).getByText("Đoạn AI về quan hệ.")).toBeTruthy();
  fireEvent.press(screen.getByTestId("whoami-numerology-report-delete"));
  expect(screen.getByText("Xóa báo cáo đã lưu?")).toBeTruthy();
  fireEvent.press(screen.getByTestId("whoami-numerology-report-keep"));
  expect(onDelete).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId("whoami-numerology-report-delete"));
  fireEvent.press(screen.getByTestId("whoami-numerology-report-confirm-delete"));
  expect(onDelete).toHaveBeenCalledTimes(1);
});

test("report copy is bilingual and free of fate words", () => {
  const text = allReportText();
  expect(text.every((line) => line.trim().length > 0)).toBe(true);
  for (const line of text) expect(line).not.toMatch(/định mệnh|số phận|chắc chắn sẽ|destiny|fate|you will definitely/i);
});
