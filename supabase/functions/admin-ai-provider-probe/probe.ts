// Admin A7 (D4): the "Kiểm tra khóa" check for one AI provider. It never returns, logs or stores a key value:
// configured is Boolean(secret.trim()); the key travels only in the provider's own auth header.
// Each check lists models (free) to validate the key, then makes one generation capped at 1 output token to see
// whether the account can pay. Classes: ok (Ổn), bad_key (Sai khóa), no_credit (Hết tiền), unreachable (Không gọi được),
// not_configured (Chưa cấu hình). Error shapes per the providers' docs, checked 2026-11-13 (see the A7 plan record).

export type ProbeProvider = "openrouter" | "anthropic" | "gemini" | "openai" | "deepseek";
export type ProbeResult = "ok" | "bad_key" | "no_credit" | "unreachable" | "not_configured";
export type ProbeOutcome = {
  provider: ProbeProvider;
  secretName: string;
  configured: boolean;
  result: ProbeResult;
  httpStatus: number | null;
  /** Short provider error code only (letters, digits, _ . : -), never message text or key material. */
  detail: string | null;
};

export const PROBE_PROVIDERS: readonly ProbeProvider[] = ["openrouter", "anthropic", "gemini", "openai", "deepseek"];
export const PROBE_SECRET_NAMES: Record<ProbeProvider, string> = {
  openrouter: "OPENROUTER_API_KEY", anthropic: "ANTHROPIC_API_KEY", gemini: "GEMINI_API_KEY", openai: "OPENAI_API_KEY", deepseek: "DEEPSEEK_API_KEY"
};
export const PROBE_TIMEOUT_MS = 8_000;
/** Preferred cheap models; the first listed one the account can see is used, else the provider default. */
const PREFERRED: Record<Exclude<ProbeProvider, "openrouter">, RegExp[]> = {
  anthropic: [/haiku/i],
  gemini: [/flash-lite/i, /flash/i],
  openai: [/^gpt-4\.1-nano$/, /^gpt-4o-mini$/, /mini$/],
  deepseek: [/^deepseek-flash$/, /flash/i, /chat/i]
};
const DEFAULT_MODEL: Record<ProbeProvider, string> = {
  openrouter: "deepseek/deepseek-v4.1-flash", anthropic: "claude-haiku-4-5", gemini: "gemini-2.5-flash", openai: "gpt-4o-mini", deepseek: "deepseek-flash"
};

/** The request body { providers?: string[] }: all providers by default; null for an invalid list. */
export function requestedProviders(input: unknown): ProbeProvider[] | null {
  if (input === null || input === undefined) return [...PROBE_PROVIDERS];
  if (typeof input !== "object" || Array.isArray(input)) return null;
  const list = (input as { providers?: unknown }).providers;
  if (list === undefined) return [...PROBE_PROVIDERS];
  if (!Array.isArray(list) || list.length < 1 || list.length > PROBE_PROVIDERS.length) return null;
  if (list.some((item) => !PROBE_PROVIDERS.includes(item as ProbeProvider))) return null;
  return [...new Set(list as ProbeProvider[])];
}

type Fetch = typeof fetch;
type Reply = { status: number; json: any } | { status: 0; json: null };

