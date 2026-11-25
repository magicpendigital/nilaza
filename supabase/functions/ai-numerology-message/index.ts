import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { generateWithModelRoute, resolveFeatureRoute } from "../_shared/model-router.ts";
import { claimDeliveredAttempt } from "../_shared/daily-attempts.ts";
import { aiAuthUserOrUnavailable } from "../_shared/ai-request-guard.ts";
import { featureEnabledStrict } from "../_shared/feature-switch.ts";
import { resolveGlobalPrompt } from "../_shared/global-prompt.ts";
import { numerologyMessageDailyLimits } from "../_shared/account-tier-policy.ts";
import { PREMIUM_ENTITLEMENTS, resolveServerTier } from "../_shared/premium-entitlement.ts";
import { ATTEMPT_EVENT, createNumerologyMessageHandler, DELIVERED_EVENT, FEATURE } from "./handler.ts";

// Bản đồ số "Lời nhắn riêng" (Owner approval 2026-11-25). Every read and write runs with the caller's own client (user
// JWT) under RLS: the switch, the prompt, the subscription rows, usage_events (attempt and delivered counts) and
// safety_events. No service-role key is used and no model campaign applies to this feature. The switch row is seeded
// enabled=false, so the function answers 503 feature_paused until the Owner turns it on in Admin.
const handler = createNumerologyMessageHandler(req => {
  const url = Deno.env.get("SUPABASE_URL"), anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  let userCreatedAt: string | null = null;
  const limits = numerologyMessageDailyLimits();
  return {
    authenticate: async token => {
      const { data, error } = await supabase.auth.getUser(token);
      userCreatedAt = data?.user?.created_at ?? null;
      return aiAuthUserOrUnavailable(data?.user, error);
    },
    featureEnabled: () => featureEnabledStrict(supabase as never, FEATURE),
    // A paid entitlement or the shared tier switch grants Premium; an unreadable subscription row refuses the call.
    readTier: async userId => {
      const { data, error } = await (supabase as unknown as { from(table: string): { select(columns: string): { eq(column: string, value: string): { in(column: string, values: readonly string[]): PromiseLike<{ data: unknown; error: unknown }> } } } })
        .from("subscriptions").select("entitlement,status,current_period_end").eq("user_id", userId).in("entitlement", PREMIUM_ENTITLEMENTS);
      if (error) throw new Error("tier_unavailable");
      return resolveServerTier({ subscriptions: Array.isArray(data) ? data : [], user: { created_at: userCreatedAt } });
    },
    claimAttempt: userId => claimDeliveredAttempt(supabase as never, {
      userId, feature: FEATURE, deliveredEvent: DELIVERED_EVENT, attemptEvent: ATTEMPT_EVENT,
      deliveredLimit: limits.delivered, attemptLimit: limits.attempts
    }),
    resolvePrompt: language => resolveGlobalPrompt(supabase, FEATURE, language),
    // Active route only: no campaign client is passed, so no model campaign is read for this feature.
    resolveRoute: (userId, language) => resolveFeatureRoute(supabase, FEATURE, userId, { locale: language }),
    generate: input => generateWithModelRoute({ ...input, supabase }),
    recordUsage: async row => {
      try {
        const { error } = await supabase.from("usage_events").insert(row);
        return !error;
      } catch { return false; }
    },
    recordSafetyEvent: async row => {
      try { await supabase.from("safety_events").insert(row); } catch { /* Best effort. */ }
    }
  };
});
// CORS Access-Control-Allow-Origin is provided by the shared tested handler.
serve(async (req) => await handler(req));
