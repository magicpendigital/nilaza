import { journalStateKey, readJournalState } from "../journal/journalRepository";
import { journalDraftStorageKey, readJournalDraft } from "../journal/journalDraftStore";
import { feedbackStorageKey, readFeedbackQueue } from "../feedback/feedbackQueue";

const sources = {
  profile: "nilaza.profile", birthProfile: "nilaza.birthProfile", journal: journalStateKey,
  journalDraft: journalDraftStorageKey,
  feedback: feedbackStorageKey,
  personaMessages: "nilaza.messages", oracleTurns: "nilaza.oracleTurns", dailyInsight: "nilaza.dailyInsight",
  astrology: "nilaza.astrology.v2", councilSessions: "nilaza.aiCouncilSessions.v2",
  savedArtifacts: "nilaza.generatedArtifacts", favorites: "nilaza.favoritePersonaIds",
  memoryConsent: "nilaza.oracleMemoryConsent", notificationPreferences: "nilaza.notificationPreferences"
} as const;
const secretKey = /authorization|password|secret|token|api.?key|service.?role|credential|device.?push|grant/i;
function exportValue(value: unknown, depth = 0): unknown {
  if (depth > 40) throw new Error("Export data nesting exceeds limit");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(item => exportValue(item, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value)
    .filter(([key, item]) => !secretKey.test(key) && item !== undefined)
    .map(([key, item]) => [key, exportValue(item, depth + 1)]));
  throw new Error("Unsupported export value");
}

export async function buildLocalExport(options: {
  userId: string; active: () => boolean;
  read: <T>(key: string, fallback: T) => Promise<T>;
  journalSnapshot: () => unknown;
  now?: () => Date;
}) {
  if (!options.active() || !options.userId) throw new Error("Account is not ready");
  const capturedJournal = readJournalState(options.journalSnapshot());
  const items = await Promise.all(Object.entries(sources).filter(([name]) => name !== "journal")
    .map(async ([name, key]) => {
      const value = await options.read<unknown>(key, null);
      return [name, exportValue(name === "journalDraft" ? readJournalDraft(value).draft : name === "feedback" ? readFeedbackQueue(value) : value)] as const;
    }));
  if (!options.active()) throw new Error("Account closed during export");
  const document = {
    schemaVersion: "nilaza-local-export-v1", exportedAt: (options.now?.() ?? new Date()).toISOString(),
    scope: "saved_data_on_this_device", accountId: options.userId,
    exclusions: ["server_only_records", "deleted_records", "billing_and_subscription_history", "auth_and_provider_credentials", "operator_drafts"],
    data: { ...Object.fromEntries(items), journal: exportValue(capturedJournal.entries) }
  };
  return JSON.stringify(document, null, 2);
}
