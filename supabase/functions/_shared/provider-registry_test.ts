import {
  PROVIDER_REGISTRY_CACHE_MS,
  defaultProviderRegistry,
  featureDataClass,
  parseProviderRows,
  readProviderRegistry,
  reportProviderOutcome,
  resetProviderRegistryCache,
  secretPresent
} from "./provider-registry.ts";

function assert(value: unknown, label: string) { if (!value) throw new Error(label); }

const env = (values: Record<string, string>) => ({ get: (key: string) => values[key] });
const supabaseEnv = env({ SUPABASE_URL: "https://project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "service-test" });
const providerRows = [
  { provider: "openrouter", priority: 1, enabled: true, secret_name: "OPENROUTER_API_KEY", allowed_data_class: "sensitive" },
  { provider: "anthropic", priority: 2, enabled: true, secret_name: "ANTHROPIC_API_KEY", allowed_data_class: "personal" },
  { provider: "groq", priority: 3, enabled: true, secret_name: "GROQ_API_KEY", allowed_data_class: "public" }
];
const healthRows = [{ provider: "anthropic", configured: true, failures: 3, opened_until: "2099-01-01T00:00:00Z" }];

Deno.test("A7: seeded defaults: OpenRouter on, direct providers off, DeepSeek public only", () => {
  const registry = defaultProviderRegistry();
  assert([...registry.keys()].join() === "openrouter,anthropic,gemini,openai,deepseek", "Owner order");
  assert(registry.get("openrouter")!.enabled && ![...registry.values()].slice(1).some((p) => p.enabled), "only OpenRouter on");
  assert(registry.get("deepseek")!.allowedDataClass === "public", "DeepSeek public only");
  assert(featureDataClass("persona_chat") === "sensitive" && featureDataClass("tarot_reading") === "personal" && featureDataClass("unknown") === "sensitive", "feature data classes (unknown = strictest)");
});

Deno.test("A7: rows parse with health; unknown providers are ignored", () => {
  const registry = parseProviderRows(providerRows, healthRows)!;
  assert(registry.size === 2 && !registry.has("groq" as never), "groq ignored");
  const anthropic = registry.get("anthropic")!;
  assert(anthropic.configured === true && anthropic.failures === 3 && anthropic.openedUntil === Date.parse("2099-01-01T00:00:00Z"), "health merged");
  assert(registry.get("openrouter")!.configured === null && registry.get("openrouter")!.openedUntil === null, "no health row = unknown");
  assert(parseProviderRows({ error: "x" }, []) === null && parseProviderRows([], []) === null, "unusable bodies");
});

Deno.test("A7: registry read uses the service key over REST, caches, and keeps the last good copy on errors", async () => {
  resetProviderRegistryCache();
  let now = 1_000_000, calls = 0, fail = false;
  const seen: string[] = [];
  const fetch = ((url: URL, init: RequestInit) => {
    calls++;
    seen.push(`${url.pathname}${url.search}|${(init.headers as Record<string, string>).apikey}`);
    if (fail) return Promise.reject(new TypeError("down"));
    return Promise.resolve(new Response(JSON.stringify(url.pathname.endsWith("ai_providers") ? providerRows : healthRows)));
  }) as unknown as typeof globalThis.fetch;
  const first = await readProviderRegistry({ env: supabaseEnv, fetch, now: () => now });
  assert(first.fromTables && first.registry.get("anthropic")!.enabled, "read from tables");
  assert(seen.every((item) => item.endsWith("|service-test")) && seen.some((item) => item.startsWith("/rest/v1/ai_providers?select=")), "service key REST");
  await readProviderRegistry({ env: supabaseEnv, fetch, now: () => now });
  assert(calls === 2, "cached");
  now += PROVIDER_REGISTRY_CACHE_MS + 1; fail = true;
  const stale = await readProviderRegistry({ env: supabaseEnv, fetch, now: () => now });
  assert(stale.fromTables && stale.registry.get("anthropic")!.enabled, "last good copy kept during an outage");
  resetProviderRegistryCache();
  const none = await readProviderRegistry({ env: env({}), fetch, now: () => now });
  assert(!none.fromTables && !none.registry.get("anthropic")!.enabled, "no env: seeded defaults");
});

Deno.test("A7: runtime reports call record_ai_provider_probe with the service role and update the local copy", async () => {
  resetProviderRegistryCache();
  const posts: Array<{ path: string; body: any }> = [];
  const fetch = ((url: URL, init: RequestInit) => {
    if (init.method === "POST") { posts.push({ path: url.pathname, body: JSON.parse(String(init.body)) }); return Promise.resolve(new Response("{}")); }
    return Promise.resolve(new Response(JSON.stringify(url.pathname.endsWith("ai_providers") ? providerRows : [])));
  }) as unknown as typeof globalThis.fetch;
  const { registry } = await readProviderRegistry({ env: supabaseEnv, fetch });
  assert(await reportProviderOutcome("anthropic", { result: "failure", errorClass: "payment", httpStatus: 402 }, { env: supabaseEnv, fetch }), "report sent");
  assert(posts[0].path === "/rest/v1/rpc/record_ai_provider_probe", "RPC path");
  assert(JSON.stringify(posts[0].body) === JSON.stringify({ provider_input: "anthropic", payload: { source: "runtime", result: "failure", errorClass: "payment", httpStatus: 402 } }), "content-free body");
  assert((registry.get("anthropic")!.openedUntil ?? 0) > Date.now() + 4 * 60_000, "billing failure opens the local circuit for 5 minutes");
  await reportProviderOutcome("anthropic", { result: "ok" }, { env: supabaseEnv, fetch });
  assert(registry.get("anthropic")!.openedUntil === null && registry.get("anthropic")!.failures === 0, "success closes it");
  assert(!(await reportProviderOutcome("anthropic", { result: "ok" }, { env: env({}), fetch })), "no env: nothing sent");
});

Deno.test("A7: secret presence never exposes the value", () => {
  const values: Record<string, string> = { OPENROUTER_API_KEY: "sk-or-secret", EMPTY_KEY: "   " };
  assert(secretPresent("OPENROUTER_API_KEY", (key) => values[key]) === true, "present");
  assert(secretPresent("EMPTY_KEY", (key) => values[key]) === false, "blank is missing");
  assert(secretPresent("bad name", (key) => values[key]) === false, "only well-formed names are looked up");
  assert(typeof secretPresent("OPENROUTER_API_KEY", (key) => values[key]) === "boolean", "boolean only");
});

Deno.test("A7 review: a provider with no usable row keeps its seeded default instead of vanishing from chains", async () => {
  resetProviderRegistryCache();
  const rows = [{ provider: "anthropic", priority: 2, enabled: true, secret_name: "ANTHROPIC_API_KEY", allowed_data_class: "personal" },
    { provider: "openrouter", priority: 1, enabled: true, secret_name: "OPENROUTER_API_KEY", allowed_data_class: "bogus_class" }];
  const fetch = ((url: URL) => Promise.resolve(new Response(JSON.stringify(url.pathname.endsWith("ai_providers") ? rows : [])))) as unknown as typeof globalThis.fetch;
  const { registry, fromTables } = await readProviderRegistry({ env: supabaseEnv, fetch });
  assert(fromTables && registry.get("anthropic")!.enabled, "explicit row applies");
  const or = registry.get("openrouter")!;
  assert(or.enabled && or.allowedDataClass === "sensitive", "malformed OpenRouter row falls back to the seeded default (on, sensitive)");
  assert(!registry.get("deepseek")!.enabled && registry.get("deepseek")!.allowedDataClass === "public", "absent provider keeps its default (off, public)");
  resetProviderRegistryCache();
});
