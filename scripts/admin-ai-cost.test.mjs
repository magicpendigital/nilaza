// P1-C (15/11/2026): AI cost per feature. PGlite runs migration 20261115120000_ai_cost_by_feature_view.sql on top of
// the trace tables (20260909014614) and the capability map, then checks percentiles, permissions, privacy and re-run.
// Runs when @electric-sql/pglite resolves, or when NILAZA_PGLITE_MODULE names its dist/index.js; otherwise skipped.
// The static checks (Admin budget mirror = ai-usage-policy.json) always run.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8").replaceAll("\r\n", "\n");
const MIGRATION = "20261115120000_ai_cost_by_feature_view.sql";

// percentile_cont: linear interpolation at p x (n - 1) over the sorted values.
function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const position = p * (sorted.length - 1);
  const low = Math.floor(position), high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}
const round1 = (value) => Math.round(value * 10) / 10;

test("Admin cost card mirrors the current budget policy (read only, not a second source)", () => {
  const policy = JSON.parse(read("packages/agent-config/ai-usage-policy.json"));
  const overview = read("apps/admin/overview.js");
  const mirror = overview.match(/const BUDGET_POLICY_G1 = (\{[^}]*\});/);
  assert.ok(mirror, "overview.js declares BUDGET_POLICY_G1");
  const values = Function(`return (${mirror[1]})`)();
  assert.equal(values.version, policy.version);
  assert.equal(values.dailyMicroUSD, policy.qaBudget.dailyMicroUSD);
  assert.equal(values.campaignMicroUSD, policy.qaBudget.campaignMicroUSD);
  assert.equal(values.campaignDays, policy.qaBudget.campaignDays);
  assert.match(read(`supabase/migrations/${MIGRATION}`), /'defaultTurnCapMicro', 20000\)/);
  assert.match(read("supabase/functions/_shared/model-router.ts"), /DEFAULT_COST_CAP_MICRO = 20_000;/, "turn cap mirror");
});

test("migration reads only technical span columns", () => {
  const sql = read(`supabase/migrations/${MIGRATION}`);
  const code = sql.split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n");
  assert.doesNotMatch(code, /\bs\.(input|output)\b|root_input|root_output|\.input\b|\.output\b/, "no span or run payload columns");
  assert.doesNotMatch(code, /'userId'|'user_id'/, "no user id key in the output");
  assert.match(code, /security_invoker = true/);
  assert.match(code, /revoke all on nilaza_private\.ai_cost_calls from public, anon, authenticated;/);
  assert.match(code, /revoke all on function public\.get_ai_cost_summary\(integer\) from public, anon, authenticated;/);
});

async function loadPglite() {
  const target = process.env.NILAZA_PGLITE_MODULE;
  try { return (await import(target ? pathToFileURL(target).href : "@electric-sql/pglite")).PGlite; } catch { return null; }
}

