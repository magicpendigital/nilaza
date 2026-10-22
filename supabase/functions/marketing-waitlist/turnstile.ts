/** Server-only verification; failure never permits a waitlist database write. */
export async function verifyTurnstile(
  secret: string | undefined,
  token: unknown,
  ip: string | null,
  expectedHostname: string,
  request: typeof fetch = fetch
): Promise<boolean> {
  if (!secret?.trim() || typeof token !== "string" || !token.trim() || token.length > 2048 || !expectedHostname) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const form = new FormData();
    form.set("secret", secret);
    form.set("response", token);
    if (ip) form.set("remoteip", ip);
    const response = await request("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body: form, signal: controller.signal
    });
    if (!response.ok) return false;
    const result: unknown = await response.json();
    if (!result || typeof result !== "object") return false;
    const verification = result as { success?: unknown; hostname?: unknown };
    return verification.success === true && verification.hostname === expectedHostname;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
