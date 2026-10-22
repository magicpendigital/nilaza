// Static admin builds receive environment values at deploy time. Keep the
// local demo fallback for localhost only and fail closed on hosted domains so
// a production console can never silently point at a local database.
(() => {
  const injected = window.__NILAZA_ENV__ || window.NILAZA_ENV || {};
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const defaultOnlineUrl = "https://akgrokwnkfqnfjqrildi.supabase.co";
  const defaultOnlineKey = "sb_publishable_7mmXd4RtRx2xC0Mo6HfKsA_PHDVVbXg";
  window.ENV = {
    SUPABASE_URL: typeof injected.SUPABASE_URL === "string" && injected.SUPABASE_URL.trim()
      ? injected.SUPABASE_URL.trim()
      : isLocal ? defaultOnlineUrl : "",
    SUPABASE_ANON_KEY: typeof injected.SUPABASE_ANON_KEY === "string" && injected.SUPABASE_ANON_KEY.trim()
      ? injected.SUPABASE_ANON_KEY.trim()
      : isLocal ? defaultOnlineKey : ""
  };
})();
