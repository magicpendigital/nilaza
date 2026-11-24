import type { ModelMessage, ModelRoute, ModelUsage } from "./model-provider.ts";

export type AiTracePayloadMode = "metadata" | "redacted" | "full_debug";
export type AiTraceSink = "none" | "supabase" | "langfuse" | "both";
export type AiTraceSpanStatus = "running" | "ok" | "error" | "blocked" | "fallback";

type EnvLike = {
  get?: (key: string) => string | undefined;
  [key: string]: unknown;
};

type SupabaseLike = {
  from: (table: string) => any;
};

export type TraceContextInput = {
  feature: string;
  userId?: string;
  sessionId?: string;
  clientRequestId?: string;
  endpoint?: string;
  environment?: string;
  metadata?: Record<string, unknown>;
  request?: Request;
};

export type ProviderTraceHooks = {
  onRequest?: (payload: { url: string; method: "POST"; body: unknown }) => void;
  onResponse?: (payload: { status: number; body: unknown; latencyMs: number; requestId?: string }) => void;
};

type SpanInput = {
  name: string;
  type: "chain" | "generation" | "guardrail" | "tool";
  parentSpanId?: string;
  input?: unknown;
  output?: unknown;
  attributes?: Record<string, unknown>;
};

type SpanRecord = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  type: SpanInput["type"];
  status: AiTraceSpanStatus;
  startedAt: number;
  endedAt?: number;
  input?: unknown;
  output?: unknown;
  attributes: Record<string, unknown>;
  debugInput?: unknown;
  debugOutput?: unknown;
};

type TraceConfig = TraceContextInput & {
  enabled: boolean;
  sink: AiTraceSink;
  payloadMode: AiTracePayloadMode;
  sampleRate: number;
  retentionDays: number;
  release?: string;
  supabase?: SupabaseLike | null;
  env?: EnvLike;
};

type TraceFlushResult = {
  persisted: boolean;
  exported: boolean;
  externalTraceUrl?: string;
};

const SENSITIVE_KEY = /(^|_)(content|text|prompt|message|question|system|output|input|summary|journal|note|body|context|history|reply|transcript|birth|location|email|phone|token|secret|key)(_|$)/i;
const SAFE_VALUE_KEY = /(^|_)(id|slug|feature|provider|model|role|language|locale|count|index|version|status|temperature|max(output)?tokens|finish(reason)?|latency(ms)?|request(id)?|moderation(status)?|fallback(used)?|code|type|name|intent|focus|spread|deck|tone|source|schema|allowed|enabled|consent|confidence|length|chars|duration|environment|release)(_|$)/i;
// Explicit camel-case contract metadata. Do not broaden the keyword regex to admit prompt prose.
const ANSWER_METADATA_KEYS = new Set(["interactionId", "attemptId", "clientRequestId", "promptVersionId", "promptVersion", "promptDatabaseVersionId", "routeVersionId", "routeVersion", "calculationVersion", "chartContractVersion", "responseSchema", "contentVersion", "validationStatus", "persistenceStatus", "sourceKind", "campaignId", "variant"]);
function answerMetadataValue(value: string, key: string) {
  return ANSWER_METADATA_KEYS.has(key) && (/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value)
    || key === "promptVersionId" && value.length <= 128 && /^local:[A-Za-z0-9_.:-]+@[A-Za-z0-9_.:-]+$/.test(value));
}

function envGet(env: EnvLike | undefined, key: string) {
  const direct = env?.[key];
  if (typeof direct === "string") return direct;
  const fromGet = env?.get?.(key);
  if (typeof fromGet === "string") return fromGet;
  return typeof Deno !== "undefined" ? Deno.env.get(key) : undefined;
}

function randomHex(bytes: number) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

function safeJson(value: unknown, fallback: unknown = null) {
  try {
    JSON.stringify(value);
    return value;
  } catch {
    return fallback;
  }
}

function textSummary(value: string) {
  return { redacted: true, chars: value.length };
}

function metadataValue(value: unknown, key: string, depth: number): unknown {
  if (depth > 5) return { type: typeof value };
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (answerMetadataValue(value, key)) return value;
    if (SAFE_VALUE_KEY.test(key) && !SENSITIVE_KEY.test(key)) return value.slice(0, 160);
    return { type: "string", chars: value.length };
  }
  if (Array.isArray(value)) return { type: "array", length: value.length };
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    return {
      type: "object",
      keys: Object.keys(object).slice(0, 80),
      ...(Object.prototype.hasOwnProperty.call(object, "length") ? { length: object.length } : {})
    };
  }
  return { type: typeof value };
}

