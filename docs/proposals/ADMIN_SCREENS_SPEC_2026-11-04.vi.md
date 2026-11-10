# Đặc tả màn hình Admin Nilaza mới

Ngày 04/11/2026. Tiếp nối [`ADMIN_REDESIGN_2026-11-03.vi.md`](ADMIN_REDESIGN_2026-11-03.vi.md) (Owner đã duyệt kiến trúc điều hướng ở mục 5) và [`LLM_PROVIDERS_FALLBACK_2026-11-03.vi.md`](LLM_PROVIDERS_FALLBACK_2026-11-03.vi.md) (Owner duyệt Giai đoạn 0; thứ tự nhà cung cấp trực tiếp Anthropic → Gemini → OpenAI → DeepSeek; gửi tên gọi cho AI; Tarot 1 lượt/ngày).

**Thiết kế trực quan:** canvas <https://claude.ai/artifact/JfSTk3fKJANL1T8Ptcxo9k> — 19 artboard, xếp 5 hàng: Tổng quan và Tính năng AI (bản 03/11); Nội dung; **Cấu hình từng tính năng AI (7 màn)**; AI: nhà cung cấp, prompt, chạy thử; Vận hành và Đăng nhập.

**Đây là đặc tả, chưa sửa mã.** Chưa chạy SQL, chưa deploy. Tên bảng/hàm "đã có" là đọc trong `supabase/migrations/` và `supabase/functions/` tại `033fb86`. Chưa đối chiếu với database thật (QA `akgrokwnkfqnfjqrildi` hay Singapore `etfajmrwyywokgafzxsb`).

Nhãn dùng trong canvas và tài liệu này:

| Nhãn | Nghĩa |
|---|---|
| **Đã có** | Backend đã đọc/ghi trường này; chỉ cần giao diện |
| **Mới · chỉ mã Admin** | Làm trong `apps/admin`, không cần Owner duyệt từng lần (nhưng push `main` sẽ tự deploy Admin staging) |
| **Mới · SQL** | Cần migration mới → Owner duyệt chạy |
| **Mới · Edge Function** | Cần sửa và deploy hàm → Owner duyệt deploy |
| **Mới · Storage** | Cần tạo bucket → Owner duyệt |
| **Khóa trong mã** | Cố ý không cho sửa ở Admin (an toàn, khủng hoảng 115) |
| **Rủi ro · sửa trước** | Lỗ hổng chi phí/riêng tư nên vá trước khi làm giao diện |

---

## 1. Nguyên tắc chung cho mọi màn

1. **Khung chung:** một thanh trên (tên NILAZA, đường dẫn, "N thay đổi chưa lưu", nhãn **Đang ghi vào: <môi trường>**, tài khoản) + một thanh trái duy nhất theo mục 5 của đề xuất 03/11. Thanh trái chỉ hiện mục tài khoản có quyền (`nilaza_private.has_capability`). Ở chiều rộng điện thoại, thanh trái xếp lên trên.
2. **Hai nút, hai nghĩa:** *Lưu nháp* = lưu lên máy chủ, người dùng chưa thấy. *Xem lại & phát hành* = mở hộp tóm tắt thay đổi (diff, kết quả chạy thử, môi trường, ghi chú bắt buộc) rồi mới áp dụng. Bỏ "nháp trình duyệt" (AD-09, AD-17).
3. **Một phiên bản = cả gói cấu hình của tính năng** (prompt + bộ chỉnh giọng + biến ngữ cảnh + chuỗi model + luật). So sánh và khôi phục theo gói. Khôi phục tạo bản mới, không xóa lịch sử.
4. **Không bao giờ hiện hay nhập khóa/JWT.** Mọi gọi máy chủ dùng phiên đăng nhập (`NilazaAdminRpc`). Khóa nhà cung cấp chỉ ở Supabase Secrets (AD-21).
5. **Mỗi thao tác đổi trạng thái** (phát hành, công tắc, hạn mức, kiểm tra khóa, quyền) ghi vào nhật ký máy chủ với người, lúc, môi trường, lý do.
6. Tiếng Việt mặc định; thuật ngữ kỹ thuật thu vào "Chi tiết kỹ thuật". Vùng chạm ≥ 44 px, tương phản ≥ 4,5:1, mọi ô có `<label>`, cảnh báo khi rời trang còn thay đổi chưa lưu.
7. Thương hiệu Open Reflection: nền charcoal `#151416`, thẻ `#1F1C1E`, chữ ivory `#F7F1E6`, nhấn gold `#C9A45C`; EB Garamond (tiêu đề) + Hanken Grotesk (chữ thường).

---

## 2. Dữ liệu backend: cái có sẵn và cái cần làm mới

### 2.1. Có sẵn (đọc trong migration)

