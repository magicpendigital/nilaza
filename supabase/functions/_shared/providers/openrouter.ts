import {
  ModelProviderError,
  normalizeUsage,
  providerErrorDetail,
  providerErrorFromResponse,
  thrownProviderError,
  PROVIDER_TIMEOUT_MS,
  providerTimeoutMs,
  readJsonResponse
} from "../model-provider.ts";
import type { ModelProviderRequest, ModelProviderResponse } from "../model-provider.ts";
import { ASTROLOGY_AI_RESPONSE_SCHEMA } from "../astrology-ai-insight-contract.ts";
import { readOpenRouterBillingReceipt } from "./openrouter-billing.ts";

const ASTROLOGY_AI_MODEL_OUTPUT_FIELDS = [
  "headline",
  "synthesis",
  "evidenceFactIds",
  "patterns",
  "tensions",
  "focusSections",
  "reflectionQuestions",
  "suggestedFollowUps"
] as const;

type SchemaObject = Record<string, any>;

function astrologyModelOutputSchema() {
  const canonical = ASTROLOGY_AI_RESPONSE_SCHEMA as unknown as SchemaObject;
  const resolve = (value: any): any => {
    if (!value || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(resolve);
    if (typeof value.$ref === "string") {
      const match = value.$ref.match(/^#\/definitions\/([A-Za-z0-9_-]+)$/);
      if (match) return resolve(canonical.definitions[match[1]]);
    }
    const result: SchemaObject = {};
    for (const [key, child] of Object.entries(value)) {
      if (["$schema", "$id", "title", "$ref", "minLength", "maxLength", "minItems", "maxItems", "uniqueItems", "pattern"].includes(key)) continue;
      if (key === "const") {
        result.enum = [child];
        continue;
      }
      result[key] = resolve(child);
    }
    return result;
  };

  const properties = canonical.properties as SchemaObject;
  return {
    type: "object",
    additionalProperties: false,
    required: [...ASTROLOGY_AI_MODEL_OUTPUT_FIELDS],
    properties: Object.fromEntries(ASTROLOGY_AI_MODEL_OUTPUT_FIELDS.map((field) => [field, resolve(properties[field])]))
  };
}

// LLM phase 0 (Owner 2026-11-04): every feature routes only to zero-data-retention endpoints that do not
// collect data (chat, journal and birth data included). Both default models have ZDR endpoints (public list 2026-11-11).
export const OPENROUTER_PRIVACY = { zdr: true, data_collection: "deny" } as const;

export function openRouterFormat(request: ModelProviderRequest) {
  // No JSON mode for Tarot: QA 2026-11-03 showed DeepSeek taking 22 s and returning a malformed reply
  // with it on (6 s without). The rejection code in the trace now names any structure problem.
  if (request.feature !== "astrology_report" || request.responseSchema !== "astrology_ai_insight_v1") {
    // A7: a step chain may turn JSON mode on per step; ZDR/deny stays on for every feature.
    return request.jsonMode
      ? { response_format: { type: "json_object" }, provider: { ...OPENROUTER_PRIVACY } }
      : { provider: { ...OPENROUTER_PRIVACY } };
  }
  return {
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "nilaza_astrology_ai_model_output_v1",
        strict: true,
        schema: astrologyModelOutputSchema()
      }
    },
    provider: {
      require_parameters: true,
      ...OPENROUTER_PRIVACY
    }
  };
}

function contentText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as { text?: unknown; content?: unknown };
    return contentText(record.text) || contentText(record.content);
  }
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string"
      ? (part as { text: string }).text.trim()
      : "")
    .filter(Boolean)
    .join("\n");
}

function requiresDirectResponse(request: ModelProviderRequest) {
  // Persona Chat is interactive; reserve output for the user-visible reply.
  // Deeper report routes can opt into reasoning independently.
  return request.feature === "persona_chat" || request.model === "openrouter/free";
}

