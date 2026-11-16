// Billing lot 3 (2026-11-16): remove the person's customer record at the subscription-management
// provider (RevenueCat) when their Nilaza account is deleted. RevenueCat REST API v1:
// DELETE /v1/subscribers/{app_user_id} with a secret API key; 200 = deletion requested (queued),
// 404 = no such customer. This does NOT cancel a Google Play subscription; the person cancels it
// in Google Play (the delete screen and the policy pages say so).
export const REVENUECAT_API_BASE = "https://api.revenuecat.com/v1";
export const BILLING_DELETE_TIMEOUT_MS = 8_000;

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Returns null when no key is configured (billing not switched on): the caller skips the step.
 * Otherwise returns a function that resolves true when the customer is gone (2xx or 404) and
 * false on any other answer, a network error or the timeout. Nothing is logged: neither the key
 * nor the user id may reach logs or responses.
 */
export function createRevenueCatCustomerDeleter(
  apiKey: string | undefined,
  options: { fetchImpl?: FetchLike; timeoutMs?: number } = {}
): ((userId: string) => Promise<boolean>) | null {
  const key = apiKey?.trim();
  if (!key) return null;
  const fetchImpl: FetchLike = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const timeoutMs = options.timeoutMs ?? BILLING_DELETE_TIMEOUT_MS;
  return async (userId: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
        signal: controller.signal
      });
      // The body is never read or forwarded; release it.
      await response.body?.cancel().catch(() => undefined);
      return response.ok || response.status === 404;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  };
}