| Bảng / hàm | Dùng cho màn |
|---|---|
| `ai_feature_switches` + `get_ai_feature_switches` / `set_ai_feature_switch` (chỉ `ai_council`, `persona_chat`, `astrology_insight`) | Tính năng AI › Trạng thái |
| `model_route_versions` + `publish_model_route_config` (1 chính + 1 dự phòng; nhà cung cấp chỉ `openai/openrouter/gemini/anthropic`) | Chuỗi model |
| `prompt_versions` (feature ∈ `persona_chat, tarot_reading, daily_insight, astrology_report, face_reading, safety_fallback`; owner `global/persona/tarot_deck`) | Prompt; runtime Tarot và Persona đã đọc |
| `get_astrology_prompt_config` / `publish_astrology_prompt_pair` | Prompt Đọc sâu (đường publish duy nhất đang chạy) |
| `personas` | Người dẫn (chat đọc; Council chưa đọc) |
| `admin_content_bundles` + `publish_content_bundle` / `get_published_content_bundle`, `admin_content_bundle_events` | Người dẫn, Bộ bài, Văn bản (publish cả gói — AD-01) |
| `ai_council_config_versions`, `ai_council_template_versions` | Hội đồng |
| `nilaza_private.ai_quota_days` (nhóm `chat_oracle`, `tarot_one`), `ai_usage_operations`, `ai_budget_*` | Hạn mức, ngân sách (chưa hàm nào gọi) |
| `ai_trace_runs/spans/payload_refs/scores` + `search_ai_trace_runs`, `get_ai_trace_detail` | Nhật ký AI; `ai_trace_scores` dùng lại cho chấm điểm |
| `nilaza_private.ai_feedback`, `ai_answer_receipts` + `get_ai_feedback_inbox`, `review_ai_feedback` (chỉ Tarot, Chiêm tinh) | Phản hồi người dùng |
| `admin_audit_logs`, `get_ai_admin_audit_events` | Lịch sử thao tác |
| Quyền: `content.read/draft/publish/delete`, `ai.read`, `ai.manage`, `safety.review`, `roles.manage`, `overview.read`, `hub.read`, `notifications.dispatch` | Mọi màn |

### 2.2. Cần làm mới (đề xuất; mỗi dòng là một migration hoặc deploy cần Owner duyệt)

| Mã | Thay đổi | Loại |
|---|---|---|
| D1 | Mở rộng `ai_feature_switches.feature` thêm `tarot_reading`, `daily_insight`, `astrology_report`, `oracle_router` + seed dòng bật | SQL |
| D2 | Bảng `ai_feature_configs` (có phiên bản: `feature, version, status draft/active/archived, quota_daily, quota_group, follow_ups, deadline_ms, cost_cap_micro, data_class, context_vars jsonb, voice_knobs jsonb, safety jsonb, output_check, copy jsonb {hết lượt, tạm nghỉ, câu soạn sẵn}, prompt_version_ids, route_version_id, eval_run_id, note, published_by/at`); chỉ 1 bản `active` mỗi tính năng (unique index một phần) + RPC `get_ai_feature_config`, `save_ai_feature_config_draft`, `publish_ai_feature_config` (bắt `ai.manage`, ghi audit, kiểm cổng chạy thử) | SQL |
| D3 | `model_route_versions` thêm `steps jsonb` (≤ 4 bước `{provider, model, timeout_ms, max_tokens, temperature, json_mode, reasoning}`) và `total_deadline_ms`; mở rộng check nhà cung cấp thêm `deepseek` | SQL |
| D4 | Bảng `ai_providers` (`provider, priority, enabled, secret_name, allowed_data_class, phase`) + `ai_provider_health` (cầu dao: `failures, opened_until, last_probe_at, last_probe_result`) + RPC `probe_ai_provider` (chỉ gọi từ Edge, trả Ổn/Sai khóa/Hết tiền/Không gọi được) | SQL + Edge |
| D5 | `prompt_versions`: thêm feature `ai_council`, `oracle_router`, `astrology_insight`; unique index một phần "một bản active / (feature, owner_type, owner_id, locale)" (sửa AI-04); RPC chung `save_prompt_draft`, `publish_prompt_version` (kiểm chèn lệnh giống `isUsableTarotPromptText`, bắt đủ VI+EN) | SQL |
| D6 | Bảng chấm thử `ai_eval_sets`, `ai_eval_cases`, `ai_eval_runs`, `ai_eval_results` (điểm từng tiêu chí; dùng lại `ai_trace_scores` cho chấm thủ công) + Edge `admin-ai-eval-run` (chạy bản nháp bằng chuỗi model thật, trừ vào ngân sách chấm thử 10 USD) | SQL + Edge |
| D7 | Nội dung phát hành từng mục: bảng `content_items(kind, item_key, locale, payload, status, version)` hoặc RPC `publish_content_items(keys[])` trên gói hiện có; lịch sử + khôi phục (AD-01/03/06/07) | SQL |
| D8 | Bucket Storage `content-images` (chỉ ảnh, ≤ 1 MB, đọc công khai, ghi bằng `content.draft`) | Storage |
| D9 | `ai_feedback`: thêm `assignee_id, severity, internal_note`; mở rộng feature cho chat/Council/Daily | SQL |
| D10 | View/RPC `get_admin_timeline` gộp `admin_audit_logs`, `admin_content_bundle_events`, sự kiện AI | SQL |
| E1 | Bộ định tuyến Giai đoạn 0: `models[]` + `provider:{zdr, data_collection:"deny"}` cho mọi tính năng, phân loại lỗi, **kiểm định dạng trong bộ định tuyến**, khóa Gemini sang header | Edge |
| E2 | Hàm đọc `ai_feature_configs` + công tắc + hạn mức `ai_quota_days` (hoàn lượt khi lỗi) cho Tarot, Chat/Oracle, Daily, Astrology report | Edge |
| E3 | Ghép khối ngữ cảnh theo `context_vars`: tên gọi, ngày giờ địa phương, mục tiêu/giọng **cắt độ dài và đặt trong phần dữ liệu, không ghép vào system** (AI-05) | Edge |
| E4 | Tarot đọc nghĩa lá + phong cách bộ bài từ nội dung đã phát hành thay vì `packages/content/data/tarot-cards.json` (AD-05) | Edge |
| E5 | Trace thêm vị trí bước, loại lỗi, mã HTTP, chi phí, kết quả `ok / ok_dự_phòng / câu_soạn_sẵn / chặn_an_toàn` | Edge (+ SQL nếu cần cột) |