// Reasoning tokens count toward max_tokens; a model left on its default can spend the whole
// budget thinking and return nothing (QA 2026-11-02: 1956 of 2000 tokens). OpenRouter takes
// either an effort or a max_tokens budget, not both.
export function openRouterReasoning(request: ModelProviderRequest) {
  const setting = request.reasoning;
  if (setting?.mode === "off") return { effort: "none" };
  if (setting?.maxTokens) return { max_tokens: setting.maxTokens };
  if (setting) return { effort: setting.mode };
  return requiresDirectResponse(request) ? { effort: "none" } : undefined;
}

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
type OpenRouterAttribution = { siteUrl?: string; appTitle?: string };

function openRouterRequest(request: ModelProviderRequest, apiKey: string, attribution: OpenRouterAttribution | undefined, stream: boolean) {
  if (!apiKey) {
    throw new ModelProviderError({
      provider: "openrouter",
      code: "missing_api_key",
      message: "OPENROUTER_API_KEY is not configured.",
      retryable: true
    });
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
  if (attribution?.siteUrl) headers["HTTP-Referer"] = attribution.siteUrl;
  if (attribution?.appTitle) headers["X-Title"] = attribution.appTitle;

  const reasoning = openRouterReasoning(request);
  const requestBody = {
    model: request.model,
    messages: [
      { role: "system", content: request.system },
      ...request.messages.map((message) => ({ role: message.role, content: message.content }))
    ],
    temperature: request.temperature,
    max_tokens: request.maxOutputTokens,
    ...openRouterFormat(request),
    ...(reasoning ? { reasoning } : {}),
    ...(stream ? { stream: true } : {})
  };
  request.traceHooks?.onRequest?.({ url: OPENROUTER_CHAT_URL, method: "POST", body: requestBody });
  request.qaTraceHooks?.onRequest?.({ url: OPENROUTER_CHAT_URL, method: "POST", body: requestBody });
  return { headers, requestBody };
}

export async function invokeOpenRouter(
  request: ModelProviderRequest,
  apiKey: string,
  attribution?: OpenRouterAttribution
): Promise<ModelProviderResponse> {
  if (request.onDelta) return invokeOpenRouterStream(request, apiKey, attribution);
  const { headers, requestBody } = openRouterRequest(request, apiKey, attribution, false);
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(OPENROUTER_CHAT_URL, {
      method: "POST",
      signal: AbortSignal.timeout(providerTimeoutMs(request.feature, request.timeoutMs)),
      headers,
      body: JSON.stringify(requestBody)
    });
  } catch (error) {
    throw thrownProviderError("openrouter", error);
  }
  const latencyMs = Date.now() - startedAt;
  const { text, json } = await readJsonResponse(response);
  const billingReceipt = readOpenRouterBillingReceipt(json, request.model, response.headers.get("x-request-id"));
  try {
    request.traceHooks?.onResponse?.({
      status: response.status,
      body: json ?? { text: text.slice(0, 500) },
      latencyMs,
      requestId: billingReceipt.requestId
    });
    request.qaTraceHooks?.onResponse?.({
      status: response.status,
      body: json ?? text,
      latencyMs,
      requestId: billingReceipt.requestId
    });
  } catch {
    // A failed trace hook after dispatch is not evidence that the model failed
    // or billed zero. Preserve the receipt and prohibit paid failover here.
    throw new ModelProviderError({ provider: "openrouter", code: "trace_capture_failed", message: "Provider response trace capture failed.", retryable: false, billingReceipt });
  }
  if (!response.ok) {
    const error = providerErrorFromResponse("openrouter", response.status, "", providerErrorDetail(json));
    error.billingReceipt = billingReceipt;
    throw error;
  }

  const choice = json?.choices?.[0];
  const outputText = contentText(choice?.message?.content) || contentText(choice?.text);
  if (!outputText) {
    throw new ModelProviderError({
      provider: "openrouter",
      code: "malformed_response",
      message: "OpenRouter response did not contain message content.",
      retryable: true,
      billingReceipt
    });
  }
  // A JSON reply cut off by the output limit cannot be parsed; let the route fall back.
  if (choice?.finish_reason === "length" && request.feature !== "persona_chat") {
    throw new ModelProviderError({
      provider: "openrouter",
      code: "malformed_response",
      message: "OpenRouter response was cut off by the output token limit.",
      retryable: true,
      billingReceipt
    });
  }

  return {
    text: outputText,
    provider: "openrouter",
    model: billingReceipt.model,
    requestId: billingReceipt.requestId,
    latencyMs,
    usage: normalizeUsage({
      inputTokens: json?.usage?.prompt_tokens,
      outputTokens: json?.usage?.completion_tokens,
      totalTokens: json?.usage?.total_tokens
    }),
    finishReason: choice?.finish_reason,
    billingReceipt
  };
}

