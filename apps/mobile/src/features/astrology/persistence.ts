import {
  CandidateChart,
  BirthInput,
} from "../../../../../packages/astrology-core/calculator.mjs";
import { validateChart } from "../../../../../packages/astrology-core/validate.mjs";
import { resolveBirthInput } from "../../../../../packages/astrology-core/time.mjs";
import { LibraryState } from "./MythologyWorld";
import { astrologySignIds } from "./contracts";
import type { AstrologyAiInsightResponse } from "./astrologyAiInsight";
import { validAstrologyAiResponse, type AstrologyAiSavedContext } from "./astrologyAiValidation";
import { parseAnswerProvenance, type AnswerProvenance } from "../../../../../packages/ai-contracts/answer-provenance";
export const astrologyStorageKey = "nilaza.astrology.v2";
export interface AstrologyPersistence {
  loadJson<T>(key: string, fallback: T): Promise<T>;
  saveJsonOrThrow<T>(key: string, value: T): Promise<void>;
}
export type SavedChart = {
  id: string;
  createdAt: string;
  placeName: string;
  input: BirthInput;
  chart: CandidateChart;
  aiInsight?: SavedAstrologyAiInsight;
};
// Another person's chart for So với một người, saved only on this device after the consent card.
export type SavedPerson = {
  id: string;
  createdAt: string;
  name: string;
  relationship: "partner" | "crush" | "friend" | "family" | "work" | "other";
  placeName: string;
  input: BirthInput;
  chart: CandidateChart;
};
export const personNameMaxLength = 40;
export type SavedAstrologyAiInsight = {
  schemaVersion: "nilaza.astrology.saved-ai-insight.v1";
  response: AstrologyAiInsightResponse;
  context: AstrologyAiSavedContext;
  provenance?: AnswerProvenance;
  savedAt: string;
};

