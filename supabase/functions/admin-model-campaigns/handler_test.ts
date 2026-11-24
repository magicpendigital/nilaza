import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createModelCampaignsHandler, jsonResponse, type RpcClient } from "./handler.ts";

const CAMPAIGN = "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6";
const REQUEST = "11111111-1111-4111-8111-111111111111";
const step = (model: string) => ({ provider: "openrouter", model, timeoutMs: 30000, maxTokens: 1500, temperature: 0.5, jsonMode: true, reasoning: null });

function setup(responses: Record<string, { data?: unknown; error?: unknown }> = {}, denied?: Response) {
  const calls: Array<{ name: string; args?: Record<string, unknown> }> = [];
  const supabase: RpcClient = {
    rpc(name, args) {
      calls.push({ name, args });
      const hit = responses[name] ?? { data: null, error: null };
      return Promise.resolve({ data: hit.data ?? null, error: hit.error ?? null });
    }
  };
  const handler = createModelCampaignsHandler(async () => denied ? { error: denied } : { supabase });
  const call = (method: string, body?: unknown, path = "") => handler(new Request(`https://x.test/admin-model-campaigns${path}`, {
    method, headers: { Authorization: "Bearer t", "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) })
  }));
  return { call, calls };
}

Deno.test("GET lists campaigns and adds metrics for non-draft campaigns only", async () => {
  const { call, calls } = setup({
    admin_list_model_campaigns: { data: [
      { id: CAMPAIGN, status: "running", stopRules: { maxFormatFailRate: 0.05 } },
      { id: "22222222-2222-4222-8222-222222222222", status: "draft" }
    ] },
    admin_get_model_campaign_metrics: { data: { variants: [{ variant: "A", calls: 120, formatFailCalls: 12 }, { variant: "B", calls: 3 }] } }
  });
  const res = await call("GET");
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Cache-Control"), "no-store");
  const body = await res.json();
  assertEquals(body.campaigns.length, 2);
  assertEquals(Object.keys(body.metrics), [CAMPAIGN]);
  assertEquals(body.metrics[CAMPAIGN].variants[0].stopRuleBreached, ["maxFormatFailRate"]);
  assertEquals(body.metrics[CAMPAIGN].variants[1].enoughData, false);
  assertEquals(calls.map((item) => item.name), ["admin_list_model_campaigns", "admin_get_model_campaign_metrics"]);
  assertEquals(calls[0].args, { feature_filter: null });
});

Deno.test("GET names the migration when the RPC does not exist", async () => {
  const res = await setup({ admin_list_model_campaigns: { error: { code: "PGRST202" } } }).call("GET");
  assertEquals(res.status, 412);
  assertEquals((await res.json()).code, "migration_missing");
  assertEquals((await setup().call("GET", undefined, "?feature=face")).status, 400);
});

Deno.test("POST maps each action to its RPC", async () => {
  const { call, calls } = setup({ admin_save_model_campaign_draft: { data: { id: CAMPAIGN, status: "draft" } } });
  const saved = await call("POST", { action: "save_draft", feature: "tarot_reading", name: "Thử model", variants: [
    { key: "A", label: "A", trafficPercent: 50, route: { steps: [step("a/b")] } },
    { key: "B", label: "B", trafficPercent: 50, route: { steps: [step("c/d")] } }
  ] });
  assertEquals(saved.status, 200);
  assertEquals((await saved.json()).campaign.id, CAMPAIGN);
  await call("POST", { action: "start", campaignId: CAMPAIGN });
  await call("POST", { action: "pause", campaignId: CAMPAIGN, note: "Lỗi định dạng cao" });
  await call("POST", { action: "pick_winner", campaignId: CAMPAIGN, variant: "A", note: "A ổn định và rẻ hơn", expectedActiveId: null, publishRequestId: REQUEST });
  assertEquals(calls.map((item) => item.name), ["admin_save_model_campaign_draft", "admin_set_model_campaign_status", "admin_set_model_campaign_status", "admin_pick_model_campaign_winner"]);
  assertEquals(calls[1].args, { campaign_id: CAMPAIGN, action: "start", note: null });
  assertEquals((calls[3].args as any).payload.publish_request_id, REQUEST);
});

Deno.test("POST refuses invalid input before calling the database", async () => {
  const { call, calls } = setup();
  for (const body of [{ action: "delete" }, { action: "start", campaignId: "x" }, { action: "save_draft", feature: "tarot_reading", name: "x", variants: [] }, "not json", []]) {
    const res = await call("POST", body);
    assertEquals(res.status, 400, JSON.stringify(body));
  }
  assertEquals(calls.length, 0);
  assertEquals((await call("POST", "x".repeat(70 * 1024))).status, 413);
});

Deno.test("POST maps conflicts and permission errors", async () => {
  const conflict = await setup({ admin_set_model_campaign_status: { error: { code: "23505" } } }).call("POST", { action: "start", campaignId: CAMPAIGN });
  assertEquals(conflict.status, 409);
  const forbidden = await setup({ admin_set_model_campaign_status: { error: { code: "42501" } } }).call("POST", { action: "end", campaignId: CAMPAIGN });
  assertEquals(forbidden.status, 403);
});

Deno.test("auth failures, CORS preflight and methods", async () => {
  assertEquals((await setup({}, jsonResponse({ error: "Admin role required" }, 403)).call("GET")).status, 403);
  assertEquals((await setup({}, jsonResponse({ error: "Unauthorized" }, 401)).call("POST", { action: "start", campaignId: CAMPAIGN })).status, 401);
  const preflight = await setup().call("OPTIONS");
  assertEquals(preflight.status, 200);
  assertEquals(preflight.headers.get("Access-Control-Allow-Origin"), "*");
  assertEquals((await setup().call("DELETE")).status, 405);
});
