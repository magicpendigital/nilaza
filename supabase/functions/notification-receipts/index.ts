import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { createNotificationProvider } from "../_shared/notification-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
}

async function adminContext(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!supabaseUrl || !supabaseAnonKey || !authHeader) return { error: jsonResponse({ error: "Supabase env and Authorization bearer token are required" }, 503) };
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) return { error: jsonResponse({ error: "Unauthorized" }, 401) };
  const { data: isAdmin, error: adminError } = await supabase.rpc("has_admin_capability", { capability: "notifications.dispatch" });
  if (adminError || isAdmin !== true) return { error: jsonResponse({ error: "Admin role required" }, 403) };
  // Server-only worker boundary. The caller never receives tokens/private rows.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return { error: jsonResponse({ error: "Notification worker unavailable" }, 503) };
  return { supabase: createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const context = await adminContext(req);
    if (context.error) return context.error;
    const provider = createNotificationProvider();
    const { data: deliveries, error } = await context.supabase
      .from("notification_deliveries")
      .select("id, provider_ticket_id, device_push_token_id")
      .eq("provider", "expo")
      .eq("status", "sent")
      .is("receipt_checked_at", null)
      .not("provider_ticket_id", "is", null)
      .limit(100);
    if (error) return jsonResponse({ error: error.message }, 400);

    const ids = (deliveries ?? []).map((delivery: Record<string, string>) => delivery.provider_ticket_id);
    const receipts = await provider.readReceipts(ids);
    let checked = 0;
    let invalid = 0;
    for (const delivery of deliveries ?? []) {
      const receipt = receipts[delivery.provider_ticket_id];
      if (!receipt) continue;
      const errorCode = receipt.details?.error ?? null;
      const nextStatus = errorCode === "DeviceNotRegistered" ? "invalid_token" : receipt.status === "ok" ? "sent" : "failed";
      await context.supabase
        .from("notification_deliveries")
        .update({
          provider_receipt_status: receipt.status,
          error_code: errorCode,
          error_message: receipt.message ?? null,
          status: nextStatus,
          receipt_checked_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", delivery.id);
      checked += 1;
      if (nextStatus === "invalid_token") {
        invalid += 1;
        await context.supabase
          .from("device_push_tokens")
          .update({
            status: "invalid",
            failure_count: 1,
            updated_at: new Date().toISOString()
          })
          .eq("id", delivery.device_push_token_id);
      }
    }

    return jsonResponse({ status: "synced", checked, invalid });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
