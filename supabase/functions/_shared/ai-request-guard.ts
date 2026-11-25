export const MAX_AI_REQUEST_BYTES = 32 * 1024;
export const AI_BODY_READ_TIMEOUT_MS = 5000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AiRequestError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
    this.name = "AiRequestError";
  }
}

type Dependencies = {
  configured: boolean;
  authenticate: (token: string) => Promise<{ id: string; isAnonymous?: boolean } | null>;
  // Server-owned clock seam for deterministic late-read tests, never request data.
  bodyClock?: () => number;
};

export function aiAuthUserOrUnavailable(user: unknown, error: unknown) {
  if (error) {
    const status = typeof error === "object" && error !== null ? (error as { status?: unknown }).status : undefined;
    if (status === 400 || status === 401 || status === 403) return null;
    throw new AiRequestError(503, "authentication_unavailable");
  }
  if (!user || typeof user !== "object") return null;
  const value = user as { id?: unknown; is_anonymous?: unknown };
  if (typeof value.id !== "string") return null;
  return { id: value.id, isAnonymous: typeof value.is_anonymous === "boolean" ? value.is_anonymous : undefined };
}

/** Reads a size and time bounded JSON object body. Exported for the public guest draw, which has no user to authenticate. */
export async function readBoundedJson(req: Request, now: () => number): Promise<Record<string, unknown>> {
  const mediaType = req.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (mediaType !== "application/json") throw new AiRequestError(415, "json_content_type_required");
  const declared = req.headers.get("Content-Length");
  if (declared !== null) {
    if (declared.length > 5) throw new AiRequestError(413, "request_too_large");
    if (!/^(0|[1-9][0-9]*)$/.test(declared)) throw new AiRequestError(400, "invalid_content_length");
    const length = Number(declared);
    if (!Number.isSafeInteger(length) || length > MAX_AI_REQUEST_BYTES) throw new AiRequestError(413, "request_too_large");
  }
  if (!req.body) throw new AiRequestError(400, "invalid_json_body");

  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try { reader = req.body.getReader(); } catch { throw new AiRequestError(400, "invalid_json_body"); }
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = now() + AI_BODY_READ_TIMEOUT_MS;
  try {
    const read = async () => {
      for (;;) {
        // Also bounds a stream that keeps returning immediately without data.
        if (now() >= deadline) throw new AiRequestError(408, "request_body_timeout");
        const chunk = await reader.read();
        if (now() >= deadline) throw new AiRequestError(408, "request_body_timeout");
        if (chunk.done) break;
        if (!(chunk.value instanceof Uint8Array)) throw new AiRequestError(400, "invalid_json_body");
        bytes += chunk.value.byteLength;
        if (bytes > MAX_AI_REQUEST_BYTES) throw new AiRequestError(413, "request_too_large");
        if (chunk.value.byteLength) chunks.push(chunk.value);
      }
    };
    await Promise.race([
      read(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AiRequestError(408, "request_body_timeout")), AI_BODY_READ_TIMEOUT_MS);
      })
    ]);
    const joined = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
    let value: unknown;
    try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(joined)); }
    catch { throw new AiRequestError(400, "invalid_json_body"); }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new AiRequestError(400, "json_object_required");
    return value as Record<string, unknown>;
  } catch (error) {
    // Do not await cancellation: an untrusted stalled source must not keep
    // the error response pending after its body deadline.
    void reader.cancel().catch(() => undefined);
    if (error instanceof AiRequestError) throw error;
    throw new AiRequestError(400, "invalid_json_body");
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    try { reader.releaseLock(); } catch { /* A pending read may still be cancelling. */ }
  }
}

/**
 * Verified sign-in only, with no body read (numerology_private_message, 2026-11-25): a function that must check its
 * switch and quota before touching the request body calls this, then readBoundedJson. guardAiJsonRequest is the two
 * steps together and behaves exactly as before.
 */
export async function authenticateAiRequest(req: Request, deps: Omit<Dependencies, "bodyClock">) {
  if (!deps.configured) throw new AiRequestError(503, "ai_unavailable");
  const authorization = req.headers.get("Authorization") ?? "";
  if (authorization.length > 16391) throw new AiRequestError(401, "authentication_required");
  const token = /^Bearer ([^\s]+)$/i.exec(authorization)?.[1];
  if (!token || token.length > 16384) throw new AiRequestError(401, "authentication_required");
  let user;
  try { user = await deps.authenticate(token); }
  catch { throw new AiRequestError(503, "authentication_unavailable"); }
  if (!user || typeof user.id !== "string" || !uuid.test(user.id) ||
      user.id === "00000000-0000-0000-0000-000000000000" || user.isAnonymous !== false) {
    throw new AiRequestError(401, "authentication_required");
  }
  return { userId: user.id };
}

export async function guardAiJsonRequest(req: Request, deps: Dependencies) {
  const { userId } = await authenticateAiRequest(req, deps);
  // No body read/parse, prompt lookup or provider work before verified auth.
  const input = await readBoundedJson(req, deps.bodyClock ?? (() => performance.now()));
  return { userId, input };
}
