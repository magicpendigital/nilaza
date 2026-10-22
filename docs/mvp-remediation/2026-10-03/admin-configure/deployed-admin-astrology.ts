import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }, status
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!["GET", "POST"].includes(req.method)) return jsonResponse({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("Authorization");
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!authHeader || !/^Bearer\s+\S+$/i.test(authHeader)) return jsonResponse({ error: "Unauthorized" }, 401);
  if (!url || !anonKey) return jsonResponse({ error: "Admin prompt service is unavailable" }, 503);

  const supabase = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);
  const capability = req.method === "GET" ? "ai.read" : "ai.manage";
  const { data: allowed, error: capabilityError } = await supabase.rpc("has_admin_capability", { capability });
  if (capabilityError || allowed !== true) return jsonResponse({ error: "Admin role required" }, 403);

  if (req.method === "GET") {
    const { data, error } = await supabase.rpc("get_astrology_prompt_config");
    if (error) return jsonResponse({ error: "Unable to load active Astrology prompts" }, 503);
    return jsonResponse({ status: "connected", projectHost: new URL(url).hostname, prompts: data ?? {} });
  }

  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
  const version = typeof input.version === "string" ? input.version.trim() : "";
  const vi = typeof input.vi === "string" ? input.vi : "";
  const en = typeof input.en === "string" ? input.en : "";
  const expectedVi = typeof input.expectedViVersion === "string" ? input.expectedViVersion : null;
  const expectedEn = typeof input.expectedEnVersion === "string" ? input.expectedEnVersion : null;
  if (version.length < 3 || version.length > 96 || vi.trim().length < 100 || vi.length > 12000 || en.trim().length < 100 || en.length > 12000) {
    return jsonResponse({ error: "Both language prompts must be between 100 and 12000 characters." }, 400);
  }
  const { data, error } = await supabase.rpc("publish_astrology_prompt_pair", {
    new_version: version,
    expected_vi_version: expectedVi,
    expected_en_version: expectedEn,
    prompt_vi: vi,
    prompt_en: en
  });
  if (error) return jsonResponse({ error: error.code === "40001" ? "Active prompts changed since you loaded them. Reload before publishing." : "Unable to publish the Astrology prompt pair." }, error.code === "40001" ? 409 : 400);
  return jsonResponse({ status: "published", ...data });
});

