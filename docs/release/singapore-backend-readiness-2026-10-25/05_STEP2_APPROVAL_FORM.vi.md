# Phiếu duyệt bậc 2 — gói SQL cho Supabase Singapore

Soạn ngày 26/10/2026, Asia/Bangkok. Phiếu này **chỉ để bạn đọc và trả lời**. Soạn phiếu không chạy gì trên cloud: không áp migration, không ghi SQL, không đổi cài đặt, không đọc hay đặt khóa nào.

Bậc 2 gồm **ba quyết định riêng**, duyệt lần lượt. Mỗi lần bạn chỉ trả lời một quyết định:

| Lần | Quyết định | Trạng thái |
|---|---|---|
| **2a** | Chốt **nội dung gói** (31 migration + seed) và **đích** sẽ áp | **Owner đã duyệt ngày 26/10/2026** — xem bản ghi bên dưới |
| 2b | Một PR thêm Singapore vào danh sách đích (`release-profile.json`) và tạo sổ cái migration riêng | Chưa xin; bước tiếp theo |
| 2c | **Thực thi**: bạn chạy Supabase CLI, tự nhập mật khẩu DB, chạy thử (`--dry-run`) rồi áp thật | Chưa xin; soạn sau khi 2b được merge |

---

## Quyết định 2a — chốt nội dung gói và đích

### Bản ghi duyệt

