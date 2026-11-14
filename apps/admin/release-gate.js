(function () {
  // Release gate shown in the publish dialogs (Admin A6; spec 04/11 §5.1, migration 20261113110000).
  // Two layers: the automatic safety layer (format + safety of every case, crisis cases answered with 115) is never
  // bypassable; the quality layer (>= 8/10 cases scored >= 7, voice not worse than the running version) may be bypassed
  // only by ai.manage with a reason and a note, and the version is then marked "Chưa chấm" until it is scored.
  // The server decides again at publish time (publish_* refuse with NZE01 / NZE02); this module only explains the state.
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const MIGRATION = "20261113110000";
  const MISSING_NOTE = `Máy chủ chưa có cổng chạy thử — cần Owner áp migration ${MIGRATION}_ai_eval_release_gate.sql. Cho tới khi áp, máy chủ phát hành như trước (chưa kiểm chạy thử).`;
  const REASONS = Object.freeze([["restore_passed_version", "Khôi phục bản đã đạt"], ["urgent_safety_fix", "Sửa khẩn cấp an toàn"]]);
  const SAFETY = { passed: "Đạt", failed: "Không đạt — có câu sai định dạng hoặc không an toàn", not_run: "Chưa chạy thử bản nháp này", running: "Đang chạy thử", stale: "Bản nháp đã đổi sau lần chạy thử — cần chạy lại" };
  const QUALITY = { passed: "Đạt", failed: "Không đạt", pending: "Chưa chấm đủ", not_run: "Chưa có" };
  const ERRORS = {
    NZE01: "Máy chủ từ chối: lớp an toàn chưa đạt cho đúng bản nháp này. Chạy thử lại ở mục Chạy thử & chấm điểm.",
    NZE02: "Máy chủ từ chối: lớp chất lượng chưa đạt. Chấm điểm đủ, hoặc Owner chọn lý do bỏ qua.",
    "22023": "Máy chủ không nhận lý do hoặc ghi chú bỏ qua (cần chọn một lý do và ghi chú 10–500 ký tự)."
  };

  async function load(targetKind, targetId) {
    if (typeof window.NilazaAdminRpc !== "function" || !targetId) return { status: "error" };
    try {
      const gate = await window.NilazaAdminRpc("get_ai_eval_gate", { target_kind_input: targetKind, target_id_input: targetId }, "ai.read");
      if (!gate || typeof gate !== "object" || !Object.hasOwn(SAFETY, gate.safety)) return { status: "error" };
      return { status: "ok", gate };
    } catch (error) {
      return { status: error?.missingFunction ? "missing" : "error" };
    }
  }
  function bypassValid(bypass) {
    const note = String(bypass?.note ?? "").trim();
    return REASONS.some(([value]) => value === bypass?.reason) && note.length >= 10 && note.length <= 500;
  }
  /** mode: ungated (no gate on this server), normal, bypass (quality bypass needed), blocked, loading. */
  function decide(state, bypass) {
    if (!state || state.status === "loading") return { allowed: false, mode: "loading" };
    if (state.status === "missing") return { allowed: true, mode: "ungated" };
    if (state.status !== "ok") return { allowed: false, mode: "blocked" };
    if (state.gate.safety !== "passed") return { allowed: false, mode: "blocked" };
    if (state.gate.quality === "passed") return { allowed: true, mode: "normal" };
    return { allowed: bypassValid(bypass), mode: "bypass" };
  }
  function money(micro) { return Number.isFinite(Number(micro)) ? `${(Number(micro) / 1_000_000).toFixed(2)} USD` : "—"; }
  function runLine(gate) {
    const run = gate?.run;
    if (!run) return "";
    const summary = run.qualitySummary || {};
    const cases = Number.isInteger(summary.cases) ? ` · ${summary.passedCases ?? 0}/${summary.cases} câu đạt chất lượng` : "";
    return `<p class="muted">Lần chạy gần nhất: ${escape(run.startedAt || "")} · bộ “${escape(run.setName || "")}” · ${escape(run.caseCount)} câu · chi phí ${escape(money(run.costMicro ?? run.reservedMicro))}${escape(cases)}</p>`;
  }
  /** One gate summary; label names the draft (e.g. "VI"). */
  const NO_ADAPTER_NOTE = "Đọc sâu Chiêm tinh chưa có bộ chạy thử tự động nên bản này chưa qua được cổng. Prompt Chiêm tinh vẫn phát hành được ở phần Chiêm tinh của AI Studio (cặp VI + EN, đường cũ chưa có cổng).";
  /** feature: the runtime feature or prompt feature id; Astrology has no eval adapter yet. */
  function renderState(state, label, feature) {
    const noAdapter = feature === "astrology_insight" || feature === "astrology_report";
    const title = label ? `<strong>${escape(label)}:</strong> ` : "";
    if (!state || state.status === "loading") return `<p class="muted">${title}Đang tải cổng chạy thử…</p>`;
    if (state.status === "missing") return `<div class="warning-card" role="note"><p>${title}${escape(MISSING_NOTE)}</p></div>`;
    if (state.status !== "ok") return `<p class="warning-card" role="note">${title}Không tải được cổng chạy thử. Tải lại rồi mở lại hộp này.</p>`;
    const gate = state.gate;
    const quality = gate.quality === "passed" && gate.restoredFromPassed ? "Đạt (cùng nội dung với một bản đã đạt cổng trước đây)" : QUALITY[gate.quality] || "Chưa có";
    return `<div class="gate-box" data-gate-safety="${escape(gate.safety)}" data-gate-quality="${escape(gate.quality)}">
      <p>${title}Lớp an toàn tự động: <span class="pill ${gate.safety === "passed" ? "state-on" : "state-off"}">${escape(SAFETY[gate.safety])}</span>
        · Lớp chất lượng: <span class="pill ${gate.quality === "passed" ? "state-on" : "state-off"}">${escape(quality)}</span></p>
      ${noAdapter && gate.safety !== "passed" ? `<p class="muted" data-gate-no-adapter>${escape(NO_ADAPTER_NOTE)}</p>` : ""}
      ${runLine(gate)}</div>`;
  }
  /** The Owner-only bypass form; only rendered for ai.manage when the safety layer passed and quality did not. */
  function renderBypass(prefix, bypass) {
    return `<fieldset class="gate-bypass" id="${prefix}-bypass"><legend>Bỏ qua lớp chất lượng (chỉ Owner)</legend>
      <p class="muted">Lớp an toàn không bao giờ bỏ qua được. Bản phát hành sẽ mang nhãn “Chưa chấm” và Tổng quan nhắc chấm lại trong 24 giờ.</p>
      ${REASONS.map(([value, label]) => `<label class="radio-row"><input type="radio" name="${prefix}-bypass-reason" value="${value}" data-gate-reason ${bypass?.reason === value ? "checked" : ""}> ${escape(label)}</label>`).join("")}
      <label for="${prefix}-bypass-note">Ghi chú lý do (bắt buộc, 10–500 ký tự)</label>
      <textarea class="input" id="${prefix}-bypass-note" data-gate-note rows="2" maxlength="500">${escape(bypass?.note ?? "")}</textarea>
    </fieldset>`;
  }
  function badge(row) {
    if (row?.gateStatus === "bypassed_pending") return '<span class="pill badge-unscored" title="Phát hành khi chưa chấm đủ; cần chấm lại trong 24 giờ">Chưa chấm</span>';
    return "";
  }
  function errorMessage(error) { return ERRORS[error?.code] || null; }
  window.NilazaReleaseGate = Object.freeze({ MIGRATION, MISSING_NOTE, NO_ADAPTER_NOTE, REASONS, load, decide, bypassValid, renderState, renderBypass, badge, errorMessage, money });
})();
