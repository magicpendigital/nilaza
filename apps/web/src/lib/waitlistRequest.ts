export type WaitlistResult = "accepted" | "challenge_failed" | "invalid_request" | "unavailable";
export async function sendWaitlistRequest(endpoint: string, payload: Record<string, unknown>, request: typeof fetch = fetch): Promise<WaitlistResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await request(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal });
    const body: unknown = await response.json();
    if (response.status === 202 && body && typeof body === "object" && (body as { accepted?: unknown }).accepted === true) return "accepted";
    const error = body && typeof body === "object" ? (body as { error?: unknown }).error : null;
    return error === "challenge_failed" ? "challenge_failed" : error === "invalid_request" ? "invalid_request" : "unavailable";
  } catch { return "unavailable"; }
  finally { clearTimeout(timeout); }
}
