# Gói A — SQL / migration cho Supabase Singapore (soạn để duyệt, chưa chạy)

Ngày 25/10/2026, Asia/Bangkok. Đích dự kiến: project `etfajmrwyywokgafzxsb` (Nilaza Singapore), tổ chức Nilaza Free `drxbmvimiekeoeesgssp`, vùng `ap-southeast-1`, PostgreSQL 17. **Gói này không thực thi gì trên cloud.**

## 1. Hiện trạng đích — đọc lại ngày 26/10/2026 (bậc 1 đã xong)

| Mục | Giá trị | Nguồn / giới hạn |
|---|---|---|
| Trước đây | ACTIVE_HEALTHY, Postgres 17, 0 bảng public, 0 migration, 0 Edge Function | Đọc lại ngày 05/10, 09/10 và 16/10 trong các hồ sơ trước |
| 25/10 | Không đọc được | Công cụ Supabase của phiên đó không có quyền với project |
| **26/10 — đọc lại (chỉ đọc)** | **PostgreSQL 17.11**; **0 bảng public; 0 migration** (bảng lịch sử migration chưa tồn tại); **0 Edge Function; 0 bucket Storage; 0 người dùng Auth**; đủ 3 vai trò `anon`, `authenticated`, `service_role`; `app.enable_*` chưa đặt | Connector do Owner thêm, vai trò `supabase_read_only_user`. Lần thử đầu bị hết thời gian chờ vì project Free đã tạm dừng; Owner bấm khôi phục rồi đọc lại thành công. Biên nhận: [readback-2026-10-26.json](readback-2026-10-26.json) |
| So với trước | **Không đổi** — vẫn trống | Trạng thái/vùng project không đọc được qua connector (không có công cụ đọc metadata) |
| Cấu hình app | Chưa retarget; client và Admin staging vẫn trỏ project QA cũ `akgrokwnkfqnfjqrildi` | `release-profile.json`: `targets = []` |
| Sổ cái migration | Của project QA cũ vẫn `blocked_pending_reconciliation` | Singapore cần sổ cái và manifest riêng khi áp (bậc 2) |

Hash gói đã được tính lại từ Git tại commit `160f449` ngày 26/10: **31/31 tệp, `migrationSetSha256` và seed khớp [packet-manifest.json](packet-manifest.json)**. Phiếu duyệt bậc 2: [05_STEP2_APPROVAL_FORM.vi.md](05_STEP2_APPROVAL_FORM.vi.md).

**Gói Free tự tạm dừng khi lâu không dùng:** phải đọc lại (mục 6) **ngay trước khi áp**, không dựa vào kết quả ngày 26/10.

## 2. Nội dung gói: 31 migration theo thứ tự áp dụng

`migrationSetSha256` (SHA-256 của danh sách `tên:hash` theo thứ tự): **`256c8ff7545238bac634e7eb4aaf56d18dfee27450a29ba660df3a8e154cb9a8`**. Đây là giá trị bạn duyệt. Hash đầy đủ từng tệp nằm trong [packet-manifest.json](packet-manifest.json). **Cơ sở tính hash: nội dung UTF-8 đã chuẩn hóa xuống dòng CRLF → LF**, trùng với bản lưu trong Git ở mọi hệ điều hành (trên Windows, tệp trong thư mục làm việc có thể là CRLF nên hash của tệp thô sẽ khác; đừng đối chiếu bằng `sha256sum` trực tiếp trên bản checkout Windows).

