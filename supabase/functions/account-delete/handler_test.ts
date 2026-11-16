import { createAccountDeleteHandler, DELETE_CONFIRMATION, type DeletionDeps } from "./handler.ts";
import { normalizeEmail, sha256 } from "../marketing-waitlist/helpers.ts";

function assert(value: unknown, message = "assertion failed"): asserts value { if (!value) throw new Error(message); }
const USER = "a829c21f-1f03-41bf-991a-d49684c2e495";

type Rpc = { name: string; args: Record<string, unknown> };
function fixture(over: Partial<{
  begin: unknown; beginError: boolean; purgeError: string | boolean; purgeThrows: boolean; finishThrows: boolean;
  deleteError: { status?: number } | null; deleteThrows: boolean; email: string | null; emailThrows: boolean;
  anonymous: boolean; unauthenticated: boolean;
  // Billing lot 3: undefined = billing not configured (no dep); otherwise the dep's outcome.
  billing: "gone" | "failed" | "throws";
}> = {}) {
  const calls: string[] = []; const rpcs: Rpc[] = []; let deleted = 0; const billingUsers: string[] = [];
  const deps: DeletionDeps = {
    ...(over.billing ? {
      deleteBillingCustomer: (userId: string) => {
        calls.push("deleteBillingCustomer"); billingUsers.push(userId);
        if (over.billing === "throws") return Promise.reject(new Error("rc down sk_secret_value"));
        return Promise.resolve(over.billing === "gone");
      }
    } : {}),
    authenticate: () => Promise.resolve(over.unauthenticated ? null : { id: USER, isAnonymous: over.anonymous ?? false }),
    rpc: (name, args) => {
      calls.push(name); rpcs.push({ name, args });
      if (name === "nilaza_account_delete_begin") {
        return Promise.resolve(over.beginError ? { data: null, error: { message: "relation nilaza_private.x exploded" } } : { data: "begin" in over ? over.begin : { status: "requested" } });
      }
      if (name === "nilaza_account_delete_purge") {
        if (over.purgeThrows) return Promise.reject(new Error("socket reset with secret-token"));
        if (over.purgeError) return Promise.resolve({ data: null, error: { message: typeof over.purgeError === "string" ? over.purgeError : "secret provider text" } });
        return Promise.resolve({ data: { generation_jobs: 1, usage_events: 2, safety_events: 0, marketing_waitlist: 0 } });
      }
      if (over.finishThrows) return Promise.reject(new Error("finish down"));
      return Promise.resolve({ data: "completed" });
    },
    getEmail: () => {
      calls.push("getEmail");
      if (over.emailThrows) return Promise.reject(new Error("lookup"));
      return Promise.resolve(over.email === undefined ? "Person@Example.com " : over.email);
    },
    deleteUser: () => {
      calls.push("deleteUser");
      if (over.deleteThrows) return Promise.reject(new Error("boom"));
      deleted++;
      return Promise.resolve({ error: over.deleteError ?? null });
    },
  };
  const handler = createAccountDeleteHandler(() => deps);
  return { handler, calls, rpcs, billingUsers, deleted: () => deleted };
}
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://example.test/functions/v1/account-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer token-abc", ...headers },
    body: JSON.stringify(body),
  });
const ok = { confirm: DELETE_CONFIRMATION };

Deno.test("method and CORS preflight", async () => {
  const f = fixture();
  const options = await f.handler(new Request("https://example.test/", { method: "OPTIONS" }));
  assert(options.status === 200 && options.headers.get("Access-Control-Allow-Methods") === "POST, OPTIONS");
  const get = await f.handler(new Request("https://example.test/", { method: "GET" }));
  assert(get.status === 405 && f.calls.length === 0);
});

Deno.test("unconfigured service, missing token, invalid token and anonymous users do nothing", async () => {
  const unconfigured = createAccountDeleteHandler(() => null);
  const r0 = await unconfigured(post(ok));
  assert(r0.status === 503);
  const f = fixture();
  assert((await f.handler(post(ok, { Authorization: "" }))).status === 401);
  const bad = fixture({ unauthenticated: true });
  assert((await bad.handler(post(ok))).status === 401 && bad.calls.length === 0);
  const anon = fixture({ anonymous: true });
  assert((await anon.handler(post(ok))).status === 401 && anon.calls.length === 0);
});