async function call(fetchImpl: Fetch, url: string, init: RequestInit, timeoutMs: number): Promise<Reply> {
  try {
    const response = await fetchImpl(url, { ...init, redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
    const text = await response.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return { status: response.status, json };
  } catch {
    return { status: 0, json: null };
  }
}

/** A provider error code, made safe to store: only a short token, never message text. */
export function safeDetail(json: any): string | null {
  const error = json?.error ?? json?.[0]?.error;
  const raw = error?.type ?? error?.status ?? error?.code ?? (typeof error === "string" ? error : null);
  if (raw === null || raw === undefined) return null;
  const value = String(raw).slice(0, 60);
  return /^[A-Za-z0-9_.:-]+$/.test(value) ? value : null;
}

const BILLING = /credit|balance|billing|payment|quota|spend|insufficient|prepay|exhausted|usage_limit/i;
function errorText(json: any): string {
  const error = json?.error ?? json?.[0]?.error;
  return [error?.type, error?.code, error?.status, error?.message].filter((part) => typeof part === "string" || typeof part === "number").join(" ");
}

/** Classifies a failed reply. The generation step treats a key error the same as the listing step. */
export function classifyReply(provider: ProbeProvider, reply: Reply): ProbeResult {
  const { status, json } = reply;
  if (status >= 200 && status < 300) return "ok";
  if (status === 0 || status >= 500 || status === 408) return "unreachable";
  const text = errorText(json);
  if (status === 402) return "no_credit";
  if (status === 401) return "bad_key";
  if (status === 403) return provider === "gemini" && BILLING.test(text) ? "no_credit" : provider === "openrouter" && /budget|limit/i.test(text) ? "no_credit" : "bad_key";
  if (status === 429) return BILLING.test(text) ? "no_credit" : "unreachable";
  if (status === 400) {
    if (/api.?key|API_KEY_INVALID|invalid.?key/i.test(text)) return "bad_key";
    if (BILLING.test(text) || /FAILED_PRECONDITION/i.test(text)) return "no_credit";
  }
  return "unreachable";
}

function pickModel(provider: Exclude<ProbeProvider, "openrouter">, json: any): string {
  const ids: string[] = provider === "gemini"
    ? (Array.isArray(json?.models) ? json.models : [])
      .filter((item: any) => !Array.isArray(item?.supportedGenerationMethods) || item.supportedGenerationMethods.includes("generateContent"))
      .map((item: any) => String(item?.name ?? "").replace(/^models\//, ""))
    : (Array.isArray(json?.data) ? json.data : []).map((item: any) => String(item?.id ?? ""));
  const usable = ids.filter((id) => /^[A-Za-z0-9._:/-]{1,120}$/.test(id));
  for (const pattern of PREFERRED[provider]) {
    const match = usable.find((id) => pattern.test(id));
    if (match) return match;
  }
  return DEFAULT_MODEL[provider];
}

export async function probeProvider(provider: ProbeProvider, getSecret: (name: string) => string | undefined, fetchImpl: Fetch = fetch, timeoutMs = PROBE_TIMEOUT_MS): Promise<ProbeOutcome> {
  const secretName = PROBE_SECRET_NAMES[provider];
  const key = getSecret(secretName)?.trim() ?? "";
  const base = { provider, secretName, configured: Boolean(key) };
  if (!key) return { ...base, configured: false, result: "not_configured", httpStatus: null, detail: null };
  const done = (reply: Reply): ProbeOutcome => ({ ...base, result: classifyReply(provider, reply), httpStatus: reply.status || null, detail: reply.status >= 200 && reply.status < 300 ? null : safeDetail(reply.json) });
  const json = { "Content-Type": "application/json" };

  if (provider === "openrouter") {
    const auth = { Authorization: `Bearer ${key}` };
    const keyInfo = await call(fetchImpl, "https://openrouter.ai/api/v1/key", { method: "GET", headers: auth }, timeoutMs);
    if (keyInfo.status < 200 || keyInfo.status >= 300) return done(keyInfo);
    const remaining = keyInfo.json?.data?.limit_remaining;
    if (typeof remaining === "number" && remaining <= 0) return { ...base, result: "no_credit", httpStatus: keyInfo.status, detail: "limit_remaining" };
    return done(await call(fetchImpl, "https://openrouter.ai/api/v1/chat/completions", {
      method: "POST", headers: { ...auth, ...json },
      body: JSON.stringify({ model: DEFAULT_MODEL.openrouter, messages: [{ role: "user", content: "ping" }], max_tokens: 1, provider: { zdr: true, data_collection: "deny" } })
    }, timeoutMs));
  }
  if (provider === "anthropic") {
    const headers = { "x-api-key": key, "anthropic-version": "2023-06-01" };
    const list = await call(fetchImpl, "https://api.anthropic.com/v1/models?limit=100", { method: "GET", headers }, timeoutMs);
    if (list.status < 200 || list.status >= 300) return done(list);
    return done(await call(fetchImpl, "https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { ...headers, ...json },
      body: JSON.stringify({ model: pickModel("anthropic", list.json), max_tokens: 1, messages: [{ role: "user", content: "ping" }] })
    }, timeoutMs));
  }
  if (provider === "gemini") {
    const headers = { "x-goog-api-key": key };
    const list = await call(fetchImpl, "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { method: "GET", headers }, timeoutMs);
    if (list.status < 200 || list.status >= 300) return done(list);
    const model = pickModel("gemini", list.json);
    return done(await call(fetchImpl, `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST", headers: { ...headers, ...json },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "ping" }] }], generationConfig: { maxOutputTokens: 1 } })
    }, timeoutMs));
  }
  const root = provider === "openai" ? "https://api.openai.com/v1" : "https://api.deepseek.com";
  const auth = { Authorization: `Bearer ${key}` };
  const list = await call(fetchImpl, `${root}/models`, { method: "GET", headers: auth }, timeoutMs);
  if (list.status < 200 || list.status >= 300) return done(list);
  const model = pickModel(provider, list.json);
  return done(await call(fetchImpl, `${root}/chat/completions`, {
    method: "POST", headers: { ...auth, ...json },
    body: JSON.stringify({ model, messages: [{ role: "user", content: "ping" }], ...(provider === "openai" ? { max_completion_tokens: 1 } : { max_tokens: 1 }) })
  }, timeoutMs));
}
