export type JournalInput = {
  localId: string; sourceType: string; sourceId?: string; title: string;
  summary: string; mood?: string; userNote?: string; sourceSnapshot: Record<string, unknown>; createdAt: string;
};
export type JournalStore = {
  authenticate: (token: string) => Promise<string | null>;
  upsert: (userId: string, input: JournalInput) => Promise<{ id: string; deletedAt?: string | null }>;
  remove: (userId: string, localId: string) => Promise<void>;
};
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" }
});
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const boundedString = (value: unknown, max: number, required = false): value is string | undefined =>
  value === undefined ? !required : typeof value === "string" && value.length <= max && (!required || value.trim().length > 0);
const sourceTypes = new Set(["daily", "chat", "tarot", "astrology", "manual", "share_card", "aura_reflection", "face_reading", "weekly_reflection"]);

async function readBody(req: Request) {
  if (!req.body) throw new Error("Invalid body");
  const reader = req.body.getReader(), chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > 128 * 1024) { await reader.cancel(); return { oversized: true }; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return { value: JSON.parse(new TextDecoder().decode(bytes)) };
}

export function createJournalHandler(storeFor: (req: Request) => JournalStore | null, now = () => new Date().toISOString()) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);
    const token = req.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) return response({ error: "Unauthorized" }, 401);
    const store = storeFor(req);
    if (!store) return response({ error: "Journal service unavailable" }, 503);
    let userId: string | null;
    try { userId = await store.authenticate(token); } catch { return response({ error: "Journal service unavailable" }, 503); }
    if (!userId || !uuid(userId)) return response({ error: "Unauthorized" }, 401);
    let raw: unknown;
    try {
      const body = await readBody(req);
      if (body.oversized) return response({ error: "Journal request too large" }, 413);
      raw = body.value;
    } catch { return response({ error: "Invalid Journal request" }, 400); }
    if (!record(raw) || !boundedString(raw.localId, 200, true) || typeof raw.localId !== "string") return response({ error: "Invalid Journal request" }, 400);
    const operation = raw.operation ?? "upsert";
    if (operation !== "upsert" && operation !== "delete") return response({ error: "Invalid Journal operation" }, 400);
    try {
      if (operation === "delete") {
        await store.remove(userId, raw.localId);
        return response({ status: "synced", operation, localId: raw.localId });
      }
      const sourceType = raw.sourceType ?? "manual", snapshot = raw.sourceSnapshot ?? {}, createdAt = raw.createdAt ?? now();
      if (!boundedString(raw.title, 300, true) || !boundedString(raw.summary, 20000, true) ||
          !boundedString(raw.mood, 100) || !boundedString(raw.userNote, 10000) || !boundedString(raw.sourceId, 200) ||
          typeof sourceType !== "string" || !sourceTypes.has(sourceType) || !record(snapshot) ||
          new TextEncoder().encode(JSON.stringify(snapshot)).byteLength > 64 * 1024 ||
          typeof createdAt !== "string" || createdAt.length > 40 || !Number.isFinite(Date.parse(createdAt))) return response({ error: "Invalid Journal request" }, 400);
      const input: JournalInput = { localId: raw.localId, title: raw.title as string, summary: raw.summary as string,
        sourceType, sourceId: typeof raw.sourceId === "string" && uuid(raw.sourceId) ? raw.sourceId : undefined,
        mood: raw.mood as string | undefined, userNote: raw.userNote as string | undefined, sourceSnapshot: snapshot,
        createdAt: new Date(createdAt).toISOString() };
      const row = await store.upsert(userId, input);
      if (row.deletedAt) return response({ error: "This Journal entry has been deleted" }, 409);
      if (!uuid(row.id)) return response({ error: "Journal acknowledgement unavailable" }, 502);
      return response({ status: "synced", operation, localId: input.localId, remoteId: row.id });
    } catch { return response({ error: "Journal could not be synchronized" }, 500); }
  };
}
