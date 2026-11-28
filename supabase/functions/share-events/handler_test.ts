import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  createShareEventsHandler, DAILY_EVENT_LIMIT, MAX_EVENTS_PER_REQUEST, parseShareEvents, PRODUCT_EVENT_NAMES, type CampaignRow, type UsageEventRow
} from "./handler.ts";

const USER = "11111111-1111-4111-8111-111111111111";

const LIVE_CAMPAIGN = "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6";

function setup(options: { campaigns?: Record<string, CampaignRow | "error">; user?: { id: string; isAnonymous?: boolean } | null; recent?: number; insertError?: boolean; configured?: boolean } = {}) {
  const inserted: UsageEventRow[][] = [];
  const counted: { userId: string; sinceIso: string }[] = [];
  const lookups: string[] = [];
  const campaigns = options.campaigns ?? { [LIVE_CAMPAIGN]: { status: "running" } };
  const handler = createShareEventsHandler(() => options.configured === false ? null : {
    authenticate: async () => options.user === undefined ? { id: USER, isAnonymous: false } : options.user,
    countRecent: async (userId, sinceIso) => { counted.push({ userId, sinceIso }); return options.recent ?? 0; },
    insert: async rows => { inserted.push(rows); return { error: options.insertError ? { message: "db down" } : null }; },
    campaignRow: async id => {
      lookups.push(id);
      const row = campaigns[id];
      if (row === "error") throw new Error("db down");
      return row ?? null;
    }
  }, () => Date.UTC(2026, 10, 12, 12, 0, 0));
  const call = (body: unknown, init: { headers?: Record<string, string> } = {}) => handler(new Request("https://x.test/share-events", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer token-abc", ...init.headers },
    body: typeof body === "string" ? body : JSON.stringify(body)
  }));
  return { call, inserted, counted, lookups };
}

const tap = { name: "share_tapped", surface: "today_card", action: "image" };
const done = { name: "share_completed", surface: "astro_invite", action: "link", outcome: "returned" };

Deno.test("stores enumerated events for the verified user only, with feature share", async () => {
  const { call, inserted } = setup();
  const res = await call({ events: [tap, done] });
  assertEquals(res.status, 202);
  assertEquals(await res.json(), { accepted: 2 });
  assertEquals(inserted[0], [
    { user_id: USER, event_name: "share_tapped", feature: "share", metadata: { surface: "today_card", action: "image" } },
    { user_id: USER, event_name: "share_completed", feature: "share", metadata: { surface: "astro_invite", action: "link", outcome: "returned" } }
  ]);
});

// 28/11/2026: the app already sends numerology_map (Bản đồ số, Lô 3) and now daily_sky (Bầu trời hôm nay).
// Before this list change the whole request for those surfaces was answered 400 and nothing was stored.
Deno.test("stores share events for the number map and today's sky surfaces", async () => {
  const { call, inserted } = setup();
  const res = await call({ events: [
    { name: "share_tapped", surface: "numerology_map", action: "image" },
    { name: "share_completed", surface: "numerology_map", action: "link", outcome: "returned" },
    { name: "share_tapped", surface: "daily_sky", action: "image" },
    { name: "share_completed", surface: "daily_sky", action: "image", outcome: "unavailable" }
  ] });
  assertEquals(res.status, 202);
  assertEquals(await res.json(), { accepted: 4 });
  assertEquals(inserted[0].map((row) => row.metadata.surface), ["numerology_map", "numerology_map", "daily_sky", "daily_sky"]);
  assertEquals(inserted[0].every((row) => row.feature === "share"), true);
});

Deno.test("still rejects surfaces outside the list, including near-misses of the new ones", async () => {
  for (const surface of ["numerology", "numerology_map ", "Daily_Sky", "daily-sky", "sky", "astro_daily"]) {
    const { call, inserted } = setup();
    const res = await call({ events: [{ name: "share_tapped", surface, action: "image" }] });
    assertEquals(res.status, 400, surface);
    assertEquals(inserted.length, 0);
  }
});

