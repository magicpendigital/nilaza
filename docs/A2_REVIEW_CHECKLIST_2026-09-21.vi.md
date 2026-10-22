# A2 — Checklist chạy thử và review

Ngày: 21/09/2026  
Phạm vi: Persona continuity, handoff consent, method packs, AI Council synthesis, feedback telemetry.

## Cách chạy

1. Chạy app mobile ở local fallback trước để kiểm tra UI.
2. Đăng nhập staging khi cần kiểm tra session remote, `chat_messages`, `usage_events` và model route.
3. Giữ nguyên một tài khoản thử nghiệm trong toàn bộ kịch bản để dễ đối chiếu.

## Kịch bản Product Owner cần review

### Persona và method pack

- Gửi 5 lượt trong cùng một Persona, đóng/mở room rồi tiếp tục; xác nhận lịch sử vẫn là một phiên.
- Đổi sang Persona khác rồi quay lại; xác nhận hai phiên không trộn message.
- Thử ba nhóm câu hỏi: quyết định, cảm xúc, ranh giới quan hệ. Kiểm tra câu trả lời có khác lens, có trình tự rõ và có một bước nhỏ/câu hỏi phản tư.
- Tắt backend hoặc dùng local fallback; xác nhận app vẫn trả lời và không hiển thị trạng thái đã đồng bộ remote.

### Handoff và riêng tư

- Tạo Astrology report rồi mở chat với guide. Xác nhận guide vẫn nhận Sun/Moon/Rising, focus và caveat cần thiết.
- Kiểm tra request/trace staging không có ngày sinh, nơi sinh, journal, upload hoặc raw private history.
- Mở Tarot reading rồi chuyển sang guide; xác nhận đúng selected cards, vị trí và orientation được giữ nguyên.

### AI Council

- Gửi một câu hỏi thật trong Council. Ở cuối transcript phải có: điểm chung, điểm còn căng, giả định cần kiểm tra, bước nhỏ tiếp theo và câu hỏi mở.
- Đổi template hoặc roster; kiểm tra synthesis thay đổi theo lăng kính, không chỉ lặp lại cùng một đoạn generic.
- Kiểm tra inspired-by transparency và không có deterministic prediction/professional advice.

### Feedback và retry

- Bấm hữu ích/chưa hữu ích trên một guide reply; xác nhận có toast và event `persona_reply_feedback`, không có raw text trong metadata.
- Mô phỏng timeout rồi retry. Ghi lại session/message/usage event có bị nhân đôi hay không; đây là tiêu chí chưa đóng cho đến khi có remote idempotency.

## Tiêu chí đạt A2

- Không lẫn session giữa Persona/account.
- Council synthesis có đủ 5 trường và hữu ích hơn transcript thuần.
- Handoff Astrology không đưa raw birth date/place sang Persona.
- Tarot luôn diễn giải đúng cards do app chọn; model không được chọn lại cards.
- Feedback event không chứa raw content.
- Retry staging không tạo duplicate charge/message, hoặc đã có quyết định migration và test idempotency.

## Việc cần chuẩn bị trước staging E2E

- Tài khoản staging đã đăng nhập và thiết bị iOS/Android.
- 10–20 câu hỏi Persona và 5–10 câu hỏi Council để chấm theo rubric.
- Quyết định về migration `client_request_id`/result linkage nếu retry timeout vẫn duplicate.
- Quy tắc retention và quyền xem feedback/trace trong Admin hoặc observability.

## Trạng thái kỹ thuật

- Đã pass mobile typecheck, 166 Jest tests, backend contract validation, Deno typecheck cho `ai-council` và `ai-persona-chat`, Supabase readiness và data validation.
- Chưa đóng G-A2 cho đến khi authenticated staging E2E và idempotency retry được xác nhận.
