const allowedRoles = new Set(["owner", "admin", "editor", "safety_reviewer"]);
let manifest = null;
let session = null;
let supabaseClient = null;
const workspaceFrames = new Map();

const $ = (selector) => document.querySelector(selector);
const aiRouteFeatures = new Set(["oracle_router", "persona_chat", "ai_council", "tarot_reading", "daily_insight", "astrology", "face_reading", "notifications"]);
const aiWorkflowSections = new Set(["payload", "dataMindmap", "optimization"]);
// Vietnamese labels for the shell (A1). Route ids stay the contract in admin-capabilities.json.
const viWorkspaceLabels = { content: "Nội dung", "ai-studio": "AI Studio", growth: "Tăng trưởng" };
const viRouteLabels = {
  content: { overview: "Tổng quan", personas: "Người dẫn", decks: "Bộ bài", cards: "Thư viện lá bài", assets: "Hình ảnh", frontend: "Văn bản trong app", documentation: "Hướng dẫn Owner" },
  "ai-studio": { workflow: "Luồng xử lý", prompt: "Soạn prompt", "persona-studio": "Prompt người dẫn", "council-builder": "Hội đồng", "model-router": "Chọn model", "trace-explorer": "Nhật ký AI", feedback: "Phản hồi", test: "Chạy thử", versions: "Phiên bản", audit: "Lịch sử thao tác" },
  growth: { overview: "Tổng quan", "product-truth": "Sẵn sàng sản phẩm", "content-drafts": "Bản nháp nội dung", measurement: "Đo lường", roadmap: "Việc tiếp theo", waitlist: "Danh sách chờ", "campaign-map": "Bản đồ chiến dịch", "delivery-health": "Tình trạng gửi" }
};
const workspaceLabel = item => viWorkspaceLabels[item.id] || item.label;
const routeLabel = (workspaceId, item) => viRouteLabels[workspaceId]?.[item.id] || item.label;
// Unsaved changes reported by each workspace frame through unsaved-changes.js.
const unsavedByWorkspace = new Map();
function renderUnsavedIndicator() {
  let total = 0;
  for (const value of unsavedByWorkspace.values()) total += value;
  const indicator = $("#unsaved-indicator");
  if (indicator) {
    indicator.textContent = total ? `${total} thay đổi chưa lưu` : "";
    indicator.hidden = !total;
  }
  window.NilazaUnsaved?.set("workspaces", total);
  return total;
}

function safeAiRouteQuery(query, routeId) {
  const source = typeof query === "string" ? new URLSearchParams(query) : query;
  const output = new URLSearchParams();
  const feature = source.get("feature");
  const locale = source.get("locale");
  const section = source.get("section");
  if (aiRouteFeatures.has(feature)) output.set("feature", feature);
  if (["vi", "en"].includes(locale)) output.set("locale", locale);
  if (routeId === "workflow" && aiWorkflowSections.has(section) && section !== "payload") output.set("section", section);
  return output.toString();
}

