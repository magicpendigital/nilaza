import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createGuestDrawHandler } from "./handler.ts";
import { deriveGuestCards } from "../_shared/tarot-guest-seed.ts";

const SECRET = "synthetic-test-secret-only-0123456789abcdef";
const DEVICE = "8d2b6f1e-5c3a-4e7b-9a10-2f4c6d8e0a13";
const NOON_VN = "2026-11-15T05:00:00.000Z"; // 12:00 on 15 Nov in Vietnam

// null means "secret not set" (undefined would pick the default).
const handler = (secret: string | null = SECRET, now = NOON_VN) => createGuestDrawHandler(() => secret ?? undefined, { now: () => new Date(now) });
const post = (h: ReturnType<typeof handler>, body: unknown, headers: Record<string, string> = {}) => h(new Request("https://x.test/tarot-guest-draw", {
  method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body)
}));

Deno.test("guest function: no sign-in needed, returns the derived cards for the Vietnam day and writes nothing", async () => {
  const response = await post(handler(), { deviceId: DEVICE, spread: "love-three", topic: "love", question: "ignored and never read back" });
  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Cache-Control"), "no-store");
  assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
  const body = await response.json();
  assertEquals(body.status, "guest_draw");
  assertEquals(body.lockDate, "2026-11-15");
  assertEquals(body.nextDrawAt, "2026-11-15T17:00:00.000Z");
  assertEquals(body.cards, await deriveGuestCards(SECRET, DEVICE, "love-three", "love", "2026-11-15"));
  assertEquals(body.cards.map((card: { positionKey: string }) => card.positionKey), ["you", "other", "relationship"]);
  assertEquals(JSON.stringify(body).includes("never read back"), false, "the question is not part of the event or the answer");
  assertEquals(JSON.stringify(body).includes(SECRET), false);
  // Asking again is the same event; another Vietnam day is another one.
  assertEquals((await (await post(handler(), { deviceId: DEVICE, spread: "love-three", topic: "love" })).json()).cards, body.cards);
  const nextDay = await (await post(handler(SECRET, "2026-11-15T18:00:00.000Z"), { deviceId: DEVICE, spread: "love-three", topic: "love" })).json();
  assertEquals(nextDay.lockDate, "2026-11-16");
});

Deno.test("guest function: defaults, validation and the missing secret", async () => {
  const defaults = await (await post(handler(), { deviceId: DEVICE })).json();
  assertEquals([defaults.spread, defaults.topic, defaults.cards.length], ["daily-one", "open", 1]);
  for (const bad of [{}, { deviceId: "nope" }, { deviceId: 7 }, { deviceId: DEVICE, spread: "not-a-spread" }, { deviceId: DEVICE, spread: 3 }, { deviceId: DEVICE, topic: "my secret question" }]) {
    const response = await post(handler(), bad);
    assertEquals(response.status, 400, JSON.stringify(bad));
    assert(["invalid_device_id", "invalid_tarot_input"].includes((await response.json()).error));
  }
  const unset = await post(handler(null), { deviceId: DEVICE });
  assertEquals(unset.status, 503);
  assertEquals((await unset.json()).error, "guest_draw_unavailable");
  assertEquals((await post(handler("too-short"), { deviceId: DEVICE })).status, 503, "a short secret counts as not set");
});

Deno.test("guest function: CORS preflight, method, content type and body limits", async () => {
  const h = handler();
  const preflight = await h(new Request("https://x.test/tarot-guest-draw", { method: "OPTIONS" }));
  assertEquals(preflight.status, 200);
  assert((preflight.headers.get("Access-Control-Allow-Headers") ?? "").includes("apikey"));
  assertEquals((await h(new Request("https://x.test/tarot-guest-draw", { method: "GET" }))).status, 405);
  const notJson = await h(new Request("https://x.test/tarot-guest-draw", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" }));
  assertEquals(notJson.status, 415);
  assertEquals((await post(h, "{not json")).status, 400);
  assertEquals((await post(h, { deviceId: DEVICE, padding: "x".repeat(70_000) })).status, 413);
});
