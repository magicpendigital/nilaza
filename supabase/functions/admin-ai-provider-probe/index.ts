// Admin A7 (D4): "Kiểm tra khóa". POST { providers?: string[] } with an Admin session that has ai.manage.
// For each provider: configured yes/no from env presence and a minimal call classified as ok / bad_key / no_credit /
// unreachable / not_configured. Results are written with the service role through record_ai_provider_probe (which
// also writes the audit row naming the admin) and returned. Key values are never returned, logged or stored.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { probeProvider, requestedProviders } from "./probe.ts";

const PROVIDERS_MIGRATION = "20261113140100_ai_providers.sql";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    status
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !/^Bearer\s+\S+$/i.test(authHeader)) return jsonResponse({ error: "Unauthorized" }, 401);
  if (!supabaseUrl || !supabaseAnonKey || !serviceKey) return jsonResponse({ error: "Supabase env is not configured" }, 503);

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
    if (userError || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);
    const { data: allowed, error: capabilityError } = await supabase.rpc("has_admin_capability", { capability: "ai.manage" });
    if (capabilityError || allowed !== true) return jsonResponse({ error: "Admin role required" }, 403);

    const providers = requestedProviders(await req.json().catch(() => null));
    if (!providers) return jsonResponse({ error: "Unknown provider" }, 400);

    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const results = [];
    let migrationMissing = false;
    for (const provider of providers) {
      const outcome = await probeProvider(provider, (name) => Deno.env.get(name));
      const { error } = await service.rpc("record_ai_provider_probe", {
        provider_input: provider,
        payload: { source: "probe", result: outcome.result, configured: outcome.configured, httpStatus: outcome.httpStatus, actor: userData.user.id }
      });
      if (error) migrationMissing = true;
      results.push({ provider: outcome.provider, secretName: outcome.secretName, configured: outcome.configured, result: outcome.result, httpStatus: outcome.httpStatus, detail: outcome.detail, recorded: !error });
    }
    return jsonResponse({
      status: "checked", checkedAt: new Date().toISOString(), results, providerCallsMade: true,
      ...(migrationMissing ? { recorded: false, migration: PROVIDERS_MIGRATION } : { recorded: true })
    });
  } catch {
    return jsonResponse({ error: "Provider check failed" }, 500);
  }
});
