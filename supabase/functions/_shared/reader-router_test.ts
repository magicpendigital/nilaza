import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { checkReaderChoice, READER_ALLOWLIST, readerCandidates, readerStateText, suggestReader, type ReaderRouterDeps } from "./reader-router.ts";
import { defaultModelRoutes } from "./model-router.ts";
import { DecisionProviderError } from "./providers/decisions.ts";
import type { ModelGenerationResult } from "./model-provider.ts";

const route = defaultModelRoutes.reader_router;
const state = { question: "Có nên nhắn cho người cũ không?", topic: "love", spread: "three-card", cards: [{ name: "The Lovers", positionKey: "past", reversed: false }] };
const candidates = ["the-love-oracle", "the-clear-strategist"];
const generation = (text: string, moderationStatus: ModelGenerationResult["moderationStatus"] = "passed"): ModelGenerationResult => ({
  text, provider: "openrouter", model: "deepseek/deepseek-v4.1-flash", routeVersion: route.version, fallbackUsed: false, attempts: [],
  latencyMs: 10, usage: {}, moderationStatus
});

Deno.test("allowlist: active free archetypes only; candidates must be a unique subset", () => {
  assertEquals(Object.keys(READER_ALLOWLIST).length, 7);
  assert(READER_ALLOWLIST["the-love-oracle"].startsWith("Guide of love"));
  assertEquals(readerCandidates(candidates), candidates);
  assertEquals(readerCandidates([]), null);
  assertEquals(readerCandidates(["the-love-oracle", "the-love-oracle"]), null);
  assertEquals(readerCandidates(["not-a-reader"]), null);
  assertEquals(readerCandidates("the-mystic"), null);
});

Deno.test("state text carries only question, topic, spread and cards", () => {
  const text = readerStateText(state);
  assert(text.includes("topic: love") && text.includes("past=The Lovers"));
  assert(!/user|nickname|journal|birth/i.test(text));
});

Deno.test("the decision step answers first with source decision_model", async () => {
  let generated = false;
  const deps: ReaderRouterDeps = {
    decide: async request => {
      assertEquals(Object.keys(request.options).sort(), [...candidates].sort());
      assert(request.timeoutMs <= 3000);
      return { provider: request.provider, model: request.model, choice: "the-love-oracle", confidence: 0.8, probabilities: {}, latencyMs: 5, costUsd: null };
    },
    generate: async () => { generated = true; return generation("{}"); }
  };
  const result = await suggestReader({ route, state, candidates }, deps);
  assertEquals(result.slug, "the-love-oracle");
  assertEquals(result.source, "decision_model");
  assertEquals(result.confidence, 0.8);
  assert(!generated);
});

Deno.test("a failed decision step falls to the chat step, whose slug must be a candidate", async () => {
  const deps: ReaderRouterDeps = {
    decide: async request => { throw new DecisionProviderError(request.provider, "provider_unavailable"); },
    generate: async input => {
      assertEquals(input.route.steps?.length, 1);
      assertEquals(input.acceptOutput('{"slug":"the-mystic","intent":null,"confidence":0.5}'), "slug");
      return generation('{"slug":"the-clear-strategist","intent":"career_choice","confidence":0.6}');
    }
  };
  const result = await suggestReader({ route, state, candidates }, deps);
  assertEquals([result.slug, result.source, result.intent], ["the-clear-strategist", "llm", "career_choice"]);
  assertEquals(result.attempts[0].code, "provider_unavailable");
});

Deno.test("everything failing or too slow returns slug null and source none", async () => {
  const failing: ReaderRouterDeps = {
    decide: async request => { throw new DecisionProviderError(request.provider, "provider_timeout"); },
    generate: async () => generation("not json", "fallback")
  };
  const result = await suggestReader({ route, state, candidates }, failing);
  assertEquals([result.slug, result.source], [null, "none"]);

  const started = Date.now();
  const slow: ReaderRouterDeps = {
    decide: () => new Promise(() => undefined),
    generate: () => new Promise(() => undefined)
  };
  const timedOut = await suggestReader({ route, state, candidates, budgetMs: 300 }, slow);
  assertEquals(timedOut.source, "none");
  assert(Date.now() - started < 1500, "the budget bounds the wait");
});

Deno.test("a safety block from the chat step does not fall through", async () => {
  let calls = 0;
  const deps: ReaderRouterDeps = {
    decide: async request => { throw new DecisionProviderError(request.provider, "refusal"); },
    generate: async () => { calls++; return generation("", "blocked"); }
  };
  const result = await suggestReader({ route: { ...route, steps: [...route.steps!, route.steps![1]] }, state, candidates }, deps);
  assertEquals(result.source, "none");
  assertEquals(calls, 1);
});

Deno.test("checkReaderChoice names the failing field", () => {
  assertEquals(checkReaderChoice('{"slug":"the-love-oracle","intent":"Bad Intent","confidence":0.5}', candidates).reason, "intent");
  assertEquals(checkReaderChoice('{"slug":"the-love-oracle","confidence":2}', candidates).reason, "confidence");
  assertEquals(checkReaderChoice('{"slug":"the-love-oracle","confidence":0.4,"x":1}', candidates).reason, "extra_key");
  assertEquals(checkReaderChoice('{"slug":"the-love-oracle","confidence":0.4}', candidates).choice?.intent, null);
});
