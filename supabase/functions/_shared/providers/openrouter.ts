import {
  ModelProviderError,
  normalizeUsage,
  providerErrorFromResponse,
  PROVIDER_TIMEOUT_MS,
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

function openRouterFormat(request: ModelProviderRequest) {
  // No JSON mode for Tarot: QA 2026-11-03 showed DeepSeek taking 22 s and returning a malformed reply
  // with it on (6 s without). The rejection code in the trace now names any structure problem.
  if (request.feature !== "astrology_report" || request.responseSchema !== "astrology_ai_insight_v1") return {};
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
      zdr: true,
      data_collection: "deny"
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
    ...(reasoning ? { reasoning } : {})
  };
  request.traceHooks?.onRequest?.({
    url: "https://openrouter.ai/api/v1/chat/completions",
    method: "POST",
    body: requestBody
  });
  request.qaTraceHooks?.onRequest?.({
    url: "https://openrouter.ai/api/v1/chat/completions",
    method: "POST",
    body: requestBody
  });
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    headers,
    body: JSON.stringify(requestBody)
  });
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
    const error = providerErrorFromResponse("openrouter", response.status, "");
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
