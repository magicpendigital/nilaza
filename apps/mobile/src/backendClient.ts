import { answerCorrelationHeaders, answerProvenanceSchema, createAnswerAttempt, parseAnswerProvenance, type AnswerCorrelation, type AnswerProvenance } from "../../../packages/ai-contracts/answer-provenance";
import { validateTarotOutput } from "../../../packages/ai-contracts/tarot-output";
import { validAstrologyAiResponse } from "./features/astrology/astrologyAiValidation";
import { AI_FEEDBACK_SCHEMA, parseFeedbackSubmission, parseFeedbackReceipt, parseFeedbackExport, type FeedbackSubmission, type FeedbackReceipt, type FeedbackExport } from "../../../packages/ai-contracts/feedback";
import { createClient } from "@supabase/supabase-js";
import type { AccountScope } from "./auth/accountScope";
import type { ShareEventPayload } from "./features/share/shareEvents";
import type { JournalAck, JournalMutation } from "./features/journal/journalRepository";
import { parseAdminAccess } from "./features/owner/access";
import type { AstrologyAiInvocation, AstrologyAiInsightResponse, AstrologyAiInsightResult } from "./features/astrology/astrologyAiInsight";
import { parseTarotClarifier, parseTarotGuestDraw, parseTarotServerDraw, type TarotClarifier, type TarotGuestDraw, type TarotServerDraw } from "./features/tarot/serverDraw";
import { MAX_NOTE_ATTEMPTS, parseReaderSuggestion, parseTarotNoteResponse, type ReaderAiSuggestion, type TarotNoteOutcome } from "./features/tarot/tarotNote";
import type { PrivateMessagePayload } from "./features/numerology/aiPayload";
import {
  ChatHandoffContext,
  DailyInsight,
  DevicePushRegistration,
  InAppNotification,
  JournalEntry,
  Language,
  NotificationPreference,
  NotificationType,
  OracleActionCard,
  OracleHandoffContext,
  OracleIntent,
  Persona,
  Profile,
  TarotCard,
  TarotDeck,
  ZodiacPulse
} from "./types";

export type SyncResult = {
  status: "synced" | "local_fallback";
  remoteId?: string;
};

export type PublishedContentBundle = {
  id: string;
  bundleKey: string;
  version: number;
  schemaVersion: number;
  sourceVersion: string;
  status: "published";
  publishedAt?: string;
  payload: {
    personas: Persona[];
    decks: TarotDeck[];
    baseCards?: TarotCard[];
    cards: TarotCard[];
    assets?: Array<Record<string, unknown>>;
    frontendContent?: Array<Record<string, unknown>>;
  };
};

export type NotificationRegisterInput = DevicePushRegistration & {
  enabledTypes: NotificationType[];
};

export type NotificationPreferencesInput = {
  preferences: NotificationPreference[];
  locale: Language;
  timezone?: string;
};

export type NotificationPreferencesResult = SyncResult & {
  preferences?: NotificationPreference[];
};

export type NotificationInboxInput = {
  notifications: InAppNotification[];
};

export type NotificationInboxResult = SyncResult & {
  notifications?: InAppNotification[];
};

export type NotificationTestInput = {
  locale: Language;
  targetRoute?: InAppNotification["targetRoute"];
};

export type NotificationTestResult = SyncResult & {
  notification?: InAppNotification;
};

export type ProfileSyncInput = {
  profile: Profile;
  birthProfile: {
    birthDate?: string;
    birthTime?: string;
    birthTimeKnown: boolean;
    birthPlace?: string;
    consentVersion?: string;
    timezone?: string;
  };
};

export type JournalSyncInput = Omit<JournalEntry, "id"> & {
  localId: string;
};

export type DailyInsightInput = {
  language: Language;
  dateKey: string;
  rerollCount: number;
  profile: Pick<Profile, "nickname" | "goals" | "tone">;
  /** Owner 2026-11-04: only the latest mood label written in the last 24 hours; never journal text. */
  recentMood?: string;
};

export type DailyZodiacPulseInput = {
  language: Language;
  dateKey: string;
  profile: Pick<Profile, "nickname" | "goals" | "tone">;
  birthProfile: {
    birthDate?: string;
    birthTime?: string;
    birthTimeKnown: boolean;
    birthPlace?: string;
    consentVersion?: string;
    timezone?: string;
  };
  recentEntries: Array<Pick<JournalEntry, "title" | "sourceType" | "mood" | "createdAt">>;
};

export type DailyZodiacPulseResult = ZodiacPulse & {
  calculationVersion: string;
};

export type PersonaReplyInput = {
  language: Language;
  persona: Pick<Persona, "id" | "slug" | "type" | "name" | "displayRole" | "sourceInspiration" | "transparencyNote">;
  text: string;
  /** Existing remote UUID when this message continues a signed-in session. */
  sessionId?: string;
  /** Opaque client correlation id; never contains prompt or personal data. */
  clientRequestId?: string;
  /** Recent Persona-room turns only; journal/birth/raw context is excluded. */
  sanitizedHistory?: Array<{
    role: "user" | "guide";
    text: string;
  }>;
  userContext: {
    goals: string[];
    tone: string;
    /** CH-13 (Owner 2026-11-04): the chosen name, so the guide can address the person. */
    nickname?: string;
    handoffContext?: ChatHandoffContext;
  };
};

export type PersonaReplyResult = {
  text: string;
  /** Batch B local reading: per-card body (position voice + topic meaning) in both languages. */
  cardInterpretations?: Array<{ vi: string; en: string }>;
  promptVersionId?: string;
  moderationStatus: "passed" | "blocked" | "fallback";
  /** Set when the shared safety policy answered instead of the model; "crisis" shows the 115 card. */
  safety?: "crisis" | "boundary";
  remoteSessionId?: string;
  methodPackId?: string;
  methodPackVersion?: string;
  persistenceStatus?: "stored" | "session_error" | "message_error" | "auth_error" | "skipped";
  /** Additive (persona chat tiers 2026-11-25): "standard", "deep_knowledge" or "premium" with its localized label. */
  modelTier?: { key: string; label?: string };
};

export type AiCouncilInput = {
  language: Language;
  councilId: "ai_council";
  /** Version of the published Council Builder configuration. */
  councilVersion: string;
  /** Version of the shared request/response contract. */
  councilContractVersion: string;
  councilTemplate: {
    id: string;
    meetingMode: string;
    synthesisMode: string;
    maxGuidesPerTurn: number;
    guideRoles: Array<{
      personaId: string;
      personaSlug: string;
      role: string;
    }>;
    outputContract: string[];
  };
  userMessage: string;
  selectedPersonas: Array<Pick<Persona, "id" | "slug" | "type" | "name" | "displayRole" | "sourceInspiration" | "transparencyNote">>;
  userContext: {
    goals: string[];
    tone: string;
  };
  sanitizedHistory: Array<{
    role: "user" | "guide";
    text: string;
    personaId?: string;
  }>;
};

export type AiCouncilResult = {
  turns: Array<{
    personaId: string;
    text: string;
    lens?: string;
    kind?: "opening" | "perspective" | "response" | "synthesis";
    replyToPersonaId?: string;
    sequence?: number;
    promptVersionId?: string;
  }>;
  schemaVersion?: "ai_council_rounds_v2" | "ai_council_turns_v1";
  suggestedFollowUps?: string[];
  transcriptSummary?: string;
  synthesis?: {
    consensus: string;
    tensions: string[];
    assumptions: string[];
    nextStep: string;
    reflectionQuestion: string;
  };
  promptVersionId?: string;
  councilConfigVersionId?: string;
  councilConfigSource?: "supabase_active_config" | "mobile_payload";
  councilTemplateId?: string;
  meetingMode?: string;
  synthesisMode?: string;
  moderationStatus: "passed" | "blocked" | "fallback";
  /** Set with no turns when the shared safety policy answered; safetyText is the reply to show. */
  safety?: "crisis" | "boundary";
  safetyText?: string;
  remoteSessionId?: string;
  persistenceStatus?: "stored" | "session_error" | "message_error" | "auth_error" | "skipped";
};

export type OracleTurnInput = {
  language: Language;
  userMessage: string;
  currentScreen: string;
  profile: Partial<Pick<Profile, "nickname" | "goals" | "tone">>;
  recentSafeContext: Array<Pick<JournalEntry, "title" | "sourceType" | "mood" | "createdAt">>;
  consentFlags: {
    journalMemory: boolean;
    birthProfile: boolean;
    /** oracle-ai-tools-2026-11-11: let the server use the recent turns and the nickname/goals/tone. */
    history?: boolean;
    profile?: boolean;
  };
  sanitizedHistory: Array<{
    role: "user" | "oracle";
    text: string;
    intent?: OracleIntent;
  }>;
};

export type OracleTurnResult = {
  reply: string;
  intent: OracleIntent;
  confidence: number;
  actionCards: OracleActionCard[];
  handoffContext?: OracleHandoffContext;
  promptVersionId?: string;
  moderationStatus: "passed" | "blocked" | "fallback";
  /** Set on the on-device crisis or boundary reply. */
  safety?: "crisis" | "boundary";
};