export function redactTraceValue(value: unknown, mode: AiTracePayloadMode, key = "", depth = 0): unknown {
  if (mode === "full_debug") return safeJson(value);
  if (mode === "metadata") return metadataValue(value, key, depth);
  if (depth > 8) return { redacted: true, type: typeof value };
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (answerMetadataValue(value, key)) return value;
    if (SAFE_VALUE_KEY.test(key) && !SENSITIVE_KEY.test(key)) return value.slice(0, 240);
    return textSummary(value);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 80).map((item) => redactTraceValue(item, mode, key, depth + 1));
  }
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(object).slice(0, 120).map(([childKey, childValue]) => [
        childKey,
        redactTraceValue(childValue, mode, childKey, depth + 1)
      ])
    );
  }
  return { type: typeof value };
}

function serializedTraceValue(value: unknown, mode: AiTracePayloadMode) {
  try {
    const serialized = JSON.stringify(redactTraceValue(value, mode));
    return serialized.length > 30000 ? `${serialized.slice(0, 29997)}...` : serialized;
  } catch {
    return JSON.stringify({ unavailable: true });
  }
}

function attributeValue(value: unknown) {
  if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") return value;
  return JSON.stringify(value ?? null);
}

function toOtelAttributes(values: Record<string, unknown>) {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      const normalized = attributeValue(value);
      return typeof normalized === "string"
        ? { key, value: { stringValue: normalized } }
        : typeof normalized === "boolean"
          ? { key, value: { boolValue: normalized } }
          : { key, value: { doubleValue: normalized } };
    });
}

function langfuseEndpoint(env: EnvLike | undefined) {
  const explicit = envGet(env, "LANGFUSE_OTLP_ENDPOINT")?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const base = (envGet(env, "LANGFUSE_BASE_URL") ?? "https://cloud.langfuse.com").trim().replace(/\/$/, "");
  return `${base}/api/public/otel/v1/traces`;
}

function parseMode(env: EnvLike | undefined) {
  const requested = envGet(env, "AI_TRACE_PAYLOAD_MODE")?.trim() as AiTracePayloadMode | undefined;
  const candidate = requested === "metadata" || requested === "redacted" || requested === "full_debug" ? requested : "redacted";
  const environment = (envGet(env, "AI_TRACE_ENVIRONMENT") ?? "development").toLowerCase();
  const debugAllowed = envGet(env, "AI_TRACE_ALLOW_FULL_DEBUG") === "true" && environment !== "production";
  return candidate === "full_debug" && !debugAllowed ? "redacted" : candidate;
}

function parseSink(env: EnvLike | undefined): AiTraceSink {
  const value = (envGet(env, "AI_TRACE_SINK") ?? "supabase").trim().toLowerCase();
  if (value === "none" || value === "supabase" || value === "langfuse" || value === "both") return value;
  return "supabase";
}

function parseSampleRate(env: EnvLike | undefined) {
  const value = Number(envGet(env, "AI_TRACE_SAMPLE_RATE") ?? "1");
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value.toLowerCase() !== "false";
}

export class AiTraceSpan {
  constructor(private readonly trace: AiTraceContext, readonly record: SpanRecord) {}

  update(input: { input?: unknown; output?: unknown; attributes?: Record<string, unknown> }) {
    if (input.input !== undefined) this.record.input = input.input;
    if (input.output !== undefined) this.record.output = input.output;
    if (input.attributes) this.record.attributes = { ...this.record.attributes, ...input.attributes };
    return this;
  }

  captureWireRequest(payload: { url: string; method: "POST"; body: unknown }) {
    this.record.attributes = {
      ...this.record.attributes,
      wireMethod: payload.method,
      wireUrl: payload.url
    };
    this.record.debugInput = payload.body;
    return this;
  }

  captureWireResponse(payload: { status: number; body: unknown; latencyMs: number; requestId?: string }) {
    this.record.attributes = {
      ...this.record.attributes,
      httpStatus: payload.status,
      latencyMs: payload.latencyMs,
      ...(payload.requestId ? { requestId: payload.requestId } : {})
    };
    this.record.debugOutput = payload.body;
    return this;
  }

  end(status: Exclude<AiTraceSpanStatus, "running"> = "ok", output?: unknown) {
    if (output !== undefined) this.record.output = output;
    this.record.status = status;
    this.record.endedAt = Date.now();
    return this;
  }

  get spanId() {
    return this.record.spanId;
  }
}

export class AiTraceContext {
  readonly traceId: string;
  readonly createdAt: number;
  private readonly spans: SpanRecord[] = [];
  private flushed = false;
  private rootSpan?: AiTraceSpan;

