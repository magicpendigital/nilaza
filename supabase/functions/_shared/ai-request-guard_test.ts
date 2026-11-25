import { AiRequestError, aiAuthUserOrUnavailable, aiRequestByteLimit, authenticateAiRequest, guardAiJsonRequest, MAX_AI_REQUEST_BYTES, MAX_AI_REQUEST_BYTES_CEILING } from "./ai-request-guard.ts";

const account = "c96f8b28-dd85-4662-946e-014095b0d11a";
const validUser = { id: account, isAnonymous: false };
const encoder = new TextEncoder();
function assert(condition: unknown, message: string) { if (!condition) throw new Error(message); }
function request(body: BodyInit | null = JSON.stringify({ text: "Một bước nhỏ hôm nay?" }), headers: Record<string, string> = {}) {
  return new Request("https://qa.invalid/ai-persona-chat", {
    method: "POST", body,
    headers: { Authorization: "Bearer synthetic-test-token", "Content-Type": "application/json", ...headers }
  });
}
async function rejected(req: Request, status: number, code: string, user: typeof validUser | null | { id: string; isAnonymous?: boolean } = validUser) {
  let continuation = 0;
  try {
    await guardAiJsonRequest(req, { configured: true, authenticate: async () => user });
    continuation++;
  } catch (error) {
    assert(error instanceof AiRequestError, "stable guard error expected");
    const err = error as AiRequestError;
    assert(err.status === status && err.code === code && err.message === code, `expected ${status}/${code}, got ${err.status}/${err.code}`);
    assert(continuation === 0, "rejected request reached continuation");
    return;
  }
  throw new Error("request unexpectedly accepted");
}
function unreadRequest(headers: Headers, read: () => void) {
  return { headers, get body() { read(); throw new Error("body must stay unread"); } } as unknown as Request;
}
function stream(chunks: Uint8Array[], onCancel?: () => void) {
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) controller.enqueue(chunks[index++]);
      else controller.close();
    }, cancel() { onCancel?.(); }
  });
}

