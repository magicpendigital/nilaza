import { AiRequestError, guardAiJsonRequest } from "../_shared/ai-request-guard.ts";
import {
  compileOracleInput, readOracleQuestion, oracleIntent, oracleSafetySignal,
  oracleSafetyReply, oracleFallbackReply, OracleInputError, ORACLE_RUNTIME_READINESS
} from "../_shared/oracle-runtime.mjs";
import { ORACLE_TOOL_CONTRACT_VERSION, oracleActionsFromTools, oracleToolInstructions, parseOracleToolOutput, type OracleHandoff } from "../_shared/oracle-tools.ts";
import { featurePausedBody } from "../_shared/feature-switch.ts";

export const oracleCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
type OracleIntent = "reflect" | "tarot_handoff" | "persona_handoff" | "council_handoff" | "astrology_handoff" | "journal_handoff" | "safety_redirect";
type ActionKind = "reflect_here" | "draw_tarot" | "ask_guide" | "open_council" | "cast_astrology" | "save_journal";
type OracleHandlerDependencies = {
  configured: boolean;
  authenticate: (token: string) => Promise<{ id: string; isAnonymous?: boolean } | null>;
  recordUsage?: (userId: string, metadata: Record<string, unknown>) => Promise<boolean>;
  recordSafety?: (userId: string, reason: string) => Promise<boolean>;
  /** Model dependencies (oracle-ai-tools-2026-11-11). Without generate the handler keeps the local fallback. */
  generate?: (input: {
    userId: string;
    system: string;
    messages: Array<{ role: string; content: string }>;
    safetyText: string;
    acceptOutput: (text: string, finishReason?: string) => string | undefined;
  }) => Promise<{ text: string; moderationStatus: "passed" | "blocked" | "fallback"; finishReason?: string; model?: unknown }>;
  paused?: () => Promise<boolean>;
  claimAttempt?: (userId: string) => Promise<"allowed" | "limit_reached" | "unavailable">;
};
const actionCatalog: Record<ActionKind, {
  icon: string; target: string; label: { vi: string; en: string }; detail: { vi: string; en: string };
}> = {
  reflect_here: { icon: "sparkles-outline", target: "oracle", label: { vi: "Soi tiếp ở đây", en: "Reflect here" }, detail: { vi: "Tiếp tục một câu hỏi phản chiếu ngắn.", en: "Continue a short reflection question." } },
  draw_tarot: { icon: "hand-left-outline", target: "tarot", label: { vi: "Rút Tarot", en: "Draw Tarot" }, detail: { vi: "Khám phá câu hỏi bằng biểu tượng.", en: "Explore the question through symbolism." } },
  ask_guide: { icon: "chatbubble-ellipses-outline", target: "persona", label: { vi: "Hỏi một guide", en: "Ask a guide" }, detail: { vi: "Chọn một guide lấy cảm hứng để trò chuyện.", en: "Choose an inspired guide to talk with." } },
  open_council: { icon: "people-outline", target: "council", label: { vi: "Mở AI Council", en: "Open AI Council" }, detail: { vi: "Nhìn câu hỏi qua nhiều góc nhìn.", en: "Explore several perspectives on a question." } },
  cast_astrology: { icon: "planet-outline", target: "astrology", label: { vi: "Xem các vì sao", en: "Explore astrology" }, detail: { vi: "Mở bản đồ được tính từ dữ liệu ngày sinh.", en: "Open a chart calculated from birth data." } },
  save_journal: { icon: "journal-outline", target: "journal", label: { vi: "Lưu vào Journal", en: "Save to Journal" }, detail: { vi: "Bạn chọn nội dung muốn lưu vào nhật ký riêng.", en: "You choose what to save in your private journal." } }
};
function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...oracleCorsHeaders, "Content-Type": "application/json" } });
}
function handoff(question: string): OracleHandoff {
  const love = /\b(?:love|crush|relationship)\b|tình yêu|tình cảm|mối quan hệ/i.test(question);
  const career = /\b(?:career|job)\b|công việc|nghề nghiệp/i.test(question);
  const decision = /\b(?:decision|choose)\b|quyết định|lựa chọn/i.test(question);
  return {
    sourceType: "oracle" as const, sourceId: crypto.randomUUID(), userMessage: question,
    safeSummary: question.replace(/\s+/g, " ").trim().slice(0, 180),
    suggestedPersonaSlug: love ? "communication-mentor" : career ? "aristotle" : "the-mystic",
    suggestedCouncilTemplateId: love ? "love_confusion" : career ? "career_fog" : decision ? "big_decision" : "overthinking",
    suggestedTarotTopic: love ? "love" : career ? "career" : decision ? "decision" : "self",
    suggestedTarotSpread: decision || love || career ? "situation-challenge-advice" : "past-present-future",
    suggestedAstrologyFocus: career ? "career" : love ? "love" : "soul"
  };
}
function actions(intent: OracleIntent, handoffContext: Record<string, unknown>) {
  const kinds: Record<OracleIntent, ActionKind[]> = {
    reflect: ["reflect_here", "draw_tarot", "open_council"],
    tarot_handoff: ["draw_tarot", "ask_guide", "save_journal"],
    persona_handoff: ["ask_guide", "open_council", "draw_tarot"],
    council_handoff: ["open_council", "draw_tarot", "ask_guide"],
    astrology_handoff: ["cast_astrology", "ask_guide", "save_journal"],
    journal_handoff: ["save_journal", "reflect_here"], safety_redirect: []
  };
  return kinds[intent].map(kind => ({ id: kind, kind, ...actionCatalog[kind], enabled: true, handoffContext }));
}
export const ORACLE_EVENT_ACK_TIMEOUT_MS = 250;
async function eventAck(callback: () => Promise<boolean>, failure: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // An expired ACK is not evidence of a failed write. Do not retry it here.
    return await Promise.race([
      Promise.resolve().then(callback).then(ok => ok ? "stored" : failure, () => failure),
      new Promise<string>(resolve => { timer = setTimeout(() => resolve("unconfirmed"), ORACLE_EVENT_ACK_TIMEOUT_MS); })
    ]);
  } finally { if (timer !== undefined) clearTimeout(timer); }
}
async function recordUsage(deps: OracleHandlerDependencies, userId: string, metadata: Record<string, unknown>) {
  if (!deps.recordUsage) return "skipped";
  return await eventAck(() => deps.recordUsage!(userId, metadata), "usage_error");
}