---

## 3. Đặc tả từng màn

Cột "Đọc / ghi" ghi nơi lưu ở backend. Cột "Hiện trạng" dùng nhãn ở đầu tài liệu.

### 3.1. Đăng nhập (`Login`)

| Trường / thành phần | Đọc / ghi | Hiện trạng |
|---|---|---|
| Email, mật khẩu, Đăng nhập | Supabase Auth (`signInWithPassword`) | Đã có |
| Quên mật khẩu | Supabase Auth reset (cần SMTP) | Đã có (SMTP ⛔ chờ GĐ 2) |
| Nhãn môi trường | `config.js` / `env-band.js` | Đã có |
| Thông báo lỗi tách theo nguyên nhân (sai mật khẩu / mạng / chưa có quyền / sắp hết phiên) | `get_admin_access` + mã lỗi Auth | Mới · chỉ mã Admin (AD-12, AD-27) |
| Thanh trái chỉ hiện mục có quyền | `get_admin_access` → capabilities | Mới · chỉ mã Admin (AD-28–31) |

### 3.2. Tổng quan (`Main`, bản 03/11)

Đèn trạng thái từng tính năng AI (`get_ai_feature_switches`), lỗi 24h và tỉ lệ dự phòng (`search_ai_trace_runs`, cần E5 để đủ cột), chi phí hôm nay/14 ngày (`ai_budget_days`, `ai_budget_campaigns` — cần RPC đọc: **Mới · SQL**), phản hồi mới (`get_ai_feedback_inbox`).

### 3.3. Người dẫn (`Personas`)

Danh sách bên trái (tìm, lọc Đang dùng / Nháp / Thiếu bản dịch); chi tiết ở giữa; **Xem như trên app** bên phải (khung điện thoại dùng đúng câu chào, gợi ý câu hỏi, bong bóng chat); nút "Chạy thử với model thật" (dùng D6).

| Trường | Đọc / ghi | Hiện trạng |
|---|---|---|
| Tên VI/EN, loại, cấp truy cập, trạng thái | `personas.name`, `type`, `access_tier`, `status` | Đã có (bảng) · Admin hiện ghi vào gói nội dung, chat đọc bảng → cần một nguồn: D7 đồng bộ gói → `personas` khi phát hành |
| Vai trò hiển thị | `personas.short_description` | Đã có |
| Ghi chú minh bạch (bắt buộc) | `personas.transparency_note` | Đã có |
| Chủ đề, giọng (gửi cho model) | `personas.themes`, `tone` | Đã có cho chat; Council chưa đọc (E3) |
| Ảnh đại diện | Storage `content-images` | Mới · Storage (D8, AD-08) |
| **Prompt riêng (persona skill)** | `prompt_versions` (`feature=persona_chat, owner_type=persona, owner_id=personas.id`) | Runtime đã đọc; Admin ghi: Mới · SQL (D5, AI-03) |
| Gói phương pháp mặc định | hiện cứng trong `persona-prompt-assembler.ts` → `ai_feature_configs.voice_knobs` hoặc bảng `persona_method_packs` | Mới · SQL + Edge (AI-13) |
| Câu chào, gợi ý câu hỏi | gói nội dung (`persona-detail-content`) | Đã có trong gói |
| Phát hành người dẫn này | D7 (từng mục) | Mới · SQL (AD-01) |

### 3.4. Bộ bài & 78 lá (`Deck`)

Ba cột: danh sách bộ bài + **phong cách đọc của bộ**; lưới 78 lá có bộ lọc (Thiếu bản dịch / Chưa duyệt / Thiếu ảnh / Sửa chưa phát hành) và thao tác hàng loạt; trình sửa lá + xem như trên app.

| Trường | Đọc / ghi | Hiện trạng |
|---|---|---|
| Bộ bài: tên, cấp, vibe, `readingStyle`, màu nhấn | gói nội dung `decks[]` (nguồn `tarot-decks.json`) | Đã có cho app; **model chưa đọc** → E4 (AD-05) |
| Lá: tên gốc (tiêu đề) + tên Việt (dòng nhỏ), nguyên tố, từ khóa | gói `cards[]` | Đã có cho app; model đọc tệp trong repo → E4 |
| Ý nghĩa xuôi/ngược VI/EN, câu hỏi phản chiếu | gói `cards[]` | Như trên |
| Nghĩa theo chủ đề | dữ liệu đã có, chưa gửi model | Mới · Edge (AI-12) |
| Ảnh lá theo bộ | Storage | Mới · Storage (D8) |
| Trạng thái bản dịch / duyệt, lọc, hàng loạt | tính từ gói; cờ duyệt cần trường mới trong D7 | Mới · chỉ mã Admin + SQL |
| Phát hành từng lá | D7 | Mới · SQL |

