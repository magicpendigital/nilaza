# Nilaza Admin Webapp And Data Plan

Last updated: 2026-06-15

## Mục tiêu

Tài liệu này cố định cách tách dữ liệu giữa app mobile, web admin, backend proxy và Supabase để chuẩn bị test thật trên Android/iOS qua Expo/EAS.

Nguyên tắc chính:

- Mobile app chỉ dùng dữ liệu người dùng và gọi backend Nilaza; không gọi trực tiếp AI provider.
- Web admin quản nội dung, prompt, vận hành job, safety và publish/versioning.
- Supabase là nguồn dữ liệu thật cho closed beta.
- `packages/content/data` và `packages/agent-config` là seed/config nguồn trong repo, không phải nơi admin chỉnh dữ liệu production lâu dài.
- `apps/admin` hiện là prototype tĩnh để review nghiệp vụ; khi test backend thật nên chuyển thành Next.js admin app có Supabase Auth, RLS và audit logs.

## Đánh giá hiện tại

Đã có:

- `apps/mobile`: Expo React Native MVP local-first.
- `apps/mobile/src/backendClient.ts`: wrapper gọi backend cho persona chat, AI Council, tarot, daily insight, profile và journal, có local fallback.
- `apps/mobile/src/runtimeConfig.ts`: đọc `EXPO_PUBLIC_NILAZA_API_URL`.
- `supabase/migrations/202606120001_mvp_schema.sql`: schema MVP với RLS cho profile, birth profile, personas, tarot, prompts, chat, journal, jobs, usage, safety, push tokens và audit logs.
- `apps/admin`: prototype HTML/CSS/JS cho AI configuration studio, dùng localStorage.

Khoảng trống trước test thật:

- Chưa có Supabase project runtime được áp migration và seed data.
- Chưa có Edge Functions/API thật cho `/ai/persona-chat`, `/ai/ai-council`, `/ai/tarot-reading`, `/ai/daily-insight`, `/profile/upsert`, `/journal/entries`.
- Chưa có admin webapp thật với auth, roles, publish flow và audit.
- Chưa có seed/import script từ JSON repo vào Supabase.
- `packages/agent-config/prompt-library.json` đang có chuỗi tiếng Việt bị lỗi encoding; cần sửa trước khi import/publish prompt.

## Kiến trúc đề xuất cho giai đoạn test

```text
apps/mobile
  -> Nilaza API / Supabase Edge Functions
    -> Supabase Auth
    -> Supabase Postgres + RLS
    -> AI/Astrology/Push providers qua secrets backend

apps/admin
  -> Next.js admin webapp
    -> Supabase Auth SSR
    -> Supabase Postgres qua RLS
    -> Admin-only Edge Functions cho publish, retry, audit

packages/content/data + packages/agent-config
  -> seed/import scripts
    -> Supabase content tables
```

## Ranh giới dữ liệu theo ứng dụng

| Nhóm dữ liệu | Nguồn thật trong test | Mobile app xử lý | Web admin xử lý | Ghi chú |
| --- | --- | --- | --- | --- |
| Hồ sơ người dùng | `user_profiles`, `birth_profiles` | Tạo/sửa dữ liệu của chính user | Chỉ xem/sửa khi có vai trò admin phù hợp | Birth data là dữ liệu nhạy cảm, hạn chế hiển thị trong admin |
| Chat persona | `chat_sessions`, `chat_messages` | Tạo session, gửi tin, đọc lịch sử của chính user | Xem thống kê, moderation summary, không xem raw private content mặc định | Admin chỉ nên thấy ID/hash/summary trừ khi có quy trình review |
| AI Council | `chat_sessions`, `chat_session_personas`, `chat_messages` | Tạo phòng council, gửi một câu hỏi và nhận nhiều guide replies trong cùng `council_round_id` | Configure roster, prompt, context policy, schema, provider route; xem usage/safety summary | Dùng `session_kind = 'ai_council'`, không tự động dùng journal/birth/raw chat |
| Tarot reading | `tarot_readings` | Chọn topic/deck/cards, đọc kết quả, lưu journal | Xem thống kê, failed jobs, deck usage | Card selection do app/backend, AI chỉ diễn giải |
| Journal | `journal_entries` | Tạo/sửa/xóa ghi chú của chính user | Không xem raw journal mặc định | Đây là dữ liệu riêng tư cao |
| Push token | `device_push_tokens` | Đăng ký token sau khi user đồng ý | Xem trạng thái token, invalid/revoked count | Không dùng cho marketing khi chưa có consent |
| Nội dung personas | `personas`, `persona_sources` | Đọc only active personas | Tạo/sửa/publish/archive, quản IP/safety notes | Historical/book guides phải ghi "inspired by" |
| Tarot decks/cards | `tarot_decks`, `tarot_cards` | Đọc active decks/cards | Tạo/sửa/publish/archive, quản art/prompt/style | Nếu mỗi deck có artwork riêng, cần bảng asset/card art sau |
| Prompt versions | `prompt_versions` | Đọc active prompt id/result metadata gián tiếp | Draft, audit, publish, rollback | Không publish prompt thiếu VI/EN hoặc yếu guardrail |
| AI jobs | `generation_jobs` | Tạo job, poll/realtime status, nhận result | Xem queue, lỗi, retry, provider status | Long jobs dùng async, short chat/tarot có thể sync |
| Usage analytics | `usage_events` | Gửi event tối thiểu | Dashboard tổng hợp | Tránh log raw prompt/private content |
| Safety | `safety_events` | Report/blocked-topic event | Review, dismiss/escalate, audit | Cần summary an toàn thay vì raw content |
| Billing/credits | `subscriptions`, `credit_ledger` | Đọc entitlement/balance | Điều chỉnh support/admin-only | RevenueCat nên là source of truth cho subscription |
| Admin audit | `admin_audit_logs` | Không dùng | Ghi mọi thao tác publish/delete/retry/role change | Không cho phép sửa/xóa từ UI thường |

