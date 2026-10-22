# Triển khai production Nilaza — nghiệm thu local đợt đầu

Ngày 04-10-2026. Owner đã đồng ý dùng một Micro trong Supabase Pro 25 USD base, không Small/PITR/staging trả phí/addon; AI thanh toán riêng qua OpenRouter. Đợt này triển khai **W02a và W08a**, không đánh dấu hoàn tất toàn bộ W02/W08 hoặc MVP production.

## Kết quả

| Công việc | Đã hoàn thành local | Phần còn thiếu |
|---|---|---|
| W02a: đúng target trước SQL | Gate organization/project/environment, allowlist, ledger, SQL hash/order, replay/restore/RLS và quyết định owner; tích hợp feature preflight | Exact target thực, ledger/readback/replay thật, review release checker cho target mới và approval SQL cụ thể |
| W08a: dữ liệu chi phí OpenRouter | Receipt riêng mỗi attempt, cost khác upstream cost, generation/request IDs riêng, actual model/token details; giữ phí của malformed/safety/HTTP failure; lookup bounded; trace failure không paid failover | Server-owned ledger/dedup/settle/worker; migrate routes với allowlist và giá/retention; actual Admin cost dashboard; E2E/benchmark |
| Skills phát triển | `nilaza-plan-qc` 1.5.5, thêm guidance target/provider; sync một reference file với guard hash bản cũ | Cloud task phải dùng repo skill source đúng revision; bản installed trên máy không tự truyền sang runtime/backend/Agent ở môi trường khác |

Hướng dẫn và hợp đồng: [gate target](database-target-gate.vi.md), [receipt OpenRouter](openrouter-receipts.vi.md). Đây là hai phần nền tảng để thực hiện các work packages tiếp theo, không thay thế sửa auth/provenance/privacy hoặc tạo schema production.

## Kiểm thử thực hiện

| Kiểm tra | Kết quả | Giới hạn bằng chứng |
|---|---|---|
| Database target + feature preflight + feature runner | **51/51 PASS** | Synthetic fixtures; test CLI draft code2/BLOCKED và unsafe path code1/FAIL; không chạy SQL hoặc cloud |
| Provider/router + OpenRouter receipt | **29/29 PASS** | Mock fetch, không quyền network, không model/key thật; giữ phí hai attempts, safety/trace failures, unknown costs và lookup timeout |
| `validate:backend` | PASS | 14 gateway paths, 21 function contracts; không chứng minh protected endpoints live |
| `supabase:check` | 72 PASS, 9 WARN, 0 FAIL | Cấu trúc source/tool/env presence; không chứng minh deployment hoặc quyền runtime |
| `council:contract:check` | PASS | Canonical generated contract còn khớp |
| `validate:governance` | PASS | 22 agents, 6 delivery lanes; không cấp quyền deploy |
| `skills:validate` / `skills:sync` / `skills:check` | PASS / một file synced / PASS | 5 skills; entrypoint và invocation metadata khác giữ nguyên |
| Skill Creator Python validation | **UNAVAILABLE** | Python bundled có sẵn nhưng thiếu PyYAML; không install thêm. Validator repository/frontmatter/hash đã PASS, không ghi Python PASS |
| Migration ledger cũ | Metadata check PASS, **ledger BLOCKED** | Không cho db push/repair; QA MCY còn nguyên |
| Draft production target | **BLOCKED đúng thiết kế** | Project ID, target registration và live/replay evidence chưa có |

Hai feature plans đã qua preflight trước khi code; scope skill/report được mở rộng và preflight lại trước sửa. Sau sửa cần preflight theo hash hiện hành; [implementation-evidence.json](implementation-evidence.json) giữ source hashes và kết quả của đợt này. Hash và trường PASS không chứng minh tính trung thực hoặc danh tính owner; tool outputs và review thực vẫn cần thiết.

Deno mặc định không ghi được lockfile; `--frozen` thấy root lock lệch vì dependency Expo mobile ngoài scope. Tests chạy với Deno 2.9.0, TypeScript 6.0.3, `--no-lock --cached-only --allow-env`; không sửa lock, tải dependency hoặc gọi AI thật. Đây là giới hạn về test environment cần giải quyết trong release candidate riêng, không sửa lock chung để làm test của slice này xanh.

