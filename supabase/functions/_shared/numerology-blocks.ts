// Bản đồ số "Lời nhắn riêng" (Owner approval 2026-11-25): the server side of the payload built by
// apps/mobile/src/features/numerology/aiPayload.ts. The request carries computed number labels and block ids only;
// this module refuses any other key (name, birth date, age...), checks every number, checks that each block id follows
// from the numbers sent, and looks the block text up in the approved store on the server. The model never sees a
// block id the server did not resolve, and never sees text the app sent.
import blocks from "../../../packages/content/data/numerology-blocks.json" with { type: "json" };

export type NumerologyLanguage = "vi" | "en";
export type NumerologyMessageNumbers = {
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
export type NumerologyMessageRequest = {
  version: 1;
  feature: "numerology_private_message";
  language: NumerologyLanguage;
  numbers: NumerologyMessageNumbers;
  blockIds: string[];
};
export type NumerologyRequestError =
  | "invalid_shape" | "unknown_key" | "invalid_version" | "invalid_feature" | "invalid_language" | "invalid_number"
  | "invalid_block_ids" | "block_not_matching";
export type NumerologyRequestCheck = { request: NumerologyMessageRequest; error?: undefined } | { request?: undefined; error: NumerologyRequestError };
export type ResolvedBlock = { id: string; text: string };

type Text = { vi: string; en: string };
type Store = {
  review: { status?: unknown; reviewer?: unknown };
  numbers: Record<string, { title: Text; leans: Text; light: Text; trap: Text; question: Text }>;
  masters: Record<string, Text>;
  personalYear: Record<string, { title: Text; leans: Text; question: Text }>;
  personalMonth: Record<string, Text>;
  pinnacles: { stages: Record<string, Text>; numbers: Record<string, Text> };
  challenges: Record<string, Text>;
};
const store = blocks as unknown as Store;

/** Content gate (B1): true only when the store says approved and names a reviewer. Draft content never reaches a model. */
export function numerologyContentApproved(review: { status?: unknown; reviewer?: unknown } = store.review): boolean {
  return review.status === "approved" && typeof review.reviewer === "string" && review.reviewer.trim().length > 0;
}

/** Core numbers: 1-9, or a master number with its root label (11/2, 22/4). */
const CORE = /^(?:[1-9]|11\/2|22\/4)$/;
const CYCLE = /^[1-9]$/;
const CHALLENGE = /^[0-8]$/;
const BLOCK_ID = /^(?:numbers\.[1-9]|masters\.(?:11|22)|personalYear\.[1-9]|personalMonth\.[1-9]|pinnacles\.stages\.[1-4]|pinnacles\.numbers\.(?:[1-9]|11|22)|challenges\.[0-8])$/;
export const MAX_BLOCK_IDS = 16;

const TOP_KEYS = new Set(["version", "feature", "language", "numbers", "blockIds"]);
const NUMBER_KEYS = new Set(["lifePath", "birthday", "expression", "soulUrge", "personality", "personalYear", "personalMonth", "pinnacle", "challenge"]);
const PINNACLE_KEYS = new Set(["stage", "number"]);
const CORE_KINDS = ["lifePath", "birthday", "expression", "soulUrge", "personality"] as const;
const OPTIONAL = new Set(["expression", "soulUrge", "personality", "challenge"]);

const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const onlyKeys = (value: Record<string, unknown>, allowed: Set<string>) => Object.keys(value).every((key) => allowed.has(key));

/** Block ids a core label leads to: "11/2" is numbers.2 and masters.11, "7" is numbers.7. */
function coreIds(label: string): string[] {
  const [value, root] = label.split("/");
  return root ? [`numbers.${root}`, `masters.${value}`] : [`numbers.${value}`];
}

/** Every block id the sent numbers lead to, in the order aiPayload.ts builds them. */
export function expectedBlockIds(numbers: NumerologyMessageNumbers): string[] {
  const ids = new Set<string>();
  for (const kind of CORE_KINDS) {
    const label = numbers[kind];
    if (label !== undefined) coreIds(label).forEach((id) => ids.add(id));
  }
  ids.add(`personalYear.${numbers.personalYear}`);
  ids.add(`personalMonth.${numbers.personalMonth}`);
  ids.add(`pinnacles.stages.${numbers.pinnacle.stage}`);
  ids.add(`pinnacles.numbers.${numbers.pinnacle.number.split("/")[0]}`);
  if (numbers.challenge !== undefined) ids.add(`challenges.${numbers.challenge}`);
  return [...ids];
}

/** Strict request check: exact keys at every level, valid labels, and block ids that follow from the numbers. */
export function checkNumerologyRequest(input: unknown): NumerologyRequestCheck {
  const body = record(input);
  if (!body) return { error: "invalid_shape" };
  if (!onlyKeys(body, TOP_KEYS)) return { error: "unknown_key" };
  if (body.version !== 1) return { error: "invalid_version" };
  if (body.feature !== "numerology_private_message") return { error: "invalid_feature" };
  if (body.language !== "vi" && body.language !== "en") return { error: "invalid_language" };
  const numbers = record(body.numbers);
  if (!numbers) return { error: "invalid_shape" };
  if (!onlyKeys(numbers, NUMBER_KEYS)) return { error: "unknown_key" };
  for (const kind of CORE_KINDS) {
    const value = numbers[kind];
    if (value === undefined && OPTIONAL.has(kind)) continue;
    if (typeof value !== "string" || !CORE.test(value)) return { error: "invalid_number" };
  }
  // Personal year and month reduce to a single digit (calc.ts personalCycles).
  for (const kind of ["personalYear", "personalMonth"] as const) {
    if (typeof numbers[kind] !== "string" || !CYCLE.test(numbers[kind] as string)) return { error: "invalid_number" };
  }
  if (numbers.challenge !== undefined && (typeof numbers.challenge !== "string" || !CHALLENGE.test(numbers.challenge))) return { error: "invalid_number" };
  const pinnacle = record(numbers.pinnacle);
  if (!pinnacle) return { error: "invalid_shape" };
  if (!onlyKeys(pinnacle, PINNACLE_KEYS)) return { error: "unknown_key" };
  if (![1, 2, 3, 4].includes(pinnacle.stage as number)) return { error: "invalid_number" };
  if (typeof pinnacle.number !== "string" || !CORE.test(pinnacle.number)) return { error: "invalid_number" };
  const ids = body.blockIds;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_BLOCK_IDS) return { error: "invalid_block_ids" };
  if (ids.some((id) => typeof id !== "string" || !BLOCK_ID.test(id)) || new Set(ids).size !== ids.length) return { error: "invalid_block_ids" };
  const request: NumerologyMessageRequest = {
    version: 1,
    feature: "numerology_private_message",
    language: body.language,
    numbers: {
      lifePath: numbers.lifePath as string,
      birthday: numbers.birthday as string,
      ...(numbers.expression !== undefined ? { expression: numbers.expression as string } : {}),
      ...(numbers.soulUrge !== undefined ? { soulUrge: numbers.soulUrge as string } : {}),
      ...(numbers.personality !== undefined ? { personality: numbers.personality as string } : {}),
      personalYear: numbers.personalYear as string,
      personalMonth: numbers.personalMonth as string,
      pinnacle: { stage: pinnacle.stage as 1 | 2 | 3 | 4, number: pinnacle.number },
      ...(numbers.challenge !== undefined ? { challenge: numbers.challenge as string } : {})
    },
    blockIds: ids as string[]
  };
  const expected = new Set(expectedBlockIds(request.numbers));
  if (request.blockIds.some((id) => !expected.has(id))) return { error: "block_not_matching" };
  return { request };
}

