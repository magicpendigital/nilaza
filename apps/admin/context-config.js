(function () {
  // Dữ liệu gửi cho AI (Owner request 14/11, docs/proposals/AI_CONTEXT_CONFIG_2026-11-14.vi.md). Each AI feature is
  // drawn as a pipeline like n8n: đầu vào → khối dữ liệu → lớp prompt → chuỗi model → kiểm tra đầu ra → câu trả lời.
  // Data-block nodes can be switched off and their limits shortened through Lưu nháp → Xem lại & phát hành
  // (get_ai_context_configs / save_ai_context_config_draft / publish_ai_context_config, migration 20261114090200).
  // Hard rules, enforced again by the database and by supabase/functions/_shared/context-config.ts:
  // - only the blocks in SPEC exist; locked inputs (the message, language, persona) show a lock and a reason;
  // - every limit max equals today's code value, so a config can only send less than today;
  // - crisis screening, the separate data block and the provider data-class floor never read this config.
  // Configurable now: persona_chat, daily_insight, ai_council. The other three features are shown read-only
  // (the legacy ai-astrology-report entry was removed with the function, Owner decision 2026-11-15).
  // Reading needs ai.read. Saving a draft needs ai.manage, or ai.read + content.draft (editor); publishing needs
  // ai.manage. NilazaAdminRpc and the database check again.
  // SPEC is a copy of packages/agent-config/ai-context-blocks.json; scripts/admin-context-config.test.mjs keeps them equal.
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const SPEC = Object.freeze(/* @context-block-spec */ {
    "version": 1,
    "description": "Data blocks each AI feature may send to the model (Owner request 14/11, docs/proposals/AI_CONTEXT_CONFIG_2026-11-14.vi.md). Every limit max equals today's code value, so a published config can only send less. Mirrored in supabase/migrations/20261114090200_ai_context_configs.sql (nilaza_private.ai_context_block_spec) and apps/admin/context-config.js; tests keep the three equal.",
    "features": {
      "persona_chat": {
        "label": "Trò chuyện với người dẫn",
        "function": "ai-persona-chat",
        "configurable": true,
        "floorDataClass": "sensitive",
        "blocks": {
          "nickname": {
            "label": "Tên gọi",
            "dataClass": "personal",
            "description": "Tên người dùng tự đặt (tối đa 40 ký tự), chỉ để người dẫn xưng hô.",
            "whenOff": "Không gửi tên gọi.",
            "limits": {}
          },
          "goals": {
            "label": "Mục tiêu",
            "dataClass": "personal",
            "description": "Các mục tiêu người dùng chọn trong hồ sơ.",
            "whenOff": "Không gửi mục tiêu.",
            "limits": {
              "maxItems": {
                "label": "Số mục tối đa",
                "min": 1,
                "max": 5
              },
              "maxChars": {
                "label": "Ký tự mỗi mục",
                "min": 10,
                "max": 60
              }
            }
          },
          "tone": {
            "label": "Giọng trò chuyện",
            "dataClass": "personal",
            "description": "Giọng người dùng chọn (dịu dàng, thẳng thắn…), chỉ từ danh sách cố định.",
            "whenOff": "Gửi giọng mặc định \"gentle\" thay cho lựa chọn của người dùng.",
            "limits": {}
          },
          "localDateTime": {
            "label": "Giờ địa phương",
            "dataClass": "public",
            "description": "Ngày giờ hiện tại theo múi giờ Việt Nam, do máy chủ tạo.",
            "whenOff": "Không gửi giờ.",
            "limits": {}
          },
          "history": {
            "label": "Lịch sử trò chuyện",
            "dataClass": "sensitive",
            "description": "Các lượt gần nhất trong phòng chat này, để người dẫn nhớ mạch câu chuyện.",
            "whenOff": "Mỗi câu nhắn được trả lời như câu đầu tiên.",
            "limits": {
              "turns": {
                "label": "Số lượt",
                "min": 1,
                "max": 8
              },
              "chars": {
                "label": "Ký tự mỗi lượt",
                "min": 100,
                "max": 800
              }
            }
          },
          "handoff": {
            "label": "Ngữ cảnh mang theo",
            "dataClass": "sensitive",
            "description": "Khi người dùng bấm hỏi tiếp từ Tarot hoặc Chiêm tinh: câu hỏi khi đó, các lá, tóm tắt bài đọc, vị trí chính. Không bao giờ có ngày hay nơi sinh.",
            "whenOff": "Người dẫn không thấy bài đọc người dùng mang theo.",
            "limits": {
              "questionChars": {
                "label": "Ký tự câu hỏi khi đó",
                "min": 50,
                "max": 300
              },
              "summaryChars": {
                "label": "Ký tự tóm tắt",
                "min": 100,
                "max": 600
              }
            }
          }
        },
        "locked": [
          {
            "id": "message",
            "label": "Câu nhắn hiện tại",
            "dataClass": "sensitive",
            "reason": "Model cần câu nhắn để trả lời; lọc khủng hoảng chạy trên câu này trước mọi bước khác."
          },
          {
            "id": "language",
            "label": "Ngôn ngữ",
            "dataClass": "public",
            "reason": "Cần để trả lời đúng tiếng Việt hay tiếng Anh."
          },
          {
            "id": "persona",
            "label": "Hồ sơ người dẫn",
            "dataClass": "public",
            "reason": "Sửa ở trang Prompt & phiên bản và trang Người dẫn."
          }
        ]
      },
      "daily_insight": {
        "label": "Thông điệp hằng ngày",
        "function": "ai-daily-insight",
        "configurable": true,
        "floorDataClass": "sensitive",
        "blocks": {
          "nickname": {
            "label": "Tên gọi",
            "dataClass": "personal",
            "description": "Tên người dùng tự đặt (tối đa 40 ký tự).",
            "whenOff": "Không gửi cho model; câu dự phòng trên máy vẫn gọi tên.",
            "limits": {}
          },
          "goals": {
            "label": "Mục tiêu",
            "dataClass": "personal",
            "description": "Các mục tiêu người dùng chọn trong hồ sơ.",
            "whenOff": "Không gửi mục tiêu.",
            "limits": {
              "maxItems": {
                "label": "Số mục tối đa",
                "min": 1,
                "max": 5
              },
              "maxChars": {
                "label": "Ký tự mỗi mục",
                "min": 10,
                "max": 60
              }
            }
          },
          "tone": {
            "label": "Giọng",
            "dataClass": "personal",
            "description": "Giọng người dùng chọn, chỉ từ danh sách cố định.",
            "whenOff": "Không gửi giọng.",
            "limits": {}
          },
          "recentMood": {
            "label": "Tâm trạng 24 giờ",
            "dataClass": "sensitive",
            "description": "Chỉ nhãn tâm trạng (tối đa 32 ký tự) của mục nhật ký mới nhất trong 24 giờ. Không bao giờ có tiêu đề hay nội dung nhật ký.",
            "whenOff": "Không gửi tâm trạng.",
            "limits": {}
          },
          "localDateTime": {
            "label": "Giờ địa phương",
            "dataClass": "public",
            "description": "Ngày giờ hiện tại theo múi giờ Việt Nam, do máy chủ tạo.",
            "whenOff": "Không gửi giờ.",
            "limits": {}
          }
        },
        "locked": [
          {
            "id": "language",
            "label": "Ngôn ngữ",
            "dataClass": "public",
            "reason": "Cần để viết đúng tiếng Việt hay tiếng Anh."
          },
          {
            "id": "dateKey",
            "label": "Ngày và lần đổi",
            "dataClass": "public",
            "reason": "Cần để mỗi ngày và mỗi lần đổi ra một thông điệp khác; không phải dữ liệu cá nhân."
          },
          {
            "id": "journal",
            "label": "Nội dung nhật ký",
            "dataClass": "sensitive",
            "reason": "Không bao giờ gửi. Không có cách bật."
          }
        ]
      },
      "ai_council": {
        "label": "Hội đồng",
        "function": "ai-council",
        "configurable": true,
        "floorDataClass": "sensitive",
        "blocks": {
          "nickname": {
            "label": "Tên gọi",
            "dataClass": "personal",
            "description": "Tên người dùng tự đặt (tối đa 40 ký tự), chỉ để xưng hô.",
            "whenOff": "Không gửi tên gọi.",
            "limits": {}
          },
          "goals": {
            "label": "Mục tiêu",
            "dataClass": "personal",
            "description": "Các mục tiêu người dùng chọn.",
            "whenOff": "Không gửi mục tiêu.",
            "limits": {
              "maxItems": {
                "label": "Số mục tối đa",
                "min": 1,
                "max": 5
              },
              "maxChars": {
                "label": "Ký tự mỗi mục",
                "min": 10,
                "max": 60
              }
            }
          },
          "tone": {
            "label": "Giọng",
            "dataClass": "personal",
            "description": "Giọng người dùng chọn, chỉ từ danh sách cố định.",
            "whenOff": "Không gửi giọng.",
            "limits": {}
          },
          "localDateTime": {
            "label": "Giờ địa phương",
            "dataClass": "public",
            "description": "Ngày giờ hiện tại theo múi giờ Việt Nam, do máy chủ tạo.",
            "whenOff": "Không gửi giờ.",
            "limits": {}
          },
          "history": {
            "label": "Lịch sử hội đồng",
            "dataClass": "sensitive",
            "description": "Các lượt gần nhất của buổi hội đồng này (câu hỏi và lời người dẫn).",
            "whenOff": "Câu hỏi tiếp được trả lời như câu mở đầu.",
            "limits": {
              "turns": {
                "label": "Số lượt",
                "min": 1,
                "max": 12
              },
              "chars": {
                "label": "Ký tự mỗi lượt",
                "min": 100,
                "max": 800
              }
            }
          }
        },
        "locked": [
          {
            "id": "message",
            "label": "Câu hỏi",
            "dataClass": "sensitive",
            "reason": "Model cần câu hỏi để trả lời; lọc khủng hoảng chạy trên câu này trước mọi bước khác."
          },
          {
            "id": "language",
            "label": "Ngôn ngữ",
            "dataClass": "public",
            "reason": "Cần để trả lời đúng tiếng Việt hay tiếng Anh."
          },
          {
            "id": "personas",
            "label": "Người dẫn và mẫu hội đồng",
            "dataClass": "public",
            "reason": "Sửa ở trang Hội đồng."
          }
        ]
      },
      "oracle_router": {
        "label": "Oracle",
        "function": "ai-oracle-turn",
        "configurable": false,
        "floorDataClass": "sensitive",
        "fields": [
          {
            "id": "question",
            "label": "Câu hỏi",
            "dataClass": "sensitive",
            "consent": "—",
            "limit": "3000 ký tự"
          },
          {
            "id": "history",
            "label": "Lịch sử",
            "dataClass": "sensitive",
            "consent": "Cờ đồng ý lịch sử",
            "limit": "8 tin × 1500 ký tự; quá 8 tin thì từ chối"
          },
          {
            "id": "profile",
            "label": "Tên gọi, mục tiêu, giọng",
            "dataClass": "personal",
            "consent": "Cờ đồng ý hồ sơ",
            "limit": "40; 5 × 60; 3 giọng"
          },
          {
            "id": "screen",
            "label": "Màn hình hiện tại",
            "dataClass": "public",
            "consent": "—",
            "limit": "Danh sách cố định"
          },
          {
            "id": "journal",
            "label": "Nhật ký",
            "dataClass": "sensitive",
            "consent": "Cờ đồng ý nhật ký",
            "limit": "Không bao giờ gửi"
          }
        ]
      },
      "tarot_reading": {
        "label": "Giải bài Tarot",
        "function": "ai-tarot-reading",
        "configurable": false,
        "floorDataClass": "personal",
        "fields": [
          {
            "id": "question",
            "label": "Câu hỏi",
            "dataClass": "personal",
            "consent": "—",
            "limit": "4096 ký tự"
          },
          {
            "id": "topic",
            "label": "Chủ đề",
            "dataClass": "personal",
            "consent": "—",
            "limit": "80 ký tự"
          },
          {
            "id": "cards",
            "label": "Kiểu trải bài, lá, chiều, vị trí",
            "dataClass": "public",
            "consent": "—",
            "limit": "78 lá chuẩn"
          },
          {
            "id": "meanings",
            "label": "Nghĩa lá và phong cách bộ bài",
            "dataClass": "public",
            "consent": "—",
            "limit": "Gói nội dung đã phát hành"
          }
        ]
      },
      "astrology_insight": {
        "label": "Đọc sâu Chiêm tinh",
        "function": "ai-astrology-insight",
        "configurable": false,
        "floorDataClass": "sensitive",
        "fields": [
          {
            "id": "facts",
            "label": "Dữ kiện đã chọn từ báo cáo",
            "dataClass": "sensitive",
            "consent": "Đồng ý dữ liệu sinh khi tạo báo cáo",
            "limit": "30 dữ kiện; 12 vị trí; 45 góc chiếu; 12 nhà"
          },
          {
            "id": "question",
            "label": "Câu hỏi",
            "dataClass": "personal",
            "consent": "—",
            "limit": "500 ký tự"
          },
          {
            "id": "focus",
            "label": "Chế độ và chủ đề",
            "dataClass": "public",
            "consent": "—",
            "limit": "Danh sách cố định"
          }
        ]
      }
    }
  } /* @end */);
  const CLASS_LABELS = Object.freeze({ public: "Công khai", personal: "Cá nhân", sensitive: "Nhạy cảm" });
  const CLASS_RANK = Object.freeze({ public: 0, personal: 1, sensitive: 2 });
  const FEATURE_ORDER = Object.freeze(["persona_chat", "daily_insight", "ai_council", "oracle_router", "tarot_reading", "astrology_insight"]);
  const CONFIG_IDS = FEATURE_ORDER.filter(id => SPEC.features[id]?.configurable === true);
  const MIGRATION_NOTE = "Máy chủ chưa có bảng cấu hình dữ liệu — cần Owner áp migration 20261114090200. Các tính năng AI vẫn gửi dữ liệu như hôm nay.";
  const DEPLOY_NOTE = "Thay đổi chỉ có tác dụng khi ai-persona-chat, ai-daily-insight và ai-council đã được deploy bản biết đọc cấu hình này (cần Owner duyệt deploy). Bản cũ bỏ qua cấu hình và gửi như hôm nay.";
  const DRAFT_RULE = "ai.manage|ai.read+content.draft";
  const initialTransport = { target: window.NilazaAdminTransportTarget || "", url: window.ENV?.SUPABASE_URL || "", key: window.ENV?.SUPABASE_ANON_KEY || "" };
  let invalidated = false, active = null, epoch = 0;
  // Unsaved edits survive leaving the page for the same account (the shell keeps counting them);
  // a different account or backend starts empty.
  let forms = { owner: "", values: {}, dirty: new Set() };
  let selectedFeature = CONFIG_IDS[0];

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
  function reportUnsaved() { window.NilazaUnsaved?.set("context-config", forms.dirty.size); }
  function resetForms(owner) { forms = { owner, values: {}, dirty: new Set() }; reportUnsaved(); }
  function environmentLabel() { return window.NilazaDescribeEnvironment?.(window.ENV)?.label || "CHƯA RÕ MÔI TRƯỜNG"; }
  const featureSpec = id => SPEC.features[id];
  const blockEntries = id => Object.entries(featureSpec(id)?.blocks || {});
  const limitEntries = block => Object.entries(block.limits || {});
  function rowsFor(id) {
    const rows = active?.configs || [];
    return { activeRow: rows.find(row => row.feature === id && row.status === "active") || null, draftRow: rows.find(row => row.feature === id && row.status === "draft") || null };
  }
  function cleanConfigs(value) {
    if (!Array.isArray(value)) throw Error("invalid_response");
    return value.filter(row => row && CONFIG_IDS.includes(row.feature) && ["draft", "active", "archived"].includes(row.status)
      && Number.isInteger(row.version) && row.blocks && typeof row.blocks === "object" && !Array.isArray(row.blocks));
  }

  // Same rule as resolveContextPolicy (Edge): on unless enabled === false; whole-number limits clamped to [min, max];
  // anything else keeps today's value (the max). No row = today's behaviour.
  function resolve(id, row) {
    const stored = row?.blocks && typeof row.blocks === "object" && !Array.isArray(row.blocks) ? row.blocks : {};
    const result = {};
    for (const [blockId, block] of blockEntries(id)) {
      const raw = stored[blockId] && typeof stored[blockId] === "object" && !Array.isArray(stored[blockId]) ? stored[blockId] : {};
      const limits = {};
      for (const [name, limit] of limitEntries(block)) {
        const value = raw[name];
        limits[name] = Number.isInteger(value) ? Math.min(limit.max, Math.max(limit.min, value)) : limit.max;
      }
      result[blockId] = { enabled: raw.enabled !== false, limits };
    }
    return result;
  }
  // Provider data class of the request: the feature floor or the highest enabled block, never below the floor.
  function requestClass(id, resolved) {
    let rank = CLASS_RANK[featureSpec(id)?.floorDataClass] ?? CLASS_RANK.sensitive;
    for (const [blockId, block] of blockEntries(id)) if (resolved[blockId]?.enabled) rank = Math.max(rank, CLASS_RANK[block.dataClass] ?? CLASS_RANK.sensitive);
    return Object.keys(CLASS_RANK).find(name => CLASS_RANK[name] === rank) || "sensitive";
  }
  function describe(id, blockId, resolvedBlock) {
    const block = featureSpec(id).blocks[blockId];
    if (!resolvedBlock?.enabled) return "Không gửi";
    const parts = limitEntries(block).map(([name, limit]) => `${limit.label} ${resolvedBlock.limits[name]}${resolvedBlock.limits[name] === limit.max ? " (như hôm nay)" : ""}`);
    return ["Gửi", ...parts].join(" · ");
  }

  function formFrom(id) {
    if (forms.dirty.has(id) && forms.values[id]) return forms.values[id];
    const { activeRow, draftRow } = rowsFor(id);
    const resolved = resolve(id, draftRow || activeRow);
    const values = { blocks: {}, note: draftRow && typeof draftRow.note === "string" ? draftRow.note : "" };
    for (const [blockId] of blockEntries(id)) {
      values.blocks[blockId] = { enabled: resolved[blockId].enabled, limits: Object.fromEntries(Object.entries(resolved[blockId].limits).map(([name, value]) => [name, String(value)])) };
    }
    forms.values[id] = values;
    return values;
  }
  // What the form would send, for the graph preview; an unfinished number keeps today's value.
  function previewFrom(id) {
    const values = formFrom(id), resolved = {};
    for (const [blockId, block] of blockEntries(id)) {
      const limits = {};
      for (const [name, limit] of limitEntries(block)) {
        const text = String(values.blocks[blockId]?.limits[name] ?? "").trim();
        const number = /^\d+$/.test(text) ? Number(text) : limit.max;
        limits[name] = Math.min(limit.max, Math.max(limit.min, number));
      }
      resolved[blockId] = { enabled: values.blocks[blockId]?.enabled !== false, limits };
    }
    return resolved;
  }
  // Payload for save_ai_context_config_draft: every block of the feature, enabled plus each limit. Throws a
  // Vietnamese message for a value outside the allowed range; empty means today's value.
  function buildBlocks(id, values) {
    const payload = {};
    for (const [blockId, block] of blockEntries(id)) {
      const entry = { enabled: values.blocks?.[blockId]?.enabled !== false };
      for (const [name, limit] of limitEntries(block)) {
        const text = String(values.blocks?.[blockId]?.limits?.[name] ?? "").trim();
        if (!text) { entry[name] = limit.max; continue; }
        if (!/^\d+$/.test(text) || Number(text) < limit.min || Number(text) > limit.max) {
          throw Error(`${block.label} — ${limit.label}: nhập số nguyên từ ${limit.min} đến ${limit.max} (${limit.max} là mức hôm nay; không thể gửi nhiều hơn).`);
        }
        entry[name] = Number(text);
      }
      payload[blockId] = entry;
    }
    const note = String(values.note ?? "").trim();
    if (note.length > 500) throw Error("Ghi chú nháp tối đa 500 ký tự.");
    return { blocks: payload, note: note || null };
  }
  function publishAllowed(dialog) {
    const length = String(dialog?.note ?? "").trim().length;
    return length >= 10 && length <= 500;
  }
  function errorMessage(error, action) {
    if (error?.code === "42501") return action === "publish" ? "Tài khoản này không có quyền ai.manage." : "Tài khoản này chưa có quyền lưu nháp (cần ai.manage, hoặc ai.read + content.draft).";
    if (error?.code === "22023") return action === "publish" ? "Máy chủ không nhận: bản nháp đã thay đổi hoặc ghi chú chưa hợp lệ. Tải lại rồi xem lại." : "Máy chủ không nhận giá trị này (khối lạ hoặc ngoài giới hạn cho phép).";
    return action === "publish" ? "Chưa phát hành được. Tải lại rồi thử lại." : "Chưa lưu được nháp. Tải lại rồi thử lại.";
  }

  // ---- Node graph (plain SVG). Columns follow the request path; data blocks fan in to the prompt layer.
  const COL_W = 196, NODE_W = 172, NODE_H = 46, GAP_Y = 10, HEAD_H = 30, PAD = 12;
  const LOCK = (x, y) => `<g class="ctx-lock" transform="translate(${x},${y})" aria-hidden="true"><rect x="0" y="5" width="10" height="8" rx="1.5"></rect><path d="M2.5 5V3.6a2.5 2.5 0 0 1 5 0V5"></path></g>`;
  function graphColumns(id, resolved) {
    const spec = featureSpec(id);
    const dataNodes = spec.configurable
      ? [
        ...(spec.locked || []).map(item => ({ key: `locked:${item.id}`, label: item.label, sub: `${CLASS_LABELS[item.dataClass]} · luôn gửi`, kind: "locked", title: item.reason })),
        ...blockEntries(id).map(([blockId, block]) => {
          const state = resolved[blockId];
          const short = state.enabled ? limitEntries(block).map(([name]) => state.limits[name]).join(" × ") : "";
          return { key: `block:${blockId}`, label: block.label, sub: state.enabled ? `${CLASS_LABELS[block.dataClass]}${short ? ` · ${short}` : ""}` : "Đang tắt — không gửi", kind: state.enabled ? "on" : "off", title: block.description };
        })
      ]
      : (spec.fields || []).map(field => ({ key: `field:${field.id}`, label: field.label, sub: `${CLASS_LABELS[field.dataClass]} · ${field.limit}`, kind: "readonly", title: field.consent === "—" ? field.limit : `${field.consent}; ${field.limit}` }));
    const dataClass = spec.configurable ? requestClass(id, resolved) : spec.floorDataClass;
    return [
      { title: "Đầu vào", nodes: [{ key: "input", label: "Yêu cầu từ app", sub: "Đăng nhập · công tắc · lượt", kind: "locked", title: "Kiểm tra đăng nhập, công tắc và hạn mức trước khi đọc nội dung; lọc khủng hoảng chạy trước mọi bước gọi model." }] },
      { title: spec.configurable ? "Khối dữ liệu" : "Dữ liệu (chỉ xem)", nodes: dataNodes },
      { title: "Lớp prompt", nodes: [{ key: "prompt", label: "Prompt + quy tắc khóa", sub: "Dữ liệu ở khối riêng", kind: "locked", title: "Prompt đã phát hành (Prompt & phiên bản), sau đó các quy tắc khóa trong mã. Dữ liệu người dùng nằm trong khối dữ liệu riêng, không vào phần hướng dẫn hệ thống." }] },
      { title: "Chuỗi model", nodes: [{ key: "model", label: "Chuỗi model", sub: `Mức dữ liệu: ${CLASS_LABELS[dataClass]}`, kind: "link", title: "Chỉ nhà cung cấp được phép nhận mức dữ liệu này mới được gọi. Sửa ở Nhà cung cấp & Model." }] },
      { title: "Kiểm tra đầu ra", nodes: [{ key: "checks", label: "Lọc an toàn đầu ra", sub: "Khóa trong mã", kind: "locked", title: "Câu trả lời không an toàn được thay bằng câu dự phòng." }] },
      { title: "Câu trả lời", nodes: [{ key: "answer", label: "Trả về app", sub: "Ghi nhật ký AI", kind: "locked", title: "Nhật ký AI chỉ ghi số liệu và phiên bản cấu hình, không ghi nội dung." }] }
    ];
  }
  function renderGraph(id, resolved) {
    const columns = graphColumns(id, resolved);
    const rows = Math.max(...columns.map(column => column.nodes.length));
    const width = PAD * 2 + COL_W * (columns.length - 1) + NODE_W;
    const height = HEAD_H + PAD + rows * (NODE_H + GAP_Y);
    const positions = new Map();
    columns.forEach((column, col) => {
      const offset = HEAD_H + PAD + ((rows - column.nodes.length) * (NODE_H + GAP_Y)) / 2;
      column.nodes.forEach((node, index) => positions.set(node.key, { x: PAD + col * COL_W, y: offset + index * (NODE_H + GAP_Y), node }));
    });
    const center = (key, side) => { const p = positions.get(key); return { x: side === "out" ? p.x + NODE_W : p.x, y: p.y + NODE_H / 2 }; };
    const edge = (from, to, kind) => {
      const a = center(from, "out"), b = center(to, "in"), mid = (a.x + b.x) / 2;
      return `<path class="ctx-edge ctx-edge-${kind}" d="M${a.x} ${a.y} C${mid} ${a.y} ${mid} ${b.y} ${b.x} ${b.y}"></path>`;
    };
    const edges = [];
    for (const node of columns[1].nodes) {
      const kind = node.kind === "off" ? "off" : "on";
      edges.push(edge("input", node.key, kind), edge(node.key, "prompt", kind));
    }
    edges.push(edge("prompt", "model", "on"), edge("model", "checks", "on"), edge("checks", "answer", "on"));
    const nodes = [...positions.values()].map(({ x, y, node }) => {
      const blockId = node.key.startsWith("block:") ? node.key.slice(6) : "";
      return `<g class="ctx-node ctx-node-${node.kind}" data-ctx-node="${escape(node.key)}"${blockId ? ` data-ctx-block="${escape(blockId)}"` : ""}>
        <title>${escape(`${node.label}: ${node.title}`)}</title>
        <rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="10"></rect>
        <text class="ctx-node-label" x="${x + 12}" y="${y + 19}">${escape(node.label)}</text>
        <text class="ctx-node-sub" x="${x + 12}" y="${y + 35}">${escape(node.sub)}</text>
        ${node.kind === "locked" || node.kind === "readonly" ? LOCK(x + NODE_W - 20, y + 6) : ""}
      </g>`;
    }).join("");
    const heads = columns.map((column, col) => `<text class="ctx-col-head" x="${PAD + col * COL_W}" y="${HEAD_H - 10}">${escape(column.title)}</text>`).join("");
    const summary = columns.map(column => `${column.title}: ${column.nodes.map(node => `${node.label} (${node.kind === "off" ? "tắt" : node.kind === "on" ? "bật" : node.kind === "link" ? "xem trang Nhà cung cấp" : "khóa"})`).join(", ")}`).join(". ");
    return `<div class="ctx-graph-scroll" data-ctx-graph><svg class="ctx-graph" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="ctx-graph-title ctx-graph-desc">
      <title id="ctx-graph-title">Luồng dữ liệu của ${escape(featureSpec(id).label)}</title><desc id="ctx-graph-desc">${escape(summary)}</desc>
      ${heads}${edges.join("")}${nodes}</svg></div>`;
  }

  function renderBlockControls(id, editable) {
    const values = formFrom(id), spec = featureSpec(id);
    const locked = (spec.locked || []).map(item => `<article class="ctx-block ctx-block-locked" data-ctx-locked="${escape(item.id)}">
      <div class="layer-row"><h4>${LOCK_ICON} ${escape(item.label)}</h4><span class="pill">${CLASS_LABELS[item.dataClass]}</span></div>
      <p class="muted"><strong>Khóa:</strong> ${escape(item.reason)}</p></article>`).join("");
    const blocks = blockEntries(id).map(([blockId, block]) => {
      const state = values.blocks[blockId], inputId = `ctx-${id}-${blockId}`;
      const limits = limitEntries(block).map(([name, limit]) => `<div class="config-field"><label for="${inputId}-${name}">${escape(limit.label)}</label>
        <input class="input" type="number" inputmode="numeric" id="${inputId}-${name}" min="${limit.min}" max="${limit.max}" step="1" value="${escape(state.limits[name])}"
          data-ctx-limit="${escape(blockId)}" data-ctx-limit-name="${escape(name)}" ${editable && state.enabled ? "" : "disabled"}>
        <small class="helper">${limit.min}–${limit.max}; hôm nay ${limit.max}.</small></div>`).join("");
      return `<article class="ctx-block ${state.enabled ? "" : "ctx-block-off"}" data-ctx-block-card="${escape(blockId)}">
        <div class="layer-row"><h4>${escape(block.label)}</h4><span class="pill">${CLASS_LABELS[block.dataClass]}</span></div>
        <p>${escape(block.description)}</p>
        <label class="ctx-toggle" for="${inputId}-enabled"><input type="checkbox" id="${inputId}-enabled" data-ctx-enabled="${escape(blockId)}" ${state.enabled ? "checked" : ""} ${editable ? "" : "disabled"}> Gửi cho AI</label>
        <p class="helper">Khi tắt: ${escape(block.whenOff)}</p>
        ${limits ? `<div class="config-grid">${limits}</div>` : ""}
      </article>`;
    }).join("");
    return `<div class="ctx-blocks">${locked}${blocks}</div>`;
  }
  const LOCK_ICON = '<svg class="ctx-lock-icon" viewBox="0 0 10 13" width="10" height="13" aria-hidden="true"><rect x="0" y="5" width="10" height="8" rx="1.5"></rect><path d="M2.5 5V3.6a2.5 2.5 0 0 1 5 0V5"></path></svg>';

  function renderConfigurable(id) {
    const manage = can("ai.manage"), editable = canDraft() && active.status === "ok";
    if (active.status === "loading" || active.status === "idle") return '<p class="muted">Đang tải cấu hình…</p>';
    const problem = active.status === "missing" ? MIGRATION_NOTE : active.status === "error" ? "Không tải được cấu hình. Bấm Tải lại." : "";
    const { activeRow, draftRow } = rowsFor(id);
    const dirty = forms.dirty.has(id);
    const preview = previewFrom(id);
    return `${problem ? `<div class="warning-card" role="note"><p>${escape(problem)}</p></div>` : ""}
      <p>${activeRow ? `Đang chạy: phiên bản ${activeRow.version}${activeRow.publishedAt ? ` · phát hành ${escape(activeRow.publishedAt)}` : ""}` : "Đang chạy: mặc định trong mã (gửi mọi khối như hôm nay)."}${draftRow ? ` · Có bản nháp phiên bản ${draftRow.version}` : ""}</p>
      ${renderGraph(id, preview)}
      <p class="helper">Bấm một ô trong sơ đồ để tới phần chỉnh của ô đó. Ô có ổ khóa không tắt được. Mức dữ liệu gửi nhà cung cấp: <strong data-ctx-class>${CLASS_LABELS[requestClass(id, preview)]}</strong> (không bao giờ thấp hơn mức sàn ${CLASS_LABELS[featureSpec(id).floorDataClass]}).</p>
      <form class="config-form" data-ctx-form="${id}" novalidate>
        ${renderBlockControls(id, editable)}
        ${editable ? `<div class="config-field"><label for="ctx-${id}-note">Ghi chú nháp (không bắt buộc)</label><input class="input" id="ctx-${id}-note" maxlength="500" data-ctx-note="${id}" value="${escape(formFrom(id).note)}"></div>
        <p class="helper" data-ctx-dirty="${id}" ${dirty ? "" : "hidden"}>Còn thay đổi chưa lưu — bấm Lưu nháp${manage ? " trước khi phát hành" : ""}.</p>
        <div class="param-row">
          <button type="submit" class="button" data-ctx-save="${id}" ${active.busy ? "disabled" : ""}>Lưu nháp</button>
          ${manage ? `<button type="button" class="button primary" data-ctx-review="${id}" ${active.busy || !draftRow || dirty ? "disabled" : ""}>Xem lại & phát hành</button>` : ""}
        </div>
        ${manage ? (draftRow ? "" : '<p class="helper">Chưa có bản nháp trên máy chủ. Lưu nháp trước, rồi mới phát hành.</p>')
          : `<p class="helper">${draftRow ? "Chỉ Owner phát hành — bản nháp đã lưu, chờ Owner xem lại." : "Chỉ Owner phát hành. Bấm Lưu nháp để gửi bản nháp cho Owner xem lại."}</p>`}`
        : active.status === "ok" ? '<p class="muted">Bạn chỉ có quyền xem. Lưu nháp cần ai.manage hoặc ai.read + content.draft; phát hành cần ai.manage.</p>' : ""}
      </form>
      <p class="helper" role="status" aria-live="polite" data-ctx-message="${id}">${escape(active.messages[id] || "")}</p>`;
  }
  function renderReadOnly(id) {
    const spec = featureSpec(id);
    return `<div class="warning-card" role="note"><p><strong>Chỉ xem.</strong> Tính năng này chưa chỉnh được ở đây; sơ đồ cho thấy dữ liệu đang gửi hôm nay.</p></div>
      ${renderGraph(id, {})}
      <table class="config-table"><caption class="visually-hidden">Dữ liệu ${escape(spec.label)} gửi cho model</caption>
        <thead><tr><th scope="col">Dữ liệu</th><th scope="col">Mức</th><th scope="col">Cần đồng ý</th><th scope="col">Giới hạn</th></tr></thead>
        <tbody>${(spec.fields || []).map(field => `<tr><th scope="row">${escape(field.label)}</th><td>${CLASS_LABELS[field.dataClass]}</td><td>${escape(field.consent)}</td><td>${escape(field.limit)}</td></tr>`).join("")}</tbody></table>`;
  }

  function renderDialog() {
    const dialog = active.dialog;
    if (!dialog) return "";
    const id = dialog.feature, { activeRow, draftRow } = rowsFor(id);
    if (!draftRow) return "";
    const before = resolve(id, activeRow), after = resolve(id, draftRow);
    const rows = blockEntries(id).map(([blockId, block]) => {
      const a = describe(id, blockId, before[blockId]), b = describe(id, blockId, after[blockId]);
      return `<tr class="${a === b ? "" : "changed"}" data-ctx-diff="${escape(blockId)}"><th scope="row">${escape(block.label)}</th><td>${escape(a)}</td><td>${escape(b)}</td><td>${a === b ? "Giữ nguyên" : "Đổi"}</td></tr>`;
    }).join("");
    const classBefore = CLASS_LABELS[requestClass(id, before)], classAfter = CLASS_LABELS[requestClass(id, after)];
    return `<div class="modal-backdrop ai-feature-dialog-backdrop"><section class="modal ai-feature-dialog" id="ctx-dialog" role="dialog" aria-modal="true" aria-labelledby="ctx-dialog-title" tabindex="-1">
      <div class="modal-header"><div><p class="eyebrow">Xem lại trước khi phát hành</p><h2 id="ctx-dialog-title">${escape(featureSpec(id).label)}: dữ liệu gửi cho AI, phiên bản ${draftRow.version}</h2></div></div>
      <p class="pill" id="ctx-dialog-environment">Đang ghi vào: ${escape(environmentLabel())}</p>
      <p>${activeRow ? `Phiên bản nháp ${draftRow.version} thay phiên bản đang chạy ${activeRow.version}; bản cũ được lưu trữ, không bị xóa.` : `Phiên bản nháp ${draftRow.version} thay mặc định trong mã.`} Áp dụng trong khoảng 1 phút, khi Edge Function đọc lại cấu hình.</p>
      <table class="config-table diff-table"><thead><tr><th scope="col">Khối dữ liệu</th><th scope="col">Đang chạy</th><th scope="col">Sau khi phát hành</th><th scope="col">Thay đổi</th></tr></thead><tbody>${rows}
        <tr class="${classBefore === classAfter ? "" : "changed"}"><th scope="row">Mức dữ liệu gửi nhà cung cấp</th><td>${classBefore}</td><td>${classAfter}</td><td>${classBefore === classAfter ? "Giữ nguyên" : "Đổi"}</td></tr></tbody></table>
      <p class="helper">Cấu hình này chỉ bớt dữ liệu so với hôm nay nên không qua cổng chạy thử & chấm điểm. Lọc khủng hoảng, quy tắc khóa và lọc đầu ra không đổi.</p>
      <p class="helper">${escape(DEPLOY_NOTE)}</p>
      <div class="config-field"><label for="ctx-publish-note">Ghi chú phát hành (bắt buộc, 10–500 ký tự)</label><textarea class="input" id="ctx-publish-note" rows="3" maxlength="500">${escape(dialog.note)}</textarea></div>
      <div class="modal-actions"><button type="button" class="button ghost" data-ctx-dialog-cancel>Hủy</button><button type="button" class="button primary" data-ctx-publish="${id}" ${publishAllowed(dialog) && !active.busy ? "" : "disabled"}>Phát hành phiên bản ${draftRow.version}</button></div>
    </section></div>`;
  }
  function render() {
    if (!active) return;
    const { container } = active;
    if (invalidated || !can("ai.read")) {
      container.innerHTML = `<div class="warning-card" role="status">${invalidated ? "Máy chủ đã thay đổi. Tải lại trang." : "Cần quyền xem AI (ai.read)."}</div>`;
      return;
    }
    const id = selectedFeature;
    const picker = FEATURE_ORDER.map(featureId => {
      const spec = featureSpec(featureId), dirty = forms.dirty.has(featureId);
      return `<button type="button" class="button ${featureId === id ? "primary" : "ghost"}" data-ctx-feature="${featureId}" aria-pressed="${featureId === id}">${escape(spec.label)}${spec.configurable ? "" : " · chỉ xem"}${dirty ? " •" : ""}</button>`;
    }).join("");
    container.innerHTML = `<div class="ctx-page"><div class="detail-heading"><div><p class="eyebrow">Tính năng AI</p><h2 id="context-config-title">Dữ liệu gửi cho AI</h2></div><span class="pill" role="status" aria-live="polite">${escape(active.statusText)}</span></div>
      <p>Mỗi tính năng AI là một luồng: đầu vào → khối dữ liệu → lớp prompt → chuỗi model → kiểm tra đầu ra → câu trả lời. Tắt một khối để không gửi dữ liệu đó cho model, hoặc rút ngắn giới hạn. <strong>Chỉ có thể gửi ít hơn hôm nay</strong>, không thêm được trường mới. <strong>Lưu nháp</strong> lưu lên máy chủ, người dùng chưa thấy; <strong>Xem lại & phát hành</strong> áp dụng sau khi bạn xem thay đổi và ghi chú.</p>
      <p class="helper">${escape(DEPLOY_NOTE)}</p>
      <div class="param-row ctx-picker" role="group" aria-label="Chọn tính năng">${picker}</div>
      <div class="param-row"><button type="button" class="button ghost" id="ctx-reload" ${active.busy ? "disabled" : ""}>Tải lại</button></div>
      <section class="code-card ctx-feature" aria-labelledby="ctx-feature-title"><h3 id="ctx-feature-title">${escape(featureSpec(id).label)} <small class="muted">${escape(featureSpec(id).function)}</small></h3>
        ${featureSpec(id).configurable ? renderConfigurable(id) : renderReadOnly(id)}
      </section></div>${renderDialog()}`;
    if (active.dialog && !active.dialog.keepFocus) { container.querySelector("#ctx-publish-note")?.focus(); active.dialog.keepFocus = true; }
  }
  // Light refresh while editing: graph, data class and buttons only, so a number field keeps focus.
  function refreshPreview(id) {
    if (!active || id !== selectedFeature) return;
    const preview = previewFrom(id), graph = active.container.querySelector("[data-ctx-graph]");
    if (graph) graph.outerHTML = renderGraph(id, preview);
    const label = active.container.querySelector("[data-ctx-class]");
    if (label) label.textContent = CLASS_LABELS[requestClass(id, preview)];
    active.container.querySelector(`[data-ctx-dirty="${id}"]`)?.removeAttribute("hidden");
    const review = active.container.querySelector(`[data-ctx-review="${id}"]`);
    if (review) review.disabled = true;
    for (const [blockId] of blockEntries(id)) {
      const enabled = preview[blockId].enabled;
      active.container.querySelector(`[data-ctx-block-card="${blockId}"]`)?.classList.toggle("ctx-block-off", !enabled);
      active.container.querySelectorAll(`[data-ctx-limit="${blockId}"]`).forEach(input => { input.disabled = !enabled; });
    }
    const pickerButton = active.container.querySelector(`[data-ctx-feature="${id}"]`);
    if (pickerButton && !pickerButton.textContent.endsWith("•")) pickerButton.textContent += " •";
  }
  function markDirty(id) { forms.dirty.add(id); reportUnsaved(); refreshPreview(id); }

  async function load() {
    if (!active || active.busy) return;
    const snapshot = scope(), version = ++epoch;
    if (invalidated || !snapshot.account || typeof window.NilazaAdminRpc !== "function") { active.statusText = "Chưa xác minh được phiên đăng nhập"; render(); return; }
    active.busy = true; active.statusText = "Đang tải…"; active.status = "loading"; render();
    if (!await window.NilazaRequireCapability?.("ai.read") || !current(snapshot, version)) { if (active && version === epoch) { active.busy = false; active.statusText = "Cần quyền ai.read"; render(); } return; }
    try {
      const rows = await window.NilazaAdminRpc("get_ai_context_configs", {}, "ai.read");
      if (!current(snapshot, version)) return;
      active.configs = cleanConfigs(rows); active.status = "ok"; active.statusText = "Đã tải";
    } catch (error) {
      if (!current(snapshot, version)) return;
      active.configs = []; active.status = error?.missingFunction ? "missing" : "error";
      active.statusText = active.status === "missing" ? "Thiếu bảng cấu hình trên máy chủ" : "Tải chưa được; thử lại";
    }
    active.busy = false;
    render();
  }
  async function saveDraft(id) {
    if (!active || active.busy || active.status !== "ok" || !CONFIG_IDS.includes(id)) return;
    let payload;
    try { payload = buildBlocks(id, formFrom(id)); }
    catch (error) { active.messages[id] = error.message; render(); return; }
    const snapshot = scope(), version = ++epoch;
    active.busy = true; active.messages[id] = "Đang lưu nháp…"; render();
    try {
      if (!await requireDraft() || !current(snapshot, version)) return;
      const result = await window.NilazaAdminRpc("save_ai_context_config_draft", { feature_input: id, blocks_input: payload.blocks, note_input: payload.note }, DRAFT_RULE);
      if (!current(snapshot, version)) return;
      if (result?.feature !== id || result.status !== "draft" || !Number.isInteger(result.version) || !result.blocks) throw Error("invalid_acknowledgement");
      active.configs = [...active.configs.filter(row => !(row.feature === id && row.status === "draft")), result];
      forms.dirty.delete(id); delete forms.values[id]; reportUnsaved();
      active.messages[id] = `Đã lưu nháp phiên bản ${result.version}. Người dùng chưa thấy thay đổi này.`;
    } catch (error) {
      if (!current(snapshot, version)) return;
      if (error?.missingFunction) { active.status = "missing"; active.statusText = "Thiếu bảng cấu hình trên máy chủ"; }
      else active.messages[id] = errorMessage(error, "save");
    } finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  async function publish(id) {
    if (!active || active.busy || !active.dialog || active.dialog.feature !== id) return;
    const note = active.dialog.note.trim(), { draftRow } = rowsFor(id);
    if (!draftRow || !publishAllowed(active.dialog)) { render(); return; }
    const snapshot = scope(), version = ++epoch;
    active.busy = true; active.messages[id] = "Đang phát hành…"; render();
    try {
      if (!await window.NilazaRequireCapability?.("ai.manage") || !current(snapshot, version)) return;
      const result = await window.NilazaAdminRpc("publish_ai_context_config", { feature_input: id, version_input: draftRow.version, note_input: note }, "ai.manage");
      if (!current(snapshot, version)) return;
      if (result?.feature !== id || result.status !== "active" || result.version !== draftRow.version) throw Error("invalid_acknowledgement");
      active.configs = active.configs.map(row => row.feature !== id ? row : row.version === result.version ? { ...row, ...result } : row.status === "active" ? { ...row, status: "archived" } : row);
      active.dialog = null;
      active.messages[id] = `Đã phát hành phiên bản ${result.version}. Áp dụng trong khoảng 1 phút.`;
    } catch (error) {
      if (!current(snapshot, version)) return;
      if (error?.missingFunction) { active.status = "missing"; active.dialog = null; }
      else active.messages[id] = errorMessage(error, "publish");
    } finally { if (current(snapshot, version)) { active.busy = false; render(); } }
  }
  function openDialog(id) {
    if (!active || active.busy || forms.dirty.has(id) || !rowsFor(id).draftRow || !can("ai.manage")) return;
    active.dialog = { feature: id, note: "" };
    render();
  }
  function closeDialog() {
    if (!active?.dialog) return;
    const id = active.dialog.feature;
    active.dialog = null;
    render();
    active.container.querySelector(`[data-ctx-review="${id}"]`)?.focus();
  }
  function focusNode(key) {
    if (!active) return;
    const [kind, name] = key.split(":");
    if (kind === "block") active.container.querySelector(`[data-ctx-enabled="${name}"]`)?.focus();
    else if (kind === "locked") active.container.querySelector(`[data-ctx-locked="${name}"]`)?.scrollIntoView?.({ block: "nearest" });
    else if (key === "model") location.hash = "#providers";
  }

  function clear() {
    epoch++;
    if (active) active.container.innerHTML = '<p role="status">Phiên đã thay đổi. Mở lại mục Dữ liệu gửi cho AI để tiếp tục.</p>';
    active = null;
  }
  window.NilazaContextConfig = Object.freeze({
    clear,
    spec: SPEC,
    buildBlocks,
    resolve,
    requestClass,
    mount(container) {
      const now = scope();
      if (forms.owner !== `${now.account}|${now.target}`) resetForms(`${now.account}|${now.target}`);
      if (active && active.container === container && active.account === now.account) { render(); return; }
      clear();
      active = { container, account: now.account, configs: [], status: "idle", statusText: "Chưa tải", busy: false, dialog: null, messages: {} };
      container.onclick = event => {
        if (!active || active.container !== container || invalidated || !can("ai.read")) return;
        if (event.target.closest("#ctx-reload")) { void load(); return; }
        const pick = event.target.closest("[data-ctx-feature]");
        if (pick && featureSpec(pick.dataset.ctxFeature)) { selectedFeature = pick.dataset.ctxFeature; render(); return; }
        const node = event.target.closest("[data-ctx-node]");
        if (node) { focusNode(node.dataset.ctxNode); return; }
        const review = event.target.closest("[data-ctx-review]");
        if (review) { openDialog(review.dataset.ctxReview); return; }
        if (event.target.closest("[data-ctx-dialog-cancel]")) { closeDialog(); return; }
        const publishButton = event.target.closest("[data-ctx-publish]");
        if (publishButton) void publish(publishButton.dataset.ctxPublish);
      };
      container.onsubmit = event => {
        const form = event.target.closest("[data-ctx-form]");
        if (!active || active.container !== container || !form) return;
        event.preventDefault();
        if (canDraft()) void saveDraft(form.dataset.ctxForm);
      };
      container.oninput = event => {
        if (!active || active.container !== container) return;
        if (event.target.id === "ctx-publish-note" && active.dialog) {
          active.dialog.note = event.target.value;
          const confirm = container.querySelector("[data-ctx-publish]");
          if (confirm) confirm.disabled = active.busy || !publishAllowed(active.dialog);
          return;
        }
        const id = selectedFeature;
        if (!CONFIG_IDS.includes(id) || !canDraft() || active.status !== "ok") return;
        const values = formFrom(id);
        if (event.target.dataset?.ctxNote === id) { values.note = event.target.value; markDirty(id); return; }
        const blockId = event.target.dataset?.ctxLimit, name = event.target.dataset?.ctxLimitName;
        if (blockId && name && values.blocks[blockId] && name in values.blocks[blockId].limits) { values.blocks[blockId].limits[name] = event.target.value; markDirty(id); }
      };
      container.onchange = event => {
        if (!active || active.container !== container) return;
        const id = selectedFeature, blockId = event.target.dataset?.ctxEnabled;
        if (!blockId || !CONFIG_IDS.includes(id) || !canDraft() || active.status !== "ok") return;
        const values = formFrom(id);
        if (!values.blocks[blockId]) return;
        values.blocks[blockId].enabled = event.target.checked === true;
        markDirty(id);
      };
      container.onkeydown = event => { if (event.key === "Escape" && active?.dialog) { event.preventDefault(); closeDialog(); } };
      render();
      void load();
    }
  });
  window.addEventListener("hashchange", () => { if (active && !/^#context(?:\?|$)/.test(location.hash)) clear(); });
})();
