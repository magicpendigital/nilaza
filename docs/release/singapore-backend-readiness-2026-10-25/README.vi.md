# Nilaza — giai đoạn 2: gói backend Singapore để Owner duyệt từng bước

Ngày 25/10/2026, Asia/Bangkok. Hồ sơ Plan & QC: [`singapore-backend-readiness-2026-10-25.json`](../../feature-plans/singapore-backend-readiness-2026-10-25.json). Đây là gói **soạn sẵn để duyệt**. **Chưa có gì được chạy trên cloud:** không áp migration, không deploy Edge Function, không đặt secret, không đổi cài đặt Auth/SMTP, không đọc hay đặt khóa nào. Sổ cái migration cũ (`blocked_pending_reconciliation`) và danh sách đích trong `release-profile.json` (rỗng) giữ nguyên.

## Bốn gói và trạng thái thật

| Gói | Tài liệu | Đã có | Chưa có |
|---|---|---|---|
| **A. SQL / migration Singapore** | [01_SQL_PACKET.vi.md](01_SQL_PACKET.vi.md) · [packet-manifest.json](packet-manifest.json) · [replay-receipt.json](replay-receipt.json) · [readback-2026-10-26.json](readback-2026-10-26.json) · [05_STEP2_APPROVAL_FORM.vi.md](05_STEP2_APPROVAL_FORM.vi.md) | 31 migration (30 cũ + 1 mới) kèm SHA-256; replay đủ 31 trên PostgreSQL 17 cục bộ **PASS**; truy vấn kiểm trước/sau, điều kiện dừng; **đọc lại Singapore ngày 26/10: vẫn trống**, extension có đủ; hash tính lại khớp; phiếu duyệt bậc 2 | Chưa chạy trên Supabase thật; **2a đã duyệt 26/10**; còn chờ 2b → 2c |
| **B. Hàm xóa tài khoản** | [02_ACCOUNT_DELETION.vi.md](02_ACCOUNT_DELETION.vi.md) | Migration + Edge Function `account-delete` + 13 test Deno **PASS** + 10 kiểm tra SQL **PASS** (kể cả đối chứng âm) | Chưa deploy; app và trang web chưa nối; chưa thử với Supabase Auth thật |
| **C. Chặn chi phí AI** | [03_AI_COST_GUARD_PLAN.vi.md](03_AI_COST_GUARD_PLAN.vi.md) | Kế hoạch nhiều lớp, thứ tự phát hành an toàn, 6 lát cắt kèm nghiệm thu | **Chưa nối vào endpoint** — đây là kế hoạch, không phải mã đã chạy |
| **D. Auth / SMTP** | [04_AUTH_SMTP_PLAN.vi.md](04_AUTH_SMTP_PLAN.vi.md) | Cấu hình đích, các bước domain gửi thư, mẫu thư, tài khoản thử cho Play | Chưa thực hiện; cần bạn đăng nhập Supabase/Resend/Cloudflare |

## Thang duyệt đề xuất (mỗi bậc là một lần bạn đồng ý riêng)

1. **Bậc 1 — Đọc lại hiện trạng Singapore (chỉ đọc).** **Xong ngày 26/10:** project vẫn trống (0 bảng, 0 migration, 0 Edge Function), Postgres 17.11 — xem [mục 1 gói A](01_SQL_PACKET.vi.md). Vùng/trạng thái project chưa đọc lại được qua connector.
2. **Bậc 2 — Duyệt gói SQL.** Theo [phiếu duyệt](05_STEP2_APPROVAL_FORM.vi.md), tách thành 3 quyết định: **2a** chốt `migrationSetSha256` + đích → **2b** PR thêm Singapore vào danh sách đích/sổ cái mới → **2c** thực thi (khuyến nghị: Supabase CLI do bạn nhập mật khẩu DB). Sau 2c mới có migration trên cloud.
3. **Bậc 3 — Deploy `account-delete`** (sau bậc 2) và nối app + trang web xóa tài khoản (hai lát cắt mã riêng).
4. **Bậc 4 — Auth/SMTP** (bạn đăng nhập từng dịch vụ): domain gửi thư production, SMTP, URL callback, mẫu thư.
5. **Bậc 5 — Chi phí AI:** làm các lát cắt ở gói C **trước** khi đặt khóa OpenRouter. Hạn mức cứng bên OpenRouter đặt khi bạn tạo khóa.
6. **Bậc 6 — Đặt 3 biến `EXPO_PUBLIC_*` trên EAS** rồi dựng AAB đầu tiên (như hướng dẫn trước).

## Điều quan trọng nhất cần biết

- **Mã nguồn đã sẵn nhưng backend chưa tồn tại:** project Singapore được xác minh là **0 bảng, 0 migration, 0 Edge Function** (05/10, 09/10, 16/10 và **26/10**). Mọi thứ trong gói còn chờ bậc 2. Gói Free tự tạm dừng khi lâu không dùng — đọc lại ngay trước khi áp.
- **Xóa tài khoản là yêu cầu bắt buộc của Google Play** (đường xóa trong app + URL web). Phần backend đã xong và kiểm thử cục bộ; còn nút trong app, trang web và việc áp migration.
- **Không đặt khóa OpenRouter sớm.** Thư viện giữ chỗ chi phí có sẵn nhưng chưa được endpoint nào gọi; có khóa là có chi phí không kiểm soát được. Ra mắt thử **không có khóa** thì bộ định tuyến tự rơi về câu trả lời cục bộ an toàn.
- **Council và Astrology AI nằm trong bản đầu** theo quyết định của bạn: policy chi phí hiện chỉ gồm 3 tính năng (chat, Oracle, Tarot 1 lá) nên cần mở rộng ở gói C; Astrology AI hiện còn đòi quyền `premium_astrology_ai` ngay cả cho người dùng miễn phí.
- **Kiểm chứng cục bộ ≠ kiểm chứng trên Supabase thật:** replay dùng PGlite (PostgreSQL 17.5, một kết nối, `auth.users` chỉ có `id`), chưa kiểm JWT, Storage, vai trò và phần mở rộng của gói Free.
