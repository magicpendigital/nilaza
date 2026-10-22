import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

type InboxInput = {
  notifications?: Array<{
    id: string;
    type: string;
    title: Record<string, string>;
    body: Record<string, string>;
    sourceType?: string;
    sourceId?: string;
    targetRoute?: string;
    status?: "unread" | "read" | "dismissed";
    createdAt?: string;
    readAt?: string;
  }>;
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

function isUuid(value: string | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

async function userContext(req: Request) {
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
  return { supabase, userId: userData.user.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!["GET", "POST"].includes(req.method)) return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const context = await userContext(req);
    if ("error" in context) return context.error;
    if ("fallback" in context) return jsonResponse({ status: "local_fallback", notifications: [] });

    if (req.method === "POST") {
      const input = (await req.json()) as InboxInput;
      const rows = (input.notifications ?? []).map((notification) => ({
        user_id: context.userId,
        local_id: notification.id,
        notification_type: notification.type,
        title: notification.title,
        body: notification.body,
        source_type: notification.sourceType ?? null,
        source_id: isUuid(notification.sourceId) ? notification.sourceId : null,
        target_route: notification.targetRoute ?? null,
        status: notification.status ?? "unread",
        created_at: notification.createdAt ?? new Date().toISOString(),
        read_at: notification.readAt ?? null
      }));
      if (rows.length) {
        const { error } = await context.supabase
          .from("in_app_notifications")
          .upsert(rows, { onConflict: "user_id,local_id" });
        if (error) return jsonResponse({ error: error.message }, 400);
      }
    }

    const { data, error } = await context.supabase
      .from("in_app_notifications")
      .select("id, local_id, notification_type, title, body, source_type, source_id, target_route, status, created_at, read_at")
      .eq("user_id", context.userId)
      .neq("status", "dismissed")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return jsonResponse({ error: error.message }, 400);

    return jsonResponse({
      status: "synced",
      notifications: (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.local_id ?? row.id,
        type: row.notification_type,
        title: row.title,
        body: row.body,
        channel: "in_app",
        sourceType: row.source_type,
        sourceId: row.source_id,
        targetRoute: row.target_route,
        status: row.status,
        createdAt: row.created_at,
        readAt: row.read_at
      }))
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
