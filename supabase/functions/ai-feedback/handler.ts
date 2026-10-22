import { AiRequestError, guardAiJsonRequest } from "../_shared/ai-request-guard.ts";
import { AI_FEEDBACK_SCHEMA, isFeedbackUuid, parseFeedbackExport, parseFeedbackReceipt, parseFeedbackSubmission } from "../_shared/ai-feedback-contract.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
type Store = {
  authenticate: (token: string) => Promise<{ id: string; isAnonymous?: boolean } | null>;
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error?: { code?: string; message?: string } | null }>;
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const codes: Record<string, [number, string]> = {
  feedback_conflict: [409, "feedback_conflict"], feedback_rate_limited: [429, "feedback_rate_limited"],
  answer_receipt_unavailable: [400, "answer_receipt_unavailable"], invalid_feedback: [400, "invalid_feedback"],
  authentication_required: [401, "authentication_required"]
};

export function createFeedbackHandler(storeFor: (req: Request) => Store | null) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    try {
      const store = storeFor(req);
      const { input } = await guardAiJsonRequest(req, { configured: Boolean(store), authenticate: token => store!.authenticate(token) });
      let name: string, args: Record<string, unknown>, clientId: string | undefined;
      if (input.operation === "export" && Object.keys(input).length === 1) {
        name = "export_own_ai_feedback"; args = {};
      } else if (input.operation === "delete_all" && Object.keys(input).length === 1) {
        name = "delete_own_ai_feedback"; args = { feedback_id_input: null };
      } else if (input.operation === "delete" && Object.keys(input).length === 2 && isFeedbackUuid(input.feedbackId)) {
        name = "delete_own_ai_feedback"; args = { feedback_id_input: input.feedbackId };
      } else {
        const submission = parseFeedbackSubmission(input);
        if (!submission) return json({ error: "invalid_feedback" }, 400);
        name = "submit_ai_feedback"; args = { payload: submission }; clientId = submission.clientFeedbackId;
      }
      const { data, error } = await store!.rpc(name, args);
      if (error) {
        const known = error.message ? codes[error.message] : undefined;
        if (known) return json({ error: known[1] }, known[0]);
        if (error.code === "42501") return json({ error: "authentication_required" }, 401);
        return json({ error: "feedback_unavailable" }, 503);
      }
      if (clientId) {
        const receipt = parseFeedbackReceipt(data, clientId);
        return receipt ? json(receipt) : json({ error: "feedback_receipt_unavailable" }, 502);
      }
      if (name === "delete_own_ai_feedback") {
        if (!Number.isSafeInteger(data) || Number(data) < 0) return json({ error: "feedback_receipt_unavailable" }, 502);
        return json({ schemaVersion: AI_FEEDBACK_SCHEMA, operation: input.operation, deletedCount: data });
      }
      const exported = parseFeedbackExport({ schemaVersion: AI_FEEDBACK_SCHEMA, items: data });
      return exported ? json(exported) : json({ error: "feedback_receipt_unavailable" }, 502);
    } catch (error) {
      if (error instanceof AiRequestError) return json({ error: error.code }, error.status);
      return json({ error: "feedback_unavailable" }, 503);
    }
  };
}
