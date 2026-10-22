# Kế hoạch B — Xây phòng marketing AI có thể tách thành business

> Kế hoạch giai đoạn lịch sử. B0/B1 đã triển khai draft-only và template đã bàn giao 22/09; xem [hiện trạng 30/09](GROWTH_OPERATIONS_HANDOFF_2026-09-30.vi.md) và [template handoff](MARKETING_AI_TEMPLATE_HANDOFF_2026-09-22.vi.md). M1–M6 bên dưới là phase labels, không phải ID W0–W6 trong config. Agent runtime, kênh, publish và paid chưa được kích hoạt.

Phiên bản đề xuất 1.0 · 20/09/2026 · **Chờ duyệt. Chưa tạo agent runtime, kết nối kênh, publish hoặc mua quảng cáo.**

Đọc [lộ trình và phiếu duyệt](DELIVERY_ROADMAP_APPROVAL_2026-09-20.vi.md), [kế hoạch sản phẩm A](APP_PHASED_DELIVERY_PLAN_2026-09-20.vi.md) và [blueprint chi tiết](AI_MARKETING_FRAMEWORK_PLAN_2026-09-20.vi.md).

## 1. Đích đến và phạm vi

Xây hệ thống nghiên cứu → lập kế hoạch → tạo nội dung → tự đánh giá/sửa → duyệt → phân phối → đo journey → tối ưu content/campaign. KPI cuối là acquisition có giá trị và contribution, không phải số bài/tin nhắn/lượt xem. Giai đoạn đầu chứng minh một workflow hoàn chỉnh cho Nilaza; sau đó mới tăng kênh, quyền tự động và khách hàng.

Tách core dùng chung khỏi Nilaza BrandPack ngay về contract/module, chưa xây toàn bộ SaaS trước khi có người dùng. Lõi không chứa tri thức Tarot hoặc domain Nilaza; gói Nilaza tham chiếu nguồn brand và trạng thái sản phẩm đã được phép dùng. Dữ liệu riêng của app không phải kho marketing.

Phân khúc pilot đề xuất: người trưởng thành tại Việt Nam, ưu tiên nội dung VI và hỗ trợ EN. M1 sẽ kiểm nhu cầu và lựa chọn kênh. Không mặc định tất cả Gen Z/phụ nữ có cùng pain point hoặc cùng hành vi.

## 2. Tổ chức agent, sub-agent và quyền

| Vai trò | Subtasks/sub-agents dự kiến | Có từ phase | Quyền mặc định |
| --- | --- | --- | --- |
| Growth orchestrator | Priority, capacity, experiment planner | M2 | Đọc brief, giao job có scope/cap; không tự cấp thêm quyền |
| Customer/market research | Source verifier, competitor analyst, JTBD analyst | M1 thủ công có AI; M2 đóng gói | Public hoặc tài liệu nghiên cứu đã được đồng ý |
| Positioning strategist | Segment/offer/message mapper | M2 | Draft thông điệp gắn ProductTruth |
| Content studio | Copy/script, visual brief, production, localization | M2 | Tạo draft/asset trong scope |
| Independent QA | Claim/source/IP/brand/privacy/render checks | M2 | Pass/revise/block; không publish |
| Distribution | Formatter, scheduler, receipt reconciler | M3 | Test/dry-run; publish chỉ với approval có hiệu lực |
| Journey/lifecycle | Funnel audit, onboarding diagnosis, consent/suppression | M4 | Aggregate analytics và template; không đọc chat/journal |
| Paid acquisition | Media plan, campaign builder, spend monitor, optimizer | M5 | Draft/paused; mutation theo budget envelope đã duyệt |
| Measurement | Data quality, attribution/cohort, experiment review | M1 định nghĩa; M2–M5 runtime | Read-only dữ liệu tối thiểu, không sửa kết quả đầu vào |

Pilot gộp research/strategy; studio; QA; measurement/journey thành 4 nhóm. Validator, retry, scheduler, consent và budget enforcement dùng code xác định. Không bắt 9 LLM chạy liên tục, không để generator tự duyệt sản phẩm của mình.