### 3.5. Văn bản trong app (`AppCopy`)

Nhóm: câu hằng ngày, câu hỏi Nhật ký, thông báo buổi sáng, **màn "tạm nghỉ" và "hết lượt"** (7 tính năng), **câu dự phòng khi AI lỗi**, thẻ khủng hoảng 115 (chỉ xem, khóa). Bảng câu VI/EN, chủ đề, lịch hiện (ngẫu nhiên / thứ / ngày cụ thể), trạng thái.

| Trường | Đọc / ghi | Hiện trạng |
|---|---|---|
| Câu hằng ngày, câu hỏi Nhật ký, thông báo | gói `frontendContent[]` | Đã có (phát hành cả gói) |
| Lịch hiện | trường mới trong D7 | Mới · SQL |
| Câu hết lượt / tạm nghỉ / dự phòng của từng tính năng AI | `ai_feature_configs.copy` (D2) — sửa ở màn tính năng, ở đây chỉ liệt kê | Mới · SQL |
| Thẻ khủng hoảng 115 | `crisis-safety.ts`, app | Khóa trong mã |

### 3.6. Tính năng AI (`AiFeatures`, bản 03/11)

Danh sách thẻ 7 tính năng: bật/tắt, hạn mức, số bước model, loại dữ liệu, đèn cảnh báo; mỗi thẻ mở màn cấu hình 3.7. Nguồn: `get_ai_feature_switches` + `get_ai_feature_config` (D2).

### 3.7. Cấu hình một tính năng AI (7 màn `Feature*`)

Mọi tính năng dùng **cùng một khung 8 phần** (để đội biên tập học một lần), mỗi tính năng có dữ liệu và cảnh báo riêng. Đầu trang: chip trạng thái (bật/tắt, loại dữ liệu, phiên bản đang chạy, số liệu 24h) + **hộp "Cần sửa trước khi mở rộng"** khi tính năng có rủi ro.

| Phần | Trường | Đọc / ghi | Hiện trạng |
|---|---|---|---|
| 1. Trạng thái & hạn mức | Bật/tắt + lý do | `ai_feature_switches` | Đã có cho 3 tính năng; còn lại D1 |
| | Lượt/người/ngày, nhóm dùng chung, câu hỏi tiếp (Council), áp dụng cho (mọi tài khoản / Premium), giờ làm mới 00:00 giờ VN | `ai_feature_configs` (D2) → thi hành bằng `ai_quota_days` | Chiêm tinh, Council đọc `account-tier-policy.json` (trong repo); còn lại Mới · SQL + Edge (AI-02) |
| | Câu khi hết lượt, khi tạm nghỉ | `ai_feature_configs.copy` | Mới · SQL |
| 2. Chuỗi model | Bảng ≤ 4 bước: nhà cung cấp, model (chỉ trong danh mục), chờ tối đa, max token, nhiệt độ, JSON, suy luận, tình trạng 24h | `model_route_versions.steps` (D3); tình trạng từ `ai_provider_health` (D4) | Hiện 1 chính + 1 dự phòng; thời gian chờ cứng trong `model-provider.ts:31` |
| | Tổng thời gian tối đa (≤ 140 s), trần chi phí/lượt, loại dữ liệu (chặn nhà cung cấp không được phép) | D2 + D4 | Mới · SQL + Edge |
| | Chuyển bước khi: tạm thời, 429/402, 401/403, quá ngữ cảnh, sai định dạng (1 lần); **bị chặn an toàn: không bao giờ** | `steps` + E1 | Mới · Edge (hiện `fallbackWhen` luôn ghi mặc định) |
| | ZDR / không thu thập dữ liệu | E1 | Chỉ Chiêm tinh có (AI-06) |
| 3. Prompt hệ thống | Prompt đang sửa, ngôn ngữ, phiên bản; lời dẫn biên tập (≤ 12.000 ký tự, tự kiểm chèn lệnh) | `prompt_versions` (D5) | Xem bảng 3.8 |
| | **Bộ chỉnh giọng biên tập**: độ dài, chất thơ, xưng hô, kết thúc bằng, + núm riêng từng tính năng | `ai_feature_configs.voice_knobs` → Edge ghép thành đoạn chỉ dẫn chuẩn sau lời dẫn | Mới · SQL + Edge |
| | Lớp bất biến (chỉ xem) | trong mã từng hàm | Khóa trong mã |
| 4. Khối ngữ cảnh | Bảng biến: bật/tắt gửi, nguồn, ví dụ, giới hạn, nhãn backend; khung "Model sẽ thấy đúng như sau" | `ai_feature_configs.context_vars` → E3 | Xem bảng 3.9 |
| 5. Luật an toàn | Khủng hoảng 115 (khóa), không dự đoán chắc chắn, không lời khuyên chuyên môn + luật riêng; từ cấm; khi vi phạm; tỉ lệ lấy mẫu chấm | `ai_feature_configs.safety` + bộ kiểm đầu ra Edge | Hiện chỉ nằm trong lời prompt (AI-08, AI-17) |
| 6. Định dạng đầu ra | Bảng trường, giới hạn, kiểm, nơi hiện trong app; nơi chạy kiểm (trong bộ định tuyến); câu khi mọi bước hỏng | hợp đồng trong `packages/ai-contracts` + E1 | Tarot, Chiêm tinh có kiểm; Chat, Daily chưa |
| 7. So sánh phiên bản | Chọn bản A/B; diff lời dẫn; bảng khác biệt núm/biến/chuỗi/điểm; Khôi phục | `ai_feature_configs` + `prompt_versions` lịch sử | Mới · SQL |
| 8. Chạy thử & chấm điểm | Chọn bộ câu mẫu, chạy bản nháp, chạy bản đang chạy để so; bảng điểm 4 tiêu chí; **cổng phát hành: ≥ 8/10, 0 lỗi an toàn, giọng không kém bản đang chạy** | D6 | Mới · SQL + Edge (AI-07) |
| Cuối trang | "Việc backend cần cho tính năng này" | — | Tóm tắt từ mục 4 |

