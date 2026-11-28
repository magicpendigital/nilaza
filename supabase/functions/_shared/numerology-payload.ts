// Bản đồ số "Báo cáo tổng hợp" (Owner decisions 2026-11-28, plan ASTRO_NUMEROLOGY_SYNTHESIS_TWO_SYSTEMS_PLAN_2026-11-28
// sections 2 and 4): the server side of the payload built by apps/mobile/src/features/numerology/aiPayload.ts
// (buildReportPayload). The request carries computed number labels, the birth-chart digits that are present (no counts),
// arrow ids and block ids only. This module refuses any other key (name, birth date, age, digit counts...), checks every
// number, checks that the arrows follow from the digits, and requires the block ids to be exactly the ones the numbers
// lead to. Block text is looked up on the server in the approved store; the model never sees text the app sent.
//
// It reuses numerology-blocks.ts read-only, so ai-numerology-message (already deployed) is unchanged.
import blocks from "../../../packages/content/data/numerology-blocks.json" with { type: "json" };
import reportCopy from "../../../packages/content/data/numerology-report.json" with { type: "json" };
import { numerologyBlockText, numerologyContentApproved, type NumerologyLanguage, type NumerologyMessageNumbers } from "./numerology-blocks.ts";

export type { NumerologyLanguage };
export type NumerologyReportNumbers = NumerologyMessageNumbers;
export type ArrowId = "1-2-3" | "4-5-6" | "7-8-9" | "1-4-7" | "2-5-8" | "3-6-9" | "1-5-9" | "3-5-7";
export type NumerologyReportChart = { digits: number[]; fullArrows: ArrowId[]; emptyArrows: ArrowId[] };
export type NumerologyReportRequest = {
  version: 1;
  feature: "numerology_report";
  language: NumerologyLanguage;
  numbers: NumerologyReportNumbers;
  chart: NumerologyReportChart;
  blockIds: string[];
};
export type ReportSectionId = "you" | "name" | "chart" | "year" | "pinnacle" | "relationship" | "questions";
export const REPORT_SECTION_IDS: readonly ReportSectionId[] = Object.freeze(["you", "name", "chart", "year", "pinnacle", "relationship", "questions"]);
export type NumerologyReportRequestError =
  | "invalid_shape" | "unknown_key" | "invalid_version" | "invalid_feature" | "invalid_language" | "invalid_number"
  | "invalid_chart" | "invalid_block_ids" | "block_not_matching";
export type NumerologyReportRequestCheck =
  | { request: NumerologyReportRequest; error?: undefined }
  | { request?: undefined; error: NumerologyReportRequestError };
export type ReportBlock = { id: string; text: string };
export type ReportSectionBlocks = { id: ReportSectionId; title: string; blocks: ReportBlock[] };

type Text = { vi: string; en: string };
type Store = {
  numbers: Record<string, { question: Text }>;
  digits: Record<string, Text>;
  arrows: Record<string, { label: Text; text: Text } | Text>;
  personalYear: Record<string, { question: Text }>;
  relationship: { numbers: Record<string, Text> };
};
const store = blocks as unknown as Store;
type ReportCopy = { review: { status?: unknown; reviewer?: unknown }; sections: Record<ReportSectionId, { title: Text }> };
const copy = reportCopy as unknown as ReportCopy;

/**
 * Content gate (plan section 4): the approved number store AND the report copy (section titles, prompt wording reviewed
 * with it) must both say approved with a named reviewer. Draft report copy never reaches a model.
 */
export function numerologyReportContentApproved(review: { status?: unknown; reviewer?: unknown } = copy.review): boolean {
  return numerologyContentApproved() && numerologyContentApproved(review);
}

