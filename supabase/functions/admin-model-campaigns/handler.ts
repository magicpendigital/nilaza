import { CAMPAIGN_FEATURES } from "../_shared/model-campaign.ts";
import {
  CAMPAIGNS_MIGRATION, METRICS_CAMPAIGN_LIMIT, MIN_CALLS, evaluateMetrics, rpcErrorResponse, saveDraftPayload, statusParams, winnerPayload
} from "./contract.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

export function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    status
  });
}

export type RpcClient = { rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<{ data: any; error: any }> };
/** Verifies the bearer token and the capability (GET ai.read, POST ai.manage); returns a user-scoped client. */
export type ContextFor = (req: Request) => Promise<{ error: Response } | { error?: undefined; supabase: RpcClient }>;

const MAX_BODY_BYTES = 64 * 1024;

export function createModelCampaignsHandler(contextFor: ContextFor) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (!["GET", "POST"].includes(req.method)) return jsonResponse({ error: "Method not allowed" }, 405);
    try {
      const context = await contextFor(req);
      if ("error" in context && context.error) return context.error;
      const supabase = (context as { supabase: RpcClient }).supabase;

      if (req.method === "GET") {
        const url = new URL(req.url);
        const feature = url.searchParams.get("feature");
        const onlyId = url.searchParams.get("id");
        if (feature !== null && !(CAMPAIGN_FEATURES as readonly string[]).includes(feature)) return jsonResponse({ error: "Unsupported feature" }, 400);
        const { data, error } = await supabase.rpc("admin_list_model_campaigns", { feature_filter: feature });
        if (error) {
          const mapped = rpcErrorResponse(error);
          return jsonResponse(mapped.body, mapped.status);
        }
        const campaigns = (Array.isArray(data) ? data : []).filter((item: any) => !onlyId || item?.id === onlyId);
        const metrics: Record<string, unknown> = {};
        for (const campaign of campaigns.filter((item: any) => item?.status !== "draft").slice(0, METRICS_CAMPAIGN_LIMIT)) {
          const { data: raw, error: metricsError } = await supabase.rpc("admin_get_model_campaign_metrics", { campaign_id: campaign.id });
          metrics[campaign.id] = metricsError ? { unavailable: true } : evaluateMetrics(raw ?? {}, campaign.stopRules ?? {});
        }
        return jsonResponse({
          status: "connected", checkedAt: new Date().toISOString(), features: CAMPAIGN_FEATURES, minCalls: MIN_CALLS,
          migration: CAMPAIGNS_MIGRATION, campaigns, metrics
        });
      }

      const raw = await req.text();
      if (raw.length > MAX_BODY_BYTES) return jsonResponse({ error: "Request too large" }, 413);
      let input: any;
      try {
        input = JSON.parse(raw);
      } catch {
        return jsonResponse({ error: "Invalid JSON" }, 400);
      }
      if (!input || typeof input !== "object" || Array.isArray(input)) return jsonResponse({ error: "Invalid request" }, 400);
      let call: { name: string; args: Record<string, unknown> };
      try {
        if (input.action === "save_draft") call = { name: "admin_save_model_campaign_draft", args: { payload: saveDraftPayload(input) } };
        else if (["start", "pause", "end"].includes(input.action)) call = { name: "admin_set_model_campaign_status", args: statusParams(input) };
        else if (input.action === "pick_winner") call = { name: "admin_pick_model_campaign_winner", args: { payload: winnerPayload(input) } };
        else return jsonResponse({ error: "Unknown action" }, 400);
      } catch (error) {
        return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request", code: "invalid_request" }, 400);
      }
      const { data, error } = await supabase.rpc(call.name, call.args);
      if (error) {
        const mapped = rpcErrorResponse(error);
        return jsonResponse(mapped.body, mapped.status);
      }
      return jsonResponse(input.action === "pick_winner"
        ? { status: "ok", action: input.action, campaign: data?.campaign ?? null, route: data?.route ?? null }
        : { status: "ok", action: input.action, campaign: data ?? null });
    } catch {
      return jsonResponse({ error: "Model campaigns unavailable" }, 503);
    }
  };
}
