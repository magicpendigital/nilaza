(function () {
  // Tổng quan (A2; spec 04/11 §3.2). Reads only existing protected RPCs through the signed-in session helper:
  // AI switches (ai.read), open feedback (safety.review) and recent AI errors (ai.read). Each block shows only
  // when the account has that capability. Costs need a backend reader that does not exist yet.
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const features = [
    ["persona_chat", "Trò chuyện với người dẫn"],
    ["oracle_router", "Oracle"],
    ["tarot_reading", "Giải bài Tarot"],
    ["daily_insight", "Thông điệp hằng ngày"],
    ["astrology_insight", "Đọc sâu Chiêm tinh"],
    ["ai_council", "Hội đồng"],
    ["astrology_report", "Astrology report — đang gỡ"]
  ];
  const featureLabel = id => features.find(([key]) => key === id)?.[1] || "Tính năng khác";
  const can = capability => window.NilazaAdminSession?.capabilities?.includes(capability) === true;
  const DAY_MS = 24 * 60 * 60 * 1000;
  let epoch = 0;
  let busy = false;
  let state = fresh();
  function fresh() {
    return { loaded: false, account: "", switches: { status: "idle", rows: [] }, feedback: { status: "idle", count: 0, capped: false }, errors: { status: "idle", day: 0, rows: [] } };
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
  function render() {
    const container = document.getElementById("overview-content");
    if (!container) return;
    const blocks = [renderSwitches(), renderFeedback(), renderErrors(),
      '<article class="overview-card not-applied"><h2>Chi phí AI</h2><p class="muted">Chưa có số liệu chi phí (cần backend). Chi phí hôm nay và 14 ngày sẽ hiện sau khi máy chủ có hàm đọc ngân sách.</p></article>'];
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
      })
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