  constructor(private readonly config: TraceConfig) {
    this.traceId = randomHex(16);
    this.createdAt = Date.now();
  }

  get enabled() {
    return this.config.enabled;
  }

  get environment() {
    return this.config.environment ?? "development";
  }

  get payloadMode() {
    return this.config.payloadMode;
  }

  get rootSpanId() {
    return this.rootSpan?.spanId;
  }

  startSpan(input: SpanInput) {
    const record: SpanRecord = {
      traceId: this.traceId,
      spanId: randomHex(8),
      parentSpanId: input.parentSpanId ?? this.rootSpan?.spanId,
      name: input.name,
      type: input.type,
      status: "running",
      startedAt: Date.now(),
      input: input.input,
      output: input.output,
      attributes: input.attributes ?? {}
    };
    this.spans.push(record);
    const span = new AiTraceSpan(this, record);
    if (!this.rootSpan) this.rootSpan = span;
    return span;
  }

  private localPayload(value: unknown) {
    return redactTraceValue(value, this.config.payloadMode === "full_debug" ? "redacted" : this.config.payloadMode);
  }

  private async persistSupabase() {
    if (!this.config.supabase || this.config.sink !== "supabase" && this.config.sink !== "both") return false;
    const root = this.rootSpan?.record;
    const completedAt = Date.now();
    const rootOutput = root?.output ?? { status: "unknown" };
    const runId = crypto.randomUUID();
    const run = {
      id: runId,
      trace_id: this.traceId,
      user_id: this.config.userId ?? null,
      session_id: this.config.sessionId ?? null,
      client_request_id: this.config.clientRequestId ?? null,
      feature: this.config.feature,
      endpoint: this.config.endpoint ?? null,
      environment: this.environment,
      status: root?.status === "blocked" ? "blocked" : root?.status === "error" ? "error" : root?.status === "fallback" ? "fallback" : "completed",
      redaction_mode: this.config.payloadMode,
      root_input: this.localPayload(root?.input ?? this.config.metadata ?? {}),
      root_output: this.localPayload(rootOutput),
      metadata: this.localPayload(this.config.metadata ?? {}),
      retention_expires_at: new Date(completedAt + this.config.retentionDays * 86400000).toISOString(),
      completed_at: new Date(completedAt).toISOString()
    };
    try {
      const { error } = await this.config.supabase.from("ai_trace_runs").insert(run);
      if (error) return false;
      const spans = this.spans.map((span) => ({
        run_id: runId,
        trace_id: span.traceId,
        span_id: span.spanId,
        parent_span_id: span.parentSpanId ?? null,
        user_id: this.config.userId ?? null,
        span_name: span.name,
        span_type: span.type,
        status: span.status,
        started_at: new Date(span.startedAt).toISOString(),
        ended_at: span.endedAt ? new Date(span.endedAt).toISOString() : null,
        input: this.localPayload(span.input ?? span.debugInput ?? {}),
        output: this.localPayload(span.output ?? span.debugOutput ?? {}),
        attributes: this.localPayload(span.attributes)
      }));
      if (!spans.length) return true;
      const { error: spanError } = await this.config.supabase.from("ai_trace_spans").insert(spans);
      return !spanError;
    } catch (error) {
      console.warn("ai_trace_supabase_persist_failed", error instanceof Error ? error.name : "unknown");
      return false;
    }
  }

