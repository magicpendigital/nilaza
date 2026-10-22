import test from "node:test";
import assert from "node:assert/strict";
import { verifyTurnstile } from "../supabase/functions/marketing-waitlist/turnstile.ts";

const hostname = "nilaza.magicpendigital.com";
test("missing configuration and malformed tokens cannot call the provider", async () => {
  const request = async () => { assert.fail("must not make a verification request"); };
  for (const [secret, token, host] of [[undefined, "token", hostname], [" ", "token", hostname], ["secret", null, hostname], ["secret", " ", hostname], ["secret", "x".repeat(2049), hostname], ["secret", "token", ""]]) {
    assert.equal(await verifyTurnstile(secret, token, null, host, request), false);
  }
});
test("requires successful verification on the expected website", async () => {
  const request = async (url, options) => {
    assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.equal(options.method, "POST");
    assert.equal(options.body.get("secret"), "secret");
    assert.equal(options.body.get("response"), "token");
    assert.equal(options.body.get("remoteip"), "192.0.2.1");
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json({ success: true, hostname });
  };
  assert.equal(await verifyTurnstile("secret", "token", "192.0.2.1", hostname, request), true);
});
test("rejects failed, wrong-host and malformed provider results", async () => {
  for (const result of [{ success: false, hostname }, { success: true, hostname: "other.example" }, { success: true }, { success: "true", hostname }, null, []]) {
    assert.equal(await verifyTurnstile("secret", "token", null, hostname, async () => Response.json(result)), false);
  }
});
test("HTTP, JSON and network failures stay closed", async () => {
  for (const request of [async () => Response.json({ success: true, hostname }, { status: 503 }), async () => new Response("invalid-json"), async () => { throw new Error("network unavailable"); }]) {
    assert.equal(await verifyTurnstile("secret", "token", null, hostname, request), false);
  }
});
test("verification aborts after the timeout", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const pending = verifyTurnstile("secret", "token", null, hostname, async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  }));
  context.mock.timers.tick(8000);
  assert.equal(await pending, false);
});
