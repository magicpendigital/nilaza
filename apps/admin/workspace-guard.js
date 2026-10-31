(function () {
  let client;
  let generation = 0;
  let pending = null;
  let authStatus = "checking";
  const transportConfig = Object.freeze({
    url: window.ENV?.SUPABASE_URL || "",
    key: window.ENV?.SUPABASE_ANON_KEY || ""
  });
  let transportInvalidated = false;
  let transportOrigin = "";
  try { transportOrigin = new URL(transportConfig.url).origin; } catch { /* invalid configuration cannot authorize */ }
  Object.defineProperty(window, "NilazaAdminTransportTarget", { value: transportOrigin, writable: false, configurable: false });
  function requireTransport() {
    if (!transportInvalidated && transportOrigin && window.ENV?.SUPABASE_URL === transportConfig.url
      && window.ENV?.SUPABASE_ANON_KEY === transportConfig.key) return;
    if (!transportInvalidated) {
      transportInvalidated = true;
      generation++;
      pending = null;
      clear();
      window.NilazaClearSensitiveAdminState?.();
    }
    showStatus("target-changed");
    throw Error("Admin backend configuration changed; reload required");
  }
  function showStatus(status) {
    authStatus = status;
    const panel = document.getElementById?.("workspace-auth-status");
    if (!panel) return;
    panel.querySelector("p").textContent = status === "target-changed"
      ? "Cấu hình backend đã thay đổi. Tải lại trang để kết nối đúng môi trường. / Backend configuration changed. Reload to reconnect."
      : status === "checking"
      ? "Đang xác minh quyền truy cập… / Checking access…"
      : "Chưa thể xác minh phiên hoặc quyền truy cập. / Unable to verify session or access.";
    panel.querySelector("button").disabled = status === "checking";
    panel.querySelector("button").textContent = status === "target-changed" ? "Tải lại / Reload" : "Thử lại / Retry";
  }
  function mountStatus() {
    if (!document.body || document.getElementById("workspace-auth-status")) return;
    const panel = document.createElement("section");
    panel.id = "workspace-auth-status";
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");
    const message = document.createElement("p");
    const retry = document.createElement("button");
    retry.type = "button"; retry.textContent = "Thử lại / Retry";
    retry.addEventListener("click", () => { if (authStatus === "target-changed") window.location.reload(); else void refresh(); });
    const login = document.createElement("a");
    login.href = "./index.html#login"; login.target = "_top";
    login.textContent = "Về đăng nhập / Sign in";
    panel.append(message, retry, login); document.body.append(panel);
    showStatus(authStatus);
  }
  const requiredCapabilitiesByEntry = {
    "ai-studio.html": "ai.read",
    "content.html": "content.read",
    "growth.html": "overview.read"
  };
  const entry = location.pathname.split("/").pop();
  const required = requiredCapabilitiesByEntry[entry] || "content.read";
  function clear() {
    window.NilazaAdminSession = null;
    document.documentElement.dataset.adminAuthorized = "false";
  }
  let verifiedScope = null;
  function refresh() {
    try { requireTransport(); } catch { return Promise.resolve(null); }
    if (pending) return pending;
    const current = ++generation;
    // Keep the already-authorized DOM visible while a foreground refresh runs.
    // Hiding it on focus cancels the very click that focused the iframe.
    // Action authority is invalidated immediately; every action awaits refresh.
    window.NilazaAdminSession = null;
    showStatus("checking");
    let timer;
    const check = (async () => {
      client ??= window.supabase.createClient(transportConfig.url, transportConfig.key);
      const { data: { user }, error } = await client.auth.getUser();
      requireTransport();
      if (error || !user) return null;
      const session = await window.NilazaAccess.load(client, user);
      requireTransport();
      return window.NilazaAccess.can(session, required) ? session : null;
    })();
    const operation = Promise.race([check, new Promise(resolve => { timer = setTimeout(() => resolve(null), 12000); })])
      .catch(() => null).then(session => {
        if (current !== generation) return null;
        if (session && !document.hidden) {
          window.NilazaAdminSession = session;
          const nextScope = JSON.stringify([session.userId, [...(session.capabilities || [])].sort()]);
          if (verifiedScope && verifiedScope !== nextScope) window.NilazaClearSensitiveAdminState?.();
          verifiedScope = nextScope;
          document.documentElement.dataset.adminAuthorized = "true";
        } else { clear(); verifiedScope = null; window.NilazaClearSensitiveAdminState?.(); showStatus("error"); }
        return session;
      }).finally(() => {
        clearTimeout(timer);
        if (pending === operation) pending = null;
      });
    pending = operation;
    return operation;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountStatus, { once: true });
  else if (document.body) mountStatus();
  window.NilazaRequireCapability = async capability => window.NilazaAccess.can(await refresh(), capability);
  // Workspace actions reuse the signed-in Supabase session instead of asking
  // an owner to paste a bearer token into the static console. The capability
  // is refreshed immediately before each request so revocation takes effect
  // without a page reload.
  window.NilazaAdminRequest = async (url, init = {}, capability) => {
    requireTransport();
    // Never forward the owner's token to an editable/persisted arbitrary URL.
    const base = new URL(transportConfig.url);
    const target = new URL(url);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
    const method = (init.method || "GET").toUpperCase();
    const endpoints = {
      "/functions/v1/admin-ai-council-config": { GET: "ai.read", POST: "ai.manage" },
      "/functions/v1/admin-model-router-config": { GET: "ai.read", POST: "ai.manage" },
      "/functions/v1/admin-astrology-prompt-config": { GET: "ai.read", POST: "ai.manage" },
      "/functions/v1/admin-ai-trace-qa-payload": { POST: "roles.manage" },
      "/functions/v1/admin-documentation": { GET: "ai.read" }
    };
    const requiredCapability = endpoints[target.pathname]?.[method];
    if ((!local && base.protocol !== "https:") || !["https:", "http:"].includes(base.protocol)
      || base.username || base.password || base.search || base.hash || base.pathname !== "/"
      || target.origin !== base.origin || target.username || target.password || target.search || target.hash
      || !requiredCapability || capability !== requiredCapability) {
      throw Error("Untrusted admin endpoint");
    }
    const access = await refresh();
    requireTransport();
    const accessGeneration = generation;
    if (!access || !window.NilazaAccess.can(access, requiredCapability)) {
      throw Error("Admin permission denied");
    }
    const { data: { session } = {}, error } = await client.auth.getSession();
    requireTransport();
    if (error || !session?.access_token || session.user?.id !== access.userId
      || generation !== accessGeneration || window.NilazaAdminSession !== access) {
      throw Error("Admin session unavailable");
    }
    const headers = new Headers(init.headers || {});
    headers.set("Authorization", `Bearer ${session.access_token}`);
    if (transportConfig.key) headers.set("apikey", transportConfig.key);
    const response = await fetch(target.href, { ...init, method, headers, redirect: "error", credentials: "omit" });
    requireTransport();
    return response;
  };
  // AI observability and feedback review use the same refreshed session and
  // capability boundary as Edge Function requests. Keep the RPC allowlist
  // narrow so an iframe cannot turn the helper into a generic data browser.
  const allowedAdminRpcs = {
    get_ai_trace_runs: "ai.read",
    get_ai_trace_detail: "ai.read",
    search_ai_trace_runs: "ai.read",
    get_ai_admin_audit_events: "ai.read",
    get_ai_feedback_inbox: "safety.review",
    review_ai_feedback: "safety.review",
    get_ai_feature_switches: "ai.read",
    set_ai_feature_switch: "ai.manage",
    get_growth_waitlist_overview: "overview.read"
  };
  window.NilazaAdminRpc = async (name, params = {}, capability) => {
    requireTransport();
    const requiredCapability = Object.prototype.hasOwnProperty.call(allowedAdminRpcs, name)
      ? allowedAdminRpcs[name]
      : undefined;
    if (!requiredCapability || capability !== requiredCapability) throw Error("Untrusted admin RPC");
    const access = await refresh();
    requireTransport();
    const accessGeneration = generation;
    if (!access || !window.NilazaAccess.can(access, requiredCapability)) throw Error("Admin permission denied");
    const { data, error } = await client.rpc(name, params);
    requireTransport();
    if (error || accessGeneration !== generation || window.NilazaAdminSession !== access) {
      throw Error("Admin session unavailable");
    }
    return data;
  };
  window.NilazaAdminSessionPromise = refresh().then(session => {
    if (!session && window.top === window.self) window.location.replace("./index.html#login");
    return session;
  });
  window.addEventListener("focus", () => { void refresh(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      generation++;
      pending = null;
      window.NilazaAdminSession = null;
      window.NilazaClearSensitiveAdminState?.();
      showStatus("checking");
    }
    else void refresh();
  });
})();
