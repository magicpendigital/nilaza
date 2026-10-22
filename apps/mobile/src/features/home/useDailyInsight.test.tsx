import { renderHook } from "@testing-library/react-native";
import { useDailyInsight } from "./useDailyInsight";
import type { DailyInsight, JournalEntry, Profile } from "../../types";

test("yesterday's cached insight cannot reset today's reveal state on restart", () => {
  const profile = {} as Profile;
  const entries: JournalEntry[] = [];
  const yesterday = { dateKey: "2026-09-15" } as DailyInsight;
  const today = { dateKey: "2026-09-16" } as DailyInsight;
  const build = jest.fn(() => today);
  const { result, rerender } = renderHook(({ saved }: { saved: DailyInsight }) =>
    useDailyInsight(saved, profile, entries, "vi", today.dateKey, build),
    { initialProps: { saved: yesterday } });
  expect(result.current.dateKey).toBe(today.dateKey);
  expect(result.current).not.toBe(yesterday);
  rerender({ saved: yesterday });
  expect(build).toHaveBeenCalledTimes(1);
  rerender({ saved: today });
  expect(result.current).toBe(today);
  expect(build).toHaveBeenCalledTimes(1);
});

test("missing saved insight stays stable across navigation and request-result renders", () => {
  const profile = {} as Profile;
  const entries: JournalEntry[] = [];
  const build = jest.fn(() => ({ dateKey: "2026-09-06" } as DailyInsight));
  const { result, rerender } = renderHook(({ day, saved }: { day: string; saved: DailyInsight | null }) =>
    useDailyInsight(saved, profile, entries, "vi", day, build),
  { initialProps: { day: "2026-09-06", saved: null as DailyInsight | null } });
  const first = result.current;
  for (let i = 0; i < 10; i++) rerender({ day: "2026-09-06", saved: null });
  expect(result.current).toBe(first);
  expect(build).toHaveBeenCalledTimes(1);
  rerender({ day: "2026-09-07", saved: null });
  expect(result.current).not.toBe(first);
  expect(build).toHaveBeenCalledTimes(2);
  const saved = { dateKey: "2026-09-07" } as DailyInsight;
  rerender({ day: "2026-09-07", saved });
  expect(result.current).toBe(saved);
  expect(build).toHaveBeenCalledTimes(2);
});
