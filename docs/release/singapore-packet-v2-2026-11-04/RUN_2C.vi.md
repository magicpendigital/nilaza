# Phiếu chạy bước 2c — gói SQL v2 lên Singapore

**Lời duyệt:** Owner đồng ý chạy 2c ngày **08/11/2026** cho gói v2: 33 migration, `migrationSetSha256` `9375e1fec225399d5d210cee0488e28ed30d2ccf40ab54eeb8d3ce7b3c27a0d5` (bộ kiểm đích mã hóa thành `477fa3c926fa7633b9de695deb4a219b5918cf12ef34d9a8b5567a803758f2f4`), seed `702e581fc6ed19e53390eadf2c4fce3488f30a19db93c4fc78a2fd8c4b234cb9`, đích `etfajmrwyywokgafzxsb`. Bản chạy thử Docker hết hạn **11/11** — phải chạy trước ngày đó, nếu không tôi chạy thử lại.

Hồ sơ đích: [database-target.singapore-staging.v2.json](database-target.singapore-staging.v2.json). Bộ kiểm hiện **BLOCKED, 0 lỗi**, chỉ còn chờ 3 thứ dưới đây.

## Kết quả đọc ngày 08/11/2026 (18:16 giờ Việt Nam)

[target-metadata-2026-11-08.json](target-metadata-2026-11-08.json) — **hết hạn sau 24 giờ** (09/11 18:16); quá hạn thì đọc lại.

| Mục | Kết quả | Bộ kiểm |
|---|---|---|
| Trạng thái, vùng, gói, compute, Postgres | Healthy · Singapore · Free · Nano · 17.11 | ✅ |
| Add-on (IPv4, PITR, tên miền riêng) | Đều tắt | ✅ |
| Hạn mức Free | Chưa vượt (CSDL 37/500 MB, 189 lượt gọi function) | ✅ |
| Migration, bảng public, Edge Function, Cron, Auth Hook | Không có | ✅ |
| Người dùng Auth | Danh sách trống (dòng "10 users" là số ước tính của dashboard) | ✅ |
| **Cho người mới đăng ký** | **Đang bật** | ⛔ chặn |
| Sổ cái qua CLI ở repo Nilaza | Chưa có kết quả hợp lệ | ⛔ chặn |
| Thông báo của Supabase | "Đang điều tra sự cố kỹ thuật" — xem status.supabase.com trước khi chạy | lưu ý |

**Việc còn lại của Owner:** (1) tắt "Allow new users to sign up" (Authentication → Sign In / Providers → User Signups → tắt → Save changes) — bật lại sau khi Auth/SMTP xong; (2) chạy lại `npx supabase link …` và `npx supabase migration list --linked` **trong `D:
ilaza_clean_stagingepo`** và gửi toàn bộ phần bảng kết quả.

## Bước 1 — Owner đọc dashboard (trong 24 giờ trước khi chạy)

Mở Supabase → project Singapore, chỉ **đọc** rồi trả lời tôi từng dòng (không đổi gì):

1. Trạng thái project (Active/Healthy hay Paused). Nếu Paused: bấm Restore và chờ xong.
2. Vùng (Southeast Asia — Singapore?), gói tổ chức (Free?), Compute (Nano?), Add-ons (có cái nào bật?).
3. Phiên bản Postgres (Settings → Infrastructure).
4. Authentication → Sign In / Providers: **"Allow new users to sign up" đang bật hay tắt?** Có SMTP riêng, Auth Hooks hay nhà cung cấp đăng nhập bên ngoài nào không?
5. Integrations → Cron: có job nào? Edge Functions: có hàm nào?
6. Usage: có cảnh báo hạn mức không?

Nếu mục 4 đang **bật**, bộ kiểm sẽ chặn. Tắt nó là một thay đổi cài đặt — tôi sẽ xin bạn riêng (đề xuất: tắt cho tới khi xong Auth/SMTP).

## Bước 2 — Owner đăng nhập CLI và đọc lại sổ cái (chỉ đọc)

Chạy trong PowerShell tại `D:\nilaza_clean_staging\repo`, **tự nhập** mọi mật khẩu khi được hỏi (không gửi cho tôi):

```powershell
npx supabase login
```

```powershell
npx supabase link --project-ref etfajmrwyywokgafzxsb
```

```powershell
npx supabase migration list --linked
```

Gửi tôi kết quả lệnh cuối (chỉ là danh sách phiên bản, không có bí mật). Kỳ vọng: cột Remote trống. Nếu có bất kỳ dòng Remote nào → **dừng**.

## Bước 3 — tôi hoàn tất hồ sơ và chạy bộ kiểm

Tôi ghi thông tin dashboard + sổ cái vào hồ sơ, tạo tệp lời duyệt gắn đúng hash, chạy `node scripts/database-target-gate.mjs --manifest docs/release/singapore-packet-v2-2026-11-04/database-target.singapore-staging.v2.json`. Chỉ khi kết quả **PASS** mới sang bước 4.

## Bước 4 — Owner chạy thật (tôi theo dõi từng kết quả)

```powershell
npx supabase db push --linked --include-seed --dry-run
```

Kỳ vọng: liệt kê **đúng 33 tệp** từ `202606120001_mvp_schema.sql` tới `20261031100000_ai_feature_switches.sql` và seed `seed.generated.sql`. Khác → **dừng**.

```powershell
npx supabase db push --linked --include-seed
```

## Bước 5 — kiểm sau khi áp

- `npx supabase migration list --linked`: 33 dòng, Local = Remote.
- Tôi đưa các truy vấn kiểm (số bảng, 78 lá Tarot, RLS bật trên mọi bảng public, quyền hàm hạn mức) để bạn chạy trong SQL Editor, và bạn mở **Advisors → Security** chụp kết quả.
- Tôi cập nhật sổ cái `supabase/migration-ledgers/nilaza-singapore-prelaunch-qa.json` và `PLAN.md`.

## Điều kiện dừng và hoàn tác

Dừng ngay nếu: project không Active/Healthy; sổ cái có phiên bản Remote; dry-run khác 33 tệp; bất kỳ lệnh nào báo lỗi giữa chừng (không tự "sửa" trên cloud — ghi lại thông báo và báo tôi). Hoàn tác: chỉ sửa tiến bằng migration mới; trường hợp xấu nhất dựng lại project (project đang trống, không mất dữ liệu người dùng) — chỉ khi Owner quyết định.
