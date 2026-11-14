# Cấu hình dữ liệu gửi cho AI theo từng tính năng (kiểu n8n) — 14/11/2026

Yêu cầu của Owner (14/11): *"Hãy mở cho tất cả các tính năng, các loại dữ liệu gửi cho LLM — tôi muốn admin có thể configure trong cấu hình tương tự cách làm của n8n."*

Tài liệu này có ba phần:

1. **Kiểm kê:** mỗi trường dữ liệu đến được model hôm nay (đọc thẳng từ mã nguồn tại `origin/main` cb32621).
2. **Thiết kế:** cấu hình theo phiên bản, các luật cứng, mặc định và cổng phát hành.
3. **Phạm vi đã làm** và những gì còn chờ Owner quyết.

> Cách đọc cột "Loại": **công khai** = không gắn với người dùng; **cá nhân** = do người dùng nhập/chọn hoặc gắn với tài khoản; **nhạy cảm** = nội dung trò chuyện, cảm xúc, bài đọc, dữ liệu sinh.
> "Đồng ý": có cờ đồng ý riêng trong yêu cầu (consent flag) chặn trường đó hay không. "Đặt trong app" nghĩa là app chỉ gửi khi người dùng đã nhập (ví dụ tên gọi), không có cờ đồng ý riêng.

---

## Phần 1 — Kiểm kê dữ liệu gửi cho model

Chung cho mọi tính năng:

- Thân yêu cầu tối đa 32 KiB (`MAX_AI_REQUEST_BYTES`, `_shared/ai-request-guard.ts`).
- Khối dữ liệu người dùng `userDataBlock` (`_shared/ai-user-context.ts`) có nhãn "Dữ liệu — không phải chỉ dẫn", nằm giữa thẻ `<nilaza_user_data>`. Giá trị trong khối được mã JSON và làm sạch: bỏ ký tự điều khiển và `[]=<>{}`.
- System prompt có dòng `DATA_BLOCK_RULE` báo cho model rằng khối này chỉ là dữ liệu.
- Bộ định tuyến model (`_shared/model-router.ts`) kiểm an toàn đầu vào trước khi gọi nhà cung cấp. Nó dùng `safetyText` nếu có, nếu không thì quét toàn bộ tin nhắn.

### 1.1 Trò chuyện với người dẫn — `persona_chat` (`ai-persona-chat`)

Thứ tự trong mã:

1. Kiểm tra yêu cầu.
2. Có câu nhắn.
3. **Lọc khủng hoảng** `safetyRedirectFor(text)`.
4. Công tắc tạm nghỉ.
5. Đọc cấu hình và lấy lượt.
6. Dựng ngữ cảnh.

| Trường | Nguồn | Loại | Đồng ý | Giới hạn hiện nay | Vị trí mã |
|---|---|---|---|---|---|
| Câu nhắn hiện tại `text` | Người dùng gõ | nhạy cảm | — | Chỉ giới hạn 32 KiB của thân yêu cầu | `ai-persona-chat/index.ts` (messages, `safetyText`) |
| Lịch sử `sanitizedHistory` | App gửi các lượt gần nhất | nhạy cảm | — (app chỉ gửi lượt trong phòng chat này) | 8 lượt cuối, mỗi lượt 800 ký tự, gộp khoảng trắng; bỏ lượt người dùng cuối nếu trùng câu hiện tại | `sanitizeHistory` trong `ai-persona-chat/index.ts` |
| Tên gọi `nickname` | Hồ sơ (người dùng tự đặt) | cá nhân | Đặt trong app | 40 ký tự, làm sạch | `personaUserDataBlock` → `userDataBlock` |
| Mục tiêu `goals` | Hồ sơ | cá nhân | Đặt trong app | 5 mục × 60 ký tự, bỏ trùng | như trên |
| Giọng `tone` | Hồ sơ | cá nhân | Đặt trong app | Chỉ 7 giá trị cho phép; thiếu hoặc sai thì dùng `gentle` | `personaUserDataBlock` |
| Giờ địa phương `localDateTime` | Máy chủ (UTC+07:00) | công khai | — | Cố định | `localDateTime` |
| Ngôn ngữ | Yêu cầu | công khai | — | vi/en | khối dữ liệu + system |
| Ngữ cảnh mang theo `handoffContext` | App, khi người dùng mở chat từ Tarot/Chiêm tinh | nhạy cảm | — (người dùng chủ động bấm "hỏi tiếp") | Nguồn 80; câu hỏi khi đó 300; lá đang bàn 80; tối đa 10 lá (vị trí 40, tên 80); tóm tắt bài đọc 600; Mặt Trời/Mặt Trăng/Mọc 30 mỗi trường; trọng tâm 80; `safeSummary` 600 (chỉ khi không có Tarot). **Ngày sinh và nơi sinh bị bỏ qua.** | `_shared/chat-handoff.ts` `handoffContextBlock` |
| Lớp prompt | `prompt_versions` (persona_chat toàn cục; người dẫn) hoặc mặc định trong mã; gói phương pháp | công khai | — | — | `_shared/persona-prompt-assembler.ts` |
| Hồ sơ người dẫn | Bảng `personas` (đang hoạt động) | công khai | — | — | như trên |

