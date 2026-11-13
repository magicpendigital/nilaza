(function () {
  // Prompt & phiên bản (Admin A5; spec 04/11 §3.11, §3.7 parts 3 and 7, §3.3 prompt row; review AI-03, AI-04, AD-11).
  // One table of every AI system prompt (global per feature, and one per guide for persona chat) with its VI/EN state,
  // the running version, the draft and whether the runtime still uses text written in code. An editor saves VI and EN
  // drafts ("Lưu nháp": stored on the server, users do not see it), a version timeline compares any version with the
  // running one and "Khôi phục" turns an old version into a new draft, and "Xem lại & phát hành" (ai.manage only) shows
  // the diff, the environment and needs a note of at least 10 characters.
  // RPCs (migration 20261113095000): list_prompt_versions (ai.read), save_prompt_draft (ai.manage, or ai.read +
  // content.draft = editor; Owner decision 13/11), publish_prompt_version (ai.manage). The server checks the same
  // rules again: injection markers, at most 12000 characters, the other language must exist, note length.
  // Edge Functions always add their locked safety and output rules after this text.
  // A6 release gate (migration 20261113110000, release-gate.js): each VI/EN draft needs its own passed safety layer;
  // a quality bypass (ai.manage, reason + note) uses publish_prompt_version_bypass and marks the version "Chưa chấm".
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const MIGRATION = "20261113095000";
  const MIGRATION_NOTE = `Máy chủ chưa có các hàm sửa prompt — cần Owner áp migration ${MIGRATION}_prompt_versions_admin_publish.sql. Prompt đang chạy không bị ảnh hưởng.`;
  const LOCALES = Object.freeze([["vi", "tiếng Việt"], ["en", "tiếng Anh"]]);
  const MAX_CHARS = 12000;
  const DRAFT_RULE = "ai.manage|ai.read+content.draft";
  const LOCKED_NOTE = "Lớp an toàn (khủng hoảng → 115), ranh giới bất biến và định dạng đầu ra luôn được backend ghép sau đoạn này; không sửa được ở đây.";
  const PROMPTS = Object.freeze([
    { feature: "persona_chat", label: "Trò chuyện với người dẫn — prompt chung", editable: true, consumer: "ai-persona-chat đọc bản đang chạy (VI hoặc EN theo ngôn ngữ người dùng)." },
    { feature: "tarot_reading", label: "Giải bài Tarot", editable: true, consumer: "ai-tarot-reading đọc bản đang chạy đúng ngôn ngữ; thiếu thì dùng bản gốc trong repo." },
    { feature: "daily_insight", label: "Thông điệp hằng ngày", editable: true, consumer: "ai-daily-insight đọc bản này sau khi Owner deploy lại hàm (bước A5); trước đó hàm vẫn dùng câu viết trong mã.", pendingDeploy: true },
    { feature: "ai_council", label: "Hội đồng", editable: true, consumer: "ai-council đọc bản này sau khi Owner deploy lại hàm (bước A5); trước đó hàm vẫn dùng câu viết trong mã.", pendingDeploy: true },
    { feature: "astrology_report", label: "Đọc sâu Chiêm tinh (lưu dưới mã astrology_report)", editable: true, consumer: "ai-astrology-insight đọc bản đang chạy; thiếu một ngôn ngữ thì báo chưa sẵn sàng." },
    { feature: "oracle_router", label: "Oracle", editable: false, hardCoded: "Còn cứng trong mã — Oracle dùng bộ prompt khóa phiên bản (prompt-composition); bản lưu ở đây không được đọc." }
  ]);
  const FILTERS = Object.freeze([["all", "Tất cả"], ["draft", "Có nháp"], ["missing", "Thiếu bản dịch"], ["hard", "Còn cứng trong mã / chờ deploy"]]);
  const ERRORS = {
    "42501": "Tài khoản này không có quyền cho thao tác này (lưu nháp cần ai.manage hoặc ai.read + content.draft; phát hành cần ai.manage).",
    "22023": "Máy chủ không nhận: dữ liệu không hợp lệ (tính năng, ngôn ngữ hoặc ghi chú).",
    NZP01: "Máy chủ từ chối nội dung: quá ngắn/dài, có ký tự điều khiển hoặc câu giống lệnh chèn (ví dụ “ignore previous instructions”, “bỏ qua an toàn”).",
    NZP02: "Chưa phát hành được: cần có bản tiếng Việt và tiếng Anh (nháp hoặc đang chạy) cho cùng prompt.",
    NZP03: "Bản này không còn là nháp (có thể vừa được phát hành). Tải lại rồi xem lại.",
    "40001": "Bản nháp đã thay đổi sau khi bạn xem lại. Tải lại rồi xem lại trước khi phát hành."
  };
  const initialTransport = { target: window.NilazaAdminTransportTarget || "", url: window.ENV?.SUPABASE_URL || "", key: window.ENV?.SUPABASE_ANON_KEY || "" };
  let invalidated = false, active = null, epoch = 0;
  const gateApi = () => window.NilazaReleaseGate;
  // Eval sets are per runtime feature; Astrology prompts are stored as astrology_report and read by Đọc sâu.
  const evalFeature = feature => feature === "astrology_report" ? "astrology_insight" : feature;
  function gateDecisions(dialog, drafts) {
    return drafts.map(([locale]) => gateApi()?.decide(dialog.gates?.[locale], dialog.bypass) ?? { allowed: true, mode: "ungated" });
  }
  function publishAllowed(dialog, drafts) {
    const length = String(dialog?.note ?? "").trim().length;
    return length >= 10 && length <= 500 && gateDecisions(dialog, drafts).every(decision => decision.allowed);
  }
  function dialogDrafts(dialog) {
    const rows = rowsFor(dialog.key);
    return LOCALES.filter(([locale]) => rows[locale].draft);
  }
  let cache = { owner: "", status: "idle", versions: [], personas: [] };
  // Unsaved edits survive re-rendering and leaving the page for the same account and backend.
  let forms = { owner: "", values: {}, dirty: new Set() };

  const can = capability => window.NilazaAdminSession?.capabilities?.includes(capability) === true;
  const canDraft = () => can("ai.manage") || (can("ai.read") && can("content.draft"));
  async function requireDraft() {
    const require = window.NilazaRequireCapability;
    if (!require) return false;
    if (await require("ai.manage")) return true;
    return await require("ai.read") && await require("content.draft");
  }
  function scope() {
    if ((window.ENV?.SUPABASE_URL || "") !== initialTransport.url || (window.ENV?.SUPABASE_ANON_KEY || "") !== initialTransport.key) invalidated = true;
    return { account: window.NilazaAdminSession?.userId || "", target: initialTransport.target };
  }
  const ownerOf = snapshot => `${snapshot.account}|${snapshot.target}`;
  function current(snapshot, version) {
    const now = scope();
    return Boolean(active && version === epoch && !invalidated && can("ai.read") && now.account === snapshot.account
      && now.target === snapshot.target && active.container.isConnected);
  }
  function environmentLabel() { return window.NilazaDescribeEnvironment?.(window.ENV)?.label || "CHƯA RÕ MÔI TRƯỜNG"; }
  function reportUnsaved() { window.NilazaUnsaved?.set("prompt-versions", forms.dirty.size); }

  // Same rules as nilaza_private.prompt_text_problem and isUsableTarotPromptText; the server checks again.
  function textProblem(text) {
    const value = String(text ?? "");
    if (value.trim().length < 20) return "Cần ít nhất 20 ký tự.";
    if (value.length > MAX_CHARS) return `Tối đa ${MAX_CHARS.toLocaleString("vi-VN")} ký tự.`;
    if (/[\u0001-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) return "Có ký tự điều khiển không hợp lệ.";
    if (/<\|[^>]+\|>|\[\/?INST\]|\[\/?(?:SYSTEM|ASSISTANT|USER)\]/i.test(value)
      || /(?:ignore|override|bypass|disable)\s+(?:all\s+)?(?:safety|system|previous|guardrails|instructions)/i.test(value)
      || /bỏ qua\s+(?:mọi\s+)?(?:an toàn|hệ thống|chỉ dẫn|ranh giới)/i.test(value)) {
      return "Có câu giống lệnh chèn (ví dụ “ignore previous instructions”, “bỏ qua an toàn”, [SYSTEM]). Hãy viết lại.";
    }
    return null;
  }

  // Line diff (longest common subsequence). Returns [{kind: "same"|"add"|"del", line}].
  function diffLines(before, after) {
    const a = String(before ?? "").split("\n"), b = String(after ?? "").split("\n");
    if (a.length * b.length > 250000) return [...a.map(line => ({ kind: "del", line })), ...b.map(line => ({ kind: "add", line }))];
    const table = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
    const out = [];
    let i = 0, j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { out.push({ kind: "same", line: a[i] }); i++; j++; }
      else if (table[i + 1][j] >= table[i][j + 1]) out.push({ kind: "del", line: a[i++] });
      else out.push({ kind: "add", line: b[j++] });
    }
    while (i < a.length) out.push({ kind: "del", line: a[i++] });
    while (j < b.length) out.push({ kind: "add", line: b[j++] });
    return out;
  }
  function renderDiff(before, after, label) {
    const parts = diffLines(before, after);
    const changed = parts.some(part => part.kind !== "same");
    const sign = { same: "  ", add: "+ ", del: "− " };
    return `<p class="helper">${escape(label)}${changed ? "" : " — không có khác biệt."}</p>
      <pre class="pv-diff" aria-label="${escape(label)}">${parts.map(part => `<span class="pv-${part.kind}">${sign[part.kind]}${escape(part.line)}</span>`).join("\n")}</pre>`;
  }

  // ---- data ----
  function cleanList(value) {
    if (!value || typeof value !== "object" || !Array.isArray(value.versions) || !Array.isArray(value.personas)) throw Error("invalid_response");
    const versions = value.versions.filter(row => row && typeof row.id === "string" && typeof row.feature === "string"
      && ["draft", "active", "archived"].includes(row.status) && ["vi", "en"].includes(row.locale) && typeof row.promptText === "string");
    const personas = value.personas.filter(row => row && typeof row.id === "string" && typeof row.slug === "string");
    return { versions, personas };
  }
  const keyOf = (feature, ownerType, ownerId) => `${feature}|${ownerType}|${ownerId || ""}`;
  function parseKey(key) {
    const [feature, ownerType, ownerId] = String(key).split("|");
    return { feature, ownerType, ownerId: ownerId || null };
  }
  function personaName(persona) {
    const name = persona?.name && typeof persona.name === "object" ? persona.name : {};
    return String(name.vi || name.en || persona?.slug || "Người dẫn");
  }
  function entries() {
    const list = PROMPTS.map(item => ({ ...item, key: keyOf(item.feature, "global", null), ownerType: "global", ownerId: null, owner: "Chung" }));
    for (const persona of cache.personas) {
      list.push({ feature: "persona_chat", key: keyOf("persona_chat", "persona", persona.id), ownerType: "persona", ownerId: persona.id,
        owner: `Người dẫn: ${personaName(persona)}`, label: `Prompt riêng — ${personaName(persona)}`, editable: true,
        consumer: "ai-persona-chat ghép prompt riêng này sau prompt chung khi người dùng trò chuyện với người dẫn này.",
        personaStatus: persona.status });
    }
    return list;
  }
  function rowsFor(key) {
    const { feature, ownerType, ownerId } = parseKey(key);
    const rows = cache.versions.filter(row => row.feature === feature && row.ownerType === ownerType && (row.ownerId || null) === ownerId);
    const byLocale = {};
    for (const [locale] of LOCALES) {
      const own = rows.filter(row => row.locale === locale).sort((x, y) => String(y.createdAt || "").localeCompare(String(x.createdAt || "")));
      byLocale[locale] = { active: own.find(row => row.status === "active") || null, draft: own.find(row => row.status === "draft") || null, all: own };
    }
    return byLocale;
  }
  function visibleEntries() {
    const all = entries();
    if (active.mode === "persona") return all.filter(item => item.ownerType === "persona");
    if (active.mode === "feature") return all.filter(item => item.feature === active.feature && item.ownerType === "global");
    const filter = active.filter;
    return all.filter(item => {
      const rows = rowsFor(item.key);
      if (filter === "draft") return LOCALES.some(([locale]) => rows[locale].draft);
      if (filter === "missing") return LOCALES.some(([locale]) => !rows[locale].active && !rows[locale].draft) && LOCALES.some(([locale]) => rows[locale].active || rows[locale].draft);
      if (filter === "hard") return !item.editable || item.pendingDeploy;
      return true;
    });
  }
  function formFor(key) {
    if (forms.values[key]) return forms.values[key];
    const rows = rowsFor(key), values = { note: "" };
    for (const [locale] of LOCALES) values[locale] = (rows[locale].draft || rows[locale].active)?.promptText ?? "";
    values.note = rows.vi.draft?.note || rows.en.draft?.note || "";
    forms.values[key] = values;
    return values;
  }

  // ---- render ----
  function localeCell(rows, locale) {
    const { active: running, draft } = rows[locale];
    if (!running && !draft) return '<span class="risk-chip high">Thiếu</span>';
    const badge = running ? gateApi()?.badge(running) || "" : "";
    return `${running ? `<span class="risk-chip low">Đang chạy</span> <small>${escape(running.version)}</small>${badge ? ` ${badge}` : ""}` : '<span class="risk-chip medium">Chưa chạy</span>'}${draft ? ` <span class="pill">Nháp ${escape(draft.version)}</span>` : ""}`;
  }
  function renderTable(list) {
    if (!list.length) return '<p class="muted">Không có prompt nào khớp bộ lọc.</p>';
    return `<table class="config-table pv-table"><caption class="visually-hidden">Danh sách prompt và trạng thái từng ngôn ngữ</caption>
      <thead><tr><th scope="col">Prompt</th><th scope="col">Thuộc</th><th scope="col">Tiếng Việt</th><th scope="col">Tiếng Anh</th><th scope="col">Nơi dùng</th><th scope="col"><span class="visually-hidden">Mở</span></th></tr></thead><tbody>
      ${list.map(item => {
        const rows = rowsFor(item.key);
        const flag = !item.editable ? `<span class="risk-chip high">Còn cứng trong mã</span>` : item.pendingDeploy ? '<span class="risk-chip medium">Chờ deploy lại hàm</span>' : '<span class="risk-chip low">Đang đọc từ đây</span>';
        return `<tr class="${active.selected === item.key ? "changed" : ""}"><th scope="row">${escape(item.label)}</th><td>${escape(item.owner)}</td>
          <td>${localeCell(rows, "vi")}</td><td>${localeCell(rows, "en")}</td><td>${flag}</td>
          <td><button type="button" class="button ghost" data-pv-open="${escape(item.key)}" aria-label="Mở ${escape(item.label)}">${item.editable ? "Mở" : "Xem"}</button></td></tr>`;
      }).join("")}</tbody></table>`;
  }
  function renderTimeline(item, rows) {
    const restore = item.editable && canDraft();
    return LOCALES.map(([locale, name]) => {
      const list = rows[locale].all;
      if (!list.length) return `<h4>Lịch sử ${name}</h4><p class="muted">Chưa có phiên bản nào.</p>`;
      return `<h4>Lịch sử ${name}</h4><ol class="version-list pv-timeline">${list.map(row => `<li class="version-row">
        <div><strong>${escape(row.version)}</strong> · <span class="risk-chip ${row.status === "active" ? "low" : row.status === "draft" ? "medium" : ""}">${row.status === "active" ? "Đang chạy" : row.status === "draft" ? "Nháp" : "Đã lưu trữ"}</span><br>
          <span>${escape(row.publishedAt ? `Phát hành ${row.publishedAt}` : `Tạo ${row.createdAt || ""}`)} · ${escape(row.characters ?? row.promptText.length)} ký tự</span>
          ${row.publishNote ? `<br><span>Ghi chú phát hành: ${escape(row.publishNote)}</span>` : ""}${row.note ? `<br><span>Ghi chú nháp: ${escape(row.note)}</span>` : ""}</div>
        <div class="param-row">${row.status !== "active" && rows[locale].active ? `<button type="button" class="button ghost" data-pv-diff="${escape(row.id)}">So sánh với bản đang chạy</button>` : ""}
          ${restore && row.status === "archived" ? `<button type="button" class="button ghost" data-pv-restore="${escape(row.id)}" ${active.busy ? "disabled" : ""}>Khôi phục thành bản nháp</button>` : ""}</div>
      </li>`).join("")}</ol>`;
    }).join("");
  }
  function renderEditor() {
    const item = entries().find(entry => entry.key === active.selected);
    if (!item) return "";
    const rows = rowsFor(item.key), values = formFor(item.key), dirty = forms.dirty.has(item.key), manage = can("ai.manage");
    const anyDraft = LOCALES.some(([locale]) => rows[locale].draft);
    const editable = item.editable && canDraft();
    const compare = active.compare && cache.versions.find(row => row.id === active.compare);
    const compareActive = compare && rowsFor(item.key)[compare.locale]?.active;
    return `<section class="code-card pv-editor" aria-labelledby="pv-editor-title">
      <p class="eyebrow">${escape(item.owner)}</p><h3 id="pv-editor-title">${escape(item.label)}</h3>
      <p class="helper">${escape(item.hardCoded || item.consumer)}</p>
      <p class="helper">${escape(LOCKED_NOTE)}</p>
      ${item.personaStatus && item.personaStatus !== "active" ? `<p class="helper">Người dẫn này đang ở trạng thái “${escape(item.personaStatus)}”; app chỉ dùng người dẫn đang hoạt động.</p>` : ""}
      <form class="config-form" data-pv-form="${escape(item.key)}" novalidate>
        ${LOCALES.map(([locale, name]) => {
          const { active: running, draft } = rows[locale];
          const problem = values[locale].trim() ? textProblem(values[locale]) : null;
          return `<div class="config-field"><label for="pv-text-${locale}">Prompt ${name}</label>
            <textarea class="input pv-text" id="pv-text-${locale}" rows="8" maxlength="${MAX_CHARS}" data-pv-locale="${locale}" ${editable ? "" : "readonly"}>${escape(values[locale])}</textarea>
            <small class="helper"><span data-pv-count="${locale}">${values[locale].length}</span>/${MAX_CHARS} ký tự · Đang chạy: ${escape(running?.version || "chưa có")} · Nháp: ${escape(draft?.version || "chưa có")}</small>
            <small class="helper pv-problem" data-pv-problem="${locale}" role="status">${escape(problem || "")}</small></div>`;
        }).join("")}
        ${editable ? `<div class="config-field"><label for="pv-note">Ghi chú nháp (không bắt buộc, tối đa 500 ký tự)</label><input class="input" id="pv-note" maxlength="500" data-pv-note value="${escape(values.note)}"></div>
        <p class="helper" data-pv-dirty ${dirty ? "" : "hidden"}>Còn thay đổi chưa lưu — bấm Lưu nháp${manage ? " trước khi phát hành" : ""}.</p>
        <div class="param-row">
          <button type="submit" class="button" data-pv-save ${active.busy ? "disabled" : ""}>Lưu nháp</button>
          ${manage ? `<button type="button" class="button primary" data-pv-review ${active.busy || !anyDraft || dirty ? "disabled" : ""}>Xem lại & phát hành</button>` : ""}
        </div>
        ${manage ? (anyDraft ? "" : '<p class="helper">Chưa có bản nháp trên máy chủ. Lưu nháp trước, rồi mới phát hành.</p>')
          : `<p class="helper" data-pv-editor-note>${anyDraft ? "Chỉ Owner phát hành — bản nháp đã lưu, chờ Owner xem lại." : "Chỉ Owner phát hành. Bấm Lưu nháp để gửi bản nháp cho Owner xem lại."}</p>`}`
        : item.editable ? '<p class="muted">Bạn chỉ có quyền xem. Lưu nháp cần ai.manage hoặc ai.read + content.draft; phát hành cần ai.manage.</p>' : ""}
      </form>
      <p class="helper" role="status" aria-live="polite" data-pv-message>${escape(active.message || "")}</p>
      ${compare && compareActive ? `<div class="pv-compare">${renderDiff(compareActive.promptText, compare.promptText, `So sánh ${compare.locale.toUpperCase()}: bản đang chạy ${compareActive.version} → ${compare.version}`)}<button type="button" class="button ghost" data-pv-compare-close>Đóng so sánh</button></div>` : ""}
      ${renderTimeline(item, rows)}
    </section>`;
  }
  function renderDialog() {
    const dialog = active.dialog;
    if (!dialog) return "";
    const item = entries().find(entry => entry.key === dialog.key);
    const rows = rowsFor(dialog.key);
    const drafts = LOCALES.filter(([locale]) => rows[locale].draft);
    if (!item || !drafts.length) return "";
    const decisions = gateDecisions(dialog, drafts), gate = gateApi();
    const needsBypass = decisions.some(decision => decision.mode === "bypass"), blocked = decisions.some(decision => decision.mode === "blocked");
    const missingPair = LOCALES.some(([locale]) => !rows[locale].draft && !rows[locale].active);
    return `<div class="modal-backdrop ai-feature-dialog-backdrop"><section class="modal ai-feature-dialog pv-dialog" id="pv-dialog" role="dialog" aria-modal="true" aria-labelledby="pv-dialog-title" tabindex="-1">
      <div class="modal-header"><div><p class="eyebrow">Xem lại trước khi phát hành</p><h2 id="pv-dialog-title">${escape(item.label)}</h2></div></div>
      <p class="pill" id="pv-dialog-environment">Đang ghi vào: ${escape(environmentLabel())}</p>
      ${drafts.map(([locale, name]) => {
        const draft = rows[locale].draft, running = rows[locale].active;
        return `<div class="pv-dialog-locale"><h3>${escape(name)}: ${escape(running ? `${running.version} → ${draft.version}` : `bản mới ${draft.version}`)}</h3>
          ${renderDiff(running?.promptText || "", draft.promptText, `Thay đổi ${name} (${draft.promptText.length} ký tự; mã kiểm tra ${String(draft.textSha256 || "").slice(0, 12)})`)}
          ${gate ? gate.renderState(dialog.gates?.[locale], `Cổng phát hành ${locale.toUpperCase()}`) : ""}</div>`;
      }).join("")}
      ${gate && needsBypass && !blocked ? gate.renderBypass("pv", dialog.bypass) : ""}
      ${blocked ? '<p class="helper" data-gate-blocked>Nút Phát hành bị khóa cho tới khi lớp an toàn của mọi bản nháp đạt (mỗi ngôn ngữ chạy thử riêng).</p>' : ""}
      <p><button type="button" class="button ghost" data-pv-open-evals>Mở Chạy thử & chấm điểm</button></p>
      <p>Bản đang chạy được lưu trữ, không bị xóa. Người dùng thấy bản mới ở lượt gọi AI kế tiếp.</p>
      <p class="muted">Máy chủ kiểm lại: câu giống lệnh chèn, độ dài tối đa 12.000 ký tự, đủ tiếng Việt + tiếng Anh và cổng chạy thử của từng bản nháp.</p>
      ${missingPair ? '<p class="warning-card" role="note">Còn thiếu một ngôn ngữ: lưu nháp ngôn ngữ còn lại trước, máy chủ sẽ từ chối nếu thiếu.</p>' : ""}
      <div class="config-field"><label for="pv-publish-note">Ghi chú phát hành (bắt buộc, 10–500 ký tự)</label><textarea class="input" id="pv-publish-note" rows="3" maxlength="500">${escape(dialog.note)}</textarea></div>
      <div class="modal-actions"><button type="button" class="button ghost" data-pv-dialog-cancel>Hủy</button><button type="button" class="button primary" data-pv-publish ${publishAllowed(dialog, drafts) && !active.busy ? "" : "disabled"}>${needsBypass ? "Phát hành khi chưa chấm" : "Phát hành"} ${drafts.map(([locale]) => locale.toUpperCase()).join(" + ")}</button></div>
    </section></div>`;
  }
  function render() {
    if (!active) return;
    const { container } = active;
    if (invalidated || !can("ai.read")) {
      container.innerHTML = `<div class="warning-card" role="status">${invalidated ? "Máy chủ đã thay đổi. Tải lại trang." : "Cần quyền xem AI (ai.read)."}</div>`;
      return;
    }
    const focusId = container.contains(document.activeElement) ? document.activeElement.id : "";
    const caret = focusId && typeof document.activeElement.selectionStart === "number" ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
    const title = active.mode === "persona" ? "Prompt riêng của từng người dẫn" : active.mode === "feature" ? "Prompt của tính năng này" : "Prompt & phiên bản";
    let body;
    if (cache.status === "missing") body = `<div class="warning-card" role="note"><p>${escape(MIGRATION_NOTE)}</p></div>`;
    else if (cache.status === "error") body = '<div class="warning-card" role="note"><p>Không tải được danh sách prompt. Bấm Tải lại.</p></div>';
    else if (cache.status !== "ok") body = '<p class="muted" role="status">Đang tải prompt từ máy chủ…</p>';
    else body = `${renderTable(visibleEntries())}${renderEditor()}`;
    container.innerHTML = `<section class="pv-page" aria-labelledby="pv-title">
      <div class="detail-heading"><div><p class="eyebrow">AI Studio · bước A5</p><h2 id="pv-title">${escape(title)}</h2></div><span class="pill" role="status" aria-live="polite">${escape(active.status)}</span></div>
      <p><strong>Lưu nháp</strong> lưu lên máy chủ, người dùng chưa thấy. <strong>Xem lại & phát hành</strong> (chỉ Owner/ai.manage) áp dụng cho người dùng sau khi xem thay đổi và ghi chú. Mỗi prompt cần đủ tiếng Việt và tiếng Anh.</p>
      ${can("ai.manage") ? "" : canDraft() ? '<p class="muted">Bạn được lưu nháp. Chỉ Owner phát hành.</p>' : '<p class="muted">Bạn chỉ có quyền xem.</p>'}
      <div class="param-row"><button type="button" class="button ghost" data-pv-reload ${active.busy ? "disabled" : ""}>Tải lại</button>
        ${active.mode === "all" ? `<label for="pv-filter">Lọc</label><select class="input" id="pv-filter" data-pv-filter>${FILTERS.map(([id, label]) => `<option value="${id}" ${active.filter === id ? "selected" : ""}>${escape(label)}</option>`).join("")}</select>` : ""}</div>
      ${body}</section>${renderDialog()}`;
    if (active.dialog && !(focusId && document.getElementById(focusId)?.closest("#pv-dialog"))) container.querySelector("#pv-publish-note")?.focus();
    else if (focusId) {
      const element = document.getElementById(focusId);
      element?.focus();
      if (caret && element?.setSelectionRange) element.setSelectionRange(caret[0], caret[1]);
    }
  }

  // ---- actions ----
  async function load() {
    if (!active || active.busy) return;
    const snapshot = scope(), version = ++epoch;
    if (invalidated || !snapshot.account || typeof window.NilazaAdminRpc !== "function") { active.status = "Chưa xác minh được phiên đăng nhập"; render(); return; }
    active.busy = true; active.status = "Đang tải…"; cache = { ...cache, owner: ownerOf(snapshot), status: "loading" }; render();
    try {
      if (!await window.NilazaRequireCapability?.("ai.read") || !current(snapshot, version)) {
        if (active && version === epoch) { active.status = "Cần quyền ai.read"; cache.status = "error"; }
        return;
      }
      const data = cleanList(await window.NilazaAdminRpc("list_prompt_versions", { feature_input: null }, "ai.read"));
      if (!current(snapshot, version)) return;
      cache = { owner: ownerOf(snapshot), status: "ok", ...data };
      active.status = "Đã tải";
    } catch (error) {
      if (!current(snapshot, version)) return;
      cache = { owner: ownerOf(snapshot), status: error?.missingFunction ? "missing" : "error", versions: [], personas: [] };
      active.status = error?.missingFunction ? "Thiếu hàm trên máy chủ" : "Tải chưa được; thử lại";
    } finally { if (active && version === epoch) { active.busy = false; render(); } }
  }
  function message(text) { if (active) active.message = text; }
  async function saveDraft(key) {
    if (!active || active.busy || cache.status !== "ok") return;
    const item = entries().find(entry => entry.key === key);
    if (!item?.editable) return;
    const rows = rowsFor(key), values = formFor(key), note = String(values.note ?? "").trim();
    if (note.length > 500) { message("Ghi chú nháp tối đa 500 ký tự."); render(); return; }
    const changes = [];
    for (const [locale, name] of LOCALES) {
      const text = String(values[locale] ?? "").trim(), base = rows[locale].draft || rows[locale].active;
      const noteChanged = rows[locale].draft && (rows[locale].draft.note || "") !== note;
      if (!text && !base) continue;
      if (text === (base?.promptText ?? "").trim() && !noteChanged) continue;
      const problem = textProblem(text);
      if (problem) { message(`Prompt ${name}: ${problem}`); render(); return; }
      changes.push({ locale, text });
    }
    if (!changes.length) { message("Không có thay đổi để lưu."); forms.dirty.delete(key); delete forms.values[key]; reportUnsaved(); render(); return; }
    const { feature, ownerType, ownerId } = parseKey(key);
    const snapshot = scope(), version = ++epoch;
    active.busy = true; message("Đang lưu nháp…"); render();
    const saved = [];
    try {
      if (!await requireDraft() || !current(snapshot, version)) return;
      for (const change of changes) {
        const result = await window.NilazaAdminRpc("save_prompt_draft", { feature_input: feature, owner_type_input: ownerType, owner_id_input: ownerId,
          locale_input: change.locale, prompt_text_input: change.text, note_input: note || null }, DRAFT_RULE);
        if (!current(snapshot, version)) return;
        if (result?.status !== "draft" || result.feature !== feature || result.locale !== change.locale) throw Error("invalid_acknowledgement");
        saved.push(`${change.locale.toUpperCase()} ${result.version}`);
      }
      forms.dirty.delete(key); delete forms.values[key]; reportUnsaved();
      message(`Đã lưu nháp ${saved.join(", ")}. Người dùng chưa thấy thay đổi này.`);
    } catch (error) {
      if (!current(snapshot, version)) return;
      if (error?.missingFunction) { cache.status = "missing"; active.status = "Thiếu hàm trên máy chủ"; }
      else message(`${saved.length ? `Đã lưu ${saved.join(", ")}; ` : ""}${ERRORS[error?.code] || "Chưa lưu được nháp. Tải lại rồi thử lại."}`);
    } finally {
      if (current(snapshot, version)) { active.busy = false; if (saved.length) await refreshAfterWrite(); else render(); }
    }
  }
  async function refreshAfterWrite() {
    const keep = active?.message;
    await load();
    if (active && keep) { active.message = keep; render(); }
  }
  async function restore(id) {
    if (!active || active.busy || !canDraft()) return;
    const row = cache.versions.find(item => item.id === id);
    if (!row || row.status !== "archived") return;
    const key = keyOf(row.feature, row.ownerType, row.ownerId);
    if (forms.dirty.has(key)) { message("Còn thay đổi chưa lưu ở ô soạn. Lưu nháp hoặc tải lại trước khi khôi phục."); render(); return; }
    const snapshot = scope(), version = ++epoch;
    active.busy = true; message(`Đang khôi phục ${row.version} thành bản nháp…`); render();
    let ok = false;
    try {
      if (!await requireDraft() || !current(snapshot, version)) return;
      const result = await window.NilazaAdminRpc("save_prompt_draft", { feature_input: row.feature, owner_type_input: row.ownerType, owner_id_input: row.ownerId || null,
        locale_input: row.locale, prompt_text_input: row.promptText, note_input: `Khôi phục từ phiên bản ${row.version}`.slice(0, 500) }, DRAFT_RULE);
      if (!current(snapshot, version)) return;
      if (result?.status !== "draft") throw Error("invalid_acknowledgement");
      ok = true;
      message(`Đã tạo bản nháp ${result.version} (${row.locale.toUpperCase()}) từ ${row.version}. Bản đang chạy chưa đổi — cần Xem lại & phát hành.`);
    } catch (error) {
      if (!current(snapshot, version)) return;
      if (error?.missingFunction) cache.status = "missing";
      else message(ERRORS[error?.code] || "Chưa khôi phục được. Tải lại rồi thử lại.");
    } finally { if (current(snapshot, version)) { active.busy = false; if (ok) await refreshAfterWrite(); else render(); } }
  }
  async function publish() {
    if (!active || active.busy || !active.dialog || !can("ai.manage")) return;
    const { key } = active.dialog, note = active.dialog.note.trim(), rows = rowsFor(key);
    const draftLocales = dialogDrafts(active.dialog);
    const drafts = draftLocales.map(([locale]) => rows[locale].draft);
    if (!drafts.length || !publishAllowed(active.dialog, draftLocales)) { render(); return; }
    const decisions = gateDecisions(active.dialog, draftLocales), bypass = active.dialog.bypass || {};
    const snapshot = scope(), version = ++epoch;
    active.busy = true; message("Đang phát hành…"); render();
    const done = [];
    try {
      if (!await window.NilazaRequireCapability?.("ai.manage") || !current(snapshot, version)) return;
      for (const [index, draft] of drafts.entries()) {
        const result = decisions[index].mode === "bypass"
          ? await window.NilazaAdminRpc("publish_prompt_version_bypass", { prompt_version_id_input: draft.id, note_input: note, expected_sha256_input: draft.textSha256 || null,
            bypass_reason_input: bypass.reason, bypass_note_input: String(bypass.note || "").trim() }, "ai.manage")
          : await window.NilazaAdminRpc("publish_prompt_version", { prompt_version_id_input: draft.id, note_input: note, expected_sha256_input: draft.textSha256 || null }, "ai.manage");
        if (!current(snapshot, version)) return;
        if (result?.id !== draft.id || result.status !== "active") throw Error("invalid_acknowledgement");
        done.push(`${draft.locale.toUpperCase()} ${draft.version}${result.gateStatus === "bypassed_pending" ? " (Chưa chấm — cần chấm lại trong 24 giờ)" : ""}`);
      }
      active.dialog = null;
      message(`Đã phát hành ${done.join(", ")}.`);
    } catch (error) {
      if (!current(snapshot, version)) return;
      if (error?.missingFunction && !decisions.some(decision => decision.mode === "bypass")) { cache.status = "missing"; active.dialog = null; }
      else message(`${done.length ? `Đã phát hành ${done.join(", ")}; phần còn lại: ` : ""}${gateApi()?.errorMessage(error) || ERRORS[error?.code] || "Chưa phát hành được. Tải lại rồi thử lại."}`);
      if (done.length) active.dialog = null;
    } finally { if (current(snapshot, version)) { active.busy = false; if (done.length) await refreshAfterWrite(); else render(); } }
  }
  function openDialog() {
    if (!active || active.busy || !active.selected || forms.dirty.has(active.selected) || !can("ai.manage")) return;
    const rows = rowsFor(active.selected);
    if (!LOCALES.some(([locale]) => rows[locale].draft)) return;
    const dialog = { key: active.selected, note: "", bypass: { reason: "", note: "" }, gates: {} };
    for (const [locale] of LOCALES) if (rows[locale].draft) dialog.gates[locale] = gateApi() ? { status: "loading" } : { status: "missing" };
    active.dialog = dialog;
    render();
    if (!gateApi()) return;
    const snapshot = scope(), version = epoch;
    for (const [locale] of LOCALES) {
      if (!rows[locale].draft) continue;
      void gateApi().load("prompt_version", rows[locale].draft.id).then(state => {
        if (!active || active.dialog !== dialog || !current(snapshot, version)) return;
        dialog.gates[locale] = state;
        render();
      });
    }
  }
  function refreshDialogControls() {
    const dialog = active?.dialog;
    if (!dialog) return;
    const confirm = active.container.querySelector("[data-pv-publish]");
    if (confirm) confirm.disabled = active.busy || !publishAllowed(dialog, dialogDrafts(dialog));
  }
  function closeDialog() {
    if (!active?.dialog) return;
    active.dialog = null;
    render();
    active.container.querySelector("[data-pv-review]")?.focus();
  }

  function clear() {
    epoch++;
    if (active?.container?.isConnected) active.container.innerHTML = "";
    active = null;
  }
  window.NilazaPromptVersions = Object.freeze({
    clear,
    prompts: PROMPTS,
    textProblem,
    diffLines,
    /** mode: "all" (Prompt & phiên bản), "feature" (one feature's global prompt) or "persona" (Persona Studio). */
    mount(container, options = {}) {
      const now = scope(), owner = ownerOf(now);
      if (forms.owner !== owner) { forms = { owner, values: {}, dirty: new Set() }; reportUnsaved(); }
      if (cache.owner !== owner) cache = { owner, status: "idle", versions: [], personas: [] };
      const mode = ["all", "feature", "persona"].includes(options.mode) ? options.mode : "all";
      const previous = active;
      epoch++;
      active = { container, mode, feature: options.feature || "", busy: false, status: cache.status === "ok" ? "Đã tải" : "Chưa tải", message: "",
        filter: previous?.mode === mode ? previous.filter : "all", dialog: null, compare: null,
        selected: previous?.mode === mode && previous.feature === (options.feature || "") ? previous.selected : null };
      if (mode === "feature" && options.feature) active.selected = keyOf(options.feature, "global", null);
      container.onclick = event => {
        if (!active || active.container !== container || invalidated || !can("ai.read")) return;
        if (event.target.closest("[data-pv-reload]")) { void load(); return; }
        const open = event.target.closest("[data-pv-open]");
        if (open) { active.selected = open.dataset.pvOpen; active.compare = null; active.message = ""; render(); container.querySelector("#pv-editor-title")?.scrollIntoView?.({ block: "nearest" }); return; }
        const diff = event.target.closest("[data-pv-diff]");
        if (diff) { active.compare = diff.dataset.pvDiff; render(); return; }
        if (event.target.closest("[data-pv-compare-close]")) { active.compare = null; render(); return; }
        const restoreButton = event.target.closest("[data-pv-restore]");
        if (restoreButton) { void restore(restoreButton.dataset.pvRestore); return; }
        if (event.target.closest("[data-pv-review]")) { openDialog(); return; }
        if (event.target.closest("[data-pv-dialog-cancel]")) { closeDialog(); return; }
        if (event.target.closest("[data-pv-publish]")) { void publish(); return; }
        if (event.target.closest("[data-pv-open-evals]") && active.dialog) {
          const { feature } = parseKey(active.dialog.key), rows = rowsFor(active.dialog.key);
          const draft = LOCALES.map(([locale]) => rows[locale].draft).find(Boolean);
          active.dialog = null;
          window.NilazaOpenEvals?.({ feature: evalFeature(feature), targetKind: "prompt_version", targetId: draft?.id });
        }
      };
      container.onsubmit = event => {
        const form = event.target.closest("[data-pv-form]");
        if (!form || !active || active.container !== container) return;
        event.preventDefault();
        if (canDraft()) void saveDraft(form.dataset.pvForm);
      };
      container.onchange = event => {
        if (event.target.matches?.("[data-pv-filter]") && active) { active.filter = event.target.value; render(); }
        if (active?.dialog && event.target.matches?.("[data-gate-reason]")) { active.dialog.bypass.reason = event.target.value; refreshDialogControls(); }
      };
      container.oninput = event => {
        if (!active || active.container !== container) return;
        if (event.target.id === "pv-publish-note" && active.dialog) {
          active.dialog.note = event.target.value;
          refreshDialogControls();
          return;
        }
        if (active.dialog && event.target.matches?.("[data-gate-note]")) { active.dialog.bypass.note = event.target.value; refreshDialogControls(); return; }
        if (active.dialog && event.target.matches?.("[data-gate-reason]")) { active.dialog.bypass.reason = event.target.value; refreshDialogControls(); return; }
        const form = event.target.closest("[data-pv-form]");
        if (!form) return;
        const key = form.dataset.pvForm, values = formFor(key), locale = event.target.dataset?.pvLocale;
        if (locale) {
          values[locale] = event.target.value;
          const count = container.querySelector(`[data-pv-count="${locale}"]`);
          if (count) count.textContent = String(event.target.value.length);
          const problem = container.querySelector(`[data-pv-problem="${locale}"]`);
          if (problem) problem.textContent = event.target.value.trim() ? textProblem(event.target.value) || "" : "";
        } else if (event.target.matches("[data-pv-note]")) values.note = event.target.value;
        else return;
        forms.dirty.add(key);
        reportUnsaved();
        container.querySelector("[data-pv-dirty]")?.removeAttribute("hidden");
        const review = container.querySelector("[data-pv-review]");
        if (review) review.disabled = true;
      };
      container.onkeydown = event => { if (event.key === "Escape" && active?.dialog) { event.preventDefault(); closeDialog(); } };
      render();
      if (cache.status === "idle") void load();
    }
  });
  window.addEventListener("hashchange", () => { if (active && !/^#(?:versions|prompt|persona-studio)(?:\?|$)/.test(location.hash)) clear(); });
})();
