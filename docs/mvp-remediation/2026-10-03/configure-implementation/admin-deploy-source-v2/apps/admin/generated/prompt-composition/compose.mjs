import { PROMPT_BUNDLE, deepFreeze } from "./bundle.mjs";

export { PROMPT_BUNDLE, serializeBundlePayload } from "./bundle.mjs";

export class PromptCompositionError extends Error {
  constructor(code, field, message) {
    super(message);
    this.name = "PromptCompositionError";
    this.code = code;
    this.field = field;
  }
}

const fail = (code, field, message) => { throw new PromptCompositionError(code, field, message); };
const has = (value, key) => Object.hasOwn(value, key);
const B = PROMPT_BUNDLE.manifest.budgets;
const SCREENS = ["home", "explore", "chat", "journal", "profile", "oracle"];

function record(value, keys, field, required = []) {
  if (!value || typeof value !== "object" || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    fail("INVALID_SHAPE", field, "Expected a plain data object.");
  }
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== "string" || !keys.includes(key) || !descriptor.enumerable || !has(descriptor, "value")) {
      fail("UNKNOWN_FIELD", field, "Unexpected fields or accessors are not allowed.");
    }
  }
  for (const key of required) if (!has(value, key)) fail("MISSING_FIELD", `${field}.${key}`, "A required field is missing.");
}

function size(text, limits, field) {
  if (typeof text !== "string") fail("INVALID_TEXT", field, "Expected non-empty text.");
  // The cheap UTF-16 guard rejects huge values before any encoding/allocation.
  if (text.length > limits.maxChars * 2) fail("SIZE_BUDGET_EXCEEDED", field, "The character size limit was exceeded.");
  if (!text.trim()) fail("INVALID_TEXT", field, "Expected non-empty text.");
  const chars = [...text].length;
  if (chars > limits.maxChars) fail("SIZE_BUDGET_EXCEEDED", field, "The character size limit was exceeded.");
  const utf8Bytes = new TextEncoder().encode(text).length;
  if (utf8Bytes > limits.maxUtf8Bytes) fail("SIZE_BUDGET_EXCEEDED", field, "The UTF-8 size limit was exceeded.");
  return { chars, utf8Bytes };
}

function totalSize(sizes, limits, field) {
  const result = sizes.reduce((sum, value) => ({ chars: sum.chars + value.chars, utf8Bytes: sum.utf8Bytes + value.utf8Bytes }), { chars: 0, utf8Bytes: 0 });
  if (result.chars > limits.maxChars || result.utf8Bytes > limits.maxUtf8Bytes) {
    fail("SIZE_BUDGET_EXCEEDED", field, "The combined input size limit was exceeded.");
  }
  return result;
}

function enumValue(value, allowed, field) {
  if (typeof value !== "string" || !allowed.includes(value)) fail("INVALID_ENUM", field, "The value is not an allowed selection.");
  return value;
}

function dataList(value, maxLength, field) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > maxLength) fail("INVALID_LIST", field, "Expected a bounded plain data list.");
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (key === "length") continue;
    if (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length || !has(descriptor, "value") || !descriptor.enumerable) {
      fail("INVALID_LIST", field, "List properties and accessors are not allowed.");
    }
  }
  // Array.from turns holes into undefined, which the typed field validator rejects.
  return Array.from(value);
}

function resolveModule(pin, modules, field) {
  const module = modules.find((candidate) => candidate.id === pin.id);
  if (!module || module.version !== pin.version || module.contentSha256 !== pin.contentSha256) {
    fail("BUNDLE_PIN_MISMATCH", field, "The pinned bundle module does not match its manifest.");
  }
  return module;
}