### 1.2 Oracle — `oracle_router` (`ai-oracle-turn`)

Thứ tự: tín hiệu an toàn trước, rồi trả lời tĩnh.

| Trường | Nguồn | Loại | Đồng ý | Giới hạn | Vị trí mã |
|---|---|---|---|---|---|
| Câu hỏi `userMessage` | Người dùng | nhạy cảm | — | 3000 ký tự | `_shared/oracle-runtime.mjs` `readOracleQuestion` |
| Lịch sử | App | nhạy cảm | **Có: `consentFlags.history`** | Tối đa 8 tin, mỗi tin 1500 ký tự; gửi hơn 8 tin thì **từ chối** yêu cầu, không cắt bớt | `compileOracleInput` |
| Tên gọi, mục tiêu | Hồ sơ | cá nhân | **Có: `consentFlags.profile`** | Tên 40 ký tự; mục tiêu 5 × 60 trong khối dữ liệu | `handler.ts` `oracleDataBlock` |
| Giọng | Hồ sơ | cá nhân | **Có: `consentFlags.profile`** | balanced/gentle/direct; khác thì dùng balanced | `compileOracleInput` |
| Màn hình hiện tại | App (danh sách cố định) | công khai | — | enum | `oracleDataBlock` (extra) |
| Nhật ký gần đây `recentSafeContext` | App | nhạy cảm | `consentFlags.journalMemory` | Tối đa 3 mục, được kiểm nhưng **không bao giờ gửi** (`journalContextUsedCount: 0`) | `compileOracleInput` |
| Dữ liệu sinh | — | nhạy cảm | `consentFlags.birthProfile` | Không hỗ trợ | như trên |

### 1.3 Giải bài Tarot — `tarot_reading` (`ai-tarot-reading`)

| Trường | Nguồn | Loại | Đồng ý | Giới hạn | Vị trí mã |
|---|---|---|---|---|---|
| Câu hỏi | Người dùng | cá nhân | — | 4096 ký tự | `_shared/tarot-prompt.ts` `prepareTarotContext` |
| Chủ đề | App | cá nhân | — | 80 ký tự | như trên |
| Kiểu trải bài, lá đã chọn, chiều lá, vị trí | App (kiểm theo 78 lá chuẩn) | công khai | — | Danh sách cố định | như trên |
| Nghĩa lá, phong cách bộ bài | Gói nội dung đã phát hành, hoặc `tarot-cards.json` | công khai | — | — | `tarot-content.ts` |

Tarot không có bước lọc khủng hoảng riêng trước khi dựng ngữ cảnh. Bộ định tuyến quét toàn bộ tin nhắn.

### 1.4 Thông điệp hằng ngày — `daily_insight` (`ai-daily-insight`)

