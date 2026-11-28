import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import type { CandidateChart } from "../../../../../../packages/astrology-core/calculator.mjs";
import { DailySkyScreen } from "../DailySkyScreen";
import { dailySkyAt } from "../dailySky";
import { dailySkyReading, relationOf, skyPersonalOf } from "../dailySkyContent";
import { fixedZone } from "../localDay";

// 24/11/2026 noon in Vietnam: Moon late in Taurus, moves into Gemini at 18:09, full Moon at 21:54.
const vn = fixedZone(420);
const now = new Date("2026-11-24T12:00:00+07:00");

const chartOf = (extra: Record<string, unknown>) => ({
  placements: [], angles: [], houses: [], sampledRanges: [],
  time: { birthTimeKnown: false, precision: "date" },
  ...extra
}) as unknown as CandidateChart;
const sunPisces = chartOf({ placements: [{ body: "sun", sign: "pisces" }] });
const withHouse = chartOf({ placements: [{ body: "sun", sign: "pisces" }], houses: [{ house: 5, sign: "taurus" }], time: { birthTimeKnown: true, precision: "exact" } });
// Born on 20/03/2026 without a time: the Sun entered Aries that day.
const boundary = chartOf({
  sampledRanges: [{ body: "sun", possibleSigns: ["pisces", "aries"] }],
  time: { birthTimeKnown: false, precision: "date", range: { start: "2026-03-20T00:00:00Z", endExclusive: "2026-03-21T00:00:00Z" } }
});

test("a guest sees the Moon card, the day's change, the week strip and an invite to add a birth date", () => {
  const onAddBirthDate = jest.fn();
  const screen = render(<DailySkyScreen language="vi" now={now} zone={vn} onAddBirthDate={onAddBirthDate} />);
  expect(screen.getByText("Thứ Ba · 24/11")).toBeTruthy();
  expect(screen.getByText("Trăng ở Kim Ngưu")).toBeTruthy();
  expect(screen.getByText(/Trăng tròn · 100% sáng · Trăng tròn lúc 21:54 hôm nay/)).toBeTruthy();
  expect(screen.getByText(/Song Tử lúc 18:09/)).toBeTruthy();
  expect(screen.getByText("Hôm nay")).toBeTruthy();
  expect(screen.getByText("→ 18:09")).toBeTruthy();
  fireEvent.press(screen.getByText("Thêm ngày sinh →"));
  expect(onAddBirthDate).toHaveBeenCalledTimes(1);
});

test("the question goes to Journal and the method opens on demand", () => {
  const onWriteJournal = jest.fn();
  const screen = render(<DailySkyScreen language="vi" now={now} zone={vn} onWriteJournal={onWriteJournal} />);
  const reading = dailySkyReading(dailySkyAt(now, vn), { kind: "none" }, "vi", vn);
  fireEvent.press(screen.getByText("Viết vào Nhật ký"));
  expect(onWriteJournal).toHaveBeenCalledWith(reading.journal);
  expect(screen.queryByText(reading.how.lines[0])).toBeNull();
  fireEvent.press(screen.getByText("Về cách tính"));
  expect(screen.getByText(reading.how.lines[0])).toBeTruthy();
  expect(screen.getByText("Đây là gợi ý để tự soi chiếu, không là lời dự đoán.")).toBeTruthy();
});

test("topic tabs switch the text", () => {
  const screen = render(<DailySkyScreen language="vi" now={now} zone={vn} />);
  const reading = dailySkyReading(dailySkyAt(now, vn), { kind: "none" }, "vi", vn);
  expect(screen.getByText(reading.topics[0].text)).toBeTruthy();
  fireEvent.press(screen.getByRole("tab", { name: "Công việc" }));
  expect(screen.getByText(reading.topics[1].text)).toBeTruthy();
  expect(screen.queryByText(reading.topics[0].text)).toBeNull();
});

test("a Sun sign gives the Moon-Sun relation and invites the birth time", () => {
  expect(relationOf("taurus", "pisces")).toBe("sextile");
  const onAddBirthTime = jest.fn();
  const screen = render(<DailySkyScreen language="vi" now={now} zone={vn} chart={sunPisces} onAddBirthTime={onAddBirthTime} />);
  expect(screen.getByText(/^Từ: Trăng ở Kim Ngưu, .*60°.* Mặt Trời của bạn \(Song Ngư\)$/)).toBeTruthy();
  expect(screen.getByText("Ước theo cung Mặt Trời")).toBeTruthy();
  fireEvent.press(screen.getByText("Thêm giờ sinh →"));
  expect(onAddBirthTime).toHaveBeenCalledTimes(1);
});

test("an exact birth time uses the Whole Sign house and its own columns", () => {
  expect(skyPersonalOf(withHouse, now)).toEqual({ kind: "house", house: 5 });
  const screen = render(<DailySkyScreen language="vi" now={now} zone={vn} chart={withHouse} />);
  expect(screen.getByText("Theo lá số của bạn")).toBeTruthy();
  expect(screen.queryByText("Thêm giờ sinh →")).toBeNull();
});

test("a Sun boundary birth date shows the change time and lets the user pick a sign for now", () => {
  const personal = skyPersonalOf(boundary, now);
  expect(personal).toMatchObject({ kind: "boundary", options: ["pisces", "aries"] });
  const screen = render(<DailySkyScreen language="vi" now={now} zone={vn} chart={boundary} onAddBirthTime={jest.fn()} />);
  expect(screen.getByText(/Song Ngư.*Bạch Dương.*20\/03\/2026/)).toBeTruthy();
  fireEvent.press(screen.getByText("Chọn tạm Bạch Dương"));
  expect(screen.getByText(/Mặt Trời của bạn \(Bạch Dương \(bạn chọn\)\)$/)).toBeTruthy();
  expect(screen.queryByText("Chọn tạm Song Ngư")).toBeNull();
});

test("sharing today's sky sends only the public sky, even when a chart is saved", () => {
  const onShare = jest.fn();
  const screen = render(<DailySkyScreen language="vi" now={now} zone={vn} chart={withHouse} onShare={onShare} />);
  fireEvent.press(screen.getByText("Chia sẻ bầu trời hôm nay"));
  expect(onShare).toHaveBeenCalledTimes(1);
  const request = onShare.mock.calls[0][0];
  const sky = dailySkyAt(now, vn);
  const publicReading = dailySkyReading(sky, { kind: "none" }, "vi", vn);
  expect(request.model.surface).toBe("daily_sky");
  expect(request.model.title).toBe("Trăng ở Kim Ngưu");
  expect(request.model.message).toBe(publicReading.headline);
  expect(request.sky).toEqual({ moonSign: "taurus", decan: sky.decan, phase: sky.phase.id, date: "2026-11-24" });
  expect(Object.keys(request).sort()).toEqual(["model", "primary", "sky"]);
  const shared = JSON.stringify(request);
  expect(shared).not.toMatch(/Song Ngư|pisces|lá số|Nhà 5|house/i);
});

test("no share button without a share handler", () => {
  const screen = render(<DailySkyScreen language="vi" now={now} zone={vn} />);
  expect(screen.queryByText("Chia sẻ bầu trời hôm nay")).toBeNull();
});

test("English labels", () => {
  const screen = render(<DailySkyScreen language="en" now={now} zone={vn} />);
  expect(screen.getByText("Moon in Taurus")).toBeTruthy();
  expect(screen.getByText("Lean toward")).toBeTruthy();
  expect(screen.getByText("Go easy on")).toBeTruthy();
});
