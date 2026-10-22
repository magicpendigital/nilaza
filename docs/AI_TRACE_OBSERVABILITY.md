# Nilaza AI Trace Observability

Last updated: 2026-09-27

> **Current implementation status (27/09/2026):** redacted Supabase traces are the default. Migration `20260926152118_ai_studio_operations` is applied to Staging and its four Edge Functions are active. Astrology Owner QA payload capture remains disabled because Staging has no verified `pg_cron` purge job. Do not enable `AI_TRACE_QA_CAPTURE_ENABLED` or the app checkbox until the expiry purge is installed and verified. See [the SQL review and QA runbook](SUPABASE_MIGRATION_REVIEW_2026-09-26_AI_STUDIO.vi.md).

## Mục tiêu

Nilaza cần biết một feature đã gửi context nào đến model, route/provider nào được chọn, model trả về gì, có fallback hay safety block hay không, và chi phí/latency/token usage ra sao. Trace này phục vụ tối ưu system prompt và workflow; nó không mở quyền xem raw chat hoặc journal cho admin.

## Đã triển khai

- Shared trace contract tại `supabase/functions/_shared/ai-trace.ts`.
- Instrumentation tại shared model router và bốn provider adapters: OpenAI, Anthropic, Gemini, OpenRouter.
- Primary/fallback provider được ghi thành các generation spans riêng, kèm route version, model, temperature, max output tokens, schema, latency, token usage, request id, error code và safety status.
- Supabase migration `20260909014614_ai_trace_observability.sql` tạo trace index/spans/payload refs/scores, RLS và RPC read-only.
- AI Studio có Trace Explorer với lọc status/feature và tìm trace/request ID/model; dữ liệu vẫn redacted.
- Astrology trace root được giữ mở qua parse, validation, report persistence và response. `completed` nghĩa pipeline server hoàn tất, không phải xác nhận client đã render.
- Migration `20260926152118_ai_studio_operations` đã bổ sung Prompt Composer backend cho Astrology, publish model route atomic, Audit log, Owner QA capture mã hóa và tìm trace. Các cấu phần đã deploy trên Staging; raw capture vẫn bị khóa cho tới khi retention purge được xác minh. Route/prompt đang active và có redacted model spans, nhưng cần test app riêng để xác nhận response được render.
- Sáu AI flows truyền user correlation và feature metadata: persona chat, AI Council, tarot, daily insight, astrology, Oracle.

## Chính sách dữ liệu

Mặc định production:

| Setting | Giá trị | Ý nghĩa |
| --- | --- | --- |
| `AI_TRACE_ENABLED` | `true` | bật trace metadata |
| `AI_TRACE_SINK` | `supabase` | lưu index an toàn trong Supabase |
| `AI_TRACE_PAYLOAD_MODE` | `redacted` | giữ cấu trúc, enum, id, length; che text/private content |
| `AI_TRACE_SAMPLE_RATE` | `1` | trace 100% request trong MVP |
| `AI_TRACE_RETENTION_DAYS` | `30` | thời hạn mặc định cho trace index |

Migration hiện có tạo `nilaza_private.prune_ai_traces()`. Lịch retention trace cũ chỉ được tạo khi database setting `app.enable_ai_trace_prune_cron = 'on'`. Migration `20260926152118_ai_studio_operations` cấu hình job hourly để xóa QA ciphertext hết hạn nếu `pg_cron` có sẵn; Staging hiện chưa cài extension này và chưa có purge job được xác minh, vì vậy không bật QA capture.

`full_debug` chỉ được chấp nhận khi đồng thời có `AI_TRACE_ALLOW_FULL_DEBUG=true` và environment khác `production`. Không dùng chế độ này để xem prompt Astrology; raw payload không được ghi vào trace tables public. Astrology QA capture là cơ chế tách biệt: consent riêng, staging, Owner, ciphertext riêng, audit và 24 giờ.

Các secret sau chỉ đặt trong Supabase Edge Function Secrets, không đặt ở mobile/admin client:

```text
LANGFUSE_PUBLIC_KEY
LANGFUSE_SECRET_KEY
LANGFUSE_BASE_URL=https://cloud.langfuse.com
LANGFUSE_OTLP_ENDPOINT=https://cloud.langfuse.com/api/public/otel/v1/traces
LANGFUSE_UI_BASE_URL=https://cloud.langfuse.com
NILAZA_RELEASE=2026.09.09
```

## Cách bật theo môi trường

### Production: privacy-first index

```text
AI_TRACE_ENABLED=true
AI_TRACE_SINK=supabase
AI_TRACE_ENVIRONMENT=production
AI_TRACE_PAYLOAD_MODE=redacted
AI_TRACE_SAMPLE_RATE=1
AI_TRACE_RETENTION_DAYS=30
```

### Staging: operational trace với dữ liệu đã che

```text
AI_TRACE_ENABLED=true
AI_TRACE_SINK=supabase
AI_TRACE_ENVIRONMENT=staging
AI_TRACE_PAYLOAD_MODE=redacted
AI_TRACE_ALLOW_FULL_DEBUG=false
AI_TRACE_SAMPLE_RATE=1
```

