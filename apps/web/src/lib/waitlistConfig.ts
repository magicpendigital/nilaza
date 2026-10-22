export const singaporeWaitlistEndpoint = "https://etfajmrwyywokgafzxsb.supabase.co/functions/v1/marketing-waitlist";
export function getWaitlistConfig(endpoint: string, siteKey: string, development = false) {
  let validEndpoint = endpoint === singaporeWaitlistEndpoint;
  if (development) {
    try { const url = new URL(endpoint); validEndpoint ||= url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname) && url.pathname === "/functions/v1/marketing-waitlist"; } catch { /* fail closed */ }
  }
  const validKey = /^[a-zA-Z0-9_-]{20,80}$/.test(siteKey) && (development || !/^[123]x0{10,}/.test(siteKey));
  return { endpoint, siteKey, enabled: validEndpoint && validKey };
}
const env = import.meta.env || {};
export const waitlistConfig = getWaitlistConfig(env.PUBLIC_WAITLIST_ENDPOINT || "", env.PUBLIC_TURNSTILE_SITE_KEY || "", env.DEV);
