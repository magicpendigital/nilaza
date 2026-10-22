# Review lệch migration staging — 25/09/2026

## Phạm vi và nguồn kiểm tra

- Project được xác nhận qua Supabase connector: `Nilaza Staging QA` (`akgrokwnkfqnfjqrildi`).
- Đọc migration history từ remote và nội dung `statements` của hai migration remote-only. Đây là truy vấn chỉ đọc; không có thao tác SQL thay đổi dữ liệu/schema.
- Đối chiếu catalog staging cho các bảng, cột, constraint, publication, policy, index và function bị tác động bởi các migration local-only.
- Không xuất dữ liệu ứng dụng. Không dùng `db push`, `db pull` hay `migration repair`.

## SQL remote-only đã phục hồi

- [`20260917172721_admin_content_sync.sql`](../supabase/migrations/20260917172721_admin_content_sync.sql) — nguồn lấy từ `supabase_migrations.schema_migrations.statements` tại version `20260917172721`; bản review giữ tại `artifacts/staging-qa-recovered-migrations/`.
- [`20260917174042_admin_content_sync_policy_tuning.sql`](../supabase/migrations/20260917174042_admin_content_sync_policy_tuning.sql) — nguồn lấy từ `statements` tại version `20260917174042`; bản review giữ tại `artifacts/staging-qa-recovered-migrations/`.

Hai bản SQL gốc đã được khôi phục về đúng timestamp trong `supabase/migrations`; các biến thể local trùng logic được lưu trong `artifacts/staging-qa-local-migration-archive-2026-09-25/`.

## Đối chiếu local-only với schema staging

### `20260918000000_admin_content_sync.sql` và `20260918010000_admin_content_sync_policy_tuning.sql`

- Remote đã ghi nhận hai migration cùng tính năng tại timestamp sớm hơn (`20260917172721`, `20260917174042`).
- Migration remote đầu tạo hai bảng, RLS, policies và functions; migration remote sau gộp policy UPDATE và bổ sung các index theo foreign key.
- Schema staging hiện có đủ hai bảng; RLS bật; policy UPDATE hiện là `content staff update bundles`; các index foreign key/lookup/partial unique đều tồn tại; hai function `get_published_content_bundle` và `publish_content_bundle` có định nghĩa tương ứng.
- Kết luận: trạng thái cuối của cặp remote tương đương cặp local. Nếu để nguyên timestamp local, `db push` có thể chạy lại DDL đã được áp dụng. Hướng xử lý an toàn là khôi phục hai nguồn tại timestamp remote và loại cặp local trùng khỏi đường migration chuẩn, bảo toàn SQL nguồn trong lịch sử Git.

### `20260907120000_generation_activity_contract.sql` — trạng thái trước forward migration

Các thay đổi sau **chưa có** trên staging:

- `generation_jobs` chưa có `client_request_id`, `chat_session_id`, `presentation`, `canceled_at`; hai index theo user/request và user/status/updated cũng chưa có.
- `generation_jobs` chưa thuộc publication `supabase_realtime`.
- Check constraints notification hiện chưa cho phép `ai_response_ready`; source type chưa cho phép `chat` và `council`.

SQL local chỉ thêm cột nullable/defaulted, index `IF NOT EXISTS`, publication có guard, và mở rộng các allowlist hiện có. Preflight xác nhận 0 row vi phạm các allowlist mới, `chat_sessions.id` là primary key, và RLS bật trên `generation_jobs`.

Để giữ history forward-only, migration được áp dụng dưới timestamp mới sau migration remote mới nhất `20260919202005`; không sửa history remote để giả là timestamp `20260907120000` đã chạy.

### Impact/QC cho forward migration staging

