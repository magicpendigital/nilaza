# Nilaza — kế hoạch sửa lỗi và hoàn thiện MVP

Ngày lập: **01/10/2026**, Asia/Bangkok. Đây là baseline kế hoạch trước triển khai. Owner đã đồng ý triển khai; trạng thái thực tế được cập nhật riêng tại [board triển khai](mvp-remediation/2026-10-01/baseline-and-board.vi.md) và `execution.json`, giữ `backlog.json` như snapshot kế hoạch. Căn cứ: [review ngày 30/09](reviews/2026-09-30/REPORT.vi.md), PRD và cấu hình Agent hiện hành. Mỗi task phải kiểm tra lại source/build khi bắt đầu; audit cũ không chứng minh bản đang chạy vẫn cùng trạng thái.

Trạng thái của snapshot `backlog.json` khi lập là **kế hoạch triển khai; chưa thực hiện**. Đây là nhãn lịch sử của baseline được giữ nguyên, không phải trạng thái tiến độ hiện tại; dùng board và execution overlay để xem các lát cắt đã triển khai.

## 1. Đích nghiệm thu

Đề xuất chia thành ba cổng để chủ sản phẩm biết chính xác đã đạt giai đoạn nào:

| Cổng | Mục tiêu | Điều bắt buộc |
| --- | --- | --- |
| **G1 — MVP beta miễn phí có giới hạn** | Mời nhóm nhỏ sử dụng thật: onboarding → phản chiếu/chát/Tarot → lưu/viết → quay lại | Core journey, dữ liệu/privacy, quota, AI grounding, Admin quản lý cấu hình thật, CI và RC native Android/iOS đạt; tính năng chưa đạt được đóng rõ |
| **G2 — MVP thương mại** | Có thể bán Premium và khôi phục quyền lợi đáng tin cậy | G1 + purchase/restore/receipt/webhook/expiry/refund, entitlement/credits server, giá/quyền lợi và Premium AI được kiểm chứng |
| **G3 — Phát hành store** | Người dùng tự tải, đăng nhập và dùng trên nền tảng công bố | CI/manifest/signing, thiết bị Android/iOS tương ứng, privacy/payment disclosures, support và quyết định phát hành |

G1 là mốc gần nhất được đề xuất, không thay thế toàn bộ yêu cầu monetization trong PRD. G3 có thể là bản miễn phí đạt G1 trước G2; chỉ công bố nền tảng đã nghiệm thu. Có thể chạy pilot Android trước, nhưng chưa gọi toàn bộ MVP đạt khi iOS còn chưa nghiệm thu. G2/G3 có cổng riêng, không tự động đạt khi G1 đạt.

**Core G1:** auth/profile; Home/Today Pulse/Oracle; Persona; Tarot; Journal/saved insights, ghi chú và mood; privacy/export/delete; basic Admin; server usage limits. Giữ chart/mythology A3/A4 đã duyệt và kiểm thử lại. Council và Astrology AI chỉ mở cho cohort khi các gate riêng đã đạt; nếu chưa đạt, giữ capability trong Admin và trạng thái khả dụng trung thực ở mobile, không quảng bá như feature hoàn chỉnh.

Manual note là yêu cầu PRD 6.7: triển khai trong Journal và dùng cùng lifecycle. Home vẫn chỉ có Today Pulse, Chat và Journal theo brand; không thêm CTA note độc lập trên Home. Free/Premium quotas phải được chốt trong bảng quyền lợi ở R00; không lấy luồng QA rút ba lá làm bằng chứng free tier được quyền đó.

**Để sau core:** face reading, community, reader marketplace, thêm deck/guide/ngôn ngữ, voice, RAG thư viện sách, image share renderer, AI optimizer/AB traffic tự động và external A2UI protocol. Text share hiện có phải ghi đúng tác dụng. Performance refactor và asset delivery làm theo số đo, không tái viết toàn app trước khi sửa core.

