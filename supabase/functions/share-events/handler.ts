import { AiRequestError, guardAiJsonRequest } from "../_shared/ai-request-guard.ts";

// Share measurement: the only values that can be stored. The mobile app builds its events from these same lists
// (a mobile test compares them), so adding a value is a deliberate change in both places.
export const SHARE_EVENT_NAMES = ["share_tapped", "share_completed"] as const;
export const SHARE_SURFACES = ["today_card", "tarot_reading", "astro_big3", "astro_invite"] as const;
export const SHARE_ACTIONS = ["image", "link"] as const;
export const SHARE_OUTCOMES = ["returned", "unavailable", "failed"] as const;
export const MAX_EVENTS_PER_REQUEST = 10;
export const DAILY_EVENT_LIMIT = 100;

export type ShareEvent = {
  name: (typeof SHARE_EVENT_NAMES)[number];
  surface: (typeof SHARE_SURFACES)[number];
  action: (typeof SHARE_ACTIONS)[number];
  outcome?: (typeof SHARE_OUTCOMES)[number];
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type Store = {
  authenticate: (token: string) => Promise<{ id: string; isAnonymous?: boolean } | null>;
  /** Share rows already stored for this user since the given ISO time. */
  countRecent: (userId: string, sinceIso: string) => Promise<number>;
  insert: (rows: UsageEventRow[]) => Promise<{ error?: { message?: string } | null }>;
};

export type UsageEventRow = {
  user_id: string;
  event_name: ShareEvent["name"];
  feature: "share";
  metadata: Record<string, string>;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });

const oneOf = <T extends string>(list: readonly T[], value: unknown): value is T => typeof value === "string" && (list as readonly string[]).includes(value);
const onlyKeys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).every((key) => allowed.includes(key));

/** Strict allow-list: exactly {events:[...]}, 1..10 events, enumerated values only, no extra keys or free text. */
export function parseShareEvents(input: Record<string, unknown>): ShareEvent[] | null {
  if (!onlyKeys(input, ["events"]) || !Array.isArray(input.events)) return null;
  if (input.events.length < 1 || input.events.length > MAX_EVENTS_PER_REQUEST) return null;
  const events: ShareEvent[] = [];
  for (const item of input.events) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const event = item as Record<string, unknown>;
    if (!onlyKeys(event, ["name", "surface", "action", "outcome"])) return null;
    if (!oneOf(SHARE_EVENT_NAMES, event.name) || !oneOf(SHARE_SURFACES, event.surface) || !oneOf(SHARE_ACTIONS, event.action)) return null;
    if (event.name === "share_completed") {
      if (!oneOf(SHARE_OUTCOMES, event.outcome)) return null;
      events.push({ name: event.name, surface: event.surface, action: event.action, outcome: event.outcome });
    } else {
      // A tap has no outcome yet.
      if ("outcome" in event) return null;
      events.push({ name: event.name, surface: event.surface, action: event.action });
    }
  }
  return events;
}

export function createShareEventsHandler(storeFor: (req: Request) => Store | null, now: () => number = () => Date.now()) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    try {
      const store = storeFor(req);
      // Authentication happens before the body is read; anonymous callers are rejected by the shared guard.
      const { userId, input } = await guardAiJsonRequest(req, { configured: Boolean(store), authenticate: (token) => store!.authenticate(token) });
      const events = parseShareEvents(input);
      if (!events) return json({ error: "invalid_share_event" }, 400);

      const since = new Date(now() - 24 * 60 * 60 * 1000).toISOString();
      const recent = await store!.countRecent(userId, since);
      if (recent + events.length > DAILY_EVENT_LIMIT) return json({ error: "share_events_rate_limited" }, 429);

      // The user id comes from the verified token, never from the request body.
      const rows: UsageEventRow[] = events.map((event) => ({
        user_id: userId,
        event_name: event.name,
        feature: "share",
        metadata: { surface: event.surface, action: event.action, ...(event.outcome ? { outcome: event.outcome } : {}) }
      }));
      const { error } = await store!.insert(rows);
      if (error) return json({ error: "share_events_unavailable" }, 503);
      return json({ accepted: rows.length }, 202);
    } catch (error) {
      if (error instanceof AiRequestError) return json({ error: error.code }, error.status);
      return json({ error: "share_events_unavailable" }, 503);
    }
  };
}
