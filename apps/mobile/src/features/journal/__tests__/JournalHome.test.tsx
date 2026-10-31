import React from "react";
import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { JournalHome, promptForDay, sevenDayMoods } from "../JournalHome";
import type { JournalEntry } from "../../../types";

const now = new Date("2026-10-31T12:00:00");
const entry = (id: string, createdAt: string, sourceType: JournalEntry["sourceType"], extra: Partial<JournalEntry> = {}): JournalEntry =>
  ({ id, createdAt, sourceType, title: `Title ${id}`, summary: `Summary ${id}`, ...extra });
const entries = [
  entry("a", "2026-10-31T08:12:00", "daily", { title: "Ngôi Sao" }),
  entry("b", "2026-10-31T00:49:00", "manual", { mood: "reflective", title: "Một buổi tối yên" }),
  entry("c", "2026-10-30T21:30:00", "tarot", { title: "Điều mình cần để thấy an toàn" }),
  entry("d", "2026-10-27T09:00:00", "chat", { mood: "reflective" }),
  entry("e", "2026-10-28T09:00:00", "manual", { mood: "calm" })
];
const labels: Record<string, string> = { reflective: "Suy ngẫm", calm: "Bình an" };
const sources: Record<string, string> = { daily: "Hôm nay", manual: "Ghi chú", tarot: "Trải bài", chat: "Trò chuyện", astrology: "Chiêm tinh", share_card: "Chia sẻ" };

function renderJournal(list = entries) {
  const onWrite = jest.fn();
  const onOpenEntry = jest.fn();
  const screen = render(
    <JournalHome language="vi" now={now} entries={list} moodLabel={(mood) => labels[mood] ?? mood} sourceLabel={(type) => sources[type]}
      bodyOf={(item) => item.summary} onWrite={onWrite} onOpenEntry={onOpenEntry} empty={<Text>Trống</Text>} />
  );
  return { screen, onWrite, onOpenEntry };
}

test("the week strip uses only moods the user picked, and the weekly line names the most frequent", () => {
  const days = sevenDayMoods(entries, now);
  expect(days.map((day) => day.mood)).toEqual([undefined, undefined, "reflective", "calm", undefined, undefined, "reflective"]);
  const { screen } = renderJournal();
  expect(screen.getByText(/Tuần này bạn hay thấy/)).toBeTruthy();
  expect(screen.getByText("suy ngẫm")).toBeTruthy();
  expect(screen.getByText(/Điều gì đang cần được nói ra\?/)).toBeTruthy();
});

test("today's question writes with the prompt and Câu khác moves to the next one", () => {
  const { screen, onWrite } = renderJournal();
  const first = promptForDay(now, 0).vi;
  expect(screen.getByText(first)).toBeTruthy();
  fireEvent.press(screen.getByText("Câu khác"));
  const second = promptForDay(now, 1).vi;
  expect(screen.getByText(second)).toBeTruthy();
  fireEvent.press(screen.getByText("Viết vài dòng"));
  expect(onWrite).toHaveBeenCalledWith(second);
});

test("entries are grouped by day and the chips filter by source", () => {
  const { screen, onOpenEntry } = renderJournal();
  expect(screen.getByText("Hôm nay · 31/10")).toBeTruthy();
  expect(screen.getByText("Hôm qua · 30/10")).toBeTruthy();
  expect(screen.getByText("GHI CHÚ · SUY NGẪM")).toBeTruthy();
  fireEvent.press(screen.getByText("Lá bài"));
  expect(screen.getByText("Ngôi Sao")).toBeTruthy();
  expect(screen.getByText("Điều mình cần để thấy an toàn")).toBeTruthy();
  expect(screen.queryByText("Một buổi tối yên")).toBeNull();
  fireEvent.press(screen.getByText("Ngôi Sao"));
  expect(onOpenEntry).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
});

test("an empty journal shows the empty state and a weekly invitation", () => {
  const { screen } = renderJournal([]);
  expect(screen.getByText("Trống")).toBeTruthy();
  expect(screen.getByText("Khi viết, bạn có thể chọn một cảm xúc để nhìn lại tuần của mình.")).toBeTruthy();
});
