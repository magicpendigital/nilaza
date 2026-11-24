import { signChangesBetween } from "../../../../../packages/astrology-core/sky.mjs";
import type { CandidateChart } from "../../../../../packages/astrology-core/calculator.mjs";
import skyData from "../../../../../packages/content/data/astrology-daily-sky.json";
import type { Language } from "../../types";
import { localizeAstrologySign, type AstrologySignId } from "./contracts";
import type { DailySky, Decan } from "./dailySky";
import { formatClock, formatDayMonth, localDateOf, type LocalZone, deviceZone } from "./localDay";
import { moonHouseToday, signOptionsOf } from "./sky";
import { moonTodayFor } from "./skyContent";

// Text for "Bầu trời hôm nay" (spec section 6.2). Keyed by Moon sign x decan so two days in a row
// never read the same; personalised by Whole Sign house (exact birth time) or by the Moon-Sun
// relation (Sun sign only). Draft content: see status/reviewedBy in the JSON.

type Text = { vi: string; en: string };
type Item = Text & { id: string };
type SignEntry = { tone: Record<Decan, Text>; body: Text; lean: Item[]; ease: Item[]; topics: Record<SkyTopic, Text>; journal: Text };
export type SkyTopic = "love" | "work" | "self";
export type RelationKind = "conjunction" | "semisextile" | "sextile" | "square" | "trine" | "quincunx" | "opposition";

const pick = (text: Text, language: Language) => (language === "vi" ? text.vi : text.en);
const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
const signName = (sign: AstrologySignId, language: Language) => localizeAstrologySign(sign, language);
const zodiac: AstrologySignId[] = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const relationBySteps: RelationKind[] = ["conjunction", "semisextile", "sextile", "square", "trine", "quincunx", "opposition"];
// Two of the four items per decan; neighbouring decans of one sign never share both.
const itemsByDecan: Record<Decan, [number, number]> = { early: [0, 1], mid: [2, 3], late: [1, 2] };

export const skyContentStatus = { status: skyData.status, reviewedBy: skyData.reviewedBy };

export function relationOf(moon: AstrologySignId, sun: AstrologySignId): RelationKind {
  const steps = (zodiac.indexOf(moon) - zodiac.indexOf(sun) + 12) % 12;
  return relationBySteps[Math.min(steps, 12 - steps)];
}

export type SkyPersonal =
  | { kind: "none" }
  | { kind: "house"; house: number }
  | { kind: "sun"; sun: AstrologySignId; chosen?: boolean }
  | { kind: "boundary"; options: [AstrologySignId, AstrologySignId]; at?: Date };

/** What the saved chart lets us say today. `chosenSun` is the sign a boundary user picked for now. */
export function skyPersonalOf(chart: CandidateChart | null | undefined, now: Date, chosenSun?: AstrologySignId): SkyPersonal {
  if (!chart) return { kind: "none" };
  const house = moonHouseToday(chart, now);
  if (house) return { kind: "house", house: house.house };
  const sun = signOptionsOf(chart, "sun");
  if (sun.length === 1) return { kind: "sun", sun: sun[0] };
  if (sun.length === 2) {
    if (chosenSun && sun.includes(chosenSun)) return { kind: "sun", sun: chosenSun, chosen: true };
    const range = chart.time.range;
    const change = range ? signChangesBetween("Sun", new Date(range.start), new Date(range.endExclusive))[0] : undefined;
    const options = (change ? [change.from, change.to] : sun) as [AstrologySignId, AstrologySignId];
    return { kind: "boundary", options, ...(change ? { at: change.at } : {}) };
  }
  return { kind: "none" };
}

export type DailySkyReading = {
  headline: string;
  body: string;
  labels: { lean: string; ease: string };
  lean: string[];
  ease: string[];
  topics: { id: SkyTopic; label: string; text: string }[];
  journal: string;
  source: string;
  /** House card (birth time) or Moon-Sun relation card (Sun sign only). */
  personal?: { label: string; title: string; body: string };
  /** One-line notice for a Sun boundary birth date. */
  notice?: string;
  /** Invite to add data: birth date (no chart) or birth time (Sun sign only). */
  invite?: { kind: "birthDate" | "birthTime"; text: string };
  phaseNote?: string;
  weekNote: string;
  how: { title: string; lines: string[] };
};

