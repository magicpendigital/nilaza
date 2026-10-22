# R10 — Hạn mức AI: nền tảng backend đã kiểm thử local

Ngày 02/10/2026. Chủ sản phẩm đã đồng ý chính sách: **5 lượt Chat/Oracle dùng chung mỗi tài khoản/ngày, 1 trải Tarot 1 lá/ngày; QA 5 USD/ngày và 50 USD/14 ngày**. Có tối đa 10 USD dành cho đánh giá trong 50 USD, cùng chịu trần ngày. Ngày do server tính theo UTC+7. [Policy version](../../../packages/agent-config/ai-usage-policy.json) ghi quyết định; ngày duyệt không phải ngày bắt đầu chiến dịch.

**Lát cắt này đã triển khai và kiểm thử local; R10 và G1 chưa hoàn thành.** SQL chưa apply, chiến dịch được seed `disabled` với ngày bắt đầu/kết thúc NULL. Chưa nối thư viện này vào các AI endpoint đang có, chưa publish Admin, chưa tạo/retarget/deploy môi trường mới. Các trần được duyệt chưa có hiệu lực trên đường gọi provider hiện tại.

## Công việc đã triển khai

- [Migration mới](../../../supabase/migrations/20261002000000_ai_usage_reservation.sql) có 5 bảng private và 4 RPC: reserve → claim → receipt → finish. Giữ chỗ quota và ngân sách trong một transaction; mỗi lifecycle khóa campaign rồi operation, không giữ transaction trong lúc chờ provider.
- Chat và Oracle cùng quota group. Một kết quả mới được xác nhận lưu mới tiêu thụ một lượt. Lỗi được hoàn lượt, nhưng không xóa chi phí provider. Tarot policy này chỉ nhận 1 lá.
- Request id, user, feature, digest, policy và chi phí dự phòng phải khớp. Yêu cầu đang chạy trả `busy`; kết quả đã lưu trả reference để đọc lại; không cấp worker lease hoặc gọi provider thêm. Mỗi operation có tối đa 2 attempt được giữ chỗ trước.
- Chi phí dùng số nguyên microUSD. Attempt chưa rõ hóa đơn giữ toàn bộ dự phòng. Chi phí thực vượt bound được ghi đủ vào `reported_micro`, phần vượt vào `overrun_micro` theo ngày/chiến dịch; campaign tự pause, receipt lặp không cộng vượt lần nữa. Số đã quyết toán thực là `used_micro + overrun_micro`; số đang giữ là `reserved_micro`. Trong khi chưa finish, chi phí trong bound còn nằm ở phần giữ. Không dùng riêng `used_micro` để báo tổng hóa đơn.
- [RPC adapter](../../../supabase/functions/_shared/ai-usage-store.ts) xử lý lỗi theo hướng từ chối tiếp tục, không đưa lỗi/secret nhà cung cấp vào thông báo. [Worker](../../../supabase/functions/_shared/ai-usage-operation.ts) claim trước generate, dừng khi RPC ACK không rõ, persist trước finish. Arbitrary provider exception được ghi unknown, không tự coi là 0 USD.
- Persist nhận operation id. Sau mất ACK, worker yêu cầu lookup kết quả đã lưu theo operation; tìm thấy thì quyết toán thành công, xác nhận không có mới hoàn quota. Lookup lỗi giữ chỗ để đối soát. Đây là callback contract được test bằng fake; chưa có persistence backend thực đáp ứng contract đó.
- Tables bật và force RLS; revoke ALL với PUBLIC/anon/authenticated, RPC SECURITY INVOKER và chỉ service_role có quyền. Evaluation yêu cầu owner/admin đang active và kiểm lại khi dispatch. Xóa tài khoản gỡ định danh operation, giữ tiền dự phòng để không làm biến mất chi phí.

## Bằng chứng đã chạy

| Kiểm tra | Kết quả | Giới hạn bằng chứng |
|---|---|---|
| PostgreSQL 18.3 WASM / PGlite 0.5.8 | **13 nhóm pass** | SQL/permissions với synthetic auth/result fixtures; một connection; khác linked QA PostgreSQL 17.6 |
| Deno worker/RPC adapter | **15 test pass**, gồm type-check | Fake provider/store; không gọi AI thật |
| Backend contracts | Pass, 14 gateway paths / 21 Edge Functions | Validator source hiện có, không xác nhận tích hợp quota |
| Supabase readiness | 72 pass, 9 warn, 0 fail | Artifact/env checks; không phải runtime acceptance |
| Governance | Pass, 22 agents / 6 lanes | Không cấp quyền cloud action |
| Migration ledger | **Blocked** | Exit code 0 của checker không cho phép db push/repair |

[Báo cáo SQL](../../../output/mvp-20261002/ai-usage-sql-results.json) ghi engine, thời gian, hash và tên các case. Script [test-ai-usage-sql.mjs](../../../scripts/test-ai-usage-sql.mjs) đối chiếu seed với policy và kiểm: lượt thứ 6/2, lặp request, owner conflict, malformed spec, wrong lease, receipt trùng, refund, unknown/fallback, daily/campaign/evaluation caps, UTC+7, revoked admin role, customer permission denial, user deletion và overrun pause.

