import { AiRequestError, guardAiJsonRequest } from "../_shared/ai-request-guard.ts";

// Share measurement: the only values that can be stored. The mobile app builds its events from these same lists
// (a mobile test compares them), so adding a value is a deliberate change in both places.
export const SHARE_EVENT_NAMES = ["share_tapped", "share_completed"] as const;
export const SHARE_SURFACES = ["today_card", "tarot_reading", "astro_big3", "astro_invite", "numerology_map", "daily_sky"] as const;
export const SHARE_ACTIONS = ["image", "link"] as const;
export const SHARE_OUTCOMES = ["returned", "unavailable", "failed"] as const;
// Product signals for model campaigns and the Tarot note / reader suggestion (proposal 2026-11-23). Stored with
// feature "product_signal" and a strictly enumerated metadata object; they share the daily limit with share events.
export const PRODUCT_EVENT_NAMES = [
  "tarot_note_feedback", "tarot_report_opened", "reader_suggestion_shown", "reader_suggestion_accepted",
  "reader_mismatch_nudge_shown", "reader_mismatch_switched", "tarot_followup_started"
] as const;
export const PRODUCT_METADATA_KEYS = ["campaignId", "variant", "value", "slug", "recommendedSlug", "topic", "source"] as const;
export const MAX_EVENTS_PER_REQUEST = 10;
export const DAILY_EVENT_LIMIT = 100;

export type ShareEvent = {
  name: (typeof SHARE_EVENT_NAMES)[number];
  surface: (typeof SHARE_SURFACES)[number];
  action: (typeof SHARE_ACTIONS)[number];
  outcome?: (typeof SHARE_OUTCOMES)[number];
};

export type ProductMetadata = Partial<Record<(typeof PRODUCT_METADATA_KEYS)[number], string>>;
export type ProductEvent = { name: (typeof PRODUCT_EVENT_NAMES)[number]; metadata: ProductMetadata };
export type ParsedEvent = ShareEvent | ProductEvent;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type Store = {
  authenticate: (token: string) => Promise<{ id: string; isAnonymous?: boolean } | null>;
  /** Share and product-signal rows already stored for this user since the given ISO time. */
  countRecent: (userId: string, sinceIso: string) => Promise<number>;
  insert: (rows: UsageEventRow[]) => Promise<{ error?: { message?: string } | null }>;
  /** One service-role lookup of a campaign row; null when it does not exist. Errors may throw. */
  campaignRow: (campaignId: string) => Promise<CampaignRow | null>;
};

export type CampaignRow = { status: string; ended_at?: string | null; updated_at?: string | null };

export const CAMPAIGN_TAG_GRACE_MS = 30 * 24 * 60 * 60 * 1000;
const CAMPAIGN_CACHE_MS = 60_000;
const CAMPAIGN_CACHE_MAX = 200;

/** A client-sent tag counts only for a running campaign, or a paused/ended one that stopped within the last 30 days. */
export function campaignTagAllowed(row: CampaignRow | null, nowMs: number): boolean {
  if (!row) return false;
  if (row.status === "running") return true;
  if (row.status !== "paused" && row.status !== "ended") return false;
  const since = Date.parse(row.ended_at ?? row.updated_at ?? "");
  return Number.isFinite(since) && nowMs - since <= CAMPAIGN_TAG_GRACE_MS;
}

export type UsageEventRow = {
  user_id: string;
  event_name: ShareEvent["name"] | ProductEvent["name"];
  feature: "share" | "product_signal";
  metadata: Record<string, string>;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });

const oneOf = <T extends string>(list: readonly T[], value: unknown): value is T => typeof value === "string" && (list as readonly string[]).includes(value);
const onlyKeys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).every((key) => allowed.includes(key));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SLUG = /^[a-z0-9][a-z0-9_-]{0,47}$/;

