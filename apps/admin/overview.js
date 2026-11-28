(function () {
  // Tổng quan (A2; spec 04/11 §3.2). Reads only existing protected RPCs through the signed-in session helper:
  // AI switches (ai.read), open feedback (safety.review) and recent AI errors (ai.read). Each block shows only
  // when the account has that capability.
  // P1-C (15/11): "Chi phí AI" reads get_ai_cost_summary (ai.read, migration 20261115120000): aggregates per feature
  // only, no user id or content. Budget figures are shown, never edited here.
  // A6 (spec §5.1): versions published with a quality-gate bypass show as "Chưa chấm" until they are scored, with the
  // 24-hour deadline (list_ai_release_gate_pending, ai.read, migration 20261113110000).
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const features = [
    ["persona_chat", "Trò chuyện với người dẫn"],
    ["oracle_router", "Oracle"],
    ["tarot_reading", "Giải bài Tarot"],
    ["daily_insight", "Thông điệp hằng ngày"],
    ["astrology_insight", "Đọc sâu Chiêm tinh"],
    ["ai_council", "Hội đồng"],
    ["astrology_report", "Astrology report — đang gỡ"],
    ["tarot_note", "Ghi chú riêng Tarot"],
    ["reader_router", "Gợi ý người đọc (tầng AI)"],
    ["numerology_private_message", "Lời nhắn riêng Thần số học"]
  ];
  const featureLabel = id => features.find(([key]) => key === id)?.[1] || "Tính năng khác";
  const can = capability => window.NilazaAdminSession?.capabilities?.includes(capability) === true;
  const DAY_MS = 24 * 60 * 60 * 1000;
  let epoch = 0;
  let busy = false;
  let state = fresh();
  // Mirror of packages/agent-config/ai-usage-policy.json qaBudget (checked by scripts/admin-ai-cost.test.mjs). Display only.
  const BUDGET_POLICY_G1 = { version: "g1-2026-10-02", dailyMicroUSD: 5000000, campaignMicroUSD: 50000000, campaignDays: 14 };
  const COST_PERIODS = [7, 14, 30];
  let costDays = 7;
  function fresh() {
    return { loaded: false, account: "", switches: { status: "idle", rows: [] }, feedback: { status: "idle", count: 0, capped: false }, errors: { status: "idle", day: 0, rows: [] }, unscored: { status: "idle", rows: [] }, cost: { status: "idle", data: null } };
  }
  const num = value => (Number.isFinite(Number(value)) ? Number(value) : 0);
  // micro-USD -> "0,0123 USD"; small per-turn amounts need four decimals.
  function usd(micro, digits = 4) {
    return `${(num(micro) / 1e6).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: digits })} USD`;
  }
  function goButton(hash, label) {
    return `<button type="button" class="button link" data-go="${escape(hash)}">${escape(label)}</button>`;
  }
  function renderSwitches() {
    const block = state.switches;
    if (block.status === "denied") return "";
    let body = '<p class="muted">Chưa tải.</p>';
    if (block.status === "loading") body = '<p class="muted">Đang tải…</p>';
    if (block.status === "error") body = '<p class="muted">Không tải được trạng thái công tắc. Thử tải lại.</p>';
    if (block.status === "ok") {
      body = `<ul class="light-list">${features.map(([id, label]) => {
        const row = block.rows.find(item => item.feature === id);
        const on = row ? row.enabled : true;
        const detail = !row ? "Chưa có công tắc trên máy chủ này; đang chạy theo mặc định." : row.enabled ? "Đang bật" : `Đang tắt${row.reason ? ` · ${escape(row.reason)}` : ""}`;
        return `<li><span class="light ${on ? "on" : "off"}" aria-hidden="true"></span><div><strong>${escape(label)}</strong><small>${detail}</small></div></li>`;
      }).join("")}</ul>`;
    }
    return `<article class="overview-card wide"><h2>Tính năng AI</h2>${body}${goButton("#/ai-studio/features", "Mở Tính năng AI")}</article>`;
  }
  function renderFeedback() {
    const block = state.feedback;
    if (block.status === "denied") return "";
    const body = block.status === "ok"
      ? `<span class="big-number">${block.capped ? "100+" : block.count}</span><p class="muted">phản hồi đang ở trạng thái “mới”.</p>`
      : `<p class="muted">${block.status === "loading" ? "Đang tải…" : block.status === "error" ? "Không tải được phản hồi. Thử tải lại." : "Chưa tải."}</p>`;
    return `<article class="overview-card"><h2>Phản hồi mới</h2>${body}${goButton("#/ai-studio/feedback", "Mở Phản hồi người dùng")}</article>`;
  }
  function renderErrors() {
    const block = state.errors;
    if (block.status === "denied") return "";
    let body = `<p class="muted">${block.status === "loading" ? "Đang tải…" : block.status === "error" ? "Không tải được nhật ký lỗi. Thử tải lại." : "Chưa tải."}</p>`;
    if (block.status === "ok") {
      body = `<span class="big-number">${block.day}</span><p class="muted">lượt AI ghi trạng thái lỗi trong 24 giờ qua (đếm trong 50 lỗi gần nhất).</p>
        ${block.rows.length ? `<ul class="error-list">${block.rows.slice(0, 5).map(row => `<li>${escape(featureLabel(row.feature))} · ${escape(row.created_at || "")}</li>`).join("")}</ul>` : ""}
        <p class="muted">Tỉ lệ chuyển sang model dự phòng cần thêm cột trong nhật ký (việc backend E5).</p>`;
    }
    return `<article class="overview-card"><h2>Lỗi AI gần đây</h2>${body}${goButton("#/ai-studio/trace-explorer", "Mở Nhật ký AI")}</article>`;
  }
  const REASONS = { restore_passed_version: "Khôi phục bản đã đạt", urgent_safety_fix: "Sửa khẩn cấp an toàn" };
  function renderUnscored() {
    const block = state.unscored;
    if (block.status === "denied") return "";
    // Shown only when something waits for scoring, or when the server cannot answer yet.
    if (block.status === "ok" && !block.rows.length) return "";
    let body = `<p class="muted">${block.status === "loading" ? "Đang tải…" : block.status === "missing" ? "Máy chủ chưa có cổng chạy thử (migration 20261113110000)." : block.status === "error" ? "Không tải được danh sách chờ chấm." : "Chưa tải."}</p>`;
    if (block.status === "ok") {
      body = `<p>${block.rows.length} bản đang chạy được phát hành khi chưa chấm đủ. Cần chấm lại trong 24 giờ.</p>
        <ul class="error-list">${block.rows.map(row => `<li class="${row.overdue ? "overdue" : ""}">${escape(featureLabel(row.feature === "astrology_report" ? "astrology_insight" : row.feature))} · ${row.targetKind === "prompt_version" ? `prompt ${escape(String(row.locale || "").toUpperCase())} ${escape(row.version)}` : `cấu hình phiên bản ${escape(row.version)}`}
          · ${escape(REASONS[row.reason] || "")} · ${row.overdue ? "<strong>Quá hạn</strong>" : "hạn"} ${escape(row.dueAt || "")}</li>`).join("")}</ul>`;
    }
    return `<article class="overview-card wide reminder"><h2><span class="pill badge-unscored">Chưa chấm</span> Bản phát hành chờ chấm điểm</h2>${body}${goButton("#/ai-studio/test", "Mở Chạy thử & chấm điểm")}</article>`;
  }
  function renderBudget(data) {
    const cap = num(data?.budget?.defaultTurnCapMicro) || 20000;
    const campaigns = Array.isArray(data?.budget?.campaigns) ? data.budget.campaigns.filter(row => row && typeof row === "object") : [];
    const active = campaigns.find(row => row.status === "active");
    const total = num(data?.totals?.costMicro);
    const days = Math.max(1, num(data?.daysBack) || costDays);
    const perDay = total / days;
    const server = active
      ? `Ngân sách đang chạy trên máy chủ (${escape(active.policyVersion || "")}): ${usd(active.dailyCapMicro, 2)}/ngày, ${usd(active.totalCapMicro, 2)} cả đợt, đã dùng ${usd(active.usedMicro)}.`
      : `Ngân sách chính sách ${escape(BUDGET_POLICY_G1.version)}: ${usd(BUDGET_POLICY_G1.dailyMicroUSD, 2)}/ngày, ${usd(BUDGET_POLICY_G1.campaignMicroUSD, 2)}/${BUDGET_POLICY_G1.campaignDays} ngày — chưa kích hoạt trên máy chủ.`;
    const dailyCap = active ? num(active.dailyCapMicro) : BUDGET_POLICY_G1.dailyMicroUSD;
    const share = dailyCap > 0 ? Math.round((perDay / dailyCap) * 1000) / 10 : 0;
    return `<ul class="cost-budget">
      <li>Trung bình ${usd(perDay)}/ngày trong ${days} ngày, bằng ${share.toLocaleString("vi-VN")}% trần ngày.</li>
      <li>${server}</li>
      <li>Trần mỗi lượt trong bộ định tuyến: ${usd(cap)} (dự tính trước khi gọi model).</li>
      <li>Giả định pilot Free: 1 USD/ngày (quyết định 15/11, chưa cấu hình).</li>
    </ul>`;
  }
  function renderCost() {
    const block = state.cost;
    if (block.status === "denied") return "";
    const periods = `<div class="cost-periods" role="group" aria-label="Khoảng thời gian">${COST_PERIODS.map(days =>
      `<button type="button" class="button period${days === costDays ? " active" : ""}" data-cost-days="${days}" aria-pressed="${days === costDays}">${days} ngày</button>`).join("")}</div>`;
    let body = `<p class="muted">${block.status === "loading" ? "Đang tải…" : block.status === "missing" ? "Máy chủ chưa có hàm đọc chi phí (migration 20261115120000 chưa áp)." : block.status === "error" ? "Không tải được số liệu chi phí. Thử tải lại." : "Chưa tải."}</p>`;
    if (block.status === "ok" && block.data) {
      const data = block.data;
      const rows = Array.isArray(data.features) ? data.features.filter(row => row && typeof row.feature === "string") : [];
      const table = rows.length ? `<div class="cost-table-wrap"><table class="cost-table">
        <thead><tr><th scope="col">Tính năng</th><th scope="col">Lượt</th><th scope="col">Lần gọi model</th><th scope="col">Tổng chi phí</th><th scope="col">Mỗi lượt p50 / p95 / p99</th><th scope="col">Lỗi / dự phòng</th><th scope="col">Ghi chú</th></tr></thead>
        <tbody>${rows.map(row => {
          const calls = num(row.calls);
          const notes = [];
          if (num(row.estimatedCalls) || num(row.unknownCalls)) notes.push(`<span class="pill badge-estimate">ước tính</span> ${num(row.estimatedCalls)} lần ước tính${num(row.unknownCalls) ? `, ${num(row.unknownCalls)} lần chưa rõ giá` : ""}`);
          if (num(row.unverifiedPriceCalls)) notes.push(`<span class="pill badge-unverified">giá chưa xác minh</span> ${num(row.unverifiedPriceCalls)} lần`);
          const rate = count => (calls ? `${Math.round((num(count) / calls) * 1000) / 10}%` : "0%");
          return `<tr><th scope="row">${escape(featureLabel(row.feature))}</th><td>${num(row.turns)}</td><td>${calls}</td><td>${usd(row.costMicro)}</td>
            <td>${usd(row.turnCostP50, 6)} / ${usd(row.turnCostP95, 6)} / ${usd(row.turnCostP99, 6)}</td>
            <td>${rate(row.failedCalls)} / ${rate(row.fallbackCalls)}</td><td>${notes.join("<br>") || "Theo hóa đơn nhà cung cấp"}</td></tr>`;
        }).join("")}</tbody></table></div>` : '<p class="muted">Chưa có lượt nào trong khoảng này.</p>';
      const perUser = data.perUserDay || {};
      const userLine = perUser.hidden
        ? `Chi phí mỗi người mỗi ngày: cần ít nhất ${num(perUser.minUserDays) || 5} người-ngày mới hiện (hiện có ${num(perUser.userDays)}).`
        : `Chi phí mỗi người mỗi ngày (${num(perUser.userDays)} người-ngày): p50 ${usd(perUser.costP50)} · p95 ${usd(perUser.costP95)} · p99 ${usd(perUser.costP99)}.`;
      const evalLine = num(data.eval?.calls) ? ` Chạy thử của Admin (không tính ở trên): ${num(data.eval.calls)} lần, ${usd(data.eval.costMicro)}.` : "";
      body = `<p>Tổng ${usd(data.totals?.costMicro)} cho ${num(data.totals?.turns)} lượt, ${escape(data.fromDay || "")} – ${escape(data.toDay || "")} (giờ Việt Nam).</p>
        ${table}
        <p class="muted">${userLine}${evalLine}</p>
        ${renderBudget(data)}
        <p class="muted">“Ước tính” là chi phí tính từ số token và bảng giá tham khảo khi nhà cung cấp không trả số tiền; “giá chưa xác minh” là model chưa có nguồn giá chính thức.</p>`;
    }
    return `<article class="overview-card wide cost-card"><h2>Chi phí AI</h2>${periods}${body}</article>`;
  }
  async function loadCost(target, current) {
    if (!can("ai.read")) { target.cost.status = "denied"; return; }
    target.cost.status = "loading";
    try {
      const data = await window.NilazaAdminRpc("get_ai_cost_summary", { days_back: costDays }, "ai.read");
      if (!data || typeof data !== "object" || Array.isArray(data)) throw Error("invalid_response");
      if (current && !current()) return;
      target.cost.data = data;
      target.cost.status = "ok";
    } catch (error) { target.cost.status = error?.missingFunction ? "missing" : "error"; }
  }
  function render() {
    const container = document.getElementById("overview-content");
    if (!container) return;
    const blocks = [renderUnscored(), renderSwitches(), renderFeedback(), renderErrors(), renderCost()];
    container.innerHTML = blocks.join("");
    const reload = document.getElementById("overview-reload");
    if (reload) reload.disabled = busy;
  }
  function status(text) {
    const line = document.getElementById("overview-status");
    if (line) line.textContent = text;
  }
  async function read(target, block, capability, call) {
    if (!can(capability)) { target[block].status = "denied"; return; }
    target[block].status = "loading";
    try { await call(); target[block].status = "ok"; } catch { target[block].status = "error"; }
  }
  async function load() {
    if (busy) return;
    const session = await window.NilazaAdminSessionPromise;
    const account = window.NilazaAdminSession?.userId || "";
    if (!session || !account || typeof window.NilazaAdminRpc !== "function") { status("Chưa xác minh được phiên đăng nhập. Tải lại trang hoặc đăng nhập lại."); return; }
    const version = ++epoch;
    busy = true;
    const next = fresh();
    next.account = account;
    state = next;
    status("Đang tải…");
    const current = () => version === epoch && window.NilazaAdminSession?.userId === account;
    const pending = Promise.all([
      (async () => {
        if (!can("ai.read")) { next.unscored.status = "denied"; return; }
        next.unscored.status = "loading";
        try {
          const data = await window.NilazaAdminRpc("list_ai_release_gate_pending", {}, "ai.read");
          if (!Array.isArray(data)) throw Error("invalid_response");
          next.unscored.rows = data.filter(row => row && typeof row === "object" && typeof row.feature === "string");
          next.unscored.status = "ok";
        } catch (error) { next.unscored.status = error?.missingFunction ? "missing" : "error"; }
      })(),
      read(next, "switches", "ai.read", async () => {
        const data = await window.NilazaAdminRpc("get_ai_feature_switches", {}, "ai.read");
        if (!Array.isArray(data)) throw Error("invalid_response");
        next.switches.rows = data.filter(row => features.some(([id]) => id === row?.feature) && typeof row.enabled === "boolean");
      }),
      read(next, "feedback", "safety.review", async () => {
        const data = await window.NilazaAdminRpc("get_ai_feedback_inbox", { limit_count: 100, status_filter: "open", feature_filter: null }, "safety.review");
        if (!Array.isArray(data)) throw Error("invalid_response");
        next.feedback.count = data.length;
        next.feedback.capped = data.length >= 100;
      }),
      read(next, "errors", "ai.read", async () => {
        const data = await window.NilazaAdminRpc("search_ai_trace_runs", { limit_count: 50, feature_filter: null, status_filter: "error", query_text: null }, "ai.read");
        if (!Array.isArray(data)) throw Error("invalid_response");
        const now = Date.now();
        next.errors.rows = data.filter(row => row && typeof row === "object");
        next.errors.day = next.errors.rows.filter(row => { const time = Date.parse(row.created_at); return Number.isFinite(time) && now - time <= DAY_MS; }).length;
      }),
      loadCost(next)
    ]);
    render();
    await pending;
    if (version === epoch) busy = false;
    if (!current()) return;
    state.loaded = true;
    status(`Cập nhật lúc ${new Date().toLocaleTimeString("vi-VN")}.`);
    render();
  }
  // workspace-guard calls this when the account, its capabilities or the backend change.
  window.NilazaClearSensitiveAdminState = () => { epoch++; busy = false; state = fresh(); status("Phiên đã thay đổi. Bấm Tải lại để xem số liệu mới."); render(); };
  document.addEventListener("click", event => {
    if (event.target.closest("#overview-reload")) { void load(); return; }
    const period = event.target.closest("[data-cost-days]");
    if (period) {
      const days = Number(period.dataset.costDays);
      if (!COST_PERIODS.includes(days) || busy || days === costDays) return;
      costDays = days;
      // Only the cost block reloads; a session change in the meantime drops the answer.
      const target = state, version = epoch, account = target.account;
      void loadCost(target, () => version === epoch && state === target && window.NilazaAdminSession?.userId === account).then(render);
      render();
      return;
    }
    const go = event.target.closest("[data-go]");
    if (!go) return;
    // Inside the shell, the shell owns the address bar; standalone, open the shell at that page.
    if (window.parent !== window) window.parent.location.hash = go.dataset.go;
    else window.location.href = `./index.html${go.dataset.go}`;
  });
  window.addEventListener("focus", () => { if (!state.loaded && !busy) void load(); });
  window.NilazaOverview = Object.freeze({ load, render, get state() { return state; } });
  render();
  void load();
})();
