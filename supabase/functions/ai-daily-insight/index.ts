import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { generateWithModelRoute } from "../_shared/model-router.ts";
import { compactLines, sanitizeProviderMetadata } from "../_shared/model-provider.ts";

type DailyInsightInput = {
  language?: "vi" | "en" | string;
  dateKey?: string;
  rerollCount?: number;
  profile?: {
    nickname?: string;
    goals?: string[];
    tone?: string;
  };
  recentEntries?: Array<{
    title?: string;
    mood?: string;
    createdAt?: string;
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const input = (await req.json()) as DailyInsightInput;
    const language = input.language ?? "vi";
    const dateKey = input.dateKey ?? new Date().toISOString().slice(0, 10);
    const rerollCount = input.rerollCount ?? 0;
    const nickname = input.profile?.nickname?.trim();

    const title = language === "vi" ? "Nhịp soi chiếu hôm nay" : "Today's reflective pulse";
    const fallbackText =
      language === "vi"
        ? `${nickname ? `${nickname}, h` : "H"}ôm nay hãy chậm lại một nhịp trước khi kết luận. Điều sáng nhất thường xuất hiện khi bạn đủ dịu với chính mình.`
        : `${nickname ? `${nickname}, t` : "T"}oday asks for one pause before you decide. The clearest signal often appears when you are gentle with yourself.`;
    const reflectionPrompt =
      language === "vi"
        ? "Một điều nhỏ nào sẽ giúp mình thấy rõ hơn trong hôm nay?"
        : "What small action would help me see more clearly today?";

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization");
    let persistenceStatus = "skipped";
    let userId: string | undefined;
    const supabase = supabaseUrl && supabaseAnonKey && authHeader
      ? createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        })
      : null;
    if (supabase && authHeader) {
      const accessToken = authHeader.replace(/^Bearer\s+/i, "");
      const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
      if (!userError && userData.user) userId = userData.user.id;
      else persistenceStatus = "auth_error";
    }
    const generation = await generateWithModelRoute({
      feature: "daily_insight",
      supabase,
      traceContext: {
        userId,
        request: req,
        metadata: {
          dateKey,
          rerollCount,
          goalCount: input.profile?.goals?.length ?? 0,
          recentEntryCount: input.recentEntries?.length ?? 0,
          promptVersionId: "daily_insight_system"
        }
      },
      system: compactLines([
        "You generate Nilaza daily insight copy.",
        "Keep it warm, concise, reflective, and safe.",
        "Do not make deterministic predictions or give medical, legal, financial, or mental-health advice.",
        "Return only the daily insight body text."
      ]),
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            language,
            dateKey,
            rerollCount,
            nickname: nickname ?? null,
            goals: input.profile?.goals ?? [],
            tone: input.profile?.tone ?? null,
            recentEntries: input.recentEntries ?? []
          })
        }
      ],
      fallbackText
    });
    const text = generation.text;

    if (supabase && userId) {
        if (generation.moderationStatus === "blocked") {
          await supabase.from("safety_events").insert({
            user_id: userId,
            feature: "chat",
            reason: "blocked_topic",
            summary: `daily_insight blocked: ${generation.safetyReason ?? "safety_filter"}`,
            status: "open"
          });
        }
        const { error: usageError } = await supabase.from("usage_events").insert({
          user_id: userId,
          event_name: "daily_insight_generated",
          feature: "daily_insight",
          metadata: {
            dateKey,
            rerollCount,
            goals: input.profile?.goals ?? [],
            tone: input.profile?.tone ?? null,
            recentEntryCount: input.recentEntries?.length ?? 0,
            promptVersionId: "daily_insight_system",
            model: sanitizeProviderMetadata(generation)
          }
        });
        persistenceStatus = usageError ? "usage_error" : "stored";
    } else if (supabase && !userId) {
      persistenceStatus = "auth_error";
    }

    return jsonResponse({
      id: `daily-${dateKey}`,
      dateKey,
      title,
      text,
      reflectionPrompt,
      source: "backend",
      rerollCount,
      createdAt: new Date().toISOString(),
      model: sanitizeProviderMetadata(generation),
      persistenceStatus
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
