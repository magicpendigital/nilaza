# Nilaza LLM Integration & Dynamic Router Architecture

Last updated: 2026-09-09

## 1. Overview & Business Objectives

Nilaza is a mystical AI companion designed for reflection, tarot, astrology, and wisdom conversations. To move from the staging mock phase to production readiness, the backend requires integration with actual LLM providers.

This architecture specification defines the design and implementation guidelines for integrating four primary LLM providers:
- **Google Gemini** (Gemini 2.5 Flash / Gemini 1.5 Pro)
- **OpenAI** (GPT-4o / GPT-4o-mini)
- **OpenRouter** (Unified multi-model gateway: Claude, Llama, DeepSeek, Mistral, etc.)
- **Anthropic** (Claude 3.5 Sonnet / Claude 3 Haiku)

### Key Architectural Goal
Enable administrators on the **Nilaza Admin Web Console (`apps/admin`)** to dynamically route feature requests to different LLM providers and models, adjust parameters (temperature, max tokens), and configure failover/fallback providers in real-time without redeploying backend code or mobile client apps.

---

## 2. Codebase Review & Current Readiness Assessment

| Component | Current State | Readiness | Key Gaps & Needed Changes |
| :--- | :--- | :--- | :--- |
| **Mobile Client (`apps/mobile`)** | Clean separation; calls backend API via gateway helper `callBackendGateway`. | **Ready** | No client changes required for provider calls. Mobile never holds provider secrets. |
| **Supabase Edge Functions (`supabase/functions/`)** | Shared model router now calls OpenAI, Gemini, OpenRouter, and Anthropic adapters with active route lookup and fallback. | **Staging Ready** | Provider secrets, deployed migration, live quota checks, and production rollout remain environment tasks. |
| **Database Schema (`supabase/migrations/`)** | Has versioned model routes plus privacy-first `ai_trace_runs` and `ai_trace_spans` index tables with RLS/RPC admin reads. | **Staging Ready** | Apply the latest migrations and configure retention/observability settings per environment. |
| **Admin Console (`apps/admin`)** | AI Studio has guarded model route sync plus a read-only Trace Explorer for redacted traces. | **Staging Ready** | Add evaluation datasets/scores and production rollout controls in the next phase. |

---

## 3. Provider Integration Technical Specifications

### 3.1 Google Gemini API
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **Authentication**: Header `x-goog-api-key: ${GEMINI_API_KEY}`
- **Request Format**:
  ```json
  {
    "contents": [
      { "role": "user", "parts": [{ "text": "User message" }] }
    ],
    "systemInstruction": {
      "parts": [{ "text": "System prompt instructions" }]
    },
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 800
    }
  }
  ```
- **Response Extraction**: `response.candidates[0].content.parts[0].text`

### 3.2 OpenAI API
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Authentication**: Header `Authorization: Bearer ${OPENAI_API_KEY}`
- **Request Format**:
  ```json
  {
    "model": "gpt-4o",
    "messages": [
      { "role": "system", "content": "System prompt instructions" },
      { "role": "user", "content": "User message" }
    ],
    "temperature": 0.7,
    "max_tokens": 800
  }
  ```
- **Response Extraction**: `response.choices[0].message.content`

### 3.3 OpenRouter API (Universal Gateway)
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **Authentication**: 
  - `Authorization: Bearer ${OPENROUTER_API_KEY}`
  - `HTTP-Referer: https://nilaza.app`
  - `X-Title: Nilaza AI`
- **Request Format**: Standard OpenAI Chat Completions payload with OpenRouter model identifiers (e.g. `anthropic/claude-3.5-sonnet`, `meta-llama/llama-3.1-70b-instruct`).
- **Response Extraction**: `response.choices[0].message.content`

### 3.4 Anthropic Claude API
- **Endpoint**: `https://api.anthropic.com/v1/messages`
- **Authentication**:
  - `x-api-key: ${ANTHROPIC_API_KEY}`
  - `anthropic-version: 2023-06-01`
- **Request Format**:
  ```json
  {
    "model": "claude-3-5-sonnet-20240620",
    "system": "System prompt instructions",
    "messages": [
      { "role": "user", "content": "User message" }
    ],
    "max_tokens": 800,
    "temperature": 0.7
  }
  ```
- **Response Extraction**: `response.content[0].text`

---

## 4. Architecture Design for Dynamic Switching & Fallbacks

### 4.1 Data Model (`supabase/migrations/20260629000000_llm_model_router.sql`)