| # | Tệp | Byte | SHA-256 (12 ký tự đầu) | Ghi chú / câu lệnh đáng chú ý |
|---|---|---:|---|---|
| 1 | `202606120001_mvp_schema.sql` | 18468 | `226e20601e09…` | create extension, security definer |
| 2 | `202606120002_add_missing_tables.sql` | 4546 | `80df182edc58…` | create extension |
| 3 | `20260622000000_upgrade_mvp.sql` | 2900 | `621167d132d8…` | drop table/column |
| 4 | `20260622000001_weekly_reflection_cron.sql` | 1217 | `90fc174f647a…` | create extension, cron schedule, pg_net — No-op trừ khi `app.enable_weekly_reflection_cron = on` (không đặt) — **không** tạo cron/HTTP |
| 5 | `20260626000000_ai_council_contract.sql` | 1796 | `152a27d7e725…` | — |
| 6 | `20260626000001_journal_mobile_contract.sql` | 759 | `c2e619b6f550…` | — |
| 7 | `20260626000002_ai_council_admin_config.sql` | 4461 | `8de07c0f770b…` | — |
| 8 | `20260627000000_astrology_backend_contract.sql` | 1929 | `11361a02d30d…` | — |
| 9 | `20260629020702_journal_entries_user_local_id_constraint.sql` | 578 | `9ea543a2e495…` | — |
| 10 | `20260630000000_model_route_versions.sql` | 1902 | `14889d571f64…` | — |
| 11 | `20260706000000_oracle_contract.sql` | 1422 | `f0ac73327037…` | — |
| 12 | `20260710000000_notifications_contract.sql` | 6929 | `51d4cf28e07a…` | — |
| 13 | `20260902131408_owner_capability_boundary.sql` | 14047 | `2f8fdac36b93…` | security definer |
| 14 | `20260903033047_reconcile_owner_prerequisites.sql` | 3909 | `bfc7f7cf54ef…` | create extension |
| 15 | `20260908000000_oracle_model_route.sql` | 528 | `ae78d2be77e8…` | — |
| 16 | `20260909014614_ai_trace_observability.sql` | 9245 | `8794f35ab972…` | create extension, cron schedule, security definer — Cron dọn trace chỉ khi `app.enable_ai_trace_prune_cron = on` (không đặt) |
| 17 | `20260909020528_marketing_waitlist_and_admin_documentation.sql` | 1765 | `93235a9b2de2…` | — |
| 18 | `20260909043000_admin_document_access_log_index.sql` | 213 | `2e7b9de0182e…` | — |
| 19 | `20260913143958_marketing_consent_suppression_foundation.sql` | 9616 | `49f76f62e1a0…` | — |
| 20 | `20260913184421_growth_waitlist_aggregate_read_model.sql` | 9374 | `bf5c3611a447…` | security definer |
| 21 | `20260917172721_admin_content_sync.sql` | 8816 | `18b50345904d…` | — |
| 22 | `20260917174042_admin_content_sync_policy_tuning.sql` | 1815 | `ac6ae8b06f49…` | — |
| 23 | `20260919202005_ai_council_rounds_v2.sql` | 1616 | `ad48c774864d…` | — |
| 24 | `20260925155619_generation_activity_contract_forward.sql` | 3294 | `d6de28003854…` | realtime publication |
| 25 | `20260926152118_ai_studio_operations.sql` | 20594 | `7d17c007edf9…` | cron schedule, security definer — Chỉ lập lịch dọn payload QA nếu `pg_cron` đã được bật; nếu chưa có chỉ in NOTICE |
| 26 | `20261001000000_private_source_read_boundary.sql` | 1640 | `cf54859e0fb9…` | truncate — “truncate” ở đây là **thu hồi** quyền TRUNCATE của client, không xóa dữ liệu |
| 27 | `20261002000000_ai_usage_reservation.sql` | 18333 | `4d4fc2e57d32…` | grant on auth schema — Có `grant select on auth.users to service_role` — xem mục rủi ro; campaign AI được seed ở trạng thái `disabled` |
| 28 | `20261004183447_client_table_privilege_boundary.sql` | 2991 | `2e5af56a94de…` | truncate — “truncate” ở đây là **thu hồi** quyền TRUNCATE của client, không xóa dữ liệu |
| 29 | `20261014074711_model_route_publish_contract_v2.sql` | 8016 | `de7bd65de8e7…` | security definer |
| 30 | `20261014080754_ai_feedback_receipts_v1.sql` | 17693 | `c8212aa7452d…` | security definer |
| 31 | `20261025000000_account_deletion_v1.sql` | 7434 | `beeee40256b9…` | **Mới** — xóa tài khoản: bảng riêng + 3 hàm chỉ `service_role` chạy được |

Seed: `supabase/seed.generated.sql` — 346246 byte, SHA-256 `4f600aa1cd999112cb160c485f422007e3caf7a3172ac509e20bce8ecade8517` (78 lá Tarot song ngữ VI/EN).

So với hồ sơ chuẩn bị tháng 10 (25 migration gốc + 3 bản chuyển tiếp): hai migration `20261014074711_model_route_publish_contract_v2` và `20261014080754_ai_feedback_receipts_v1` được thêm sau, và `20261025000000_account_deletion_v1` là mới hôm nay.

## 3. Phần mở rộng, cron và tác dụng phụ

