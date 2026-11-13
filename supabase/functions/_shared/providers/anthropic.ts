import {
  ModelProviderError,
  ModelProviderRequest,
  ModelProviderResponse,
  firstText,
  normalizeUsage,
  providerErrorFromResponse,
  PROVIDER_TIMEOUT_MS,
  providerTimeoutMs,
  readJsonResponse
} from "../model-provider.ts";

export async function invokeAnthropic(request: ModelProviderRequest, apiKey: string): Promise<ModelProviderResponse> {
  if (!apiKey) {
    throw new ModelProviderError({
      provider: "anthropic",
      code: "missing_api_key",
      message: "ANTHROPIC_API_KEY is not configured.",
      retryable: true
    });
  }

  const startedAt = Date.now();
  const requestBody = {
    model: request.model,
    system: request.system,
    messages: request.messages.map((message) => ({ role: message.role, content: message.content })),
    temperature: request.temperature,
    max_tokens: request.maxOutputTokens
  };
  request.traceHooks?.onRequest?.({
    url: "https://api.anthropic.com/v1/messages",
    method: "POST",
    body: requestBody
  });
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: AbortSignal.timeout(providerTimeoutMs(request.feature, request.timeoutMs)),
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });
  const latencyMs = Date.now() - startedAt;
  const { text, json } = await readJsonResponse(response);
  request.traceHooks?.onResponse?.({
    status: response.status,
    body: json ?? { text: text.slice(0, 500) },
    latencyMs,
    requestId: response.headers.get("request-id") ?? json?.id
  });
  if (!response.ok) throw providerErrorFromResponse("anthropic", response.status, text);

  const outputText = (Array.isArray(json?.content) ? json.content : [])
    .map((item: { text?: string }) => firstText(item.text))
    .filter(Boolean)
    .join("\n")
    .trim();
  if (!outputText) {
    throw new ModelProviderError({
      provider: "anthropic",
      code: "malformed_response",
      message: "Anthropic response did not contain text content.",
      retryable: true
    });
  }

  return {
    text: outputText,
    provider: "anthropic",
    model: request.model,
    requestId: response.headers.get("request-id") ?? json?.id,
    latencyMs,
    usage: normalizeUsage({
      inputTokens: json?.usage?.input_tokens,
      outputTokens: json?.usage?.output_tokens
    }),
    finishReason: json?.stop_reason
  };
}
