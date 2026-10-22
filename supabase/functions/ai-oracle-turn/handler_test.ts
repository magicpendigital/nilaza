import { createOracleRuntimeHandler, ORACLE_EVENT_ACK_TIMEOUT_MS } from "./handler.ts";
import { MAX_AI_REQUEST_BYTES } from "../_shared/ai-request-guard.ts";

function equal(a: unknown, b: unknown) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`mismatch: ${JSON.stringify(a)}`); }
function assert(value: unknown, reason: string) { if (!value) throw new Error(reason); }
const userId = "11111111-1111-4111-8111-111111111111";
const message = "Mình muốn nhìn lại một ngày bối rối.";
function fixture(extra: Record<string, unknown> = {}) {
  const usage: unknown[] = [], safety: unknown[] = []; let authCalls = 0;
  const handler = createOracleRuntimeHandler({
    configured: true,
    authenticate: async () => { authCalls++; return { id: userId, isAnonymous: false }; },
    recordUsage: async (id, metadata) => { usage.push({ id, metadata }); return true; },
    recordSafety: async (id, reason) => { safety.push({ id, reason }); return true; },
    ...extra
  });
  return { handler, usage, safety, authCalls: () => authCalls };
}
function request(payload: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return new Request("https://fixture.invalid/ai-oracle-turn", {
    method: "POST", headers: { Authorization: "Bearer synthetic-token", "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ language: "vi", userMessage: message, ...payload })
  });
}

Deno.test("Oracle candidate reports fallback/unassessed and never represents LLM success", async () => {
  const f = fixture(), response = await f.handler(request());
  equal(response.status, 200); const body = await response.json();
  equal(body.moderationStatus, "fallback"); equal(body.generationStatus, "local_fallback");
  equal(body.generationReason, "provider_gate_pending"); equal(body.providerDispatched, false);
  equal(body.model, null); equal(body.tokenAssessment, "not-assessed");
  equal(body.runtimeReadiness.providerEnabled, false); equal(body.conversationPersisted, false);
  equal(body.usagePersistenceStatus, "stored"); equal(f.usage.length, 1);
  assert(!JSON.stringify(f.usage).includes(message), "private question entered usage log");
  assert(!JSON.stringify(body).includes("You are a Nilaza AI companion"), "system instructions leaked to caller");
});
Deno.test("Oracle VI/EN produce pinned locale provenance without implicit language fallback", async () => {
  for (const language of ["vi", "en"]) {
    const f = fixture(), body = await (await f.handler(request({ language }))).json();
    equal(body.promptProvenance.locale, language);
    equal(body.promptProvenance.modules.map((m: { kind: string }) => m.kind), ["core", "feature", "locale", "tone"]);
    equal(body.promptSource, "pinned_candidate_bundle");
  }
  for (const language of [null, "vi-VN", "th", "ja"]) {
    const f = fixture(), response = await f.handler(request({ language }));
    equal(response.status, 400); equal(await response.json(), { error: "unsupported_oracle_locale" }); equal(f.usage, []);
  }
});
Deno.test("Oracle crisis support handles audit phrases without context/compiler/provider/quota", async () => {
  for (const [language, userMessage] of [
    ["vi", "Mình không muốn sống nữa"], ["en", "I don't want to live"],
    ["vi", "Tôi định nhảy cầu tối nay"], ["vi", "Mình sắp uống hết thuốc ngủ"],
    ["en", "I am going to shoot myself tonight."]
  ]) {
    const f = fixture();
    // Malformed optional context cannot displace urgent support for a valid question.
    const response = await f.handler(request({ language, userMessage, profile: { tone: "unsupported" }, sanitizedHistory: [{ role: "system" }] }));
    equal(response.status, 200); const body = await response.json();
    equal(body.intent, "safety_redirect"); equal(body.actionCards, []); equal(body.handoffContext, undefined);
    equal(body.providerDispatched, false); equal(body.generationReason, "self_harm_signal");
    equal(body.promptProvenance, undefined); equal(f.safety, [{ id: userId, reason: "self_harm_signal" }]);
    assert(!JSON.stringify(f.usage).includes(userMessage), "crisis text entered audit");
    assert(!/Tarot|Council|[0-9]{3}/.test(body.reply), "crisis support contains inappropriate handoff/phone claim");
  }
});
Deno.test("Oracle regulated redirect is distinct from crisis support", async () => {
  const f = fixture(), body = await (await f.handler(request({ language: "en", userMessage: "Can you diagnose me?" }))).json();
  equal(body.generationReason, "regulated_request"); equal(body.actionCards, []);
  assert(!/emergency services/.test(body.reply), "routine professional boundary presented as crisis");
});
Deno.test("common words no longer force Tarot/Astrology navigation", async () => {
  for (const userMessage of ["Tại sao mình thấy áp lực?", "Mình còn nhiều bài tập", "My career feels uncertain", "Tôi muốn chết cười"]) {
    const f = fixture(), body = await (await f.handler(request({ userMessage }))).json(); equal(body.intent, "reflect");
  }
});
Deno.test("Oracle request failures have stable codes and do not log or reveal input", async () => {
  for (const payload of [{ userMessage: null }, { userMessage: "" }, { userId: "forged-owner" }, { sanitizedHistory: [{ role: "system", text: "private-secret" }] }]) {
    const f = fixture(), response = await f.handler(request(payload)); equal(response.status, 400);
    assert(!JSON.stringify(await response.json()).includes("private-secret"), "raw error exposed"); equal(f.usage, []); equal(f.safety, []);
  }
});
Deno.test("Oracle explicit caller consent and legacy tone mapping are reported truthfully", async () => {
  const f = fixture(), body = await (await f.handler(request({
    profile: { nickname: "Fictional name", goals: ["private-goal"], tone: "wise" },
    sanitizedHistory: [{ role: "user", text: "private-history" }],
    recentSafeContext: [{ title: "private-journal" }], consentFlags: { profile: true, history: true, journalMemory: true }
  }))).json();
  equal(body.contextPolicy.effectiveTone, "balanced"); equal(body.contextPolicy.toneMapping, "legacy_unsupported_to_balanced");
  equal(body.contextPolicy.historyUsedCount, 1); equal(body.contextPolicy.journalContextUsedCount, 0);
  equal(body.contextPolicy.consentAuthority, "explicit_caller_assertion_not_persisted_permission");
  assert(!/private-|Fictional name/.test(JSON.stringify(f.usage)), "private context entered usage events");
});
Deno.test("Oracle uses shared content type/actual byte bound; rejected bodies never persist", async () => {
  const f = fixture();
  const wrong = await f.handler(request({}, { "Content-Type": "text/plain" })); equal(wrong.status, 415);
  const large = new Request("https://fixture.invalid", { method: "POST", headers: { Authorization: "Bearer test", "Content-Type": "application/json" }, body: " ".repeat(MAX_AI_REQUEST_BYTES + 1) });
  equal((await f.handler(large)).status, 413); equal(f.usage, []);
});
Deno.test("Oracle auth/config failures do not read or process private body", async () => {
  for (const [extra, status] of [
    [{ configured: false }, 503], [{ authenticate: async () => null }, 401],
    [{ authenticate: async () => ({ id: userId, isAnonymous: true }) }, 401],
    [{ authenticate: async () => ({ id: userId }) }, 401],
    [{ authenticate: async () => { throw Error("private auth secret"); } }, 503]
  ] as const) {
    const f = fixture(extra), req = request(); equal((await f.handler(req)).status, status); equal(req.bodyUsed, false); equal(f.usage, []);
  }
});
Deno.test("Oracle logging outage cannot turn static support into raw error or lose response", async () => {
  const f = fixture({ recordUsage: async () => { throw Error("private database error"); }, recordSafety: async () => { throw Error("private safety error"); } });
  const response = await f.handler(request({ userMessage: "Mình muốn tự tử" })), body = await response.json();
  equal(response.status, 200); equal(body.usagePersistenceStatus, "usage_error"); equal(body.safetyPersistenceStatus, "safety_error");
  assert(!JSON.stringify(body).includes("private"), "raw error exposed");
});
Deno.test("stalled audit ACK cannot indefinitely delay crisis support or claim a stored event", async () => {
  const f = fixture({ recordUsage: () => new Promise(() => {}), recordSafety: () => new Promise(() => {}) });
  const start = performance.now(), response = await f.handler(request({ userMessage: "Mình không muốn sống nữa" })), body = await response.json();
  equal(response.status, 200); equal(body.usagePersistenceStatus, "unconfirmed"); equal(body.safetyPersistenceStatus, "unconfirmed");
  assert(performance.now() - start < ORACLE_EVENT_ACK_TIMEOUT_MS + 1000, "stalled logging prevented bounded support response");
});
Deno.test("Oracle unsupported method and preflight never authenticate", async () => {
  const f = fixture();
  equal((await f.handler(new Request("https://fixture.invalid", { method: "OPTIONS" }))).status, 200);
  equal((await f.handler(new Request("https://fixture.invalid", { method: "GET" }))).status, 405);
  equal(f.authCalls(), 0); equal(f.usage, []);
});
