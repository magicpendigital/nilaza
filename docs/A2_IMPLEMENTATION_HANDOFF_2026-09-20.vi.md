# A2 — Handoff triển khai slice Persona continuity và method packs

Ngày: 20/09/2026  
Trạng thái: **đã triển khai runtime slice A2.1 + A2.2 + A2.3 + A2.5 + A2.6; chưa đóng G-A2**
Owner: Product/AI + Mobile/Backend  
Write scope: `apps/mobile/src/backendClient.ts`, `apps/mobile/App.tsx`, `apps/mobile/src/features/council/*`, `apps/mobile/src/features/persona/PersonaChatRoom.tsx`, `supabase/functions/ai-persona-chat/index.ts`, `supabase/functions/ai-council/index.ts`, `supabase/functions/_shared/persona-prompt-assembler.ts`, prompt/config tests và tài liệu A2.

## Mục tiêu và tiêu chí nghiệm thu

- Một Persona session có thể tiếp tục nhiều lượt; backend dùng lại `chat_sessions` hiện có thay vì tạo session mới cho từng message.
- Model nhận tối đa một cửa sổ lịch sử sạch, gồm role và text đã cắt độ dài; không nhận journal/birth/raw private context.
- Khi backend tạo remote session UUID lần đầu, mobile chuyển local session hiện tại sang UUID đó mà không làm mất các message đang hiển thị.
- Persona prompt có method pack rõ ràng: `decision_clarity`, `emotional_reflection` hoặc `relationship_boundaries`; mỗi pack có mục tiêu, trình tự suy nghĩ và rubric trả lời VI/EN.
- Fallback local vẫn chạy khi backend không có; prompt/response vẫn giữ inspired-by transparency và safety boundary.
- AI Council trả thêm synthesis có cấu trúc gồm consensus, tensions, assumptions, nextStep và reflectionQuestion; UI hiển thị ngay trong biên bản và lưu cùng local session.
- Người dùng có thể đánh giá phản hồi Persona hữu ích/chưa hữu ích; event chỉ ghi metadata, không ghi nội dung câu trả lời.

## Whole-App Impact Brief

| Mặt tác động | Phạm vi slice |
| --- | --- |
| Entry/navigation | Chat → Persona room, AI Council room, New chat, History và resume. Không đổi tab, deep link hoặc Astrology entry. |
| Data writes | Reuse `chat_sessions`, `chat_session_personas`, `chat_messages`, `usage_events` hiện có. Không thêm bảng/cột/migration. Local AsyncStorage tiếp tục lưu `messages` account-scoped. |
| Backend contract | Persona nhận `sessionId`, `sanitizedHistory`, `clientRequestId`; response thêm `remoteSessionId`, `methodPackId`, `methodPackVersion`, `persistenceStatus`. Council response thêm `synthesis` có cấu trúc. Các trường mới optional để client cũ vẫn đọc được. |
| Admin | Không mở workspace mới. Prompt method pack là runtime shared artifact; Admin hiện vẫn quản lý prompt global/persona. A2 tiếp theo sẽ thêm quality/eval visibility. |
| Privacy/safety | History chỉ chứa role/text cắt ngắn do người dùng vừa nói trong Persona room. Không gửi journal, birth profile, image, email hay notification payload. Astrology handoff không còn truyền `birthDate`/`birthPlace`; chỉ truyền placement đã tính, trạng thái tính và phần phản chiếu an toàn. |
| Analytics | Ghi method pack/version, session reuse và persistence outcome; không ghi raw text. `clientRequestId` chỉ là opaque correlation metadata. |
| Rollback/fallback | Feature có thể tắt bằng cách bỏ `sessionId/sanitizedHistory`; function sẽ tạo session mới như hành vi cũ. Local fallback không phụ thuộc remote. Không chạy DB push/repair. |
| Surfaces untouched | Astrology calculator/visuals, Tarot card selection, payment, Journal schema, notification delivery, Admin protected workspaces và migration history. Tarot input tiếp tục bắt buộc selected cards do app chọn trước. |

## Điều chưa giải quyết trong slice này

Database-level idempotency cho retry sau timeout cần `client_request_id`/result linkage đã được reconcile trên remote. Ledger hiện blocked nên slice này chỉ truyền correlation id và ngăn duplicate trong UI request đang chạy; không tuyên bố retry mạng đã idempotent hoàn toàn. Việc upsert membership đã loại bỏ duplicate-key trên các lượt tiếp tục bình thường, nhưng chưa thay thế idempotency cho timeout. G-A2 chỉ đóng sau khi có staging E2E và quyết định migration owner.

## Manager test path