// 28/11/2026 (share cards v2, S1): the quote card is a new surface, and image shares say which size was chosen.
Deno.test("stores the book quote surface and the image format", async () => {
  const { call, inserted } = setup();
  const res = await call({ events: [
    { name: "share_tapped", surface: "book_quote", action: "image", format: "story" },
    { name: "share_completed", surface: "book_quote", action: "image", outcome: "returned", format: "story" },
    { name: "share_completed", surface: "today_card", action: "image", outcome: "returned", format: "post" },
    { name: "share_tapped", surface: "book_quote", action: "link" }
  ] });
  assertEquals(res.status, 202);
  assertEquals(inserted[0].map((row) => row.metadata), [
    { surface: "book_quote", action: "image", format: "story" },
    { surface: "book_quote", action: "image", outcome: "returned", format: "story" },
    { surface: "today_card", action: "image", outcome: "returned", format: "post" },
    { surface: "book_quote", action: "link" }
  ]);
});

Deno.test("rejects a format outside the list, a format on a link share and a non-string format", async () => {
  for (const event of [
    { name: "share_tapped", surface: "today_card", action: "image", format: "square" },
    { name: "share_tapped", surface: "today_card", action: "image", format: "Story" },
    { name: "share_tapped", surface: "today_card", action: "link", format: "post" },
    { name: "share_tapped", surface: "today_card", action: "image", format: null },
    { name: "share_tapped", surface: "today_card", action: "image", format: ["post"] }
  ]) {
    const { call, inserted } = setup();
    const res = await call({ events: [event] });
    assertEquals(res.status, 400, JSON.stringify(event));
    assertEquals(inserted.length, 0);
  }
});

Deno.test("one unknown surface rejects the whole batch, so no partial rows are written", async () => {
  const { call, inserted } = setup();
  const res = await call({ events: [tap, { name: "share_tapped", surface: "numerology_maps", action: "image" }] });
  assertEquals(res.status, 400);
  assertEquals(inserted.length, 0);
});

Deno.test("ignores any user id sent in the body: it is rejected as an extra key", async () => {
  const { call, inserted } = setup();
  const res = await call({ events: [{ ...tap, user_id: "22222222-2222-4222-8222-222222222222" }] });
  assertEquals(res.status, 400);
  assertEquals(inserted.length, 0);
});

Deno.test("rejects free text, unknown values and extra top-level keys", async () => {
  const bodies = [
    { events: [{ ...tap, note: "my boss is Linh" }] },
    { events: [{ ...tap, surface: "somewhere" }] },
    { events: [{ ...tap, action: "copy" }] },
    { events: [{ ...tap, name: "page_view" }] },
    { events: [{ ...done, outcome: "sent" }] },
    { events: [{ name: "share_completed", surface: "today_card", action: "image" }] },
    { events: [{ ...tap, outcome: "returned" }] },
    { events: [tap], extra: true },
    { events: [] },
    { events: "share_tapped" },
    { events: [null] },
    {}
  ];
  for (const body of bodies) {
    const { call, inserted } = setup();
    const res = await call(body);
    assertEquals(res.status, 400, JSON.stringify(body));
    assertEquals((await res.json()).error, "invalid_share_event");
    assertEquals(inserted.length, 0);
  }
});

Deno.test("accepts at most ten events per request", async () => {
  const many = Array.from({ length: MAX_EVENTS_PER_REQUEST }, () => tap);
  assertEquals((await setup().call({ events: many })).status, 202);
  assertEquals((await setup().call({ events: [...many, tap] })).status, 400);
});

Deno.test("limits a user to 100 share events in 24 hours and checks the 24 hour window", async () => {
  const atLimit = setup({ recent: DAILY_EVENT_LIMIT });
  const blocked = await atLimit.call({ events: [tap] });
  assertEquals(blocked.status, 429);
  assertEquals((await blocked.json()).error, "share_events_rate_limited");
  assertEquals(atLimit.inserted.length, 0);
  assertEquals(atLimit.counted[0], { userId: USER, sinceIso: new Date(Date.UTC(2026, 10, 11, 12, 0, 0)).toISOString() });
  assertEquals((await setup({ recent: DAILY_EVENT_LIMIT - 1 }).call({ events: [tap] })).status, 202);
  assertEquals((await setup({ recent: DAILY_EVENT_LIMIT - 1 }).call({ events: [tap, tap] })).status, 429);
});

