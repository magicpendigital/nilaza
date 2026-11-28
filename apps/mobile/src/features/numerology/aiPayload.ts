// Lô 5: the request body of the "Lời nhắn riêng" AI call (proposal section 5).
//
// 2026-11-25 (B1-B8): NumerologyScreen builds it only after the consent box ("Gửi") on a signed-in account and posts it
// to ai-numerology-message (backendClient.requestNumerologyMessage). The server switch is seeded off and the function
// refuses while the content review is a draft; see docs/proposals/NUMEROLOGY_AI_PRIVATE_MESSAGE_BACKEND_2026-11-25.vi.md.
//
// Privacy contract: the payload holds computed number labels, content block ids, the language and a version only.
// It never holds the name, the normalized name, the birth date, the birth year, the age or the letter totals.
// __tests__/aiPayload.test.ts checks the serialized payload for each of those.
import type { Language } from "../../types";
import { challenges, currentPinnacleIndex, personalCycles, pinnacles, type ArrowId, type CalendarDay, type NumerologyMap, type NumerologyNumber } from "./calc";

export type PrivateMessagePayload = {
  version: 1;
  feature: "numerology_private_message";
  language: Language;
  numbers: {
    lifePath: string;
    birthday: string;
    expression?: string;
    soulUrge?: string;
    personality?: string;
    personalYear: string;
    personalMonth: string;
    pinnacle: { stage: 1 | 2 | 3 | 4; number: string };
    challenge?: string;
  };
  /** Keys of packages/content/data/numerology-blocks.json, e.g. "numbers.2", "masters.11", "personalYear.1". */
  blockIds: string[];
};

const numberIds = (number: NumerologyNumber) => [`numbers.${number.root}`, ...(number.master ? [`masters.${number.value}`] : [])];

export function buildPrivateMessagePayload(map: NumerologyMap, today: CalendarDay, language: Language): PrivateMessagePayload {
  const cycles = personalCycles(map.birth, today);
  const index = currentPinnacleIndex(map.birth, today);
  const pinnacle = pinnacles(map.birth)[index];
  // The challenge that matches the current stage (C1..C4 follow the same four stages).
  const challenge = challenges(map.birth)[index];
  const ids = new Set<string>([
    ...numberIds(map.lifePath),
    ...numberIds(map.birthday),
    ...(map.name ? [...numberIds(map.name.expression), ...numberIds(map.name.soulUrge), ...numberIds(map.name.personality)] : []),
    `personalYear.${cycles.year}`,
    `personalMonth.${cycles.month}`,
    `pinnacles.stages.${pinnacle.stage}`,
    `pinnacles.numbers.${pinnacle.number.value}`,
    `challenges.${challenge}`
  ]);
  return {
    version: 1,
    feature: "numerology_private_message",
    language,
    numbers: {
      lifePath: map.lifePath.label,
      birthday: map.birthday.label,
      ...(map.name ? { expression: map.name.expression.label, soulUrge: map.name.soulUrge.label, personality: map.name.personality.label } : {}),
      personalYear: String(cycles.year),
      personalMonth: String(cycles.month),
      pinnacle: { stage: pinnacle.stage, number: pinnacle.number.label },
      challenge: String(challenge)
    },
    blockIds: [...ids]
  };
}

// 2026-11-28 (R1): the request body of the "Báo cáo tổng hợp" AI call (ai-numerology-report). Same privacy contract as
// above: computed labels, the digits present in the birth chart (no counts), the arrows that follow from them, block ids,
// the language and a version. Never the name, the normalized name, the day, month or year, the age or letter totals.
// The section rules mirror supabase/functions/_shared/numerology-payload.ts reportSectionBlockIds; the server refuses a
// payload whose block ids differ from the set its own rules produce (block_not_matching).
export type ReportSectionId = "you" | "name" | "chart" | "year" | "pinnacle" | "relationship" | "questions";
export const reportSectionIds: readonly ReportSectionId[] = ["you", "name", "chart", "year", "pinnacle", "relationship", "questions"];

export type ReportPayload = {
  version: 1;
  feature: "numerology_report";
  language: Language;
  numbers: PrivateMessagePayload["numbers"];
  chart: { digits: number[]; fullArrows: ArrowId[]; emptyArrows: ArrowId[] };
  blockIds: string[];
};

const coreIds = (label: string): string[] => {
  const [value, root] = label.split("/");
  return root ? [`numbers.${root}`, `masters.${value}`] : [`numbers.${value}`];
};
const rootOf = (label: string) => label.split("/").pop() as string;

/** The block ids each report section reads, in section order (the name section only when name numbers exist). */
export function reportSectionBlockIds(numbers: ReportPayload["numbers"], chart: ReportPayload["chart"]): Array<{ id: ReportSectionId; ids: string[] }> {
  const unique = (ids: string[]) => [...new Set(ids)];
  const sections: Array<{ id: ReportSectionId; ids: string[] }> = [{ id: "you", ids: unique([...coreIds(numbers.lifePath), ...coreIds(numbers.birthday)]) }];
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

export function buildReportPayload(map: NumerologyMap, today: CalendarDay, language: Language): ReportPayload {
  const { numbers } = buildPrivateMessagePayload(map, today, language);
  // Digits present only, ascending; how often a digit appears stays on the phone.
  const digits = Object.keys(map.grid.counts).map(Number).filter((digit) => (map.grid.counts[digit] ?? 0) > 0).sort((a, b) => a - b);
  const chart = { digits, fullArrows: [...map.grid.full], emptyArrows: [...map.grid.empty] };
  const blockIds = [...new Set(reportSectionBlockIds(numbers, chart).flatMap((section) => section.ids))];
  return { version: 1, feature: "numerology_report", language, numbers, chart, blockIds };
}
