import { featureEnabledStrict, featurePaused } from "./feature-switch.ts";
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

Deno.test("the strict switch (numerology_private_message) runs only on an explicit enabled=true row", async () => {
  const feature = "numerology_private_message";
  assertEquals(await featureEnabledStrict(reader({ data: { enabled: true }, error: null }), feature), true, "on");
  assertEquals(await featureEnabledStrict(reader({ data: { enabled: false }, error: null }), feature), false, "off");
  assertEquals(await featureEnabledStrict(reader({ data: null, error: null }), feature), false, "no row");
  assertEquals(await featureEnabledStrict(reader({ data: { enabled: "true" }, error: null }), feature), false, "not a boolean");
  assertEquals(await featureEnabledStrict(reader({ data: null, error: { code: "42P01" } }), feature), false, "no table");
  assertEquals(await featureEnabledStrict(reader(new Error("network")), feature), false, "throws");
  assertEquals(await featureEnabledStrict(null, feature), false, "no client");
});

Deno.test("the strict switch also guards numerology_report (2026-11-28): no row means off", async () => {
  assertEquals(await featureEnabledStrict(reader({ data: null, error: null }), "numerology_report"), false, "no row");
  assertEquals(await featureEnabledStrict(reader({ data: { enabled: true }, error: null }), "numerology_report"), true, "on");
});
