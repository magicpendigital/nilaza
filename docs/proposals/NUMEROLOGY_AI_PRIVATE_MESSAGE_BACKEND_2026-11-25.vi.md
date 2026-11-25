# Bản đồ số: AI “Lời nhắn riêng” — gói việc backend chờ Owner duyệt (25/11/2026)

> **Loại tài liệu:** đề xuất, **Owner duyệt gói B1–B8 ngày 25/11/2026; mã đã viết (nhánh `claude/numerology-ai-message-b1-b8`), chưa áp SQL, chưa deploy, công tắc tắt**. Thuộc Lô 5 ([đặc tả](ASTRO_NUMEROLOGY_IMPLEMENTATION_2026-11-23.vi.md) mục 5 và 8). Tình trạng từng mục ở mục 4.
> **Đã có trong app (Lô 5, chưa phát hành):** thẻ “Lời nhắn riêng · Sắp có” trên màn Bản đồ số (không gọi AI) và bộ dựng dữ liệu gửi đi `apps/mobile/src/features/numerology/aiPayload.ts`, có test chứng minh **không chứa họ tên, tên đã chuẩn hóa, ngày sinh, năm sinh hay tuổi**.
> **Căn cứ mẫu:** hàm `ai-daily-insight` (đăng nhập → công tắc → hạn mức → prompt từ `prompt_versions` → `generateWithModelRoute`).

## 1. Dữ liệu gửi lên (đã cố định trong app)

```json
{
  "version": 1,
  "feature": "numerology_private_message",
  "language": "vi",
  "numbers": { "lifePath": "11/2", "birthday": "6", "expression": "9", "soulUrge": "9", "personality": "9",
               "personalYear": "1", "personalMonth": "3", "pinnacle": { "stage": 1, "number": "9" }, "challenge": "3" },
  "blockIds": ["numbers.2", "masters.11", "personalYear.1", "pinnacles.numbers.9", "challenges.3"]
}
```

**Số ngày sinh — Owner quyết 25/11/2026:** giữ `birthday` trong dữ liệu gửi đi như đề xuất (với ngày 1–9 nó chính là ngày trong tháng, không lộ tháng/năm).

**Có nên gửi ngày sinh gốc không? (Owner cho phép nếu giúp chính xác hơn, kèm nghiên cứu mã hóa — kết luận 25/11):** **không gửi.**
- *Không chính xác hơn:* mọi con số đã được app tính theo luật cố định (ca vàng 28/28). AI chỉ chọn và nối các khối đã duyệt, không tính lại. Đưa thêm ngày sinh gốc không thêm thông tin nào AI được phép dùng, mà còn tạo cơ hội để AI tự suy ra tuổi, cung hoàng đạo hay “dự đoán” — đúng những điều đặc tả cấm.
- *Mã hóa không đổi được rủi ro chính:* đường truyền app → máy chủ đã mã hóa HTTPS/TLS. Muốn AI dùng ngày sinh thì máy chủ phải giải mã và đưa nguyên văn vào lời nhắc gửi nhà cung cấp model, nên mã hóa thêm một lớp trong app chỉ bảo vệ đoạn đường đã được TLS bảo vệ, lại thêm một khóa bí mật phải quản lý (cổng duyệt riêng). Cách bảo vệ thật là **không gửi**.
- *Nếu sau này thật sự cần ngày sinh* (ví dụ “Hai hệ cùng nhìn bạn” cần vị trí sao): app tính vị trí sao trên máy và chỉ gửi kết quả; máy chủ không ghi log thân yêu cầu, không lưu, và chỉ dùng tuyến `zdr` + `data_collection: "deny"`.

Máy chủ tự tra văn bản của từng mã khối từ kho đã duyệt; AI **chỉ chọn và nối** các khối, không viết ý mới (đặc tả mục 4, lớp 5).

## 2. Các việc cần Owner duyệt, mỗi việc một lần