## 2. Agent nào thực hiện?

**Chưa cần tạo Agent cố định mới.** Các role đã có trong [coding-agents.json](../packages/agent-config/coding-agents.json) và [workflow lanes](../packages/agent-config/feature-workflows.json) đủ để giao việc. `status: active` là khai báo role; không tự khởi chạy công việc. Điều phối viên phải tạo handoff cho từng task.

| Trách nhiệm | Owner có sẵn | Cách thực hiện |
| --- | --- | --- |
| Kế hoạch/impact/preflight | `plan_qc_agent` | Tôi có thể đảm nhiệm trực tiếp; kiểm tra trước và sau mỗi slice |
| Scope, Admin, acceptance | `product_manager_agent` | Owner lane Admin; giao executor sửa editor/runtime UI, giữ cả protected workspaces |
| Mobile và tích hợp App.tsx | `mobile_app_agent` | Tôi hoặc một phiên Agent coding đảm nhiệm; một owner tích hợp App.tsx |
| Backend, sync, quota, AI contract | `workflow_orchestration_agent` | Owner backend lane hiện có; có thể giao subagent chuyên backend cho task, không cần đăng ký role mới |
| Copy, Tarot, persona prompts | `content_data_agent` | Dùng các subagent bilingual/IP/safety và skill Tarot đã có |
| UI/design system | `design_sync_agent` | Review layout/brand; mobile owner triển khai code |
| Security/privacy/dependencies | `security_privacy_agent` | Review từng slice; executor tương ứng sửa code, không tự sửa production |
| Test, E2E và retest độc lập | `qa_review_agent` | Điều phối evidence và ba customer QA roles |
| Build/store/pilot | `release_readiness_agent` | Chốt manifest/device/release checklist, phối hợp chủ sản phẩm |

Ba role QA khách hàng có sẵn: `gen_z_discovery_customer_qa_agent`, `emotional_reflection_customer_qa_agent`, `wisdom_mentor_customer_qa_agent`. Chạy sau coding và retest trên build mới; chúng là mô phỏng, không thay nghiên cứu khách hàng thật. [Playbook](CUSTOMER_PERSPECTIVE_QA.md).

Có thể khởi tạo **phiên subagent tạm** cho sync/privacy, AI/Admin, performance hoặc billing dưới owner trên. Chỉ cân nhắc Agent cố định chuyên backend/AI/billing khi có công việc vận hành lặp lại và owner lâu dài; không thêm role chỉ để chia một backlog. Không thêm runtime persona hoặc “hội đồng nhiều model” để sửa lỗi delivery.

## 3. Lộ trình theo thứ tự phụ thuộc

“Bắt đầu local” nghĩa là có thể giao coding sau discovery/preflight của task; không đồng nghĩa đã có quyền deploy hoặc đã đủ điều kiện nghiệm thu live. “Cần gate” vẫn có thể làm thiết kế contract/code/tests cục bộ trước; live phải chờ môi trường và kiểm chứng. Chi tiết handoff nằm trong [backlog 26 task](mvp-remediation/2026-10-01/backlog.json).

