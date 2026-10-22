# Review SQL: AI Studio operations và Astrology trace QA

Ngày rà soát: 26/09/2026  
Migration: `supabase/migrations/20260926140000_ai_studio_operations.sql`  
Mục tiêu dự kiến: project Supabase Staging QA `akgrokwnkfqnfjqrildi` בלבד.

## Trạng thái

Database owner đã duyệt staging-only ngày 26/09/2026. Migration được apply thành công lên Nilaza Staging QA `akgrokwnkfqnfjqrildi` với version Supabase ghi nhận `20260926152118_ai_studio_operations`; file local đã đổi timestamp cho khớp. Các RPC publish route/prompt, bảng QA capture, RLS và quyền đọc đã được xác minh sau apply.

Bốn Edge Functions đã deploy với `verify_jwt=true`: `admin-astrology-prompt-config` v1, `admin-ai-trace-qa-payload` v1, `admin-model-router-config` v24 và `ai-astrology-insight` v7. Vẫn còn một migration remote-only `20260925160325_initial_mcy_schema` phát sinh sau baseline; SQL của nó là schema yoga/editorial riêng, không chạm model route, prompt, AI trace hoặc admin audit. Vì source chưa có trong repo, ledger đang giữ trạng thái `blocked_pending_reconciliation`; không chạy `supabase db push` hoặc migration repair.

`pg_cron` chưa được cài trên Staging. Do đó raw QA capture phải giữ tắt cho tới khi cấu hình và xác minh được lịch purge; migration và deploy function không tự bật capture.

## Thay đổi trong SQL

1. Cho phép `oracle_router` trong feature constraint của `model_route_versions`.
2. Thêm `publish_model_route_config(jsonb)`: kiểm tra capability `ai.manage`, validate provider/model/settings bằng constraint hiện có, archive route active cũ và insert route/audit log trong cùng transaction. Route cũ được archive trước insert để tương thích cả database có unique index active. Nếu insert hoặc audit lỗi, toàn bộ giao dịch rollback.
3. Thêm RPC đọc prompt Astrology VI/EN active và lịch sử; thêm RPC publish cặp prompt bất biến với optimistic version check. Hai locale được cập nhật cùng transaction; log chỉ lưu version, locale và số ký tự, không lưu prompt text.
4. Tạo bảng `ai_trace_qa_captures` riêng, thu hồi truy cập bảng trực tiếp. Chỉ Owner có `roles.manage` có thể lưu/xem payload; trace phải thuộc chính tài khoản Owner đó và môi trường staging. Payload được mã hóa ở Edge Function bằng AES-256-GCM, nonce ngẫu nhiên, AAD gắn trace ID + Owner ID, kiểm tra SHA-256 sau giải mã. Không lưu provider key.
5. Cửa sổ xem QA kết thúc chính xác ở `expires_at` (tối đa 24 giờ). Migration thay job retention cùng tên thành lịch chạy mỗi giờ nếu `pg_cron` đã cài. Nếu không có `pg_cron`, payload hết hạn vẫn không thể đọc nhưng ciphertext có thể còn trong bảng; **không bật capture** cho tới khi có purge schedule được xác minh.
6. Thêm tìm trace đã redact theo feature, trạng thái, trace ID, request ID hoặc model; thêm RPC đọc allowlist audit event về publish route/prompt và Owner QA capture. Không tìm theo prompt hoặc câu hỏi.
7. Mở rộng `prune_ai_traces()` để xóa capture hết hạn và trace quá hạn.

## Thay đổi Edge Function đi kèm

- `admin-model-router-config`: publish route qua RPC atomic; giữ đúng giá trị `temperature=0` và `maxTokens` thay vì tự đổi về mặc định.
- `admin-astrology-prompt-config`: đọc/publish prompt VI + EN qua hai RPC được bảo vệ.
- `admin-ai-trace-qa-payload`: chỉ POST, cùng staging, Owner capability, no-store; giải mã ở server và chỉ trả sau khi hash/AES-GCM hợp lệ.
- `ai-astrology-insight`: giữ trace root mở qua parse, schema/fact validation, report save và HTTP response; trạng thái lỗi theo đúng stage. Raw wire capture chỉ chạy khi người dùng bật consent QA riêng, Owner tự gọi endpoint trên staging, và các Edge secret đều bật.

## Điều kiện bật capture QA

Chỉ sau khi migration chạy thành công, xác minh purge job theo lịch, và Owner duyệt build QA có checkbox riêng:

```text
AI_TRACE_ENVIRONMENT=staging
AI_TRACE_QA_CAPTURE_ENABLED=true
AI_TRACE_QA_ENCRYPTION_KEY=<base64 của đúng 32 byte ngẫu nhiên>
EXPO_PUBLIC_AI_TRACE_QA_CAPTURE=true   # chỉ build QA; mặc định false
```

Key chỉ ở Edge Function Secrets; đặt cùng key cho `ai-astrology-insight` và `admin-ai-trace-qa-payload`. Không đưa key vào app, Admin bundle, Git, prompt hoặc log. Nếu `pg_cron` không cài hoặc purge job chưa được xác nhận, giữ `AI_TRACE_QA_CAPTURE_ENABLED=false` và không bật checkbox trong build.

