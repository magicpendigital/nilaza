(function () {
  // Công tắc AI (Owner decision 2026-10-31, analysis CO-01 / AD-10): turn an AI feature off or on with a
  // reason. Reading needs ai.read; changing needs ai.manage and is written to the admin audit log.
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const features = {
    ai_council: "Hội đồng 3 góc nhìn / AI Council",
    persona_chat: "Trò chuyện với người dẫn đường / Guide chat",
    astrology_insight: "Đọc sâu với AI (Chiêm tinh) / Astrology deep read",
    tarot_reading: "Diễn giải Tarot bằng AI / Tarot AI reading",
    daily_insight: "Thông điệp hằng ngày / Daily insight",
    astrology_report: "Lá số tóm tắt (bản cũ) / Astrology preview (legacy)"
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
    if (active) active.container.innerHTML = '<p role="status">Phiên đã thay đổi. Mở lại mục Công tắc AI để tiếp tục. / Session changed. Reopen AI switches to continue.</p>';
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
      container.innerHTML = `<div class="warning-card" role="status">${invalidated ? "Backend đã thay đổi. Tải lại trang. / Backend changed. Reload this page." : "Cần quyền xem AI. / Requires ai.read access."}</div>`;
      return;
    }
    const manage = can("ai.manage");
    container.innerHTML = `<div class="detail-heading"><div><p class="eyebrow">AI switches</p><h2 id="feature-switches-title">Công tắc tính năng AI / AI feature switches</h2></div><span class="pill" role="status" aria-live="polite">${escape(status)}</span></div>
      <p>Tắt một tính năng khi cần dừng khẩn cấp (chi phí, lỗi, nội dung). Người dùng sẽ thấy "đang tạm nghỉ" và không mất lượt. Câu trả lời an toàn khi khủng hoảng vẫn hoạt động. / Turning a feature off shows people a resting message and uses no turn; crisis safety replies still work.</p>
      ${manage ? "" : '<p class="muted">Bạn chỉ có quyền xem. Cần quyền ai.manage để bật/tắt. / View only; ai.manage is needed to change switches.</p>'}
      <div class="param-row"><button type="button" id="switches-load" class="button primary" ${busy ? "disabled" : ""}>${busy ? "Đang tải / Loading…" : "Tải trạng thái / Load states"}</button></div>
      ${rows.length ? rows.map(row => {
        const on = row.enabled;
        const form = editing === row.feature ? `<form data-switch-form="${escape(row.feature)}">
            <label for="switch-reason">Lý do (bắt buộc, 3–200 ký tự) / Reason (required)</label>
            <input class="input" id="switch-reason" maxlength="200" required minlength="3" autocomplete="off">
            <button type="submit" class="button primary" ${busy ? "disabled" : ""}>${on ? "Xác nhận tắt / Confirm turn off" : "Xác nhận bật / Confirm turn on"}</button>
            <button type="button" class="button ghost" data-switch-cancel>Hủy / Cancel</button></form>` : "";
        return `<article class="code-card"><h3>${escape(features[row.feature])}</h3>
          <p><strong>${on ? "Đang bật / On" : "Đang tắt / Off"}</strong>${row.reason ? ` · ${escape(row.reason)}` : ""}${row.updatedAt ? ` · ${escape(row.updatedAt)}` : ""}</p>
          ${manage && editing !== row.feature ? `<button type="button" class="button ${on ? "ghost" : "primary"}" data-switch-edit="${escape(row.feature)}" ${busy ? "disabled" : ""}>${on ? "Tắt tính năng này / Turn off" : "Bật lại / Turn on"}</button>` : ""}
          ${form}</article>`;
      }).join("") : `<p class="muted">${active.loaded ? "Chưa có bảng công tắc trên database này. Các tính năng đang chạy bình thường. / No switch table on this database yet; features run normally." : "Chưa tải dữ liệu. / No data loaded."}</p>`}`;
    if (editing) container.querySelector("#switch-reason")?.focus();
  }
  async function load() {
    if (!active || active.busy) return;
    const snapshot = scope(), version = ++epoch;
    if (invalidated || !snapshot.account || !snapshot.target) { active.status = "Backend/phiên chưa sẵn sàng / Backend or session unavailable"; render(); return; }
    active.busy = true; active.status = "Đang tải / Loading…"; render();
    try {
      if (!await window.NilazaRequireCapability?.("ai.read") || !current(snapshot, version)) { if (active && version === epoch) { active.busy = false; render(); } return; }
      const data = await window.NilazaAdminRpc("get_ai_feature_switches", {}, "ai.read");
      if (!current(snapshot, version)) return;
      active.rows = cleanRows(data); active.loaded = true; active.status = `${active.rows.filter(row => !row.enabled).length} tính năng đang tắt / feature(s) off`;
    } catch { if (current(snapshot, version)) { active.rows = []; active.loaded = true; active.status = "Không tải được; thử lại. / Could not load; retry."; } }
    finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  async function save(feature, reason) {
    if (!active || active.busy) return;
    const row = active.rows.find(item => item.feature === feature), clean = String(reason || "").trim();
    if (!row) return;
    if (clean.length < 3 || clean.length > 200) { active.status = "Hãy ghi lý do từ 3 tới 200 ký tự. / Reason must be 3–200 characters."; render(); return; }
    const snapshot = scope(), version = ++epoch;
    active.busy = true; active.status = "Đang lưu / Saving…"; render();
    try {
      if (!await window.NilazaRequireCapability?.("ai.manage") || !current(snapshot, version)) return;
      const result = await window.NilazaAdminRpc("set_ai_feature_switch", { feature_input: feature, enabled_input: !row.enabled, reason_input: clean }, "ai.manage");
      if (!current(snapshot, version)) return;
      if (result?.feature !== feature || result.enabled !== !row.enabled) throw Error("invalid_acknowledgement");
      Object.assign(row, result); active.editing = null;
      active.status = row.enabled ? "Đã bật lại / Turned on" : "Đã tắt / Turned off";
    } catch { if (current(snapshot, version)) active.status = "Chưa lưu; tải lại trạng thái rồi thử. / Not saved; reload states and retry."; }
    finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  window.NilazaFeatureSwitches = {
    clear,
    mount(container) {
      const now = scope();
      if (!active || active.container !== container || active.account !== now.account || active.hash !== now.hash) {
        clear(); active = { container, account: now.account, hash: now.hash, rows: [], busy: false, loaded: false, editing: null, status: "Chưa tải / Not loaded" };
        container.onclick = event => {
          if (!active || invalidated || !can("ai.read")) return;
          if (event.target.closest("#switches-load")) { void load(); return; }
          const edit = event.target.closest("[data-switch-edit]");
          if (edit && can("ai.manage")) { active.editing = edit.dataset.switchEdit; active.status = "Ghi lý do rồi xác nhận / Add a reason, then confirm"; render(); return; }
          if (event.target.closest("[data-switch-cancel]")) { active.editing = null; active.status = "Đã hủy / Cancelled"; render(); }
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
