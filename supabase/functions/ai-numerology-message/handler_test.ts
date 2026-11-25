import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { claimDeliveredAttempt } from "../_shared/daily-attempts.ts";
import { localCanonicalPrompt } from "../_shared/global-prompt.ts";
import { defaultModelRoutes } from "../_shared/model-router.ts";
import {
  ATTEMPT_EVENT, createNumerologyMessageHandler, DELIVERED_EVENT, FEATURE, nextVietnamDay, type NumerologyGenerateInput,
  type NumerologyGeneration, type NumerologyMessageDeps, type NumerologyTraceFinalization
} from "./handler.ts";

const USER = "11111111-1111-4111-8111-111111111111";
const NOON_VN = "2026-11-25T05:00:00.000Z";
const route = defaultModelRoutes[FEATURE];
const numbers = { lifePath: "11/2", birthday: "7", personalYear: "3", personalMonth: "5", pinnacle: { stage: 1, number: "4" }, challenge: "2" };
const blockIds = ["numbers.2", "masters.11", "numbers.7", "personalYear.3", "personalMonth.5", "pinnacles.stages.1", "pinnacles.numbers.4", "challenges.2"];
const validBody = { version: 1, feature: FEATURE, language: "vi", numbers, blockIds };
const goodMessage = Array.from({ length: 40 }, () => "nhẹ").join(" ");
const goodAnswer = JSON.stringify({ message: goodMessage, blockIds: ["numbers.2", "personalYear.3", "challenges.2"] });

function generation(text: string, patch: Partial<NumerologyGeneration> = {}): NumerologyGeneration {
  return {
    text, provider: "openrouter", model: route.primaryModel, routeVersion: route.version, fallbackUsed: false, attempts: [],
    latencyMs: 12, usage: { inputTokens: 100, outputTokens: 60, totalTokens: 160 }, moderationStatus: "passed", finishReason: "stop", ...patch
  } as NumerologyGeneration;
}

type Harness = {
  deps: NumerologyMessageDeps;
  calls: string[];
  generateInputs: NumerologyGenerateInput[];
  usage: Record<string, unknown>[];
  safety: Record<string, unknown>[];
  traces: NumerologyTraceFinalization[];
};

