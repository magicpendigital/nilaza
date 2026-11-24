import { assertEquals, assertThrows } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { MODEL_ROUTE_PUBLISH_CONTRACT, modelRouteRpcPayload } from "../admin-model-router-config/contract.ts";
import { parseCampaignRoute } from "../_shared/model-campaign.ts";
import { campaignRouteToStored, evaluateMetrics, rpcErrorResponse, saveDraftPayload, statusParams, winnerPayload } from "./contract.ts";

const CAMPAIGN = "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6";
const REQUEST = "11111111-1111-4111-8111-111111111111";
const step = (model: string, extra: Record<string, unknown> = {}) => ({ provider: "openrouter", model, timeoutMs: 30000, maxTokens: 1500, temperature: 0.5, jsonMode: true, reasoning: null, ...extra });
const draft = (overrides: Record<string, unknown> = {}) => ({
  action: "save_draft", feature: "tarot_reading", name: "Tarot model thử",
  variants: [
    { key: "A", label: "Hiện tại", trafficPercent: 50, route: { steps: [step("a/one"), step("a/two")], totalDeadlineMs: 90000 } },
    { key: "B", label: "Thử", trafficPercent: 50, route: { steps: [step("b/one", { reasoning: { mode: "low", maxTokens: 512 } })] } }
  ],
  ...overrides
});

Deno.test("variant steps convert exactly like the route publish contract", () => {
  const steps = [step("a/one"), step("a/two", { provider: "anthropic", jsonMode: false })];
  const published = modelRouteRpcPayload({
    contractVersion: MODEL_ROUTE_PUBLISH_CONTRACT, feature: "persona_chat", publishRequestId: REQUEST, expectedActiveId: null, status: "draft",
    version: "v", responseSchema: "s", fallbackWhen: [], safetyPolicy: {}, steps, totalDeadlineMs: 90000
  }) as Record<string, unknown>;
  const stored = campaignRouteToStored({ steps, totalDeadlineMs: 90000 });
  assertEquals(stored.steps, published.steps);
  assertEquals(stored.total_deadline_ms, 90000);
  // The runtime reads the stored shape back with the router parser.
  assertEquals(parseCampaignRoute(stored)?.steps[1].provider, "anthropic");
  assertEquals(campaignRouteToStored({ steps: [step("x/y")] }).total_deadline_ms, null);
});

Deno.test("saveDraftPayload maps camelCase to the SQL payload", () => {
  const payload = saveDraftPayload(draft({ startsAt: "2026-11-25T00:00:00Z", audience: { signedInOnly: true, locales: ["vi"] }, stopRules: { maxFormatFailRate: 0.05, maxCostMultiplier: 2 } }));
  assertEquals(Object.keys(payload), ["feature", "name", "starts_at", "ends_at", "audience", "stop_rules", "variants"]);
  assertEquals(payload.starts_at, "2026-11-25T00:00:00.000Z");
  assertEquals(payload.variants.map((v: any) => [v.key, v.traffic_percent, v.route.steps.length]), [["A", 50, 2], ["B", 50, 1]]);
  assertEquals(payload.variants[1].route.steps[0].reasoning, { mode: "low", maxTokens: 512 });
  assertEquals(saveDraftPayload(draft({ id: CAMPAIGN })).id, CAMPAIGN);
  assertEquals(saveDraftPayload(draft({ feature: "tarot_note" })).feature, "tarot_note");
  assertEquals(saveDraftPayload(draft()).audience, { signedInOnly: true });
});

