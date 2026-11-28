# Persona chat streaming contract (`/ai/persona-chat`, Edge Function `ai-persona-chat`)

Tóm tắt cho Owner: nhân vật tri thức (5 sách) trả lời dài hơn và có thể phải chờ lâu. Bản app mới có thể xin "trả lời từng phần" (chữ hiện dần), để màn hình không đứng im. Bản app cũ không đổi gì: vẫn nhận một câu trả lời trọn vẹn như trước.

Status: written 25/11/2026, **not deployed**. Server side: `supabase/functions/ai-persona-chat/{index.ts,stream.ts}`, `supabase/functions/_shared/model-router.ts` (stream gate), `supabase/functions/_shared/providers/openrouter.ts` (OpenRouter SSE). Tests: `model-router-stream_test.ts`, `ai-persona-chat/stream_test.ts`.

## 1. Opting in

Streaming is opt-in. Either of these turns it on:

- body field `"stream": true` (only the boolean `true` counts), or
- request header `Accept: text/event-stream`.

Without either, the endpoint behaves exactly as before: one JSON reply (`application/json`). Old builds are unchanged.

Request body is otherwise the same as today. Limits:

- Body at most **96 KB** (98,304 bytes; was the shared AI default). A larger body gets `413 {"error":"request_too_large"}` before any model call. A client that keeps more history should drop the **oldest** turns first.
- History used by the model: last **8 turns × 800 characters** for standard personas; **12 turns × 2,500 characters** for the `deep_knowledge` tier (Admin may narrow it, never widen past 12 × 2,500). Sending more is harmless; the server cuts it.

## 2. Errors before the stream starts stay JSON

Everything that fails before the model is called answers with a normal JSON body and HTTP status, in stream mode too: `400 text is required`, `400 invalid_request`, `401/403` auth, `413 request_too_large`, `429 daily_limit_reached`, `503 ai_unavailable`, `503 usage_check_unavailable`, `503` feature paused. Check `Content-Type`: only `text/event-stream` responses are streams.

## 3. Event stream

Response: `200`, `Content-Type: text/event-stream; charset=utf-8`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`.

Each event is exactly:

```
event: <name>
data: <one line of JSON>

```

Lines starting with `:` are comments (`: ping` every 15 s). Ignore them; they only keep proxies and the platform idle timer from closing a quiet connection.

| Event | When | `data` |
|---|---|---|
| `meta` | first, once | `{ modelTier, modelTierLabel, outputStyle, deadlineMs, clientRequestId }` — `modelTier` is `standard` / `deep_knowledge` / `premium`; `modelTierLabel` is localized ("Thường", "Tri thức sâu"); `outputStyle` is `concise` / `knowledge`; `deadlineMs` is the server's total wait for this turn. |
| `delta` | 0..n times | `{ text }` — the next piece of visible reply text. Append in order. |
| `done` | last, on success | **The same JSON object the non-stream endpoint returns** (`text`, `moderationStatus`, `promptStack`, `model`, `persistenceStatus`, `remoteSessionId`, `methodPackId`, `methodPackVersion`, plus the additive `modelTier: { key, label }`). |
| `error` | last, on failure | `{ code, retryable, persistenceStatus? }` — `code` is `stream_interrupted` (the model stopped after some text was sent) or `internal_error`. |

The stream always ends with exactly one `done` or one `error`, then closes. If the connection closes without either, treat it as `internal_error` with `retryable: true`.

### Rules for the client

1. **`done.text` is authoritative.** On `done`, replace whatever was built from the deltas with `done.text`. Deltas are a preview. In particular, if the output safety check blocks the reply mid-stream, `done` arrives with `moderationStatus: "blocked"` and a safe fallback `text`; the partial deltas must be discarded.
2. On `error`, keep the partial text visibly marked as incomplete (or remove it) and offer "Thử lại". `stream_interrupted` turns are **not** stored in the chat history (`persistenceStatus: "skipped"`); usage is still logged once.
3. A crisis message never reaches a model: in stream mode the reply is a single `done` event (`moderationStatus: "blocked"`, `safety`, `persistenceStatus: "skipped"`) with no `meta` and no `delta`. Handle `done` arriving first.
4. Text arrives slightly behind the model (the server holds back the last ~21 characters until they pass the output safety check), so the final characters may show up only with `done`.
5. Closing the connection does not cancel the turn on the server: the reply is still generated and saved. Do not send the same message again just because the user left the screen: the server does not de-duplicate (`clientRequestId` is only echoed in `meta` and traces), so a resend is a second turn and a second attempt.

## 4. Fallback and timing

- A fallback model is tried **only before the first `delta`**. Once text has been sent, a failure ends the turn with `error: stream_interrupted`.
- Deadlines (Supabase Edge Functions, https://supabase.com/docs/guides/functions/limits, checked 25/11/2026: wall clock **150 s on Free**, 400 s on paid plans; no response within 150 s gives 504):
  - Free plan (current): total wait capped at **135 s** for streams and for plain JSON.
  - Paid plan: after the Owner upgrades and publishes `platform.wallClockMs = 400000` in the tier config, streams may use the tier's wish (deep_knowledge: 300 s); plain JSON stays at 135–140 s.
- Client timeout: wait at least `meta.deadlineMs + 10 s` after `meta`. A stream that shows nothing (no `delta`, no `: ping`) for 30 s is dead.

## 5. Quota and usage

Unchanged: one chat attempt per request, counted before the model call. Usage is written once per turn (`usage_events`), whether the turn streamed, fell back, was blocked or was interrupted.