Chỉ sử dụng tài khoản và dữ liệu test được phép trong staging. Không bật `full_debug` cho Astrology AI; luồng này luôn ép payload thành `redacted` ở từng request. Nếu một thử nghiệm riêng cần raw prompt/response cho feature khác, phải giới hạn ở dữ liệu synthetic và thời gian ngắn, rồi khôi phục cấu hình redacted.

Astrology AI luôn ép `AI_TRACE_PAYLOAD_MODE=redacted` và `AI_TRACE_ALLOW_FULL_DEBUG=false` theo từng request, kể cả trong staging. Chart facts và câu hỏi không đi vào bảng trace thông thường. Chỉ khi build QA bật cờ, người dùng bật consent thứ hai, backend bật capture trên staging, và purge job được xác minh thì wire request/response mới được mã hóa vào bảng private; Owner có thể xem qua endpoint được audit. Không khẳng định trạng thái staging hiện tại của secrets cho tới khi kiểm tra thực tế; giá trị secret không được đọc hoặc hiển thị.

## Rollout checklist

1. Migration `20260926152118_ai_studio_operations` đã được Owner review và áp dụng Staging; không apply lại. Migration ledger vẫn chặn `db push`/repair chung vì còn một migration remote-only không liên quan.
2. Bốn Edge Functions liên quan đang active trên Staging. Trước một lần deploy mới, đối chiếu source/version và test local. Giữ raw capture tắt cho tới khi `pg_cron` purge job được cài và xác minh; secret capture chỉ đặt trong Edge Function environment.
3. Chạy một request authenticated bằng chart QA synthetic của Owner; lượt thường không bật QA capture. Kiểm tra model/route đang active và entitlement đúng account.
4. Mở AI Studio → Astrology → Trace Explorer; tìm theo request ID, xem model span redacted và trạng thái validate/save. Trace hoàn tất không tự chứng minh client đã render.
5. Chỉ khi purge đã kiểm chứng, build QA bật cờ và Owner muốn inspect wire payload: tạo lượt mới, tự đồng ý consent QA riêng trong app, rồi Reveal trong Admin. Bấm Hide hoặc rời tab/workspace để xóa payload khỏi UI.
6. So sánh version route/prompt và trace thật. Test/Version/Audit không hiển thị điểm hoặc hành động rollback giả.

Nếu trace persistence thất bại, business response vẫn theo contract riêng và không được tuyên bố thành công ở UI khi response thiếu hoặc không hợp lệ. Trace không phải nguồn quyết định entitlement; rollback observability độc lập với luồng AI.

## Ranh giới hiện tại

Trace không xác nhận client đã render answer. Các span persist message/journal, async job, push notification và human evaluation chưa phải mục tiêu của slice Astrology này. Raw QA capture hiện chưa bật cho Persona, Tarot, Council hoặc các feature khác. Bộ score/evaluation và Promptfoo regression tests chưa được kết nối.

Provider API keys vẫn chỉ được đọc ở Edge Function runtime. Mobile chỉ nhận response business và correlation metadata an toàn.

Tài liệu tham khảo: [Langfuse OpenTelemetry integration](https://langfuse.com/integrations/native/opentelemetry), [Langfuse masking](https://langfuse.com/docs/observability/features/masking), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
# Local answer provenance and feedback update — 2026-10-16

This addendum describes locally implemented, tested source; it does not extend earlier staging/deployment evidence to the new migrations or endpoints.

- Tarot and Astrology Insight return `nilaza.answer-provenance.v1`: interaction, attempt and request identifiers; source/validation/persistence state; available prompt, prompt assembly, route, schema, content/calculation versions and remote IDs. A retry retains interaction ID but creates a new attempt/request.
- Structured Tarot output rejects malformed, incomplete or truncated provider output. A valid structure alone does not prove a useful or semantically correct answer. Astrology retains its fact/evidence validators and keeps provenance outside the strict report schema.
- Server producers may issue immutable, metadata-only answer receipts. Feedback links only when the authenticated owner, feature, request, locale and section match. Admin Feedback Inbox distinguishes verified receipt metadata from client claims and **unverified legacy trace writer origin**. Finding a trace is not proof that every workflow node ran.
- Feedback accepts categories and IDs, never raw question, answer, notes or birth data. Mobile persists an account-scoped queue before sending; only a matching server acknowledgement displays Sent. Retry uses the same feedback ID. Old device entries are pruned when the panel loads, not by a background timer.
- Admin review requires `safety.review`, optimistic revision and audit metadata. Account/capability changes clear sensitive visible state. Full user deletion removes feedback and diagnostic receipts; individual deletion leaves unrelated receipts. Expired records are hidden after 30 days; physical cloud purge scheduling remains a release acceptance item.

Implementation and manager test steps: [AI operations handoff](AI_OPERATIONS_IMPLEMENTATION_2026-10-14.vi.md). Local regression commands include `node --test scripts/ai-answer-endpoints.test.mjs scripts/ai-feedback-sql.test.mjs scripts/model-route-publish-sql.test.mjs scripts/admin-feedback.test.mjs` and the mobile feedback/answer persistence suites.
