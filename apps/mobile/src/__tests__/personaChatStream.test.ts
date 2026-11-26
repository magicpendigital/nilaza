import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "util";

import {
  BackendLimitError,
  createSseParser,
  PersonaReplyInput,
  PersonaStreamError,
  SseEvent,
  StreamFetch,
  streamPersonaReply
} from "../backendClient";

const encoder = new NodeTextEncoder();
const Decoder = NodeTextDecoder as unknown as new (label?: string) => { decode(input?: Uint8Array, options?: { stream?: boolean }): string };

function collect(chunks: string[]) {
  const events: SseEvent[] = [];
  const comments: string[] = [];
  const parser = createSseParser((event) => events.push(event), (comment) => comments.push(comment));
  chunks.forEach((chunk) => parser.push(chunk));
  parser.end();
  return { events, comments };
}

describe("createSseParser", () => {
  const stream = "event: meta\ndata: {\"modelTier\":\"deep_knowledge\"}\n\n: ping\n\nevent: delta\ndata: {\"text\":\"Xin chào\"}\n\nevent: done\ndata: {\"text\":\"Xin chào bạn\"}\n\n";

  it("parses whole events, ignores ping comments and keeps order", () => {
    const { events, comments } = collect([stream]);
    expect(events.map((event) => event.event)).toEqual(["meta", "delta", "done"]);
    expect(JSON.parse(events[1].data)).toEqual({ text: "Xin chào" });
    expect(comments).toEqual(["ping"]);
  });

  it("gives the same events when chunks split anywhere, one character at a time", () => {
    expect(collect(stream.split("")).events).toEqual(collect([stream]).events);
  });

  it("handles CRLF and bare CR line ends, including a CRLF split across chunks", () => {
    const crlf = stream.replace(/\n/g, "\r\n");
    const middle = crlf.indexOf("\r\n") + 1;
    expect(collect([crlf.slice(0, middle), crlf.slice(middle)]).events).toEqual(collect([stream]).events);
    expect(collect(crlf.split("")).events).toEqual(collect([stream]).events);
    expect(collect([stream.replace(/\n/g, "\r")]).events).toEqual(collect([stream]).events);
  });

  it("joins multi-line data with a newline and defaults the event name", () => {
    const { events } = collect(["data: first\ndata:second\n\n", "event: delta\ndata\n\n"]);
    expect(events).toEqual([{ event: "message", data: "first\nsecond" }, { event: "delta", data: "" }]);
  });

  it("does not dispatch a last event that never got its blank line", () => {
    expect(collect(["event: done\ndata: {\"text\":\"x\"}"]).events).toEqual([]);
  });
});

type Chunk = string | Uint8Array;

function sseResponse(chunks: Chunk[], options: { hang?: boolean; contentType?: string } = {}) {
  let index = 0;
  const reader = {
    read: jest.fn(() => {
      if (index < chunks.length) {
        const chunk = chunks[index++];
        return Promise.resolve({ done: false, value: typeof chunk === "string" ? encoder.encode(chunk) : chunk });
      }
      if (options.hang) return new Promise<{ done: boolean }>(() => undefined);
      return Promise.resolve({ done: true });
    }),
    cancel: jest.fn()
  };
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? options.contentType ?? "text/event-stream; charset=utf-8" : null) },
    body: { getReader: () => reader },
    json: async () => { throw new SyntaxError("stream is not JSON"); }
  };
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null) },
    body: null,
    json: async () => body
  };
}

const event = (name: string, data: unknown) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;

