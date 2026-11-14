// Admin A6: POST {setId, targetKind: "feature_config" | "prompt_version", targetId} runs an eval set against a draft and
// the active version (spec ADMIN_SCREENS_SPEC_2026-11-04 §3.12, §5.1; migration 20261113110000).
// 1. The caller's own session must hold ai.manage, or ai.read + content.draft (same rule as save_ai_eval_set).
// 2. start_ai_eval_run (service key) checks the actor again, the set, the draft and reserves the cost within the 10 USD
//    eval budget. 3. runner.ts runs the cases through generateWithModelRoute (unchanged) with the real prompt assembly.
// 4. finish_ai_eval_run (service key) stores results, cost and the safety layer. Case and answer text go only to the
// database (strict trace redaction for model calls); this function logs nothing.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { generateWithModelRoute } from "../_shared/model-router.ts";
import { readPublishedTarotContent } from "../_shared/tarot-content.ts";
import { runEvalPlan, SUPPORTED_EVAL_FEATURES, type EvalPlan, type GenerateInput } from "./runner.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Edge Functions stop at 150 s; the last model call starts early enough to finish and store results.
const RUN_TIME_LIMIT_MS = 115_000;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }, status
  });
}

// Database refusals the Admin explains without reading server text.
const startErrors: Record<string, [number, string]> = {
  "42501": [403, "Admin role required"],
  NZE03: [409, "eval_budget_exhausted"],
  NZE04: [409, "eval_set_needs_crisis_case"],
  NZE06: [409, "eval_run_refused"],
  "22023": [400, "invalid_eval_run"]
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  const startedAt = Date.now();
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !/^Bearer\s+\S+$/i.test(authHeader)) return jsonResponse({ error: "Unauthorized" }, 401);
  if (!url || !anonKey || !serviceKey) return jsonResponse({ error: "Eval service is unavailable" }, 503);

  const supabase = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);
  const [manage, read, draft] = await Promise.all(["ai.manage", "ai.read", "content.draft"].map(capability =>
    supabase.rpc("has_admin_capability", { capability })));
  const allowed = manage.data === true || (read.data === true && draft.data === true);
  if (manage.error || read.error || draft.error || !allowed) return jsonResponse({ error: "Admin role required" }, 403);

  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
  const setId = typeof input.setId === "string" && UUID.test(input.setId) ? input.setId : null;
  const targetId = typeof input.targetId === "string" && UUID.test(input.targetId) ? input.targetId : null;
  const targetKind = input.targetKind === "feature_config" || input.targetKind === "prompt_version" ? input.targetKind : null;
  if (!setId || !targetId || !targetKind) return jsonResponse({ error: "invalid_eval_run" }, 400);

  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: started, error: startError } = await service.rpc("start_ai_eval_run", {
    actor_input: userData.user.id, set_id_input: setId, target_kind_input: targetKind, target_id_input: targetId
  });
  if (startError || !started) {
    const [status, mapped] = startErrors[startError?.code ?? ""] ?? [503, "eval_start_unavailable"];
    // NZE04 covers both "no crisis case" and "no normal case" (a run of crisis cases alone checks no model answer).
    const error = startError?.code === "NZE04" && /normal_case/.test(String(startError?.message ?? "")) ? "eval_set_needs_normal_case" : mapped;
    return jsonResponse({ error, code: startError?.code ?? null }, status);
  }
  const plan = started as EvalPlan & { runId: string };
  let outcome: Awaited<ReturnType<typeof runEvalPlan>>;
  try {
    if (!SUPPORTED_EVAL_FEATURES.includes(plan.feature)) throw new Error("eval_feature_not_supported");
    outcome = await runEvalPlan(plan, {
      supabase,
      actorId: userData.user.id,
      tarotContent: plan.feature === "tarot_reading" ? await readPublishedTarotContent(supabase) : null,
      stopAt: startedAt + RUN_TIME_LIMIT_MS,
      concurrency: 4,
      generate: async (request: GenerateInput) => await generateWithModelRoute({
        feature: request.feature,
        system: request.system,
        messages: request.messages,
        fallbackText: request.fallbackText,
        ...(request.safetyText !== undefined ? { safetyText: request.safetyText } : {}),
        ...(request.acceptOutput ? { acceptOutput: request.acceptOutput } : {}),
        deadlineMs: request.deadlineMs,
        supabase: request.supabase,
        strictTraceRedaction: true,
        traceContext: { userId: userData.user.id, request: req, metadata: { ...request.metadata, adminEval: true } }
      })
    });
  } catch {
    const { data: failed } = await service.rpc("finish_ai_eval_run", { run_id_input: plan.runId, results_input: [], error_code_input: "runner_error" });
    return jsonResponse({ status: "failed", run: failed ?? { id: plan.runId } }, 502);
  }
  const { data: finished, error: finishError } = await service.rpc("finish_ai_eval_run", {
    run_id_input: plan.runId, results_input: outcome.results, error_code_input: outcome.errorCode
  });
  if (finishError || !finished) return jsonResponse({ error: "eval_finish_unavailable", runId: plan.runId }, 503);
  return jsonResponse({ status: "finished", run: finished as Record<string, unknown> });
});