/** Authenticated source candidate: static support/fallback only, no LLM dispatch. */
export function createOracleRuntimeHandler(deps: OracleHandlerDependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: oracleCorsHeaders });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    try {
      const { input, userId } = await guardAiJsonRequest(req, deps);
      const { locale, question } = readOracleQuestion(input);
      const safetySignal = oracleSafetySignal(question);
      if (safetySignal) {
        // Support stays independent of compiler, tokenizer, model, quota and context.
        const promptVersionId = safetySignal === "self_harm_signal" ? "nilaza-oracle-crisis-static-2026-10-03" : "nilaza-oracle-regulated-static-2026-10-03";
        const [safetyPersistenceStatus, persistenceStatus] = await Promise.all([
          deps.recordSafety ? eventAck(() => deps.recordSafety!(userId, safetySignal), "safety_error") : Promise.resolve("skipped"),
          recordUsage(deps, userId, {
            intent: "safety_redirect", language: locale, generationStatus: "safety_support",
            generationReason: safetySignal, promptVersionId, providerDispatched: false
          })
        ]);
        return json({
          reply: oracleSafetyReply(locale, safetySignal), intent: "safety_redirect", confidence: 0.95,
          actionCards: [], moderationStatus: "blocked", generationStatus: "safety_support",
          generationReason: safetySignal, promptVersionId, model: null,
          persistenceStatus, usagePersistenceStatus: persistenceStatus, safetyPersistenceStatus,
          conversationPersisted: false, providerDispatched: false
        });
      }
      const compiled = compileOracleInput(input);
      const intent = oracleIntent(question) as OracleIntent;
      const promptVersionId = `${compiled.preview.provenance.bundleId}@${compiled.preview.provenance.bundleVersion}`;
      const handoffContext = handoff(question);
      if (deps.generate) return await modelTurn(deps, { userId, locale, question, compiled, promptVersionId, handoffContext });
      const persistenceStatus = await recordUsage(deps, userId, {
        intent, language: locale, promptVersionId,
        promptBundleSha256: compiled.preview.provenance.bundleSha256,
        promptModules: compiled.preview.provenance.modules,
        generationStatus: "local_fallback", generationReason: ORACLE_RUNTIME_READINESS.reason,
        providerDispatched: false, tokenAssessment: compiled.preview.budget.tokens.status,
        contextPolicy: compiled.contextPolicy
      });
      return json({
        reply: oracleFallbackReply(locale), intent, confidence: intent === "reflect" ? 0.62 : 0.78,
        actionCards: actions(intent, handoffContext), handoffContext,
        promptVersionId, promptSource: "pinned_candidate_bundle",
        promptProvenance: compiled.preview.provenance,
        moderationStatus: "fallback", generationStatus: "local_fallback",
        generationReason: ORACLE_RUNTIME_READINESS.reason,
        runtimeReadiness: ORACLE_RUNTIME_READINESS,
        tokenAssessment: compiled.preview.budget.tokens.status,
        contextPolicy: compiled.contextPolicy,
        model: null, persistenceStatus, usagePersistenceStatus: persistenceStatus,
        conversationPersisted: false, providerDispatched: false
      });
    } catch (error) {
      if (error instanceof AiRequestError || error instanceof OracleInputError) return json({ error: error.code }, error.status);
      return json({ error: "oracle_unavailable" }, 503);
    }
  };
}

