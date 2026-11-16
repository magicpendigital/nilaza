import { AiRequestError, guardAiJsonRequest } from "../_shared/ai-request-guard.ts";
import { normalizeEmail, sha256 } from "../marketing-waitlist/helpers.ts";

export const ACCOUNT_DELETE_SCHEMA = "nilaza.account-delete.v1";
// Machine token sent by the app after the person types its own confirmation phrase.
export const DELETE_CONFIRMATION = "delete-my-account";
const SUBJECT_PREFIX = "nilaza-account-delete-v1:";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type RpcResult = { data: unknown; error?: { code?: string; message?: string } | null };
export type DeletionDeps = {
  authenticate: (token: string) => Promise<{ id: string; isAnonymous?: boolean } | null>;
  // Service-role calls only; never exposed to a client role.
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult>;
  getEmail: (userId: string) => Promise<string | null>;
  deleteUser: (userId: string) => Promise<{ error?: { status?: number } | null }>;
  // Billing lot 3: deletes the subscription-management customer; true when it is gone (2xx or 404).
  // Absent when billing is not configured, and the step is then skipped.
  deleteBillingCustomer?: (userId: string) => Promise<boolean>;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });

const statusOf = (data: unknown) =>
  data && typeof data === "object" && typeof (data as { status?: unknown }).status === "string" ? (data as { status: string }).status : null;

export function createAccountDeleteHandler(depsFor: (req: Request) => DeletionDeps | null) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    try {
      const deps = depsFor(req);
      const { userId, input } = await guardAiJsonRequest(req, {
        configured: Boolean(deps),
        authenticate: token => deps!.authenticate(token)
      });
      if (Object.keys(input).length !== 1 || input.confirm !== DELETE_CONFIRMATION) {
        return json({ error: "confirmation_required" }, 400);
      }
      const subjectHash = await sha256(SUBJECT_PREFIX + userId);

      const begin = await deps!.rpc("nilaza_account_delete_begin", { p_user: userId, p_subject_hash: subjectHash });
      if (begin.error) return json({ error: "deletion_unavailable" }, 503);
      const beginStatus = statusOf(begin.data);
      if (beginStatus === "completed") return json({ schemaVersion: ACCOUNT_DELETE_SCHEMA, status: "completed" });
      if (beginStatus === "staff_blocked") return json({ error: "staff_account_requires_owner_review" }, 403);
      if (beginStatus === "not_found") return json({ error: "account_not_found" }, 404);
      if (beginStatus !== "requested") return json({ error: "deletion_unavailable" }, 502);

      // Fail closed: without the email the waitlist row could survive the deletion.
      let emailHash: string | null = null;
      let email: string | null;
      try { email = await deps!.getEmail(userId); } catch { return json({ error: "deletion_unavailable" }, 503); }
      if (email) {
        const normalized = normalizeEmail(email);
        if (normalized) emailHash = await sha256(normalized);
      }

      const fail = async (code: string) => {
        // Bookkeeping only; the person is told to retry whether or not this succeeds.
        try { await deps!.rpc("nilaza_account_delete_finish", { p_subject_hash: subjectHash, p_ok: false, p_error_code: code }); } catch { /* retry stays possible */ }
        return json({ error: "deletion_incomplete", retry: true }, 502);
      };

      let purge: RpcResult;
      try { purge = await deps!.rpc("nilaza_account_delete_purge", { p_user: userId, p_subject_hash: subjectHash, p_email_hash: emailHash }); }
      catch { return await fail("purge_failed"); }
      if (purge.error) return await fail(purge.error.message === "staff_blocked" ? "staff_blocked" : "purge_failed");

      // After the purge (staff accounts are refused by then) and before the auth user is removed, so a
      // failure leaves the account in place and a retry runs this step again. Fail closed like the others.
      if (deps!.deleteBillingCustomer) {
        let billingGone = false;
        try { billingGone = await deps!.deleteBillingCustomer(userId); } catch { billingGone = false; }
        if (!billingGone) return await fail("billing_delete_failed");
      }

      let removed: { error?: { status?: number } | null };
      try { removed = await deps!.deleteUser(userId); } catch { return await fail("auth_delete_failed"); }
      // A 404 means the user is already gone, which is the goal of this request.
      if (removed.error && removed.error.status !== 404) return await fail("auth_delete_failed");

      try { await deps!.rpc("nilaza_account_delete_finish", { p_subject_hash: subjectHash, p_ok: true }); } catch { /* the account is gone either way */ }
      return json({ schemaVersion: ACCOUNT_DELETE_SCHEMA, status: "completed" });
    } catch (error) {
      if (error instanceof AiRequestError) return json({ error: error.code }, error.status);
      return json({ error: "deletion_unavailable" }, 503);
    }
  };
}
