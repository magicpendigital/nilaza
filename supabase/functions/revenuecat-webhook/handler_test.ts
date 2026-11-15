import { APPLY_RPC, createRevenueCatWebhookHandler, MAX_BODY_BYTES, type WebhookDeps } from "./handler.ts";

function assert(value: unknown, message = "assertion failed"): asserts value { if (!value) throw new Error(message); }
const SECRET = "rc-webhook-test-secret-0123456789abcdef";
const USER = "a829c21f-1f03-41bf-991a-d49684c2e495";
const OTHER = "0b7f2a4e-5c1d-4e8f-9a3b-6c2d1e0f9a8b";
const EVENT_AT = Date.parse("2026-11-15T10:00:00Z");
const EXPIRES = Date.parse("2026-12-15T10:00:00Z");

type Call = { name: string; args: Record<string, unknown> };
function fixture(over: Partial<{ secret: string | null; outcome: unknown; rpcError: { code?: string; message?: string }; rpcThrows: boolean; ignoreSandbox: boolean; depsThrow: boolean }> = {}) {
  const calls: Call[] = []; const logs: string[] = [];
  const deps: WebhookDeps = {
    secret: "secret" in over ? over.secret! : SECRET,
    ignoreSandbox: over.ignoreSandbox,
    rpc: (name, args) => {
      calls.push({ name, args });
      if (over.rpcThrows) return Promise.reject(new Error(`connection reset ${SECRET}`));
      if (over.rpcError) return Promise.resolve({ data: null, error: over.rpcError });
      return Promise.resolve({ data: "outcome" in over ? over.outcome : { status: "applied" } });
    },
    logError: (code) => logs.push(code)
  };
  const handler = createRevenueCatWebhookHandler(() => { if (over.depsThrow) throw new Error("env"); return deps; });
  return { handler, calls, logs };
}

const baseEvent = (extra: Record<string, unknown> = {}) => ({
  id: "evt-0001", type: "INITIAL_PURCHASE", app_user_id: USER, original_app_user_id: USER, aliases: [USER],
  product_id: "nilaza_premium_monthly:monthly", entitlement_ids: ["premium"], period_type: "NORMAL",
  event_timestamp_ms: EVENT_AT, expiration_at_ms: EXPIRES, environment: "PRODUCTION", store: "PLAY_STORE", ...extra
});
const post = (body: unknown, auth: string | null = SECRET, extraHeaders: Record<string, string> = {}) => {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extraHeaders };
  if (auth !== null) headers.Authorization = auth;
  return new Request("https://example.test/functions/v1/revenuecat-webhook", {
    method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body)
  });
};
const send = async (f: ReturnType<typeof fixture>, event: unknown, auth: string | null = SECRET) => {
  const res = await f.handler(post({ api_version: "1.0", event }, auth));
  const text = await res.text();
  return { res, text, body: text ? JSON.parse(text) : null };
};

Deno.test("only POST is accepted and every answer is no-store", async () => {
  for (const method of ["GET", "PUT", "OPTIONS", "DELETE"]) {
    const f = fixture();
    const res = await f.handler(new Request("https://example.test/", { method }));
    assert(res.status === 405 && f.calls.length === 0, method);
    assert(res.headers.get("Cache-Control") === "no-store");
    assert(res.headers.get("Access-Control-Allow-Origin") === null, "no CORS for a server-to-server webhook");
  }
});

Deno.test("missing, wrong or near-miss secrets answer 401 without touching the database", async () => {
  for (const auth of [null, "", "wrong", `Bearer ${SECRET}`, SECRET.slice(0, -1), `${SECRET}x`, SECRET.toUpperCase()]) {
    // (Surrounding whitespace is trimmed by the Fetch Headers class itself, so it is not a near miss.)
    const f = fixture();
    const { res, text } = await send(f, baseEvent(), auth);
    assert(res.status === 401 && f.calls.length === 0, `auth=${auth}`);
    assert(!text.includes(SECRET), "secret must never be echoed");
  }
});

Deno.test("a missing or short configured secret fails closed with 503", async () => {
  for (const secret of [null, "", "short-secret"]) {
    const f = fixture({ secret });
    const { res, body } = await send(f, baseEvent(), secret ?? "");
    assert(res.status === 503 && body.error === "not_configured" && f.calls.length === 0, String(secret));
    assert(f.logs.includes("webhook_secret_missing"));
  }
  const broken = fixture({ depsThrow: true });
  assert((await send(broken, baseEvent())).res.status === 503);
});