Deno.test("requires a signed-in, non-anonymous caller before reading the body", async () => {
  for (const user of [null, { id: USER, isAnonymous: true }, { id: USER }]) {
    const { call, inserted } = setup({ user });
    const res = await call({ events: [tap] });
    assertEquals(res.status, 401);
    assertEquals(inserted.length, 0);
  }
  const noHeader = await setup().call({ events: [tap] }, { headers: { Authorization: "" } });
  assertEquals(noHeader.status, 401);
});

Deno.test("answers 503 when the function is not configured or the database write fails", async () => {
  assertEquals((await setup({ configured: false }).call({ events: [tap] })).status, 503);
  const failing = setup({ insertError: true });
  const res = await failing.call({ events: [tap] });
  assertEquals(res.status, 503);
  assertEquals((await res.json()).error, "share_events_unavailable");
});

Deno.test("accepts only POST and JSON, and answers the CORS preflight", async () => {
  const { call } = setup();
  assertEquals((await createShareEventsHandler(() => null)(new Request("https://x.test/", { method: "GET" }))).status, 405);
  assertEquals((await createShareEventsHandler(() => null)(new Request("https://x.test/", { method: "OPTIONS" }))).status, 200);
  assertEquals((await call("events=1", { headers: { "Content-Type": "text/plain" } })).status, 415);
  assertEquals((await call("not json")).status, 400);
});

Deno.test("parseShareEvents keeps the optional outcome only on completed events", () => {
  assertEquals(parseShareEvents({ events: [tap, done] }), [
    { name: "share_tapped", surface: "today_card", action: "image" },
    { name: "share_completed", surface: "astro_invite", action: "link", outcome: "returned" }
  ]);
});

const CAMPAIGN = "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f6";

Deno.test("stores product signals with feature product_signal and the allowlisted metadata", async () => {
  const { call, inserted } = setup();
  const res = await call({ events: [
    { name: "tarot_note_feedback", metadata: { campaignId: CAMPAIGN, variant: "B", value: "yes", topic: "love" } },
    { name: "reader_suggestion_accepted", metadata: { slug: "linh", recommendedSlug: "an-nhien", source: "tarot_result" } },
    { name: "tarot_report_opened" },
    tap
  ] });
  assertEquals(res.status, 202);
  assertEquals(inserted[0], [
    { user_id: USER, event_name: "tarot_note_feedback", feature: "product_signal", metadata: { campaignId: CAMPAIGN, variant: "B", value: "yes", topic: "love" } },
    { user_id: USER, event_name: "reader_suggestion_accepted", feature: "product_signal", metadata: { slug: "linh", recommendedSlug: "an-nhien", source: "tarot_result" } },
    { user_id: USER, event_name: "tarot_report_opened", feature: "product_signal", metadata: {} },
    { user_id: USER, event_name: "share_tapped", feature: "share", metadata: { surface: "today_card", action: "image" } }
  ]);
});

Deno.test("accepts the exact payloads the mobile sendProductEvent builds (apps/mobile backendClient.test.ts)", async () => {
  const { call, inserted } = setup();
  const res = await call({ events: [{ name: "reader_suggestion_shown", metadata: { slug: "the-love-oracle", topic: "love", source: "rule" } }] });
  assertEquals(res.status, 202);
  const feedback = await call({ events: [{ name: "tarot_note_feedback", metadata: { campaignId: CAMPAIGN, variant: "B", value: "yes" } }] });
  assertEquals(feedback.status, 202);
  assertEquals(inserted.map(rows => rows[0].event_name), ["reader_suggestion_shown", "tarot_note_feedback"]);
});

Deno.test("accepts every product event name", async () => {
  for (const name of PRODUCT_EVENT_NAMES) {
    const metadata = name === "tarot_note_feedback" ? { value: "no" } : { source: "tarot_result" };
    assertEquals((await setup().call({ events: [{ name, metadata }] })).status, 202, name);
  }
});