- **Phần mở rộng cần thiết:** `pgcrypto`, `vector` (schema `public`). Đọc ngày 26/10: cả `vector` 0.8.2, `pgcrypto` 1.3, `pg_cron` 1.6.4, `pg_net` 0.20.4 **đều có sẵn** trên gói Free. `pgcrypto` **đã bật sẵn ở schema `extensions`**; migration 1 dùng `create extension if not exists pgcrypto` nên sẽ bỏ qua, và không migration nào gọi hàm riêng của pgcrypto (`digest`, `crypt`, `gen_random_bytes`…), nên không ảnh hưởng. `vector` chưa bật, sẽ được migration 2 tạo trong `public`.
- **Không có tác dụng phụ ra ngoài theo mặc định:** migration 4 (cron HTTP hằng tuần) và migration 16 (cron dọn trace) chỉ chạy khi có cài đặt `app.enable_*` bằng `on` — không đặt thì bỏ qua. Migration 25 chỉ lập lịch nếu `pg_cron` đã bật. `pg_net` chỉ được tạo trong nhánh `weekly reflection` bị tắt.
- **Hệ quả cần quyết định sau:** nếu không bật `pg_cron` thì không có lịch tự dọn payload QA hết hạn (chúng vẫn không đọc được sau khi hết hạn). Nên bật `pg_cron` **sau khi** áp migration để migration 25 hoặc một lệnh riêng lập lịch dọn.
- **Chiến dịch AI seed ở `disabled`** (migration 27): chưa có hạn mức nào có hiệu lực.

## 4. Bằng chứng đã có (cục bộ, dữ liệu giả)

- Engine: PostgreSQL 17.5 on aarch64-unknown-linux-gnu, compiled by emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 3.1.74 (1092ec30a3fb1d46b1782ff1b4db5094d3d06ae5), 32-bit (PGlite WASM, `postgresMajor` = 17). Fixture: bảng `auth.users(id)`, hàm `auth.uid/jwt/role`, ba vai trò `anon`, `authenticated`, `service_role`, quyền mặc định như đã quan sát.
- **31/31 migration PASS** theo đúng thứ tự, kèm seed 78 lá. **10/10 kiểm tra PASS** (xóa tài khoản, quyền vai trò, đối chứng âm).
- Biên nhận: [replay-receipt.json](replay-receipt.json). Chạy lại: `node scripts/singapore-packet-replay.mjs --pglite <thư mục có node_modules/@electric-sql/pglite> --receipt out.json --manifest out2.json` (PGlite không là phụ thuộc của repo).
- Replay native ngày 05/10 (28 migration trên PostgreSQL 17.6 trong Docker) đã PASS gồm phân quyền A/B và khôi phục `pg_dump`; **chưa lặp lại cho bản 31 migration** vì Docker không chạy trong phiên này.

**Giới hạn:** PGlite chỉ một kết nối (không kiểm tranh chấp), fixture `auth.users` chỉ có `id`, không có Auth server/JWT thật/Storage/Realtime/phần mở rộng của gói Free, và không phải Supabase được quản lý.

## 5. Rủi ro riêng cần biết trước khi áp

| # | Rủi ro | Cách xử lý |
|---|---|---|
| R1 | `grant select on auth.users to service_role` (migration 27) có thể bị từ chối nếu vai trò chạy migration không đủ quyền trên schema `auth` của dịch vụ được quản lý | **Đọc ngày 26/10: rủi ro thấp.** `postgres` (vai trò mà CLI dùng để áp) có quyền SELECT **kèm quyền cấp lại** trên `auth.users` (chủ sở hữu là `supabase_auth_admin`), nên lệnh grant dự kiến thành công. Hiện `service_role` **chưa** có SELECT trên bảng này, nên migration 27 là cần thiết. Vẫn chạy `--dry-run` trước; nếu lỗi, sửa bằng migration chuyển tiếp — không sửa tệp đã duyệt |
| R2 | `create extension vector` / `pgcrypto` trên gói Free | **Đã loại ngày 26/10:** cả hai có sẵn (xem mục 3) |
| R3 | **23/31 migration không tự bọc `begin; … commit;`** (8 tệp có). Việc công cụ áp có bọc mỗi tệp trong một transaction hay không **chưa được kiểm chứng**; nếu không, lỗi giữa một tệp có thể để lại trạng thái dở | Dừng ngay ở lỗi đầu tiên; sửa tiến (forward), không chỉnh tay dữ liệu; thử `--dry-run` và đọc cách CLI ghi lịch sử trước khi áp thật |
| R4 | Migration 3 có `drop table/column` | Chỉ an toàn vì đích **trống**; điều kiện bắt buộc: 0 bảng public trước khi áp |
| R5 | Free: project bị tạm dừng sau thời gian không dùng | Theo dõi trạng thái; không phải rủi ro của migration |

## 6. Truy vấn đọc lại **trước khi áp** (chỉ đọc)

Chạy trong SQL Editor của project Singapore hoặc để tôi chạy khi có quyền:

