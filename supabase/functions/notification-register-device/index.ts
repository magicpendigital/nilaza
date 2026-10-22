import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

type RegisterInput = {
  expoPushToken?: string;
  deviceId?: string;
  platform?: "ios" | "android" | "web" | "unknown";
  permissionStatus?: "unknown" | "granted" | "denied" | "unavailable";
  appVersion?: string;
  locale?: string;
  timezone?: string;
  enabledTypes?: string[];
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
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const input = (await req.json()) as RegisterInput;
    const context = await userContext(req);
    if ("error" in context) return context.error;
    if ("fallback" in context) return jsonResponse({ status: "local_fallback" });

    const now = new Date().toISOString();
    const enabledTypes = input.enabledTypes ?? [];

    if (!input.expoPushToken || input.permissionStatus !== "granted") {
      if (input.deviceId) {
        await context.supabase
          .from("device_push_tokens")
          .update({ status: "revoked", revoked_at: now, updated_at: now })
          .eq("user_id", context.userId)
          .eq("device_id", input.deviceId);
      }
      return jsonResponse({ status: "synced" });
    }

    const { data, error } = await context.supabase
      .from("device_push_tokens")
      .upsert({
        user_id: context.userId,
        expo_push_token: input.expoPushToken,
        device_id: input.deviceId ?? null,
        platform: input.platform === "unknown" ? null : input.platform,
        app_version: input.appVersion ?? null,
        locale: input.locale ?? "vi",
        timezone: input.timezone ?? null,
        status: "active",
        last_seen_at: now,
        revoked_at: null,
        updated_at: now
      }, { onConflict: "expo_push_token" })
      .select("id")
      .single();
    if (error) return jsonResponse({ error: error.message }, 400);

    if (enabledTypes.length) {
      const preferenceRows = enabledTypes.map((type) => ({
        user_id: context.userId,
        channel: "push",
        notification_type: type,
        enabled: true,
        locale: input.locale ?? "vi",
        timezone: input.timezone ?? null,
        updated_at: now
      }));
      const { error: preferenceError } = await context.supabase
        .from("notification_preferences")
        .upsert(preferenceRows, { onConflict: "user_id,channel,notification_type" });
      if (preferenceError) return jsonResponse({ error: preferenceError.message }, 400);
    }

    return jsonResponse({ status: "synced", remoteId: data.id });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
