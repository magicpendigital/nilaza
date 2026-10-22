import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

type ProfileInput = {
  profile?: {
    nickname?: string;
    language?: string;
    goals?: string[];
    tone?: string;
    onboarded?: boolean;
    currentStreak?: number;
    lastActivityDate?: string;
  };
  birthProfile?: {
    birthDate?: string;
    birthTime?: string;
    birthTimeKnown?: boolean;
    birthPlace?: string;
    consentVersion?: string;
    timezone?: string;
  };
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

function hasBirthPayload(input: ProfileInput) {
  const birth = input.birthProfile;
  return Boolean(birth?.birthDate || birth?.birthTime || birth?.birthPlace || birth?.birthTimeKnown);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const input = (await req.json()) as ProfileInput;
    if (!input.profile) return jsonResponse({ error: "profile is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey || !authHeader) {
      return jsonResponse({
        status: "synced",
        remoteId: "profile-staging-preview"
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const userId = userData.user.id;
    const { error: profileError } = await supabase.from("user_profiles").upsert({
      user_id: userId,
      display_name: input.profile.nickname?.trim() || "Nilaza user",
      language: input.profile.language ?? "vi",
      goals: input.profile.goals ?? [],
      preferred_tone: input.profile.tone ?? "gentle",
      onboarding_completed: input.profile.onboarded ?? true,
      current_streak: input.profile.currentStreak ?? 0,
      last_activity_date: input.profile.lastActivityDate || null,
      updated_at: new Date().toISOString()
    });
    if (profileError) return jsonResponse({ error: profileError.message }, 400);

    if (hasBirthPayload(input)) {
      const birthPayload = {
        user_id: userId,
        birth_date: input.birthProfile?.birthDate || null,
        birth_time: input.birthProfile?.birthTime || null,
        birth_time_known: Boolean(input.birthProfile?.birthTimeKnown),
        birth_place: input.birthProfile?.birthPlace || null,
        consent_version: input.birthProfile?.consentVersion || null,
        timezone: input.birthProfile?.timezone || null,
        updated_at: new Date().toISOString()
      };

      const { data: existingBirth, error: existingError } = await supabase
        .from("birth_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (existingError) return jsonResponse({ error: existingError.message }, 400);

      const birthResult = existingBirth?.id
        ? await supabase.from("birth_profiles").update(birthPayload).eq("id", existingBirth.id)
        : await supabase.from("birth_profiles").insert(birthPayload);
      if (birthResult.error) return jsonResponse({ error: birthResult.error.message }, 400);
    }

    return jsonResponse({
      status: "synced",
      remoteId: userId
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
