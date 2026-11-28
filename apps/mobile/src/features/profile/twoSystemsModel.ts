import blocksData from "../../../../../packages/content/data/two-systems-blocks.json";
import numerologyBlocks from "../../../../../packages/content/data/numerology-blocks.json";
import signGuides from "../../../../../packages/content/data/astrology-zodiac-guides.json";
import { localizeAstrologySign, type AstrologySignId } from "../astrology/contracts";
import { lifePathNumber, nameNumbers, parseBirthDate, type NumerologyNumber } from "../numerology/calc";
import type { Language } from "../../types";
import type { CertainSigns } from "./whoAmIModel";

// "Hai hệ cùng nhìn bạn" (lô H1, docs/proposals/ASTRO_NUMEROLOGY_SYNTHESIS_TWO_SYSTEMS_PLAN_2026-11-28.vi.md, Owner 28/11).
// Pure: inputs the person already saved → a view model. Template-only, no AI, no network, nothing saved.
// Sun axis: element of the certain Sun sign × root life path. Moon axis: element of the certain Moon sign × root
// soul urge from the birth name saved for the Number Map (never the display name). Missing input → an invitation.

type Text = { vi: string; en: string };
const pick = (text: Text, language: Language) => (language === "vi" ? text.vi : text.en);

export type TwoSystemsElement = "fire" | "earth" | "air" | "water";
export type TwoSystemsAxisKind = "sun" | "moon";
export type TwoSystemsUiKey =
  | "title" | "intro" | "sourceNote" | "sunAxisTitle" | "moonAxisTitle" | "meetLabel" | "differLabel" | "questionLabel"
  | "needBirthDate" | "needSun" | "needMoon" | "needName" | "premiumLocked" | "guestInvite" | "writeJournal" | "masterNote";
type PairBlock = { meet: Text; differ: Text; question: Text };
type TwoSystemsData = {
  version: string;
  review: { status: string; reviewer: string; reviewedAt: string; note: string };
  ui: Record<TwoSystemsUiKey, Text>;
  elements: Record<TwoSystemsElement, { name: Text; sunFrame: Text; moonFrame: Text }>;
  sun: Partial<Record<string, PairBlock>>;
  moon: Partial<Record<string, PairBlock>>;
};

const data = blocksData as unknown as TwoSystemsData;
const masters = numerologyBlocks.masters as Record<string, Text>;

/** Same rule as the Number Map: a "Bản thử" note shows until a named reviewer approves the text. */
export const twoSystemsContentReviewed = data.review.status === "approved" && Boolean(data.review.reviewer?.trim());

export const twoSystemsUi = (key: TwoSystemsUiKey, language: Language) => pick(data.ui[key], language);

const signElements = new Map(signGuides.signs.map((sign) => [sign.id, sign.element as TwoSystemsElement]));

/** Element of a sign, read from astrology-zodiac-guides.json. */
export function elementOfSign(sign: AstrologySignId): TwoSystemsElement | undefined {
  return signElements.get(sign);
}

/** Pair block id: element + root (11 → 2, 22 → 4). */
export const pairBlockId = (element: TwoSystemsElement, number: NumerologyNumber) => `${element}.${number.root}`;

export type TwoSystemsMissing = "needBirthDate" | "needSun" | "needMoon" | "needName";
/** Where the invitation button goes. */
export type TwoSystemsFix = "editBirth" | "makeChart" | "openNumerology";

export type TwoSystemsChip = { key: "sign" | "number"; label: string; accessibilityLabel: string };

export type TwoSystemsAxis =
  | { kind: TwoSystemsAxisKind; title: string; status: "loading" }
  | { kind: TwoSystemsAxisKind; title: string; status: "missing"; reason: TwoSystemsMissing; text: string; fix: TwoSystemsFix }
  | {
      kind: TwoSystemsAxisKind;
      title: string;
      status: "ready";
      element: TwoSystemsElement;
      number: NumerologyNumber;
      blockId: string;
      chips: TwoSystemsChip[];
      frame: string;
      /** Undefined when the content file has no block for this pair: the screen hides the body. */
      block?: { meet: string; differ: string; question: string };
      /** 11 and 22: the ui.masterNote line plus the masters nuance from the Number Map. */
      master?: { note: string; nuance: string };
    };

