import { createCreditsHandler, MAX_LEDGER_ROWS } from "./handler.ts";
function equal(a: unknown, b: unknown) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`mismatch ${JSON.stringify(a)}`); }
const userId = "11111111-1111-4111-8111-111111111111";
function fixture(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const deps = {
    configured: true,
    authenticate: async (_token: string) => { calls.push("auth"); return { id: userId, isAnonymous: false }; },
    readLedger: async (id: string) => { calls.push(id); return { rows: [{ delta: 5 }, { delta: -2 }], count: 2, failed: false }; },
    ...overrides
  };
  return { calls, handle: createCreditsHandler(deps) };
}
const request = (method = "GET", suffix = "", auth: string | null = "Bearer synthetic-test") => new Request(`https://fixture.invalid/functions/v1/user-credits${suffix}`, {
  method, headers: auth ? { Authorization: auth } : {}, ...(method === "POST" ? { body: "{invalid JSON ignored}" } : {})
});
Deno.test("delta schema sums a complete own-user ledger, including negative entries", async () => {
  const f = fixture(), r = await f.handle(request()); equal(r.status, 200); equal(await r.json(), { credits: 3 }); equal(f.calls, ["auth", userId]);
});
Deno.test("empty complete ledger is zero; no amount field or invented grant", async () => {
  const f = fixture({ readLedger: async () => ({ rows: [], count: 0, failed: false }) }); equal(await (await f.handle(request())).json(), { credits: 0 });
});
Deno.test("missing config/auth and unsupported method never read ledger", async () => {
  const f = fixture({ configured: false }); equal((await f.handle(request())).status, 503); equal(f.calls, []);
  const g = fixture(); for (const auth of [null, "Bearer", "Basic fake", "Bearer one two"]) equal((await g.handle(request("GET", "", auth))).status, 401);
  equal((await g.handle(request("DELETE"))).status, 405); equal(g.calls, []);
});
Deno.test("anonymous, unknown auth class, malformed owner and invalid token fail closed", async () => {
  for (const user of [null, { id: userId, isAnonymous: true }, { id: userId }, { id: "bad", isAnonymous: false }]) {
    const f = fixture({ authenticate: async () => user }); equal((await f.handle(request())).status, 401); equal(f.calls, []);
  }
});
Deno.test("both root-mapped and legacy debit paths deny without ledger/body access", async () => {
  const f = fixture(); for (const path of ["", "/deduct"]) { const r = await f.handle(request("POST", path)); equal(r.status, 503); equal(await r.json(), { error: "credit_reservation_unavailable", success: false }); }
  equal(f.calls, ["auth", "auth"]);
});
Deno.test("incomplete/truncated/null-count ledger is unavailable, never a false balance", async () => {
  for (const result of [{ rows: [{ delta: 2 }], count: 2 }, { rows: [], count: null }, { rows: [], count: MAX_LEDGER_ROWS + 1 }, { rows: null, count: 0 }]) {
    const f = fixture({ readLedger: async () => ({ ...result, failed: false }) }); equal((await f.handle(request())).status, 503);
  }
});
Deno.test("malformed/noninteger/overflow/negative totals are rejected", async () => {
  for (const rows of [[{ amount: 10 }], [{ delta: "2" }], [{ delta: 0.5 }], [null], [{ delta: Number.MAX_SAFE_INTEGER }, { delta: 1 }], [{ delta: -1 }]]) {
    const f = fixture({ readLedger: async () => ({ rows, count: rows.length, failed: false }) }); equal((await f.handle(request())).status, 503);
  }
});
Deno.test("auth/database exceptions do not expose raw error, token or ledger", async () => {
  const f = fixture({ readLedger: async () => { throw new Error("private SQL and token secret"); } }); equal(await (await f.handle(request())).json(), { error: "credits_unavailable" });
  const g = fixture({ authenticate: async () => { throw new Error("private auth secret"); } }); equal(await (await g.handle(request())).json(), { error: "authentication_required" });
});
Deno.test("preflight and unknown routes perform no authentication/read", async () => {
  const f = fixture(); equal((await f.handle(request("OPTIONS"))).status, 200); equal((await f.handle(request("GET", "/deduct"))).status, 404); equal(f.calls, []);
});
