import type { CandidateChart } from "../../../../../packages/astrology-core/calculator.mjs";
import big3Data from "../../../../../packages/content/data/astrology-big3.json";
import moonData from "../../../../../packages/content/data/astrology-moon-houses.json";
import topicData from "../../../../../packages/content/data/astrology-topic-placements.json";
import type { Language } from "../../types";
import type { AstrologySignId } from "./contracts";
import { signOptionsOf, type BigThree } from "./sky";

// Owner-approved sky content (2026-10-31): template text only, no AI, works offline.
type Text = { vi: string; en: string };
const pick = (text: Text, language: Language) => (language === "vi" ? text.vi : text.en);

export type Big3Story = { headline?: string; lines: string[]; needsBirthTime: boolean };

// Headline = Sun opening + Moon clause; summary = Moon need + Rising first impression.
// Without an exact birth time the Rising line is hidden and an invite takes its place.
export function big3Story(big3: BigThree, language: Language): Big3Story {
  const signs = big3Data.signs as Record<AstrologySignId, Record<"sunHeadline" | "moonClause" | "moonNeed" | "risingLook", Text>>;
  const sun = big3.sun.length === 1 ? signs[big3.sun[0]] : undefined;
  const moon = big3.moon.length === 1 ? signs[big3.moon[0]] : undefined;
  const headline = sun ? (moon ? `${pick(sun.sunHeadline, language)} ${pick(moon.moonClause, language)}` : pick(sun.sunHeadline, language)) : undefined;
  const lines = [
    moon ? pick(moon.moonNeed, language) : pick(big3Data.moonUncertain, language),
    ...(big3.timeKnown && big3.rising ? [pick(signs[big3.rising].risingLook, language)] : [])
  ];
  const needsBirthTime = !big3.timeKnown;
  return { headline, lines: needsBirthTime ? [...lines, pick(big3Data.noBirthTime, language)] : lines, needsBirthTime };
}

export type MoonToday = { title: string; body: string; doItems: string[]; avoidItems: string[]; note: string; labels: { do: string; avoid: string } };

export function moonTodayFor(house: number, language: Language): MoonToday {
  const entry = (moonData.houses as Record<string, { title: Text; body: Text; do: Text[]; avoid: Text[] }>)[String(house)];
  return {
    title: pick(entry.title, language),
    body: pick(entry.body, language),
    doItems: entry.do.map((item) => pick(item, language)),
    avoidItems: entry.avoid.map((item) => pick(item, language)),
    note: pick(moonData.note, language),
    labels: { do: pick(moonData.labels.do, language), avoid: pick(moonData.labels.avoid, language) }
  };
}

export type SkyTopicId = "love" | "career" | "self";
export const skyTopicIds: SkyTopicId[] = ["love", "career", "self"];

type PointId = "venus" | "mars" | "mc" | "saturn" | "moon" | "rising";
const chartBody: Record<PointId, string> = { venus: "venus", mars: "mars", mc: "midheaven", saturn: "saturn", moon: "moon", rising: "ascendant" };

export type TopicPoint = {
  id: PointId;
  name: string;
  intro: string;
  sign?: AstrologySignId;
  title?: string;
  body?: string;
  needs?: string[];
  watch?: string[];
};

export type TopicReading = {
  label: string;
  points: TopicPoint[];
  missingTime: boolean;
  needsBirthTime: string;
  birthTimeNote?: string;
  reminder: string;
  labels: { needs: string; watch: string };
};

export function topicLabel(topic: SkyTopicId, language: Language) {
  return pick(topicData.topics[topic].label, language);
}

// A point is read only when its sign is certain; otherwise it shows the birth-time invite.
export function topicReading(chart: CandidateChart, topic: SkyTopicId, language: Language): TopicReading {
  const points = (topicData.topics[topic].points as PointId[]).map((id): TopicPoint => {
    const meta = topicData.points[id];
    const options = signOptionsOf(chart, chartBody[id]);
    const base = { id, name: pick(meta.name, language), intro: pick(meta.intro, language) };
    if (options.length !== 1) return base;
    const entry = (topicData.placements[id] as Record<string, { title: Text; body: Text; needs: Text[]; watch: Text[] }>)[options[0]];
    return {
      ...base,
      sign: options[0],
      title: pick(entry.title, language),
      body: pick(entry.body, language),
      needs: entry.needs.map((item) => pick(item, language)),
      watch: entry.watch.map((item) => pick(item, language))
    };
  });
  const exact = chart.time.precision === "exact";
  return {
    label: topicLabel(topic, language),
    points,
    missingTime: points.some((point) => !point.sign),
    needsBirthTime: pick(topicData.needsBirthTime, language),
    // Rising, and sometimes the Moon, shift with the birth time.
    ...(topic === "self" && exact ? { birthTimeNote: pick(topicData.birthTimeNote, language) } : {}),
    reminder: pick(topicData.reminder, language),
    labels: { needs: pick(topicData.labels.needs, language), watch: pick(topicData.labels.watch, language) }
  };
}
