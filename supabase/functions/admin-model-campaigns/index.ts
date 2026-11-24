import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { createModelCampaignsHandler, jsonResponse } from "./handler.ts";

// Admin model campaigns: list with per-variant metrics (ai.read), save draft / start / pause / end / pick winner
// (ai.manage). Every call runs as the signed-in admin; the SQL RPCs check the capability again and write the audit log.
// Access-Control-Allow-Origin comes from the shared corsHeaders in handler.ts.
const handler = createModelCampaignsHandler(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !/^Bearer\s+\S+$/i.test(authHeader)) return { error: jsonResponse({ error: "Unauthorized" }, 401) };
  if (!supabaseUrl || !supabaseAnonKey) return { error: jsonResponse({ error: "Supabase env and Authorization bearer token are required" }, 503) };
  const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) return { error: jsonResponse({ error: "Unauthorized" }, 401) };
  const { data: isAdmin, error: adminError } = await supabase.rpc("has_admin_capability", { capability: req.method === "GET" ? "ai.read" : "ai.manage" });
  if (adminError || isAdmin !== true) return { error: jsonResponse({ error: "Admin role required" }, 403) };
  return { supabase };
});

serve(async (req) => await handler(req));
