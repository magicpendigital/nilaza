import {
  ModelProviderError,
  ModelProviderRequest,
  ModelProviderResponse,
  normalizeUsage,
  providerErrorFromResponse,
  readJsonResponse
} from "../model-provider.ts";

function geminiRole(role: "user" | "assistant") {
  return role === "assistant" ? "model" : "user";
}

export async function invokeGemini(request: ModelProviderRequest, apiKey: string): Promise<ModelProviderResponse> {
  if (!apiKey) {
    throw new ModelProviderError({
      provider: "gemini",
      code: "missing_api_key",
      message: "GEMINI_API_KEY is not configured.",
      retryable: true
    });
  }

  const startedAt = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(request.model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const requestBody = {
    systemInstruction: {
      parts: [{ text: request.system }]
    },
    contents: request.messages.map((message) => ({
      role: geminiRole(message.role),
      parts: [{ text: message.content }]
    })),
    generationConfig: {
      temperature: request.temperature,
      maxOutputTokens: request.maxOutputTokens
    }
  };
  request.traceHooks?.onRequest?.({
    url: url.split("?")[0],
    method: "POST",
    body: requestBody
  });
  const response = await fetch(url, {
    method: "POST",
    headers: {
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
    requestId: response.headers.get("x-request-id") ?? undefined
  });
  if (!response.ok) throw providerErrorFromResponse("gemini", response.status, text);

  const outputText = (json?.candidates?.[0]?.content?.parts ?? [])
    .map((part: { text?: string }) => part.text ?? "")
    .join("")
    .trim();
  if (!outputText) {
    const blockReason = json?.promptFeedback?.blockReason ?? json?.candidates?.[0]?.finishReason;
    throw new ModelProviderError({
      provider: "gemini",
      code: blockReason ? "provider_safety_block" : "malformed_response",
      message: blockReason ? `Gemini blocked generation: ${blockReason}` : "Gemini response did not contain text.",
      retryable: !blockReason,
      safetyBlocked: Boolean(blockReason)
    });
  }

  return {
    text: outputText,
    provider: "gemini",
    model: request.model,
    requestId: response.headers.get("x-request-id") ?? undefined,
    latencyMs,
    usage: normalizeUsage({
      inputTokens: json?.usageMetadata?.promptTokenCount,
      outputTokens: json?.usageMetadata?.candidatesTokenCount,
      totalTokens: json?.usageMetadata?.totalTokenCount
    }),
    finishReason: json?.candidates?.[0]?.finishReason
  };
}