/** {name, metadata?}: metadata keys from PRODUCT_METADATA_KEYS only, each value a short enumerated or slug string. */
export function parseProductEvent(event: Record<string, unknown>): ProductEvent | null {
  if (!onlyKeys(event, ["name", "metadata"]) || !oneOf(PRODUCT_EVENT_NAMES, event.name)) return null;
  const raw = event.metadata ?? {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  if (!onlyKeys(input, [...PRODUCT_METADATA_KEYS])) return null;
  const metadata: ProductMetadata = {};
  // A campaign tag is a pair: the campaign uuid and the variant the user was bucketed into.
  if ("campaignId" in input || "variant" in input) {
    if (typeof input.campaignId !== "string" || !UUID.test(input.campaignId) || !oneOf(["A", "B", "C", "D"], input.variant)) return null;
    metadata.campaignId = input.campaignId;
    metadata.variant = input.variant;
  }
  // value is the yes/no answer of the note feedback, and only of that event.
  if (event.name === "tarot_note_feedback") {
    if (!oneOf(["yes", "no"], input.value)) return null;
    metadata.value = input.value;
  } else if ("value" in input) return null;
  for (const key of ["slug", "recommendedSlug", "topic", "source"] as const) {
    if (!(key in input)) continue;
    const value = input[key];
    if (typeof value !== "string" || !SLUG.test(value)) return null;
    metadata[key] = value;
  }
  return { name: event.name, metadata };
}

const isProductEvent = (event: ParsedEvent): event is ProductEvent => "metadata" in event;

/** Strict allow-list: exactly {events:[...]}, 1..10 events, enumerated values only, no extra keys or free text. */
export function parseShareEvents(input: Record<string, unknown>): ParsedEvent[] | null {
  if (!onlyKeys(input, ["events"]) || !Array.isArray(input.events)) return null;
  if (input.events.length < 1 || input.events.length > MAX_EVENTS_PER_REQUEST) return null;
  const events: ParsedEvent[] = [];
  for (const item of input.events) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const event = item as Record<string, unknown>;
    if (oneOf(PRODUCT_EVENT_NAMES, event.name)) {
      const product = parseProductEvent(event);
      if (!product) return null;
      events.push(product);
      continue;
    }
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
  // Per-isolate cache: campaign id -> allowed, so a burst of events costs at most one lookup per campaign a minute.
  const tagCache = new Map<string, { allowed: boolean; until: number }>();
  async function tagAllowed(store: Store, campaignId: string): Promise<boolean> {
    const cached = tagCache.get(campaignId);
    if (cached && cached.until > now()) return cached.allowed;
    try {
      const allowed = campaignTagAllowed(await store.campaignRow(campaignId), now());
      if (tagCache.size >= CAMPAIGN_CACHE_MAX) tagCache.clear();
      tagCache.set(campaignId, { allowed, until: now() + CAMPAIGN_CACHE_MS });
      return allowed;
    } catch {
      return false; // any lookup error drops the tag (the event itself is kept); not cached
    }
  }
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

      // The client may only tag events with a campaign that exists and is live (or just stopped); otherwise the tag is dropped.
      for (const event of events) {
        if (!isProductEvent(event) || !event.metadata.campaignId) continue;
        if (!await tagAllowed(store!, event.metadata.campaignId)) { delete event.metadata.campaignId; delete event.metadata.variant; }
      }

      // The user id comes from the verified token, never from the request body.
      const rows: UsageEventRow[] = events.map((event) => isProductEvent(event)
        ? { user_id: userId, event_name: event.name, feature: "product_signal", metadata: { ...event.metadata } as Record<string, string> }
        : {
          user_id: userId,
          event_name: event.name,
          feature: "share",
          metadata: { surface: event.surface, action: event.action, ...(event.outcome ? { outcome: event.outcome } : {}) }
        });
      const { error } = await store!.insert(rows);
      if (error) return json({ error: "share_events_unavailable" }, 503);
      return json({ accepted: rows.length }, 202);
    } catch (error) {
      if (error instanceof AiRequestError) return json({ error: error.code }, error.status);
      return json({ error: "share_events_unavailable" }, 503);
    }
  };
}
