# Nilaza — Board triển khai MVP

Cập nhật 02/10/2026. Chủ sản phẩm đã đồng ý triển khai kế hoạch và quota/ngân sách đề xuất; nhiều lát cắt local đã được sửa và kiểm thử. **G1 beta chưa được nghiệm thu; G2 trả phí và G3 phát hành store cũng chưa đạt.** Một lát cắt pass local không đồng nghĩa cả hạng mục hoàn thành.

[Kế hoạch gốc](../../MVP_REMEDIATION_PLAN_2026-10-01.vi.md) và [26 task cards gốc](backlog.json) giữ nguyên vai trò baseline lịch sử. [execution.json](execution.json) ghi tiến độ riêng; mọi `fullCardAccepted` hiện là `false`. Không tạo Agent thường trực mới; dùng các vai trò và các Agent review đã có.

## Kết quả đã có bằng chứng

- Mobile: **44 suites, 269 tests pass** ở baseline sau sửa Journal/export; sau tối ưu import font chạy lại TypeScript, 2 test font và hai export web/Android. Không ghi rằng đã chạy lại toàn bộ 269 test sau font. [R01](R01-validation.vi.md)
- Tarot: tên/giá trị nằm trước artwork chứa đủ khung; đã kiểm tra tên 7 bộ ở rộng 390/360, luồng câu hỏi, Vì sao, lưu và reset một lượt giả lập. Các CTA/cỡ chữ lớn/native vẫn cần nghiệm thu. [R04](R04-tarot-handoff.vi.md)
- Journal: lưu local đợi xác nhận, outbox/tombstone theo account; note độc lập, draft bền và mở đúng nguồn Tarot/Chat/Oracle; có export JSON thật kèm draft đã kiểm hợp lệ. Chưa chứng minh toàn vòng đời cloud hoặc xuất native. [R07](R07-journal-handoff.vi.md), [R08](R08-draft-handoff.vi.md), [R09](R09-local-export-handoff.vi.md)
- Backend local: 9 test prompt Tarot, 10 test handler Journal, 9 test credit; thêm 13 test guard request chung Tarot/Persona và check cả hai index pass. Credit đọc `delta` theo user đã xác thực và đóng POST debit thiếu atomic guard. Tarot/Persona xác thực trước parse, cap UTF-8 body và timeout, đã sửa hai finding review độc lập. **Chưa deploy.** [Credit R10](R10-credits-read-guard.vi.md), [request guard](R10-ai-request-guard.vi.md), [R13](R13-tarot-prompt-handoff.vi.md)
- Content: kiểm 78 lá VI/EN, 930 chuỗi bằng rule; seed/Admin deep compare và 78 test Admin. Chưa publish hoặc độc lập duyệt 546 liên kết artwork/content. [R20](R20-content-qc.vi.md), [seed](R20-seed-integration.vi.md)
- Quota AI: đã ghi nhận Tarot 1 lá/ngày, Chat/Oracle dùng chung 5 lượt/ngày, QA 5 USD/ngày và 50 USD/14 ngày. Atomic reservation/RPC/worker có **13 nhóm PostgreSQL local và 15 Deno test pass**, có unknown holds và overrun pause. Chưa nối endpoint hoặc activation, chưa enforce tokenizer/giá/operation-keyed persistence/rate limits. [R10 ngày 02/10](../2026-10-02/R10-quota-reservation.vi.md)
- Font: bỏ 21 face không dùng; giữ nguyên hash 8 font được export, gồm 7 face dùng và Ionicons. Web export giảm **74,17 → 69,82 MiB**, khoảng 4,35 MiB/5,87%; chưa phải số đo startup, RAM hay kích thước APK. [R19](R19-fonts-handoff.vi.md)

## QA sạch và bảo mật

Target cũ `Nilaza Staging QA` có 92 public tables, gồm 46 bảng trong canonical Nilaza source và 46 bảng ngoài allowlist; catalog xác nhận migration MCY có thật. Chưa xác định người/tác vụ đưa nó vào. Chủ sản phẩm chọn **chuẩn bị QA sạch; giữ môi trường cũ làm bằng chứng**. Đã lập [inventory](R02-clean-qa-inventory.vi.md) và [bootstrap manifest](R02-clean-qa-bootstrap.json) chứa thứ tự/hash 25 migration lịch sử cùng forward SQL mới; không đưa MCY vào baseline mới.

Catalog còn cho thấy raw source chunks/embeddings có policy SELECT public và grants cho anon/authenticated. Chỉ kiểm metadata, không đọc dữ liệu nguồn hay chứng minh rò rỉ đã xảy ra. Đã chuẩn bị [forward migration thu hẹp quyền đọc](R03-source-read-forward.vi.md), **chưa apply hoặc chạy role fixtures PostgreSQL**. Deep Security Scan trước đó thất bại trước khởi tạo; triage và các review riêng không thay thế coverage của scan đó. [R03](R03-security-triage.vi.md)