Thứ tự: xác thực, công tắc, lượt (mặc định 3), rồi đọc thân yêu cầu. Không có `safetyText`, nên bộ định tuyến quét cả khối dữ liệu.

| Trường | Nguồn | Loại | Đồng ý | Giới hạn | Vị trí mã |
|---|---|---|---|---|---|
| Tên gọi | Hồ sơ | cá nhân | Đặt trong app | 40 ký tự | `ai-daily-insight/index.ts` `sanitizeNickname` → `dailyUserMessage` |
| Mục tiêu | Hồ sơ | cá nhân | Đặt trong app | 5 × 60 | `dailyUserMessage` |
| Giọng | Hồ sơ | cá nhân | Đặt trong app | 7 giá trị; sai thì bỏ | như trên |
| Tâm trạng gần nhất `recentMood` | Nhãn tâm trạng của mục nhật ký mới nhất trong 24 giờ (app chọn; app cũ gửi `recentEntries` và máy chủ tự lọc 24 giờ) | **nhạy cảm** (trạng thái cảm xúc) | Đặt trong app | 32 ký tự; **không bao giờ gửi tiêu đề hay nội dung nhật ký** | `_shared/daily-mood.ts` |
| `dateKey`, `rerollCount` | App | công khai | — | Chuỗi được làm sạch, 80 ký tự | `dailyUserMessage` (extra) |
| Giờ địa phương | Máy chủ | công khai | — | — | `localDateTime` |

### 1.5 Đọc sâu Chiêm tinh — `astrology_insight` (`ai-astrology-insight`)

| Trường | Nguồn | Loại | Đồng ý | Giới hạn | Vị trí mã |
|---|---|---|---|---|---|
| Các dữ kiện đã chọn từ báo cáo của chính người dùng (vị trí hành tinh, góc chiếu, nhà) | Bảng `astrology_reports` (đúng chủ sở hữu) | nhạy cảm | Đồng ý dữ liệu sinh lúc tạo báo cáo | ID dữ kiện 30; vị trí 12; góc chiếu 45; nhà 12; lưu ý 20 | `ai-astrology-insight/index.ts` |
| Câu hỏi | Người dùng | cá nhân | — | 500 ký tự | như trên |
| Chế độ, chủ đề | App | công khai | — | enum | như trên |

### 1.6 Báo cáo chiêm tinh — `astrology_report` (`ai-astrology-report`) — **cần chú ý**

Tính năng này gửi **nguyên đối tượng `chart`** cho model. Đối tượng đó gồm:

- `time.birthDate`, `birthTime`, `timezone`, `utcOffsetMinutes`, `utcDateTime`
- `location.label` (nơi sinh), `latitude`, `longitude`, `geocodeProvider`, `geocodePlaceId`
- vị trí hành tinh, góc, nhà, góc chiếu
- lưu ý và trọng tâm

Đây là **ngày giờ sinh và tọa độ chính xác**. Loại dữ liệu là nhạy cảm, nên chỉ OpenRouter (đã bật ZDR) nhận được. Mã nằm ở `ai-astrology-report/index.ts`: `buildChart` dòng ~387 và message dòng ~503. App vẫn gọi `/ai/astrology-report`. Xem mục rủi ro (Phần 4).

### 1.7 Hội đồng — `ai_council` (`ai-council`)

Thứ tự:

1. Bắt buộc đăng nhập.
2. **Lọc khủng hoảng** `safetyRedirectFor(userMessage)`.
3. Công tắc tạm nghỉ.
4. Hạn mức hội đồng/ngày và câu hỏi tiếp.

