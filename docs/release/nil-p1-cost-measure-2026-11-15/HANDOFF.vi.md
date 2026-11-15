# P1-C — Đo chi phí AI thật theo tính năng (15/11/2026)

Nhánh `claude/nil-p1-cost-2026-11-15` (cắt từ `claude/nil-p0-p1-2026-11-15`). Chỉ có code, migration và kiểm thử cục bộ. **Chưa áp SQL, chưa deploy gì.**

## Đã đổi gì

1. **Bảng giá tham khảo** (`supabase/functions/_shared/provider-registry.ts`, `REFERENCE_PRICE_BOOK`). Mỗi model trong tuyến mặc định và chuỗi dự phòng có:
   - giá vào/ra (micro-USD cho mỗi token);
   - nguồn và ngày kiểm;
   - cờ *đã xác minh* hoặc *chưa xác minh*.

   Cùng một bảng dùng cho hai việc: dự tính trước khi gọi (trần 0,02 USD/lượt) và tính chi phí sau khi gọi.
2. **Ghi chi phí mọi lần gọi model** (`model-router.ts`), dù thành công, lỗi, bị chặn an toàn, sai định dạng hay rơi xuống model dự phòng.
   - Mỗi lần gọi ghi các trường: `cost_micro`, `cost_source`, `price_verified`, `input_tokens`, `output_tokens`.
   - `cost_source` có ba giá trị:
     - `reported`: số tiền từ hóa đơn OpenRouter;
     - `estimated`: tính bằng số token × bảng giá;
     - `unknown`: không có số liệu, thường là lần gọi bị lỗi.
   - Cả lượt ghi tổng `cost_micro_total` và nguồn kém tin cậy nhất trong lượt.
   - Tuyến, thứ tự dự phòng và ngân sách **không đổi**.
3. **Migration mới** `supabase/migrations/20261115120000_ai_cost_by_feature_view.sql`:
   - view `nilaza_private.ai_cost_calls`, chỉ service_role đọc được;
   - hàm `public.get_ai_cost_summary(days_back)`, cho tài khoản có quyền `ai.read` hoặc service_role.
   - Số liệu gom theo ngày giờ Việt Nam, tính năng và model: lượt, token, tổng USD, p50/p95/p99 mỗi lượt và mỗi lần gọi, tỉ lệ lỗi, dự phòng, ước tính.
   - Phân bố chi phí mỗi người mỗi ngày chỉ có phân vị, và ẩn khi chưa đủ 5 người-ngày.
   - Không trả mã người dùng, câu hỏi hay câu trả lời.
   - Lượt chạy thử của Admin tách riêng.
4. **Admin › Tổng quan, khối "Chi phí AI"** thay dòng "chưa có số liệu chi phí".
   - Bảng theo tính năng, chọn 7/14/30 ngày.
   - Dòng có số ước tính mang nhãn "ước tính". Dòng có model chưa xác minh giá mang nhãn "giá chưa xác minh".
   - Khi không có dữ liệu: "Chưa có lượt nào trong khoảng này".
   - Ngân sách chỉ hiển thị, không sửa được ở đây:
     - chính sách g1: 5 USD/ngày, 50 USD/14 ngày, chưa kích hoạt;
     - trần 0,02 USD/lượt;
     - dòng "Giả định pilot Free: 1 USD/ngày (quyết định 15/11, chưa cấu hình)".

**SHA-256 (LF) của migration:** `1525e18937ca9e65e07794ef606e5c165eeea5f46ad39b3ec01e1f6df449f4cd`

## Owner đọc số thế nào

Sau khi áp migration và deploy lại, vào Admin › Tổng quan, khối "Chi phí AI":
- **Lượt**: số lượt người dùng hỏi. **Lần gọi model**: có thể lớn hơn số lượt khi model dự phòng chạy.
- **Mỗi lượt p50 / p95 / p99**:
  - p50 là chi phí của lượt "điển hình";
  - p95 nghĩa là 95% số lượt rẻ hơn mức này.
  - Dùng p95 để đặt giá Nil an toàn.
- **Ghi chú**: "ước tính" nghĩa là nhà cung cấp không trả số tiền, nên đây là số tự tính. "Giá chưa xác minh" nghĩa là model chưa có nguồn giá chính thức.
- Dòng "Trung bình …/ngày" so với trần ngày của ngân sách.

