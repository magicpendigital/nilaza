// Nil P1-B (15/11/2026): lock and replay for ai-astrology-insight, against a small in-memory stand-in for
// public.astrology_claim_report (the SQL itself is tested with PGlite in scripts/astrology-lock-sql.test.mjs).
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createAstrologyInsightHandler } from "./handler.ts";
import { astrologyInputHash, astrologyTopic } from "../_shared/astrology-lock.ts";

function assert(value: unknown, message = "assertion failed"): asserts value { if (!value) throw new Error(message); }
const USER = "00000000-0000-4000-8000-000000000001";
const fixture = (name: string) => JSON.parse(Deno.readTextFileSync(new URL(`../../../packages/agent-config/astrology-ai-insight/fixtures/${name}.json`, import.meta.url)));
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const MODEL_KEYS = ["headline", "synthesis", "evidenceFactIds", "patterns", "tensions", "focusSections", "reflectionQuestions", "suggestedFollowUps"];
const MODEL_OUTPUT = (() => { const response = fixture("valid-response"); return Object.fromEntries(MODEL_KEYS.map((key) => [key, response[key]])); })();
const ROUTE = { id: "00000000-0000-4000-8000-000000000004", feature: "astrology_report", version: "route-v1", status: "active", responseSchema: "astrology_ai_insight_v1", maxOutputTokens: 2000 };
const PROMPT = { id: "00000000-0000-4000-8000-000000000005", version: "prompt-v1", status: "active", locale: "vi", prompt_text: "Use the validated chart facts for symbolic reflection only." };

function invocation(question?: string) {
  const input = fixture("valid-invocation"), context = fixture("valid-request");
  for (const key of ["chart", "selectedFactIds", "facts", "caveats"]) input[key] = context[key];
  if (question !== undefined) input.userFocus.sanitizedQuestion = question;
  return input;
}

type Row = Record<string, any>;
function world(options: { generationDelayMs?: number; generation?: Record<string, unknown>; dailyLimit?: number } = {}) {
  const rows: Row[] = [];
  const rpcs: Array<{ name: string; args: Record<string, any> }> = [];
  const generations: unknown[] = [];
  let attempts = 0, nextId = 10;
  let generation: Record<string, unknown> = { ...(options.generation ?? {}) };

  // Mirrors the outcomes of public.astrology_claim_report for one user (serialised like the advisory lock).
  function claim(args: Record<string, any>) {
    const live = rows.find((row) => row.user_id === args.p_user_id && row.lock_key === args.p_lock_key && row.status !== "failed");
    if (live) return live.status === "queued" ? { outcome: "in_progress", report_id: live.id } : { outcome: "replay", report_id: live.id };
    const delivered = rows.filter((row) => row.status === "completed" || row.status === "deleted" || row.status === "queued").length;
    if (delivered >= args.p_daily_limit || attempts >= args.p_daily_limit + args.p_failed_allowance) return { outcome: "limit_reached" };
    const id = `00000000-0000-4000-8000-0000000000${nextId++}`;
    rows.push({ id, user_id: args.p_user_id, status: "queued", lock_key: args.p_lock_key, input_hash: args.p_input_hash, focus_topic: args.p_focus_topic, ...clone(args.p_report) });
    attempts += 1;
    return { outcome: "claimed", report_id: id, attempts, delivered };
  }

  const client = {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: USER, created_at: "2026-01-01T00:00:00Z" } }, error: null }) },
    rpc: (name: string, args: Record<string, any>) => {
      rpcs.push({ name, args: clone(args) });
      return Promise.resolve(name === "astrology_claim_report" ? { data: claim(args), error: null } : { data: null, error: null });
    },
    from(table: string) {
      let action = "select", value: Row | undefined;
      const filters: Array<[string, unknown]> = [];
      const execute = () => {
        if (table === "subscriptions") return { data: [{ entitlement: "premium", status: "active", current_period_end: null }], error: null };
        if (table === "prompt_versions") return { data: PROMPT, error: null };
        if (table === "astrology_reports") {
          const match = rows.filter((row) => filters.every(([key, wanted]) => row[key] === wanted));
          if (action === "update") { for (const row of match) Object.assign(row, clone(value)); return { data: null, error: null }; }
          return { data: match[0] ? clone(match[0]) : null, error: null };
        }
        return { data: null, error: null };
      };
      const chain: Record<string, any> = {
        select: () => chain, insert: (input: Row) => { action = "insert"; value = input; return chain; },
        update: (input: Row) => { action = "update"; value = input; return chain; },
        eq: (key: string, wanted: unknown) => { filters.push([key, wanted]); return chain; },
        is: () => chain, in: () => chain, gte: () => chain, order: () => chain, limit: () => chain,
        single: () => Promise.resolve(execute()), maybeSingle: () => Promise.resolve(execute()),
        then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => Promise.resolve(execute()).then(resolve, reject)
      };
      return chain;
    }
  };

  const env: Record<string, string> = { SUPABASE_URL: "https://synthetic.invalid", SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service", AI_TRACE_ENVIRONMENT: "staging" };
  const handler = createAstrologyInsightHandler({
    env: (key) => env[key],
    createClient: () => client,
    readActiveModelRoute: () => Promise.resolve(ROUTE),
    generateWithModelRoute: async (input) => {
      generations.push(input);
      if (options.generationDelayMs) await new Promise((resolve) => setTimeout(resolve, options.generationDelayMs));
      return {
        text: JSON.stringify(MODEL_OUTPUT), provider: "openai", model: "synthetic-model", routeVersionId: ROUTE.id, routeVersion: ROUTE.version,
        requestId: "provider_synthetic", traceId: "trace_synthetic", moderationStatus: "passed", finishReason: "stop",
        finalizeTrace: () => Promise.resolve(), ...generation
      };
    },
    readActiveFeatureConfig: () => Promise.resolve(options.dailyLimit ? { feature: "astrology_insight", version: 1, quotaDaily: options.dailyLimit, copy: {} } : null),
    featurePaused: () => Promise.resolve(false),
    writeAnswerReceipt: () => Promise.resolve(null)
  });

  let sequence = 0;
  const request = async (input: Record<string, any> = invocation()) => {
    sequence += 1;
    const req = new Request("https://synthetic.invalid/functions/v1/ai-astrology-insight", {
      method: "POST",
      headers: {
        "Content-Type": "application/json", Authorization: "Bearer token",
        "x-nilaza-interaction-id": `interaction_${sequence}`, "x-nilaza-attempt-id": `attempt_${sequence}`, "x-nilaza-client-request-id": input.requestId
      },
      body: JSON.stringify(input)
    });
    const response = await handler(req);
    return { status: response.status, body: await response.json() };
  };
  return {
    rows, rpcs, generations, request,
    claims: () => rpcs.filter((call) => call.name === "astrology_claim_report"),
    setGeneration: (next: Record<string, unknown>) => { generation = next; }
  };
}