/**
 * The model answers and picks up to two tools (oracle-ai-tools-2026-11-11). The switch and one shared
 * Chat+Oracle attempt are checked before any model call; an unusable answer from both models is 503.
 */
async function modelTurn(deps: OracleHandlerDependencies, turn: {
  userId: string; locale: "vi" | "en"; question: string;
  compiled: { preview: { system: string; messages: Array<{ role: string; content: string }> } };
  promptVersionId: string; handoffContext: OracleHandoff;
}): Promise<Response> {
  if (deps.paused && await deps.paused()) return json(featurePausedBody, 503);
  const attempt = deps.claimAttempt ? await deps.claimAttempt(turn.userId) : "unavailable";
  if (attempt === "limit_reached") return json({ error: "daily_limit_reached" }, 429);
  if (attempt === "unavailable") return json({ error: "usage_check_unavailable" }, 503);
  const promptVersionId = `${turn.promptVersionId}+${ORACLE_TOOL_CONTRACT_VERSION}`;
  const generation = await deps.generate!({
    userId: turn.userId,
    system: `${turn.compiled.preview.system}

${oracleToolInstructions(turn.locale)}`,
    messages: turn.compiled.preview.messages.map(message => ({ role: message.role, content: message.content })),
    safetyText: turn.question,
    acceptOutput: (text, finishReason) => finishReason === "length" ? "incomplete" : parseOracleToolOutput(text).reason
  });
  if (generation.moderationStatus === "blocked") {
    const safetyPersistenceStatus = deps.recordSafety ? await eventAck(() => deps.recordSafety!(turn.userId, "model_safety_block"), "safety_error") : "skipped";
    await recordUsage(deps, turn.userId, { intent: "safety_redirect", language: turn.locale, generationStatus: "safety_support", promptVersionId, providerDispatched: true });
    return json({
      reply: generation.text, intent: "safety_redirect", confidence: 0.9, actionCards: [], moderationStatus: "blocked",
      generationStatus: "safety_support", promptVersionId, safetyPersistenceStatus, conversationPersisted: false, providerDispatched: true
    });
  }
  const parsed = generation.moderationStatus === "passed" ? parseOracleToolOutput(generation.text).output : undefined;
  if (!parsed) {
    await recordUsage(deps, turn.userId, { language: turn.locale, generationStatus: "model_unavailable", promptVersionId, providerDispatched: true });
    return json({ error: "oracle_unavailable" }, 503);
  }
  const built = oracleActionsFromTools(parsed.tools, turn.handoffContext);
  const persistenceStatus = await recordUsage(deps, turn.userId, {
    intent: built.intent, language: turn.locale, promptVersionId, generationStatus: "model",
    toolKinds: parsed.tools.map(tool => tool.tool), providerDispatched: true
  });
  return json({
    reply: parsed.reply, intent: built.intent, confidence: 0.8,
    actionCards: built.actionCards, handoffContext: built.handoffContext,
    promptVersionId, moderationStatus: "passed", generationStatus: "model",
    model: generation.model ?? null, persistenceStatus, usagePersistenceStatus: persistenceStatus,
    conversationPersisted: false, providerDispatched: true
  });
}
