import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

type TestInput = {
  locale?: "vi" | "en" | string;
  targetRoute?: "home" | "tarot" | "astrology" | "journal" | "profile" | "chat";
};

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
  if (!supabaseUrl || !supabaseAnonKey || !authHeader) return { fallback: true as const };
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) return { error: jsonResponse({ error: "Unauthorized" }, 401) };
  const { data: isAdmin, error: adminError } = await supabase.rpc("has_admin_capability", { capability: "notifications.dispatch" });
  if (adminError || isAdmin !== true) return { error: jsonResponse({ error: "Admin role required" }, 403) };
  return { supabase, userId: userData.user.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const input = (await req.json()) as TestInput;
    const context = await adminContext(req);
    const notification = {
      type: "admin_test",
      title: { vi: "Thông báo thử Nilaza", en: "Nilaza test notification" },
      body: { vi: "Đây là thông báo thử an toàn, không chứa dữ liệu riêng tư.", en: "This is a safe test notification with no private content." },
      channel: "in_app",
      status: "unread",
      sourceType: "admin",
      targetRoute: input.targetRoute ?? "profile",
      createdAt: new Date().toISOString()
    };
    if ("error" in context) return context.error;
    if ("fallback" in context) return jsonResponse({ status: "local_fallback", notification });

    const { data: event, error: eventError } = await context.supabase
      .from("notification_events")
      .insert({
        user_id: context.userId,
        notification_type: "admin_test",
        source_type: "admin",
        safe_title: notification.title,
        safe_body: notification.body,
        target_route: notification.targetRoute,
        status: "in_app_created",
        created_by: context.userId
      })
      .select("id")
      .single();
    if (eventError) return jsonResponse({ error: eventError.message }, 400);

    const { data: inbox, error: inboxError } = await context.supabase
      .from("in_app_notifications")
      .insert({
        user_id: context.userId,
        event_id: event.id,
        notification_type: "admin_test",
        title: notification.title,
        body: notification.body,
        source_type: "admin",
        target_route: notification.targetRoute,
        status: "unread"
      })
      .select("id, created_at")
      .single();
    if (inboxError) return jsonResponse({ error: inboxError.message }, 400);

    await context.supabase.from("admin_audit_logs").insert({
      admin_user_id: context.userId,
      action: "notification_admin_test_created",
      target_table: "notification_events",
      target_id: event.id,
      metadata: { targetRoute: notification.targetRoute }
    });

    return jsonResponse({
      status: "synced",
      remoteId: inbox.id,
      notification: { ...notification, id: inbox.id, createdAt: inbox.created_at }
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
