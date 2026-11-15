(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const copy = {
    vi: { title: "Khôi phục tài khoản", intro: "Nhập email để nhận liên kết đặt lại mật khẩu. Không cần biết mật khẩu cũ.", send: "Gửi liên kết", password: "Mật khẩu mới (ít nhất 12 ký tự)", confirm: "Nhập lại mật khẩu mới", update: "Lưu mật khẩu mới", back: "Về đăng nhập", checking: "Đang xác minh liên kết…", working: "Đang xử lý…", sent: "Nếu email này có tài khoản Nilaza, bạn sẽ nhận được liên kết đặt lại mật khẩu. Hãy kiểm tra cả thư rác.", link: "Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.", failure: "Chưa thể hoàn tất. Kiểm tra kết nối, thử lại sau một phút hoặc yêu cầu liên kết mới. Mật khẩu mới phải khác mật khẩu cũ và đáp ứng chính sách bảo mật.", length: "Mật khẩu cần ít nhất 12 ký tự.", match: "Hai mật khẩu chưa khớp.", cooldown: "Vui lòng chờ một phút trước khi gửi lại.", email: "Vui lòng nhập email hợp lệ.", done: "Đã đổi mật khẩu. Hãy đăng nhập lại bằng mật khẩu mới.", config: "Chưa có kết nối xác thực. Vui lòng liên hệ người quản trị.", again: "Yêu cầu liên kết mới", inviteTitle: "Đặt mật khẩu cho tài khoản Admin", inviteIntro: "Bạn được Owner mời vào Nilaza Admin. Hãy đặt mật khẩu để hoàn tất, rồi đăng nhập lại." },
    en: { title: "Recover your account", intro: "Enter your email to receive a password reset link. Your old password is not needed.", send: "Send reset link", password: "New password (at least 12 characters)", confirm: "Confirm new password", update: "Save new password", back: "Back to sign in", checking: "Verifying link…", working: "Working…", sent: "If this email has a Nilaza account, you will receive a password reset link. Please also check spam.", link: "This link is invalid or expired. Please request a new link.", failure: "Unable to complete. Check your connection, retry in a minute or request a new link. Your new password must differ from your old password and meet the security policy.", length: "Use at least 12 characters.", match: "Passwords do not match.", cooldown: "Please wait one minute before sending again.", email: "Please enter a valid email.", done: "Password changed. Sign in again with your new password.", config: "Authentication is not configured. Please contact the administrator.", again: "Request a new link", inviteTitle: "Set your Admin password", inviteIntro: "The Owner invited you to Nilaza Admin. Set a password to finish, then sign in again." }
  };
  let locale = "vi", status = "", busy = false, cooldownUntil = 0;
  // 14/11: invite links from "Thành viên & quyền" land here too, so the invitee sets a first password.
  const invited = /(^|[#&])type=invite(&|$)/.test(window.nilazaRecoveryFragment || "");
  const render = () => {
    const t = copy[locale];
    for (const [id, key] of Object.entries({ "recovery-title": invited ? "inviteTitle" : "title", "recovery-copy": invited ? "inviteIntro" : "intro", "request-button": "send", "password-label": "password", "confirm-label": "confirm", "update-button": "update", "recovery-back": "back", "new-link": "again" })) $(id).textContent = t[key];
    $("recovery-status").textContent = t[status] || "";
    $("request-button").disabled = busy || Date.now() < cooldownUntil;
    $("update-button").disabled = busy;
    document.documentElement.lang = locale;
  };
  $("recovery-language").addEventListener("change", event => { locale = event.target.value; render(); });
  $("new-link").addEventListener("click", () => location.replace("./recovery.html"));
  let fragment = window.nilazaRecoveryFragment || "";
  delete window.nilazaRecoveryFragment;
  if (!window.supabase || !window.ENV?.SUPABASE_URL || !window.ENV?.SUPABASE_ANON_KEY) { status = "config"; render(); return; }
  const client = window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: "implicit", storageKey: "nilaza.recovery.ephemeral" },
    global: { fetch: async (input, init) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try { return await fetch(input, { ...init, signal: controller.signal }); }
      finally { clearTimeout(timer); }
    } }
  });
  const recovery = window.NilazaRecovery.createRecovery(client);
  $("recovery-request").addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || Date.now() < cooldownUntil) return;
    busy = true; status = "working"; cooldownUntil = Date.now() + 60000; render();
    setTimeout(render, 60100);
    try {
      await recovery.request($("recovery-email").value, new URL("./recovery.html", location.href).href);
      status = "sent";
    } catch (error) { status = ["email", "cooldown"].includes(error.message) ? error.message : "failure"; }
    finally { busy = false; render(); }
  });
  $("recovery-update").addEventListener("submit", async event => {
    event.preventDefault();
    if (busy) return;
    busy = true; status = "working"; render();
    try {
      await recovery.update($("new-password").value, $("confirm-password").value);
      $("recovery-update").reset(); $("recovery-update").hidden = true; status = "done";
    } catch (error) {
      status = ["length", "match", "link"].includes(error.message) ? error.message : "failure";
      $("new-link").hidden = false;
    } finally { busy = false; render(); }
  });
  if (!fragment) { $("recovery-request").hidden = false; render(); }
  else {
    status = "checking"; render();
    recovery.accept(fragment).then(() => { status = ""; $("recovery-update").hidden = false; $("new-password").focus(); })
      .catch(() => { status = "link"; $("new-link").hidden = false; })
      .finally(render);
    fragment = "";
  }
})();