| Đợt | Task | Công việc cụ thể | Có thể triển khai / điều kiện ra khỏi đợt |
| --- | --- | --- | --- |
| **0 — Baseline và quyền sở hữu** | R00–R03; R19a sau R00/R01 | Chốt scope/quotas và source state; điều tra mobile Astrology timeout/web EPERM; chuẩn bị forward path migration; triage security/dependency reachability; đo baseline release | Bắt đầu read-only/local. Gate database cần owner và nguồn migration thiếu; không auto repair. Chốt backlog, baseline và owner trước tối ưu/tích hợp |
| **1 — Trải nghiệm và dữ liệu đáng tin** | R04–R09, R20 | Tarot first fold/intention/back; chuẩn component; auth/account isolation; Journal edit/delete/sync/reopen/note; export/cloud deletion; semantic QC Tarot VI/EN | UI/content/local có thể bắt đầu cùng contract backend. Cloud acceptance chờ R02 và authenticated Staging. Đạt vòng lưu–sửa–quay lại–xóa và error/retry |
| **2 — Quyền lợi, ngân sách và runtime AI** | R10–R16 | Entitlement/quota/idempotency; ngày reflection/quota; trace metadata; prompt purpose/version/publisher; grounding/handoff; Council active-version/atomic publish; Test Run thật | Backend/Admin/content có scope riêng chạy song song. Mobile integration tuần tự. Mỗi cấu hình publish phải chứng minh request mới dùng đúng version |
| **3 — Chất lượng và performance** | R17–R18, R19b, R21 | Astrology candidate qua đường inference hợp lệ; chart/native caveats; tối ưu bottleneck đã đo; suite AI và safety, rollback/retest | R17 conditional nếu mở Astrology AI; giữ Premium guard. So sánh với baseline R19a; đánh giá output model thật, không draft/mock |
| **4 — RC và nghiệm thu G1** | R22–R23 | Security/account E2E, CI, Android/iOS native QA, ba customer roles; UAT/pilot nhỏ, instrumentation và support | Chỉ mời người thật sau technical gate. Owner đánh giá đúng artifact/build; cần thiết bị và môi trường được cấu hình |
| **5 — Thu phí và store** | R24–R25 | Sandbox purchase/restore/webhook/refund/expiry; prices/benefits; iOS/Android signed RC, disclosure và release | R24 đạt G2; R25 đạt G3 cho từng nền tảng. Cần tài khoản vendor/store, thiết bị và quyết định phát hành |

Đường găng G1: R00 → baseline/security gates → auth/data/privacy + quota → runtime/prompt/evaluation → native RC → pilot. Sửa hero/copy/components chạy song song từ đợt 1. Council/Astrology AI không được lặng lẽ đánh đạt nếu bị đóng; ghi rõ tính năng nào thuộc build G1.

Lịch hiện dùng thứ tự phụ thuộc và điều kiện hoàn tất, chưa cam kết ngày release. R00/R01 chốt ước lượng từng card sau khi tái lập build, xác định blocker và số executor thực tế; điều phối cập nhật đường găng khi gate bên ngoài thay đổi. Có thể chạy tối đa ba lane độc lập, nhưng công việc chung App.tsx/Admin/schema vẫn tích hợp tuần tự.

### Các gói cần làm đầu tiên

1. **R00/R01:** ghi reviewed source state, dedupe findings và sửa test/build gate đỏ; không chỉ tăng timeout để che lỗi.
2. **R04:** sửa intrinsic height 640 px ở Tarot intro bằng ratio wrapper/height xác định; đưa tên và short value lên first fold; giữ artwork đầy đủ; xử lý intention và lựa chọn deck trùng.
3. **R20:** QC câu lỗi của Three of Swords và các rank-three; mở rộng kiểm tra semantic 78 canonical cards VI/EN, không chỉ schema lint.
4. **R02/R03:** phục hồi/review migration source và security triage; song song chuẩn bị contract Journal/quota/AI, chưa write live.
5. **R07/R12:** Journal local durability/cloud contract và AI provenance. Đây là nền để không báo “đã lưu” hoặc “đã tối ưu” khi chưa chứng minh.

## 4. Công việc cụ thể và điểm nghiệm thu của từng nhóm

### Auth, Journal và privacy

