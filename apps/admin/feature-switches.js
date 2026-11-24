(function () {
  // Công tắc AI (Owner decision 2026-10-31, analysis CO-01 / AD-10): turn an AI feature off or on with a
  // reason. Reading needs ai.read; changing needs ai.manage and is written to the admin audit log.
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const features = {
    ai_council: "Hội đồng",
    persona_chat: "Trò chuyện với người dẫn",
    oracle_router: "Oracle",
    astrology_insight: "Đọc sâu Chiêm tinh",
    tarot_reading: "Giải bài Tarot",
    daily_insight: "Thông điệp hằng ngày",
    astrology_report: "Astrology report — đang gỡ, chỉ theo dõi",
    // Batch C (2026-11-24, migration 20261124090000).
    tarot_note: "Ghi chú riêng Tarot",
    reader_router: "Gợi ý người đọc (tầng AI)"
  };
  const initialTransport = { target: window.NilazaAdminTransportTarget || "", url: window.ENV?.SUPABASE_URL || "", key: window.ENV?.SUPABASE_ANON_KEY || "" };
  let invalidated = false, active = null, epoch = 0;
  function scope() {
    if ((window.ENV?.SUPABASE_URL || "") !== initialTransport.url || (window.ENV?.SUPABASE_ANON_KEY || "") !== initialTransport.key) invalidated = true;
    return { account: window.NilazaAdminSession?.userId || "", target: initialTransport.target, hash: location.hash };
  }
  const can = capability => window.NilazaAdminSession?.capabilities?.includes(capability) === true;
  function clear() {
    epoch++;
    if (active) active.container.innerHTML = '<p role="status">Phiên đã thay đổi. Mở lại mục Công tắc AI để tiếp tục.</p>';
    active = null;
  }
  function current(snapshot, version) {
    const now = scope();
    return Boolean(active && version === epoch && !invalidated && !document.hidden && can("ai.read")
      && now.account === snapshot.account && now.target === snapshot.target && now.hash === snapshot.hash && active.container.isConnected);
  }
  function cleanRows(value) {
    if (!Array.isArray(value)) throw Error("invalid_response");
    return value.filter(row => Object.hasOwn(features, row?.feature) && typeof row.enabled === "boolean");
  }
  function render() {
    if (!active) return;
    const { container, rows, status, busy, editing } = active;
    if (invalidated || !can("ai.read")) {
      container.innerHTML = `<div class="warning-card" role="status">${invalidated ? "Máy chủ đã thay đổi. Tải lại trang." : "Cần quyền xem AI (ai.read)."}</div>`;
      return;
    }
    const manage = can("ai.manage");
    container.innerHTML = `<div class="detail-heading"><div><p class="eyebrow">Công tắc AI</p><h2 id="feature-switches-title">Công tắc tính năng AI</h2></div><span class="pill" role="status" aria-live="polite">${escape(status)}</span></div>
      <p>Tắt một tính năng khi cần dừng khẩn cấp (chi phí, lỗi, nội dung). Người dùng sẽ thấy "đang tạm nghỉ" và không mất lượt. Câu trả lời an toàn khi khủng hoảng vẫn hoạt động. Bật/tắt kèm hạn mức nằm ở mục Tính năng AI.</p>
      ${manage ? "" : '<p class="muted">Bạn chỉ có quyền xem. Cần quyền ai.manage để bật/tắt.</p>'}
      <div class="param-row"><button type="button" id="switches-load" class="button primary" ${busy ? "disabled" : ""}>${busy ? "Đang tải…" : "Tải trạng thái"}</button></div>
      ${rows.length ? rows.map(row => {
        const on = row.enabled;
        const form = editing === row.feature ? `<form data-switch-form="${escape(row.feature)}">
            <label for="switch-reason">Lý do (bắt buộc, 3–200 ký tự)</label>
            <input class="input" id="switch-reason" maxlength="200" required minlength="3" autocomplete="off">
            <button type="submit" class="button primary" ${busy ? "disabled" : ""}>${on ? "Xác nhận tắt" : "Xác nhận bật"}</button>
            <button type="button" class="button ghost" data-switch-cancel>Hủy</button></form>` : "";
        return `<article class="code-card"><h3>${escape(features[row.feature])}</h3>
          <p><strong>${on ? "Đang bật" : "Đang tắt"}</strong>${row.reason ? ` · ${escape(row.reason)}` : ""}${row.updatedAt ? ` · ${escape(row.updatedAt)}` : ""}</p>
          ${manage && editing !== row.feature ? `<button type="button" class="button ${on ? "ghost" : "primary"}" data-switch-edit="${escape(row.feature)}" ${busy ? "disabled" : ""}>${on ? "Tắt tính năng này" : "Bật lại"}</button>` : ""}
          ${form}</article>`;
      }).join("") : `<p class="muted">${active.loaded ? "Chưa có bảng công tắc trên máy chủ này. Các tính năng đang chạy bình thường." : "Chưa tải dữ liệu."}</p>`}`;
    if (editing) container.querySelector("#switch-reason")?.focus();
  }
  async function load() {
    if (!active || active.busy) return;
    const snapshot = scope(), version = ++epoch;
    if (invalidated || !snapshot.account || !snapshot.target) { active.status = "Máy chủ hoặc phiên đăng nhập chưa sẵn sàng"; render(); return; }
    active.busy = true; active.status = "Đang tải…"; render();
    try {
      if (!await window.NilazaRequireCapability?.("ai.read") || !current(snapshot, version)) { if (active && version === epoch) { active.busy = false; render(); } return; }
      const data = await window.NilazaAdminRpc("get_ai_feature_switches", {}, "ai.read");
      if (!current(snapshot, version)) return;
      active.rows = cleanRows(data); active.loaded = true; active.status = `${active.rows.filter(row => !row.enabled).length} tính năng đang tắt`;
    } catch { if (current(snapshot, version)) { active.rows = []; active.loaded = true; active.status = "Không tải được; thử lại."; } }
    finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  async function save(feature, reason) {
    if (!active || active.busy) return;
    const row = active.rows.find(item => item.feature === feature), clean = String(reason || "").trim();
    if (!row) return;
    if (clean.length < 3 || clean.length > 200) { active.status = "Hãy ghi lý do từ 3 tới 200 ký tự."; render(); return; }
    const snapshot = scope(), version = ++epoch;
    active.busy = true; active.status = "Đang lưu…"; render();
    try {
      if (!await window.NilazaRequireCapability?.("ai.manage") || !current(snapshot, version)) return;
      const result = await window.NilazaAdminRpc("set_ai_feature_switch", { feature_input: feature, enabled_input: !row.enabled, reason_input: clean }, "ai.manage");
      if (!current(snapshot, version)) return;
      if (result?.feature !== feature || result.enabled !== !row.enabled) throw Error("invalid_acknowledgement");
      Object.assign(row, result); active.editing = null;
      active.status = row.enabled ? "Đã bật lại" : "Đã tắt";
    } catch { if (current(snapshot, version)) active.status = "Chưa lưu; tải lại trạng thái rồi thử."; }
    finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  window.NilazaFeatureSwitches = {
    clear,
    mount(container) {
      const now = scope();
      if (!active || active.container !== container || active.account !== now.account || active.hash !== now.hash) {
        clear(); active = { container, account: now.account, hash: now.hash, rows: [], busy: false, loaded: false, editing: null, status: "Chưa tải" };
        container.onclick = event => {
          if (!active || invalidated || !can("ai.read")) return;
          if (event.target.closest("#switches-load")) { void load(); return; }
          const edit = event.target.closest("[data-switch-edit]");
          if (edit && can("ai.manage")) { active.editing = edit.dataset.switchEdit; active.status = "Ghi lý do rồi xác nhận"; render(); return; }
          if (event.target.closest("[data-switch-cancel]")) { active.editing = null; active.status = "Đã hủy"; render(); }
        };
        container.onsubmit = event => {
          const form = event.target.closest("[data-switch-form]");
          if (!form || !active) return;
          event.preventDefault();
          void save(form.dataset.switchForm, form.querySelector("#switch-reason")?.value);
        };
      }
      render();
    }
  };
  window.addEventListener("hashchange", () => { if (active && active.hash !== location.hash) clear(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) clear(); });
})();
