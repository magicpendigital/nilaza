import {
  CAMPAIGN_CACHE_MS,
  applyCampaignRoute,
  clearCampaignCache,
  parseCampaignRoute,
  pickVariant,
  resolveCampaignRoute,
  stableBucket
} from "./model-campaign.ts";
import type { ModelRoute } from "./model-provider.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}

const CAMPAIGN_ID = "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6";
const step = (model: string, extra: Record<string, unknown> = {}) => ({
  provider: "openrouter", model, timeout_ms: 30000, max_tokens: 1200, temperature: 0.6, json_mode: true, reasoning: null, ...extra
});
function campaign(overrides: Record<string, unknown> = {}) {
  return {
    id: CAMPAIGN_ID, feature: "tarot_reading", status: "running", startsAt: null, endsAt: null,
    audience: { signedInOnly: true },
    variants: [
      { key: "A", label: "Hiện tại", trafficPercent: 50, route: { steps: [step("model-a"), step("model-a2")], total_deadline_ms: 90000 } },
      { key: "B", label: "Thử", trafficPercent: 50, route: { steps: [step("model-b")] } }
    ],
    ...overrides
  };
}
function client(data: unknown, error: unknown = null) {
  const calls: Array<{ name: string; params?: Record<string, unknown> }> = [];
  return {
    calls,
    rpc(name: string, params?: Record<string, unknown>) {
      calls.push({ name, params });
      return Promise.resolve({ data, error });
    }
  };
}
const NOW = new Date("2026-11-24T10:00:00Z");

Deno.test("stableBucket is deterministic and spread across 0-99", () => {
  assertEquals(stableBucket(CAMPAIGN_ID, "user-1"), stableBucket(CAMPAIGN_ID, "user-1"), "same input, same bucket");
  const counts = new Array(2).fill(0);
  for (let i = 0; i < 2000; i += 1) {
    const bucket = stableBucket(CAMPAIGN_ID, `user-${i}`);
    assert(bucket >= 0 && bucket < 100 && Number.isInteger(bucket), "bucket in range");
    counts[bucket < 50 ? 0 : 1] += 1;
  }
  assert(counts[0] > 850 && counts[1] > 850, `roughly even split: ${counts}`);
});

Deno.test("pickVariant uses cumulative traffic sorted by key", () => {
  const split = [{ key: "B", trafficPercent: 30 }, { key: "A", trafficPercent: 70 }];
  assertEquals(pickVariant(split, 0), "A", "bucket 0");
  assertEquals(pickVariant(split, 69), "A", "bucket 69");
  assertEquals(pickVariant(split, 70), "B", "bucket 70");
  assertEquals(pickVariant(split, 99), "B", "bucket 99");
  assertEquals(pickVariant([{ key: "A", trafficPercent: 34 }, { key: "B", trafficPercent: 33 }, { key: "C", trafficPercent: 33 }], 67), "C", "three-way");
});

Deno.test("pickVariant refuses invalid splits", () => {
  assertEquals(pickVariant([{ key: "A", trafficPercent: 50 }, { key: "B", trafficPercent: 40 }], 10), null, "total 90");
  assertEquals(pickVariant([{ key: "A", trafficPercent: 100 }], 10), null, "single variant");
  assertEquals(pickVariant([{ key: "A", trafficPercent: 50 }, { key: "A", trafficPercent: 50 }], 10), null, "duplicate key");
  assertEquals(pickVariant([{ key: "E", trafficPercent: 50 }, { key: "A", trafficPercent: 50 }], 10), null, "unknown key");
  assertEquals(pickVariant([{ key: "A", trafficPercent: 50.5 }, { key: "B", trafficPercent: 49.5 }], 10), null, "fractional");
  assertEquals(pickVariant([{ key: "A", trafficPercent: 50 }, { key: "B", trafficPercent: 50 }], 100), null, "bucket out of range");
});

Deno.test("parseCampaignRoute validates with the router parser and the deadline", () => {
  const route = parseCampaignRoute({ steps: [step("m1"), step("m2")], total_deadline_ms: 90000 });
  assertEquals(route?.steps.map((item) => item.model), ["m1", "m2"], "steps parsed");
  assertEquals(route?.totalDeadlineMs, 90000, "deadline kept");
  assertEquals(route?.steps[0].timeoutMs, 30000, "camelCase runtime step");
  assertEquals(parseCampaignRoute({ steps: [step("m1", { provider: "unknown" })] }), null, "unknown provider");
  assertEquals(parseCampaignRoute({ steps: [] }), null, "empty chain");
  assertEquals(parseCampaignRoute({ steps: [step("m1")], extra: true }), null, "unknown key");
  assertEquals(parseCampaignRoute({ steps: [step("m1", { timeout_ms: 60000 })], total_deadline_ms: 30000 }), null, "step longer than deadline");
  assertEquals(parseCampaignRoute({ steps: [step("m1")], total_deadline_ms: 1000 }), null, "deadline below minimum");
});

Deno.test("resolveCampaignRoute returns the bucketed variant with trace tags", async () => {
  clearCampaignCache();
  const supabase = client(campaign());
  const userId = "user-42";
  const expected = stableBucket(CAMPAIGN_ID, userId) < 50 ? "A" : "B";
  const result = await resolveCampaignRoute(supabase, "tarot_reading", userId, NOW);
  assertEquals(result?.experiment, { campaignId: CAMPAIGN_ID, variant: expected }, "experiment tags");
  assertEquals(result?.route.steps[0].model, expected === "A" ? "model-a" : "model-b", "variant route");
  assertEquals(supabase.calls[0], { name: "runtime_model_campaign_for_feature", params: { feature_input: "tarot_reading" } }, "service RPC");
});