- Auth-first/goals/skip/resume/recovery; callbacks từ account A không ghi state của account B khi đổi tài khoản giữa request.
- Repository Journal có IDs/version/ownership rõ; queue offline tồn tại qua restart; update/delete idempotent, conflict có chính sách; deletion không hồi sinh sau reconnect.
- Reopen Tarot đúng snapshot/cards; chat đúng persona/session; Astrology đúng chart/report; source mất thì giải thích và cho đọc snapshot, không mở sai feature.
- Note độc lập/note trên insight/mood dùng cùng save/error/sync; giữ draft khi back/tab/restart; delete có xác nhận hoặc undo phù hợp lifecycle.
- Export tạo file mở được và chỉ chứa dữ liệu tài khoản. Account cloud deletion có phạm vi/retention, request→processing→failed/retry→completed; cache/session bị thu hồi đúng, không dùng clear-local làm bằng chứng xóa server.
- Test bằng hai tài khoản giả lập trên hai clients; disk/network failures phải được hiển thị, không báo success giả. Destructive acceptance chỉ trên tài khoản Staging disposable, theo xác nhận tại hành động cuối.

### Entitlement, quota và AI/Admin

- Tier/rights đọc từ server; loading/error không mặc định mở Premium. Free/Premium/expired/offline có behavior rõ; owner preview là preview, không bypass guard.
- Quota cho mọi AI endpoint; reserve/settle/refund hoặc semantics tương đương được chốt; retries/concurrent requests không vượt budget/trừ lặp; `/deduct` path được xác minh. Giới hạn theo ngày server chống việc đổi timezone để nhận thêm quota.
- Trace và saved result giữ requestId, prompt/config/route versions, actual model/provider, fallback/schema status. UI phân biệt online result, local fallback và lỗi; không đưa model ID kỹ thuật vào trải nghiệm nếu không hữu ích.
- Persona base/handoff prompt lookup theo purpose/pointer, không “global mới nhất”. Tarot/Oracle runtime consume đúng canonical prompts; Admin Content bundle và AI prompt publishers có ranh giới rõ; experimental route không tự áp cho toàn bộ users.
- Council giữ contract version tách config version; normal request resolve active config hợp lệ. Publish transaction/CAS: fail giữa chừng giữ bản active, hai publish đồng thời không mất update; không gọi fallback cấu hình là local AI answer. Giữ thiết kế một provider call, thể hiện là nhiều lăng kính.
- Test Run dùng cùng assembler/validators với consumer trong endpoint QA được bảo vệ và có quota; fictional fixtures, trace/result/version/cost thực khi có dữ liệu. Không expose raw user history, secret hoặc thêm service-role quyền cho client.
- Admin editor giữ dirty state khi đổi panel/reload; đổi prompt staging→readback→normal app request→trace đúng version; rollback version mới được test. Giữ Content Operations/AI Studio và mọi workspace liên quan đang có.
- Với Front-end Content/assets, R13/R16 phải nối consumer contract, kiểm compatibility và đọc lại version nếu control được mở live; control chưa nối phải khóa hoặc ghi rõ preview. G1 không bắt buộc triển khai tải artwork động.
- Persona không viện card/reading khi chưa có context. Handoff dùng typed card IDs/orientations/caveats/provenance riêng với text prefill; sửa câu hỏi không làm mất dữ kiện. Tarot “Vì sao?” giải thích đúng selected cards/positions; câu hỏi chung không áp sự kiện chia cắt/đau đã xảy ra.
- Astrology giữ deterministic facts/unknown-hour caveats. Chỉ publish candidate sau baseline/candidate test với cùng facts/model/route/token policy và consumer inference hợp lệ; không dùng endpoint legacy để nghiệm thu prompt Insight.

### UI/design system và performance