| Trường | Nguồn | Loại | Đồng ý | Giới hạn | Vị trí mã |
|---|---|---|---|---|---|
| Câu hỏi `userMessage` | Người dùng | nhạy cảm | — | 32 KiB thân yêu cầu | `ai-council/index.ts` |
| Lịch sử `sanitizedHistory` | App | nhạy cảm | — | 12 lượt, 800 ký tự mỗi lượt; personaId theo mẫu ký tự | `council-prompt.ts` `boundCouncilHistory` |
| Tên gọi, mục tiêu, giọng | `userContext` | cá nhân | Đặt trong app | 40; 5 × 60; 7 giá trị | `councilUserMessage` |
| Giờ địa phương | Máy chủ | công khai | — | — | như trên |
| Người dẫn được chọn (id, slug, tên, vai) | Cấu hình hội đồng đã phát hành | công khai | — | 2–4 người dẫn | `index.ts` |
| Mẫu hội đồng `template` | `ai_council_config_versions` | công khai | — | — | như trên |

### 1.8 Lớp an toàn hiện có, độc lập với cấu hình

- **Lọc khủng hoảng chạy trước khi dựng ngữ cảnh** ở Chat, Hội đồng và Oracle. Ở mọi tính năng, bộ định tuyến còn kiểm đầu vào và đầu ra.
- Dữ liệu người dùng chỉ nằm trong khối dữ liệu, không bao giờ nằm trong system prompt.
- **Loại dữ liệu theo nhà cung cấp** (`_shared/provider-registry.ts`):
  - Chat, Oracle, Hội đồng, Hằng ngày và Báo cáo chiêm tinh là *nhạy cảm*; Tarot là *cá nhân*.
  - Nhà cung cấp được phép loại thấp hơn sẽ bị bỏ qua (`data_class`).

---

## Phần 2 — Thiết kế

### 2.1 Mô hình "kiểu n8n"

Mỗi tính năng là một chuỗi nút nối nhau:

**Đầu vào → Nguồn ngữ cảnh (khối dữ liệu) → Lớp prompt → Chuỗi model → Kiểm đầu ra → Câu trả lời**

- Nút *khối dữ liệu* có công tắc bật/tắt và giới hạn riêng.
- Nút *khóa* (câu nhắn, lọc khủng hoảng, lớp prompt, quy tắc tách dữ liệu, kiểm đầu ra) hiện ổ khóa kèm lý do.
- Nút lớp prompt và chuỗi model dẫn sang trang đã có: "Prompt & phiên bản" và "Nhà cung cấp & Model". Trang mới không sửa trùng các mục đó.

### 2.2 Bảng mới hay khóa mới? → **Bảng mới `public.ai_context_configs`**

Lý do không thêm khóa vào `ai_feature_configs`:

1. `save_ai_feature_config_draft` coi payload là **toàn bộ** bản nháp và từ chối khóa lạ. Nếu thêm khóa, mỗi lần trang "Tính năng AI" lưu nháp hạn mức sẽ xóa cấu hình dữ liệu trong cùng bản nháp, hoặc phải sửa lại cả hàm, digest và cổng A6.
2. Hạn mức và dữ liệu là hai quyết định khác nhau, người duyệt khác nhau và rủi ro khác nhau. Tách bảng thì lịch sử phiên bản và nhật ký kiểm toán rõ ràng hơn.
3. Không phải sửa migration đã áp: A4 `090100/090200` và A6 `110000` không đổi.

Hình dạng bảng:

- Cột: `id, feature, version, status (draft|active|archived), blocks jsonb, note, created_by/at, updated_at, published_by/at`.
- Chỉ mục duy nhất từng phần: mỗi tính năng có **một** bản đang chạy và **một** bản nháp.
- RLS bật, không chính sách nào. Client không đọc hay ghi bảng trực tiếp; Edge đọc bằng khóa service.

Hàm:

| Hàm | Quyền |
|---|---|
| `get_ai_context_configs()` | `ai.read` |
| `save_ai_context_config_draft(feature, blocks, note)` | `ai.manage`, hoặc `ai.read` + `content.draft` (cùng quy tắc với A4) |
| `publish_ai_context_config(feature, version, note)` | `ai.manage`; ghi chú 10–500 ký tự |

Cả ba hàm đều security definer, `search_path = ''`, có khóa advisory theo tính năng và ghi `admin_audit_logs` (`ai.context_config.draft` / `ai.context_config.publish`).

