# Bản đồ số: AI “Lời nhắn riêng” — gói việc backend chờ Owner duyệt (25/11/2026)

> **Loại tài liệu:** đề xuất, **chưa có mã backend, chưa SQL, chưa deploy**. Thuộc Lô 5 ([đặc tả](ASTRO_NUMEROLOGY_IMPLEMENTATION_2026-11-23.vi.md) mục 5 và 8).
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

**Cần Owner quyết khi làm backend:** số ngày sinh (`birthday`) với ngày 1–9 chính là ngày trong tháng (ví dụ “6” = sinh ngày 6). Không lộ tháng/năm nên rủi ro thấp, nhưng nếu muốn chặt hơn có thể bỏ `birthday` khỏi dữ liệu gửi đi.

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