const CORE = /^(?:[1-9]|11\/2|22\/4)$/;
const CYCLE = /^[1-9]$/;
const CHALLENGE = /^[0-8]$/;
export const ARROW_IDS: readonly ArrowId[] = Object.freeze(["1-2-3", "4-5-6", "7-8-9", "1-4-7", "2-5-8", "3-6-9", "1-5-9", "3-5-7"]);
const ARROW_SET = new Set<string>(ARROW_IDS);
const REPORT_BLOCK_ID = new RegExp("^(?:numbers\\.[1-9](?:\\.question)?|masters\\.(?:11|22)|personalYear\\.[1-9](?:\\.question)?|personalMonth\\.[1-9]"
  + "|pinnacles\\.stages\\.[1-4]|pinnacles\\.numbers\\.(?:[1-9]|11|22)|challenges\\.[0-8]|digits\\.[1-9]|arrows\\.(?:empty|"
  + ARROW_IDS.join("|") + ")|relationship\\.numbers\\.[1-9])$");
export const MAX_REPORT_BLOCK_IDS = 48;

const TOP_KEYS = new Set(["version", "feature", "language", "numbers", "chart", "blockIds"]);
const NUMBER_KEYS = new Set(["lifePath", "birthday", "expression", "soulUrge", "personality", "personalYear", "personalMonth", "pinnacle", "challenge"]);
const PINNACLE_KEYS = new Set(["stage", "number"]);
const CHART_KEYS = new Set(["digits", "fullArrows", "emptyArrows"]);
const NAME_KINDS = ["expression", "soulUrge", "personality"] as const;

const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const onlyKeys = (value: Record<string, unknown>, allowed: Set<string>) => Object.keys(value).every((key) => allowed.has(key));
const coreIds = (label: string): string[] => {
  const [value, root] = label.split("/");
  return root ? [`numbers.${root}`, `masters.${value}`] : [`numbers.${value}`];
};
const rootOf = (label: string) => label.split("/").pop() as string;

/** Full arrows have all three digits present; empty arrows have none (calc.ts birthGrid). */
export function arrowsFromDigits(digits: readonly number[]): { fullArrows: ArrowId[]; emptyArrows: ArrowId[] } {
  const present = new Set(digits);
  const parts = (id: ArrowId) => id.split("-").map(Number);
  return {
    fullArrows: ARROW_IDS.filter((id) => parts(id).every((digit) => present.has(digit))),
    emptyArrows: ARROW_IDS.filter((id) => parts(id).every((digit) => !present.has(digit)))
  };
}

/** The block ids each section may use, in section order. The name section exists only when name numbers were sent. */
export function reportSectionBlockIds(numbers: NumerologyReportNumbers, chart: NumerologyReportChart): Array<{ id: ReportSectionId; ids: string[] }> {
  const unique = (ids: string[]) => [...new Set(ids)];
  const sections: Array<{ id: ReportSectionId; ids: string[] }> = [
    { id: "you", ids: unique([...coreIds(numbers.lifePath), ...coreIds(numbers.birthday)]) }
  ];
  if (numbers.expression && numbers.soulUrge && numbers.personality) {
    sections.push({ id: "name", ids: unique([...coreIds(numbers.expression), ...coreIds(numbers.soulUrge), ...coreIds(numbers.personality)]) });
  }
  sections.push(
    { id: "chart", ids: [...chart.digits.map((digit) => `digits.${digit}`), ...chart.fullArrows.map((id) => `arrows.${id}`), ...(chart.emptyArrows.length ? ["arrows.empty"] : [])] },
    { id: "year", ids: [`personalYear.${numbers.personalYear}`, `personalMonth.${numbers.personalMonth}`] },
    { id: "pinnacle", ids: [`pinnacles.stages.${numbers.pinnacle.stage}`, `pinnacles.numbers.${numbers.pinnacle.number.split("/")[0]}`,
      ...(numbers.challenge !== undefined ? [`challenges.${numbers.challenge}`] : [])] },
    { id: "relationship", ids: [`relationship.numbers.${rootOf(numbers.lifePath)}`] },
    { id: "questions", ids: unique([`numbers.${rootOf(numbers.lifePath)}.question`, `numbers.${rootOf(numbers.birthday)}.question`, `personalYear.${numbers.personalYear}.question`]) }
  );
  return sections;
}

