(function () {
  // Nhà cung cấp & Model (Admin A7; spec 04/11 §3.10 and §3.7 part 2).
  // 1. Provider table from list_ai_providers (ai.read; migration 20261113140100): order, on/off, key configured yes/no
  //    (only from the last key check or runtime report — never a key value), allowed data class, 24 h health, circuit.
  //    "Kiểm tra khóa" (ai.manage) calls the admin-ai-provider-probe Edge Function; set_ai_provider (ai.manage) changes
  //    order, on/off and data class with a note. There is no key input anywhere: keys live in Supabase Secrets only.
  // 2. One card per AI feature with its model chain (max 4 steps; migration 20261113140000) through the existing
  //    admin-model-router-config function: "Lưu nháp" stores a draft route on the server (users do not see it);
  //    "Xem lại & phát hành" shows the step diff and needs a note of 10-500 characters. Both need ai.manage.
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const PROVIDERS_MIGRATION = "20261113140100_ai_providers.sql";
  const STEPS_MIGRATION = "20261113140000_model_route_steps.sql";
  const MAX_STEPS = 4, MAX_DEADLINE_S = 140;
  const PROVIDER_LABELS = Object.freeze({ openrouter: "OpenRouter", anthropic: "Anthropic", gemini: "Google Gemini (khóa trả phí)", openai: "OpenAI", deepseek: "DeepSeek (trực tiếp)" });
  const PROVIDER_IDS = Object.keys(PROVIDER_LABELS);
  // Batch C (2026-11-24): decision APIs return one choice from a list, no text. Valid only as steps of "Gợi ý người đọc"
  // (reader_router); the Edge contract and the database refuse them elsewhere. API shapes are from the docs only.
  const DECISION_LABELS = Object.freeze({ openrouter_decisions: "OpenRouter Decisions (chỉ chọn)", openai_decisions: "OpenAI Decisions (chỉ chọn)", gemini_decisions: "Gemini Decision (chỉ chọn, khóa trả phí)" });
  const DECISION_IDS = Object.keys(DECISION_LABELS);
  const DECISION_NOTE = "API quyết định: chỉ trả về một lựa chọn, không có văn bản. Chỉ dùng cho Gợi ý người đọc. Gửi đi: câu hỏi, chủ đề, kiểu trải bài, tên lá bài và mô tả các người đọc được phép; không gửi mã tài khoản, biệt danh, lịch sử, nhật ký hay ngày sinh. Chính sách dữ liệu của jev (typesafe/jev-1.14, bản alpha) chưa được kiểm chứng.";
  const stepLabel = provider => PROVIDER_LABELS[provider] || DECISION_LABELS[provider] || provider;
  // Model catalogue (code, reviewed 13/11). Only these models can be chosen; a model already in use outside the list
  // stays visible but cannot be picked again. Direct-provider names are not yet checked against a live account.
  const CATALOGUE = Object.freeze({
    openrouter: ["deepseek/deepseek-v4.1-flash", "xiaomi/mimo-v2.6-flash", "deepseek/deepseek-v4.1-flash-1017", "openai/gpt-5.4-mini", "openai/gpt-5.4", "anthropic/claude-sonnet-4.6", "google/gemini-3.5-flash"],
    anthropic: ["claude-haiku-4-5", "claude-sonnet-4-5"],
    gemini: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"],
    openai: ["gpt-4o-mini", "gpt-4.1-mini"],
    deepseek: ["deepseek-flash", "deepseek-v4-pro"],
    openrouter_decisions: ["typesafe/jev-1.14"],
    openai_decisions: ["gpt-6-luna"],
    gemini_decisions: ["gemini-decision-1"]
  });
  const DATA_CLASS = Object.freeze({ public: "Công khai", personal: "Cá nhân", sensitive: "Nhạy cảm" });
  const RANK = { public: 0, personal: 1, sensitive: 2 };
  const FEATURES = Object.freeze([
    { id: "persona_chat", label: "Trò chuyện với người dẫn", dataClass: "sensitive", schema: "chat_reply_v2", wait: 40 },
    { id: "oracle_router", label: "Oracle", dataClass: "sensitive", schema: "oracle_router_v1", wait: 40 },
    { id: "tarot_reading", label: "Giải bài Tarot", dataClass: "personal", schema: "tarot_reading_output_v3", wait: 40 },
    { id: "daily_insight", label: "Thông điệp hằng ngày", dataClass: "sensitive", schema: "daily_insight_v1", wait: 40 },
    { id: "astrology_report", label: "Đọc sâu Chiêm tinh", dataClass: "sensitive", schema: "astrology_ai_insight_v1", wait: 60 },
    { id: "ai_council", label: "Hội đồng", dataClass: "sensitive", schema: "ai_council_rounds_v2", wait: 40 },
    { id: "tarot_note", label: "Ghi chú riêng Tarot", dataClass: "personal", schema: "tarot_note_output_v1", wait: 20 },
    { id: "reader_router", label: "Gợi ý người đọc", dataClass: "personal", schema: "reader_router_choice_v1", wait: 3, decisions: true }
  ]);
  const REASONING = [["", "Mặc định của model"], ["off", "Tắt"], ["minimal", "Rất ít"], ["low", "Ít"], ["medium", "Vừa"], ["high", "Nhiều"]];
  const PROBE_LABELS = { ok: "Ổn", bad_key: "Sai khóa", no_credit: "Hết tiền", unreachable: "Không gọi được", not_configured: "Chưa cấu hình" };
  const DEFAULT_FALLBACK_WHEN = ["missing_api_key", "provider_timeout", "rate_limit", "provider_5xx", "malformed_response"];
  const initialTransport = { target: window.NilazaAdminTransportTarget || "", url: window.ENV?.SUPABASE_URL || "" };
  let active = null, epoch = 0, invalidated = false;
  let forms = { owner: "", chains: {}, dirty: new Set() };

  const can = capability => window.NilazaAdminSession?.capabilities?.includes(capability) === true;
  const feature = id => FEATURES.find(item => item.id === id);
  const endpoint = name => {
    const base = typeof window.ENV?.SUPABASE_URL === "string" ? window.ENV.SUPABASE_URL.trim().replace(/\/$/, "") : "";
    return base ? `${base}/functions/v1/${name}` : "";
  };
  function scope() {
    if ((window.ENV?.SUPABASE_URL || "") !== initialTransport.url) invalidated = true;
    return { account: window.NilazaAdminSession?.userId || "", target: initialTransport.target };
  }
  function current(snapshot, version) {
    const now = scope();
    return Boolean(active && version === epoch && !invalidated && can("ai.read") && now.account === snapshot.account
      && now.target === snapshot.target && active.container.isConnected);
  }
  function reportUnsaved() { window.NilazaUnsaved?.set("model-providers", forms.dirty.size); }
  function environmentLabel() { return window.NilazaDescribeEnvironment?.(window.ENV)?.label || "CHƯA RÕ MÔI TRƯỜNG"; }
  // A publish request id (UUID v4); getRandomValues where randomUUID is missing.
  function requestId() {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  const time = value => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleString("vi-VN", { hour12: false }) : "";
  };

  // ---------- data shapes ----------
  function cleanProviders(value) {
    if (!Array.isArray(value)) throw Error("invalid_response");
    return value.filter(row => row && PROVIDER_IDS.includes(row.provider) && typeof row.enabled === "boolean" && DATA_CLASS[row.allowedDataClass])
      .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  }
  /** A stored or legacy route as editable steps (timeouts in seconds). */
  function stepsFromRoute(route, item) {
    if (Array.isArray(route?.steps) && route.steps.length) {
      return route.steps.map(step => ({
        provider: step.provider, model: step.model, timeoutS: String(Math.round(step.timeout_ms / 1000)), maxTokens: String(step.max_tokens),
        temperature: String(step.temperature), jsonMode: step.json_mode === true, reasoning: step.reasoning?.mode || "",
        reasoningMax: Number.isInteger(step.reasoning?.maxTokens) ? String(step.reasoning.maxTokens) : ""
      }));
    }
    if (!route) return [];
    const reasoning = route.safety_policy?.reasoning;
    const base = { timeoutS: String(item.wait), maxTokens: String(route.max_output_tokens ?? 2000), temperature: String(route.temperature ?? 0.7), jsonMode: false,
      reasoning: typeof reasoning?.mode === "string" ? reasoning.mode : "", reasoningMax: Number.isInteger(reasoning?.maxTokens) ? String(reasoning.maxTokens) : "" };
    return [{ ...base, provider: route.primary_provider, model: route.primary_model },
      ...(route.fallback_provider && route.fallback_model ? [{ ...base, provider: route.fallback_provider, model: route.fallback_model }] : [])];
  }
  function routesFor(id) {
    const routes = active?.routes || [], history = active?.history || [];
    const activeRoute = routes.find(route => route.feature === id && route.status === "active") || null;
    const drafts = history.filter(route => route.feature === id && route.status === "draft")
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    return { activeRoute, draftRoute: drafts[0] || null };
  }
  function chainFor(id) {
    if (forms.chains[id]) return forms.chains[id];
    const item = feature(id), { activeRoute } = routesFor(id);
    const deadline = Number.isInteger(activeRoute?.total_deadline_ms) ? String(Math.round(activeRoute.total_deadline_ms / 1000)) : "";
    forms.chains[id] = { steps: stepsFromRoute(activeRoute, item), deadlineS: deadline, source: activeRoute ? "active" : "empty" };
    return forms.chains[id];
  }
  function providerRow(provider) { return (active?.providers || []).find(row => row.provider === provider) || null; }
  /** Why a provider would be skipped for this feature, or "" when it can run. */
  function stepWarning(provider, item) {
    if (DECISION_IDS.includes(provider)) return "";
    if (active?.providerStatus !== "ok") return "";
    const row = providerRow(provider);
    if (!row) return "chưa có trong bảng nhà cung cấp";
    const notes = [];
    if (!row.enabled) notes.push("đang tắt");
    if (row.configured === false) notes.push("chưa có khóa");
    if (RANK[row.allowedDataClass] < RANK[item.dataClass]) notes.push(`chỉ được nhận dữ liệu ${DATA_CLASS[row.allowedDataClass].toLowerCase()}`);
    if (row.circuitOpen) notes.push("cầu dao đang mở");
    return notes.join(", ");
  }

  /** Form steps to the Edge contract (camelCase); throws a Vietnamese message for the first invalid value. */
  function buildSteps(id) {
    const item = feature(id), chain = chainFor(id);
    if (!chain.steps.length) throw Error("Chuỗi cần ít nhất 1 bước.");
    if (chain.steps.length > MAX_STEPS) throw Error(`Tối đa ${MAX_STEPS} bước.`);
    const number = (text, min, max, label, integer = true) => {
      const clean = String(text ?? "").trim();
      const value = Number(clean);
      if (!clean || !Number.isFinite(value) || (integer && !Number.isInteger(value)) || value < min || value > max) throw Error(`${label}: nhập số từ ${min} đến ${max}.`);
      return value;
    };
    const steps = chain.steps.map((step, index) => {
      const label = `Bước ${index + 1}`;
      if (DECISION_IDS.includes(step.provider) && !item.decisions) throw Error(`${label}: API quyết định chỉ dùng cho Gợi ý người đọc.`);
      if (!PROVIDER_IDS.includes(step.provider) && !DECISION_IDS.includes(step.provider)) throw Error(`${label}: chọn nhà cung cấp.`);
      if (!CATALOGUE[step.provider].includes(step.model) && !(chain.source === "active" && step.model === stepsFromRoute(routesFor(id).activeRoute, item)[index]?.model)) {
        throw Error(`${label}: chọn model trong danh mục.`);
      }
      const reasoning = step.reasoning ? { mode: step.reasoning, ...(step.reasoning !== "off" && String(step.reasoningMax).trim() ? { maxTokens: number(step.reasoningMax, 64, 8192, `${label} · giới hạn suy luận`) } : {}) } : null;
      return {
        provider: step.provider, model: step.model,
        timeoutMs: number(step.timeoutS, 1, MAX_DEADLINE_S, `${label} · chờ tối đa (giây)`) * 1000,
        maxTokens: number(step.maxTokens, 64, 8192, `${label} · số token trả lời tối đa`),
        temperature: number(step.temperature, 0, 2, `${label} · nhiệt độ`, false),
        jsonMode: step.jsonMode === true, reasoning
      };
    });
    if (!steps.some(step => !DECISION_IDS.includes(step.provider))) throw Error("Chuỗi cần ít nhất 1 bước model trò chuyện (không phải API quyết định).");
    const deadline = String(chain.deadlineS ?? "").trim() ? number(chain.deadlineS, 5, MAX_DEADLINE_S, "Tổng thời gian tối đa (giây)") * 1000 : null;
    if (deadline !== null && steps.some(step => step.timeoutMs > deadline)) throw Error("Mỗi bước phải chờ ít hơn hoặc bằng tổng thời gian tối đa.");
    if (deadline === null && steps.reduce((sum, step) => sum + step.timeoutMs, 0) > MAX_DEADLINE_S * 1000) {
      throw Error("Tổng thời gian chờ các bước vượt 140 giây — đặt Tổng thời gian tối đa (≤ 140 giây).");
    }
    return { steps, totalDeadlineMs: deadline };
  }
  function routePayload(id, status, built, note) {
    const item = feature(id), { activeRoute } = routesFor(id);
    const chat = built.steps.find(step => !DECISION_IDS.includes(step.provider)) || built.steps[0];
    return {
      contractVersion: "model_route_publish_v2", publishRequestId: requestId(), expectedActiveId: activeRoute?.id || null,
      feature: id, version: `${id}-chain-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 6)}`,
      status, steps: built.steps, totalDeadlineMs: built.totalDeadlineMs, note: note || null,
      temperature: chat.temperature, maxTokens: chat.maxTokens,
      responseSchema: activeRoute?.response_schema || item.schema,
      // Not edited here: keep what the running route has.
      fallbackWhen: Array.isArray(activeRoute?.fallback_when) ? activeRoute.fallback_when : DEFAULT_FALLBACK_WHEN,
      safetyPolicy: activeRoute?.safety_policy && typeof activeRoute.safety_policy === "object" ? activeRoute.safety_policy : {}
    };
  }
  const stepText = step => step ? `${stepLabel(step.provider)} · ${step.model} · chờ ${Math.round(step.timeoutMs / 1000)} giây · ${step.maxTokens} token · nhiệt độ ${step.temperature}${step.jsonMode ? " · JSON" : ""}${step.reasoning ? ` · suy luận ${step.reasoning.mode}${step.reasoning.maxTokens ? ` (${step.reasoning.maxTokens})` : ""}` : ""}` : "—";
  function activeSteps(id) {
    const item = feature(id), route = routesFor(id).activeRoute;
    return stepsFromRoute(route, item).map(step => ({ provider: step.provider, model: step.model, timeoutMs: Number(step.timeoutS) * 1000, maxTokens: Number(step.maxTokens),
      temperature: Number(step.temperature), jsonMode: step.jsonMode, reasoning: step.reasoning ? { mode: step.reasoning, ...(step.reasoningMax ? { maxTokens: Number(step.reasoningMax) } : {}) } : null }));
  }

  // ---------- rendering ----------
  function renderProviders(manage) {
    if (active.providerStatus === "loading" || active.providerStatus === "idle") return '<p class="muted">Đang tải nhà cung cấp…</p>';
    if (active.providerStatus === "missing") return `<div class="warning-card" role="note"><p>Máy chủ chưa có bảng nhà cung cấp — cần Owner áp migration ${PROVIDERS_MIGRATION}. Trước đó mọi tính năng chỉ chạy qua OpenRouter như hiện nay.</p></div>`;
    if (active.providerStatus === "error") return '<p class="muted">Không tải được nhà cung cấp. Bấm Tải lại.</p>';
    const rows = active.providers.map(row => {
      const key = row.configured === true ? "Đã cấu hình" : row.configured === false ? "Chưa cấu hình" : "Chưa kiểm tra";
      const probe = row.lastProbeResult ? `${PROBE_LABELS[row.lastProbeResult] || row.lastProbeResult}${row.lastProbeAt ? ` · ${time(row.lastProbeAt)}` : ""}` : "Chưa kiểm tra";
      const circuit = row.circuitOpen ? `Mở tới ${time(row.openedUntil)}` : "Đóng";
      const editing = active.editingProvider === row.provider;
      return `<tr data-provider-row="${escape(row.provider)}">
        <td>${escape(row.priority)}</td><th scope="row">${escape(PROVIDER_LABELS[row.provider])}<br><small class="helper">${escape(row.secretName)} · giai đoạn ${escape(row.phase)}</small></th>
        <td>${row.enabled ? "Bật" : "Tắt"}</td><td>${escape(key)}</td><td>${escape(DATA_CLASS[row.allowedDataClass])}</td>
        <td>${escape(row.attempts24h ?? 0)} lượt · ${escape(row.errors24h ?? 0)} lỗi</td><td>${escape(circuit)}</td><td>${escape(probe)}</td>
        <td>${manage && !editing ? `<button type="button" class="button ghost" data-provider-edit="${escape(row.provider)}" ${active.busy ? "disabled" : ""}>Sửa</button>` : ""}</td></tr>
        ${editing ? `<tr><td colspan="9">${renderProviderForm(row)}</td></tr>` : ""}`;
    }).join("");
    return `<table class="config-table provider-table"><caption class="visually-hidden">Nhà cung cấp AI theo thứ tự ưu tiên</caption>
      <thead><tr><th scope="col">Thứ tự</th><th scope="col">Nhà cung cấp</th><th scope="col">Bật/tắt</th><th scope="col">Khóa</th><th scope="col">Được nhận dữ liệu</th><th scope="col">24 giờ qua</th><th scope="col">Cầu dao</th><th scope="col">Kiểm tra gần nhất</th><th scope="col"><span class="visually-hidden">Thao tác</span></th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  }
  function renderProviderForm(row) {
    const classes = row.provider === "deepseek" ? ["public"] : Object.keys(DATA_CLASS);
    return `<form class="config-form" data-provider-form="${escape(row.provider)}" novalidate>
      <div class="config-grid">
        <div class="config-field"><label><input type="checkbox" data-provider-field="enabled" ${row.enabled ? "checked" : ""}> Bật ${escape(PROVIDER_LABELS[row.provider])}</label></div>
        <div class="config-field"><label for="provider-priority-${escape(row.provider)}">Thứ tự (1–99)</label><input class="input" id="provider-priority-${escape(row.provider)}" type="number" min="1" max="99" data-provider-field="priority" value="${escape(row.priority)}"></div>
        <div class="config-field"><label for="provider-class-${escape(row.provider)}">Được nhận dữ liệu</label><select class="input" id="provider-class-${escape(row.provider)}" data-provider-field="allowedDataClass">${classes.map(value => `<option value="${value}" ${row.allowedDataClass === value ? "selected" : ""}>${DATA_CLASS[value]}</option>`).join("")}</select>${row.provider === "deepseek" ? '<small class="helper">DeepSeek trực tiếp chỉ nhận dữ liệu công khai (Owner 04/11).</small>' : ""}</div>
        <div class="config-field"><label for="provider-note-${escape(row.provider)}">Lý do (bắt buộc, 10–300 ký tự)</label><input class="input" id="provider-note-${escape(row.provider)}" maxlength="300" data-provider-field="note" autocomplete="off"></div>
      </div>
      ${row.configured !== true ? '<p class="helper">Chưa xác nhận có khóa. Owner đặt khóa trong Supabase › Edge Functions › Secrets rồi bấm Kiểm tra khóa trước khi bật.</p>' : ""}
      <div class="param-row"><button type="submit" class="button primary" ${active.busy ? "disabled" : ""}>Lưu thay đổi</button><button type="button" class="button ghost" data-provider-cancel>Hủy</button></div>
    </form>`;
  }
  function renderProbe() {
    const probe = active.probe;
    if (!probe) return "";
    if (probe.error) return `<p class="helper" role="status">${escape(probe.error)}</p>`;
    return `<ul class="probe-results" aria-label="Kết quả kiểm tra khóa">${probe.results.map(item => `<li><strong>${escape(PROVIDER_LABELS[item.provider] || item.provider)}:</strong> ${escape(PROBE_LABELS[item.result] || item.result)}${item.httpStatus ? ` (HTTP ${escape(item.httpStatus)})` : ""}</li>`).join("")}</ul>
      ${probe.recorded === false ? `<p class="helper">Kết quả chưa ghi vào máy chủ — cần migration ${PROVIDERS_MIGRATION}.</p>` : ""}`;
  }
  function renderStepRows(id, editable) {
    const item = feature(id), chain = chainFor(id);
    if (!chain.steps.length) return '<p class="muted">Chưa có chuỗi trên máy chủ: dùng chuỗi mặc định trong mã (OpenRouter, 1 model chính + 1 dự phòng).</p>';
    return `<table class="config-table chain-table"><caption class="visually-hidden">Chuỗi model của ${escape(item.label)}</caption>
      <thead><tr><th scope="col">Bước</th><th scope="col">Nhà cung cấp</th><th scope="col">Model</th><th scope="col">Chờ tối đa (giây)</th><th scope="col">Token trả lời</th><th scope="col">Nhiệt độ</th><th scope="col">JSON</th><th scope="col">Suy luận</th>${editable ? '<th scope="col"><span class="visually-hidden">Thao tác</span></th>' : ""}</tr></thead>
      <tbody>${chain.steps.map((step, index) => {
        const warning = stepWarning(step.provider, item), field = (name, attrs) => `id="chain-${id}-${index}-${name}" data-chain-feature="${id}" data-chain-step="${index}" data-chain-field="${name}" ${editable ? "" : "disabled"} ${attrs || ""}`;
        const models = CATALOGUE[step.provider] || [];
        const outside = step.model && !models.includes(step.model);
        return `<tr><th scope="row">${index + 1}${warning ? `<br><small class="helper warning-text">Sẽ bị bỏ qua: ${escape(warning)}</small>` : ""}</th>
          <td><label class="visually-hidden" for="chain-${id}-${index}-provider">Nhà cung cấp bước ${index + 1}</label><select class="input" ${field("provider")}>${[...PROVIDER_IDS, ...(item.decisions ? DECISION_IDS : [])].map(provider => `<option value="${provider}" ${provider === step.provider ? "selected" : ""}>${escape(stepLabel(provider))}</option>`).join("")}</select>${DECISION_IDS.includes(step.provider) ? '<br><small class="helper">API quyết định: chỉ trả về một lựa chọn, không có văn bản.</small>' : ""}</td>
          <td><label class="visually-hidden" for="chain-${id}-${index}-model">Model bước ${index + 1}</label><select class="input" ${field("model")}>${outside ? `<option value="${escape(step.model)}" selected>${escape(step.model)} (đang dùng, ngoài danh mục)</option>` : ""}${models.map(model => `<option value="${escape(model)}" ${model === step.model ? "selected" : ""}>${escape(model)}</option>`).join("")}</select></td>
          <td><label class="visually-hidden" for="chain-${id}-${index}-timeoutS">Chờ tối đa bước ${index + 1}</label><input class="input" type="number" min="1" max="140" ${field("timeoutS", `value="${escape(step.timeoutS)}"`)}></td>
          <td><label class="visually-hidden" for="chain-${id}-${index}-maxTokens">Token trả lời bước ${index + 1}</label><input class="input" type="number" min="64" max="8192" ${field("maxTokens", `value="${escape(step.maxTokens)}"`)}></td>
          <td><label class="visually-hidden" for="chain-${id}-${index}-temperature">Nhiệt độ bước ${index + 1}</label><input class="input" type="number" min="0" max="2" step="0.05" ${field("temperature", `value="${escape(step.temperature)}"`)}></td>
          <td><label class="visually-hidden" for="chain-${id}-${index}-jsonMode">JSON bước ${index + 1}</label><input type="checkbox" ${field("jsonMode", step.jsonMode ? "checked" : "")}></td>
          <td><label class="visually-hidden" for="chain-${id}-${index}-reasoning">Suy luận bước ${index + 1}</label><select class="input" ${field("reasoning")}>${REASONING.map(([value, label]) => `<option value="${value}" ${value === step.reasoning ? "selected" : ""}>${label}</option>`).join("")}</select></td>
          ${editable ? `<td class="chain-actions"><button type="button" class="button ghost" data-chain-move="up" data-chain-feature="${id}" data-chain-step="${index}" ${index === 0 ? "disabled" : ""} aria-label="Đưa bước ${index + 1} lên">↑</button><button type="button" class="button ghost" data-chain-move="down" data-chain-feature="${id}" data-chain-step="${index}" ${index === chain.steps.length - 1 ? "disabled" : ""} aria-label="Đưa bước ${index + 1} xuống">↓</button><button type="button" class="button ghost" data-chain-remove="${index}" data-chain-feature="${id}" ${chain.steps.length === 1 ? "disabled" : ""} aria-label="Xóa bước ${index + 1}">Xóa</button></td>` : ""}
        </tr>`;
      }).join("")}</tbody></table>`;
  }
  function renderChain(item, manage) {
    if (active.routeStatus === "loading" || active.routeStatus === "idle") return '<p class="muted">Đang tải chuỗi model…</p>';
    if (active.routeStatus === "error") return '<p class="muted">Không tải được chuỗi model. Bấm Tải lại.</p>';
    const id = item.id, { activeRoute, draftRoute } = routesFor(id), chain = chainFor(id), dirty = forms.dirty.has(id);
    const editable = manage && active.stepsSupported && !active.busy;
    const message = active.messages[id];
    return `<p>${activeRoute ? `Đang chạy: ${escape(activeRoute.version)}${Array.isArray(activeRoute.steps) && activeRoute.steps.length ? ` · ${activeRoute.steps.length} bước` : " · 1 model chính + dự phòng (chưa có chuỗi)"}` : "Đang chạy: mặc định trong mã."}
      ${draftRoute ? ` · Có bản nháp ${escape(draftRoute.version)}${draftRoute.created_at ? ` (${escape(time(draftRoute.created_at))})` : ""}` : ""}</p>
      ${renderStepRows(id, editable)}
      ${item.decisions ? `<p class="helper" data-decision-note="${id}">${escape(DECISION_NOTE)} Toàn bộ gợi ý dừng sau 4 giây (áp trong mã); quá hạn thì app dùng gợi ý theo luật.</p>` : ""}
      <form class="config-form" data-chain-form="${id}" novalidate>
        <div class="config-grid">
          <div class="config-field"><label for="chain-${id}-deadline">Tổng thời gian tối đa (giây, ≤ 140)</label><input class="input" type="number" min="5" max="140" id="chain-${id}-deadline" data-chain-feature="${id}" data-chain-field="deadlineS" value="${escape(chain.deadlineS)}" ${editable ? "" : "disabled"}><small class="helper">Để trống = cộng thời gian chờ các bước (tối đa 140 giây). Nếu “Tính năng AI” đặt thời gian chờ, dùng số nhỏ hơn.</small></div>
          <div class="config-field"><p class="helper">Trần chi phí mỗi lượt: theo “Tính năng AI”, mặc định 0,02 USD. Bước có thể vượt trần sẽ bị bỏ qua.</p></div>
        </div>
        ${editable ? `<div class="param-row">
          <button type="button" class="button ghost" data-chain-add="${id}" ${chain.steps.length >= MAX_STEPS ? "disabled" : ""}>Thêm bước</button>
          ${draftRoute ? `<button type="button" class="button ghost" data-chain-load-draft="${id}">Mở bản nháp</button>` : ""}
          <button type="submit" class="button" data-chain-save="${id}">Lưu nháp</button>
          <button type="button" class="button primary" data-chain-review="${id}">Xem lại & phát hành</button>
        </div>` : ""}
        <p class="helper" data-chain-dirty="${id}" ${dirty ? "" : "hidden"}>Còn thay đổi chưa lưu trên máy chủ.</p>
      </form>
      ${!manage ? '<p class="muted">Bạn chỉ có quyền xem. Lưu nháp và phát hành chuỗi model cần quyền ai.manage.</p>'
        : !active.stepsSupported ? `<div class="warning-card" role="note"><p>Chuỗi nhiều bước cần Owner áp migration ${STEPS_MIGRATION}. Trước đó dùng mục “Chuỗi model đang chạy” (1 model chính + 1 dự phòng).</p></div>` : ""}
      <p class="helper" role="status" aria-live="polite" data-chain-message="${id}">${escape(message || "")}</p>`;
  }
  function renderDialog() {
    const dialog = active.dialog;
    if (!dialog) return "";
    const item = feature(dialog.feature), before = activeSteps(dialog.feature), after = dialog.built.steps;
    const count = Math.max(before.length, after.length);
    const rows = Array.from({ length: count }, (_, index) => {
      const a = stepText(before[index]), b = stepText(after[index]);
      return `<tr class="${a === b ? "" : "changed"}"><th scope="row">Bước ${index + 1}</th><td>${escape(a)}</td><td>${escape(b)}</td><td>${a === b ? "Giữ nguyên" : !before[index] ? "Thêm" : !after[index] ? "Bỏ" : "Đổi"}</td></tr>`;
    }).join("");
    const { activeRoute } = routesFor(dialog.feature);
    const oldDeadline = Number.isInteger(activeRoute?.total_deadline_ms) ? `${Math.round(activeRoute.total_deadline_ms / 1000)} giây` : "Theo các bước";
    const newDeadline = dialog.built.totalDeadlineMs ? `${dialog.built.totalDeadlineMs / 1000} giây` : "Theo các bước";
    const warnings = after.map((step, index) => [index, stepWarning(step.provider, item)]).filter(([, text]) => text);
    const noteOk = dialog.note.trim().length >= 10 && dialog.note.trim().length <= 500;
    return `<div class="modal-backdrop ai-feature-dialog-backdrop"><section class="modal ai-feature-dialog" id="chain-dialog" role="dialog" aria-modal="true" aria-labelledby="chain-dialog-title" tabindex="-1">
      <div class="modal-header"><div><p class="eyebrow">Xem lại trước khi phát hành</p><h2 id="chain-dialog-title">Chuỗi model: ${escape(item.label)}</h2></div></div>
      <p class="pill" id="chain-dialog-environment">Đang ghi vào: ${escape(environmentLabel())}</p>
      <p>${activeRoute ? `Thay chuỗi đang chạy ${escape(activeRoute.version)}; bản cũ được lưu trữ, không bị xóa.` : "Thay chuỗi mặc định trong mã."} Các Edge Function đọc chuỗi mới ở yêu cầu kế tiếp.</p>
      <table class="config-table diff-table"><thead><tr><th scope="col">Bước</th><th scope="col">Đang chạy</th><th scope="col">Sau khi phát hành</th><th scope="col">Thay đổi</th></tr></thead><tbody>${rows}
        <tr class="${oldDeadline === newDeadline ? "" : "changed"}"><th scope="row">Tổng thời gian</th><td>${escape(oldDeadline)}</td><td>${escape(newDeadline)}</td><td>${oldDeadline === newDeadline ? "Giữ nguyên" : "Đổi"}</td></tr></tbody></table>
      ${warnings.length ? `<div class="warning-card" role="note">${warnings.map(([index, text]) => `<p>Bước ${index + 1} sẽ bị bỏ qua khi chạy: ${escape(text)}.</p>`).join("")}</div>` : ""}
      <p class="muted">Bị chặn vì an toàn thì không chuyển sang bước khác. Chưa có cổng chạy thử & chấm điểm (A6); hãy thử lại trên app staging sau khi phát hành.</p>
      <div class="config-field"><label for="chain-publish-note">Ghi chú phát hành (bắt buộc, 10–500 ký tự)</label><textarea class="input" id="chain-publish-note" rows="3" maxlength="500">${escape(dialog.note)}</textarea></div>
      <div class="modal-actions"><button type="button" class="button ghost" data-chain-dialog-cancel>Hủy</button><button type="button" class="button primary" data-chain-publish="${item.id}" ${noteOk && !active.busy ? "" : "disabled"}>Phát hành chuỗi</button></div>
    </section></div>`;
  }
  function render() {
    if (!active) return;
    const { container } = active;
    if (invalidated || !can("ai.read")) {
      container.innerHTML = `<div class="warning-card" role="status">${invalidated ? "Máy chủ đã thay đổi. Tải lại trang." : "Cần quyền xem AI (ai.read)."}</div>`;
      return;
    }
    const manage = can("ai.manage");
    container.innerHTML = `<div class="detail-heading"><div><p class="eyebrow">Nhà cung cấp & Model</p><h2 id="model-providers-title">Nhà cung cấp AI và chuỗi model từng tính năng</h2></div><span class="pill" role="status" aria-live="polite">${escape(active.status)}</span></div>
      <p>Mỗi tính năng chạy theo chuỗi tối đa ${MAX_STEPS} bước: bước 1 lỗi tạm thời, hết lượt, hết tiền, sai khóa, quá dài hoặc sai định dạng (1 lần) thì chuyển bước kế. <strong>Bị chặn vì an toàn thì không chuyển bước.</strong> Bước bị bỏ qua khi nhà cung cấp tắt, chưa có khóa, không được nhận loại dữ liệu của tính năng hoặc cầu dao đang mở.</p>
      <p class="helper">Bật/tắt, loại dữ liệu và cầu dao chỉ áp dụng cho tính năng đã có chuỗi nhiều bước. Tính năng chưa có chuỗi vẫn chạy 1 model chính + 1 dự phòng qua OpenRouter như cũ, kể cả khi OpenRouter ở đây đang tắt. Cột Thứ tự chỉ để tham khảo; thứ tự thật là thứ tự các bước trong chuỗi.</p>
      <p class="helper">Khóa nhà cung cấp chỉ đặt trong Supabase › Edge Functions › Secrets. Admin không có ô nhập khóa và không bao giờ hiện giá trị khóa.</p>
      <div class="param-row"><button type="button" class="button ghost" id="model-providers-reload" ${active.busy ? "disabled" : ""}>Tải lại</button>
        ${manage ? `<button type="button" class="button" id="model-providers-probe" ${active.busy ? "disabled" : ""}>Kiểm tra khóa</button>` : ""}</div>
      ${manage ? '<p class="helper">Kiểm tra khóa: mỗi nhà cung cấp có khóa được gọi 1 lần rất nhỏ (1 token) để xem Ổn / Sai khóa / Hết tiền / Không gọi được; có thể phát sinh phí rất nhỏ.</p>' : ""}
      ${renderProbe()}
      <section class="code-card" aria-labelledby="provider-table-title"><h3 id="provider-table-title">Nhà cung cấp</h3>${renderProviders(manage)}</section>
      <div class="ai-feature-grid">${FEATURES.map(item => `<article class="code-card ai-feature-card" data-chain-card="${item.id}" aria-labelledby="chain-${item.id}-title">
        <div class="layer-row"><h3 id="chain-${item.id}-title">${escape(item.label)}</h3><span class="pill">Dữ liệu ${escape(DATA_CLASS[item.dataClass].toLowerCase())}</span></div>
        ${renderChain(item, manage)}</article>`).join("")}</div>
      <p class="helper">Danh mục model nằm trong mã (13/11); tên model của nhà cung cấp trực tiếp chưa kiểm với tài khoản thật. Model đang dùng ngoài danh mục vẫn hiện nhưng không chọn lại được.</p>
      ${renderDialog()}`;
    if (active.dialog) container.querySelector("#chain-publish-note")?.focus();
  }

  // ---------- server calls ----------
  async function readRoutes() {
    const url = endpoint("admin-model-router-config");
    if (!url || typeof window.NilazaAdminRequest !== "function") throw Error("no_transport");
    const response = await window.NilazaAdminRequest(url, { method: "GET", headers: { "Content-Type": "application/json" } }, "ai.read");
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.status !== "connected" || !Array.isArray(body.routes)) throw Error("routes_failed");
    return body;
  }
  async function load() {
    if (!active || active.busy) return;
    const snapshot = scope(), version = ++epoch;
    if (invalidated || !snapshot.account || typeof window.NilazaAdminRpc !== "function") { active.status = "Chưa xác minh được phiên đăng nhập"; render(); return; }
    active.busy = true; active.status = "Đang tải…"; active.providerStatus = "loading"; active.routeStatus = "loading"; render();
    if (!await window.NilazaRequireCapability?.("ai.read") || !current(snapshot, version)) { if (active && version === epoch) { active.busy = false; active.status = "Cần quyền ai.read"; render(); } return; }
    const [providers, routes] = await Promise.allSettled([window.NilazaAdminRpc("list_ai_providers", {}, "ai.read"), readRoutes()]);
    if (!current(snapshot, version)) return;
    try { if (providers.status !== "fulfilled") throw providers.reason; active.providers = cleanProviders(providers.value); active.providerStatus = "ok"; }
    catch (error) { active.providers = []; active.providerStatus = error?.missingFunction ? "missing" : "error"; }
    try {
      if (routes.status !== "fulfilled") throw routes.reason;
      active.routes = routes.value.routes; active.history = Array.isArray(routes.value.history) ? routes.value.history : [];
      active.stepsSupported = routes.value.stepsSupported === true; active.routeStatus = "ok";
      for (const id of Object.keys(forms.chains)) if (!forms.dirty.has(id)) delete forms.chains[id];
    } catch { active.routes = []; active.history = []; active.routeStatus = "error"; }
    active.busy = false;
    active.status = active.providerStatus === "ok" && active.routeStatus === "ok" ? "Đã tải" : active.providerStatus === "missing" ? "Thiếu bảng nhà cung cấp trên máy chủ" : "Tải chưa đủ; thử lại";
    render();
  }
  async function probe() {
    if (!active || active.busy || !can("ai.manage")) return;
    const snapshot = scope(), version = ++epoch;
    active.busy = true; active.status = "Đang kiểm tra khóa…"; active.probe = null; render();
    try {
      if (!await window.NilazaRequireCapability?.("ai.manage") || !current(snapshot, version)) return;
      const response = await window.NilazaAdminRequest(endpoint("admin-ai-provider-probe"), { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }, "ai.manage");
      const body = await response.json().catch(() => null);
      if (!current(snapshot, version)) return;
      if (response.status === 404) throw Object.assign(Error("missing"), { missing: true });
      if (!response.ok || body?.status !== "checked" || !Array.isArray(body.results)) throw Error("probe_failed");
      active.probe = { results: body.results.filter(item => PROVIDER_IDS.includes(item?.provider) && PROBE_LABELS[item.result]), recorded: body.recorded !== false };
      active.status = "Đã kiểm tra khóa";
    } catch (error) {
      if (!current(snapshot, version)) return;
      active.probe = { error: error?.missing ? "Máy chủ chưa có hàm admin-ai-provider-probe — cần Owner deploy." : "Chưa kiểm tra được khóa. Thử lại sau." };
      active.status = "Kiểm tra khóa chưa xong";
    } finally {
      if (current(snapshot, version)) { active.busy = false; render(); if (active.probe?.results) void load(); }
    }
  }
  async function saveProvider(provider, form) {
    if (!active || active.busy || !can("ai.manage")) return;
    const row = providerRow(provider);
    if (!row) return;
    const note = String(form.querySelector('[data-provider-field="note"]')?.value || "").trim();
    const priority = Number(form.querySelector('[data-provider-field="priority"]')?.value);
    if (note.length < 10 || note.length > 300) { active.status = "Ghi lý do từ 10 tới 300 ký tự."; render(); return; }
    if (!Number.isInteger(priority) || priority < 1 || priority > 99) { active.status = "Thứ tự là số nguyên từ 1 đến 99."; render(); return; }
    const payload = { enabled: form.querySelector('[data-provider-field="enabled"]')?.checked === true, priority,
      allowedDataClass: form.querySelector('[data-provider-field="allowedDataClass"]')?.value, note };
    const snapshot = scope(), version = ++epoch;
    active.busy = true; active.status = "Đang lưu nhà cung cấp…"; render();
    try {
      if (!await window.NilazaRequireCapability?.("ai.manage") || !current(snapshot, version)) return;
      const result = await window.NilazaAdminRpc("set_ai_provider", { provider_input: provider, payload }, "ai.manage");
      if (!current(snapshot, version)) return;
      if (result?.provider !== provider) throw Error("invalid_acknowledgement");
      active.providers = cleanProviders(active.providers.map(item => item.provider === provider ? { ...item, ...result } : item));
      active.editingProvider = null; active.status = `Đã lưu ${PROVIDER_LABELS[provider]}`;
    } catch (error) {
      if (!current(snapshot, version)) return;
      active.status = error?.missingFunction ? `Cần migration ${PROVIDERS_MIGRATION}.` : error?.code === "42501" ? "Tài khoản này không có quyền ai.manage." : error?.code === "22023" ? "Máy chủ không nhận giá trị này." : "Chưa lưu được; tải lại rồi thử.";
    } finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  function postErrorMessage(response, body, action) {
    if (response.status === 412 || body?.code === "migration_missing") return `Chuỗi nhiều bước cần Owner áp migration ${STEPS_MIGRATION}.`;
    if (response.status === 409) return "Chuỗi đang chạy vừa thay đổi. Tải lại rồi xem lại.";
    if (response.status === 403) return "Tài khoản này không có quyền ai.manage.";
    if (response.status === 400) return "Máy chủ không nhận chuỗi này (giá trị ngoài giới hạn).";
    return action === "publish" ? "Chưa phát hành được. Tải lại rồi thử lại." : "Chưa lưu được nháp. Tải lại rồi thử lại.";
  }
  async function send(id, status, built, note) {
    const snapshot = scope(), version = ++epoch;
    active.busy = true; active.messages[id] = status === "active" ? "Đang phát hành…" : "Đang lưu nháp…"; render();
    try {
      if (!await window.NilazaRequireCapability?.("ai.manage") || !current(snapshot, version)) return false;
      const payload = routePayload(id, status, built, note);
      const response = await window.NilazaAdminRequest(endpoint("admin-model-router-config"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, "ai.manage");
      const body = await response.json().catch(() => null);
      if (!current(snapshot, version)) return false;
      if (!response.ok || body?.status !== "published" || body.configStatus !== status || body.config?.feature !== id || !Array.isArray(body.config?.steps)) {
        active.messages[id] = postErrorMessage(response, body, status === "active" ? "publish" : "save");
        return false;
      }
      forms.dirty.delete(id); delete forms.chains[id]; reportUnsaved();
      if (status === "active") {
        active.routes = [...active.routes.filter(route => !(route.feature === id && route.status === "active")), body.config];
        active.messages[id] = `Đã phát hành ${body.version}. Áp dụng từ yêu cầu kế tiếp.`;
      } else {
        active.history = [body.config, ...active.history];
        active.messages[id] = `Đã lưu nháp ${body.version}. Người dùng chưa thấy thay đổi này.`;
      }
      return true;
    } catch {
      if (current(snapshot, version)) active.messages[id] = status === "active" ? "Chưa phát hành được. Tải lại rồi thử lại." : "Chưa lưu được nháp. Tải lại rồi thử lại.";
      return false;
    } finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  async function saveDraft(id) {
    if (!active || active.busy || !can("ai.manage") || !active.stepsSupported) return;
    let built;
    try { built = buildSteps(id); } catch (error) { active.messages[id] = error.message; render(); return; }
    await send(id, "draft", built, null);
  }
  function openDialog(id) {
    if (!active || active.busy || !can("ai.manage") || !active.stepsSupported) return;
    let built;
    try { built = buildSteps(id); } catch (error) { active.messages[id] = error.message; render(); return; }
    active.dialog = { feature: id, built, note: "" };
    render();
  }
  async function publish(id) {
    if (!active || active.busy || active.dialog?.feature !== id) return;
    const note = active.dialog.note.trim();
    if (note.length < 10 || note.length > 500) { render(); return; }
    const built = active.dialog.built;
    if (await send(id, "active", built, note)) active.dialog = null;
    render();
  }
  function closeDialog() {
    if (!active?.dialog) return;
    const id = active.dialog.feature;
    active.dialog = null;
    render();
    active.container.querySelector(`[data-chain-review="${id}"]`)?.focus();
  }
  function markDirty(id) {
    forms.dirty.add(id); reportUnsaved();
    active.container.querySelector(`[data-chain-dirty="${id}"]`)?.removeAttribute("hidden");
  }

  function clear() {
    epoch++;
    if (active) active.container.innerHTML = '<p role="status">Phiên đã thay đổi. Mở lại mục Nhà cung cấp & Model để tiếp tục.</p>';
    active = null;
  }
  window.NilazaModelProviders = Object.freeze({
    clear,
    features: FEATURES,
    catalogue: CATALOGUE,
    buildSteps: id => buildSteps(id),
    mount(container) {
      const now = scope(), owner = `${now.account}|${now.target}`;
      if (forms.owner !== owner) { forms = { owner, chains: {}, dirty: new Set() }; reportUnsaved(); }
      if (active && active.container === container && active.account === now.account) { render(); return; }
      clear();
      active = { container, account: now.account, providers: [], providerStatus: "idle", routes: [], history: [], routeStatus: "idle", stepsSupported: false,
        busy: false, editingProvider: null, dialog: null, probe: null, messages: {}, status: "Chưa tải" };
      container.onclick = event => {
        if (!active || active.container !== container || invalidated || !can("ai.read")) return;
        const target = event.target;
        if (target.closest("#model-providers-reload")) { void load(); return; }
        if (target.closest("#model-providers-probe")) { void probe(); return; }
        const edit = target.closest("[data-provider-edit]");
        if (edit && can("ai.manage")) { active.editingProvider = edit.dataset.providerEdit; render(); return; }
        if (target.closest("[data-provider-cancel]")) { active.editingProvider = null; render(); return; }
        if (!can("ai.manage")) return;
        const add = target.closest("[data-chain-add]");
        if (add) {
          const id = add.dataset.chainAdd, chain = chainFor(id);
          if (chain.steps.length >= MAX_STEPS) return;
          const last = chain.steps[chain.steps.length - 1];
          chain.steps.push({ provider: "openrouter", model: CATALOGUE.openrouter[0], timeoutS: "30", maxTokens: last?.maxTokens || "2000", temperature: last?.temperature || "0.6", jsonMode: false, reasoning: "off", reasoningMax: "" });
          markDirty(id); render(); return;
        }
        const remove = target.closest("[data-chain-remove]");
        if (remove) {
          const id = remove.dataset.chainFeature, chain = chainFor(id);
          if (chain.steps.length > 1) { chain.steps.splice(Number(remove.dataset.chainRemove), 1); markDirty(id); render(); }
          return;
        }
        const move = target.closest("[data-chain-move]");
        if (move) {
          const id = move.dataset.chainFeature, chain = chainFor(id), index = Number(move.dataset.chainStep), other = move.dataset.chainMove === "up" ? index - 1 : index + 1;
          if (other >= 0 && other < chain.steps.length) { [chain.steps[index], chain.steps[other]] = [chain.steps[other], chain.steps[index]]; markDirty(id); render(); }
          return;
        }
        const loadDraft = target.closest("[data-chain-load-draft]");
        if (loadDraft) {
          const id = loadDraft.dataset.chainLoadDraft, item = feature(id), { draftRoute } = routesFor(id);
          if (!draftRoute) return;
          forms.chains[id] = { steps: stepsFromRoute(draftRoute, item), deadlineS: Number.isInteger(draftRoute.total_deadline_ms) ? String(Math.round(draftRoute.total_deadline_ms / 1000)) : "", source: "draft" };
          markDirty(id); active.messages[id] = `Đã mở bản nháp ${draftRoute.version} vào trình sửa.`; render(); return;
        }
        const review = target.closest("[data-chain-review]");
        if (review) { openDialog(review.dataset.chainReview); return; }
        if (target.closest("[data-chain-dialog-cancel]")) { closeDialog(); return; }
        const publishButton = target.closest("[data-chain-publish]");
        if (publishButton) void publish(publishButton.dataset.chainPublish);
      };
      container.onsubmit = event => {
        if (!active || active.container !== container) return;
        const providerForm = event.target.closest("[data-provider-form]"), chainForm = event.target.closest("[data-chain-form]");
        if (!providerForm && !chainForm) return;
        event.preventDefault();
        if (providerForm) void saveProvider(providerForm.dataset.providerForm, providerForm);
        else void saveDraft(chainForm.dataset.chainForm);
      };
      const onEdit = event => {
        if (!active || active.container !== container) return;
        if (event.target.id === "chain-publish-note" && active.dialog) {
          active.dialog.note = event.target.value;
          const length = event.target.value.trim().length, confirm = container.querySelector("[data-chain-publish]");
          if (confirm) confirm.disabled = active.busy || length < 10 || length > 500;
          return;
        }
        const id = event.target.dataset?.chainFeature, key = event.target.dataset?.chainField;
        if (!id || !key || !feature(id) || !can("ai.manage")) return;
        const chain = chainFor(id);
        if (key === "deadlineS") { chain.deadlineS = event.target.value; markDirty(id); return; }
        const step = chain.steps[Number(event.target.dataset.chainStep)];
        if (!step) return;
        step[key] = key === "jsonMode" ? event.target.checked : event.target.value;
        markDirty(id);
        // A new provider offers only its own catalogue: pick its first model and redraw the row.
        if (key === "provider" && event.type === "change") { step.model = CATALOGUE[step.provider]?.[0] || ""; render(); }
      };
      container.oninput = onEdit;
      container.onchange = event => { if (["SELECT"].includes(event.target.tagName) || event.target.type === "checkbox") onEdit(event); };
      container.onkeydown = event => { if (event.key === "Escape" && active?.dialog) { event.preventDefault(); closeDialog(); } };
      render();
      void load();
    }
  });
  window.addEventListener("hashchange", () => { if (active && !/^#providers(?:\?|$)/.test(location.hash)) clear(); });
})();