Owner con người: chủ sản phẩm duyệt mục tiêu/budget; Growth owner chịu kết quả; editor chịu nội dung; engineer chịu vận hành/integration; QA/privacy reviewer chịu cổng chuyên biệt. Một người có thể kiêm nhưng trách nhiệm ghi rõ. Quy hoạch vai trò không phải yêu cầu spawn sub-agent trong task lập kế hoạch này.

## 3. Tổng quan giai đoạn

| Giai đoạn | Đầu ra | Ước lượng công kỹ thuật | Phụ thuộc |
| --- | --- | --- | --- |
| M1 — Nền tảng business/measurement | BrandPack, ProductTruth, funnel, scope quyền, kế hoạch thử | 3–5 ngày | Duyệt M1; phối hợp A1 |
| M2 — Content factory có QA | Skills + workflow draft→QA→review + cost/learning log | 10–15 | M1 |
| M3 — Publishing kiểm soát | Một adapter đầu, lịch, approval và receipt/retry | 5–10 | M2; quyền kênh/test account |
| M4 — Journey/onboarding/lifecycle | Cohorts, friction audit, consented reminders có holdout | 5–10 | Events A2; app loop A5 cho automation liên quan |
| M5 — Paid campaigns và tối ưu | Một paid channel, spend guardrails, closed-loop report | 5–10 + 4–6 tuần quan sát | A6 và tín hiệu beta A7; M3/M4/data QA đạt |
| M6 — Portability/business pilot | Core reusable, tenant isolation, design partner pilots | 10–15 cho spike; pilot 8–12 tuần riêng | Có bằng chứng M5 và nhu cầu ngoài Nilaza |

Các ngày không bao gồm công editorial/thiết kế, lịch phỏng vấn, chờ OAuth/API audit hoặc mẫu quảng cáo đủ conversion. Estimate M6 chỉ là spike và pilot preparation, không phải hoàn thành SaaS production. Không bắt buộc qua M6 nếu Nilaza chưa đủ bằng chứng.

## 4. M1 — Chốt business context, claims và measurement

**Mục tiêu:** mọi nội dung sau này biết sản phẩm thực sự làm được gì, phục vụ ai, đo thế nào và được phép hành động đến đâu.

**Tasks:**

1. M1.1 Business brief: mục tiêu, phân khúc giả định, thị trường, giá/offer hiện chưa biết, ngân sách học có thể mất, người duyệt. Thiếu thông tin thì ghi unknown; không tự tạo giá.
2. M1.2 BrandPack từ Open Reflection; ProductTruth ghi feature/platform/environment/build, trạng thái draft/verified/released, allowed claims, evidence link, owner, expiry.
3. M1.3 JTBD research plan 15–20 người: câu hỏi trung lập, consent, ghi chú giảm định danh; bao gồm người dùng chatbot và app Tarot/chiêm tinh. Chuẩn bị recruitment draft; liên hệ thật chỉ khi đã được giao quyền liên hệ.
4. M1.4 Funnel/event dictionary cùng A1/A2: naming, eligible cohort, timezone, identity rules, attribution window, value event và separate useful rating. A2 sở hữu producer events trong app, M sở hữu analytics consumers; không hai đội cùng sửa contract riêng.
5. M1.5 Kiểm kê kênh/accounts/access: một kênh chính, một kênh tái dùng nội dung, landing/owned channel; xác minh test mode, API rights và công cụ đăng sẵn có.
6. M1.6 Experiment backlog: 3 thông điệp × 2 format, 1–2 ưu tiên đầu; control, primary metric, duration, stop condition và product dependency.

**Đầu ra:** context/claim packs draft, interview kit, funnel diagram, event contract đề xuất, channel capability matrix, cost/budget worksheet, weekly scorecard mẫu không chứa số giả.

