import { circularDifference, normalize, signs, type CandidateChart } from "../../../../../packages/astrology-core/calculator.mjs";
import content from "../../../../../packages/content/data/astrology-synastry.json";
import type { Language } from "../../types";
import { localizeAstrologyBody, localizeAstrologySign, type AstrologySignId } from "./contracts";

// So với một người (Owner-approved 2026-10-31): template text only, computed on the device and
// never sent to AI. No score and no summary line.
type Text = { vi: string; en: string };
const pick = (text: Text, language: Language) => (language === "vi" ? text.vi : text.en);

export type RelationshipType = "partner" | "crush" | "friend" | "family" | "work" | "other";
export const relationshipTypes = Object.keys(content.relationshipTypes) as RelationshipType[];
export const relationshipLabel = (type: RelationshipType, language: Language) => pick(content.relationshipTypes[type], language);

type BodyId = "sun" | "moon" | "mercury" | "venus" | "mars" | "saturn";
type Element = "fire" | "earth" | "air" | "water";
type AspectType = "conjunction" | "sextile" | "square" | "trine" | "opposition";
type AspectKind = "conjunction" | "flowing" | "tension";
type GroupId = keyof typeof content.aspects;

// Same major-5-v1 orbs as packages/astrology-core/calculator.mjs.
const aspectRules: [AspectType, number, number][] = [["conjunction", 0, 6], ["sextile", 60, 4], ["square", 90, 5], ["trine", 120, 5], ["opposition", 180, 6]];
const kindOf: Record<AspectType, AspectKind> = { conjunction: "conjunction", sextile: "flowing", trine: "flowing", square: "tension", opposition: "tension" };
const elements: Element[] = ["fire", "earth", "air", "water"];
const elementOfSign = (sign: AstrologySignId) => elements[signs.indexOf(sign) % 4];

// Cross pairs from the approved draft; asymmetric pairs are read both ways (mine → theirs, theirs → mine).
const groups: { id: GroupId; a: BodyId; b: BodyId[] }[] = [
  { id: "sun-moon", a: "sun", b: ["moon"] },
  { id: "moon-moon", a: "moon", b: ["moon"] },
  { id: "venus-mars", a: "venus", b: ["mars"] },
  { id: "venus-venus", a: "venus", b: ["venus"] },
  { id: "sun-sun", a: "sun", b: ["sun"] },
  { id: "mercury-mercury", a: "mercury", b: ["mercury"] },
  { id: "saturn-personal", a: "saturn", b: ["sun", "moon", "venus"] }
];

// Exact charts give the longitude; otherwise the middle of the sampled range (the Moon is then uncertain).
function longitudeOf(chart: CandidateChart, body: BodyId): number | null {
  const exact = chart.placements.find((item) => item.body === body);
  if (exact) return exact.longitude;
  const range = (chart.sampledRanges ?? []).find((item) => item.body === body);
  return range ? normalize(range.sampleStartLongitude + (range.minOffset + range.maxOffset) / 2) : null;
}
const timeKnown = (chart: CandidateChart) => chart.time.precision === "exact";

export type ElementRow = { body: "sun" | "moon"; mine: AstrologySignId; theirs: AstrologySignId; pair: string; uncertain: boolean };
export type CrossAspect = { group: GroupId; kind: AspectKind; type: AspectType; mine: BodyId; theirs: BodyId; orb: number };
export type Synastry = { elements: ElementRow[]; aspects: CrossAspect[] };

