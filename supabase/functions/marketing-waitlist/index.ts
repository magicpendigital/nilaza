import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { createWaitlistHandler } from "./handler.ts";
const url = Deno.env.get("SUPABASE_URL") || "";
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const secret = Deno.env.get("TURNSTILE_SECRET_KEY") || "";
const supabase = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
serve(createWaitlistHandler({
  allowedOrigins: (Deno.env.get("WAITLIST_ALLOWED_ORIGINS") || "https://nilaza.magicpendigital.com").split(",").map(value => value.trim()).filter(Boolean),
  turnstileSecret: /^[123]x0{10,}/.test(secret) ? undefined : secret,
  backendConfigured: Boolean(supabase) && url.replace(/\/$/, "") === "https://etfajmrwyywokgafzxsb.supabase.co",
  register: async input => {
    if (!supabase) throw new Error("waitlist_unavailable");
    const { error } = await supabase.rpc("register_marketing_waitlist_request", input);
    if (error) { console.error("marketing_waitlist_request_failed", error.code); throw new Error("waitlist_unavailable"); }
  }
}));
