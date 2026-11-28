import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  arrowsFromDigits, checkNumerologyReportRequest, expectedReportBlockIds, numerologyReportBlockText, numerologyReportContentApproved,
  reportSectionBlockIds, resolveReportSections
} from "./numerology-payload.ts";

const numbers = { lifePath: "11/2", birthday: "7", personalYear: "3", personalMonth: "5", pinnacle: { stage: 1 as const, number: "4" }, challenge: "2" };
const chart = { digits: [1, 2, 3, 9], fullArrows: ["1-2-3" as const], emptyArrows: ["4-5-6" as const] };
const ids = [
  "numbers.2", "masters.11", "numbers.7",
  "digits.1", "digits.2", "digits.3", "digits.9", "arrows.1-2-3", "arrows.empty",
  "personalYear.3", "personalMonth.5",
  "pinnacles.stages.1", "pinnacles.numbers.4", "challenges.2",
  "relationship.numbers.2",
  "numbers.2.question", "numbers.7.question", "personalYear.3.question"
];
const body = (patch: Record<string, unknown> = {}) => ({ version: 1, feature: "numerology_report", language: "vi", numbers, chart, blockIds: ids, ...patch });

Deno.test("arrows follow from the digits present: full when all three are present, empty when none is", () => {
  assertEquals(arrowsFromDigits([1, 2, 3, 9]), { fullArrows: ["1-2-3"], emptyArrows: ["4-5-6"] });
  assertEquals(arrowsFromDigits([1, 2, 3, 4, 5, 6, 7, 8, 9]).emptyArrows, []);
  assertEquals(arrowsFromDigits([5]).fullArrows, []);
});

Deno.test("sections and their block ids: six without a name, seven with one, in the fixed order", () => {
  const sections = reportSectionBlockIds(numbers, chart);
  assertEquals(sections.map((section) => section.id), ["you", "chart", "year", "pinnacle", "relationship", "questions"]);
  assertEquals(expectedReportBlockIds(numbers, chart).sort(), [...ids].sort());
  const named = reportSectionBlockIds({ ...numbers, expression: "22/4", soulUrge: "4", personality: "9" }, chart);
  assertEquals(named.map((section) => section.id), ["you", "name", "chart", "year", "pinnacle", "relationship", "questions"]);
  assertEquals(named[1].ids, ["numbers.4", "masters.22", "numbers.9"]);
});

Deno.test("a valid request passes; ids may come in any order", () => {
  const checked = checkNumerologyReportRequest(body({ blockIds: [...ids].reverse() }));
  assert(checked.request);
  assertEquals(checked.request.chart, chart);
  const named = { ...numbers, expression: "5", soulUrge: "1", personality: "4" };
  const namedIds = expectedReportBlockIds(named, chart);
  assert(checkNumerologyReportRequest(body({ numbers: named, blockIds: namedIds })).request);
});

