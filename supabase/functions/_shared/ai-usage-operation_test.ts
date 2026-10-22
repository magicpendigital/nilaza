import { createUsageStore, UsageError, type Reservation, type UsageSpec, type UsageStore } from "./ai-usage-store.ts";
import { runMeteredOperation, type MeteredDependencies } from "./ai-usage-operation.ts";
function assert(value: unknown, message = "assertion failed"): asserts value { if (!value) throw new Error(message); }
async function rejects(run: () => Promise<unknown>, code: string) {
  try { await run(); } catch (e) { assert(e instanceof UsageError && e.code === code, "expected " + code); return; }
  throw new Error("unexpected success");
}
const user = "a829c21f-1f03-41bf-991a-d49684c2e495";
const resultId = "de62d681-f9fb-45de-b07a-2641e078f36d";
function fixture(reservation: Reservation = { status: "created" }) {
  const s: UsageSpec = { id: crypto.randomUUID(), userId: user, feature: "persona_chat", audience: "pilot",
    requestDigest: "a".repeat(64), attemptBounds: [1000, 2000], campaign: "qa-g1", policyVersion: "g1-2026-10-02" };
  const events: string[] = [], receipts: [number, number | null, boolean][] = [], finishes: boolean[] = [];
  let generations = 0, persistedOperation: string | undefined;
  const store: UsageStore = {
    reserve: () => { events.push("reserve"); return Promise.resolve(reservation); },
    claim: (_id, _lease, n) => { events.push("claim" + n); return Promise.resolve(); },
    receipt: (_id, _lease, n, cost, success) => { events.push("receipt" + n); receipts.push([n, cost, success]); return Promise.resolve(); },
    finish: (_id, _lease, saved) => { events.push("finish"); finishes.push(saved); return Promise.resolve(saved ? "completed" : "failed"); },
  };
  const deps: MeteredDependencies<string> = {
    store,
    generate: () => { events.push("generate"); generations++; return Promise.resolve({ value: "Một bước nhỏ", costMicro: 200 }); },
    persist: (_value, id) => { events.push("persist"); persistedOperation = id; return Promise.resolve(resultId); },
    findSavedResult: () => Promise.resolve(null),
    loadOwnedResult: () => { events.push("load"); return Promise.resolve("Đã lưu"); },
  };
  return { s, deps, store, events, receipts, finishes, count: () => generations, persistedOperation: () => persistedOperation };
}
Deno.test("fresh operation claims before provider and settles only after durable save", async () => {
  const f = fixture(); const r = await runMeteredOperation(f.s, f.deps);
  assert(f.events.join(",") === "reserve,claim1,generate,receipt1,persist,finish");
  assert(!r.replay && r.resultId === resultId && f.finishes[0] === true && f.persistedOperation() === f.s.id);
});
Deno.test("quota/budget/inactive denial, busy and failed cause zero provider calls", async () => {
  for (const reservation of [
    { status: "blocked", code: "daily_quota_exhausted" }, { status: "blocked", code: "qa_budget_exhausted" },
    { status: "blocked", code: "campaign_inactive" }, { status: "busy" }, { status: "failed" },
  ] as Reservation[]) {
    const f = fixture(reservation);
    await rejects(() => runMeteredOperation(f.s, f.deps), reservation.status === "blocked" ? reservation.code : "request_" + reservation.status);
    assert(f.count() === 0 && f.events.join() === "reserve");
  }
});
Deno.test("owned saved-result replay returns unchanged without provider/persist/settle", async () => {
  const f = fixture({ status: "replay", resultId }); const r = await runMeteredOperation(f.s, f.deps);
  assert(r.value === "Đã lưu" && r.replay && f.count() === 0 && f.events.join() === "reserve,load");
});
Deno.test("unavailable reserve and ambiguous claim retain hold with zero provider calls", async () => {
  for (const method of ["reserve", "claim"] as const) {
    const f = fixture();
    if (method === "reserve") f.store.reserve = () => Promise.reject(new UsageError("usage_unavailable"));
    else f.store.claim = () => Promise.reject(new UsageError("usage_unavailable"));
    await rejects(() => runMeteredOperation(f.s, f.deps), "usage_unavailable");assert(f.count() === 0 && !f.finishes.length);
  }
});
Deno.test("provider exception records unknown cost before single fallback", async () => {
  const f = fixture(); let n = 0;
  f.deps.generate = () => ++n === 1 ? Promise.reject(new Error("private provider body")) : Promise.resolve({ value: "fallback", costMicro: 300 });
  await runMeteredOperation(f.s, f.deps);
  assert(n === 2 && JSON.stringify(f.receipts) === "[[1,null,false],[2,300,true]]");
  assert(f.events.indexOf("receipt1") < f.events.indexOf("claim2"));
});
Deno.test("all attempts fail: user quota released, unknown costs never zeroed", async () => {
  const f = fixture(); let n = 0; f.deps.generate = () => { n++; return Promise.reject(new Error()); };
  await rejects(() => runMeteredOperation(f.s, f.deps), "provider_unavailable");
  assert(n === 2 && f.receipts.every(r => r[1] === null && !r[2]) && f.finishes[0] === false);
});
Deno.test("receipt ACK failure stops all fallback and persistence", async () => {
  const f = fixture(); f.store.receipt = () => Promise.reject(new UsageError("usage_unavailable"));
  await rejects(() => runMeteredOperation(f.s, f.deps), "usage_unavailable");assert(f.count() === 1 && !f.finishes.length && !f.events.includes("persist"));
});
Deno.test("authoritative save failure returns quota; ambiguous save lookup keeps hold", async () => {
  for (const ambiguous of [false, true]) {
    const f = fixture(); f.deps.persist = () => Promise.reject(new Error("lost ACK"));
    if (ambiguous) f.deps.findSavedResult = () => Promise.reject(new UsageError("usage_unavailable"));
    await rejects(() => runMeteredOperation(f.s, f.deps), ambiguous ? "usage_unavailable" : "result_not_saved");
    assert(ambiguous ? f.finishes.length === 0 : f.finishes[0] === false);
  }
});
Deno.test("lost save ACK recovered by operation id consumes one successful turn", async () => {
  const f = fixture(); f.deps.persist = () => Promise.reject(new Error());
  f.deps.findSavedResult = id => { assert(id === f.s.id); return Promise.resolve({ resultId, value: "durable original" }); };
  const r = await runMeteredOperation(f.s, f.deps); assert(r.value === "durable original" && f.finishes[0] === true);
});
Deno.test("finalization failure never reports success or retries provider", async () => {
  const f = fixture(); f.store.finish = () => Promise.reject(new UsageError("usage_unavailable"));
  await rejects(() => runMeteredOperation(f.s, f.deps), "usage_unavailable");assert(f.count() === 1 && f.events.includes("persist"));
});
Deno.test("invalid receipt retains unknown; real excess reported without fallback", async () => {
  for (const cost of [NaN, -1, 1500]) {
    const f = fixture(); f.deps.generate = () => Promise.resolve({ value: "x", costMicro: cost });
    await rejects(() => runMeteredOperation(f.s, f.deps), cost === 1500 ? "cost_bound_exceeded" : "invalid_receipt");
    assert(f.receipts[0][1] === (cost === 1500 ? 1500 : null) && !f.events.includes("persist") && f.finishes[0] === false);
  }
});
Deno.test("trusted spec snapshot resists mutation during asynchronous reserve", async () => {
  const f = fixture(); f.store.reserve = () => { f.s.attemptBounds = [0]; f.s.id = crypto.randomUUID(); return Promise.resolve({ status: "created" }); };
  const original = f.s.id; await runMeteredOperation(f.s, f.deps);assert(f.persistedOperation() === original);
});
Deno.test("invalid bounds/card shape denied before reservation", async () => {
  for (const patch of [{ attemptBounds: [] }, { attemptBounds: [100001] }, { attemptBounds: [1.5] },
    { feature: "tarot_reading", tarotCardCount: 3 }, { requestDigest: "client plain text" }]) {
    const f = fixture(); Object.assign(f.s, patch); await rejects(() => runMeteredOperation(f.s, f.deps), "invalid_spec");assert(!f.events.length);
  }
});
Deno.test("RPC adapter sanitizes errors and rejects malformed success responses", async () => {
  for (const response of [{ data: null, error: new Error("secret") }, { data: { status: "replay", resultId: "wrong" }, error: null },
    { data: { status: "invented" }, error: null }, { data: { ok: "true" }, error: null }]) {
    const f = fixture(); const adapter = createUsageStore({ rpc: () => Promise.resolve(response) });
    await rejects(() => adapter.reserve(f.s, crypto.randomUUID()), "usage_unavailable");
  }
});
Deno.test("RPC adapter maps trusted input and requires strict receipt/settlement ACK", async () => {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const adapter = createUsageStore({ rpc: (name, args) => { calls.push({ name, args }); return Promise.resolve({ error: null,
    data: name.endsWith("reserve") ? { status: "created" } : name.endsWith("finish") ? { ok: true, status: "completed_pending_cost" } : { ok: true } }); } });
  const f = fixture(); f.deps.store = adapter; await runMeteredOperation(f.s, f.deps);
  assert(calls.length === 4 && calls[0].args.p_user_id === user && calls[0].args.p_digest === f.s.requestDigest);
  assert(typeof calls[0].args.p_lease === "string" && calls[3].args.p_result_id === resultId);
  const bad = createUsageStore({ rpc: () => Promise.resolve({ data: { ok: true, status: "failed" }, error: null }) });
  await rejects(() => bad.finish(f.s.id, crypto.randomUUID(), true, resultId), "usage_unavailable");
});
