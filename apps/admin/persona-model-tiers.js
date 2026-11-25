(function () {
  // Hạng model người dẫn (Owner decision 25/11/2026, docs/proposals/CHAT_KNOWLEDGE_CHARACTERS_2026-11-24.vi.md section 6).
  // Each chat persona runs on one tier ("Thường", "Tri thức sâu", optional "Cao cấp"). A tier either keeps the active
  // persona_chat route or has its own primary/fallback models, reasoning, output ceiling, total wait, per-message budget,
  // history size and answer style. Lưu nháp → Xem lại & phát hành through get_ai_persona_model_tiers /
  // save_ai_persona_model_tiers_draft / publish_ai_persona_model_tiers (migration 20261125100000).
  // Rules:
  // - validate() returns the same codes as nilaza_private.ai_persona_model_tiers_errors, so the Owner sees a problem
  //   before the server refuses it (the server only returns a code, never the list);
  // - the total wait is shown together with the platform cap (Free plan: 150 s wall clock - 15 s margin = 135 s);
  // - reading needs ai.read; saving a draft ai.manage or ai.read + content.draft; publishing ai.manage (Owner);
  // - persona names come from the Admin content seed (generated/content-seed.json), never typed by hand.
  // SPEC is a copy of packages/agent-config/persona-model-tiers.json; scripts/admin-persona-model-tiers.test.mjs keeps
  // them (and the SQL spec) equal.
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const SPEC = Object.freeze(/* @persona-model-tier-spec */ {
    "tierKeys": ["standard", "deep_knowledge", "premium"],
    "defaultTier": "standard",
    "outputStyles": ["concise", "knowledge"],
    "providers": ["openai", "openrouter", "gemini", "anthropic", "deepseek"],
    "reasoningModes": ["off", "minimal", "low", "medium", "high"],
    "bounds": {
      "maxOutputTokens": { "min": 256, "max": 16000 },
      "timeoutMs": { "min": 5000, "max": 300000 },
      "primaryShare": { "min": 0.3, "max": 0.9 },
      "costCapMicro": { "min": 1000, "max": 200000 },
      "temperature": { "min": 0, "max": 1.5 },
      "reasoningMaxTokens": { "min": 64, "max": 8000 },
      "historyTurns": { "min": 0, "max": 12 },
      "historyChars": { "min": 100, "max": 2500 },
      "maxSteps": 4
    },
    "platform": { "wallClockMsAllowed": [150000, 400000], "wallClockMs": 150000, "safetyMarginMs": 15000, "nonStreamMaxMs": 140000 },
    "tiers": {
      "standard": { "label": { "vi": "Thường", "en": "Standard" }, "useActiveRoute": true, "outputStyle": "concise" },
      "deep_knowledge": {
        "label": { "vi": "Tri thức sâu", "en": "Deep knowledge" },
        "useActiveRoute": false,
        "steps": [
          { "provider": "openrouter", "model": "deepseek/deepseek-v4.1-flash" },
          { "provider": "openrouter", "model": "xiaomi/mimo-v2.6-flash" }
        ],
        "temperature": 0.6,
        "reasoning": { "mode": "medium", "maxTokens": 4000 },
        "maxOutputTokens": 8000,
        "timeoutMs": 300000,
        "primaryShare": 0.65,
        "costCapMicro": 30000,
        "history": { "turns": 12, "chars": 2500 },
        "outputStyle": "knowledge"
      }
    },
    "personaTiers": {
      "book-strategic-thinker": "deep_knowledge",
      "book-harmony-guide": "deep_knowledge",
      "book-stoic-journal": "deep_knowledge",
      "book-dhammapada": "deep_knowledge",
      "book-i-ching": "deep_knowledge"
    }
  });
  const MIGRATION = "20261125100000_persona_model_tiers.sql";
  const MIGRATION_NOTE = `Máy chủ chưa áp migration ${MIGRATION} nên chưa lưu hay phát hành được. Trò chuyện vẫn chạy theo mặc định trong mã (bảng dưới đây).`;
  const DEPLOY_NOTE = "Cấu hình chỉ có tác dụng khi ai-persona-chat đã được deploy bản biết đọc hạng model (cần Owner duyệt deploy). Bản cũ bỏ qua cấu hình này.";
  const DRAFT_RULE = "ai.manage|ai.read+content.draft";
  const TIER_NAMES = Object.freeze({ standard: "Thường", deep_knowledge: "Tri thức sâu", premium: "Cao cấp" });
  const STYLE_LABELS = Object.freeze({ concise: "Ngắn gọn (như hôm nay, kết bằng một câu hỏi)", knowledge: "Tri thức (dài hơn, 150–300 từ, câu hỏi không bắt buộc)" });
  const REASONING_LABELS = Object.freeze({ off: "Tắt", minimal: "Rất ít", low: "Thấp", medium: "Vừa", high: "Cao" });
  const TIER_KEYS_ALLOWED = ["label", "useActiveRoute", "steps", "temperature", "reasoning", "maxOutputTokens", "timeoutMs", "primaryShare", "costCapMicro", "history", "outputStyle"];
  const LABEL_PATTERN = /^\s*\S[\s\S]{0,39}$/;
  const MODEL_PATTERN = /^[a-z0-9][a-z0-9._/:-]{1,119}$/i;
  const PERSONA_KEY = /^[a-z0-9][a-z0-9-]{0,79}$/;
  const initialTransport = { target: window.NilazaAdminTransportTarget || "", url: window.ENV?.SUPABASE_URL || "", key: window.ENV?.SUPABASE_ANON_KEY || "" };

  const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const has = (object, key) => isObject(object) && Object.prototype.hasOwnProperty.call(object, key);
  const clone = value => JSON.parse(JSON.stringify(value));
  const chars = text => [...String(text)].length;
  const textOk = (value, pattern) => typeof value === "string" && pattern.test(value);
  const keysOk = (value, allowed) => isObject(value) && Object.keys(value).every(key => allowed.includes(key));
  function numberOk(value, bound, wholeOnly) {
    const range = SPEC.bounds[bound];
    if (typeof value !== "number" || !Number.isFinite(value) || !range) return false;
    if (wholeOnly && !Number.isInteger(value)) return false;
    return value >= range.min && value <= range.max;
  }

  // Mirror of nilaza_private.ai_persona_model_tiers_errors (migration 20261125100000): same checks, same codes.
  function validate(config) {
    if (!isObject(config)) return ["config_not_object"];
    const errors = [];
    for (const key of Object.keys(config)) if (!["tiers", "personaTiers", "platform"].includes(key)) errors.push(`unknown_key:${key.slice(0, 40)}`);
    let tiers = config.tiers;
    if (!isObject(tiers)) { errors.push("tiers_not_object"); tiers = {}; }
    else if (!has(tiers, "standard")) errors.push("standard_tier_missing");
    for (const [tierKey, tier] of Object.entries(tiers)) {
      if (!SPEC.tierKeys.includes(tierKey)) { errors.push(`unknown_tier:${tierKey.slice(0, 40)}`); continue; }
      if (!isObject(tier)) { errors.push(`${tierKey}:not_object`); continue; }
      for (const key of Object.keys(tier)) if (!TIER_KEYS_ALLOWED.includes(key)) errors.push(`${tierKey}:unknown_key:${key.slice(0, 40)}`);
      if (has(tier, "label")) {
        const label = tier.label;
        if (!keysOk(label, ["vi", "en"]) || !textOk(label.vi, LABEL_PATTERN) || !textOk(label.en, LABEL_PATTERN) || chars(label.vi) > 40 || chars(label.en) > 40) errors.push(`${tierKey}:label`);
      }
      if (has(tier, "useActiveRoute") && typeof tier.useActiveRoute !== "boolean") errors.push(`${tierKey}:useActiveRoute`);
      const activeRoute = typeof tier.useActiveRoute === "boolean" ? tier.useActiveRoute : true;
      if (!activeRoute) {
        if (!Array.isArray(tier.steps) || tier.steps.length < 1 || tier.steps.length > SPEC.bounds.maxSteps) errors.push(`${tierKey}:steps`);
        else for (const step of tier.steps) {
          if (!keysOk(step, ["provider", "model"])) errors.push(`${tierKey}:step`);
          else if (!textOk(step.provider, /^[a-z]+$/i) || !SPEC.providers.includes(step.provider) || !textOk(step.model, MODEL_PATTERN)) errors.push(`${tierKey}:step`);
        }
      } else if (has(tier, "steps")) errors.push(`${tierKey}:steps_need_useActiveRoute_false`);
      if (has(tier, "temperature") && !numberOk(tier.temperature, "temperature", false)) errors.push(`${tierKey}:temperature`);
      if (has(tier, "maxOutputTokens") && !numberOk(tier.maxOutputTokens, "maxOutputTokens", true)) errors.push(`${tierKey}:maxOutputTokens`);
      if (has(tier, "timeoutMs") && !numberOk(tier.timeoutMs, "timeoutMs", true)) errors.push(`${tierKey}:timeoutMs`);
      if (has(tier, "primaryShare") && !numberOk(tier.primaryShare, "primaryShare", false)) errors.push(`${tierKey}:primaryShare`);
      if (has(tier, "costCapMicro") && !numberOk(tier.costCapMicro, "costCapMicro", true)) errors.push(`${tierKey}:costCapMicro`);
      if (has(tier, "reasoning")) {
        const item = tier.reasoning;
        if (!keysOk(item, ["mode", "maxTokens"])) errors.push(`${tierKey}:reasoning`);
        else if (!textOk(item.mode, /^[a-z]+$/i) || !SPEC.reasoningModes.includes(item.mode)
          || (has(item, "maxTokens") && !numberOk(item.maxTokens, "reasoningMaxTokens", true))) errors.push(`${tierKey}:reasoning`);
      }
      if (has(tier, "history")) {
        const item = tier.history;
        if (!keysOk(item, ["turns", "chars"]) || !numberOk(item.turns, "historyTurns", true) || !numberOk(item.chars, "historyChars", true)) errors.push(`${tierKey}:history`);
      }
      if (has(tier, "outputStyle") && (!textOk(tier.outputStyle, /^[a-z_]+$/i) || !SPEC.outputStyles.includes(tier.outputStyle))) errors.push(`${tierKey}:outputStyle`);
    }
    if (has(config, "personaTiers")) {
      if (!isObject(config.personaTiers)) errors.push("personaTiers_not_object");
      else for (const [persona, target] of Object.entries(config.personaTiers)) {
        if (!PERSONA_KEY.test(persona)) { errors.push(`persona_key:${persona.slice(0, 40)}`); continue; }
        if (!textOk(target, /^[a-z_]+$/i) || !has(tiers, target)) errors.push(`persona_tier:${persona}`);
      }
    }
    if (has(config, "platform")) {
      const platform = config.platform;
      if (!keysOk(platform, ["wallClockMs"]) || !SPEC.platform.wallClockMsAllowed.includes(platform.wallClockMs)) errors.push("platform");
    }
    return errors;
  }

  const FIELD_PROBLEMS = Object.freeze({
    label: "Tên hạng (tiếng Việt và tiếng Anh) phải có chữ và tối đa 40 ký tự.",
    useActiveRoute: "Lựa chọn chuỗi model không hợp lệ.",
    steps: `Cần 1–${SPEC.bounds.maxSteps} model (model chính và dự phòng).`,
    step: "Mỗi model cần nhà cung cấp trong danh sách và mã model hợp lệ (chữ thường, số, . _ / : -, 2–120 ký tự).",
    steps_need_useActiveRoute_false: "Hạng dùng chuỗi model đang chạy không được có danh sách model riêng.",
    temperature: `Độ sáng tạo phải từ ${SPEC.bounds.temperature.min} đến ${SPEC.bounds.temperature.max}.`,
    maxOutputTokens: `Trần độ dài trả lời phải là số nguyên ${SPEC.bounds.maxOutputTokens.min}–${SPEC.bounds.maxOutputTokens.max} token.`,
    timeoutMs: `Tổng thời gian chờ phải từ ${SPEC.bounds.timeoutMs.min / 1000} đến ${SPEC.bounds.timeoutMs.max / 1000} giây.`,
    primaryShare: `Phần thời gian cho model chính phải từ ${SPEC.bounds.primaryShare.min * 100}% đến ${SPEC.bounds.primaryShare.max * 100}%.`,
    costCapMicro: `Ngân sách mỗi tin nhắn phải từ $${SPEC.bounds.costCapMicro.min / 1e6} đến $${SPEC.bounds.costCapMicro.max / 1e6}.`,
    reasoning: `Mức suy luận không hợp lệ (ngân sách suy luận ${SPEC.bounds.reasoningMaxTokens.min}–${SPEC.bounds.reasoningMaxTokens.max} token).`,
    history: `Trí nhớ cần cả số lượt (${SPEC.bounds.historyTurns.min}–${SPEC.bounds.historyTurns.max}) và số ký tự mỗi lượt (${SPEC.bounds.historyChars.min}–${SPEC.bounds.historyChars.max}).`,
    outputStyle: "Kiểu trả lời không hợp lệ.",
    not_object: "Hạng này bị hỏng; xóa rồi thêm lại."
  });
  function tierName(key, config) {
    const label = config?.tiers?.[key]?.label?.vi;
    return typeof label === "string" && label.trim() ? label.trim() : TIER_NAMES[key] || key;
  }
  // One Vietnamese sentence per validator code.
  function describeError(code, config, personaName = id => id) {
    if (code === "config_not_object" || code === "tiers_not_object") return "Cấu hình bị hỏng; tải lại trang.";
    if (code === "standard_tier_missing") return "Phải có hạng Thường.";
    if (code === "personaTiers_not_object") return "Bảng gán người dẫn bị hỏng; tải lại trang.";
    if (code === "platform") return "Gói Supabase chỉ nhận 150 s (Free) hoặc 400 s (trả phí).";
    const [head, ...rest] = code.split(":");
    if (head === "unknown_key") return `Trường lạ trong cấu hình: ${rest.join(":")}.`;
    if (head === "unknown_tier") return `Hạng lạ: ${rest.join(":")}.`;
    if (head === "persona_key") return `Mã người dẫn không hợp lệ: ${rest.join(":")}.`;
    if (head === "persona_tier") return `${personaName(rest.join(":"))}: hạng được gán không tồn tại.`;
    if (SPEC.tierKeys.includes(head)) {
      if (rest[0] === "unknown_key") return `${tierName(head, config)}: trường lạ ${rest.slice(1).join(":")}.`;
      return `${tierName(head, config)}: ${FIELD_PROBLEMS[rest[0]] || "giá trị không hợp lệ."}`;
    }
    return `Lỗi cấu hình: ${code}.`;
  }

  // The config the runtime uses when no version is published (code defaults), in the Admin payload shape.
  function defaultConfig() {
    return { tiers: clone(SPEC.tiers), personaTiers: clone(SPEC.personaTiers), platform: { wallClockMs: SPEC.platform.wallClockMs } };
  }
  // A row's config as the form edits it: personaTiers and platform always present, because a row without personaTiers
  // makes the runtime keep the code map (persona-model-tiers.ts) and the Owner should see what really runs.
  function formConfig(config) {
    const base = isObject(config) ? clone(config) : defaultConfig();
    if (!has(base, "personaTiers")) base.personaTiers = clone(SPEC.personaTiers);
    if (!has(base, "platform")) base.platform = { wallClockMs: SPEC.platform.wallClockMs };
    return base;
  }

  // Same rule as tierDeadlineMs in supabase/functions/_shared/persona-model-tiers.ts.
  function effectiveWaitMs(timeoutMs, wallClockMs, stream) {
    const wall = SPEC.platform.wallClockMsAllowed.includes(wallClockMs) ? wallClockMs : SPEC.platform.wallClockMs;
    const wallCap = Math.max(5000, wall - SPEC.platform.safetyMarginMs);
    const cap = stream ? wallCap : Math.min(SPEC.platform.nonStreamMaxMs, wallCap);
    return Math.min(typeof timeoutMs === "number" && Number.isFinite(timeoutMs) ? timeoutMs : cap, cap);
  }
  const seconds = ms => `${Math.round(ms / 100) / 10} s`.replace(".", ",");
  function usd(micro) {
    const text = (micro / 1e6).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
    return `$${text}`;
  }
  function formatBudget(micro) {
    if (typeof micro !== "number" || !Number.isFinite(micro)) return "Không đặt riêng: dùng hạn mức chi phí của tính năng.";
    return `${usd(micro)} mỗi tin nhắn (≈ ${usd(micro * 1000)} cho 1.000 tin nhắn).`;
  }
  function waitText(tier, wallClockMs) {
    if (tier?.useActiveRoute !== false) return "Dùng thời gian chờ của chuỗi model đang chạy.";
    const wanted = typeof tier.timeoutMs === "number" ? tier.timeoutMs : null;
    const stream = effectiveWaitMs(wanted, wallClockMs, true), plain = effectiveWaitMs(wanted, wallClockMs, false);
    const capped = wanted !== null && stream < wanted;
    return `Chờ thực tế: tối đa ${seconds(stream)} khi chữ hiện dần, ${seconds(plain)} với bản app cũ.${capped ? ` Đặt ${seconds(wanted)} nhưng gói ${wallClockMs === 400000 ? "trả phí" : "Free"} chỉ cho ${seconds(stream)}.` : ""}${wallClockMs !== 400000 && (wanted === null || wanted > 135000) ? " Muốn chờ tới 300 s cần chuyển Supabase sang gói trả phí và chọn 400 s ở mục Gói Supabase." : ""}`;
  }

  // ---- Readable flat view of a config, for the diff table.
  function stepText(step) { return isObject(step) ? `${step.provider ?? "?"} · ${step.model ?? "?"}` : "?"; }
  function flatten(config, personaName) {
    const rows = new Map();
    const tiers = isObject(config?.tiers) ? config.tiers : {};
    for (const key of SPEC.tierKeys) {
      const tier = tiers[key];
      const name = TIER_NAMES[key];
      if (!isObject(tier)) { rows.set(`${name} · Có hạng này`, "Không"); continue; }
      rows.set(`${name} · Có hạng này`, "Có");
      rows.set(`${name} · Tên hiển thị`, `${tier.label?.vi ?? TIER_NAMES[key]} / ${tier.label?.en ?? ""}`);
      const own = tier.useActiveRoute === false;
      rows.set(`${name} · Chuỗi model`, own ? "Model riêng" : "Chuỗi đang chạy của Trò chuyện với người dẫn");
      if (own) {
        const steps = Array.isArray(tier.steps) ? tier.steps : [];
        rows.set(`${name} · Model chính`, steps[0] ? stepText(steps[0]) : "—");
        rows.set(`${name} · Model dự phòng`, steps.length > 1 ? steps.slice(1).map(stepText).join(" → ") : "Không có");
        rows.set(`${name} · Suy luận`, isObject(tier.reasoning) ? `${REASONING_LABELS[tier.reasoning.mode] ?? tier.reasoning.mode}${tier.reasoning.maxTokens ? ` · ${tier.reasoning.maxTokens} token` : ""}` : "Không đặt");
        rows.set(`${name} · Trần độ dài trả lời`, tier.maxOutputTokens !== undefined ? `${tier.maxOutputTokens} token` : "Mặc định 2000");
        rows.set(`${name} · Tổng thời gian chờ`, typeof tier.timeoutMs === "number" ? seconds(tier.timeoutMs) : "Mặc định");
        rows.set(`${name} · Phần chờ cho model chính`, typeof tier.primaryShare === "number" ? `${Math.round(tier.primaryShare * 100)}%` : "65%");
        rows.set(`${name} · Ngân sách mỗi tin nhắn`, typeof tier.costCapMicro === "number" ? usd(tier.costCapMicro) : "Theo tính năng");
        rows.set(`${name} · Độ sáng tạo`, tier.temperature !== undefined ? String(tier.temperature) : "Mặc định 0,68");
      }
      rows.set(`${name} · Trí nhớ`, isObject(tier.history) ? `${tier.history.turns} lượt × ${tier.history.chars} ký tự` : "Như hôm nay (8 × 800)");
      rows.set(`${name} · Kiểu trả lời`, STYLE_LABELS[tier.outputStyle] || "Ngắn gọn");
    }
    const map = isObject(config?.personaTiers) ? config.personaTiers : {};
    for (const [persona, tier] of Object.entries(map)) rows.set(`Người dẫn · ${personaName(persona)}`, tierName(tier, config));
    const wall = config?.platform?.wallClockMs;
    rows.set("Gói Supabase", wall === 400000 ? "Trả phí (400 s)" : "Free (150 s)");
    return rows;
  }
  function diffRows(before, after, personaName) {
    const a = flatten(before, personaName), b = flatten(after, personaName);
    const keys = [...new Set([...a.keys(), ...b.keys()])];
    return keys.map(key => {
      const from = a.get(key) ?? (key.startsWith("Người dẫn · ") ? `${TIER_NAMES.standard} (mặc định)` : "—");
      const to = b.get(key) ?? (key.startsWith("Người dẫn · ") ? `${TIER_NAMES.standard} (mặc định)` : "—");
      return { key, from, to, changed: from !== to };
    }).filter(row => row.changed || !row.key.startsWith("Người dẫn · "));
  }

  // ---- Page state.
  let invalidated = false, active = null, epoch = 0;
  let form = { owner: "", config: null, note: "", dirty: false, stash: {} };
  const can = capability => window.NilazaAdminSession?.capabilities?.includes(capability) === true;
  const canDraft = () => can("ai.manage") || (can("ai.read") && can("content.draft"));
  async function requireDraft() {
    const require = window.NilazaRequireCapability;
    if (!require) return false;
    if (await require("ai.manage")) return true;
    return await require("ai.read") && await require("content.draft");
  }
  function scope() {
    if ((window.ENV?.SUPABASE_URL || "") !== initialTransport.url || (window.ENV?.SUPABASE_ANON_KEY || "") !== initialTransport.key) invalidated = true;
    return { account: window.NilazaAdminSession?.userId || "", target: initialTransport.target };
  }
  function current(snapshot, version) {
    const now = scope();
    return Boolean(active && version === epoch && !invalidated && can("ai.read") && now.account === snapshot.account
      && now.target === snapshot.target && active.container.isConnected);
  }
  function reportUnsaved() { window.NilazaUnsaved?.set("persona-model-tiers", form.dirty ? 1 : 0); }
  function resetForm(owner) { form = { owner, config: null, note: "", dirty: false, stash: {} }; reportUnsaved(); }
  function environmentLabel() { return window.NilazaDescribeEnvironment?.(window.ENV)?.label || "CHƯA RÕ MÔI TRƯỜNG"; }
  function rows() {
    const list = active?.rows || [];
    return { activeRow: list.find(row => row.status === "active") || null, draftRow: list.find(row => row.status === "draft") || null };
  }
  function cleanRows(value) {
    if (!Array.isArray(value)) throw Error("invalid_response");
    return value.filter(row => isObject(row) && Number.isInteger(row.version) && ["draft", "active", "archived"].includes(row.status) && isObject(row.config))
      .sort((a, b) => b.version - a.version);
  }
  function personaName(id) {
    const persona = active?.personas?.find(item => item.id === id);
    return persona ? `${persona.name} (${id})` : id;
  }
  function editConfig() {
    if (!form.config) {
      const { activeRow, draftRow } = rows();
      form.config = formConfig((draftRow || activeRow)?.config ?? null);
      form.note = draftRow && typeof draftRow.note === "string" ? draftRow.note : "";
    }
    return form.config;
  }
  function errorMessage(error, action) {
    if (error?.code === "42501") return action === "publish" ? "Tài khoản này không có quyền ai.manage (chỉ Owner phát hành)." : "Tài khoản này chưa có quyền lưu nháp (cần ai.manage, hoặc ai.read + content.draft).";
    if (error?.code === "22023") return action === "publish" ? "Máy chủ không nhận: bản nháp đã thay đổi, không còn hợp lệ hoặc ghi chú chưa đủ 10–500 ký tự. Tải lại rồi xem lại." : "Máy chủ không nhận cấu hình này (giá trị ngoài giới hạn). Kiểm tra các ô báo đỏ.";
    return action === "publish" ? "Chưa phát hành được. Tải lại rồi thử lại." : "Chưa lưu được nháp. Tải lại rồi thử lại.";
  }

  // ---- Field binding: each input names its tier, a path and a kind; the stored value stays raw when it cannot be
  // parsed, so validate() reports it instead of silently changing it.
  function getPath(object, path) { return path.split(".").reduce((value, key) => (isObject(value) ? value[key] : undefined), object); }
  // Paths are one or two levels deep (timeoutMs, history.turns, reasoning.maxTokens).
  function setPath(object, path, value) {
    const [parent, child] = path.split(".");
    if (child === undefined) { if (value === undefined) delete object[parent]; else object[parent] = value; return; }
    if (!isObject(object[parent])) object[parent] = {};
    if (value === undefined) delete object[parent][child]; else object[parent][child] = value;
    // Drop an emptied nested object (history) so "not set" means the runtime default.
    if (Object.keys(object[parent]).length === 0) delete object[parent];
  }
  const DECIMAL = /^-?\d+(?:[.,]\d+)?$/;
  function parseField(kind, raw) {
    const text = String(raw ?? "").trim();
    if (kind === "text") return raw;
    if (!text) return undefined;
    if (!DECIMAL.test(text)) return text;
    const number = Number(text.replace(",", "."));
    if (kind === "int") return number;
    if (kind === "float") return number;
    if (kind === "seconds") return Math.round(number * 1000);
    if (kind === "percent") return Math.round(number * 100) / 10000;
    if (kind === "usd") return Math.round(number * 1e6);
    return text;
  }
  function displayField(kind, value) {
    if (value === undefined || value === null) return "";
    if (typeof value !== "number") return String(value);
    if (kind === "seconds") return String(value / 1000);
    if (kind === "percent") return String(Math.round(value * 10000) / 100);
    if (kind === "usd") return String(value / 1e6);
    return String(value);
  }

  // ---- Rendering.
  function fieldInput(tierKey, path, kind, label, help, editable, attrs = "") {
    const id = `pmt-${tierKey}-${path.replace(/\./g, "-")}`;
    const value = displayField(kind, getPath(form.config.tiers[tierKey], path));
    return `<div class="config-field"><label for="${id}">${escape(label)}</label><input class="input" id="${id}" data-pmt-tier="${tierKey}" data-pmt-path="${path}" data-pmt-kind="${kind}" value="${escape(value)}" ${kind === "text" ? "" : 'inputmode="decimal"'} ${attrs} ${editable ? "" : "disabled"}>${help ? `<small class="helper">${escape(help)}</small>` : ""}</div>`;
  }
  function stepRows(tierKey, tier, editable) {
    const steps = Array.isArray(tier.steps) ? tier.steps : [];
    const providerOptions = value => SPEC.providers.map(provider => `<option value="${provider}" ${provider === value ? "selected" : ""}>${provider}</option>`).join("")
      + (value && !SPEC.providers.includes(value) ? `<option value="${escape(value)}" selected>${escape(value)} (không hợp lệ)</option>` : "");
    const list = steps.map((step, index) => {
      const id = `pmt-${tierKey}-step-${index}`;
      const role = index === 0 ? "Model chính" : `Model dự phòng ${steps.length > 2 ? index : ""}`.trim();
      return `<div class="param-row" data-pmt-step-row="${tierKey}:${index}"><div class="config-field"><label for="${id}-provider">${role} · nhà cung cấp</label><select class="input" id="${id}-provider" data-pmt-step="${tierKey}:${index}:provider" ${editable ? "" : "disabled"}>${providerOptions(step?.provider)}</select></div>
        <div class="config-field"><label for="${id}-model">${role} · mã model</label><input class="input" id="${id}-model" data-pmt-step="${tierKey}:${index}:model" value="${escape(step?.model ?? "")}" placeholder="vd. deepseek/deepseek-v4.1-flash" ${editable ? "" : "disabled"}></div>
        ${editable && steps.length > 1 ? `<button type="button" class="button ghost" data-pmt-step-remove="${tierKey}:${index}" aria-label="Bỏ ${role}">Bỏ</button>` : ""}</div>`;
    }).join("");
    const add = editable && steps.length < SPEC.bounds.maxSteps ? `<button type="button" class="button ghost" data-pmt-step-add="${tierKey}">Thêm model dự phòng</button>` : "";
    return `<div class="pmt-steps">${list || '<p class="helper">Chưa có model nào.</p>'}${add}</div>`;
  }
  function renderTier(tierKey, editable) {
    const config = form.config, tier = config.tiers[tierKey];
    if (!isObject(tier)) return "";
    const own = tier.useActiveRoute === false;
    const wall = config.platform?.wallClockMs;
    const reasoning = isObject(tier.reasoning) ? tier.reasoning : null;
    const styleOptions = SPEC.outputStyles.map(style => `<option value="${style}" ${tier.outputStyle === style ? "selected" : ""}>${escape(STYLE_LABELS[style])}</option>`).join("");
    const reasoningOptions = `<option value="" ${reasoning ? "" : "selected"}>Không đặt (theo model)</option>` + SPEC.reasoningModes.map(mode => `<option value="${mode}" ${reasoning?.mode === mode ? "selected" : ""}>${REASONING_LABELS[mode]}</option>`).join("");
    const usedBy = Object.entries(config.personaTiers || {}).filter(([, value]) => value === tierKey).length
      + (tierKey === SPEC.defaultTier ? (active.personas || []).filter(item => !has(config.personaTiers, item.id)).length : 0);
    return `<section class="code-card pmt-tier" data-pmt-tier-card="${tierKey}" aria-labelledby="pmt-${tierKey}-title">
      <div class="detail-heading"><h3 id="pmt-${tierKey}-title">${escape(tierName(tierKey, config))} <small class="muted">${tierKey} · ${usedBy} người dẫn</small></h3>
        ${editable && tierKey !== "standard" ? `<button type="button" class="button ghost" data-pmt-tier-remove="${tierKey}">Bỏ hạng này</button>` : ""}</div>
      <div class="config-grid">
        ${fieldInput(tierKey, "label.vi", "text", "Tên hiển thị (tiếng Việt)", "Tối đa 40 ký tự.", editable, 'maxlength="40"')}
        ${fieldInput(tierKey, "label.en", "text", "Tên hiển thị (tiếng Anh)", "Tối đa 40 ký tự.", editable, 'maxlength="40"')}
      </div>
      <label class="ctx-toggle" for="pmt-${tierKey}-own"><input type="checkbox" id="pmt-${tierKey}-own" data-pmt-own="${tierKey}" ${own ? "checked" : ""} ${editable ? "" : "disabled"}> Dùng model riêng cho hạng này</label>
      ${own ? `${stepRows(tierKey, tier, editable)}
        <div class="config-grid">
          <div class="config-field"><label for="pmt-${tierKey}-reasoning-mode">Mức suy luận</label><select class="input" id="pmt-${tierKey}-reasoning-mode" data-pmt-reasoning="${tierKey}" ${editable ? "" : "disabled"}>${reasoningOptions}</select></div>
          ${reasoning && reasoning.mode !== "off" ? fieldInput(tierKey, "reasoning.maxTokens", "int", "Ngân sách suy luận (token)", `${SPEC.bounds.reasoningMaxTokens.min}–${SPEC.bounds.reasoningMaxTokens.max}; để trống = theo model.`, editable) : ""}
          ${fieldInput(tierKey, "maxOutputTokens", "int", "Trần độ dài trả lời (token)", `${SPEC.bounds.maxOutputTokens.min}–${SPEC.bounds.maxOutputTokens.max}; để trống = 2000.`, editable)}
          ${fieldInput(tierKey, "temperature", "float", "Độ sáng tạo (temperature)", `${SPEC.bounds.temperature.min}–${SPEC.bounds.temperature.max}; để trống = 0,68.`, editable)}
          ${fieldInput(tierKey, "timeoutMs", "seconds", "Tổng thời gian chờ (giây)", `${SPEC.bounds.timeoutMs.min / 1000}–${SPEC.bounds.timeoutMs.max / 1000} giây, gồm cả model dự phòng.`, editable)}
          ${fieldInput(tierKey, "primaryShare", "percent", "Phần chờ dành cho model chính (%)", `${SPEC.bounds.primaryShare.min * 100}–${SPEC.bounds.primaryShare.max * 100}%; phần còn lại cho dự phòng. Để trống = 65%.`, editable)}
          ${fieldInput(tierKey, "costCapMicro", "usd", "Ngân sách mỗi tin nhắn (USD)", `$${SPEC.bounds.costCapMicro.min / 1e6}–$${SPEC.bounds.costCapMicro.max / 1e6}; quá mức thì dừng model dự phòng.`, editable)}
        </div>
        <p class="helper" data-pmt-wait="${tierKey}">${escape(waitText(tier, wall))}</p>
        <p class="helper" data-pmt-budget="${tierKey}">${escape(formatBudget(tier.costCapMicro))}</p>`
        : '<p class="helper">Dùng chuỗi model, thời gian chờ và hạn mức chi phí đang chạy của "Trò chuyện với người dẫn" (trang Nhà cung cấp & Model và Bật/tắt & hạn mức). Người dẫn ở hạng này trả lời như hôm nay.</p>'}
      <div class="config-grid">
        ${fieldInput(tierKey, "history.turns", "int", "Trí nhớ: số lượt gần nhất", `${SPEC.bounds.historyTurns.min}–${SPEC.bounds.historyTurns.max}; để trống cả hai = như hôm nay (8 lượt × 800 ký tự).`, editable)}
        ${fieldInput(tierKey, "history.chars", "int", "Trí nhớ: ký tự mỗi lượt", `${SPEC.bounds.historyChars.min}–${SPEC.bounds.historyChars.max}.`, editable)}
        <div class="config-field"><label for="pmt-${tierKey}-style">Kiểu trả lời</label><select class="input" id="pmt-${tierKey}-style" data-pmt-style="${tierKey}" ${editable ? "" : "disabled"}>${tier.outputStyle === undefined ? '<option value="" selected>Không đặt (Ngắn gọn)</option>' : ""}${styleOptions}</select></div>
      </div>
    </section>`;
  }
  function renderPersonaTable(editable) {
    const config = form.config, map = config.personaTiers || {};
    const known = active.personas || [];
    const extra = Object.keys(map).filter(id => !known.some(item => item.id === id)).map(id => ({ id, name: id, type: "", missing: true }));
    const tierOptions = selected => SPEC.tierKeys.filter(key => isObject(config.tiers?.[key])).map(key => `<option value="${key}" ${selected === key ? "selected" : ""}>${escape(tierName(key, config))}</option>`).join("")
      + (selected && !isObject(config.tiers?.[selected]) ? `<option value="${escape(selected)}" selected>${escape(selected)} (không tồn tại)</option>` : "");
    const body = [...known, ...extra].map(persona => {
      const selected = has(map, persona.id) ? map[persona.id] : "";
      return `<tr data-pmt-persona-row="${escape(persona.id)}"><th scope="row">${escape(persona.name)}${persona.missing ? ' <small class="muted">(không có trong danh sách nội dung)</small>' : ""}<br><small class="muted">${escape(persona.id)}</small></th>
        <td>${escape(persona.typeLabel || "")}</td>
        <td><label class="visually-hidden" for="pmt-persona-${escape(persona.id)}">Hạng của ${escape(persona.name)}</label><select class="input" id="pmt-persona-${escape(persona.id)}" data-pmt-persona="${escape(persona.id)}" ${editable ? "" : "disabled"}>
          <option value="" ${selected ? "" : "selected"}>Mặc định (${escape(tierName(SPEC.defaultTier, config))})</option>${tierOptions(selected)}</select></td></tr>`;
    }).join("");
    const note = active.personaStatus === "error" ? '<p class="warning-card" role="note">Không tải được danh sách người dẫn từ dữ liệu nội dung; chỉ hiện những người dẫn đã được gán.</p>' : "";
    return `<section class="code-card" aria-labelledby="pmt-persona-title"><h3 id="pmt-persona-title">Gán người dẫn vào hạng <small class="muted">${known.length} người dẫn</small></h3>${note}
      <p class="helper">Người dẫn để "Mặc định" chạy hạng ${escape(tierName(SPEC.defaultTier, config))}. Máy chủ tìm theo mã nội dung (vd. book-i-ching).</p>
      <table class="config-table"><caption class="visually-hidden">Hạng model của từng người dẫn</caption>
        <thead><tr><th scope="col">Người dẫn</th><th scope="col">Loại</th><th scope="col">Hạng</th></tr></thead><tbody>${body}</tbody></table></section>`;
  }
  function renderErrors(problems) {
    if (!problems.length) return '<p class="helper" data-pmt-errors role="status">Cấu hình hợp lệ theo cùng quy tắc máy chủ kiểm.</p>';
    return `<div class="warning-card" data-pmt-errors role="alert"><p><strong>Còn ${problems.length} lỗi, chưa lưu được:</strong></p><ul>${problems.map(code => `<li data-pmt-error="${escape(code)}">${escape(describeError(code, form.config, personaName))}</li>`).join("")}</ul></div>`;
  }
  function renderHistory() {
    const list = active.rows || [];
    if (!list.length) return "";
    const body = list.slice(0, 10).map(row => `<tr><th scope="row">${row.version}</th><td>${row.status === "active" ? "Đang chạy" : row.status === "draft" ? "Nháp" : "Đã lưu trữ"}</td><td>${escape(row.publishedAt || row.updatedAt || row.createdAt || "")}</td><td>${escape(row.note || "")}</td>
      <td>${canDraft() && row.status === "archived" && active.status === "ok" ? `<button type="button" class="button ghost" data-pmt-copy="${row.version}">Dùng làm nháp</button>` : ""}</td></tr>`).join("");
    return `<section class="code-card" aria-labelledby="pmt-history-title"><h3 id="pmt-history-title">Các phiên bản</h3>
      <table class="config-table"><caption class="visually-hidden">Các phiên bản hạng model</caption><thead><tr><th scope="col">Phiên bản</th><th scope="col">Trạng thái</th><th scope="col">Thời điểm</th><th scope="col">Ghi chú</th><th scope="col"><span class="visually-hidden">Thao tác</span></th></tr></thead><tbody>${body}</tbody></table>
      <p class="helper">Muốn quay lại bản cũ: bấm "Dùng làm nháp", lưu nháp rồi phát hành; bản đó thành một phiên bản mới.</p></section>`;
  }
  function renderDialog() {
    const dialog = active.dialog;
    if (!dialog) return "";
    const { activeRow, draftRow } = rows();
    if (!draftRow) return "";
    const before = activeRow ? activeRow.config : defaultConfig();
    const diff = diffRows(before, formConfig(draftRow.config), personaName);
    const changed = diff.filter(row => row.changed);
    const table = diff.map(row => `<tr class="${row.changed ? "changed" : ""}" data-pmt-diff="${escape(row.key)}"><th scope="row">${escape(row.key)}</th><td>${escape(row.from)}</td><td>${escape(row.to)}</td><td>${row.changed ? "Đổi" : "Giữ nguyên"}</td></tr>`).join("");
    return `<div class="modal-backdrop ai-feature-dialog-backdrop"><section class="modal ai-feature-dialog" id="pmt-dialog" role="dialog" aria-modal="true" aria-labelledby="pmt-dialog-title" tabindex="-1">
      <div class="modal-header"><div><p class="eyebrow">Xem lại trước khi phát hành</p><h2 id="pmt-dialog-title">Hạng model người dẫn, phiên bản ${draftRow.version}</h2></div></div>
      <p class="pill" id="pmt-dialog-environment">Đang ghi vào: ${escape(environmentLabel())}</p>
      <p>${activeRow ? `Phiên bản nháp ${draftRow.version} thay phiên bản đang chạy ${activeRow.version}; bản cũ được lưu trữ, không bị xóa.` : `Phiên bản nháp ${draftRow.version} thay mặc định trong mã.`} ${changed.length} mục thay đổi. Áp dụng trong khoảng 1 phút, khi Edge Function đọc lại cấu hình.</p>
      <table class="config-table diff-table"><thead><tr><th scope="col">Mục</th><th scope="col">${activeRow ? "Đang chạy" : "Mặc định trong mã"}</th><th scope="col">Sau khi phát hành</th><th scope="col">Thay đổi</th></tr></thead><tbody>${table}</tbody></table>
      <p class="helper">Đổi model hay hạng của một người dẫn nên chạy bộ câu thử của người dẫn đó trước (trang Chạy thử & chấm điểm). Lọc khủng hoảng, hạn mức lượt mỗi ngày và lọc đầu ra không đổi.</p>
      <p class="helper">${escape(DEPLOY_NOTE)}</p>
      <div class="config-field"><label for="pmt-publish-note">Ghi chú phát hành (bắt buộc, 10–500 ký tự)</label><textarea class="input" id="pmt-publish-note" rows="3" maxlength="500">${escape(dialog.note)}</textarea></div>
      <div class="modal-actions"><button type="button" class="button ghost" data-pmt-dialog-cancel>Hủy</button><button type="button" class="button primary" data-pmt-publish ${publishAllowed(dialog) && !active.busy ? "" : "disabled"}>Phát hành phiên bản ${draftRow.version}</button></div>
    </section></div>`;
  }
  function publishAllowed(dialog) {
    const length = String(dialog?.note ?? "").trim().length;
    return length >= 10 && length <= 500;
  }
  function render() {
    if (!active) return;
    const { container } = active;
    if (invalidated || !can("ai.read")) {
      container.innerHTML = `<div class="warning-card" role="status">${invalidated ? "Máy chủ đã thay đổi. Tải lại trang." : "Cần quyền xem AI (ai.read)."}</div>`;
      return;
    }
    const heading = `<div class="detail-heading"><div><p class="eyebrow">AI · Trò chuyện với người dẫn</p><h2 id="persona-model-tiers-title">Hạng model người dẫn</h2></div><span class="pill" role="status" aria-live="polite">${escape(active.statusText)}</span></div>`;
    const intro = `<p>Mỗi người dẫn trò chuyện trên một <strong>hạng model</strong>. Hạng <strong>Thường</strong> giữ nguyên cách trả lời hôm nay; hạng <strong>Tri thức sâu</strong> (và <strong>Cao cấp</strong> nếu thêm) có model chính, model dự phòng, mức suy luận, trần độ dài, thời gian chờ và ngân sách riêng. <strong>Lưu nháp</strong> lưu lên máy chủ, người dùng chưa thấy; <strong>Xem lại & phát hành</strong> áp dụng sau khi xem thay đổi và ghi chú.</p>
      <p class="helper">Hạn mức số lượt mỗi ngày không nằm ở đây: chỉnh ở trang <a href="#features">Bật/tắt & hạn mức</a>. ${escape(DEPLOY_NOTE)}</p>`;
    if (active.status === "loading" || active.status === "idle") { container.innerHTML = `<div class="pmt-page">${heading}${intro}<p class="muted">Đang tải cấu hình…</p></div>`; return; }
    const { activeRow, draftRow } = rows();
    const editable = canDraft() && active.status === "ok";
    const manage = can("ai.manage");
    const config = editConfig();
    const problems = validate(config);
    const problem = active.status === "missing" ? `<div class="warning-card" role="note" data-pmt-missing><p><strong>Chưa áp migration.</strong> ${escape(MIGRATION_NOTE)}</p></div>`
      : active.status === "error" ? '<div class="warning-card" role="note"><p>Không tải được cấu hình. Bấm Tải lại.</p></div>' : "";
    const runningLine = active.status === "ok"
      ? `<p data-pmt-running>${activeRow ? `Đang chạy: phiên bản ${activeRow.version}${activeRow.publishedAt ? ` · phát hành ${escape(activeRow.publishedAt)}` : ""}` : "Đang chạy: mặc định trong mã (chưa phát hành phiên bản nào)."}${draftRow ? ` · Có bản nháp phiên bản ${draftRow.version}` : ""}</p>` : "";
    const wall = config.platform?.wallClockMs;
    const platform = `<section class="code-card" aria-labelledby="pmt-platform-title"><h3 id="pmt-platform-title">Gói Supabase (giới hạn chờ của máy chủ)</h3>
      <div class="config-field"><label for="pmt-platform">Gói đang dùng</label><select class="input" id="pmt-platform" data-pmt-platform ${editable ? "" : "disabled"}>
        <option value="150000" ${wall === 150000 ? "selected" : ""}>Free: tối đa 150 s mỗi lượt (dùng được 135 s)</option>
        <option value="400000" ${wall === 400000 ? "selected" : ""}>Trả phí: tối đa 400 s mỗi lượt</option>
        ${SPEC.platform.wallClockMsAllowed.includes(wall) ? "" : `<option value="${escape(wall)}" selected>${escape(wall ?? "Không đặt")} (không hợp lệ)</option>`}</select></div>
      <p class="helper">Dự án đang ở gói Free. Chỉ chọn 400 s sau khi Owner đã chuyển Supabase sang gói trả phí; nếu chọn sớm, máy chủ vẫn cắt ở 150 s và người dùng gặp lỗi thay vì câu trả lời.</p></section>`;
    const addable = SPEC.tierKeys.filter(key => !isObject(config.tiers?.[key]));
    const addButtons = editable && addable.length ? `<div class="param-row">${addable.map(key => `<button type="button" class="button ghost" data-pmt-tier-add="${key}">Thêm hạng ${escape(TIER_NAMES[key])}</button>`).join("")}</div>` : "";
    const actions = editable ? `<div class="config-field"><label for="pmt-note">Ghi chú nháp (không bắt buộc)</label><input class="input" id="pmt-note" maxlength="500" data-pmt-note value="${escape(form.note)}"></div>
        <p class="helper" data-pmt-dirty ${form.dirty ? "" : "hidden"}>Còn thay đổi chưa lưu. Bấm Lưu nháp${manage ? " trước khi phát hành" : ""}.</p>
        <div class="param-row">
          <button type="button" class="button" data-pmt-save ${active.busy || problems.length ? "disabled" : ""}>Lưu nháp</button>
          ${form.dirty ? '<button type="button" class="button ghost" data-pmt-discard>Bỏ thay đổi</button>' : ""}
          ${manage ? `<button type="button" class="button primary" data-pmt-review ${active.busy || !draftRow || form.dirty ? "disabled" : ""}>Xem lại & phát hành</button>` : ""}
        </div>
        ${manage ? (draftRow ? "" : '<p class="helper">Chưa có bản nháp trên máy chủ. Lưu nháp trước, rồi mới phát hành.</p>')
          : `<p class="helper" data-pmt-owner-only>Chỉ Owner (quyền ai.manage) phát hành, vì đổi hạng là đổi model và chi phí. ${draftRow ? "Bản nháp đã lưu, chờ Owner xem lại." : "Bấm Lưu nháp để gửi bản nháp cho Owner xem lại."}</p>`}`
      : active.status === "ok" ? '<p class="muted" data-pmt-readonly>Bạn chỉ có quyền xem. Lưu nháp cần ai.manage hoặc ai.read + content.draft; phát hành chỉ Owner (ai.manage).</p>'
      : '<p class="muted">Chỉ xem: chưa chỉnh được cho tới khi máy chủ có bảng cấu hình.</p>';
    container.innerHTML = `<div class="pmt-page">${heading}${intro}${problem}${runningLine}
      <div class="param-row"><button type="button" class="button ghost" id="pmt-reload" ${active.busy ? "disabled" : ""}>Tải lại</button></div>
      ${SPEC.tierKeys.map(key => renderTier(key, editable)).join("")}
      ${addButtons}
      ${renderPersonaTable(editable)}
      ${platform}
      <section class="code-card" aria-label="Lưu và phát hành">${active.status === "ok" ? renderErrors(problems) : ""}${actions}
        <p class="helper" role="status" aria-live="polite" data-pmt-message>${escape(active.message || "")}</p></section>
      ${renderHistory()}</div>${renderDialog()}`;
    if (active.dialog && !active.dialog.keepFocus) { container.querySelector("#pmt-publish-note")?.focus(); active.dialog.keepFocus = true; }
  }
  // Light refresh while typing: errors, wait and budget lines and buttons only, so the field keeps focus.
  function refreshLive(tierKey) {
    if (!active) return;
    const config = form.config, problems = validate(config);
    const box = active.container.querySelector("[data-pmt-errors]");
    if (box) box.outerHTML = renderErrors(problems);
    if (tierKey && isObject(config.tiers?.[tierKey])) {
      const wait = active.container.querySelector(`[data-pmt-wait="${tierKey}"]`);
      if (wait) wait.textContent = waitText(config.tiers[tierKey], config.platform?.wallClockMs);
      const budget = active.container.querySelector(`[data-pmt-budget="${tierKey}"]`);
      if (budget) budget.textContent = formatBudget(config.tiers[tierKey].costCapMicro);
    }
    active.container.querySelector("[data-pmt-dirty]")?.removeAttribute("hidden");
    const save = active.container.querySelector("[data-pmt-save]");
    if (save) save.disabled = active.busy || problems.length > 0;
    const review = active.container.querySelector("[data-pmt-review]");
    if (review) review.disabled = true;
  }
  function markDirty(tierKey, full) {
    form.dirty = true; reportUnsaved();
    if (full) render(); else refreshLive(tierKey);
  }

  // ---- Server.
  async function loadPersonas() {
    if (active.personas) return;
    try {
      const response = await fetch("./generated/content-seed.json", { cache: "no-store" });
      if (!response.ok) throw Error("seed_unavailable");
      const seed = await response.json();
      const typeLabels = { book_inspired_guide: "Lấy cảm hứng từ sách", historical_figure: "Nhân vật lịch sử", archetype_guide: "Hình mẫu" };
      active.personas = (Array.isArray(seed?.personas) ? seed.personas : []).filter(item => isObject(item) && typeof item.id === "string" && PERSONA_KEY.test(item.id))
        .map(item => ({ id: item.id, name: typeof item.name === "object" ? item.name?.vi || item.name?.en || item.id : String(item.name || item.id), typeLabel: typeLabels[item.type] || String(item.type || "") }));
      active.personaStatus = "ok";
    } catch {
      active.personas = []; active.personaStatus = "error";
    }
  }
  async function load() {
    if (!active || active.busy) return;
    const snapshot = scope(), version = ++epoch;
    if (invalidated || !snapshot.account || typeof window.NilazaAdminRpc !== "function") { active.statusText = "Chưa xác minh được phiên đăng nhập"; render(); return; }
    active.busy = true; active.statusText = "Đang tải…"; active.status = "loading"; render();
    if (!await window.NilazaRequireCapability?.("ai.read") || !current(snapshot, version)) { if (active && version === epoch) { active.busy = false; active.statusText = "Cần quyền ai.read"; render(); } return; }
    const personas = loadPersonas();
    try {
      const result = await window.NilazaAdminRpc("get_ai_persona_model_tiers", {}, "ai.read");
      await personas;
      if (!current(snapshot, version)) return;
      active.rows = cleanRows(result); active.status = "ok"; active.statusText = "Đã tải";
    } catch (error) {
      await personas;
      if (!current(snapshot, version)) return;
      active.rows = []; active.status = error?.missingFunction ? "missing" : "error";
      active.statusText = active.status === "missing" ? "Chưa áp migration" : "Tải chưa được; thử lại";
    }
    if (!form.dirty) { form.config = null; }
    active.busy = false;
    render();
  }
  async function saveDraft() {
    if (!active || active.busy || active.status !== "ok" || !canDraft()) return;
    const config = clone(editConfig()), problems = validate(config);
    if (problems.length) { active.message = "Còn lỗi trong cấu hình; sửa các mục báo đỏ rồi lưu lại."; render(); return; }
    const note = String(form.note ?? "").trim();
    if (note.length > 500) { active.message = "Ghi chú nháp tối đa 500 ký tự."; render(); return; }
    const snapshot = scope(), version = ++epoch;
    active.busy = true; active.message = "Đang lưu nháp…"; render();
    try {
      if (!await requireDraft() || !current(snapshot, version)) return;
      const result = await window.NilazaAdminRpc("save_ai_persona_model_tiers_draft", { config_input: config, note_input: note || null }, DRAFT_RULE);
      if (!current(snapshot, version)) return;
      if (!isObject(result) || result.status !== "draft" || !Number.isInteger(result.version) || !isObject(result.config)) throw Error("invalid_acknowledgement");
      active.rows = [result, ...active.rows.filter(row => row.status !== "draft")].sort((a, b) => b.version - a.version);
      // Keep edits typed while the request ran; otherwise the form now mirrors the saved draft.
      if (JSON.stringify(form.config) === JSON.stringify(config)) { form.dirty = false; form.config = null; reportUnsaved(); }
      active.message = `Đã lưu nháp phiên bản ${result.version}. Người dùng chưa thấy thay đổi này.`;
    } catch (error) {
      if (!current(snapshot, version)) return;
      if (error?.missingFunction) { active.status = "missing"; active.statusText = "Chưa áp migration"; }
      else active.message = errorMessage(error, "save");
    } finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  async function publish() {
    if (!active || active.busy || !active.dialog) return;
    const note = active.dialog.note.trim(), { draftRow } = rows();
    if (!draftRow || !publishAllowed(active.dialog)) { render(); return; }
    const snapshot = scope(), version = ++epoch;
    active.busy = true; active.message = "Đang phát hành…"; render();
    try {
      if (!await window.NilazaRequireCapability?.("ai.manage") || !current(snapshot, version)) return;
      const result = await window.NilazaAdminRpc("publish_ai_persona_model_tiers", { version_input: draftRow.version, note_input: note }, "ai.manage");
      if (!current(snapshot, version)) return;
      if (!isObject(result) || result.status !== "active" || result.version !== draftRow.version) throw Error("invalid_acknowledgement");
      active.rows = active.rows.map(row => row.version === result.version ? { ...row, ...result } : row.status === "active" ? { ...row, status: "archived" } : row);
      active.dialog = null;
      if (!form.dirty) form.config = null;
      active.message = `Đã phát hành phiên bản ${result.version}. Áp dụng trong khoảng 1 phút.`;
    } catch (error) {
      if (!current(snapshot, version)) return;
      if (error?.missingFunction) { active.status = "missing"; active.dialog = null; }
      else active.message = errorMessage(error, "publish");
    } finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  function openDialog() {
    if (!active || active.busy || form.dirty || !rows().draftRow || !can("ai.manage")) return;
    active.dialog = { note: "" };
    render();
  }
  function closeDialog() {
    if (!active?.dialog) return;
    active.dialog = null;
    render();
    active.container.querySelector("[data-pmt-review]")?.focus();
  }

  // ---- Edits.
  function editable() { return Boolean(active && active.status === "ok" && canDraft() && !active.busy); }
  function onInput(event) {
    const target = event.target;
    if (target.id === "pmt-publish-note" && active.dialog) {
      active.dialog.note = target.value;
      const confirm = active.container.querySelector("[data-pmt-publish]");
      if (confirm) confirm.disabled = active.busy || !publishAllowed(active.dialog);
      return;
    }
    if (!editable()) return;
    const config = editConfig();
    if (target.hasAttribute("data-pmt-note")) { form.note = target.value; markDirty(null, false); return; }
    const tierKey = target.dataset.pmtTier, path = target.dataset.pmtPath, kind = target.dataset.pmtKind;
    if (tierKey && path && kind && isObject(config.tiers?.[tierKey])) {
      const value = parseField(kind, target.value);
      if (path.startsWith("label.")) {
        const label = isObject(config.tiers[tierKey].label) ? config.tiers[tierKey].label : (config.tiers[tierKey].label = {});
        label[path.slice(6)] = target.value;
      } else setPath(config.tiers[tierKey], path, value);
      markDirty(tierKey, false);
      return;
    }
    const step = target.dataset.pmtStep;
    if (step && target.tagName === "INPUT") {
      const [key, index, field] = step.split(":");
      const steps = config.tiers?.[key]?.steps;
      if (Array.isArray(steps) && isObject(steps[Number(index)])) { steps[Number(index)][field] = target.value.trim(); markDirty(key, false); }
    }
  }
  function onChange(event) {
    if (!editable()) return;
    const target = event.target, config = editConfig();
    if (target.dataset.pmtOwn) {
      const key = target.dataset.pmtOwn, tier = config.tiers[key];
      if (!isObject(tier)) return;
      if (target.checked) {
        tier.useActiveRoute = false;
        tier.steps = form.stash[key] || clone(SPEC.tiers.deep_knowledge.steps);
      } else {
        if (Array.isArray(tier.steps)) form.stash[key] = tier.steps;
        delete tier.steps;
        tier.useActiveRoute = true;
      }
      markDirty(key, true); return;
    }
    if (target.dataset.pmtStep && target.tagName === "SELECT") {
      const [key, index] = target.dataset.pmtStep.split(":");
      const steps = config.tiers?.[key]?.steps;
      if (Array.isArray(steps) && isObject(steps[Number(index)])) { steps[Number(index)].provider = target.value; markDirty(key, false); }
      return;
    }
    if (target.dataset.pmtReasoning) {
      const key = target.dataset.pmtReasoning, tier = config.tiers[key];
      if (!target.value) delete tier.reasoning;
      else tier.reasoning = target.value === "off" ? { mode: "off" } : { mode: target.value, ...(isObject(tier.reasoning) && has(tier.reasoning, "maxTokens") ? { maxTokens: tier.reasoning.maxTokens } : {}) };
      markDirty(key, true); return;
    }
    if (target.dataset.pmtStyle) {
      const tier = config.tiers[target.dataset.pmtStyle];
      if (target.value) tier.outputStyle = target.value; else delete tier.outputStyle;
      markDirty(target.dataset.pmtStyle, false); return;
    }
    if (target.dataset.pmtPersona !== undefined && target.dataset.pmtPersona) {
      const id = target.dataset.pmtPersona;
      if (!isObject(config.personaTiers)) config.personaTiers = {};
      if (target.value) config.personaTiers[id] = target.value; else delete config.personaTiers[id];
      markDirty(null, false); return;
    }
    if (target.hasAttribute("data-pmt-platform")) {
      config.platform = { wallClockMs: Number(target.value) };
      markDirty(null, true);
    }
  }
  function onClick(event) {
    const target = event.target;
    if (target.closest("#pmt-reload")) { if (!form.dirty || window.confirm?.("Bỏ các thay đổi chưa lưu và tải lại?") !== false) { form.dirty = false; form.config = null; reportUnsaved(); void load(); } return; }
    if (target.closest("[data-pmt-review]")) { openDialog(); return; }
    if (target.closest("[data-pmt-dialog-cancel]")) { closeDialog(); return; }
    if (target.closest("[data-pmt-publish]")) { void publish(); return; }
    if (target.closest("[data-pmt-save]")) { void saveDraft(); return; }
    if (!editable()) return;
    const config = editConfig();
    if (target.closest("[data-pmt-discard]")) { form.dirty = false; form.config = null; form.stash = {}; reportUnsaved(); active.message = "Đã bỏ thay đổi chưa lưu."; render(); return; }
    const add = target.closest("[data-pmt-tier-add]")?.dataset.pmtTierAdd;
    if (add && SPEC.tierKeys.includes(add) && !isObject(config.tiers[add])) {
      config.tiers[add] = add === "deep_knowledge" ? clone(SPEC.tiers.deep_knowledge)
        : { ...clone(SPEC.tiers.deep_knowledge), label: { vi: TIER_NAMES[add], en: add === "premium" ? "Premium" : add } };
      markDirty(add, true); return;
    }
    const remove = target.closest("[data-pmt-tier-remove]")?.dataset.pmtTierRemove;
    if (remove && remove !== "standard" && isObject(config.tiers[remove])) {
      delete config.tiers[remove];
      let moved = 0;
      for (const [id, tier] of Object.entries(config.personaTiers || {})) if (tier === remove) { delete config.personaTiers[id]; moved += 1; }
      active.message = moved ? `Đã bỏ hạng ${TIER_NAMES[remove]}; ${moved} người dẫn chuyển về Mặc định (${tierName(SPEC.defaultTier, config)}).` : `Đã bỏ hạng ${TIER_NAMES[remove]}.`;
      markDirty(null, true); return;
    }
    const addStep = target.closest("[data-pmt-step-add]")?.dataset.pmtStepAdd;
    if (addStep) {
      const steps = config.tiers[addStep]?.steps;
      if (Array.isArray(steps) && steps.length < SPEC.bounds.maxSteps) { steps.push({ provider: "openrouter", model: "" }); markDirty(addStep, true); }
      return;
    }
    const removeStep = target.closest("[data-pmt-step-remove]")?.dataset.pmtStepRemove;
    if (removeStep) {
      const [key, index] = removeStep.split(":");
      const steps = config.tiers[key]?.steps;
      if (Array.isArray(steps) && steps.length > 1) { steps.splice(Number(index), 1); markDirty(key, true); }
      return;
    }
    const copy = target.closest("[data-pmt-copy]")?.dataset.pmtCopy;
    if (copy) {
      const row = active.rows.find(item => String(item.version) === copy);
      if (row) { form.config = formConfig(row.config); form.note = `Quay lại phiên bản ${row.version}`; active.message = `Đã chép phiên bản ${row.version} vào nháp. Bấm Lưu nháp để giữ.`; markDirty(null, true); }
    }
  }

  function clear() {
    epoch++;
    if (active) active.container.innerHTML = '<p role="status">Phiên đã thay đổi. Mở lại mục Hạng model người dẫn để tiếp tục.</p>';
    active = null;
  }
  window.NilazaPersonaModelTiers = Object.freeze({
    clear,
    spec: SPEC,
    validate,
    describeError,
    defaultConfig,
    effectiveWaitMs,
    formatBudget,
    diffRows,
    parseField,
    mount(container) {
      const now = scope();
      if (form.owner !== `${now.account}|${now.target}`) resetForm(`${now.account}|${now.target}`);
      if (active && active.container === container && active.account === now.account) { render(); return; }
      clear();
      active = { container, account: now.account, rows: [], personas: null, personaStatus: "idle", status: "idle", statusText: "Chưa tải", busy: false, dialog: null, message: "" };
      const guard = handler => event => { if (!active || active.container !== container || invalidated || !can("ai.read")) return; handler(event); };
      container.onclick = guard(onClick);
      container.oninput = guard(onInput);
      container.onchange = guard(onChange);
      container.onsubmit = event => event.preventDefault();
      container.onkeydown = event => { if (event.key === "Escape" && active?.dialog) { event.preventDefault(); closeDialog(); } };
      render();
      void load();
    }
  });
  window.addEventListener("hashchange", () => { if (active && !/^#model-tiers(?:\?|$)/.test(location.hash)) clear(); });
})();