Deno.test("verified account accepts VI/EN JSON and preserves payload; no identity from client fields", async () => {
  for (const text of ["Mình muốn nghe rõ cảm xúc hôm nay.", "What is one small step?"]) {
    const payload = { text, userId: "attacker-controlled", sessionId: "session", sanitizedHistory: [{ role: "guide", text: "Earlier" }] };
    const result = await guardAiJsonRequest(request(JSON.stringify(payload)), { configured: true, authenticate: async token => {
      assert(token === "synthetic-test-token", "auth receives bounded token"); return validUser;
    } });
    assert(result.userId === account, "verified account owns operation");
    assert(JSON.stringify(result.input) === JSON.stringify(payload), "guard changed successful payload");
  }
});
Deno.test("missing config rejects before auth or body", async () => {
  let auth = 0, body = 0;
  try {
    await guardAiJsonRequest(unreadRequest(new Headers(), () => body++), { configured: false, authenticate: async () => { auth++; return validUser; } });
    throw new Error("accepted");
  } catch (error) { assert(error instanceof AiRequestError && error.status === 503 && error.code === "ai_unavailable", "503 config error"); }
  assert(auth === 0 && body === 0, "config failure reached auth/body");
});
Deno.test("missing malformed or oversized Bearer rejects before auth/body", async () => {
  for (const header of ["", "Basic abc", "Bearer a b", "Bearer", "Bearer " + "a".repeat(16385)]) {
    let auth = 0, body = 0;
    try {
      await guardAiJsonRequest(unreadRequest(new Headers({ Authorization: header }), () => body++), {
        configured: true, authenticate: async () => { auth++; return validUser; }
      });
      throw new Error("accepted");
    } catch (error) { assert(error instanceof AiRequestError && error.status === 401, "401 bearer error"); }
    assert(auth === 0 && body === 0, "invalid header reached auth/body");
  }
});
Deno.test("invalid anonymous and unknown identity reject before body; auth exception sanitized", async () => {
  for (const user of [null, { ...validUser, isAnonymous: true }, { id: account }, { ...validUser, id: "client-id" }, { ...validUser, id: "00000000-0000-0000-0000-000000000000" }]) {
    let body = 0;
    await rejected(unreadRequest(new Headers({ Authorization: "Bearer valid" }), () => body++), 401, "authentication_required", user);
    assert(body === 0, "unverified auth read body");
  }
  try {
    await guardAiJsonRequest(request(), { configured: true, authenticate: () => { throw new Error("PRIVATE AUTH DETAIL"); } });
    throw new Error("accepted");
  } catch (error) { assert(error instanceof AiRequestError && error.status === 503 && error.message === "authentication_unavailable", "auth exception leaked"); }
});
Deno.test("authenticateAiRequest verifies the account and never reads the body (numerology switch and quota run first)", async () => {
  let body = 0;
  const result = await authenticateAiRequest(unreadRequest(new Headers({ Authorization: "Bearer valid" }), () => body++), {
    configured: true, authenticate: async () => validUser
  });
  assert(result.userId === account && body === 0, "auth-only step read the body or lost the account");
  for (const [deps, status] of [
    [{ configured: false, authenticate: async () => validUser }, 503],
    [{ configured: true, authenticate: async () => ({ ...validUser, isAnonymous: true }) }, 401],
    [{ configured: true, authenticate: () => { throw new Error("PRIVATE"); } }, 503]
  ] as const) {
    try {
      await authenticateAiRequest(unreadRequest(new Headers({ Authorization: "Bearer valid" }), () => body++), deps as never);
      throw new Error("accepted");
    } catch (error) { assert(error instanceof AiRequestError && error.status === status, `expected ${status}`); }
  }
  assert(body === 0, "a rejected auth-only step read the body");
});
Deno.test("requires JSON object content type and valid JSON UTF8", async () => {
  await rejected(request("{}", { "Content-Type": "text/plain" }), 415, "json_content_type_required");
  for (const body of [null, "", "{", "null", "[]", '"string"', "true"]) {
    await rejected(request(body), 400, ["null", "[]", '"string"', "true"].includes(body ?? "") ? "json_object_required" : "invalid_json_body");
  }
  await rejected(request(new Uint8Array([123, 34, 120, 34, 58, 34, 255, 34, 125])), 400, "invalid_json_body");
  const result = await guardAiJsonRequest(request("{}", { "Content-Type": "Application/JSON; charset=utf-8" }), { configured: true, authenticate: async () => validUser });
  assert(Object.keys(result.input).length === 0, "JSON charset acceptance");
});
Deno.test("declared length oversized or malformed rejects without reading stream", async () => {
  for (const [length, status, code] of [[String(MAX_AI_REQUEST_BYTES + 1), 413, "request_too_large"], ["9".repeat(100000), 413, "request_too_large"], ["-1", 400, "invalid_content_length"], ["1.5", 400, "invalid_content_length"], ["abc", 400, "invalid_content_length"]] as const) {
    let body = 0;
    await rejected(unreadRequest(new Headers({ Authorization: "Bearer valid", "Content-Type": "application/json", "Content-Length": length }), () => body++), status, code);
    assert(body === 0, "declared bound read body");
  }
});
Deno.test("actual bytes enforce cap with no declared length or false smaller length", async () => {
  const exact = JSON.stringify({ text: "a".repeat(MAX_AI_REQUEST_BYTES - 11) });
  assert(encoder.encode(exact).length === MAX_AI_REQUEST_BYTES, "fixture byte boundary");
  const result = await guardAiJsonRequest(request(exact), { configured: true, authenticate: async () => validUser });
  assert((result.input.text as string).length === MAX_AI_REQUEST_BYTES - 11, "exact bound rejected");
  for (const headers of [{}, { "Content-Length": "1" }] as Array<Record<string, string>>) {
    await rejected(request(exact + " ", headers), 413, "request_too_large");
  }
});
Deno.test("counts multibyte UTF8 and joins split characters across chunks", async () => {
  const value = { text: "Một khoảng mở để lắng nghe mình 🌙" }, bytes = encoder.encode(JSON.stringify(value));
  const result = await guardAiJsonRequest(request(stream(Array.from(bytes, b => new Uint8Array([b])))), { configured: true, authenticate: async () => validUser });
  assert(result.input.text === value.text, "split UTF8 corrupted");
  const tooLarge = JSON.stringify({ text: "ắ".repeat(12000) });
  assert(tooLarge.length < MAX_AI_REQUEST_BYTES && encoder.encode(tooLarge).length > MAX_AI_REQUEST_BYTES, "fixture distinguishes characters/bytes");
  await rejected(request(tooLarge), 413, "request_too_large");
});
Deno.test("oversized chunked body cancels stream before continuation", async () => {
  let cancelled = false;
  const body = stream([encoder.encode('{"text":"'), new Uint8Array(MAX_AI_REQUEST_BYTES).fill(97), encoder.encode('"}')], () => { cancelled = true; });
  await rejected(request(body), 413, "request_too_large");
  assert(cancelled, "oversized source not cancelled");
});
Deno.test("stream errors are sanitized and have no accepted continuation", async () => {
  const body = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error("PRIVATE STREAM DATA")); } });
  await rejected(request(body), 400, "invalid_json_body");
});
Deno.test("stalled stream body times out and cancels instead of waiting forever", async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
  await rejected(request(body), 408, "request_body_timeout");
  assert(cancelled, "stalled source not cancelled");
});