1. Mở một Persona, gửi câu hỏi, đóng room, mở lại và gửi câu thứ hai; kiểm tra lịch sử vẫn cùng một room.
2. Mở network/backend path, kiểm tra một `chat_session` chứa nhiều cặp user/guide, không tạo một session cho mỗi lượt.
3. Chuyển sang Persona khác rồi quay lại; không lẫn session hoặc persona.
4. Chọn guide thiên về quyết định, cảm xúc và quan hệ; kiểm tra prompt metadata trả đúng method pack, câu trả lời kết thúc bằng bước/rubric phù hợp.
5. Tắt backend; gửi câu hỏi; kiểm tra local fallback vẫn hoạt động và UI không báo đã sync remote.
6. Mở AI Council, gửi một câu hỏi; kiểm tra cuối transcript có `Tổng hợp có cấu trúc` với điểm chung, điểm căng, giả định, bước nhỏ và câu hỏi mở. Chuyển template để xem cách tổng hợp thay đổi.
7. Trên một câu trả lời Persona, bấm hữu ích/chưa hữu ích; kiểm tra toast và event local có `persona_reply_feedback`, không có raw text.
8. Từ Astrology report chọn mở chat với guide; kiểm tra UI vẫn dùng Sun/Moon/Rising nhưng payload handoff không chứa ngày sinh hoặc nơi sinh.

## Validation và stop condition

- `npm --workspace apps/mobile run check`
- targeted backend/mobile tests cho input/session mapping và method pack routing
- `npm run validate:backend`, `npm run validate:data`, `npm run supabase:check`, `npm run supabase:migration-ledger:check`
- authenticated staging E2E trước khi gọi G-A2 đạt

## Danh sách cần Product Owner review

- Review chất lượng method pack: `decision_clarity`, `emotional_reflection`, `relationship_boundaries` có tạo ra câu trả lời khác nhau và kết thúc bằng bước nhỏ đúng chủ đề hay chưa.
- Review AI Council synthesis: consensus/tensions/assumptions có phản ánh đúng transcript, không biến thành kết luận chắc chắn, và có hữu ích hơn một đoạn chat General AI hay không.
- Review Astrology handoff: placement được giữ đủ để guide tiếp nối mạch, còn dữ liệu ngày/nơi sinh không bị gửi sang Persona.
- Review feedback affordance: vị trí hai nút hữu ích/chưa hữu ích có dễ hiểu, không gây cảm giác chấm điểm người dùng hay không.
- Review retry/network: với backend staging, mô phỏng timeout rồi retry; ghi nhận duplicate message/charge nếu có. Chưa đánh dấu đạt cho đến khi có idempotency remote.

## Việc Product Owner hoặc môi trường staging cần cung cấp

- Tài khoản staging đã đăng nhập và một thiết bị iOS/Android để chạy happy path.
- Quyết định có cho phép migration bổ sung `client_request_id`/result linkage hay tiếp tục giữ correlation-only.
- Một bộ 10–20 câu hỏi thật cho Persona và 5–10 tình huống Council để chấm theo rubric hữu ích, khác biệt, an toàn.
- Quy tắc retention cho event feedback và quyền xem event trong Admin/observability trước khi chạy acquisition rộng.

Dừng mở rộng A2 sang migration, payment hoặc raw memory khi ledger chưa reconcile hoặc khi history redaction chưa được kiểm chứng.

## Kết quả slice hiện tại

- `apps/mobile` gửi `sessionId`, `clientRequestId` và tối đa 8 lượt history đã cắt độ dài.
- `ai-persona-chat` kiểm tra ownership/session kind, dùng lại remote session UUID, cập nhật `updated_at` và trả `remoteSessionId`.
- Prompt assembler thêm ba method pack và trả `methodPackId`/`methodPackVersion` để trace/eval.
- Persona membership write dùng upsert idempotent cho lượt tiếp tục cùng persona.
- Astrology handoff đã loại bỏ raw birth date/place khỏi context chuyển sang Persona.
- AI Council parser, fallback và UI đã có structured synthesis; local council session lưu lại phần tổng hợp. Mobile còn có fallback synthesis khi staging function cũ trả về turns hợp lệ nhưng chưa trả trường `synthesis`; đã kiểm chứng trên APK release bằng các mục `Tổng hợp có cấu trúc`, `Điểm chung`, `Giả định cần kiểm tra`, `Bước nhỏ tiếp theo` và `Câu hỏi mở`.
- Persona room có feedback hữu ích/chưa hữu ích và event metadata không chứa raw text.
- Backend client test đã kiểm tra request body và response metadata; idempotency database-level vẫn để sau migration reconciliation.