- Chuẩn hóa shared button/icon/form/chip/status/chat states: vùng chạm48 logical px, selected/disabled/error/focus, labels VI/EN, motion preference, font hierarchy. Dùng A2UI nội bộ, không thêm external protocol để tăng tính năng.
- Persona positioning có new-message behavior nhưng không kéo người đang đọc lịch sử; quick reply theo context; keyboard/back không mất draft. Today Pulse theo ngày reflection được chọn, quota server dùng semantics riêng được chốt.
- First fold normal font: tên bộ, short value, Free/Premium và CTA rõ ở 360×640/390×844. Font 200% vẫn tới được actions; không ép mọi nội dung lên một fold khi font lớn. Các hero/thumbnail/native asset slots được kiểm tra riêng.
- R19a đo release sau R00/R01, ghi source/hash/artifact, thiết bị/mạng và các sửa gate đã có trước baseline; làm trước tối ưu. R19b sau R05/R07/R12 xử lý bottleneck đo được ở lists, root scroll updates và persistence, rồi so cùng điều kiện. Chỉ thêm optional download/cache sau manifest/integrity/offline/rollback contract.
- Legacy backups/mock code được đánh historical; xóa sau reachable analysis, không gom unrelated owner work. Không hứa binary giảm chỉ từ việc tách component.

## 5. Tiêu chí đạt G1 — checklist nghiệm thu MVP beta

Các số dưới là **mục tiêu đề xuất**, chưa phải số đo hiện tại; R00 ghi thiết bị, mạng, corpus và budget được dùng để nghiệm thu.

| Nhóm | Tiêu chí bắt buộc / cách chứng minh |
| --- | --- |
| Chức năng | Toàn bộ journeys được mở trong build có happy/loading/empty/error/retry; onboarding lưu/retry/skip/resume đúng, Today Pulse cùng ngày không duplicate; Tarot lần 2 bắt đầu 0/N và không giữ result/cards cũ |
| Dữ liệu | Save/edit/delete/note/reopen qua 2 clients và restart đạt; offline→online không mất/nhân đôi/hồi sinh; lỗi disk không báo success; account A không đọc/sửa/xóa B; export file và account deletion lifecycle được xác minh |
| Usage/Premium foundation | TierUI khớp authoritative server; quota mọi AI endpoint; concurrent/retry idempotent; server bảo vệ premium. G1 có thể chưa bán, nhưng paywall/purchase chưa hoạt động phải ghi đúng và không nhận tiền |
| AI grounding/safety | Không unsupported cards/placements/factIDs hoặc giả ký ức; không deterministic/professional directives; urgent danger vào safety path cả online/fallback. Request “một việc” cho đúng một việc. 0 safety hard fail và 0 grounding hard fail trong corpus áp dụng |
| AI usefulness | Ít nhất 14 case × 3 lần/config: 10 development + 4 holdout do QA giữ. Hai reviewers độc lập, không phải tác giả, chấm blind trên thang 0–4; từng case/chiều áp dụng có median ≥3 qua ba lần ở cả hai reviewers, không output nào ≤1. Chênh ≥2 điểm cần reviewer độc lập phân xử trước gate. Exposed case bị blocked chặn nghiệm thu; outside-scope và fallback tách mẫu số |
| Admin/runtime | Mọi control mang nghĩa live phải có wiring/trace/readback; preview ghi rõ. Publish/CAS/rollback đúng; operator thường không xem raw private content/keys; cả protected workspaces hoạt động |
| UI/accessibility | VI/EN; web 360×640/390×844/màn lớn; font 100/150/200%, ReduceMotion, reader labels/selected, keyboard/back/safe area. Không có layout/action blocker trong core; từng issue có retest trên đúng build |
| Security | 0 Critical/High có đường khai thác còn chưa xử lý hoặc chưa chứng minh mitigation; allow/deny ownership/RLS, role revocation, rate-limit và prompt-injection tests có evidence. Advisory count không thay exploit assessment; scan chưa chạy không được ghi pass |
| Performance | CI web-export ≤120 MiB giữ gate hiện có. Baseline release trên thiết bị được chọn; đề xuất local interaction p95 ≤200 ms, cold start không regress >10%, scroll jank <5% frames theo refresh rate; 20 vòng vào/ra không OOM/tăng RAM liên tục. Chốt thêm absolute startup/RAM/AI latency/cost budgets từ baseline; thiếu budget/số đo không đạt gate |
| Build/QA | Mobile check/full tests/CI web-export+Android embed, Admin/data/backend/contracts/brand checks liên quan xanh; APK/IPA manifest version/source/SHA-256 khớp. 0 P0/P1 mở trong scope; P2/P3 có quyết định xử lý, owner và mốc retest |
| Sản phẩm | UAT 8–12 người phù hợp target/đồng ý tham gia: mục tiêu ≥80% hoàn thành core journey không cần hướng dẫn, ≥70% chấm hữu ích 4/5 trở lên. Đây là gate khám phá pilot, không suy thống kê thị trường. Ghi mẫu/mẫu số; đo return/save/usefulness với consent, không gửi raw journal |