function resolveSelection(input) {
  const manifest = PROMPT_BUNDLE.manifest;
  if (input.bundleVersion !== manifest.version || (has(input, "bundleId") && input.bundleId !== manifest.id)) {
    fail("BUNDLE_VERSION_MISMATCH", "bundleVersion", "The requested bundle version is unavailable.");
  }
  if (has(input, "bundleSha256") && input.bundleSha256 !== PROMPT_BUNDLE.bundleSha256) fail("BUNDLE_DIGEST_MISMATCH", "bundleSha256", "The requested bundle digest is unavailable.");
  if (typeof input.feature !== "string" || !has(manifest.features, input.feature)) fail("UNSUPPORTED_FEATURE", "feature", "The feature is not in this bundle.");
  const feature = manifest.features[input.feature];
  if (!feature.enabled) fail("DISABLED_FEATURE", "feature", "The feature is disabled in this bundle.");
  // Exact match only: no normalization, prefix matching, or implicit fallback.
  if (typeof input.locale !== "string" || !has(manifest.locales, input.locale)) fail("UNSUPPORTED_LOCALE", "locale", "The locale is not in this bundle's allowlist.");
  const locale = manifest.locales[input.locale];
  if (!locale.enabled) fail("DISABLED_LOCALE", "locale", "The locale has not been enabled and reviewed in this bundle.");
  const tone = has(input, "tone") ? enumValue(input.tone, Object.keys(manifest.tones), "tone") : "balanced";
  const modules = {
    core: resolveModule(manifest.core, [PROMPT_BUNDLE.modules.core], "core"),
    feature: resolveModule(feature.module, PROMPT_BUNDLE.modules.features, "feature"),
    locale: resolveModule(locale.module, PROMPT_BUNDLE.modules.locales, "locale"),
    tone: resolveModule(manifest.tones[tone], PROMPT_BUNDLE.modules.tones, "tone")
  };
  if (has(input, "expectedModuleVersions")) {
    record(input.expectedModuleVersions, manifest.sectionOrder, "expectedModuleVersions", manifest.sectionOrder);
    for (const kind of manifest.sectionOrder) {
      if (input.expectedModuleVersions[kind] !== modules[kind].version) fail("MODULE_VERSION_MISMATCH", `expectedModuleVersions.${kind}`, "The requested module version is unavailable.");
    }
  }
  return { modules, tone };
}

function allowedConsent(value) {
  if (value === undefined) return { history: false, profile: false };
  record(value, ["history", "profile"], "consent");
  for (const key of Object.keys(value)) if (typeof value[key] !== "boolean") fail("INVALID_CONSENT", `consent.${key}`, "Consent must be an explicit boolean.");
  return { history: value.history === true, profile: value.profile === true };
}

function contextMessage(context, consent) {
  record(context, ["currentScreen", "profile"], "context");
  const normalized = {};
  if (has(context, "currentScreen")) normalized.currentScreen = enumValue(context.currentScreen, SCREENS, "context.currentScreen");
  if (has(context, "profile")) {
    if (!consent.profile) fail("CONSENT_REQUIRED", "context.profile", "Profile context requires explicit per-request permission.");
    record(context.profile, ["nickname", "goals"], "context.profile");
    const profile = {};
    if (has(context.profile, "nickname")) {
      size(context.profile.nickname, B.nickname, "context.profile.nickname");
      profile.nickname = context.profile.nickname;
    }
    if (has(context.profile, "goals")) {
      profile.goals = dataList(context.profile.goals, B.maxGoals, "context.profile.goals").map((goal) => { size(goal, B.goal, "context.profile.goals"); return goal; });
    }
    normalized.profile = profile;
  }
  if (!Object.keys(normalized).length) fail("EMPTY_CONTEXT", "context", "Omit context when no allowed context is supplied.");
  // This wrapper describes data in a USER role. It is never appended to system.
  const content = `Per-request context data (JSON):\n${JSON.stringify(normalized)}`;
  return { role: "user", content };
}

function validatedHistory(history, consent) {
  const entries = dataList(history, B.maxHistoryMessages, "history");
  if (entries.length && !consent.history) fail("CONSENT_REQUIRED", "history", "History requires explicit per-request permission.");
  return entries.map((entry, index) => {
    record(entry, ["role", "content"], `history.${index}`, ["role", "content"]);
    enumValue(entry.role, ["user", "assistant"], `history.${index}.role`);
    size(entry.content, B.historyMessage, `history.${index}.content`);
    return { role: entry.role, content: entry.content };
  });
}

function consumeAccidentalAsyncValue(value) {
  // The counter contract is synchronous. Drain an accidental rejected async
  // result/throw before failing, so its raw error cannot become an unhandled
  // rejection and expose private input. It never becomes an accepted count.
  if (value && (typeof value === "object" || typeof value === "function")) void Promise.resolve(value).catch(() => {});
}

function checkedTokenCount(value, limit, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    consumeAccidentalAsyncValue(value);
    fail("INVALID_TOKENIZER_RESULT", field, "Tokenizer counts must be non-negative safe integers.");
  }
  if (value > limit) fail("TOKEN_BUDGET_EXCEEDED", field, "The model token budget was exceeded.");
  return value;
}

function invokeTokenCounter(counter, value) {
  try { return counter(value); }
  catch (error) {
    consumeAccidentalAsyncValue(error);
    fail("TOKENIZER_FAILED", "tokenizer", "The tokenizer could not assess this request.");
  }
}

