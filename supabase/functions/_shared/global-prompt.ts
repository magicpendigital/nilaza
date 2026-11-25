// Admin A5 (review AI-03): Council and Daily read their configurable guide from the active global prompt_versions
// row, the same way Tarot does (tarot-prompt.ts): exact feature, owner global, locale, status active. A missing,
// ambiguous, unreadable or unsafe row falls back to the canonical text in packages/agent-config/prompt-library.json.
// The caller always appends its locked safety and output rules after this text; nothing here can remove them.
import promptLibrary from "../../../packages/agent-config/prompt-library.json" with { type: "json" };

export type PromptLanguage = "vi" | "en";
export type GlobalPromptFeature = "daily_insight" | "ai_council" | "numerology_private_message";
export type GlobalPromptFallbackReason = "missing_active" | "invalid_active" | "ambiguous_active" | "lookup_unavailable";
export type GlobalPrompt = {
  feature: GlobalPromptFeature;
  text: string;
  locale: PromptLanguage;
  /** prompt_versions.id when read from the database. */
  recordId: string | null;
  version: string;
  source: "supabase_active_prompt" | "local_canonical";
  fallbackReason: GlobalPromptFallbackReason | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VERSION = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,159}$/;
const LIBRARY_IDS: Record<GlobalPromptFeature, string> = {
  daily_insight: "daily_insight_system", ai_council: "ai_council_system",
  // 2026-11-25: the numerology private message guide. Not Admin-editable in this batch; the row is seeded by migration.
  numerology_private_message: "numerology_private_message_system"
};

/**
 * Defence in depth for operator prose, not semantic safety: the same rules as isUsableTarotPromptText and the database
 * check nilaza_private.prompt_text_problem (migration 20261113095000).
 */
export function isUsablePromptText(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim() || value.length > 12000) return false;
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) return false;
  if (/<\|[^>]+\|>|\[\/?INST\]|\[\/?(?:SYSTEM|ASSISTANT|USER)\]/i.test(value)) return false;
  if (/(?:ignore|override|bypass|disable)\s+(?:all\s+)?(?:safety|system|previous|guardrails|instructions)/i.test(value)) return false;
  return !/bỏ qua\s+(?:mọi\s+)?(?:an toàn|hệ thống|chỉ dẫn|ranh giới)/i.test(value);
}

export function normalizePromptLanguage(value: unknown): PromptLanguage {
  return value === "en" ? "en" : "vi";
}

type LibraryEntry = { id?: string; feature?: string; status?: string; version?: string; prompt?: Record<string, string | undefined> };

export function localCanonicalPrompt(feature: GlobalPromptFeature, languageInput: unknown, reason: GlobalPromptFallbackReason): GlobalPrompt {
  const locale = normalizePromptLanguage(languageInput);
  const entry = (promptLibrary as LibraryEntry[]).find((item) => item.id === LIBRARY_IDS[feature] && item.feature === feature && item.status === "active");
  const text = entry?.prompt?.[locale];
  if (!entry?.version || !isUsablePromptText(text)) throw new Error(`Canonical ${feature} prompt is unavailable`);
  return { feature, text: text.trim(), locale, recordId: null, version: entry.version, source: "local_canonical", fallbackReason: reason };
}

type Row = Record<string, unknown>;
const asRow = (value: unknown): Row | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Row : null;

function validActiveRow(row: Row | null, feature: GlobalPromptFeature, locale: PromptLanguage): boolean {
  return !!row && typeof row.id === "string" && UUID.test(row.id) && row.feature === feature && row.owner_type === "global"
    && row.owner_id === null && row.status === "active" && row.locale === locale
    && typeof row.version === "string" && VERSION.test(row.version)
    && typeof row.published_at === "string" && Number.isFinite(Date.parse(row.published_at)) && isUsablePromptText(row.prompt_text);
}

/** The configured guide for one feature and language; never throws for a database problem. */
export async function resolveGlobalPrompt(
  supabase: { from: (table: string) => any } | null,
  feature: GlobalPromptFeature,
  languageInput: unknown
): Promise<GlobalPrompt> {
  const locale = normalizePromptLanguage(languageInput);
  if (!supabase) return localCanonicalPrompt(feature, locale, "lookup_unavailable");
  try {
    const { data, error } = await supabase.from("prompt_versions")
      .select("id,feature,owner_type,owner_id,version,status,locale,prompt_text,published_at")
      .eq("feature", feature).eq("owner_type", "global").is("owner_id", null)
      .eq("status", "active").eq("locale", locale)
      .order("published_at", { ascending: false, nullsFirst: false }).limit(2);
    if (error) return localCanonicalPrompt(feature, locale, "lookup_unavailable");
    if (!Array.isArray(data)) return localCanonicalPrompt(feature, locale, "invalid_active");
    if (!data.length) return localCanonicalPrompt(feature, locale, "missing_active");
    // The one-active index (20261113095000) makes a second row impossible; before it is applied, refuse to guess.
    if (data.length > 1) return localCanonicalPrompt(feature, locale, "ambiguous_active");
    const row = asRow(data[0]);
    if (!validActiveRow(row, feature, locale)) return localCanonicalPrompt(feature, locale, "invalid_active");
    return {
      feature, text: (row!.prompt_text as string).trim(), locale, recordId: row!.id as string, version: row!.version as string,
      source: "supabase_active_prompt", fallbackReason: null
    };
  } catch {
    return localCanonicalPrompt(feature, locale, "lookup_unavailable");
  }
}

/** Trace and usage metadata; never contains prompt text. */
export function globalPromptMetadata(prompt: GlobalPrompt) {
  return {
    systemPromptSource: prompt.source,
    systemPromptVersion: prompt.version,
    systemPromptRecordId: prompt.recordId,
    systemPromptLocale: prompt.locale,
    systemPromptFallbackReason: prompt.fallbackReason
  };
}
