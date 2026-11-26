// Server-Sent Events for persona chat (docs/contracts/persona-chat-streaming.md). Events: meta, delta, done, error;
// comment lines (": ping") keep proxies and the platform idle timer from closing a quiet connection.

export const SSE_HEARTBEAT_MS = 15_000;
export type PersonaStreamEvent = "meta" | "delta" | "done" | "error";

const encoder = new TextEncoder();

/** One SSE event. JSON.stringify never emits a raw newline, so the data always fits on one `data:` line. */
export function sseEvent(name: PersonaStreamEvent, data: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function sseComment(text: string): string {
  return `: ${text.replace(/[\r\n]+/g, " ")}\n\n`;
}

/** The client asked for a stream: `"stream": true` in the body or `Accept: text/event-stream`. */
export function wantsEventStream(req: Request, input: { stream?: unknown }): boolean {
  if (input.stream === true) return true;
  return (req.headers.get("Accept") ?? "").toLowerCase().includes("text/event-stream");
}

export type SseWriter = {
  send: (name: PersonaStreamEvent, data: unknown) => void;
  comment: (text: string) => void;
  close: () => void;
  readonly closed: boolean;
  /** The person's app went away (the body was cancelled). The turn still finishes and is stored. */
  readonly disconnected: boolean;
};

/**
 * A response body plus a writer. Writes after close or after the client disconnected are dropped silently, so a closed
 * connection never aborts the model call (the reply is still saved to the chat history).
 */
export function createSseStream(options: { heartbeatMs?: number } = {}): { body: ReadableStream<Uint8Array>; writer: SseWriter } {
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  let closed = false;
  let disconnected = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const stop = () => {
    if (heartbeat !== undefined) clearInterval(heartbeat);
    heartbeat = undefined;
  };
  const write = (chunk: string) => {
    if (closed || disconnected || !controller) return;
    try {
      controller.enqueue(encoder.encode(chunk));
    } catch {
      disconnected = true;
      stop();
    }
  };
  const body = new ReadableStream<Uint8Array>({
    start(value) {
      controller = value;
      const every = options.heartbeatMs ?? SSE_HEARTBEAT_MS;
      if (every > 0) heartbeat = setInterval(() => write(sseComment("ping")), every);
    },
    cancel() {
      disconnected = true;
      stop();
    }
  });
  const writer: SseWriter = {
    send: (name, data) => write(sseEvent(name, data)),
    comment: (text) => write(sseComment(text)),
    close: () => {
      if (closed) return;
      closed = true;
      stop();
      try {
        controller?.close();
      } catch {
        // Already cancelled by the client.
      }
    },
    get closed() {
      return closed;
    },
    get disconnected() {
      return disconnected;
    }
  };
  return { body, writer };
}

export function sseResponse(body: ReadableStream<Uint8Array>, corsHeaders: Record<string, string>): Response {
  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no"
    }
  });
}

/** A one-event stream: the crisis reply in stream mode, which never calls a model. */
export function singleEventResponse(name: PersonaStreamEvent, data: unknown, corsHeaders: Record<string, string>): Response {
  return sseResponse(new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(sseEvent(name, data)));
      controller.close();
    }
  }), corsHeaders);
}