function streamTimeoutError(message: string) {
  return new DOMException(message, "TimeoutError");
}

type StreamChunk = {
  id?: unknown;
  model?: unknown;
  provider?: unknown;
  usage?: unknown;
  error?: unknown;
  choices?: Array<{ delta?: { content?: unknown }; finish_reason?: unknown }>;
};

/**
 * Persona chat streaming (docs/contracts/persona-chat-streaming.md). The same request as invokeOpenRouter plus
 * `stream: true`; OpenRouter sends SSE `data:` chunks, `:` comment lines while it works, and `data: [DONE]` at the end
 * (https://openrouter.ai/docs/api-reference/streaming, checked 25/11/2026). Visible text goes to request.onDelta as it
 * arrives; reasoning text (delta.reasoning) is never forwarded. A mid-stream failure is a chunk with a top-level
 * `error` on HTTP 200. Aborting the request stops OpenRouter billing for the rest of the generation.
 *
 * Timing: the attempt timeout (providerTimeoutMs) bounds the wait for the first visible text; after that the stream
 * may run until request.streamDeadlineAt (the tier deadline), so a long knowledge answer is not cut at the attempt cap.
 */
export async function invokeOpenRouterStream(
  request: ModelProviderRequest,
  apiKey: string,
  attribution?: OpenRouterAttribution
): Promise<ModelProviderResponse> {
  const { headers, requestBody } = openRouterRequest(request, apiKey, attribution, true);
  const startedAt = Date.now();
  const controller = new AbortController();
  const firstTextMs = providerTimeoutMs(request.feature, request.timeoutMs);
  let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(
    () => controller.abort(streamTimeoutError("No visible text before the attempt timeout.")),
    firstTextMs
  );
  const switchToStreamDeadline = () => {
    if (timer !== undefined) clearTimeout(timer);
    const remaining = Math.max(1, (request.streamDeadlineAt ?? startedAt + firstTextMs) - Date.now());
    timer = setTimeout(() => controller.abort(streamTimeoutError("Stream deadline reached.")), remaining);
  };

  let finished = false;
  let id: unknown;
  let model: unknown;
  let upstreamProvider: unknown;
  let usage: Record<string, unknown> | undefined;
  let finishReason: string | undefined;
  let text = "";
  let firstTextAt: number | undefined;
  let httpRequestId: string | null = null;
  const receipt = () => readOpenRouterBillingReceipt({ id, model, provider: upstreamProvider, usage }, request.model, httpRequestId);

  const handleData = (data: string) => {
    if (data === "[DONE]") return true;
    let chunk: StreamChunk;
    try {
      chunk = JSON.parse(data);
    } catch {
      return false; // A non-JSON line is skipped; the final text check catches an empty stream.
    }
    if (typeof chunk?.id === "string") id = chunk.id;
    if (typeof chunk?.model === "string") model = chunk.model;
    if (typeof chunk?.provider === "string") upstreamProvider = chunk.provider;
    if (chunk?.usage && typeof chunk.usage === "object") usage = chunk.usage as Record<string, unknown>;
    if (chunk?.error) {
      const error = new ModelProviderError({
        provider: "openrouter",
        code: "provider_stream_error",
        message: "OpenRouter reported an error during the stream.",
        retryable: true,
        billingReceipt: receipt()
      });
      error.providerDetail = providerErrorDetail({ error: chunk.error });
      throw error;
    }
    const choice = chunk?.choices?.[0];
    if (typeof choice?.finish_reason === "string") finishReason = choice.finish_reason;
    const piece = typeof choice?.delta?.content === "string" ? choice.delta.content : "";
    if (!piece) return false;
    text += piece;
    if (firstTextAt === undefined) {
      // Leading whitespace is not visible text: keep the first-text timer until real text arrives.
      if (!text.trim()) return false;
      firstTextAt = Date.now();
      switchToStreamDeadline();
      request.onDelta?.(text.replace(/^\s+/, ""));
      return false;
    }
    request.onDelta?.(piece);
    return false;
  };

  try {
    let response: Response;
    try {
      response = await fetch(OPENROUTER_CHAT_URL, {
        method: "POST",
        signal: controller.signal,
        headers,
        body: JSON.stringify(requestBody)
      });
    } catch (error) {
      throw thrownProviderError("openrouter", controller.signal.reason ?? error);
    }
    httpRequestId = response.headers.get("x-request-id");
    if (!response.ok || !response.body) {
      const { text: errorText, json } = await readJsonResponse(response);
      const billingReceipt = readOpenRouterBillingReceipt(json, request.model, httpRequestId);
      request.traceHooks?.onResponse?.({ status: response.status, body: json ?? { text: errorText.slice(0, 500) }, latencyMs: Date.now() - startedAt, requestId: billingReceipt.requestId });
      request.qaTraceHooks?.onResponse?.({ status: response.status, body: json ?? errorText, latencyMs: Date.now() - startedAt, requestId: billingReceipt.requestId });
      const error = providerErrorFromResponse("openrouter", response.ok ? 502 : response.status, "", providerErrorDetail(json));
      error.billingReceipt = billingReceipt;
      throw error;
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    let sawDone = false;
    while (!sawDone) {
      let result: ReadableStreamReadResult<string>;
      try {
        result = await reader.read();
      } catch (error) {
        throw thrownProviderError("openrouter", controller.signal.reason ?? error);
      }
      if (result.done) break;
      buffer += result.value;
      let newline = buffer.indexOf("\n");
      while (newline >= 0 && !sawDone) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (line.startsWith("data:")) sawDone = handleData(line.slice(5).trim());
        newline = buffer.indexOf("\n");
      }
    }
    if (!sawDone && buffer.startsWith("data:")) handleData(buffer.slice(5).trim());
    // Release the connection; the generation has finished (or the server closed the stream).
    reader.cancel().catch(() => undefined);

    const latencyMs = Date.now() - startedAt;
    const billingReceipt = receipt();
    const json = { id, model, provider: upstreamProvider, usage, choices: [{ message: { content: text }, finish_reason: finishReason }] };
    try {
      request.traceHooks?.onResponse?.({ status: response.status, body: json, latencyMs, requestId: billingReceipt.requestId });
      request.qaTraceHooks?.onResponse?.({ status: response.status, body: json, latencyMs, requestId: billingReceipt.requestId });
    } catch {
      throw new ModelProviderError({ provider: "openrouter", code: "trace_capture_failed", message: "Provider response trace capture failed.", retryable: false, billingReceipt });
    }
    const outputText = text.trim();
    if (!outputText) {
      throw new ModelProviderError({
        provider: "openrouter",
        code: "malformed_response",
        message: "OpenRouter stream did not contain message content.",
        retryable: true,
        billingReceipt
      });
    }
    finished = true;
    return {
      text: outputText,
      provider: "openrouter",
      model: billingReceipt.model,
      requestId: billingReceipt.requestId,
      latencyMs,
      usage: normalizeUsage({
        inputTokens: usage?.prompt_tokens,
        outputTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens
      }),
      finishReason,
      billingReceipt,
      firstTextMs: firstTextAt === undefined ? undefined : firstTextAt - startedAt
    };
  } catch (error) {
    if (error instanceof ModelProviderError) {
      error.billingReceipt ??= receipt();
      throw error;
    }
    // onDelta threw (the router's mid-stream safety check, for example) or another runtime error.
    throw error;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    // Stop the generation (and its billing) whenever we leave early: timeout, error, or the caller's onDelta threw.
    if (!finished) controller.abort(new DOMException("Stream closed early.", "AbortError"));
  }
}