/** Every block id the sent numbers and chart lead to (the union of the sections). */
export function expectedReportBlockIds(numbers: NumerologyReportNumbers, chart: NumerologyReportChart): string[] {
  return [...new Set(reportSectionBlockIds(numbers, chart).flatMap((section) => section.ids))];
}

function checkChart(input: unknown): NumerologyReportChart | NumerologyReportRequestError {
  const chart = record(input);
  if (!chart) return "invalid_shape";
  if (!onlyKeys(chart, CHART_KEYS)) return "unknown_key";
  const { digits, fullArrows, emptyArrows } = chart;
  // Digits present only, ascending and unique: a count or a repeated digit is refused (no counts leave the phone).
  if (!Array.isArray(digits) || digits.length === 0 || digits.length > 9) return "invalid_chart";
  if (digits.some((digit, index) => !Number.isInteger(digit) || digit < 1 || digit > 9 || (index > 0 && digit <= digits[index - 1]))) return "invalid_chart";
  if (!Array.isArray(fullArrows) || !Array.isArray(emptyArrows)) return "invalid_chart";
  if ([...fullArrows, ...emptyArrows].some((id) => typeof id !== "string" || !ARROW_SET.has(id))) return "invalid_chart";
  const expected = arrowsFromDigits(digits as number[]);
  const same = (a: unknown[], b: string[]) => a.length === b.length && a.every((id, index) => id === b[index]);
  if (!same(fullArrows, expected.fullArrows) || !same(emptyArrows, expected.emptyArrows)) return "invalid_chart";
  return { digits: digits as number[], fullArrows: expected.fullArrows, emptyArrows: expected.emptyArrows };
}

/** Strict request check: exact keys at every level, valid labels, arrows that follow from the digits, exact block ids. */
export function checkNumerologyReportRequest(input: unknown): NumerologyReportRequestCheck {
  const body = record(input);
  if (!body) return { error: "invalid_shape" };
  if (!onlyKeys(body, TOP_KEYS)) return { error: "unknown_key" };
  if (body.version !== 1) return { error: "invalid_version" };
  if (body.feature !== "numerology_report") return { error: "invalid_feature" };
  if (body.language !== "vi" && body.language !== "en") return { error: "invalid_language" };
  const numbers = record(body.numbers);
  if (!numbers) return { error: "invalid_shape" };
  if (!onlyKeys(numbers, NUMBER_KEYS)) return { error: "unknown_key" };
  for (const kind of ["lifePath", "birthday"] as const) {
    if (typeof numbers[kind] !== "string" || !CORE.test(numbers[kind] as string)) return { error: "invalid_number" };
  }
  // The three name numbers come together or not at all (the app sends them only when a name was entered).
  const nameCount = NAME_KINDS.filter((kind) => numbers[kind] !== undefined).length;
  if (nameCount !== 0 && nameCount !== 3) return { error: "invalid_number" };
  for (const kind of NAME_KINDS) {
    if (numbers[kind] !== undefined && (typeof numbers[kind] !== "string" || !CORE.test(numbers[kind] as string))) return { error: "invalid_number" };
  }
  for (const kind of ["personalYear", "personalMonth"] as const) {
    if (typeof numbers[kind] !== "string" || !CYCLE.test(numbers[kind] as string)) return { error: "invalid_number" };
  }
  if (numbers.challenge !== undefined && (typeof numbers.challenge !== "string" || !CHALLENGE.test(numbers.challenge))) return { error: "invalid_number" };
  const pinnacle = record(numbers.pinnacle);
  if (!pinnacle) return { error: "invalid_shape" };
  if (!onlyKeys(pinnacle, PINNACLE_KEYS)) return { error: "unknown_key" };
  if (![1, 2, 3, 4].includes(pinnacle.stage as number)) return { error: "invalid_number" };
  if (typeof pinnacle.number !== "string" || !CORE.test(pinnacle.number)) return { error: "invalid_number" };
  const chart = checkChart(body.chart);
  if (typeof chart === "string") return { error: chart };
  const ids = body.blockIds;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_REPORT_BLOCK_IDS) return { error: "invalid_block_ids" };
  if (ids.some((id) => typeof id !== "string" || !REPORT_BLOCK_ID.test(id)) || new Set(ids).size !== ids.length) return { error: "invalid_block_ids" };
  const request: NumerologyReportRequest = {
    version: 1,
    feature: "numerology_report",
    language: body.language,
    numbers: {
      lifePath: numbers.lifePath as string,
      birthday: numbers.birthday as string,
      ...(nameCount === 3 ? {
        expression: numbers.expression as string, soulUrge: numbers.soulUrge as string, personality: numbers.personality as string
      } : {}),
      personalYear: numbers.personalYear as string,
      personalMonth: numbers.personalMonth as string,
      pinnacle: { stage: pinnacle.stage as 1 | 2 | 3 | 4, number: pinnacle.number },
      ...(numbers.challenge !== undefined ? { challenge: numbers.challenge as string } : {})
    },
    chart,
    blockIds: ids as string[]
  };
  // The report reads every block its numbers lead to: the sent ids must be exactly that set (order free).
  const expected = new Set(expectedReportBlockIds(request.numbers, request.chart));
  if (request.blockIds.length !== expected.size || request.blockIds.some((id) => !expected.has(id))) return { error: "block_not_matching" };
  return { request };
}