Runtime test được ghim exact version/integrity, cài riêng `output/mvp-20261002/quota-runtime` với `--ignore-scripts`. Không thêm dependency vào mobile/Admin hoặc root lock. [PGlite](https://pglite.dev/docs/) có một backend connection; 20 request lặp trong test là **serial**, chưa chứng minh race từ 20 clients hoặc hai thiết bị. Engine local báo PostgreSQL 18.3; linked QA cũ là 17.6, nên cần replay trên phiên bản target đã chọn. Chưa replay toàn bộ 25 migration Nilaza; fixtures không thay Supabase Auth/JWT.

## Review độc lập và việc còn phải đóng

Agent `security_review` review contract được cung cấp, không chạy test hoặc audit toàn repo. Finding chi phí vượt dự phòng đã sửa và test. Receipt/finish có cùng thứ tự khóa và transaction; vẫn phải chứng minh multi-connection trên target phù hợp. Các rủi ro dưới đây là gate bắt buộc trước tích hợp/bật gọi trả phí:

1. **Token và giá thật:** tổng input 2.000 token/attempt mới là policy, chưa được enforce bởi tokenizer. Derive server HMAC từ input/route/policy; pin provider/model/rate/output/extra reasoning/tool bounds; chặn route có giá không xác định và hidden retries. `$0.10/operation` là giới hạn kỹ thuật cho dự phòng, không chứng minh hóa đơn thật luôn dưới đó. Overrun phải pause và được hiển thị, không gọi nó là hard cap bảo đảm của provider.
2. **Lưu kết quả theo operation:** SQL hiện kiểm cùng user, đúng loại và succeeded attempt. Chưa gắn durable result của Chat/Tarot/Oracle với operation trong transaction lưu; không được dùng một kết quả cũ của cùng user làm receipt cho operation mới. Triển khai idempotent save/lookup và test lost ACK/crash trên PostgreSQL trước nối các callback.
3. **Đối soát:** chưa có reconciliation RPC cho inflight/unknown hoặc worker chết. Không tự timeout/refund tiền đã dispatch. Cần receipt authoritative của provider và audit operator; giải phóng phần chưa dispatch khác với phần đã phát sinh chi phí. Không dùng retry takeover sau lost reserve/claim ACK.
4. **Chống tiêu hết ngân sách chung:** quota kết quả thành công không phải giới hạn số attempt thất bại. Cần per-user rate/attempt/concurrency limits, explicit retry UI và monitoring; không tự đổi failed thành free infinite retries. Những thông số này phải được kiểm cùng trải nghiệm pilot.
5. **Tích hợp toàn đường gọi:** Persona, Oracle, Tarot, Admin Test Run và mọi tác vụ AI khác/cron/Council phải dùng chung gate hoặc bị disable. Evaluation audience do server chọn sau xác thực quyền, không nhận từ client. Cron/background cũng phải có ngân sách chung; hiện SQL pilot contract chỉ có ba core feature.
6. **QA sạch và Admin:** review exact target/region, replay canonical migrations + forward, live role/JWT/A-B, multi-client races, midnight/crash/fallback; Admin hiển thị used/reserved/overrun/reset/cảnh báo/pause và xác nhận actual route. Sau đó mới duyệt activation ngày bắt đầu và đủ 14 ngày. Native/CI và R21 chất lượng vẫn là gate riêng.

Chỉ cập nhật [bootstrap manifest](../2026-10-01/R02-clean-qa-bootstrap.json) với hash migration mới, trạng thái unapplied. Ledger cũ không thay đổi. Tiếp tục dùng Agent orchestration/security/QA hiện có; không cần tạo Agent mới cho lát cắt này.

## Nghiệm thu của chủ sản phẩm

Đã có bằng chứng local cho các kết quả: lượt thứ 6 Chat/Oracle và Tarot thứ 2 bị từ chối; mở lại không gọi provider; lỗi không mất lượt; unknown không biến thành 0 USD; vượt dự phòng pause; user không đọc được ledger. Chưa thể nghiệm thu bằng thao tác trên app vì current endpoints chưa dùng thư viện mới. Nghiệm thu G1 cần chạy những thao tác đó trên QA sạch từ hai tài khoản/hai thiết bị, kiểm Admin/hóa đơn và đạt các gate nêu trên.

Rollback trước apply: giữ source theo lát cắt và campaign disabled. Khi đã apply, pause gọi mới và xử lý holds/retention bằng đường được duyệt; không xóa ledger hoặc hồi sinh debit thiếu bảo vệ. Skill Plan & QC hiện vẫn phù hợp: đã có impact/preflight/validation/handoff và phân biệt local, live, native; không có thay đổi định hướng đòi sửa skill hay AGENTS.md.