Nếu giữ Council/Astrology AI mở trong build, phải đạt các gate riêng R15/R17 và suite tương ứng. Nếu đóng, ghi rõ ở release scope và UI; không dùng việc đóng để báo backend feature hoàn tất. Ba customer Agents kiểm tra/retest mỗi flow nhưng UAT dùng người thật.

R00 khóa quy tắc chấm, người chấm và mẫu số trước prompt iteration. Nếu tác giả đã xem/dùng C11–C14, các case đó trở thành regression corpus; QA tạo holdout mới và cập nhật số run/budget. Với đúng 14 case, baseline + candidate cần 84 case-runs, có case gồm nhiều lượt nên không gọi là 84 câu trả lời. So sánh ChatGPT qua plugin trình duyệt dùng cùng prompt giả định; Tarot/Astrology có cùng cards/facts hợp lệ và continuity history. Ghi mode/ngày được hiển thị, không suy model hoặc cost thiếu; không kết luận thắng tổng thể từ một cặp output.

R03 kết thúc triage đầu kỳ bằng risk table, owner/scope cho từng remediation và test matrix. R22 chạy lại ownership, role revocation, RLS, rate-limit sau R06/R10 và các sửa liên quan; triage hoàn tất không đồng nghĩa security gate đã đạt.

### Matrix thiết bị/chế độ

- G1 native RC: ít nhất Android ít RAM và trung bình, iPhone nhỏ và phổ biến; hệ điều hành trong dải hỗ trợ được ghi cụ thể, build phù hợp từng nền tảng. Pilot chỉ Android được ghi là review/pilot giới hạn nền tảng; iOS chưa test vẫn unverified. G3 thêm nghiệm thu artifact store/signing tương ứng; browser không thay native.
- Code/web/native evidence tách; free và premium QA hợp lệ; offline/slow network/disk failure, background/resume, long history 500 Journal entries/300 messages, accountswitch mid-request.
- Date/time: trước 07:00 VI/TH, 23:59→00:01, timezone đổi; reflection không nhầm ngày và quota không doublegrant.
- Safety: C07–C09 và paraphrases VI/EN, prompt injection/fake card context, moderation/fallback. Không dùng thông tin cá nhân thật trong fixture.

## 6. Cách phối hợp và khởi động task

Tối đa ba nhánh công việc độc lập cùng điều phối; ví dụ mobile, backend/Admin contract, content/QA. **Một người tích hợp App.tsx**; A2UI/feature modules có thể giao scope riêng. Một owner cho apps/admin/app.js và một owner cho canonical prompt schema. QA review khác người viết khi có thể. Không hai Agent sửa cùng file đồng thời trong shared checkout; branch/worktree phù hợp khi triển khai, giữ owner changes và nhánh `codex/…`.

Mỗi card backlog có taskId, ownerAgent, purpose, writeScope đề xuất, dependencies, acceptance, validation và managerTestPath. allowedDataClasses, stopCondition và rollback dùng mặc định của handoffPolicy, trừ override ở card; khi giao executor phải đưa các giá trị hiệu lực này vào handoff. Role owner và integration partners không cùng sở hữu một file; các subtask phải tách exact scope trước edit.

Khi nhận một card:

1. Read AGENTS→router→PRD/task sources, kiểm tra current source và existing dirty work; đối chiếu review ngày 30/09.
2. Thu hẹp exact writeScope, impact và shared contract; tạo `docs/feature-plans/<taskId>.json` với hashes hiện tại; pass preflight. **Record của kế hoạch này chỉ cho docs, không dùng chạy 26 task code.**
3. Làm một vertical slice gồm UI, storage/backend, privacy/trace và loading/error/rollback. Supported dev/generation dùng `feature:run` như protocol.
4. Chạy checks liên quan và authenticated staging E2E khi endpoint đổi; tách local/provider fallback/online modes. Chỉ tích hợp sau contract review.
5. QA→ba customer roles→fix→retest→manager happy path; handoff checks/source/build/artifact/residual risks. Sau đó cập nhật skills nếu có durable discovery hoặc ghi verified-current.

Trạng thái dùng: planned → in_progress → code_complete → staging_verified → native_verified → manager_accepted. `blocked` giữ dependency rõ. Chỉ các kênh áp dụng được đóng; green local tests không tự đẩy feature qua live/native gates.

## 7. Điều kiện bên ngoài Agent không tự giải quyết

| Gate | Agent chuẩn bị được | Phần cần chủ dự án/môi trường |
| --- | --- | --- |
| Migration ledger | Read-only history/schema diff, forward SQL proposal, tests/rollback; reviewer security | Khôi phục/review remote-only source và database-owner decision. [Ledger](SUPABASE_MIGRATION_LEDGER.md) hiện blocked; không `db push/repair` |
| Staging/provider QA | Contract, fixtures, protected tests, budget/trace, code review | Authorized environment/test accounts, approved forward/deployment path và provider budget; giữ credentials trong quản lý secrets, không gửi cho subagent |
| Native/paid | Build manifests, test scripts, sandbox cases, disclosure drafts | Android/iOS devices, signing/vendor/store access, prices/benefits, purchase/refund fixtures |
| Release/destructive actions | Concrete reviewable result, rollback, incident/verification path | Quyết định publish/deploy/release hoặc hành động xóa cuối cùng đúng môi trường; không suy authority từ tên role |
| Security plugin | Dependency/source/authenticated test coverage và evidence | Lỗi scan trước khởi tạo cần xử lý theo workflow hợp lệ; không tạo replacement scan/suy findings để che audit gap. Security acceptance vẫn cần coverage thực và mitigation rõ |

Điều này không chặn việc làm code/local tests trong scope an toàn. Feature chưa chứng minh live phải giữ trạng thái code_complete/blocked thay vì manager_accepted. Không yêu cầu tạo Agent mới để thay cho quyền DB, thiết bị hoặc tài khoản vendor.

## 8. Hồ sơ kiểm chứng kế hoạch và bàn giao

- Plan followed: Plan-QC, Whole-App impact và owner lanes hiện có.
- Changed: tài liệu này, backlog và validator, documentation-only preflight record. App/config/runtime giữ nguyên.
- Manager path: xem đích G1/G2/G3→chọn đợt→mở taskId trong backlog→đối chiếu acceptance và gate.
- Validation: [validator](mvp-remediation/2026-10-01/validate-plan.mjs) kiểm IDs, roles, dependencies/DAG, handoff fields và links; preflight kiểm scope/current source. Đây là kiểm tra kế hoạch, không test app mới.
- Kết quả kiểm tra kế hoạch: preflight **PASS**; validator **PASS** cho 26 cards, 12 role đã cấu hình, 60 dependencies không cycle, 7 local links và các npm scripts được tham chiếu. Không có task sửa app nào được đánh completed bởi các checks này.
- Residual risks: audit là baseline theo ngày, ledger/live/native chưa đóng, các budget/target là đề xuất phải gắn số đo; không có release date được chứng minh.
- Recommended next task: **R00 + R01**, cùng chuẩn bị **R02/R03**, sau đó **R04/R20** và contract **R07/R12** theo exact scope.