### 3.8. Biến thể theo tính năng

| Tính năng (màn) | Hàm · route · công tắc | Hạn mức (đề xuất) | Prompt | Đầu ra | Cảnh báo / việc riêng |
|---|---|---|---|---|---|
| **Giải bài Tarot** (`FeatureTarot`) | `ai-tarot-reading` · `tarot_reading` · D1 | **1 lượt/ngày** (Owner duyệt); rút lá không AI vẫn không giới hạn; nhóm `tarot_one` đã có | `tarot_reading_system` (runtime đọc `prompt_versions`; Admin chưa ghi) | `tarot_reading_output_v3`: summary ≤ 8.000, reflection ≤ 1.500, sections 1–16, cardIds chỉ trong lá đã rút | Núm riêng: cấu trúc (từng lá / kể liền mạch), thí nghiệm nhỏ. Luật riêng: không bịa lá, không gieo sợ hãi với lá "nặng". E4 |
| **Trò chuyện với người dẫn** (`FeatureChat`) | `ai-persona-chat` · `persona_chat` · có | 5 tin/ngày **chung Oracle** (`chat_oracle`) | `persona_chat_system` + persona skill (màn Người dẫn) + `context_handoff_system` + gói phương pháp | `chat_reply_v2`: 1 câu trả lời ≤ [1.200] ký tự + 1 câu hỏi/bước nhỏ; kiểm ngôn ngữ, không tự nhận người thật | Gửi **tên gọi** (Owner duyệt), giờ địa phương; cắt mục tiêu/giọng (AI-05); ZDR (AI-06); 2 bản active trùng (AI-04) |
| **Đọc sâu Chiêm tinh** (`FeatureAstroDeep`) | `ai-astrology-insight` · **route riêng `astrology_insight`** (hiện dùng chung `astrology_report`) · có | 1/ngày (đã có, `account-tier-policy.json`) | `astrology_interpretation_system` (publish được) | headline, synthesis, evidenceFactIds, patterns/tensions/focusSections ≥ 1, reflectionQuestions 1–3, suggestedFollowUps ≤ 2 | Không bao giờ gửi ngày/giờ/nơi sinh (khóa). Chờ 60 s/bước. AI-10 |
| **Astrology report** (`FeatureAstroReport`) | `ai-astrology-report` · `astrology_report` · D1 | — | — | — | **Owner chốt 04/11: gộp vào Đọc sâu rồi tắt.** App chuyển các lối vào báo cáo sang Đọc sâu; tắt công tắc rồi gỡ hàm. Màn này chỉ còn để theo dõi tới khi gỡ |
| **Hội đồng** (`FeatureCouncil`) | `ai-council` · `ai_council` · có | 1 buổi/ngày + 4 câu tiếp (đã có trong policy); số người dẫn 2–4 | `ai_council_system` (**cứng trong mã**) → D5 | `ai_council_rounds_v2` | Núm riêng: kiểu họp (hiện chỉ là nhãn, AI-09), người tổng kết. Dùng prompt/giọng/chủ đề từng người dẫn; ghim người dẫn người dùng chọn; giới hạn lịch sử phía máy chủ |
| **Oracle** (`FeatureOracle`) | `ai-oracle-turn` · `oracle_router` · D1 | Chung 5 tin/ngày với Chat | `oracle_router_system` | `oracle_router_v1`: reply + `suggestedAction ∈ {reflect, tarot, guide, council, astrology, journal}` | **Chưa gọi model** (OR-01); app gửi 12 lượt, bộ ghép nhận 8 (AI-15) |
| **Thông điệp hằng ngày** (`FeatureDaily`) | `ai-daily-insight` · `daily_insight` · D1 | **3 lần/ngày** (Owner chốt 10/11; code chặn đăng nhập + hạn mức đã xong, chờ deploy) | **Cứng trong mã** → `prompt_versions` | `daily_insight_v1`: message ≤ [280], microAction ≤ [120] | **Rủi ro:** không bắt đăng nhập/hạn mức/công tắc; gửi toàn văn 3 mục Nhật ký → **Owner chốt 04/11: bỏ toàn văn, chỉ nhãn tâm trạng 24 giờ**; nối lá hôm nay (HO-07); ghi rõ ngôn ngữ (AI-12) |