Ledger vẫn blocked. Theo [AGENTS.md](../../../AGENTS.md) và [migration ledger](../../SUPABASE_MIGRATION_LEDGER.md), dừng db push/repair tới khi có forward path được review và database owner duyệt. Chọn hướng chuẩn bị QA sạch chưa cấp quyền tạo project, apply, thay target, đặt secrets hoặc deploy. R10 SQL mới đã replay riêng bằng PGlite với fixtures; **chưa full replay canonical migrations hoặc test Supabase nhiều connection**. Lần kiểm `docker version` chỉ đọc thất bại vì không có Docker engine pipe và không đọc được config Docker của máy. Không tự khởi động/cài engine hoặc tạo schema giả của MCY để qua cổng.

## Tiến độ từng hạng mục

“Local đã kiểm” nghĩa là lát cắt đã nêu có test/bằng chứng; “một phần” còn công việc trong hạng mục; “chuẩn bị” chỉ có proposal/source/evidence, chưa chạy live. Các vai trò dưới đây là owner có sẵn trong plan, không phải kết quả đã được Agent đó nghiệm thu.

| ID / owner có sẵn | Trạng thái thực tế | Việc tiếp theo để đóng hạng mục |
|---|---|---|
| R00 — product_manager | Một phần: [quota/ngân sách](R00-quota-budget-proposal.vi.md) đã duyệt và version, chưa activation | Freeze holdout/rubric trước tuning; runtime acceptance trước activation |
| R01 — qa_review | Local đã kiểm: test/type/web/Android embed | CI, signed RC và test thiết bị Android/iOS |
| R02 — workflow_orchestration | Chuẩn bị: inventory, hashes, QA sạch | Replay PostgreSQL riêng, hợp nhất credits/cost contract, target/region và duyệt execution cụ thể |
| R03 — security_privacy | Chuẩn bị: dependency triage, source ACL forward | Patch có phạm vi, audit mới, source role fixtures và coverage bảo mật độc lập |
| R04 — mobile_app | Local đã kiểm: Tarot first fold và luồng một lượt | Mọi CTA, toàn artwork, font 200%, screen reader/native |
| R05 — mobile_app | Một phần: shared controls 48, states, reduced motion | Calendar cells, hardcodes còn lại, contrast và accessibility toàn luồng |
| R06 — mobile_app | Một phần: auth intent/race/cancel guard | Verify email, reset/OAuth, logout, A/B và native |
| R07 — workflow_orchestration | Một phần: durable journal, handler delete/merge | CAS/order, 2 client, cross-owner; ngăn late upsert giữ nội dung trong tombstone |
| R08 — mobile_app | Một phần: note/draft/reopen Tarot/Chat/Oracle | Browser/native draft; khoảng crash giữa save ACK và clear ACK; Astro/daily reopen, undo |
| R09 — workflow_orchestration | Một phần: file export local thật | Recipient/expiry/account switch native; server export và xóa account/retention |
| R10 — workflow_orchestration | Một phần: credit/auth/body guards; atomic quota SQL/RPC/worker local có 13 SQL groups và 15 Deno tests, chưa active | Operation-keyed save/recovery, reconciliation/rate limits, token/giá thật, tích hợp toàn AI endpoint và QA concurrency/Admin |
| R11 — mobile_app | Chưa triển khai lát cắt mới | Today Pulse cache/day/timezone; fake-clock midnight/repeat |
| R12 — workflow_orchestration | Một phần: provenance prompt Tarot ở backend | UI và saved contract mọi AI; phân biệt local fallback, version và nguồn |
| R13 — workflow_orchestration | Một phần: locale/canonical Tarot prompt | Publisher purpose/CAS/rollback/readback; provider VI/EN acceptance |
| R14 — mobile_app | Chưa triển khai lát cắt mới | Approved/licensed retrieval, guide method/handoff/disclosure và test độc lập |
| R15 — workflow_orchestration | Chưa triển khai lát cắt mới | Council version/idempotency/atomic result và cost boundary |
| R16 — product_manager | Chưa triển khai lát cắt mới | Admin Test Run đi qua đúng runtime, draft state và provenance |
| R17 — content_data | Chưa triển khai lát cắt mới | Astrology interpretation/provider/version/fallback theo chart thật |
| R18 — mobile_app | Một phần: existing deterministic chart tests pass | Review A3/A4 native placements, save/export, trường hợp biên |
| R19 — mobile_app | Một phần: giảm unused fonts có số đo export | Startup/RAM/network/frame trên máy đại diện; review cách nạp GeoNames |
| R20 — content_data | Local đã kiểm: semantic rules/seed integration | Review độc lập artwork/content/native và publish chính xác |
| R21 — qa_review | Chưa chạy đánh giá nghiệm thu | 84 paired runs, holdouts và raters độc lập; Nilaza/ChatGPT cùng câu hỏi, báo score có bằng chứng |
| R22 — release_readiness | Chuẩn bị: 15-case security E2E matrix | A/B, concurrency, privacy/retention và signed native RC thật |
| R23 — product_manager | Chưa chạy UAT thật | 8–12 khách hàng mục tiêu, quan sát core journey và feedback loop |
| R24 — workflow_orchestration | Dành cho G2 | Purchase/restore, receipt/webhook và entitlement thương mại |
| R25 — release_readiness | Dành cho G3 | Store/privacy/support/signing; release từng nền tảng sau nghiệm thu |