Deno.test("saveDraftPayload refuses invalid campaigns", () => {
  const bad: Array<[string, Record<string, unknown>]> = [
    ["feature", { feature: "face_reading" }],
    ["name", { name: "x" }],
    ["traffic total", { variants: [{ key: "A", label: "a", trafficPercent: 60, route: { steps: [step("a/b")] } }, { key: "B", label: "b", trafficPercent: 30, route: { steps: [step("c/d")] } }] }],
    ["one variant", { variants: [{ key: "A", label: "a", trafficPercent: 99, route: { steps: [step("a/b")] } }] }],
    ["duplicate key", { variants: [{ key: "A", label: "a", trafficPercent: 50, route: { steps: [step("a/b")] } }, { key: "A", label: "b", trafficPercent: 50, route: { steps: [step("c/d")] } }] }],
    ["bad step", { variants: [{ key: "A", label: "a", trafficPercent: 50, route: { steps: [step("a/b", { maxTokens: 10 })] } }, { key: "B", label: "b", trafficPercent: 50, route: { steps: [step("c/d")] } }] }],
    ["deadline", { variants: [{ key: "A", label: "a", trafficPercent: 50, route: { steps: [step("a/b")], totalDeadlineMs: 10000 } }, { key: "B", label: "b", trafficPercent: 50, route: { steps: [step("c/d")] } }] }],
    ["dates", { startsAt: "2026-11-25T00:00:00Z", endsAt: "2026-11-24T00:00:00Z" }],
    ["audience", { audience: { country: "VN" } }],
    ["locales", { audience: { locales: ["fr"] } }],
    ["stop rules", { stopRules: { maxFormatFailRate: 2 } }],
    ["extra key", { userId: "x" }]
  ];
  for (const [name, overrides] of bad) assertThrows(() => saveDraftPayload(draft(overrides)), Error, undefined, name);
});

Deno.test("status and winner payloads", () => {
  assertEquals(statusParams({ action: "start", campaignId: CAMPAIGN }), { campaign_id: CAMPAIGN, action: "start", note: null });
  assertThrows(() => statusParams({ action: "delete", campaignId: CAMPAIGN }));
  assertThrows(() => statusParams({ action: "pause", campaignId: "x" }));
  const winner = winnerPayload({ action: "pick_winner", campaignId: CAMPAIGN, variant: "B", note: "B rẻ hơn và ít lỗi định dạng", expectedActiveId: null, publishRequestId: REQUEST });
  assertEquals(winner, { campaign_id: CAMPAIGN, variant: "B", note: "B rẻ hơn và ít lỗi định dạng", expected_active_id: null, publish_request_id: REQUEST });
  assertThrows(() => winnerPayload({ campaignId: CAMPAIGN, variant: "B", note: "ngắn", expectedActiveId: null, publishRequestId: REQUEST }));
  assertThrows(() => winnerPayload({ campaignId: CAMPAIGN, variant: "B", note: "B rẻ hơn và ít lỗi", publishRequestId: REQUEST }), Error, "expectedActiveId");
  assertThrows(() => winnerPayload({ campaignId: CAMPAIGN, variant: "E", note: "B rẻ hơn và ít lỗi", expectedActiveId: null, publishRequestId: REQUEST }));
});

Deno.test("evaluateMetrics computes rates and warns only with enough data", () => {
  const result = evaluateMetrics({ variants: [
    { variant: "A", calls: 200, avgCostMicro: 1000, formatFailCalls: 2, modelFallbackCalls: 10, cannedFallbackCalls: 1, noteFeedbackYes: 30, noteFeedbackNo: 10 },
    { variant: "B", calls: 150, avgCostMicro: 2500, formatFailCalls: 15 },
    { variant: "C", calls: 20, avgCostMicro: 9000, formatFailCalls: 10 }
  ] }, { maxFormatFailRate: 0.05, maxCostMultiplier: 2 });
  const [a, b, c] = result.variants as any[];
  assertEquals([a.formatFailRate, a.modelFallbackRate, a.noteYesRate, a.stopRuleBreached], [0.01, 0.05, 0.75, []]);
  assertEquals([b.formatFailRate, b.costMultiplier, b.stopRuleBreached], [0.1, 2.5, ["maxFormatFailRate", "maxCostMultiplier"]]);
  assertEquals([c.enoughData, c.stopRuleBreached], [false, []]);
  assertEquals(evaluateMetrics({}).variants, []);
});

Deno.test("rpc errors map to HTTP statuses and a missing RPC names the migration", () => {
  assertEquals(rpcErrorResponse({ code: "PGRST202" }).status, 412);
  assertEquals((rpcErrorResponse({ code: "PGRST202" }).body as any).migration, "20261124090100_model_campaigns.sql");
  assertEquals(rpcErrorResponse({ code: "42501" }).status, 403);
  assertEquals(rpcErrorResponse({ code: "23505" }).status, 409);
  assertEquals(rpcErrorResponse({ code: "40001" }).status, 409);
  assertEquals(rpcErrorResponse({ code: "P0002" }).status, 404);
  assertEquals(rpcErrorResponse({ code: "22023" }).status, 400);
});