export type TarotInterpretationInput = {
  /** P1-A: set for a signed-in account; the server interprets only this stored draw (selectedCards must match it). */
  drawId?: string;
  language: Language;
  deck: Pick<TarotDeck, "id" | "slug" | "name" | "readingStyle" | "accessTier">;
  topic: string;
  spread: string;
  question: string;
  selectedCards: Array<
    Pick<TarotCard, "id" | "name" | "uprightMeaning" | "reversedMeaning" | "reflectionQuestion"> & {
      reversed: boolean;
      spread: string;
      positionKey?: string;
      positionLabel?: {
        vi?: string;
        en: string;
      };
      orientation?: "upright" | "reversed";
    }
  >;
};

/** P1-A: what the app sends to open (or reopen) today's server draw for one topic and spread. */
export type TarotDrawInput = {
  language: Language;
  deck: Pick<TarotDeck, "id" | "slug">;
  topic: string;
  spread: string;
  question: string;
  /** Pack 1: the random install id of the signed-out preview; a NEW draw then keeps the cards that device saw. */
  guestDeviceId?: string;
};

export type TarotInterpretationResult = {
  /** P1-A server draw: the stored draw this answer belongs to; a replayed answer was read back, not generated again. */
  drawId?: string;
  replayed?: boolean;
  nextDrawAt?: string;
  clarifier?: TarotClarifier;
  provenance?: AnswerProvenance;
  summary: string;
  reflection: string;
  sections?: Array<{
    key: string;
    title: {
      vi?: string;
      en: string;
    };
    body: {
      vi?: string;
      en: string;
    };
  }>;
  promptVersionId?: string;
  moderationStatus: "passed" | "blocked" | "fallback";
};

export type BackendOptions = {
  apiKey?: string;
  authToken?: string;
  baseUrl?: string;
  timeoutMs?: number;
  userId?: string;
  /** Explicit database URL, independent of a custom Edge Function gateway. */
  supabaseUrl?: string;
  session?: AccountScope;
};

const defaultTimeoutMs = 8000;
// A single timeout makes a fast chat feel sluggish and makes a deeper reading
// fail too early. These are client patience windows, not provider billing caps.
const generationTimeoutMs = {
  // Server waits up to 60 s per model, two attempts (Owner 2026-11-03); keep a margin for storage.
  astrology: 140000,
  council: 90000,
  daily: 45000,
  oracle: 60000,
  // Persona chat tiers (2026-11-25): the server may wait up to 135-140 s for a JSON reply (knowledge guides).
  persona: 150000,
  tarot: 75000,
  zodiac: 45000
} as const;

function isAccountScopeActive(session: BackendOptions["session"]) {
  return session?.active === true;
}

// A model call can complete after an Edge Function cold start and persistence
// work. Do not replace a valid remote answer with the local fallback early.
function generationOptions(options: BackendOptions, patienceMs: number): BackendOptions {
  return { ...options, timeoutMs: Math.max(options.timeoutMs ?? 0, patienceMs) };
}

const supabaseFunctionPathMap: Record<string, string> = {
  "/account/delete": "/account-delete",
  "/ai/feedback": "/ai-feedback",
  "/share/events": "/share-events",
  "/ai/oracle-turn": "/ai-oracle-turn",
  "/ai/persona-chat": "/ai-persona-chat",
  "/ai/ai-council": "/ai-council",
  "/ai/tarot-reading": "/ai-tarot-reading",
  "/ai/numerology-message": "/ai-numerology-message",
  "/tarot/guest-draw": "/tarot-guest-draw",
  "/ai/daily-insight": "/ai-daily-insight",
  "/ai/daily-zodiac-pulse": "/ai-daily-zodiac-pulse",
  "/ai/astrology-insight": "/ai-astrology-insight",
  "/profile/upsert": "/profile-upsert",
  "/journal/entries": "/journal-entries",
  "/notifications/register-device": "/notification-register-device",
  "/notifications/preferences": "/notification-preferences",
  "/notifications/inbox": "/notification-inbox",
  "/notifications/send-test": "/notification-send-test",
  "/user-credits": "/user-credits",
  "/user-credits/deduct": "/user-credits"
};

function resolveBackendPath(baseUrl: string, path: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const mappedPath = normalizedBaseUrl.endsWith("/functions/v1") ? supabaseFunctionPathMap[path] ?? path : path;
  return `${normalizedBaseUrl}${mappedPath}`;
}

async function getJson<TResult>(path: string, options: BackendOptions): Promise<TResult | null> {
  options = currentOptions(options);
  if (!options.baseUrl) return null;

  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.session?.controller.signal.addEventListener("abort", cancel);
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? defaultTimeoutMs);

  try {
    const headers: Record<string, string> = {};
    if (options.apiKey) headers.apikey = options.apiKey;
    if (options.authToken) headers.Authorization = `Bearer ${options.authToken}`;

    const response = await fetch(resolveBackendPath(options.baseUrl, path), {
      method: "GET",
      headers,
      signal: controller.signal
    });

    if (!response.ok || options.session?.active === false) return null;
    return (await response.json()) as TResult;
  } catch {
    return null;
  } finally {
    options.session?.controller.signal.removeEventListener("abort", cancel);
    clearTimeout(timeout);
  }
}

/** A server answer the user must see (sign in first, or today's allowance is used). */
export class BackendLimitError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); this.name = "BackendLimitError"; }
}

/** P1-A: Tarot did not open a new draw or answer today (daily_limit_reached or tarot_reading_locked) and when it opens again. */
export class TarotLimitError extends BackendLimitError {
  constructor(code: string, status: number, readonly reason?: string, readonly nextDrawAt?: string) { super(code, status); this.name = "TarotLimitError"; }
}

/**
 * The request reached no usable answer: offline (no connection), busy (timeout, server error or an
 * unreadable answer) or auth (the sign-in expired). Chat and Council show this instead of a canned reply.
 */
export type BackendUnavailableReason = "offline" | "busy" | "auth";
export class BackendUnavailableError extends Error {
  constructor(readonly reason: BackendUnavailableReason, readonly status?: number) { super(reason); this.name = "BackendUnavailableError"; }
}

/**
 * surfaceLimits: true throws sign-in, daily-limit and paused errors; "paused" throws only feature_paused;
 * "limits" throws feature_paused and daily_limit_reached (chat and Tarot, server limits 2026-11-11).
 * surfaceUnavailable: throw BackendUnavailableError instead of returning null when the request fails
 * (2026-11-11). A request cancelled by its session still returns null quietly.
 */
async function postJson<TInput, TResult>(path: string, input: TInput, options: BackendOptions, correlation?: AnswerCorrelation, surfaceLimits: boolean | "paused" | "limits" = false, surfaceUnavailable = false): Promise<TResult | null> {
  options = currentOptions(options);
  if (!options.baseUrl) return null;

  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.session?.controller.signal.addEventListener("abort", cancel);
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? defaultTimeoutMs);
  const unavailable = (status: number) => {
    if (!surfaceUnavailable || options.session?.active === false) return null;
    throw new BackendUnavailableError(status === 401 ? "auth" : "busy", status);
  };

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(correlation ? answerCorrelationHeaders(correlation) : {})
    };
    if (options.apiKey) headers.apikey = options.apiKey;
    if (options.authToken) headers.Authorization = `Bearer ${options.authToken}`;

    const response = await fetch(resolveBackendPath(options.baseUrl, path), {
      method: "POST",
      headers,
      body: JSON.stringify(input),
      signal: controller.signal
    });

    if (surfaceLimits && [401, 429, 503].includes(response.status) && options.session?.active !== false) {
      const body = (await response.json().catch(() => ({}))) as { error?: unknown };
      const code = typeof body.error === "string" ? body.error : String(response.status);
      // A feature paused from Admin is shown as resting; other 503s still fall back as before.
      if (code === "feature_paused" || (surfaceLimits === true && response.status !== 503)
        || (surfaceLimits === "limits" && code === "daily_limit_reached")) throw new BackendLimitError(code, response.status);
      return unavailable(response.status);
    }
    if (options.session?.active === false) return null;
    if (!response.ok) return unavailable(response.status);
    try {
      return (await response.json()) as TResult;
    } catch {
      return unavailable(response.status === 401 ? 500 : 502);
    }
  } catch (error) {
    if (error instanceof BackendLimitError || error instanceof BackendUnavailableError) throw error;
    if (!surfaceUnavailable || options.session?.active === false || options.session?.controller.signal.aborted) return null;
    // A timeout means the AI took too long; any other thrown fetch error means no connection.
    throw new BackendUnavailableError(timedOut ? "busy" : "offline");
  } finally {
    options.session?.controller.signal.removeEventListener("abort", cancel);
    clearTimeout(timeout);
  }
}