## Thứ tự triển khai tiếp

1. **Đóng boundary trước trả tiền AI:** R00 policy đã được duyệt; R10 token/giá, operation-keyed persistence/reconciliation/rate limits và integration còn lại; R03 dependency patch theo đường chạy. Những phần local có thể làm với preflight mới, không dùng R02 để coi mọi task đều bị chặn.
2. **QA riêng có thể replay:** R02 review đầy đủ SQL/seed/roles/cron/storage/realtime; xử lý source ACL và ledger credits; fixture role/concurrency trên PostgreSQL tách biệt. Trình bản target/region/chi phí/hash/rollback cụ thể trước hành động cloud.
3. **Runtime và Admin khớp nhau:** R12–R16 prompt purpose/model/trace/test path và save provenance; R07 cloud ownership/order/deletion; R09 privacy lifecycle. Sau đó test cùng câu hỏi VI/EN và ChatGPT. Không dùng mock Test Run làm bằng chứng runtime đã áp dụng.
4. **Trải nghiệm hoàn chỉnh:** R05–R09, R11, R17–R20 native/empty/loading/error/reopen; đo performance thật, UAT R23. Kiểm thử 200% font và máy chậm, không chỉ screenshot một màn hình.
5. **R21/R22 retest độc lập và G1:** kết quả đạt mới mời pilot; G2/G3 giữ cổng riêng. Tạo Agent mới chỉ khi có vai trò còn thiếu được nêu cụ thể; hiện không có nhu cầu đó.

## Điều kiện nghiệm thu G1

Theo criteria chi tiết trong plan gốc: RC native Android/iOS đạt; onboarding/auth/recovery và account isolation thật; Home → Tarot/Chat → Journal/save/reopen hoạt động; lưu thất bại báo đúng và dữ liệu private không qua account khác; export/xóa/retention có chứng cứ; quota/cost/concurrency/replay fail-closed; config Admin dùng đúng runtime; AI VI/EN và safety đạt rubric/holdout đã freeze; không có finding critical/high chưa xử lý trong phạm vi release; design/accessibility và performance đạt mục tiêu đo trên thiết bị; UAT thật hoàn thành và owner duyệt nghiệm thu. Không dùng pass schema validator, brand validator hoặc simulator khách hàng để thay những tiêu chí này.

## Đường kiểm tra cho người quản lý

- Tarot: Explore → chọn bộ → tên/giá trị/art → nhập hoặc bỏ qua ý định → rút → Vì sao → lưu → Journal → mở lại → lượt mới có ý định trống. [Ảnh intro](R04-classic-390.jpg), [ảnh Vì sao](R04-why-390.jpg).
- Journal: tạo ghi chú giả lập → rời và mở lại → lưu → lọc → đọc lại nguồn; chặn lưu khi disk error thay vì báo thành công. Draft hiện có test local, chưa có screenshot chạy lại sau bản sửa cuối.
- Privacy: xuất dữ liệu kiểm cấu trúc allowlist; thao tác native chia sẻ, nhận file và cleanup còn chờ native build mới. Không nhầm đóng hộp thoại với nhận file thành công.
- Admin: hai workspace bảo vệ đã được xem; chưa publish source/prompt/model mới hoặc chạy Test Run có phí. Sau QA sạch phải đối chiếu version thật trong response/trace.

Browser plugin hiện timeout CDP khi mở lại mobile tab, nên chưa kiểm UI của bản draft cuối hoặc chụp ảnh mới. Các ảnh R04 là bằng chứng của lượt kiểm trước, không phải bằng chứng native/current build toàn app. Các giới hạn này được giữ rõ để manager quyết định trên kết quả đã có.