Deno.test("late EOF cannot accept valid JSON after the monotonic body deadline", async () => {
  let now = 0, reads = 0, cancelled = false;
  const req = {
    headers: new Headers({ Authorization: "Bearer valid", "Content-Type": "application/json" }),
    body: { getReader: () => ({
      read: async () => {
        if (++reads === 1) return { done: false, value: encoder.encode("{}") };
        now = 6000; // EOF resolves after deadline, while the timer callback is still queued.
        return { done: true, value: undefined };
      }, cancel: async () => { cancelled = true; }, releaseLock: () => undefined
    }) }
  } as unknown as Request;
  try {
    await guardAiJsonRequest(req, { configured: true, authenticate: async () => validUser, bodyClock: () => now });
    throw new Error("late body accepted");
  } catch (error) { assert(error instanceof AiRequestError && error.status === 408, "late EOF must respect deadline"); }
  assert(cancelled, "late reader not cancelled");
});

Deno.test("returned Auth errors distinguish explicit rejection from unavailable service", async () => {
  const user = { id: account, is_anonymous: false };
  const mapped = aiAuthUserOrUnavailable(user, null);
  assert(mapped?.id === account && mapped.isAnonymous === false, "verified Auth response mapping");
  for (const status of [400, 401, 403]) {
    await rejected(request(), 401, "authentication_required", aiAuthUserOrUnavailable(user, { status, message: "PRIVATE AUTH DETAIL" }));
  }
  for (const error of [{ status: 429 }, { status: 500 }, { status: 502 }, { message: "PRIVATE AUTH DETAIL" }]) {
    try {
      await guardAiJsonRequest(request(), { configured: true, authenticate: async () => aiAuthUserOrUnavailable(user, error) });
      throw new Error("Auth outage accepted");
    } catch (err) { assert(err instanceof AiRequestError && err.status === 503 && err.code === "authentication_unavailable", "returned Auth outage must be sanitized 503"); }
  }
});
Deno.test("a function may raise its own body cap up to the 5-digit ceiling; others keep 32 KB", async () => {
  assert(aiRequestByteLimit(undefined) === MAX_AI_REQUEST_BYTES && aiRequestByteLimit(0) === MAX_AI_REQUEST_BYTES && aiRequestByteLimit(1.5) === MAX_AI_REQUEST_BYTES, "invalid cap must keep default");
  assert(aiRequestByteLimit(1_000_000) === MAX_AI_REQUEST_BYTES_CEILING, "cap above ceiling must clamp");
  const maxBytes = 96 * 1024;
  const large = JSON.stringify({ text: "a".repeat(MAX_AI_REQUEST_BYTES + 100) });
  const accepted = await guardAiJsonRequest(request(large), { configured: true, authenticate: async () => validUser, maxBytes });
  assert((accepted.input.text as string).length === MAX_AI_REQUEST_BYTES + 100, "raised cap rejected a body under it");
  await rejected(request(large), 413, "request_too_large");
  let thrown: unknown;
  try {
    await guardAiJsonRequest(request(JSON.stringify({ text: "a".repeat(maxBytes) })), { configured: true, authenticate: async () => validUser, maxBytes });
  } catch (error) { thrown = error; }
  assert(thrown instanceof AiRequestError && thrown.status === 413, "body above the raised cap must be rejected");
});
