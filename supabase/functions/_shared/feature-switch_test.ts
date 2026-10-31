import { featurePaused } from "./feature-switch.ts";
function assertEquals(actual: unknown, expected: unknown, label = "") { if (actual !== expected) throw new Error(`${label} expected ${expected}, got ${actual}`); }

const reader = (result: { data: { enabled?: unknown } | null; error: unknown } | Error) => ({
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => result instanceof Error ? Promise.reject(result) : Promise.resolve(result) }) }) })
});

Deno.test("only an explicit off pauses a feature", async () => {
  assertEquals(await featurePaused(reader({ data: { enabled: false }, error: null }), "ai_council"), true, "off");
  assertEquals(await featurePaused(reader({ data: { enabled: true }, error: null }), "ai_council"), false, "on");
});

Deno.test("a missing table, row or failed read leaves the feature on", async () => {
  assertEquals(await featurePaused(reader({ data: null, error: null }), "persona_chat"), false, "no row");
  assertEquals(await featurePaused(reader({ data: null, error: { code: "42P01" } }), "persona_chat"), false, "no table");
  assertEquals(await featurePaused(reader(new Error("network")), "persona_chat"), false, "throws");
  assertEquals(await featurePaused(null, "astrology_insight"), false, "no client");
});