Deno.test("explicit confirmation is required and extra fields are rejected before any work", async () => {
  for (const body of [{}, { confirm: "yes" }, { confirm: true }, { confirm: DELETE_CONFIRMATION, userId: "someone-else" }, { userId: "x", confirm: DELETE_CONFIRMATION }]) {
    const f = fixture(); const r = await f.handler(post(body));
    assert(r.status === 400 && (await r.json()).error === "confirmation_required" && f.calls.length === 0, JSON.stringify(body));
  }
});

Deno.test("happy path: begin, email lookup, purge, auth delete, finish in that order", async () => {
  const f = fixture(); const r = await f.handler(post(ok)); const body = await r.json();
  assert(r.status === 200 && body.status === "completed" && body.schemaVersion === "nilaza.account-delete.v1");
  assert(f.calls.join(",") === "nilaza_account_delete_begin,getEmail,nilaza_account_delete_purge,deleteUser,nilaza_account_delete_finish");
  const purge = f.rpcs.find(c => c.name === "nilaza_account_delete_purge")!.args;
  assert(purge.p_user === USER);
  assert(purge.p_email_hash === await sha256(normalizeEmail("Person@Example.com ")!), "email hash must match the waitlist hashing");
  assert(purge.p_subject_hash === await sha256("nilaza-account-delete-v1:" + USER));
  assert(!JSON.stringify(f.rpcs).includes("example.com"), "no plain email may be sent to the database functions");
  assert(f.rpcs.at(-1)!.args.p_ok === true);
});

Deno.test("the user id always comes from the verified token, never from the body", async () => {
  const f = fixture(); await f.handler(post(ok));
  for (const c of f.rpcs) if ("p_user" in c.args) assert(c.args.p_user === USER);
});

Deno.test("account without an email skips the waitlist purge", async () => {
  const f = fixture({ email: null }); const r = await f.handler(post(ok));
  assert(r.status === 200);
  assert(f.rpcs.find(c => c.name === "nilaza_account_delete_purge")!.args.p_email_hash === null);
});

Deno.test("staff accounts are refused without purging or deleting", async () => {
  const f = fixture({ begin: { status: "staff_blocked" } }); const r = await f.handler(post(ok));
  assert(r.status === 403 && (await r.json()).error === "staff_account_requires_owner_review");
  assert(f.calls.join(",") === "nilaza_account_delete_begin" && f.deleted() === 0);
});

Deno.test("an already completed request is idempotent and a vanished account is not found", async () => {
  const done = fixture({ begin: { status: "completed" } }); const r = await done.handler(post(ok));
  assert(r.status === 200 && (await r.json()).status === "completed" && done.calls.length === 1);
  const gone = fixture({ begin: { status: "not_found" } });
  assert((await gone.handler(post(ok))).status === 404 && gone.deleted() === 0);
  const odd = fixture({ begin: { status: "mystery" } });
  assert((await odd.handler(post(ok))).status === 502 && odd.deleted() === 0);
  const empty = fixture({ begin: null });
  assert((await empty.handler(post(ok))).status === 502 && empty.deleted() === 0);
});

Deno.test("database errors never leak and stop before the account is touched", async () => {
  const begin = fixture({ beginError: true }); const r = await begin.handler(post(ok)); const text = await r.text();
  assert(r.status === 503 && !text.includes("exploded") && !text.includes("nilaza_private") && begin.deleted() === 0);
  const emailDown = fixture({ emailThrows: true });
  assert((await emailDown.handler(post(ok))).status === 503 && !emailDown.calls.includes("nilaza_account_delete_purge") && emailDown.deleted() === 0);
});

