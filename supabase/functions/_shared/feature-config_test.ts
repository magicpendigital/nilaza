import {
  configuredDailyLimit,
  FEATURE_CONFIG_CACHE_MS,
  FEATURE_CONFIG_ERROR_CACHE_MS,
  parseFeatureConfigRow,
  readActiveFeatureConfig,
  resetFeatureConfigCache
} from "./feature-config.ts";

function assertEquals(actual: unknown, expected: unknown, label = "") {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label} expected ${e}, got ${a}`);
}

const env = (values: Record<string, string | undefined> = { SUPABASE_URL: "https://project.example.co", SUPABASE_SERVICE_ROLE_KEY: "service-test-value" }) =>
  ({ get: (key: string) => values[key] });

function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const fn = (async (input: URL | RequestInfo, init?: RequestInit) => {
    calls.push({ url: String(input), headers: (init?.headers ?? {}) as Record<string, string> });
    return await respond();
  }) as typeof fetch;
  return { fn, calls };
}
const rows = (body: unknown, status = 200) => () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const daily = { feature: "daily_insight", version: 3, quota_daily: 4, quota_group: null, follow_ups: null, deadline_ms: 30000, cost_cap_micro: 20000,
  copy: { quotaExhausted: { vi: "Hết lượt hôm nay.", en: "No turns left today." } } };
const council = { feature: "ai_council", version: 1, quota_daily: 2, quota_group: null, follow_ups: 3, deadline_ms: null, cost_cap_micro: null, copy: {} };

Deno.test("no active config keeps today's limits (defaults)", async () => {
  resetFeatureConfigCache();
  const { fn } = fakeFetch(rows([]));
  const config = await readActiveFeatureConfig("persona_chat", { env: env(), fetch: fn });
  assertEquals(config, null, "empty table");
  assertEquals(configuredDailyLimit(config, 5), 5, "chat default");
  assertEquals(configuredDailyLimit(null, 1), 1, "tarot default");
});

Deno.test("an active config overrides the limit and carries the deadline", async () => {
  resetFeatureConfigCache();
  const { fn, calls } = fakeFetch(rows([daily, council]));
  const config = await readActiveFeatureConfig("daily_insight", { env: env(), fetch: fn });
  assertEquals(configuredDailyLimit(config, 3), 4, "daily override");
  assertEquals(config?.deadlineMs, 30000, "deadline");
  assertEquals(config?.costCapMicro, 20000, "cost cap stored");
  assertEquals(config?.copy.quotaExhausted?.vi, "Hết lượt hôm nay.", "copy");
  const councilConfig = await readActiveFeatureConfig("ai_council", { env: env(), fetch: fn });
  assertEquals([councilConfig?.quotaDaily, councilConfig?.followUps, councilConfig?.deadlineMs], [2, 3, undefined], "council");
  assertEquals(await readActiveFeatureConfig("tarot_reading", { env: env(), fetch: fn }), null, "other feature keeps defaults");
  assertEquals(calls.length, 1, "one read serves every feature from the cache");
  assertEquals(calls[0].url, "https://project.example.co/rest/v1/ai_feature_configs?select=feature,version,quota_daily,quota_group,follow_ups,deadline_ms,cost_cap_micro,copy&status=eq.active", "query");
  assertEquals(calls[0].headers.Authorization, "Bearer service-test-value", "service key header");
});

Deno.test("the cache refreshes after a minute", async () => {
  resetFeatureConfigCache();
  let clock = 1_000_000;
  let body: unknown[] = [daily];
  const { fn, calls } = fakeFetch(() => rows(body)());
  const deps = { env: env(), fetch: fn, now: () => clock };
  assertEquals((await readActiveFeatureConfig("daily_insight", deps))?.quotaDaily, 4, "first");
  body = [];
  clock += FEATURE_CONFIG_CACHE_MS - 1;
  assertEquals((await readActiveFeatureConfig("daily_insight", deps))?.quotaDaily, 4, "still cached");
  clock += 2;
  assertEquals(await readActiveFeatureConfig("daily_insight", deps), null, "refreshed: archived means defaults");
  assertEquals(calls.length, 2, "two reads");
});

Deno.test("errors fall back to defaults and retry later", async () => {
  for (const [label, respond] of [
    ["missing table (404)", rows({ code: "PGRST205" }, 404)],
    ["server error", rows({}, 500)],
    ["not a list", rows({ rows: [] })],
    ["network failure", () => { throw new TypeError("network"); }],
    ["duplicate active rows", rows([daily, { ...daily, version: 4 }])]
  ] as Array<[string, () => Response]>) {
    resetFeatureConfigCache();
    const { fn } = fakeFetch(respond);
    const config = await readActiveFeatureConfig("daily_insight", { env: env(), fetch: fn });
    assertEquals(config, null, label);
    assertEquals(configuredDailyLimit(config, 3), 3, `${label} default limit`);
  }
  resetFeatureConfigCache();
  let clock = 0, fail = true;
  const { fn, calls } = fakeFetch(() => fail ? rows({}, 503)() : rows([daily])());
  const deps = { env: env(), fetch: fn, now: () => clock };
  assertEquals(await readActiveFeatureConfig("daily_insight", deps), null, "outage");
  fail = false;
  assertEquals(await readActiveFeatureConfig("daily_insight", deps), null, "outage cached briefly");
  clock += FEATURE_CONFIG_ERROR_CACHE_MS;
  assertEquals((await readActiveFeatureConfig("daily_insight", deps))?.quotaDaily, 4, "recovered");
  assertEquals(calls.length, 2, "no read per request during the outage");
});

Deno.test("missing environment or unsafe URL never calls out", async () => {
  for (const [label, values] of [
    ["no key", { SUPABASE_URL: "https://project.example.co" }],
    ["no url", { SUPABASE_SERVICE_ROLE_KEY: "service-test-value" }],
    ["plain http remote", { SUPABASE_URL: "http://project.example.co", SUPABASE_SERVICE_ROLE_KEY: "k" }],
    ["url with path", { SUPABASE_URL: "https://project.example.co/x", SUPABASE_SERVICE_ROLE_KEY: "k" }]
  ] as Array<[string, Record<string, string>]>) {
    resetFeatureConfigCache();
    const { fn, calls } = fakeFetch(rows([daily]));
    assertEquals(await readActiveFeatureConfig("daily_insight", { env: env(values), fetch: fn }), null, label);
    assertEquals(calls.length, 0, `${label} no call`);
  }
});

Deno.test("out-of-range values are ignored field by field", () => {
  const parsed = parseFeatureConfigRow({ feature: "persona_chat", version: 2, quota_daily: 0, follow_ups: 3, deadline_ms: 200000, cost_cap_micro: -1,
    quota_group: "Chat Oracle", copy: { paused: { vi: "", en: "x" } } });
  assertEquals(parsed, { feature: "persona_chat", version: 2, copy: {} }, "all ignored; follow-ups only for Council");
  assertEquals(configuredDailyLimit(parsed ?? null, 5), 5, "default limit kept");
  assertEquals(parseFeatureConfigRow({ feature: "astrology_report", version: 1 }), undefined, "unknown feature");
  assertEquals(parseFeatureConfigRow({ feature: "daily_insight", version: 0 }), undefined, "bad version");
});