Số trong `[ ]` là đề xuất, chờ đội biên tập chốt.

### 3.9. Sổ biến ngữ cảnh (dùng chung cho mọi tính năng)

| Biến | Nguồn | Giới hạn | Tính năng dùng | Hiện trạng |
|---|---|---|---|---|
| `language` | app | vi / en | tất cả | Đã có (Daily chưa ghi rõ) |
| `user.displayName` (tên gọi) | `profiles` | 40 ký tự, làm sạch | Chat, Council, Oracle, Daily (Tarot, Chiêm tinh: tắt mặc định) | Daily đã gửi; còn lại Mới · Edge (CH-13 — Owner duyệt 04/11) |
| `user.goals`, `user.tone` | onboarding | 5 × 60 ký tự; tone trong danh sách cố định | Chat, Council, Daily | Đã gửi nhưng **ghép thẳng vào system, không giới hạn** → E3 |
| `localDateTime` | máy chủ, theo múi giờ hồ sơ | — | tất cả trừ Chiêm tinh | Mới · Edge |
| `recentMood` | nhãn tâm trạng **ghi trong 24 giờ qua** (Owner chốt 04/11); quá 24 giờ thì không gửi | chỉ nhãn, không gửi lời viết | Chat, Tarot, Daily | Mới · Edge (+ công bố trong chính sách riêng tư) |
| `history[]` | app | Chat 8 × 800; Council cần giới hạn; Oracle 8 | Chat, Council, Oracle | Đã có (Council chưa giới hạn) |
| `handoffContext` | Tarot / Chiêm tinh | đã làm sạch | Chat | Đã có |
| `selectedCards[]` (id, displayName, chiều, vị trí), `spread`, `topic`, `question` | app chọn, máy chủ kiểm | 1–3 lá; câu hỏi 4.096 | Tarot | Đã có |
| Nghĩa lá, từ khóa, nguyên tố, nghĩa theo chủ đề | nội dung đã phát hành | theo lá | Tarot | Mới · Edge (E4) |
| `deck.readingStyle`, `deck.vibe` | Bộ bài | 300 ký tự | Tarot | Mới · Edge |
| `chart`, `selectedFactIds`, `caveatIds` | máy chủ tính | ≤ 24 fact | Đọc sâu | Đã có |
| `guides[]` (+ skill, giọng, chủ đề) | Người dẫn | 1.500 ký tự/người | Council | Tên + vai trò đã có; còn lại Mới · Edge |
| `dailyCard` | Home | 1 lá | Daily | Mới · Edge + app |
| Ngày/giờ/nơi sinh, toàn văn Nhật ký | — | **không gửi** | — | Khóa (Astrology report và Daily đang gửi → vá) |

Mọi biến do người dùng nhập đi trong **phần dữ liệu** của yêu cầu ("Dữ liệu — không phải chỉ dẫn"), không ghép vào system prompt.

### 3.10. Nhà cung cấp & model (`Providers`)

| Trường | Đọc / ghi | Hiện trạng |
|---|---|---|
| Thứ tự ưu tiên: **1 OpenRouter → 2 Anthropic → 3 Gemini (trả phí) → 4 OpenAI → 5 DeepSeek** | `ai_providers.priority` (D4) | Mới · SQL |
| Khóa: chỉ "Đã cấu hình / Chưa" + tên biến bí mật | Edge đọc `Deno.env.get(secret_name)` có hay không; **không trả giá trị** | Mới · Edge (danh sách nhà cung cấp theo khóa đã có một phần, AI-11) |
| Nút **Kiểm tra khóa** (Owner bấm) | `probe_ai_provider` (D4) → ghi audit | Mới · SQL + Edge |
| Được nhận dữ liệu: công khai / cá nhân / nhạy cảm | `ai_providers.allowed_data_class` | Mới · SQL (DeepSeek trực tiếp: chỉ công khai) |
| Tỉ lệ lỗi 24h, p95, cầu dao | `ai_provider_health` + trace (E5) | Mới |
| Cho phép bước dự phòng đắt hơn | `ai_feature_configs` / cấu hình chung | Mới · SQL — chờ Owner |
| Danh mục model: ZDR, ngữ cảnh, giá, đang dùng ở đâu | bảng danh mục (một phần D4) | Mới · SQL; ZDR của 2 model hiện dùng **chưa xác minh** |
| Sức khỏe 7 ngày, chi phí | trace + `ai_budget_*` | Mới |

Giai đoạn 0 chỉ OpenRouter hoạt động; các dòng khác hiện "Giai đoạn 2/3 · chưa cấu hình". Owner đặt khóa trong Supabase › Edge Functions › Secrets; Admin không có ô nhập khóa.