function assessTokens(tokenizer, sections, system, messages, messageSizes) {
  if (tokenizer === undefined) return { status: "not-assessed", reason: "A model-matched tokenizer is required for token acceptance.", tokenizer: null };
  record(tokenizer, ["id", "model", "countText", "countMessages"], "tokenizer", ["id", "model", "countText", "countMessages"]);
  size(tokenizer.id, { maxChars: 120, maxUtf8Bytes: 480 }, "tokenizer.id");
  size(tokenizer.model, { maxChars: 120, maxUtf8Bytes: 480 }, "tokenizer.model");
  if (typeof tokenizer.countText !== "function" || typeof tokenizer.countMessages !== "function") fail("INVALID_TOKENIZER", "tokenizer", "Supply synchronous text and complete-message token counters.");
  const moduleTokens = sections.map((section) => ({ kind: section.kind, tokens: checkedTokenCount(invokeTokenCounter(tokenizer.countText, section.content), B.modules[section.kind].maxTokens, `modules.${section.kind}`) }));
  const systemTokens = checkedTokenCount(invokeTokenCounter(tokenizer.countText, system), B.system.maxTokens, "system");
  const inputTokens = messages.map((message, index) => checkedTokenCount(invokeTokenCounter(tokenizer.countText, message.content), messageSizes[index].maxTokens, `messages.${index}`));
  checkedTokenCount(inputTokens.reduce((sum, count) => sum + count, 0), B.inputMessages.maxTokens, "inputMessages");
  // countMessages must include provider-specific role/framing overhead. It
  // receives the complete envelope, not a concatenation of content strings.
  const requestTokens = checkedTokenCount(invokeTokenCounter(tokenizer.countMessages, deepFreeze([{ role: "system", content: system }, ...messages])), B.request.maxTokens, "request");
  return { status: "passed", tokenizer: { id: tokenizer.id, model: tokenizer.model }, moduleTokens, systemTokens, inputTokens, requestTokens };
}

/**
 * Compose a local preview only. No retrieval, provider call, storage, or publish.
 * Token acceptance is unassessed unless a real model-matched tokenizer is
 * injected. Character/byte limits are separate pre-tokenization size guards.
 */
export function composePromptPreview(input, options = {}) {
  record(input, ["bundleId", "bundleVersion", "bundleSha256", "feature", "locale", "tone", "expectedModuleVersions", "question", "history", "context", "consent"], "input", ["bundleVersion", "feature", "locale", "question"]);
  record(options, ["tokenizer"], "options");
  const selection = resolveSelection(input);
  const consent = allowedConsent(input.consent);
  const questionSize = size(input.question, B.question, "question");
  const history = has(input, "history") ? validatedHistory(input.history, consent) : [];
  const context = has(input, "context") ? contextMessage(input.context, consent) : null;
  const sections = PROMPT_BUNDLE.manifest.sectionOrder.map((kind) => {
    const module = selection.modules[kind];
    return { kind, id: module.id, version: module.version, contentSha256: module.contentSha256, content: module.content };
  });
  const moduleSizes = sections.map((section) => ({ kind: section.kind, ...size(section.content, B.modules[section.kind], `modules.${section.kind}`) }));
  const system = sections.map((section) => `[${section.kind}: ${section.id}@${section.version}]\n${section.content}`).join("\n\n");
  const systemSize = size(system, B.system, "system");
  const messages = [...(context ? [context] : []), ...history, { role: "user", content: input.question }];
  const messageLimits = [...(context ? [B.contextMessage] : []), ...history.map(() => B.historyMessage), B.question];
  const messageSizes = messages.map((message, index) => size(message.content, messageLimits[index], `messages.${index}`));
  const inputMessagesSize = totalSize(messageSizes, B.inputMessages, "inputMessages");
  const requestSize = totalSize([systemSize, inputMessagesSize], B.request, "request");
  const tokenAssessment = assessTokens(options.tokenizer, sections, system, messages, messageLimits);
  return deepFreeze({
    status: "local-preview",
    providerReady: false,
    system,
    messages,
    sections,
    provenance: {
      schemaVersion: PROMPT_BUNDLE.manifest.schemaVersion,
      bundleId: PROMPT_BUNDLE.manifest.id,
      bundleVersion: PROMPT_BUNDLE.manifest.version,
      bundleSha256: PROMPT_BUNDLE.bundleSha256,
      usagePolicy: PROMPT_BUNDLE.manifest.usagePolicy,
      feature: input.feature,
      locale: input.locale,
      tone: selection.tone,
      modules: sections.map(({ kind, id, version, contentSha256 }) => ({ kind, id, version, contentSha256 }))
    },
    budget: {
      charUnit: "Unicode code points",
      byteUnit: "UTF-8 bytes",
      size: { modules: moduleSizes, system: systemSize, question: questionSize, inputMessages: inputMessagesSize, request: requestSize },
      tokens: tokenAssessment,
      limits: B
    }
  });
}
