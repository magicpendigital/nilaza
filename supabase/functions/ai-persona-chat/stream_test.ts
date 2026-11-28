// SSE framing for persona chat (docs/contracts/persona-chat-streaming.md).
import { createSseStream, singleEventResponse, sseComment, sseEvent, sseResponse, wantsEventStream } from "./stream.ts";

function assert(value: unknown, label: string) { if (!value) throw new Error(label); }

async function readAll(body: ReadableStream<Uint8Array>) {
  return await new Response(body).text();
}
/** Parse SSE text into events the way a client would. */
function parse(text: string) {
  return text.split("\n\n").filter(Boolean).filter((block) => !block.startsWith(":")).map((block) => {
    const lines = block.split("\n");
    const event = lines.find((line) => line.startsWith("event: "))!.slice(7);
    const data = JSON.parse(lines.find((line) => line.startsWith("data: "))!.slice(6));
    return { event, data };
  });
}

Deno.test("sse: one event is one event line and one data line, even with newlines in the text", () => {
  const frame = sseEvent("delta", { text: "dòng 1\ndòng 2\r\n" });
  assert(frame === `event: delta\ndata: ${JSON.stringify({ text: "dòng 1\ndòng 2\r\n" })}\n\n`, "framing");
  assert(frame.split("\n").length === 4 && JSON.parse(frame.split("\n")[1].slice(6)).text === "dòng 1\ndòng 2\r\n", "newlines stay inside the JSON");
  assert(sseComment("ping\nx") === ": ping x\n\n", "comment on one line");
});

Deno.test("sse: opt-in by body flag or Accept header only", () => {
  const plain = new Request("https://x.test", { method: "POST" });
  const accept = new Request("https://x.test", { method: "POST", headers: { Accept: "text/event-stream" } });
  assert(!wantsEventStream(plain, {}) && !wantsEventStream(plain, { stream: "true" }) && !wantsEventStream(plain, { stream: 1 }), "only true counts");
  assert(wantsEventStream(plain, { stream: true }) && wantsEventStream(accept, {}), "body flag or header");
});

Deno.test("sse: writer sends meta, deltas and done in order, then closes; writes after close are dropped", async () => {
  const { body, writer } = createSseStream({ heartbeatMs: 0 });
  writer.send("meta", { modelTier: "deep_knowledge" });
  writer.send("delta", { text: "Xin " });
  writer.send("delta", { text: "chào" });
  writer.send("done", { text: "Xin chào", persistenceStatus: "saved" });
  writer.close();
  writer.send("delta", { text: "late" });
  assert(writer.closed && !writer.disconnected, "closed by the server");
  const events = parse(await readAll(body));
  assert(events.map((e) => e.event).join(",") === "meta,delta,delta,done", "order");
  assert(events.filter((e) => e.event === "delta").map((e) => e.data.text).join("") === "Xin chào", "deltas join");
});

Deno.test("sse: heartbeat comments keep the line busy; a client cancel marks disconnected and stops writes", async () => {
  const { body, writer } = createSseStream({ heartbeatMs: 5 });
  const reader = body.getReader();
  const first = new TextDecoder().decode((await reader.read()).value);
  assert(first === ": ping\n\n", "ping comment");
  await reader.cancel();
  assert(writer.disconnected, "disconnected");
  writer.send("delta", { text: "ignored" });
  writer.close();
});

Deno.test("sse: response headers and the single-event (crisis) response", async () => {
  const cors = { "Access-Control-Allow-Origin": "*" };
  const response = sseResponse(new ReadableStream(), cors);
  assert(response.headers.get("Content-Type") === "text/event-stream; charset=utf-8", "content type");
  assert(response.headers.get("Cache-Control") === "no-cache, no-transform" && response.headers.get("X-Accel-Buffering") === "no", "no buffering");
  assert(response.headers.get("Access-Control-Allow-Origin") === "*", "cors kept");
  const single = singleEventResponse("done", { text: "Bạn không một mình.", moderationStatus: "crisis" }, cors);
  const events = parse(await single.text());
  assert(events.length === 1 && events[0].event === "done" && events[0].data.moderationStatus === "crisis", "one done event");
});