```sql
select version(), current_setting('server_version_num');
select count(*) as public_tables from information_schema.tables where table_schema = 'public';   -- mong đợi 0
select to_regclass('supabase_migrations.schema_migrations');                                         -- null = chưa có migration nào (project trống)
-- nếu khác null: select count(*) from supabase_migrations.schema_migrations;                          -- mong đợi 0
select extname, extversion from pg_extension order by 1;                                             -- ghi lại
select name from pg_available_extensions where name in ('vector','pgcrypto','pg_cron','pg_net');
select current_setting('app.enable_weekly_reflection_cron', true), current_setting('app.enable_ai_trace_prune_cron', true); -- mong đợi null hoặc off
select rolname from pg_roles where rolname in ('anon','authenticated','service_role');              -- mong đợi cả ba
```

Cũng ghi lại (chụp ảnh/đọc dashboard, không ghi gì): Auth → Providers, SMTP, Redirect URLs; Edge Functions rỗng; Storage không có bucket.

## 7. Cách áp (đề xuất) — khi đã được duyệt

1. **Khuyến nghị: Supabase CLI** từ bản sao repo mới. `supabase link --project-ref etfajmrwyywokgafzxsb` → `supabase db push --dry-run` (xem đúng 31 tệp) → `supabase db push`. Mật khẩu DB do **bạn** nhập, không chuyển qua tôi. CLI chưa cài trên máy này (có thể chạy qua `npx supabase`, chưa thử). Cách này ghi lịch sử migration đúng tên/phiên bản.
2. Thay thế: tôi áp từng migration qua công cụ Supabase khi bạn duyệt từng lô. **Hiện không làm được:** connector đang dùng vai trò chỉ đọc `supabase_read_only_user` (đúng như mong muốn) và không có công cụ áp migration.
3. **Không dùng** dán SQL vào SQL Editor: không ghi lịch sử migration, dễ lệch hash.
4. Trước khi áp: một PR riêng (bạn duyệt) thêm Singapore vào `release-profile.json` và tạo sổ cái/manifest riêng; **không sửa** sổ cái cũ và không dùng `db push/repair` trên project QA cũ.

## 8. Truy vấn kiểm **sau khi áp**

```sql
select count(*) from supabase_migrations.schema_migrations;                                          -- 31
select count(*) from public.tarot_cards;                                                              -- 78 (sau seed)
select status from nilaza_private.ai_budget_campaigns;                                                -- disabled
select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;                             -- liệt kê bảng chưa bật RLS; từng bảng phải có giải thích
select has_table_privilege('authenticated','public.journal_entries','TRUNCATE');                      -- false
select has_function_privilege('authenticated','public.nilaza_account_delete_begin(uuid,text)','EXECUTE'); -- false
select has_schema_privilege('anon','nilaza_private','USAGE');                                         -- false
```

Sau đó chạy **Security Advisor** của Supabase và lưu kết quả; không bật cron/Edge Function trước khi xem.

## 9. Điều kiện dừng và hoàn tác

- **Dừng ngay** khi: một migration lỗi; hash không khớp bản duyệt; đích không trống; extension không tạo được; có thông báo Supabase về ràng buộc gói Free.
- **Không hoàn tác dữ liệu bằng tay.** Sửa bằng migration chuyển tiếp mới. Đích còn trống nên trường hợp xấu nhất là dựng lại project (mất ref; cần cập nhật mọi cấu hình) — chỉ làm khi bạn quyết định.
- Gói này không đụng project QA cũ, sổ cái cũ hay allowlist cho tới khi bạn duyệt PR ở mục 7.4.

## 9b. Bạn duyệt chính xác điều gì (bậc 2)

1. `migrationSetSha256` = **`256c8ff7545238bac634e7eb4aaf56d18dfee27450a29ba660df3a8e154cb9a8`** và seed `4f600aa1cd999112…`.
2. Đích: project `etfajmrwyywokgafzxsb`, ap-southeast-1, đã qua bước đọc lại (mục 6) với kết quả khớp — **số liệu đọc ngày 26/10 khớp; vùng/trạng thái project chưa đọc lại được qua connector (lần cuối 09/10)**.
3. Đường thực thi (CLI do bạn nhập mật khẩu) và thời điểm.
4. PR cập nhật danh sách đích/sổ cái riêng cho Singapore.

Bốn mục này được tách thành **ba lần duyệt riêng, mỗi lần một quyết định** trong [phiếu duyệt bậc 2](05_STEP2_APPROVAL_FORM.vi.md): 2a (nội dung gói + đích) → 2b (PR đích/sổ cái) → 2c (thực thi).

## 10. Không nằm trong gói này

Deploy Edge Functions, đặt secret (kể cả khóa OpenRouter), cấu hình Auth/SMTP, Storage, bật `pg_cron`, tạo tài khoản Owner/Admin đầu tiên và nạp nội dung Admin (prompt, route, deck) — mỗi mục có bước duyệt riêng (xem [README](README.vi.md), các gói B–D).
