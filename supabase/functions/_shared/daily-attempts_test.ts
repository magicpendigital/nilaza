import { claimDailyAttempt } from "./daily-attempts.ts";
function assertEquals(actual: unknown, expected: unknown, label = "") { if (actual !== expected) throw new Error(`${label} expected ${expected}, got ${actual}`); }

function store(count: number | null, options: { countError?: unknown; insertError?: unknown; throws?: boolean } = {}) {
  const inserted: Record<string, unknown>[] = [];
  const filters: Array<[string, string]> = [];
  const client = {
    from: () => ({
      select: () => ({
        eq: (c1: string, v1: string) => ({
          eq: (c2: string, v2: string) => ({
            gte: (c3: string, v3: string) => {
              filters.push([c1, v1], [c2, v2], [c3, v3]);
              if (options.throws) return Promise.reject(new Error("network"));
              return Promise.resolve({ count, error: options.countError ?? null });
            }
          })
        })
      }),
      insert: (row: Record<string, unknown>) => { inserted.push(row); return Promise.resolve({ error: options.insertError ?? null }); }
    })
  };
  return { client, inserted, filters };
}

const input = { userId: "u1", eventName: "daily_insight_attempted", feature: "daily_insight", limit: 3, now: new Date("2026-11-10T03:00:00Z") };

Deno.test("under the limit records one attempt and allows the call", async () => {
  const s = store(2);
  assertEquals(await claimDailyAttempt(s.client, input), "allowed");
  assertEquals(s.inserted.length, 1, "inserted");
  assertEquals((s.inserted[0].metadata as { attemptNumber: number }).attemptNumber, 3, "attempt number");
  assertEquals(s.filters[2][1], "2026-11-09T17:00:00.000Z", "counts from local midnight UTC+7");
});

Deno.test("at the limit refuses without recording", async () => {
  const s = store(3);
  assertEquals(await claimDailyAttempt(s.client, input), "limit_reached");
  assertEquals(s.inserted.length, 0, "inserted");
});

Deno.test("a failed count or insert refuses the call", async () => {
  assertEquals(await claimDailyAttempt(store(null).client, input), "unavailable", "null count");
  assertEquals(await claimDailyAttempt(store(0, { countError: { code: "x" } }).client, input), "unavailable", "count error");
  assertEquals(await claimDailyAttempt(store(0, { insertError: { code: "x" } }).client, input), "unavailable", "insert error");
  assertEquals(await claimDailyAttempt(store(0, { throws: true }).client, input), "unavailable", "throws");
});