- **Entry point:** không thay đổi màn hình hoặc navigation; migration chỉ chuẩn bị contract generation/notification dùng chung.
- **Data write:** thêm bốn cột mới vào `generation_jobs`, hai index, một membership Realtime và thay các CHECK constraint bằng allowlist mở rộng. Không cập nhật/xóa row.
- **Backend contract:** `chat_sessions.id` đã tồn tại và là primary key; `generation_jobs` đã bật RLS. Năm truy vấn preflight cho notification values đều có 0 giá trị ngoài allowlist mới.
- **Privacy/safety:** migration không thêm cột birth profile, prompt, model output hoặc PII; Realtime chỉ đưa `generation_jobs` vào publication hiện có, policy RLS hiện bật trên bảng.
- **Rollback/fallback:** các cột/index mới không được client yêu cầu để render Astrology; nếu cần rollback tính năng thì tắt consumer trước. Không tự động xóa schema sau test, tránh mất metadata phát sinh.
- **Acceptance:** migration được ghi dưới version mới hơn `20260919202005`; remote history phải khớp file local; verify đủ cột/index, check constraints mở rộng và publication membership sau apply; chạy lại backend/mobile/admin checks.
- **Quyền staging:** owner đã duyệt staging-only sau review SQL. DDL sẽ được áp dụng qua một forward migration duy nhất, không dùng `db push` để chạy cả tập migration và không sửa migration history cũ bằng repair.

### Kết quả áp dụng và xác minh

- Đã tạo [`20260925155619_generation_activity_contract_forward.sql`](../supabase/migrations/20260925155619_generation_activity_contract_forward.sql) từ SQL local đã review và áp dụng staging-only qua Supabase connector `apply_migration`.
- Post-apply query xác nhận đủ bốn cột, hai index, membership `generation_jobs` trong `supabase_realtime` và toàn bộ CHECK constraints mở rộng. Không có row bị thay đổi/xóa.
- Supabase connector trả 24 migration; so sánh timestamp với local `supabase/migrations` cho kết quả 24/24, không local-only/remote-only.
- `supabase db push` và `migration repair` không được chạy.

## Tương thích của Astrology AI v1 và trạng thái còn thiếu

- `astrology_reports` có các cột mà Edge Function cần; policy cho user đã đăng nhập chỉ cho quản lý report thuộc `auth.uid()`.
- `usage_events` có các trường cần ghi event metadata; policy insert/read giới hạn theo user.
- `subscriptions` có `user_id`, `entitlement`, `status`, `current_period_end`; policy đọc theo user.
- Route staging `2026-09-25-ai-insight-v1` hiện active với schema `astrology_ai_insight_v1`, provider OpenRouter/model `nex-agi/nex-n2.5-mini:free`; route `2026-06-30-llm-routing-v1` cũ đã archived.
- Prompt `2026-09-25-ai-insight-v1` cho VI/EN đã active; các prompt `2026-06-07-local-v1` cũ vẫn giữ ở draft.
- Edge Function `ai-astrology-insight` đã deploy lên project Staging QA, version 1, trạng thái `ACTIVE`, bắt buộc JWT (`verify_jwt=true`). Function ID `3a734cd2-54a5-4d41-b020-1c4ff9ef7550`; checksum `547cd8f58c9d4d13d246f83128e070b93ab9d68f3a4e6b7db553d82b96af01a3`.
- Lịch sử trace cho thấy OpenRouter có các generation thành công đến 2026-09-20; các lần Astrology gần nhất qua Gemini/OpenAI có trạng thái lỗi. Readiness secret hiện thời chưa được xác nhận qua Admin.
- `subscriptions` hiện không có bản ghi nào, nên chưa có tài khoản đủ entitlement `premium_astrology_ai` để chạy E2E.
- Route/prompt được bootstrap staging-only qua Supabase SQL connector; `published_by` để trống vì chưa có phiên Admin Owner dùng để ghi actor. Khi Owner đăng nhập AI Studio, cần kiểm tra route và prompt hiện active; nếu audit actor là điều kiện phát hành của quy trình, publish version mới qua Admin trước bài review bên ngoài.

## Đường triển khai đề xuất

1. Đã khôi phục và chuẩn hóa source history; migration generation được áp dụng bằng forward-only version và ledger hiện khớp.
2. Xác nhận route/prompt v1 trong Admin, kiểm tra provider readiness, đặt `AI_TRACE_ENVIRONMENT=staging` và trace mode `redacted`, cấp entitlement QA có thời hạn cho tài khoản allowlist. Function mới đã deploy với JWT bắt buộc.
3. Chạy E2E VI/EN và các test quyền/trace/xóa report; không đưa người dùng ngoài nhóm Owner vào trước khi các gate này đạt.
