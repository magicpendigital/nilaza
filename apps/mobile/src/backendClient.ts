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
import { parseTarotClarifier, parseTarotServerDraw, type TarotClarifier, type TarotServerDraw } from "./features/tarot/serverDraw";
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
  promptVersionId?: string;
  moderationStatus: "passed" | "blocked" | "fallback";
  /** Set when the shared safety policy answered instead of the model; "crisis" shows the 115 card. */
  safety?: "crisis" | "boundary";
  remoteSessionId?: string;
  methodPackId?: string;
  methodPackVersion?: string;
  persistenceStatus?: "stored" | "session_error" | "message_error" | "auth_error" | "skipped";
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
  persona: 60000,
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
async function postTarot(input: unknown, backendOptions: BackendOptions, patienceMs: number, correlation?: AnswerCorrelation): Promise<TarotResponse | null> {
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
    const response = await fetch(resolveBackendPath(options.baseUrl, "/ai/tarot-reading"), { method: "POST", headers, body: JSON.stringify(input), signal: controller.signal });
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
  if (code === "feature_paused") return new BackendLimitError(code, result.status);
  if (code === "daily_limit_reached" || code === "tarot_reading_locked") return new TarotLimitError(code, result.status, code === "tarot_reading_locked" ? reason ?? "deleted" : reason, nextDrawAt);
  return null;
}

/**
 * P1-A: opens today's server draw for this account, spread and topic, or returns the one already made (same cards,
 * and its stored answer when there is one). Throws TarotLimitError / BackendLimitError for limits and pauses and
 * BackendUnavailableError when the server cannot be reached; it never draws cards on the device.
 */
export async function requestTarotDraw(input: TarotDrawInput, options: BackendOptions): Promise<TarotServerDraw> {
  const result = await postTarot({ action: "draw", language: input.language, deck: { id: input.deck.id, slug: input.deck.slug }, topic: input.topic, spread: input.spread, question: input.question }, options, 20000);
  if (!result) throw new BackendUnavailableError("auth");
  const limit = tarotLimitFrom(result);
  if (limit) throw limit;
  if (result.status === 401) throw new BackendUnavailableError("auth", 401);
  const draw = result.status === 200 ? parseTarotServerDraw(result.body) : null;
  if (!draw) throw new BackendUnavailableError("busy", result.status);
  return draw;
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
    const context = { chart: input.chart, selectedFactIds: input.selectedFactIds, facts: input.facts, caveats: input.caveats };
    const provenance = body.provenance ? parseAnswerProvenance(body.provenance, { feature: "astrology_insight", locale: input.language === "en" ? "en" : "vi", correlation }) : undefined;
    if (!validAstrologyAiResponse(body.report, context, { requestId: input.requestId, language: input.language }) || body.provenance && (!provenance || provenance.sourceKind !== "ai")) {
      throw new AstrologyAiRequestError("invalid_server_response", "The Astrology AI response could not be validated.", 502);
    }
    return { report: body.report, provenance };
  } catch (error) {
    if (error instanceof AstrologyAiRequestError) throw error;
    if (controller.signal.aborted) throw new AstrologyAiRequestError("request_timeout", "The Astrology AI request timed out.", 408);
    throw new AstrologyAiRequestError("network_unavailable", "The Astrology AI service could not be reached.");
  } finally {
    options.session?.controller.signal.removeEventListener("abort", cancel);
    clearTimeout(timeout);
  }
}

export async function deleteAstrologyAiReportForChart(input: BackendOptions, clientChartId: string) {
  const { sb, options } = personalClient(input);
  await readPersonal(
    sb.from("astrology_reports").delete().eq("user_id", options.userId!)
      .contains("input_summary", { contractId: "nilaza.astrology.ai-insight", clientChartId }).select("id"),
    options
  );
}

export async function deleteAstrologyAiReports(input: BackendOptions) {
  const options = currentOptions(input);
  if (!options.authToken || !options.userId) return;
  const { sb, options: scopedOptions } = personalClient(options);
  await readPersonal(
    sb.from("astrology_reports").delete().eq("user_id", scopedOptions.userId!)
      .contains("input_summary", { contractId: "nilaza.astrology.ai-insight" }).select("id"),
    scopedOptions
  );
}

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
