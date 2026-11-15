(function () {
  // Thành viên & quyền (Owner request 14/11; spec 04/11 §3.15 bảng quyền, roles.manage). Lists staff accounts
  // (list_admin_team), invites a new email or adds an existing account (Edge Function admin-team-invite), changes a
  // role (set_admin_member_role) and revokes access (revoke_admin_member), each behind a confirmation step. What a
  // role may and may not do comes from get_admin_role_matrix, the database's own role -> capability map, so this page
  // cannot promise more than the server enforces. Migration 20261114090000_admin_team_roles.sql.
  const MIGRATION = "20261114090000_admin_team_roles.sql";
  const FUNCTION_NAME = "admin-team-invite";
  const CAP = "roles.manage";
  const ROLES = ["owner", "admin", "editor", "safety_reviewer"];
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const roleLabels = { owner: "Owner", admin: "Quản trị", editor: "Biên tập viên", safety_reviewer: "Kiểm duyệt an toàn" };
  const roleSummaries = {
    owner: "Toàn quyền: duy nhất được phát hành nội dung và cài đặt AI, mời người khác và đổi quyền của họ.",
    admin: "Vận hành hằng ngày: soạn nháp nội dung và cài đặt AI, xem số liệu, gửi thông báo, duyệt an toàn. Không phát hành, không quản lý thành viên.",
    editor: "Soạn và lưu nháp nội dung, xem cài đặt AI. Không tự phát hành.",
    safety_reviewer: "Duyệt phản hồi và sự kiện an toàn, xem nội dung. Không sửa nội dung."
  };
  const capabilityLabels = {
    "hub.read": "Vào Admin, xem trang chính và lịch sử thao tác",
    "content.read": "Xem nội dung: người dẫn, bộ bài, văn bản trong app",
    "content.draft": "Soạn và lưu bản nháp nội dung",
    "content.publish": "Phát hành nội dung tới người dùng",
    "content.delete": "Xóa bản nháp nội dung",
    "ai.read": "Xem cài đặt AI, nhật ký AI và kết quả đánh giá",
    "ai.manage": "Phát hành và đổi cài đặt AI đang chạy: prompt, chuỗi model, nhà cung cấp, công tắc tính năng",
    "roles.manage": "Mời thành viên, đổi quyền và thu hồi quyền của người khác",
    "overview.read": "Xem số liệu tổng quan và tăng trưởng",
    "notifications.dispatch": "Gửi thông báo tới người dùng",
    "safety.review": "Duyệt phản hồi AI và sự kiện an toàn"
  };
  const errorText = {
    not_authorized: "Tài khoản này không có quyền quản lý thành viên.",
    invalid_request: "Thông tin chưa hợp lệ. Kiểm tra lại email và vai trò.",
    invalid_email: "Email chưa đúng định dạng.",
    invalid_role: "Vai trò không hợp lệ.",
    self_change: "Bạn không thể tự đổi hoặc thu hồi quyền của chính mình ở trang này.",
    last_owner: "Đây là Owner cuối cùng đang hoạt động. Cần có ít nhất một Owner khác trước khi đổi.",
    owner_confirm_required: "Cần đánh dấu xác nhận trước khi giao vai trò Owner.",
    member_not_found: "Không tìm thấy thành viên này. Tải lại danh sách rồi thử lại.",
    invite_limit: "Hôm nay bạn đã gửi đủ số lời mời cho phép. Thử lại vào ngày mai.",
    email_unconfirmed: "Email này đã đăng ký tài khoản Nilaza nhưng chưa được xác nhận, nên chưa thể cấp quyền Admin (chưa chắc người đăng ký là chủ hộp thư). Nhờ họ xác nhận email trong app trước, rồi mời lại.",
    invite_not_configured: "Máy chủ chưa cấu hình trang nhận lời mời (biến ADMIN_INVITE_REDIRECT_URL). Cần Owner cài đặt trước khi gửi email mời. Tài khoản đã có sẵn vẫn thêm được.",
    invite_failed: "Chưa gửi được lời mời. Thử lại sau ít phút.",
    migration_missing: `Máy chủ chưa có các hàm quản lý thành viên. Cần Owner áp dụng migration ${MIGRATION}.`,
    function_missing: `Máy chủ chưa có hàm ${FUNCTION_NAME}. Cần Owner deploy hàm này trước khi mời qua email.`
  };
  const submitLabels = { invite: "Gửi lời mời", role: "Xác nhận đổi vai trò", revoke: "Thu hồi quyền" };
  const codeToError = { "42501": "not_authorized", "22023": "invalid_request", NZT01: "self_change", NZT02: "last_owner", NZT03: "owner_confirm_required", NZT04: "member_not_found", NZT05: "invite_limit", NZT06: "email_unconfirmed" };
  let state = fresh();
  let epoch = 0;
  function fresh() { return { status: "idle", members: [], matrix: null, invitesToday: 0, inviteDailyCap: 0, missing: false, dialog: null, notice: null }; }
  function status(text) { const line = document.getElementById("team-status"); if (line) line.textContent = text; }
  const dateText = value => {
    if (!value) return "";
    const when = new Date(value);
    return Number.isFinite(when.getTime()) ? when.toLocaleString("vi-VN") : String(value);
  };
  function memberState(member) {
    if (!member.activeRoles?.length) return { key: "revoked", text: "Đã thu hồi quyền" };
    if (!member.lastSignInAt && member.invitedAt) return { key: "invited", text: "Đã mời, chưa đăng nhập" };
    if (!member.lastSignInAt) return { key: "never", text: "Chưa đăng nhập lần nào" };
    return { key: "active", text: "Đang hoạt động" };
  }
  const roleText = roles => roles?.length ? roles.map(role => roleLabels[role] || role).join(", ") : "Không còn vai trò";
  const capsOf = role => state.matrix?.roles?.find(entry => entry.role === role)?.capabilities || [];
  function capabilityLists(role) {
    if (!state.matrix) return `<p class="muted">Chưa tải được bảng quyền từ máy chủ.</p>`;
    const allowed = new Set(capsOf(role));
    const all = Array.isArray(state.matrix.capabilities) ? state.matrix.capabilities : [];
    const label = cap => escape(capabilityLabels[cap] || cap);
    const can = all.filter(cap => allowed.has(cap));
    const cannot = all.filter(cap => !allowed.has(cap));
    return `<div class="team-caps" data-team-caps="${escape(role)}"><div><h4>Được làm</h4><ul class="can">${can.map(cap => `<li data-cap="${escape(cap)}">${label(cap)}</li>`).join("") || "<li>Không có quyền nào</li>"}</ul></div><div><h4>Không được làm</h4><ul class="cannot">${cannot.map(cap => `<li data-cap="${escape(cap)}">${label(cap)}</li>`).join("") || "<li>Không có giới hạn nào</li>"}</ul></div></div>`;
  }
  function rolePicker(selected, name) {
    return `<fieldset class="team-roles"><legend>Loại thành viên</legend>${ROLES.map(role => `<label class="team-role${role === selected ? " selected" : ""}"><input type="radio" name="${name}" value="${role}" ${role === selected ? "checked" : ""} data-team-role /><span><strong>${escape(roleLabels[role])}</strong><small>${escape(roleSummaries[role])}</small></span></label>`).join("")}</fieldset>`;
  }
  const ownerWarning = `<div class="team-owner-warning" data-team-owner-warning hidden><p><strong>Cẩn thận: vai trò Owner có toàn quyền.</strong> Người này sẽ mời, đổi quyền và thu hồi quyền của mọi thành viên khác, kể cả của bạn, và xem được mọi dữ liệu vận hành. Chỉ giao cho người bạn tin tuyệt đối.</p><label><input type="checkbox" data-team-owner-confirm /> Tôi hiểu và muốn giao toàn quyền Owner cho người này</label></div>`;
  function dialogHtml(dialog) {
    if (dialog.mode === "invite") {
      return `<section class="team-dialog overview-card" role="dialog" aria-modal="true" aria-labelledby="team-dialog-title" data-team-dialog="invite"><h2 id="team-dialog-title">Mời thành viên</h2><p class="muted">Nhập email của người cần thêm. Nếu email này đã có tài khoản Nilaza, họ được cấp quyền ngay mà không nhận email; nếu chưa có, họ nhận email mời để tự đặt mật khẩu. Hôm nay bạn đã mời ${escape(state.invitesToday)}/${escape(state.inviteDailyCap || 10)} email.</p><label class="team-field" for="team-invite-email">Email</label><input id="team-invite-email" type="email" autocomplete="off" inputmode="email" maxlength="254" placeholder="ten@example.com" data-team-email />${rolePicker(dialog.role, "team-invite-role")}<div data-team-caps-slot>${capabilityLists(dialog.role)}</div>${ownerWarning}<p class="team-dialog-error" data-team-dialog-error role="alert"></p><div class="team-dialog-actions"><button type="button" class="button primary" data-team-submit>Gửi lời mời</button><button type="button" class="button" data-team-cancel>Hủy</button></div></section>`;
    }
    if (dialog.mode === "role") {
      const member = dialog.member;
      return `<section class="team-dialog overview-card" role="dialog" aria-modal="true" aria-labelledby="team-dialog-title" data-team-dialog="role"><h2 id="team-dialog-title">${member.activeRoles?.length ? "Đổi vai trò" : "Cấp lại quyền"}</h2><p class="muted">Thành viên: <strong>${escape(member.email)}</strong>. Vai trò hiện tại: ${escape(roleText(member.activeRoles))}. Sau khi xác nhận, người này chỉ còn đúng một vai trò mới, có hiệu lực ngay ở lần thao tác kế tiếp.</p>${rolePicker(dialog.role, "team-change-role")}<div data-team-caps-slot>${capabilityLists(dialog.role)}</div>${ownerWarning}<p class="team-dialog-error" data-team-dialog-error role="alert"></p><div class="team-dialog-actions"><button type="button" class="button primary" data-team-submit>Xác nhận đổi vai trò</button><button type="button" class="button" data-team-cancel>Hủy</button></div></section>`;
    }
    const member = dialog.member;
    return `<section class="team-dialog overview-card" role="dialog" aria-modal="true" aria-labelledby="team-dialog-title" data-team-dialog="revoke"><h2 id="team-dialog-title">Thu hồi quyền</h2><p><strong>${escape(member.email)}</strong> (${escape(roleText(member.activeRoles))}) sẽ mất toàn bộ quyền vào Admin ngay lập tức. Tài khoản và dữ liệu cá nhân của họ trong app vẫn giữ nguyên; bạn có thể cấp lại quyền sau.</p><p class="team-dialog-error" data-team-dialog-error role="alert"></p><div class="team-dialog-actions"><button type="button" class="button danger" data-team-submit>Thu hồi quyền</button><button type="button" class="button" data-team-cancel>Hủy</button></div></section>`;
  }
  function memberRow(member) {
    const s = memberState(member);
    const actions = member.isMe
      ? `<span class="muted">Không tự đổi quyền của mình ở đây</span>`
      : `<button type="button" class="button" data-team-change="${escape(member.userId)}">${member.activeRoles?.length ? "Đổi vai trò" : "Cấp lại quyền"}</button>${member.activeRoles?.length ? `<button type="button" class="button danger" data-team-revoke="${escape(member.userId)}">Thu hồi quyền</button>` : ""}`;
    return `<tr data-team-member="${escape(member.userId)}" data-state="${s.key}"><td data-label="Email"><strong>${escape(member.email || "(không có email)")}</strong>${member.isMe ? ` <span class="pill">bạn</span>` : ""}</td><td data-label="Vai trò">${escape(roleText(member.activeRoles))}</td><td data-label="Trạng thái"><span class="team-state ${s.key}">${escape(s.text)}</span></td><td data-label="Ngày tạo">${escape(dateText(member.createdAt))}</td><td data-label="Đăng nhập gần nhất">${escape(dateText(member.lastSignInAt) || "Chưa đăng nhập")}</td><td data-label="Thao tác" class="team-actions">${actions}</td></tr>`;
  }
  function render() {
    const container = document.getElementById("team-content");
    if (!container) return;
    const reload = document.getElementById("team-reload");
    if (reload) reload.disabled = state.status === "loading";
    const invite = document.getElementById("team-invite");
    if (invite) invite.disabled = state.status !== "ok" || state.missing || Boolean(state.dialog);
    if (state.missing) {
      container.innerHTML = `<article class="overview-card not-applied" data-team-missing><p class="eyebrow">Chưa áp dụng — cần backend</p><h2>Thành viên & quyền</h2><p class="muted">Máy chủ chưa có các hàm quản lý thành viên. Cần Owner áp dụng migration <code>${escape(MIGRATION)}</code> và deploy hàm <code>${escape(FUNCTION_NAME)}</code>.</p></article>`;
      return;
    }
    if (state.status === "error") { container.innerHTML = `<p class="muted">Không tải được danh sách thành viên. Thử tải lại.</p>`; return; }
    if (state.status !== "ok") { container.innerHTML = ""; return; }
    const notice = state.notice ? `<p class="team-notice ${escape(state.notice.kind)}" data-team-notice role="status">${escape(state.notice.text)}</p>` : "";
    const dialog = state.dialog ? dialogHtml(state.dialog) : "";
    const rows = state.members.map(memberRow).join("");
    const legend = state.matrix ? `<details class="team-matrix"><summary>Xem bảng quyền của từng vai trò</summary><div class="team-matrix-grid">${ROLES.map(role => `<article><h3>${escape(roleLabels[role])}</h3><p class="muted">${escape(roleSummaries[role])}</p>${capabilityLists(role)}</article>`).join("")}</div></details>` : "";
    container.innerHTML = `${notice}${dialog}<table class="team-table"><thead><tr><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th>Đăng nhập gần nhất</th><th>Thao tác</th></tr></thead><tbody>${rows || `<tr><td colspan="6" class="muted">Chưa có thành viên nào.</td></tr>`}</tbody></table>${legend}`;
    if (state.dialog) syncDialog(true);
  }
  // Updates the live parts of an open dialog without re-rendering it (keeps the typed email and focus).
  function syncDialog(initial = false) {
    const box = document.querySelector("[data-team-dialog]");
    if (!box || !state.dialog) return;
    const dialog = state.dialog;
    if (dialog.mode !== "revoke") {
      box.querySelectorAll(".team-role").forEach(label => label.classList.toggle("selected", label.querySelector("input")?.value === dialog.role));
      const slot = box.querySelector("[data-team-caps-slot]");
      if (slot && slot.firstElementChild?.dataset.teamCaps !== dialog.role) slot.innerHTML = capabilityLists(dialog.role);
      const warning = box.querySelector("[data-team-owner-warning]");
      if (warning) warning.hidden = dialog.role !== "owner";
      const confirm = box.querySelector("[data-team-owner-confirm]");
      if (confirm) confirm.checked = Boolean(dialog.confirmOwner);
      if (initial && dialog.mode === "invite") { const email = box.querySelector("[data-team-email]"); if (email) email.value = dialog.email || ""; }
    }
    const error = box.querySelector("[data-team-dialog-error]");
    if (error) error.textContent = dialog.error || "";
    const submit = box.querySelector("[data-team-submit]");
    if (submit) {
      const emailOk = dialog.mode !== "invite" || validEmail(dialog.email);
      const ownerOk = dialog.mode === "revoke" || dialog.role !== "owner" || dialog.confirmOwner;
      const unchanged = dialog.mode === "role" && dialog.member.activeRoles?.length === 1 && dialog.member.activeRoles[0] === dialog.role;
      submit.disabled = Boolean(dialog.busy) || !emailOk || !ownerOk || unchanged;
      submit.textContent = dialog.busy ? "Đang xử lý…" : submitLabels[dialog.mode];
    }
    box.querySelectorAll("input, [data-team-cancel]").forEach(element => { element.disabled = Boolean(dialog.busy); });
  }
  const validEmail = value => typeof value === "string" && value.trim().length >= 3 && value.trim().length <= 254
    && /^[^@\s]+@[^@\s]+\.[^@\s.]+$/.test(value.trim());
  async function load() {
    if (state.status === "loading") return;
    const session = await window.NilazaAdminSessionPromise;
    const account = window.NilazaAdminSession?.userId || "";
    if (!session || !account || typeof window.NilazaAdminRpc !== "function") { status("Chưa xác minh được phiên đăng nhập. Tải lại trang hoặc đăng nhập lại."); return; }
    const version = ++epoch;
    const notice = state.notice;
    state = fresh();
    state.notice = notice;
    state.status = "loading";
    status("Đang tải…");
    render();
    try {
      const [team, matrix] = await Promise.all([
        window.NilazaAdminRpc("list_admin_team", {}, CAP),
        window.NilazaAdminRpc("get_admin_role_matrix", {}, CAP)
      ]);
      if (version !== epoch || window.NilazaAdminSession?.userId !== account) return;
      if (!team || !Array.isArray(team.members)) throw Error("invalid_response");
      state.members = team.members.filter(member => member && typeof member.userId === "string");
      state.invitesToday = Number(team.invitesToday) || 0;
      state.inviteDailyCap = Number(team.inviteDailyCap) || 0;
      state.matrix = matrix && Array.isArray(matrix.roles) && Array.isArray(matrix.capabilities) ? matrix : null;
      state.status = "ok";
      const active = state.members.filter(member => member.activeRoles?.length).length;
      status(`Cập nhật lúc ${new Date().toLocaleTimeString("vi-VN")} · ${active} thành viên đang có quyền.`);
    } catch (error) {
      if (version !== epoch) return;
      if (error?.missingFunction) { state.missing = true; state.status = "ok"; status("Chưa áp dụng trên máy chủ này."); }
      else { state.status = "error"; status("Không tải được danh sách thành viên."); }
    }
    render();
  }
  function openDialog(mode, member) {
    if (state.status !== "ok" || state.missing) return;
    const current = member?.activeRoles?.[0];
    state.dialog = { mode, member: member || null, role: mode === "invite" ? "editor" : current || "editor", confirmOwner: false, email: "", busy: false, error: "" };
    state.notice = null;
    render();
    document.querySelector(mode === "invite" ? "[data-team-email]" : "[data-team-dialog] [data-team-submit]")?.focus?.();
  }
  function closeDialog() { state.dialog = null; render(); document.getElementById("team-invite")?.focus?.(); }
  const rpcError = error => error?.missingFunction ? "migration_missing" : codeToError[error?.code] || "invite_failed";
  function endpoint() {
    const base = typeof window.ENV?.SUPABASE_URL === "string" ? window.ENV.SUPABASE_URL.trim().replace(/\/$/, "") : "";
    return base ? `${base}/functions/v1/${FUNCTION_NAME}` : "";
  }
  function inviteResult(body, email) {
    const who = email;
    if (body.status === "invited") return { kind: "ok", text: `Đã gửi email mời tới ${who} với vai trò ${roleLabels[body.role] || body.role}. Người này bấm liên kết trong email để đặt mật khẩu rồi đăng nhập.` };
    if (body.status === "assigned") return { kind: "ok", text: `${who} đã có tài khoản Nilaza, nên được cấp vai trò ${roleLabels[body.role] || body.role} ngay, không gửi email. Hãy báo họ đăng nhập Admin bằng tài khoản hiện có.` };
    if (body.status === "already_member") return { kind: "info", text: `${who} đã là thành viên (${roleText(body.roles)}). Dùng nút “Đổi vai trò” trên dòng của họ nếu muốn đổi quyền.` };
    return null;
  }
  async function submit() {
    const dialog = state.dialog;
    if (!dialog || dialog.busy) return;
    const version = epoch;
    dialog.busy = true; dialog.error = "";
    syncDialog();
    let done = null;
    try {
      if (dialog.mode === "invite") {
        const email = String(dialog.email || "").trim().toLowerCase();
        const url = endpoint();
        if (!url || typeof window.NilazaAdminRequest !== "function") throw Object.assign(Error("no_endpoint"), { team: "invite_failed" });
        const response = await window.NilazaAdminRequest(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role: dialog.role, confirmOwner: dialog.role === "owner" && dialog.confirmOwner === true }) }, CAP);
        const body = await response.json().catch(() => ({}));
        if (response.status === 404 && body?.error !== "member_not_found") throw Object.assign(Error("missing"), { team: "function_missing" });
        if (!response.ok) throw Object.assign(Error("refused"), { team: errorText[body?.error] ? body.error : "invite_failed" });
        done = inviteResult(body, email);
        if (!done) throw Object.assign(Error("unexpected"), { team: "invite_failed" });
      } else if (dialog.mode === "role") {
        const result = await window.NilazaAdminRpc("set_admin_member_role", { target_user_id: dialog.member.userId, role_input: dialog.role, confirm_owner: dialog.role === "owner" && dialog.confirmOwner === true }, CAP);
        done = { kind: "ok", text: result?.changed === false ? `${dialog.member.email} vẫn giữ vai trò ${roleLabels[dialog.role]}.` : `Đã đổi ${dialog.member.email} sang vai trò ${roleLabels[dialog.role]}. Thay đổi đã ghi vào Lịch sử thao tác.` };
      } else {
        await window.NilazaAdminRpc("revoke_admin_member", { target_user_id: dialog.member.userId }, CAP);
        done = { kind: "ok", text: `Đã thu hồi quyền của ${dialog.member.email}. Thay đổi đã ghi vào Lịch sử thao tác.` };
      }
    } catch (error) {
      if (version !== epoch || state.dialog !== dialog) return;
      const key = error?.team || rpcError(error);
      dialog.busy = false;
      dialog.error = errorText[key] || errorText.invite_failed;
      syncDialog();
      return;
    }
    if (version !== epoch) return;
    state.dialog = null;
    state.notice = done;
    await load();
  }
  window.NilazaClearSensitiveAdminState = () => { epoch++; state = fresh(); status("Phiên đã thay đổi. Bấm Tải lại để xem danh sách thành viên."); render(); };
  document.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("#team-reload")) { void load(); return; }
    if (target.closest("#team-invite")) { openDialog("invite"); return; }
    if (target.closest("[data-team-cancel]")) { if (!state.dialog?.busy) closeDialog(); return; }
    if (target.closest("[data-team-submit]")) { void submit(); return; }
    const change = target.closest("[data-team-change]");
    if (change) { const member = state.members.find(item => item.userId === change.dataset.teamChange); if (member && !member.isMe) openDialog("role", member); return; }
    const revoke = target.closest("[data-team-revoke]");
    if (revoke) { const member = state.members.find(item => item.userId === revoke.dataset.teamRevoke); if (member && !member.isMe) openDialog("revoke", member); }
  });
  function onField(event) {
    const dialog = state.dialog;
    const target = event.target;
    if (!dialog || dialog.busy || !(target instanceof Element)) return;
    if (target.matches("[data-team-email]")) dialog.email = target.value;
    else if (target.matches("[data-team-role]") && target.checked && ROLES.includes(target.value)) { dialog.role = target.value; dialog.confirmOwner = false; }
    else if (target.matches("[data-team-owner-confirm]")) dialog.confirmOwner = target.checked;
    else return;
    dialog.error = "";
    syncDialog();
  }
  document.addEventListener("input", onField);
  document.addEventListener("change", onField);
  document.addEventListener("keydown", event => { if (event.key === "Escape" && state.dialog && !state.dialog.busy) closeDialog(); });
  window.addEventListener("focus", () => { if (state.status === "idle") void load(); });
  window.NilazaTeam = Object.freeze({ load, render, get state() { return state; } });
  render();
  void load();
})();