const pick = (text: Text | undefined, language: NumerologyLanguage) => text?.[language]?.trim() || null;

/** The approved text of one block id, or null for an id the store does not hold. */
export function numerologyBlockText(id: string, language: NumerologyLanguage): string | null {
  if (!BLOCK_ID.test(id)) return null;
  const parts = id.split(".");
  if (parts[0] === "numbers") {
    const block = store.numbers[parts[1]];
    if (!block) return null;
    const pieces = [pick(block.title, language), pick(block.leans, language), pick(block.light, language), pick(block.trap, language)];
    return pieces.every(Boolean) ? `${pieces[0]}. ${pieces.slice(1).join(" ")}` : null;
  }
  if (parts[0] === "personalYear") {
    const block = store.personalYear[parts[1]];
    if (!block) return null;
    const title = pick(block.title, language), leans = pick(block.leans, language);
    return title && leans ? `${title}. ${leans}` : null;
  }
  if (parts[0] === "masters") return pick(store.masters[parts[1]], language);
  if (parts[0] === "personalMonth") return pick(store.personalMonth[parts[1]], language);
  if (parts[0] === "challenges") return pick(store.challenges[parts[1]], language);
  if (parts[0] === "pinnacles" && parts[1] === "stages") return pick(store.pinnacles.stages[parts[2]], language);
  if (parts[0] === "pinnacles" && parts[1] === "numbers") return pick(store.pinnacles.numbers[parts[2]], language);
  return null;
}

/** Text for every requested id, in request order; null when any id cannot be resolved (refuse rather than guess). */
export function resolveNumerologyBlocks(ids: string[], language: NumerologyLanguage): ResolvedBlock[] | null {
  const resolved: ResolvedBlock[] = [];
  for (const id of ids) {
    const text = numerologyBlockText(id, language);
    if (!text) return null;
    resolved.push({ id, text });
  }
  return resolved;
}