Deno.test("malformed payloads answer 400 and oversize bodies 413", async () => {
  const bad: unknown[] = ["not json", "[]", "null", { event: null }, { event: [] }, { nothing: true }];
  for (const body of bad) {
    const f = fixture(); const res = await f.handler(post(body));
    assert(res.status === 400 && (await res.json()).error === "invalid_payload" && f.calls.length === 0, JSON.stringify(body));
  }
  for (const event of [baseEvent({ id: "" }), baseEvent({ id: 5 }), baseEvent({ id: "x".repeat(201) }), baseEvent({ type: "initial purchase" }), baseEvent({ type: undefined })]) {
    const f = fixture(); const { res } = await send(f, event);
    assert(res.status === 400 && f.calls.length === 0, JSON.stringify(event));
  }
  for (const event of [baseEvent({ event_timestamp_ms: undefined }), baseEvent({ event_timestamp_ms: "2026" }), baseEvent({ expiration_at_ms: -1 }), baseEvent({ expiration_at_ms: Number.MAX_VALUE })]) {
    const f = fixture(); const { res } = await send(f, event);
    assert(res.status === 400 && f.calls.length === 0, JSON.stringify(event));
  }
  const big = fixture();
  const huge = JSON.stringify({ event: baseEvent({ padding: "x".repeat(MAX_BODY_BYTES) }) });
  assert((await big.handler(post(huge))).status === 413 && big.calls.length === 0);
  const lying = fixture();
  assert((await lying.handler(post({ event: baseEvent() }, SECRET, { "Content-Length": String(MAX_BODY_BYTES + 1) }))).status === 413);
});

Deno.test("TEST, TRANSFER, unused types, other entitlements and anonymous users are acknowledged without writing", async () => {
  const cases: Array<[Record<string, unknown>, string]> = [
    [baseEvent({ type: "TEST" }), "test_event"],
    [{ id: "evt-t", type: "TRANSFER", transferred_from: [OTHER], transferred_to: [USER], event_timestamp_ms: EVENT_AT }, "transfer_not_applied"],
    [baseEvent({ type: "INVOICE_ISSUANCE" }), "event_type_not_used"],
    [baseEvent({ type: "SUBSCRIBER_ALIAS" }), "event_type_not_used"],
    [baseEvent({ entitlement_ids: ["something_else"] }), "not_premium_entitlement"],
    [baseEvent({ entitlement_ids: null }), "not_premium_entitlement"],
    [baseEvent({ app_user_id: "$RCAnonymousID:abc", original_app_user_id: "$RCAnonymousID:abc", aliases: ["$RCAnonymousID:abc"] }), "anonymous_user"],
    [baseEvent({ app_user_id: "not-a-uuid", original_app_user_id: null, aliases: null }), "anonymous_user"],
    [baseEvent({ aliases: [USER, OTHER] }), "ambiguous_user"]
  ];
  for (const [event, reason] of cases) {
    const f = fixture(); const { res, body } = await send(f, event);
    assert(res.status === 200 && body.status === "ignored" && body.reason === reason && f.calls.length === 0, `${event.type} ${reason}: ${JSON.stringify(body)}`);
  }
});

Deno.test("a logged-in user aliased to an anonymous id is still found; deprecated entitlement_id works", async () => {
  const f = fixture();
  const { res } = await send(f, baseEvent({ app_user_id: "$RCAnonymousID:abc", original_app_user_id: "$RCAnonymousID:abc", aliases: ["$RCAnonymousID:abc", USER.toUpperCase()], entitlement_ids: undefined, entitlement_id: "premium" }));
  assert(res.status === 200 && f.calls.length === 1 && f.calls[0].args.p_user === USER);
});

