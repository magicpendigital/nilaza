import { composePromptPreview, PROMPT_BUNDLE, PromptCompositionError } from "./prompt-composition/compose.mjs";
import { oracleIntent, oracleSafetyReply, oracleSafetySignal } from "../../../packages/ai-contracts/oracle-safety.mjs";
export { oracleIntent, oracleSafetyReply, oracleSafetySignal };

// Source candidate only. Production cannot dispatch an LLM until a separate
// integration supplies a real matched tokenizer, durable quota and evaluation.
export const ORACLE_RUNTIME_READINESS = Object.freeze({
  providerEnabled: false,
  reason: "provider_gate_pending",
  missingGates: Object.freeze(["model_matched_tokenizer", "durable_usage_reservation", "reviewed_clean_qa", "real_model_evaluation"])
});

export class OracleInputError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.name = "OracleInputError";
    this.code = code;
    this.status = status;
  }
}

const fail = (code, status) => { throw new OracleInputError(code, status); };
const has = (value, key) => Object.hasOwn(value, key);
const SCREENS = ["home", "explore", "chat", "journal", "profile", "oracle"];
const INTENTS = ["reflect", "tarot_handoff", "persona_handoff", "council_handoff", "astrology_handoff", "journal_handoff", "safety_redirect"];
const TONES = ["balanced", "gentle", "direct"];
const LEGACY_TONES = ["wise", "playful", "spiritual"];
const INPUT_KEYS = ["language", "userMessage", "currentScreen", "profile", "recentSafeContext", "consentFlags", "sanitizedHistory"];

function record(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail("invalid_oracle_input");
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== "string" || !keys.includes(key) || !descriptor.enumerable || !has(descriptor, "value")) fail("invalid_oracle_input");
  }
}

function text(value, maxChars, maxBytes = maxChars * 4) {
  if (typeof value !== "string" || !value.trim()) fail("invalid_oracle_input");
  if (value.length > maxChars * 2 || [...value].length > maxChars || new TextEncoder().encode(value).length > maxBytes) fail("oracle_input_too_large", 413);
  return value;
}

function list(value, maximum) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > maximum) fail("invalid_oracle_input");
  for (const key of Reflect.ownKeys(value)) {
    if (key === "length") continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length || !descriptor.enumerable || !has(descriptor, "value")) fail("invalid_oracle_input");
  }
  return Array.from(value);
}

export function readOracleQuestion(input) {
  record(input, INPUT_KEYS);
  // Match the exact registry. Missing/unsupported language never silently uses EN.
  if (input.language !== "vi" && input.language !== "en") fail("unsupported_oracle_locale");
  return { locale: input.language, question: text(input.userMessage, 3000, 12000).trim() };
}

export function compileOracleInput(input) {
  const { locale, question } = readOracleQuestion(input);
  const flags = input.consentFlags ?? {};
  record(flags, ["journalMemory", "birthProfile", "history", "profile"]);
  for (const flag of Object.values(flags)) if (typeof flag !== "boolean") fail("invalid_oracle_input");
  const context = {};
  if (has(input, "currentScreen")) {
    if (!SCREENS.includes(input.currentScreen)) fail("unsupported_oracle_screen");
    context.currentScreen = input.currentScreen;
  }
  const profile = input.profile ?? {};
  record(profile, ["nickname", "goals", "tone"]);
  const profileData = {};
  // An empty legacy nickname is absence, not a model instruction.
  if (has(profile, "nickname") && profile.nickname !== "") profileData.nickname = text(profile.nickname, 80, 320);
  if (has(profile, "goals")) profileData.goals = list(profile.goals, 5).map(goal => text(goal, 300, 1200));
  const requestedTone = profile.tone ?? "balanced";
  if (![...TONES, ...LEGACY_TONES].includes(requestedTone)) fail("unsupported_oracle_tone");
  const effectiveTone = flags.profile === true && TONES.includes(requestedTone) ? requestedTone : "balanced";
  const toneMapping = flags.profile !== true ? "profile_not_permitted" : LEGACY_TONES.includes(requestedTone) ? "legacy_unsupported_to_balanced" : "exact";
  if (flags.profile === true && Object.keys(profileData).length) context.profile = profileData;
  const history = has(input, "sanitizedHistory") ? list(input.sanitizedHistory, 12).map(turn => {
    record(turn, ["role", "text", "intent"]);
    if (turn.role !== "user" && turn.role !== "oracle") fail("invalid_oracle_history_role");
    if (has(turn, "intent") && !INTENTS.includes(turn.intent)) fail("invalid_oracle_input");
    return { role: turn.role === "oracle" ? "assistant" : "user", content: text(turn.text, 1500, 6000) };
  }) : [];
  // No silent history truncation. A consented caller must send the canonical cap.
  if (flags.history === true && history.length > PROMPT_BUNDLE.manifest.budgets.maxHistoryMessages) fail("oracle_history_too_long");
  const permittedHistory = flags.history === true ? [...history] : [];
  if (permittedHistory.at(-1)?.role === "user" && permittedHistory.at(-1)?.content === question) permittedHistory.pop();
  const recentSafeContext = has(input, "recentSafeContext") ? list(input.recentSafeContext, 3) : [];
  for (const entry of recentSafeContext) {
    record(entry, ["title", "sourceType", "mood", "createdAt"]);
    for (const [key, value] of Object.entries(entry)) text(value, key === "title" ? 180 : 64);
  }
  let preview;
  try {
    preview = composePromptPreview({
      bundleVersion: PROMPT_BUNDLE.manifest.version,
      feature: "oracle_router",
      locale,
      tone: effectiveTone,
      question,
      history: permittedHistory,
      ...(Object.keys(context).length ? { context } : {}),
      consent: { history: flags.history === true, profile: flags.profile === true }
    });
  } catch (error) {
    if (error instanceof PromptCompositionError) fail(error.code === "SIZE_BUDGET_EXCEEDED" ? "oracle_input_too_large" : "invalid_oracle_input", error.code === "SIZE_BUDGET_EXCEEDED" ? 413 : 400);
    throw error;
  }
  return Object.freeze({
    locale, question, preview,
    contextPolicy: Object.freeze({
      historyAllowed: flags.history === true,
      profileAllowed: flags.profile === true,
      historySuppliedCount: history.length,
      historyUsedCount: permittedHistory.length,
      journalMemorySupported: false,
      birthProfileSupported: false,
      journalContextSuppliedCount: recentSafeContext.length,
      journalContextUsedCount: 0,
      requestedTone, effectiveTone, toneMapping,
      consentAuthority: "explicit_caller_assertion_not_persisted_permission"
    })
  });
}

export function oracleFallbackReply(locale) {
  return locale === "vi"
    ? "Oracle hiện đang dùng phản hồi giới hạn trong khi kết nối AI được kiểm tra. Bạn có thể thử gọi tên cảm xúc đang rõ nhất, rồi chọn một điều nhỏ bạn muốn hiểu thêm về mình."
    : "Oracle is currently using a limited response while the AI connection is being checked. You can name the feeling that stands out and choose one small thing you want to understand about yourself.";
}
