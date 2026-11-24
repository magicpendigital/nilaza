// Batch C: tarot_note_claim (supabase/migrations/20261124090000_tarot_note_reader_router.sql) on PGlite over the Tarot lock
// schema: one delivered note per Vietnam day, capped attempts, and one fresh note claim per account at a time.
// Runs when @electric-sql/pglite resolves or NILAZA_PGLITE_MODULE names its dist/index.js; otherwise it is skipped.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const lockMigration = read("supabase/migrations/20261115100000_tarot_reading_lock.sql");
const freeDrawMigration = read("supabase/migrations/20261116100000_tarot_draw_claim_free_draw.sql");
const noteMigration = read("supabase/migrations/20261124090000_tarot_note_reader_router.sql");

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

// Only the pieces of the migration this test needs: the note columns and the claim function.
const noteColumns = noteMigration.slice(noteMigration.indexOf("alter table public.tarot_readings\n  add column if not exists note jsonb"),
  noteMigration.indexOf("do $$", noteMigration.indexOf("add column if not exists note_claimed_at")));
const guardUpdate = noteMigration.slice(noteMigration.indexOf("create or replace function nilaza_private.guard_tarot_reading_update()"),
  noteMigration.indexOf("for each row execute function nilaza_private.guard_tarot_reading_update();") + "for each row execute function nilaza_private.guard_tarot_reading_update();".length);
const claimFunction = noteMigration.slice(noteMigration.indexOf("create or replace function public.tarot_note_claim("),
  noteMigration.indexOf("to service_role;", noteMigration.indexOf("grant execute on function public.tarot_note_claim")) + "to service_role;".length);

const lockKey = (n) => n.toString(16).padStart(64, "0");
const cards = JSON.stringify([{ id: "major-00-fool", positionKey: "daily", reversed: false }]);
const dayStart = new Date(Date.now() - 3_600_000).toISOString();

const claim = async (db, user, readingId, options = {}) => (await db.query(
  `select public.tarot_note_claim($1, $2, $3, $4::timestamptz, $5, $6, $7) as r`,
  [user, readingId, options.token ?? randomUUID(), dayStart, options.delivered ?? 1, options.attempts ?? 3, options.stale ?? 180])).rows[0].r;

async function draw(db, user, n) {
  const { rows } = await db.query(
    `select public.tarot_draw_claim($1, $2, '2026-11-24'::date, $3::timestamptz, 'love', 'daily-one', 'Q', 'vi', null,
       '{"id":"moon-garden","slug":"moon-garden"}'::jsonb, $4::jsonb, 10, 10, 10) as r`, [user, lockKey(n), dayStart, cards]);
  return rows[0].r.reading.id;
}

test("PGlite: tarot_note_claim allows one note claim per account at a time", async (t) => {
  const PGlite = await loadPglite();
  if (!PGlite) { t.skip("PGlite not installed; set NILAZA_PGLITE_MODULE to @electric-sql/pglite/dist/index.js"); return; }
  assert.ok(claimFunction.includes("in_progress") && noteColumns.includes("note_claimed_at"), "migration slices were found");
  const db = await PGlite.create();
  try {
    await db.exec(baseSchema);
    await db.exec(lockMigration);
    await db.exec(freeDrawMigration);
    await db.exec(noteColumns);
    await db.exec(guardUpdate);
    await db.exec(claimFunction);
    const alice = randomUUID(), bob = randomUUID();
    await db.query("insert into auth.users(id) values ($1), ($2)", [alice, bob]);
    const one = await draw(db, alice, 1), two = await draw(db, alice, 2), other = await draw(db, bob, 3);

    await t.test("a fresh claim on one draw blocks a claim on another draw of the same account", async () => {
      assert.equal((await claim(db, alice, one)).status, "claimed");
      assert.equal((await claim(db, alice, two)).status, "in_progress");
      assert.equal((await claim(db, alice, one)).status, "in_progress", "the same draw is still in progress");
      assert.equal((await claim(db, bob, other)).status, "claimed", "another account is not blocked");
    });

    await t.test("a released or stale claim stops blocking", async () => {
      await db.query("update public.tarot_readings set note_claimed_at = now() - interval '10 minutes' where id = $1", [one]);
      assert.equal((await claim(db, alice, two)).status, "claimed");
      await db.query("update public.tarot_readings set note_claim_token = null, note_claimed_at = null where id = $1", [two]);
      assert.equal((await claim(db, alice, one)).status, "claimed");
    });

    await t.test("a delivered note still limits the next draw of the day", async () => {
      await db.query("update public.tarot_readings set note = '{}'::jsonb, note_created_at = now(), note_claim_token = null, note_claimed_at = null where id = $1", [one]);
      const result = await claim(db, alice, two);
      assert.deepEqual([result.status, result.reason], ["limit", "note_daily"]);
    });
  } finally {
    await db.close();
  }
});