### 3.11. Prompt & phiên bản (`Prompts`)

Bảng mọi prompt (tên, tính năng, thuộc chung/người dẫn, có VI/EN, bản đang chạy, nháp, nhãn backend), lọc "Có nháp chưa chấm / Thiếu bản dịch / Còn cứng trong mã"; dòng thời gian phiên bản với So sánh, Khôi phục; **hộp xem lại trước khi phát hành** (thay đổi, kết quả chạy thử, môi trường, ghi chú bắt buộc). Nguồn: `prompt_versions` + D5; gói phương pháp D2.

### 3.12. Chạy thử & chấm điểm (`Evals`)

Bộ câu mẫu theo tính năng (bắt buộc có câu khủng hoảng), tiêu chí chấm + trọng số (đúng định dạng và an toàn: bắt buộc; giọng, cụ thể, tôn trọng quyền tự quyết, độ dài/chi phí), **so sánh mù A/B** (người chấm không biết bản nào là nháp), lịch sử chạy kèm chi phí. Nguồn: D6 + `ai_trace_scores`. Câu lấy từ phản hồi người dùng phải làm sạch dữ liệu cá nhân trước.

### 3.13. Phản hồi người dùng (`Feedback`)

Lọc trạng thái/tính năng; chi tiết: người phụ trách, trạng thái, mức độ (An toàn/Chất lượng/Lỗi kỹ thuật), lời người dùng, đoạn câu trả lời liên quan + phiên bản prompt + model, ghi chú nội bộ; nút **Mở Nhật ký AI**, **Mở prompt**, **Thêm vào bộ câu mẫu**, **Đã xong**. Nguồn: `get_ai_feedback_inbox`, `review_ai_feedback` (đã có) + D9. Không hiện email hay Nhật ký; tự xóa sau 30 ngày (đã có).

### 3.14. Nhật ký AI (`Traces`)

Tìm theo mã, lọc tính năng / kết quả (Ổn, Ổn — dự phòng, Câu soạn sẵn, Chặn an toàn) / thời gian; bảng lượt (bước, thời gian, chi phí, prompt); chi tiết: bảng bước + thanh thời gian, cấu hình áp dụng, số biến/token đã gửi (đã che). Nguồn: `search_ai_trace_runs`, `get_ai_trace_detail` (đã có) + E5. Bỏ JSON thô (AD-20).

### 3.15. Lịch sử thao tác (`Audit`)

Dòng thời gian chung (người, hành động, đối tượng, môi trường, lý do/kết quả; Xem khác biệt; Khôi phục bản trước) + bảng quyền (sửa quyền cần `roles.manage`). Nguồn: D10 + `admin_audit_logs`. Nút bật theo quyền thật, không theo tên vai trò (AD-14).

---

## 4. Thứ tự triển khai A1–A7 (cập nhật từ đề xuất 03/11)

| Bước | Nội dung | Màn | Backend | Cần Owner duyệt |
|---|---|---|---|---|
| **A0 (vá rủi ro, làm trước)** | Bắt đăng nhập + hạn mức cho `ai-daily-insight` (bỏ toàn văn Nhật ký); tắt `ai-astrology-report` và chuyển lối vào sang Đọc sâu (Owner chốt gộp 04/11); tách route `astrology_insight` | — | E2 (phần Daily/Report), D1 | Deploy + SQL |
| **A1** | Dọn: bỏ Legacy, bỏ ô JWT/khóa, Lưu nháp vs Phát hành, cảnh báo rời trang, Việt hóa, lỗi đăng nhập tách nguyên nhân | Đăng nhập, mọi màn | — | Không (chỉ mã Admin) |
| **A2** | Khung điều hướng mới + Tổng quan + Tính năng AI (danh sách) + Nhật ký AI + Phản hồi (phần đọc) | Main, AiFeatures, Traces, Feedback | dùng RPC đã có | Không |
| **A3** | Nội dung phát hành từng mục, nháp trên máy chủ, lịch sử/khôi phục, lọc 78 lá, upload ảnh | Người dẫn, Bộ bài, Văn bản, Lịch sử thao tác | D7, D8, D10 | SQL + tạo bucket |
| **A4** | Cấu hình tính năng: công tắc đủ 7, hạn mức, thời gian chờ, câu hết lượt/tạm nghỉ; **Giai đoạn 0 LLM** | Feature* (phần 1, 2, 6) | D1, D2, D3, E1, E2 | SQL + deploy |
| **A5** | Prompt editor chung + bộ chỉnh giọng + khối ngữ cảnh; đưa prompt Council/Daily/Report ra cấu hình | Feature* (phần 3, 4, 5, 7), Prompts, Người dẫn (prompt) | D5, E3 | SQL + deploy |
| **A6** | Chạy thử & chấm điểm + cổng phát hành; nối Content → AI (nghĩa lá, phong cách bộ bài, persona cho Council) | Evals, Feature* (phần 8), Feedback (thêm vào bộ mẫu) | D6, D9, E4 | SQL + deploy |
| **A7** | Nhà cung cấp: thứ tự, Kiểm tra khóa, cầu dao, sức khỏe; chuỗi 3–4 bước; nhà cung cấp trực tiếp đầu tiên (Anthropic) | Providers, Feature* (chuỗi model) | D4, E5; Giai đoạn 1–2 | SQL + deploy + Owner đặt khóa |