`blocks` là một đối tượng `{ <khối>: { enabled?: boolean, <giới hạn>?: số nguyên } }`:

- Khối hoặc trường bị thiếu nghĩa là giữ **mặc định hôm nay**.
- Khóa lạ, kiểu sai hoặc số ngoài khoảng bị **từ chối** (lỗi 22023).
- Đặc tả khối nằm ở `packages/agent-config/ai-context-blocks.json`. SQL có bản sao trong `nilaza_private.ai_context_block_spec()`, Admin có bản sao trong `context-config.js`. Một bài kiểm tra Node so ba bản này phải trùng nhau.

### 2.3 Các khối có thể cấu hình (đợt này)

Trần của mỗi giới hạn **bằng đúng giá trị hôm nay**: cấu hình chỉ có thể **bớt** dữ liệu, không bao giờ gửi thêm. Nâng trần là quyết định của Owner (Phần 4).

**Trò chuyện với người dẫn** (`persona_chat`)

| Khối | Loại | Tắt thì | Giới hạn chỉnh được |
|---|---|---|---|
| Tên gọi | cá nhân | Không gửi | — |
| Mục tiêu | cá nhân | Không gửi | số mục 1–5; ký tự mỗi mục 10–60 |
| Giọng | cá nhân | Gửi giọng mặc định `gentle` (không phải lựa chọn của người dùng) | — |
| Giờ địa phương | công khai | Không gửi | — |
| Lịch sử trò chuyện | nhạy cảm | Không gửi | số lượt 1–8; ký tự mỗi lượt 100–800 |
| Ngữ cảnh mang theo (Tarot/Chiêm tinh) | nhạy cảm | Không gửi | ký tự câu hỏi khi đó 50–300; ký tự tóm tắt 100–600 |

**Thông điệp hằng ngày** (`daily_insight`)

| Khối | Loại | Tắt thì | Giới hạn |
|---|---|---|---|
| Tên gọi | cá nhân | Không gửi cho model; câu dự phòng trên máy vẫn dùng tên | — |
| Mục tiêu | cá nhân | Không gửi | 1–5; 10–60 |
| Giọng | cá nhân | Không gửi | — |
| Tâm trạng 24 giờ | nhạy cảm | Không gửi | — |
| Giờ địa phương | công khai | Không gửi | — |

**Hội đồng** (`ai_council`)

| Khối | Loại | Tắt thì | Giới hạn |
|---|---|---|---|
| Tên gọi | cá nhân | Không gửi | — |
| Mục tiêu | cá nhân | Không gửi | 1–5; 10–60 |
| Giọng | cá nhân | Không gửi | — |
| Giờ địa phương | công khai | Không gửi | — |
| Lịch sử hội đồng | nhạy cảm | Không gửi | 1–12 lượt; 100–800 ký tự |

**Nút khóa**, hiện ổ khóa và lý do:

- Câu nhắn hoặc câu hỏi: model cần câu hỏi để trả lời; lọc khủng hoảng chạy trên câu này.
- Ngôn ngữ.
- Hồ sơ người dẫn, người dẫn đã chọn và mẫu hội đồng: sửa ở trang Hội đồng / Prompt.
- `dateKey`/`rerollCount` của Hằng ngày: cần để mỗi ngày và mỗi lần đổi khác nhau, không phải dữ liệu cá nhân.
- **Nhật ký: không bao giờ gửi nội dung**. Không có khối nào cho nhật ký, nên không bật được.
- Lọc khủng hoảng, quy tắc tách dữ liệu, kiểm đầu ra.

**Oracle, Tarot, Đọc sâu Chiêm tinh, Báo cáo chiêm tinh:** đợt này **chỉ xem** trong sơ đồ (nút hiện nguồn, loại và giới hạn ở Phần 1, có nhãn "Chỉ xem — chưa cấu hình được"). Lý do:

