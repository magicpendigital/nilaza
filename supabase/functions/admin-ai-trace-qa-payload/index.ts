import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" }, status
  });
}

function base64Bytes(value: string) {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error("Invalid base64 value");
  }
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const encodedKey = Deno.env.get("AI_TRACE_QA_ENCRYPTION_KEY")?.trim();
  if (!authHeader || !/^Bearer\s+\S+$/i.test(authHeader)) return response({ error: "Unauthorized" }, 401);
  if (!supabaseUrl || !anonKey || !encodedKey || Deno.env.get("AI_TRACE_ENVIRONMENT") !== "staging"
    || Deno.env.get("AI_TRACE_QA_CAPTURE_ENABLED") !== "true") {
    return response({ error: "QA payload retrieval is unavailable" }, 503);
  }
  let traceId = "";
  try { traceId = String((await req.json())?.traceId || "").trim(); } catch { /* handled as invalid trace ID */ }
  if (!traceId || traceId.length > 128) return response({ error: "A trace ID is required" }, 400);
  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) return response({ error: "Unauthorized" }, 401);
  const { data: isOwner, error: capabilityError } = await supabase.rpc("has_admin_capability", { capability: "roles.manage" });
  if (capabilityError || isOwner !== true) return response({ error: "Owner role required" }, 403);
  const { data, error } = await supabase.rpc("get_ai_trace_qa_capture", { trace_id_input: traceId });
  if (error) return response({ error: "Unable to read the QA payload" }, 503);
  if (!data) return response({ error: "No retained QA payload exists for this trace" }, 404);

  try {
    const rawKey = base64Bytes(encodedKey);
    if (rawKey.byteLength !== 32) throw new Error("Invalid key length");
    const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);
    const additionalData = new TextEncoder().encode(`nilaza-ai-trace-qa-v1:${traceId}:${userData.user.id}`);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64Bytes(data.nonce), additionalData }, key, base64Bytes(data.ciphertext));
    const bytes = new Uint8Array(plaintext);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (hash !== data.contentSha256) throw new Error("QA payload hash mismatch");
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    return response({ payload, expiresAt: data.expiresAt, contentSha256: hash });
  } catch {
    return response({ error: "The encrypted QA payload could not be verified" }, 503);
  }
});