function parseRoute() {
  const [routePath, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
  const [workspaceId, routeId] = routePath.split("/");
  const workspace = manifest?.workspaces.find((item) => item.id === workspaceId) || manifest?.workspaces[0];
  const route = workspace?.routes.find((item) => item.id === routeId) || workspace?.routes[0];
  return { workspace, route, query: workspace?.id === "ai-studio" ? safeAiRouteQuery(query, route?.id) : "" };
}
function setRoute(workspaceId, routeId) {
  const current = parseRoute();
  const query = workspaceId === "ai-studio" && current.workspace?.id === workspaceId
    ? safeAiRouteQuery(current.query, routeId) : "";
  location.hash = `#/${workspaceId}/${routeId}${query ? `?${query}` : ""}`;
}
function renderDemoAccounts() {
  $("#demo-accounts").innerHTML = "";
}
function showLogin() {
  clearWorkspaceFrames();
  $("#login-screen").hidden = false;
  $("#access-screen").hidden = true;
  $("#admin-shell").hidden = true;
}
function showDenied() {
  clearWorkspaceFrames();
  $("#login-screen").hidden = true;
  $("#access-screen").hidden = false;
  $("#admin-shell").hidden = true;
  const message = $("#access-message");
  if (message) message.textContent = sessionNoticeMessage("denied");
}
function showAdmin() {
  $("#login-screen").hidden = true;
  $("#access-screen").hidden = true;
  $("#admin-shell").hidden = false;
  $("#account-role").textContent = `${session.email} · ${session.role}`;
  renderRoute();
}
function renderRoute() {
  if (!manifest || !session || !allowedRoles.has(session.role)) return;
  const { workspace, route, query } = parseRoute();
  const frameHash = `${route.id}${query ? `?${query}` : ""}`;
  $("#workspace-nav").innerHTML = manifest.workspaces.map((item) => `
    <button class="workspace-button ${item.id === workspace.id ? "active" : ""}" data-workspace="${item.id}" ${item.id === workspace.id ? 'aria-current="page"' : ""}>${workspaceLabel(item)}</button>`).join("");
  $("#route-bar").innerHTML = workspace.routes.map((item) => `
    <button class="route-button ${item.id === route.id ? "active" : ""}" data-route="${item.id}" ${item.id === route.id ? 'aria-current="page"' : ""}>${routeLabel(workspace.id, item)}</button>`).join("");
  const frames = $("#workspace-frames");
  let frame = workspaceFrames.get(workspace.id);
  if (!frame) {
    frame = document.createElement("iframe");
    frame.dataset.workspaceFrame = workspace.id;
    frame.title = `Khu làm việc ${workspaceLabel(workspace)}`;
    frame.loading = "eager";
    frame.src = `./${workspace.entry}#${frameHash}`;
    workspaceFrames.set(workspace.id, frame);
    frames.append(frame);
  } else {
    const currentEntry = new URL(frame.src, location.href).pathname;
    const expectedEntry = new URL(`./${workspace.entry}`, location.href).pathname;
    if (currentEntry !== expectedEntry) frame.src = `./${workspace.entry}#${frameHash}`;
    else if (frame.contentWindow && frame.contentWindow.location.hash !== `#${frameHash}`) {
      frame.contentWindow.location.hash = frameHash;
    }
  }
  for (const [id, workspaceFrame] of workspaceFrames) {
    if (id !== workspace.id && !workspaceFrame.hidden) workspaceFrame.contentWindow?.NilazaClearSensitiveAdminState?.();
    workspaceFrame.hidden = id !== workspace.id;
    workspaceFrame.setAttribute("aria-hidden", id === workspace.id ? "false" : "true");
    workspaceFrame.tabIndex = id === workspace.id ? 0 : -1;
  }
}

function clearWorkspaceFrames() {
  for (const frame of workspaceFrames.values()) frame.remove();
  workspaceFrames.clear();
  unsavedByWorkspace.clear();
  renderUnsavedIndicator();
  const container = $("#workspace-frames");
  if (container) container.replaceChildren();
}

// A failed check while already signed in keeps the session and offers a retry (analysis AD-12).
function showConnectionNotice(user) {
  let notice = $("#nilaza-connection-notice");
  if (!notice) {
    notice = document.createElement("div");
    notice.id = "nilaza-connection-notice";
    notice.setAttribute("role", "alert");
    notice.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:1000;display:flex;gap:12px;align-items:center;padding:10px 14px;border-radius:8px;background:#2a2124;color:#f7f1e6;font:14px system-ui,sans-serif";
    document.body.append(notice);
  }
  notice.replaceChildren(Object.assign(document.createElement("span"), { textContent: `${sessionNoticeMessage("network")} Bạn vẫn đang đăng nhập.` }));
  const retry = Object.assign(document.createElement("button"), { type: "button", textContent: "Thử lại", className: "button" });
  retry.addEventListener("click", () => { notice.remove(); void restoreSession(user); });
  notice.append(retry);
}

async function restoreSession(user) {
  let access, transient = false;
  try { access = await window.NilazaAccess.load(supabaseClient, user); } catch (error) { access = null; transient = Boolean(error?.transient); }
  if (transient && session) return showConnectionNotice(user);
  if (!window.NilazaAccess.can(access, "hub.read")) {
    session = null;
    await supabaseClient.auth.signOut();
    return showDenied();
  }

  if (session?.userId && session.userId !== access.userId) clearWorkspaceFrames();
  session = { ...access, signedInAt: new Date().toISOString() };
  if (!location.hash || location.hash === "#login") setRoute("content", "personas");
  else showAdmin();
}

async function init() {
  if (window.supabase && window.ENV && window.ENV.SUPABASE_URL) {
    // Recovery belongs to recovery.html, never to the workspace hash router.
    supabaseClient = window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY, { auth: { detectSessionInUrl: false } });
    supabaseClient.auth.onAuthStateChange((event, changedSession) => {
      if (event === "SIGNED_OUT" || (changedSession?.user?.id && session?.userId && changedSession.user.id !== session.userId)) {
        session = null;
        clearWorkspaceFrames();
        showLogin();
      }
    });
  } else {
    $("#login-error").textContent = "Thiếu cấu hình máy chủ (config.js). Báo cho người phụ trách kỹ thuật.";
    return showLogin();
  }

  const response = await fetch("./admin-capabilities.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Không tải được danh sách quyền Admin. Tải lại trang.");
  manifest = await response.json();
  renderDemoAccounts();

  const { data: { session: supabaseSession } } = await supabaseClient.auth.getSession();
  if (supabaseSession && supabaseSession.user) {
    await restoreSession(supabaseSession.user);
  } else {
    showLogin();
  }
}

