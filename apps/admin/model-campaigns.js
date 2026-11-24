(function () {
  // Model và chiến dịch (proposal TAROT_NOTE_READER_ROUTER_CAMPAIGNS_2026-11-23, migration 20261124090100).
  // One card per AI feature: the running model chain (read from admin-model-router-config, ai.read) and its campaigns
  // from the admin-model-campaigns Edge Function. A campaign splits signed-in users into 2-4 variants (A is the control),
  // each with its own model chain; a user always lands in the same variant. Metrics per variant come from AI traces and
  // product signals (counts only, never text or user ids); fewer than 100 calls shows "chưa đủ dữ liệu".
  // Stop rules only warn here: nothing pauses a campaign automatically. "Chọn bản thắng" publishes the winning chain
  // through the existing route publish function (note 10-500 characters) and ends the campaign. Writes need ai.manage.
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const MIGRATION = "20261124090100_model_campaigns.sql";
  const MIN_CALLS = 100, MAX_STEPS = 4;
  const FEATURES = Object.freeze([
    { id: "persona_chat", label: "Trò chuyện với người dẫn" },
    { id: "oracle_router", label: "Oracle" },
    { id: "tarot_reading", label: "Giải bài Tarot" },
    { id: "tarot_note", label: "Ghi chú Tarot" },
    { id: "reader_router", label: "Gợi ý người đọc" },
    { id: "daily_insight", label: "Thông điệp hằng ngày" },
    { id: "astrology_report", label: "Đọc sâu Chiêm tinh" },
    { id: "ai_council", label: "Hội đồng" }
  ]);
  const PROVIDERS = ["openrouter", "anthropic", "gemini", "openai", "deepseek"];
  const KEYS = ["A", "B", "C", "D"];
  const STATUS = Object.freeze({ draft: "Nháp", running: "Đang chạy", paused: "Tạm dừng", ended: "Đã kết thúc" });
  const ACTIONS = Object.freeze({
    start: { label: "Bắt đầu", title: "Bắt đầu chiến dịch", text: "Người dùng đã đăng nhập của tính năng này sẽ được chia vào các bản theo tỷ lệ đã đặt, ngay từ yêu cầu kế tiếp (chậm nhất khoảng 1 phút)." },
    pause: { label: "Tạm dừng", title: "Tạm dừng chiến dịch", text: "Mọi người quay về chuỗi model đang chạy. Số liệu đã có được giữ; có thể bắt đầu lại." },
    end: { label: "Kết thúc", title: "Kết thúc chiến dịch", text: "Mọi người quay về chuỗi model đang chạy. Chiến dịch không chạy lại được; vẫn chọn được bản thắng sau đó." },
    pick_winner: { label: "Chọn bản thắng", title: "Chọn bản thắng và phát hành", text: "Chuỗi model của bản được chọn sẽ được phát hành thành chuỗi đang chạy của tính năng (bản cũ được lưu trữ, không bị xóa), rồi chiến dịch kết thúc." }
  });
  const initialTransport = { target: window.NilazaAdminTransportTarget || "", url: window.ENV?.SUPABASE_URL || "" };
  let active = null, epoch = 0, invalidated = false;

  const can = capability => window.NilazaAdminSession?.capabilities?.includes(capability) === true;
  const featureLabel = id => FEATURES.find(item => item.id === id)?.label || id;
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
  function environmentLabel() { return window.NilazaDescribeEnvironment?.(window.ENV)?.label || "CHƯA RÕ MÔI TRƯỜNG"; }
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
  const percent = value => typeof value === "number" && Number.isFinite(value) ? `${Math.round(value * 1000) / 10}%` : "—";
  const number = value => typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("vi-VN") : "—";
  function reportUnsaved() { window.NilazaUnsaved?.set("model-campaigns", active?.editor?.dirty ? 1 : 0); }

  // ---------- routes ----------
  const activeRoute = feature => (active?.routes || []).find(route => route?.feature === feature && route?.status === "active") || null;
  /** A stored route (snake_case steps or legacy primary/fallback) as the camelCase shape a campaign variant uses. */
  function routeToVariant(route) {
    if (!route) return null;
    const steps = Array.isArray(route.steps) && route.steps.length
      ? route.steps.map(step => ({ provider: step.provider, model: step.model, timeoutMs: step.timeout_ms, maxTokens: step.max_tokens, temperature: step.temperature, jsonMode: step.json_mode === true, reasoning: step.reasoning ?? null }))
      : [[route.primary_provider, route.primary_model], [route.fallback_provider, route.fallback_model]].filter(([provider, model]) => provider && model)
        .map(([provider, model]) => ({ provider, model, timeoutMs: 30000, maxTokens: route.max_output_tokens || 2000, temperature: route.temperature ?? 0.6, jsonMode: false, reasoning: null }));
    return steps.length ? { steps, ...(Number.isInteger(route.total_deadline_ms) ? { totalDeadlineMs: route.total_deadline_ms } : {}) } : null;
  }
  function routeSummary(route) {
    const shape = routeToVariant(route);
    if (!shape) return "Chưa có chuỗi trên máy chủ (dùng mặc định trong mã)";
    return shape.steps.map((step, index) => `${index + 1}. ${step.model}`).join(" → ");
  }
  /** Client-side check before sending; the server checks again. Returns an error text or "". */
  function routeError(route) {
    if (!route || typeof route !== "object" || Array.isArray(route) || !Array.isArray(route.steps)) return "cần {\"steps\": [...]}";
    if (route.steps.length < 1 || route.steps.length > MAX_STEPS) return `cần 1–${MAX_STEPS} bước`;
    for (const [index, step] of route.steps.entries()) {
      if (!step || !PROVIDERS.includes(step.provider)) return `bước ${index + 1}: nhà cung cấp không hợp lệ`;
      if (typeof step.model !== "string" || !step.model.trim()) return `bước ${index + 1}: thiếu model`;
      if (!Number.isInteger(step.timeoutMs) || step.timeoutMs < 1000 || step.timeoutMs > 140000) return `bước ${index + 1}: timeoutMs 1000–140000`;
      if (!Number.isInteger(step.maxTokens) || step.maxTokens < 64) return `bước ${index + 1}: maxTokens từ 64`;
      if (typeof step.temperature !== "number" || step.temperature < 0 || step.temperature > 2) return `bước ${index + 1}: temperature 0–2`;
    }
    if (route.totalDeadlineMs !== undefined && route.totalDeadlineMs !== null && (!Number.isInteger(route.totalDeadlineMs) || route.totalDeadlineMs > 140000)) return "totalDeadlineMs tối đa 140000";
    return "";
  }

  // ---------- editor ----------
  function newEditor(feature, campaign) {
    const base = routeToVariant(activeRoute(feature));
    const variants = campaign?.variants?.length
      ? campaign.variants.map(item => ({ key: item.key, label: item.label || "", traffic: String(item.trafficPercent ?? ""), route: JSON.stringify(routeToVariant({ steps: item.route?.steps, total_deadline_ms: item.route?.total_deadline_ms }) || item.route || {}, null, 2) }))
      : [{ key: "A", label: "Đang chạy", traffic: "50", route: base ? JSON.stringify(base, null, 2) : "" }, { key: "B", label: "Thử", traffic: "50", route: "" }];
    const stop = campaign?.stopRules || {};
    return {
      id: campaign?.id || null, feature, name: campaign?.name || "", dirty: false, error: "",
      startsAt: campaign?.startsAt ? String(campaign.startsAt).slice(0, 16) : "", endsAt: campaign?.endsAt ? String(campaign.endsAt).slice(0, 16) : "",
      locales: Array.isArray(campaign?.audience?.locales) ? [...campaign.audience.locales] : [],
      maxFormatFailPct: typeof stop.maxFormatFailRate === "number" ? String(Math.round(stop.maxFormatFailRate * 1000) / 10) : "",
      maxCostMultiplier: typeof stop.maxCostMultiplier === "number" ? String(stop.maxCostMultiplier) : "",
      variants
    };
  }
  /** The save_draft request, or throws an Error with a Vietnamese message. */
  function buildDraft(editor) {
    const name = editor.name.trim();
    if (name.length < 3 || name.length > 120) throw Error("Tên chiến dịch cần 3–120 ký tự.");
    if (editor.variants.length < 2 || editor.variants.length > 4) throw Error("Cần 2–4 bản.");
    const variants = editor.variants.map((item, index) => {
      const traffic = Number(item.traffic);
      if (!Number.isInteger(traffic) || traffic < 1 || traffic > 99) throw Error(`Bản ${item.key}: tỷ lệ là số nguyên 1–99.`);
      let route;
      try { route = JSON.parse(item.route); } catch { throw Error(`Bản ${item.key}: chuỗi model không phải JSON hợp lệ.`); }
      const problem = routeError(route);
      if (problem) throw Error(`Bản ${item.key}: ${problem}.`);
      const label = item.label.trim() || `Bản ${KEYS[index]}`;
      return { key: KEYS[index], label, trafficPercent: traffic, route };
    });
    const total = variants.reduce((sum, item) => sum + item.trafficPercent, 0);
    if (total !== 100) throw Error(`Tổng tỷ lệ phải là 100% (đang là ${total}%).`);
    const date = value => {
      if (!value) return null;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) throw Error("Ngày giờ không hợp lệ.");
      return parsed.toISOString();
    };
    const startsAt = date(editor.startsAt), endsAt = date(editor.endsAt);
    if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) throw Error("Ngày kết thúc phải sau ngày bắt đầu.");
    const stopRules = {};
    if (editor.maxFormatFailPct !== "") {
      const value = Number(editor.maxFormatFailPct);
      if (!Number.isFinite(value) || value < 0 || value > 100) throw Error("Ngưỡng lỗi định dạng là 0–100%.");
      stopRules.maxFormatFailRate = Math.round(value * 10) / 1000;
    }
    if (editor.maxCostMultiplier !== "") {
      const value = Number(editor.maxCostMultiplier);
      if (!Number.isFinite(value) || value < 1 || value > 10) throw Error("Ngưỡng chi phí là 1–10 lần bản A.");
      stopRules.maxCostMultiplier = value;
    }
    const audience = { signedInOnly: true, ...(editor.locales.length ? { locales: editor.locales } : {}) };
    return { action: "save_draft", ...(editor.id ? { id: editor.id } : {}), feature: editor.feature, name, startsAt, endsAt, audience, stopRules, variants };
  }

  // ---------- render ----------
  function renderMetrics(campaign) {
    const metrics = active.metrics?.[campaign.id];
    if (campaign.status === "draft") return '<p class="muted">Chưa chạy nên chưa có số liệu.</p>';
    if (!metrics || metrics.unavailable) return '<p class="muted">Chưa tải được số liệu.</p>';
    const rows = Array.isArray(metrics.variants) ? metrics.variants : [];
    const traffic = Object.fromEntries((campaign.variants || []).map(item => [item.key, item]));
    const keys = [...new Set([...(campaign.variants || []).map(item => item.key), ...rows.map(item => item.variant)])];
    const body = keys.map(key => {
      const row = rows.find(item => item.variant === key) || { variant: key, calls: 0, enoughData: false, stopRuleBreached: [] };
      const enough = row.enoughData === true;
      const warn = (row.stopRuleBreached || []).map(rule => rule === "maxFormatFailRate" ? "Lỗi định dạng vượt ngưỡng" : rule === "maxCostMultiplier" ? "Chi phí vượt ngưỡng" : rule);
      const cell = value => enough ? value : '<span class="muted">chưa đủ dữ liệu</span>';
      return `<tr${warn.length ? ' class="changed"' : ""}><th scope="row">${escape(key)} · ${escape(traffic[key]?.label || "")}${traffic[key] ? ` (${escape(traffic[key].trafficPercent)}%)` : ""}</th>
        <td>${number(row.calls)}${enough ? "" : ` / ${MIN_CALLS}`}</td>
        <td>${cell(row.avgCostMicro == null ? "—" : `${escape(number(Math.round(row.avgCostMicro)))} µ$${row.costMultiplier == null ? "" : ` (×${escape(row.costMultiplier)})`}`)}</td>
        <td>${cell(row.p95LatencyMs == null ? "—" : `${escape(number(Math.round(row.p95LatencyMs / 100) / 10))} giây`)}</td>
        <td>${cell(escape(percent(row.formatFailRate)))}</td>
        <td>${cell(escape(percent(row.modelFallbackRate)))}</td>
        <td>${cell(escape(percent(row.cannedFallbackRate)))}</td>
        <td>${cell(escape(percent(row.errorRate)))}</td>
        <td>${row.noteYesRate == null ? "—" : `${escape(percent(row.noteYesRate))} (${escape(number(row.noteFeedbackYes || 0))}/${escape(number((row.noteFeedbackYes || 0) + (row.noteFeedbackNo || 0)))})`}</td>
        <td>${number(row.readerSuggestionAccepted || 0)} / ${number(row.readerSuggestionShown || 0)}</td>
        <td>${warn.length ? `<strong>${escape(warn.join("; "))}</strong>` : enough ? "Ổn" : "—"}</td></tr>`;
    }).join("");
    return `<div class="table-scroll"><table class="config-table campaign-metrics" data-campaign-metrics="${escape(campaign.id)}">
      <caption>Số liệu theo bản: ${escape(campaign.name)} (cần ít nhất ${MIN_CALLS} lượt gọi mỗi bản mới đánh giá)</caption>
      <thead><tr><th scope="col">Bản</th><th scope="col">Lượt gọi</th><th scope="col">Chi phí TB / lượt</th><th scope="col">P95 thời gian</th><th scope="col">Lỗi định dạng</th><th scope="col">Chuyển model</th><th scope="col">Văn bản dự phòng</th><th scope="col">Lỗi</th><th scope="col">Ghi chú "đúng"</th><th scope="col">Gợi ý người đọc được nhận</th><th scope="col">Cảnh báo</th></tr></thead>
      <tbody>${body}</tbody></table></div>`;
  }
  function renderCampaign(campaign, manage) {
    const status = campaign.status;
    const buttons = !manage ? [] : [
      status === "draft" ? `<button type="button" class="button ghost" data-campaign-edit="${escape(campaign.id)}">Sửa nháp</button>` : "",
      ["draft", "paused"].includes(status) ? `<button type="button" class="button" data-campaign-action="start" data-campaign-id="${escape(campaign.id)}">${ACTIONS.start.label}</button>` : "",
      status === "running" ? `<button type="button" class="button" data-campaign-action="pause" data-campaign-id="${escape(campaign.id)}">${ACTIONS.pause.label}</button>` : "",
      ["running", "paused", "draft"].includes(status) ? `<button type="button" class="button ghost" data-campaign-action="end" data-campaign-id="${escape(campaign.id)}">${ACTIONS.end.label}</button>` : "",
      status !== "draft" && !campaign.winnerVariant ? `<button type="button" class="button primary" data-campaign-action="pick_winner" data-campaign-id="${escape(campaign.id)}">${ACTIONS.pick_winner.label}</button>` : ""
    ].filter(Boolean);
    const dates = [campaign.startsAt ? `từ ${time(campaign.startsAt)}` : "", campaign.endsAt ? `đến ${time(campaign.endsAt)}` : ""].filter(Boolean).join(" ");
    const locales = Array.isArray(campaign.audience?.locales) ? campaign.audience.locales.join(", ") : "mọi ngôn ngữ";
    return `<div class="campaign-block" data-campaign="${escape(campaign.id)}">
      <div class="layer-row"><h4>${escape(campaign.name)}</h4><span class="pill">${escape(STATUS[status] || status)}</span></div>
      <p class="muted">${escape(dates || "Không giới hạn ngày")} · Người dùng đã đăng nhập · ${escape(locales)}${campaign.winnerVariant ? ` · Bản thắng: ${escape(campaign.winnerVariant)}` : ""}</p>
      ${renderMetrics(campaign)}
      ${buttons.length ? `<div class="param-row campaign-actions">${buttons.join("")}</div>` : ""}
    </div>`;
  }
  function renderEditor() {
    const editor = active.editor;
    if (!editor) return "";
    const total = editor.variants.reduce((sum, item) => sum + (Number(item.traffic) || 0), 0);
    return `<section class="code-card campaign-editor" aria-labelledby="campaign-editor-title" data-campaign-editor>
      <h3 id="campaign-editor-title">${editor.id ? "Sửa nháp chiến dịch" : "Chiến dịch mới"}: ${escape(featureLabel(editor.feature))}</h3>
      <div class="config-field"><label for="campaign-name">Tên chiến dịch (3–120 ký tự)</label><input class="input" id="campaign-name" data-editor-field="name" maxlength="120" value="${escape(editor.name)}"></div>
      <div class="param-row">
        <div class="config-field"><label for="campaign-starts">Bắt đầu từ (không bắt buộc)</label><input class="input" type="datetime-local" id="campaign-starts" data-editor-field="startsAt" value="${escape(editor.startsAt)}"></div>
        <div class="config-field"><label for="campaign-ends">Kết thúc lúc (không bắt buộc)</label><input class="input" type="datetime-local" id="campaign-ends" data-editor-field="endsAt" value="${escape(editor.endsAt)}"></div>
      </div>
      <fieldset class="config-field"><legend>Ngôn ngữ app (để trống = mọi ngôn ngữ; chỉ người đã đăng nhập)</legend>
        ${["vi", "en"].map(locale => `<label class="check-row"><input type="checkbox" data-editor-locale="${locale}" ${editor.locales.includes(locale) ? "checked" : ""}> ${locale === "vi" ? "Tiếng Việt" : "Tiếng Anh"}</label>`).join("")}</fieldset>
      <fieldset class="config-field"><legend>Quy tắc dừng (chỉ cảnh báo, không tự tạm dừng)</legend>
        <div class="param-row">
          <div class="config-field"><label for="campaign-max-format">Lỗi định dạng tối đa (%)</label><input class="input" type="number" min="0" max="100" step="0.1" id="campaign-max-format" data-editor-field="maxFormatFailPct" value="${escape(editor.maxFormatFailPct)}"></div>
          <div class="config-field"><label for="campaign-max-cost">Chi phí tối đa (lần so với bản A)</label><input class="input" type="number" min="1" max="10" step="0.1" id="campaign-max-cost" data-editor-field="maxCostMultiplier" value="${escape(editor.maxCostMultiplier)}"></div>
        </div></fieldset>
      <p class="helper">Mỗi bản là một chuỗi model dạng JSON: <code>{"steps": [{"provider", "model", "timeoutMs", "maxTokens", "temperature", "jsonMode", "reasoning"}], "totalDeadlineMs"}</code>, tối đa ${MAX_STEPS} bước. Bản A nên là chuỗi đang chạy để làm mốc so sánh. Tổng tỷ lệ: <strong>${escape(total)}%</strong> (cần 100%).</p>
      ${editor.variants.map((item, index) => `<fieldset class="config-field campaign-variant" data-variant-index="${index}"><legend>Bản ${escape(KEYS[index])}</legend>
        <div class="param-row">
          <div class="config-field"><label for="variant-label-${index}">Tên bản</label><input class="input" id="variant-label-${index}" data-variant-field="label" data-variant="${index}" maxlength="80" value="${escape(item.label)}"></div>
          <div class="config-field"><label for="variant-traffic-${index}">Tỷ lệ (%)</label><input class="input" type="number" min="1" max="99" step="1" id="variant-traffic-${index}" data-variant-field="traffic" data-variant="${index}" value="${escape(item.traffic)}"></div>
        </div>
        <div class="config-field"><label for="variant-route-${index}">Chuỗi model (JSON)</label><textarea class="input code-input" rows="8" id="variant-route-${index}" data-variant-field="route" data-variant="${index}" spellcheck="false">${escape(item.route)}</textarea></div>
        <div class="param-row"><button type="button" class="button ghost" data-variant-copy="${index}" ${activeRoute(editor.feature) ? "" : "disabled"}>Chép chuỗi đang chạy</button>
          ${editor.variants.length > 2 ? `<button type="button" class="button ghost" data-variant-remove="${index}">Bỏ bản này</button>` : ""}</div>
      </fieldset>`).join("")}
      ${editor.variants.length < 4 ? '<p><button type="button" class="button ghost" data-variant-add>Thêm bản</button></p>' : ""}
      ${editor.error ? `<div class="warning-card" role="alert">${escape(editor.error)}</div>` : ""}
      <div class="modal-actions"><button type="button" class="button ghost" data-editor-cancel>Hủy</button><button type="button" class="button primary" data-editor-save ${active.busy ? "disabled" : ""}>Lưu nháp</button></div>
      <p class="muted">Lưu nháp chưa ảnh hưởng người dùng. Chỉ khi bấm "Bắt đầu" thì chiến dịch mới chạy.</p>
    </section>`;
  }
  function renderDialog() {
    const dialog = active.dialog;
    if (!dialog) return "";
    const campaign = active.campaigns.find(item => item.id === dialog.campaignId);
    if (!campaign) return "";
    const info = ACTIONS[dialog.action];
    const winner = dialog.action === "pick_winner";
    const noteLength = dialog.note.trim().length;
    const noteOk = winner ? noteLength >= 10 && noteLength <= 500 : noteLength <= 500;
    const metrics = active.metrics?.[campaign.id]?.variants || [];
    const thin = winner && dialog.variant && metrics.find(item => item.variant === dialog.variant)?.enoughData !== true;
    const route = activeRoute(campaign.feature);
    return `<div class="modal-backdrop ai-feature-dialog-backdrop"><section class="modal ai-feature-dialog" id="campaign-dialog" role="dialog" aria-modal="true" aria-labelledby="campaign-dialog-title" tabindex="-1">
      <div class="modal-header"><div><p class="eyebrow">${escape(featureLabel(campaign.feature))}</p><h2 id="campaign-dialog-title">${escape(info.title)}: ${escape(campaign.name)}</h2></div></div>
      <p class="pill">Đang ghi vào: ${escape(environmentLabel())}</p>
      <p>${escape(info.text)}</p>
      ${winner ? `<fieldset class="config-field"><legend>Bản thắng</legend>${(campaign.variants || []).map(item => `<label class="check-row"><input type="radio" name="campaign-winner" data-dialog-variant="${escape(item.key)}" ${dialog.variant === item.key ? "checked" : ""}> ${escape(item.key)} · ${escape(item.label)}</label>`).join("")}</fieldset>
        <p class="muted">Chuỗi đang chạy: ${escape(routeSummary(route))}${route ? ` (${escape(route.version)})` : ""}.</p>
        ${thin ? '<div class="warning-card" role="note">Bản này chưa đủ 100 lượt gọi; kết quả có thể chưa đáng tin.</div>' : ""}` : ""}
      <div class="config-field"><label for="campaign-dialog-note">${winner ? "Ghi chú phát hành (bắt buộc, 10–500 ký tự)" : "Ghi chú (không bắt buộc)"}</label><textarea class="input" id="campaign-dialog-note" rows="3" maxlength="500">${escape(dialog.note)}</textarea></div>
      <div class="modal-actions"><button type="button" class="button ghost" data-dialog-cancel>Hủy</button><button type="button" class="button primary" data-dialog-confirm ${noteOk && (!winner || dialog.variant) && !active.busy ? "" : "disabled"}>${escape(info.label)}</button></div>
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
    const missing = active.loadError === "migration_missing";
    container.innerHTML = `<div class="detail-heading"><div><p class="eyebrow">Model và chiến dịch</p><h2 id="model-campaigns-title">Chuỗi model đang chạy và chiến dịch thử model</h2></div><span class="pill" role="status" aria-live="polite">${escape(active.status)}</span></div>
      <p>Chiến dịch chia người dùng đã đăng nhập của một tính năng vào 2–4 bản, mỗi bản một chuỗi model; cùng một người luôn ở cùng một bản. Mỗi tính năng chỉ chạy một chiến dịch một lúc. Số liệu chỉ là số đếm, không có nội dung hay danh tính người dùng.</p>
      <p class="helper"><strong>Quy tắc dừng chỉ cảnh báo</strong>, không tự tạm dừng chiến dịch: người quản trị tự quyết bấm "Tạm dừng". Cần ít nhất ${MIN_CALLS} lượt gọi mỗi bản mới đánh giá; dưới mức đó bảng hiện "chưa đủ dữ liệu".</p>
      <div class="param-row"><button type="button" class="button ghost" id="model-campaigns-reload" ${active.busy ? "disabled" : ""}>Tải lại</button></div>
      ${active.message ? `<div class="${active.messageError ? "warning-card" : "info-card"}" role="${active.messageError ? "alert" : "status"}">${escape(active.message)}</div>` : ""}
      ${missing ? `<div class="warning-card" role="note">Máy chủ chưa có bảng chiến dịch. Cần Owner duyệt chạy migration <code>${MIGRATION}</code> và deploy Edge Function <code>admin-model-campaigns</code>.</div>` : ""}
      ${renderEditor()}
      <div class="ai-feature-grid">${FEATURES.map(item => {
        const campaigns = active.campaigns.filter(campaign => campaign.feature === item.id);
        const route = activeRoute(item.id);
        return `<article class="code-card ai-feature-card" data-campaign-card="${item.id}" aria-labelledby="campaign-card-${item.id}-title">
          <div class="layer-row"><h3 id="campaign-card-${item.id}-title">${escape(item.label)}</h3>${campaigns.some(campaign => campaign.status === "running") ? '<span class="pill">Đang thử model</span>' : ""}</div>
          <p><strong>Chuỗi đang chạy:</strong> ${escape(routeSummary(route))}${route?.version ? ` <span class="muted">(${escape(route.version)})</span>` : ""}</p>
          ${campaigns.length ? campaigns.map(campaign => renderCampaign(campaign, manage)).join("") : '<p class="muted">Chưa có chiến dịch.</p>'}
          ${manage && !missing && active.loaded ? `<p><button type="button" class="button ghost" data-campaign-new="${item.id}" ${active.editor ? "disabled" : ""}>Tạo chiến dịch</button></p>` : ""}
        </article>`;
      }).join("")}</div>
      ${manage ? "" : '<p class="muted">Bạn chỉ có quyền xem (ai.read). Tạo, chạy hay chọn bản thắng cần quyền ai.manage.</p>'}
      ${renderDialog()}`;
    if (active.dialog) container.querySelector("#campaign-dialog-note")?.focus();
  }

  // ---------- server calls ----------
  async function request(name, init, capability) {
    const url = endpoint(name);
    if (!url || typeof window.NilazaAdminRequest !== "function") throw Error("no_transport");
    const response = await window.NilazaAdminRequest(url, init, capability);
    const body = await response.json().catch(() => null);
    return { response, body };
  }
  async function load() {
    if (!active || active.busy) return;
    const snapshot = scope(), version = ++epoch;
    if (invalidated || !snapshot.account) { active.status = "Chưa xác minh được phiên đăng nhập"; render(); return; }
    active.busy = true; active.status = "Đang tải…"; render();
    if (!await window.NilazaRequireCapability?.("ai.read") || !current(snapshot, version)) { if (active && version === epoch) { active.busy = false; active.status = "Cần quyền ai.read"; render(); } return; }
    const get = { method: "GET", headers: { "Content-Type": "application/json" } };
    const [campaigns, routes] = await Promise.allSettled([request("admin-model-campaigns", get, "ai.read"), request("admin-model-router-config", get, "ai.read")]);
    if (!current(snapshot, version)) return;
    active.loadError = "";
    if (campaigns.status === "fulfilled" && campaigns.value.response.ok && campaigns.value.body?.status === "connected" && Array.isArray(campaigns.value.body.campaigns)) {
      active.campaigns = campaigns.value.body.campaigns.filter(item => item && typeof item.id === "string" && FEATURES.some(feature => feature.id === item.feature));
      active.metrics = campaigns.value.body.metrics && typeof campaigns.value.body.metrics === "object" ? campaigns.value.body.metrics : {};
      active.loaded = true;
    } else {
      active.campaigns = []; active.metrics = {}; active.loaded = false;
      active.loadError = campaigns.status === "fulfilled" && campaigns.value.body?.code === "migration_missing" ? "migration_missing" : "error";
    }
    active.routes = routes.status === "fulfilled" && routes.value.response.ok && Array.isArray(routes.value.body?.routes) ? routes.value.body.routes : [];
    active.busy = false;
    active.status = active.loaded ? "Đã tải" : active.loadError === "migration_missing" ? "Thiếu bảng chiến dịch trên máy chủ" : "Tải chưa được; thử lại";
    render();
  }
  function errorText(body, status) {
    if (body?.code === "migration_missing") return `Máy chủ chưa có bảng chiến dịch (migration ${MIGRATION}).`;
    if (status === 403) return "Không đủ quyền (cần ai.manage).";
    if (status === 409) return "Không làm được vì trạng thái đã đổi (ví dụ đã có chiến dịch khác đang chạy cho tính năng này, hoặc chuỗi model vừa được người khác phát hành). Tải lại rồi thử lại.";
    if (status === 404) return "Không tìm thấy chiến dịch hoặc bản. Tải lại trang.";
    return body?.error ? `Máy chủ từ chối: ${body.error}` : "Không gửi được; thử lại.";
  }
  async function post(payload, success) {
    if (!active || active.busy || !can("ai.manage")) return false;
    const snapshot = scope(), version = ++epoch;
    active.busy = true; active.message = ""; render();
    if (!await window.NilazaRequireCapability?.("ai.manage") || !current(snapshot, version)) { if (active && version === epoch) { active.busy = false; active.message = "Cần quyền ai.manage"; active.messageError = true; render(); } return false; }
    let ok = false;
    try {
      const { response, body } = await request("admin-model-campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, "ai.manage");
      if (!current(snapshot, version)) return false;
      ok = response.ok && body?.status === "ok";
      active.message = ok ? success : errorText(body, response.status); active.messageError = !ok;
    } catch {
      if (!current(snapshot, version)) return false;
      active.message = "Không gửi được; thử lại."; active.messageError = true;
    }
    active.busy = false;
    if (ok) { active.dialog = null; await load(); } else render();
    return ok;
  }
  async function saveDraft() {
    const editor = active?.editor;
    if (!editor) return;
    let payload;
    try { payload = buildDraft(editor); } catch (error) { editor.error = error.message; render(); return; }
    editor.error = "";
    if (await post(payload, `Đã lưu nháp "${payload.name}". Chưa ảnh hưởng người dùng.`)) { active.editor = null; reportUnsaved(); render(); }
  }
  async function confirmDialog() {
    const dialog = active?.dialog;
    if (!dialog) return;
    const campaign = active.campaigns.find(item => item.id === dialog.campaignId);
    if (!campaign) return;
    if (dialog.action === "pick_winner") {
      const route = activeRoute(campaign.feature);
      await post({ action: "pick_winner", campaignId: campaign.id, variant: dialog.variant, note: dialog.note.trim(), expectedActiveId: route?.id ?? null, publishRequestId: dialog.publishRequestId },
        `Đã phát hành bản ${dialog.variant} làm chuỗi đang chạy của ${featureLabel(campaign.feature)}; chiến dịch đã kết thúc.`);
      return;
    }
    await post({ action: dialog.action, campaignId: campaign.id, ...(dialog.note.trim() ? { note: dialog.note.trim() } : {}) },
      `${ACTIONS[dialog.action].label}: ${campaign.name}.`);
  }

  function clear() {
    epoch += 1;
    if (active?.container) { active.container.onclick = null; active.container.oninput = null; active.container.onchange = null; active.container.onkeydown = null; }
    active = null;
    window.NilazaUnsaved?.set("model-campaigns", 0);
  }
  window.NilazaModelCampaigns = Object.freeze({
    clear,
    /** Pure helpers exposed for tests. */
    buildDraft, routeToVariant,
    mount(container) {
      if (!container) return;
      const now = scope();
      if (active?.container === container && active.account === now.account) { render(); return; }
      clear();
      active = { container, account: now.account, campaigns: [], metrics: {}, routes: [], loaded: false, loadError: "", busy: false, editor: null, dialog: null, message: "", messageError: false, status: "Chưa tải" };
      container.onclick = event => {
        if (!active || active.container !== container || invalidated || !can("ai.read")) return;
        const target = event.target;
        if (target.closest("#model-campaigns-reload")) { void load(); return; }
        if (!can("ai.manage")) return;
        const create = target.closest("[data-campaign-new]");
        if (create && !active.editor) { active.editor = newEditor(create.dataset.campaignNew); render(); container.querySelector("#campaign-name")?.focus(); return; }
        const edit = target.closest("[data-campaign-edit]");
        if (edit && !active.editor) {
          const campaign = active.campaigns.find(item => item.id === edit.dataset.campaignEdit);
          if (campaign) { active.editor = newEditor(campaign.feature, campaign); render(); container.querySelector("#campaign-name")?.focus(); }
          return;
        }
        if (target.closest("[data-editor-cancel]")) { active.editor = null; reportUnsaved(); render(); return; }
        if (target.closest("[data-editor-save]")) { void saveDraft(); return; }
        const editor = active.editor;
        const copy = target.closest("[data-variant-copy]");
        if (copy && editor) {
          const base = routeToVariant(activeRoute(editor.feature));
          if (base) { editor.variants[Number(copy.dataset.variantCopy)].route = JSON.stringify(base, null, 2); editor.dirty = true; reportUnsaved(); render(); }
          return;
        }
        if (target.closest("[data-variant-add]") && editor && editor.variants.length < 4) {
          editor.variants.push({ key: KEYS[editor.variants.length], label: "", traffic: "", route: "" }); editor.dirty = true; reportUnsaved(); render(); return;
        }
        const remove = target.closest("[data-variant-remove]");
        if (remove && editor && editor.variants.length > 2) {
          editor.variants.splice(Number(remove.dataset.variantRemove), 1);
          editor.variants.forEach((item, index) => { item.key = KEYS[index]; });
          editor.dirty = true; reportUnsaved(); render(); return;
        }
        const action = target.closest("[data-campaign-action]");
        if (action) {
          active.dialog = { campaignId: action.dataset.campaignId, action: action.dataset.campaignAction, note: "", variant: "", publishRequestId: requestId() };
          render(); return;
        }
        if (target.closest("[data-dialog-cancel]")) { active.dialog = null; render(); return; }
        if (target.closest("[data-dialog-confirm]")) { void confirmDialog(); return; }
      };
      const onEdit = event => {
        if (!active || active.container !== container || !can("ai.manage")) return;
        const target = event.target;
        if (target.id === "campaign-dialog-note" && active.dialog) {
          active.dialog.note = target.value;
          const length = target.value.trim().length, confirm = container.querySelector("[data-dialog-confirm]");
          const winner = active.dialog.action === "pick_winner";
          if (confirm) confirm.disabled = active.busy || length > 500 || (winner && (length < 10 || !active.dialog.variant));
          return;
        }
        if (target.dataset?.dialogVariant && active.dialog) { active.dialog.variant = target.dataset.dialogVariant; render(); return; }
        const editor = active.editor;
        if (!editor) return;
        if (target.dataset?.editorField) { editor[target.dataset.editorField] = target.value; editor.dirty = true; reportUnsaved(); return; }
        if (target.dataset?.editorLocale) {
          const locale = target.dataset.editorLocale;
          editor.locales = target.checked ? [...new Set([...editor.locales, locale])] : editor.locales.filter(item => item !== locale);
          editor.dirty = true; reportUnsaved(); return;
        }
        if (target.dataset?.variantField) {
          const variant = editor.variants[Number(target.dataset.variant)];
          if (variant) { variant[target.dataset.variantField] = target.value; editor.dirty = true; reportUnsaved(); }
        }
      };
      container.oninput = onEdit;
      container.onchange = event => { if (event.target.type === "checkbox" || event.target.type === "radio") onEdit(event); };
      container.onkeydown = event => { if (event.key === "Escape" && active?.dialog) { event.preventDefault(); active.dialog = null; render(); } };
      render();
      void load();
    }
  });
  window.addEventListener("hashchange", () => { if (active && !/^#campaigns(?:\?|$)/.test(location.hash)) clear(); });
})();
