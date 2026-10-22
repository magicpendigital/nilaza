import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { adminRuntimeConfig, adminPublicPath } from "./admin-runtime-config.mjs";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const runtimeConfig = adminRuntimeConfig();
const mime = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".mjs":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".svg":"image/svg+xml" };

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url || "/", "http://localhost");
  if (requestUrl.pathname === "/") { response.writeHead(302, { Location: "/apps/admin/" }); response.end(); return; }
  let decoded;
  try { decoded = decodeURIComponent(requestUrl.pathname); } catch (_error) { response.writeHead(400); response.end("Bad request"); return; }
  const relative = decoded.replace(/^\/+/, "");
  if (!adminPublicPath(relative)) { response.writeHead(403); response.end("Forbidden"); return; }
  let target = path.resolve(root, relative);
  if (!target.startsWith(path.resolve(root) + path.sep) && target !== path.resolve(root)) { response.writeHead(403); response.end("Forbidden"); return; }
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) { response.writeHead(404); response.end("Not found"); return; }
  response.writeHead(200, { "Content-Type": mime[path.extname(target).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
  if (relative === "apps/admin/config.js" && runtimeConfig) response.write(runtimeConfig);
  fs.createReadStream(target).pipe(response);
});
server.listen(port, "127.0.0.1", () => console.log(`Nilaza Admin: http://localhost:${port}/apps/admin/`));
