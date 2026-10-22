export const MAX_LEDGER_ROWS = 1000;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Dependencies = {
  configured: boolean;
  authenticate: (token: string) => Promise<{ id: string; isAnonymous: boolean } | null>;
  readLedger: (userId: string) => Promise<{ rows: unknown; count: unknown; failed: boolean }>;
};
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
export function createCreditsHandler(deps: Dependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (!["GET", "POST"].includes(req.method)) return json(405, { error: "method_not_allowed" });
    const path = new URL(req.url).pathname.replace(/\/+$/, "");
    const root = path.endsWith("/user-credits");
    const debit = path.endsWith("/user-credits/deduct");
    if ((!root && !debit) || (req.method === "GET" && !root)) return json(404, { error: "not_found" });
    if (!deps.configured) return json(503, { error: "credits_unavailable" });
    const authorization = req.headers.get("Authorization") ?? "";
    const token = /^Bearer ([^\s]+)$/i.exec(authorization)?.[1];
    if (!token || token.length > 16384) return json(401, { error: "authentication_required" });
    let user;
    try { user = await deps.authenticate(token); } catch { return json(401, { error: "authentication_required" }); }
    if (!user || !uuid.test(user.id) || user.isAnonymous !== false) return json(401, { error: "authentication_required" });
    if (req.method === "POST") {
      // Mapped root and legacy /deduct both fail closed. Ignore untrusted body;
      // never revive read-before-insert charging as a fallback.
      return json(503, { error: "credit_reservation_unavailable", success: false });
    }
    try {
      const result = await deps.readLedger(user.id);
      if (result.failed || !Array.isArray(result.rows) || !Number.isInteger(result.count) ||
          (result.count as number) < 0 || (result.count as number) > MAX_LEDGER_ROWS ||
          result.rows.length !== result.count) return json(503, { error: "credits_unavailable" });
      let balance = 0;
      for (const row of result.rows) {
        if (!row || typeof row !== "object" || !Number.isSafeInteger(row.delta)) return json(503, { error: "credits_unavailable" });
        balance += row.delta;
        if (!Number.isSafeInteger(balance)) return json(503, { error: "credits_unavailable" });
      }
      if (balance < 0) return json(503, { error: "credits_unavailable" });
      return json(200, { credits: balance });
    } catch { return json(503, { error: "credits_unavailable" }); }
  };
}
