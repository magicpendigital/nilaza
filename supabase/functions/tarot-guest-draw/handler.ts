// Tarot v2 pack 1: the public guest draw. No sign-in, no database, no model: it only computes the cards of one guest event
// (device id, spread, topic, Vietnam day) from a server secret, so the same event always gets the same cards and the client
// cannot choose them. The account's own draw (ai-tarot-reading) derives the same cards after sign-in.
import { AiRequestError, readBoundedJson } from "../_shared/ai-request-guard.ts";
import { answerCorsHeaders } from "../_shared/answer-provenance.ts";
import { tarotSpreadPositionKeys } from "../_shared/tarot-prompt.ts";
import { deriveGuestCards, isGuestDeviceId, usableGuestSecret } from "../_shared/tarot-guest-seed.ts";
import { normalizeTopicKey, vietnamDay } from "../ai-tarot-reading/draw.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": answerCorsHeaders,
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }, status });
}

export type GuestDrawOptions = { now?: () => Date; bodyClock?: () => number };

/** `secret` is read per request so tests and the Edge runtime can change it; it is never logged or returned. */
export function createGuestDrawHandler(secret: () => string | undefined, options: GuestDrawOptions = {}) {
  const now = options.now ?? (() => new Date());
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    try {
      const input = await readBoundedJson(req, options.bodyClock ?? (() => performance.now()));
      const deviceId = input.deviceId;
      const spread = input.spread === undefined ? "daily-one" : input.spread;
      const topic = normalizeTopicKey(input.topic);
      if (!isGuestDeviceId(deviceId)) throw new AiRequestError(400, "invalid_device_id");
      if (typeof spread !== "string" || !tarotSpreadPositionKeys(spread) || !topic) throw new AiRequestError(400, "invalid_tarot_input");
      const key = usableGuestSecret(secret());
      if (!key) return json({ error: "guest_draw_unavailable" }, 503);
      const day = vietnamDay(now());
      const cards = await deriveGuestCards(key, deviceId, spread, topic, day.dateKey);
      return json({ status: "guest_draw", spread, topic, lockDate: day.dateKey, nextDrawAt: day.nextDayStart.toISOString(), cards });
    } catch (error) {
      if (error instanceof AiRequestError) return json({ error: error.code }, error.status);
      return json({ error: "service_unavailable" }, 503);
    }
  };
}
