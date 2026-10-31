(function () {
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const uuid = value => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
  const id = value => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:@-]{0,127}$/.test(value);
  const statuses = ["open", "investigating", "resolved", "dismissed"];
  const categories = { too_generic: "Quá chung chung / Too generic", incorrect_facts: "Sai dữ kiện / Incorrect facts", unclear: "Khó hiểu / Unclear", inappropriate: "Không phù hợp / Inappropriate", language: "Ngôn ngữ / Language", technical: "Kỹ thuật / Technical" };
  const initialTransport = { target: window.NilazaAdminTransportTarget || "", url: window.ENV?.SUPABASE_URL || "", key: window.ENV?.SUPABASE_ANON_KEY || "" };
  let invalidated = false, active = null, epoch = 0;
  function scope() {
    if ((window.ENV?.SUPABASE_URL || "") !== initialTransport.url || (window.ENV?.SUPABASE_ANON_KEY || "") !== initialTransport.key) invalidated = true;
    return { account: window.NilazaAdminSession?.userId || "", target: initialTransport.target, hash: location.hash };
  }
  function permitted() { return window.NilazaAdminSession?.capabilities?.includes("safety.review") === true; }
  function clear() {
    epoch++;
    if (active) active.container.innerHTML = '<p role="status">Phiên đã thay đổi. Mở lại mục Phản hồi để tiếp tục. / Session changed. Reopen Feedback to continue.</p>';
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
      container.innerHTML = `<div class="warning-card" role="status">${invalidated ? "Backend đã thay đổi. Tải lại trang. / Backend changed. Reload this page." : "Cần quyền xử lý phản hồi. / Feedback requires safety.review access."}</div>`;
      return;
    }
    container.innerHTML = `<div class="detail-heading"><div><p class="eyebrow">Feedback Inbox</p><h2 id="feedback-inbox-title">Phản hồi nội dung AI / AI content feedback</h2></div><span class="pill" role="status" aria-live="polite">${escape(status)}</span></div>
      <p>Chỉ nhóm vấn đề và mã kỹ thuật được gửi. Không có câu hỏi, bài AI, ghi chú hoặc dữ liệu sinh. / Categories and technical IDs only; no question, answer, notes or birth data.</p>
      <p>Biên nhận server xác nhận metadata bên dưới. Nội dung trace cũ vẫn có nguồn ghi chưa xác minh; không dùng nó để khẳng định model đã chạy. / The receipt verifies its metadata; legacy trace origin remains unverified.</p>
      <div class="param-row"><label for="feedback-status">Trạng thái / Status</label><select class="input" id="feedback-status"><option value="all">All</option>${statuses.map(value => `<option value="${value}" ${active.filter === value ? "selected" : ""}>${value}</option>`).join("")}</select>
      <label for="feedback-feature">Feature</label><select class="input" id="feedback-feature"><option value="all">All</option>${["tarot_reading", "astrology_insight", "persona_chat", "ai_council"].map(value => `<option ${active.feature === value ? "selected" : ""}>${value}</option>`).join("")}</select><button type="button" id="feedback-load" class="button primary" ${busy ? "disabled" : ""}>${busy ? "Đang tải / Loading…" : "Tải phản hồi / Load feedback"}</button></div>
      ${rows.length ? rows.map(row => {
        const metadata = safeMetadata(row);
        const submitted = row.submitted;
        return `<article class="code-card"><h3>${escape(categories[submitted.category])}</h3><p>${escape(submitted.feature)} · ${escape(submitted.language)} · ${escape(row.receivedAt)} · ${escape(row.status)}</p>
          <p>Feedback ID: <code>${escape(row.feedbackId)}</code> · revision ${row.revision}</p><p>Phần được báo / Reported section: ${id(submitted.sectionId) ? escape(submitted.sectionId) : "Whole answer"}</p>
          <p>Nguồn do app gửi, chưa xác minh / Client-claimed source: ${id(submitted.sourceKind) ? escape(submitted.sourceKind) : "unknown"}</p>
          ${metadata ? `<details><summary>Biên nhận server đã xác minh / Verified server receipt</summary><pre>${escape(JSON.stringify(metadata, null, 2))}</pre></details>${metadata.traceId ? `<button class="button ghost" type="button" data-feedback-trace="${escape(row.feedbackId)}">Tìm trace liên quan / Find related trace</button><p>Trace writer origin: unverified.</p>` : ""}` : `<p>${row.correlationStatus === "verified_server" ? "Biên nhận đã hết hạn hoặc không còn khả dụng. / Receipt expired or unavailable." : "Chưa có biên nhận server; không suy ra model hoặc phiên bản. / No server receipt; model/version cannot be inferred."}</p>`}
          <label for="feedback-next-${escape(row.feedbackId)}">Xử lý / Review</label><select class="input" id="feedback-next-${escape(row.feedbackId)}">${statuses.map(value => `<option ${value === row.status ? "selected" : ""}>${value}</option>`).join("")}</select><button type="button" class="button ghost" data-feedback-review="${escape(row.feedbackId)}" ${busy ? "disabled" : ""}>Lưu trạng thái / Save status</button>
        </article>`;
      }).join("") : `<p class="muted">${active.loaded ? "Không có phản hồi khớp bộ lọc. / No feedback matches these filters." : "Chưa tải dữ liệu. / No data loaded."}</p>`}`;
  }
  async function load() {
    if (!active || active.busy) return;
    const snapshot = scope(), version = ++epoch;
    if (invalidated || !snapshot.account || !snapshot.target) { active.status = "Backend/phiên chưa sẵn sàng / Backend or session unavailable"; render(); return; }
    active.busy = true; active.status = "Đang tải / Loading…"; render();
    try {
      if (!await window.NilazaRequireCapability?.("safety.review") || !current(snapshot, version)) { if (active && version === epoch) { active.busy = false; render(); } return; }
      const data = await window.NilazaAdminRpc("get_ai_feedback_inbox", { limit_count: 100, status_filter: active.filter === "all" ? null : active.filter, feature_filter: active.feature === "all" ? null : active.feature }, "safety.review");
      if (!current(snapshot, version)) return;
      active.rows = cleanRows(data); active.loaded = true; active.status = `${active.rows.length} phản hồi / feedback item(s)`;
    } catch { if (current(snapshot, version)) { active.rows = []; active.status = "Không tải được; thử lại. / Could not load; retry."; } }
    finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  async function review(feedbackId) {
    if (!active || active.busy) return;
    const row = active.rows.find(item => item.feedbackId === feedbackId), next = active.container.querySelector(`#feedback-next-${feedbackId}`)?.value;
    if (!row || !statuses.includes(next)) return;
    const snapshot = scope(), version = ++epoch;
    active.busy = true; active.status = "Đang lưu / Saving…"; render();
    try {
      if (!await window.NilazaRequireCapability?.("safety.review") || !current(snapshot, version)) return;
      const result = await window.NilazaAdminRpc("review_ai_feedback", { feedback_id_input: feedbackId, expected_revision: row.revision, next_status: next }, "safety.review");
      if (!current(snapshot, version)) return;
      if (result?.feedbackId !== feedbackId || result.status !== next || result.revision !== row.revision + 1) throw Error("invalid_acknowledgement");
      Object.assign(row, result); active.status = "Đã lưu trạng thái / Status saved";
    } catch { if (current(snapshot, version)) active.status = "Chưa lưu; dữ liệu có thể đã đổi. Tải lại trước khi thử. / Not saved; reload before retrying."; }
    finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  window.NilazaFeedbackInbox = {
    clear,
    mount(container, onTrace) {
      const now = scope();
      if (!active || active.container !== container || active.account !== now.account || active.hash !== now.hash) {
        clear(); active = { container, account: now.account, hash: now.hash, rows: [], busy: false, loaded: false, filter: "open", feature: "all", status: "Chưa tải / Not loaded", onTrace };
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