Deno.test("same chart and topic: second request replays the stored reading with no provider call and no turn", async () => {
  const w = world();
  const first = await w.request();
  assertEquals(first.status, 200, JSON.stringify(first.body));
  assertEquals(first.body.replay.replayed, false);
  const second = await w.request();
  assertEquals(second.status, 200, JSON.stringify(second.body));
  assertEquals(second.body.replay.replayed, true);
  assertEquals(w.generations.length, 1);
  assertEquals(w.rows.length, 1);
  assertEquals(second.body.report.synthesis, first.body.report.synthesis);
  assertEquals(second.body.report.reportId, first.body.report.reportId);
  assertEquals(second.body.provenance.attemptId, "attempt_2");
  assertEquals(second.body.replayContext.selectedFactIds, invocation().selectedFactIds);
  assertEquals(w.rows[0].status, "completed");
  assertEquals(w.rows[0].prompt_version, PROMPT.version);
  assertEquals(w.rows[0].route_version, ROUTE.version);
});

Deno.test("concurrent requests for one key make one model call and one row", async () => {
  const w = world({ generationDelayMs: 30 });
  const results = await Promise.all([w.request(), w.request(), w.request()]);
  assertEquals(w.generations.length, 1);
  assertEquals(w.rows.length, 1);
  assertEquals(results.map((result) => result.status).sort(), [200, 409, 409]);
  assert(results.filter((result) => result.status === 409).every((result) => result.body.error.code === "report_in_progress"));
});

