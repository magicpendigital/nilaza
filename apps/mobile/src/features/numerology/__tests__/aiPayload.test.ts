import { buildNumerologyMap, parseBirthDate } from "../calc";
import { buildPrivateMessagePayload } from "../aiPayload";

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
