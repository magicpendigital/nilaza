import { allowedInterests, cleanUtm, normalizeEmail, sha256 } from "./helpers.ts";
import { verifyTurnstile } from "./turnstile.ts";
export type Registration = { p_email: string; p_email_hash: string; p_locale: string; p_interest: string; p_utm: Record<string, string>; p_consent_version: string; p_source: string };
export type WaitlistDependencies = { allowedOrigins: string[]; turnstileSecret?: string; backendConfigured: boolean; register: (input: Registration) => Promise<void>; verify?: typeof verifyTurnstile };
// Identical request logic for the Edge Function and synthetic integration tests.
// Dependencies are code-owned; a request cannot select a verification bypass.
export function createWaitlistHandler(deps: WaitlistDependencies) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get("origin") || "";
    const allowed = deps.allowedOrigins.includes(origin);
    const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: {
      "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin",
      ...(allowed ? { "Access-Control-Allow-Origin": origin } : {}),
      "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST, OPTIONS"
    } });
    if (!allowed) return json({ error: "origin_not_allowed" }, 403);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": origin, "Vary": "Origin", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Cache-Control": "no-store" } });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return json({ error: "invalid_request" }, 400);
    const reader = req.body?.getReader();
    if (!reader) return json({ error: "invalid_request" }, 400);
    const chunks: Uint8Array[] = []; let length = 0;
    try {
      while (true) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength; if (length > 8192) { await reader.cancel(); return json({ error: "invalid_request" }, 413); } chunks.push(value); }
    } catch { return json({ error: "invalid_request" }, 400); }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let input: Record<string, unknown>;
    try { input = JSON.parse(new TextDecoder().decode(bytes)); } catch { return json({ error: "invalid_request" }, 400); }
    if (!input || typeof input !== "object" || Array.isArray(input)) return json({ error: "invalid_request" }, 400);
    if (typeof input.website === "string" && input.website.trim()) return json({ accepted: true }, 202);
    const email = normalizeEmail(input.email);
    const locale = input.locale === "en" ? "en" : input.locale === "vi" ? "vi" : null;
    const interest = typeof input.interest === "string" && allowedInterests.has(input.interest) ? input.interest : null;
    if (!email || !locale || !interest || input.consent !== true) return json({ error: "invalid_request" }, 400);
    if (!deps.turnstileSecret?.trim() || !deps.backendConfigured) return json({ error: "waitlist_unavailable" }, 503);
    try {
      const verified = await (deps.verify || verifyTurnstile)(deps.turnstileSecret, input.turnstileToken, req.headers.get("cf-connecting-ip"), new URL(origin).hostname);
      if (!verified) return json({ error: "challenge_failed" }, 400);
      await deps.register({ p_email: email, p_email_hash: await sha256(email), p_locale: locale, p_interest: interest, p_utm: cleanUtm(input.utm), p_consent_version: "waitlist-prelaunch-2026-10-11", p_source: "nilaza-web" });
      return json({ accepted: true }, 202);
    } catch { return json({ error: "waitlist_unavailable" }, 503); }
  };
}