| # | Việc | Nội dung đề xuất | Rủi ro | Hoàn tác |
|---|---|---|---|---|
| B1 | **Điều kiện trước:** người duyệt chuyên môn và kho nội dung `approved` | AI chỉ chạy khi `numerology-blocks.json` có `review.status = approved` | AI nối nội dung chưa duyệt | — |
| B2 | **Prompt** `numerology_private_message_system` (vi + en) | Vai trò: nối 3–5 khối đã cho thành lời nhắn ≤ 120 chữ; giữ giọng “có thể/nghiêng về”; cấm từ trong đặc tả mục 4; không thêm dữ kiện ngoài khối; không dự đoán; trả JSON `{ "message", "blockIds" }` và `blockIds` phải là tập con của mã đã gửi | prompt sai giọng | sửa bản prompt |
| B3 | **Tuyến model** `numerology_private_message` | Một model rẻ không suy luận, `maxOutputTokens` ~600, dự phòng 1 model; chỉ tuyến `zdr` và `data_collection: "deny"` (dữ liệu nhạy cảm theo kỹ năng AI runtime) | chi phí, nhà cung cấp lưu dữ liệu | tắt tuyến |
| B4 | **Hạn mức và công tắc** | Premium, 1 lời nhắn/ngày/tài khoản (ngày giờ Việt Nam), 2 lần lỗi được thử lại; công tắc `numerology_private_message` trong `ai_feature_switches`, mặc định **tắt** | lạm dụng | tắt công tắc |
| B5 | **SQL/migration** | Thêm dòng tuyến, công tắc, prompt (seed) — chỉ dữ liệu cấu hình, không bảng mới, không lưu nội dung người dùng | áp sai dự án | migration ngược xóa các dòng seed |
| B6 | **Edge Function mới** `ai-numerology-message` | Bắt buộc đăng nhập; kiểm công tắc và hạn mức **trước** khi đọc body; từ chối mọi khóa lạ trong body (họ tên, ngày sinh…); kiểm từng số hợp lệ (1–9, 11/2, 22/4, thử thách 0–8); kiểm đầu ra trong đường router để rơi sang model dự phòng; ghi trace và chi phí như các hàm khác | rò dữ liệu nếu không lọc | không deploy / gỡ hàm |
| B7 | **Data safety và chính sách** | Ghi “các con số Thần số học đã tính” được gửi tới AI khi người dùng bấm; ngày sinh người thứ hai (Hợp số) **không** rời máy | khai báo thiếu với Google Play | sửa khai báo |
| B8 | **Hộp xác nhận trong app** | Như hộp Tarot AI: nói rõ trừ năng lượng và gửi những gì (chỉ con số và mã khối) | — | — |

Thứ tự đề xuất: B1 → B2 → B3/B4 → viết mã B6 + test Deno (một PR) → B5 áp SQL → deploy B6 → B7 → bật công tắc cho tài khoản thử.

## 3. Chưa làm và vì sao

- Chưa viết mã hàm vì prompt, tuyến, hạn mức là cổng duyệt riêng (PLAN mục 7, Lô 5) và nội dung còn `draft`.
- “Báo cáo tổng hợp” và “Hai hệ cùng nhìn bạn” dùng cùng hợp đồng dữ liệu (thêm vị trí sao đã tính, không ngày giờ sinh); để sau khi “Lời nhắn riêng” chạy ổn.
- **Chưa đo chi phí** một lời nhắn; ước tính chỉ có sau khi chọn model (B3).

## 4. Tình trạng sau khi Owner duyệt (25/11/2026)

| # | Đã làm trong mã | Còn chờ |
|---|---|---|
| B1 | Hàm từ chối (503 `content_not_approved`) khi `numerology-blocks.json` chưa `approved` hoặc chưa có tên người duyệt | ✅ Owner đọc và duyệt 25/11: `review.status = approved`, người duyệt “Owner”, bản `2026-11-25-approved1` (không phải chuyên gia bên ngoài; sửa nội dung sau này cần Owner duyệt lại) |
| B2 | Prompt `numerology_private_message_system` (vi+en) trong `prompt-library.json`; Admin chưa sửa được prompt này | — |
| B3 | Tuyến `numerology_private_message`: model rẻ không suy luận + 1 dự phòng, ~600 token, nhóm dữ liệu nhạy cảm (OpenRouter `zdr`, `data_collection: deny`) | đo chi phí thật sau khi chạy thử |
| B4 | Premium, 1 lời nhắn/ngày giờ Việt Nam + 2 lần lỗi; công tắc đọc **chặt** (thiếu dòng hay lỗi = tắt) | Owner bật công tắc cho tài khoản thử |
| B5 | File `supabase/migrations/20261125090000_numerology_private_message.sql`: mở danh sách cho phép, thêm tuyến, công tắc **tắt**, không bảng mới | **Owner duyệt áp SQL theo hash** |
| B6 | Hàm `ai-numerology-message` + test Deno: kiểm đăng nhập → công tắc → nội dung → Premium → hạn mức **trước** khi đọc dữ liệu; từ chối mọi khóa lạ; kiểm đầu ra trong router để rơi sang model dự phòng; không lưu lời nhắn | **Owner duyệt deploy** |
| B7 | Bản nháp Data safety (mục 2.4 tài liệu Play) và chính sách quyền riêng tư vi/en | Owner điền form Play Console |
| B8 | Hộp xác nhận trong thẻ: chỉ con số và mã khối được gửi, lượt chỉ tính khi lời nhắn đến tay. **Không trừ năng lượng** vì app chưa có cơ chế trừ năng lượng (Owner quyết 15/11 không hiện số Nil) | — |

Khi công tắc tắt, nội dung chưa duyệt hoặc tài khoản chưa Premium, thẻ vẫn hiện “Sắp có” (hoặc ghi chú Premium).
