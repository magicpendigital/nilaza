# Bảng Tra Cứu Nhanh Dành Cho Owner (Nilaza Owner Quick Reference)

*Dùng để tra cứu nhanh các lệnh, phím tắt, ranh giới an toàn và quy trình xử lý sự cố.*

---

## 1. Đường Dẫn & Lệnh Khởi Động

| Mục tiêu | Thao tác / Đường dẫn |
|---|---|
| Khởi động Web Admin cục bộ | Dùng `npm run feature:run -- --record docs/feature-plans/<task>.json --script admin:dev` sau preflight |
| URL Bảng điều khiển Content | `http://localhost:4173/apps/admin/#/content/personas` |
| URL Bảng điều khiển AI Studio | `http://localhost:4173/apps/admin/#/ai-studio/workflow` |
| Tạo lại hạt giống dữ liệu | `npm run admin:seed` |
| Kiểm tra tính toàn vẹn hệ thống | `npm run admin:check` |
| Chạy bộ kiểm thử tự động | `npm run admin:test` |
| Kiểm tra tính hợp lệ dữ liệu | `npm run validate:data` |

---

## 2. Ma Trận Năng Lực (Capabilities) Của Quyền Owner

| Năng lực | Ý nghĩa vận hành |
|---|---|
| `hub.read` | Mở bảng điều khiển Admin |
| `content.read` | Đọc dữ liệu Persona, Decks, Cards, Assets |
| `content.draft` | Lưu chỉnh sửa bản nháp cục bộ (`localStorage`) |
| `content.publish` | Đổi trạng thái sang `published` hoặc `active` |
| `content.delete` | Xóa vĩnh viễn bản ghi (chỉ khi là draft/archived và không bị ràng buộc liên kết) |
| `ai.read` | Xem luồng AI, Prompt, Council và Model Router |
| `ai.manage` | API publish Model Route và cặp prompt Astrology; Council publish hiện bị khóa trên bản local; prompt khác còn preview |
| `roles.manage` | Quản lý phân quyền tài khoản |
| `overview.read` | Xem báo cáo tổng quan và nhật ký kiểm toán |
| `notifications.dispatch` | Kích hoạt gửi thông báo đẩy |
| `safety.review` | Duyệt nội dung an toàn và các trường ngữ cảnh nhạy cảm |

---

## 3. Ranh Giới Đỏ Về An Toàn (Red Lines)

1. **Khóa Bí mật (Secrets)**: Tuyệt đối không bao giờ dán API Key (`sk-...`) vào prompt, tin nhắn chat hoặc mã nguồn web/mobile. Chỉ lưu trong `Supabase Dashboard -> Edge Functions -> Secrets`.
2. **Ngữ cảnh Riêng tư (Privacy)**: Không bật các trường nguy cơ cao (`rawPrivateChat`, `journalHistory`, `birthProfile`) khi không có rào chắn bảo vệ.
3. **Tâm linh & Sức khỏe**: Không bao giờ phán đoán tương lai chắc chắn ("chắc chắn sẽ xảy ra"), không chẩn đoán y tế, thuốc men, tài chính hoặc pháp lý.
4. **Hỗ trợ Khẩn cấp**: Khi phát hiện từ khóa tự hại, lập tức ngắt bói toán và cung cấp hotline hỗ trợ tâm lý khẩn cấp.
5. **Nhân vật Lịch sử**: Luôn giữ minh bạch "lấy cảm hứng từ", không mạo danh người thật.

---

## 4. Phím Tắt & Cú Pháp Nhanh Trong AI Studio

- **Chèn biến ngữ cảnh động**: Gõ ký tự `@` trong ô soạn thảo Prompt -> Chọn biến từ menu popup.
- **Biến thường dùng**:
  - `{{language}}`: Ngôn ngữ (`vi` hoặc `en`).
  - `{{tone}}`: Tông giọng phản hồi (`gentle`, `wise`, `direct`,...).
  - `{{recentMessages}}`: 6 lượt chat gần nhất đã làm sạch.
  - `{{selectedCards}}`: Danh sách lá bài tarot người dùng đã bốc.
  - `{{tarot.spread}}`: Kiểu trải bài (`one_card`, `three_card`).
- **Edge Functions Quản trị**:
  - Đọc Council: `admin-ai-council-config`; nút publish bị khóa cho tới khi editor/publisher được nghiệm thu
  - Xuất bản Model Router: `admin-model-router-config`

---

## 5. Quy Trình Xử Lý Sự Cố

1. **Bước 1**: Đăng nhập Admin Console -> Vào **AI Studio** -> Chọn tính năng bị lỗi.
2. **Bước 2**: Xem request ID trong **Trace Explorer** và route trong **Versions**. Chưa có nút Rollback/Compare; Versions chưa hiện đủ mọi thông số cũ, nên cần snapshot đã xác minh trước khi khôi phục.
3. **Bước 3**: Trên môi trường được phép thay đổi, tạo một version mới từ snapshot ổn định, review đúng host và toàn bộ settings, publish rồi chạy synthetic request và đối chiếu Audit/Trace.

QA cũ hiện giữ làm bằng chứng; migration ledger vẫn blocked. Không apply SQL, deploy hoặc publish vào QA cũ để xử lý sự cố theo bảng này. Xem [báo cáo Configure 03/10/2026](mvp-remediation/2026-10-03/admin-configure/report.vi.md) để biết các khả năng chưa hoàn thiện và tiêu chí nghiệm thu.