Deno.test("purge failure is retryable, records a coarse code and does not delete the account", async () => {
  for (const f of [fixture({ purgeError: true }), fixture({ purgeThrows: true })]) {
    const r = await f.handler(post(ok)); const text = await r.text();
    assert(r.status === 502 && JSON.parse(text).retry === true && !text.includes("secret") && f.deleted() === 0);
    const finish = f.rpcs.at(-1)!;
    assert(finish.name === "nilaza_account_delete_finish" && finish.args.p_ok === false && finish.args.p_error_code === "purge_failed");
  }
  const staff = fixture({ purgeError: "staff_blocked" }); await staff.handler(post(ok));
  assert(staff.rpcs.at(-1)!.args.p_error_code === "staff_blocked" && staff.deleted() === 0);
});

Deno.test("auth delete failure is reported as incomplete, never as success", async () => {
  for (const f of [fixture({ deleteError: { status: 500 } }), fixture({ deleteThrows: true })]) {
    const r = await f.handler(post(ok)); const body = await r.json();
    assert(r.status === 502 && body.error === "deletion_incomplete" && body.retry === true && body.status === undefined);
    const finish = f.rpcs.at(-1)!;
    assert(finish.args.p_ok === false && finish.args.p_error_code === "auth_delete_failed");
  }
});

Deno.test("auth delete returning not found counts as done, and finish failure does not hide a real deletion", async () => {
  const gone = fixture({ deleteError: { status: 404 } }); const r = await gone.handler(post(ok));
  assert(r.status === 200 && gone.rpcs.at(-1)!.args.p_ok === true);
  const finishDown = fixture({ finishThrows: true }); const r2 = await finishDown.handler(post(ok));
  assert(r2.status === 200 && finishDown.deleted() === 1);
});

Deno.test("billing configured: the customer is removed after the purge and before the auth delete", async () => {
  const f = fixture({ billing: "gone" }); const r = await f.handler(post(ok));
  assert(r.status === 200 && (await r.json()).status === "completed");
  assert(f.calls.join(",") === "nilaza_account_delete_begin,getEmail,nilaza_account_delete_purge,deleteBillingCustomer,deleteUser,nilaza_account_delete_finish", f.calls.join(","));
  assert(f.billingUsers.length === 1 && f.billingUsers[0] === USER, "billing delete uses the verified user id only");
});

Deno.test("billing not configured: the step is skipped and deletion still completes", async () => {
  const f = fixture(); const r = await f.handler(post(ok));
  assert(r.status === 200 && !f.calls.includes("deleteBillingCustomer") && f.deleted() === 1);
});

Deno.test("billing failure is retryable, keeps the account and leaks nothing", async () => {
  for (const f of [fixture({ billing: "failed" }), fixture({ billing: "throws" })]) {
    const r = await f.handler(post(ok)); const text = await r.text(); const body = JSON.parse(text);
    assert(r.status === 502 && body.error === "deletion_incomplete" && body.retry === true && body.status === undefined);
    assert(f.deleted() === 0 && !f.calls.includes("deleteUser"), "auth user must stay so a retry can run the billing step again");
    const finish = f.rpcs.at(-1)!;
    assert(finish.name === "nilaza_account_delete_finish" && finish.args.p_ok === false && finish.args.p_error_code === "billing_delete_failed");
    assert(!text.includes("sk_") && !text.includes(USER) && !JSON.stringify(f.rpcs).includes("sk_"));
  }
});

Deno.test("billing is not touched when the purge fails or the account is staff", async () => {
  const purge = fixture({ billing: "gone", purgeError: true }); await purge.handler(post(ok));
  assert(!purge.calls.includes("deleteBillingCustomer"));
  const staff = fixture({ billing: "gone", begin: { status: "staff_blocked" } }); await staff.handler(post(ok));
  assert(!staff.calls.includes("deleteBillingCustomer"));
});

Deno.test("a second request after success is safe", async () => {
  const first = fixture(); assert((await first.handler(post(ok))).status === 200);
  const again = fixture({ begin: { status: "completed" } }); const r = await again.handler(post(ok));
  assert(r.status === 200 && again.deleted() === 0);
});
