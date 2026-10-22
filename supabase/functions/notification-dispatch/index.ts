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

    const { data: events, error: eventsError } = await context.supabase
      .from("notification_events")
      .select("id, user_id, notification_type, safe_title, safe_body, target_route")
      .eq("status", "pending")
      .limit(100);
    if (eventsError) return jsonResponse({ error: eventsError.message }, 400);

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    for (const event of events ?? []) {
      let eventFailed = 0;
      const { data: tokens, error: tokenError } = await context.supabase
        .from("device_push_tokens")
        .select("id, expo_push_token, locale")
        .eq("user_id", event.user_id)
        .eq("status", "active");
      if (tokenError) return jsonResponse({ error: tokenError.message }, 400);

      const messages = (tokens ?? []).map((token: Record<string, string>) => {
        const locale = token.locale === "vi" ? "vi" : "en";
        return {
          to: token.expo_push_token,
          title: event.safe_title?.[locale] ?? event.safe_title?.en ?? "Nilaza",
          body: event.safe_body?.[locale] ?? event.safe_body?.en ?? "Your reflection is ready.",
          sound: "default" as const,
          data: { targetRoute: event.target_route ?? "home", notificationType: event.notification_type }
        };
      });

      if (!messages.length) {
        skipped += 1;
        await context.supabase.from("notification_events").update({ status: "canceled", updated_at: new Date().toISOString() }).eq("id", event.id);
        continue;
      }

      try {
        const tickets = await provider.sendBatch(messages);
        for (let index = 0; index < messages.length; index += 1) {
          const ticket = tickets[index];
          const token = tokens[index];
          const status = ticket?.status === "ok" ? "sent" : ticket?.details?.error === "DeviceNotRegistered" ? "invalid_token" : "failed";
          await context.supabase.from("notification_deliveries").insert({
            event_id: event.id,
            user_id: event.user_id,
            device_push_token_id: token.id,
            channel: "push",
            provider: provider.name,
            provider_ticket_id: ticket?.id ?? null,
            error_code: ticket?.details?.error ?? null,
            error_message: ticket?.message ?? null,
            status,
            attempted_at: new Date().toISOString()
          });
          if (status === "sent") sent += 1;
          else {
            failed += 1;
            eventFailed += 1;
          }
        }
        await context.supabase.from("notification_events").update({ status: eventFailed ? "partial" : "sent", updated_at: new Date().toISOString() }).eq("id", event.id);
      } catch (error) {
        failed += messages.length;
        await context.supabase.from("notification_events").update({
          status: "failed",
          updated_at: new Date().toISOString()
        }).eq("id", event.id);
      }
    }

    return jsonResponse({ status: "synced", sent, skipped, failed });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
