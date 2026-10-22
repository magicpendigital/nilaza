# Framework phòng marketing AI — Nilaza pilot

> Lịch sử blueprint ngày 20/09. Hiện trạng Growth được đồng bộ tại [bàn giao 30/09](GROWTH_OPERATIONS_HANDOFF_2026-09-30.vi.md): core/template draft-only và W0/W1/W2/W6 đã có; Admin đã nối snapshot/readiness/draft/measurement/backlog local. Các cấu trúc “dự kiến/chưa tạo” bên dưới là bối cảnh thiết kế ban đầu. W3 distribution, W4 controlled publishing và W5 paid media vẫn deferred theo config canonical.

Ngày: 20/09/2026. **Blueprint đề xuất, chưa triển khai agent runtime, chưa được phép publish/gửi marketing/mua quảng cáo.**

Đọc trước [đánh giá sản phẩm và GTM](PRODUCT_DIFFERENTIATION_GTM_REVIEW_2026-09-20.vi.md). Mục tiêu là học cách tạo tăng trưởng có chất lượng cho Nilaza, đồng thời giữ ranh giới kiến trúc để có thể sản phẩm hóa sau khi có bằng chứng.

## 1. Hệ thống cần tối ưu điều gì?

Không lấy số bài được tạo hoặc CTR làm mục tiêu cuối. Tối ưu số người mới **nhận được giá trị, quay lại, và tạo contribution phù hợp chi phí**, trong giới hạn thương hiệu, consent và nguồn lực. Tối ưu conversion trước khi biết sản phẩm giữ chân được ai rất dễ tạo traffic rẻ nhưng không tạo business.

North-star thử nghiệm: số người mỗi tuần hoàn thành ít nhất hai phiên có giá trị vào hai ngày khác nhau. Theo dõi cùng useful-rating, action follow-through, tỷ lệ opt-out/report, chi phí AI và paid contribution. Đây là định nghĩa đề xuất; không biến việc kéo dài thời gian chat thành thành công.

Phân biệt ba khối:

- **Product AI** phục vụ người dùng trong Nilaza: Oracle, Persona, Tarot, Council.
- **Marketing AI** nghiên cứu, tạo và kiểm nội dung, phân phối, đo funnel, đề xuất cải tiến.
- **Delivery agents** xây và kiểm phần mềm/skills. Chúng không tự có quyền sản xuất hay chi tiền vì được đặt tên là agent.

## 2. Kiến trúc để có thể tách business

```text
                       Người chịu trách nhiệm tăng trưởng
                                     |
                  Mục tiêu / policy / ngân sách / phê duyệt
                                     |
                    Workflow engine + event/job registry
                   /                  |                  \
             Nghiên cứu        Nội dung + QA        Journey + đo lường
                   \                  |                  /
                       Xuất bản / campaign execution
                                     |
                      Kết quả + chi phí + learning log
                                     |
                  Đề xuất vòng tiếp theo hoặc product ticket
```

| Lớp | Dùng chung trong framework | Nilaza tùy biến |
| --- | --- | --- |
| Control | Workflow state, lịch, phân quyền, approval, audit, chi phí, idempotency | Owner, trần ngân sách, lịch vận hành |
| Business context | BrandPack, ProductTruth, Audience/JTBD, Offer, FunnelMap | Open Reflection, VI/EN, trạng thái tính năng, giới hạn spiritual reflection |
| Intelligence | Skill registry, task routing, evaluator, experiment planner | Tarot/astrology/persona vocabulary, tình huống người dùng, nội dung chuyên biệt |
| Knowledge | Source/license registry, evidence ledger, expiry, versioning | Help công khai, nguồn brand, dữ liệu sản phẩm được phép |
| Execution | Channel adapters, CRM/consent, analytics/cost adapters | Kênh social, waitlist, app events, hệ thống payment sau này |
| Learning | Cohorts, causal experiments, failure analysis, versioned recommendations | Activation và retained-value event riêng Nilaza |

Thiết kế package/interface tách biệt ngay; **chưa xây SaaS multi-tenant đầy đủ** ở pilot. Dùng tên neutral trong core, Nilaza nằm trong adapter/config. Schema sẵn `tenant_id`, scopes, secret references và version; trước khách hàng thứ hai phải chứng minh isolation. Không hardcode voice Tarot hoặc domain Nilaza trong orchestrator.

Đề xuất cấu trúc tương lai, chưa tạo ở lần này:

```text
packages/growth-core/          contracts, state machines, policy, evaluation
packages/growth-adapters/      social, ads, consent, events, warehouse
brands/nilaza/                brand, claims, audiences, journeys, rubrics
skills/growth-*/              các kỹ năng có I/O và bộ kiểm
workflows/growth/             các workflow versioned
apps/growth-ops/              review queue, calendars, experiments, incidents
```

