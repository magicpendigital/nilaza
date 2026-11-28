import fs from "node:fs";
import path from "node:path";
import { sendShareEvents } from "../../../backendClient";
import { SHARE_ACTIONS, SHARE_EVENT_NAMES, SHARE_FORMATS, SHARE_OUTCOMES, SHARE_SURFACES, toShareEventPayload } from "../shareEvents";

const handlerSource = fs.readFileSync(path.resolve(__dirname, "../../../../../../supabase/functions/share-events/handler.ts"), "utf8");
const serverList = (name: string) => {
  const match = new RegExp(`export const ${name} = \\[([^\\]]*)\\]`).exec(handlerSource);
  return match ? [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]) : [];
};

it("accepts exactly the values the server function accepts", () => {
  expect([...SHARE_EVENT_NAMES]).toEqual(serverList("SHARE_EVENT_NAMES"));
  expect([...SHARE_SURFACES]).toEqual(serverList("SHARE_SURFACES"));
  expect([...SHARE_ACTIONS]).toEqual(serverList("SHARE_ACTIONS"));
  expect([...SHARE_OUTCOMES]).toEqual(serverList("SHARE_OUTCOMES"));
  expect([...SHARE_FORMATS]).toEqual(serverList("SHARE_FORMATS"));
  expect(serverList("SHARE_SURFACES").length).toBeGreaterThan(0);
});

it("builds a payload only from enumerated values and drops everything else", () => {
  expect(toShareEventPayload("share_tapped", { surface: "today_card", action: "image" })).toEqual({ name: "share_tapped", surface: "today_card", action: "image" });
  expect(toShareEventPayload("share_completed", { surface: "astro_invite", action: "link", outcome: "returned" })).toEqual({ name: "share_completed", surface: "astro_invite", action: "link", outcome: "returned" });
  expect(toShareEventPayload("share_tapped", { surface: "today_card", action: "image", outcome: "returned" })).toEqual({ name: "share_tapped", surface: "today_card", action: "image" });
  expect(toShareEventPayload("share_completed", { surface: "today_card", action: "image" })).toBeNull();
  expect(toShareEventPayload("share_completed", { surface: "today_card", action: "image", outcome: "sent" })).toBeNull();
  expect(toShareEventPayload("page_view", { surface: "today_card", action: "image" })).toBeNull();
  expect(toShareEventPayload("share_tapped", { surface: "my question about Acme", action: "image" })).toBeNull();
});

it("adds the image format only to image shares and only from the list", () => {
  expect(toShareEventPayload("share_tapped", { surface: "book_quote", action: "image", format: "story" })).toEqual({ name: "share_tapped", surface: "book_quote", action: "image", format: "story" });
  expect(toShareEventPayload("share_completed", { surface: "numerology_map", action: "image", outcome: "returned", format: "post" })).toEqual({ name: "share_completed", surface: "numerology_map", action: "image", outcome: "returned", format: "post" });
  expect(toShareEventPayload("share_tapped", { surface: "today_card", action: "link", format: "story" })).toEqual({ name: "share_tapped", surface: "today_card", action: "link" });
  expect(toShareEventPayload("share_tapped", { surface: "today_card", action: "image", format: "square" })).toEqual({ name: "share_tapped", surface: "today_card", action: "image" });
});

describe("sendShareEvents", () => {
  const events = [{ name: "share_tapped" as const, surface: "today_card" as const, action: "image" as const }];
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it("posts to the share-events function with the session token and the publishable key", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 202 });
    global.fetch = fetchMock as never;
    const sent = await sendShareEvents(events, { baseUrl: "https://abc.supabase.co/functions/v1", authToken: "jwt-1", apiKey: "pub-key" } as never);
    expect(sent).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://abc.supabase.co/functions/v1/share-events");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer jwt-1", apikey: "pub-key", "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({ events });
  });

  it("does nothing without a signed-in session, a backend address or events", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as never;
    expect(await sendShareEvents(events, { baseUrl: "https://abc.supabase.co/functions/v1" } as never)).toBe(false);
    expect(await sendShareEvents(events, { authToken: "jwt-1" } as never)).toBe(false);
    expect(await sendShareEvents([], { baseUrl: "https://abc.supabase.co/functions/v1", authToken: "jwt-1" } as never)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never throws: a network error, a rejected request or a missing function only returns false", async () => {
    const options = { baseUrl: "https://abc.supabase.co/functions/v1", authToken: "jwt-1" } as never;
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as never;
    expect(await sendShareEvents(events, options)).toBe(false);
    global.fetch = jest.fn().mockResolvedValue({ status: 404 }) as never;
    expect(await sendShareEvents(events, options)).toBe(false);
    global.fetch = jest.fn().mockResolvedValue({ status: 429 }) as never;
    expect(await sendShareEvents(events, options)).toBe(false);
  });

  it("does not send once the account session has been closed", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as never;
    const session = { active: false, userId: "u1", accessToken: "jwt-1", controller: new AbortController() };
    expect(await sendShareEvents(events, { baseUrl: "https://abc.supabase.co/functions/v1", session } as never)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
