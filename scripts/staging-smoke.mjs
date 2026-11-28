#!/usr/bin/env node
// Signed-in smoke test for a Nilaza staging backend, run by the Owner on their own machine.
// The password is typed into this terminal only; no token or password is printed or saved.
//   node scripts/staging-smoke.mjs                      -> Singapore staging, account prompt
//   node scripts/staging-smoke.mjs --skip-ai            -> no model call (no AI cost)
import readline from "node:readline";

const targets = {
  // Publishable keys are public by design (safe in browsers with RLS on).
  etfajmrwyywokgafzxsb: "sb_publishable_fpGX1of3HjRncjVuhPkBrw_iwzR_NHx"
};
const projectRef = "etfajmrwyywokgafzxsb";
const apiKey = targets[projectRef];
const base = `https://${projectRef}.supabase.co`;
const skipAi = process.argv.includes("--skip-ai");

function ask(question, { hidden = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) rl._writeToOutput = (text) => { if (text.includes(question)) rl.output.write(text); };
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); if (hidden) process.stdout.write("\n"); resolve(answer.trim()); }));
}

function jwtHeader(token) {
  try { return JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8")); } catch { return {}; }
}

async function call(name, init) {
  const started = Date.now();
  const response = await fetch(`${base}/functions/v1/${name}`, init);
  const text = await response.text();
  let body; try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 200) }; }
  return { status: response.status, ms: Date.now() - started, body };
}

const email = (await ask("Email tài khoản thử: ")) || "magicpendigital@gmail.com";
const password = await ask("Mật khẩu (không hiện khi gõ): ", { hidden: true });
const login = await fetch(`${base}/auth/v1/token?grant_type=password`, {
  method: "POST", headers: { apikey: apiKey, "Content-Type": "application/json" }, body: JSON.stringify({ email, password })
});
const session = await login.json().catch(() => ({}));
if (!login.ok || !session.access_token) {
  console.log(`ĐĂNG NHẬP THẤT BẠI: HTTP ${login.status} ${session.error_code ?? session.error ?? ""} ${session.msg ?? session.error_description ?? ""}`.trim());
  process.exit(1);
}
const token = session.access_token;
const header = jwtHeader(token);
console.log(`1. Đăng nhập: OK · khóa ký phiên = ${header.alg ?? "?"}${header.kid ? ` (kid ${String(header.kid).slice(0, 8)}…)` : ""}`);
const auth = { apikey: apiKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const results = [];

const credits = await call("user-credits", { method: "GET", headers: auth });
results.push(["user-credits", credits.status === 200]);
console.log(`2. Cổng verify_jwt + hàm user-credits: HTTP ${credits.status} (${credits.ms} ms) ${credits.status === 200 ? "OK" : JSON.stringify(credits.body).slice(0, 160)}`);

if (skipAi) {
  console.log("3. Bỏ qua gọi AI (--skip-ai).");
} else {
  // P1-A: the server draws (one draw per account, spread, topic and Vietnam day), then the app asks to interpret that drawId.
  // Running the smoke twice on the same day replays the stored reading (no second model call).
  const draw = await call("ai-tarot-reading", {
    method: "POST", headers: auth,
    body: JSON.stringify({ action: "draw", language: "vi", topic: "open", spread: "daily-one", question: "Hôm nay mình nên chú ý điều gì?" })
  });
  const drawId = draw.body?.drawId;
  console.log(`3a. Tarot rút lá trên máy chủ: HTTP ${draw.status} · ${drawId ? `drawId ${String(drawId).slice(0, 8)}…` : JSON.stringify(draw.body).slice(0, 160)}`);
  const tarot = drawId
    ? await call("ai-tarot-reading", { method: "POST", headers: auth, body: JSON.stringify({ action: "interpret", drawId, language: "vi" }) })
    : draw;
  const body = tarot.body ?? {};
  const source = body.provenance?.sourceKind ?? "?";
  const ok = tarot.status === 200 && body.moderationStatus === "passed" && source === "ai";
  results.push(["ai-tarot-reading", ok]);
  console.log(`3b. Tarot AI (1 lá${body.replayed ? ", bài đã lưu hôm nay, không gọi model" : ", gọi model thật"}): HTTP ${tarot.status} (${Math.round(tarot.ms / 1000)} s) · nguồn = ${source} · kiểm duyệt = ${body.moderationStatus ?? "?"}`);
  const model = body.model ?? {};
  if (model.provider || model.model) console.log(`   model: ${model.provider ?? ""} ${model.model ?? ""}${model.fallbackUsed ? " (dự phòng)" : ""}`.trimEnd());
  if (typeof body.summary === "string") console.log(`   trích: ${body.summary.replace(/\s+/g, " ").slice(0, 160)}…`);
  if (!ok) {
    const attempts = (model.attempts ?? []).map((a) => `${a.model ?? "?"}:${a.ok ? "ok" : a.code ?? "lỗi"}`).join(", ");
    console.log(`   chẩn đoán: kiểm cấu trúc = ${body.provenance?.validationStatus ?? "?"} · token ra = ${model.outputTokens ?? "?"} · lượt gọi = ${attempts || "?"}`);
    console.log("   (mã lý do chi tiết: chạy docs/release/singapore-edge-functions-2026-11-09/tarot-rejection-check.sql trong SQL Editor)");
  }
}

await fetch(`${base}/auth/v1/logout`, { method: "POST", headers: { apikey: apiKey, Authorization: `Bearer ${token}` } }).catch(() => undefined);
const failed = results.filter(([, ok]) => !ok).map(([name]) => name);
console.log(failed.length ? `KẾT QUẢ: CHƯA ĐẠT (${failed.join(", ")})` : "KẾT QUẢ: ĐẠT");
process.exitCode = failed.length ? 1 : 0;