  private async exportLangfuse() {
    if (this.config.sink !== "langfuse" && this.config.sink !== "both") return { exported: false };
    const publicKey = envGet(this.config.env, "LANGFUSE_PUBLIC_KEY");
    const secretKey = envGet(this.config.env, "LANGFUSE_SECRET_KEY");
    if (!publicKey || !secretKey) return { exported: false };
    const safeMetadata = this.config.payloadMode === "full_debug"
      ? this.config.metadata ?? {}
      : redactTraceValue(this.config.metadata ?? {}, this.config.payloadMode);
    const spans = this.spans.map((span) => {
      const input = span.debugInput ?? span.input;
      const output = span.debugOutput ?? span.output;
      const attributes: Record<string, unknown> = {
        "langfuse.observation.type": span.type === "generation" ? "generation" : span.type,
        "langfuse.observation.input": serializedTraceValue(input ?? {}, this.config.payloadMode),
        "langfuse.observation.output": serializedTraceValue(output ?? {}, this.config.payloadMode),
        "langfuse.trace.name": `nilaza.${this.config.feature}`,
        "langfuse.observation.metadata.feature": this.config.feature,
        "langfuse.observation.metadata.environment": this.environment,
        ...(safeMetadata && typeof safeMetadata === "object" && !Array.isArray(safeMetadata) ? safeMetadata : {}),
        ...span.attributes
      };
      if (this.config.userId) attributes["langfuse.trace.user.id"] = this.config.userId;
      if (this.config.sessionId) attributes["langfuse.trace.session.id"] = this.config.sessionId;
      if (this.config.release) attributes["langfuse.trace.release"] = this.config.release;
      return {
        traceId: span.traceId,
        spanId: span.spanId,
        ...(span.parentSpanId ? { parentSpanId: span.parentSpanId } : {}),
        name: span.name,
        kind: 1,
        startTimeUnixNano: String(Math.round(span.startedAt * 1000000)),
        ...(span.endedAt ? { endTimeUnixNano: String(Math.round(span.endedAt * 1000000)) } : {}),
        attributes: toOtelAttributes(attributes),
        status: { code: span.status === "error" ? 2 : 1 }
      };
    });
    if (!spans.length) return { exported: false };
    const endpoint = langfuseEndpoint(this.config.env);
    const auth = typeof btoa === "function"
      ? btoa(`${publicKey}:${secretKey}`)
      : `${publicKey}:${secretKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          "x-langfuse-ingestion-version": "4"
        },
        body: JSON.stringify({
          resourceSpans: [{
            resource: {
              attributes: toOtelAttributes({
                "service.name": "nilaza-ai",
                "deployment.environment": this.environment,
                ...(this.config.release ? { "service.version": this.config.release } : {})
              })
            },
            scopeSpans: [{
              scope: { name: "nilaza-ai-tracing", version: "1.0.0" },
              spans
            }]
          }]
        }),
        signal: controller.signal
      });
      if (!response.ok) return { exported: false };
      const base = (envGet(this.config.env, "LANGFUSE_UI_BASE_URL") ?? envGet(this.config.env, "LANGFUSE_BASE_URL") ?? "https://cloud.langfuse.com").replace(/\/$/, "");
      return { exported: true, externalTraceUrl: `${base}/trace/${this.traceId}` };
    } catch {
      return { exported: false };
    } finally {
      clearTimeout(timer);
    }
  }

  async flush(): Promise<TraceFlushResult> {
    if (this.flushed || !this.config.enabled) return { persisted: false, exported: false };
    this.flushed = true;
    const [persisted, exported] = await Promise.all([this.persistSupabase(), this.exportLangfuse()]);
    return { persisted, ...exported };
  }
}

export function createAiTrace(input: TraceContextInput & { supabase?: SupabaseLike | null; env?: EnvLike }): { trace: AiTraceContext; rootSpan: AiTraceSpan } {
  const env = input.env;
  const enabled = parseBoolean(envGet(env, "AI_TRACE_ENABLED"), true);
  const sampleRate = parseSampleRate(env);
  const sampled = sampleRate >= 1 || Math.random() <= sampleRate;
  const environment = input.environment ?? envGet(env, "AI_TRACE_ENVIRONMENT") ?? "development";
  const clientRequestId = input.clientRequestId ?? input.request?.headers.get("x-client-request-id") ?? undefined;
  const config: TraceConfig = {
    ...input,
    clientRequestId,
    env,
    enabled: enabled && sampled,
    sink: parseSink(env),
    payloadMode: parseMode(env),
    sampleRate,
    retentionDays: Math.max(1, Number(envGet(env, "AI_TRACE_RETENTION_DAYS") ?? "30")),
    release: envGet(env, "NILAZA_RELEASE")
  };
  const trace = new AiTraceContext(config);
  const rootSpan = trace.startSpan({
    name: `nilaza.${input.feature}`,
    type: "chain",
    input: {
      feature: input.feature,
      endpoint: input.endpoint,
      metadata: input.metadata ?? {}
    },
    attributes: {
      feature: input.feature,
      environment,
      sampleRate,
      redactionMode: config.payloadMode
    }
  });
  return { trace, rootSpan };
}

export function traceGenerationInput(input: {
  route: ModelRoute;
  system: string;
  messages: ModelMessage[];
  usage?: ModelUsage;
}) {
  return {
    feature: input.route.feature,
    routeVersion: input.route.version,
    routeVersionId: input.route.id ?? null,
    provider: input.route.primaryProvider,
    model: input.route.primaryModel,
    temperature: input.route.temperature,
    maxOutputTokens: input.route.maxOutputTokens,
    responseSchema: input.route.responseSchema,
    system: input.system,
    messages: input.messages,
    ...(input.usage ? { usage: input.usage } : {})
  };
}