## Quy trình xử lý từng loại dữ liệu

### 1. Seed content

- Nguồn hiện tại: `packages/content/data/*.json`, `packages/agent-config/*.json`.
- Dùng để import vào Supabase staging.
- Trước import phải chạy `npm run validate:data`.
- Bắt buộc giữ `vi` và `en` với tiếng Việt UTF-8 có dấu chuẩn.
- Web admin không nên sửa trực tiếp file JSON; admin tạo draft trong Supabase, sau đó export về repo nếu cần version control.

### 2. User data

- Mobile tạo dữ liệu qua backend hoặc Supabase client có RLS.
- User chỉ đọc/ghi dữ liệu của chính mình.
- Admin không xem raw private chat/journal mặc định.
- Nếu cần điều tra safety, admin chỉ mở được bản đã sanitize hoặc summary.

### 3. AI-generated data

- Backend lưu `prompt_version_id`, provider, model, moderation status và result id.
- Không lưu provider API key, raw secret, hoặc full debug payload trong mobile.
- Với job dài, lưu `generation_jobs` trước, trả `jobId`, sau đó cập nhật result.
- Với lỗi provider, lưu `error_code` và `error_message` đã lọc thông tin nhạy cảm.

### 4. Admin-edited content

- Mọi chỉnh sửa bắt đầu ở trạng thái `draft`.
- Publish tạo hoặc kích hoạt version mới, không ghi đè version cũ.
- Archive/hide dùng `status`, không xóa cứng khi dữ liệu từng được user dùng.
- Delete cứng chỉ cho draft chưa publish hoặc asset lỗi, và phải ghi `admin_audit_logs`.

### 5. Prompt data

- Prompt phải versioned theo `feature`, `owner_type`, `owner_id`, `locale`.
- Bản active cần có rollback.
- Publish cần checklist: VI/EN, safety notes, reviewer, output schema, test run.
- Prompt không được nới lỏng các guardrail: deterministic fate claims, professional advice, crisis/safety boundaries, inspired-by transparency.

### 6. Admin roles

- Dùng `admin_role_assignments`.
- Vai trò đề xuất:
  - `owner`: quản roles, publish, delete, retry provider jobs.
  - `admin`: quản content/prompt/job.
  - `editor`: tạo draft content/prompt, không publish production.
  - `safety_reviewer`: review safety events và prompt guardrails.
- Không dùng `user_metadata` để quyết định quyền admin; quyền nằm ở DB/app metadata và được kiểm tra server-side.

## Web admin nên build như thế nào

Giai đoạn test nên chuyển `apps/admin` từ static prototype sang Next.js app:

- `apps/admin/package.json`
- `apps/admin/src/app`
- `apps/admin/src/lib/supabase/client.ts`
- `apps/admin/src/lib/supabase/server.ts`
- `apps/admin/src/features/content`
- `apps/admin/src/features/prompts`
- `apps/admin/src/features/jobs`
- `apps/admin/src/features/safety`
- `apps/admin/src/features/audit`

Trang cần có cho closed beta:

- Login + access denied cho non-admin.
- Dashboard: usage, jobs, provider health, safety count.
- Content library: personas, sources, decks, cards.
- Prompt management: prompt versions, draft/publish/rollback.
- Jobs: queue, failed jobs, retry, sanitized input summary.
- Safety: reports, blocked topics, moderation failures.
- Audit log: immutable admin actions.

## Mobile app cần chuẩn bị gì

- Cấu hình `EXPO_PUBLIC_NILAZA_API_URL` cho staging backend.
- Giữ local fallback trong beta để demo không chết khi backend lỗi, nhưng UI phải hiển thị trạng thái `local_fallback` khi cần.
- Khi đăng nhập thật được bật, dùng Supabase Auth session hoặc backend-issued token cho mọi request.
- Không đưa OpenAI/AI provider keys vào Expo env.
- Với Android/iOS test qua EAS, dùng cùng API staging để dữ liệu tester gom về một nơi.

## Thứ tự triển khai khuyến nghị

1. Liên kết EAS project cho `apps/mobile`.
2. Tạo Supabase staging project, apply migration MVP.
3. Sửa encoding tiếng Việt trong `prompt-library.json`.
4. Viết seed/import script cho personas, tarot, prompt versions.
5. Tạo Edge Functions tối thiểu: `profile-upsert`, `journal-entries`, `ai-persona-chat`, `ai-council`, `ai-tarot-reading`, `ai-daily-insight`.
6. Cấu hình mobile `EXPO_PUBLIC_NILAZA_API_URL` và chạy test Android/iOS.
7. Chuyển `apps/admin` sang Next.js admin app, bắt đầu bằng auth + read-only dashboard.
8. Thêm draft/publish/audit cho content và prompt.
9. Thêm job retry/safety review khi backend AI thật được bật.

## Validation trước test

Chạy từ repo root:

```powershell
npm run validate:data
npm --workspace apps/mobile run check
```

Khi có backend staging:

```powershell
npm --workspace apps/mobile run dev
```

Với web admin thật:

```powershell
npm --workspace apps/admin run check
npm --workspace apps/admin run dev
```