Có thể khởi đầu module protected trong Admin để dùng RBAC/audit sẵn, sau đó tách UI riêng. Giữ nguyên Content Operations và AI Studio. Chưa chốt nhà cung cấp orchestrator: dùng job engine hiện hữu nếu đủ durable retry/approval/idempotency; nếu không thì thử một engine nhỏ có khả năng đó. Không dùng cuộc chat dài như scheduler đáng tin cậy. Không xây connector khi nhà cung cấp được chấp thuận đã giải quyết tốt việc đăng bài.

## 3. Các agent và sub-agent

Đây là vai trò vận hành có thể chạy theo job, không phải 9 tiến trình LLM phải chạy thường trực. Pilot gộp thành 4 nhóm thực thi; phần validator, scheduler và budget nên là code xác định.

| Agent owner | Sub-agent/subtask | Đầu vào → đầu ra | KPI chịu trách nhiệm |
| --- | --- | --- | --- |
| Growth lead/orchestrator | Priority planner, capacity/cost planner | Business goals + evidence → tuần thử nghiệm và phân công | Learning hữu ích, retained activation, cost toàn hệ thống |
| Market/customer intelligence | Competitor researcher, interview analyst, demand monitor | Nguồn công khai/ghi chú được đồng ý → JTBD, vấn đề, giả thuyết | Độ tin cậy, giả thuyết kiểm chứng được |
| Positioning/offer strategist | Segment analyst, message-market-fit planner | ProductTruth + JTBD → message matrix, offer, experiment brief | Qualified activation theo thông điệp |
| Content studio | Copywriter, short-video scriptwriter, visual producer, localization editor | Brief + source/brand packs → creative bundle | First-pass quality, thời gian và chi phí/nội dung được chấp nhận |
| Independent content QA | Claim checker, brand editor, source/IP checker, privacy/safety reviewer, render checker | Bundle + rubric → pass/revise/block với lỗi cụ thể | False-pass, lỗi phải gỡ, độ khớp human review |
| Distribution/community | Channel formatter, scheduler, delivery reconciler, response drafter | Bản đã duyệt + consent/channel rules → publishing record | Delivery đúng, phản hồi phù hợp, traffic có giá trị |
| Journey/lifecycle | Funnel diagnostician, onboarding analyst, lifecycle planner | Events + interviews → friction map, message/test/product ticket | Time-to-value, activation, D7/tuần 4, opt-out |
| Paid acquisition | Media planner, campaign builder, spend monitor, optimization analyst | Approved brief + caps + creatives → campaign proposal/controlled actions | CAC/contribution, retained acquisition, budget compliance |
| Measurement/experimentation | Data QA, cohort analyst, attribution reconciler, causal reviewer | Events/spend/payment → scorecard + quyết định | Dữ liệu đúng, kết luận tái lập, không báo thắng giả |

Nhóm pilot: (1) research/strategy, (2) studio, (3) QA, (4) journey/measurement. Publishing và ads lúc đầu chủ yếu chuẩn bị gói rồi người chịu trách nhiệm duyệt. Cần độc lập giữa tạo và kiểm: QA không đọc phần tự khen của generator; trường hợp quan trọng có người rà lại. Không cần model khác cho mọi job, nhưng nên kiểm tra thiên vị evaluator và giữ đánh giá mù định kỳ.

Nhân sự tối thiểu đề xuất: một owner tăng trưởng chịu quyết định/ngân sách; một biên tập viên tiếng Việt có năng lực nội dung Tarot/tự phản chiếu; một kỹ sư phụ trách tích hợp/dữ liệu; người review privacy/policy theo nhu cầu. Một người có thể kiêm vai nhưng không bỏ trách nhiệm phê duyệt. AI giảm lao động lặp lại, không thay việc hiểu khách hàng hoặc chịu trách nhiệm business.

## 4. Bộ skills cần xây

Mỗi skill phải có: trigger, input schema, output schema, nguồn được phép, quyền công cụ, ví dụ tốt/xấu, rubric, test fixtures, version, owner và stop condition. File prompt đơn lẻ không đủ là skill hoạt động.

