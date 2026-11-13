(function () {
  // Tính năng AI (A2 + A4 Admin part 1; spec 04/11 §3.6 and §3.7 part 1). One card per AI feature:
  // - emergency switch with a reason: get_ai_feature_switches / set_ai_feature_switch (existing, audited);
  // - versioned settings: get_ai_feature_configs / save_ai_feature_config_draft / publish_ai_feature_config
  //   (migration 20261113090100). "Lưu nháp" stores a server draft people do not see yet; "Xem lại & phát hành"
  //   shows active vs draft, the environment and needs a note of at least 10 characters.
  // Reading needs ai.read. Saving a draft needs ai.manage, or ai.read + content.draft (editor; Owner decision 13/11,
  // migration 20261113090200); publishing and switches need ai.manage. NilazaAdminRpc and the database check again.
  // With no active version, Edge Functions keep the code defaults shown here.
  // A6 release gate (migration 20261113110000, release-gate.js): the review dialog shows the eval gate of the draft;
  // publishing needs a passed safety layer; when only the quality layer is missing, ai.manage may bypass it with a reason
  // and a note (publish_ai_feature_config_bypass) and the version shows "Chưa chấm" until it is scored.
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const FEATURES = Object.freeze([
    { id: "persona_chat", label: "Trò chuyện với người dẫn", config: true, quota: 5, quotaNote: "đếm chung lượt với Oracle; mỗi bên chặn theo hạn mức của mình", wait: 40 },
    { id: "oracle_router", label: "Oracle", config: true, quota: 5, quotaNote: "đếm chung lượt với Trò chuyện; mỗi bên chặn theo hạn mức của mình", wait: 40, switchNote: "Oracle cũng tạm nghỉ khi công tắc Trò chuyện với người dẫn tắt." },
    { id: "tarot_reading", label: "Giải bài Tarot", config: true, quota: 1, wait: 40 },
    { id: "daily_insight", label: "Thông điệp hằng ngày", config: true, quota: 3, wait: 40 },
    { id: "astrology_insight", label: "Đọc sâu Chiêm tinh", config: true, quota: 1, wait: 60 },
    { id: "ai_council", label: "Hội đồng", config: true, quota: 1, followUps: 4, wait: 40 },
    { id: "astrology_report", label: "Astrology report — đang gỡ, chỉ theo dõi", config: false }
  ]);
  const CONFIG_IDS = FEATURES.filter(item => item.config).map(item => item.id);
  const MIGRATION_NOTE = "Máy chủ chưa có bảng cấu hình — cần Owner áp migration 20261113090100. Công tắc bật/tắt vẫn dùng được.";
  const COPY_KINDS = [["quotaExhausted", "Câu khi hết lượt"], ["paused", "Câu khi tạm nghỉ"]];
  const initialTransport = { target: window.NilazaAdminTransportTarget || "", url: window.ENV?.SUPABASE_URL || "", key: window.ENV?.SUPABASE_ANON_KEY || "" };
  let invalidated = false, active = null, epoch = 0;
  // Unsaved form edits survive leaving the page for the same account (the shell keeps counting them);
  // a different account or backend starts empty.
  let forms = { owner: "", values: {}, dirty: new Set() };

  const can = capability => window.NilazaAdminSession?.capabilities?.includes(capability) === true;
  // Same rule as save_ai_feature_config_draft (NilazaAdminRpc allowlist and migration 20261113090200).
  const DRAFT_RULE = "ai.manage|ai.read+content.draft";
  const canDraft = () => can("ai.manage") || (can("ai.read") && can("content.draft"));
  async function requireDraft() {
    const require = window.NilazaRequireCapability;
    if (!require) return false;
    if (await require("ai.manage")) return true;
    return await require("ai.read") && await require("content.draft");
  }
  const feature = id => FEATURES.find(item => item.id === id);
  function scope() {
    if ((window.ENV?.SUPABASE_URL || "") !== initialTransport.url || (window.ENV?.SUPABASE_ANON_KEY || "") !== initialTransport.key) invalidated = true;
    return { account: window.NilazaAdminSession?.userId || "", target: initialTransport.target };
  }
  function current(snapshot, version) {
    const now = scope();
    return Boolean(active && version === epoch && !invalidated && can("ai.read") && now.account === snapshot.account
      && now.target === snapshot.target && active.container.isConnected);
  }
  function reportUnsaved() { window.NilazaUnsaved?.set("ai-features", forms.dirty.size); }
  function resetForms(owner) { forms = { owner, values: {}, dirty: new Set() }; reportUnsaved(); }
  function environmentLabel() { return window.NilazaDescribeEnvironment?.(window.ENV)?.label || "CHƯA RÕ MÔI TRƯỜNG"; }
  function rowsFor(id) {
    const rows = active?.configs || [];
    return { activeRow: rows.find(row => row.feature === id && row.status === "active") || null, draftRow: rows.find(row => row.feature === id && row.status === "draft") || null };
  }
  function cleanConfigs(value) {
    if (!Array.isArray(value)) throw Error("invalid_response");
    return value.filter(row => row && CONFIG_IDS.includes(row.feature) && ["draft", "active", "archived"].includes(row.status) && Number.isInteger(row.version));
  }
  function cleanSwitches(value) {
    if (!Array.isArray(value)) throw Error("invalid_response");
    return new Map(value.filter(row => feature(row?.feature) && typeof row.enabled === "boolean").map(row => [row.feature, row]));
  }
  function copyText(row, kind, lang) { const entry = row?.copy?.[kind]; return typeof entry?.[lang] === "string" ? entry[lang] : ""; }
  function formFrom(id) {
    if (forms.dirty.has(id) && forms.values[id]) return forms.values[id];
    const { activeRow, draftRow } = rowsFor(id), base = draftRow || activeRow;
    const values = {
      quotaDaily: Number.isInteger(base?.quotaDaily) ? String(base.quotaDaily) : "",
      followUps: Number.isInteger(base?.followUps) ? String(base.followUps) : "",
      deadlineSeconds: Number.isInteger(base?.deadlineMs) ? String(Math.round(base.deadlineMs / 1000)) : "",
      note: draftRow && typeof draftRow.note === "string" ? draftRow.note : ""
    };
    for (const [kind] of COPY_KINDS) for (const lang of ["vi", "en"]) values[`${kind}.${lang}`] = copyText(base, kind, lang);
    forms.values[id] = values;
    return values;
  }
  // Text shown for one setting of a row; null/absent means the code default.
  function describe(item, row, key) {
    if (key === "quotaDaily") return Number.isInteger(row?.quotaDaily) ? `${row.quotaDaily} lượt/ngày` : `Mặc định: ${item.quota} lượt/ngày${item.quotaNote ? ` (${item.quotaNote})` : ""}`;
    if (key === "followUps") return Number.isInteger(row?.followUps) ? `${row.followUps} câu hỏi tiếp` : `Mặc định: ${item.followUps} câu hỏi tiếp`;
    if (key === "deadlineMs") return Number.isInteger(row?.deadlineMs) ? `Tổng tối đa ${Math.round(row.deadlineMs / 1000)} giây` : `Mặc định: mỗi model chờ tối đa ${item.wait} giây`;
    const [kind, lang] = key.split(".");
    return copyText(row, kind, lang) || "Mặc định: câu có sẵn trong app";
  }
  function settingKeys(item) {
    return ["quotaDaily", ...(item.id === "ai_council" ? ["followUps"] : []), "deadlineMs", ...COPY_KINDS.flatMap(([kind]) => [`${kind}.vi`, `${kind}.en`])];
  }
  const settingLabels = { quotaDaily: "Lượt mỗi người mỗi ngày", followUps: "Câu hỏi tiếp trong một Hội đồng", deadlineMs: "Thời gian chờ model", "quotaExhausted.vi": "Câu khi hết lượt (VI)", "quotaExhausted.en": "Câu khi hết lượt (EN)", "paused.vi": "Câu khi tạm nghỉ (VI)", "paused.en": "Câu khi tạm nghỉ (EN)" };

  function buildPayload(item, values, base) {
    const integer = (text, min, max, label) => {
      const clean = String(text ?? "").trim();
      if (!clean) return null;
      if (!/^\d+$/.test(clean) || Number(clean) < min || Number(clean) > max) throw Error(`${label}: nhập số nguyên từ ${min} đến ${max}, hoặc để trống để dùng mặc định.`);
      return Number(clean);
    };
    const payload = { quotaDaily: integer(values.quotaDaily, 1, 100, "Lượt mỗi ngày") };
    if (item.id === "ai_council") payload.followUps = integer(values.followUps, 0, 10, "Câu hỏi tiếp");
    const seconds = integer(values.deadlineSeconds, 5, 140, "Thời gian chờ");
    payload.deadlineMs = seconds === null ? null : seconds * 1000;
    const copy = {};
    for (const [kind, label] of COPY_KINDS) {
      const vi = String(values[`${kind}.vi`] ?? "").trim(), en = String(values[`${kind}.en`] ?? "").trim();
      if (!vi && !en) continue;
      if (!vi || !en) throw Error(`${label}: cần cả tiếng Việt và tiếng Anh, hoặc để trống cả hai.`);
      if (vi.length > 300 || en.length > 300) throw Error(`${label}: tối đa 300 ký tự mỗi ngôn ngữ.`);
      copy[kind] = { vi, en };
    }
    payload.copy = copy;
    const note = String(values.note ?? "").trim();
    if (note.length > 500) throw Error("Ghi chú nháp tối đa 500 ký tự.");
    payload.note = note || null;
    // Not editable here yet (quota groups stay in code; cost cap is A7): keep what the base version had.
    if (typeof base?.quotaGroup === "string") payload.quotaGroup = base.quotaGroup;
    if (Number.isInteger(base?.costCapMicro)) payload.costCapMicro = base.costCapMicro;
    return payload;
  }
  const gateApi = () => window.NilazaReleaseGate;
  function gateDecision(dialog) {
    return gateApi()?.decide(dialog?.gate, dialog?.bypass) ?? { allowed: true, mode: "ungated" };
  }
  function publishAllowed(dialog) {
    const length = String(dialog?.note ?? "").trim().length;
    return length >= 10 && length <= 500 && gateDecision(dialog).allowed;
  }
  function errorMessage(error, action) {
    const gateMessage = action === "publish" ? gateApi()?.errorMessage(error) : null;
    if (gateMessage) return gateMessage;
    if (error?.code === "42501") return action === "publish" ? "Tài khoản này không có quyền ai.manage." : "Tài khoản này chưa có quyền lưu nháp trên máy chủ (cần ai.manage, hoặc ai.read + content.draft; Owner cần áp migration 20261113090200).";
    if (error?.code === "22023") return action === "publish" ? "Máy chủ không nhận: bản nháp đã thay đổi hoặc ghi chú chưa hợp lệ. Tải lại rồi xem lại." : "Máy chủ không nhận giá trị này (ngoài giới hạn cho phép).";
    return action === "publish" ? "Chưa phát hành được. Tải lại rồi thử lại." : "Chưa lưu được nháp. Tải lại rồi thử lại.";
  }

  function renderSwitch(item, manage) {
    if (active.switchStatus === "loading" || active.switchStatus === "idle") return '<p class="muted">Đang tải công tắc…</p>';
    if (active.switchStatus === "error") return '<p class="muted">Không tải được công tắc. Bấm Tải lại.</p>';
    const row = active.switches.get(item.id);
    if (!row) return `<p class="muted">Chưa có công tắc trên máy chủ này; tính năng chạy theo mặc định.${item.id === "oracle_router" ? " Công tắc riêng cho Oracle cần migration 20261113090000." : ""}</p>`;
    const editing = active.editing === item.id;
    return `<p><strong>${row.enabled ? "Đang bật" : "Đang tắt"}</strong>${row.reason ? ` · ${escape(row.reason)}` : ""}${row.updatedAt ? ` · ${escape(row.updatedAt)}` : ""}</p>
      ${item.switchNote ? `<p class="muted">${escape(item.switchNote)}</p>` : ""}
      ${manage && !editing ? `<button type="button" class="button ${row.enabled ? "ghost" : "primary"}" data-ai-switch-edit="${item.id}" ${active.busy ? "disabled" : ""}>${row.enabled ? "Tắt tính năng này" : "Bật lại"}</button>` : ""}
      ${editing ? `<form class="ai-switch-form" data-ai-switch-form="${item.id}"><label for="ai-switch-reason-${item.id}">Lý do (bắt buộc, 3–200 ký tự)</label>
        <input class="input" id="ai-switch-reason-${item.id}" maxlength="200" minlength="3" required autocomplete="off">
        <button type="submit" class="button primary" ${active.busy ? "disabled" : ""}>${row.enabled ? "Xác nhận tắt" : "Xác nhận bật"}</button>
        <button type="button" class="button ghost" data-ai-switch-cancel>Hủy</button></form>` : ""}`;
  }
  function renderValues(item, activeRow, draftRow) {
    return `<table class="config-table"><caption class="visually-hidden">Giá trị đang chạy và bản nháp của ${escape(item.label)}</caption>
      <thead><tr><th scope="col">Thiết lập</th><th scope="col">Đang chạy</th><th scope="col">Bản nháp</th></tr></thead><tbody>
      ${settingKeys(item).map(key => `<tr><th scope="row">${settingLabels[key]}</th><td>${escape(describe(item, activeRow, key))}</td><td>${draftRow ? escape(describe(item, draftRow, key)) : "—"}</td></tr>`).join("")}
      <tr><th scope="row">Nhóm dùng chung lượt</th><td colspan="2">Chưa áp dụng — nhóm lượt vẫn đặt trong mã (Trò chuyện và Oracle dùng chung).</td></tr>
      <tr><th scope="row">Trần chi phí mỗi lượt</th><td colspan="2">Chưa áp dụng — cần backend (bước A7).</td></tr>
      </tbody></table>`;
  }
  function renderForm(item, draftRow, manage) {
    const values = formFrom(item.id), id = item.id, dirty = forms.dirty.has(id);
    const input = (key, label, attrs, hint) => `<div class="config-field"><label for="cfg-${id}-${key.replace(".", "-")}">${label}</label>
      <input class="input" id="cfg-${id}-${key.replace(".", "-")}" data-cfg-feature="${id}" data-cfg-field="${key}" value="${escape(values[key])}" ${attrs}>${hint ? `<small class="helper">${hint}</small>` : ""}</div>`;
    const area = (key, label) => `<div class="config-field"><label for="cfg-${id}-${key.replace(".", "-")}">${label}</label>
      <textarea class="input" rows="2" maxlength="300" id="cfg-${id}-${key.replace(".", "-")}" data-cfg-feature="${id}" data-cfg-field="${key}">${escape(values[key])}</textarea></div>`;
    return `<form class="config-form" data-cfg-form="${id}" novalidate>
      <div class="config-grid">
        ${input("quotaDaily", "Lượt mỗi người mỗi ngày", `type="number" inputmode="numeric" min="1" max="100" placeholder="${item.quota}"`, `Để trống = mặc định ${item.quota}.`)}
        ${id === "ai_council" ? input("followUps", "Câu hỏi tiếp trong một Hội đồng", `type="number" inputmode="numeric" min="0" max="10" placeholder="${item.followUps}"`, `Để trống = mặc định ${item.followUps}.`) : ""}
        ${input("deadlineSeconds", "Tổng thời gian chờ model (giây)", 'type="number" inputmode="numeric" min="5" max="140"', `5–140 giây. Để trống = mỗi model chờ ${item.wait} giây.`)}
      </div>
      <p class="helper">Câu khi hết lượt / tạm nghỉ được lưu cùng phiên bản nhưng app hiện vẫn dùng câu có sẵn (chưa áp dụng).</p>
      <div class="config-grid">
        ${COPY_KINDS.map(([kind, label]) => area(`${kind}.vi`, `${label} (tiếng Việt)`) + area(`${kind}.en`, `${label} (tiếng Anh)`)).join("")}
      </div>
      <div class="config-field"><label for="cfg-${id}-note">Ghi chú nháp (không bắt buộc)</label><input class="input" id="cfg-${id}-note" maxlength="500" data-cfg-feature="${id}" data-cfg-field="note" value="${escape(values.note)}"></div>
      <p class="helper" data-cfg-dirty="${id}" ${dirty ? "" : "hidden"}>Còn thay đổi chưa lưu — bấm Lưu nháp${manage ? " trước khi phát hành" : ""}.</p>
      <div class="param-row">
        <button type="submit" class="button" data-cfg-save="${id}" ${active.busy ? "disabled" : ""}>Lưu nháp</button>
        ${manage ? `<button type="button" class="button primary" data-cfg-review="${id}" ${active.busy || !draftRow || dirty ? "disabled" : ""}>Xem lại & phát hành</button>` : ""}
      </div>
      ${manage ? (draftRow ? "" : '<p class="helper">Chưa có bản nháp trên máy chủ. Lưu nháp trước, rồi mới phát hành.</p>')
        : `<p class="helper" data-cfg-editor-note>${draftRow ? "Chỉ Owner phát hành — bản nháp của bạn đã lưu, chờ Owner xem lại." : "Chỉ Owner phát hành. Bấm Lưu nháp để gửi bản nháp cho Owner xem lại."}</p>`}
    </form>`;
  }
  function renderConfig(item, manage) {
    if (!item.config) return '<p class="muted">Đang gỡ: không có cấu hình hạn mức ở đây. Chỉ theo dõi công tắc.</p>';
    if (active.configStatus === "loading" || active.configStatus === "idle") return '<p class="muted">Đang tải cấu hình…</p>';
    if (active.configStatus === "missing" || active.configStatus === "error") {
      return `<div class="warning-card" role="note"><p>${active.configStatus === "missing" ? MIGRATION_NOTE : "Không tải được cấu hình. Bấm Tải lại."}</p></div>${renderValues(item, null, null)}`;
    }
    const { activeRow, draftRow } = rowsFor(item.id);
    const message = active.messages[item.id];
    return `<p>${activeRow ? `Đang chạy: phiên bản ${activeRow.version}${activeRow.publishedAt ? ` · phát hành ${escape(activeRow.publishedAt)}` : ""} ${gateApi()?.badge(activeRow) ?? ""}` : "Đang chạy: mặc định trong mã (chưa phát hành cấu hình nào)."}
      ${draftRow ? ` · Có bản nháp phiên bản ${draftRow.version}` : ""}</p>
      ${renderValues(item, activeRow, draftRow)}
      ${canDraft() ? renderForm(item, draftRow, manage) : '<p class="muted">Bạn chỉ có quyền xem. Lưu nháp cần ai.manage hoặc ai.read + content.draft; phát hành cần ai.manage.</p>'}
      <p class="helper" role="status" aria-live="polite" data-cfg-message="${item.id}">${escape(message || "")}</p>`;
  }
  function renderDialog() {
    const dialog = active.dialog;
    if (!dialog) return "";
    const item = feature(dialog.feature), { activeRow, draftRow } = rowsFor(dialog.feature);
    if (!draftRow) return "";
    const rows = settingKeys(item).map(key => {
      const before = describe(item, activeRow, key), after = describe(item, draftRow, key);
      return `<tr class="${before === after ? "" : "changed"}"><th scope="row">${settingLabels[key]}</th><td>${escape(before)}</td><td>${escape(after)}</td><td>${before === after ? "Giữ nguyên" : "Đổi"}</td></tr>`;
    }).join("");
    const decision = gateDecision(dialog);
    const gate = gateApi();
    return `<div class="modal-backdrop ai-feature-dialog-backdrop"><section class="modal ai-feature-dialog" id="ai-feature-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-feature-dialog-title" tabindex="-1">
      <div class="modal-header"><div><p class="eyebrow">Xem lại trước khi phát hành</p><h2 id="ai-feature-dialog-title">${escape(item.label)}: phiên bản ${draftRow.version}</h2></div></div>
      <p class="pill" id="ai-feature-dialog-environment">Đang ghi vào: ${escape(environmentLabel())}</p>
      <p>${activeRow ? `Phiên bản nháp ${draftRow.version} thay phiên bản đang chạy ${activeRow.version}; bản cũ được lưu trữ, không bị xóa.` : `Phiên bản nháp ${draftRow.version} thay mặc định trong mã.`} Áp dụng cho người dùng ngay khi Edge Function đọc lại cấu hình.</p>
      <table class="config-table diff-table"><thead><tr><th scope="col">Thiết lập</th><th scope="col">Đang chạy</th><th scope="col">Sau khi phát hành</th><th scope="col">Thay đổi</th></tr></thead><tbody>${rows}</tbody></table>
      <h3>Cổng phát hành (chạy thử & chấm điểm)</h3>
      ${gate ? gate.renderState(dialog.gate) : '<p class="muted">Không tải được mô-đun cổng phát hành; máy chủ vẫn tự kiểm khi phát hành.</p>'}
      ${gate && decision.mode === "bypass" ? gate.renderBypass("ai-feature", dialog.bypass) : ""}
      ${decision.mode === "blocked" ? '<p class="helper" data-gate-blocked>Nút Phát hành bị khóa cho tới khi lớp an toàn đạt.</p>' : ""}
      <p><button type="button" class="button ghost" data-cfg-open-evals="${item.id}">Mở Chạy thử & chấm điểm</button></p>
      <div class="config-field"><label for="ai-feature-publish-note">Ghi chú phát hành (bắt buộc, 10–500 ký tự)</label><textarea class="input" id="ai-feature-publish-note" rows="3" maxlength="500">${escape(dialog.note)}</textarea></div>
      <div class="modal-actions"><button type="button" class="button ghost" data-cfg-dialog-cancel>Hủy</button><button type="button" class="button primary" data-cfg-publish="${item.id}" ${publishAllowed(dialog) && !active.busy ? "" : "disabled"}>${decision.mode === "bypass" ? "Phát hành khi chưa chấm" : "Phát hành"} phiên bản ${draftRow.version}</button></div>
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
    container.innerHTML = `<div class="detail-heading"><div><p class="eyebrow">Tính năng AI</p><h2 id="ai-features-title">Bật/tắt và hạn mức từng tính năng AI</h2></div><span class="pill" role="status" aria-live="polite">${escape(active.status)}</span></div>
      <p>Tắt một tính năng khi cần dừng khẩn cấp: người dùng thấy “đang tạm nghỉ” và không mất lượt; câu trả lời an toàn khi khủng hoảng vẫn chạy. <strong>Lưu nháp</strong> lưu lên máy chủ, người dùng chưa thấy. <strong>Xem lại & phát hành</strong> áp dụng cho người dùng sau khi bạn xem thay đổi và ghi chú.</p>
      ${manage ? "" : canDraft() ? '<p class="muted">Bạn được lưu nháp hạn mức và thời gian chờ. Chỉ Owner bật/tắt tính năng và phát hành.</p>' : '<p class="muted">Bạn chỉ có quyền xem. Cần quyền ai.manage để bật/tắt, lưu nháp hoặc phát hành.</p>'}
      <div class="param-row"><button type="button" class="button ghost" id="ai-features-reload" ${active.busy ? "disabled" : ""}>Tải lại</button></div>
      <div class="ai-feature-grid">${FEATURES.map(item => {
        const row = active.switchStatus === "ok" ? active.switches.get(item.id) : null;
        const chip = active.switchStatus !== "ok" ? "" : !row ? '<span class="pill">Chưa có công tắc</span>' : `<span class="pill ${row.enabled ? "state-on" : "state-off"}">${row.enabled ? "Đang bật" : "Đang tắt"}</span>`;
        return `<article class="code-card ai-feature-card" data-feature-card="${item.id}" aria-labelledby="ai-feature-${item.id}-title">
          <div class="layer-row"><h3 id="ai-feature-${item.id}-title">${escape(item.label)}</h3>${chip}</div>
          <h4>Bật/tắt</h4>${renderSwitch(item, manage)}
          <h4>Hạn mức & thời gian chờ</h4>${renderConfig(item, manage)}
        </article>`;
      }).join("")}</div>${renderDialog()}`;
    if (active.editing) container.querySelector(`#ai-switch-reason-${active.editing}`)?.focus();
    if (active.dialog && !active.dialog.keepFocus) container.querySelector("#ai-feature-publish-note")?.focus();
  }

  async function load() {
    if (!active || active.busy) return;
    const snapshot = scope(), version = ++epoch;
    if (invalidated || !snapshot.account || typeof window.NilazaAdminRpc !== "function") { active.status = "Chưa xác minh được phiên đăng nhập"; render(); return; }
    active.busy = true; active.status = "Đang tải…"; active.switchStatus = "loading"; active.configStatus = "loading"; render();
    if (!await window.NilazaRequireCapability?.("ai.read") || !current(snapshot, version)) { if (active && version === epoch) { active.busy = false; active.status = "Cần quyền ai.read"; render(); } return; }
    const [switches, configs] = await Promise.allSettled([
      window.NilazaAdminRpc("get_ai_feature_switches", {}, "ai.read"),
      window.NilazaAdminRpc("get_ai_feature_configs", {}, "ai.read")
    ]);
    if (!current(snapshot, version)) return;
    try { if (switches.status !== "fulfilled") throw switches.reason; active.switches = cleanSwitches(switches.value); active.switchStatus = "ok"; }
    catch { active.switches = new Map(); active.switchStatus = "error"; }
    try { if (configs.status !== "fulfilled") throw configs.reason; active.configs = cleanConfigs(configs.value); active.configStatus = "ok"; }
    catch (error) { active.configs = []; active.configStatus = error?.missingFunction ? "missing" : "error"; }
    active.busy = false;
    active.status = active.configStatus === "missing" ? "Thiếu bảng cấu hình trên máy chủ" : active.switchStatus === "ok" && active.configStatus === "ok" ? "Đã tải" : "Tải chưa đủ; thử lại";
    render();
  }
  async function saveSwitch(id, reason) {
    if (!active || active.busy) return;
    const row = active.switches.get(id), clean = String(reason || "").trim();
    if (!row) return;
    if (clean.length < 3 || clean.length > 200) { active.status = "Hãy ghi lý do từ 3 tới 200 ký tự."; render(); return; }
    const snapshot = scope(), version = ++epoch;
    active.busy = true; active.status = "Đang lưu công tắc…"; render();
    try {
      if (!await window.NilazaRequireCapability?.("ai.manage") || !current(snapshot, version)) return;
      const result = await window.NilazaAdminRpc("set_ai_feature_switch", { feature_input: id, enabled_input: !row.enabled, reason_input: clean }, "ai.manage");
      if (!current(snapshot, version)) return;
      if (result?.feature !== id || result.enabled !== !row.enabled) throw Error("invalid_acknowledgement");
      active.switches.set(id, { ...row, ...result }); active.editing = null;
      active.status = result.enabled ? `Đã bật lại: ${feature(id).label}` : `Đã tắt: ${feature(id).label}`;
    } catch { if (current(snapshot, version)) active.status = "Chưa lưu công tắc; tải lại rồi thử."; }
    finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  async function saveDraft(id) {
    if (!active || active.busy || active.configStatus !== "ok") return;
    const item = feature(id), { activeRow, draftRow } = rowsFor(id);
    let payload;
    try { payload = buildPayload(item, formFrom(id), draftRow || activeRow); }
    catch (error) { active.messages[id] = error.message; render(); return; }
    const snapshot = scope(), version = ++epoch;
    active.busy = true; active.messages[id] = "Đang lưu nháp…"; render();
    try {
      if (!await requireDraft() || !current(snapshot, version)) return;
      const result = await window.NilazaAdminRpc("save_ai_feature_config_draft", { feature_input: id, payload }, DRAFT_RULE);
      if (!current(snapshot, version)) return;
      if (result?.feature !== id || result.status !== "draft" || !Number.isInteger(result.version)) throw Error("invalid_acknowledgement");
      active.configs = [...active.configs.filter(row => !(row.feature === id && row.status === "draft")), result];
      forms.dirty.delete(id); delete forms.values[id]; reportUnsaved();
      active.messages[id] = `Đã lưu nháp phiên bản ${result.version}. Người dùng chưa thấy thay đổi này.`;
    } catch (error) {
      if (!current(snapshot, version)) return;
      if (error?.missingFunction) { active.configStatus = "missing"; active.status = "Thiếu bảng cấu hình trên máy chủ"; }
      else active.messages[id] = errorMessage(error, "save");
    } finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  async function publish(id) {
    if (!active || active.busy || !active.dialog || active.dialog.feature !== id) return;
    const note = active.dialog.note.trim(), { draftRow } = rowsFor(id);
    if (!draftRow || !publishAllowed(active.dialog)) { render(); return; }
    const decision = gateDecision(active.dialog), bypass = active.dialog.bypass || {};
    const snapshot = scope(), version = ++epoch;
    active.busy = true; active.messages[id] = "Đang phát hành…"; render();
    try {
      if (!await window.NilazaRequireCapability?.("ai.manage") || !current(snapshot, version)) return;
      const result = decision.mode === "bypass"
        ? await window.NilazaAdminRpc("publish_ai_feature_config_bypass", { feature_input: id, version_input: draftRow.version, note_input: note,
          bypass_reason_input: bypass.reason, bypass_note_input: String(bypass.note || "").trim() }, "ai.manage")
        : await window.NilazaAdminRpc("publish_ai_feature_config", { feature_input: id, version_input: draftRow.version, note_input: note }, "ai.manage");
      if (!current(snapshot, version)) return;
      if (result?.feature !== id || result.status !== "active" || result.version !== draftRow.version) throw Error("invalid_acknowledgement");
      active.configs = active.configs.map(row => row.feature !== id ? row : row.version === result.version ? { ...row, ...result } : row.status === "active" ? { ...row, status: "archived" } : row);
      active.dialog = null;
      active.messages[id] = result.gateStatus === "bypassed_pending"
        ? `Đã phát hành phiên bản ${result.version} khi chưa chấm đủ — nhãn “Chưa chấm”, cần chấm lại trong 24 giờ.`
        : `Đã phát hành phiên bản ${result.version}.`;
    } catch (error) {
      if (!current(snapshot, version)) return;
      if (error?.missingFunction && decision.mode !== "bypass") { active.configStatus = "missing"; active.dialog = null; }
      else active.messages[id] = errorMessage(error, "publish");
    } finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  function openDialog(id) {
    if (!active || active.busy || forms.dirty.has(id) || !rowsFor(id).draftRow || !can("ai.manage")) return;
    const draftId = rowsFor(id).draftRow.id;
    active.dialog = { feature: id, note: "", bypass: { reason: "", note: "" }, gate: gateApi() ? { status: "loading" } : { status: "missing" } };
    render();
    if (!gateApi()) return;
    const dialog = active.dialog, snapshot = scope(), version = epoch;
    void gateApi().load("feature_config", draftId).then(state => {
      if (!active || active.dialog !== dialog || !current(snapshot, version)) return;
      dialog.gate = state;
      render();
    });
  }
  function refreshDialogControls() {
    const dialog = active?.dialog;
    if (!dialog) return;
    const confirm = active.container.querySelector("[data-cfg-publish]");
    if (confirm) confirm.disabled = active.busy || !publishAllowed(dialog);
  }
  function closeDialog() {
    if (!active?.dialog) return;
    const id = active.dialog.feature;
    active.dialog = null;
    render();
    active.container.querySelector(`[data-cfg-review="${id}"]`)?.focus();
  }

  function clear() {
    epoch++;
    if (active) active.container.innerHTML = '<p role="status">Phiên đã thay đổi. Mở lại mục Tính năng AI để tiếp tục.</p>';
    active = null;
  }
  window.NilazaAiFeatures = Object.freeze({
    clear,
    features: FEATURES,
    buildPayload,
    mount(container) {
      const now = scope();
      if (forms.owner !== `${now.account}|${now.target}`) resetForms(`${now.account}|${now.target}`);
      if (active && active.container === container && active.account === now.account) { render(); return; }
      clear();
      active = { container, account: now.account, switches: new Map(), switchStatus: "idle", configs: [], configStatus: "idle", busy: false, editing: null, dialog: null, messages: {}, status: "Chưa tải" };
      container.onclick = event => {
        if (!active || active.container !== container || invalidated || !can("ai.read")) return;
        if (event.target.closest("#ai-features-reload")) { void load(); return; }
        const edit = event.target.closest("[data-ai-switch-edit]");
        if (edit && can("ai.manage")) { active.editing = edit.dataset.aiSwitchEdit; active.status = "Ghi lý do rồi xác nhận"; render(); return; }
        if (event.target.closest("[data-ai-switch-cancel]")) { active.editing = null; active.status = "Đã hủy"; render(); return; }
        const review = event.target.closest("[data-cfg-review]");
        if (review) { openDialog(review.dataset.cfgReview); return; }
        if (event.target.closest("[data-cfg-dialog-cancel]")) { closeDialog(); return; }
        const publishButton = event.target.closest("[data-cfg-publish]");
        if (publishButton) { void publish(publishButton.dataset.cfgPublish); return; }
        const evals = event.target.closest("[data-cfg-open-evals]");
        if (evals) { const target = active.dialog ? rowsFor(active.dialog.feature).draftRow : null; active.dialog = null; window.NilazaOpenEvals?.({ feature: evals.dataset.cfgOpenEvals, targetKind: "feature_config", targetId: target?.id }); }
      };
      container.onsubmit = event => {
        if (!active || active.container !== container) return;
        const switchForm = event.target.closest("[data-ai-switch-form]");
        const configForm = event.target.closest("[data-cfg-form]");
        if (!switchForm && !configForm) return;
        event.preventDefault();
        if (switchForm) void saveSwitch(switchForm.dataset.aiSwitchForm, switchForm.querySelector("input")?.value);
        else if (canDraft()) void saveDraft(configForm.dataset.cfgForm);
      };
      container.oninput = event => {
        if (!active || active.container !== container) return;
        if (event.target.id === "ai-feature-publish-note" && active.dialog) {
          active.dialog.note = event.target.value;
          refreshDialogControls();
          return;
        }
        if (active.dialog && event.target.matches?.("[data-gate-note]")) { active.dialog.bypass.note = event.target.value; refreshDialogControls(); return; }
        if (active.dialog && event.target.matches?.("[data-gate-reason]")) { active.dialog.bypass.reason = event.target.value; refreshDialogControls(); return; }
        const id = event.target.dataset?.cfgFeature, key = event.target.dataset?.cfgField;
        if (!id || !key || !CONFIG_IDS.includes(id)) return;
        const values = formFrom(id);
        values[key] = event.target.value;
        forms.dirty.add(id);
        reportUnsaved();
        container.querySelector(`[data-cfg-dirty="${id}"]`)?.removeAttribute("hidden");
        const review = container.querySelector(`[data-cfg-review="${id}"]`);
        if (review) review.disabled = true;
      };
      container.onchange = event => {
        if (active?.dialog && event.target.matches?.("[data-gate-reason]")) { active.dialog.bypass.reason = event.target.value; refreshDialogControls(); }
      };
      container.onkeydown = event => { if (event.key === "Escape" && active?.dialog) { event.preventDefault(); closeDialog(); } };
      render();
      void load();
    }
  });
  window.addEventListener("hashchange", () => { if (active && !/^#features(?:\?|$)/.test(location.hash)) clear(); });
})();
