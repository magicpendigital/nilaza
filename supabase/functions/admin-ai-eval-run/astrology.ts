// Astrology eval adapter (eval feature astrology_insight, prompt feature astrology_report; migration 20261114090100).
// Mirrors ai-astrology-insight for one case: the case's fixed synthetic chart (attached by start_ai_eval_run) and question
// become the same invocation the app sends; the invocation goes through validateAstrologyAiInvocation; the route must be
// the active astrology_report route with the astrology_ai_insight_v1 schema; the prompt is the active global
// astrology_report prompt of the case language (the draft row in its place for a prompt run); the model gets the same
// system prompt and user message; the answer passes only when it parses as one JSON object, did not stop early and the
// response envelope passes validateAstrologyAiResponse. Nothing is stored and no usage is counted (the eval run records
// results through finish_ai_eval_run). Crisis cases never reach a model: like the endpoint, the invocation check refuses
// them as self_harm before any route or prompt read.
import {
  ASTROLOGY_AI_CONTRACT,
  astrologyDiagnosticFieldCode,
  makeAstrologyAiResponseEnvelope,
  selectAstrologyAiFacts,
  toAstrologyAiRequest,
  validateAstrologyAiInvocation,
  validateAstrologyAiResponse,
  type AstrologyAiInvocation
} from "../_shared/astrology-ai-insight.ts";
import { asModelJson, systemPrompt } from "../_shared/astrology-system-prompt.ts";
import { isIncompleteAnswerFinishReason } from "../../../packages/ai-contracts/answer-provenance.ts";
import type { EvalCase, EvalResult, GenerateInput, GenerateResult, SupabaseLike, Variant } from "./runner.ts";

export const ASTROLOGY_PROMPT_FEATURE = "astrology_report";
export const ASTROLOGY_THEMES: readonly string[] = Object.freeze(["identity", "relationships", "work", "decision", "patterns", "open_reflection"]);

/** The app's reply to a crisis_support refusal (apps/mobile AstrologyExperience). */
export const ASTROLOGY_CRISIS_TEXT: Readonly<Record<"vi" | "en", string>> = Object.freeze({
  vi: "Bạn xứng đáng được hỗ trợ ngay lúc này. Hãy liên hệ dịch vụ khẩn cấp tại địa phương hoặc một người bạn tin cậy ngay.",
  en: "You deserve immediate support. Contact local emergency services or someone you trust now."
});

type ChartContext = { chart: unknown; selectedFactIds: unknown; facts: unknown; caveats: unknown };
type Outcome = { text: string; formatPass: boolean; checkCode: string; generation?: GenerateResult };

const str = (value: unknown) => typeof value === "string" ? value : "";
const code = (value: string) => value.toLowerCase().replace(/[^a-z0-9_:.-]/g, "_").slice(0, 64);

/** The invocation ai-astrology-insight would receive for this case (before its question normalization). */
export function astrologyEvalInvocation(testCase: EvalCase & { chart?: unknown }, requestId: string): Record<string, unknown> {
  const context = (testCase.chart && typeof testCase.chart === "object" ? testCase.chart : {}) as Partial<ChartContext>;
  const theme = str(testCase.input.theme);
  return {
    schemaVersion: "nilaza.astrology.ai-insight.invoke.v1",
    requestId,
    clientChartId: `eval_${str(testCase.input.chartKey) || "eval_chart_a"}`.slice(0, 128),
    language: testCase.locale,
    chart: context.chart,
    selectedFactIds: context.selectedFactIds,
    facts: context.facts,
    caveats: context.caveats,
    userFocus: {
      mode: "question",
      theme: ASTROLOGY_THEMES.includes(theme) ? theme : "open_reflection",
      sanitizedQuestion: str(testCase.input.question),
      consentScope: "current_focus_only",
      contextDisclosure: "chart_facts_and_current_focus_only"
    },
    consent: { accepted: true, version: "astrology_ai_fact_sharing_v1" }
  };
}

/** The refusal the endpoint would give for this invocation, read from the validator like ai-astrology-insight does. */
export function astrologyRefusal(errors: readonly string[]): "crisis_support" | "professional_advice_blocked" | "invalid_request" | null {
  if (!errors.length) return null;
  const blockedTopic = errors.find((error) => error.includes("blocked topic"));
  if (blockedTopic?.includes("self_harm")) return "crisis_support";
  if (blockedTopic?.includes("regulated_advice")) return "professional_advice_blocked";
  return "invalid_request";
}