| Mục | Giá trị |
|---|---|
| Ngày | 26/10/2026, Asia/Bangkok |
| Lời Owner (nguyên văn, qua chat với Agent) | "Tôi duyệt 2a: gói 256c8ff7…cb9a8, seed 4f600aa1…8517, đích etfajmrwyywokgafzxsb." |
| Hash được duyệt (đầy đủ) | `migrationSetSha256` `256c8ff7545238bac634e7eb4aaf56d18dfee27450a29ba660df3a8e154cb9a8`; seed `4f600aa1cd999112cb160c485f422007e3caf7a3172ac509e20bce8ecade8517` |
| Kiểm lại ngay lúc duyệt | Tính lại từ Git tại commit `bfb679c` (nhánh của PR #4): 31/31 tệp, hash bộ migration và seed **khớp** |
| Phạm vi | Chỉ chốt bộ SQL và đích. **Không** cho phép thay đổi danh sách đích (2b), **không** cho phép chạy SQL (2c) |
| Hết hiệu lực khi | Bất kỳ tệp migration hoặc seed nào thay đổi khiến hash khác bản trên, hoặc Owner rút lại |

### Bạn duyệt cái gì

| Mục | Giá trị chính xác |
|---|---|
| Đích | Project Supabase **`etfajmrwyywokgafzxsb`** (Nilaza Singapore), tổ chức Nilaza Free `drxbmvimiekeoeesgssp` |
| Bộ migration | **31 tệp** trong `supabase/migrations/`, theo thứ tự ở [mục 2 gói A](01_SQL_PACKET.vi.md) |
| `migrationSetSha256` | **`256c8ff7545238bac634e7eb4aaf56d18dfee27450a29ba660df3a8e154cb9a8`** |
| Seed (78 lá Tarot VI/EN) | `supabase/seed.generated.sql`, 346.246 byte, SHA-256 **`4f600aa1cd999112cb160c485f422007e3caf7a3172ac509e20bce8ecade8517`** |
| Mã nguồn | Commit `160f449` trên `main` |

**Duyệt 2a nghĩa là:** "Đây đúng là bộ SQL tôi muốn áp lên project Singapore." **Chưa** cho phép chạy. Việc chạy là quyết định 2c, xin duyệt riêng sau.

### Đã kiểm chứng gì để bạn yên tâm

| Kiểm tra | Kết quả | Ngày |
|---|---|---|
| Tính lại hash 31 tệp và seed từ Git, so với [packet-manifest.json](packet-manifest.json) | **Khớp 31/31**, khớp `migrationSetSha256`, khớp seed | 26/10 |
| Chạy thử đủ 31 migration + seed trên PostgreSQL 17 cục bộ (PGlite) | **PASS 31/31**, 10/10 kiểm tra (gồm xóa tài khoản, phân quyền, đối chứng âm) | 25/10 |
| Đọc lại project Singapore (chỉ đọc) | **Vẫn trống:** 0 bảng, 0 migration, 0 Edge Function, 0 bucket, 0 người dùng; Postgres 17.11; đủ 3 vai trò — [biên nhận](readback-2026-10-26.json) | 26/10 |
| Extension cần dùng (`vector`, `pgcrypto`, `pg_cron`, `pg_net`) | **Có sẵn** trên gói Free | 26/10 |
| Quyền để chạy lệnh grant trên `auth.users` (rủi ro R1) | Vai trò `postgres` **có quyền cấp lại** → lệnh dự kiến thành công | 26/10 |

### Chưa kiểm chứng (biết trước khi duyệt)

- Chưa chạy trên Supabase thật. Bản chạy thử cục bộ dùng một kết nối, không có máy chủ Auth, JWT, Storage hay Realtime thật.
- **R3:** 23/31 tệp không tự bọc trong transaction. Chưa kiểm CLI có tự bọc từng tệp không. Nếu không, một tệp lỗi giữa chừng có thể để lại trạng thái dở. Sẽ kiểm bằng `--dry-run` ở 2c.
- Vùng (ap-southeast-1) và trạng thái project chưa đọc lại hôm nay. Connector không có công cụ đọc metadata; lần cuối xác minh là 09/10.
- Bản chạy thử bằng Docker/PostgreSQL thật mới làm cho bộ 28 migration cũ (05/10), chưa làm lại cho bộ 31.

### Rủi ro và cách hoàn tác của riêng quyết định 2a

- **Trên cloud:** không có. Duyệt 2a không thay đổi gì.
- **Nếu sau này có tệp migration hay seed bị sửa:** hash sẽ khác, và **lời duyệt 2a tự hết hiệu lực**. Khi đó tôi phải dừng và xin duyệt lại với hash mới. Tôi sẽ tính lại hash ngay trước bước 2c.
- **Hoàn tác:** bạn có thể rút lại lời duyệt bất kỳ lúc nào trước khi chạy 2c. Không có gì cần dọn.

### Cách trả lời

- **Đồng ý:** "Tôi duyệt 2a: gói `256c8ff7…cb9a8`, seed `4f600aa1…8517`, đích `etfajmrwyywokgafzxsb`."
- **Chưa đồng ý:** nói rõ điều cần thêm. Không có gì thay đổi.

---

## Xem trước 2b và 2c (chưa xin duyệt)

**2b — PR đích và sổ cái.** Đối tượng: tệp trong repo. Thêm Singapore vào `release-profile.json` (`targets`), tạo sổ cái migration riêng cho Singapore. Sổ cái cũ của project QA và cấu hình app/Admin **không đổi**.
- Rủi ro: merge vào `main` sẽ **tự deploy Admin staging** trên Vercel. Admin vẫn trỏ project QA cũ nên chức năng không đổi, nhưng vẫn là một lần deploy.
- Hoàn tác: revert PR.

**2c — Thực thi.** Bạn tự chạy trên máy, tôi soạn sẵn từng lệnh:
1. Đọc lại mục 6 gói A ngay trước khi chạy. Gói Free có thể đã tự tạm dừng.
2. `npx supabase login`, rồi `link --project-ref etfajmrwyywokgafzxsb`. Bạn tự đăng nhập và nhập mật khẩu DB.
3. `db push --dry-run`: phải liệt kê đúng 31 tệp.
4. `db push`.
5. Nạp seed.
6. Chạy truy vấn kiểm sau khi áp (mục 8 gói A) và Security Advisor.

Cách nạp seed và phiên bản CLI sẽ chốt trong phiếu 2c. CLI chưa cài trên máy này, `npx supabase` chưa thử.
- Điều kiện dừng: theo mục 9 gói A.
- Hoàn tác: chỉ sửa tiến bằng migration mới. Trường hợp xấu nhất là dựng lại project, và việc đó chỉ làm khi bạn quyết định.

**Không nằm trong bậc 2:** deploy Edge Function (`account-delete` là bậc 3), Auth/SMTP, khóa OpenRouter, bật `pg_cron`, tạo tài khoản Admin đầu tiên, retarget app/EAS.
