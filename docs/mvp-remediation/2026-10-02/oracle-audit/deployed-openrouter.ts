import {
  ModelProviderError,
  ModelProviderRequest,
  ModelProviderResponse,
  normalizeUsage,
  providerErrorFromResponse,
  readJsonResponse
} from "../model-provider.ts";

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

export async function invokeOpenRouter(
  request: ModelProviderRequest,
  apiKey: string,
  attribution?: { siteUrl?: string; appTitle?: string }
): Promise<ModelProviderResponse> {
  if (!apiKey) {
    throw new ModelProviderError({
      provider: "openrouter",
      code: "missing_api_key",
      message: "OPENROUTER_API_KEY is not configured.",
      retryable: true
    });
  }

  const startedAt = Date.now();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
  if (attribution?.siteUrl) headers["HTTP-Referer"] = attribution.siteUrl;
  if (attribution?.appTitle) headers["X-Title"] = attribution.appTitle;

  const requestBody = {
    model: request.model,
    messages: [
      { role: "system", content: request.system },
      ...request.messages.map((message) => ({ role: message.role, content: message.content }))
    ],
    temperature: request.temperature,
    max_tokens: request.maxOutputTokens,
    // The free router may select a reasoning-capable model. Reserve the
    // response budget for the user-visible answer, not hidden reasoning.
    ...(requiresDirectResponse(request) ? { reasoning: { effort: "none" } } : {})
  };
  request.traceHooks?.onRequest?.({
    url: "https://openrouter.ai/api/v1/chat/completions",
    method: "POST",
    body: requestBody
  });
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody)
  });
  const latencyMs = Date.now() - startedAt;
  const { text, json } = await readJsonResponse(response);
  request.traceHooks?.onResponse?.({
    status: response.status,
    body: json ?? { text: text.slice(0, 500) },
    latencyMs,
    requestId: response.headers.get("x-request-id") ?? json?.id
  });
  if (!response.ok) throw providerErrorFromResponse("openrouter", response.status, text);

  const choice = json?.choices?.[0];
  const outputText = contentText(choice?.message?.content) || contentText(choice?.text);
  if (!outputText) {
    throw new ModelProviderError({
      provider: "openrouter",
      code: "malformed_response",
      message: "OpenRouter response did not contain message content.",
      retryable: true
    });
  }

  return {
    text: outputText,
    provider: "openrouter",
    model: typeof json?.model === "string" && json.model.trim() ? json.model : request.model,
    requestId: response.headers.get("x-request-id") ?? json?.id,
    latencyMs,
    usage: normalizeUsage({
      inputTokens: json?.usage?.prompt_tokens,
      outputTokens: json?.usage?.completion_tokens,
      totalTokens: json?.usage?.total_tokens
    }),
    finishReason: choice?.finish_reason
  };
}

