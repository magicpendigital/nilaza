(function () {
  // Miễn phí / Premium (Owner decision 27/11/2026, docs/proposals/NEW_REFLECTION_MODALITIES_2026-11-27.vi.md section 10).
  // One row per on-device reflection feature: a Free / Premium switch, the free limit and the premium limit. Lưu nháp →
  // Xem trước như người dùng miễn phí → Xem lại & phát hành (Owner, reason required) → change log with one-click
  // rollback, through get_feature_access_configs / save_feature_access_draft / publish_feature_access_config /
  // rollback_feature_access_config / get_feature_access_audience (migration 20261127090000).
  // Rules:
  // - validate() returns the same codes as nilaza_private.feature_access_errors, so the Owner sees a problem before the
  //   server refuses it (the server only returns a code);
  // - reading needs ai.read; saving a draft ai.manage or ai.read + content.draft; publishing and rollback ai.manage;
  // - switching to Premium never deletes or hides what a user saved, Premium accounts keep access, and a feature turned
  //   off elsewhere stays off: the page says so and the app enforces it (apps/mobile/src/features/access);
  // - existing AI features are shown read-only with their on/off state; their quotas stay on the server.
  // SPEC is a copy of packages/agent-config/feature-access.json; scripts/admin-feature-access.test.mjs keeps them (and
  // the SQL spec and the app defaults) equal.
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const SPEC = Object.freeze(/* @feature-access-spec */ {
    "refreshMinutes": 5,
    "dayOffsetMinutes": 420,
    "tiers": ["free", "premium"],
    "limitKinds": ["unlimited", "per_day", "per_item_per_day", "retake_after_days"],
    "bounds": {
      "count": { "min": 1, "max": 100 },
      "days": { "min": 1, "max": 365 }
    },
    "editableFeatures": ["book_quote", "boi_kieu", "rune_draw", "big_five", "enneagram"],
    "allowedKinds": {
      "book_quote": ["per_item_per_day", "per_day", "unlimited"],
      "boi_kieu": ["per_day", "unlimited"],
      "rune_draw": ["per_day", "unlimited"],
      "big_five": ["retake_after_days", "unlimited"],
      "enneagram": ["retake_after_days", "unlimited"]
    },
    "labels": {
      "book_quote": { "vi": "Một câu cho hôm nay", "en": "A line for today" },
      "boi_kieu": { "vi": "Bói Kiều", "en": "Kieu verse reflection" },
      "rune_draw": { "vi": "Rune", "en": "Rune draw" },
      "big_five": { "vi": "Big Five", "en": "Big Five" },
      "enneagram": { "vi": "Enneagram", "en": "Enneagram" }
    },
    "defaults": {
      "features": {
        "book_quote": { "tier": "free", "free": { "kind": "per_item_per_day", "count": 1 }, "premium": { "kind": "per_item_per_day", "count": 1 } },
        "boi_kieu": { "tier": "free", "free": { "kind": "per_day", "count": 1 }, "premium": { "kind": "per_day", "count": 1 } },
        "rune_draw": { "tier": "free", "free": { "kind": "per_day", "count": 1 }, "premium": { "kind": "per_day", "count": 1 } },
        "big_five": { "tier": "free", "free": { "kind": "retake_after_days", "days": 30 }, "premium": { "kind": "retake_after_days", "days": 30 } },
        "enneagram": { "tier": "free", "free": { "kind": "retake_after_days", "days": 30 }, "premium": { "kind": "retake_after_days", "days": 30 } }
      }
    },
    "serverManaged": [
      { "id": "persona_chat", "label": "Trò chuyện với người dẫn" },
      { "id": "oracle_router", "label": "Oracle" },
      { "id": "tarot_reading", "label": "Giải bài Tarot" },
      { "id": "daily_insight", "label": "Thông điệp hằng ngày" },
      { "id": "astrology_insight", "label": "Đọc sâu Chiêm tinh" },
      { "id": "ai_council", "label": "Hội đồng" },
      { "id": "tarot_note", "label": "Ghi chú riêng Tarot" },
      { "id": "reader_router", "label": "Gợi ý người đọc (tầng AI)" },
      { "id": "numerology_private_message", "label": "Lời nhắn riêng Thần số học" }
    ]
  });
  // packages/agent-config/account-tier-policy.json "mode" (test-checked): during closed testing every signed-in account
  // is treated as Premium, so a Premium switch only changes what guests see.
  const ACCOUNT_POLICY_MODE = "all_premium";
  const MIGRATION = "20261127090000_feature_access_configs.sql";
  const MIGRATION_NOTE = `Máy chủ chưa áp migration ${MIGRATION} nên chưa lưu hay phát hành được. App dùng mặc định có sẵn (bảng dưới đây).`;
  const APP_NOTE = "App đọc bản đã phát hành trong khoảng 5 phút và giữ bản gần nhất; khi mất mạng dùng bản đã giữ hoặc mặc định có sẵn. Năm tính năng này chưa được nối vào công tắc trong app: phát hành bây giờ chưa đổi gì cho người dùng cho tới bản app có nối.";
  const DRAFT_RULE = "ai.manage|ai.read+content.draft";
  const KIND_LABELS = Object.freeze({ unlimited: "Không giới hạn", per_day: "Số lần mỗi ngày", per_item_per_day: "Số lần mỗi mục mỗi ngày", retake_after_days: "Làm lại sau số ngày" });
  const ITEM_WORDS = Object.freeze({ book_quote: "mỗi cuốn sách" });
  const AMOUNT_KEY = Object.freeze({ per_day: "count", per_item_per_day: "count", retake_after_days: "days" });
  const AMOUNT_DEFAULT = Object.freeze({ count: 1, days: 30 });
  const initialTransport = { target: window.NilazaAdminTransportTarget || "", url: window.ENV?.SUPABASE_URL || "", key: window.ENV?.SUPABASE_ANON_KEY || "" };

  const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const has = (object, key) => isObject(object) && Object.prototype.hasOwnProperty.call(object, key);
  const clone = value => JSON.parse(JSON.stringify(value));
  const featureName = id => SPEC.labels[id]?.vi || id;

  // Mirror of nilaza_private.feature_access_limit_errors (migration 20261127090000): same checks, same codes.
  function limitErrors(featureId, side, limit) {
    const prefix = `${featureId}:${side}:`;
    if (!isObject(limit)) return [`${prefix}not_object`];
    if (typeof limit.kind !== "string" || !SPEC.limitKinds.includes(limit.kind)) return [`${prefix}kind`];
    const errors = [];
    if (!SPEC.allowedKinds[featureId].includes(limit.kind)) errors.push(`${prefix}kind_not_allowed`);
    const amountKey = AMOUNT_KEY[limit.kind] ?? null;
    for (const key of Object.keys(limit)) if (key !== "kind" && key !== amountKey) errors.push(`${prefix}unknown_key:${key.slice(0, 40)}`);
    if (amountKey) {
      const value = limit[amountKey], range = SPEC.bounds[amountKey];
      if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < range.min || value > range.max) errors.push(`${prefix}${amountKey}`);
    }
    return errors;
  }
  // Mirror of nilaza_private.feature_access_errors.
  function validate(config) {
    if (!isObject(config)) return ["config_not_object"];
    const errors = [];
    for (const key of Object.keys(config)) if (key !== "features") errors.push(`unknown_key:${key.slice(0, 40)}`);
    const features = config.features;
    if (!isObject(features)) return [...errors, "features_not_object"];
    for (const id of SPEC.editableFeatures) if (!has(features, id)) errors.push(`feature_missing:${id}`);
    for (const [id, feature] of Object.entries(features)) {
      if (!SPEC.editableFeatures.includes(id)) { errors.push(`unknown_feature:${id.slice(0, 40)}`); continue; }
      if (!isObject(feature)) { errors.push(`${id}:not_object`); continue; }
      for (const key of Object.keys(feature)) if (!["tier", "free", "premium"].includes(key)) errors.push(`${id}:unknown_key:${key.slice(0, 40)}`);
      if (typeof feature.tier !== "string" || !SPEC.tiers.includes(feature.tier)) errors.push(`${id}:tier`);
      errors.push(...limitErrors(id, "free", feature.free), ...limitErrors(id, "premium", feature.premium));
    }
    return errors;
  }

  // One Vietnamese sentence per validator code.
  function describeError(code) {
    if (code === "config_not_object" || code === "features_not_object") return "Cấu hình bị hỏng; tải lại trang.";
    const [head, ...rest] = code.split(":");
    if (head === "unknown_key") return `Trường lạ trong cấu hình: ${rest.join(":")}.`;
    if (head === "feature_missing") return `Thiếu tính năng ${featureName(rest[0])}.`;
    if (head === "unknown_feature") return `Tính năng lạ: ${rest.join(":")}.`;
    if (!SPEC.editableFeatures.includes(head)) return `Lỗi cấu hình: ${code}.`;
    const name = featureName(head);
    if (rest[0] === "not_object") return `${name}: dữ liệu bị hỏng; tải lại trang.`;
    if (rest[0] === "tier") return `${name}: chọn Miễn phí hoặc Premium.`;
    if (rest[0] === "unknown_key") return `${name}: trường lạ ${rest.slice(1).join(":")}.`;
    const side = rest[0] === "premium" ? "hạn mức Premium" : "hạn mức miễn phí";
    const problem = rest[1];
    if (problem === "count") return `${name}, ${side}: số lần phải là số nguyên từ ${SPEC.bounds.count.min} đến ${SPEC.bounds.count.max}.`;
    if (problem === "days") return `${name}, ${side}: số ngày phải là số nguyên từ ${SPEC.bounds.days.min} đến ${SPEC.bounds.days.max}.`;
    if (problem === "kind_not_allowed") return `${name}, ${side}: kiểu hạn mức này không dùng cho tính năng này.`;
    if (problem === "kind") return `${name}, ${side}: chọn một kiểu hạn mức.`;
    if (problem === "unknown_key") return `${name}, ${side}: trường lạ ${rest.slice(2).join(":")}.`;
    if (problem === "not_object") return `${name}, ${side}: dữ liệu bị hỏng; chọn lại kiểu hạn mức.`;
    return `${name}: giá trị không hợp lệ.`;
  }

  // The config the app uses when nothing is published (built-in defaults).
  function defaultConfig() { return clone(SPEC.defaults); }
  function formConfig(config) { return isObject(config) && isObject(config.features) ? clone(config) : defaultConfig(); }

  // Plain description of a limit as a user would meet it.
  function describeLimit(featureId, limit) {
    if (!isObject(limit)) return "—";
    if (limit.kind === "unlimited") return "Không giới hạn";
    if (limit.kind === "per_day") return `${limit.count} lần mỗi ngày`;
    if (limit.kind === "per_item_per_day") return `${limit.count} lần ${ITEM_WORDS[featureId] || "mỗi mục"} mỗi ngày`;
    if (limit.kind === "retake_after_days") return `Làm lại sau ${limit.days} ngày`;
    return "—";
  }
  const tierLabel = tier => (tier === "premium" ? "Premium" : tier === "free" ? "Miễn phí" : "—");
  // What a free (non-Premium) user meets for one feature.
  function freeUserView(featureId, feature) {
    if (!isObject(feature)) return "Theo mặc định có sẵn";
    if (feature.tier === "premium") return "Khóa: thấy nhãn Premium, bấm vào mở màn giới thiệu Premium. Nội dung đã lưu trước đó vẫn xem được.";
    return `Mở: ${describeLimit(featureId, feature.free)}.`;
  }
  function flatten(config) {
    const rows = new Map();
    const features = isObject(config?.features) ? config.features : {};
    for (const id of SPEC.editableFeatures) {
      const feature = features[id];
      rows.set(`${featureName(id)} · Gói`, tierLabel(feature?.tier));
      rows.set(`${featureName(id)} · Hạn mức miễn phí`, describeLimit(id, feature?.free));
      rows.set(`${featureName(id)} · Hạn mức Premium`, describeLimit(id, feature?.premium));
    }
    return rows;
  }
  function diffRows(before, after) {
    const a = flatten(before), b = flatten(after);
    return [...b.keys()].map(key => ({ key, from: a.get(key) ?? "—", to: b.get(key), changed: a.get(key) !== b.get(key) }));
  }

  // ---- Page state.
  let invalidated = false, active = null, epoch = 0;
  let form = { owner: "", config: null, note: "", dirty: false };
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
  function reportUnsaved() { window.NilazaUnsaved?.set("feature-access", form.dirty ? 1 : 0); }
  function resetForm(owner) { form = { owner, config: null, note: "", dirty: false }; reportUnsaved(); }
  function environmentLabel() { return window.NilazaDescribeEnvironment?.(window.ENV)?.label || "CHƯA RÕ MÔI TRƯỜNG"; }
  function rows() {
    const list = active?.rows || [];
    return { activeRow: list.find(row => row.status === "active") || null, draftRow: list.find(row => row.status === "draft") || null };
  }
  const publishedTime = row => { const ms = Date.parse(row?.publishedAt ?? ""); return Number.isFinite(ms) ? ms : -Infinity; };
  // Same choice as rollback_feature_access_config: the archived version published most recently.
  function rollbackSource() {
    const list = (active?.rows || []).filter(row => row.status === "archived" && row.publishedAt);
    return list.sort((a, b) => publishedTime(b) - publishedTime(a) || b.version - a.version)[0] || null;
  }
  function cleanRows(value) {
    if (!Array.isArray(value)) throw Error("invalid_response");
    return value.filter(row => isObject(row) && Number.isInteger(row.version) && ["draft", "active", "archived"].includes(row.status) && isObject(row.config))
      .sort((a, b) => b.version - a.version);
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
    if (error?.code === "42501") return action === "save" ? "Tài khoản này chưa có quyền lưu nháp (cần ai.manage, hoặc ai.read + content.draft)." : "Tài khoản này không có quyền ai.manage (chỉ Owner phát hành hay quay lại bản trước).";
    if (error?.code === "40001") return "Có người vừa phát hành hoặc quay lại một phiên bản khác. Bấm Tải lại rồi xem lại trước khi làm tiếp.";
    if (error?.code === "P0002") return "Chưa có bản đã phát hành trước đó để quay lại.";
    if (error?.code === "22023") return action === "save" ? "Máy chủ không nhận cấu hình này (giá trị ngoài giới hạn). Kiểm tra các ô báo đỏ." : "Máy chủ không nhận: bản nháp đã thay đổi, không còn hợp lệ hoặc lý do chưa đủ 10–500 ký tự. Tải lại rồi xem lại.";
    if (action === "rollback") return "Chưa quay lại được. Tải lại rồi thử lại.";
    return action === "publish" ? "Chưa phát hành được. Tải lại rồi thử lại." : "Chưa lưu được nháp. Tải lại rồi thử lại.";
  }
  function parseAmount(raw) {
    const text = String(raw ?? "").trim();
    if (!text) return undefined;
    return /^-?\d+(?:[.,]\d+)?$/.test(text) ? Number(text.replace(",", ".")) : text;
  }

  // ---- Rendering.
  function limitEditor(id, side, feature, editable) {
    const limit = isObject(feature?.[side]) ? feature[side] : {};
    const base = `fa-${id}-${side}`;
    const sideLabel = side === "premium" ? "Premium" : "miễn phí";
    const kinds = SPEC.allowedKinds[id];
    const options = kinds.map(kind => `<option value="${kind}" ${limit.kind === kind ? "selected" : ""}>${escape(kind === "per_item_per_day" && ITEM_WORDS[id] ? `Số lần ${ITEM_WORDS[id]} mỗi ngày` : KIND_LABELS[kind])}</option>`).join("")
      + (limit.kind && !kinds.includes(limit.kind) ? `<option value="${escape(limit.kind)}" selected>${escape(limit.kind)} (không hợp lệ)</option>` : "");
    const amountKey = AMOUNT_KEY[limit.kind];
    const amount = amountKey ? `<label class="visually-hidden" for="${base}-amount">${amountKey === "days" ? "Số ngày" : "Số lần"} (${escape(featureName(id))}, ${sideLabel})</label>
      <input class="input fa-amount" id="${base}-amount" data-fa-amount="${id}:${side}" inputmode="numeric" value="${escape(limit[amountKey] ?? "")}" ${editable ? "" : "disabled"}>
      <small class="helper">${amountKey === "days" ? `${SPEC.bounds.days.min}–${SPEC.bounds.days.max} ngày` : `${SPEC.bounds.count.min}–${SPEC.bounds.count.max} lần`}</small>` : "";
    return `<div class="fa-limit"><label class="visually-hidden" for="${base}-kind">Kiểu hạn mức ${sideLabel} (${escape(featureName(id))})</label>
      <select class="input" id="${base}-kind" data-fa-kind="${id}:${side}" ${editable ? "" : "disabled"}>${options}</select>${amount}</div>`;
  }
  function renderTable(editable) {
    const features = form.config.features;
    const { activeRow } = rows();
    const running = activeRow ? activeRow.config : defaultConfig();
    const body = SPEC.editableFeatures.map(id => {
      const feature = features[id];
      const changed = JSON.stringify(feature) !== JSON.stringify(running.features?.[id]);
      const tier = feature?.tier;
      const segmented = SPEC.tiers.map(value => `<label class="fa-segment ${tier === value ? "selected" : ""}"><input type="radio" name="fa-tier-${id}" value="${value}" data-fa-tier="${id}" ${tier === value ? "checked" : ""} ${editable ? "" : "disabled"}> ${tierLabel(value)}</label>`).join("");
      return `<tr data-fa-row="${id}" class="${changed ? "changed" : ""}"><th scope="row">${escape(featureName(id))}<br><small class="muted">${id}${changed ? " · khác bản đang chạy" : ""}</small></th>
        <td><fieldset class="fa-segmented"><legend class="visually-hidden">Gói của ${escape(featureName(id))}</legend>${segmented}</fieldset></td>
        <td>${limitEditor(id, "free", feature, editable)}</td>
        <td>${limitEditor(id, "premium", feature, editable)}</td></tr>`;
    }).join("");
    return `<section class="code-card" aria-labelledby="fa-table-title"><h3 id="fa-table-title">Tính năng phản chiếu trên máy</h3>
      <p class="helper">Miễn phí: ai cũng dùng được trong hạn mức miễn phí. Premium: người chưa có Premium thấy nhãn Premium và màn giới thiệu Premium; người có Premium dùng theo hạn mức Premium. Một ngày đổi lúc 0 giờ giờ Việt Nam.</p>
      <table class="config-table fa-table"><caption class="visually-hidden">Miễn phí / Premium và hạn mức của từng tính năng</caption>
        <thead><tr><th scope="col">Tính năng</th><th scope="col">Gói</th><th scope="col">Hạn mức miễn phí</th><th scope="col">Hạn mức Premium</th></tr></thead><tbody>${body}</tbody></table></section>`;
  }
  function renderServerManaged() {
    const switches = active.switches;
    const body = SPEC.serverManaged.map(item => {
      const row = Array.isArray(switches) ? switches.find(entry => entry.feature === item.id) : null;
      const state = active.switchStatus !== "ok" ? "Chưa tải được trạng thái" : row ? (row.enabled ? "Đang bật" : `Đang tắt${row.reason ? ` · ${row.reason}` : ""}`) : "Không có công tắc khẩn cấp riêng";
      return `<tr data-fa-server="${item.id}"><th scope="row">${escape(item.label)}<br><small class="muted">${item.id}</small></th><td>${escape(state)}</td><td>Do máy chủ giữ</td></tr>`;
    }).join("");
    return `<section class="code-card" aria-labelledby="fa-server-title"><h3 id="fa-server-title">Tính năng AI (chỉ xem)</h3>
      <p class="helper">Hạn mức và gói của các tính năng AI do máy chủ kiểm, chỉnh ở trang <a href="#features">Bật/tắt & hạn mức</a>. Bảng Miễn phí / Premium không bao giờ bật lại một tính năng đang tắt ở công tắc khẩn cấp.</p>
      <table class="config-table"><caption class="visually-hidden">Tính năng AI do máy chủ quản lý</caption><thead><tr><th scope="col">Tính năng</th><th scope="col">Công tắc</th><th scope="col">Hạn mức</th></tr></thead><tbody>${body}</tbody></table></section>`;
  }
  function audienceText() {
    const audience = active.audience;
    if (active.audienceStatus !== "ok" || !isObject(audience)) return "Chưa đếm được số tài khoản.";
    const policy = ACCOUNT_POLICY_MODE === "all_premium"
      ? " Đang thử nghiệm kín: mọi tài khoản đã đăng nhập được xem là Premium (công tắc hạng tài khoản), nên đặt Premium hiện chỉ đổi những gì khách chưa đăng nhập thấy."
      : "";
    return `${audience.totalAccounts} tài khoản: ${audience.premiumAccounts} có Premium đã mua, ${audience.freeAccounts} không có Premium đã mua.${policy}`;
  }
  function renderPreview() {
    if (!active.preview) return "";
    const { activeRow } = rows();
    const running = activeRow ? activeRow.config : defaultConfig();
    const config = form.config;
    const body = SPEC.editableFeatures.map(id => {
      const now = freeUserView(id, running.features?.[id]), next = freeUserView(id, config.features?.[id]);
      return `<tr data-fa-preview="${id}" class="${now !== next ? "changed" : ""}"><th scope="row">${escape(featureName(id))}</th><td>${escape(now)}</td><td>${escape(next)}</td></tr>`;
    }).join("");
    const locked = SPEC.editableFeatures.filter(id => config.features?.[id]?.tier === "premium").length;
    return `<section class="code-card" aria-labelledby="fa-preview-title" data-fa-preview-panel><h3 id="fa-preview-title">Xem trước như người dùng miễn phí</h3>
      <p>Bảng này so bản đang chạy với những gì đang chỉnh (kể cả phần chưa lưu). ${locked} tính năng sẽ hiện nhãn Premium với người chưa có Premium.</p>
      <p data-fa-audience>${escape(audienceText())}</p>
      <table class="config-table diff-table"><thead><tr><th scope="col">Tính năng</th><th scope="col">${activeRow ? "Đang chạy" : "Mặc định có sẵn"}</th><th scope="col">Sau khi phát hành</th></tr></thead><tbody>${body}</tbody></table>
      <p class="helper">Người có Premium vẫn dùng như cũ. Nội dung người dùng đã lưu không bị xóa hay khóa khi một tính năng chuyển sang Premium.</p></section>`;
  }
  function renderErrors(problems) {
    if (!problems.length) return '<p class="helper" data-fa-errors role="status">Cấu hình hợp lệ theo cùng quy tắc máy chủ kiểm.</p>';
    return `<div class="warning-card" data-fa-errors role="alert"><p><strong>Còn ${problems.length} lỗi, chưa lưu được:</strong></p><ul>${problems.map(code => `<li data-fa-error="${escape(code)}">${escape(describeError(code))}</li>`).join("")}</ul></div>`;
  }
  // Change log: who, when, what changed against the version that ran before it, and the reason.
  function renderHistory() {
    const list = (active.rows || []).filter(row => row.status !== "draft");
    if (!list.length) return '<section class="code-card" aria-labelledby="fa-history-title"><h3 id="fa-history-title">Nhật ký thay đổi</h3><p class="muted">Chưa phát hành phiên bản nào; app đang dùng mặc định có sẵn.</p></section>';
    const ordered = [...list].sort((a, b) => publishedTime(a) - publishedTime(b) || a.version - b.version);
    const body = ordered.map((row, index) => {
      const before = index > 0 ? ordered[index - 1].config : defaultConfig();
      const changes = diffRows(before, row.config).filter(item => item.changed);
      const who = row.publishedByEmail || row.createdByEmail || row.publishedBy || "—";
      const what = row.restoredFromVersion ? `Quay lại phiên bản ${row.restoredFromVersion}. ` : "";
      const changeText = changes.length ? `<ul>${changes.map(item => `<li>${escape(item.key)}: ${escape(item.from)} → ${escape(item.to)}</li>`).join("")}</ul>` : "Không đổi gì so với bản trước.";
      return `<tr data-fa-history="${row.version}"><th scope="row">${row.version}${row.status === "active" ? '<br><span class="pill">Đang chạy</span>' : ""}</th><td>${escape(row.publishedAt || "")}</td><td>${escape(who)}</td><td>${escape(what)}${changeText}</td><td>${escape(row.note || "")}</td></tr>`;
    }).reverse().join("");
    const source = rollbackSource(), { activeRow } = rows();
    const rollback = can("ai.manage") && active.status === "ok" && activeRow
      ? (source ? `<button type="button" class="button ghost" data-fa-rollback-open ${active.busy ? "disabled" : ""}>Quay lại bản trước (phiên bản ${source.version})</button>` : '<p class="helper">Chưa có bản trước để quay lại.</p>')
      : "";
    return `<section class="code-card" aria-labelledby="fa-history-title"><h3 id="fa-history-title">Nhật ký thay đổi</h3>
      <table class="config-table"><caption class="visually-hidden">Các phiên bản đã phát hành</caption><thead><tr><th scope="col">Phiên bản</th><th scope="col">Thời điểm</th><th scope="col">Ai</th><th scope="col">Trước → sau</th><th scope="col">Lý do</th></tr></thead><tbody>${body}</tbody></table>
      ${rollback}<p class="helper">Quay lại tạo một phiên bản mới giống bản trước; lịch sử không bị xóa. Bản nháp đang có không bị đụng tới.</p></section>`;
  }
  function renderDialog() {
    const dialog = active.dialog;
    if (!dialog) return "";
    const { activeRow, draftRow } = rows();
    const before = activeRow ? activeRow.config : defaultConfig();
    let title, lead, after, confirm;
    if (dialog.type === "rollback") {
      const source = rollbackSource();
      if (!source || !activeRow) return "";
      title = `Quay lại phiên bản ${source.version}`;
      lead = `Phiên bản đang chạy ${activeRow.version} được lưu trữ; cấu hình của phiên bản ${source.version} chạy lại dưới số phiên bản mới.`;
      after = source.config; confirm = `Quay lại phiên bản ${source.version}`;
    } else {
      if (!draftRow) return "";
      title = `Miễn phí / Premium, phiên bản ${draftRow.version}`;
      lead = activeRow ? `Phiên bản nháp ${draftRow.version} thay phiên bản đang chạy ${activeRow.version}; bản cũ được lưu trữ, không bị xóa.` : `Phiên bản nháp ${draftRow.version} thay mặc định có sẵn trong app.`;
      after = draftRow.config; confirm = `Phát hành phiên bản ${draftRow.version}`;
    }
    const diff = diffRows(before, after);
    const changed = diff.filter(row => row.changed).length;
    const table = diff.map(row => `<tr class="${row.changed ? "changed" : ""}" data-fa-diff="${escape(row.key)}"><th scope="row">${escape(row.key)}</th><td>${escape(row.from)}</td><td>${escape(row.to)}</td><td>${row.changed ? "Đổi" : "Giữ nguyên"}</td></tr>`).join("");
    return `<div class="modal-backdrop ai-feature-dialog-backdrop"><section class="modal ai-feature-dialog" id="fa-dialog" role="dialog" aria-modal="true" aria-labelledby="fa-dialog-title" tabindex="-1">
      <div class="modal-header"><div><p class="eyebrow">${dialog.type === "rollback" ? "Quay lại bản trước" : "Xem lại trước khi phát hành"}</p><h2 id="fa-dialog-title">${escape(title)}</h2></div></div>
      <p class="pill" id="fa-dialog-environment">Đang ghi vào: ${escape(environmentLabel())}</p>
      <p>${escape(lead)} ${changed} mục thay đổi.</p>
      <p data-fa-dialog-audience>${escape(audienceText())}</p>
      <table class="config-table diff-table"><thead><tr><th scope="col">Mục</th><th scope="col">${activeRow ? "Đang chạy" : "Mặc định có sẵn"}</th><th scope="col">Sau khi áp dụng</th><th scope="col">Thay đổi</th></tr></thead><tbody>${table}</tbody></table>
      <p class="helper">Nội dung người dùng đã lưu không bị xóa hay khóa. Người có Premium giữ quyền dùng. Tính năng đang tắt vẫn tắt. ${escape(APP_NOTE)}</p>
      <div class="config-field"><label for="fa-reason">Lý do (bắt buộc, 10–500 ký tự)</label><textarea class="input" id="fa-reason" rows="3" maxlength="500">${escape(dialog.reason)}</textarea></div>
      <div class="modal-actions"><button type="button" class="button ghost" data-fa-dialog-cancel>Hủy</button><button type="button" class="button primary" data-fa-confirm ${reasonOk(dialog) && !active.busy ? "" : "disabled"}>${escape(confirm)}</button></div>
    </section></div>`;
  }
  function reasonOk(dialog) {
    const length = String(dialog?.reason ?? "").trim().length;
    return length >= 10 && length <= 500;
  }
  function render() {
    if (!active) return;
    const { container } = active;
    if (invalidated || !can("ai.read")) {
      container.innerHTML = `<div class="warning-card" role="status">${invalidated ? "Máy chủ đã thay đổi. Tải lại trang." : "Cần quyền xem AI (ai.read)."}</div>`;
      return;
    }
    const heading = `<div class="detail-heading"><div><p class="eyebrow">Công tắc và hạn mức</p><h2 id="feature-access-title">Miễn phí / Premium</h2></div><span class="pill" role="status" aria-live="polite">${escape(active.statusText)}</span></div>`;
    const intro = `<p>Chọn từng tính năng là <strong>Miễn phí</strong> hay <strong>Premium</strong> và đặt hạn mức cho mỗi gói. <strong>Lưu nháp</strong> lưu lên máy chủ, người dùng chưa thấy; <strong>Xem trước như người dùng miễn phí</strong> cho thấy ai bị ảnh hưởng; chỉ Owner <strong>phát hành</strong>, kèm lý do.</p>
      <ul class="helper"><li>Chuyển sang Premium không xóa hay khóa nội dung người dùng đã lưu.</li><li>Người đang có Premium giữ quyền dùng.</li><li>Tính năng đã tắt ở công tắc khẩn cấp không bao giờ được bảng này hiện lại.</li></ul>
      <p class="helper" data-fa-app-note>${escape(APP_NOTE)}</p>`;
    if (active.status === "loading" || active.status === "idle") { container.innerHTML = `<div class="fa-page">${heading}${intro}<p class="muted">Đang tải cấu hình…</p></div>`; return; }
    const { activeRow, draftRow } = rows();
    const editable = canDraft() && active.status === "ok";
    const manage = can("ai.manage");
    const problems = validate(editConfig());
    const problem = active.status === "missing" ? `<div class="warning-card" role="note" data-fa-missing><p><strong>Chưa áp migration.</strong> ${escape(MIGRATION_NOTE)}</p></div>`
      : active.status === "error" ? '<div class="warning-card" role="note"><p>Không tải được cấu hình. Bấm Tải lại.</p></div>' : "";
    const runningLine = active.status === "ok"
      ? `<p data-fa-running>${activeRow ? `Đang chạy: phiên bản ${activeRow.version}${activeRow.publishedAt ? ` · phát hành ${escape(activeRow.publishedAt)}` : ""}` : "Đang chạy: mặc định có sẵn trong app (chưa phát hành phiên bản nào)."}${draftRow ? ` · Có bản nháp phiên bản ${draftRow.version}` : ""}</p>` : "";
    const previewButton = `<button type="button" class="button ghost" data-fa-preview-toggle aria-pressed="${active.preview ? "true" : "false"}">${active.preview ? "Ẩn xem trước" : "Xem trước như người dùng miễn phí"}</button>`;
    const actions = editable ? `<div class="config-field"><label for="fa-note">Ghi chú nháp (không bắt buộc)</label><input class="input" id="fa-note" maxlength="500" data-fa-note value="${escape(form.note)}"></div>
        <p class="helper" data-fa-dirty ${form.dirty ? "" : "hidden"}>Còn thay đổi chưa lưu. Bấm Lưu nháp${manage ? " trước khi phát hành" : ""}.</p>
        <div class="param-row">
          <button type="button" class="button" data-fa-save ${active.busy || problems.length ? "disabled" : ""}>Lưu nháp</button>
          ${form.dirty ? '<button type="button" class="button ghost" data-fa-discard>Bỏ thay đổi</button>' : ""}
          ${previewButton}
          ${manage ? `<button type="button" class="button primary" data-fa-review ${active.busy || !draftRow || form.dirty ? "disabled" : ""}>Xem lại & phát hành</button>` : ""}
        </div>
        ${manage ? (draftRow ? "" : '<p class="helper">Chưa có bản nháp trên máy chủ. Lưu nháp trước, rồi mới phát hành.</p>')
          : `<p class="helper" data-fa-owner-only>Chỉ Owner (quyền ai.manage) phát hành. ${draftRow ? "Bản nháp đã lưu, chờ Owner xem lại." : "Bấm Lưu nháp để gửi bản nháp cho Owner xem lại."}</p>`}`
      : `<div class="param-row">${previewButton}</div>${active.status === "ok" ? '<p class="muted" data-fa-readonly>Bạn chỉ có quyền xem. Lưu nháp cần ai.manage hoặc ai.read + content.draft; phát hành chỉ Owner (ai.manage).</p>'
        : '<p class="muted">Chỉ xem: chưa chỉnh được cho tới khi máy chủ có bảng cấu hình.</p>'}`;
    container.innerHTML = `<div class="fa-page">${heading}${intro}${problem}${runningLine}
      <div class="param-row"><button type="button" class="button ghost" id="fa-reload" ${active.busy ? "disabled" : ""}>Tải lại</button></div>
      ${renderTable(editable)}
      <section class="code-card" aria-label="Lưu và phát hành">${active.status === "ok" ? renderErrors(problems) : ""}${actions}
        <p class="helper" role="status" aria-live="polite" data-fa-message>${escape(active.message || "")}</p></section>
      ${renderPreview()}
      ${active.status === "ok" ? renderHistory() : ""}
      ${renderServerManaged()}</div>${renderDialog()}`;
    if (active.dialog && !active.dialog.keepFocus) { container.querySelector("#fa-reason")?.focus(); active.dialog.keepFocus = true; }
  }
  // Light refresh while typing a number: errors and buttons only, so the field keeps focus.
  function refreshLive() {
    if (!active) return;
    const problems = validate(form.config);
    const box = active.container.querySelector("[data-fa-errors]");
    if (box) box.outerHTML = renderErrors(problems);
    active.container.querySelector("[data-fa-dirty]")?.removeAttribute("hidden");
    const save = active.container.querySelector("[data-fa-save]");
    if (save) save.disabled = active.busy || problems.length > 0;
    const review = active.container.querySelector("[data-fa-review]");
    if (review) review.disabled = true;
  }
  function markDirty(full) {
    form.dirty = true; reportUnsaved();
    if (full) render(); else refreshLive();
  }

  // ---- Server.
  async function load() {
    if (!active || active.busy) return;
    const snapshot = scope(), version = ++epoch;
    if (invalidated || !snapshot.account || typeof window.NilazaAdminRpc !== "function") { active.statusText = "Chưa xác minh được phiên đăng nhập"; render(); return; }
    active.busy = true; active.statusText = "Đang tải…"; active.status = "loading"; render();
    if (!await window.NilazaRequireCapability?.("ai.read") || !current(snapshot, version)) { if (active && version === epoch) { active.busy = false; active.statusText = "Cần quyền ai.read"; render(); } return; }
    const [configs, audience, switches] = await Promise.allSettled([
      window.NilazaAdminRpc("get_feature_access_configs", {}, "ai.read"),
      window.NilazaAdminRpc("get_feature_access_audience", {}, "ai.read"),
      window.NilazaAdminRpc("get_ai_feature_switches", {}, "ai.read")
    ]);
    if (!current(snapshot, version)) return;
    if (configs.status === "fulfilled") {
      try { active.rows = cleanRows(configs.value); active.status = "ok"; active.statusText = "Đã tải"; }
      catch { active.rows = []; active.status = "error"; active.statusText = "Tải chưa được; thử lại"; }
    } else {
      active.rows = []; active.status = configs.reason?.missingFunction ? "missing" : "error";
      active.statusText = active.status === "missing" ? "Chưa áp migration" : "Tải chưa được; thử lại";
    }
    const counts = audience.status === "fulfilled" ? audience.value : null;
    active.audience = isObject(counts) && [counts.totalAccounts, counts.premiumAccounts, counts.freeAccounts].every(Number.isInteger) ? counts : null;
    active.audienceStatus = active.audience ? "ok" : "error";
    active.switches = switches.status === "fulfilled" && Array.isArray(switches.value)
      ? switches.value.filter(row => isObject(row) && typeof row.feature === "string" && typeof row.enabled === "boolean") : null;
    active.switchStatus = active.switches ? "ok" : "error";
    if (!form.dirty) form.config = null;
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
      const result = await window.NilazaAdminRpc("save_feature_access_draft", { config_input: config, note_input: note || null }, DRAFT_RULE);
      if (!current(snapshot, version)) return;
      if (!isObject(result) || result.status !== "draft" || !Number.isInteger(result.version) || !isObject(result.config)) throw Error("invalid_acknowledgement");
      active.rows = [result, ...active.rows.filter(row => row.status !== "draft")].sort((a, b) => b.version - a.version);
      if (JSON.stringify(form.config) === JSON.stringify(config)) { form.dirty = false; form.config = null; reportUnsaved(); }
      active.message = `Đã lưu nháp phiên bản ${result.version}. Người dùng chưa thấy thay đổi này.`;
    } catch (error) {
      if (!current(snapshot, version)) return;
      if (error?.missingFunction) { active.status = "missing"; active.statusText = "Chưa áp migration"; }
      else active.message = errorMessage(error, "save");
    } finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  async function confirmDialog() {
    if (!active || active.busy || !active.dialog) return;
    const dialog = active.dialog, reason = String(dialog.reason).trim(), { activeRow, draftRow } = rows();
    if (!reasonOk(dialog) || (dialog.type === "publish" && !draftRow) || (dialog.type === "rollback" && (!activeRow || !rollbackSource()))) { render(); return; }
    const snapshot = scope(), version = ++epoch;
    active.busy = true; active.message = dialog.type === "rollback" ? "Đang quay lại…" : "Đang phát hành…"; render();
    try {
      if (!await window.NilazaRequireCapability?.("ai.manage") || !current(snapshot, version)) return;
      const result = dialog.type === "rollback"
        ? await window.NilazaAdminRpc("rollback_feature_access_config", { expected_active_version: activeRow.version, reason_input: reason }, "ai.manage")
        : await window.NilazaAdminRpc("publish_feature_access_config", { version_input: draftRow.version, expected_active_version: activeRow ? activeRow.version : null, reason_input: reason }, "ai.manage");
      if (!current(snapshot, version)) return;
      if (!isObject(result) || result.status !== "active" || !Number.isInteger(result.version) || !isObject(result.config)
        || (dialog.type === "publish" && result.version !== draftRow.version)) throw Error("invalid_acknowledgement");
      const archived = active.rows.map(row => (row.status === "active" ? { ...row, status: "archived" } : row));
      active.rows = (dialog.type === "rollback" ? [result, ...archived] : archived.map(row => (row.version === result.version ? { ...row, ...result } : row)))
        .sort((a, b) => b.version - a.version);
      active.dialog = null;
      if (!form.dirty) form.config = null;
      active.message = dialog.type === "rollback"
        ? `Đã quay lại: phiên bản ${result.version} chạy cấu hình của phiên bản ${result.restoredFromVersion ?? "trước"}. App nhận trong khoảng ${SPEC.refreshMinutes} phút.`
        : `Đã phát hành phiên bản ${result.version}. App nhận trong khoảng ${SPEC.refreshMinutes} phút.`;
    } catch (error) {
      if (!current(snapshot, version)) return;
      if (error?.missingFunction) { active.status = "missing"; active.dialog = null; }
      else active.message = errorMessage(error, dialog.type);
    } finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  function openDialog(type) {
    if (!active || active.busy || !can("ai.manage") || active.status !== "ok") return;
    if (type === "publish" && (form.dirty || !rows().draftRow)) return;
    if (type === "rollback" && (!rows().activeRow || !rollbackSource())) return;
    active.dialog = { type, reason: "" };
    render();
  }
  function closeDialog() {
    if (!active?.dialog) return;
    const type = active.dialog.type;
    active.dialog = null;
    render();
    active.container.querySelector(type === "rollback" ? "[data-fa-rollback-open]" : "[data-fa-review]")?.focus();
  }

  // ---- Edits.
  function editable() { return Boolean(active && active.status === "ok" && canDraft() && !active.busy); }
  function onInput(event) {
    const target = event.target;
    if (target.id === "fa-reason" && active.dialog) {
      active.dialog.reason = target.value;
      const confirm = active.container.querySelector("[data-fa-confirm]");
      if (confirm) confirm.disabled = active.busy || !reasonOk(active.dialog);
      return;
    }
    if (!editable()) return;
    const config = editConfig();
    if (target.hasAttribute("data-fa-note")) { form.note = target.value; markDirty(false); return; }
    const amount = target.dataset.faAmount;
    if (amount) {
      const [id, side] = amount.split(":");
      const limit = config.features?.[id]?.[side];
      const key = AMOUNT_KEY[limit?.kind];
      if (!isObject(limit) || !key) return;
      const value = parseAmount(target.value);
      if (value === undefined) delete limit[key]; else limit[key] = value;
      markDirty(false);
    }
  }
  function onChange(event) {
    if (!editable()) return;
    const target = event.target, config = editConfig();
    const tierFor = target.dataset.faTier;
    if (tierFor && isObject(config.features?.[tierFor]) && SPEC.tiers.includes(target.value)) {
      config.features[tierFor].tier = target.value;
      markDirty(true); return;
    }
    const kindFor = target.dataset.faKind;
    if (kindFor) {
      const [id, side] = kindFor.split(":");
      const feature = config.features?.[id];
      if (!isObject(feature) || !SPEC.limitKinds.includes(target.value)) return;
      const previous = isObject(feature[side]) ? feature[side] : {};
      const key = AMOUNT_KEY[target.value];
      feature[side] = key ? { kind: target.value, [key]: AMOUNT_KEY[previous.kind] === key && previous[key] !== undefined ? previous[key] : AMOUNT_DEFAULT[key] } : { kind: target.value };
      markDirty(true);
    }
  }
  function onClick(event) {
    const target = event.target;
    if (target.closest("#fa-reload")) { if (!form.dirty || window.confirm?.("Bỏ các thay đổi chưa lưu và tải lại?") !== false) { form.dirty = false; form.config = null; reportUnsaved(); void load(); } return; }
    if (target.closest("[data-fa-preview-toggle]")) { active.preview = !active.preview; render(); return; }
    if (target.closest("[data-fa-review]")) { openDialog("publish"); return; }
    if (target.closest("[data-fa-rollback-open]")) { openDialog("rollback"); return; }
    if (target.closest("[data-fa-dialog-cancel]")) { closeDialog(); return; }
    if (target.closest("[data-fa-confirm]")) { void confirmDialog(); return; }
    if (target.closest("[data-fa-save]")) { void saveDraft(); return; }
    if (target.closest("[data-fa-discard]") && editable()) { form.dirty = false; form.config = null; reportUnsaved(); active.message = "Đã bỏ thay đổi chưa lưu."; render(); }
  }

  function clear() {
    epoch++;
    if (active) active.container.innerHTML = '<p role="status">Phiên đã thay đổi. Mở lại mục Miễn phí / Premium để tiếp tục.</p>';
    active = null;
  }
  window.NilazaFeatureAccess = Object.freeze({
    clear,
    spec: SPEC,
    accountPolicyMode: ACCOUNT_POLICY_MODE,
    validate,
    describeError,
    describeLimit,
    freeUserView,
    defaultConfig,
    diffRows,
    mount(container) {
      const now = scope();
      if (form.owner !== `${now.account}|${now.target}`) resetForm(`${now.account}|${now.target}`);
      if (active && active.container === container && active.account === now.account) { render(); return; }
      clear();
      active = { container, account: now.account, rows: [], switches: null, switchStatus: "idle", audience: null, audienceStatus: "idle", status: "idle", statusText: "Chưa tải", busy: false, dialog: null, preview: false, message: "" };
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
  window.addEventListener("hashchange", () => { if (active && !/^#access(?:\?|$)/.test(location.hash)) clear(); });
})();
