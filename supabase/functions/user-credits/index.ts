import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { createCreditsHandler, MAX_LEDGER_ROWS } from "./handler.ts";

serve((req) => {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("Authorization") ?? "";
  // This endpoint uses the verified caller's JWT/RLS and has no write adapter.
  const client = url && anonKey ? createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  }) : null;
  return createCreditsHandler({
    configured: Boolean(client),
    authenticate: async (token) => {
      const { data, error } = await client!.auth.getUser(token);
      if (error || !data?.user) return null;
      const user = data.user as typeof data.user & { is_anonymous?: boolean };
      return { id: user.id, isAnonymous: user.is_anonymous !== false };
    },
    readLedger: async (userId) => {
      const { data, count, error } = await client!.from("credit_ledger")
        .select("delta", { count: "exact" }).eq("user_id", userId)
        .range(0, MAX_LEDGER_ROWS - 1);
      return { rows: data, count, failed: Boolean(error) };
    }
  })(req);
});