Deno.test("a different topic is a new reading under the daily limit", async () => {
  const w = world({ dailyLimit: 3 });
  assertEquals((await w.request(invocation("Tình yêu của tôi đang ra sao?"))).status, 200);
  assertEquals((await w.request(invocation("Công việc của tôi nên đi hướng nào?"))).status, 200);
  assertEquals(w.generations.length, 2);
  const [love, work] = w.claims();
  assertEquals([love.args.p_focus_topic, work.args.p_focus_topic], ["relationships", "work"]);
  assertEquals(love.args.p_input_hash, work.args.p_input_hash);
  assert(love.args.p_lock_key !== work.args.p_lock_key);
  // Same topic, reworded: replay, still two model calls.
  const again = await w.request(invocation("Chuyện tình yêu sắp tới thế nào?"));
  assertEquals(again.body.replay.replayed, true);
  assertEquals(w.generations.length, 2);
  // With the default limit (1), a second topic waits for tomorrow.
  const strict = world();
  assertEquals((await strict.request(invocation("Tình yêu của tôi đang ra sao?"))).status, 200);
  const limited = await strict.request(invocation("Công việc của tôi nên đi hướng nào?"));
  assertEquals(limited.status, 429);
  assertEquals(strict.generations.length, 1);
});

Deno.test("the server computes the chart hash; a client hash is never read", async () => {
  const w = world({ dailyLimit: 5 });
  const spoofed = { ...invocation(), inputHash: "0".repeat(64), lockKey: "0".repeat(64) };
  const rejected = await w.request(spoofed);
  assertEquals(rejected.status, 400);
  assertEquals(w.claims().length, 0);

  assertEquals((await w.request()).status, 200);
  const base = w.claims()[0].args;
  assertEquals(base.p_input_hash, await astrologyInputHash(invocation()));
  // Request id, saved-chart id and report revision are not part of the chart identity: same key, replay.
  const renamed = invocation();
  renamed.requestId = "req_astrology_other_003";
  renamed.clientChartId = "chart_astrology_other_003";
  renamed.chart.reportRevision = 7;
  const replay = await w.request(renamed);
  assertEquals(replay.status, 200, JSON.stringify(replay.body));
  assertEquals(replay.body.replay.replayed, true);
  assertEquals(replay.body.report.requestId, renamed.requestId);
  assertEquals(replay.body.report.metadata.reportRevision, 7);
  assertEquals(w.claims()[1].args.p_lock_key, base.p_lock_key);
  // A different calculated placement is a different chart.
  const moved = invocation();
  moved.facts.placements[0].degree += 1;
  assertEquals((await w.request(moved)).status, 200);
  assert(w.claims()[2].args.p_input_hash !== base.p_input_hash);
  assertEquals(w.generations.length, 2);
});

Deno.test("an AI failure releases the key: the next try generates and succeeds", async () => {
  const w = world();
  w.setGeneration({ moderationStatus: "fallback", provider: "local_fallback" });
  const failed = await w.request();
  assertEquals(failed.status, 503);
  assertEquals(failed.body.error.code, "provider_unavailable");
  assertEquals(w.rows[0].status, "failed");
  w.setGeneration({ text: "{\"headline\":\"cut" });
  assertEquals((await w.request()).status, 502);
  assertEquals(w.rows[1].status, "failed");
  w.setGeneration({});
  const ok = await w.request();
  assertEquals(ok.status, 200, JSON.stringify(ok.body));
  assertEquals(ok.body.replay.replayed, false);
  assertEquals(w.generations.length, 3);
  assertEquals(w.rows.map((row) => row.status), ["failed", "failed", "completed"]);
});

Deno.test("crisis questions return crisis_support (the app shows the 115 card) with no claim and no model call", async () => {
  const w = world();
  const crisis = await w.request(invocation("Tôi muốn tự tử"));
  assertEquals(crisis.status, 422);
  assertEquals(crisis.body.error.code, "crisis_support");
  assertEquals(w.rpcs.length, 0);
  assertEquals(w.generations.length, 0);
  assertEquals(w.rows.length, 0);
});

Deno.test("topic catalog: overview, app theme, keyword match, general", () => {
  assertEquals(astrologyTopic({ mode: "overview", theme: "open_reflection", sanitizedQuestion: null }), "overview");
  assertEquals(astrologyTopic({ mode: "question", theme: "work", sanitizedQuestion: "tình yêu" }), "work");
  assertEquals(astrologyTopic({ mode: "question", theme: "open_reflection", sanitizedQuestion: "Gia đình tôi có ổn không?" }), "family");
  assertEquals(astrologyTopic({ mode: "question", theme: "open_reflection", sanitizedQuestion: "Should I change my job?" }), "work");
  assertEquals(astrologyTopic({ mode: "question", theme: "open_reflection", sanitizedQuestion: "Tôi có nên chuyển nhà?" }), "decision");
  assertEquals(astrologyTopic({ mode: "question", theme: "open_reflection", sanitizedQuestion: "Làm sao hiểu rõ hơn nhu cầu phát triển của mình?" }), "general");
});
