import { certainSigns, consecutiveJournalWeeks, displayBirthDate, identityChips, oneSentence, recordedSummary, RECORDED_THRESHOLD } from "../whoAmIModel";

const chart = (birthTimeKnown: boolean, moon: string[] = ["cancer"]) => ({
  placements: birthTimeKnown ? [{ body: "sun", sign: "pisces" }, { body: "moon", sign: moon[0] }] : [],
  angles: birthTimeKnown ? [{ body: "ascendant", sign: "leo" }] : [],
  sampledRanges: birthTimeKnown ? [] : [{ body: "sun", possibleSigns: ["pisces"] }, { body: "moon", possibleSigns: moon }],
  houses: [],
  time: { birthTimeKnown, precision: birthTimeKnown ? "exact" : "unknown" }
}) as any;

test("only certain signs become chips; Rising needs an exact time; no chart means no chip", () => {
  expect(certainSigns(chart(true))).toEqual({ sun: "pisces", moon: "cancer", rising: "leo" });
  // Unknown time and the Moon changed signs that day: Moon and Rising are hidden, not guessed.
  expect(certainSigns(chart(false, ["cancer", "leo"]))).toEqual({ sun: "pisces" });
  expect(certainSigns(undefined)).toEqual({});
  expect(identityChips(certainSigns(chart(true)), "vi").map((chip) => chip.accessibilityLabel)).toEqual(["Mặt Trời Song Ngư", "Mặt Trăng Cự Giải", "Cung Mọc Sư Tử"]);
  expect(identityChips({}, "vi")).toEqual([]);
});

test("the life-path chip appears only when Lô 3 supplies a value", () => {
  expect(identityChips({ sun: "aries" }, "vi").map((chip) => chip.key)).toEqual(["sun"]);
  expect(identityChips({ sun: "aries" }, "vi", "11/2").at(-1)).toEqual({ key: "lifePath", label: "11/2", accessibilityLabel: "Số chủ đạo 11/2" });
});

test("one line is joined from the approved big-3 templates and names its sources", () => {
  expect(oneSentence({ sun: "pisces", moon: "cancer" }, "vi")).toEqual({
    sentence: "Người mơ mộng biết cách che chở.",
    sources: ["Mặt Trời Song Ngư: “Người mơ mộng”", "Mặt Trăng Cự Giải: “biết cách che chở”"]
  });
  expect(oneSentence({ sun: "aries", moon: "aries" }, "en")?.sentence).toBe("The pioneer who is upfront about feelings.");
  // Without a certain Moon there is not enough data, so nothing is shown.
  expect(oneSentence({ sun: "pisces" }, "vi")).toBeNull();
  expect(oneSentence({}, "vi")).toBeNull();
});

describe("consecutive journal weeks (Monday to Sunday, device time)", () => {
  // Wednesday 25 November 2026, local time.
  const now = new Date(2026, 10, 25, 12, 0);
  const at = (month: number, day: number, hour = 10) => new Date(2026, month, day, hour).toISOString();

  test("counts weeks in a row ending this week", () => {
    expect(consecutiveJournalWeeks([at(10, 24), at(10, 17), at(10, 10)], now)).toBe(3);
  });
  test("an unfinished week does not reset a run that ended last week", () => {
    expect(consecutiveJournalWeeks([at(10, 22), at(10, 15)], now)).toBe(2);
  });
  test("a gap breaks the run", () => {
    expect(consecutiveJournalWeeks([at(10, 24), at(10, 10)], now)).toBe(1);
    expect(consecutiveJournalWeeks([at(10, 8)], now)).toBe(0);
  });
  test("Monday starts a new week and Sunday ends one", () => {
    // Sunday 22 Nov and Monday 23 Nov are different weeks.
    expect(consecutiveJournalWeeks([at(10, 23, 0), at(10, 22, 23)], now)).toBe(2);
  });
  test("several entries in one week count once; bad and future dates are ignored", () => {
    expect(consecutiveJournalWeeks([at(10, 23), at(10, 24), "not a date", new Date(2026, 11, 2).toISOString()], now)).toBe(1);
  });
  test("runs across a year boundary", () => {
    const jan = new Date(2027, 0, 6, 12);
    expect(consecutiveJournalWeeks([new Date(2027, 0, 5).toISOString(), new Date(2026, 11, 30).toISOString(), new Date(2026, 11, 22).toISOString()], jan)).toBe(3);
  });
});

test("Nilaza đã ghi lại waits for 5 journal entries and then shows counts only", () => {
  const now = new Date(2026, 10, 25, 12);
  const entry = (sourceType: "tarot" | "manual", day: number) => ({ sourceType, createdAt: new Date(2026, 10, day, 9).toISOString() });
  expect(RECORDED_THRESHOLD).toBe(5);
  expect(recordedSummary([], now)).toEqual({ ready: false, remaining: 5 });
  expect(recordedSummary([entry("manual", 24), entry("tarot", 23), entry("manual", 20), entry("manual", 19)], now)).toEqual({ ready: false, remaining: 1 });
  expect(recordedSummary([entry("manual", 24), entry("tarot", 23), entry("tarot", 20), entry("manual", 12), entry("manual", 5)], now))
    .toEqual({ ready: true, journal: 5, readings: 2, weeks: 4 });
});

test("birth dates show as DD/MM/YYYY", () => {
  expect(displayBirthDate("2000-03-15")).toBe("15/03/2000");
  expect(displayBirthDate(" 15/03/2000 ")).toBe("15/03/2000");
});
