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
import { challenges, currentPinnacleIndex, personalCycles, pinnacles, type CalendarDay, type NumerologyMap, type NumerologyNumber } from "./calc";

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