export function dailySkyReading(sky: DailySky, personal: SkyPersonal, language: Language, zone: LocalZone = deviceZone): DailySkyReading {
  const entry = (skyData.moonSign as Record<AstrologySignId, SignEntry>)[sky.sign];
  const templates = skyData.templates;
  const moon = signName(sky.sign, language);
  const [first, second] = itemsByDecan[sky.decan];
  let lean = [entry.lean[first], entry.lean[second]].map((item) => pick(item, language));
  let ease = [entry.ease[first], entry.ease[second]].map((item) => pick(item, language));
  let source = fill(pick(templates.sourceMoonOnly, language), { moon });
  let personalCard: DailySkyReading["personal"];
  let notice: string | undefined;
  let invite: DailySkyReading["invite"];

  if (personal.kind === "house") {
    const house = moonTodayFor(personal.house, language);
    lean = house.doItems;
    ease = house.avoidItems;
    source = fill(pick(templates.sourceHouse, language), { moon, house: String(personal.house) });
    personalCard = { label: pick(templates.houseLabel, language), title: house.title, body: house.body };
  } else if (personal.kind === "sun") {
    const kind = relationOf(sky.sign, personal.sun);
    const relation = (skyData.relation as Record<RelationKind, { label: Text; body: Text }>)[kind];
    const sun = signName(personal.sun, language) + (personal.chosen ? ` ${pick(templates.sourceChosen, language)}` : "");
    source = fill(pick(templates.source, language), { moon, relation: pick(relation.label, language), sun });
    personalCard = { label: pick(templates.relationLabel, language), title: pick(relation.label, language), body: pick(relation.body, language) };
    invite = { kind: "birthTime", text: pick(templates.noBirthTime, language) };
  } else if (personal.kind === "boundary") {
    const [from, to] = personal.options;
    notice = fill(pick(templates.boundary, language), {
      from: signName(from, language),
      to: signName(to, language),
      date: personal.at ? `${formatDayMonth(localDateOf(personal.at, zone))}/${localDateOf(personal.at, zone).year}` : "",
      time: personal.at ? formatClock(personal.at, zone) : ""
    });
    if (!personal.at) notice = notice.replace(/ \([^)]*\)/, "");
  } else {
    invite = { kind: "birthDate", text: pick(templates.noChart, language) };
  }

  const topicLabels = skyData.labels.topics as Record<SkyTopic, Text>;
  const phaseKind = sky.phase.exactAt ? (sky.phase.id as keyof typeof skyData.phaseNote) : undefined;
  return {
    headline: pick(entry.tone[sky.decan], language),
    body: pick(entry.body, language),
    labels: { lean: pick(skyData.labels.lean, language), ease: pick(skyData.labels.ease, language) },
    lean,
    ease,
    topics: (["love", "work", "self"] as SkyTopic[]).map((id) => ({ id, label: pick(topicLabels[id], language), text: pick(entry.topics[id], language) })),
    journal: pick(entry.journal, language),
    source,
    ...(personalCard ? { personal: personalCard } : {}),
    ...(notice ? { notice } : {}),
    ...(invite ? { invite } : {}),
    ...(phaseKind && sky.phase.exactAt ? { phaseNote: fill(pick(skyData.phaseNote[phaseKind], language), { time: formatClock(sky.phase.exactAt, zone) }) } : {}),
    weekNote: pick(templates.weekNote, language),
    how: { title: pick(templates.howTitle, language), lines: templates.how.map((line) => pick(line, language)) }
  };
}

/** "Trăng chuyển sang Song Tử lúc 18:09" for today's sign change, past or future. */
export function ingressLine(sky: DailySky, language: Language, zone: LocalZone = deviceZone): string | undefined {
  if (!sky.change) return undefined;
  const template = sky.change.passed ? skyData.templates.ingressPast : skyData.templates.ingressFuture;
  return fill(pick(template, language), { sign: signName(sky.change.to, language), time: formatClock(sky.change.at, zone) });
}
