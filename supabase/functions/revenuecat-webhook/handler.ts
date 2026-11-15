// RevenueCat -> Supabase entitlement webhook (billing lot 1, 2026-11-15).
// RevenueCat posts one JSON event per request with the Authorization header value configured in its
// dashboard. Any non-2xx answer is retried (5 times over about 80 minutes), so temporary failures answer
// 5xx and permanently unusable payloads answer 200 "ignored" or 400. The payload is trusted as sent;
// reconciling against the RevenueCat REST API (GET /subscribers) needs an Owner key and is a later lot.
import { PREMIUM_ENTITLEMENT } from "../_shared/premium-entitlement.ts";

export const REVENUECAT_WEBHOOK_SCHEMA = "nilaza.revenuecat-webhook.v1";
export const MAX_BODY_BYTES = 64 * 1024;
// A shorter configured secret is treated as not configured, so a placeholder can never open the endpoint.
export const MIN_SECRET_LENGTH = 32;
export const APPLY_RPC = "nilaza_apply_revenuecat_event";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "expired";
type RpcResult = { data: unknown; error?: { code?: string; message?: string } | null };
export type WebhookDeps = {
  // Value of REVENUECAT_WEBHOOK_AUTH; null when the function secret is missing.
  secret: string | null;
  // Service-role RPC; never reachable by a client role.
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult>;
  // Optional: drop SANDBOX events (for example on a production project once testing is over).
  ignoreSandbox?: boolean;
  // Error codes only; never the payload, the user id or the secret.
  logError?: (code: string) => void;
};

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const ignored = (reason: string) => json({ schemaVersion: REVENUECAT_WEBHOOK_SCHEMA, status: "ignored", reason });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_TYPE = /^[A-Z_]{1,64}$/;
const MAX_EVENT_ID = 200;
const MAX_PRODUCT_ID = 200;

// Lifecycle events that change Premium access. Status is decided per event below.
const ACCESS_EVENTS = new Set([
  "INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE", "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_EXTENDED", "TEMPORARY_ENTITLEMENT_GRANT", "REFUND_REVERSED", "SUBSCRIPTION_PAUSED",
  "CANCELLATION", "BILLING_ISSUE", "EXPIRATION"
]);

class PayloadError extends Error {}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

// Compares fixed-length SHA-256 digests so neither content nor length leaks through timing.
export async function secretMatches(provided: string | null, secret: string): Promise<boolean> {
  const [a, b] = await Promise.all([digest(provided ?? ""), digest(secret)]);
  let diff = provided === null ? 1 : 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function readBoundedText(req: Request): Promise<string> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new RangeError("too_large");
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      throw new RangeError("too_large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function optionalMs(value: unknown, field: string): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 8.64e15) throw new PayloadError(field);
  return value;
}

const toIso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());

// The Supabase user id is the RevenueCat app user id (the app calls logIn with it). Anonymous ids
// ($RCAnonymousID:...) and anything else that is not a UUID is never applied. If the subscriber's ids
// name more than one distinct UUID, the event is ambiguous and ignored rather than guessed.
export function resolveUserId(event: Record<string, unknown>): { userId: string } | { reason: "anonymous_user" | "ambiguous_user" } {
  const candidates = [event.app_user_id, event.original_app_user_id, ...(Array.isArray(event.aliases) ? event.aliases : [])];
  const uuids = new Set(candidates.filter((id): id is string => typeof id === "string" && UUID.test(id)).map((id) => id.toLowerCase()));
  if (uuids.size === 1) return { userId: [...uuids][0] };
  return { reason: uuids.size === 0 ? "anonymous_user" : "ambiguous_user" };
}

function grantsPremium(event: Record<string, unknown>): boolean {
  const ids = Array.isArray(event.entitlement_ids) ? event.entitlement_ids : [];
  // entitlement_id is deprecated but still sent by older integrations.
  return ids.includes(PREMIUM_ENTITLEMENT) || event.entitlement_id === PREMIUM_ENTITLEMENT;
}

// Maps one event to the row state. Google Play: access stays during the grace period, ends in account
// hold, while paused and after expiry; a cancelled subscription keeps access until its period ends.
export function mapEvent(type: string, event: Record<string, unknown>): { status: SubscriptionStatus; periodEnd: number | null } {
  const expiration = optionalMs(event.expiration_at_ms, "expiration_at_ms");
  switch (type) {
    case "CANCELLATION":
      // Auto-renew is off (or a refund): marked canceled; helper grants access until the period end.
      return { status: "canceled", periodEnd: expiration };
    case "BILLING_ISSUE": {
      // Payment failed: access continues only while a grace period runs.
      const grace = optionalMs(event.grace_period_expiration_at_ms, "grace_period_expiration_at_ms");
      return { status: "past_due", periodEnd: grace ?? expiration };
    }
    case "EXPIRATION":
      return { status: "expired", periodEnd: expiration };
    case "SUBSCRIPTION_PAUSED":
      // Pause takes effect at the end of the current period; RevenueCat then sends EXPIRATION.
      return { status: "active", periodEnd: expiration };
    default:
      return { status: event.period_type === "TRIAL" ? "trialing" : "active", periodEnd: expiration };
  }
}

