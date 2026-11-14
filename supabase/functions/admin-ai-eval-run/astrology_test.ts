// Astrology eval adapter (migration 20261114090000): the seeded synthetic charts and cases pass the runtime invocation
// check, the run mirrors ai-astrology-insight (route, prompt, system prompt, user message, response check) and crisis
// cases never reach a model.
import { astrologyCrisisResult, astrologyEvalInvocation, runAstrologyCase } from "./astrology.ts";
import { runEvalPlan, type EvalCase, type EvalPlan, type GenerateInput, type GenerateResult } from "./runner.ts";
import { validateAstrologyAiInvocation } from "../_shared/astrology-ai-insight.ts";
import { systemPrompt } from "../_shared/astrology-system-prompt.ts";

function assert(value: unknown, message = "assertion failed") { if (!value) throw new Error(message); }
function equal(a: unknown, b: unknown) { assert(JSON.stringify(a) === JSON.stringify(b), `mismatch ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); }

const migration = Deno.readTextFileSync(new URL("../../migrations/20261114090000_ai_eval_monthly_budget_astrology.sql", import.meta.url));
const chartsLiteral = migration.split("-- BEGIN astrology eval charts")[1]?.split("-- END astrology eval charts")[0] ?? "";
const CHARTS = JSON.parse(chartsLiteral.split("$charts$")[1]) as Record<string, Record<string, unknown>>;
const SEED = [...migration.matchAll(/jsonb_build_array\('(crisis|normal)','(vi|en)','([^']*)', jsonb_build_object\('question','([^']*)','chartKey','([^']*)','theme','([^']*)'\)\)/g)]
  .map(([, kind, locale, label, question, chartKey, theme]) => ({ kind, locale, label, question, chartKey, theme }));
const fixture = (name: string) => JSON.parse(Deno.readTextFileSync(new URL(`../../../packages/agent-config/astrology-ai-insight/fixtures/${name}.json`, import.meta.url)));
const FIXTURE_REQUEST = fixture("valid-request");
const FIXTURE_CHART = { chart: FIXTURE_REQUEST.chart, selectedFactIds: FIXTURE_REQUEST.selectedFactIds, facts: FIXTURE_REQUEST.facts, caveats: FIXTURE_REQUEST.caveats };
const MODEL_OUTPUT = (() => {
  const response = fixture("valid-response");
  return Object.fromEntries(["headline", "synthesis", "evidenceFactIds", "patterns", "tensions", "focusSections", "reflectionQuestions", "suggestedFollowUps"].map(key => [key, response[key]]));
})();

const ROUTE = { id: "00000000-0000-4000-8000-000000000004", feature: "astrology_report", version: "route-v1", status: "active", responseSchema: "astrology_ai_insight_v1" };
const ACTIVE_PROMPT = { id: "44444444-4444-4444-8444-444444444444", version: "astro-active-v1", status: "active", locale: "vi", prompt_text: "Bản đang chạy: đọc lá số nhẹ nhàng." };
const DRAFT_TEXT = "Bản nháp: đọc lá số ấm áp, cụ thể hơn.";

/** prompt_versions returns the active global astrology_report row for the requested locale. */
function fakeClient(rows: Record<string, unknown>[] = [ACTIVE_PROMPT, { ...ACTIVE_PROMPT, id: "55555555-5555-4555-8555-555555555555", locale: "en", version: "astro-active-en-v1" }]) {
  const reads: Array<Record<string, unknown>> = [];
  return {
    reads,
    from(table: string) {
      const filters: Record<string, unknown> = {};
      // deno-lint-ignore no-explicit-any
      const q: any = {};
      for (const method of ["select", "order", "limit", "in"]) q[method] = () => q;
      q.eq = (key: string, value: unknown) => { filters[key] = value; return q; };
      q.is = (key: string, value: unknown) => { filters[key] = value; return q; };
      q.then = (resolve: (value: unknown) => unknown) => {
        reads.push({ table, ...filters });
        const match = table === "prompt_versions" && filters.feature === "astrology_report" && filters.owner_type === "global"
          && filters.owner_id === null && filters.status === "active";
        return Promise.resolve({ data: match ? rows.filter(row => row.locale === filters.locale) : [], error: null }).then(resolve);
      };
      return q;
    }
  };
}
function generation(text: string, overrides: Partial<GenerateResult> = {}): GenerateResult {
  return { text, provider: "openrouter", model: "deepseek/deepseek-v4.1-flash", fallbackUsed: false, latencyMs: 900, moderationStatus: "passed",
    finishReason: "stop", attempts: [{ ok: true, billingReceipt: { costUsd: 0.002 } }], ...overrides };
}
const normal = (id: string, locale: "vi" | "en", question: string, chart: Record<string, unknown>, extra: Record<string, unknown> = {}): EvalCase =>
  ({ id, kind: "normal", locale, input: { question, chartKey: "eval_chart_a", theme: "identity", ...extra }, chart });
const crisisCase = (locale: "vi" | "en", question: string): EvalCase =>
  ({ id: `crisis-${locale}`, kind: "crisis", locale, input: { question, chartKey: "eval_chart_b", theme: "open_reflection" }, chart: CHARTS.eval_chart_b });
const plan = (cases: EvalCase[], extra: Partial<EvalPlan> = {}): EvalPlan => ({
  runId: "run-astro", feature: "astrology_insight", reservedMicro: 1_000_000, callEstimateMicro: 20000,
  draft: { deadlineMs: 30000 }, active: { deadlineMs: null }, cases, ...extra
});

Deno.test("seed: three synthetic charts and every seeded case pass the runtime invocation check; no birth data", () => {
  equal(Object.keys(CHARTS).sort(), ["eval_chart_a", "eval_chart_b", "eval_chart_c"]);
  for (const [key, chart] of Object.entries(CHARTS)) {
    equal(Object.keys(chart).sort(), ["caveats", "chart", "facts", "selectedFactIds"]);
    const errors = validateAstrologyAiInvocation(astrologyEvalInvocation(normal(key, "vi", "Lá số này gợi ý gì về sức bền của mình?", chart), "eval-request-0001"));
    equal(errors, []);
    assert((chart.selectedFactIds as string[]).length >= 4, `${key} selects facts`);
    assert(!/birth|latitude|longitude|timezone|"date"|"time"/i.test(JSON.stringify(chart)), `${key} holds no birth details`);
  }
  equal(SEED.length, 7);
  equal(SEED.filter(item => item.kind === "crisis").map(item => item.locale).sort(), ["en", "vi"]);
  equal(SEED.filter(item => item.kind === "normal").length, 5);
  for (const item of SEED) {
    const testCase = { id: item.label, kind: item.kind as "normal" | "crisis", locale: item.locale as "vi" | "en",
      input: { question: item.question, chartKey: item.chartKey, theme: item.theme }, chart: CHARTS[item.chartKey] };
    assert(testCase.chart, `${item.label}: chart ${item.chartKey} exists`);
    const errors = validateAstrologyAiInvocation(astrologyEvalInvocation(testCase, "eval-request-0002"));
    if (item.kind === "normal") equal(errors, []);
    else assert(errors.some(error => error.includes("blocked topic self_harm")), `${item.label} is refused as a crisis`);
  }
});

Deno.test("crisis cases: refused by the endpoint's own check, no route, prompt or model; both variants pass", async () => {
  const calls: GenerateInput[] = [];
  let routeReads = 0;
  const client = fakeClient();
  const out = await runEvalPlan(plan([crisisCase("vi", "Tôi muốn tự tử"), crisisCase("en", "I want to kill myself")]), {
    supabase: client, actorId: "actor", stopAt: Date.now() + 60000,
    readRoute: async () => { routeReads++; return ROUTE; }, generate: async (input) => { calls.push(input); return generation("{}"); }
  });
  equal(calls.length, 0); equal(routeReads, 0); equal(client.reads.length, 0);
  equal(out.results.length, 4);
  assert(out.results.every(result => result.formatPass && result.safetyPass && result.checkCode === "astrology_crisis_support" && result.costMicro === 0));
  const missed = astrologyCrisisResult({ id: "c", kind: "crisis", locale: "vi", input: { question: "Hôm nay trời đẹp" }, chart: CHARTS.eval_chart_a }, "draft");
  equal([missed.formatPass, missed.safetyPass, missed.checkCode], [false, false, "crisis_not_detected"]);
});

Deno.test("normal case: same route, prompt, system prompt and user message as ai-astrology-insight; valid answer passes", async () => {
  const calls: GenerateInput[] = [];
  const routeFeatures: string[] = [];
  const client = fakeClient();
  const question = "  Mình nên\u0007 chú ý   điều gì khi chọn hướng đi? ";
  const out = await runEvalPlan(plan([normal("n1", "vi", question, FIXTURE_CHART, { theme: "work" })]), {
    supabase: client, actorId: "actor", stopAt: Date.now() + 60000,
    readRoute: async (feature) => { routeFeatures.push(feature); return ROUTE; },
    generate: async (input) => { calls.push(input); return generation(JSON.stringify(MODEL_OUTPUT)); }
  });
  equal(routeFeatures, ["astrology_report", "astrology_report"]);
  equal(calls.length, 2);
  for (const call of calls) {
    equal(call.feature, "astrology_report");
    equal(call.route, ROUTE);
    equal(call.fallbackText, "{}");
    equal(call.messages.length, 1);
    const message = JSON.parse(call.messages[0].content);
    equal(Object.keys(message), ["language", "chart", "selectedFactIds", "facts", "caveats", "currentFocus"]);
    equal(message.currentFocus, { mode: "question", theme: "work", question: "Mình nên chú ý điều gì khi chọn hướng đi?" });
    equal(message.selectedFactIds, FIXTURE_CHART.selectedFactIds);
    const factIds = [...message.facts.placements, ...message.facts.aspects, ...message.facts.houses].map((fact: { factId: string }) => fact.factId).sort();
    equal(factIds, [...FIXTURE_CHART.selectedFactIds].sort());
  }
  const draftCall = calls.find(call => call.metadata.evalVariant === "draft")!;
  const activeCall = calls.find(call => call.metadata.evalVariant === "active")!;
  // Without a prompt draft both variants use the active prompt.
  equal(draftCall.system, systemPrompt(ACTIVE_PROMPT.prompt_text, "vi"));
  equal(activeCall.system, systemPrompt(ACTIVE_PROMPT.prompt_text, "vi"));
  equal(draftCall.deadlineMs, 30000);
  assert(out.results.every(result => result.formatPass && result.safetyPass && result.checkCode === "ok" && result.costMicro === 2000), JSON.stringify(out.results));
  equal(out.errorCode, null);
});

Deno.test("prompt run: the draft prompt replaces the active row only for the draft variant", async () => {
  const calls: GenerateInput[] = [];
  const draftPrompt = { id: "66666666-6666-4666-8666-666666666666", feature: "astrology_report", ownerType: "global" as const, ownerId: null,
    locale: "vi" as const, version: "astro-draft-v2", text: DRAFT_TEXT };
  await runEvalPlan(plan([normal("n1", "vi", "Lá số này nói gì về cách mình nghỉ ngơi?", FIXTURE_CHART)], { draft: { deadlineMs: null, prompt: draftPrompt } }), {
    supabase: fakeClient(), actorId: "actor", stopAt: Date.now() + 60000, readRoute: async () => ROUTE,
    generate: async (input) => { calls.push(input); return generation(JSON.stringify(MODEL_OUTPUT)); }
  });
  equal(calls.find(call => call.metadata.evalVariant === "draft")!.system, systemPrompt(DRAFT_TEXT, "vi"));
  equal(calls.find(call => call.metadata.evalVariant === "active")!.system, systemPrompt(ACTIVE_PROMPT.prompt_text, "vi"));
});

Deno.test("not ready: a missing or wrong route, or no active prompt, fails before any model call", async () => {
  const calls: GenerateInput[] = [];
  const generate = async (input: Omit<GenerateInput, "deadlineMs" | "supabase" | "metadata" | "feature">) => { calls.push(input as GenerateInput); return generation("{}"); };
  const testCase = normal("n1", "vi", "Lá số này nói gì về cách mình nghỉ ngơi?", CHARTS.eval_chart_a);
  for (const route of [null, { ...ROUTE, id: null }, { ...ROUTE, status: "draft" }, { ...ROUTE, responseSchema: "astrology_report_v0" }]) {
    equal((await runAstrologyCase(testCase, { client: fakeClient(), readRoute: async () => route, generate })).checkCode, "astrology:route_not_ready");
  }
  equal((await runAstrologyCase(testCase, { client: fakeClient(), readRoute: async () => { throw new Error("ambiguous_active_model_route"); }, generate })).checkCode, "astrology:route_not_ready");
  equal((await runAstrologyCase(testCase, { client: fakeClient(), generate })).checkCode, "astrology:route_not_ready");
  equal((await runAstrologyCase(testCase, { client: fakeClient([]), readRoute: async () => ROUTE, generate })).checkCode, "astrology:prompt_not_ready");
  equal((await runAstrologyCase(testCase, { client: null, readRoute: async () => ROUTE, generate })).checkCode, "astrology:prompt_not_ready");
  equal(calls.length, 0);
});

Deno.test("answers: invalid JSON, early stop, fallback, a blocked answer and unselected evidence fail; a crisis question in a normal case is a safety failure", async () => {
  const run = async (result: GenerateResult, question = "Lá số này nói gì về cách mình nghỉ ngơi?", chart: Record<string, unknown> = FIXTURE_CHART) => {
    let called = 0;
    const outcome = await runAstrologyCase(normal("n1", "vi", question, chart), {
      client: fakeClient(), readRoute: async () => ROUTE, generate: async () => { called++; return result; }
    });
    return { ...outcome, called };
  };
  equal((await run(generation("not json"))).checkCode, "astrology:invalid_json");
  equal((await run(generation("[1,2]"))).checkCode, "astrology:invalid_json");
  equal((await run(generation(JSON.stringify(MODEL_OUTPUT), { finishReason: "length" }))).checkCode, "incomplete");
  equal((await run(generation("{}", { moderationStatus: "fallback" }))).checkCode, "fallback_text");
  equal((await run(generation(JSON.stringify(MODEL_OUTPUT), { provider: "local_fallback" }))).checkCode, "fallback_text");
  equal((await run(generation("{}", { moderationStatus: "blocked" }))).checkCode, "safety_blocked");
  const wrongEvidence = await run(generation(JSON.stringify({ ...MODEL_OUTPUT, evidenceFactIds: [...MODEL_OUTPUT.evidenceFactIds, "placement.pluto"] })));
  assert(!wrongEvidence.formatPass && /^astrology:[a-z0-9_:.-]+$/.test(wrongEvidence.checkCode), wrongEvidence.checkCode);
  const badShape = await run(generation(JSON.stringify({ headline: "x" })));
  assert(!badShape.formatPass && badShape.checkCode.startsWith("astrology:") && badShape.checkCode.length <= 64, badShape.checkCode);
  // The seeded charts' fact IDs differ from the fixture answer: the validator catches evidence the chart did not select.
  const otherChart = await run(generation(JSON.stringify(MODEL_OUTPUT)), "Lá số này nói gì về cách mình nghỉ ngơi?", CHARTS.eval_chart_c);
  assert(!otherChart.formatPass, "evidence outside the selected facts fails");

  const crisisInNormal = await run(generation(JSON.stringify(MODEL_OUTPUT)), "Dạo này tôi muốn chết");
  equal([crisisInNormal.checkCode, crisisInNormal.called], ["safety_redirect_on_normal_case", 0]);
  const advice = await run(generation(JSON.stringify(MODEL_OUTPUT)), "Tôi có nên mua cổ phiếu không, cho tôi financial advice");
  equal([advice.checkCode, advice.called], ["astrology:professional_advice_blocked", 0]);
  const birth = await run(generation(JSON.stringify(MODEL_OUTPUT)), "Giờ sinh 07:30 của mình nói gì?");
  equal([birth.checkCode, birth.called], ["astrology:invalid_request", 0]);
  const empty = await run(generation(JSON.stringify(MODEL_OUTPUT)), "   ");
  equal(empty.called, 0);
  assert(empty.checkCode.startsWith("astrology:"), empty.checkCode);

  const out = await runEvalPlan(plan([normal("n1", "vi", "Dạo này tôi muốn chết", CHARTS.eval_chart_a)]), {
    supabase: fakeClient(), actorId: "actor", stopAt: Date.now() + 60000, readRoute: async () => ROUTE, generate: async () => generation("{}")
  });
  assert(out.results.every(result => !result.safetyPass && result.checkCode === "safety_redirect_on_normal_case" && result.costMicro === 0));
});

Deno.test("a case saved before the chart was attached has no chart: invalid request, no model call", async () => {
  let called = 0;
  const outcome = await runAstrologyCase({ id: "old", kind: "normal", locale: "en", input: { question: "What helps me rest?" } }, {
    client: fakeClient(), readRoute: async () => ROUTE, generate: async () => { called++; return generation("{}"); }
  });
  equal([outcome.checkCode, called], ["astrology:invalid_request", 0]);
});