describe("streamPersonaReply", () => {
  const input: PersonaReplyInput = {
    language: "vi",
    persona: { id: "book-i-ching", slug: "i-ching", type: "book", name: { vi: "Kinh Dịch", en: "I Ching" }, displayRole: "Book", sourceInspiration: "Classic", transparencyNote: "Not the book" } as unknown as PersonaReplyInput["persona"],
    text: "Tôi nên đổi việc không?",
    userContext: { goals: [], tone: "gentle" }
  };
  const backendOptions = { baseUrl: "https://api.example.com", timeoutMs: 1000 };
  let mockFetch: jest.Mock;
  let fallback: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    fallback = jest.fn().mockReturnValue({ text: "canned", moderationStatus: "fallback" });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function run(streamFetch: StreamFetch | null, handlers: Parameters<typeof streamPersonaReply>[2] = {}) {
    return streamPersonaReply(input, fallback, handlers, backendOptions, { streamFetch, TextDecoder: Decoder });
  }

  it("opts in to streaming, grows text from deltas and returns done as the authoritative reply", async () => {
    // "chào" split inside its multi-byte "à" across two network chunks.
    const bytes = encoder.encode(event("delta", { text: "Xin chào" }));
    const cut = bytes.length - 6; // after the first byte of "à"
    const streamFetch = jest.fn().mockResolvedValue(sseResponse([
      event("meta", { modelTier: "deep_knowledge", modelTierLabel: "Tri thức sâu", outputStyle: "knowledge", deadlineMs: 135000 }),
      ": ping\n\n",
      bytes.slice(0, cut),
      bytes.slice(cut),
      event("delta", { text: " bạn" }),
      event("done", { text: "Xin chào bạn (đã kiểm tra).", moderationStatus: "passed", modelTier: { key: "deep_knowledge", label: "Tri thức sâu" } })
    ]));
    const onMeta = jest.fn();
    const onDelta = jest.fn();

    const result = await run(streamFetch, { onMeta, onDelta });

    expect(result).toMatchObject({ text: "Xin chào bạn (đã kiểm tra).", modelTier: { key: "deep_knowledge" } });
    expect(onMeta).toHaveBeenCalledWith(expect.objectContaining({ modelTier: "deep_knowledge", deadlineMs: 135000 }));
    expect(onDelta.mock.calls.map((call) => call[0])).toEqual(["Xin chào", "Xin chào bạn"]);
    const [url, init] = streamFetch.mock.calls[0];
    expect(url).toBe("https://api.example.com/ai/persona-chat");
    expect(init.headers.Accept).toBe("text/event-stream");
    expect(JSON.parse(init.body)).toMatchObject({ stream: true, text: input.text });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("replaces streamed text when the output check blocks the reply mid-stream", async () => {
    const streamFetch = jest.fn().mockResolvedValue(sseResponse([
      event("meta", { modelTier: "standard", deadlineMs: 60000 }),
      event("delta", { text: "Something unsafe" }),
      event("done", { text: "Safe replacement.", moderationStatus: "blocked" })
    ]));
    await expect(run(streamFetch)).resolves.toMatchObject({ text: "Safe replacement.", moderationStatus: "blocked" });
  });

  it("accepts a crisis reply that arrives as a single done without meta", async () => {
    const streamFetch = jest.fn().mockResolvedValue(sseResponse([event("done", { text: "Gọi 115.", moderationStatus: "blocked", safety: "crisis", persistenceStatus: "skipped" })]));
    await expect(run(streamFetch)).resolves.toMatchObject({ safety: "crisis" });
  });

  it("falls back to the JSON call when the streaming request fails before any text", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ text: "json reply", moderationStatus: "passed" }) });
    const streamFetch = jest.fn().mockRejectedValue(new TypeError("stream transport unavailable"));
    await expect(run(streamFetch)).resolves.toMatchObject({ text: "json reply" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).stream).toBeUndefined();
  });

  it("falls back to the JSON call when the stream closes after meta without text, done or error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ text: "json reply", moderationStatus: "passed" }) });
    const streamFetch = jest.fn().mockResolvedValue(sseResponse([event("meta", { deadlineMs: 135000 })]));
    await expect(run(streamFetch)).resolves.toMatchObject({ text: "json reply" });
  });

  it("uses the JSON call when there is no streaming transport", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ text: "json reply", moderationStatus: "passed" }) });
    await expect(run(null)).resolves.toMatchObject({ text: "json reply" });
  });

  it("reads a JSON answer from a server that does not stream yet, and keeps JSON errors", async () => {
    const streamFetch = jest.fn()
      .mockResolvedValueOnce(jsonResponse(200, { text: "old deploy reply", moderationStatus: "passed" }))
      .mockResolvedValueOnce(jsonResponse(429, { error: "daily_limit_reached" }))
      .mockResolvedValueOnce(jsonResponse(413, { error: "request_too_large" }));
    await expect(run(streamFetch)).resolves.toMatchObject({ text: "old deploy reply" });
    await expect(run(streamFetch)).rejects.toEqual(new BackendLimitError("daily_limit_reached", 429));
    await expect(run(streamFetch)).rejects.toMatchObject({ reason: "busy", status: 413 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("keeps the partial text when the stream is interrupted after text was shown", async () => {
    const streamFetch = jest.fn().mockResolvedValue(sseResponse([
      event("meta", { deadlineMs: 135000 }),
      event("delta", { text: "Phần đầu" }),
      event("error", { code: "stream_interrupted", retryable: true, persistenceStatus: "skipped" })
    ]));
    const error = await run(streamFetch).catch((caught) => caught);
    expect(error).toBeInstanceOf(PersonaStreamError);
    expect(error).toMatchObject({ code: "stream_interrupted", retryable: true, partialText: "Phần đầu", persistenceStatus: "skipped" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("says busy, without a second request, when the server reports an error before any text", async () => {
    const streamFetch = jest.fn().mockResolvedValue(sseResponse([event("meta", {}), event("error", { code: "internal_error", retryable: true })]));
    await expect(run(streamFetch)).rejects.toMatchObject({ reason: "busy" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("treats 30 s of silence after text as a lost connection", async () => {
    jest.useFakeTimers();
    const streamFetch = jest.fn().mockResolvedValue(sseResponse([
      event("meta", { deadlineMs: 135000 }),
      event("delta", { text: "Đang nói" })
    ], { hang: true }));
    const pending = run(streamFetch).catch((caught) => caught);
    await jest.advanceTimersByTimeAsync(29000);
    await jest.advanceTimersByTimeAsync(2000);
    await expect(pending).resolves.toMatchObject({ code: "connection_lost", partialText: "Đang nói" });
  });

  it("waits meta.deadlineMs plus a margin instead of a fixed limit", async () => {
    jest.useFakeTimers();
    let index = 0;
    const chunks = [event("meta", { deadlineMs: 300000 }), event("delta", { text: "Chậm" })];
    // A ping every 15 s keeps the idle timer from firing; the total deadline still ends the turn.
    const reader = {
      read: () => index < chunks.length
        ? Promise.resolve({ done: false, value: encoder.encode(chunks[index++]) })
        : new Promise((resolve) => setTimeout(() => resolve({ done: false, value: encoder.encode(": ping\n\n") }), 15000)),
      cancel: jest.fn()
    };
    const streamFetch = jest.fn().mockResolvedValue({ ...sseResponse([]), body: { getReader: () => reader } });
    let settled = false;
    const pending = run(streamFetch).catch((caught) => caught).finally(() => { settled = true; });
    await jest.advanceTimersByTimeAsync(200000);
    expect(settled).toBe(false);
    await jest.advanceTimersByTimeAsync(120000);
    await expect(pending).resolves.toMatchObject({ code: "timeout", partialText: "Chậm" });
  });

  it("stops quietly when the caller aborts", async () => {
    const controller = new AbortController();
    const streamFetch = jest.fn().mockResolvedValue(sseResponse([event("meta", {}), event("delta", { text: "A" })], { hang: true }));
    const pending = run(streamFetch, { signal: controller.signal, onDelta: () => controller.abort() }).catch((caught) => caught);
    await expect(pending).resolves.toMatchObject({ code: "aborted", partialText: "A" });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