export function validSavedAstrologyAiInsight(value: unknown, chart?: CandidateChart): value is SavedAstrologyAiInsight {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as SavedAstrologyAiInsight;
  if (Object.keys(value).some(key => !["schemaVersion", "response", "context", "provenance", "savedAt"].includes(key))
    || item.schemaVersion !== "nilaza.astrology.saved-ai-insight.v1" || !Number.isFinite(Date.parse(item.savedAt))
    || !validAstrologyAiResponse(item.response, item.context)) return false;
  if (chart && (item.context.chart.reportRevision !== chart.time.revision || item.context.chart.calculationVersion !== chart.provenance.calculationVersion)) return false;
  if (item.provenance !== undefined) {
    const provenance = parseAnswerProvenance(item.provenance, { feature: "astrology_insight", locale: item.response.language });
    if (!provenance || Object.keys(item.provenance).some(key => !(key in provenance)) || provenance.clientRequestId !== item.response.requestId
      || provenance.remoteId && provenance.remoteId !== item.response.reportId) return false;
    if (provenance.sourceKind !== (item.response.metadata.providerMode === "mock" ? "mock" : "ai") || provenance.validationStatus !== "validated") return false;
    for (const key of ["promptVersion", "calculationVersion", "chartContractVersion", "reportRevision", "responseSchema"] as const) {
      if (provenance[key] !== undefined && provenance[key] !== item.response.metadata[key]) return false;
    }
  }
  return true;
}
export type AstrologyData = {
  version: 2;
  nextRevision: number;
  displayZone: string;
  library: LibraryState;
  reports: SavedChart[];
  /** Optional so records saved before synastry stay valid. */
  people?: SavedPerson[];
  notes: {
    id: string;
    title: string;
    prompt: string;
    text: string;
    createdAt: string;
  }[];
};
export const freshAstrologyData = (): AstrologyData => ({
  version: 2,
  nextRevision: 1,
  displayZone: "device",
  library: { bookmarks: [], completed: [], lastChapter: null },
  reports: [],
  notes: [],
});
export function validDisplayZone(value: string) {
  if (value === "device") return true;
  if (!/^(UTC|[A-Za-z_]+\/[A-Za-z_+\-/0-9]+)$/.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}
export function localCalendarLabel(date: Date, zone: string, language: string) {
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: zone === "device" ? undefined : zone,
  }).format(date);
}
export function validAstrologyData(value: unknown): value is AstrologyData {
  if (!value || typeof value !== "object") return false;
  const d = value as AstrologyData;
  const ids = (x: unknown) =>
    Array.isArray(x) &&
    x.length <= 12 &&
    new Set(x).size === x.length &&
    x.every((id) => (astrologySignIds as readonly string[]).includes(id));
  return (
    d.version === 2 &&
    Number.isInteger(d.nextRevision) &&
    d.nextRevision > 0 &&
    typeof d.displayZone === "string" &&
    validDisplayZone(d.displayZone) &&
    !!d.library &&
    ids(d.library.bookmarks) &&
    ids(d.library.completed) &&
    (d.library.lastChapter === null ||
      (astrologySignIds as readonly string[]).includes(
        d.library.lastChapter,
      )) &&
    Array.isArray(d.reports) &&
    d.reports.length <= 20 &&
    new Set(d.reports.map((r) => r?.id)).size === d.reports.length &&
    d.reports.every(
      (r) =>
        r &&
        typeof r.id === "string" &&
        typeof r.placeName === "string" &&
        Number.isFinite(Date.parse(r.createdAt)) &&
        r.input?.revision === r.chart?.time?.revision &&
        r.input.revision < d.nextRevision &&
        validateChart(r.chart).length === 0 &&
        validStoredInput(r) &&
        (r.aiInsight === undefined || validSavedAstrologyAiInsight(r.aiInsight, r.chart)),
    ) &&
    (d.people === undefined ||
      (Array.isArray(d.people) &&
        d.people.length <= 20 &&
        new Set(d.people.map((p) => p?.id)).size === d.people.length &&
        d.people.every(
          (p) =>
            p &&
            typeof p.id === "string" &&
            typeof p.name === "string" &&
            p.name.trim().length > 0 &&
            p.name.length <= personNameMaxLength &&
            ["partner", "crush", "friend", "family", "work", "other"].includes(p.relationship) &&
            typeof p.placeName === "string" &&
            Number.isFinite(Date.parse(p.createdAt)) &&
            p.input?.revision === p.chart?.time?.revision &&
            p.input.revision < d.nextRevision &&
            validateChart(p.chart).length === 0 &&
            validStoredInput(p),
        ))) &&
    Array.isArray(d.notes) &&
    d.notes.length <= 100 &&
    d.notes.every(
      (n) =>
        n &&
        [n.id, n.title, n.prompt, n.text, n.createdAt].every(
          (v) => typeof v === "string",
        ) &&
        n.text.length <= 4000 &&
        Number.isFinite(Date.parse(n.createdAt)),
    )
  );
}
function validStoredInput(report: Pick<SavedChart, "input" | "chart">) {
  try {
    const resolved = resolveBirthInput(report.input),
      saved = report.chart.time;
    return (
      resolved.precision === saved.precision &&
      resolved.utc === saved.utc &&
      JSON.stringify(resolved.range) === JSON.stringify(saved.range) &&
      resolved.provenance.timezone === saved.provenance.timezone &&
      ["id", "source", "latitude", "longitude"].every(
        (k) =>
          resolved.location[k as keyof typeof resolved.location] ===
          saved.location[k as keyof typeof saved.location],
      )
    );
  } catch {
    return false;
  }
}
export async function clearAstrologyBirthData(storage: AstrologyPersistence) {
  const data = await storage.loadJson<unknown>(
    astrologyStorageKey,
    freshAstrologyData(),
  );
  if (!validAstrologyData(data))
    throw new Error("Invalid stored astrology data");
  await storage.saveJsonOrThrow(astrologyStorageKey, { ...data, reports: [], people: [] });
}
