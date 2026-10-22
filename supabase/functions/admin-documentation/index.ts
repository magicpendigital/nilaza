import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { ownerGuideMarkdown } from "./owner-guide.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "GET, OPTIONS" };
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "private, no-store" } });

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);
  const authorization = req.headers.get("Authorization");
  const url = Deno.env.get("SUPABASE_URL"); const anon = Deno.env.get("SUPABASE_ANON_KEY"); const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authorization || !url || !anon || !serviceKey) return json({ error: "unauthorized" }, 401);
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
  const { data: allowed, error: accessError } = await userClient.rpc("has_admin_capability", { capability: "ai.read" });
  if (accessError || allowed !== true) return json({ error: "forbidden" }, 403);
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: auditError } = await service.from("admin_document_access_log").insert({ user_id: userData.user.id, document_id: "ai-studio-owner-guide" });
  if (auditError) console.error("admin_document_access_log_failed", auditError.code);
  return json({ id: "ai-studio-owner-guide", title: "Nilaza Admin & AI Studio Owner Guide", format: "markdown", updatedAt: "2026-09-09", content: ownerGuideMarkdown });
});
