// Nil P1-B: client side of the Astrology lock (replay of a stored reading, soft delete through an RPC).
import response from "../../../../../../packages/agent-config/astrology-ai-insight/fixtures/valid-response.json";
import request from "../../../../../../packages/agent-config/astrology-ai-insight/fixtures/valid-request.json";
import { deleteAstrologyAiReportForChart, deleteAstrologyAiReports, requestAstrologyAiInsight } from "../../../backendClient";
import type { AstrologyAiInvocation } from "../astrologyAiInsight";

const mockCalls: Array<{ kind: string; name: string; args?: unknown }> = [];
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from(table: string) {
      mockCalls.push({ kind: "from", name: table });
      throw new Error("tables are read-only for the app");
    },
    rpc(name: string, args: unknown) {
      mockCalls.push({ kind: "rpc", name, args });
      const builder: any = {
        abortSignal: () => builder,
        then: (resolve: (value: unknown) => void, reject: (error: unknown) => void) => Promise.resolve({ data: 1, error: null }).then(resolve, reject),
      };
      return builder;
    },
  })),
}));

const options = { baseUrl: "https://qa.invalid/functions/v1", supabaseUrl: "https://qa.invalid", apiKey: "public-test-key", authToken: "token-A", userId: "A" };
const invocation = request as unknown as AstrologyAiInvocation;
const storedContext = { selectedFactIds: request.selectedFactIds, facts: request.facts, caveats: request.caveats };

beforeEach(() => { mockCalls.length = 0; });

function reply(body: unknown, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
}

test("a fresh reading is checked against the request facts and is not marked as a replay", async () => {
  reply({ report: response, replay: { replayed: false, topic: "overview" } });
  const result = await requestAstrologyAiInsight(invocation, options);
  expect(result.replayed).toBe(false);
  expect(result.context?.selectedFactIds).toEqual(invocation.selectedFactIds);
});

test("a replayed reading is checked against the stored facts, even if the new request selected others", async () => {
  const narrowed = { ...invocation, selectedFactIds: invocation.selectedFactIds.slice(0, 1) };
  reply({ report: response, replay: { replayed: true, topic: "overview" }, replayContext: storedContext });
  const result = await requestAstrologyAiInsight(narrowed, options);
  expect(result.replayed).toBe(true);
  expect(result.context).toEqual({ chart: narrowed.chart, ...storedContext });
  // Without the stored facts, a replay cannot be verified and is refused.
  reply({ report: response, replay: { replayed: true } });
  await expect(requestAstrologyAiInsight(narrowed, options)).rejects.toMatchObject({ code: "invalid_server_response" });
});

test("server codes for in-progress and replay problems reach the screen unchanged", async () => {
  reply({ error: { code: "report_in_progress", message: "busy" } }, 409);
  await expect(requestAstrologyAiInsight(invocation, options)).rejects.toMatchObject({ code: "report_in_progress", status: 409 });
});

test("deleting readings uses the soft-delete RPC and never deletes table rows", async () => {
  await deleteAstrologyAiReportForChart(options, "chart-1");
  await deleteAstrologyAiReports(options);
  expect(mockCalls).toEqual([
    { kind: "rpc", name: "astrology_soft_delete_reports", args: { p_client_chart_id: "chart-1" } },
    { kind: "rpc", name: "astrology_soft_delete_reports", args: { p_client_chart_id: null } },
  ]);
  await deleteAstrologyAiReports({ ...options, authToken: undefined });
  expect(mockCalls).toHaveLength(2);
});
