import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { claimDeliveredAttempt } from "../_shared/daily-attempts.ts";
import { localCanonicalPrompt } from "../_shared/global-prompt.ts";
import { defaultModelRoutes } from "../_shared/model-router.ts";
import { expectedReportBlockIds, reportSectionBlockIds } from "../_shared/numerology-payload.ts";
import {
  ATTEMPT_EVENT, createNumerologyReportHandler, DELIVERED_EVENT, FEATURE, nextVietnamDay, type NumerologyReportDeps,
  type ReportGenerateInput, type ReportGeneration, type ReportTraceFinalization
} from "./handler.ts";

const USER = "11111111-1111-4111-8111-111111111111";
const NOON_VN = "2026-11-28T05:00:00.000Z";
const route = defaultModelRoutes[FEATURE];
const numbers = { lifePath: "11/2", birthday: "7", personalYear: "3", personalMonth: "5", pinnacle: { stage: 1 as const, number: "4" }, challenge: "2" };
const chart = { digits: [1, 2, 3, 9], fullArrows: ["1-2-3" as const], emptyArrows: ["4-5-6" as const] };
const blockIds = expectedReportBlockIds(numbers, chart);
const validBody = { version: 1, feature: FEATURE, language: "vi", numbers, chart, blockIds };
const sectionIds = reportSectionBlockIds(numbers, chart);
const words = (n: number) => Array.from({ length: n }, () => "nhẹ").join(" ");
const goodReport = {
  sections: sectionIds.map((section) => ({ id: section.id, body: words(section.id === "questions" ? 8 : 60), blockIds: [section.ids[0]] })),
  questions: ["Điều gì bạn muốn bắt đầu?", "Ai đang đi cùng bạn?", "Bạn muốn giữ lại điều gì?"]
};
const goodAnswer = JSON.stringify(goodReport);

function generation(text: string, patch: Partial<ReportGeneration> = {}): ReportGeneration {
  return {
    text, provider: "openrouter", model: route.primaryModel, routeVersion: route.version, fallbackUsed: false, attempts: [],
    latencyMs: 12, usage: { inputTokens: 900, outputTokens: 1600, totalTokens: 2500 }, moderationStatus: "passed", finishReason: "stop", ...patch
  } as ReportGeneration;
}

type Harness = {
  deps: NumerologyReportDeps;
  calls: string[];
  generateInputs: ReportGenerateInput[];
  usage: Record<string, unknown>[];
  safety: Record<string, unknown>[];
  traces: ReportTraceFinalization[];
};

function harness(overrides: Partial<NumerologyReportDeps> = {}, answer: ReportGeneration = generation(goodAnswer)): Harness {
  const calls: string[] = [], generateInputs: ReportGenerateInput[] = [], usage: Record<string, unknown>[] = [];
  const safety: Record<string, unknown>[] = [], traces: ReportTraceFinalization[] = [];
  const deps: NumerologyReportDeps = {
    authenticate: async () => { calls.push("auth"); return { id: USER, isAnonymous: false }; },
    featureEnabled: async () => { calls.push("switch"); return true; },
    readTier: async () => { calls.push("tier"); return "premium"; },
    claimAttempt: async () => { calls.push("claim"); return { result: "allowed" }; },
    resolvePrompt: async (language) => { calls.push("prompt"); return localCanonicalPrompt(FEATURE, language, "missing_active"); },
    resolveRoute: async () => { calls.push("route"); return { route, experiment: null }; },
    generate: async (input) => {
      calls.push("generate");
      generateInputs.push(input);
      return { ...answer, finalizeTrace: async (value) => { traces.push(value); } };
    },
    recordUsage: async (row) => { usage.push(row); return true; },
    recordSafetyEvent: async (row) => { safety.push(row); },
    ...overrides
  };
  return { deps, calls, generateInputs, usage, safety, traces };
}

const approved = { contentApproved: () => true, now: () => new Date(NOON_VN) };