```sql
-- Provider registration & status table
CREATE TABLE IF NOT EXISTS public.llm_providers (
    id VARCHAR(50) PRIMARY KEY, -- 'gemini', 'openai', 'openrouter', 'anthropic'
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'degraded', 'disabled'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feature route configurations table
CREATE TABLE IF NOT EXISTS public.model_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature VARCHAR(50) UNIQUE NOT NULL, -- 'persona_chat', 'ai_council', 'tarot_reading', 'daily_insight'
    primary_provider VARCHAR(50) NOT NULL REFERENCES public.llm_providers(id),
    primary_model VARCHAR(100) NOT NULL,
    fallback_provider VARCHAR(50) REFERENCES public.llm_providers(id),
    fallback_model VARCHAR(100),
    temperature NUMERIC(3,2) NOT NULL DEFAULT 0.70,
    max_tokens INTEGER NOT NULL DEFAULT 800,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.2 Unified Provider Adapter (`supabase/functions/_shared/llm/provider-adapter.ts`)

```typescript
export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRequestOptions {
  provider: "gemini" | "openai" | "openrouter" | "anthropic";
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  text: string;
  providerUsed: string;
  modelUsed: string;
  usageTokens?: { prompt: number; completion: number; total: number };
}

export async function invokeLLM(options: LLMRequestOptions): Promise<LLMResponse> {
  const { provider, model, messages, temperature = 0.7, maxTokens = 800 } = options;
  
  switch (provider) {
    case "gemini":
      return callGemini(model, messages, temperature, maxTokens);
    case "openai":
      return callOpenAI(model, messages, temperature, maxTokens);
    case "openrouter":
      return callOpenRouter(model, messages, temperature, maxTokens);
    case "anthropic":
      return callAnthropic(model, messages, temperature, maxTokens);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

export async function invokeLLMWithFallback(
  primaryOptions: LLMRequestOptions,
  fallbackOptions?: LLMRequestOptions
): Promise<LLMResponse> {
  try {
    return await invokeLLM(primaryOptions);
  } catch (error) {
    console.warn(`Primary provider ${primaryOptions.provider} failed:`, error);
    if (fallbackOptions) {
      console.info(`Attempting fallback provider ${fallbackOptions.provider}...`);
      return await invokeLLM(fallbackOptions);
    }
    throw error;
  }
}
```

---

## 5. Admin Integration & Sync Flow

1. **Admin Workspace Edit (`apps/admin`)**:
   - Quản trị viên truy cập màn hình **Model Router** trên trang Admin (`#/ai-studio/model-router`).
   - Chọn nhà cung cấp chính (Primary), Model chính, Nhà cung cấp dự phòng (Fallback), và Model dự phòng cho từng tính năng (`persona_chat`, `ai_council`, `tarot_reading`, `daily_insight`).
   - Nhấn **Publish Route Configuration**.

2. **Backend Sync Endpoint (`supabase/functions/admin-model-router-config`)**:
   - Endpoint nhận thông tin cấu hình và lưu vào bảng `model_routes` trong Supabase Postgres.

3. **Runtime Execution in Edge Functions (`supabase/functions/ai-*`)**:
   - Khi người dùng gửi yêu cầu ở ứng dụng di động, Edge Function gọi hàm `getActiveModelRoute(feature)`.
   - Cấu hình được nạp từ cache trong bộ nhớ Edge Function (với thời gian TTL 60 giây để tối ưu tốc độ) hoặc truy vấn từ Postgres.
   - Thực thi lệnh qua `invokeLLMWithFallback(...)`. Nếu nhà cung cấp chính bị lỗi hoặc timeout, tự động chuyển đổi sang nhà cung cấp dự phòng mượt mà.

---

## 6. Action Plan for Coding Agents

1. **Database Migration**: Create `supabase/migrations/20260629000000_llm_model_router.sql` and seed default routes.
2. **LLM Adapter Module**: Create `supabase/functions/_shared/llm/provider-adapter.ts` implementing Gemini, OpenAI, OpenRouter, and Anthropic APIs.
3. **Edge Functions Integration**: Replace static fallback strings in `ai-persona-chat`, `ai-council`, `ai-tarot-reading`, and `ai-daily-insight` with calls to `invokeLLMWithFallback`.
4. **Admin API & UI Persistence**: Create Edge Function `admin-model-router-config` and update `apps/admin/app.js` to fetch and update route settings live.

## 7. AI Trace Observability (implemented 2026-09-09)

The runtime now instruments the shared model router and provider adapters with the privacy-first trace contract in `supabase/functions/_shared/ai-trace.ts`. Each request records route/model selection, canonical prompt shape, provider wire request/response (redacted by default), fallback attempts, safety outcome, latency, usage, and correlation ids. Supabase stores only redacted trace index rows under RLS; optional Langfuse export uses OTLP/HTTP and is enabled through Edge Function Secrets. See `docs/AI_TRACE_OBSERVABILITY.md` for rollout and retention settings.
