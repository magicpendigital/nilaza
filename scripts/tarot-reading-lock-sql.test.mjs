// P1-A Tarot result lock: runs supabase/migrations/20261115100000_tarot_reading_lock.sql (twice) on PGlite over a
// minimal copy of the tarot_readings / usage_events schema and checks the unique lock key, the immutability trigger,
// RLS for anon / authenticated / service_role, soft delete counting, the draw cap and the interpretation claim.
// Runs when @electric-sql/pglite resolves or NILAZA_PGLITE_MODULE names its dist/index.js; otherwise it is skipped.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import test from "node:test";

const migration = fs.readFileSync("supabase/migrations/20261115100000_tarot_reading_lock.sql", "utf8").replaceAll("\r\n", "\n");

async function loadPglite() {
  const target = process.env.NILAZA_PGLITE_MODULE;
  try { return (await import(target ? pathToFileURL(target).href : "@electric-sql/pglite")).PGlite; } catch { return null; }
}

const baseSchema = `
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
create table public.tarot_decks(id uuid primary key default gen_random_uuid(), slug text unique);
create table public.prompt_versions(id uuid primary key default gen_random_uuid());
create table public.tarot_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid references public.tarot_decks(id),
  topic text not null,
  spread text not null check (spread in ('daily-one', 'past-present-future', 'situation-challenge-advice', 'love-three', 'crossroads-four')),
  question text,
  selected_cards jsonb not null,
  interpretation jsonb not null,
  prompt_version_id uuid references public.prompt_versions(id),
  language text not null default 'vi',
  status text not null default 'completed' check (status in ('queued', 'completed', 'failed', 'deleted')),
  created_at timestamptz not null default now()
);
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  feature text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.tarot_readings enable row level security;
alter table public.usage_events enable row level security;
create policy "users manage own tarot readings" on public.tarot_readings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users insert own usage events" on public.usage_events for insert to authenticated with check (user_id = auth.uid());
create policy "users read own usage events" on public.usage_events for select to authenticated using (user_id = auth.uid());
-- Supabase's observed public defaults grant table operations to the client roles.
grant select, insert, update, delete on public.tarot_readings, public.usage_events, public.tarot_decks to anon, authenticated, service_role;
`;

const lockKey = (n) => n.toString(16).padStart(64, "0");
const cards = JSON.stringify([{ id: "major-00-fool", positionKey: "daily", reversed: false }]);
// Rows get created_at = now(); an hour back keeps every row of this run inside "today" whatever the machine clock says.
const dayStart = new Date(Date.now() - 3_600_000).toISOString();
const nextDayStart = new Date(Date.now() + 3_600_000).toISOString();
const lockDate = "2026-11-15";

async function setup(PGlite) {
  const db = await PGlite.create();
  await db.exec(baseSchema);
  await db.exec(migration);
  await db.exec(migration); // re-run must be a no-op
  return db;
}

// Runs one statement as a role inside its own transaction; returns rows or the error.
async function as(db, role, userId, sql, params = []) {
  await db.exec("begin");
  try {
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? ""]);
    await db.exec(`set local role ${role}`);
    const result = await db.query(sql, params);
    await db.exec("commit");
    return { rows: result.rows, affected: result.affectedRows ?? 0 };
  } catch (error) {
    await db.exec("rollback");
    return { error };
  }
}

const drawClaim = (db, user, key, options = {}) => as(db, "service_role", null,
  `select public.tarot_draw_claim($1, $2, $3::date, $4::timestamptz, $5, $6, $7, 'vi', null, '{"id":"moon-garden","slug":"moon-garden"}'::jsonb, $8::jsonb, $9, $10, $11) as r`,
  [user, key, options.lockDate ?? lockDate, options.dayStart ?? dayStart, options.topic ?? "love", options.spread ?? "daily-one",
    options.question ?? "Q", cards, options.drawCap ?? 3, options.delivered ?? 1, options.attempts ?? 3]);
