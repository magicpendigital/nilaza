// 2026-11-28 (R1): the saved Number Map report. Owner decision: the report lives on this device only (the server keeps
// no copy of its text) and is reused while the number set is unchanged. It is saved under the signed-in account's
// storage (a guest cannot create one), included in "Export data" and removed by "Delete" in WhoAmI or by clearing the
// account's local data.
//
// The number set is fingerprinted with a short hash so the saved record never stores the numbers or the birth date in
// readable form next to the text. The personal month and the language are left out on purpose: "Tạo lại" appears only
// when the personal year, the birth-derived numbers (birth date) or the name numbers change. The current pinnacle stage
// and challenge are included because Part 5 reads them; they change only a few times in a life.
import { useCallback, useEffect, useState } from "react";
import type { NumerologyReportResult } from "../../backendClient";
import type { ReportPayload, ReportSectionId } from "./aiPayload";

export const numerologyReportStorageKey = "nilaza.numerology.report.v1";

export type ReportStorage = {
  loadJson<T>(key: string, fallback: T): Promise<T>;
  saveJson<T>(key: string, value: T): Promise<void>;
};

export type SavedNumerologyReport = NumerologyReportResult & { schemaVersion: 1; numbersHash: string };

/** FNV-1a 32-bit over canonical text: a change detector, not a secret. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function reportNumbersHash(payload: Pick<ReportPayload, "numbers" | "chart">): string {
  const n = payload.numbers;
  return fnv1a(JSON.stringify([
    n.lifePath, n.birthday, n.expression ?? "", n.soulUrge ?? "", n.personality ?? "",
    n.personalYear, n.pinnacle.stage, n.pinnacle.number, n.challenge ?? "", payload.chart.digits
  ]));
}

const sectionIds = new Set<ReportSectionId>(["you", "name", "chart", "year", "pinnacle", "relationship", "questions"]);

/** Reads a stored value back; anything malformed counts as "no saved report" (it is never shown half-parsed). */
export function readSavedReport(value: unknown): SavedNumerologyReport | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== 1 || typeof v.numbersHash !== "string" || typeof v.createdAt !== "string") return null;
  if (!Array.isArray(v.sections) || !Array.isArray(v.questions)) return null;
  const sections = v.sections.filter((s): s is SavedNumerologyReport["sections"][number] => Boolean(s) && typeof s === "object"
    && sectionIds.has((s as { id: ReportSectionId }).id) && typeof (s as { title: unknown }).title === "string" && typeof (s as { body: unknown }).body === "string");
  if (sections.length === 0) return null;
  return {
    schemaVersion: 1,
    numbersHash: v.numbersHash,
    createdAt: v.createdAt,
    language: v.language === "en" ? "en" : "vi",
    promptVersion: typeof v.promptVersion === "string" ? v.promptVersion : "",
    sections: sections.map((s) => ({ id: s.id, title: s.title, body: s.body, blockIds: Array.isArray(s.blockIds) ? s.blockIds.filter((id) => typeof id === "string") : [] })),
    questions: v.questions.filter((q): q is string => typeof q === "string")
  };
}

export async function loadSavedReport(storage: ReportStorage): Promise<SavedNumerologyReport | null> {
  try {
    return readSavedReport(await storage.loadJson<unknown>(numerologyReportStorageKey, null));
  } catch {
    return null;
  }
}

export async function saveReport(storage: ReportStorage, report: NumerologyReportResult, numbersHash: string): Promise<SavedNumerologyReport> {
  const saved: SavedNumerologyReport = { schemaVersion: 1, numbersHash, ...report };
  await storage.saveJson(numerologyReportStorageKey, saved);
  return saved;
}

/** The storage has no remove call; saving null empties the key (loadSavedReport then reads "no report"). */
export async function deleteSavedReport(storage: ReportStorage): Promise<void> {
  await storage.saveJson(numerologyReportStorageKey, null);
}

/** WhoAmI: the saved report of this account, with a delete that also clears the in-memory copy. */
export function useSavedNumerologyReport(storage?: ReportStorage) {
  const [report, setReport] = useState<SavedNumerologyReport | null>(null);
  useEffect(() => {
    if (!storage) { setReport(null); return; }
    let live = true;
    void loadSavedReport(storage).then((saved) => { if (live) setReport(saved); });
    return () => { live = false; };
  }, [storage]);
  const remove = useCallback(async () => {
    if (!storage) return;
    await deleteSavedReport(storage);
    setReport(null);
  }, [storage]);
  return { report, remove };
}
