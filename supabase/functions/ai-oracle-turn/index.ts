import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { aiAuthUserOrUnavailable } from "../_shared/ai-request-guard.ts";
import { createOracleRuntimeHandler, oracleCorsHeaders } from "./handler.ts";

// Access-Control-Allow-Origin is defined once in handler.ts with OPTIONS handling.
export { oracleCorsHeaders };
export function createOracleHandler(runtime: {
  env: (key: string) => string | undefined;
  createClient: typeof createClient;
} = { env: key => Deno.env.get(key), createClient }) {
  return async (req: Request): Promise<Response> => {
    const supabaseUrl = runtime.env("SUPABASE_URL");
    const supabaseAnonKey = runtime.env("SUPABASE_ANON_KEY");
    const supabase = supabaseUrl && supabaseAnonKey ? runtime.createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      auth: { persistSession: false, autoRefreshToken: false }
    }) : null;
    return await createOracleRuntimeHandler({
      configured: Boolean(supabase),
      authenticate: async token => {
        if (!supabase) return null;
        const { data, error } = await supabase.auth.getUser(token);
        return aiAuthUserOrUnavailable(data?.user, error);
      },
      recordUsage: async (userId, metadata) => {
        if (!supabase) return false;
        const { error } = await supabase.from("usage_events").insert({
          user_id: userId, event_name: "oracle_turn_created", feature: "oracle_router", metadata
        });
        return !error;
      },
      recordSafety: async (userId, reason) => {
        if (!supabase) return false;
        const { error } = await supabase.from("safety_events").insert({
          user_id: userId, feature: "oracle", reason,
          summary: `oracle safety support: ${reason}`, status: "open"
        });
        return !error;
      }
    })(req);
  };
}

if (import.meta.main) serve(createOracleHandler());