**Gate G-M1 / manager thử:** chọn một bài quảng bá Astrology; thấy claim chỉ được dùng sau gate A3/A4/A6 tương ứng, có evidence và owner. Xem một event từ landing tới value, biết phần chưa track được. Biết account nào có quyền và ngân sách nào chưa duyệt. **Rollback:** chỉ draft; không có external side effect. **Đường ghi:** docs và brand/config drafts được khai báo, chưa bật runtime.

## 5. M2 — Bộ skills và content factory có kiểm định

**Tasks:**

- M2.1 Xây contract/job registry: tenant, task, owner, input refs, output schema, skill/model/prompt version, cost/time cap, attempts, error, approval, audit. Durable state/checkpoint; agent restart không mất trạng thái hoặc lặp mutation.
- M2.2 Đóng gói 8 skills đầu: business context, source/claim research, JTBD synthesis, positioning/brief, editorial calendar, content/script production, brand/localization, content QA/repair. Mỗi skill có trigger/I/O/source/tool scope/examples/tests/stop condition; tái dùng Nilaza plan/brand skills.
- M2.3 Workflow kế hoạch tuần: research signals → đề xuất giả thuyết → ưu tiên theo impact/confidence/cost → owner chốt → studio nhận brief.
- M2.4 Workflow sản xuất: brief → tối đa 3 concepts → chọn concept → copy/visual/script → deterministic QA → independent semantic QA → sửa tối đa 2 vòng → review queue. Quá số vòng trả về brief, không loop vô hạn.
- M2.5 Quy tắc QA: block claim sai/tính năng chưa sẵn sàng/privacy/license; soft score relevance, specificity, proof, brand, clarity/CTA, platform fit. Calibration với người; không coi điểm judge là dự báo conversion.
- M2.6 Review UI protected: xem preview/source/claims/cost/version; approve/reject/comment; tách creator/reviewer capabilities; giữ nguyên Content Ops và AI Studio.
- M2.7 Pilot 12 asset packages từ ít nhất 3 briefs, ít nhất 2 format; dùng cùng brief so quy trình hiện tại. Đo effort người, sửa bao nhiêu vòng, QA misses và cost/accepted asset.

**Sub-workflows kiểm:** link/UTM, text VI, asset provenance, crop/safe area, caption/alt text, font/glyph, thông điệp không deterministic, sự khớp giữa screenshot và build thật. Không tự gửi raw user stories vào image/video provider; ví dụ tổng hợp phải được ghi là minh họa.

**Đầu ra:** skills source đã validate, draft-only workflow runnable, queue/reviewer, evaluation pack, 12 gói nội dung chưa publish, báo cáo cost và baseline. Đường dẫn mới dự kiến `packages/growth-core`, `brands/nilaza`, `skills/growth-*`, `workflows/growth`; UI thêm module theo Admin architecture hoặc workspace riêng được ADR xác định. Chưa tự tạo toàn bộ folder cho đẹp trước nhu cầu.

**Gate G-M2:** cấy ít nhất 10 lỗi kiểm thử như claim tính năng chưa có, nguồn hết hạn, leak private birth info, ảnh sai brand, link hỏng; mọi hard-fail fixture phải bị chặn. Audit false-positive và false-pass bằng người trên pilot; output đạt rubric đã calibration. Job timeout dừng đúng cap; cùng input/version có provenance đủ truy lại. Manager xem từ brief tới bản sửa và lý do duyệt. **Rollback:** tắt auto generation, giữ draft/history, quy trình review thủ công tiếp tục.

**Checks:** schema/fixtures, cost cap/retry tests, skills validators và `validate:governance`; Admin check/test cả hai workspaces nếu thêm UI; render review media thật. Không cần chấm mọi content bằng nhiều model nếu không tạo thêm giá trị.

## 6. M3 — Publishing có kiểm soát và đối soát

**Tasks:** M3.1 chọn một adapter theo account/capability thực; M3.2 approval gắn asset hash/version/channel/schedule/CTA/expiry; M3.3 scheduler với timezone và immutable publish job; M3.4 media processing/receipt/external ID/status readback; M3.5 idempotency, rate-limit/token expiry/retry và unknown-state reconciliation; M3.6 pause/cancel/retract, review calendar, manual export nếu API không hỗ trợ.

