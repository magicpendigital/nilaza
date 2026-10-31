import rhythmData from "../../../../../../packages/content/data/home-daily-rhythm.json";
import { dailyRhythmFor } from "../dailyRhythm";

test("consecutive days never repeat and the bank cycles every 30 days", () => {
  const ids = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 9, 1 + index)).toISOString().slice(0, 10);
    return dailyRhythmFor(date, "vi").id;
  });
  expect(new Set(ids).size).toBe(rhythmData.days.length);
  expect(dailyRhythmFor("2026-10-01", "vi").id).toBe(dailyRhythmFor("2026-10-31", "vi").id);
  expect(dailyRhythmFor("2026-10-31", "vi").id).not.toBe(dailyRhythmFor("2026-11-01", "vi").id);
});

test("text follows the app language", () => {
  const vi = dailyRhythmFor("2026-10-31", "vi"), en = dailyRhythmFor("2026-10-31", "en");
  expect(vi.id).toBe(en.id);
  expect(vi.pause).not.toBe(en.pause);
});