## Nguồn giá (kiểm ngày 15/11/2026)

Nguồn: API công khai `https://openrouter.ai/api/v1/models`.

**Đã xác minh, qua OpenRouter** (USD cho 1 triệu token, vào/ra):

| Model | Vào | Ra | Ghi chú |
|---|---|---|---|
| deepseek-v4.1-flash | 0,0507 | 0,2028 | Giá điểm cuối rẻ nhất. Có điểm cuối đắt hơn, tới 3/12. |
| xiaomi/mimo-v2.6-flash | 0,14 | 0,28 | |
| deepseek-v4.1-flash-1017 | 0,02 | 0,108 | |
| openai/gpt-5.4-mini | 0,75 | 4,5 | |
| openai/gpt-5.4 | 2,5 | 15 | |
| anthropic/claude-sonnet-4.6 | 3 | 15 | |
| google/gemini-3.5-flash | 1,5 | 9 | |

**Nhà cung cấp trực tiếp, đối chiếu qua OpenRouter** (chưa so với trang giá của chính nhà cung cấp):

| Model | Vào | Ra |
|---|---|---|
| Claude Haiku 4.5 | 1 | 5 |
| Claude Sonnet 4.5 | 3 | 15 |
| gpt-4o-mini | 0,15 | 0,6 |
| gpt-4.1-mini | 0,4 | 1,6 |
| gemini-2.5-flash | 0,3 | 2,5 |
| gemini-2.5-flash-lite | 0,1 | 0,4 |
| gemini-2.5-pro | 1,25 | 10 |

**Chưa xác minh, lấy mức cao để an toàn:**

| Model | Vào | Ra |
|---|---|---|
| DeepSeek trực tiếp `deepseek-flash` | 0,3 | 1,2 |
| DeepSeek trực tiếp `deepseek-v4-pro` | 1,8 | 3 |

## Rủi ro

- Giá OpenRouter thay đổi theo thời gian và theo điểm cuối. Khi có hóa đơn (`reported`), số trên hóa đơn luôn thắng giá bảng.
- **Trần 0,02 USD/lượt:**
  - Trước đây model OpenRouter không có giá, nên phần dự tính bằng 0. Nay có giá.
  - Với deepseek, 30.000 ký tự và 2.000 token ra chỉ khoảng 0,002 USD, nên thực tế trần **không chặn khác đi**.
  - Khác biệt nhỏ: lần gọi có token nhưng không có số tiền nay được cộng thành số ước tính, thay vì 0.
- Lượt "replay" (trả lại kết quả cũ) không gọi model nên không có chi phí. Không có nhánh nào để ghi.
- Khi đặt `AI_TRACE_PAYLOAD_MODE=metadata`, các thuộc tính bị gom lại, nên chi phí mất. Mặc định `redacted` giữ số liệu. Đây là giới hạn có sẵn của `ai-trace.ts`.
- Dữ liệu cũ trước khi deploy chỉ có `charged_usd`. Migration vẫn đọc được: hóa đơn tính là `reported`, `costMicro` cũ tính là `estimated`.

## Cần Owner duyệt (từng việc)

1. **Áp migration** `20261115120000_ai_cost_by_feature_view.sql`, đúng hash ở trên.
2. **Deploy lại các Edge Function dùng model-router:**
   - ai-persona-chat, ai-oracle-turn, ai-council;
   - ai-daily-insight, ai-tarot-reading, ai-astrology-insight;
   - admin-ai-eval-run.
3. **Deploy Admin.** Mỗi lần push lên `main` tự deploy Admin staging.

Chưa áp migration thì Admin hiện "Máy chủ chưa có hàm đọc chi phí (migration 20261115120000 chưa áp)".

## Hoàn tác

- SQL:
  - `drop function if exists public.get_ai_cost_summary(integer);`
  - `drop view if exists nilaza_private.ai_cost_calls;`
  - `drop function if exists nilaza_private.ai_cost_num(jsonb);`
- Code: revert các commit P1-C rồi deploy lại các function trên. Thuộc tính cũ trong nhật ký vẫn vô hại.
