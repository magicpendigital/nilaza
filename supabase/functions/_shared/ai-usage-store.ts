// Server-only contract. Caller identity/HMAC/rate bounds must be derived by the Edge, never the request body.
export type UsageFeature = "persona_chat" | "oracle_router" | "tarot_reading";
export interface UsageSpec {
  id: string; userId: string; feature: UsageFeature; audience: "pilot" | "evaluation";
  requestDigest: string; attemptBounds: number[]; campaign: string; policyVersion: string;
  tarotCardCount?: number;
}
export type Reservation = { status: "created" | "busy" | "failed" } |
  { status: "blocked"; code: string } | { status: "replay"; resultId: string };
export interface UsageStore {
  reserve(spec: UsageSpec, lease: string): Promise<Reservation>;
  claim(id: string, lease: string, attempt: number): Promise<void>;
  receipt(id: string, lease: string, attempt: number, costMicro: number | null, succeeded: boolean): Promise<void>;
  finish(id: string, lease: string, saved: boolean, resultId?: string): Promise<string>;
}
export class UsageError extends Error {
  constructor(public code: string) { super(code); this.name = "UsageError"; }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateUsageSpec(spec: UsageSpec) {
  if (!uuid.test(spec.id) || !uuid.test(spec.userId) || !/^[0-9a-f]{64}$/.test(spec.requestDigest) ||
    !["persona_chat", "oracle_router", "tarot_reading"].includes(spec.feature) ||
    !["pilot", "evaluation"].includes(spec.audience) || !spec.campaign || !spec.policyVersion ||
    !Array.isArray(spec.attemptBounds) || spec.attemptBounds.length < 1 || spec.attemptBounds.length > 2 ||
    spec.attemptBounds.some(n => !Number.isSafeInteger(n) || n < 0 || n > 100000) ||
    spec.attemptBounds.reduce((sum, n) => sum + n, 0) > 100000 ||
    (spec.feature === "tarot_reading" && spec.tarotCardCount !== 1)) throw new UsageError("invalid_spec");
}
export interface ServiceRpcClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
}
const blockedCodes = new Set(["invalid_spec", "usage_unavailable", "request_conflict", "campaign_inactive", "invalid_user", "evaluation_forbidden", "qa_budget_exhausted", "daily_quota_exhausted"]);
export function createUsageStore(client: ServiceRpcClient): UsageStore {
  async function call(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    try {
      const { data, error } = await client.rpc("nilaza_ai_usage_" + name, args);
      if (error || !data || typeof data !== "object" || Array.isArray(data)) throw new Error();
      return data as Record<string, unknown>;
    } catch { throw new UsageError("usage_unavailable"); }
  }
  const requireOk = (result: Record<string, unknown>) => {
    if (result.ok !== true) throw new UsageError("usage_unavailable");
  };
  return {
    async reserve(s, lease) {
      validateUsageSpec(s); if (!uuid.test(lease)) throw new UsageError("invalid_spec");
      const r = await call("reserve", { p_id: s.id, p_user_id: s.userId, p_feature: s.feature,
        p_audience: s.audience, p_digest: s.requestDigest, p_lease: lease, p_attempt_bounds: s.attemptBounds,
        p_campaign: s.campaign, p_policy: s.policyVersion, p_tarot_cards: s.tarotCardCount ?? null });
      if (r.status === "replay" && typeof r.resultId === "string" && uuid.test(r.resultId)) return { status: "replay", resultId: r.resultId };
      if (r.status === "created" || r.status === "busy" || r.status === "failed") return { status: r.status };
      if (r.status === "blocked" && typeof r.code === "string" && blockedCodes.has(r.code)) return { status: "blocked", code: r.code };
      throw new UsageError("usage_unavailable");
    },
    async claim(id, lease, attempt) { requireOk(await call("claim", { p_id: id, p_lease: lease, p_attempt: attempt })); },
    async receipt(id, lease, attempt, costMicro, succeeded) {
      if (costMicro !== null && (!Number.isSafeInteger(costMicro) || costMicro < 0)) throw new UsageError("invalid_receipt");
      requireOk(await call("receipt", { p_id: id, p_lease: lease, p_attempt: attempt, p_cost_micro: costMicro, p_succeeded: succeeded }));
    },
    async finish(id, lease, saved, resultId) {
      const r = await call("finish", { p_id: id, p_lease: lease, p_success_saved: saved, p_result_id: resultId ?? null });
      requireOk(r);
      if (typeof r.status !== "string" || !["completed", "failed", "completed_pending_cost", "failed_pending_cost"].includes(r.status)) throw new UsageError("usage_unavailable");
      if (r.status.startsWith("completed") !== saved) throw new UsageError("usage_unavailable");
      return r.status;
    },
  };
}
