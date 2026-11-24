import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { aiAuthUserOrUnavailable } from "../_shared/ai-request-guard.ts";
import { createShareEventsHandler } from "./handler.ts";

// Writes enumerated share measurements and product signals to the existing usage_events table with the service role, for the verified user only.
const handler = createShareEventsHandler(req => {
  const url = Deno.env.get("SUPABASE_URL"), anonKey = Deno.env.get("SUPABASE_ANON_KEY"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return null;
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }, auth: { persistSession: false, autoRefreshToken: false } });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    authenticate: async token => {
      const { data, error } = await caller.auth.getUser(token);
      return aiAuthUserOrUnavailable(data?.user, error);
    },
    countRecent: async (userId, sinceIso) => {
      const { count, error } = await admin.from("usage_events").select("id", { count: "exact", head: true }).eq("user_id", userId).in("feature", ["share", "product_signal"]).gte("created_at", sinceIso);
      if (error) throw new Error("count_failed");
      return count ?? 0;
    },
    insert: async rows => await admin.from("usage_events").insert(rows),
    campaignRow: async campaignId => {
      const { data, error } = await admin.from("model_campaigns").select("status, ended_at, updated_at").eq("id", campaignId).maybeSingle();
      if (error) throw new Error("campaign_lookup_failed");
      return data ?? null;
    }
  };
});
// CORS Access-Control-Allow-Origin is provided by the shared tested handler.
serve(async (req) => await handler(req));
