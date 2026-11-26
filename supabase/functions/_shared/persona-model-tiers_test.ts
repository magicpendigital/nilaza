// Persona chat model tiers (Owner 25/11/2026). No network: the Admin row read uses a fake fetch.
import {
  defaultPersonaTierConfig,
  parsePersonaTier,
  parsePersonaTierConfig,
  readPersonaTierConfig,
  resetPersonaTierCache,
  resolvePersonaTier,
  tierDeadlineMs,
  tierMetadata,
  tierRoute
} from "./persona-model-tiers.ts";

function assert(value: unknown, label: string) { if (!value) throw new Error(label); }
function equal(actual: unknown, expected: unknown, label: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}

const KNOWLEDGE_BOOKS = ["book-strategic-thinker", "book-harmony-guide", "book-stoic-journal", "book-dhammapada", "book-i-ching"];

Deno.test("tiers: the five knowledge books use deep_knowledge; every other persona keeps standard (today's route)", () => {
  const config = defaultPersonaTierConfig();
  assert(config.source === "code_default" && config.version === null, "code defaults");
  for (const id of KNOWLEDGE_BOOKS) {
    const tier = resolvePersonaTier(config, { id, slug: id.replace(/^book-/, "") });
    assert(tier.key === "deep_knowledge" && tier.matchedBy === "persona_id", `${id} deep`);
    assert(tier.outputStyle === "knowledge" && tier.reasoning?.mode !== "off", `${id} knowledge style, reasoning on`);
    equal(tier.history, { turns: 12, chars: 2500 }, `${id} history`);
  }
  // Slug only (older clients send the slug) still finds the book.
  assert(resolvePersonaTier(config, { slug: "i-ching" }).matchedBy === "book_slug", "book-<slug> lookup");
  for (const persona of [{ id: "communication-mentor", slug: "communication-mentor" }, { id: "book-atomic-habits" }, null, undefined, { id: 42 }]) {
    const tier = resolvePersonaTier(config, persona as never);
    assert(tier.key === "standard" && tier.useActiveRoute && tier.matchedBy === "default", `standard for ${JSON.stringify(persona)}`);
    assert(tier.history === undefined && tier.outputStyle === "concise", "standard keeps 8 x 800 history and the concise style");
    assert(tierRoute(tier, 135_000) === undefined, "standard never overrides the active route");
  }
});

Deno.test("tiers: deadlines stay under the platform cap (Free plan 150 s)", () => {
  const config = defaultPersonaTierConfig();
  const deep = resolvePersonaTier(config, { id: "book-i-ching" });
  equal(config.platform, { wallClockMs: 150_000, safetyMarginMs: 15_000, nonStreamMaxMs: 140_000 }, "platform");
  assert(tierDeadlineMs(deep, config.platform, true) === 135_000, "stream: wall clock minus margin");
  assert(tierDeadlineMs(deep, config.platform, false) === 135_000, "non-stream: also capped");
  const paid = parsePersonaTierConfig({ ...structuredClone(config), tiers: { deep_knowledge: { ...deep, useActiveRoute: false } }, platform: { wallClockMs: 400_000 } }, 3);
  const paidDeep = resolvePersonaTier(paid, { id: "book-i-ching" });
  assert(tierDeadlineMs(paidDeep, paid.platform, true) === 300_000, "paid plan: the 300 s wish applies when streaming");
  assert(tierDeadlineMs(paidDeep, paid.platform, false) === 140_000, "paid plan: non-stream still stays under the 150 s idle limit");
  const odd = parsePersonaTierConfig({ platform: { wallClockMs: 999_999 } }, 4);
  assert(odd.platform.wallClockMs === 150_000, "unknown wall clock falls back to the code value");
  const standard = resolvePersonaTier(config, { id: "x" });
  assert(tierDeadlineMs(standard, config.platform, false) === 135_000, "a tier without timeoutMs takes the cap");
});

Deno.test("tiers: the deep_knowledge route is a step chain with reasoning, raised output and a total deadline", () => {
  const deep = resolvePersonaTier(defaultPersonaTierConfig(), { id: "book-stoic-journal" });
  const route = tierRoute(deep, 135_000)!;
  assert(route && route.feature === "persona_chat" && route.version === "persona-tier-deep_knowledge-code", "route identity");
  assert(route.totalDeadlineMs === 135_000 && route.steps!.length === 2, "two steps, total deadline");
  equal(route.steps!.map((s) => s.timeoutMs), [Math.floor(135_000 * 0.65), 135_000], "first step share, last step the rest");
  assert(route.steps!.every((s) => s.maxTokens === 8000 && s.reasoning.mode === "medium" && !s.jsonMode), "per-step limits");
  assert(route.primaryProvider === "openrouter" && route.fallbackModel === route.steps![1].model, "legacy fields mirror the steps");
  equal(tierMetadata(deep, 135_000), {
    modelTier: "deep_knowledge", modelTierSource: "code_default", modelTierConfigVersion: null, modelTierMatchedBy: "persona_id", modelTierDeadlineMs: 135_000
  }, "metadata");
});

