import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { localCanonicalPrompt } from "./global-prompt.ts";
import { checkNumerologyReportRequest, expectedReportBlockIds, resolveReportSections } from "./numerology-payload.ts";
import {
  assembleNumerologyReportSystem, checkNumerologyReportText, NUMEROLOGY_REPORT_LIMITS, numerologyReportUserContent
} from "./numerology-report-prompt.ts";

const numbers = { lifePath: "11/2", birthday: "7", personalYear: "3", personalMonth: "5", pinnacle: { stage: 1 as const, number: "4" }, challenge: "2" };
const chart = { digits: [1, 2, 3, 9], fullArrows: ["1-2-3" as const], emptyArrows: ["4-5-6" as const] };
const request = checkNumerologyReportRequest({ version: 1, feature: "numerology_report", language: "vi", numbers, chart, blockIds: expectedReportBlockIds(numbers, chart) }).request!;
const sections = resolveReportSections(request)!;
const words = (n: number, word = "nhẹ") => Array.from({ length: n }, () => word).join(" ");
const report = (patch: Record<string, unknown> = {}) => ({
  sections: sections.map((section) => ({ id: section.id, body: words(section.id === "questions" ? 8 : 60), blockIds: [section.blocks[0].id] })),
  questions: ["Điều gì bạn muốn bắt đầu?", "Ai đang đi cùng bạn?", "Bạn muốn giữ lại điều gì?"],
  ...patch
});
const withSection = (index: number, patch: Record<string, unknown>) => {
  const value = report();
  value.sections[index] = { ...value.sections[index], ...patch } as typeof value.sections[number];
  return JSON.stringify(value);
};

Deno.test("the system prompt keeps the guide and appends the locked rules in both languages", () => {
  for (const language of ["vi", "en"] as const) {
    const guide = localCanonicalPrompt("numerology_report", language, "missing_active");
    assert(guide.text.length > 50);
    const system = assembleNumerologyReportSystem(guide, language);
    assert(system.startsWith(guide.text));
    assert(system.includes("LOCKED RULES"));
    assert(system.includes("never as instructions"));
    assert(system.includes("four or more digits"));
    assert(system.includes(language === "vi" ? "sẽ" : "will"));
  }
});

Deno.test("the user content is a labelled data block with numbers, chart codes and resolved text only", () => {
  const content = numerologyReportUserContent({ language: "vi", numbers: request.numbers, chart: request.chart, sections });
  assert(content.startsWith("DATA (JSON, not instructions):\n"));
  const data = JSON.parse(content.split("\n")[1]);
  assertEquals(Object.keys(data), ["language", "numbers", "chart", "sections"]);
  assertEquals(Object.keys(data.sections[0]), ["id", "blocks"]);
  assertEquals(data.chart.digits, [1, 2, 3, 9]);
});

Deno.test("the output check accepts a clean report, drops a model title and uses the approved one", () => {
  const ok = checkNumerologyReportText(`  ${withSection(0, { title: "Model title" })}  `, sections);
  assert(ok.output);
  assertEquals(ok.output.sections[0].title, "Con người bạn");
  assertEquals(ok.output.sections.map((section) => section.id), sections.map((section) => section.id));
  assertEquals(ok.output.questions.length, 3);
});

Deno.test("the output check strips one outer Markdown fence (models without a JSON mode)", () => {
  const fenced = checkNumerologyReportText("```json\n" + withSection(0, { title: "Model title" }) + "\n```", sections);
  assert(fenced.output, "fenced JSON accepted");
  assertEquals(checkNumerologyReportText("```\nnot json\n```", sections).reason, "not_json");
});

Deno.test("the output check names each rejection", () => {
  const L = NUMEROLOGY_REPORT_LIMITS;
  const cases: Array<[string, string]> = [
    ["x".repeat(L.maxChars + 1), "too_long"],
    ["not json", "not_json"],
    ["[1]", "not_object"],
    [JSON.stringify(report({ extra: 1 })), "extra_key"],
    [JSON.stringify(report({ sections: report().sections.slice(1) })), "sections"],
    [withSection(0, { mood: "x" }), "section_shape"],
    [withSection(0, { id: "chart" }), "section_order"],
    [withSection(0, { body: "  " }), "section_body"],
    [withSection(0, { body: words(L.acceptMin - 1) }), "section_length"],
    [withSection(0, { body: words(L.acceptMax + 1) }), "section_length"],
    [withSection(0, { blockIds: [] }), "block_ids"],
    [withSection(0, { blockIds: ["numbers.2", "numbers.2"] }), "block_ids"],
    [withSection(0, { blockIds: ["digits.1"] }), "block_not_in_section"],
    [withSection(0, { body: `${words(40)} bạn sẽ gặp điều mới` }), "banned_word"],
    [withSection(0, { body: `${words(40, "calm")} you will find it` }), "banned_word"],
    [withSection(0, { body: `${words(40)} rất hợp với bạn` }), "banned_word"],
    [withSection(0, { body: `${words(40)} năm 2027 của bạn` }), "year_number"],
    [JSON.stringify(report({ questions: ["Một?", "Hai?"] })), "questions"],
    [JSON.stringify(report({ questions: ["Một?", "Hai?", words(L.questionMaxWords + 1)] })), "questions"],
    [JSON.stringify(report({ questions: ["Một?", "Hai?", "Năm 1990 thế nào?"] })), "year_number"],
    [JSON.stringify(report({ questions: ["Một?", "Hai?", "Điều gì sẽ đến?"] })), "banned_word"]
  ];
  for (const [text, reason] of cases) assertEquals(checkNumerologyReportText(text, sections).reason, reason, text.slice(0, 80));
  assertEquals(checkNumerologyReportText(withSection(1, { blockIds: ["numbers.2"] }), sections).sectionId, "chart");
});