Deno.test("resolveCampaignRoute caches per feature for 60 seconds", async () => {
  clearCampaignCache();
  const supabase = client(campaign());
  await resolveCampaignRoute(supabase, "tarot_reading", "user-1", NOW);
  await resolveCampaignRoute(supabase, "tarot_reading", "user-2", new Date(NOW.getTime() + CAMPAIGN_CACHE_MS - 1));
  assertEquals(supabase.calls.length, 1, "cached within 60 s");
  await resolveCampaignRoute(supabase, "tarot_reading", "user-2", new Date(NOW.getTime() + CAMPAIGN_CACHE_MS));
  assertEquals(supabase.calls.length, 2, "refreshed after 60 s");
  const empty = client(null);
  clearCampaignCache();
  assertEquals(await resolveCampaignRoute(empty, "tarot_reading", "user-1", NOW), null, "no campaign");
  await resolveCampaignRoute(empty, "tarot_reading", "user-1", NOW);
  assertEquals(empty.calls.length, 1, "a missing campaign is cached too");
});

Deno.test("resolveCampaignRoute respects status, dates and audience", async () => {
  const cases: Array<[string, Record<string, unknown>, Record<string, unknown>?]> = [
    ["paused", { status: "paused" }],
    ["other feature", { feature: "persona_chat" }],
    ["not started", { startsAt: "2026-11-25T00:00:00Z" }],
    ["ended", { endsAt: "2026-11-24T09:59:59Z" }],
    ["bad date", { startsAt: "not a date" }],
    ["locale mismatch", { audience: { signedInOnly: true, locales: ["en"] } }, { locale: "vi" }],
    ["locale missing", { audience: { locales: ["vi"] } }],
    ["unknown audience key", { audience: { country: "VN" } }],
    ["signed out", {}, { signedIn: false }],
    ["bad traffic", { variants: [{ key: "A", trafficPercent: 60, route: { steps: [step("a")] } }, { key: "B", trafficPercent: 30, route: { steps: [step("b")] } }] }],
    ["bad id", { id: "not-a-uuid" }]
  ];
  for (const [name, overrides, options] of cases) {
    clearCampaignCache();
    assertEquals(await resolveCampaignRoute(client(campaign(overrides)), "tarot_reading", "user-1", NOW, options ?? {}), null, name);
  }
  clearCampaignCache();
  const inWindow = await resolveCampaignRoute(client(campaign({ startsAt: "2026-11-24T09:00:00Z", endsAt: "2026-11-25T00:00:00Z", audience: { signedInOnly: true, locales: ["vi", "en"] } })), "tarot_reading", "user-1", NOW, { locale: "vi-VN" });
  assert(inWindow, "inside the window with a matching locale");
});

Deno.test("resolveCampaignRoute returns null on any error or invalid route", async () => {
  clearCampaignCache();
  assertEquals(await resolveCampaignRoute(client(null, { code: "42501" }), "tarot_reading", "user-1", NOW), null, "rpc error");
  clearCampaignCache();
  const throwing = { rpc: () => Promise.reject(new Error("network")) };
  assertEquals(await resolveCampaignRoute(throwing, "tarot_reading", "user-1", NOW), null, "thrown error");
  assertEquals(await resolveCampaignRoute(null, "tarot_reading", "user-1", NOW), null, "no client");
  assertEquals(await resolveCampaignRoute(client(campaign()), "unknown_feature", "user-1", NOW), null, "unknown feature");
  assertEquals(await resolveCampaignRoute(client(campaign()), "tarot_reading", "", NOW), null, "no user");
  clearCampaignCache();
  const broken = campaign({ variants: [
    { key: "A", trafficPercent: 50, route: { steps: [step("a", { max_tokens: 10 })] } },
    { key: "B", trafficPercent: 50, route: { steps: [step("b", { max_tokens: 10 })] } }
  ] });
  assertEquals(await resolveCampaignRoute(client(broken), "tarot_reading", "user-1", NOW), null, "invalid route");
});

Deno.test("applyCampaignRoute keeps schema and safety, swaps the chain", () => {
  const base: ModelRoute = {
    id: "route-1", feature: "tarot_reading", version: "v3", status: "active", primaryProvider: "anthropic", primaryModel: "old",
    fallbackProvider: "openai", fallbackModel: "old-2", temperature: 0.2, maxOutputTokens: 900, responseSchema: "tarot_reading_output_v3",
    fallbackWhen: ["provider_timeout"], safetyPolicy: { crisis: "115" }, totalDeadlineMs: 120000
  };
  const route = parseCampaignRoute({ steps: [step("new-1")] })!;
  const applied = applyCampaignRoute(base, route);
  assertEquals([applied.primaryProvider, applied.primaryModel, applied.fallbackModel], ["openrouter", "new-1", undefined], "chain swapped");
  assertEquals([applied.responseSchema, applied.safetyPolicy, applied.fallbackWhen], [base.responseSchema, base.safetyPolicy, base.fallbackWhen], "contract kept");
  assertEquals(applied.totalDeadlineMs, undefined, "base deadline dropped when the variant has none");
  assertEquals([applied.temperature, applied.maxOutputTokens, applied.steps?.length], [0.6, 1200, 1], "first step drives legacy fields");
});