/** Deletes the signed-in account through account-delete (nilaza.account-delete.v1). Returns an error code or null. */
export async function requestAccountDeletion(backendOptions: BackendOptions): Promise<string | null> {
  const options = currentOptions(backendOptions);
  if (!options.baseUrl || !options.authToken || options.session?.active === false) return "authentication_required";
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${options.authToken}` };
    if (options.apiKey) headers.apikey = options.apiKey;
    const response = await fetch(resolveBackendPath(options.baseUrl, "/account/delete"), {
      method: "POST",
      headers,
      body: JSON.stringify({ confirm: "delete-my-account" })
    });
    const body = (await response.json().catch(() => ({}))) as { status?: unknown; error?: unknown };
    if (response.ok && body.status === "completed") return null;
    return typeof body.error === "string" ? body.error : "deletion_unavailable";
  } catch {
    return "deletion_unavailable";
  }
}

export class FeedbackRequestError extends Error {
  constructor(readonly code: string, readonly status?: number) { super(code); this.name = "FeedbackRequestError"; }
}

/**
 * Sends share measurements (enumerated values only) to the server. Best effort: it needs a signed-in session, never
 * throws and never delays the share, so the app behaves the same when the function is not deployed yet.
 */
export async function sendShareEvents(events: ShareEventPayload[], backendOptions: BackendOptions): Promise<boolean> {
  const options = currentOptions(backendOptions);
  if (!events.length || !options.baseUrl || !options.authToken || options.session?.active === false) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(resolveBackendPath(options.baseUrl, "/share/events"), {
      method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${options.authToken}`, ...(options.apiKey ? { apikey: options.apiKey } : {}) },
      body: JSON.stringify({ events })
    });
    return response.status === 202;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function feedbackRequest(payload: unknown, backendOptions: BackendOptions): Promise<unknown> {
  const options = currentOptions(backendOptions);
  if (!options.baseUrl || !options.authToken || options.session?.active === false) throw new FeedbackRequestError("authentication_required", 401);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.session?.controller.signal.addEventListener("abort", cancel);
  const timer = setTimeout(cancel, options.timeoutMs ?? defaultTimeoutMs);
  try {
    if (options.session?.controller.signal.aborted) throw new FeedbackRequestError("account_closed", 401);
    const response = await fetch(resolveBackendPath(options.baseUrl, "/ai/feedback"), {
      method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${options.authToken}`, ...(options.apiKey ? { apikey: options.apiKey } : {}) },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => undefined);
    if (options.session && !isAccountScopeActive(options.session)) throw new FeedbackRequestError("account_closed", 401);
    if (!response.ok) throw new FeedbackRequestError(body?.error === "answer_receipt_unavailable" ? "answer_receipt_unavailable" : response.status === 401 || response.status === 403 ? "authentication_required" : response.status === 429 ? "rate_limited" : response.status === 409 ? "feedback_conflict" : "feedback_unavailable", response.status);
    return body;
  } catch (error) {
    if (error instanceof FeedbackRequestError) throw error;
    if (options.session && !isAccountScopeActive(options.session)) throw new FeedbackRequestError("account_closed", 401);
    throw new FeedbackRequestError(controller.signal.aborted ? "request_timeout" : "network_unavailable");
  } finally { clearTimeout(timer); options.session?.controller.signal.removeEventListener("abort", cancel); }
}

export async function submitAiFeedback(input: FeedbackSubmission, options: BackendOptions): Promise<FeedbackReceipt> {
  const submission = parseFeedbackSubmission(input);
  if (!submission) throw new FeedbackRequestError("invalid_feedback", 400);
  const result = parseFeedbackReceipt(await feedbackRequest(submission, options), submission.clientFeedbackId);
  if (!result) throw new FeedbackRequestError("invalid_feedback_receipt", 502);
  return result;
}

export async function exportAiFeedback(options: BackendOptions): Promise<FeedbackExport> {
  const result = parseFeedbackExport(await feedbackRequest({ operation: "export" }, options));
  if (!result) throw new FeedbackRequestError("invalid_feedback_receipt", 502);
  return result;
}

export async function deleteAllAiFeedback(options: BackendOptions): Promise<void> {
  const result = await feedbackRequest({ operation: "delete_all" }, options) as Record<string, unknown> | undefined;
  if (!result || result.schemaVersion !== AI_FEEDBACK_SCHEMA || result.operation !== "delete_all" || !Number.isSafeInteger(result.deletedCount) || Number(result.deletedCount) < 0) throw new FeedbackRequestError("invalid_feedback_receipt", 502);
}

export async function generatePersonaReply(
  input: PersonaReplyInput,
  fallback: () => PersonaReplyResult,
  options: BackendOptions = {}
): Promise<PersonaReplyResult> {
  try {
    const backendResult = await postJson<PersonaReplyInput, PersonaReplyResult>("/ai/persona-chat", input, generationOptions(options, generationTimeoutMs.persona), undefined, "limits", true);
    return backendResult ?? fallback();
  } catch (error) {
    return localSafetyReplyOrThrow(error, fallback);
  }
}

/**
 * When the AI is unreachable, the on-device crisis or boundary reply still answers; anything else is
 * rethrown so the room says why (no connection, busy) instead of showing a canned reply.
 */
function localSafetyReplyOrThrow<T extends { safety?: unknown }>(error: unknown, fallback: () => T): T {
  if (error instanceof BackendUnavailableError) {
    const local = fallback();
    if (local.safety) return local;
  }
  throw error;
}

/* ------------------------------------------------------------------------------------------------
 * Persona chat streaming (docs/contracts/persona-chat-streaming.md, 2026-11-25).
 * Transport: expo/fetch (Expo SDK 52+), whose response.body is a ReadableStream on Android and iOS;
 * React Native's built-in fetch buffers the whole body, so it cannot show text progressively.
 * ---------------------------------------------------------------------------------------------- */

export type SseEvent = { event: string; data: string };

/**
 * Incremental Server-Sent Events parser (WHATWG event-stream rules). Chunks may split anywhere, including
 * between "\r" and "\n"; lines starting with ":" are comments (heartbeats); several data lines join with "\n".
 */
export function createSseParser(onEvent: (event: SseEvent) => void, onComment?: (text: string) => void) {
  let buffer = "";
  let eventName = "";
  let dataLines: string[] = [];
  let hasData = false;

  const dispatch = () => {
    if (hasData) onEvent({ event: eventName || "message", data: dataLines.join("\n") });
    eventName = "";
    dataLines = [];
    hasData = false;
  };

  const processLine = (line: string) => {
    if (line === "") { dispatch(); return; }
    if (line.startsWith(":")) { onComment?.(line.slice(1).trim()); return; }
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") eventName = value;
    else if (field === "data") { dataLines.push(value); hasData = true; }
    // "id" and "retry" are not used by this contract.
  };

  const drain = (final: boolean) => {
    let start = 0;
    for (let index = 0; index < buffer.length; index += 1) {
      const char = buffer[index];
      if (char !== "\n" && char !== "\r") continue;
      // A trailing "\r" may be the first half of "\r\n": wait for the next chunk unless the stream ended.
      if (char === "\r" && index === buffer.length - 1 && !final) break;
      processLine(buffer.slice(start, index));
      if (char === "\r" && buffer[index + 1] === "\n") index += 1;
      start = index + 1;
    }
    buffer = buffer.slice(start);
  };

  return {
    push(chunk: string) {
      if (!chunk) return;
      buffer += chunk;
      drain(false);
    },
    /** End of stream: a last line without a blank line after it is not dispatched (per the spec). */
    end() {
      drain(true);
      buffer = "";
      eventName = "";
      dataLines = [];
      hasData = false;
    }
  };
}

export type PersonaStreamMeta = {
  modelTier?: string;
  modelTierLabel?: string;
  outputStyle?: string;
  deadlineMs?: number;
  clientRequestId?: string;
};

export type PersonaStreamHandlers = {
  onMeta?: (meta: PersonaStreamMeta) => void;
  /** Called with the whole text built from deltas so far (a preview; done.text replaces it). */
  onDelta?: (accumulatedText: string) => void;
  /** Abort when the room or app goes away; the server still finishes and saves the turn (contract rule 5). */
  signal?: AbortSignal;
};

/**
 * The stream stopped after some text was shown ("stream_interrupted" / "connection_lost" / "timeout"), or the
 * caller aborted ("aborted"). partialText is what the user already saw; the turn is not stored on the server.
 */
export class PersonaStreamError extends Error {
  constructor(
    readonly code: "stream_interrupted" | "internal_error" | "connection_lost" | "timeout" | "aborted",
    readonly retryable: boolean,
    readonly partialText: string,
    readonly persistenceStatus?: string
  ) {
    super(code);
    this.name = "PersonaStreamError";
  }
}

type StreamChunk = { done: boolean; value?: Uint8Array };
type StreamReader = { read(): Promise<StreamChunk>; cancel?(reason?: unknown): unknown };
type StreamResponse = {
  ok: boolean;
  status: number;
  headers?: { get(name: string): string | null } | null;
  body?: { getReader?: () => StreamReader } | null;
  json(): Promise<unknown>;
};
export type StreamFetch = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<StreamResponse>;
type TextDecoderLike = { decode(input?: Uint8Array, options?: { stream?: boolean }): string };
type PersonaStreamOutcome = { kind: "done"; result: PersonaReplyResult } | { kind: "error"; code: string; retryable: boolean; persistenceStatus?: string };
type TextDecoderCtor = new (label?: string) => TextDecoderLike;

/** Silence (no delta, no ": ping") this long after the first byte means the stream is dead (contract section 4). */
export const PERSONA_STREAM_IDLE_MS = 30000;
/** Total wait before meta arrives; afterwards meta.deadlineMs + margin (the server cap is 135 s on Free, 300 s later). */
export const PERSONA_STREAM_PRE_META_MS = 150000;
export const PERSONA_STREAM_DEADLINE_MARGIN_MS = 15000;

function loadStreamingFetch(): StreamFetch | null {
  try {
    // Lazy so tests and non-native renderers without the ExpoFetchModule fall back to the JSON call.
    const mod = require("expo/fetch") as { fetch?: unknown };
    return typeof mod?.fetch === "function" ? (mod.fetch as StreamFetch) : null;
  } catch {
    return null;
  }
}

function readOrAbort(reader: StreamReader, signal: AbortSignal): Promise<StreamChunk> {
  if (signal.aborted) return Promise.reject(new Error("aborted"));
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      try { Promise.resolve(reader.cancel?.()).catch(() => undefined); } catch { /* already closed */ }
      reject(new Error("aborted"));
    };
    signal.addEventListener("abort", onAbort);
    reader.read().then(
      (chunk) => { signal.removeEventListener("abort", onAbort); resolve(chunk); },
      (error) => { signal.removeEventListener("abort", onAbort); reject(error); }
    );
  });
}

function parseJsonObject(data: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(data);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

const USE_JSON_PATH = Symbol("use-json-path");

/**
 * Persona reply with progressive text. Falls back to generatePersonaReply (the JSON call) when the streaming
 * transport is missing, the server answers JSON (not yet deployed), or the stream breaks before any text.
 * Once text has been shown a failure throws PersonaStreamError with the partial text instead.
 */
export async function streamPersonaReply(
  input: PersonaReplyInput,
  fallback: () => PersonaReplyResult,
  handlers: PersonaStreamHandlers = {},
  backendOptions: BackendOptions = {},
  deps: { streamFetch?: StreamFetch | null; TextDecoder?: TextDecoderCtor | null } = {}
): Promise<PersonaReplyResult> {
  const options = currentOptions(backendOptions);
  const streamFetch = deps.streamFetch !== undefined ? deps.streamFetch : loadStreamingFetch();
  const Decoder = deps.TextDecoder !== undefined ? deps.TextDecoder : (globalThis as { TextDecoder?: TextDecoderCtor }).TextDecoder;
  if (!options.baseUrl || !streamFetch || typeof Decoder !== "function") return generatePersonaReply(input, fallback, backendOptions);

  const controller = new AbortController();
  let stopReason: "user" | "deadline" | "idle" | null = null;
  const stop = (reason: "user" | "deadline" | "idle") => {
    if (!stopReason) stopReason = reason;
    controller.abort();
  };
  // Read through a function: timers and listeners change it, so TypeScript must not narrow it.
  const stoppedBy = (): "user" | "deadline" | "idle" | null => stopReason;
  const onUserAbort = () => stop("user");
  options.session?.controller.signal.addEventListener("abort", onUserAbort);
  handlers.signal?.addEventListener("abort", onUserAbort);
  if (handlers.signal?.aborted || options.session?.controller.signal.aborted) stop("user");
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => stop("deadline"), PERSONA_STREAM_PRE_META_MS);
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const touch = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => stop("idle"), PERSONA_STREAM_IDLE_MS);
  };
  let partial = "";
  let sawDelta = false;

  const run = async (): Promise<PersonaReplyResult | typeof USE_JSON_PATH> => {
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "text/event-stream" };
    if (options.apiKey) headers.apikey = options.apiKey;
    if (options.authToken) headers.Authorization = `Bearer ${options.authToken}`;
    let response: StreamResponse;
    try {
      response = await streamFetch(resolveBackendPath(options.baseUrl!, "/ai/persona-chat"), {
        method: "POST",
        headers,
        body: JSON.stringify({ ...input, stream: true }),
        signal: controller.signal
      });
    } catch {
      if (stoppedBy() === "user") throw new PersonaStreamError("aborted", false, "");
      if (stoppedBy() === "deadline") throw new BackendUnavailableError("busy");
      return USE_JSON_PATH;
    }
    if (stoppedBy() === "user" || options.session?.active === false) throw new PersonaStreamError("aborted", false, "");

    const contentType = response.headers?.get?.("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/event-stream")) {
      // Errors before the model call stay JSON (contract section 2); an older deploy answers JSON on success too.
      if ([401, 429, 503].includes(response.status)) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        const code = typeof body.error === "string" ? body.error : String(response.status);
        if (code === "feature_paused" || code === "daily_limit_reached") throw new BackendLimitError(code, response.status);
        throw new BackendUnavailableError(response.status === 401 ? "auth" : "busy", response.status);
      }
      if (!response.ok) throw new BackendUnavailableError("busy", response.status);
      const result = await response.json().catch(() => null) as PersonaReplyResult | null;
      if (!result || typeof result.text !== "string") throw new BackendUnavailableError("busy", 502);
      return result;
    }

    const reader = response.body?.getReader?.();
    if (!reader) return USE_JSON_PATH;
    const decoder = new Decoder("utf-8");
    let outcome: PersonaStreamOutcome | null = null;
    const parser = createSseParser((event) => {
      if (outcome) return;
      const data = parseJsonObject(event.data);
      if (event.event === "meta" && data) {
        const deadlineMs = typeof data.deadlineMs === "number" && Number.isFinite(data.deadlineMs) && data.deadlineMs > 0 ? data.deadlineMs : undefined;
        if (deadlineMs) {
          if (deadlineTimer) clearTimeout(deadlineTimer);
          deadlineTimer = setTimeout(() => stop("deadline"), deadlineMs + PERSONA_STREAM_DEADLINE_MARGIN_MS);
        }
        handlers.onMeta?.({
          modelTier: typeof data.modelTier === "string" ? data.modelTier : undefined,
          modelTierLabel: typeof data.modelTierLabel === "string" ? data.modelTierLabel : undefined,
          outputStyle: typeof data.outputStyle === "string" ? data.outputStyle : undefined,
          deadlineMs,
          clientRequestId: typeof data.clientRequestId === "string" ? data.clientRequestId : undefined
        });
      } else if (event.event === "delta" && data) {
        if (typeof data.text === "string" && data.text.length > 0) {
          partial += data.text;
          sawDelta = true;
          handlers.onDelta?.(partial);
        }
      } else if (event.event === "done") {
        outcome = data && typeof data.text === "string"
          ? { kind: "done", result: data as unknown as PersonaReplyResult }
          : { kind: "error", code: "internal_error", retryable: true };
      } else if (event.event === "error") {
        outcome = {
          kind: "error",
          code: typeof data?.code === "string" ? data.code : "internal_error",
          retryable: data?.retryable !== false,
          persistenceStatus: typeof data?.persistenceStatus === "string" ? data.persistenceStatus : undefined
        };
      }
    });

    try {
      while (!outcome) {
        const chunk = await readOrAbort(reader, controller.signal);
        if (chunk.done) {
          parser.push(decoder.decode());
          parser.end();
          break;
        }
        touch();
        if (chunk.value) parser.push(decoder.decode(chunk.value, { stream: true }));
      }
    } catch {
      if (stoppedBy() === "user") throw new PersonaStreamError("aborted", false, partial);
      if (stoppedBy() === "deadline") {
        if (sawDelta) throw new PersonaStreamError("timeout", true, partial);
        throw new BackendUnavailableError("busy");
      }
      if (sawDelta) throw new PersonaStreamError("connection_lost", true, partial);
      return USE_JSON_PATH;
    }
    // TypeScript cannot see the assignment inside the parser callback.
    const finalOutcome = outcome as PersonaStreamOutcome | null;
    if (finalOutcome?.kind === "done") {
      try { Promise.resolve(reader.cancel?.()).catch(() => undefined); } catch { /* closed */ }
      return finalOutcome.result;
    }
    if (finalOutcome?.kind === "error") {
      if (!sawDelta) throw new BackendUnavailableError("busy", 502);
      throw new PersonaStreamError(finalOutcome.code === "stream_interrupted" ? "stream_interrupted" : "internal_error", finalOutcome.retryable, partial, finalOutcome.persistenceStatus);
    }
    // Closed without done or error: internal_error, retryable (contract section 3).
    if (sawDelta) throw new PersonaStreamError("connection_lost", true, partial);
    return USE_JSON_PATH;
  };

  let outcome: PersonaReplyResult | typeof USE_JSON_PATH;
  try {
    outcome = await run();
  } catch (error) {
    return localSafetyReplyOrThrow(error, fallback);
  } finally {
    if (deadlineTimer) clearTimeout(deadlineTimer);
    if (idleTimer) clearTimeout(idleTimer);
    deadlineTimer = undefined;
    idleTimer = undefined;
    options.session?.controller.signal.removeEventListener("abort", onUserAbort);
    handlers.signal?.removeEventListener("abort", onUserAbort);
  }
  if (outcome !== USE_JSON_PATH) return outcome;
  if (handlers.signal?.aborted) throw new PersonaStreamError("aborted", false, "");
  return generatePersonaReply(input, fallback, backendOptions);
}

export async function generateAiCouncilTurn(
  input: AiCouncilInput,
  fallback: () => AiCouncilResult,
  options: BackendOptions = {}
): Promise<AiCouncilResult> {
  try {
    const backendResult = await postJson<AiCouncilInput, AiCouncilResult>("/ai/ai-council", input, generationOptions(options, generationTimeoutMs.council), undefined, true, true);
    return backendResult ?? fallback();
  } catch (error) {
    return localSafetyReplyOrThrow(error, fallback);
  }
}

export async function generateOracleTurn(
  input: OracleTurnInput,
  fallback: () => OracleTurnResult,
  options: BackendOptions = {}
): Promise<OracleTurnResult> {
  // oracle-ai-tools-2026-11-11: Oracle answers with the model; limits, pauses and failures are shown, not canned.
  try {
    const backendResult = await postJson<OracleTurnInput, OracleTurnResult>("/ai/oracle-turn", input, generationOptions(options, generationTimeoutMs.oracle), undefined, "limits", true);
    return backendResult ?? fallback();
  } catch (error) {
    return localSafetyReplyOrThrow(error, fallback);
  }
}

type TarotResponse = { status: number; body: Record<string, unknown> };

/** One POST to ai-tarot-reading that keeps the status and body (P1-A needs reason, nextDrawAt and retry hints). */
function postTarot(input: unknown, backendOptions: BackendOptions, patienceMs: number, correlation?: AnswerCorrelation): Promise<TarotResponse | null> {
  return postKeepingStatus("/ai/tarot-reading", input, backendOptions, patienceMs, correlation);
}

/** One POST that keeps the status and body; null when signed out or cancelled, BackendUnavailableError when unreachable. */
async function postKeepingStatus(path: string, input: unknown, backendOptions: BackendOptions, patienceMs: number, correlation?: AnswerCorrelation): Promise<TarotResponse | null> {
  const options = currentOptions(backendOptions);
  if (!options.baseUrl) return null;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.session?.controller.signal.addEventListener("abort", cancel);
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, Math.max(options.timeoutMs ?? 0, patienceMs));
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(correlation ? answerCorrelationHeaders(correlation) : {}) };
    if (options.apiKey) headers.apikey = options.apiKey;
    if (options.authToken) headers.Authorization = `Bearer ${options.authToken}`;
    const response = await fetch(resolveBackendPath(options.baseUrl, path), { method: "POST", headers, body: JSON.stringify(input), signal: controller.signal });
    if (options.session?.active === false) return null;
    const body = await response.json().catch(() => undefined) as unknown;
    return { status: response.status, body: body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {} };
  } catch {
    if (options.session?.active === false || options.session?.controller.signal.aborted) return null;
    throw new BackendUnavailableError(timedOut ? "busy" : "offline");
  } finally {
    options.session?.controller.signal.removeEventListener("abort", cancel);
    clearTimeout(timeout);
  }
}

/** Limits, pauses and locks the user must see; null for anything else (the caller decides). */
function tarotLimitFrom(result: TarotResponse): BackendLimitError | null {
  const code = typeof result.body.error === "string" ? result.body.error : "";
  const reason = typeof result.body.reason === "string" ? result.body.reason : undefined;
  const nextDrawAt = typeof result.body.nextDrawAt === "string" ? result.body.nextDrawAt : undefined;
  if (code === "feature_paused" || code === "premium_required") return new BackendLimitError(code, result.status);
  if (code === "daily_limit_reached" || code === "tarot_reading_locked") return new TarotLimitError(code, result.status, code === "tarot_reading_locked" ? reason ?? "deleted" : reason, nextDrawAt);
  return null;
}

/**
 * P1-A: opens today's server draw for this account, spread and topic, or returns the one already made (same cards,
 * and its stored answer when there is one). Throws TarotLimitError / BackendLimitError for limits and pauses and
 * BackendUnavailableError when the server cannot be reached; it never draws cards on the device.
 */
export async function requestTarotDraw(input: TarotDrawInput, options: BackendOptions): Promise<TarotServerDraw> {
  const result = await postTarot({ action: "draw", language: input.language, deck: { id: input.deck.id, slug: input.deck.slug }, topic: input.topic, spread: input.spread, question: input.question, ...(input.guestDeviceId ? { guestDeviceId: input.guestDeviceId } : {}) }, options, 20000);
  if (!result) throw new BackendUnavailableError("auth");
  const limit = tarotLimitFrom(result);
  if (limit) throw limit;
  if (result.status === 401) throw new BackendUnavailableError("auth", 401);
  const draw = result.status === 200 ? parseTarotServerDraw(result.body) : null;
  if (!draw) throw new BackendUnavailableError("busy", result.status);
  return draw;
}

/**
 * Pack 1: a signed-out guest asks the public tarot-guest-draw function for the cards of one device, spread, topic and Vietnam day.
 * The same device always gets the same cards (asking again is not a redraw) and the app cannot choose them. It sends no account and
 * no question, only the random install id, the spread and the topic. Throws BackendUnavailableError when the server cannot answer
 * (offline, busy, or the secret not set): the caller then shows a local preview card instead.
 */
export async function requestGuestTarotDraw(input: { deviceId: string; spread: string; topic: string }, options: BackendOptions): Promise<TarotGuestDraw> {
  const current = currentOptions(options);
  if (!current.baseUrl || current.session?.active === false) throw new BackendUnavailableError("offline");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (current.apiKey) headers.apikey = current.apiKey;
    const response = await fetch(resolveBackendPath(current.baseUrl, "/tarot/guest-draw"), {
      method: "POST", headers, body: JSON.stringify({ deviceId: input.deviceId, spread: input.spread, topic: input.topic }), signal: controller.signal
    });
    const body = await response.json().catch(() => undefined) as unknown;
    const draw = response.status === 200 ? parseTarotGuestDraw(body) : null;
    if (!draw) throw new BackendUnavailableError("busy", response.status);
    return draw;
  } catch (error) {
    if (error instanceof BackendUnavailableError) throw error;
    throw new BackendUnavailableError(controller.signal.aborted ? "busy" : "offline");
  } finally {
    clearTimeout(timeout);
  }
}

/** P1-A: the one clarifying card of a reading (server draw + library meaning, no AI); the same card on every call. */
export async function requestTarotClarifier(drawId: string, options: BackendOptions): Promise<TarotClarifier> {
  const result = await postTarot({ action: "clarify", drawId }, options, 15000);
  if (!result) throw new BackendUnavailableError("auth");
  const limit = tarotLimitFrom(result);
  if (limit) throw limit;
  const clarifier = result.status === 200 ? parseTarotClarifier(result.body.clarifier) : null;
  if (!clarifier) throw new BackendUnavailableError(result.status === 401 ? "auth" : "busy", result.status);
  return clarifier;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Batch C: the free daily personal note for one server draw ({action:"note", drawId}). A note already being written
 * (409 note_in_progress) is asked again after retryAfterSeconds, at most three attempts. Never throws and never
 * returns canned text: anything unusable is "unavailable" (offline, busy or auth) and the box shows its error state.
 */
export async function requestTarotNote(drawId: string, options: BackendOptions): Promise<TarotNoteOutcome> {
  const current = currentOptions(options);
  if (!current.baseUrl || !current.authToken) return { kind: "unavailable", reason: "auth" };
  for (let attempt = 1; attempt <= MAX_NOTE_ATTEMPTS; attempt += 1) {
    let result: TarotResponse | null;
    try {
      result = await postTarot({ action: "note", drawId }, options, 30000);
    } catch (error) {
      return { kind: "unavailable", reason: error instanceof BackendUnavailableError ? error.reason : "busy" };
    }
    if (!result) return { kind: "unavailable", reason: "auth" };
    const outcome = parseTarotNoteResponse(result.status, result.body);
    if (outcome.kind !== "in_progress") return outcome;
    if (attempt === MAX_NOTE_ATTEMPTS) break;
    await wait(outcome.retryAfterSeconds * 1000);
  }
  return { kind: "unavailable", reason: "busy" };
}

/** What the Numerology "Lời nhắn riêng" card shows after one request (2026-11-25, B1-B8). */
export type NumerologyMessageOutcome =
  | { kind: "message"; message: string; blockIds: string[]; nextMessageAt?: string }
  /** feature_paused or content_not_approved: the card stays "Sắp có" and shows no button. */
  | { kind: "soon" }
  | { kind: "premium_required" }
  /** Today's message was delivered, or the three attempts are used. */
  | { kind: "daily_limit"; nextMessageAt?: string }
  /** A model safety block: calm, no retry today. */
  | { kind: "blocked" }
  | { kind: "unavailable"; reason: "offline" | "busy" | "auth" };

/** Maps one ai-numerology-message answer. Never invents message text. */
export function parseNumerologyMessageResponse(status: number, body: Record<string, unknown>): NumerologyMessageOutcome {
  const error = typeof body.error === "string" ? body.error : "";
  const nextMessageAt = typeof body.nextMessageAt === "string" && body.nextMessageAt ? body.nextMessageAt : undefined;
  if (error === "feature_paused" || error === "content_not_approved") return { kind: "soon" };
  if (status === 403 && error === "premium_required") return { kind: "premium_required" };
  if (status === 429 && error === "daily_limit_reached") return { kind: "daily_limit", nextMessageAt };
  if (status === 401) return { kind: "unavailable", reason: "auth" };
  if (body.moderationStatus === "blocked") return { kind: "blocked" };
  if (status !== 200) return { kind: "unavailable", reason: "busy" };
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const blockIds = Array.isArray(body.blockIds) ? body.blockIds.filter((id): id is string => typeof id === "string") : [];
  if (!message) return { kind: "unavailable", reason: "busy" };
  return { kind: "message", message, blockIds, nextMessageAt };
}

/**
 * 2026-11-25 (B1-B8): asks ai-numerology-message for today's private message. The payload holds computed numbers and
 * block ids only (aiPayload.ts). Signed-in accounts only; never throws and never returns canned text.
 */
export async function requestNumerologyMessage(payload: PrivateMessagePayload, options: BackendOptions): Promise<NumerologyMessageOutcome> {
  const current = currentOptions(options);
  if (!current.baseUrl || !current.authToken) return { kind: "unavailable", reason: "auth" };
  try {
    const result = await postKeepingStatus("/ai/numerology-message", payload, options, 45000);
    return result ? parseNumerologyMessageResponse(result.status, result.body) : { kind: "unavailable", reason: "auth" };
  } catch (error) {
    return { kind: "unavailable", reason: error instanceof BackendUnavailableError ? error.reason : "busy" };
  }
}

/**
 * Batch C optional AI tier of the reader suggestion ({action:"suggest_reader", drawId, candidates}). Waits at most
 * 4 seconds; returns null on any error, timeout or a slug outside the candidates, so the rule result stays.
 */
export async function requestTarotReaderSuggestion(drawId: string, candidates: string[], options: BackendOptions): Promise<ReaderAiSuggestion | null> {
  const current = currentOptions(options);
  // The handler refuses (400 invalid_candidates) an empty list, more than 7 or a repeated slug.
  const unique = [...new Set(candidates)].slice(0, 7);
  if (!current.baseUrl || !current.authToken || !unique.length) return null;
  try {
    const result = await postTarot({ action: "suggest_reader", drawId, candidates: unique }, { ...options, timeoutMs: 0 }, 4000);
    return result ? parseReaderSuggestion(result.status, result.body, unique) : null;
  } catch {
    return null;
  }
}

export type ProductEventName =
  | "tarot_note_feedback"
  | "reader_suggestion_shown"
  | "reader_suggestion_accepted"
  | "reader_mismatch_nudge_shown"
  | "reader_mismatch_switched"
  | "tarot_followup_started"
  | "tarot_report_opened";

export type ProductEventPayload = {
  name: ProductEventName;
  metadata: Partial<Record<"campaignId" | "variant" | "value" | "slug" | "recommendedSlug" | "topic" | "source", string>>;
};

// Mirrors supabase/functions/share-events/handler.ts parseProductEvent (the server contract): any other key or value
// would make the server refuse the whole request, so it is dropped here instead.
const PRODUCT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PRODUCT_SLUG = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const PRODUCT_SLUG_KEYS = ["slug", "recommendedSlug", "topic", "source"] as const;

/** Pure: the share-events product event {name, metadata} with only the allowed keys and values. */
export function buildProductEvent(name: ProductEventName, metadata: Record<string, string | undefined | null>): ProductEventPayload {
  const clean: ProductEventPayload["metadata"] = {};
  // A campaign tag is a pair (uuid + variant A-D) or nothing.
  if (typeof metadata.campaignId === "string" && PRODUCT_UUID.test(metadata.campaignId)
    && typeof metadata.variant === "string" && ["A", "B", "C", "D"].includes(metadata.variant)) {
    clean.campaignId = metadata.campaignId;
    clean.variant = metadata.variant;
  }
  if (name === "tarot_note_feedback" && (metadata.value === "yes" || metadata.value === "no")) clean.value = metadata.value;
  for (const key of PRODUCT_SLUG_KEYS) {
    const value = metadata[key];
    if (typeof value === "string" && PRODUCT_SLUG.test(value)) clean[key] = value;
  }
  return { name, metadata: clean };
}

/**
 * Batch C product measurement through the share-events function: {events:[{name, metadata}]} with short enumerated
 * values only (slugs, topics, sources, campaign ids), never question or note text. Fire-and-forget: it needs a signed-in
 * session and never throws. A note feedback without its yes/no value is not sent (the server would refuse it).
 */
export function sendProductEvent(name: ProductEventName, metadata: Record<string, string | undefined | null>, backendOptions: BackendOptions): void {
  const options = currentOptions(backendOptions);
  if (!options.baseUrl || !options.authToken || options.session?.active === false) return;
  const event = buildProductEvent(name, metadata);
  if (name === "tarot_note_feedback" && !event.metadata.value) return;
  void sendShareEvents([event as unknown as ShareEventPayload], backendOptions).catch(() => false);
}

/** P1-A interpret: only the stored draw; a busy draw (another device) is asked again briefly, then answered from storage. */
async function interpretServerDraw(input: TarotInterpretationInput & { drawId: string }, options: BackendOptions, correlation: AnswerCorrelation): Promise<TarotInterpretationResult | null> {
  const body = { action: "interpret", drawId: input.drawId, language: input.language, selectedCards: input.selectedCards.map(card => ({ id: card.id, reversed: card.reversed })) };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let result: TarotResponse | null;
    try {
      result = await postTarot(body, options, generationTimeoutMs.tarot, correlation);
    } catch {
      return null;
    }
    if (!result) return null;
    const limit = tarotLimitFrom(result);
    if (limit) throw limit;
    if (result.status === 409 && result.body.error === "reading_in_progress" && attempt < 2) {
      const seconds = Number(result.body.retryAfterSeconds);
      await wait(Math.min(Math.max(Number.isFinite(seconds) ? seconds : 5, 1), 10) * 1000);
      continue;
    }
    return result.status === 200 ? result.body as unknown as TarotInterpretationResult : null;
  }
  return null;
}

export async function generateTarotReading(
  input: TarotInterpretationInput,
  fallback: () => TarotInterpretationResult,
  options: BackendOptions = {},
  correlation: AnswerCorrelation = createAnswerAttempt("tarot_reading", input.language === "en" ? "en" : "vi")
): Promise<TarotInterpretationResult> {
  const remote = input.drawId
    ? await interpretServerDraw(input as TarotInterpretationInput & { drawId: string }, options, correlation)
    : await postJson<TarotInterpretationInput, TarotInterpretationResult>("/ai/tarot-reading", input, generationOptions(options, generationTimeoutMs.tarot), correlation, "limits");
  // A server draw keeps the language it was drawn in; a replayed answer was written by an earlier attempt, so its
  // provenance keeps that attempt's IDs.
  const replayed = Boolean(input.drawId && remote?.replayed === true && remote.drawId === input.drawId);
  const remoteLanguage = (remote as { language?: unknown } | null)?.language;
  const locale: "vi" | "en" = input.drawId && (remoteLanguage === "vi" || remoteLanguage === "en") ? remoteLanguage : input.language === "en" ? "en" : "vi";
  const provenance = remote?.provenance ? parseAnswerProvenance(remote.provenance, { feature: "tarot_reading", locale, ...(replayed ? {} : { correlation }) }) : undefined;
  // The stored draw's cards are what the answer may name (the app shows the same cards).
  const storedCards = (remote as { cards?: unknown } | null)?.cards;
  const cardIds = input.drawId && Array.isArray(storedCards) && storedCards.every(card => typeof (card as { id?: unknown })?.id === "string")
    ? storedCards.map(card => (card as { id: string }).id) : input.selectedCards.map(card => card.id);
  const parsed = remote?.moderationStatus === "passed" ? validateTarotOutput({ summary: remote.summary, reflection: remote.reflection, sections: remote.sections }, locale, cardIds) : undefined;
  const server = input.drawId ? { drawId: input.drawId, replayed, ...(typeof remote?.nextDrawAt === "string" ? { nextDrawAt: remote.nextDrawAt } : {}),
    ...(remote?.clarifier ? (() => { const clarifier = parseTarotClarifier(remote.clarifier); return clarifier ? { clarifier } : {}; })() : {}) } : {};
  if (parsed && (!remote?.provenance || provenance?.sourceKind === "ai")) return { ...remote!, ...parsed, provenance, ...server };
  if (remote && ["blocked", "fallback"].includes(remote.moderationStatus) && typeof remote.summary === "string" && remote.summary.trim() && remote.summary.length <= 8000
    && typeof remote.reflection === "string" && remote.reflection.trim() && remote.reflection.length <= 1500
    && (!remote.provenance || provenance && provenance.sourceKind === remote.moderationStatus)) return { ...remote, sections: [], provenance, ...server };
  const local = fallback();
  return { ...local, ...(input.drawId ? { drawId: input.drawId, replayed: false } : {}), moderationStatus: "fallback", provenance: {
    schemaVersion: answerProvenanceSchema, feature: "tarot_reading", ...correlation, locale: input.language === "en" ? "en" : "vi",
    sourceKind: "fallback", generatedAt: new Date().toISOString(), validationStatus: remote ? "rejected" : "not_applicable", persistenceStatus: "skipped",
  } };
}

export async function generateDailyInsight(
  input: DailyInsightInput,
  fallback: () => DailyInsight,
  options: BackendOptions = {}
): Promise<DailyInsight> {
  const backendResult = await postJson<DailyInsightInput, DailyInsight>("/ai/daily-insight", input, generationOptions(options, generationTimeoutMs.daily));
  return backendResult ?? fallback();
}

export async function generateDailyZodiacPulse(
  input: DailyZodiacPulseInput,
  fallback: () => DailyZodiacPulseResult,
  options: BackendOptions = {}
): Promise<DailyZodiacPulseResult> {
  const backendResult = await postJson<DailyZodiacPulseInput, DailyZodiacPulseResult>("/ai/daily-zodiac-pulse", input, generationOptions(options, generationTimeoutMs.zodiac));
  return backendResult ?? fallback();
}

export class AstrologyAiRequestError extends Error {
  constructor(readonly code: string, message: string, readonly status?: number) {
    super(message);
    this.name = "AstrologyAiRequestError";
  }
}

export async function requestAstrologyAiInsight(
  input: AstrologyAiInvocation,
  backendOptions: BackendOptions = {},
  correlation: AnswerCorrelation = createAnswerAttempt("astrology_insight", input.language, undefined, input.requestId)
): Promise<AstrologyAiInsightResult> {
  const options = currentOptions(generationOptions(backendOptions, generationTimeoutMs.astrology));
  if (options.session?.active === false || !options.authToken || !options.baseUrl) {
    throw new AstrologyAiRequestError("authentication_required", "Sign in to use the Astrology AI guide.", 401);
  }

  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.session?.controller.signal.addEventListener("abort", cancel);
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? defaultTimeoutMs);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json", ...answerCorrelationHeaders(correlation) };
    if (options.apiKey) headers.apikey = options.apiKey;
    headers.Authorization = `Bearer ${options.authToken}`;
    const response = await fetch(resolveBackendPath(options.baseUrl, "/ai/astrology-insight"), {
      method: "POST",
      headers,
      body: JSON.stringify(input),
      signal: controller.signal
    });
    if (!isAccountScopeActive(options.session) && options.session) throw new AstrologyAiRequestError("authentication_required", "Account session ended.", 401);
    const body = await response.json().catch(() => null) as {
      report?: AstrologyAiInsightResponse;
      provenance?: AnswerProvenance;
      replay?: { replayed?: boolean };
      replayContext?: { selectedFactIds?: unknown; facts?: unknown; caveats?: unknown };
      error?: { code?: string; message?: string };
    } | null;
    if (!response.ok) {
      throw new AstrologyAiRequestError(
        body?.error?.code ?? "astrology_ai_unavailable",
        body?.error?.message ?? "The Astrology AI service could not complete this request.",
        response.status
      );
    }
    if (!body?.report) throw new AstrologyAiRequestError("invalid_server_response", "The Astrology AI response was incomplete.", 502);
    if (options.session && !isAccountScopeActive(options.session)) throw new AstrologyAiRequestError("authentication_required", "Account session ended.", 401);
    // Nil P1-B: a replayed reading is checked against the facts it was written from (same chart, stored selection).
    const replayed = body.replay?.replayed === true;
    const context = replayed
      ? { chart: input.chart, selectedFactIds: body.replayContext?.selectedFactIds, facts: body.replayContext?.facts, caveats: body.replayContext?.caveats } as NonNullable<AstrologyAiInsightResult["context"]>
      : { chart: input.chart, selectedFactIds: input.selectedFactIds, facts: input.facts, caveats: input.caveats };
    const provenance = body.provenance ? parseAnswerProvenance(body.provenance, { feature: "astrology_insight", locale: input.language === "en" ? "en" : "vi", correlation }) : undefined;
    if (!validAstrologyAiResponse(body.report, context, { requestId: input.requestId, language: input.language }) || body.provenance && (!provenance || provenance.sourceKind !== "ai")) {
      throw new AstrologyAiRequestError("invalid_server_response", "The Astrology AI response could not be validated.", 502);
    }
    return { report: body.report, provenance, replayed, context };
  } catch (error) {
    if (error instanceof AstrologyAiRequestError) throw error;
    if (controller.signal.aborted) throw new AstrologyAiRequestError("request_timeout", "The Astrology AI request timed out.", 408);
    throw new AstrologyAiRequestError("network_unavailable", "The Astrology AI service could not be reached.");
  } finally {
    options.session?.controller.signal.removeEventListener("abort", cancel);
    clearTimeout(timeout);
  }
}

// --- Astrology (Nil P1-B, 15/11/2026) ---------------------------------------------------------------
// Readings are locked: the app may only read its own rows. "Delete" hides them through the
// astrology_soft_delete_reports RPC (migration 20261115110000); the server keeps the row so the same
// chart and topic still return the same reading and still count toward the daily limit.
export async function deleteAstrologyAiReportForChart(input: BackendOptions, clientChartId: string) {
  const { sb, options } = personalClient(input);
  await readPersonal(sb.rpc("astrology_soft_delete_reports", { p_client_chart_id: clientChartId }), options);
}

export async function deleteAstrologyAiReports(input: BackendOptions) {
  const options = currentOptions(input);
  if (!options.authToken || !options.userId) return;
  const { sb, options: scopedOptions } = personalClient(options);
  await readPersonal(sb.rpc("astrology_soft_delete_reports", { p_client_chart_id: null }), scopedOptions);
}
// --- end Astrology -----------------------------------------------------------------------------------

export async function syncUserProfile(
  input: ProfileSyncInput,
  fallback: () => SyncResult,
  options: BackendOptions = {}
): Promise<SyncResult> {
  const backendResult = await postJson<ProfileSyncInput, SyncResult>("/profile/upsert", input, options);
  return backendResult ?? fallback();
}

export async function syncJournalEntry(
  input: JournalSyncInput,
  fallback: () => SyncResult,
  options: BackendOptions = {}
): Promise<SyncResult> {
  const backendResult = await postJson<JournalSyncInput, SyncResult>("/journal/entries", input, options);
  return backendResult ?? fallback();
}

/** Durable Journal mutations never treat a preview/fallback response as a cloud ACK. */
export async function syncJournalMutation(mutation: JournalMutation, options: BackendOptions = {}): Promise<JournalAck> {
  options = currentOptions(options);
  if (!options.baseUrl || !options.authToken || options.session?.active === false) throw new Error("Journal sync requires an active account");
  const input = mutation.operation === "delete" ? { operation: "delete", localId: mutation.localId } : (() => {
    const { id, remoteId, syncStatus, ...entry } = mutation.entry;
    return { ...entry, operation: "upsert", localId: mutation.localId };
  })();
  const ack = await postJson<typeof input, JournalAck>("/journal/entries", input, options);
  if (!ack || ack.status !== "synced" || (ack.localId && ack.localId !== mutation.localId) ||
    (ack.operation && ack.operation !== mutation.operation) ||
    (mutation.operation === "delete" && (ack.operation !== "delete" || ack.localId !== mutation.localId)) ||
    (mutation.operation === "upsert" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ack.remoteId ?? ""))) {
    throw new Error("Journal server did not acknowledge the mutation");
  }
  return ack;
}

export async function registerNotificationDevice(
  input: NotificationRegisterInput,
  fallback: () => SyncResult,
  options: BackendOptions = {}
): Promise<SyncResult> {
  const backendResult = await postJson<NotificationRegisterInput, SyncResult>("/notifications/register-device", input, options);
  return backendResult ?? fallback();
}

export async function syncNotificationPreferences(
  input: NotificationPreferencesInput,
  fallback: () => NotificationPreferencesResult,
  options: BackendOptions = {}
): Promise<NotificationPreferencesResult> {
  const backendResult = await postJson<NotificationPreferencesInput, NotificationPreferencesResult>("/notifications/preferences", input, options);
  return backendResult ?? fallback();
}

export async function syncNotificationInbox(
  input: NotificationInboxInput,
  fallback: () => NotificationInboxResult,
  options: BackendOptions = {}
): Promise<NotificationInboxResult> {
  const backendResult = await postJson<NotificationInboxInput, NotificationInboxResult>("/notifications/inbox", input, options);
  return backendResult ?? fallback();
}

export async function sendNotificationTest(
  input: NotificationTestInput,
  fallback: () => NotificationTestResult,
  options: BackendOptions = {}
): Promise<NotificationTestResult> {
  const backendResult = await postJson<NotificationTestInput, NotificationTestResult>("/notifications/send-test", input, options);
  return backendResult ?? fallback();
}

/** Read from the live login scope even when called by an older async closure. */
function currentOptions(options: BackendOptions): BackendOptions {
  if (!options.session) return options;
  return {
    ...options,
    userId: options.session.userId,
    authToken: options.session.accessToken,
    // Local preview/signed-out flows must never call authenticated endpoints.
    baseUrl: options.session.accessToken ? options.baseUrl : undefined
  };
}

function personalClient(input: BackendOptions) {
  const options = currentOptions(input);
  const url = options.supabaseUrl ?? options.baseUrl?.replace(/\/functions\/v1\/?$/, "");
  if (!url || !options.apiKey || !options.authToken || !options.userId) {
    throw new Error("Authenticated account required");
  }
  // No singleton header and no second auth storage/refresh loop.
  const token = options.authToken;
  return {
    options,
    sb: createClient(url, options.apiKey, {
      accessToken: async () => {
        if (!options.session) return token;
        if (!options.session.accessToken) throw new Error("Account session ended");
        return options.session.accessToken;
      },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })
  };
}

async function readPersonal<T>(
  query: PromiseLike<{ data: T | null; error: unknown }> & { abortSignal?: (signal: AbortSignal) => unknown },
  options: BackendOptions
): Promise<T | null> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.session?.controller.signal.addEventListener("abort", cancel);
  const timeout = setTimeout(cancel, options.timeoutMs ?? defaultTimeoutMs);
  try {
    if (options.session?.controller.signal.aborted) throw new Error("Account session ended");
    query.abortSignal?.(controller.signal);
    const { data, error } = await query;
    if (options.session?.controller.signal.aborted) throw new Error("Account session ended");
    if (error) throw new Error("Personal data unavailable");
    return data;
  } finally {
    clearTimeout(timeout);
    options.session?.controller.signal.removeEventListener("abort", cancel);
  }
}

export async function getChatSessions(input: BackendOptions = {}) {
  const { sb, options } = personalClient(input);
  return (await readPersonal(sb.from("chat_sessions").select("*").eq("user_id", options.userId!)
    .neq("status", "deleted").order("created_at", { ascending: false }), options)) ?? [];
}

export async function getProfileSnapshot(input: BackendOptions = {}) {
  const { sb, options } = personalClient(input);
  const [profile, birth] = await Promise.all([
    readPersonal<Record<string, unknown>>(sb.from("user_profiles").select("*")
      .eq("user_id", options.userId!).maybeSingle(), options),
    readPersonal<Record<string, unknown>>(sb.from("birth_profiles").select("*")
      .eq("user_id", options.userId!).order("updated_at", { ascending: false }).limit(1).maybeSingle(), options)
  ]);
  return { profile, birth };
}

export async function getChatMessages(sessionId: string, input: BackendOptions = {}) {
  const { sb, options } = personalClient(input);
  const session = await readPersonal(sb.from("chat_sessions").select("id")
    .eq("user_id", options.userId!).eq("id", sessionId).neq("status", "deleted").maybeSingle(), options);
  if (!session) return [];
  // persona_id is stored with every message. Avoid a PostgREST embedded
  // relation here: the client already owns the vetted persona catalogue, and
  // a missing/renamed relation must not block a user's entire sync.
  return (await readPersonal(sb.from("chat_messages").select("*").eq("user_id", options.userId!)
    .eq("session_id", sessionId).order("created_at", { ascending: true }), options)) ?? [];
}

export async function getTarotReadings(input: BackendOptions = {}) {
  const { sb, options } = personalClient(input);
  return (await readPersonal(sb.from("tarot_readings").select("*").eq("user_id", options.userId!)
    .neq("status", "deleted").order("created_at", { ascending: false }), options)) ?? [];
}

export async function getAstrologyReports(input: BackendOptions = {}) {
  const { sb, options } = personalClient(input);
  return (await readPersonal(sb.from("astrology_reports").select("*").eq("user_id", options.userId!)
    .neq("status", "deleted").order("created_at", { ascending: false }), options)) ?? [];
}

export async function getUserCredits(options: BackendOptions = {}): Promise<number | null> {
  const result = await getJson<{ credits: number }>("/user-credits", options);
  return typeof result?.credits === "number" && Number.isFinite(result.credits) ? result.credits : null;
}

export async function deductUserCredit(action: string = "tarot_reading", options: BackendOptions = {}): Promise<{ success: boolean; remaining: number }> {
  const result = await postJson<{ action: string }, { success: boolean; remaining: number }>("/user-credits/deduct", { action }, options);
  return result ?? { success: false, remaining: 0 };
}

export async function getJournalEntries(input: BackendOptions = {}) {
  const { sb, options } = personalClient(input);
  return (await readPersonal(sb.from("journal_entries").select("*").eq("user_id", options.userId!)
    .order("created_at", { ascending: false }), options)) ?? [];
}

async function getMessagesByKind(kind: "persona_chat" | "oracle", input: BackendOptions) {
  const { sb, options } = personalClient(input);
  const sessions = await readPersonal(sb.from("chat_sessions").select("id")
    .eq("user_id", options.userId!).eq("session_kind", kind).neq("status", "deleted"), options);
  if (!sessions?.length) return [];
  // Persona IDs are mapped against the published in-app catalogue. An embedded
  // personas relation makes history sync depend on PostgREST relationship
  // metadata and persona-table RLS, neither of which is required to read the
  // user's own messages. A missing or changing relation previously caused the
  // whole conversation-history retry to fail.
  return (await readPersonal(sb.from("chat_messages").select("*")
    .eq("user_id", options.userId!).in("session_id", sessions.map(s => s.id))
    .order("created_at", { ascending: true }), options)) ?? [];
}

export function getAllPersonaChatMessages(options: BackendOptions = {}) {
  return getMessagesByKind("persona_chat", options);
}

export function getAllOracleTurns(options: BackendOptions = {}) {
  return getMessagesByKind("oracle", options);
}

export async function getUsageEvents(input: BackendOptions = {}) {
  const { sb, options } = personalClient(input);
  return (await readPersonal(sb.from("usage_events").select("*").eq("user_id", options.userId!)
    .order("created_at", { ascending: false }).limit(200), options)) ?? [];
}

export async function getSafetyEvents(input: BackendOptions = {}) {
  const { sb, options } = personalClient(input);
  return (await readPersonal(sb.from("safety_events").select("*").eq("user_id", options.userId!)
    .order("created_at", { ascending: false }).limit(200), options)) ?? [];
}

export async function getDailyInsight(dateKey: string, input: BackendOptions = {}) {
  const { sb, options } = personalClient(input);
  return readPersonal(sb.from("daily_insights").select("*").eq("user_id", options.userId!)
    .eq("date_key", dateKey).order("created_at", { ascending: false }).limit(1).maybeSingle(), options);
}

/** The signed-in user's own billing rows (select-own RLS); only the fields the entitlement rule reads. */
export async function getOwnSubscriptions(input: BackendOptions = {}) {
  const { sb, options } = personalClient(input);
  return (await readPersonal<Array<{ entitlement: string | null; status: string | null; current_period_end: string | null }>>(
    sb.from("subscriptions").select("entitlement,status,current_period_end").eq("user_id", options.userId!), options)) ?? [];
}

export async function getAdminRole(userId: string, input: BackendOptions = {}): Promise<string | null> {
  const { sb, options } = personalClient(input);
  if (userId !== options.userId) throw new Error("Account mismatch");
  const roles = await readPersonal(sb.from("admin_role_assignments").select("role")
    .eq("user_id", options.userId!).eq("status", "active"), options);
  // Keep current role vocabulary; capability redesign belongs to the admin lane.
  return ["owner", "admin", "editor", "safety_reviewer"].find(role => roles?.some(row => row.role === role)) ?? null;
}

export async function getAdminAccess(input: BackendOptions = {}) {
  const { sb, options } = personalClient(input);
  return parseAdminAccess(await readPersonal(sb.rpc("get_admin_access"), options), options.userId!);
}

export async function getOwnerOverview(input: BackendOptions = {}) {
  const { sb, options } = personalClient(input);
  const result = await readPersonal<Record<string, unknown>>(sb.rpc("get_owner_overview"), options);
  const counts: Record<string, number> = {};
  for (const key of ["activePersonas", "activeDecks", "openSafetyReports", "failedJobs", "activeAssignments"]) {
    const value = result?.[key];
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw Error("Invalid overview");
    counts[key] = value;
  }
  return counts;
}

/**
 * Read the single published Admin content bundle. The RPC is authenticated
 * and returns no draft/review rows, so mobile can share the Admin content
 * without becoming a content authoring client.
 */
export async function getPublishedContent(input: BackendOptions = {}): Promise<PublishedContentBundle | null> {
  const { sb, options } = personalClient(input);
  const result = await readPersonal<{
    id: string;
    bundleKey: string;
    version: number;
    schemaVersion: number;
    sourceVersion: string;
    status: "published";
    publishedAt?: string;
    payload: PublishedContentBundle["payload"];
  } | null>(sb.rpc("get_published_content_bundle", { p_bundle_key: "nilaza_default" }), options);
  if (!result?.payload || !Array.isArray(result.payload.personas) || !Array.isArray(result.payload.decks)) return null;
  return result as PublishedContentBundle;
}

/**
 * Read the published Free / Premium switch and limits (migration 20261127090000_feature_access_configs).
 * get_feature_access_config() is granted to anon as well, so guests get the same rules; it only returns the
 * active published copy ({version, publishedAt, config}) or null. The caller validates the shape
 * (features/access/featureAccessConfig.ts) and keeps its cache or built-in defaults on any error.
 * Not called by any screen yet: the five features are wired in a later app release.
 */
export async function getPublishedFeatureAccess(input: BackendOptions = {}): Promise<unknown> {
  const options = currentOptions(input);
  // Signed-in accounts only (Owner decision 27/11/2026): a guest gets null and keeps the built-in defaults.
  if (!options.authToken || !options.userId) return null;
  const { sb, options: personal } = personalClient(input);
  return readPersonal<unknown>(sb.rpc("get_feature_access_config"), personal);
}