- Oracle đã có cờ đồng ý riêng và chặn lịch sử quá dài bằng lỗi 400 thay vì cắt bớt.
- Tarot và Chiêm tinh gửi dữ liệu bài đọc mà câu trả lời cần.
- Muốn mở thì cần hồ sơ riêng và kiểm tra lại hợp đồng đầu ra (`astrology:ai-contract:check`, tarot output).

### 2.4 Luật cứng (chạy trong Edge, Admin không tắt được)

1. **Lọc khủng hoảng** vẫn chạy trên câu nhắn **trước** khi đọc cấu hình ngữ cảnh. `safetyText` vẫn là câu nhắn, không phụ thuộc cấu hình.
2. **Đồng ý:** cấu hình chỉ thu hẹp dữ liệu sau khi áp các cờ đồng ý và điều kiện của app; nó không bật được trường mà cờ đồng ý đã tắt. Oracle không cấu hình được trong đợt này.
3. **Tách chỉ dẫn và dữ liệu:**
   - Giá trị người dùng chỉ nằm trong `<nilaza_user_data>`, mã JSON và đã làm sạch.
   - System prompt không đổi theo cấu hình.
   - Kiểm tra tự động: tên gọi không bao giờ xuất hiện trong system.
4. **Không gửi nội dung nhật ký:** đặc tả không có khối nhật ký; SQL và Edge bỏ hoặc từ chối khóa lạ; tâm trạng vẫn chỉ là nhãn 32 ký tự.
5. **Loại dữ liệu theo nhà cung cấp:**
   - Loại của yêu cầu = loại cao nhất giữa *mức sàn của tính năng* và *các khối đang bật*. Không bao giờ thấp hơn mức sàn.
   - Loại này được truyền thành `dataClass` cho `generateWithModelRoute`.
   - Với ba tính năng đợt này, sàn đã là *nhạy cảm*, nên thực tế không đổi. Quy tắc dành cho tính năng có sàn thấp hơn sau này.
6. **Trần từng trường:** Edge kẹp mọi số vào `[min, mặc định hôm nay]`, kể cả khi dòng trong cơ sở dữ liệu bị sửa tay. SQL cũng kiểm khoảng đó.
7. **Hỏng thì an toàn:** thiếu bảng, đọc lỗi, quá 1,5 giây hoặc trùng bản đang chạy thì dùng mặc định trong mã. Mặc định = hành vi hôm nay. Cache 60 giây (15 giây sau lỗi).

### 2.5 Mặc định = hôm nay (đã chứng minh bằng kiểm tra)

- Trước khi sửa mã, đầu ra của các hàm dựng tin nhắn hiện tại được ghi lại với giờ cố định thành tệp mẫu: Chat (lịch sử, khối dữ liệu, ngữ cảnh mang theo), Hằng ngày, Hội đồng (khối dữ liệu, lịch sử).
- Kiểm tra Deno so: cấu hình `null`, `{}` và cấu hình "bật hết với đúng trần" phải cho ra **từng byte giống tệp mẫu**.

### 2.6 Cổng phát hành A6 — **không mở rộng** (có lý do)

Cổng A6 chấm `feature_config` và `prompt_version` bằng bộ ca thử tổng hợp. Đợt này không đưa cấu hình ngữ cảnh qua cổng, vì:

1. **Cấu hình chỉ bớt dữ liệu** trong trần hôm nay. Nó không thêm chỉ dẫn, không đổi prompt và không đổi model.
2. Lọc khủng hoảng và kiểm đầu ra không phụ thuộc cấu hình.
3. Ca thử A6 chỉ có câu hỏi tổng hợp (`{message}`, `{goals?, tone?, mood?}`…), không có tên gọi hay lịch sử. Một lượt chấm sẽ **không đo được** thay đổi này, lại cho cảm giác an toàn giả và tốn tiền gọi model.
4. Phát hành vẫn có: kiểm tra máy chủ, chỉ `ai.manage`, ghi chú bắt buộc, màn hình so sánh trước/sau và nhật ký kiểm toán.

