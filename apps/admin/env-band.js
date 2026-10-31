(function () {
  // Environment band (analysis AD-13): every Admin page says which backend it writes to. Production is only
  // shown when the deploy sets it explicitly; an unknown backend is flagged instead of guessed.
  const known = {
    akgrokwnkfqnfjqrildi: "STAGING · QA",
    etfajmrwyywokgafzxsb: "STAGING · Singapore"
  };
  function describe(env) {
    const declared = String(env?.NILAZA_ENVIRONMENT || "").toLowerCase();
    let ref = "";
    try { ref = new URL(env?.SUPABASE_URL || "").hostname.split(".")[0]; } catch { ref = ""; }
    if (declared === "production") return { label: "PRODUCTION · dữ liệu thật", tone: "production" };
    if (!ref) return { label: "CHƯA CẤU HÌNH BACKEND", tone: "unknown" };
    if (/^(localhost|127\.0\.0\.1)$/.test(ref)) return { label: "LOCAL", tone: "staging" };
    return known[ref] ? { label: known[ref], tone: "staging" } : { label: `BACKEND CHƯA RÕ · ${ref}`, tone: "unknown" };
  }
  window.NilazaDescribeEnvironment = describe;
  // Workspaces open inside the shell; only the top window draws the band.
  if (window.top !== window || !document.body) return;
  const { label, tone } = describe(window.ENV);
  const colors = { staging: ["#1f4d3a", "#d6f5e3"], production: ["#7a1f2b", "#ffe3e7"], unknown: ["#6b4e00", "#fff1c7"] }[tone];
  const band = document.createElement("div");
  band.id = "nilaza-env-band";
  band.setAttribute("role", "status");
  band.textContent = `Môi trường: ${label}`;
  band.style.cssText = `position:sticky;top:0;z-index:1000;padding:4px 12px;font:600 12px/1.6 system-ui,sans-serif;letter-spacing:.04em;text-align:center;background:${colors[0]};color:${colors[1]}`;
  document.body.prepend(band);
})();
