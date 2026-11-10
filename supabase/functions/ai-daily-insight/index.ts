import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { generateWithModelRoute } from "../_shared/model-router.ts";
import { compactLines, sanitizeProviderMetadata } from "../_shared/model-provider.ts";
import { AiRequestError, aiAuthUserOrUnavailable, guardAiJsonRequest } from "../_shared/ai-request-guard.ts";
import { featurePaused } from "../_shared/feature-switch.ts";
import { claimDailyAttempt } from "../_shared/daily-attempts.ts";
import { accountTierPolicy } from "../_shared/account-tier-policy.ts";

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
    // Sign-in, switch and daily limit come before reading the body or calling a model (decision 2026-11-04; limit 2026-11-10).
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    }) : null;
    const { input: requestInput, userId } = await guardAiJsonRequest(req, {
      configured: Boolean(supabase),
      authenticate: async (token) => {
        if (!supabase) return null;
        const { data, error } = await supabase.auth.getUser(token);
        return aiAuthUserOrUnavailable(data?.user, error);
      }
    });
    if (!supabase) return jsonResponse({ error: "ai_unavailable" }, 503);
    if (await featurePaused(supabase as never, "daily_insight")) return jsonResponse({ error: "feature_paused" }, 503);
    const attempt = await claimDailyAttempt(supabase as never, {
      userId, eventName: "daily_insight_attempted", feature: "daily_insight",
      limit: accountTierPolicy.dailyInsight?.dailyLimit ?? 3
    });
    if (attempt === "limit_reached") return jsonResponse({ error: "daily_limit_reached" }, 429);
    if (attempt === "unavailable") return jsonResponse({ error: "usage_check_unavailable" }, 503);
    const input = requestInput as DailyInsightInput;
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

    let persistenceStatus = "skipped";
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
    if (error instanceof AiRequestError) return jsonResponse({ error: error.code }, error.status);
    return jsonResponse({ error: "service_unavailable" }, 503);
  }
});
