import { createRevenueCatCustomerDeleter, REVENUECAT_API_BASE } from "./billing.ts";

function assert(value: unknown, message = "assertion failed"): asserts value { if (!value) throw new Error(message); }
const USER = "a829c21f-1f03-41bf-991a-d49684c2e495";
const KEY = "sk_test_not_a_real_key";

type Seen = { url: string; init: RequestInit };
function fakeFetch(answer: number | "throw" | "hang") {
  const seen: Seen[] = [];
  const fetchImpl = (url: string, init: RequestInit) => {
    seen.push({ url, init });
    if (answer === "throw") return Promise.reject(new TypeError("network down"));
    if (answer === "hang") {
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    }
    const body = answer === 204 ? null : JSON.stringify({ app_user_id: USER, deleted: true });
    return Promise.resolve(new Response(body, { status: answer }));
  };
  return { seen, fetchImpl };
}

Deno.test("no key (empty or blank) means billing is off and no deleter exists", () => {
  assert(createRevenueCatCustomerDeleter(undefined) === null);
  assert(createRevenueCatCustomerDeleter("") === null);
  assert(createRevenueCatCustomerDeleter("   ") === null);
});

Deno.test("sends one DELETE to the v1 subscriber URL with the Bearer secret key", async () => {
  const f = fakeFetch(200);
  const remove = createRevenueCatCustomerDeleter(KEY, { fetchImpl: f.fetchImpl })!;
  assert(await remove(USER) === true);
  assert(f.seen.length === 1);
  assert(f.seen[0].url === `${REVENUECAT_API_BASE}/subscribers/${USER}` && f.seen[0].url.startsWith("https://api.revenuecat.com/v1/"));
  assert(f.seen[0].init.method === "DELETE");
  assert((f.seen[0].init.headers as Record<string, string>).Authorization === `Bearer ${KEY}`);
  assert(f.seen[0].init.signal instanceof AbortSignal);
});

Deno.test("the user id is path-encoded", async () => {
  const f = fakeFetch(200);
  await createRevenueCatCustomerDeleter(KEY, { fetchImpl: f.fetchImpl })!("a/b?c");
  assert(f.seen[0].url.endsWith("/subscribers/a%2Fb%3Fc"));
});

Deno.test("404 counts as already deleted; 5xx, 401 and 429 are failures", async () => {
  assert(await createRevenueCatCustomerDeleter(KEY, { fetchImpl: fakeFetch(404).fetchImpl })!(USER) === true);
  assert(await createRevenueCatCustomerDeleter(KEY, { fetchImpl: fakeFetch(204).fetchImpl })!(USER) === true);
  for (const status of [500, 503, 401, 429, 400]) {
    assert(await createRevenueCatCustomerDeleter(KEY, { fetchImpl: fakeFetch(status).fetchImpl })!(USER) === false, String(status));
  }
});

Deno.test("network errors and the timeout are failures, never thrown", async () => {
  assert(await createRevenueCatCustomerDeleter(KEY, { fetchImpl: fakeFetch("throw").fetchImpl })!(USER) === false);
  const started = Date.now();
  const hang = fakeFetch("hang");
  assert(await createRevenueCatCustomerDeleter(KEY, { fetchImpl: hang.fetchImpl, timeoutMs: 30 })!(USER) === false);
  assert(Date.now() - started < 2_000, "the abort must end the call");
  assert(hang.seen[0].init.signal?.aborted === true);
});

Deno.test("the default timeout is short", async () => {
  const { BILLING_DELETE_TIMEOUT_MS } = await import("./billing.ts");
  assert(BILLING_DELETE_TIMEOUT_MS > 0 && BILLING_DELETE_TIMEOUT_MS <= 10_000);
});
