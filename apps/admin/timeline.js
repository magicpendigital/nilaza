(function () {
  // Lịch sử thao tác (A3; spec 04/11 §3.15, row D10). Reads get_admin_timeline (hub.read, migration
  // 20261113100100) through the signed-in session helper. Read only: content restore lives on each item's
  // "Lịch sử" panel. When the RPC is not on the server yet, the page says which migration the Owner must apply.
  const MIGRATION = "20261113100100_admin_timeline.sql";
  const PAGE = 50;
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const actionLabels = {
    "content.item.draft": "Lưu nháp nội dung",
    "content.item.restore": "Khôi phục phiên bản cũ thành nháp",
    "content.item.discard": "Bỏ nháp nội dung",
    "content.items.publish": "Phát hành nội dung",
    "content.bundle.draft_saved": "Lưu nháp cả gói nội dung",
    "content.bundle.published": "Phát hành cả gói nội dung",
    "content.bundle.rolled_back": "Quay lại gói nội dung cũ",
    "ai.feature_switch": "Bật/tắt tính năng AI",
    "ai.feature_config.draft": "Lưu nháp cấu hình AI",
    "ai.feature_config.publish": "Phát hành cấu hình AI",
    "ai.model_route.publish": "Phát hành chuỗi model",
    "ai.astrology_prompt.publish": "Phát hành prompt Chiêm tinh",
    "ai.trace_qa_capture.store": "Lưu bản ghi kiểm thử AI",
    "ai.trace_qa_capture.view": "Xem bản ghi kiểm thử AI",
    "safety.review": "Duyệt sự kiện an toàn",
    "role.insert": "Cấp quyền",
    "role.update": "Đổi quyền",
    "role.delete": "Gỡ quyền",
    // Thành viên & quyền (14/11)
    "role.set": "Đổi vai trò thành viên",
    "role.revoke": "Thu hồi quyền thành viên",
    "role.invite": "Mời / thêm thành viên"
  };
  const roleLabels = { owner: "Owner", admin: "Quản trị", editor: "Biên tập viên", safety_reviewer: "Kiểm duyệt an toàn" };
  const roleText = value => String(value).split(",").map(role => roleLabels[role.trim()] || role.trim()).join(", ");
  const kindLabels = { persona: "Người dẫn", deck: "Bộ bài", card: "Lá bài", frontend: "Văn bản trong app", asset: "Hình ảnh" };
  const groupOf = action => action.startsWith("content.") ? "content" : action.startsWith("ai.") ? "ai" : "safety";
  let state = fresh();
  let epoch = 0;
  function fresh() { return { status: "idle", rows: [], more: false, filter: "all", missing: false }; }
  function status(text) { const line = document.getElementById("timeline-status"); if (line) line.textContent = text; }
  function itemText(value) {
    const [kind, ...rest] = String(value).split("/");
    return kindLabels[kind] ? `${kindLabels[kind]} ${rest.join("/")}` : String(value);
  }
  function targetText(row) {
    const d = row.details || {};
    const parts = [];
    if (d.kind && d.key) parts.push(`${kindLabels[d.kind] || d.kind} ${d.key}`);
    if (Array.isArray(d.items)) parts.push(d.items.length <= 3 ? d.items.map(itemText).join(", ") : `${d.items.length} mục`);
    if (d.feature) parts.push(`Tính năng ${d.feature}`);
    if (d.role) parts.push(`Vai trò ${roleText(d.role)}`);
    if (Array.isArray(d.previousRoles) && d.previousRoles.length) parts.push(`trước đó ${roleText(d.previousRoles.join(","))}`);
    if (d.version !== undefined) parts.push(`phiên bản ${d.version}`);
    if (d.bundleVersion !== undefined) parts.push(`gói v${d.bundleVersion}`);
    if (d.restoredFromVersion !== undefined) parts.push(`từ phiên bản ${d.restoredFromVersion}`);
    if (d.enabled !== undefined) parts.push(d.enabled ? "bật" : "tắt");
    if (d.status) parts.push(`trạng thái ${d.status}`);
    return parts.join(" · ");
  }
  function render() {
    const container = document.getElementById("timeline-content");
    if (!container) return;
    const reload = document.getElementById("timeline-reload");
    if (reload) reload.disabled = state.status === "loading";
    if (state.missing) {
      container.innerHTML = `<article class="overview-card not-applied" data-timeline-missing><p class="eyebrow">Chưa áp dụng — cần backend (bước A3)</p><h2>Dòng thời gian chung</h2><p class="muted">Máy chủ chưa có hàm dòng thời gian. Cần Owner áp dụng migration <code>${escape(MIGRATION)}</code>.</p><p class="muted">Trong lúc chờ: thao tác cấu hình AI xem ở mục “Thao tác AI”.</p><button type="button" class="button link" data-go="#/ai-studio/audit">Xem thao tác AI</button></article>`;
      return;
    }
    const rows = state.rows.filter(row => state.filter === "all" || groupOf(row.action) === state.filter);
    if (state.status === "error") { container.innerHTML = `<p class="muted">Không tải được lịch sử thao tác. Thử tải lại.</p>`; return; }
    if (!rows.length) { container.innerHTML = state.status === "loading" ? "" : `<p class="muted">Chưa có thao tác nào${state.filter === "all" ? "" : " thuộc loại này"}.</p>`; return; }
    container.innerHTML = `<ol class="timeline-list">${rows.map(row => {
      const when = new Date(row.createdAt);
      const target = targetText(row);
      return `<li class="timeline-row" data-timeline-row data-action="${escape(row.action)}"><time datetime="${escape(row.createdAt)}">${escape(Number.isFinite(when.getTime()) ? when.toLocaleString("vi-VN") : row.createdAt)}</time><div><strong>${escape(actionLabels[row.action] || row.action)}</strong><span class="who">${escape(row.actorEmail || (row.actorId ? "Tài khoản đã xóa" : "Hệ thống"))}</span>${target ? `<span class="target">${escape(target)}</span>` : ""}${row.note ? `<span class="note">${escape(row.note)}</span>` : ""}</div></li>`;
    }).join("")}</ol>${state.more ? `<button type="button" class="button timeline-more" data-timeline-more ${state.status === "loading" ? "disabled" : ""}>Xem cũ hơn</button>` : ""}`;
  }
  async function load({ append = false } = {}) {
    if (state.status === "loading") return;
    const session = await window.NilazaAdminSessionPromise;
    const account = window.NilazaAdminSession?.userId || "";
    if (!session || !account || typeof window.NilazaAdminRpc !== "function") { status("Chưa xác minh được phiên đăng nhập. Tải lại trang hoặc đăng nhập lại."); return; }
    const version = ++epoch;
    const before = append ? state.rows[state.rows.length - 1]?.createdAt || null : null;
    if (!append) { const filter = state.filter; state = fresh(); state.filter = filter; }
    state.status = "loading";
    status("Đang tải…");
    render();
    try {
      const data = await window.NilazaAdminRpc("get_admin_timeline", { p_limit: PAGE, p_before: before }, "hub.read");
      if (version !== epoch || window.NilazaAdminSession?.userId !== account) return;
      if (!Array.isArray(data)) throw Error("invalid_response");
      const rows = data.filter(row => row && typeof row.action === "string" && typeof row.createdAt === "string");
      state.rows = append ? [...state.rows, ...rows] : rows;
      state.more = rows.length >= PAGE;
      state.status = "ok";
      status(`Cập nhật lúc ${new Date().toLocaleTimeString("vi-VN")} · ${state.rows.length} thao tác.`);
    } catch (error) {
      if (version !== epoch) return;
      if (error?.missingFunction) { state.missing = true; state.status = "ok"; status("Chưa áp dụng trên máy chủ này."); }
      else { state.status = "error"; status("Không tải được lịch sử thao tác."); }
    }
    render();
  }
  window.NilazaClearSensitiveAdminState = () => { epoch++; state = fresh(); const select = document.getElementById("timeline-filter"); if (select) select.value = "all"; status("Phiên đã thay đổi. Bấm Tải lại để xem lịch sử."); render(); };
  document.addEventListener("click", event => {
    if (event.target.closest("#timeline-reload")) { void load(); return; }
    if (event.target.closest("[data-timeline-more]")) { void load({ append: true }); return; }
    const go = event.target.closest("[data-go]");
    if (!go) return;
    if (window.parent !== window) window.parent.location.hash = go.dataset.go;
    else window.location.href = `./index.html${go.dataset.go}`;
  });
  document.addEventListener("change", event => {
    if (event.target.id !== "timeline-filter") return;
    state.filter = ["all", "content", "ai", "safety"].includes(event.target.value) ? event.target.value : "all";
    render();
  });
  window.addEventListener("focus", () => { if (state.status === "idle") void load(); });
  window.NilazaTimeline = Object.freeze({ load, render, get state() { return state; } });
  render();
  void load();
})();