Deno.test("personal data, counts and anything not derived from the numbers are refused", () => {
  const cases: Array<[unknown, string]> = [
    [null, "invalid_shape"],
    [[1], "invalid_shape"],
    [body({ name: "An" }), "unknown_key"],
    [body({ birthDate: "1990-01-01" }), "unknown_key"],
    [body({ numbers: { ...numbers, age: 36 } }), "unknown_key"],
    [body({ numbers: { ...numbers, ageRange: "30-39" } }), "unknown_key"],
    [body({ numbers: { ...numbers, normalizedName: "AN" } }), "unknown_key"],
    [body({ chart: { ...chart, counts: { 1: 2 } } }), "unknown_key"],
    [body({ numbers: { ...numbers, pinnacle: { stage: 1, number: "4", age: 36 } } }), "unknown_key"],
    [body({ version: 2 }), "invalid_version"],
    [body({ feature: "numerology_private_message" }), "invalid_feature"],
    [body({ language: "fr" }), "invalid_language"],
    [body({ numbers: { ...numbers, lifePath: "13" } }), "invalid_number"],
    [body({ numbers: { ...numbers, lifePath: "33/6" } }), "invalid_number"],
    [body({ numbers: { ...numbers, personalYear: "11" } }), "invalid_number"],
    [body({ numbers: { ...numbers, challenge: "9" } }), "invalid_number"],
    [body({ numbers: { ...numbers, expression: "5" } }), "invalid_number"],
    [body({ numbers: { ...numbers, pinnacle: { stage: 5, number: "4" } } }), "invalid_number"],
    [body({ chart: { ...chart, digits: [] } }), "invalid_chart"],
    [body({ chart: { ...chart, digits: [1, 1, 2, 3, 9] } }), "invalid_chart"],
    [body({ chart: { ...chart, digits: [9, 1, 2, 3] } }), "invalid_chart"],
    [body({ chart: { ...chart, digits: [0, 1, 2, 3, 9] } }), "invalid_chart"],
    [body({ chart: { ...chart, fullArrows: [] } }), "invalid_chart"],
    [body({ chart: { ...chart, emptyArrows: ["4-5-6", "7-8-9"] } }), "invalid_chart"],
    [body({ chart: { ...chart, fullArrows: ["1-2-4"] } }), "invalid_chart"],
    [body({ blockIds: [] }), "invalid_block_ids"],
    [body({ blockIds: [...ids, "numbers.2"] }), "invalid_block_ids"],
    [body({ blockIds: [...ids.slice(1), "free text"] }), "invalid_block_ids"],
    [body({ blockIds: ids.slice(1) }), "block_not_matching"],
    [body({ blockIds: [...ids.slice(1), "numbers.9"] }), "block_not_matching"]
  ];
  for (const [input, error] of cases) assertEquals(checkNumerologyReportRequest(input).error, error, JSON.stringify(input).slice(0, 120));
});

Deno.test("every block resolves to approved server-side text, with approved section titles", () => {
  for (const language of ["vi", "en"] as const) {
    const request = checkNumerologyReportRequest(body({ language })).request!;
    const sections = resolveReportSections(request);
    assert(sections);
    assertEquals(sections.flatMap((section) => section.blocks.map((block) => block.id)).sort(), [...ids].sort());
    assert(sections.every((section) => section.blocks.every((block) => block.text.length > 10)));
    assertEquals(sections[0].title, language === "vi" ? "Con người bạn" : "Who you are");
  }
  assert(numerologyReportBlockText("arrows.1-2-3", "vi")!.includes(". "));
  assertEquals(numerologyReportBlockText("arrows.9-9-9", "vi"), null);
  assert(numerologyReportBlockText("numbers.7.question", "en")!.endsWith("?"));
});

Deno.test("the content gate needs both stores approved with a reviewer; the report copy is still a draft", () => {
  assertEquals(numerologyReportContentApproved(), false);
  assertEquals(numerologyReportContentApproved({ status: "approved", reviewer: "Owner" }), true);
  assertEquals(numerologyReportContentApproved({ status: "approved", reviewer: " " }), false);
  assertEquals(numerologyReportContentApproved({ status: "draft", reviewer: "Owner" }), false);
});

Deno.test("the exact payload the app builds (apps/mobile aiPayload.test.ts, 15/03/2000 with a name) passes the strict check", () => {
  const appPayload = {
    version: 1, feature: "numerology_report", language: "vi",
    numbers: { lifePath: "11/2", birthday: "6", expression: "8", soulUrge: "2", personality: "6", personalYear: "1", personalMonth: "3", pinnacle: { stage: 1, number: "9" }, challenge: "3" },
    chart: { digits: [1, 2, 3, 5], fullArrows: ["1-2-3"], emptyArrows: ["7-8-9"] },
    blockIds: [
      "numbers.2", "masters.11", "numbers.6", "numbers.8",
      "digits.1", "digits.2", "digits.3", "digits.5", "arrows.1-2-3", "arrows.empty",
      "personalYear.1", "personalMonth.3", "pinnacles.stages.1", "pinnacles.numbers.9", "challenges.3",
      "relationship.numbers.2", "numbers.2.question", "numbers.6.question", "personalYear.1.question"
    ]
  };
  const check = checkNumerologyReportRequest(appPayload);
  assertEquals(check.error, undefined);
  assertEquals(reportSectionBlockIds(check.request!.numbers, check.request!.chart).map((section) => section.id),
    ["you", "name", "chart", "year", "pinnacle", "relationship", "questions"]);
});
