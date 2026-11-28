import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { createRevenueCatWebhookHandler } from "./handler.ts";

// Called by RevenueCat, not by the app: deploy with verify_jwt = false (see supabase/config.toml).
// The caller proves itself with the Authorization header value the Owner configures in RevenueCat and
// stores as the function secret REVENUECAT_WEBHOOK_AUTH. The service-role key stays inside this function
// and is used only for the service-role-only RPC nilaza_apply_revenuecat_event.
// No CORS headers: browsers have no reason to call this endpoint.
const handler = createRevenueCatWebhookHandler(() => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("not_configured");
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    secret: Deno.env.get("REVENUECAT_WEBHOOK_AUTH") ?? null,
    ignoreSandbox: Deno.env.get("REVENUECAT_IGNORE_SANDBOX") === "true",
    rpc: async (name, args) => await admin.rpc(name, args),
    logError: (code) => console.error(`revenuecat-webhook: ${code}`)
  };
});
serve(async req => await handler(req));
