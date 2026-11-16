import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { generateWithModelRoute } from "../_shared/model-router.ts";
import { resolveTarotPrompt, tarotContentVersion } from "../_shared/tarot-prompt.ts";
import { readPublishedTarotContent } from "../_shared/tarot-content.ts";
import { aiAuthUserOrUnavailable } from "../_shared/ai-request-guard.ts";
import { writeAnswerReceipt } from "../_shared/answer-receipt.ts";
import { featurePaused } from "../_shared/feature-switch.ts";
import { readActiveFeatureConfig } from "../_shared/feature-config.ts";
import { PREMIUM_ENTITLEMENTS, resolveServerTier } from "../_shared/premium-entitlement.ts";
import { createTarotHandler } from "./handler.ts";
import { createSupabaseTarotStore, type ServiceClient } from "./store.ts";

// P1-A (2026-11-15) one event, one answer: the server draws the cards and locks them per account, spread, topic and
// Vietnam day; tarot_readings is written only with the service role through the claim RPCs (migration 20261115100000).
// The caller's own client (user JWT) verifies the user and keeps the reads and telemetry that already ran under RLS:
// prompt, switch, content bundle, deck lookup, safety_events and usage_events (tarot_reading_attempted is written by
// tarot_interpret_claim). Every answer returns persistenceStatus, and a stored answer is replayed with no model call.
const handler = createTarotHandler(req => {
  const url = Deno.env.get("SUPABASE_URL"), anonKey = Deno.env.get("SUPABASE_ANON_KEY"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return null;
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let userCreatedAt: string | null = null;
  return {
    authenticate: async token => {
      const { data, error } = await supabase.auth.getUser(token);
      userCreatedAt = data?.user?.created_at ?? null;
      return aiAuthUserOrUnavailable(data?.user, error);
    },
    // Tarot v2 pack 0 (Q4): read only when a Premium deck is drawn while Premium is on sale. A paid entitlement or the
    // shared tier switch grants Premium; an unreadable subscription row refuses the draw instead of granting it.
    readTier: async userId => {
      const { data, error } = await (supabase as unknown as { from(table: string): { select(columns: string): { eq(column: string, value: string): { in(column: string, values: readonly string[]): PromiseLike<{ data: unknown; error: unknown }> } } } })
        .from("subscriptions").select("entitlement,status,current_period_end").eq("user_id", userId).in("entitlement", PREMIUM_ENTITLEMENTS);
      if (error) throw new Error("tier_unavailable");
      return resolveServerTier({ subscriptions: Array.isArray(data) ? data : [], user: { created_at: userCreatedAt } });
    },
    store: createSupabaseTarotStore(admin as unknown as ServiceClient, supabase as unknown as ServiceClient),
    readContent: () => readPublishedTarotContent(supabase),
    featurePaused: () => featurePaused(supabase as never, "tarot_reading"),
    readFeatureConfig: () => readActiveFeatureConfig("tarot_reading"),
    resolvePrompt: language => resolveTarotPrompt(supabase, language),
    contentVersion: async content => content?.version ?? await tarotContentVersion(),
    generate: input => generateWithModelRoute({ ...input, supabase }),
    writeReceipt: input => writeAnswerReceipt(input as never)
  };
});
// CORS Access-Control-Allow-Origin is provided by the shared tested handler.
serve(async (req) => await handler(req));
