# Gói SQL Singapore v2 (04/11/2026) — xin duyệt lại mã hash trước khi chạy 2c

> **08/11/2026: Owner đồng ý chạy 2c với gói v2.** Các bước tiếp theo: [RUN_2C.vi.md](RUN_2C.vi.md).

Ngày 04/11 Owner đồng ý chạy bước 2c. Khi tính lại hash ngay trước khi chạy, **gói SQL đã khác bản duyệt 26/10** — đúng tình huống mà phiếu 2a ghi "hash khác thì lời duyệt tự hết hiệu lực". Tài liệu này xin **một quyết định**: duyệt bộ SQL mới dưới đây làm đích của 2c. Chưa có gì chạy trên cloud.

## Khác gì so với bản 26/10

| | Bản 26/10 (đã duyệt 2a) | Bản v2 (04/11) |
|---|---|---|
| Số migration | 31 | **33** |
| `migrationSetSha256` | `256c8ff7…cb9a8` | **`9375e1fec225399d5d210cee0488e28ed30d2ccf40ab54eeb8d3ce7b3c27a0d5`** |
| Seed (78 lá VI/EN) | `4f600aa1…8517` | **`702e581fc6ed19e53390eadf2c4fce3488f30a19db93c4fc78a2fd8c4b234cb9`** (350.062 byte) |

Hai migration mới (đã merge ở PR #13–#14 ngày 31/10, đang chạy trên project QA cũ):
- `20261031090000_ai_feedback_conversation_features.sql` (`ad97adf6…3007`) — hộp phản hồi AI nhận báo cáo từ Chat và Council.
- `20261031100000_ai_feature_switches.sql` (`36122069…6c60`) — bảng công tắc bật/tắt tính năng AI trong Admin.

Seed đổi vì tên lá bài Việt đã duyệt (PR #19).

## Bằng chứng chạy thử (trên máy, dữ liệu giả, không nối cloud)

- [packet-manifest.json](packet-manifest.json): 33 tệp + seed, hash theo nội dung chuẩn hóa LF (trùng Git).
- [replay-receipt.json](replay-receipt.json): PGlite (Postgres 17) — 33/33 migration, seed, **10/10** kiểm tra xóa tài khoản kèm đối chứng âm. **PASS**.
- [rehearsal-native-2026-11-04.json](rehearsal-native-2026-11-04.json): Docker, ảnh Supabase Postgres 17 đã ghim — 33/33 migration, **17/17** kiểm tra: người dùng A/B cách ly, thu hồi quyền nhân viên, chặn claim owner giả, hạn mức AI chỉ `service_role` gọi được, client không TRUNCATE được, khôi phục `pg_dump`/`pg_restore` giữ nguyên dữ liệu/quyền/hàm. **PASS**. Hạn dùng: 7 ngày (tới 11/11).

Giới hạn: không chứng minh hành vi Supabase thật (Auth, JWT, Storage, nhiều kết nối).

## Quyết định xin Owner

> **"Tôi duyệt gói SQL v2 (33 migration, `9375e1fe…a0d5`, seed `702e581f…4cb9`) làm đích của bước 2c trên project Singapore `etfajmrwyywokgafzxsb`."**

Hoàn tác: rút lời duyệt bất kỳ lúc nào trước khi chạy; không có gì cần dọn.

## Sau khi duyệt — việc của Owner (tôi không làm thay)

1. **Đọc dashboard Supabase Singapore** (trong 24 giờ trước khi chạy) theo [mẫu thông tin project](../singapore-backend-readiness-2026-10-25/target-metadata.template.json): trạng thái Active/Healthy, vùng Singapore, gói Free, compute Nano, không add-on, Postgres 17, **có cho người dùng mới đăng ký không**, không có cron/Edge Function, không cảnh báo hạn mức. Chỉ báo lại, không đổi cài đặt. (Kết nối Supabase của tôi không có quyền đọc project này.)
2. **Đăng nhập Supabase CLI và nhập mật khẩu DB** trên máy của bạn khi tôi đưa lệnh. Đừng gửi mật khẩu cho tôi.

Tôi sẽ: cập nhật hồ sơ đích và sổ cái cho 33 tệp, đọc lại sổ cái ngay trước khi chạy, soạn sẵn từng lệnh (`link` → `db push --dry-run` phải liệt kê đúng 33 tệp → `db push` → nạp seed → truy vấn kiểm + Security Advisor). Điều kiện dừng: theo mục 9 gói A (`01_SQL_PACKET.vi.md`).

## Việc nối tiếp đã được Owner duyệt 04/11 (làm sau 2c)

- Deploy `account-delete` + hộp thư hỗ trợ (đề xuất Cloudflare Email Routing).
- Deploy bản vá: bắt buộc đăng nhập + hạn mức cho Daily insight và Astrology report.
- Đặt tài khoản thử `magicpendigital@gmail.com` là Premium để test (cần một câu SQL trên project đang chạy QA — sẽ đưa lệnh cụ thể).
