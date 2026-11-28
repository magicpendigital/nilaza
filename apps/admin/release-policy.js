(function () {
  // Phiên bản app tối thiểu (Owner decisions 27-28/11/2026, docs/proposals/STARTUP_GATE_SERVER_CONTENT_2026-11-27.vi.md;
  // record docs/feature-plans/startup-gate-2026-11-28.json). Shown under the Free / Premium page (#access).
  // - Reading needs ai.read (get_app_release_policies); only the Owner (ai.manage) sets or clears the minimum
  //   (set_app_release_policy, reason 10-500 characters). Migration 20261128090000.
  // - The app asks get_app_bootstrap at every start: an older app sees a reminder until effectiveAt + graceDays days,
  //   then the full-screen "Cần cập nhật" with the Google Play button (apps/mobile/src/startup).
  // - validateVersion / validateGraceDays / validateReason mirror the SQL checks, so the Owner sees a problem first.
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const MIGRATION = "20261128090000_app_release_policy.sql";
  const STRICT_VERSION = /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/;
  const GRACE = Object.freeze({ min: 0, max: 30, default: 3 });
  const initialTransport = { target: window.NilazaAdminTransportTarget || "", url: window.ENV?.SUPABASE_URL || "", key: window.ENV?.SUPABASE_ANON_KEY || "" };
  const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

  // Blank = no minimum (clears it). Otherwise strict x.y.z, same regex as the SQL check and the app.
  function validateVersion(value) {
    const text = String(value ?? "").trim();
    return text === "" || STRICT_VERSION.test(text) ? null : "Phiên bản phải có dạng x.y.z, ví dụ 0.1.4 (để trống nếu không đặt tối thiểu).";
  }
  function validateGraceDays(value) {
    const text = String(value ?? "").trim();
    const number = /^\d+$/.test(text) ? Number(text) : NaN;
    return Number.isInteger(number) && number >= GRACE.min && number <= GRACE.max ? null : `Số ngày nhắc phải là số nguyên từ ${GRACE.min} đến ${GRACE.max}.`;
  }
  function validateReason(value) {
    const length = String(value ?? "").trim().length;
    return length >= 10 && length <= 500 ? null : "Lý do bắt buộc, 10–500 ký tự.";
  }
  // What an older app meets, in one sentence.
  function describePolicy(policy) {
    if (!isObject(policy) || !policy.minVersion) return "Không đặt phiên bản tối thiểu: mọi bản app đều mở được.";
    const days = Number(policy.graceDays);
    return days === 0
      ? `Bản cũ hơn ${policy.minVersion} phải cập nhật ngay (màn hình "Cần cập nhật").`
      : `Bản cũ hơn ${policy.minVersion} thấy lời nhắc cập nhật trong ${days} ngày, sau đó phải cập nhật mới mở được.`;
  }

  let invalidated = false, active = null, epoch = 0;
  const can = capability => window.NilazaAdminSession?.capabilities?.includes(capability) === true;
  function scope() {
    if ((window.ENV?.SUPABASE_URL || "") !== initialTransport.url || (window.ENV?.SUPABASE_ANON_KEY || "") !== initialTransport.key) invalidated = true;
    return { account: window.NilazaAdminSession?.userId || "", target: initialTransport.target };
  }
  function current(snapshot, version) {
    const now = scope();
    return Boolean(active && version === epoch && !invalidated && can("ai.read") && now.account === snapshot.account
      && now.target === snapshot.target && active.container.isConnected);
  }
  function environmentLabel() { return window.NilazaDescribeEnvironment?.(window.ENV)?.label || "CHƯA RÕ MÔI TRƯỜNG"; }
  function cleanRow(row) {
    return isObject(row) && Number.isInteger(row.version) && (row.minVersion === null || typeof row.minVersion === "string") ? row : null;
  }
  function errorMessage(error) {
    if (error?.code === "42501") return "Tài khoản này không có quyền ai.manage (chỉ Owner đặt phiên bản tối thiểu).";
    if (error?.code === "22023") return "Máy chủ không nhận: kiểm tra phiên bản (x.y.z), số ngày (0–30) và lý do (10–500 ký tự).";
    return "Chưa lưu được. Tải lại rồi thử lại.";
  }

  function renderCurrent() {
    const row = active.current;
    if (!row) return '<p data-rp-current>Đang áp dụng: <strong>chưa đặt</strong>. Mọi bản app đều mở được.</p>';
    const who = row.createdByEmail || row.createdBy || "—";
    return `<div data-rp-current><p>Đang áp dụng (phiên bản cấu hình ${row.version}): <strong>${escape(row.minVersion || "không đặt tối thiểu")}</strong>${row.minVersion ? ` · nhắc ${escape(row.graceDays)} ngày` : ""}</p>
      <p class="helper">${escape(describePolicy(row))}</p>
      <p class="helper">Ai đặt: ${escape(who)} · Lúc: ${escape(row.effectiveAt || row.createdAt || "")} · Lý do: ${escape(row.reason || "")}</p></div>`;
  }
  function renderHistory() {
    const list = active.history.filter(row => row.status !== "active");
    if (!list.length) return "";
    const body = list.map(row => `<tr data-rp-history="${row.version}"><th scope="row">${row.version}</th><td>${escape(row.minVersion || "Không đặt")}</td><td>${row.minVersion ? escape(row.graceDays) : "—"}</td><td>${escape(row.effectiveAt || "")}</td><td>${escape(row.createdByEmail || row.createdBy || "—")}</td><td>${escape(row.reason || "")}</td></tr>`).join("");
    return `<details><summary>Các lần đặt trước</summary><table class="config-table"><caption class="visually-hidden">Lịch sử phiên bản app tối thiểu</caption>
      <thead><tr><th scope="col">Lần</th><th scope="col">Tối thiểu</th><th scope="col">Ngày nhắc</th><th scope="col">Lúc</th><th scope="col">Ai</th><th scope="col">Lý do</th></tr></thead><tbody>${body}</tbody></table></details>`;
  }
  function renderForm() {
    const form = active.form;
    const problems = [validateVersion(form.minVersion), validateGraceDays(form.graceDays), validateReason(form.reason)].filter(Boolean);
    const proposal = { minVersion: String(form.minVersion).trim() || null, graceDays: Number(form.graceDays) };
    return `<form class="code-card" data-rp-form aria-labelledby="rp-form-title"><h4 id="rp-form-title">Đặt phiên bản tối thiểu</h4>
      <div class="config-field"><label for="rp-min-version">Phiên bản tối thiểu (x.y.z, để trống = bỏ tối thiểu)</label><input class="input" id="rp-min-version" data-rp-field="minVersion" inputmode="decimal" maxlength="20" value="${escape(form.minVersion)}"></div>
      <div class="config-field"><label for="rp-grace-days">Số ngày nhắc trước khi bắt buộc (0–30)</label><input class="input" id="rp-grace-days" data-rp-field="graceDays" inputmode="numeric" maxlength="2" value="${escape(form.graceDays)}"></div>
      <div class="config-field"><label for="rp-reason">Lý do (bắt buộc, 10–500 ký tự)</label><textarea class="input" id="rp-reason" data-rp-field="reason" rows="2" maxlength="500">${escape(form.reason)}</textarea></div>
      <p class="helper" data-rp-preview>${problems.length ? "" : escape(describePolicy(proposal))}</p>
      ${problems.length ? `<ul class="helper" data-rp-errors role="alert">${problems.map(text => `<li>${escape(text)}</li>`).join("")}</ul>` : ""}
      <p class="pill">Đang ghi vào: ${escape(environmentLabel())}</p>
      <div class="param-row"><button type="button" class="button primary" data-rp-save ${active.busy || problems.length ? "disabled" : ""}>Lưu phiên bản tối thiểu</button></div>
      <p class="helper">Áp dụng ngay khi lưu: app hỏi máy chủ mỗi lần mở. Đặt số cao hơn bản đang có trên Google Play sẽ chặn mọi người sau số ngày nhắc.</p></form>`;
  }
  function render() {
    if (!active) return;
    const { container } = active;
    if (invalidated || !can("ai.read")) { container.innerHTML = ""; return; }
    const heading = `<div class="detail-heading"><div><p class="eyebrow">Khởi động app</p><h3 id="release-policy-title">Phiên bản app tối thiểu</h3></div><span class="pill" role="status" aria-live="polite">${escape(active.statusText)}</span></div>`;
    const intro = '<p class="helper">Bản app cũ hơn mức này thấy lời nhắc cập nhật, hết số ngày nhắc thì phải cập nhật trên Google Play mới mở được. Chỉ Owner (quyền ai.manage) đặt; người khác chỉ xem.</p>';
    let body;
    if (active.status === "loading" || active.status === "idle") body = '<p class="muted">Đang tải…</p>';
    else if (active.status === "missing") body = `<div class="warning-card" role="note" data-rp-missing><p><strong>Chưa áp migration.</strong> Máy chủ chưa có ${escape(MIGRATION)}; app chưa kiểm phiên bản tối thiểu.</p></div>`;
    else if (active.status === "error") body = '<div class="warning-card" role="note"><p>Không tải được. Bấm Tải lại.</p></div>';
    else body = `${renderCurrent()}${can("ai.manage") ? renderForm() : '<p class="muted" data-rp-readonly>Bạn chỉ có quyền xem. Chỉ Owner (ai.manage) đặt phiên bản tối thiểu.</p>'}${renderHistory()}`;
    container.innerHTML = `<section class="code-card rp-page" aria-labelledby="release-policy-title">${heading}${intro}${body}
      <div class="param-row"><button type="button" class="button ghost" data-rp-reload ${active.busy ? "disabled" : ""}>Tải lại</button></div>
      <p class="helper" role="status" aria-live="polite" data-rp-message>${escape(active.message || "")}</p></section>`;
  }
  function refreshLive() {
    if (!active) return;
    const form = active.form;
    const problems = [validateVersion(form.minVersion), validateGraceDays(form.graceDays), validateReason(form.reason)].filter(Boolean);
    const save = active.container.querySelector("[data-rp-save]");
    if (save) save.disabled = active.busy || problems.length > 0;
    const preview = active.container.querySelector("[data-rp-preview]");
    if (preview) preview.textContent = problems.length ? problems.join(" ") : describePolicy({ minVersion: String(form.minVersion).trim() || null, graceDays: Number(form.graceDays) });
  }
  function formFrom(row) {
    return { minVersion: row?.minVersion || "", graceDays: String(row?.minVersion ? row.graceDays : GRACE.default), reason: "" };
  }

  async function load() {
    if (!active || active.busy) return;
    const snapshot = scope(), version = ++epoch;
    if (invalidated || !snapshot.account || typeof window.NilazaAdminRpc !== "function") { active.statusText = "Chưa xác minh được phiên đăng nhập"; render(); return; }
    active.busy = true; active.status = "loading"; active.statusText = "Đang tải…"; render();
    try {
      if (!await window.NilazaRequireCapability?.("ai.read") || !current(snapshot, version)) return;
      const result = await window.NilazaAdminRpc("get_app_release_policies", {}, "ai.read");
      if (!current(snapshot, version)) return;
      if (!isObject(result) || !Array.isArray(result.history)) throw Error("invalid_response");
      active.current = cleanRow(result.current);
      active.history = result.history.map(cleanRow).filter(Boolean);
      active.status = "ok"; active.statusText = "Đã tải";
      active.form = formFrom(active.current);
    } catch (error) {
      if (!current(snapshot, version)) return;
      active.status = error?.missingFunction ? "missing" : "error";
      active.statusText = active.status === "missing" ? "Chưa áp migration" : "Tải chưa được; thử lại";
    } finally { if (active && version === epoch) { active.busy = false; render(); } }
  }
  async function save() {
    if (!active || active.busy || active.status !== "ok" || !can("ai.manage")) return;
    const form = active.form;
    if ([validateVersion(form.minVersion), validateGraceDays(form.graceDays), validateReason(form.reason)].some(Boolean)) { render(); return; }
    const snapshot = scope(), version = ++epoch;
    active.busy = true; active.message = "Đang lưu…"; render();
    try {
      if (!await window.NilazaRequireCapability?.("ai.manage") || !current(snapshot, version)) return;
      const minVersion = String(form.minVersion).trim();
      const result = await window.NilazaAdminRpc("set_app_release_policy", { min_version_input: minVersion || null, grace_days_input: Number(form.graceDays), reason_input: String(form.reason).trim() }, "ai.manage");
      if (!current(snapshot, version)) return;
      const row = cleanRow(result);
      if (!row || row.status !== "active" || (row.minVersion || "") !== minVersion) throw Error("invalid_acknowledgement");
      active.history = [row, ...active.history.map(item => (item.status === "active" ? { ...item, status: "archived" } : item))].slice(0, 20);
      active.current = row;
      active.form = formFrom(row);
      active.message = row.minVersion ? `Đã lưu: phiên bản tối thiểu ${row.minVersion}, nhắc ${row.graceDays} ngày. App nhận ở lần mở tiếp theo.` : "Đã bỏ phiên bản tối thiểu. App nhận ở lần mở tiếp theo.";
    } catch (error) {
      if (!current(snapshot, version)) return;
      if (error?.missingFunction) { active.status = "missing"; active.statusText = "Chưa áp migration"; }
      else active.message = errorMessage(error);
    } finally { if (active && version === epoch) { active.busy = false; render(); } }
  }
  function onInput(event) {
    const field = event.target.dataset?.rpField;
    if (!field || !active?.form || !can("ai.manage")) return;
    active.form[field] = event.target.value;
    refreshLive();
  }
  function onClick(event) {
    const target = event.target;
    if (target.closest("[data-rp-reload]")) { void load(); return; }
    if (target.closest("[data-rp-save]")) void save();
  }
  function clear() {
    epoch++;
    if (active) active.container.innerHTML = "";
    active = null;
  }
  window.NilazaReleasePolicy = Object.freeze({
    clear,
    validateVersion,
    validateGraceDays,
    validateReason,
    describePolicy,
    mount(container) {
      const now = scope();
      if (active && active.container === container && active.account === now.account) { render(); return; }
      clear();
      active = { container, account: now.account, status: "idle", statusText: "Chưa tải", busy: false, current: null, history: [], form: formFrom(null), message: "" };
      const guard = handler => event => { if (!active || active.container !== container || invalidated || !can("ai.read")) return; handler(event); };
      container.onclick = guard(onClick);
      container.oninput = guard(onInput);
      container.onsubmit = event => event.preventDefault();
      render();
      void load();
    }
  });
  window.addEventListener("hashchange", () => { if (active && !/^#access(?:\?|$)/.test(location.hash)) clear(); });
})();