export function compareCharts(mine: CandidateChart, theirs: CandidateChart, relationship: RelationshipType, limit = 5): Synastry {
  const moonCertain = timeKnown(mine) && timeKnown(theirs);
  const rows: ElementRow[] = [];
  for (const body of ["sun", "moon"] as const) {
    const a = longitudeOf(mine, body), b = longitudeOf(theirs, body);
    if (a === null || b === null) continue;
    const signA = signs[Math.floor(a / 30)] as AstrologySignId, signB = signs[Math.floor(b / 30)] as AstrologySignId;
    const [first, second] = [elementOfSign(signA), elementOfSign(signB)].sort((x, y) => elements.indexOf(x) - elements.indexOf(y));
    rows.push({ body, mine: signA, theirs: signB, pair: `${first}-${second}`, uncertain: body === "moon" && !moonCertain });
  }

  const candidates: CrossAspect[] = [];
  for (const group of groups) {
    // Venus–Mars is usually read as romance, so it stays out of family and work comparisons.
    if (group.id === "venus-mars" && (relationship === "family" || relationship === "work")) continue;
    const pairs: [BodyId, BodyId][] = group.b.flatMap((b) => (group.a === b ? [[group.a, b]] : [[group.a, b], [b, group.a]]) as [BodyId, BodyId][]);
    for (const [mineBody, theirBody] of pairs) {
      if (!moonCertain && (mineBody === "moon" || theirBody === "moon")) continue;
      const a = longitudeOf(mine, mineBody), b = longitudeOf(theirs, theirBody);
      if (a === null || b === null) continue;
      const separation = circularDifference(a, b);
      for (const [type, angle, maxOrb] of aspectRules) {
        const orb = Math.abs(separation - angle);
        if (orb <= maxOrb) candidates.push({ group: group.id, kind: kindOf[type], type, mine: mineBody, theirs: theirBody, orb });
      }
    }
  }
  // One entry per text (group + kind), closest first.
  const seen = new Set<string>();
  const unique = candidates.sort((x, y) => x.orb - y.orb).filter((item) => {
    const key = `${item.group}:${item.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  // Never hide a tension aspect, and never show only tension: the closest of each kind is kept,
  // then the remaining places go to the closest of the rest.
  const kept = (["flowing", "tension"] as const).map((kind) => unique.find((item) => item.kind === kind)).filter((item): item is CrossAspect => !!item);
  const rest = unique.filter((item) => !kept.includes(item)).slice(0, Math.max(0, limit - kept.length));
  return { elements: rows, aspects: [...kept, ...rest].sort((x, y) => x.orb - y.orb) };
}

export type SynastryText = {
  intro: string;
  footer: string;
  labels: { elements: string; aspects: string; tryTogether: string; moonUncertain: string; noAspects: string };
  elements: { key: string; label: string; title: string; body: string; note?: string }[];
  aspects: { key: string; label: string; title: string; body: string; tryTogether: string }[];
};

export function synastryText(result: Synastry, personName: string, language: Language): SynastryText {
  const vi = language === "vi";
  const labels = Object.fromEntries(Object.entries(content.labels).map(([key, value]) => [key, pick(value, language)])) as SynastryText["labels"];
  const signLabel = (sign: AstrologySignId) => `${localizeAstrologySign(sign, language)} (${pick(content.elementNames[elementOfSign(sign)], language)})`;
  const yours = (body: BodyId) => (vi ? `${localizeAstrologyBody(body, language)} của bạn` : `Your ${localizeAstrologyBody(body, language)}`);
  const theirs = (body: BodyId) => (vi ? `${localizeAstrologyBody(body, language)} của ${personName}` : `${personName}'s ${localizeAstrologyBody(body, language)}`);
  return {
    intro: pick(content.intro, language),
    footer: pick(content.footer, language),
    labels,
    // Sun and Moon landing on the same element pair share one card instead of repeating the text.
    elements: [...new Set(result.elements.map((row) => row.pair))].map((pairKey) => {
      const rows = result.elements.filter((row) => row.pair === pairKey);
      const pair = content.elementPairs[pairKey as keyof typeof content.elementPairs];
      return {
        key: rows.map((row) => row.body).join("-"),
        label: rows.map((row) => `${localizeAstrologyBody(row.body, language)}: ${vi ? "bạn" : "you"} ${signLabel(row.mine)} · ${personName} ${signLabel(row.theirs)}`).join("\n"),
        title: pick(pair.title, language),
        body: pick(pair.body, language),
        ...(rows.some((row) => row.uncertain) ? { note: labels.moonUncertain } : {})
      };
    }),
    aspects: result.aspects.map((item) => {
      const entry = content.aspects[item.group][item.kind];
      return {
        key: `${item.group}:${item.kind}`,
        label: `${yours(item.mine)} · ${pick(content.aspectNames[item.type], language)} · ${theirs(item.theirs)}`,
        title: pick(entry.title, language),
        body: pick(entry.body, language),
        tryTogether: pick(entry.try, language)
      };
    })
  };
}

export const synastryConsent = (language: Language) => ({
  title: pick(content.consent.title, language),
  body: pick(content.consent.body, language),
  confirm: pick(content.consent.confirm, language)
});