export type TwoSystemsInputs = {
  language: Language;
  signs: CertainSigns;
  /** True when a chart is saved on this device (decides whether the fix is "make a chart" or "edit birth details"). */
  hasChart: boolean;
  /** YYYY-MM-DD from the profile, or empty. */
  birthDate: string;
  /** The birth name saved for the Number Map; null while it is still loading. Never the display name. */
  savedName: string | null;
};

export type TwoSystemsView = { sun: TwoSystemsAxis; moon: TwoSystemsAxis; draft: boolean };

function readyAxis(kind: TwoSystemsAxisKind, sign: AstrologySignId, number: NumerologyNumber, language: Language): TwoSystemsAxis {
  const vi = language === "vi";
  const title = twoSystemsUi(kind === "sun" ? "sunAxisTitle" : "moonAxisTitle", language);
  const element = elementOfSign(sign);
  // An unknown sign id cannot be paired; say so the same way as an uncertain sign.
  if (!element) return missingAxis(kind, kind === "sun" ? "needSun" : "needMoon", language, true);
  const elementData = data.elements[element];
  const elementName = pick(elementData.name, language);
  const signName = localizeAstrologySign(sign, language);
  const body = kind === "sun" ? (vi ? "Mặt Trời" : "Sun") : (vi ? "Mặt Trăng" : "Moon");
  const numberTitle = pick(numerologyBlocks.kinds[kind === "sun" ? "lifePath" : "soulUrge"].title, language);
  const blockId = pairBlockId(element, number);
  const pair = data[kind][blockId];
  const masterText = number.master ? masters[String(number.value)] : undefined;
  return {
    kind,
    title,
    status: "ready",
    element,
    number,
    blockId,
    chips: [
      {
        key: "sign",
        label: `${body} ${signName} · ${elementName}`,
        accessibilityLabel: vi ? `${body} ${signName}, nguyên tố ${elementName}` : `${body} in ${signName}, element ${elementName}`
      },
      { key: "number", label: `${numberTitle} ${number.label}`, accessibilityLabel: `${numberTitle} ${number.label}` }
    ],
    frame: pick(kind === "sun" ? elementData.sunFrame : elementData.moonFrame, language),
    ...(pair ? { block: { meet: pick(pair.meet, language), differ: pick(pair.differ, language), question: pick(pair.question, language) } } : {}),
    ...(masterText
      ? { master: { note: twoSystemsUi("masterNote", language).replace(/\{number\}/g, String(number.value)), nuance: pick(masterText, language) } }
      : {})
  };
}

function missingAxis(kind: TwoSystemsAxisKind, reason: TwoSystemsMissing, language: Language, hasChart: boolean): TwoSystemsAxis {
  const fix: TwoSystemsFix = reason === "needName" ? "openNumerology" : reason === "needBirthDate" || hasChart ? "editBirth" : "makeChart";
  return { kind, title: twoSystemsUi(kind === "sun" ? "sunAxisTitle" : "moonAxisTitle", language), status: "missing", reason, text: twoSystemsUi(reason, language), fix };
}

export function sunAxis({ language, signs, hasChart, birthDate }: TwoSystemsInputs): TwoSystemsAxis {
  const parts = parseBirthDate(birthDate);
  if (!parts) return missingAxis("sun", "needBirthDate", language, hasChart);
  if (!signs.sun) return missingAxis("sun", "needSun", language, hasChart);
  return readyAxis("sun", signs.sun, lifePathNumber(parts), language);
}

export function moonAxis({ language, signs, hasChart, savedName }: TwoSystemsInputs): TwoSystemsAxis {
  if (!signs.moon) return missingAxis("moon", "needMoon", language, hasChart);
  if (savedName === null) return { kind: "moon", title: twoSystemsUi("moonAxisTitle", language), status: "loading" };
  const numbers = nameNumbers(savedName);
  if (!numbers) return missingAxis("moon", "needName", language, hasChart);
  return readyAxis("moon", signs.moon, numbers.soulUrge, language);
}

export function twoSystemsView(inputs: TwoSystemsInputs): TwoSystemsView {
  return { sun: sunAxis(inputs), moon: moonAxis(inputs), draft: !twoSystemsContentReviewed };
}
