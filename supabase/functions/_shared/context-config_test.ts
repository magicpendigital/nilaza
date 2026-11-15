// Owner request 14/11 (ai_context_configs): default parity with cb32621 and the hard rules.
import golden from "./testdata/context-config-golden.json" with { type: "json" };
import {
  CONTEXT_BLOCK_SPEC,
  CONTEXT_CONFIG_CACHE_MS,
  CONTEXT_CONFIG_ERROR_CACHE_MS,
  type ContextFeature,
  type ContextPolicy,
  contextPolicyMetadata,
  parseContextConfigRow,
  readActiveContextConfig,
  requestDataClass,
  resetContextConfigCache,
  resolveContextPolicy,
  userDataPolicy
} from "./context-config.ts";
import { featureDataClass } from "./provider-registry.ts";
import { userDataValues } from "./ai-user-context.ts";
import { handoffContextBlock } from "./chat-handoff.ts";
import { personaModelMessages, sanitizeHistory } from "../ai-persona-chat/persona-context.ts";
import { dailyUserMessage } from "../ai-daily-insight/daily-prompt.ts";
import { boundCouncilHistory, councilHistoryFor, councilUserMessage } from "../ai-council/council-prompt.ts";

function assertEquals(actual: unknown, expected: unknown, label = "") {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label}\nexpected ${e}\n     got ${a}`);
}
function assert(condition: unknown, label: string) {
  if (!condition) throw new Error(label);
}

// deno-lint-ignore no-explicit-any
const G = golden as any;
const now = new Date(G.now);

/** Every block on at exactly today's caps, written out in full. */
function allOnAtCaps(feature: ContextFeature) {
  const blocks: Record<string, Record<string, unknown>> = {};
  for (const [id, spec] of Object.entries(CONTEXT_BLOCK_SPEC.features[feature].blocks ?? {})) {
    blocks[id] = { enabled: true };
    for (const [name, limit] of Object.entries(spec.limits)) blocks[id][name] = limit.max;
  }
  return { version: 3, blocks };
}

function policies(feature: ContextFeature): Array<[string, ContextPolicy | undefined]> {
  return [
    ["no policy", undefined],
    ["null row", resolveContextPolicy(feature, null)],
    ["empty blocks", resolveContextPolicy(feature, { version: 1, blocks: {} })],
    ["all on at caps", resolveContextPolicy(feature, allOnAtCaps(feature))],
    ["above caps and unknown keys", resolveContextPolicy(feature, { version: 2, blocks: { journal: { enabled: true }, history: { turns: 99, chars: 9999 }, goals: { maxItems: 50, maxChars: 500 }, handoff: { questionChars: 9000, summaryChars: 9000 } } })]
  ];
}

// deno-lint-ignore no-explicit-any
function personaMessages(c: any, policy?: ContextPolicy) {
  return personaModelMessages({ language: c.language, text: c.text, history: c.history, userContext: c.userContext, policy, now });
}
// deno-lint-ignore no-explicit-any
function dailyContent(c: any, policy?: ContextPolicy) {
  return dailyUserMessage({ language: c.language, dateKey: c.dateKey, rerollCount: c.rerollCount, profile: c.profile, recentMood: c.recentMood, now, dataPolicy: policy ? userDataPolicy(policy) : undefined });
}
// deno-lint-ignore no-explicit-any
function councilResult(c: any, policy?: ContextPolicy) {
  // The same helper ai-council/index.ts calls, so the golden cases cover the real wiring.
  const history = policy ? councilHistoryFor(c.history, policy) : boundCouncilHistory(c.history);
  const content = councilUserMessage({
    language: c.language, userContext: c.userContext ?? undefined, now,
    dataPolicy: policy ? userDataPolicy(policy) : undefined,
    request: { language: c.language, userMessage: c.userMessage, selectedPersonas: G.selectedPersonas, sanitizedHistory: history, template: G.template }
  });
  return { sanitizedHistory: history, content };
}

Deno.test("default parity: persona_chat messages are byte-identical to cb32621", () => {
  for (const c of G.persona) {
    for (const [label, policy] of policies("persona_chat")) assertEquals(personaMessages(c, policy), c.expected.messages, `persona ${c.name} / ${label}`);
  }
});

Deno.test("default parity: daily_insight message is byte-identical to cb32621", () => {
  for (const c of G.daily) {
    for (const [label, policy] of policies("daily_insight")) assertEquals(dailyContent(c, policy), c.expected.content, `daily ${c.name} / ${label}`);
  }
});

Deno.test("default parity: ai_council history and message are byte-identical to cb32621", () => {
  for (const c of G.council) {
    for (const [label, policy] of policies("ai_council")) assertEquals(councilResult(c, policy), c.expected, `council ${c.name} / ${label}`);
  }
});

Deno.test("limits are clamped to today's caps and the spec minimum", () => {
  const high = resolveContextPolicy("persona_chat", { version: 1, blocks: { history: { turns: 50, chars: 5000 }, goals: { maxItems: 9, maxChars: 900 } } });
  assertEquals(high.blocks.history.limits, { turns: 8, chars: 800 }, "history capped");
  assertEquals(high.blocks.goals.limits, { maxItems: 5, maxChars: 60 }, "goals capped");
  const low = resolveContextPolicy("ai_council", { version: 1, blocks: { history: { turns: -3, chars: 2 }, goals: { maxItems: 0, maxChars: 1 } } });
  assertEquals(low.blocks.history.limits, { turns: 1, chars: 100 }, "history floor");
  assertEquals(low.blocks.goals.limits, { maxItems: 1, maxChars: 10 }, "goals floor");
  const odd = resolveContextPolicy("ai_council", { version: 1, blocks: { history: { turns: 2.5, chars: "300" } } });
  assertEquals(odd.blocks.history.limits, { turns: 12, chars: 800 }, "non-integers keep the default");
  // Builders clamp again even when called with raw numbers.
  assertEquals(boundCouncilHistory(G.council[0].history, { turns: 500, chars: 50_000 }), G.council[0].expected.sanitizedHistory, "builder cap");
});

Deno.test("only spec blocks exist: no journal block, unknown keys ignored, enabled must be false to switch off", () => {
  for (const feature of ["persona_chat", "daily_insight", "ai_council"] as ContextFeature[]) {
    const policy = resolveContextPolicy(feature, { version: 1, blocks: { journal: { enabled: true }, journalText: { enabled: true }, message: { enabled: false } } });
    assert(!("journal" in policy.blocks) && !("journalText" in policy.blocks) && !("message" in policy.blocks), `${feature}: unknown or locked keys ignored`);
    for (const block of Object.keys(policy.blocks)) assert(!/journal|message|language/i.test(block), `${feature}: ${block} is not a locked field`);
  }
  const notFalse = resolveContextPolicy("persona_chat", { version: 1, blocks: { nickname: { enabled: "no" }, tone: { enabled: 0 } } });
  assert(notFalse.blocks.nickname.enabled && notFalse.blocks.tone.enabled, "only boolean false switches a block off");
});

Deno.test("switched-off blocks leave the model message; the message itself is always sent last", () => {
  const c = G.persona[0];
  const off = resolveContextPolicy("persona_chat", { version: 4, blocks: { nickname: { enabled: false }, goals: { enabled: false }, tone: { enabled: false }, localDateTime: { enabled: false }, history: { enabled: false }, handoff: { enabled: false } } });
  const messages = personaMessages(c, off);
  assertEquals(messages.length, 1, "no history");
  const content = messages[0].content;
  assert(content.endsWith(`\n\n${c.text}`), "message last");
  assert(!content.includes("Lan"), "no nickname");
  assert(!content.includes("goals") && !content.includes("Ngủ ngon"), "no goals");
  assert(content.includes("\"tone\":\"gentle\"") && !content.includes("wise"), "tone falls back to gentle, not the person's choice");
  assert(!content.includes("localDateTime"), "no local time");
  assert(!content.includes("NGỮ CẢNH NGƯỜI DÙNG MANG THEO"), "no handoff");
  assert(content.includes("<nilaza_user_data>") && content.includes("\"language\":\"vi\""), "data block and language stay");
  assertEquals(off.dataClass, "sensitive", "floor holds with every block off");
  assertEquals(contextPolicyMetadata(off), { contextConfigVersion: 4 }, "trace version");
  assertEquals(contextPolicyMetadata(resolveContextPolicy("persona_chat", null)), {}, "no trace field without a config");
});

Deno.test("narrowed limits shorten history, goals and handoff", () => {
  const c = G.persona[0];
  const narrow = resolveContextPolicy("persona_chat", { version: 1, blocks: { history: { turns: 2, chars: 100 }, goals: { maxItems: 2, maxChars: 10 }, handoff: { questionChars: 50, summaryChars: 100 } } });
  const messages = personaMessages(c, narrow);
  // Last 2 turns are a blank guide turn and the repeated question, so no history remains.
  assertEquals(messages.length, 1, "two-turn window");
  const three = personaMessages(c, resolveContextPolicy("persona_chat", { version: 1, blocks: { history: { turns: 3, chars: 100 } } }));
  assertEquals(three.length, 2, "three-turn window keeps one real turn");
  assert(three[0].content.length <= 100, "100 characters per turn");
  const values = userDataValues({ language: "vi", goals: c.userContext.goals, policy: userDataPolicy(narrow) }).values;
  assertEquals(values.goals, ["Ngủ ngon h", "Bớt lo âu"], "two goals of ten characters");
  const handoff = handoffContextBlock(c.userContext.handoffContext, "vi", { questionChars: 50, summaryChars: 100 }) ?? "";
  const question = handoff.split("\n").find((line) => line.startsWith("Câu hỏi khi đó: ")) ?? "";
  assertEquals(question.length, "Câu hỏi khi đó: ".length + 50, "question 50 characters");
  assert(!handoff.includes("1990") && !handoff.includes("Hà Nội"), "birth date and place never sent");
});

Deno.test("daily: mood, tone and nickname can be switched off; dateKey and rerollCount stay", () => {
  const c = G.daily[0];
  const off = resolveContextPolicy("daily_insight", { version: 1, blocks: { recentMood: { enabled: false }, tone: { enabled: false }, nickname: { enabled: false }, localDateTime: { enabled: false } } });
  const content = dailyContent(c, off);
  assert(!content.includes("recentMood") && !content.includes("bình yên"), "no mood");
  assert(!content.includes("\"tone\"") && !content.includes("\"nickname\""), "no tone or nickname");
  assert(content.includes("\"dateKey\":\"2026-11-14\"") && content.includes("\"rerollCount\":2"), "locked values stay");
  assert(!content.includes("localDateTime"), "extra values cannot refill a switched-off key");
  const sneaky = userDataValues({ language: "vi", policy: { localDateTime: false, nickname: false }, extra: { localDateTime: "x", nickname: "Lan" } }).values;
  assertEquals(sneaky, { language: "vi" }, "extra cannot carry a policy key");
});

Deno.test("council: history off sends no turns; the question and personas stay", () => {
  const c = G.council[0];
  const off = resolveContextPolicy("ai_council", { version: 1, blocks: { history: { enabled: false }, nickname: { enabled: false } } });
  const result = councilResult(c, off);
  assertEquals(result.sanitizedHistory, [], "no history");
  assert(result.content.includes(c.userMessage) && result.content.includes("\"slug\":\"sage\""), "question and personas stay");
  assert(!result.content.includes("\"nickname\""), "no nickname");
  assertEquals(boundCouncilHistory(c.history, { turns: 0 }), [], "zero turns means none, not all");
});

Deno.test("provider data class: never below the floor, rises with enabled blocks", () => {
  assertEquals(requestDataClass("public", []), "public", "public floor");
  assertEquals(requestDataClass("public", ["personal"]), "personal", "personal block raises");
  assertEquals(requestDataClass("personal", ["public", "sensitive"]), "sensitive", "sensitive block raises");
  assertEquals(requestDataClass("sensitive", ["public"]), "sensitive", "never below the floor");
  for (const [feature, spec] of Object.entries(CONTEXT_BLOCK_SPEC.features)) {
    assertEquals(spec.floorDataClass, featureDataClass(feature), `${feature} floor matches provider-registry`);
  }
  for (const feature of ["persona_chat", "daily_insight", "ai_council"] as ContextFeature[]) {
    assertEquals(resolveContextPolicy(feature, null).dataClass, featureDataClass(feature), `${feature} default class unchanged`);
  }
});

Deno.test("spec caps equal today's code constants", () => {
  const persona = CONTEXT_BLOCK_SPEC.features.persona_chat.blocks!;
  assertEquals([persona.history.limits.turns.max, persona.history.limits.chars.max], [8, 800], "persona history");
  assertEquals([persona.handoff.limits.questionChars.max, persona.handoff.limits.summaryChars.max], [300, 600], "handoff");
  const council = CONTEXT_BLOCK_SPEC.features.ai_council.blocks!;
  assertEquals([council.history.limits.turns.max, council.history.limits.chars.max], [12, 800], "council history");
  for (const feature of ["persona_chat", "daily_insight", "ai_council"]) {
    const goals = CONTEXT_BLOCK_SPEC.features[feature].blocks!.goals;
    assertEquals([goals.limits.maxItems.max, goals.limits.maxChars.max], [5, 60], `${feature} goals`);
  }
});

const env = (values: Record<string, string> = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "service-test" }) => ({ get: (name: string) => values[name] });
function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: string[] = [];
  const fn = ((url: URL | string) => {
    calls.push(String(url));
    return Promise.resolve(respond());
  }) as typeof fetch;
  return { fn, calls };
}
const rows = (body: unknown, status = 200) => () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.test("reader: active row parsed and cached for a minute", async () => {
  resetContextConfigCache();
  let clock = 1_000;
  const { fn, calls } = fakeFetch(rows([{ feature: "persona_chat", version: 2, blocks: { nickname: { enabled: false } } }, { feature: "tarot_reading", version: 1, blocks: {} }]));
  const deps = { env: env(), fetch: fn, now: () => clock };
  assertEquals(await readActiveContextConfig("persona_chat", deps), { feature: "persona_chat", version: 2, blocks: { nickname: { enabled: false } } }, "row");
  assertEquals(await readActiveContextConfig("daily_insight", deps), null, "no row");
  assertEquals(calls.length, 1, "one read");
  assert(calls[0].includes("ai_context_configs?select=feature,version,blocks&status=eq.active"), "query");
  clock += CONTEXT_CONFIG_CACHE_MS + 1;
  await readActiveContextConfig("persona_chat", deps);
  assertEquals(calls.length, 2, "re-read after the cache");
});

Deno.test("reader: any failure means today's behaviour", async () => {
  resetContextConfigCache();
  assertEquals(await readActiveContextConfig("persona_chat", { env: env({}), fetch: fakeFetch(rows([])).fn }), null, "no key");
  resetContextConfigCache();
  assertEquals(await readActiveContextConfig("persona_chat", { env: env({ SUPABASE_URL: "http://evil.example", SUPABASE_SERVICE_ROLE_KEY: "k" }), fetch: fakeFetch(rows([])).fn }), null, "http only on localhost");
  resetContextConfigCache();
  assertEquals(await readActiveContextConfig("persona_chat", { env: env(), fetch: fakeFetch(rows({ message: "missing" }, 404)).fn }), null, "missing table");
  resetContextConfigCache();
  assertEquals(await readActiveContextConfig("persona_chat", { env: env(), fetch: (() => Promise.reject(new Error("down"))) as typeof fetch }), null, "network error");
  resetContextConfigCache();
  const dup = [{ feature: "persona_chat", version: 1, blocks: {} }, { feature: "persona_chat", version: 2, blocks: {} }];
  assertEquals(await readActiveContextConfig("persona_chat", { env: env(), fetch: fakeFetch(rows(dup)).fn }), null, "duplicate active rows");
  resetContextConfigCache();
  let clock = 0;
  const failing = fakeFetch(rows({}, 500));
  await readActiveContextConfig("ai_council", { env: env(), fetch: failing.fn, now: () => clock });
  await readActiveContextConfig("ai_council", { env: env(), fetch: failing.fn, now: () => clock });
  assertEquals(failing.calls.length, 1, "error cached");
  clock += CONTEXT_CONFIG_ERROR_CACHE_MS + 1;
  await readActiveContextConfig("ai_council", { env: env(), fetch: failing.fn, now: () => clock });
  assertEquals(failing.calls.length, 2, "retry after the error cache");
  resetContextConfigCache();
  assertEquals(parseContextConfigRow({ feature: "persona_chat", version: 1, blocks: [] }), undefined, "blocks must be an object");
  assertEquals(parseContextConfigRow({ feature: "oracle_router", version: 1, blocks: {} }), undefined, "read-only features are never configurable");
});

Deno.test("persona: a shortened history limit still drops the app's copy of the current message", () => {
  const text = "Tôi muốn hỏi một câu khá dài về công việc. ".repeat(6).trim(); // about 250 characters
  const history = [{ role: "guide", text: "Chào bạn" }, { role: "user", text: text }];
  assertEquals(sanitizeHistory(history, text), [{ role: "assistant", content: "Chào bạn" }], "today: repeated message dropped");
  assertEquals(sanitizeHistory(history, text, { turns: 8, chars: 100 }), [{ role: "assistant", content: "Chào bạn" }], "limit 100: still dropped, no truncated duplicate");
  const other = [{ role: "user", text }];
  assertEquals(sanitizeHistory(other, "một câu khác", { turns: 8, chars: 100 }), [{ role: "user", content: text.slice(0, 100) }], "a different earlier turn is kept, shortened");
  // Above today's 800 characters the old code never matched either; that stays the same.
  const huge = "x".repeat(900);
  assertEquals(sanitizeHistory([{ role: "user", text: huge }], huge).length, 1, "over 800: kept as before");
});