Deno.test("rejects product metadata outside the allowlist", async () => {
  const bodies = [
    { name: "tarot_note_feedback", metadata: { campaignId: CAMPAIGN, variant: "B" } },
    { name: "tarot_note_feedback", metadata: { value: "maybe" } },
    { name: "tarot_report_opened", metadata: { value: "yes" } },
    { name: "tarot_report_opened", metadata: { campaignId: CAMPAIGN } },
    { name: "tarot_report_opened", metadata: { variant: "A" } },
    { name: "tarot_report_opened", metadata: { campaignId: "not-a-uuid", variant: "A" } },
    { name: "tarot_report_opened", metadata: { campaignId: CAMPAIGN, variant: "E" } },
    { name: "tarot_report_opened", metadata: { question: "will he call me" } },
    { name: "tarot_report_opened", metadata: { topic: "Love with spaces" } },
    { name: "tarot_report_opened", metadata: { slug: "x".repeat(49) } },
    { name: "tarot_report_opened", metadata: { source: 12 } },
    { name: "tarot_report_opened", metadata: [] },
    { name: "tarot_report_opened", surface: "today_card" },
    { name: "tarot_report_opened", user_id: USER }
  ];
  for (const event of bodies) {
    const { call, inserted } = setup();
    const res = await call({ events: [event] });
    assertEquals(res.status, 400, JSON.stringify(event));
    assertEquals(inserted.length, 0);
  }
});

Deno.test("product signals share the daily limit and still need a signed-in caller", async () => {
  const event = { name: "tarot_followup_started", metadata: { source: "tarot_result" } };
  assertEquals((await setup({ recent: DAILY_EVENT_LIMIT }).call({ events: [event] })).status, 429);
  assertEquals((await setup({ user: null }).call({ events: [event] })).status, 401);
  assertEquals((await setup({ user: { id: USER, isAnonymous: true } }).call({ events: [event] })).status, 401);
});

Deno.test("drops the campaign tag but keeps the event unless the campaign is running or stopped within 30 days", async () => {
  const day = 24 * 60 * 60 * 1000, now = Date.UTC(2026, 10, 12, 12, 0, 0);
  const ids = [1, 2, 3, 4, 5, 6].map(n => `6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e5f${n}`);
  const [running, endedRecent, endedOld, pausedRecent, draft, broken] = ids;
  const campaigns: Record<string, CampaignRow | "error"> = {
    [running]: { status: "running" },
    [endedRecent]: { status: "ended", ended_at: new Date(now - 5 * day).toISOString() },
    [endedOld]: { status: "ended", ended_at: new Date(now - 40 * day).toISOString() },
    [pausedRecent]: { status: "paused", updated_at: new Date(now - 2 * day).toISOString() },
    [draft]: { status: "draft" },
    [broken]: "error"
  };
  const { call, inserted } = setup({ campaigns });
  const event = (campaignId: string) => ({ name: "tarot_note_feedback", metadata: { campaignId, variant: "A", value: "yes" } });
  const res = await call({ events: [running, endedRecent, endedOld, pausedRecent, draft, broken, "6f1c2a40-1b2c-4d5e-8f90-a1b2c3d4e599"].map(event) });
  assertEquals(res.status, 202);
  assertEquals(inserted[0].map(row => row.metadata), [
    { campaignId: running, variant: "A", value: "yes" },
    { campaignId: endedRecent, variant: "A", value: "yes" },
    { value: "yes" }, // ended 40 days ago
    { campaignId: pausedRecent, variant: "A", value: "yes" },
    { value: "yes" }, // draft
    { value: "yes" }, // lookup error
    { value: "yes" } // unknown campaign
  ]);
});

Deno.test("looks a campaign up once per request burst and caches the answer for a minute", async () => {
  const { call, lookups } = setup();
  const body = { events: [{ name: "tarot_note_feedback", metadata: { campaignId: LIVE_CAMPAIGN, variant: "B", value: "no" } }] };
  await call(body);
  await call(body);
  assertEquals(lookups, [LIVE_CAMPAIGN]);
});