| Skill | Kết quả có thể kiểm |
| --- | --- |
| `business-context-onboarding` | BrandPack/ProductTruth với unknowns, owner và ngày xác minh |
| `source-and-claim-research` | Evidence cards có URL, trích yếu, quyền sử dụng, hạn hiệu lực; không lẫn suy đoán với fact |
| `customer-jtbd-research` | Tình huống, động lực, giải pháp hiện dùng, nguyên nhân bỏ cuộc, mức chắc chắn |
| `positioning-and-offer-design` | Segment × problem × benefit × proof × CTA; chỉ dùng tính năng đã đủ trạng thái |
| `campaign-experiment-design` | Hypothesis, audience, control, primary metric, budget, window, stop rule |
| `editorial-calendar-planning` | Lịch có mục tiêu từng bài, lượng sản xuất theo capacity, kênh và chủ sở hữu |
| `content-and-script-production` | Copy/script/shot list/visual brief/caption/alt text, nguồn và claims được gắn ID |
| `brand-asset-and-localization` | Dùng assets có provenance, VI tự nhiên, EN tương ứng, platform format đúng |
| `content-quality-evaluation` | Pass/revise/block; không chỉ điểm tổng; lỗi gắn cụ thể vào claim/frame |
| `content-repair-and-versioning` | Bản sửa có change log; không sửa lan man; chạy QA lại trên phiên bản mới |
| `channel-publishing` | Bản preview, approval bound vào content hash, schedule, external post ID, trạng thái đối soát |
| `community-response-drafting` | Draft theo public Help; escalations cho phàn nàn/rủi ro, không nhập vai chuyên gia trong comment |
| `journey-and-onboarding-audit` | Friction map từ event và nghiên cứu; product ticket kèm manager test |
| `consented-lifecycle-planning` | Trigger, eligibility, consent, frequency cap, exit/suppression và holdout |
| `ads-campaign-operations` | Campaign draft/paused, objective, exclusions, creative IDs, caps, rollback và approval |
| `measurement-and-causal-review` | Cohort/chi phí/denominator/window/uncertainty, tách attribution và incrementality |
| `creative-and-campaign-optimization` | Quyết định giữ/sửa/dừng/thử tiếp kèm bằng chứng và điều kiện đảo quyết định |
| `incident-and-learning-management` | Pause/retract/reconcile, postmortem, learning có phạm vi và ngày hết hiệu lực |

Tái sử dụng skill Nilaza Plan-QC và brand đã có khi triển khai. Skills media chỉ gọi khi cần asset cụ thể; không bắt mọi bài phải sinh ảnh/video mới. Dùng skill-creator khi thực sự tạo/install skill; lần này là bản đặc tả, chưa có skill mới được cài.

## 5. Workflows và sub-workflows

### W0 — Onboard business và kiểm tra readiness

Product owner brief → đọc nguồn được phép → liệt kê audience/offer/claims → kiểm tra trạng thái tính năng → dựng funnel/events → ghi unknowns → owner xác nhận BusinessPack.

Sub-workflows: claim evidence, asset/license inventory, channel capability check, consent mapping, tracking smoke test. Output: gói có version, quyền và readiness per channel. Không biết giá/tính năng thì đánh dấu unknown, không tự điền.

### W1 — Research → kế hoạch tuần

Signal từ phản hồi được phép + market + product metrics → phân loại vấn đề → viết giả thuyết → chấm impact/confidence/cost → chọn tối đa 1–2 thử nghiệm chính → giao brief cho studio/journey/product.

Sub-workflows: kiểm nguồn/ngày, loại duplicate, phân biệt nhu cầu thật và lượt tương tác, rà dữ liệu nhỏ. Stop khi thông tin mâu thuẫn hoặc không có product proof. Kế hoạch tuần phải trả lời “vì sao thử”, “đo gì”, “khi nào dừng”.

### W2 — Sản xuất → tự đánh giá → sửa → duyệt

Brief có mục tiêu/đối tượng/CTA → 2–3 concept → chọn concept → sinh asset theo kênh → deterministic checks → independent semantic QA → sửa tối đa 2 vòng → người duyệt hoặc đưa review queue.

Sub-workflows: claim-vs-feature check; brand/language; source/license; privacy; link/UTM; xem render/caption/crop/audio; duplicate check. Concept không đạt sau 2 vòng trả lại brief, không để vòng agent sửa vô hạn. Lỗi factual, privacy hoặc quảng cáo tính năng chưa có phải block, điểm thẩm mỹ cao không bù được.

QA nội dung 0–4 cho 6 chiều: relevance, specificity, proof, brand, clarity/CTA, platform fit. Ngưỡng pilot đề xuất: mọi chiều ≥3, mọi hard gate pass. Cần hiệu chỉnh rubric bằng review người thật; 3/4 là quy tắc vận hành chứ không phải dự báo bài sẽ chuyển đổi.

### W3 — Publish đa nền tảng

Bản đã duyệt → kiểm hash/version và quyền kênh → đặt lịch → kiểm lại trước giờ gửi → publish API/nhà cung cấp được chấp thuận → nhận receipt → đọc lại trạng thái/public URL → ghi external ID → bắt đầu cửa sổ đo lường.

Sub-workflows: token expiry, rate-limit handling, media processing, retry, reconciliation, takedown. Nếu timeout sau POST, truy vấn trạng thái theo ID trước retry để tránh đăng hai lần. Key chống trùng gồm tenant/campaign/content-version/channel/schedule slot. Approval hết hiệu lực nếu đổi nội dung/CTA/đích đến/phạm vi đã duyệt.

