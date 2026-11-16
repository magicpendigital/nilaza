import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createGuestDrawHandler } from "./handler.ts";

// Tarot v2 pack 1 (Owner 2026-11-16, option A). Public on purpose (verify_jwt = false in config.toml): a signed-out guest has
// no account. It only returns cards for one (device id, spread, topic, Vietnam day) derived from TAROT_GUEST_DRAW_SECRET,
// which the Owner sets. No database, no model, no user data. CORS Access-Control-Allow-Origin comes from the shared handler.
const handler = createGuestDrawHandler(() => Deno.env.get("TAROT_GUEST_DRAW_SECRET"));
serve(async (req) => await handler(req));
