# Phiếu duyệt bậc 2 — gói SQL cho Supabase Singapore

Soạn ngày 26/10/2026, Asia/Bangkok. Phiếu này **chỉ để bạn đọc và trả lời**. Soạn phiếu không chạy gì trên cloud: không áp migration, không ghi SQL, không đổi cài đặt, không đọc hay đặt khóa nào.

Bậc 2 gồm **ba quyết định riêng**, duyệt lần lượt. Mỗi lần bạn chỉ trả lời một quyết định:

| Lần | Quyết định | Trạng thái |
|---|---|---|
| **2a** | Chốt **nội dung gói** (31 migration + seed) và **đích** sẽ áp | **Owner đã duyệt ngày 26/10/2026** — xem bản ghi bên dưới |
| 2b | Một PR thêm Singapore vào danh sách đích (`release-profile.json`) và tạo sổ cái migration riêng | **Đã soạn trên máy ngày 27/10** — xem mục 2b bên dưới; chờ PR #4 merge rồi mới mở PR |
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

## Quyết định 2b — đăng ký đích Singapore (staging) và sổ cái riêng

Soạn ngày 27/10/2026, chỉ trên máy. **Chưa push, chưa mở PR, chưa chạy gì trên cloud.** PR này phải đẩy lên tên nhánh `codex/android-release-unblock-2026-10-19` để Vercel bỏ qua build, mà nhánh đó đang dùng cho PR #4. Vì vậy chỉ mở được PR 2b **sau khi bạn merge PR #4**.

### Bạn duyệt cái gì

Bạn duyệt bằng cách **merge PR 2b**. Đó là một quyết định duy nhất: cho bộ kiểm phát hành **nhận** project Singapore là đích staging hợp lệ.

| Tệp | Thay đổi |
|---|---|
| `docs/release/release-profile.json` | Danh sách đích từ **rỗng** thành **1 đích**: `nilaza-singapore-prelaunch-qa`, loại **staging**, tổ chức `drxbmvimiekeoeesgssp`, project `etfajmrwyywokgafzxsb`. **Không** thêm đích production. Cập nhật dòng ghi chặn để ghi 2a đã duyệt. |
| `supabase/migration-ledgers/nilaza-singapore-prelaunch-qa.json` (mới) | Sổ cái riêng của Singapore: lịch sử migration **rỗng** theo lần đọc 26/10, không có chênh lệch. |
| `docs/release/singapore-backend-readiness-2026-10-25/database-target.singapore-staging.draft.json` (mới) | Bản **nháp** hồ sơ đích, gắn đích, hash danh sách đích, hash sổ cái và đúng 31 migration đã duyệt ở 2a. |
| `skills/nilaza-plan-qc/references/release-control.md` + `skills/manifest.json` | Bỏ câu "danh sách đích cố ý để rỗng"; cập nhật hash đã duyệt của tệp kỹ năng. |

**Không đổi:**
- Sổ cái cũ `supabase/migration-ledger.json` của project QA cũ: vẫn `blocked_pending_reconciliation`, không đổi nhãn.
- Các tệp SQL, seed và hash đã duyệt ở 2a.
- Cấu hình app, Admin và EAS: vẫn trỏ project QA cũ.
- Mọi thứ trên Supabase.

### Đã kiểm chứng trên máy (27/10)

| Kiểm tra | Kết quả |
|---|---|
| Bộ kiểm đích (`database-target-gate`) với bản nháp | **BLOCKED, 0 lỗi.** Đích đã được nhận. Chỉ còn thiếu: hồ sơ còn ở dạng nháp, thông tin project mới, bản chạy thử đạt chuẩn, phiếu duyệt thực thi. Cả bốn đều thuộc 2c |
| Test bộ kiểm đích, bộ kiểm phát hành, preflight | **97/97 đạt** |
| Kiểm sổ cái cũ | Vẫn chặn, như cũ |
| Kiểm governance, kiểm kỹ năng trong repo | Đạt |
| 31 migration trong bản nháp | Hash khớp từng tệp với bản duyệt 2a |

**Hai mã hash cho cùng một bộ 31 tệp.** Bộ kiểm đích tính hash của danh sách theo cách khác với bản kê gói, nên ra mã khác:
- bản kê gói (bạn đã duyệt ở 2a): `256c8ff7…cb9a8`
- bộ kiểm đích: `04c1fc1a672c6aeb8f1d99a609563004656359922801988e9c828b060aa955b5`

Cả hai cùng chỉ đúng 31 tệp với từng hash giống nhau; đây **không** phải bộ SQL khác.

### Rủi ro và hoàn tác

- **Rủi ro:** sau khi merge, các bộ kiểm phát hành coi Singapore staging là đích hợp lệ. Việc này **không** cho phép chạy SQL: bộ kiểm vẫn chặn cho tới khi có đủ bằng chứng của 2c và lời duyệt 2c.
- **Merge vào `main` sẽ tự deploy Admin staging** trên Vercel. Chức năng Admin không đổi vì nó vẫn trỏ project QA cũ.
- **Bản kỹ năng cài trên máy** đã được đồng bộ ngày 27/10 bằng `npm run skills:sync` (chỉ 1 tệp). Nếu không merge 2b, chạy lại `npm run skills:sync` từ `main` để trả về bản cũ. Máy khác: chạy lệnh này sau khi merge.
- **Hoàn tác:** revert PR. Danh sách đích về rỗng, sổ cái mới và bản nháp biến mất. Không có gì trên cloud phụ thuộc vào chúng.

---

## Xem trước 2c (chưa xin duyệt)

**Bộ kiểm đích cần thêm bằng chứng trước 2c** (phát hiện khi soạn 2b):
1. **Thông tin project, đọc trong vòng 24 giờ:** `ACTIVE_HEALTHY`, gói Free/Nano, vùng Singapore, Postgres 17, không add-on trả phí; tác dụng phụ (gửi thư, job, đăng ký) đang tắt; đã rà cài đặt tài nguyên, hạn mức và khả năng khôi phục. Connector hiện không đọc được trạng thái và vùng, nên bạn cần đọc trên dashboard hoặc cấp công cụ phù hợp.
2. **Bản chạy thử trong vòng 7 ngày,** gắn đúng mã của bộ kiểm (`04c1fc1a…`) và Postgres 17, có kiểm phân quyền/RLS **và kiểm khôi phục** (`restoreAcceptance`). Bản chạy thử PGlite ngày 25/10 chưa có kiểm khôi phục, cũng chưa ghi đúng các trường này. Lần kiểm khôi phục trước (05/10) chạy bằng Docker, mà máy này hiện không chạy Docker.
3. **Sổ cái đọc lại trong vòng 24 giờ.**
4. **Phiếu duyệt 2c dạng tệp,** hiệu lực tối đa 7 ngày, gắn đúng đích, SQL, sổ cái, thông tin project, bản chạy thử và danh sách đích.

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
