(function () {
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const uuid = value => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
  const id = value => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:@-]{0,127}$/.test(value);
  const statuses = ["open", "investigating", "resolved", "dismissed"];
  const categories = { too_generic: "Quá chung chung", incorrect_facts: "Sai dữ kiện", unclear: "Khó hiểu", inappropriate: "Không phù hợp", language: "Ngôn ngữ", technical: "Lỗi kỹ thuật" };
  // Vietnamese labels (A2); the stored values stay the server contract.
  const statusLabels = { open: "Mới", investigating: "Đang xem", resolved: "Đã xong", dismissed: "Bỏ qua" };
  const featureLabels = { tarot_reading: "Giải bài Tarot", astrology_insight: "Đọc sâu Chiêm tinh", persona_chat: "Trò chuyện với người dẫn", ai_council: "Hội đồng" };
  const initialTransport = { target: window.NilazaAdminTransportTarget || "", url: window.ENV?.SUPABASE_URL || "", key: window.ENV?.SUPABASE_ANON_KEY || "" };
  let invalidated = false, active = null, epoch = 0;
  function scope() {
    if ((window.ENV?.SUPABASE_URL || "") !== initialTransport.url || (window.ENV?.SUPABASE_ANON_KEY || "") !== initialTransport.key) invalidated = true;
    return { account: window.NilazaAdminSession?.userId || "", target: initialTransport.target, hash: location.hash };
  }
  function permitted() { return window.NilazaAdminSession?.capabilities?.includes("safety.review") === true; }
  function clear() {
    epoch++;
    if (active) active.container.innerHTML = '<p role="status">Phiên đã thay đổi. Mở lại mục Phản hồi người dùng để tiếp tục.</p>';
    active = null;
  }
  function current(snapshot, version) {
    const now = scope();
    return Boolean(active && version === epoch && !invalidated && !document.hidden && !window.frameElement?.hidden && permitted()
      && now.account === snapshot.account && now.target === snapshot.target && now.hash === snapshot.hash && active.container.isConnected);
  }
  function cleanRows(value) {
    if (!Array.isArray(value)) throw Error("invalid_response");
    return value.slice(0, 100).filter(row => uuid(row?.feedbackId) && statuses.includes(row.status) && Number.isInteger(row.revision)
      && row.revision > 0 && ["tarot_reading", "astrology_insight", "persona_chat", "ai_council"].includes(row.submitted?.feature) && Object.hasOwn(categories, row.submitted?.category));
  }
  function safeMetadata(row) {
    const source = row.serverReceipt?.metadata;
    if (!source || typeof source !== "object" || !uuid(row.serverReceipt?.receiptId)) return null;
    const result = {};
    for (const key of ["feature", "locale", "sourceKind", "interactionId", "attemptId", "clientRequestId", "remoteId", "traceId", "providerRequestId", "promptVersionId", "promptVersion", "routeVersionId", "routeVersion", "responseSchema", "contentVersion", "calculationVersion", "chartContractVersion", "promptAssemblyVersion", "validationStatus", "persistenceStatus"]) {
      if (id(source[key])) result[key] = source[key];
    }
    if (Number.isInteger(source.reportRevision) && source.reportRevision > 0) result.reportRevision = source.reportRevision;
    return result;
  }
  function render() {
    if (!active) return;
    const { container, rows, status, busy } = active;
    if (invalidated || !permitted()) {
      container.innerHTML = `<div class="warning-card" role="status">${invalidated ? "Máy chủ đã thay đổi. Tải lại trang." : "Cần quyền xử lý phản hồi (safety.review)."}</div>`;
      return;
    }
    container.innerHTML = `<div class="detail-heading"><div><p class="eyebrow">Vận hành</p><h2 id="feedback-inbox-title">Phản hồi người dùng về câu trả lời AI</h2></div><span class="pill" role="status" aria-live="polite">${escape(status)}</span></div>
      <p>Chỉ có nhóm vấn đề và mã kỹ thuật. Không có câu hỏi, câu trả lời AI, ghi chú hay dữ liệu ngày sinh của người dùng.</p>
      <p class="muted">Biên nhận máy chủ xác nhận các mã bên dưới. Nhật ký AI cũ vẫn có nguồn ghi chưa xác minh; đừng dùng nó để khẳng định model đã chạy.</p>
      <div class="param-row"><label for="feedback-status">Trạng thái</label><select class="input" id="feedback-status"><option value="all">Tất cả</option>${statuses.map(value => `<option value="${value}" ${active.filter === value ? "selected" : ""}>${statusLabels[value]}</option>`).join("")}</select>
      <label for="feedback-feature">Tính năng</label><select class="input" id="feedback-feature"><option value="all">Tất cả</option>${Object.keys(featureLabels).map(value => `<option value="${value}" ${active.feature === value ? "selected" : ""}>${featureLabels[value]}</option>`).join("")}</select><button type="button" id="feedback-load" class="button primary" ${busy ? "disabled" : ""}>${busy ? "Đang tải…" : "Tải phản hồi"}</button></div>
      ${rows.length ? rows.map(row => {
        const metadata = safeMetadata(row);
        const submitted = row.submitted;
        return `<article class="code-card"><h3>${escape(categories[submitted.category])}</h3><p>${escape(featureLabels[submitted.feature] || submitted.feature)} · ${escape(submitted.language)} · ${escape(row.receivedAt)} · ${escape(statusLabels[row.status])}</p>
          <p>Phần được báo: ${id(submitted.sectionId) ? escape(submitted.sectionId) : "Cả câu trả lời"} · Nguồn do app gửi (chưa xác minh): ${id(submitted.sourceKind) ? escape(submitted.sourceKind) : "không rõ"}</p>
          ${metadata ? `${metadata.traceId ? `<button class="button ghost" type="button" data-feedback-trace="${escape(row.feedbackId)}">Mở Nhật ký AI</button><p class="muted">Nguồn ghi nhật ký: chưa xác minh (origin: unverified).</p>` : ""}` : `<p>${row.correlationStatus === "verified_server" ? "Biên nhận đã hết hạn hoặc không còn." : "Chưa có biên nhận máy chủ; không suy ra model hay phiên bản."}</p>`}
          <details class="technical-details"><summary>Chi tiết kỹ thuật</summary><p>Mã phản hồi: <code>${escape(row.feedbackId)}</code> · lần sửa (revision) ${row.revision}</p>${metadata ? `<p>Biên nhận máy chủ đã xác minh:</p><pre>${escape(JSON.stringify(metadata, null, 2))}</pre>` : ""}</details>
          <label for="feedback-next-${escape(row.feedbackId)}">Xử lý</label><select class="input" id="feedback-next-${escape(row.feedbackId)}">${statuses.map(value => `<option value="${value}" ${value === row.status ? "selected" : ""}>${statusLabels[value]}</option>`).join("")}</select><button type="button" class="button ghost" data-feedback-review="${escape(row.feedbackId)}" ${busy ? "disabled" : ""}>Lưu trạng thái</button>
          <p class="muted">Người phụ trách, mức độ và ghi chú nội bộ: chưa áp dụng — cần backend (bước A6).</p>
        </article>`;
      }).join("") : `<p class="muted">${active.loaded ? "Không có phản hồi khớp bộ lọc." : "Chưa tải dữ liệu."}</p>`}`;
  }
  async function load() {
    if (!active || active.busy) return;
    const snapshot = scope(), version = ++epoch;
    if (invalidated || !snapshot.account || !snapshot.target) { active.status = "Máy chủ hoặc phiên đăng nhập chưa sẵn sàng"; render(); return; }
    active.busy = true; active.status = "Đang tải…"; render();
    try {
      if (!await window.NilazaRequireCapability?.("safety.review") || !current(snapshot, version)) { if (active && version === epoch) { active.busy = false; render(); } return; }
      const data = await window.NilazaAdminRpc("get_ai_feedback_inbox", { limit_count: 100, status_filter: active.filter === "all" ? null : active.filter, feature_filter: active.feature === "all" ? null : active.feature }, "safety.review");
      if (!current(snapshot, version)) return;
      active.rows = cleanRows(data); active.loaded = true; active.status = `${active.rows.length} phản hồi`;
    } catch { if (current(snapshot, version)) { active.rows = []; active.status = "Không tải được; thử lại."; } }
    finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  async function review(feedbackId) {
    if (!active || active.busy) return;
    const row = active.rows.find(item => item.feedbackId === feedbackId), next = active.container.querySelector(`#feedback-next-${feedbackId}`)?.value;
    if (!row || !statuses.includes(next)) return;
    const snapshot = scope(), version = ++epoch;
    active.busy = true; active.status = "Đang lưu…"; render();
    try {
      if (!await window.NilazaRequireCapability?.("safety.review") || !current(snapshot, version)) return;
      const result = await window.NilazaAdminRpc("review_ai_feedback", { feedback_id_input: feedbackId, expected_revision: row.revision, next_status: next }, "safety.review");
      if (!current(snapshot, version)) return;
      if (result?.feedbackId !== feedbackId || result.status !== next || result.revision !== row.revision + 1) throw Error("invalid_acknowledgement");
      Object.assign(row, result); active.status = "Đã lưu trạng thái";
    } catch { if (current(snapshot, version)) active.status = "Chưa lưu; dữ liệu có thể đã đổi. Tải lại trước khi thử."; }
    finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  window.NilazaFeedbackInbox = {
    clear,
    mount(container, onTrace) {
      const now = scope();
      if (!active || active.container !== container || active.account !== now.account || active.hash !== now.hash) {
        clear(); active = { container, account: now.account, hash: now.hash, rows: [], busy: false, loaded: false, filter: "open", feature: "all", status: "Chưa tải", onTrace };
        container.onclick = event => {
          if (!active || !permitted() || invalidated) return;
          if (event.target.closest("#feedback-load")) { void load(); return; }
          const reviewButton = event.target.closest("[data-feedback-review]"); if (reviewButton) { void review(reviewButton.dataset.feedbackReview); return; }
          const traceButton = event.target.closest("[data-feedback-trace]");
          const row = traceButton && active.rows.find(item => item.feedbackId === traceButton.dataset.feedbackTrace);
          const metadata = row && safeMetadata(row);
          if (metadata?.traceId) active.onTrace?.(metadata.traceId, metadata.feature);
        };
        container.onchange = event => {
          if (!active || !["feedback-status", "feedback-feature"].includes(event.target.id)) return;
          epoch++; active.rows = []; active.loaded = false; active.busy = false;
          if (event.target.id === "feedback-status") active.filter = event.target.value; else active.feature = event.target.value;
          render();
        };
      }
      render();
    }
  };
  window.addEventListener("hashchange", () => { if (active && active.hash !== location.hash) clear(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) clear(); });
})();