export function createRevenueCatWebhookHandler(depsFor: (req: Request) => WebhookDeps) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    let deps: WebhookDeps;
    try { deps = depsFor(req); } catch { return json({ error: "not_configured" }, 503); }
    const log = (code: string) => { try { deps.logError?.(code); } catch { /* logging never fails a webhook */ } };
    if (!deps.secret || deps.secret.length < MIN_SECRET_LENGTH) {
      log("webhook_secret_missing");
      return json({ error: "not_configured" }, 503);
    }
    if (!(await secretMatches(req.headers.get("authorization"), deps.secret))) return json({ error: "unauthorized" }, 401);

    let event: Record<string, unknown>;
    let type: string;
    let eventId: string;
    try {
      let raw: string;
      try { raw = await readBoundedText(req); }
      catch (error) {
        if (error instanceof RangeError) return json({ error: "payload_too_large" }, 413);
        throw new PayloadError("body");
      }
      const body: unknown = JSON.parse(raw);
      if (!isObject(body) || !isObject(body.event)) throw new PayloadError("event");
      event = body.event;
      if (typeof event.type !== "string" || !EVENT_TYPE.test(event.type)) throw new PayloadError("type");
      if (typeof event.id !== "string" || !event.id.trim() || event.id.length > MAX_EVENT_ID) throw new PayloadError("id");
      type = event.type;
      eventId = event.id;
    } catch {
      return json({ error: "invalid_payload" }, 400);
    }

    // Dashboard test event: proves the URL and the secret; nothing is written.
    if (type === "TEST") return ignored("test_event");
    // TRANSFER names users in transferred_from / transferred_to without entitlement or expiry data, so it
    // cannot be applied safely from the payload. The receiving user's next event, a restore in the app, or
    // the later REST reconciliation brings the row up to date.
    if (type === "TRANSFER") return ignored("transfer_not_applied");
    if (!ACCESS_EVENTS.has(type)) return ignored("event_type_not_used");
    if (!grantsPremium(event)) return ignored("not_premium_entitlement");
    const environment = event.environment === "SANDBOX" || event.environment === "PRODUCTION" ? event.environment : null;
    if (deps.ignoreSandbox && environment === "SANDBOX") return ignored("sandbox_ignored");
    const user = resolveUserId(event);
    if (!("userId" in user)) return ignored(user.reason);

    let eventAt: number | null;
    let mapped: ReturnType<typeof mapEvent>;
    try {
      eventAt = optionalMs(event.event_timestamp_ms, "event_timestamp_ms");
      if (eventAt === null) throw new PayloadError("event_timestamp_ms");
      mapped = mapEvent(type, event);
    } catch {
      return json({ error: "invalid_payload" }, 400);
    }
    const productId = typeof event.product_id === "string" && event.product_id.length <= MAX_PRODUCT_ID ? event.product_id : null;

    let result: RpcResult;
    try {
      result = await deps.rpc(APPLY_RPC, {
        p_event_id: eventId,
        p_event_type: type,
        p_user: user.userId,
        p_event_at: toIso(eventAt),
        p_status: mapped.status,
        p_entitlement: PREMIUM_ENTITLEMENT,
        p_period_end: toIso(mapped.periodEnd),
        p_product_id: productId,
        p_environment: environment
      });
    } catch {
      log("apply_failed");
      return json({ error: "apply_failed" }, 500);
    }
    if (result.error) {
      // 22023 = the database refused the values themselves; a retry would fail the same way.
      if (result.error.code === "22023") return json({ error: "invalid_payload" }, 400);
      log("apply_failed");
      return json({ error: "apply_failed" }, 500);
    }
    const outcome = isObject(result.data) && typeof result.data.status === "string" ? result.data.status : null;
    if (outcome === "applied" || outcome === "duplicate") {
      return json({ schemaVersion: REVENUECAT_WEBHOOK_SCHEMA, status: outcome });
    }
    if (outcome === "stale") return ignored("stale_event");
    if (outcome === "unknown_user") return ignored("unknown_user");
    log("apply_unexpected_result");
    return json({ error: "apply_failed" }, 500);
  };
}