API không hỗ trợ thì tạo gói xuất cho người vận hành; không lách bằng tự động thao tác tài khoản không được cho phép. TikTok Direct Post có audit và hạn chế visibility cho client chưa audit; không hứa mọi kênh sẽ tự publish ngay. [TikTok Direct Post](https://developers.tiktok.com/docs/en/content-posting-api-get-started), [sharing guidelines](https://developers.tiktok.com/docs/en/content-sharing-guidelines).

### W4 — Acquisition → onboarding → activation → quay lại

Creative/landing đúng lời hứa → waitlist hoặc beta link → auth-first → optional goals → trải nghiệm chính → value event → lưu lựa chọn → follow-up opt-in → weekly reflection → offer khi đã có giá trị và thanh toán sẵn sàng.

Sub-workflows: attribution handoff; confirmation/recovery; onboarding drop-off; first-result latency; lifecycle eligibility; unsubscribe/suppression; quiet hours; stopped-user handling. Marketing agent chỉ đề xuất sửa flow; thay app đi qua Product/Plan-QC/test, không tự thay UI production vì conversion giảm.

Lifecycle pilot đề xuất: welcome sau đăng ký phù hợp consent; hỗ trợ quay lại khi dở onboarding; một nhắc nhẹ sau activation nếu opt-in; recap tuần nếu đủ dữ kiện. Tối đa 2 tiếp xúc marketing/7 ngày ban đầu trên toàn kênh, loại transactional; có cooldown và holdout. Đây là đề xuất cần thử, không phải lịch đã kích hoạt. Không đưa tình huống riêng tư lên lock screen/email subject; không bám đuổi người đã từ chối hoặc dùng nỗi sợ “bỏ lỡ vận may”.

### W5 — Thiết lập quảng cáo

Readiness check → xác định objective phù hợp độ trưởng thành → chọn một paid channel → plan audience/placements/creatives/landing → tracking test → campaign draft/paused → preview spend/targeting/claims → owner duyệt scope và trần → activate → kiểm delivery/spend.

Ban đầu thử creative và lời hứa cho cohort phù hợp. Khi conversion event còn ít/chưa tin cậy, mục tiêu tối ưu platform có thể ở chặng cao hơn, nhưng scorecard nội bộ vẫn theo retained activation. Không gọi lead rẻ là campaign tốt. Cần biết platform có đủ volume và độ trễ event trước khi tối ưu sâu.

Sub-workflows: permissions/account health, naming/UTM/deep link, negative keywords khi phù hợp, excluded placements, compliance, daily/lifetime cap, timezone/currency, paused campaign readback. Không giả định mọi API cho phép production: [Google Ads access levels](https://developers.google.com/google-ads/api/docs/api-policy/access-levels).

### W6 — Đánh giá → điều chỉnh content/campaign

Chờ đủ cửa sổ dữ liệu → reconcile spend/conversions → data-quality gate → phân đoạn theo source/cohort/version → xác định điểm rơi funnel → recommendation có uncertainty → cập nhật brief hoặc controlled action → log quyết định → so kết quả sau thay đổi.

| Dấu hiệu | Giả thuyết cần kiểm | Hành động có lý |
| --- | --- | --- |
| Click thấp, nhóm vào vẫn giữ chân tốt | Hook/format chưa rõ | Thử hook khác, giữ product/offer |
| CTR cao, signup thấp | Click tò mò, landing chậm hoặc lời hứa không khớp | Kiểm message match/speed; không vội scale creative |
| Signup tốt, value event thấp | Auth/onboarding/latency/output | Tạo product ticket; giảm hoặc dừng traffic lỗi |
| Activation tốt, tuần sau không về | Giá trị một lần, chưa có progress/follow-up | Diary study, cải thiện loop; không giải bằng thêm notifications |
| Retention tốt, paid thấp | Offer/giá/thời điểm/paywall chưa phù hợp | Kiểm willingness và thử offer minh bạch |
| ROAS platform đẹp, tiền thực thấp | Attribution trùng, view-through, refund hoặc cohort chưa chín | Đối soát net revenue; chưa tăng ngân sách |

Tách sửa creative, audience, bid và product thành thay đổi có version. Không đổi đồng thời mọi biến rồi kết luận đâu là nguyên nhân. Đợi attribution lag; không săn “winner” mỗi giờ. AI được đề xuất; code kiểm budget trước mọi mutation.

### W7 — Feedback sản phẩm và tri thức

Lost activation/retention + feedback được đồng ý → nhóm vấn đề → tạo product hypothesis → người Product chọn → delivery workflow → rollout nhỏ → đọc tác động. Marketing không tự sửa prompt product hoặc công bố tính năng chưa ship.

Learning lưu dưới dạng “với segment S, channel C, offer O, thời gian T, phiên bản V, kết quả E, độ tin cậy U”, không ghi “hook X luôn thắng”. Concept cũ có expiry; audience/platform/product thay đổi phải thử lại.

## 6. Customer journey đề xuất cho Nilaza

| Chặng | Câu hỏi của người dùng | Trải nghiệm/asset | Đo gì | Mất người thì xem gì |
| --- | --- | --- | --- | --- |
| Biết đến | “Có liên quan tới mình không?” | Demo tình huống đời thường, nội dung giáo dục, creator phù hợp | Qualified visits, activation downstream | Hook/đối tượng/lời hứa |
| Cân nhắc | “Khác chatbot ở đâu?” | Ví dụ có nguồn từ build thật; chỉ rõ kết quả và giới hạn | Landing→beta request/start | Proof/niềm tin/clarity |
| Vào app | “Mình phải làm gì?” | Auth-first, goals Skip, một CTA Home | Auth completion, goals completion, time-to-first-result | Email/deep link/tải/chờ |
| Giá trị đầu | “Mình mang đi được gì?” | Tarot hoặc một guide, một insight/hành động tự chọn | Result viewed, useful rating, saved/action chosen | Output chung chung, thiếu context |
| Quay lại | “Vì sao mở tiếp?” | Tiếp tục việc trước, follow-up được phép, recap đủ dữ kiện | Repeat value days, D7/tuần 4 | Giá trị một lần, memory sai |
| Trả tiền | “Lợi ích thêm có đáng không?” | Depth/progress/advanced flow đã chạy thật | Net payer conversion, refund, contribution | Paywall quá sớm, value/cost mismatch |
| Giới thiệu | “Mình có muốn chia sẻ không?” | Card chia sẻ được biên tập; mặc định không có private question | Share→new valued user | Export chưa thật, không có payoff |

Ba giả thuyết creative đầu: (A) nghi thức phản chiếu ngắn với Tarot; (B) diễn tập một cuộc trò chuyện khó bằng guide; (C) nhìn lại lựa chọn sau một tuần. C chỉ quảng cáo khi progress loop đã được kiểm chứng. Astrology có landing concept riêng ghi rõ “đang chuẩn bị” nếu chưa sẵn sàng, không dẫn khách vào lời hứa không thực hiện được.

Kênh giả định cho Việt Nam: khám phá bằng short video trên TikTok/Reels; xem xét Facebook/Instagram/community theo dữ liệu phỏng vấn; landing/Help là nơi giải thích; email/in-app giữ quan hệ khi opt-in. Chọn một kênh chính, một kênh tái sử dụng nội dung và owned landing/email; không bắt đầu 6 nền tảng cùng lúc. Đây là giả thuyết kênh, chưa chứng minh audience Nilaza ở đâu hay CAC thấp nhất ở đâu.

Creator outreach chỉ chuẩn bị shortlist/brief/draft trong giai đoạn chưa có quyền liên hệ. Hợp tác thực cần quyền gửi, điều kiện sử dụng nội dung, disclosure và cách đo referral. Không scrape contact riêng tư, không dùng spam DM để gọi là automation tiếp cận khách hàng.

## 7. Data contracts và đo lường

| Đối tượng | Trường tối thiểu |
| --- | --- |
| `BrandPack` | tenant, version, voice, locale, asset roles, prohibited claims, owner |
| `ProductTruth` | feature, status per environment/platform, allowed claim, proof, checked_at, expiry |
| `CampaignBrief` | hypothesis, segment, offer, objective, metric, control, channels, budget/currency/timezone, stop rule |
| `ContentAsset` | brief/claim/source refs, content version/hash, model/skill version, QA result, cost |
| `Approval` | actor, scope, immutable target hash, allowed channels/actions, cap, expiry |
| `PublishJob` | idempotency key, state, attempts, external ID, receipt, error, next retry |
| `Experiment` | assignment unit, population, window, primary metric, guardrails, analysis plan |
| `Learning` | evidence refs, segment/window, confidence, decision, expiry, owner |

State machine chung: `draft → generated → checked → revise/blocked/awaiting_approval → approved → scheduled → executing → verified/failed/unknown → measured → archived`. Trạng thái `unknown` bắt buộc đối soát, không coi là thất bại rồi thực hiện lại mù. Mỗi transition có audit, cost/time budget, retry cap và owner.

### Event spine

Đề xuất: `landing_view`, `waitlist_submitted`, `auth_completed`, `onboarding_completed`, `first_result_viewed`, `reflection_value_recorded`, `action_selected`, `followup_completed`, `share_completed`, `purchase_confirmed`, `refund_confirmed`, `consent_changed`.

Mỗi event có event_id chống trùng, timestamp UTC, business timezone, schema/app/feature version, experiment assignment, user/account pseudonymous ID khi hợp lệ, session/campaign/creative/source IDs được phép. Không đưa raw chat, câu hỏi Tarot, birth data, mood chi tiết, ảnh mặt hoặc email vào marketing event payload. Consent identity được xử lý trong hệ riêng có quyền, không để agent tự nối danh tính.

Tách `generated` (backend), `viewed` (client thật), `value_recorded` (người dùng xác nhận hữu ích hoặc chọn/lưu bước của mình). Dedupe value tối đa một lần cho cùng session/action. Không tự đánh dấu hữu ích vì model chấm output cao. Nên báo riêng self-reported usefulness và behavioral save để tránh đánh tráo save thành giá trị thật.

MVP attribution dùng UTM/referral với consent và app handoff phù hợp. Không hứa nối hoàn hảo qua app store/cross-device; không fingerprint. Khi mở paid app acquisition, đánh giá MMP/attribution API theo nền tảng và consent. Ghi rõ phần unattributed, không tự gán về organic. Dùng billing receipt/backend làm nguồn tiền chuẩn; log model làm nguồn cost, ads API làm nguồn spend có currency/timezone.

### Định nghĩa KPI

| KPI | Định nghĩa đề xuất |
| --- | --- |
| Activation 24h | Người mới có value event trong 24h / người mới đủ điều kiện, loại tài khoản test/bot theo quy tắc cố định |
| Time-to-value | Thời gian từ first open/auth start được chọn trước tới value event đầu; median và P90, cùng completion rate |
| D7 | Người trong cohort first-open có value event ở ngày tuổi 7 / toàn cohort đã đủ 8 ngày; định nghĩa timezone trước |
| Weekly return | Người có value event ở ngày tuổi 7–13 / toàn cohort đã đủ 14 ngày; không gọi đây là D7 |
| D28 / tuần 4 | Báo riêng exact day 28 và cửa sổ ngày 22–28; chỉ dùng cohort đủ tuổi |
| Cost/retained activated user | Chi phí acquisition của cohort / người activation rồi đạt tiêu chí quay lại đã định nghĩa |
| Paid CAC | Acquisition cost / người trả tiền mới xác thực; báo media-only và fully loaded riêng |
| Contribution | Tiền thực sau refund/store/payment fees/thuế xử lý phù hợp, trừ AI/infra/support biến đổi; tránh trừ phí hai lần |
| Payback | Khi contribution tích lũy của cohort bù CAC; chưa đủ tuổi thì ghi chưa quan sát |
| QA efficiency | Chi phí và phút người review / asset được duyệt; false-pass và incident rate |

Contribution sau acquisition phải trừ cả content production/tool/human cost phân bổ. ROAS nền tảng là báo cáo attribution, không chứng minh tăng trưởng do quảng cáo gây ra. “Người trả subscription” và “người dùng app quay lại” là hai retention khác nhau.

Ngân sách chưa biết nên dùng công thức: `B_test ≤ min(số tiền chấp nhận mất, N_retained_target × CAC_retained_ceiling)`. Đây là trần khả năng chi, không bảo đảm đủ mẫu. CAC ceiling lấy từ contribution thận trọng trong cửa sổ payback đã chọn, không từ LTV dự đoán nhiều năm khi chưa có retention. Nếu chưa bán thật, chỉ đặt learning budget; không suy paid CAC từ waitlist.

### Thử nghiệm và kết luận

15–20 phỏng vấn và 30–50 beta users phục vụ học định tính và phát hiện lỗi; không đủ để khẳng định uplift nhỏ. Khi A/B định lượng, chọn trước baseline, minimum detectable effect, đơn vị randomization, alpha/power hoặc Bayesian decision rule và thời hạn; tính sample size trước chạy. Không lấy số 100 hay 300 bất kỳ làm chứng cứ đủ mạnh.

Giữ control đủ điều kiện; cohort theo source/platform/version; phân tích intent-to-treat; không loại người bỏ dở để làm đẹp activation. Với kênh paid, randomized holdout/geo test khi quy mô cho phép; matched cohorts chỉ là bằng chứng yếu hơn và ghi rõ confounding. Không dừng sớm vì số đẹp nếu chưa có sequential design. Có thể dừng ngay vì lỗi safety, tracking hoặc vượt ngân sách theo rule đã duyệt.

## 8. Quyền tự động hóa

| Mức | Được thực hiện sau khi hệ thống được triển khai và giao quyền | Cổng |
| --- | --- | --- |
| L0 | Nghiên cứu public, draft, QA, phân tích dữ liệu được phép | Có source/scope/cost cap |
| L1 | Chuẩn bị publish package và campaign draft | Owner duyệt trước external execution |
| L2 | Đăng/schedule nội dung thuộc batch đã duyệt, lifecycle theo consent và template đã duyệt | Approval gắn version, channel, expiry, frequency; chỉ trong capability nền tảng |
| L3 | Pause hoặc điều chỉnh ads trong envelope đã duyệt | Hard caps, audit, kill switch, metric freshness, rollback; quyền cụ thể được owner cấp |
| L4 | Tự mở thị trường/kênh/ngân sách mới hoặc thay positioning/offer quan trọng | Không cấp tự động trong pilot |

Vai trò marketing không có quyền đọc raw chat/journal/birth/photo. Agent không nhận secrets; chỉ tool connector kiểm quyền. Không dùng emotional vulnerability, mood, câu chuyện chia tay hoặc dữ liệu sinh làm targeting. Google có giới hạn đối với sensitive-interest personalization; cần kiểm tra từng nền tảng/thị trường tại lúc triển khai, không mặc định consent cho phép mọi cách dùng. [Google personalized advertising policy](https://support.google.com/adspolicy/answer/143465?hl=en).

Automatic spend control phải là code trước mỗi action, đồng thời có daily/lifetime caps ở platform khi hỗ trợ. Lag và overspend platform có thể tồn tại; đặt buffer, đối soát và kill switch, không hứa không bao giờ vượt tuyệt đối. Quy tắc tăng/giảm ngân sách do owner chốt theo dữ liệu; không để agent tự nâng trần vì “có tín hiệu tốt”.

Quyền trong lượt lập kế hoạch hiện tại không bao gồm publish, email/DM, tài khoản quảng cáo hoặc tiền. Khi triển khai có thể phê duyệt batch/envelope cụ thể để không hỏi lại từng hành động đã nằm trong quyền.

## 9. Backlog 12 tuần, đi theo gate thay vì hứa ngày launch

Giả định có một engineer chuyên trách, owner tăng trưởng và editor hỗ trợ. Ước lượng cần chỉnh sau discovery; đây không phải cam kết delivery hoặc lý do trì hoãn đến tuần 12 mới học khách hàng.

| Giai đoạn | Sản phẩm Nilaza | Marketing framework | Điều kiện qua cổng |
| --- | --- | --- | --- |
| Tuần 1–2 | Audit active prompts/models; sửa Persona continuity/handoff; thiết kế eval; phỏng vấn | BusinessPack, claim registry, funnel/event spec, 6–9 creative draft | Manager thử nhiều lượt thành công; không claim tính năng chưa có; event smoke test |
| Tuần 3–4 | 3 guide packs, Tarot synthesis, đo chất lượng; closed beta 30–50 người khi ready | W1/W2 chạy draft-only, reviewer calibration, dashboard cohort đầu | Không lỗi nghiêm trọng; phiên có output cụ thể; QA được người kiểm |
| Tuần 5–6 | Follow-up/progress đầu; quyết định Astrology từ nghiên cứu và calculator gap | Một publishing adapter với phê duyệt; lifecycle consent/holdout | Publish retry không trùng, unsub có hiệu lực; đọc được vòng quay lại |
| Tuần 7–8 | Astrology slice nếu qua gate; payment sandbox trước bán | Một paid channel thử ngân sách nhỏ nếu readiness đạt; spend reconciliation | Không chỉ CTR/lead; cost/retained value và output quality đạt điều kiện đặt trước |
| Tuần 9–12 | Cải thiện điểm rơi retention, chuẩn bị release tương ứng nền tảng | Tối ưu creative/offer có control; đánh giá prototype portability | Ít nhất 2 cohort đủ tuổi; unit economics có dữ liệu; không scale nếu fail |

Ngay trong tuần đầu có thể làm research/creative/đo lường thiết kế. Mời beta có giới hạn sau cổng vận hành; không cần chờ full astrology. Paid scale phải chờ dữ liệu đủ tuổi; lịch không ép hệ thống bỏ qua gate.

Ưu tiên nguồn lực giai đoạn đầu: phần lớn vào product value + đo lường, phần còn lại vào content thử và automation tối thiểu. Chưa dựng toàn bộ nhà máy 18 skill trước khi có một workflow ra kết quả. Vertical slice đầu cho framework: **brief → 3 concept → 1 creative hoàn chỉnh → QA → người duyệt → publish đã cấp quyền → attribution tới activation → learning note**.

## 10. Khả năng thành business độc lập

Thị trường đã có [Jasper IQ](https://www.jasper.ai/jasper-iq) gắn brand/product/knowledge vào nội dung và [HubSpot Social Media Agent](https://www.hubspot.com/products/marketing/social-media-ai-agent) dùng ngữ cảnh doanh nghiệp và hiệu suất social để đề xuất bài. Vì vậy “nhiều AI agents tạo bài đúng brand” không phải định vị mới đủ mạnh.

Business hypothesis tốt hơn: **hệ điều hành thử nghiệm tăng trưởng cho app subscription đội nhỏ, nối creative với activation, retention và contribution, có quyền tự động hóa kiểm soát được**. Bắt đầu ngách gần Nilaza; chưa khẳng định thị trường này chưa có đối thủ hoặc sẵn sàng trả tiền.

Lợi thế tiềm năng: bộ workflow đã kiểm chứng theo ngành, model đánh giá hiệu chỉnh bằng người thật, mappings product truth→claim→creative→cohort, giảm công vận hành, connector/audit đáng tin. Không dùng dữ liệu riêng Nilaza làm tài sản chung; chỉ chuyển generic code/template, hoặc learnings đã được cho phép và không lộ cá nhân/khách hàng. Không học xuyên tenant mặc định.

Gate spin-out đề xuất:

1. Nilaza có kết quả lặp lại qua ít nhất 2–3 chu kỳ thử nghiệm, với baseline/control, cost người và phần mềm đầy đủ. Một campaign thắng chưa đủ.
2. Có 2–3 design partners ngoài Nilaza, cùng phân khúc business, chịu trả phí thử. Không chỉ xin lời khen.
3. Phần lớn workflow dùng lại bằng cấu hình; đo tỷ lệ customization và thời gian onboarding thực tế. Mục tiêu giả định: ≥70% tái sử dụng, ≤5 ngày làm việc từ đủ quyền/dữ liệu tới workflow đầu.
4. Có uplift có ý nghĩa kinh doanh hoặc giảm công người đáng kể mà không giảm chất lượng/retention; báo uncertainty, không gán mọi tăng trưởng sau nâng product cho marketing framework.
5. Gross margin dương sau LLM/media/API/human QA/support; tenant isolation, permissions, export/delete, billing và incident support qua kiểm thử.

Trước SaaS nên thử dịch vụ triển khai có gói workflow chuẩn: setup + monthly operations/platform + usage minh bạch; ngân sách media tách riêng. Chưa chốt giá. Không hứa “đảm bảo conversion” hoặc dùng performance fee dựa trên attribution không kiểm chứng.

Nếu doanh thu chỉ có khi người sáng lập làm tư vấn thủ công nhiều giờ cho mỗi khách, sản phẩm đang là dịch vụ, chưa phải framework scale tốt. Điều đó có thể là business hợp lệ, nhưng phải định giá và đo margin đúng.

## 11. Plan-QC, acceptance và handoff

**Phạm vi lần này:** hai tài liệu mới trong `docs/`. Không sửa runtime, brand, giá, campaign hoặc database. Không đưa nội dung nội bộ vào public Help/corpus. Không thay đổi các phần repo đang được làm ở task khác.

**Impact dự kiến khi triển khai:** landing/deep links/onboarding và module Admin; event/storage/contracts mới có version; analytics chỉ tổng hợp; consent/deletion liên thông; claim registry khóa vào release evidence; connector có quyền và audit; rollout tắt được. BrandPack Nilaza dùng master/manifest Open Reflection hiện hành. Không fork canonical Council contract. Database migration phải theo ledger/owner approval.

**Đường nghiệm thu manager cho framework đầu:** mở brief → xem proof từng claim → so 3 concept → QA chặn một claim cố tình sai → duyệt bản cụ thể → sửa một chữ làm approval không còn hợp lệ → dùng test channel thử timeout/retry không tạo duplicate → xem receipt/URL → theo test user tới activation → thu hồi consent và thấy lifecycle dừng → so cost/learning. Bản đầu dùng dry-run/test account; đăng công khai chỉ sau quyền tương ứng.

**Kiểm tra kỹ thuật tương lai:** schema/contract validation; deterministic policy tests; adapter sandbox integration; approval hash/expiry; idempotency; account/tenant isolation; consent revocation; rate limit/token failure; budget cap; kill switch; missing/late/duplicate events; cohort eligibility; currency/timezone; audit redaction. Mobile/Admin/web checks theo tuyến thực sự sửa. Tạo skills thật phải chạy skill validation/drift và `validate:governance` khi thay config vận hành.

**Kiểm tra tài liệu lần này:** đọc chéo evidence với mã; đếm seed bằng JSON parse; kiểm đường dẫn nội bộ, UTF-8 và không có thay đổi ngoài hai tệp. Không chạy regression app vì chưa sửa app. Các test device trong review sản phẩm là bằng chứng lịch sử từ biên bản, không phải đã chạy lại trong task này.

**Unknowns cần giải quyết trong discovery:** người dùng mục tiêu cụ thể, kênh/account quyền thật, budget chịu mất, active DB prompts, production readiness, doanh thu/giá, baseline conversion, AI cost, nguồn nội dung được cấp phép, người chịu trách nhiệm editorial/ads. Các unknown này không ngăn lập kế hoạch nhưng ngăn kết luận “đã hiệu quả” hoặc tự mở campaign.

**Bước triển khai nên giao đầu tiên:** một sprint “giá trị Persona/Tarot + đo activation”, cùng workflow marketing draft→QA. Sau sprint dùng benchmark và beta feedback quyết định đầu tư tiếp vào Astrology, Council sâu hay vòng retention; không mặc định thêm nhân tướng học để chữa conversion thấp.
