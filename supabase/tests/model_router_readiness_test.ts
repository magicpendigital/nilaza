import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { providerReadiness } from "../functions/admin-model-router-config/readiness.ts";

Deno.test("readiness only reports fixed secret names and booleans, never values", () => {
  const read: string[] = [];
  const result = providerReadiness(name => { read.push(name); return name === "OPENAI_API_KEY" ? "synthetic-secret-do-not-return" : undefined; });
  assertEquals(read, ["OPENAI_API_KEY", "GEMINI_API_KEY", "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY", "DEEPSEEK_API_KEY"]);
  assertEquals(result[0].configured, true);
  assertEquals(result[1].configured, false);
  assertEquals(JSON.stringify(result).includes("synthetic-secret"), false);
  assertEquals(result.every(row => row.verification === "not_tested"), true);
});
Deno.test("empty secret is not configured", () => {
  assertEquals(providerReadiness(() => "  ").every(row => !row.configured), true);
});