// Tell the common sign-in failures apart instead of always blaming the password (analysis AD-27, spec 3.1).
function signInErrorMessage(error) {
  const code = String(error?.code || "").toLowerCase(), message = String(error?.message || "").toLowerCase(), status = Number(error?.status) || 0;
  if (code === "email_not_confirmed" || message.includes("not confirmed")) return "Email chưa được xác nhận. Mở thư xác nhận rồi thử lại.";
  if (status === 429 || code.includes("rate") || message.includes("rate limit")) return "Thử quá nhiều lần. Đợi vài phút rồi thử lại.";
  if (!status || message.includes("fetch") || message.includes("network")) return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  if (code === "invalid_credentials" || status === 400) return "Email hoặc mật khẩu chưa đúng. Kiểm tra lại rồi thử lần nữa.";
  return "Chưa đăng nhập được. Thử lại sau ít phút.";
}
window.NilazaSignInErrorMessage = signInErrorMessage;
// The other causes in spec 3.1 (AD-12): no admin permission, network while checking access,
// session expired, session about to expire.
function sessionNoticeMessage(kind, minutes) {
  if (kind === "denied") return "Tài khoản này đăng nhập được app nhưng chưa có quyền quản trị. Nhờ Owner cấp quyền hoặc dùng tài khoản khác.";
  if (kind === "expired") return "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.";
  if (kind === "expiring") return `Phiên đăng nhập sắp hết hạn (còn khoảng ${Math.max(1, Math.round(Number(minutes) || 1))} phút). Lưu thay đổi rồi đăng nhập lại nếu cần.`;
  return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
}
window.NilazaSessionNoticeMessage = sessionNoticeMessage;

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("#login-error").textContent = "Đang đăng nhập…";
  const email = $("#login-email").value.trim();
  const password = $("#login-password").value;
  
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    $("#login-error").textContent = signInErrorMessage(error);
    return;
  }
  
  $("#login-error").textContent = "";
  await restoreSession(data.user);
});
$("#demo-accounts").addEventListener("click", () => {});
$("#workspace-nav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-workspace]");
  if (!button) return;
  const workspace = manifest.workspaces.find((item) => item.id === button.dataset.workspace);
  setRoute(workspace.id, workspace.routes[0].id);
});
$("#route-bar").addEventListener("click", (event) => {
  const button = event.target.closest("[data-route]");
  if (!button) return;
  const { workspace } = parseRoute();
  setRoute(workspace.id, button.dataset.route);
});
$("#logout-button").addEventListener("click", async () => {
  if (renderUnsavedIndicator() && typeof window.confirm === "function" && !window.confirm("Còn thay đổi chưa lưu. Vẫn đăng xuất?")) return;
  session = null;
  if (supabaseClient) await supabaseClient.auth.signOut();
  location.hash = "#login"; 
  showLogin(); 
});
$("#try-another-account").addEventListener("click", async () => { 
  session = null; 
  if (supabaseClient) await supabaseClient.auth.signOut();
  location.hash = "#login"; 
  showLogin(); 
});
window.addEventListener("hashchange", () => { if (session && allowedRoles.has(session.role)) { showAdmin(); renderRoute(); } });
window.addEventListener("message", event => {
  const frame = workspaceFrames.get("ai-studio");
  const message = event.data;
  if (!session || !allowedRoles.has(session.role) || !frame || frame.hidden
    || event.origin !== location.origin || event.source !== frame.contentWindow
    || !message || typeof message !== "object" || Array.isArray(message)
    || message.type !== "nilaza.admin.route" || message.workspaceId !== "ai-studio"
    || Object.keys(message).some(key => !["type", "workspaceId", "route", "featureId", "locale", "section"].includes(key))) return;
  const workspace = manifest.workspaces.find(item => item.id === "ai-studio");
  if (!workspace.routes.some(route => route.id === message.route) || !aiRouteFeatures.has(message.featureId)
    || !["vi", "en"].includes(message.locale)
    || (message.route === "workflow" ? !aiWorkflowSections.has(message.section) : message.section !== "")) return;
  const query = safeAiRouteQuery(new URLSearchParams({ feature: message.featureId, locale: message.locale, section: message.section }), message.route);
  const hash = `#/ai-studio/${message.route}?${query}`;
  if (location.hash !== hash) location.hash = hash;
});
init().catch((error) => { showLogin(); $("#login-error").textContent = error.message; });
window.addEventListener("focus", async () => {
  if (!supabaseClient || !session) return;
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (user) await restoreSession(user);
  else { session = null; showLogin(); $("#login-error").textContent = sessionNoticeMessage("expired"); }
});
window.addEventListener("message", event => {
  const message = event.data;
  if (event.origin !== location.origin || !message || typeof message !== "object" || message.type !== "nilaza.admin.unsaved") return;
  const entry = [...workspaceFrames].find(([, frame]) => frame.contentWindow === event.source);
  if (!entry) return;
  unsavedByWorkspace.set(entry[0], Math.max(0, Math.floor(Number(message.count) || 0)));
  renderUnsavedIndicator();
});
// Supabase refreshes the token by itself; this notice only appears when that refresh has not happened.
async function checkSessionExpiry() {
  const notice = $("#session-expiry-notice");
  if (!supabaseClient || !session || !notice) return;
  try {
    const { data: { session: current } = {} } = await supabaseClient.auth.getSession();
    const minutes = current?.expires_at ? (current.expires_at * 1000 - Date.now()) / 60000 : Infinity;
    notice.hidden = !(minutes > 0 && minutes < 5);
    notice.textContent = notice.hidden ? "" : sessionNoticeMessage("expiring", minutes);
  } catch { /* the next focus check reports a real expiry */ }
}
window.setInterval(() => { void checkSessionExpiry(); }, 60000);
