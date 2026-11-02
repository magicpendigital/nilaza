import { astrologyExportSummary } from "../AstrologyExperience";

test("the backup is described in plain words instead of raw JSON (analysis AS-05)", () => {
  const text = JSON.stringify({ version: 2, reports: [{}, {}], notes: [{}], library: { bookmarks: [], completed: ["aries"], lastChapter: null } });
  expect(astrologyExportSummary(text, true)).toBe("Tệp sao lưu gồm 2 lá số, 1 suy ngẫm và 1 chương thần thoại đã đọc.");
  expect(astrologyExportSummary("not json", false)).toBe("The backup holds 0 charts, 0 reflections and 0 mythology chapters read.");
});