const interpretClaim = (db, user, readingId, token = randomUUID(), options = {}) => as(db, "service_role", null,
  `select public.tarot_interpret_claim($1, $2, $3, $4::timestamptz, $5, $6, $7) as r`,
  [user, readingId, token, options.dayStart ?? dayStart, options.delivered ?? 1, options.attempts ?? 3, options.stale ?? 180]);
const finalize = (db, readingId, token, status = "passed") => as(db, "service_role", null,
  `update public.tarot_readings set interpretation = $3::jsonb, status = 'completed', interpreted_at = now(), claim_token = null,
     claimed_at = null, prompt_version_key = 'local:tarot@1:vi', route_version = 'r1', content_version = 'sha256:x'
   where id = $1 and claim_token = $2 and interpreted_at is null and deleted_at is null`,
  [readingId, token, JSON.stringify({ summary: "S", reflection: "R", sections: [], moderationStatus: status, provenance: { sourceKind: "ai" } })]);

test("PGlite: Tarot result lock migration (unique key, trigger, RLS, soft delete, claims)", async (t) => {
  const PGlite = await loadPglite();
  if (!PGlite) { t.skip("PGlite not installed; set NILAZA_PGLITE_MODULE to @electric-sql/pglite/dist/index.js"); return; }
  const db = await setup(PGlite);
  try {
    const alice = randomUUID(), bob = randomUUID();
    await db.query("insert into auth.users(id) values ($1), ($2)", [alice, bob]);

    await t.test("migration re-run left one trigger, one unique constraint and the select-only policy", async () => {
      const triggers = await db.query("select count(*)::int n from pg_trigger where tgname = 'guard_tarot_reading_update'");
      assert.equal(triggers.rows[0].n, 1);
      const unique = await db.query("select count(*)::int n from pg_constraint where conname = 'tarot_readings_lock_key_key'");
      assert.equal(unique.rows[0].n, 1);
      const policies = await db.query("select policyname, cmd from pg_policies where tablename = 'tarot_readings' order by 1");
      assert.deepEqual(policies.rows, [{ policyname: "users read own tarot readings", cmd: "SELECT" }]);
    });

    let aliceReading;
    await t.test("same lock key returns the same row; unique key holds", async () => {
      const first = await drawClaim(db, alice, lockKey(1));
      assert.equal(first.error, undefined, String(first.error));
      assert.equal(first.rows[0].r.status, "created");
      aliceReading = first.rows[0].r.reading;
      assert.equal(aliceReading.status, "queued");
      assert.equal(aliceReading.draw_source, "server_csprng");
      assert.deepEqual(aliceReading.deck_ref, { id: "moon-garden", slug: "moon-garden" });
      assert.equal("claim_token" in aliceReading, false);
      const again = await drawClaim(db, alice, lockKey(1), { question: "Rephrased" });
      assert.equal(again.rows[0].r.status, "existing");
      assert.equal(again.rows[0].r.reading.id, aliceReading.id);
      assert.equal(again.rows[0].r.reading.question, "Q");
      const count = await db.query("select count(*)::int n from public.tarot_readings where lock_key = $1", [lockKey(1)]);
      assert.equal(count.rows[0].n, 1);
      const dup = await as(db, "service_role", null,
        "insert into public.tarot_readings(user_id, topic, spread, selected_cards, interpretation, lock_key, lock_date) values ($1, 'love', 'daily-one', '[]', '{}', $2, $3::date)",
        [alice, lockKey(1), lockDate]);
      assert.match(String(dup.error?.message), /tarot_readings_lock_key_key|duplicate/);
      const otherUser = await drawClaim(db, bob, lockKey(1));
      assert.match(String(otherUser.error?.message), /tarot_lock_key_conflict/);
    });

    await t.test("RLS: anon nothing; authenticated reads own only and cannot write; service_role writes", async () => {
      const anonRead = await as(db, "anon", null, "select id from public.tarot_readings");
      assert.ok(anonRead.error, "anon has no select privilege");
      const own = await as(db, "authenticated", alice, "select id from public.tarot_readings");
      assert.deepEqual(own.rows.map((row) => row.id), [aliceReading.id]);
      const other = await as(db, "authenticated", bob, "select id from public.tarot_readings");
      assert.deepEqual(other.rows, []);
      const insert = await as(db, "authenticated", alice,
        "insert into public.tarot_readings(user_id, topic, spread, selected_cards, interpretation) values ($1, 'love', 'daily-one', '[]', '{}')", [alice]);
      assert.match(String(insert.error?.message), /permission denied/);
      const update = await as(db, "authenticated", alice, "update public.tarot_readings set question = 'x' where id = $1", [aliceReading.id]);
      assert.match(String(update.error?.message), /permission denied/);
      const del = await as(db, "authenticated", alice, "delete from public.tarot_readings where id = $1", [aliceReading.id]);
      assert.match(String(del.error?.message), /permission denied/);
      const rpc = await as(db, "authenticated", alice,
        "select public.tarot_draw_claim($1, $2, $3::date, $4::timestamptz, 'love', 'daily-one', 'Q', 'vi', null, null, $5::jsonb, 9, 9, 9)",
        [alice, lockKey(99), lockDate, dayStart, cards]);
      assert.match(String(rpc.error?.message), /permission denied/);
      const anonRpc = await as(db, "anon", null, "select public.tarot_interpret_claim($1, $2, $3, $4::timestamptz, 1, 3, 180)",
        [alice, aliceReading.id, randomUUID(), dayStart]);
      assert.match(String(anonRpc.error?.message), /permission denied/);
    });

    await t.test("interpret claim: one live claim, attempt written atomically, stale claim taken over", async () => {
      const tokenA = randomUUID();
      const first = await interpretClaim(db, alice, aliceReading.id, tokenA);
      assert.equal(first.rows[0].r.status, "claimed");
      assert.equal(first.rows[0].r.attemptNumber, 1);
      const second = await interpretClaim(db, alice, aliceReading.id);
      assert.equal(second.rows[0].r.status, "in_progress");
      const events = await db.query("select count(*)::int n from public.usage_events where user_id = $1 and event_name = 'tarot_reading_attempted'", [alice]);
      assert.equal(events.rows[0].n, 1, "the refused concurrent claim wrote no attempt");
      const wrong = await interpretClaim(db, bob, aliceReading.id);
      assert.equal(wrong.rows[0].r.status, "not_found");
      // AI failure: the claim is released without touching the interpretation; the lock and delivered count stay free.
      const release = await as(db, "service_role", null, "update public.tarot_readings set claim_token = null, claimed_at = null where id = $1 and claim_token = $2", [aliceReading.id, tokenA]);
      assert.equal(release.error, undefined);
      const tokenB = randomUUID();
      const retry = await interpretClaim(db, alice, aliceReading.id, tokenB);
      assert.equal(retry.rows[0].r.status, "claimed");
      assert.equal(retry.rows[0].r.attemptNumber, 2);
      await db.query("update public.tarot_readings set claimed_at = now() - interval '10 minutes' where id = $1", [aliceReading.id]);
      const tokenC = randomUUID();
      const takeover = await interpretClaim(db, alice, aliceReading.id, tokenC);
      assert.equal(takeover.rows[0].r.status, "claimed", "a stale claim is taken over");
      const lostFinalize = await finalize(db, aliceReading.id, tokenB);
      assert.equal(lostFinalize.affected, 0, "the stale holder cannot finalize");
      const done = await finalize(db, aliceReading.id, tokenC);
      assert.equal(done.affected, 1);
      const replay = await interpretClaim(db, alice, aliceReading.id);
      assert.equal(replay.rows[0].r.status, "completed");
      assert.equal(replay.rows[0].r.reading.interpretation.summary, "S");
      const after = await db.query("select count(*)::int n from public.usage_events where user_id = $1 and event_name = 'tarot_reading_attempted'", [alice]);
      assert.equal(after.rows[0].n, 3, "replay adds no attempt");
    });

    await t.test("trigger: interpretation and draw immutable; receipt id may be added once; clarifier once", async () => {
      const bad = [
        "update public.tarot_readings set interpretation = jsonb_set(interpretation, '{summary}', '\"changed\"') where id = $1",
        "update public.tarot_readings set selected_cards = '[]' where id = $1",
        "update public.tarot_readings set question = 'other' where id = $1",
        "update public.tarot_readings set lock_key = null, lock_date = null where id = $1",
        "update public.tarot_readings set route_version = 'r2' where id = $1",
        "update public.tarot_readings set deck_ref = '{\"id\":\"other\"}' where id = $1",
        "update public.tarot_readings set interpreted_at = now() where id = $1",
        "update public.tarot_readings set status = 'queued' where id = $1",
        "update public.tarot_readings set user_id = '" + bob + "' where id = $1"
      ];
      for (const sql of bad) {
        const result = await as(db, "service_role", null, sql, [aliceReading.id]);
        assert.match(String(result.error?.message), /tarot_|immutable/, sql);
      }
      const receipt = await as(db, "service_role", null,
        "update public.tarot_readings set interpretation = jsonb_set(interpretation, '{provenance,answerReceiptId}', '\"00000000-0000-4000-8000-000000000009\"') where id = $1",
        [aliceReading.id]);
      assert.equal(receipt.error, undefined, String(receipt.error));
      const receiptAgain = await as(db, "service_role", null,
        "update public.tarot_readings set interpretation = jsonb_set(interpretation, '{provenance,answerReceiptId}', '\"00000000-0000-4000-8000-00000000000a\"') where id = $1",
        [aliceReading.id]);
      assert.match(String(receiptAgain.error?.message), /tarot_interpretation_immutable/);
      const clarifier = await as(db, "service_role", null,
        "update public.tarot_readings set clarifier = '{\"cardId\":\"major-01-magician\",\"reversed\":false}' where id = $1 and clarifier is null", [aliceReading.id]);
      assert.equal(clarifier.affected, 1);
      const clarifierAgain = await as(db, "service_role", null,
        "update public.tarot_readings set clarifier = '{\"cardId\":\"major-02-high-priestess\",\"reversed\":true}' where id = $1", [aliceReading.id]);
      assert.match(String(clarifierAgain.error?.message), /tarot_clarifier_immutable/);
      const queuedWrite = await drawClaim(db, bob, lockKey(20), { delivered: 5, drawCap: 5, attempts: 5 });
      const bobId = queuedWrite.rows[0].r.reading.id;
      const early = await as(db, "service_role", null, "update public.tarot_readings set interpretation = '{\"summary\":\"x\"}' where id = $1", [bobId]);
      assert.match(String(early.error?.message), /tarot_interpretation_requires_interpreted_at/);
    });

    await t.test("legacy rows (saved before the lock) are immutable but may be soft-deleted", async () => {
      const legacy = await db.query(
        "insert into public.tarot_readings(user_id, topic, spread, selected_cards, interpretation) values ($1, 'self', 'daily-one', '[]', '{\"summary\":\"old\",\"moderationStatus\":\"fallback\"}') returning id",
        [alice]);
      const id = legacy.rows[0].id;
      const change = await as(db, "service_role", null, "update public.tarot_readings set interpretation = '{\"summary\":\"new\"}' where id = $1", [id]);
      assert.match(String(change.error?.message), /tarot_interpretation_immutable/);
      const soft = await as(db, "service_role", null, "update public.tarot_readings set deleted_at = now(), status = 'deleted' where id = $1", [id]);
      assert.equal(soft.error, undefined, String(soft.error));
    });

    await t.test("soft delete hides the row from the client but still counts for lock and limits", async () => {
      const del = await as(db, "service_role", null,
        "update public.tarot_readings set deleted_at = now(), status = 'deleted' where id = $1 and deleted_at is null", [aliceReading.id]);
      assert.equal(del.affected, 1);
      const undo = await as(db, "service_role", null, "update public.tarot_readings set deleted_at = null, status = 'completed' where id = $1", [aliceReading.id]);
      assert.match(String(undo.error?.message), /tarot_reading_deleted/);
      const visible = await as(db, "authenticated", alice, "select id from public.tarot_readings where id = $1", [aliceReading.id]);
      assert.deepEqual(visible.rows, []);
      const sameKey = await drawClaim(db, alice, lockKey(1));
      assert.equal(sameKey.rows[0].r.status, "existing");
      assert.ok(sameKey.rows[0].r.reading.deleted_at, "the soft-deleted reading still holds its lock key");
      const claim = await interpretClaim(db, alice, aliceReading.id);
      assert.equal(claim.rows[0].r.status, "deleted");
      // Alice delivered 1 passed reading today (now deleted): a new topic is refused with the default limits.
      const newTopic = await drawClaim(db, alice, lockKey(2), { topic: "career", drawCap: 3 });
      assert.deepEqual(newTopic.rows[0].r, { status: "limit", reason: "delivered" });
    });

    await t.test("draw cap counts every draw of the day; a new Vietnam day starts empty", async () => {
      const carol = randomUUID();
      await db.query("insert into auth.users(id) values ($1)", [carol]);
      const limits = { drawCap: 2, delivered: 5, attempts: 5 };
      assert.equal((await drawClaim(db, carol, lockKey(30), { ...limits, topic: "love" })).rows[0].r.status, "created");
      assert.equal((await drawClaim(db, carol, lockKey(31), { ...limits, topic: "career" })).rows[0].r.status, "created");
      assert.deepEqual((await drawClaim(db, carol, lockKey(32), { ...limits, topic: "self" })).rows[0].r, { status: "limit", reason: "draw_cap" });
      const tomorrow = await drawClaim(db, carol, lockKey(33), { ...limits, topic: "self", lockDate: "2026-11-16", dayStart: nextDayStart });
      assert.equal(tomorrow.rows[0].r.status, "created");
      // Attempts limit: three failed attempts refuse a new draw and a further claim.
      const dave = randomUUID();
      await db.query("insert into auth.users(id) values ($1)", [dave]);
      const draw = (await drawClaim(db, dave, lockKey(40))).rows[0].r.reading;
      for (let index = 0; index < 3; index += 1) {
        const token = randomUUID();
        assert.equal((await interpretClaim(db, dave, draw.id, token)).rows[0].r.status, "claimed");
        await as(db, "service_role", null, "update public.tarot_readings set claim_token = null, claimed_at = null where id = $1", [draw.id]);
      }
      assert.deepEqual((await interpretClaim(db, dave, draw.id)).rows[0].r, { status: "limit", reason: "attempts" });
      assert.deepEqual((await drawClaim(db, dave, lockKey(41), { topic: "career", delivered: 5, drawCap: 5 })).rows[0].r, { status: "limit", reason: "attempts" });
      const lockOnly = await drawClaim(db, dave, lockKey(40));
      assert.equal(lockOnly.rows[0].r.status, "existing", "the existing draw is still returned after the limits");
    });

    await t.test("account deletion still cascades", async () => {
      await db.query("delete from auth.users where id = $1", [bob]);
      const left = await db.query("select count(*)::int n from public.tarot_readings where user_id = $1", [bob]);
      assert.equal(left.rows[0].n, 0);
    });
  } finally {
    await db.close();
  }
});