Consent QA là tùy chọn riêng so với consent gửi chart facts cho AI. Nó lưu nguyên văn request cuối cùng Nilaza gửi OpenRouter (gồm system prompt đã lắp, chart facts/question đã chọn, tham số route) cùng provider response. Điều này không cho biết các biến đổi nội bộ của OpenRouter/model. Không dùng luồng này cho người dùng staging thông thường hoặc production.

## Rà soát bảo mật và tác động

- Bảng raw riêng, RLS bật, không cấp quyền đọc trực tiếp cho `anon`/`authenticated`; wrapper chỉ gọi hàm `SECURITY DEFINER` có capability check.
- Không thay đổi bảng dữ liệu sản phẩm của người dùng; không thay chính sách route runtime hay schema response.
- Prompt đang active chỉ bị thay khi Owner chủ động publish cặp ngôn ngữ qua AI Studio. Route active chỉ đổi khi Owner publish cấu hình qua Edge Function.
- Trace mặc định vẫn redact. Admin UI không render dữ liệu raw cho admin/reviewer; Owner cần bấm Reveal và có thể bấm Hide, đổi feature/tab/workspace hoặc rời app để xóa khỏi DOM/bộ nhớ giao diện.
- Tìm kiếm trace chỉ dùng định danh/model/status; log cấu hình và reveal không ghi system prompt, câu hỏi hay provider response.
- API route, prompt, audit RPC dùng `ai.read`/`ai.manage`; mở payload dùng riêng `roles.manage`. Endpoint Admin chỉ nhận project host từ cấu hình và allowlist.
- Nếu `pg_cron` không tồn tại, migration không làm thất bại chỉ vì extension thiếu; Owner phải giữ capture tắt hoặc cấu hình purge schedule trước khi bật.

## Rollback và giới hạn

- Tắt ngay capture bằng `AI_TRACE_QA_CAPTURE_ENABLED=false`; giữ key trong Edge secret store hoặc gỡ key sau khi capture hết hạn.
- Route/prompt đã publish được khôi phục bằng cách publish một version mới mang cấu hình đã xác minh từ history. Không sửa trực tiếp hoặc xóa version cũ.
- Với lỗi Edge Function, deploy lại revision trước của function; không chạy migration repair và không xóa bảng.
- Provider health check trong Admin chỉ đọc trạng thái secret/route; không chứng minh model call thành công. Cần test staging có consent và trace mới để xác nhận thật.
- Capture Astrology hiện chỉ cho tài khoản Owner tự test. Các feature khác vẫn chỉ có trace redacted; raw capture chưa được bật cho chat/tarot/council.

## QC và đường test quản lý

1. **Đã hoàn tất:** database owner duyệt và apply forward migration lên Staging; xác minh các RPC, bảng, RLS, grants và ghi nhận việc thiếu `pg_cron`.
2. **Đã hoàn tất:** deploy hai Edge Functions mới (`admin-astrology-prompt-config`, `admin-ai-trace-qa-payload`) và hai function cập nhật (`admin-model-router-config`, `ai-astrology-insight`), tất cả bật JWT verification.
3. Xác nhận prompt VI/EN và route/schema active hiển thị đúng trên AI Studio.
4. Chạy luồng app bằng chart synthetic của Owner, không dùng dữ liệu sinh thật; test lần thường không chọn QA capture và xác nhận không có raw capture.
5. Chạy lại một lần có hai consent riêng; kiểm tra trace đi tới parse/validate/save/response và request ID; Owner reveal đúng payload, reviewer bị chặn, đổi tab thì payload bị ẩn.
6. Xác nhận payload không đọc được sau 24 giờ và purge job xóa ciphertext ở lần chạy hourly kế tiếp.
7. Chạy tests, contract checks, `npm run admin:check`, `npm run admin:test`, `npm run validate:data`, `npm run validate:backend`, `npm run supabase:check`, `npm run supabase:migration-ledger:check`, Astrology contract checks và mobile checks.

## Whole-App Impact Brief

- **Entry points:** Admin → AI Studio → Astrology → Prompt Composer, Model Router, Trace Explorer, Versions, Audit; app → Astrology → câu hỏi AI → consent AI; QA consent xuất hiện riêng trong build được bật cờ.
- **Data write:** active route/version, prompt version pairs, audit logs, redacted traces, và bảng ciphertext QA hết hạn. Local prompt draft nằm trong browser; không tự đổi runtime.
- **Backend contract:** model-router config RPC atomic; prompt config Edge Function; `ai-astrology-insight`; QA reveal Edge Function; provider boundary vẫn OpenRouter.
- **Canonical contracts:** `packages/agent-config/astrology-ai-insight/contract.json` và schema nguồn; generated runtime contract; active model route/prompt trong Supabase sau publish.
- **Admin visibility:** trace index/span redacted mặc định; config/audit thật; raw payload chỉ Owner self-test, encrypted + audited.
- **Privacy/safety:** explicit AI consent + separate QA opt-in; no raw birth data, Journal/chat history, API key; retention expiry and purge requirement.
- **Analytics/observability:** trace status theo pipeline đến report save/response; no client-rendered success measurement yet; other AI features remain redacted-only.
- **Rollback:** disable capture by secret; publish known good config as new version; deploy prior function revision if needed; no destructive migration rollback.
- **Intentionally untouched:** Tarot/Persona/Council request contracts, mobile navigation, subscription/credits policy, product route defaults, production config and Supabase data.
- **Manager test path:** exact steps in section “QC và đường test quản lý”; staging E2E remains blocked until migration/function deployment is approved.
