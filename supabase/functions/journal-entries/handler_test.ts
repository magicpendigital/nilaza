import { createJournalHandler, type JournalInput, type JournalStore } from "./handler.ts";
const ownerA = "00000000-0000-4000-8000-000000000001", ownerB = "00000000-0000-4000-8000-000000000002";
const remoteId = "00000000-0000-4000-8000-000000000003";
function assert(value: unknown, message = "Assertion failed"): asserts value { if (!value) throw new Error(message); }
const request = (body: unknown, token = "qa") => new Request("https://example.test/journal", {
  method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body)
});
const entry = { localId: "qa-note", title: "Fictional QA note", summary: "Not customer data", sourceType: "manual" };
function fixture() {
  const rows = new Map<string, { id: string; deletedAt?: string | null; input?: JournalInput }>();
  const calls: Array<{ owner: string; operation: string; localId: string }> = [];
  const store: JournalStore = {
    authenticate: async (token) => token === "qa" ? ownerA : token === "qa-b" ? ownerB : null,
    upsert: async (owner, input) => {
      calls.push({ owner, operation: "upsert", localId: input.localId });
      const key = `${owner}:${input.localId}`, previous = rows.get(key);
      const row = { ...previous, id: remoteId, input }; rows.set(key, row); return row;
    },
    remove: async (owner, localId) => {
      calls.push({ owner, operation: "delete", localId });
      rows.set(`${owner}:${localId}`, { id: remoteId, deletedAt: "2026-10-01T00:00:00Z" });
    }
  };
  return { rows, calls, store, handle: createJournalHandler(() => store, () => "2026-10-01T00:00:00Z") };
}

Deno.test("no auth/configuration can fabricate synced", async () => {
  const missing = await createJournalHandler(() => null)(request(entry));
  assert(missing.status === 503 && !(await missing.text()).includes("synced"));
  const noAuth = await fixture().handle(new Request("https://example.test", { method: "POST", body: "{}" }));
  assert(noAuth.status === 401);
});
Deno.test("invalid auth cannot reach Journal writes", async () => {
  const f = fixture(), result = await f.handle(request(entry, "invalid"));
  assert(result.status === 401 && f.calls.length === 0);
});
Deno.test("legacy upsert stays compatible and ACK binds verified owner/local id", async () => {
  const f = fixture(), result = await f.handle(request({ ...entry, user_id: ownerB, sourceId: "client-symbolic-id" }));
  const ack = await result.json();
  assert(result.status === 200 && ack.operation === "upsert" && ack.localId === entry.localId && ack.remoteId === remoteId);
  assert(f.calls[0].owner === ownerA && f.rows.get(`${ownerA}:${entry.localId}`)?.input?.sourceId === undefined);
  assert(!f.rows.has(`${ownerB}:${entry.localId}`));
});
Deno.test("delete ignores spoofed owner and cannot target another account", async () => {
  const f = fixture(); await f.handle(request(entry, "qa-b"));
  const result = await f.handle(request({ operation: "delete", localId: entry.localId, userId: ownerB }));
  const ack = await result.json();
  assert(result.status === 200 && ack.operation === "delete" && ack.localId === entry.localId);
  assert(f.rows.get(`${ownerA}:${entry.localId}`)?.deletedAt);
  assert(f.rows.get(`${ownerB}:${entry.localId}`)?.input?.summary === entry.summary);
});
Deno.test("delete before save is acknowledged but later tombstoned upsert is rejected", async () => {
  const f = fixture(); await f.handle(request({ operation: "delete", localId: entry.localId }));
  const result = await f.handle(request({ ...entry, operation: "upsert" }));
  assert(result.status === 409 && !(await result.text()).includes("synced"));
});
Deno.test("repeated deletes remain idempotent and clear content in store contract", async () => {
  const f = fixture(); await f.handle(request(entry));
  for (let i = 0; i < 2; i++) assert((await f.handle(request({ operation: "delete", localId: entry.localId }))).status === 200);
  assert(f.rows.size === 1 && !f.rows.get(`${ownerA}:${entry.localId}`)?.input);
});
Deno.test("failed store never leaks database/private errors or synced", async () => {
  const f = fixture(); f.store.remove = () => Promise.reject(new Error("private fixture secret"));
  const result = await f.handle(request({ operation: "delete", localId: "qa" })), text = await result.text();
  assert(result.status === 500 && !text.includes("private fixture secret") && !text.includes("synced"));
});
Deno.test("invalid remote ACK cannot be reported as synced", async () => {
  const f = fixture(); f.store.upsert = async () => ({ id: "journal-fake" });
  assert((await f.handle(request(entry))).status === 502);
});
Deno.test("invalid operation/field types/date/snapshot are rejected before writes", async () => {
  const f = fixture();
  for (const bad of [null, [], { ...entry, localId: 4 }, { ...entry, operation: "purge" },
    { ...entry, title: " " }, { ...entry, summary: 5 }, { ...entry, sourceType: "unknown" },
    { ...entry, createdAt: "not-a-date" }, { ...entry, userNote: [] }, { ...entry, sourceSnapshot: [] },
    { ...entry, sourceSnapshot: { excessive: "x".repeat(66000) } }]) {
    assert((await f.handle(request(bad))).status === 400);
  }
  const malformed = new Request("https://example.test", { method: "POST", headers: { Authorization: "Bearer qa" }, body: "{" });
  assert((await f.handle(malformed)).status === 400 && f.calls.length === 0);
});
Deno.test("oversized stream is bounded; unsupported methods and preflight are explicit", async () => {
  const f = fixture(); assert((await f.handle(request({ excessive: "x".repeat(140000) }))).status === 413);
  assert((await f.handle(new Request("https://example.test"))).status === 405);
  assert((await f.handle(new Request("https://example.test", { method: "OPTIONS" }))).headers.get("Access-Control-Allow-Methods") === "POST, OPTIONS");
  assert(f.calls.length === 0);
});
