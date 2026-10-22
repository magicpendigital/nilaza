import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { cleanUtm, normalizeEmail, sha256 } from "./helpers.ts";

Deno.test("normalizes valid email without accepting malformed input", () => {
  assertEquals(normalizeEmail("  Hello@Example.COM "), "hello@example.com");
  assertEquals(normalizeEmail("not-an-email"), null);
});

Deno.test("keeps only bounded UTM fields", () => {
  assertEquals(cleanUtm({ utm_source: " social ", ignored: "secret" }), { utm_source: "social" });
});

Deno.test("hashes deterministically", async () => {
  assertEquals(await sha256("a"), "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb");
});
