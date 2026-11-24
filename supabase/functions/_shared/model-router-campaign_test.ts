// Batch C integration: resolveFeatureRoute applies a running model campaign on top of the active route.
import { defaultModelRoutes, experimentTraceMetadata, resolveFeatureRoute } from "./model-router.ts";
import { clearCampaignCache, parseCampaignRoute } from "./model-campaign.ts";

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}

const CAMPAIGN_ID = "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6";
const USER = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-11-24T03:00:00.000Z");
const step = (model: string, extra: Record<string, unknown> = {}) => ({
  provider: "openrouter", model, timeout_ms: 20000, max_tokens: 700, temperature: 0.5, json_mode: true, reasoning: null, ...extra
});
// Every bucket lands in B (A has 1 %, B 99 %) except bucket 0; the test user id below is checked not to be bucket 0.
const running = (feature: string, route: Record<string, unknown>) => ({
  id: CAMPAIGN_ID, feature, status: "running", startsAt: null, endsAt: null, audience: { signedInOnly: true },
  variants: [
    { key: "A", label: "Hiện tại", trafficPercent: 1, route: { steps: [step("model-a")] } },
    { key: "B", label: "Thử", trafficPercent: 99, route }
  ]
});
const rpcClient = (data: unknown, error: unknown = null) => ({
  calls: 0,
  rpc(_name: string, _params?: Record<string, unknown>) { this.calls += 1; return Promise.resolve({ data, error }); }
});

Deno.test("resolveFeatureRoute: no campaign keeps the active route and experiment null", async () => {
  clearCampaignCache();
  const none = rpcClient(null);
  const result = await resolveFeatureRoute(null, "tarot_note", USER, { campaignClient: none, now: NOW });
  assertEquals(result.route, defaultModelRoutes.tarot_note, "active route unchanged");
  assertEquals(result.experiment, null, "no experiment");
  assertEquals(none.calls, 1, "campaign looked up once");
  const noClient = await resolveFeatureRoute(null, "tarot_note", USER);
  assertEquals(noClient, { route: defaultModelRoutes.tarot_note, experiment: null }, "without a service client no campaign is read");
});

Deno.test("resolveFeatureRoute: a running campaign gives the variant route and experiment tags", async () => {
  clearCampaignCache();
  const client = rpcClient(running("tarot_note", { steps: [step("model-b"), step("model-b2")], total_deadline_ms: 45000 }));
  const result = await resolveFeatureRoute(null, "tarot_note", USER, { campaignClient: client, now: NOW, locale: "vi" });
  assertEquals(result.experiment, { campaignId: CAMPAIGN_ID, variant: "B" }, "bucketed into B");
  assertEquals([result.route.primaryModel, result.route.fallbackModel, result.route.totalDeadlineMs], ["model-b", "model-b2", 45000], "variant chain applied");
  assertEquals(result.route.responseSchema, defaultModelRoutes.tarot_note.responseSchema, "schema stays from the active route");
  assertEquals(experimentTraceMetadata(result.experiment), { campaignId: CAMPAIGN_ID, variant: "B" }, "flat trace keys");
  assertEquals(experimentTraceMetadata(null), {}, "no keys without a campaign");
});

Deno.test("resolveFeatureRoute: a reader_router variant may start with a decision step; the legacy pair stays chat-only", async () => {
  clearCampaignCache();
  const decision = { provider: "openrouter_decisions", model: "typesafe/jev-1.14", timeout_ms: 3000, max_tokens: 64, temperature: 0, json_mode: false, reasoning: null };
  const client = rpcClient(running("reader_router", { steps: [decision, step("chat-b", { timeout_ms: 3000, max_tokens: 200 })] }));
  const result = await resolveFeatureRoute(null, "reader_router", USER, { campaignClient: client, now: NOW });
  assertEquals(result.experiment?.variant, "B", "reader_router campaign used");
  assertEquals([result.route.steps?.[0].provider, result.route.primaryProvider, result.route.primaryModel], ["openrouter_decisions", "openrouter", "chat-b"], "decision first, chat primary");
  assertEquals(parseCampaignRoute({ steps: [decision] }, "reader_router"), null, "a chain needs a chat step");
  assertEquals(parseCampaignRoute({ steps: [decision, step("x")] }, "tarot_note"), null, "decision steps only for reader_router");
});

Deno.test("resolveFeatureRoute: a campaign lookup that throws keeps the active route", async () => {
  clearCampaignCache();
  const throwing = { rpc: () => { throw new Error("network down"); } };
  const result = await resolveFeatureRoute(null, "tarot_reading", USER, { campaignClient: throwing, now: NOW });
  assertEquals(result, { route: defaultModelRoutes.tarot_reading, experiment: null }, "rpc throw");
  const rejecting = await resolveFeatureRoute(null, "tarot_reading", USER, {
    campaignClient: rpcClient(null), now: NOW, resolveCampaign: () => Promise.reject(new Error("boom"))
  });
  assertEquals(rejecting, { route: defaultModelRoutes.tarot_reading, experiment: null }, "resolver rejection");
  clearCampaignCache();
  const rpcError = await resolveFeatureRoute(null, "tarot_reading", USER, { campaignClient: rpcClient(null, { message: "denied" }), now: NOW });
  assertEquals(rpcError.experiment, null, "rpc error");
});