## Đồng bộ local / online

| Phân vùng | Trạng thái | Lý do chưa đồng bộ / việc cần làm |
|---|---|---|
| Repo code/docs/skills | Đã lưu local | Có nhiều thay đổi khác trong workspace; giữ nguyên, không commit hoặc deploy toàn bộ dirty tree |
| Skill installed Codex trên máy | Khớp repo 1.5.5 | Sync đã xác minh byte/hash; skill có tác dụng cho Agent, không chạy trong ứng dụng khách hàng |
| Admin online staging | Không deploy trong đợt này | Code thay đổi thuộc backend/gate, chưa có durable billing contract; bản workflow online trước đó không tự có backend receipt mới |
| Edge Functions trên QA cũ | Chưa deploy source mới | Cần candidate, target-scoped deployment và authenticated E2E; không thay published routes hoặc secrets |
| QA cũ/schema/data | Giữ nguyên | Legacy ledger blocked và evidence MCY phải được bảo toàn; không dùng clean bootstrap lên môi trường này |
| Production Pro | Chưa tạo/chọn project trong phiên này | Manifest `projectRef=null`, allowlist rỗng, replay/auth/privacy/restore còn thiếu; việc owner chọn kiến trúc/chi phí không thay approval SQL cho candidate cụ thể |
| Native iOS/Android, billing/load/restore thực | Chưa chạy | Không có release candidate/target đã nghiệm thu; web/fixture không thay native hoặc managed database evidence |
| Agent trên cloud hoặc máy khác | Không tự có skill installed local | Phải checkout đúng repo revision và đọc/sync skill trong môi trường đó; không có kết nối tự động tới filesystem Codex của máy hiện tại |

Không phát sinh phí AI hoặc tài nguyên Supabase mới trong các bài test. Mức 25 USD là phạm vi base đã chọn; chưa có Upcoming Invoice/readback của project mới để xác nhận hóa đơn thực. Compute credit, included usage và overage vẫn cần đối chiếu trước provisioning.

## MVP còn bị chặn và lộ trình kế tiếp

1. W03–W04: auth trước dispatch/cost cho tất cả endpoint; server-only provenance, grants/RLS/RPC/views; test A/B, token cũ và forged usage/result. Nghiệm thu staging phải phân biệt service-role với quyền khách hàng.
2. W05–W07: cloud export/delete, birth-data deletion, tombstone/race chống phục hồi nội dung đã xóa, recovery suppression ledger và audit actor semantics. SQL/history giữ nguyên; sửa bằng forward đã review.
3. W08b–W10: operation/quota/receipt/result transaction, unique generation receipt và worker; OpenRouter-only approved primary/fallback, bound giá/tokens/privacy; config release/CAS và quality benchmark VI/EN.
4. Replay baseline production bằng fixture trên Postgres/Supabase tương thích, tắt outbound; không apply tự động 27 SQL candidate và không dùng campaign QA14 ngày làm production policy. Đo isolation/load/backup restore trong scope ngân sách đã chọn.
5. Chuẩn bị candidate/cost/target cụ thể rồi mới tạo prod Micro, apply SQL/deploy qua quyết định owner đúng bước; staff canary trước public signup. Cần nghiệm thu UI/UX/native, hỗ trợ/incident owner và toàn bộ scenario launch đã ghi trong [SCENARIOS.vi.md](SCENARIOS.vi.md).

## Manager test path và rollback

Manager có thể đọc bảng trạng thái, chạy draft target checker để thấy BLOCKED có lý do, hoặc yêu cầu Agent chạy lại hai bộ test synthetic theo đúng feature plans. Chưa dùng Admin online để xác nhận actual cost hoặc production READY.

Rollback chỉ revert các file owned của W02a/W08a và skill reference/manifest tương ứng; sync skill có kiểm tra hash bản cũ. Không reset workspace, đổi SQL history, xóa QA, sửa secrets hoặc undo các phần Admin đã triển khai trước. Các source hashes/checks của đợt này không phải chứng nhận toàn bộ ứng dụng.