function post(body: unknown = validBody, headers: Record<string, string> = { Authorization: "Bearer token" }) {
  return new Request("https://example.test/functions/v1/ai-numerology-report", {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

Deno.test("CORS preflight and method guard", async () => {
  const handler = createNumerologyReportHandler(() => harness().deps, approved);
  const preflight = await handler(new Request("https://example.test", { method: "OPTIONS" }));
  assertEquals(preflight.headers.get("Access-Control-Allow-Origin"), "*");
  assertEquals((await handler(new Request("https://example.test", { method: "GET" }))).status, 405);
});

Deno.test("the route is the cheap pair with reasoning off, 4000 tokens and a total wait under the Edge limit", () => {
  assertEquals([route.primaryModel, route.fallbackModel], ["deepseek/deepseek-v4.1-flash", "xiaomi/mimo-v2.6-flash"]);
  assertEquals(route.maxOutputTokens, 4000);
  assertEquals(route.responseSchema, "numerology_report_v1");
  assertEquals(route.safetyPolicy.approvedBlocksOnly, true);
  assert((route.totalDeadlineMs ?? 0) <= 140_000);
  assert(route.steps?.every((step) => step.reasoning?.mode === "off" && step.maxTokens === 4000 && step.jsonMode));
});

Deno.test("delivers a checked report with approved titles, records counts only, and stores no report text", async () => {
  const h = harness();
  const response = await createNumerologyReportHandler(() => h.deps, approved)(post());
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.sections.map((section: { id: string }) => section.id), ["you", "chart", "year", "pinnacle", "relationship", "questions"]);
  assertEquals(body.sections[0].title, "Con người bạn");
  assertEquals(body.questions.length, 3);
  assertEquals(body.persistenceStatus, "stored");
  assertEquals(body.nextReportAt, nextVietnamDay(new Date(NOON_VN)));
  assertEquals(h.calls, ["auth", "switch", "tier", "claim", "prompt", "route", "generate"]);
  const input = h.generateInputs[0];
  assertEquals(input.feature, "numerology_report");
  assertEquals(input.fallbackText, "");
  assertEquals(input.strictTraceRedaction, true);
  assertEquals(input.deferTraceFlush, true);
  assert(input.system.includes("LOCKED RULES"));
  const data = JSON.parse(input.messages[0].content.split("\n")[1]);
  assertEquals(Object.keys(data), ["language", "numbers", "chart", "sections"]);
  assertEquals(data.sections.flatMap((section: { blocks: Array<{ id: string }> }) => section.blocks.map((block) => block.id)).sort(), [...blockIds].sort());
  assert(data.sections.every((section: { blocks: Array<{ text: string }> }) => section.blocks.every((block) => block.text.length > 10)));
  // The router's own check refuses an answer before the fallback model is tried.
  assertEquals(input.acceptOutput("nope"), "not_json");
  assertEquals(input.acceptOutput(goodAnswer, "length"), "incomplete");
  assertEquals(input.acceptOutput(goodAnswer, "stop"), undefined);
  assertEquals(h.usage.length, 1);
  assertEquals(h.usage[0].event_name, DELIVERED_EVENT);
  const stored = JSON.stringify(h.usage[0]);
  assert(!stored.includes("nhẹ") && !stored.includes("numbers.2") && !stored.includes("11/2") && !stored.includes("Điều gì"));
  assertEquals(h.traces.map((trace) => trace.status), ["ok"]);
});

Deno.test("sign-in comes first and the body is never read before the quota is claimed", async () => {
  const h = harness();
  const handler = createNumerologyReportHandler(() => h.deps, approved);
  assertEquals((await handler(post(validBody, {}))).status, 401);
  assertEquals(h.calls, []);
  const anonymous = harness({ authenticate: async () => ({ id: USER, isAnonymous: true }) });
  assertEquals((await createNumerologyReportHandler(() => anonymous.deps, approved)(post())).status, 401);
  assertEquals((await createNumerologyReportHandler(() => null, approved)(post())).status, 503);
  // Switched off, out of quota: the invalid body is never touched (it would otherwise be a 400).
  const paused = harness({ featureEnabled: async () => false });
  const response = await createNumerologyReportHandler(() => paused.deps, approved)(post("{ not json"));
  assertEquals([response.status, (await response.json()).error], [503, "feature_paused"]);
  const limited = harness({ claimAttempt: async () => ({ result: "limit_reached", reason: "attempts" }) });
  assertEquals((await createNumerologyReportHandler(() => limited.deps, approved)(post("{ not json"))).status, 429);
});

Deno.test("each gate refuses in order before any model work", async () => {
  const cases: Array<[Partial<NumerologyReportDeps>, Record<string, unknown>, number, string, string[]]> = [
    [{ featureEnabled: async () => false }, approved, 503, "feature_paused", ["auth", "switch"]],
    [{}, { ...approved, contentApproved: () => false }, 503, "content_not_approved", ["auth", "switch"]],
    [{ readTier: async () => "free" }, approved, 403, "premium_required", ["auth", "switch"]],
    [{ readTier: async () => { throw new Error("tier_unavailable"); } }, approved, 503, "access_check_unavailable", ["auth", "switch"]],
    [{ claimAttempt: async () => ({ result: "limit_reached", reason: "delivered" }) }, approved, 429, "daily_limit_reached", ["auth", "switch", "tier"]],
    [{ claimAttempt: async () => ({ result: "unavailable" }) }, approved, 503, "usage_check_unavailable", ["auth", "switch", "tier"]]
  ];
  for (const [overrides, options, status, error, prefix] of cases) {
    const h = harness(overrides);
    const response = await createNumerologyReportHandler(() => h.deps, options)(post());
    const body = await response.json();
    assertEquals([response.status, body.error], [status, error], error);
    assertEquals(h.calls.filter((call) => prefix.includes(call)), h.calls, error);
    assert(!h.calls.includes("generate") && !h.calls.includes("prompt") && !h.calls.includes("route"), error);
    assertEquals(h.usage.length, 0);
  }
  // The content gate runs before the tier read and the quota.
  const draft = harness();
  await createNumerologyReportHandler(() => draft.deps, { ...approved, contentApproved: () => false })(post());
  assertEquals(draft.calls, ["auth", "switch"]);
  const limited = harness({ claimAttempt: async () => ({ result: "limit_reached", reason: "delivered" }) });
  const body = await (await createNumerologyReportHandler(() => limited.deps, approved)(post())).json();
  assertEquals(body.reason, "delivered");
  assertEquals(body.nextReportAt, nextVietnamDay(new Date(NOON_VN)));
});

Deno.test("the default content gate reads the shipped report copy, still a draft: 503 content_not_approved", async () => {
  const h = harness();
  const response = await createNumerologyReportHandler(() => h.deps, { now: () => new Date(NOON_VN) })(post());
  assertEquals([response.status, (await response.json()).error], [503, "content_not_approved"]);
  assertEquals(h.calls, ["auth", "switch"]);
});

Deno.test("a body with personal data, digit counts or block ids that do not follow is refused after the claim", async () => {
  for (const [body, reason] of [
    [{ ...validBody, name: "An" }, "unknown_key"],
    [{ ...validBody, numbers: { ...numbers, birthDate: "1990-01-01" } }, "unknown_key"],
    [{ ...validBody, numbers: { ...numbers, age: 36 } }, "unknown_key"],
    [{ ...validBody, chart: { ...chart, counts: { 1: 2 } } }, "unknown_key"],
    [{ ...validBody, chart: { ...chart, digits: [1, 1, 2, 3, 9] } }, "invalid_chart"],
    [{ ...validBody, chart: { ...chart, fullArrows: [] } }, "invalid_chart"],
    [{ ...validBody, numbers: { ...numbers, expression: "5" } }, "invalid_number"],
    [{ ...validBody, blockIds: blockIds.slice(1) }, "block_not_matching"],
    [{ ...validBody, blockIds: [...blockIds.slice(1), "numbers.9"] }, "block_not_matching"]
  ] as const) {
    const h = harness();
    const response = await createNumerologyReportHandler(() => h.deps, approved)(post(body));
    assertEquals(response.status, 400, reason);
    const result = await response.json();
    assertEquals([result.error, result.reason, result.attemptCounted], ["invalid_request", reason, true]);
    assert(h.calls.includes("claim") && !h.calls.includes("generate"));
  }
  const h = harness();
  assertEquals((await createNumerologyReportHandler(() => h.deps, approved)(post("{ not json"))).status, 400);
});

Deno.test("a failed or unusable answer is 503 report_unavailable with no canned text and no delivered event", async () => {
  const withBody = (index: number, body: string) => JSON.stringify({
    ...goodReport, sections: goodReport.sections.map((section, i) => i === index ? { ...section, body } : section)
  });
  for (const answer of [
    generation("not json"),
    generation(withBody(0, `${words(40)} bạn sẽ gặp điều mới`)),
    generation(withBody(0, `${words(40)} năm 2027`)),
    generation(withBody(1, words(351))),
    generation(JSON.stringify({ ...goodReport, sections: goodReport.sections.slice(1) })),
    generation(goodAnswer, { finishReason: "length" }),
    generation("", { moderationStatus: "fallback", provider: "local_fallback" })
  ]) {
    const h = harness({}, answer);
    const response = await createNumerologyReportHandler(() => h.deps, approved)(post());
    assertEquals(response.status, 503);
    const body = await response.json();
    assertEquals([body.error, body.retryable, body.attemptCounted], ["report_unavailable", true, true]);
    assertEquals(body.sections, undefined);
    assertEquals(h.usage.length, 0);
    assertEquals(h.traces.map((trace) => trace.status), ["error"]);
  }
});

Deno.test("a safety block records a safety event and is not retryable", async () => {
  const h = harness({}, generation("", { moderationStatus: "blocked", safetyReason: "self_harm" }));
  const response = await createNumerologyReportHandler(() => h.deps, approved)(post());
  assertEquals(response.status, 503);
  const body = await response.json();
  assertEquals([body.error, body.moderationStatus, body.retryable], ["report_unavailable", "blocked", false]);
  assertEquals(h.safety.length, 1);
  assertEquals(h.usage.length, 0);
  assertEquals(h.traces.map((trace) => trace.status), ["blocked"]);
});

Deno.test("a usage write failure still returns the report, marked usage_error; a router exception is 503", async () => {
  const h = harness({ recordUsage: async () => false });
  const response = await createNumerologyReportHandler(() => h.deps, approved)(post());
  assertEquals(response.status, 200);
  assertEquals((await response.json()).persistenceStatus, "usage_error");
  const broken = harness({ generate: async () => { throw new Error("boom"); } });
  const failed = await createNumerologyReportHandler(() => broken.deps, approved)(post());
  assertEquals([failed.status, (await failed.json()).error], [503, "service_unavailable"]);
});

Deno.test("claimDeliveredAttempt with the report events: one delivered report, then two failed attempts at most", async () => {
  const rows: Array<{ event_name: string; created_at: string }> = [];
  const store = {
    from(_table: string) {
      const filters: Record<string, string> = {};
      const query = {
        select: () => query,
        eq: (column: string, value: string) => { filters[column] = value; return query; },
        gte: (_column: string, since: string) =>
          Promise.resolve({ count: rows.filter((row) => row.event_name === filters.event_name && row.created_at >= since).length, error: null }),
        insert: (row: { event_name: string }) => { rows.push({ event_name: row.event_name, created_at: NOON_VN }); return Promise.resolve({ error: null }); }
      };
      return query;
    }
  };
  const input = { userId: USER, feature: FEATURE, deliveredEvent: DELIVERED_EVENT, attemptEvent: ATTEMPT_EVENT, deliveredLimit: 1, attemptLimit: 3, now: new Date(NOON_VN) };
  for (let i = 0; i < 3; i++) assertEquals(await claimDeliveredAttempt(store as never, input), { result: "allowed" });
  assertEquals(await claimDeliveredAttempt(store as never, input), { result: "limit_reached", reason: "attempts" });
  rows.length = 0;
  rows.push({ event_name: DELIVERED_EVENT, created_at: "2026-11-28T01:00:00.000Z" });
  assertEquals(await claimDeliveredAttempt(store as never, input), { result: "limit_reached", reason: "delivered" });
});
