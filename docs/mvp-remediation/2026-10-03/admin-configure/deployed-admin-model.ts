import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { providerReadiness } from "./readiness.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    status
  });
}

async function createSupabase(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !/^Bearer\s+\S+$/i.test(authHeader)) {
    return { error: jsonResponse({ error: "Unauthorized" }, 401) };
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: jsonResponse({ error: "Supabase env and Authorization bearer token are required" }, 503) };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) return { error: jsonResponse({ error: "Unauthorized" }, 401) };

  const { data: isAdmin, error: adminError } = await supabase.rpc("has_admin_capability", { capability: req.method === "GET" ? "ai.read" : "ai.manage" });
  if (adminError || isAdmin !== true) return { error: jsonResponse({ error: "Admin role required" }, 403) };

  return { supabase, userId: userData.user.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!["GET", "POST"].includes(req.method)) return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const context = await createSupabase(req);
    if (context.error) return context.error;
    const { supabase, userId } = context;

    if (req.method === "GET") {
      const { data: routes, error } = await supabase.from("model_route_versions")
        .select("feature, version, status, primary_provider, primary_model, fallback_provider, fallback_model, response_schema, temperature, max_output_tokens, published_at")
        .in("status", ["active", "experimental"])
        .order("published_at", { ascending: false }).limit(100);
      if (error) return jsonResponse({ error: "Unable to read model routes" }, 503);
      const { data: history, error: historyError } = await supabase.from("model_route_versions")
        .select("feature, version, status, primary_provider, primary_model, fallback_provider, fallback_model, response_schema, temperature, max_output_tokens, published_at, created_at")
        .in("status", ["archived", "draft"])
        .order("created_at", { ascending: false }).limit(100);
      if (historyError) return jsonResponse({ error: "Unable to read model route history" }, 503);
      return jsonResponse({
        status: "connected", projectHost: new URL(Deno.env.get("SUPABASE_URL")!).hostname,
        checkedAt: new Date().toISOString(), routes: routes ?? [], history: history ?? [],
        providers: providerReadiness(name => Deno.env.get(name)),
        providerCallsMade: false
      });
    }

    const input = await req.json();
    const feature = input.feature;
    if (!feature) return jsonResponse({ error: "feature is required" }, 400);
    const version = input.version || `${new Date().toISOString().split('T')[0]}-llm-routing-v2`;
    const requestedStatus = input.status || "active";

    const primaryProvider = input.primary?.provider?.toLowerCase();
    const primaryModel = input.primary?.model;
    const fallbackProvider = input.fallback?.provider?.toLowerCase() || null;
    const fallbackModel = input.fallback?.model || null;

    if (!primaryProvider || !primaryModel) {
      return jsonResponse({ error: "primary provider and model are required" }, 400);
    }

    const configPayload = {
      feature,
      version,
      status: requestedStatus === "active" ? "active" : requestedStatus,
      primary_provider: primaryProvider,
      primary_model: primaryModel,
      fallback_provider: fallbackProvider,
      fallback_model: fallbackModel,
      temperature: Number(input.temperature ?? 0.7),
      max_output_tokens: Number(input.maxTokens ?? 800),
      response_schema: input.responseSchema || "chat_reply_v2",
      fallback_when: input.fallbackWhen || ["missing_api_key", "provider_timeout", "rate_limit", "provider_5xx", "malformed_response"],
      safety_policy: input.safetyPolicy || {},
      created_by: userId,
      published_by: requestedStatus === "active" ? userId : null,
      published_at: requestedStatus === "active" ? new Date().toISOString() : null
    };
    const { data: config, error: configError } = await supabase.rpc("publish_model_route_config", { config_input: configPayload });
    if (configError) return jsonResponse({ error: "Unable to publish model route configuration" }, configError.code === "42501" ? 403 : 400);

    return jsonResponse({
      status: "published",
      configId: config.id,
      version: config.version,
      configStatus: config.status
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});