**Điều kiện mở lại:** nếu Owner cho **nâng trần** (gửi nhiều hơn hôm nay) hoặc mở khối mới, phải thêm `context_config` vào `ai_eval_runs.target_kind` và tạo hàm `*_gated` giống A6. Việc đó cần migration mới.

### 2.7 Admin

Trang mới **"Dữ liệu gửi cho AI"**: route `#context`, nằm trong nhóm "Tính năng AI".

- Chọn tính năng, rồi xem sơ đồ SVG/HTML các nút nối nhau.
- Nút khối dữ liệu có công tắc, ô giới hạn, mô tả tiếng Việt và nhãn loại dữ liệu.
- Nút khóa có ổ khóa và lý do.
- Nút "Lưu nháp" và "Xem lại & phát hành". Màn hình xem lại so sánh "đang chạy" với "sau khi phát hành" và bắt buộc ghi chú.
- Có cảnh báo thay đổi chưa lưu (`unsaved-changes.js`).
- RPC đăng ký trong `NilazaAdminRpc`.

---

## Phần 3 — Phạm vi đợt này

- Migration `20261114090200_ai_context_configs.sql`: bảng, ba RPC, đặc tả SQL. **Chưa áp**, Owner áp theo mã băm.
- `_shared/context-config.ts`: đọc, cache, kẹp, loại dữ liệu. Tệp đặc tả `packages/agent-config/ai-context-blocks.json`.
- Nối vào `ai-persona-chat`, `ai-daily-insight` và `ai-council` (**cần deploy lại ba hàm này**). Các hàm khác không đổi.
- Trang Admin `context-config.js` và các bài kiểm tra.

---

## Phần 4 — Rủi ro và quyết định của Owner

1. **Báo cáo chiêm tinh gửi ngày giờ sinh, nơi sinh và tọa độ chính xác** (mục 1.6). Đề xuất:
   - Bỏ `location.label`, tọa độ, `geocodePlaceId` và giờ UTC chính xác khỏi tin nhắn gửi model. Model chỉ cần vị trí hành tinh, nhà và góc chiếu.
   - Việc này cần hồ sơ riêng và kiểm tra lại hợp đồng đầu ra.
   - **Owner quyết** có làm không.
2. **Có cho Admin gửi *nhiều hơn* hôm nay không** (nâng trần, ví dụ 20 lượt lịch sử, hay mở nội dung nhật ký)?
   - Đề xuất: **không** trước khi lên Play.
   - Nếu có thì cần: câu xin đồng ý mới trong app, cập nhật Chính sách quyền riêng tư và mục *Data safety* trên Google Play, mở cổng A6 (2.6) và tính lại chi phí.
3. **Câu xin đồng ý:**
   - Hôm nay Chat, Hằng ngày và Hội đồng gửi tên gọi, mục tiêu, giọng và tâm trạng mà không có cờ đồng ý riêng (chỉ "người dùng đã tự nhập").
   - Tắt khối ở Admin là thu hẹp, không cần đồng ý mới.
   - Owner có muốn thêm một câu ngắn trong Hồ sơ không? Ví dụ: "Nilaza gửi tên gọi, mục tiêu và giọng bạn chọn cho AI để trả lời hợp với bạn; tâm trạng gần nhất chỉ dùng cho Thông điệp hằng ngày."
4. **Daily ghi `goals` gốc** (chưa cắt) vào `usage_events.metadata` (`ai-daily-insight/index.ts`).
   - Không gửi cho model, nhưng là dữ liệu cá nhân lưu trong bảng đo lường.
   - Đề xuất sửa thành chỉ ghi số mục tiêu, trong một hồ sơ riêng.
5. **Store review:**
   - Đợt này không thêm loại dữ liệu nào gửi đi, nên không đổi câu trả lời *Data safety*.
   - Nếu Owner tắt khối thì dữ liệu gửi đi ít hơn khai báo, vẫn đúng.
   - Nâng trần (mục 2) thì phải khai lại.
6. **Cache 60 giây:** sau khi phát hành, mỗi phiên bản hàm có thể dùng cấu hình cũ tới 60 giây.
