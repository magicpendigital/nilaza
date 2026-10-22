// Only public project configuration may be emitted into the browser bundle.
export function adminRuntimeConfig(env = process.env) {
  const url = env.NILAZA_QA_SUPABASE_URL;
  const key = env.NILAZA_QA_SUPABASE_PUBLISHABLE_KEY;
  if (!url && !key) return "";
  if (!url || !key) throw Error("Both QA Supabase URL and public key are required");
  const project = new URL(url);
  if (project.protocol !== "https:" || !/^[a-z0-9]+\.supabase\.co$/.test(project.hostname)
    || project.port || project.pathname !== "/" || project.username || project.password || project.search || project.hash) {
    throw Error("Expected a hosted Supabase project URL");
  }
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  if (!publicKey) {
    try { publicKey = JSON.parse(Buffer.from(key.split(".")[1], "base64url")).role === "anon"; } catch { /* fail closed */ }
  }
  if (!publicKey) throw Error("Only a publishable/anon key may enter the browser");
  return `window.__NILAZA_ENV__=${JSON.stringify({ SUPABASE_URL: project.origin, SUPABASE_ANON_KEY: key })};\n`;
}

export function adminPublicPath(relative) {
  if (relative.split(/[\\/]/).some(part => part.startsWith("."))) return false;
  return /^(apps\/admin\/|assets\/|packages\/content\/data\/|packages\/agent-config\/)/.test(relative);
}
