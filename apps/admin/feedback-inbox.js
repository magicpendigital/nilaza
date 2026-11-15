(function () {
  // Phản hồi người dùng (A2 read part; A6 triage, spec 04/11 §3.13 and row D9). Feedback holds only a category and
  // technical IDs — never the person's words, the AI answer, notes or birth data.
  // A6 (migration 20261113110100_ai_feedback_triage.sql): person in charge (safety.review staff), severity
  // (An toàn / Chất lượng / Lỗi kỹ thuật) and an internal note are saved with review_ai_feedback_v2; "Đã xong" closes
  // the item; "Thêm vào bộ câu mẫu" copies only text the editor writes or pastes here, after stripping emails, phone
  // numbers and likely names, and only after the editor confirms. Without the migration the page keeps the v1 status
  // change and says which migration is missing.
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const uuid = value => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
  const id = value => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:@-]{0,127}$/.test(value);
  const statuses = ["open", "investigating", "resolved", "dismissed"];
  const categories = { too_generic: "Quá chung chung", incorrect_facts: "Sai dữ kiện", unclear: "Khó hiểu", inappropriate: "Không phù hợp", language: "Ngôn ngữ", technical: "Lỗi kỹ thuật" };
  // Vietnamese labels (A2); the stored values stay the server contract.
  const statusLabels = { open: "Mới", investigating: "Đang xem", resolved: "Đã xong", dismissed: "Bỏ qua" };
  const featureLabels = { tarot_reading: "Giải bài Tarot", astrology_insight: "Đọc sâu Chiêm tinh", persona_chat: "Trò chuyện với người dẫn", ai_council: "Hội đồng", daily_insight: "Thông điệp hằng ngày" };
  const severityLabels = { safety: "An toàn", quality: "Chất lượng", technical: "Lỗi kỹ thuật" };
  const roleLabels = { owner: "Owner", admin: "Quản trị", safety_reviewer: "Duyệt an toàn" };
  const TRIAGE_MIGRATION_NOTE = "Người phụ trách, mức độ và ghi chú nội bộ cần Owner áp migration 20261113110100_ai_feedback_triage.sql. Hiện chỉ đổi được trạng thái.";
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
      && row.revision > 0 && Object.hasOwn(featureLabels, row.submitted?.feature) && Object.hasOwn(categories, row.submitted?.category));
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
  // Server rows from 20261113110100 carry a triage object; older servers do not.
  const hasTriage = row => Boolean(row?.triage && typeof row.triage === "object");
  // Unsaved triage edits per feedback item, so a message or reload does not throw away what the reviewer chose.
  function edited(row, field, fallback) {
    const edits = active.edits[row.feedbackId];
    return edits && Object.hasOwn(edits, field) ? edits[field] : fallback;
  }
  function triageFields(row) {
    const saved = row.triage || {}, key = escape(row.feedbackId), busy = active.busy;
    const triage = { assigneeId: edited(row, "assignee", saved.assigneeId || ""), severity: edited(row, "severity", saved.severity || ""), internalNote: edited(row, "note", saved.internalNote || "") };
    const assignees = active.assignees || [];
    const assigneeKnown = !triage.assigneeId || assignees.some(item => item.userId === triage.assigneeId);
    return `<div class="config-grid feedback-triage">
      <div class="config-field"><label for="feedback-assignee-${key}">Người phụ trách</label><select class="input" id="feedback-assignee-${key}" data-triage-id="${key}" data-triage-field="assignee">
        <option value="">— Chưa giao —</option>${assignees.map(item => `<option value="${escape(item.userId)}" ${item.userId === triage.assigneeId ? "selected" : ""}>${escape(item.isMe ? "Tôi" : `${(item.roles || []).map(role => roleLabels[role] || role).join(", ")} · …${String(item.userId).slice(-6)}`)}</option>`).join("")}
        ${assigneeKnown ? "" : `<option value="${escape(triage.assigneeId)}" selected>Tài khoản không còn quyền · …${escape(String(triage.assigneeId).slice(-6))}</option>`}</select></div>
      <div class="config-field"><label for="feedback-severity-${key}">Mức độ</label><select class="input" id="feedback-severity-${key}" data-triage-id="${key}" data-triage-field="severity"><option value="">— Chưa phân loại —</option>${Object.entries(severityLabels).map(([value, label]) => `<option value="${value}" ${triage.severity === value ? "selected" : ""}>${label}</option>`).join("")}</select></div>
    </div>
    <div class="config-field"><label for="feedback-note-${key}">Ghi chú nội bộ (không dán dữ liệu cá nhân; tối đa 1000 ký tự)</label><textarea class="input" rows="2" maxlength="1000" id="feedback-note-${key}" data-triage-id="${key}" data-triage-field="note">${escape(triage.internalNote || "")}</textarea></div>
    <div class="param-row"><button type="button" class="button ghost" data-feedback-save="${key}" ${busy ? "disabled" : ""}>Lưu xử lý</button>
      <button type="button" class="button primary" data-feedback-done="${key}" ${busy || row.status === "resolved" ? "disabled" : ""}>Đã xong</button></div>`;
  }
  function addCaseForm(row) {
    const form = active.addCase;
    if (!form || form.feedbackId !== row.feedbackId) return "";
    const key = escape(row.feedbackId);
    const blocked = !form.sanitized || window.NilazaAiEvals?.hasPersonalData(form.sanitized);
    const removed = { email: "email", phone: "số điện thoại", name: "tên riêng" };
    return `<section class="code-card feedback-add-case" aria-labelledby="feedback-add-title-${key}"><h4 id="feedback-add-title-${key}">Thêm vào bộ câu mẫu</h4>
      <p class="muted">Phản hồi không chứa lời người dùng. Viết lại một câu hỏi mẫu tương tự (hoặc dán câu đã có), bấm Làm sạch, đọc lại rồi xác nhận. Chỉ phần đã làm sạch được chép sang bộ câu.</p>
      <div class="config-field"><label for="feedback-case-text-${key}">Câu hỏi mẫu</label><textarea class="input" rows="3" maxlength="1000" id="feedback-case-text-${key}" data-feedback-case-text>${escape(form.text)}</textarea></div>
      <div class="config-field"><label for="feedback-case-locale-${key}">Ngôn ngữ</label><select class="input" id="feedback-case-locale-${key}" data-feedback-case-locale><option value="vi" ${form.locale === "vi" ? "selected" : ""}>Tiếng Việt</option><option value="en" ${form.locale === "en" ? "selected" : ""}>Tiếng Anh</option></select></div>
      <button type="button" class="button ghost" data-feedback-sanitize>Làm sạch</button>
      ${form.sanitized !== null ? `<p>Sẽ chép: <q data-feedback-sanitized>${escape(form.sanitized)}</q>${form.changes.length ? ` <small>(đã bỏ: ${escape(form.changes.map(change => removed[change] || change).join(", "))})</small>` : ""}</p>
        <label class="radio-row"><input type="checkbox" data-feedback-confirm ${form.confirmed ? "checked" : ""}> Tôi đã đọc lại: không còn tên thật, email, số điện thoại, Nhật ký hay ngày sinh.</label>` : ""}
      <div class="param-row"><button type="button" class="button primary" data-feedback-add-confirm ${form.confirmed && !blocked ? "" : "disabled"}>Thêm vào bộ câu mẫu</button>
        <button type="button" class="button ghost" data-feedback-add-cancel>Hủy</button></div>
    </section>`;
  }
  function render() {
    if (!active) return;
    const { container, rows, status, busy } = active;
    if (invalidated || !permitted()) {
      container.innerHTML = `<div class="warning-card" role="status">${invalidated ? "Máy chủ đã thay đổi. Tải lại trang." : "Cần quyền xử lý phản hồi (safety.review)."}</div>`;
      return;
    }
    const focusId = container.contains(document.activeElement) ? document.activeElement.id : "";
    const triageOk = rows.some(hasTriage) && active.assigneesStatus === "ok";
    container.innerHTML = `<div class="detail-heading"><div><p class="eyebrow">Vận hành</p><h2 id="feedback-inbox-title">Phản hồi người dùng về câu trả lời AI</h2></div><span class="pill" role="status" aria-live="polite">${escape(status)}</span></div>
      <p>Chỉ có nhóm vấn đề và mã kỹ thuật. Không có câu hỏi, câu trả lời AI, ghi chú hay dữ liệu ngày sinh của người dùng.</p>
      <p class="muted">Biên nhận máy chủ xác nhận các mã bên dưới. Nhật ký AI cũ vẫn có nguồn ghi chưa xác minh; đừng dùng nó để khẳng định model đã chạy.</p>
      <div class="param-row"><label for="feedback-status">Trạng thái</label><select class="input" id="feedback-status"><option value="all">Tất cả</option>${statuses.map(value => `<option value="${value}" ${active.filter === value ? "selected" : ""}>${statusLabels[value]}</option>`).join("")}</select>
      <label for="feedback-feature">Tính năng</label><select class="input" id="feedback-feature"><option value="all">Tất cả</option>${Object.keys(featureLabels).map(value => `<option value="${value}" ${active.feature === value ? "selected" : ""}>${featureLabels[value]}</option>`).join("")}</select><button type="button" id="feedback-load" class="button primary" ${busy ? "disabled" : ""}>${busy ? "Đang tải…" : "Tải phản hồi"}</button></div>
      ${active.loaded && rows.length && !triageOk ? `<p class="warning-card" role="note">${escape(TRIAGE_MIGRATION_NOTE)}</p>` : ""}
      ${rows.length ? rows.map(row => {
        const metadata = safeMetadata(row);
        const submitted = row.submitted;
        const triage = row.triage || {};
        return `<article class="code-card"><h3>${escape(categories[submitted.category])}${triage.severity ? ` <span class="pill">${escape(severityLabels[triage.severity] || "")}</span>` : ""}</h3><p>${escape(featureLabels[submitted.feature] || submitted.feature)} · ${escape(submitted.language)} · ${escape(row.receivedAt)} · ${escape(statusLabels[row.status])}${triage.assigneeIsMe ? " · Tôi phụ trách" : ""}</p>
          <p>Phần được báo: ${id(submitted.sectionId) ? escape(submitted.sectionId) : "Cả câu trả lời"} · Nguồn do app gửi (chưa xác minh): ${id(submitted.sourceKind) ? escape(submitted.sourceKind) : "không rõ"}</p>
          ${metadata ? `${metadata.traceId ? `<button class="button ghost" type="button" data-feedback-trace="${escape(row.feedbackId)}">Mở Nhật ký AI</button><p class="muted">Nguồn ghi nhật ký: chưa xác minh (origin: unverified).</p>` : ""}` : `<p>${row.correlationStatus === "verified_server" ? "Biên nhận đã hết hạn hoặc không còn." : "Chưa có biên nhận máy chủ; không suy ra model hay phiên bản."}</p>`}
          <details class="technical-details"><summary>Chi tiết kỹ thuật</summary><p>Mã phản hồi: <code>${escape(row.feedbackId)}</code> · lần sửa (revision) ${row.revision}</p>${metadata ? `<p>Biên nhận máy chủ đã xác minh:</p><pre>${escape(JSON.stringify(metadata, null, 2))}</pre>` : ""}</details>
          <label for="feedback-next-${escape(row.feedbackId)}">Xử lý</label><select class="input" id="feedback-next-${escape(row.feedbackId)}" data-triage-id="${escape(row.feedbackId)}" data-triage-field="next">${statuses.map(value => `<option value="${value}" ${value === edited(row, "next", row.status) ? "selected" : ""}>${statusLabels[value]}</option>`).join("")}</select>
          ${triageOk && hasTriage(row) ? triageFields(row) : `<button type="button" class="button ghost" data-feedback-review="${escape(row.feedbackId)}" ${busy ? "disabled" : ""}>Lưu trạng thái</button>`}
          ${window.NilazaAiEvals && typeof window.NilazaOpenEvals === "function" ? `<p><button type="button" class="button ghost" data-feedback-add-case="${escape(row.feedbackId)}">Thêm vào bộ câu mẫu</button></p>` : ""}
          ${addCaseForm(row)}
        </article>`;
      }).join("") : `<p class="muted">${active.loaded ? "Không có phản hồi khớp bộ lọc." : "Chưa tải dữ liệu."}</p>`}`;
    if (focusId) document.getElementById(focusId)?.focus();
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
      if (active.rows.some(hasTriage) && active.assigneesStatus !== "ok") {
        try {
          const people = await window.NilazaAdminRpc("list_ai_feedback_assignees", {}, "safety.review");
          if (!current(snapshot, version)) return;
          active.assignees = Array.isArray(people) ? people.filter(item => uuid(item?.userId)) : [];
          active.assigneesStatus = "ok";
        } catch { if (current(snapshot, version)) active.assigneesStatus = "missing"; }
      }
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
  async function triage(feedbackId, done) {
    if (!active || active.busy) return;
    const row = active.rows.find(item => item.feedbackId === feedbackId);
    const field = name => active.container.querySelector(`#feedback-${name}-${feedbackId}`);
    if (!row) return;
    const next = done ? "resolved" : field("next")?.value;
    const severity = field("severity")?.value || null, assignee = field("assignee")?.value || null;
    const note = String(field("note")?.value ?? "").trim();
    if (!statuses.includes(next) || (severity && !Object.hasOwn(severityLabels, severity)) || (assignee && !uuid(assignee))) return;
    if (note.length > 1000) { active.status = "Ghi chú nội bộ tối đa 1000 ký tự."; render(); return; }
    if (window.NilazaAiEvals?.hasPersonalData(note)) { active.status = "Ghi chú có email hoặc số điện thoại — xóa trước khi lưu."; render(); return; }
    const snapshot = scope(), version = ++epoch;
    active.busy = true; active.status = "Đang lưu…"; render();
    try {
      if (!await window.NilazaRequireCapability?.("safety.review") || !current(snapshot, version)) return;
      const result = await window.NilazaAdminRpc("review_ai_feedback_v2", { feedback_id_input: feedbackId, expected_revision: row.revision, next_status: next,
        severity_input: severity, assignee_id_input: assignee, internal_note_input: note || null }, "safety.review");
      if (!current(snapshot, version)) return;
      if (result?.feedbackId !== feedbackId || result.status !== next || result.revision !== row.revision + 1 || !hasTriage(result)) throw Error("invalid_acknowledgement");
      Object.assign(row, result); delete active.edits[feedbackId]; active.status = done ? "Đã đánh dấu Đã xong" : "Đã lưu xử lý";
    } catch (error) {
      if (!current(snapshot, version)) return;
      active.status = error?.missingFunction ? TRIAGE_MIGRATION_NOTE : error?.code === "NZE05" ? "Máy chủ từ chối ghi chú có dữ liệu cá nhân." : "Chưa lưu; dữ liệu có thể đã đổi. Tải lại trước khi thử.";
    } finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  function confirmAddCase() {
    const form = active?.addCase;
    const row = form && active.rows.find(item => item.feedbackId === form.feedbackId);
    if (!row || !form.confirmed || !form.sanitized || !window.NilazaAiEvals) return;
    const queued = window.NilazaAiEvals.queueCase({ feature: row.submitted.feature, locale: form.locale, text: form.sanitized,
      label: `Từ phản hồi: ${categories[row.submitted.category]}` });
    if (!queued) { active.status = "Câu mẫu vẫn còn email hoặc số điện thoại; sửa rồi làm sạch lại."; render(); return; }
    active.addCase = null;
    window.NilazaOpenEvals?.({ feature: row.submitted.feature });
  }
  window.NilazaFeedbackInbox = {
    clear,
    mount(container, onTrace) {
      const now = scope();
      if (!active || active.container !== container || active.account !== now.account || active.hash !== now.hash) {
        clear(); active = { container, account: now.account, hash: now.hash, rows: [], busy: false, loaded: false, filter: "open", feature: "all", status: "Chưa tải", onTrace,
          assignees: [], assigneesStatus: "idle", addCase: null, edits: {} };
        container.onclick = event => {
          if (!active || !permitted() || invalidated) return;
          if (event.target.closest("#feedback-load")) { void load(); return; }
          const reviewButton = event.target.closest("[data-feedback-review]"); if (reviewButton) { void review(reviewButton.dataset.feedbackReview); return; }
          const save = event.target.closest("[data-feedback-save]"); if (save) { void triage(save.dataset.feedbackSave, false); return; }
          const done = event.target.closest("[data-feedback-done]"); if (done) { void triage(done.dataset.feedbackDone, true); return; }
          const add = event.target.closest("[data-feedback-add-case]");
          if (add) {
            const row = active.rows.find(item => item.feedbackId === add.dataset.feedbackAddCase);
            active.addCase = row ? { feedbackId: row.feedbackId, text: "", sanitized: null, changes: [], confirmed: false, locale: row.submitted.language === "en" ? "en" : "vi" } : null;
            render(); return;
          }
          if (event.target.closest("[data-feedback-sanitize]") && active.addCase) {
            const result = window.NilazaAiEvals?.sanitize(active.addCase.text) || { text: "", changes: [] };
            active.addCase.sanitized = result.text; active.addCase.changes = result.changes; active.addCase.confirmed = false;
            render(); return;
          }
          if (event.target.closest("[data-feedback-add-confirm]")) { confirmAddCase(); return; }
          if (event.target.closest("[data-feedback-add-cancel]")) { active.addCase = null; render(); return; }
          const traceButton = event.target.closest("[data-feedback-trace]");
          const row = traceButton && active.rows.find(item => item.feedbackId === traceButton.dataset.feedbackTrace);
          const metadata = row && safeMetadata(row);
          if (metadata?.traceId) active.onTrace?.(metadata.traceId, metadata.feature);
        };
        const remember = target => {
          const key = target.dataset?.triageId, field = target.dataset?.triageField;
          if (!active || !key || !field || !active.rows.some(item => item.feedbackId === key)) return false;
          (active.edits[key] ||= {})[field] = target.value;
          return true;
        };
        container.oninput = event => {
          if (remember(event.target)) return;
          if (!active?.addCase) return;
          if (event.target.matches?.("[data-feedback-case-text]")) {
            // Any edit invalidates the cleaned copy: clean and confirm again.
            active.addCase.text = event.target.value;
            if (active.addCase.sanitized !== null) { active.addCase.sanitized = null; active.addCase.confirmed = false; render(); }
          }
        };
        container.onchange = event => {
          if (!active) return;
          if (remember(event.target)) return;
          if (event.target.matches?.("[data-feedback-confirm]") && active.addCase) {
            active.addCase.confirmed = event.target.checked;
            const button = container.querySelector("[data-feedback-add-confirm]");
            if (button) button.disabled = !active.addCase.confirmed || !active.addCase.sanitized || window.NilazaAiEvals?.hasPersonalData(active.addCase.sanitized) === true;
            return;
          }
          if (event.target.matches?.("[data-feedback-case-locale]") && active.addCase) { active.addCase.locale = event.target.value === "en" ? "en" : "vi"; return; }
          if (!["feedback-status", "feedback-feature"].includes(event.target.id)) return;
          epoch++; active.rows = []; active.loaded = false; active.busy = false; active.addCase = null; active.edits = {};
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