Deno.test("each lifecycle event maps to the stored status and period end", async () => {
  const iso = (ms: number) => new Date(ms).toISOString();
  const grace = Date.parse("2026-12-18T10:00:00Z");
  const cases: Array<[Record<string, unknown>, string, string | null]> = [
    [baseEvent(), "active", iso(EXPIRES)],
    [baseEvent({ period_type: "TRIAL" }), "trialing", iso(EXPIRES)],
    [baseEvent({ type: "RENEWAL" }), "active", iso(EXPIRES)],
    [baseEvent({ type: "UNCANCELLATION" }), "active", iso(EXPIRES)],
    [baseEvent({ type: "PRODUCT_CHANGE" }), "active", iso(EXPIRES)],
    [baseEvent({ type: "SUBSCRIPTION_EXTENDED" }), "active", iso(EXPIRES)],
    [baseEvent({ type: "TEMPORARY_ENTITLEMENT_GRANT" }), "active", iso(EXPIRES)],
    [baseEvent({ type: "NON_RENEWING_PURCHASE", expiration_at_ms: null }), "active", null],
    [baseEvent({ type: "SUBSCRIPTION_PAUSED" }), "active", iso(EXPIRES)],
    [baseEvent({ type: "CANCELLATION", cancel_reason: "UNSUBSCRIBE" }), "canceled", iso(EXPIRES)],
    [baseEvent({ type: "BILLING_ISSUE", grace_period_expiration_at_ms: grace }), "past_due", iso(grace)],
    [baseEvent({ type: "BILLING_ISSUE", grace_period_expiration_at_ms: null }), "past_due", iso(EXPIRES)],
    [baseEvent({ type: "EXPIRATION", expiration_reason: "UNSUBSCRIBE" }), "expired", iso(EXPIRES)]
  ];
  for (const [event, status, periodEnd] of cases) {
    const f = fixture(); const { res, body } = await send(f, event);
    assert(res.status === 200 && body.status === "applied", `${event.type}: ${JSON.stringify(body)}`);
    assert(f.calls.length === 1 && f.calls[0].name === APPLY_RPC);
    const args = f.calls[0].args;
    assert(args.p_status === status && args.p_period_end === periodEnd, `${event.type}: ${JSON.stringify(args)}`);
    assert(args.p_entitlement === "premium" && args.p_user === USER && args.p_event_id === "evt-0001" && args.p_event_type === event.type);
    assert(args.p_event_at === iso(EVENT_AT) && args.p_environment === "PRODUCTION" && args.p_product_id === "nilaza_premium_monthly:monthly");
  }
});

Deno.test("sandbox events are applied unless the Owner turns them off", async () => {
  const on = fixture();
  const a = await send(on, baseEvent({ environment: "SANDBOX" }));
  assert(a.res.status === 200 && on.calls[0].args.p_environment === "SANDBOX");
  const off = fixture({ ignoreSandbox: true });
  const b = await send(off, baseEvent({ environment: "SANDBOX" }));
  assert(b.res.status === 200 && b.body.reason === "sandbox_ignored" && off.calls.length === 0);
  const odd = fixture();
  await send(odd, baseEvent({ environment: "STAGING" }));
  assert(odd.calls[0].args.p_environment === null);
});

Deno.test("duplicate, stale and unknown users are 200 so RevenueCat stops retrying", async () => {
  const dup = fixture({ outcome: { status: "duplicate" } });
  const d = await send(dup, baseEvent());
  assert(d.res.status === 200 && d.body.status === "duplicate");
  const stale = fixture({ outcome: { status: "stale" } });
  const s = await send(stale, baseEvent());
  assert(s.res.status === 200 && s.body.status === "ignored" && s.body.reason === "stale_event");
  const unknown = fixture({ outcome: { status: "unknown_user" } });
  const u = await send(unknown, baseEvent());
  assert(u.res.status === 200 && u.body.status === "ignored" && u.body.reason === "unknown_user");
});

Deno.test("database failures answer 500 so RevenueCat retries, without leaking details", async () => {
  for (const over of [{ rpcThrows: true }, { rpcError: { code: "57P01", message: `relation nilaza_private.x ${SECRET}` } }, { outcome: null }, { outcome: { status: "weird" } }]) {
    const f = fixture(over); const { res, body, text } = await send(f, baseEvent());
    assert(res.status === 500 && body.error === "apply_failed", JSON.stringify(over));
    assert(!text.includes("nilaza_private") && !text.includes(SECRET) && !text.includes(USER));
    assert(f.logs.length === 1 && !f.logs.join().includes(SECRET));
  }
  const refused = fixture({ rpcError: { code: "22023", message: "invalid_request" } });
  const r = await send(refused, baseEvent());
  assert(r.res.status === 400 && r.body.error === "invalid_payload");
});

Deno.test("an overlong product id is dropped rather than refused", async () => {
  const f = fixture();
  await send(f, baseEvent({ product_id: "p".repeat(201) }));
  assert(f.calls[0].args.p_product_id === null);
});
