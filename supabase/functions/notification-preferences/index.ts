import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

type PreferenceInput = {
  preferences?: Array<{
    channel: string;
    type: string;
    enabled: boolean;
  }>;
  locale?: string;
  timezone?: string;
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
    if ("fallback" in context) return jsonResponse({ status: "local_fallback", preferences: [] });

    if (req.method === "POST") {
      const input = (await req.json()) as PreferenceInput;
      const rows = (input.preferences ?? []).map((preference) => ({
        user_id: context.userId,
        channel: preference.channel,
        notification_type: preference.type,
        enabled: preference.enabled,
        locale: input.locale ?? "vi",
        timezone: input.timezone ?? null,
        updated_at: new Date().toISOString()
      }));
      if (rows.length) {
        const { error } = await context.supabase
          .from("notification_preferences")
          .upsert(rows, { onConflict: "user_id,channel,notification_type" });
        if (error) return jsonResponse({ error: error.message }, 400);
      }
    }

    const { data, error } = await context.supabase
      .from("notification_preferences")
      .select("id, channel, notification_type, enabled, updated_at")
      .eq("user_id", context.userId)
      .order("channel", { ascending: true });
    if (error) return jsonResponse({ error: error.message }, 400);

    return jsonResponse({
      status: "synced",
      preferences: (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id,
        channel: row.channel,
        type: row.notification_type,
        enabled: row.enabled,
        updatedAt: row.updated_at
      }))
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