Deno.test("tiers: unsafe Admin values are dropped, never run", () => {
  assert(parsePersonaTier("deep_knowledge", { useActiveRoute: false, steps: [] }) === undefined, "no steps");
  assert(parsePersonaTier("deep_knowledge", { useActiveRoute: false, steps: [{ provider: "evil", model: "m" }] }) === undefined, "unknown provider");
  assert(parsePersonaTier("deep_knowledge", { useActiveRoute: false, steps: [{ provider: "openrouter", model: "bad model id!" }] }) === undefined, "bad model id");
  const five = Array.from({ length: 5 }, () => ({ provider: "openrouter", model: "a/b" }));
  assert(parsePersonaTier("deep_knowledge", { useActiveRoute: false, steps: five }) === undefined, "too many steps");
  const clamped = parsePersonaTier("premium", {
    useActiveRoute: false, steps: [{ provider: "openrouter", model: "a/b" }],
    maxOutputTokens: 999_999, timeoutMs: 1, temperature: 9, costCapMicro: -1, primaryShare: 2,
    reasoning: { mode: "high", maxTokens: 99_999 }, history: { turns: 50, chars: 10 }, outputStyle: "essay", label: { vi: "", en: "x".repeat(41) }
  })!;
  assert(clamped.maxOutputTokens === 2000 && clamped.timeoutMs === 140_000 && clamped.temperature === 0.68, "out-of-range values use safe defaults");
  assert(clamped.costCapMicro === undefined && clamped.primaryShare === 0.65 && clamped.history === undefined, "no cap override, default share, no history raise");
  equal(clamped.reasoning, { mode: "high" }, "reasoning budget dropped, mode kept");
  equal(clamped.label, { vi: "Cao cấp", en: "Premium" }, "labels fall back");
  assert(clamped.outputStyle === "concise", "unknown style is concise");
  // A row with a broken deep tier: the books fall back to standard instead of failing the chat.
  const broken = parsePersonaTierConfig({ tiers: { deep_knowledge: { useActiveRoute: false } } }, 7);
  const tier = resolvePersonaTier(broken, { id: "book-dhammapada" });
  assert(tier.key === "standard" && tier.matchedBy === "missing_tier_fallback" && tier.configVersion === 7, "missing tier falls back to standard");
  // An Admin map may move a persona to another tier.
  const moved = parsePersonaTierConfig({ tiers: { standard: { useActiveRoute: true } }, personaTiers: { "communication-mentor": "standard" } }, 8);
  assert(resolvePersonaTier(moved, { id: "book-i-ching" }).key === "standard", "a row's map replaces the code map");
});

Deno.test("tiers: the active Admin row is read once and cached; errors keep the code defaults", async () => {
  resetPersonaTierCache();
  let calls = 0;
  let clock = 1_000;
  const env = { get: (name: string) => ({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "service-test" } as Record<string, string>)[name] };
  const row = { version: 5, config: { ...structuredClone(defaultPersonaTierConfig()), personaTiers: { "book-i-ching": "deep_knowledge" } } };
  const fetchRow = ((url: string | URL) => {
    calls += 1;
    assert(String(url).includes("ai_persona_model_tiers") && String(url).includes("status=eq.active"), "reads the active row");
    return Promise.resolve(new Response(JSON.stringify([row]), { status: 200 }));
  }) as typeof fetch;
  try {
    const first = await readPersonaTierConfig({ env, fetch: fetchRow, now: () => clock });
    const second = await readPersonaTierConfig({ env, fetch: fetchRow, now: () => clock });
    assert(first.version === 5 && first.source === "admin_config" && second === first && calls === 1, "cached");
    assert(resolvePersonaTier(first, { id: "book-dhammapada" }).key === "standard", "row map in force");
    clock += 61_000;
    resetPersonaTierCache();
    const failing = (() => Promise.resolve(new Response("nope", { status: 500 }))) as typeof fetch;
    const fallback = await readPersonaTierConfig({ env, fetch: failing, now: () => clock });
    assert(fallback.source === "code_default", "a failed read keeps the code defaults");
    resetPersonaTierCache();
    const two = (() => Promise.resolve(new Response(JSON.stringify([row, row]), { status: 200 }))) as typeof fetch;
    assert((await readPersonaTierConfig({ env, fetch: two, now: () => clock })).source === "code_default", "two active rows: code defaults");
    resetPersonaTierCache();
    const noEnv = await readPersonaTierConfig({ env: { get: () => undefined }, fetch: fetchRow, now: () => clock });
    assert(noEnv.source === "code_default" && calls === 1, "no Supabase env: no read");
  } finally {
    resetPersonaTierCache();
  }
});

Deno.test("tiers: every deep_knowledge persona has a bundled knowledge brief", async () => {
  const { KNOWLEDGE_BRIEFS } = await import("./knowledge-briefs.generated.ts");
  const config = defaultPersonaTierConfig();
  for (const [persona, tier] of Object.entries(config.personaTiers)) {
    if (config.tiers[tier]?.outputStyle !== "knowledge") continue;
    assert(KNOWLEDGE_BRIEFS.some((brief) => brief.personaId === persona && brief.text.length > 200), `${persona} has a brief`);
  }
});
