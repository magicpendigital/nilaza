import {
  ModelProviderError,
  ModelProviderRequest,
  ModelProviderResponse,
  normalizeUsage,
  providerErrorDetail,
  providerErrorFromResponse,
  providerTimeoutMs,
  readJsonResponse,
  thrownProviderError
} from "../model-provider.ts";

// Admin A7: DeepSeek direct (OpenAI-compatible chat completions, https://api-docs.deepseek.com, checked 2026-11-13).
// Owner 04/11: public data only; the router enforces that through ai_providers.allowed_data_class.
export const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/chat/completions";

export async function invokeDeepSeek(request: ModelProviderRequest, apiKey: string): Promise<ModelProviderResponse> {
  if (!apiKey) {
    throw new ModelProviderError({ provider: "deepseek", code: "missing_api_key", message: "DEEPSEEK_API_KEY is not configured.", retryable: true });
  }
  const startedAt = Date.now();
  const requestBody = {
    model: request.model,
    messages: [
      { role: "system", content: request.system },
      ...request.messages.map((message) => ({ role: message.role, content: message.content }))
    ],
    temperature: request.temperature,
    max_tokens: request.maxOutputTokens,
    ...(request.jsonMode ? { response_format: { type: "json_object" } } : {})
  };
  request.traceHooks?.onRequest?.({ url: DEEPSEEK_CHAT_URL, method: "POST", body: requestBody });
  let response: Response;
  try {
    response = await fetch(DEEPSEEK_CHAT_URL, {
      method: "POST",
      signal: AbortSignal.timeout(providerTimeoutMs(request.feature, request.timeoutMs)),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
  } catch (error) {
    throw thrownProviderError("deepseek", error);
  }
  const latencyMs = Date.now() - startedAt;
  const { text, json } = await readJsonResponse(response);
  request.traceHooks?.onResponse?.({ status: response.status, body: json ?? { text: text.slice(0, 500) }, latencyMs, requestId: json?.id });
  if (!response.ok) throw providerErrorFromResponse("deepseek", response.status, "", providerErrorDetail(json));
  const choice = json?.choices?.[0];
  const outputText = typeof choice?.message?.content === "string" ? choice.message.content.trim() : "";
  if (!outputText) {
    throw new ModelProviderError({ provider: "deepseek", code: "malformed_response", message: "DeepSeek response did not contain message content.", retryable: true });
  }
  if (choice?.finish_reason === "length" && request.feature !== "persona_chat") {
    throw new ModelProviderError({ provider: "deepseek", code: "malformed_response", message: "DeepSeek response was cut off by the output token limit.", retryable: true });
  }
  return {
    text: outputText,
    provider: "deepseek",
    model: typeof json?.model === "string" ? json.model : request.model,
    requestId: json?.id,
    latencyMs,
    usage: normalizeUsage({ inputTokens: json?.usage?.prompt_tokens, outputTokens: json?.usage?.completion_tokens, totalTokens: json?.usage?.total_tokens }),
    finishReason: choice?.finish_reason
  };
}
