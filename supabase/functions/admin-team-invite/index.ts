// Admin "Thành viên & quyền" (Owner request 14/11). POST { email, role, confirmOwner? } with an Admin session that has
// roles.manage. The caller is checked with their own session; then, with the service role:
//   admin_team_invite_begin  -> already_member | assigned (existing account, role given, no email) | invite_unavailable
//                               | invite_needed (counted against the owner's daily cap)
//   auth.admin.inviteUserByEmail(email, { redirectTo: ADMIN_INVITE_REDIRECT_URL }) only for invite_needed
//   admin_team_invite_finish -> gives the role and writes the role.invite audit row naming the Owner.
// The invite link, the email, Auth error text and keys are never returned or logged.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { inviteRedirect, mapRpcError, parseInviteRequest, REDIRECT_ENV } from "./invite.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    status
  });
}
function rpcFailure(error: { code?: string } | null) {
  const mapped = mapRpcError(error?.code);
  return jsonResponse({ error: mapped.error, ...(mapped.migration ? { migration: mapped.migration } : {}) }, mapped.status);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !/^Bearer\s+\S+$/i.test(authHeader)) return jsonResponse({ error: "Unauthorized" }, 401);
  if (!supabaseUrl || !supabaseAnonKey || !serviceKey) return jsonResponse({ error: "Supabase env is not configured" }, 503);

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
    if (userError || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);
    const { data: allowed, error: capabilityError } = await supabase.rpc("has_admin_capability", { capability: "roles.manage" });
    if (capabilityError || allowed !== true) return jsonResponse({ error: "Admin role required" }, 403);

    const parsed = parseInviteRequest(await req.json().catch(() => null));
    if ("error" in parsed) return jsonResponse({ error: parsed.error }, 400);
    const { email, role, confirmOwner } = parsed.value;
    const actor = userData.user.id;
    const redirectTo = inviteRedirect(Deno.env.get(REDIRECT_ENV));

    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: begin, error: beginError } = await service.rpc("admin_team_invite_begin", {
      actor_input: actor, email_input: email, role_input: role, confirm_owner: confirmOwner, can_invite: Boolean(redirectTo)
    });
    if (beginError) return rpcFailure(beginError);
    const status = begin?.status;
    if (status === "already_member") return jsonResponse({ status, userId: begin.userId, roles: begin.roles });
    if (status === "assigned") return jsonResponse({ status, userId: begin.userId, role });
    if (status === "invite_unavailable" || !redirectTo) return jsonResponse({ error: "invite_not_configured", env: REDIRECT_ENV }, 503);
    if (status !== "invite_needed") return jsonResponse({ error: "invite_failed" }, 500);

    const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(email, { redirectTo });
    const invitedId = invited?.user?.id;
    if (inviteError || !invitedId) return jsonResponse({ error: "invite_failed" }, 502);

    const { data: finish, error: finishError } = await service.rpc("admin_team_invite_finish", {
      actor_input: actor, user_id_input: invitedId, role_input: role, confirm_owner: confirmOwner
    });
    if (finishError) return rpcFailure(finishError);
    if (finish?.status === "already_member") return jsonResponse({ status: "already_member", userId: invitedId, roles: finish.roles });
    return jsonResponse({ status: "invited", userId: invitedId, role, invitesToday: begin.invitesToday, inviteDailyCap: begin.inviteDailyCap });
  } catch {
    return jsonResponse({ error: "invite_failed" }, 500);
  }
});
