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

function extractOutputText(json: any) {
  if (typeof json?.output_text === "string") return json.output_text;
  const output = Array.isArray(json?.output) ? json.output : [];
  const parts: string[] = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const contentItem of content) {
      const text = firstText(contentItem?.text, contentItem?.transcript);
      if (text) parts.push(text);
    }
  }
  return parts.join("\n").trim();
}

export async function invokeOpenAI(request: ModelProviderRequest, apiKey: string): Promise<ModelProviderResponse> {
  if (!apiKey) {
    throw new ModelProviderError({
      provider: "openai",
      code: "missing_api_key",
      message: "OPENAI_API_KEY is not configured.",
      retryable: true
    });
  }

  const startedAt = Date.now();
  const requestBody = {
    model: request.model,
    messages: [
      { role: "system", content: request.system },
      ...request.messages.map((message) => ({
        role: message.role,
        content: message.content
      }))
    ],
    temperature: request.temperature,
    max_tokens: request.maxOutputTokens
  };
  request.traceHooks?.onRequest?.({
    url: "https://api.openai.com/v1/chat/completions",
    method: "POST",
    body: requestBody
  });
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(providerTimeoutMs(request.feature)),
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
    requestId: response.headers.get("x-request-id") ?? json?.id
  });
  if (!response.ok) throw providerErrorFromResponse("openai", response.status, text);

  const outputText = json?.choices?.[0]?.message?.content?.trim();
  if (!outputText) {
    throw new ModelProviderError({
      provider: "openai",
      code: "malformed_response",
      message: "OpenAI response did not contain output text.",
      retryable: true
    });
  }

  return {
    text: outputText,
    provider: "openai",
    model: request.model,
    requestId: response.headers.get("x-request-id") ?? json?.id,
    latencyMs,
    usage: normalizeUsage({
      inputTokens: json?.usage?.prompt_tokens,
      outputTokens: json?.usage?.completion_tokens,
      totalTokens: json?.usage?.total_tokens
    }),
    finishReason: json?.choices?.[0]?.finish_reason
  };
}
