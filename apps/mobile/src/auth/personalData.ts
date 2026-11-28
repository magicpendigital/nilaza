import type { ChatMessage, DailyInsight, JournalEntry, Persona, Profile } from "../types";

export function mapProfileSnapshot(value: { profile: unknown; birth: unknown }, defaults: Profile) {
  const row = value.profile ? record(value.profile) : null;
  const birth = value.birth ? record(value.birth) : null;
  const profile: Profile = row ? {
    ...defaults,
    nickname: text(row, "display_name"),
    language: row.language === "en" ? "en" : "vi",
    goals: Array.isArray(row.goals) && row.goals.every(goal => typeof goal === "string") ? row.goals : [],
    tone: text(row, "preferred_tone"),
    onboarded: row.onboarding_completed === true,
    currentStreak: typeof row.current_streak === "number" ? row.current_streak : 0,
    lastActivityDate: typeof row.last_activity_date === "string" ? row.last_activity_date : ""
  } : defaults;
  return {
    profile,
    birth: birth ? {
      birthDate: typeof birth.birth_date === "string" ? birth.birth_date : "",
      birthTime: typeof birth.birth_time === "string" ? birth.birth_time : "",
      birthTimeUnknown: birth.birth_time_known === false,
      birthPlace: typeof birth.birth_place === "string" ? birth.birth_place : "",
      consentVersion: typeof birth.consent_version === "string" ? birth.consent_version : undefined
    } : null
  };
}

/** Signed-in start-up reads the server profile when the device copy is missing or still says "not onboarded". */
export function shouldReadRemoteProfile(saved: Profile | null | undefined) {
  return !saved || saved.onboarded !== true;
}

/**
 * Which profile the app starts with. The device copy wins for everyday fields, but onboarding is one-way:
 * if the account's own server profile says it finished onboarding, a stale device copy (saved at sign-in
 * before onboarding, or by an older build) must not send the person back to "BƯỚC 2/2" (device test 28/11).
 */
export function resolveRestoredProfile(saved: Profile | null | undefined, remote: Profile | null | undefined, fallback: Profile): Profile {
  if (!saved) return remote ?? fallback;
  if (saved.onboarded === true || remote?.onboarded !== true) return saved;
  return { ...saved, onboarded: true, goals: saved.goals?.length ? saved.goals : remote.goals };
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid personal data");
  return value as Record<string, unknown>;
}
function text(row: Record<string, unknown>, key: string) {
  if (typeof row[key] !== "string") throw new Error("Invalid personal data");
  return row[key] as string;
}

export function mapJournalRows(rows: unknown[]): JournalEntry[] {
  return rows.map(value => {
    const row = record(value);
    const source = text(row, "source_type");
    if (!["tarot", "chat", "daily", "astrology", "manual", "share_card"].includes(source)) {
      throw new Error("Unsupported journal source");
    }
    return {
      id: typeof row.local_id === "string" ? row.local_id : text(row, "id"),
      remoteId: text(row, "id"),
      syncStatus: "synced",
      sourceType: source as JournalEntry["sourceType"],
      title: text(row, "title"), summary: text(row, "summary"), createdAt: text(row, "created_at"),
      mood: typeof row.mood === "string" ? row.mood : undefined,
      userNote: typeof row.user_note === "string" ? row.user_note : undefined,
      sourceId: typeof row.source_id === "string" ? row.source_id : undefined,
      sourceSnapshot: row.source_snapshot ? record(row.source_snapshot) : undefined
    };
  });
}

/** Server is authoritative for synced rows; unsynced local work survives. */
export function mergeJournal(local: JournalEntry[], remote: JournalEntry[], hiddenIds: string[] = [], baseline: JournalEntry[] = local) {
  // Only unchanged rows in the request-start snapshot can be authoritatively
  // replaced/deleted. A POST may finish while an older GET is still in flight.
  const original = new Map(baseline.map(entry => [entry.id, entry]));
  const localPending = local.filter(entry => entry.syncStatus !== "synced" || original.get(entry.id) !== entry);
  const pendingIds = new Set(localPending.map(entry => entry.id));
  return [...localPending, ...remote.filter(entry => !pendingIds.has(entry.id))]
    .filter(entry => !hiddenIds.includes(entry.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function mapDailyInsight(value: unknown): DailyInsight | null {
  if (!value) return null;
  const row = record(value);
  const content = record(typeof row.content === "string" ? JSON.parse(row.content) : row.content);
  return {
    id: text(row, "id"), dateKey: text(row, "date_key"), createdAt: text(row, "created_at"),
    title: text(content, "title"), text: text(content, "text"),
    reflectionPrompt: text(content, "reflectionPrompt"), source: "backend",
    rerollCount: typeof content.rerollCount === "number" ? content.rerollCount : 0
  };
}

export function mapPersonaMessages(rows: unknown[], personas: Persona[]): ChatMessage[] {
  return rows.flatMap(value => {
    const row = record(value);
    if (row.role !== "user" && row.role !== "guide") return [];
    const relation = Array.isArray(row.personas) ? row.personas[0] : row.personas;
    const slug = typeof row.persona_slug === "string"
      ? row.persona_slug
      : relation && typeof relation === "object" ? (relation as Record<string, unknown>).slug : undefined;
    const persona = personas.find(item => item.id === row.persona_id || item.slug === slug);
    // Old rows can legitimately reference a retired guide. Do not let one
    // legacy row prevent the rest of this person's history from syncing.
    if (!persona) return [];
    return [{
      id: text(row, "id"), personaId: persona.id, role: row.role,
      text: text(row, "content"), createdAt: text(row, "created_at"),
      promptVersionId: typeof row.prompt_version_id === "string" ? row.prompt_version_id : undefined,
      uiMetadata: { sessionId: text(row, "session_id"), remote: true }
    }];
  });
}

export function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const ids = new Set(local.map(item => item.id));
  return [...local, ...remote.filter(item => !ids.has(item.id))];
}
