// 2026-11-28 (R0/R1): copy of the Number Map "Báo cáo tổng hợp" from packages/content/data/numerology-report.json.
// The file is a draft until the Owner review block says approved with a named reviewer; while it is a draft the screen
// shows a draft note and the server refuses the AI call (content_not_approved → "Sắp có").
import reportCopy from "../../../../../packages/content/data/numerology-report.json";
import type { Language } from "../../types";
import type { ReportSectionId } from "./aiPayload";

type Text = { vi: string; en: string };
const pick = (text: Text, language: Language) => (language === "vi" ? text.vi : text.en);

const review = reportCopy.review as { status: unknown; reviewer: unknown };
export const numerologyReportReviewed = review.status === "approved" && typeof review.reviewer === "string" && review.reviewer.trim().length > 0;

export type ReportCopyKey = keyof typeof reportCopy.report;
export type ReportCopy = Record<ReportCopyKey, string>;

export function reportCopyText(language: Language): ReportCopy {
  return Object.fromEntries(Object.entries(reportCopy.report).map(([key, text]) => [key, pick(text as Text, language)])) as ReportCopy;
}

export const reportSectionTitle = (id: ReportSectionId, language: Language) => pick(reportCopy.sections[id].title, language);
export const reportSectionHint = (id: ReportSectionId, language: Language) => pick(reportCopy.sections[id].hint, language);

/** Every user-facing string of the report copy, for the banned-word test. */
export const allReportText = (): string[] => [
  ...Object.values(reportCopy.sections).flatMap((section) => [section.title.vi, section.title.en, section.hint.vi, section.hint.en]),
  ...Object.values(reportCopy.report).flatMap((text) => [(text as Text).vi, (text as Text).en])
];