test("PGlite: cost summary percentiles, permissions, no raw user id, re-run", async (t) => {
  const PGlite = await loadPglite();
  if (!PGlite) { t.skip("PGlite not installed; set NILAZA_PGLITE_MODULE to @electric-sql/pglite/dist/index.js"); return; }
  const mig = (name) => read(`supabase/migrations/${name}`);
  const db = await PGlite.create();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, email varchar(255), encrypted_password text, raw_user_meta_data jsonb,
        created_at timestamptz default now(), invited_at timestamptz, email_confirmed_at timestamptz, last_sign_in_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated, anon, service_role;
      grant execute on function auth.uid() to authenticated, anon, service_role;
      create table public.admin_role_assignments (id uuid primary key default gen_random_uuid(),
        user_id uuid not null references auth.users(id) on delete cascade,
        role text not null check (role in ('owner', 'admin', 'editor', 'safety_reviewer')),
        status text not null default 'active' check (status in ('active', 'revoked')),
        created_at timestamptz not null default now(), unique (user_id, role));
      create table public.admin_audit_logs(id uuid primary key default gen_random_uuid(), admin_user_id uuid references auth.users(id) on delete set null,
        action text not null, target_table text, target_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
      alter table public.admin_role_assignments enable row level security;
      create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select false $$;
      create policy "admins can manage admin role assignments" on public.admin_role_assignments for all using (public.is_admin()) with check (public.is_admin());
      grant select, insert, update, delete on public.admin_role_assignments to authenticated;`);
    const owner = randomUUID(), editor = randomUUID(), plain = randomUUID();
    const appUsers = Array.from({ length: 6 }, () => randomUUID());
    for (const id of [owner, editor, plain, ...appUsers]) await db.query("insert into auth.users(id, email) values ($1, $2)", [id, `${id.slice(0, 8)}@example.test`]);
    await db.query("insert into public.admin_role_assignments(user_id, role) values ($1, 'owner'), ($2, 'editor')", [owner, editor]);
    const boundary = mig("20260902131408_owner_capability_boundary.sql");
    await db.exec(boundary.slice(0, boundary.indexOf("-- Preserve each table's existing own-user operations")));
    await db.exec(mig("20261114090000_admin_team_roles.sql"));
    await db.exec(mig("20261115090000_owner_only_publish.sql"));
    await db.exec(mig("20260909014614_ai_trace_observability.sql"));
    // Supabase gives service_role all rights on public tables by default; the stub must say so explicitly.
    await db.exec("grant select on public.ai_trace_runs, public.ai_trace_spans to service_role;");

    // Seed: one run per call unless noted. Tarot: ten new-format calls 100..1000 micro (one turn each, users rotate).
    let seq = 0;
    const run = async ({ feature, userId, status = "completed", metadata = {}, hoursAgo = 1 }) => {
      const id = randomUUID();
      await db.query(`insert into public.ai_trace_runs(id, trace_id, user_id, feature, status, root_input, root_output, metadata, created_at)
        values ($1, $2, $3, $4, $5, '{"messages":"SECRET-PROMPT"}', '{"text":"SECRET-ANSWER"}', $6, now() - make_interval(hours => $7))`,
        [id, `trace_${seq++}`, userId, feature, status, JSON.stringify(metadata), hoursAgo]);
      return id;
    };
    const call = async (runId, { attributes, status = "ok", name = "llm.openrouter.primary", hoursAgo = 1 }) => {
      await db.query(`insert into public.ai_trace_spans(run_id, trace_id, span_id, user_id, span_name, span_type, status, input, output, attributes, started_at)
        values ($1, 'x', $2, null, $3, 'generation', $4, '{"system":"SECRET-PROMPT"}', '{"text":"SECRET-ANSWER"}', $5, now() - make_interval(hours => $6))`,
        [runId, `span_${seq++}`, name, status, JSON.stringify(attributes), hoursAgo]);
    };
    const model = "deepseek/deepseek-v4.1-flash";
    const tarotCosts = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    for (const [index, cost] of tarotCosts.entries()) {
      const r = await run({ feature: "tarot_reading", userId: appUsers[index % 6] });
      await call(r, { attributes: { provider: "openrouter", model, fallbackUsed: false, cost_micro: cost, cost_source: index < 7 ? "reported" : "estimated", price_verified: index < 7 ? null : true, input_tokens: 1000, output_tokens: 500 } });
    }
    // Chat: one turn with a failed primary (unknown) and a fallback answer (estimated, unverified price), canned turn,
    // plus legacy spans written before this change (charged_usd -> reported; old step-chain costMicro -> estimated).
    const chatTurn = await run({ feature: "persona_chat", userId: appUsers[0], status: "fallback" });
    await call(chatTurn, { status: "error", attributes: { provider: "openrouter", model, fallbackUsed: false, cost_micro: null, cost_source: "unknown", price_verified: true } });
    await call(chatTurn, { name: "llm.deepseek.fallback", attributes: { provider: "deepseek", model: "deepseek-flash", fallbackUsed: true, cost_micro: 50, cost_source: "estimated", price_verified: false, input_tokens: 100, output_tokens: 20 } });
    const legacy = await run({ feature: "persona_chat", userId: appUsers[1] });
    await call(legacy, { attributes: { provider: "openrouter", model, fallbackUsed: false, charged_usd: 0.0005, inputTokens: 900, outputTokens: 300 } });
    const oldStep = await run({ feature: "persona_chat", userId: appUsers[2] });
    await call(oldStep, { status: "blocked", attributes: { provider: "openrouter", model, costMicro: 300 } });
    // Excluded: an Admin eval run (metadata-mode shape) and a call 40 days ago.
    const evalRun = await run({ feature: "tarot_reading", userId: owner, metadata: { type: "object", keys: ["adminEval"] } });
    await call(evalRun, { attributes: { provider: "openrouter", model, cost_micro: 9999, cost_source: "reported" } });
    const old = await run({ feature: "tarot_reading", userId: appUsers[3], hoursAgo: 24 * 40 });
    await call(old, { hoursAgo: 24 * 40, attributes: { provider: "openrouter", model, cost_micro: 77777, cost_source: "reported" } });

    await db.exec(mig(MIGRATION));
    const as = (actor, sql, { role = "authenticated", claims } = {}) => db.transaction(async (tx) => {
      await tx.exec(`set local role ${role}`);
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [actor ?? ""]);
      if (claims) await tx.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(claims)]);
      return (await tx.query(sql)).rows;
    });
    const summary = async (actor, days = 7, options) => (await as(actor, `select public.get_ai_cost_summary(${days}) as v`, options))[0].v;

    const result = await summary(owner);
    const tarot = result.features.find((row) => row.feature === "tarot_reading");
    assert.equal(tarot.calls, 10, "eval and 40-day-old calls excluded");
    assert.equal(tarot.turns, 10);
    assert.equal(tarot.costMicro, 5500);
    assert.equal(tarot.inputTokens, 10000);
    for (const [key, p] of [["P50", 0.5], ["P95", 0.95], ["P99", 0.99]]) {
      assert.equal(Number(tarot[`turnCost${key}`]), round1(percentile(tarotCosts, p)), `turn ${key}`);
      assert.equal(Number(tarot[`callCost${key}`]), round1(percentile(tarotCosts, p)), `call ${key}`);
    }
    assert.deepEqual([Number(tarot.turnCostP50), Number(tarot.turnCostP95), Number(tarot.turnCostP99)], [550, 955, 991]);
    assert.equal(tarot.estimatedCalls, 3);
    assert.equal(tarot.unknownCalls, 0);

    const chat = result.features.find((row) => row.feature === "persona_chat");
    assert.equal(chat.calls, 4);
    assert.equal(chat.turns, 3);
    assert.equal(chat.costMicro, 50 + 500 + 300, "legacy charged_usd and costMicro are read");
    assert.equal(chat.failedCalls, 1);
    assert.equal(chat.blockedCalls, 1);
    assert.equal(chat.fallbackCalls, 1);
    assert.equal(chat.cannedTurns, 1);
    assert.equal(chat.unknownCalls, 1);
    assert.equal(chat.estimatedCalls, 2, "new estimated + old costMicro");
    assert.equal(chat.unverifiedPriceCalls, 1);
    // Turn cost: chat turns cost 50, 500, 300 -> p50 300.
    assert.equal(Number(chat.turnCostP50), 300);

    assert.deepEqual(result.eval, { calls: 1, costMicro: 9999 });
    assert.equal(result.totals.calls, 14);
    assert.equal(result.totals.costMicro, 5500 + 850);
    const deepseekDirect = result.byDayModel.find((row) => row.provider === "deepseek");
    assert.equal(deepseekDirect.hasUnverifiedPrice, true);
    assert.equal(deepseekDirect.fallbackCalls, 1);
    assert.equal(result.budget.campaigns, null, "budget table not applied here");
    assert.equal(result.budget.defaultTurnCapMicro, 20000);

    // Per user per day: six app users, one day each (all calls within the last hour unless near midnight VN time).
    const perUser = new Map();
    const add = (user, cost) => perUser.set(user, (perUser.get(user) ?? 0) + cost);
    tarotCosts.forEach((cost, index) => add(appUsers[index % 6], cost));
    add(appUsers[0], 50); add(appUsers[1], 500); add(appUsers[2], 300);
    if (result.perUserDay.userDays === 6) {
      assert.equal(Number(result.perUserDay.costP50), round1(percentile([...perUser.values()], 0.5)));
      assert.equal(Number(result.perUserDay.costP95), round1(percentile([...perUser.values()], 0.95)));
    }
    assert.ok(result.perUserDay.userDays >= 6);

    // Privacy: no user id, email or content anywhere in the answer.
    const text = JSON.stringify(result);
    for (const id of [owner, editor, plain, ...appUsers]) assert.ok(!text.includes(id), "no raw user id");
    assert.doesNotMatch(text, /SECRET-|example\.test|userId|user_id/);
    // Fewer than 5 user-days: percentiles hidden.
    await db.exec("delete from public.ai_trace_runs where user_id <> all(array[$$" + appUsers.slice(0, 3).join("$$::uuid, $$") + "$$::uuid])");
    const few = await summary(owner, 30);
    assert.equal(few.perUserDay.hidden, true);
    assert.equal(few.perUserDay.costP50, undefined);

    // Permissions.
    assert.ok((await summary(editor)).features, "ai.read (editor) can read");
    assert.ok((await summary(null, 7, { role: "service_role", claims: { role: "service_role" } })).features, "service_role can read");
    await assert.rejects(summary(plain), /Not authorized/, "signed-in account without ai.read");
    await assert.rejects(summary(null), /Not authorized/, "authenticated without a user");
    await assert.rejects(summary(null, 7, { role: "anon" }), /permission denied/, "anon has no execute");
    await assert.rejects(summary(null, 7, { role: "service_role" }), /Not authorized/, "service_role grant alone without the JWT role is refused");
    await assert.rejects(as(owner, "select count(*) from nilaza_private.ai_cost_calls"), /permission denied/, "view closed to authenticated");
    await assert.rejects(as(null, "select count(*) from nilaza_private.ai_cost_calls", { role: "anon" }), /permission denied/, "view closed to anon");
    const viewColumns = (await db.query("select column_name from information_schema.columns where table_schema = 'nilaza_private' and table_name = 'ai_cost_calls'")).rows.map((row) => row.column_name);
    assert.ok(viewColumns.length > 5 && !viewColumns.some((name) => /user|input$|output$|text|prompt|content/.test(name)), `view columns: ${viewColumns}`);
    const serviceRows = await as(null, "select count(*)::int as n from nilaza_private.ai_cost_calls", { role: "service_role" });
    assert.ok(serviceRows[0].n > 0, "service_role reads the view");

    // Re-run: idempotent, same answer.
    const before = await summary(owner, 30);
    await db.exec(mig(MIGRATION));
    const again = await summary(owner, 30);
    delete before.generatedAt; delete again.generatedAt;
    assert.deepEqual(again, before);
    // days_back is clamped.
    assert.equal((await summary(owner, 0)).daysBack, 1);
    assert.equal((await summary(owner, 1000)).daysBack, 90);
  } finally {
    await db.close();
  }
});
