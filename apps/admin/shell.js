const allowedRoles = new Set(["owner", "admin", "editor", "safety_reviewer"]);
let manifest = null;
let session = null;
let supabaseClient = null;
const workspaceFrames = new Map();

const $ = (selector) => document.querySelector(selector);
const aiRouteFeatures = new Set(["oracle_router", "persona_chat", "ai_council", "tarot_reading", "daily_insight", "astrology", "face_reading", "notifications"]);
const aiWorkflowSections = new Set(["payload", "dataMindmap", "optimization"]);
// Vietnamese labels for the shell (A1). Route ids stay the contract in admin-capabilities.json.
const viRouteLabels = {
  overview: { home: "Tổng quan" },
  content: { overview: "Tình trạng nội dung", personas: "Người dẫn", decks: "Bộ bài", cards: "78 lá bài", assets: "Hình ảnh", frontend: "Văn bản trong app", documentation: "Hướng dẫn Owner" },
  "ai-studio": { features: "Bật/tắt & hạn mức", context: "Dữ liệu gửi cho AI", workflow: "Luồng xử lý", prompt: "Prompt theo tính năng", "persona-studio": "Prompt người dẫn", "council-builder": "Hội đồng", "model-router": "Model chính & dự phòng", providers: "Nhà cung cấp & chuỗi model", campaigns: "Model và chiến dịch", "model-tiers": "Hạng model người dẫn", access: "Miễn phí / Premium", "trace-explorer": "Nhật ký AI", feedback: "Phản hồi người dùng", test: "Chạy thử & chấm điểm", versions: "Tất cả prompt & phiên bản", audit: "Thao tác AI" },
  timeline: { home: "Dòng thời gian chung" },
  team: { members: "Thành viên & quyền" },
  growth: { overview: "Tổng quan", "product-truth": "Sẵn sàng sản phẩm", "content-drafts": "Bản nháp nội dung", measurement: "Đo lường", roadmap: "Việc tiếp theo", waitlist: "Danh sách chờ", "campaign-map": "Bản đồ chiến dịch", "delivery-health": "Tình trạng gửi" }
};
// One left navigation for the whole Admin (A2; proposal 03/11 §5, approved by the Owner on 2026-11-13).
// Every item deep-links to routes that already exist in admin-capabilities.json, so no workspace or route is
// removed; "pending" routes are honest pages for work that still needs backend (spec 04/11 §4).
const workspaceCapability = { overview: "hub.read", content: "content.read", "ai-studio": "ai.read", timeline: "hub.read", team: "roles.manage", growth: "overview.read" };
const routeCapability = { "ai-studio/feedback": ["safety.review"] };
const navGroups = [
  { label: "", items: [{ id: "overview", label: "Tổng quan", routes: [["overview", "home"], ["content", "overview"], ["content", "documentation"]] }] },
  { label: "Nội dung", items: [
    { id: "personas", label: "Người dẫn", routes: [["content", "personas"]] },
    { id: "decks", label: "Bộ bài & 78 lá", routes: [["content", "decks"], ["content", "cards"], ["content", "assets"]] },
    { id: "app-copy", label: "Văn bản trong app", routes: [["content", "frontend"]] }
  ] },
  { label: "AI", items: [
    // Owner request 14/11: data blocks sent to the model per feature (context-config.js) sit next to switches and limits.
    { id: "ai-features", label: "Tính năng AI", routes: [["ai-studio", "features"], ["ai-studio", "access"], ["ai-studio", "context"], ["ai-studio", "workflow"]] },
    // A7: the provider table and step chains replace the pending page; the 1 primary + 1 fallback editor stays as a tab.
    { id: "providers", label: "Nhà cung cấp & Model", routes: [["ai-studio", "providers"], ["ai-studio", "model-router"]] },
    // 24/11: running chain per feature and model campaigns (A/B by variant), model-campaigns.js.
    { id: "campaigns", label: "Model và chiến dịch", routes: [["ai-studio", "campaigns"]] },
    // 25/11: one model tier per chat persona (persona-model-tiers.js).
    { id: "model-tiers", label: "Hạng model người dẫn", routes: [["ai-studio", "model-tiers"]] },
    { id: "prompts", label: "Prompt & phiên bản", routes: [["ai-studio", "versions"], ["ai-studio", "prompt"], ["ai-studio", "persona-studio"], ["ai-studio", "council-builder"]] },
    // A6: the eval page (ai-evals.js on the AI Studio Test route) replaces the pending page.
    { id: "evals", label: "Chạy thử & chấm điểm", routes: [["ai-studio", "test"]] }
  ] },
  { label: "Vận hành", items: [
    { id: "feedback", label: "Phản hồi người dùng", routes: [["ai-studio", "feedback"]] },
    { id: "traces", label: "Nhật ký AI", routes: [["ai-studio", "trace-explorer"]] },
    // A3: the shared timeline (get_admin_timeline, hub.read) replaces the pending page; AI actions stay a tab.
    { id: "audit", label: "Lịch sử thao tác", routes: [["timeline", "home"], ["ai-studio", "audit"]] },
    // 14/11: members and their roles (roles.manage, Owner only); spec 04/11 §3.15 pairs the permission table with Audit.
    { id: "team", label: "Thành viên & quyền", routes: [["team", "members"]] }
  ] },
  { label: "", items: [{ id: "growth", label: "Tăng trưởng", routes: "growth" }] }
];
const pendingPages = {};
const can = capability => window.NilazaAccess?.can(session, capability) === true;
function routeLabel(workspaceId, routeId) {
  if (workspaceId === "pending") return pendingPages[routeId]?.label || routeId;
  return viRouteLabels[workspaceId]?.[routeId] || manifest?.workspaces.find(item => item.id === workspaceId)?.routes.find(item => item.id === routeId)?.label || routeId;
}
function routeAllowed(workspaceId, routeId) {
  if (!session) return false;
  if (workspaceId === "pending") return Object.hasOwn(pendingPages, routeId) && can(pendingPages[routeId].capability);
  const workspace = manifest?.workspaces.find(item => item.id === workspaceId);
  if (!workspace?.routes.some(item => item.id === routeId) || !workspaceCapability[workspaceId]) return false;
  return [workspaceCapability[workspaceId], ...(routeCapability[`${workspaceId}/${routeId}`] || [])].every(can);
}
function navRoutes(item) {
  const routes = item.routes === "growth"
    ? (manifest?.workspaces.find(workspace => workspace.id === "growth")?.routes || []).map(route => ["growth", route.id])
    : item.routes;
  return routes.filter(([workspaceId, routeId]) => routeAllowed(workspaceId, routeId));
}
// The navigation this account may use: items and groups without a permitted route are left out.
function visibleNav() {
  return navGroups.map(group => ({ ...group, items: group.items.map(item => ({ ...item, visibleRoutes: navRoutes(item) })).filter(item => item.visibleRoutes.length) }))
    .filter(group => group.items.length);
}
function firstAllowedRoute() {
  for (const group of visibleNav()) for (const item of group.items) return item.visibleRoutes[0];
  return null;
}
window.NilazaAdminNav = Object.freeze({ groups: navGroups, pendingPages, visibleNav, routeAllowed });
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
  if (workspaceId === "pending" && Object.hasOwn(pendingPages, routeId)) return { workspace: { id: "pending", routes: [] }, route: { id: routeId }, query: "", pending: routeId };
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
  const environment = window.NilazaDescribeEnvironment?.(window.ENV)?.label || "CHƯA RÕ MÔI TRƯỜNG";
  $("#environment-label").textContent = `Đang ghi vào: ${environment}`;
  renderRoute();
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function renderNav(nav, activeItem) {
  $("#workspace-nav").innerHTML = nav.map((group, index) => {
    const items = group.items.map(item => `<button type="button" class="nav-item ${item.id === activeItem?.id ? "active" : ""}" data-nav="${item.id}" ${item.id === activeItem?.id ? 'aria-current="page"' : ""}>${escapeHtml(item.label)}</button>`).join("");
    return group.label
      ? `<div class="nav-group" role="group" aria-labelledby="nav-group-${index}"><p class="nav-group-label" id="nav-group-${index}">${escapeHtml(group.label)}</p>${items}</div>`
      : `<div class="nav-group nav-group-single">${items}</div>`;
  }).join("");
}
function renderPendingPage(id) {
  const page = pendingPages[id];
  const [workspaceId, routeId, label] = page.next;
  $("#pending-page").innerHTML = `<div class="pending-card" role="note"><p class="eyebrow">Chưa áp dụng — cần backend (bước ${page.step})</p>
    <h1>${escapeHtml(page.title)}</h1>${page.lines.map(line => `<p>${escapeHtml(line)}</p>`).join("")}
    ${routeAllowed(workspaceId, routeId) ? `<button type="button" class="secondary" data-go-workspace="${workspaceId}" data-go-route="${routeId}">${escapeHtml(label)}</button>` : ""}</div>`;
}
function renderRoute() {
  if (!manifest || !session || !allowedRoles.has(session.role)) return;
  const current = parseRoute();
  const { workspace, route, query } = current;
  if (!routeAllowed(workspace?.id, route?.id)) {
    // A deep link to a page this account may not open goes to the first page it may open.
    const first = firstAllowedRoute();
    const target = first ? `#/${first[0]}/${first[1]}` : "";
    // replace(), not an assignment: the denied address must not stay in history, or Back would bounce here again.
    if (target && location.hash !== target) { location.replace(target); return; }
  }
  const nav = visibleNav();
  const items = nav.flatMap(group => group.items.map(item => ({ item, group })));
  const active = items.find(({ item }) => item.visibleRoutes.some(([w, r]) => w === workspace.id && r === route.id));
  renderNav(nav, active?.item);
  $("#shell-breadcrumb").textContent = active ? [active.group.label, active.item.label].filter(Boolean).join(" › ") : routeLabel(workspace.id, route.id);
  const subRoutes = active?.item.visibleRoutes || [];
  const routeBar = $("#route-bar");
  routeBar.hidden = subRoutes.length < 2;
  routeBar.innerHTML = subRoutes.length < 2 ? "" : subRoutes.map(([w, r]) => {
    const on = w === workspace.id && r === route.id;
    return `<button type="button" class="route-button ${on ? "active" : ""}" data-route-workspace="${w}" data-route="${r}" ${on ? 'aria-current="page"' : ""}>${escapeHtml(routeLabel(w, r))}</button>`;
  }).join("");
  const pendingPage = $("#pending-page");
  pendingPage.hidden = !current.pending;
  $("#workspace-frame-wrap").hidden = Boolean(current.pending);
  if (current.pending) {
    renderPendingPage(current.pending);
    for (const workspaceFrame of workspaceFrames.values()) {
      if (!workspaceFrame.hidden) workspaceFrame.contentWindow?.NilazaClearSensitiveAdminState?.();
      workspaceFrame.hidden = true;
      workspaceFrame.setAttribute("aria-hidden", "true");
      workspaceFrame.tabIndex = -1;
    }
    return;
  }
  pendingPage.replaceChildren();
  const frameHash = `${route.id}${query ? `?${query}` : ""}`;
  const frames = $("#workspace-frames");
  let frame = workspaceFrames.get(workspace.id);
  if (!frame) {
    frame = document.createElement("iframe");
    frame.dataset.workspaceFrame = workspace.id;
    frame.title = `Trang ${active?.item.label || routeLabel(workspace.id, route.id)}`;
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
  if (!location.hash || location.hash === "#login") setRoute("overview", "home");
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
  const button = event.target.closest("[data-nav]");
  if (!button || !session) return;
  const item = visibleNav().flatMap(group => group.items).find(entry => entry.id === button.dataset.nav);
  const [workspaceId, routeId] = item?.visibleRoutes[0] || [];
  if (workspaceId) setRoute(workspaceId, routeId);
});
$("#route-bar").addEventListener("click", (event) => {
  const button = event.target.closest("[data-route]");
  if (!button || !routeAllowed(button.dataset.routeWorkspace, button.dataset.route)) return;
  setRoute(button.dataset.routeWorkspace, button.dataset.route);
});
$("#pending-page").addEventListener("click", (event) => {
  const button = event.target.closest("[data-go-route]");
  if (!button || !routeAllowed(button.dataset.goWorkspace, button.dataset.goRoute)) return;
  setRoute(button.dataset.goWorkspace, button.dataset.goRoute);
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
