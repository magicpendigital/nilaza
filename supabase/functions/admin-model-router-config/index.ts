import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { providerReadiness } from "./readiness.ts";
import { MODEL_ROUTE_PUBLISH_CONTRACT, publishModelRoute } from "./contract.ts";

const STEP_COLUMNS = "steps, total_deadline_ms, publish_note";
const STEPS_MIGRATION = "20261113140000_model_route_steps.sql";

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
    const { supabase } = context;

    if (req.method === "GET") {
      // Admin A7 (D3): read the chain columns; before migration 20261113140000 they do not exist, so read the
      // legacy columns and tell Admin which migration enables step chains.
      const legacyColumns = "id, feature, version, status, primary_provider, primary_model, fallback_provider, fallback_model, response_schema, temperature, max_output_tokens, fallback_when, safety_policy, published_at";
      const readRoutes = (columns: string) => supabase.from("model_route_versions").select(columns)
        .in("status", ["active", "experimental"]).order("published_at", { ascending: false }).limit(100);
      const readHistory = (columns: string) => supabase.from("model_route_versions").select(columns + ", created_at")
        .in("status", ["archived", "draft"]).order("created_at", { ascending: false }).limit(100);
      let stepsSupported = true;
      let { data: routes, error } = await readRoutes(legacyColumns + ", " + STEP_COLUMNS);
      if (error) {
        stepsSupported = false;
        ({ data: routes, error } = await readRoutes(legacyColumns));
      }
      if (error) return jsonResponse({ error: "Unable to read model routes" }, 503);
      const { data: history, error: historyError } = await readHistory(stepsSupported ? legacyColumns + ", " + STEP_COLUMNS : legacyColumns);
      if (historyError) return jsonResponse({ error: "Unable to read model route history" }, 503);
      return jsonResponse({
        status: "connected", contractVersion: MODEL_ROUTE_PUBLISH_CONTRACT, projectHost: new URL(Deno.env.get("SUPABASE_URL")!).hostname,
        checkedAt: new Date().toISOString(), routes: routes ?? [], history: history ?? [],
        stepsSupported, ...(stepsSupported ? {} : { stepsMigration: STEPS_MIGRATION }),
        providers: providerReadiness(name => Deno.env.get(name)),
        providerCallsMade: false
      });
    }

    const input = await req.json();
    // The pre-A7 RPC ignores unknown keys, so a chain sent before migration 20261113140000 would publish without its
    // steps. Refuse instead and name the migration.
    if (input && typeof input === "object" && ["steps", "totalDeadlineMs", "note"].some((key) => input[key] !== undefined && input[key] !== null)) {
      const { error: columnError } = await supabase.from("model_route_versions").select("id, " + STEP_COLUMNS).limit(1);
      if (columnError) return jsonResponse({ error: "Step chains need migration " + STEPS_MIGRATION, code: "migration_missing", migration: STEPS_MIGRATION }, 412);
    }
    const { data: config, error: configError } = await publishModelRoute(supabase, input);
    if (configError) return jsonResponse({
      error: ["40001", "23505"].includes(configError.code) ? "Configuration changed or publication request conflicts; reload before reviewing again" : "Unable to publish model route configuration",
      code: configError.code
    }, configError.code === "42501" ? 403 : ["40001", "23505"].includes(configError.code) ? 409 : 400);
    return jsonResponse({
      status: "published",
      configId: config.id,
      version: config.version,
      configStatus: config.status,
      contractVersion: MODEL_ROUTE_PUBLISH_CONTRACT,
      publishRequestId: config.publishRequestId,
      replayed: config.replayed === true,
      config: config.config
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