const pick = (text: Text | undefined, language: NumerologyLanguage) => text?.[language]?.trim() || null;

/** Approved text of one report block id (the private-message ids plus digits, arrows, relationship and questions). */
export function numerologyReportBlockText(id: string, language: NumerologyLanguage): string | null {
  if (!REPORT_BLOCK_ID.test(id)) return null;
  const parts = id.split(".");
  if (parts[0] === "numbers" && parts[2] === "question") return pick(store.numbers[parts[1]]?.question, language);
  if (parts[0] === "personalYear" && parts[2] === "question") return pick(store.personalYear[parts[1]]?.question, language);
  if (parts[0] === "digits") return pick(store.digits[parts[1]], language);
  if (parts[0] === "relationship") return pick(store.relationship.numbers[parts[2]], language);
  if (parts[0] === "arrows" && parts[1] === "empty") return pick(store.arrows.emptyNote as Text, language);
  if (parts[0] === "arrows") {
    const arrow = store.arrows[parts[1]] as { label: Text; text: Text } | undefined;
    const label = pick(arrow?.label, language), text = pick(arrow?.text, language);
    return label && text ? `${label}. ${text}` : null;
  }
  return numerologyBlockText(id, language);
}

/** The approved section title the app shows; the model's own title is never used. */
export function reportSectionTitle(id: ReportSectionId, language: NumerologyLanguage): string {
  return pick(copy.sections[id]?.title, language) ?? id;
}

/** Text for every section's blocks, in section order; null when any id cannot be resolved (refuse rather than guess). */
export function resolveReportSections(request: NumerologyReportRequest): ReportSectionBlocks[] | null {
  const sections: ReportSectionBlocks[] = [];
  for (const section of reportSectionBlockIds(request.numbers, request.chart)) {
    const resolved: ReportBlock[] = [];
    for (const id of section.ids) {
      const text = numerologyReportBlockText(id, request.language);
      if (!text) return null;
      resolved.push({ id, text });
    }
    sections.push({ id: section.id, title: reportSectionTitle(section.id, request.language), blocks: resolved });
  }
  return sections;
}
