const allowedRoles = new Set(["owner", "admin", "editor", "safety_reviewer"]);
let manifest = null;
let session = null;
let supabaseClient = null;
const workspaceFrames = new Map();

const $ = (selector) => document.querySelector(selector);
const aiRouteFeatures = new Set(["oracle_router", "persona_chat", "ai_council", "tarot_reading", "daily_insight", "astrology", "face_reading", "notifications"]);
const aiWorkflowSections = new Set(["payload", "dataMindmap", "optimization"]);

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
    <button class="workspace-button ${item.id === workspace.id ? "active" : ""}" data-workspace="${item.id}">${item.label}</button>`).join("");
  $("#route-bar").innerHTML = workspace.routes.map((item) => `
    <button class="route-button ${item.id === route.id ? "active" : ""}" data-route="${item.id}">${item.label}</button>`).join("");
  const frames = $("#workspace-frames");
  let frame = workspaceFrames.get(workspace.id);
  if (!frame) {
    frame = document.createElement("iframe");
    frame.dataset.workspaceFrame = workspace.id;
    frame.title = `${workspace.label} workspace`;
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
  const container = $("#workspace-frames");
  if (container) container.replaceChildren();
}

async function restoreSession(user) {
  let access;
  try { access = await window.NilazaAccess.load(supabaseClient, user); } catch { access = null; }
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
    $("#login-error").textContent = "Supabase configuration is missing in config.js.";
    return showLogin();
  }

  const response = await fetch("./admin-capabilities.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Admin capability manifest could not be loaded");
  manifest = await response.json();
  renderDemoAccounts();

  const { data: { session: supabaseSession } } = await supabaseClient.auth.getSession();
  if (supabaseSession && supabaseSession.user) {
    await restoreSession(supabaseSession.user);
  } else {
    showLogin();
  }
}

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("#login-error").textContent = "Signing in...";
  const email = $("#login-email").value.trim();
  const password = $("#login-password").value;
  
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    $("#login-error").textContent = "Email or password is incorrect.";
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
  else { session = null; showLogin(); }
});