**Workflow:** approved → scheduled → preflight permission/content check → executing → verified/failed/unknown. Timeout sau POST phải đối soát trước retry; không tự đăng lần hai. Bản sửa sau approve vô hiệu approval cũ. Publish record giữ content version, account và URL/evidence.

Trước quyền public chỉ chạy dry-run/test/private channel đúng capability. Trước app RC, nội dung chỉ chuẩn bị hoặc giới thiệu beta trong phạm vi được chủ sản phẩm phê duyệt riêng; không tự công bố tính năng chưa verified. API audit/token là dependency có lịch chờ riêng, không coi là việc LLM giải quyết bằng prompt. [TikTok Direct Post](https://developers.tiktok.com/docs/en/content-posting-api-get-started).

**Đầu ra:** một adapter có test evidence, lịch, approval/audit, publish playbook, escalation và gói export dự phòng. Chưa kết nối 5–6 kênh cùng lúc.

**Gate G-M3 / manager thử:** approve một version; sửa caption làm approval hết hiệu lực; test timeout không double-post; thu hồi quyền thì job dừng; check đúng account/timezone; receipt nhìn thấy trạng thái thật; cancel trước giờ gửi có hiệu lực. Public activation là quyết định cụ thể sau có preview, account và phạm vi.

**Rollback:** pause queue theo tenant/channel; reconcile jobs đang unknown; gỡ theo API/manual runbook khi được phép. Không giả định gỡ bài xóa mọi bản sao đã chia sẻ. **Checks:** adapter sandbox integration, token/permission, retries/idempotency/kill switch, protected UI và audit redaction.

## 7. M4 — Customer journey, onboarding và lifecycle

**Tasks:**

1. M4.1 Ingest event/spend ban đầu; validate schema/dedupe, clock/timezone, account test/bot exclusion, missing event và backfill idempotency.
2. M4.2 Nối campaign/creative/referral tới app trong phạm vi consent; báo unattributed rõ. Cross-device/store attribution chưa đầy đủ phải ghi coverage; không fingerprint.
3. M4.3 Dashboard cohorts theo entry source, platform, app/feature version; generated/viewed/useful/action/save khác nhau; A/B assignment ổn định theo user khi phù hợp.
4. M4.4 Journey auditor: xác định rơi ở landing/auth/first result/save/return bằng events và interview; tạo ticket có impact, bằng chứng và manager test; không tự sửa app.
5. M4.5 Lifecycle eligibility: consent theo kênh/mục đích, suppression/unsub, quiet hours, toàn-kênh frequency cap và exit condition; phân biệt transactional với marketing.
6. M4.6 Kết nối loop đã có ở A5: reminder/recap generic; không gửi chi tiết riêng lên push/email; không biến consent thông báo kết quả thành consent promotion.
7. M4.7 Holdout reminder để quan sát quay lại tự nhiên và uplift; feedback loop điều chỉnh brief/product backlog theo nguyên nhân.

Đề xuất khởi đầu tối đa 2 marketing touches/7 ngày trên toàn kênh, không tính transactional; chốt thực tế với owner ở M1, thử và theo dõi opt-out. Không quy định một tần suất cho mọi người để tối đa hóa opens.

**Đầu ra:** dashboard không raw private content, consent/suppression service hoặc integration đã thử, 3 lifecycle templates và 1 holdout experiment, weekly friction report. M1/M2 có thể dùng mẫu dữ liệu trước; M4 không được báo retention thật khi chưa nối events đáng tin.

**Gate G-M4 / manager thử:** một test user từ link→auth→chart/result→value→return xuất hiện đúng cohort; retry không tăng conversion; người chưa đủ 28 ngày không vào denominator D28; unsub/consent revoke chặn cả job đã lên lịch; đổi account không gửi sai; thông báo không lộ câu chuyện riêng.

**Rollback:** disable outgoing marketing, giữ transactional cần thiết theo scope và consent; inbox/fallback trong app còn dùng được. **Checks:** consent revocation, dedupe, cohort unit tests với synthetic histories, identity isolation, native push và email test theo quyền. Không training marketing AI bằng nhật ký thật.

## 8. M5 — Thiết lập, phân tích và tối ưu quảng cáo

**Điều kiện vào:** A6 đạt cho sản phẩm sẽ quảng bá, A7 có tín hiệu chất lượng ban đầu, M3/M4 đạt; owner đã duyệt learning budget, account, thị trường, tuổi, objective, creative/landing và hard caps. Chưa có retained-cohort ổn định thì chỉ paid learning pilot nhỏ, không scale.

**Tasks:**

- M5.1 Media plan một paid channel: 1 audience hypothesis chính, 2–3 creatives, offer/landing match; tối đa 1–2 biến chính mỗi test. Targeting không dựa vào raw emotional/birth data.
- M5.2 Campaign builder tạo draft/paused: objective, placements, exclusions, schedule/timezone, currency, daily/lifetime budget, tracking IDs và attribution setting. Readback chứng minh khác gì trước activate.
- M5.3 Budget guardrails bằng code + platform caps khi hỗ trợ, buffer cho lag/overspend, kill switch; quyền raise cap luôn ngoài envelope mặc định.
- M5.4 Spend/conversion/revenue reconciliation; server-confirmed payment/refund, AI/tool/content/human cost. Dashboard tách media CAC, fully loaded CAC và contribution.
- M5.5 Optimization workflow theo batch sau đủ window: data QA → phân đoạn → xác định bottleneck → recommendation → preview action → approved execution → log → đọc tác động. Không sửa targeting/bid/creative/product đồng thời rồi kết luận nguyên nhân.
- M5.6 Creative feedback: chỉ ra hook/claim/format/segment/version nào có bằng chứng; chuyển về brief sửa và QA lại. Không tự promote “winner” vì CTR khi retention thấp.
- M5.7 Owner review tối thiểu mỗi tuần trong pilot; system đọc anomaly/chi tiêu theo lịch phù hợp API nhưng không thay đổi campaign liên tục trong learning window.

**Ngưỡng hành động:** mỗi experiment phải có thời hạn, primary metric, attribution lag, sample plan, minimum meaningful effect, loss budget và guardrails. Zero conversion chỉ là stop signal theo learning budget đã đặt, không kết luận statistical loser nếu mẫu chưa đủ. Lỗi tracking, unsafe creative hoặc hết cap là lý do pause rõ ràng. AI đề nghị tăng ngân sách phải kèm contribution/retained cohort và uncertainty; cap không tự đổi.

**Đầu ra:** campaign setup pack, test/paused campaign, báo cáo đối soát, 2 chu kỳ thử nghiệm có learning log và quyết định tiếp. Permission/API access production phải được xác minh, không giả định token test dùng live được. [Google Ads API access](https://developers.google.com/google-ads/api/docs/api-policy/access-levels).

**Gate G-M5:** đã đối soát chi phí/tiền thực; ít nhất 2 cohort đủ tuổi cho quyết định scale, không chỉ platform ROAS; cost/retained activated user và contribution đáp ứng ceiling do owner chốt trước; safety/opt-out/quality không xấu đi. Nếu chưa đủ mẫu tiếp tục học trong trần hoặc dừng, không bịa kết luận.

**Manager thử:** xem một ad và exact landing; xem cap; chấp thuận một thay đổi; kiểm readback/audit; bấm pause và xác minh; truy creative→cohort→net contribution. **Rollback:** pause ads/restore setting phù hợp; tiền đã chi không hoàn tác được, vì vậy cap và quyền được kiểm trước action.

## 9. M6 — Đánh giá tách business và pilot khách hàng ngoài

Chỉ thực hiện khi được duyệt riêng sau bằng chứng. Hai việc cần chứng minh riêng: hệ thống hữu ích cho Nilaza và khách hàng khác sẵn sàng trả tiền cho phần có thể tái dùng.

**Tasks:** phân tách domain dependencies; đóng gói BrandPack/claim/funnel onboarding; kiểm tenant isolation/secret scopes/cache/queues/audit/export-delete; usage/billing; template version/migration; hỗ trợ/incident SLA thực tế; tuyển 2–3 design partners đúng phân khúc qua outreach được phép; pilot trả phí 8–12 tuần với baseline/control phù hợp.

**Gate đề xuất:** ≥70% workflow dùng lại bằng config; ≤5 ngày làm việc tới workflow đầu sau khi khách đã cấp đủ dữ liệu/quyền; margin dương gồm human QA/support; có improvement hữu ích lặp lại hoặc giảm đáng kể công người mà không hạ chất lượng. Đây là mục tiêu kiểm nghiệm, không cam kết bán hàng. Một campaign Nilaza thắng không đáp ứng gate.

Business ban đầu có thể là setup + vận hành chuẩn hóa + usage; media budget tách. Chưa định giá SaaS hay cam kết chuyển đổi. Nếu customization và manual work vẫn lớn, ghi đúng là dịch vụ có AI hỗ trợ; quyết định sản phẩm hóa sau.

**Đầu ra:** portability report, design partner evidence, unit economics và go/no-go spin-out. **Rollback:** giữ tool nội bộ Nilaza, không chuyển dữ liệu riêng sang khách khác; không có nghĩa phải bỏ hệ thống nếu chưa bán được độc lập.

## 10. Quyền và dữ liệu xuyên các phase

| Hạng mục | Quy tắc |
| --- | --- |
| Approval | Gắn action/asset hash/account/channel/cap/expiry; chỉnh quan trọng phải duyệt version mới |
| Publish/send | Chỉ thực hiện batch/phạm vi đã cấp; plan approval không phải quyền đăng công khai hoặc gửi khách hàng |
| Budget | Draft và đề xuất trước; mọi spend chạy trong envelope cụ thể; pause/kill có audit |
| Private data | Marketing nhận aggregate/pseudonymous events được phép; không raw chat/journal/birth/photo/email trong model context hoặc logs |
| Product changes | Journey agent tạo ticket; delivery theo kế hoạch A; không thay prompt/UI/pricing tự động |
| Security | Secrets qua connector có scope; tenant isolation trước multi-client; bên ngoài cung cấp nội dung được coi là dữ liệu không đáng tin |
| Public claims | ProductTruth cho phép theo build/platform; hết hạn evidence hoặc feature bị tắt thì review lại ads/queued posts |
| Learning | Ghi segment/channel/window/version/evidence/confidence/expiry; không chuyển learning thành quy luật vĩnh viễn |

## 11. Whole-App Impact Brief và bộ kiểm

Entry mới ở protected Growth Ops/review queue; public endpoints chỉ theo scope landing/waitlist/consent. Data mới là BrandPack, ProductTruth, Brief, Asset, Approval, Job, Experiment, Learning và events giảm nhạy cảm. Một schema canonical cho mỗi contract, version consumer compatibility. Product events do nhánh A sản xuất, nhánh B tiêu thụ; revisions phối hợp qua owner.

Admin thêm module/workspace có quyền, không thay Content Operations/AI Studio. Public Help/legal corpus không nhận tài liệu agent/owner/marketing nội bộ. Rollback bằng pause jobs/channel/tenant, duy trì manual draft/export; không reset data. Các migrations phải qua ledger/owner gate; tool choice hoặc role không cho quyền deploy.

Tests theo phạm vi: contract/schema; approval immutable/expiry; idempotency và unknown receipt; token revoke/rate limit; budget/kill; consent revoke; cohort denominator/lag/currency; tenant/account isolation; audit redaction; worker crash/recovery. Repo skills dùng `skills:validate`, `skills:check` sau sync và Skill Creator validation phù hợp; config/workflows dùng `validate:governance`; Admin/web/mobile checks theo file thực sự thay.

Mỗi phase nộp bản chạy thử, artifact/sample, evidence checks, chi phí và công người, manager test, known limits, rollback và đề nghị phase tiếp. Chủ sản phẩm duyệt phase tiếp; không mặc định toàn bộ roadmap là lệnh thực thi ngay.
