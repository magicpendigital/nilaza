import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { aiAuthUserOrUnavailable } from "../_shared/ai-request-guard.ts";
import { createFeedbackHandler } from "./handler.ts";

const handler = createFeedbackHandler(req => {
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  const supabase = createClient(url, key, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }, auth: { persistSession: false, autoRefreshToken: false } });
  return {
    authenticate: async token => {
      const { data, error } = await supabase.auth.getUser(token);
      return aiAuthUserOrUnavailable(data?.user, error);
    },
    rpc: async (name, args) => await supabase.rpc(name, args)
  };
});
// CORS Access-Control-Allow-Origin is provided by the shared tested handler.
serve(async (req) => await handler(req));