function harness(overrides: Partial<NumerologyMessageDeps> = {}, answer: NumerologyGeneration = generation(goodAnswer)): Harness {
  const calls: string[] = [], generateInputs: NumerologyGenerateInput[] = [], usage: Record<string, unknown>[] = [];
  const safety: Record<string, unknown>[] = [], traces: NumerologyTraceFinalization[] = [];
  const deps: NumerologyMessageDeps = {
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
  return new Request("https://example.test/functions/v1/ai-numerology-message", {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

Deno.test("CORS preflight and method guard", async () => {
  const handler = createNumerologyMessageHandler(() => harness().deps, approved);
  const preflight = await handler(new Request("https://example.test", { method: "OPTIONS" }));
  assertEquals(preflight.headers.get("Access-Control-Allow-Origin"), "*");
  assertEquals((await handler(new Request("https://example.test", { method: "GET" }))).status, 405);
});

Deno.test("delivers a checked message, records counts only, and stores no message text", async () => {
  const h = harness();
  const response = await createNumerologyMessageHandler(() => h.deps, approved)(post());
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.message, goodMessage);
  assertEquals(body.blockIds, ["numbers.2", "personalYear.3", "challenges.2"]);
  assertEquals(body.persistenceStatus, "stored");
  assertEquals(body.nextMessageAt, nextVietnamDay(new Date(NOON_VN)));
  assertEquals(h.calls, ["auth", "switch", "tier", "claim", "prompt", "route", "generate"]);
  // What reaches the model: the locked system prompt and one labelled data block with resolved server-side text.
  const input = h.generateInputs[0];
  assertEquals(input.fallbackText, "");
  assertEquals(input.strictTraceRedaction, true);
  assertEquals(input.deferTraceFlush, true);
  assert(input.system.includes("LOCKED RULES"));
  const data = JSON.parse(input.messages[0].content.split("\n")[1]);
  assertEquals(Object.keys(data), ["language", "numbers", "blocks"]);
  assertEquals(data.blocks.map((block: { id: string }) => block.id), blockIds);
  assert(data.blocks.every((block: { text: string }) => block.text.length > 10));
  // The router's own check refuses an answer before the fallback model is tried.
  assertEquals(input.acceptOutput("nope"), "not_json");
  assertEquals(input.acceptOutput(goodAnswer, "length"), "incomplete");
  assertEquals(input.acceptOutput(goodAnswer, "stop"), undefined);
  assertEquals(h.usage.length, 1);
  assertEquals(h.usage[0].event_name, DELIVERED_EVENT);
  const stored = JSON.stringify(h.usage[0]);
  assert(!stored.includes(goodMessage) && !stored.includes("numbers.2") && !stored.includes("11/2"));
  assertEquals(h.traces.map((trace) => trace.status), ["ok"]);
});

Deno.test("sign-in comes first and the body is never read before the quota is claimed", async () => {
  const h = harness();
  const handler = createNumerologyMessageHandler(() => h.deps, approved);
  assertEquals((await handler(post(validBody, {}))).status, 401);
  assertEquals(h.calls, []);
  const anonymous = harness({ authenticate: async () => ({ id: USER, isAnonymous: true }) });
  assertEquals((await createNumerologyMessageHandler(() => anonymous.deps, approved)(post())).status, 401);
  assertEquals((await createNumerologyMessageHandler(() => null, approved)(post())).status, 503);
  // Switched off: the oversized, invalid body is never touched.
  const paused = harness({ featureEnabled: async () => false });
  const response = await createNumerologyMessageHandler(() => paused.deps, approved)(post("{ not json"));
  assertEquals(response.status, 503);
  assertEquals((await response.json()).error, "feature_paused");
});

Deno.test("each gate refuses before any model work", async () => {
  const cases: Array<[Partial<NumerologyMessageDeps>, Record<string, unknown>, number, string, string[]]> = [
    [{ featureEnabled: async () => false }, approved, 503, "feature_paused", ["auth", "switch"]],
    [{}, { ...approved, contentApproved: () => false }, 503, "content_not_approved", ["auth", "switch"]],
    [{ readTier: async () => "free" }, approved, 403, "premium_required", ["auth", "switch"]],
    [{ readTier: async () => { throw new Error("tier_unavailable"); } }, approved, 503, "access_check_unavailable", ["auth", "switch"]],
    [{ claimAttempt: async () => ({ result: "limit_reached", reason: "delivered" }) }, approved, 429, "daily_limit_reached", ["auth", "switch", "tier"]],
    [{ claimAttempt: async () => ({ result: "unavailable" }) }, approved, 503, "usage_check_unavailable", ["auth", "switch", "tier"]]
  ];
  for (const [overrides, options, status, error, prefix] of cases) {
    const h = harness(overrides);
    const response = await createNumerologyMessageHandler(() => h.deps, options)(post());
    const body = await response.json();
    assertEquals([response.status, body.error], [status, error], error);
    assert(!h.calls.includes("generate"), error);
    // Overridden deps do not log, so the logged steps are the default ones that ran before the refusal.
    assertEquals(h.calls.filter((call) => prefix.includes(call)), h.calls, error);
    assert(!h.calls.includes("prompt") && !h.calls.includes("route"), error);
    assertEquals(h.usage.length, 0);
  }
  const limited = harness({ claimAttempt: async () => ({ result: "limit_reached", reason: "delivered" }) });
  const body = await (await createNumerologyMessageHandler(() => limited.deps, approved)(post())).json();
  assertEquals(body.reason, "delivered");
  assertEquals(body.nextMessageAt, nextVietnamDay(new Date(NOON_VN)));
});

Deno.test("the default content gate reads the shipped store, which the Owner approved (25/11/2026)", async () => {
  const h = harness();
  const response = await createNumerologyMessageHandler(() => h.deps, { now: () => new Date(NOON_VN) })(post());
  assert((await response.json()).error !== "content_not_approved");
  assert(h.calls.includes("claim"));
});

Deno.test("a body with personal data or block ids that do not follow is refused after the claim (attempt counted)", async () => {
  for (const [body, reason] of [
    [{ ...validBody, name: "An" }, "unknown_key"],
    [{ ...validBody, numbers: { ...numbers, birthDate: "1990-01-01" } }, "unknown_key"],
    [{ ...validBody, blockIds: ["numbers.9"] }, "block_not_matching"]
  ] as const) {
    const h = harness();
    const response = await createNumerologyMessageHandler(() => h.deps, approved)(post(body));
    assertEquals(response.status, 400);
    const result = await response.json();
    assertEquals([result.error, result.reason, result.attemptCounted], ["invalid_request", reason, true]);
    assert(!h.calls.includes("generate"));
  }
  const h = harness();
  assertEquals((await createNumerologyMessageHandler(() => h.deps, approved)(post("{ not json"))).status, 400);
});

Deno.test("a failed or unusable answer is 503 with no canned text and no delivered event", async () => {
  for (const answer of [
    generation("not json"),
    generation(JSON.stringify({ message: `${goodMessage} sẽ`, blockIds: ["numbers.2", "numbers.7", "challenges.2"] })),
    generation(goodAnswer, { finishReason: "length" }),
    generation("", { moderationStatus: "fallback", provider: "local_fallback" })
  ]) {
    const h = harness({}, answer);
    const response = await createNumerologyMessageHandler(() => h.deps, approved)(post());
    assertEquals(response.status, 503);
    const body = await response.json();
    assertEquals([body.error, body.retryable, body.attemptCounted], ["message_unavailable", true, true]);
    assertEquals(body.message, undefined);
    assertEquals(h.usage.length, 0);
    assertEquals(h.traces.map((trace) => trace.status), ["error"]);
  }
});

Deno.test("a safety block records a safety event and is not retryable", async () => {
  const h = harness({}, generation("", { moderationStatus: "blocked", safetyReason: "self_harm" }));
  const response = await createNumerologyMessageHandler(() => h.deps, approved)(post());
  assertEquals(response.status, 503);
  const body = await response.json();
  assertEquals([body.error, body.moderationStatus, body.retryable], ["message_unavailable", "blocked", false]);
  assertEquals(h.safety.length, 1);
  assertEquals(h.safety[0].feature, "chat");
  assertEquals(h.usage.length, 0);
  assertEquals(h.traces.map((trace) => trace.status), ["blocked"]);
});

Deno.test("a usage write failure still returns the message, marked usage_error", async () => {
  const h = harness({ recordUsage: async () => false });
  const response = await createNumerologyMessageHandler(() => h.deps, approved)(post());
  assertEquals(response.status, 200);
  assertEquals((await response.json()).persistenceStatus, "usage_error");
});

Deno.test("a router exception is 503 service_unavailable", async () => {
  const h = harness({ generate: async () => { throw new Error("boom"); } });
  const response = await createNumerologyMessageHandler(() => h.deps, approved)(post());
  assertEquals(response.status, 503);
  assertEquals((await response.json()).error, "service_unavailable");
});

// claimDeliveredAttempt (daily-attempts.ts): an in-memory usage_events table with the query shape the helper uses.
function usageStore(rows: Array<{ event_name: string; created_at: string }>, failures: { count?: boolean; insert?: boolean } = {}) {
  return {
    rows,
    from(_table: string) {
      const filters: Record<string, string> = {};
      let since = "";
      const query = {
        select: () => query,
        eq: (column: string, value: string) => { filters[column] = value; return query; },
        gte: (_column: string, value: string) => {
          since = value;
          if (failures.count) return Promise.resolve({ count: null, error: { message: "down" } });
          const count = rows.filter((row) => row.event_name === filters.event_name && row.created_at >= since).length;
          return Promise.resolve({ count, error: null });
        },
        insert: (row: { event_name: string }) => {
          if (failures.insert) return Promise.resolve({ error: { message: "down" } });
          rows.push({ event_name: row.event_name, created_at: NOON_VN });
          return Promise.resolve({ error: null });
        }
      };
      return query;
    }
  };
}
const claimInput = { userId: USER, feature: FEATURE, deliveredEvent: DELIVERED_EVENT, attemptEvent: ATTEMPT_EVENT, deliveredLimit: 1, attemptLimit: 3, now: new Date(NOON_VN) };

Deno.test("claimDeliveredAttempt: one delivered message per Vietnam day, then two failed attempts at most", async () => {
  const store = usageStore([]);
  assertEquals(await claimDeliveredAttempt(store as never, claimInput), { result: "allowed" });
  assertEquals(await claimDeliveredAttempt(store as never, claimInput), { result: "allowed" });
  assertEquals(await claimDeliveredAttempt(store as never, claimInput), { result: "allowed" });
  assertEquals(await claimDeliveredAttempt(store as never, claimInput), { result: "limit_reached", reason: "attempts" });
  assertEquals(store.rows.filter((row) => row.event_name === ATTEMPT_EVENT).length, 3);

  const delivered = usageStore([{ event_name: DELIVERED_EVENT, created_at: "2026-11-25T01:00:00.000Z" }]);
  assertEquals(await claimDeliveredAttempt(delivered as never, claimInput), { result: "limit_reached", reason: "delivered" });
  assertEquals(delivered.rows.length, 1);
  // Yesterday's delivered message (before 00:00 Vietnam time = 17:00 UTC) does not count today.
  const yesterday = usageStore([{ event_name: DELIVERED_EVENT, created_at: "2026-11-24T16:59:00.000Z" }]);
  assertEquals(await claimDeliveredAttempt(yesterday as never, claimInput), { result: "allowed" });

  assertEquals(await claimDeliveredAttempt(usageStore([], { count: true }) as never, claimInput), { result: "unavailable" });
  assertEquals(await claimDeliveredAttempt(usageStore([], { insert: true }) as never, claimInput), { result: "unavailable" });
});