A1–A2 làm được ngay vì chỉ sửa mã Admin. Từ A3 trở đi, mỗi bước là 1–2 PR nhỏ kèm migration/deploy riêng, mỗi lần Owner duyệt.

## 5. Quyết định của Owner (04/11) và việc còn chờ

| # | Câu hỏi | Quyết định |
|---|---|---|
| 1 | Astrology report | **Gộp vào Đọc sâu rồi tắt hàm cũ.** Thay A0 "vá Astrology report" bằng: tắt bằng công tắc (D1), chuyển lối vào trong app sang Đọc sâu, rồi gỡ `ai-astrology-report` (cần Owner duyệt deploy) |
| 2 | Thông điệp hằng ngày | **Đồng ý:** bỏ toàn văn Nhật ký; chỉ gửi nhãn tâm trạng + lá hôm nay; ghi rõ ngôn ngữ |
| 3 | Tâm trạng gần đây | **Chỉ dùng nhãn tâm trạng ghi trong vòng 24 giờ;** quá 24 giờ thì không gửi. Áp dụng Chat, Tarot, Daily |
| 4 | Phát hành bỏ qua cổng chạy thử | **Duyệt đề xuất 5.1 (04/11):** lớp an toàn tự động không bao giờ bỏ qua; chỉ Owner bỏ qua lớp chất lượng khi khôi phục bản đã đạt hoặc sửa khẩn cấp an toàn; nhãn "Chưa chấm" + chấm lại trong 24 giờ |
| 5 | Bước dự phòng đắt hơn + trần chi phí | **Đồng ý** cho dự phòng đắt hơn; trần **0,02 USD / lượt** |
| 6 | Quyền biên tập viên | **Chỉ lưu nháp; Owner phát hành.** Biên tập viên có `content.read`, `content.draft`, `ai.read` + quyền chạy thử; `content.publish` và `ai.manage` chỉ Owner |
| 7 | Con số trong `[ ]` | Còn chờ đội biên tập chốt |

### 5.1. Phân tích câu 4: có cho phát hành bỏ qua cổng chạy thử? (Owner duyệt 04/11)

**Cổng gồm hai lớp khác nhau:**
- *Lớp an toàn tự động* — đúng định dạng đầu ra, các câu khủng hoảng trả thẻ 115, không lộ dữ liệu cấm. Lớp này chạy trong vài giây, rẻ, và lỗi ở đây nghĩa là người dùng có thể nhận câu trả lời hỏng hoặc nguy hiểm.
- *Lớp chất lượng* — ≥ 8/10 đạt, điểm giọng không kém bản đang chạy. Lớp này cần người chấm và có thể mất nhiều giờ.

**Khi nào bỏ qua là hợp lý:**
1. *Khôi phục* về một bản đã từng đạt cổng (lỗi vừa phát hành, cần lùi ngay).
2. *Sửa khẩn cấp an toàn* — bản đang chạy nói điều nguy hiểm, cần thay bằng bản chặt hơn ngay, không đợi người chấm.
3. Tắt tính năng — việc này dùng công tắc, vốn không qua cổng.

**Rủi ro nếu cho bỏ qua tùy ý:** cổng mất tác dụng ("vội thì bỏ qua"), và Admin là nơi quyết định chất lượng mà Owner muốn làm khác biệt.

**Quyết định (đề xuất được Owner duyệt 04/11):**
- **Không bao giờ bỏ qua lớp an toàn tự động.** Nút Phát hành bị khóa nếu lớp này chưa chạy hoặc có lỗi.
- **Chỉ Owner được bỏ qua lớp chất lượng**, với lý do bắt buộc chọn một trong: "Khôi phục bản đã đạt" hoặc "Sửa khẩn cấp an toàn" (+ ghi chú ≥ 10 ký tự). Biên tập viên không thấy lựa chọn này.
- Bản phát hành bỏ qua gắn nhãn **"Chưa chấm"** trên mọi màn; hệ thống tự xếp lượt chấm đầy đủ trong 24 giờ và nhắc ở Tổng quan cho tới khi chấm xong.
- Khôi phục về bản đã đạt cổng **không cần** lý do khẩn cấp — chỉ cần ghi chú như mọi lần phát hành.
- Ghi vào Lịch sử thao tác với nhãn riêng để rà lại hằng tuần.

Cần thêm vào D2/D6: cột `gate_bypass_reason`, `gate_status (passed / bypassed_pending / bypassed_scored)` và hàng đợi chấm sau.

## 6. Chưa kiểm chứng

- Database thật có đúng như migration không (đặc biệt các check `feature` và nhà cung cấp đã được migration sau mở rộng hay chưa).
- ZDR của `deepseek/deepseek-v4.1-flash` và `xiaomi/mimo-v2.6-flash` trên OpenRouter.
- Số liệu trong canvas (lượt 24h, p95, chi phí, điểm chạy thử) là **minh họa**, không phải số đo.
- Canvas chưa được xem thử trên điện thoại; chiều cao artboard ước lượng.
