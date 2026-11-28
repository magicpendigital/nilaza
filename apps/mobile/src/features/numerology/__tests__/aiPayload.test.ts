import { buildNumerologyMap, parseBirthDate } from "../calc";
import { buildPrivateMessagePayload, buildReportPayload, reportSectionBlockIds } from "../aiPayload";
import { reportNumbersHash } from "../reportStore";

const today = parseBirthDate("2026-11-23")!;

test("the payload holds numbers, block ids, language and version only", () => {
  const map = buildNumerologyMap("2000-03-15", "Phạm Gia Linh")!;
  const payload = buildPrivateMessagePayload(map, today, "vi");
  expect(payload).toEqual({
    version: 1,
    feature: "numerology_private_message",
    language: "vi",
    numbers: {
      lifePath: "11/2",
      birthday: "6",
      expression: "8",
      soulUrge: "2",
      personality: "6",
      personalYear: "1",
      personalMonth: "3",
      pinnacle: { stage: 1, number: "9" },
      challenge: "3"
    },
    blockIds: ["numbers.2", "masters.11", "numbers.6", "numbers.8", "personalYear.1", "personalMonth.3", "pinnacles.stages.1", "pinnacles.numbers.9", "challenges.3"]
  });
});

test("without a name the name numbers are absent", () => {
  const payload = buildPrivateMessagePayload(buildNumerologyMap("2000-03-15")!, today, "en");
  expect(payload.numbers.expression).toBeUndefined();
  expect(payload.numbers.soulUrge).toBeUndefined();
  expect(payload.numbers.personality).toBeUndefined();
  expect(payload.language).toBe("en");
});

test("the serialized payload never contains the name, the normalized name, the birth date, the year or the age", () => {
  const name = "Nguyễn Khánh Linh";
  const map = buildNumerologyMap("2000-03-15", name)!;
  const text = JSON.stringify(buildPrivateMessagePayload(map, today, "vi"));
  const forbidden = [
    name, "Nguyễn", "Khánh", "Linh", "NGUYEN", "KHANH", "LINH", map.name!.normalized,
    "2000-03-15", "15/03", "15-03", "03/15", "2000", "15.03", "\"15\"", "\"26\"",
    String(map.name!.totals.all), String(map.name!.totals.vowels), String(map.name!.totals.consonants)
  ];
  for (const secret of forbidden) expect(text).not.toContain(secret);
  // Only the agreed keys exist: nothing named after a birth date, a name or an age can slip in.
  const payload = JSON.parse(text);
  expect(Object.keys(payload).sort()).toEqual(["blockIds", "feature", "language", "numbers", "version"]);
  expect(Object.keys(payload.numbers).sort()).toEqual(
    ["birthday", "challenge", "expression", "lifePath", "personalMonth", "personalYear", "personality", "pinnacle", "soulUrge"]
  );
  // No value in the payload is a four-digit year.
  expect(text).not.toMatch(/\b(19|20)\d{2}\b/);
});

test("master numbers add their shade block and pinnacle ids follow the stage", () => {
  const map = buildNumerologyMap("2005-09-22")!; // G08: pinnacles 4, 11/2, 6, 7; ages 0-34 then 35-43
  const payload = buildPrivateMessagePayload(map, parseBirthDate("2041-01-01")!, "vi");
  expect(payload.numbers.pinnacle).toEqual({ stage: 2, number: "11/2" });
  expect(payload.blockIds).toContain("pinnacles.numbers.11");
  expect(payload.blockIds).toContain("masters.22"); // birthday 22/4
});

describe("report payload (2026-11-28, R1)", () => {
  test("holds numbers, the digits present, the arrows and the section block ids only", () => {
    const map = buildNumerologyMap("2000-03-15", "Phạm Gia Linh")!;
    const payload = buildReportPayload(map, today, "vi");
    expect(payload).toEqual({
      version: 1,
      feature: "numerology_report",
      language: "vi",
      numbers: {
        lifePath: "11/2", birthday: "6", expression: "8", soulUrge: "2", personality: "6",
        personalYear: "1", personalMonth: "3", pinnacle: { stage: 1, number: "9" }, challenge: "3"
      },
      chart: { digits: [1, 2, 3, 5], fullArrows: ["1-2-3"], emptyArrows: ["7-8-9"] },
      blockIds: [
        "numbers.2", "masters.11", "numbers.6", "numbers.8",
        "digits.1", "digits.2", "digits.3", "digits.5", "arrows.1-2-3", "arrows.empty",
        "personalYear.1", "personalMonth.3", "pinnacles.stages.1", "pinnacles.numbers.9", "challenges.3",
        "relationship.numbers.2", "numbers.2.question", "numbers.6.question", "personalYear.1.question"
      ]
    });
  });

  test("without a name there is no name section and no name number", () => {
    const payload = buildReportPayload(buildNumerologyMap("2000-03-15")!, today, "en");
    expect(payload.numbers.expression).toBeUndefined();
    expect(reportSectionBlockIds(payload.numbers, payload.chart).map((section) => section.id))
      .toEqual(["you", "chart", "year", "pinnacle", "relationship", "questions"]);
  });

  test("the serialized report payload never contains the name, the birth date, the year, the age, counts or letter totals", () => {
    const name = "Nguyễn Khánh Linh";
    const map = buildNumerologyMap("1999-11-29", name)!; // 9 appears three times: a count must not leave the phone
    const text = JSON.stringify(buildReportPayload(map, today, "vi"));
    const forbidden = [
      name, "Nguyễn", "Khánh", "Linh", "NGUYEN", "KHANH", "LINH", map.name!.normalized,
      "1999-11-29", "29/11", "29-11", "11/29", "1999", "29.11", "\"29\"", "\"27\"", "\"26\"", "counts",
      String(map.name!.totals.all), String(map.name!.totals.vowels), String(map.name!.totals.consonants)
    ];
    for (const secret of forbidden) expect(text).not.toContain(secret);
    const payload = JSON.parse(text);
    expect(Object.keys(payload).sort()).toEqual(["blockIds", "chart", "feature", "language", "numbers", "version"]);
    expect(Object.keys(payload.chart).sort()).toEqual(["digits", "emptyArrows", "fullArrows"]);
    expect(payload.chart.digits).toEqual([1, 2, 9]); // each present digit once, ascending
    expect(text).not.toMatch(/\b(19|20)\d{2}\b/);
  });

  test("the hash changes with the personal year or the name, not with the personal month or the language", () => {
    const map = buildNumerologyMap("2000-03-15", "Phạm Gia Linh")!;
    const base = reportNumbersHash(buildReportPayload(map, today, "vi"));
    expect(reportNumbersHash(buildReportPayload(map, parseBirthDate("2026-12-23")!, "en"))).toBe(base); // other month, other language
    expect(reportNumbersHash(buildReportPayload(map, parseBirthDate("2027-01-05")!, "vi"))).not.toBe(base); // new personal year
    expect(reportNumbersHash(buildReportPayload(buildNumerologyMap("2000-03-15")!, today, "vi"))).not.toBe(base); // name removed
  });
});
