// ai-astrology-insight: Premium Astrology AI reading. The request handling lives in handler.ts (Nil P1-B lock and
// replay, 15/11/2026); this file wires the real Supabase client (@supabase/supabase-js; the user client verifies the
// caller with supabase.auth.getUser before the body is read), model router, feature config, switch and receipt writer.
// CORS (Access-Control-Allow-Origin) and OPTIONS are handled in handler.ts.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { generateWithModelRoute, readActiveModelRoute } from "../_shared/model-router.ts";
import { writeAnswerReceipt } from "../_shared/answer-receipt.ts";
import { readActiveFeatureConfig } from "../_shared/feature-config.ts";
import { featurePaused } from "../_shared/feature-switch.ts";
import { createAstrologyInsightHandler } from "./handler.ts";

const handler = createAstrologyInsightHandler({
  env: (key) => Deno.env.get(key),
  createClient: (url, key, options) => createClient(url, key, options),
  readActiveModelRoute: (supabase, feature) => readActiveModelRoute(supabase, feature),
  generateWithModelRoute: (input) => generateWithModelRoute(input),
  readActiveFeatureConfig: (feature) => readActiveFeatureConfig(feature),
  featurePaused: (supabase, feature) => featurePaused(supabase as never, feature),
  writeAnswerReceipt: (input) => writeAnswerReceipt(input)
});

serve(async (req) => await handler(req));
