import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { aiAuthUserOrUnavailable } from "../_shared/ai-request-guard.ts";
import { createAccountDeleteHandler } from "./handler.ts";

// Deploy with verify_jwt = true (see supabase/config.toml). The service-role key stays inside this
// function; the signed-in person only proves who they are with their own access token.
const handler = createAccountDeleteHandler(req => {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return null;
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const userClient = createClient(url, anonKey, { ...options, global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const admin = createClient(url, serviceKey, options);
  return {
    authenticate: async token => {
      const { data, error } = await userClient.auth.getUser(token);
      return aiAuthUserOrUnavailable(data?.user, error);
    },
    rpc: async (name, args) => await admin.rpc(name, args),
    getEmail: async userId => {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) throw new Error("user_lookup_failed");
      return typeof data?.user?.email === "string" ? data.user.email : null;
    },
    deleteUser: async userId => {
      const { error } = await admin.auth.admin.deleteUser(userId);
      return { error: error ? { status: (error as { status?: number }).status } : null };
    }
  };
});
// CORS Access-Control-Allow-Origin is provided by the shared tested handler.
serve(async req => await handler(req));
