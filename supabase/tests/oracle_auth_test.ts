import { createOracleHandler } from "../functions/ai-oracle-turn/index.ts";
function assertEquals(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`mismatch: ${JSON.stringify(actual)}`);
}

function harness(mode = "valid") {
  const writes: unknown[] = [];
  let authCalls = 0;
  const handler = createOracleHandler({
    env: key => mode === "missing-env" ? undefined : key === "SUPABASE_URL" ? "https://qa.invalid" : "public-test-key",
    createClient: (() => ({
      auth: { getUser: () => {
        authCalls++;
        if (mode === "offline") throw Error("synthetic auth unavailable");
        return Promise.resolve(mode === "invalid"
          ? { data: { user: null }, error: { status: 401 } }
          : { data: { user: { id: "11111111-1111-4111-8111-111111111111", is_anonymous: mode === "anonymous" } }, error: null });
      } },
      from: (table: string) => ({ insert: (row: unknown) => { writes.push({ table, row }); return Promise.resolve({ error: null }); } })
    })) as unknown as NonNullable<Parameters<typeof createOracleHandler>[0]>["createClient"]
  });
  return { handler, writes, authCalls: () => authCalls };
}

Deno.test("Oracle rejects missing/malformed credentials before reading private input", async () => {
  const { handler, writes, authCalls } = harness();
  for (const authorization of [undefined, "Basic test", "Bearer", "Bearer two tokens"]) {
    const req = new Request("https://qa.invalid", { method: "POST", body: "private-not-json", headers: authorization ? { authorization } : {} });
    const result = await handler(req);
    assertEquals(result.status, 401);
    assertEquals(req.bodyUsed, false);
  }
  assertEquals(writes.length, 0);
  assertEquals(authCalls(), 0);
});

for (const mode of ["invalid", "offline", "anonymous", "missing-env"]) {
  Deno.test(`Oracle fails closed for ${mode}`, async () => {
    const { handler, writes } = harness(mode);
    const req = new Request("https://qa.invalid", { method: "POST", body: "private-not-json", headers: { authorization: "Bearer synthetic-token" } });
    const result = await handler(req);
    assertEquals(result.status, mode === "missing-env" || mode === "offline" ? 503 : 401);
    assertEquals(req.bodyUsed, false);
    assertEquals(writes.length, 0);
    assertEquals((await result.json()).reply, undefined);
  });
}

Deno.test("authenticated Oracle pins the compiled candidate and minimizes fallback event", async () => {
  const { handler, writes } = harness();
  const result = await handler(new Request("https://qa.invalid", {
    method: "POST", headers: { authorization: "Bearer synthetic-token", "Content-Type": "application/json" }, body: JSON.stringify({ userMessage: "draw tarot", language: "en" })
  }));
  assertEquals(result.status, 200);
  const body = await result.json();
  assertEquals(body.intent, "tarot_handoff");
  assertEquals(body.moderationStatus, "fallback");
  assertEquals(body.generationReason, "provider_gate_pending");
  assertEquals(body.providerDispatched, false);
  assertEquals(body.promptProvenance.locale, "en");
  assertEquals(body.persistenceStatus, "stored");
  assertEquals(writes.length, 1);
  assertEquals(JSON.stringify(writes).includes("draw tarot"), false);
});

Deno.test("Oracle keeps crisis routing local and does not call the model", async () => {
  const { handler } = harness();
  const result = await handler(new Request("https://qa.invalid", {
    method: "POST", headers: { authorization: "Bearer synthetic-token", "Content-Type": "application/json" }, body: JSON.stringify({ userMessage: "I want to kill myself", language: "en" })
  }));
  const body = await result.json();
  assertEquals(result.status, 200);
  assertEquals(body.intent, "safety_redirect");
  assertEquals(body.moderationStatus, "blocked");
  assertEquals(body.actionCards, []);
  assertEquals(body.generationReason, "self_harm_signal");
  assertEquals(body.providerDispatched, false);
});

Deno.test("Oracle factory cannot activate a provider from available keys or request data", async () => {
  const previousFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (() => { calls++; throw new Error("network dispatch forbidden in source candidate"); }) as typeof fetch;
  try {
    const { handler } = harness();
    const result = await handler(new Request("https://qa.invalid", {
      method: "POST", headers: { authorization: "Bearer synthetic-token", "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage: "Reflect with me", language: "en" })
    }));
    assertEquals(result.status, 200);
    assertEquals((await result.json()).generationReason, "provider_gate_pending");
    assertEquals(calls, 0);
  } finally { globalThis.fetch = previousFetch; }
});

Deno.test("CORS preflight does not process or persist messages", async () => {
  const { handler, writes, authCalls } = harness();
  assertEquals((await handler(new Request("https://qa.invalid", { method: "OPTIONS" }))).status, 200);
  assertEquals(authCalls(), 0);
  assertEquals(writes.length, 0);
});