/** Crisis case: passes when the endpoint's own invocation check refuses it as self_harm (no route, prompt or model). */
export function astrologyCrisisResult(testCase: EvalCase & { chart?: unknown }, variant: Variant): EvalResult {
  const refusal = astrologyRefusal(validateAstrologyAiInvocation(astrologyEvalInvocation(testCase, `eval-${crypto.randomUUID()}`)));
  const pass = refusal === "crisis_support";
  return {
    caseId: testCase.id, variant, formatPass: pass, safetyPass: pass,
    checkCode: pass ? "astrology_crisis_support" : "crisis_not_detected",
    outputText: pass ? ASTROLOGY_CRISIS_TEXT[testCase.locale] : "", provider: "local", model: "astrology_invocation_check",
    fallbackUsed: false, latencyMs: 0, costMicro: 0, costEstimated: false
  };
}

export type AstrologyCaseDeps = {
  /** Client for the prompt read; for a prompt run's draft variant it returns the draft row as the active one. */
  client: SupabaseLike | null;
  readRoute?: (feature: string) => Promise<any>;
  generate: (request: Omit<GenerateInput, "deadlineMs" | "supabase" | "metadata" | "feature">) => Promise<GenerateResult>;
};

export async function runAstrologyCase(testCase: EvalCase & { chart?: unknown }, deps: AstrologyCaseDeps): Promise<Outcome> {
  const invocation = astrologyEvalInvocation(testCase, `eval-${crypto.randomUUID()}`);
  const refusal = astrologyRefusal(validateAstrologyAiInvocation(invocation));
  // A normal case the endpoint refuses as a crisis never reaches the model there either.
  if (refusal === "crisis_support") return { text: ASTROLOGY_CRISIS_TEXT[testCase.locale], formatPass: false, checkCode: "safety_redirect_on_normal_case" };
  if (refusal) return { text: "", formatPass: false, checkCode: `astrology:${refusal}` };
  const focus = invocation.userFocus as { sanitizedQuestion: string };
  const question = focus.sanitizedQuestion.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!question) return { text: "", formatPass: false, checkCode: "astrology:question_required" };
  focus.sanitizedQuestion = question;

  let route: any = null;
  try { route = deps.readRoute ? await deps.readRoute(ASTROLOGY_PROMPT_FEATURE) : null; } catch { route = null; }
  if (!route?.id || route.status !== "active" || route.responseSchema !== ASTROLOGY_AI_CONTRACT.responseSchema.name) {
    return { text: "", formatPass: false, checkCode: "astrology:route_not_ready" };
  }

  let prompt: { version?: unknown; prompt_text?: unknown } | null = null;
  if (deps.client) {
    try {
      const { data, error } = await deps.client.from("prompt_versions")
        .select("id,version,status,locale,prompt_text")
        .eq("feature", ASTROLOGY_PROMPT_FEATURE)
        .eq("owner_type", "global")
        .is("owner_id", null)
        .eq("locale", testCase.locale)
        .eq("status", "active")
        .order("published_at", { ascending: false })
        .limit(1);
      prompt = error ? null : (Array.isArray(data) ? data[0] : data) ?? null;
    } catch { prompt = null; }
  }
  const promptText = str(prompt?.prompt_text);
  const promptVersion = str(prompt?.version);
  if (!promptText.trim()) return { text: "", formatPass: false, checkCode: "astrology:prompt_not_ready" };

  // Same request projection, fact selection, system prompt and user message as ai-astrology-insight.
  const reportId = crypto.randomUUID();
  const request = toAstrologyAiRequest(invocation as unknown as AstrologyAiInvocation, reportId);
  const selectedFacts = selectAstrologyAiFacts(request);
  const generation = await deps.generate({
    route,
    system: systemPrompt(promptText, request.language),
    messages: [{
      role: "user",
      content: JSON.stringify({
        language: request.language,
        chart: request.chart,
        selectedFactIds: request.selectedFactIds,
        facts: selectedFacts,
        caveats: request.caveats,
        currentFocus: { mode: request.userFocus.mode, theme: request.userFocus.theme, question }
      })
    }],
    fallbackText: "{}"
  });
  if (generation.moderationStatus === "blocked") return { text: generation.text, formatPass: false, checkCode: "safety_blocked", generation };
  if (generation.moderationStatus !== "passed" || generation.provider === "local_fallback") {
    return { text: generation.text, formatPass: false, checkCode: "fallback_text", generation };
  }
  const parsed = asModelJson(generation.text);
  if (!parsed) return { text: generation.text, formatPass: false, checkCode: "astrology:invalid_json", generation };
  if (isIncompleteAnswerFinishReason(generation.finishReason)) return { text: generation.text, formatPass: false, checkCode: "incomplete", generation };
  const response = makeAstrologyAiResponseEnvelope({ modelOutput: parsed, request, reportId, promptVersion, providerMode: "staging" });
  const errors = validateAstrologyAiResponse(response, request);
  if (errors.length) return { text: generation.text, formatPass: false, checkCode: code(`astrology:${astrologyDiagnosticFieldCode(errors[0])}`), generation };
  return { text: generation.text, formatPass: true, checkCode: "ok", generation };
}
