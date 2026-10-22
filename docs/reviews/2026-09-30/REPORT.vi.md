# Review toàn ứng dụng Nilaza — 30/09/2026

**Nilaza có nền tảng để tiếp tục MVP nội bộ có hướng dẫn; chưa sẵn sàng public beta tự phục vụ, thu phí hoặc phát hành store.** Core journey và nhiều backend đã vượt mockup tĩnh. Khoảng trống chính là vòng đời dữ liệu, Premium/credits, chất lượng AI, đường cấu hình Admin tới runtime và nghiệm thu native.

Đã làm: review cross-cutting nguồn/config/content; chạy kiểm tra tự động; đọc metadata/advisors Staging; chạy UI qua IAB; so sánh một tình huống Nilaza–ChatGPT hai lượt; mô phỏng ba vai khách hàng; lưu draft Astrology VI/EN qua editor Admin thật. **Chưa hoàn tất publish và retest cấu hình AI mới.** Consumer Astrology bị khóa Free/Premium, Admin Test Run không gọi provider; Tarot/Persona/Council còn wiring/version/publish gaps. Không báo draft là cải thiện runtime đã triển khai.

## Hồ sơ bằng chứng

- Workspace `D:/nilaza`, HEAD `691ab75`, working tree có nhiều thay đổi sẵn của chủ dự án; không reset hoặc gom thành bản đã phát hành.
- Rà soát mobile, shared components/config/content, Admin, web/help, backend/AI functions/wrappers và release/workflows. Inventory theo bộ lọc `rg` có355 implementation/config files; không đồng nghĩa mọi dòng đã pentest hoặc mọi nhánh UI đã chạy.
- Không review nội dung pixel/fonts/vendor/Git internals như application source; assets được đo footprint/mapping. Screenshot mới dùng làm runtime evidence; tài liệu native trước đó ghi là lịch sử.
- Nilaza Staging QA healthy; đọc route/prompt metadata và advisors, không đọc private user rows/raw trace payload/provider keys. Project chính tên Nilaza inactive tại thời điểm đọc; không thử production.
- Chrome không khả dụng. IAB đã hoạt động lại; chủ dự án cho phép IAB cho ChatGPT và đăng nhập Admin QA. Chỉ các luồng thao tác được đánh dấu observed. [UI runtime: 21 findings](ui-runtime.vi.md), [screenshot manifest](screenshots/manifest.json).
- Deep Security Scan thất bại trước discovery; không có canonical findings/coverage, không có chứng nhận an toàn. [Giới hạn và đánh giá cấu hình](security-performance.vi.md).

## 1. Sẵn sàng MVP

| Giai đoạn | Kết luận | Điều còn thiếu |
| --- | --- | --- |
| Internal QA theo kịch bản | Có nền để tiếp tục | Chốt feature cho tester, xử lý test gate đỏ, ghi local/backend/build mode |
| Public beta miễn phí | Chưa sẵn sàng | Journal/cloud lifecycle, export/deletion, account-switch/RLS/abuse tests, AI quality, accessibility/device acceptance |
| MVP thu phí | Chưa sẵn sàng | Authoritative entitlement, purchase/restore/receipt/webhook, credits/quota/idempotency, quyền lợi/giá đã duyệt |
| Store release | Chưa sẵn sàng | Android+iOS acceptance, RC provenance/signing, complete gates, privacy/store disclosures và manager review |

Source có auth-first onboarding, Home/Today Pulse,17 guide,7 deck/78 canonical cards, Persona/Oracle/Council, Journal local, deterministic Astrology/mythology, backend wrappers, protected Admin và trace/audit. Tarot, Persona hai lượt, chart và Admin được chạy mới ở web. Sự tồn tại của module không chứng minh online/native đã nghiệm thu.

## 2. Dở dang, chưa phát triển và lỗi thời

[Inventory40hạng mục](mvp-inventory.vi.md) ghi trạng thái, phục vụ định hướng, dependencies, nguồn và manager test path; thêm5nhóm deferred/12 nhóm historical. P1 dưới đây cần giải quyết trước MVP online; P2 nâng chất lượng/scale; deferred chưa phải lỗi thiếu MVP. Inventory dùng priority labels chi tiết riêng, xem mô tả thay vì cộng số severity.

| Ưu tiên | Hạng mục | Giá trị/hành động |
| --- | --- | --- |
| P1 | Journal edit/delete cloud và reopen source | Core reflection loop; edit/delete chỉ local, chat reopen tới Oracle/Astrology tới Tarot. Hoàn thiện trước tăng nội dung |
| P1 | Export/account deletion cloud | Export mới counts/toast; deletion local/sign-out. Cần file và server lifecycle rõ |
| P1 | Forced Free/subscription resolver | Client khởi tạo Free, Astrology AI Premium không dùng được qua phiên thử; purchase/restore chưa hoàn chỉnh |
| P1 | Authoritative credits/quota | App chưa nối deduct vào consumer AI; `/deduct`, ownership/retry/idempotency/rate-limit cần test |
| P1 | AI grounding/purpose/version | Love Oracle viện Tarot thiếu context; global Persona selector mơ hồ; cần pointer và regression cases |
| P1 | Admin config/runtime/evaluation | Persona bundle khác prompt runtime, Tarot editor chưa được đọc, Council pin version/publish nhiều requests, Test Run chưa gọi LLM |
| P2 | Front-end content/assets publication | Mobile consume personas/decks/baseCards; copy/assets chưa đầy đủ |
| P2 | Shared states/accessibility |48 px, selected/error/focus/motion/font lớn chưa nhất quán |
| P2 | Lists/assets/persistence | Virtualization/partitioning và optional cached art theo profiling |
| P2 | Persona RAG | Schema/source declarations có, retrieval chưa nối; chỉ làm với nguồn được phép/citation QA |
| Sau core | Image share, voice, ngôn ngữ mới | Có thể tăng retention, ưu tiên sau lưu/xóa/quality |
| Deferred | Face reading/community/marketplace | Giữ phase3/later, chưa kéo vào MVP |

Giữ Astrology/mythology: A3/A4 đã owner-approved; PRD phase2 cũ không phải lý do loại bỏ. Đánh dấu historical/deprecate: App_fixed/App_restored backups, mobile AdminScreen/mock jobs không render, old Today Pulse mock endpoint, June plan local-only/3 deck/10 guide. Reachable analysis trước khi xóa; backup không chắc gây binary bloat. Stitch giữ structural reference; Open Reflection là authority nhận diện.

## 3. UI/UX đã chạy

[21 runtime findings](ui-runtime.vi.md) bổ sung [31 mobile/source findings](mobile-architecture-ux.vi.md). Có trùng vấn đề; không cộng thành 52 lỗi độc lập. Chưa tìm mọi lỗi hoặc nghiệm thu iOS/Android.

**Tarot intro có lỗi first fold đã thấy.** Classic/Moon390×844 và Moon360×640: artwork trong slot cao, tên/story phía dưới. DOM390px: Image333×640 chứa art333×222, hero ngoài335×1013. RN Web giữ intrinsic source height640px vì app chỉ override width/aspectRatio; minHeight500 chỉ là floor. `contain` giữ toàn hình trong hai intro đã xem; chưa thấy crop ở đây. Native Yoga cần test riêng. Sửa bằng ratio-wrapper/explicit height, đưa tên và một câu giá trị trước phần dài. [Classic first fold](screenshots/classic-intro-mobile.jpg).

Runtime gaps: deck→spread→chọn deck lặp; shortcut bỏ intention; Three of Swords có câu Việt lỗi nghĩa dù validator pass; synthesis áp đau/chia cắt chưa được cung cấp; “Vì sao?” mở lessons chung; “Viết vào Nhật ký” chỉ save; Oracle CTA trùng/thumbnail tối; mixed VI/EN; Persona reply dưới fold/quick replies không theo context; chart form/metadata kỹ thuật; Premium dead end. Source gaps nhỏ: target14/34/44 px lệch48; Chip thiếu selected; ReduceMotion chưa phủ; typography drift; mất note draft/back/delete thiếu undo; native hardware back chưa xác minh.

| Luồng | Bằng chứng mới/giới hạn |
| --- | --- |
| Welcome/auth/goals mới | Source có; chưa chạy hết. Admin login không thay mobile auth acceptance |
| Home/Pulse/Oracle | Home/recent đã thấy; Pulse/Oracle actual inference chưa đánh giá mới |
| Explore/deck/library | Explore, Classic/Moon mở được; hai intro contain/first fold lỗi; chưa quét7bộ |
| Spread/draw/result/learning/save | UI đi được,3 lá chọn bởi app, result thấy trên màn; provider/fallback chưa đối chiếu trace |
| Persona/Council/handoff | Fresh Love Oracle hai lượt đã thu; Council/handoff chưa chạy lại |
| Journal | Save/recent cùng origin đã thấy; cloud edit/delete/cross-device/reopen chưa nghiệm thu |
| Astrology | Chart giả lập unknown-hour và10:30 chạy; AI input bị khóa Premium |
| Profile/privacy/payment | Source gaps; export/cloud delete/purchase/restore native chưa thử |
| Admin | Đăng nhập protected workspaces, Test Run, load pair và actual browser draft; chưa active publish |

## 4. Design system, A2UI, security và performance

**Có design system/reuse, enforcement chưa đủ.** Theme tokens, A2UI primitives, adaptive shell/shared chat có thật. Home/auth/Oracle/Persona/Council/Astrology đã tách modules. A2UI là RN component layer nội bộ; chưa thấy external schema-driven/server-generated renderer. Cần catalog variants/states/accessibility/motion và kiểm tra consumers, không chỉ màu/font/logo.

App.tsx 16.458 dòng gánh Tarot/Journal/Profile/Explore/state/styles, blast radius lớn. Chuẩn48px lệch token44; DESIGN cấm negative tracking nhưng token−0.4. Tách feature/state dần và chuẩn hóa form/actions/status/list, giữ layout đặc thù chart/art khi có lý do.

Runtime 684 files **62,36 MiB**, Tarot560files **51,92 MiB**;7 deck statically mapped. Không phải APK/RAM/network; mọi pixel không nhất thiết decode lúc startup. ScrollView+map và root setState throttle16 có rủi ro mount/render/memory. Chưa đo FPS/startup/RAM/p95; CI có web-export cap120MiB. Cần release native profiling/budgets. [ScrollView](https://reactnative.dev/docs/scrollview), [RN performance](https://reactnative.dev/docs/performance).

**Bảo mật chưa được chứng nhận.** npm audit:218affected package nodes,1 critical/184 high/33 moderate; không phải218unique exploitable vulnerabilities. tar 7.5.16 có advisory giải nén DoS, cần reachability/CI/runtime triage. [node-tar advisory](https://github.com/advisories/GHSA-23hp-3jrh-7fpw). Staging có password/search_path/extension/FK/RLS-plan warnings; RLS-no-policy INFO thường deny-all, không phải public exposure. Hai-account ownership/abuse tests chưa chạy. [Chi tiết](security-performance.vi.md).

## 5. AI: actual comparison và configure

### C01 hai lượt

Cùng câu hỏi giả lập về người mình thích không trả lời2ngày nhưng vẫn đăng story; cùng follow-up chọn **một việc nhỏ tối nay** để bớt kiểm tra điện thoại. Fresh Love Oracle chưa card/handoff. ChatGPT Temporary+Unpersonalized, UI Pro/power 5/5; model backend chính xác không biết. [Full paired evidence/lenses](ai-c01-paired-observation.json), [AI review mục8](ai-customer-quality.vi.md).

| Tiêu chí | Nilaza | ChatGPT |
| --- | --- | --- |
| Bám tình huống | Ngắn/ấm, hình ảnh chờ điện thoại; ít phân biệt2dữ kiện | Nêu2ngày/story, tách sự im lặng khỏi kết luận self-worth |
| Tin cậy | Lượt1 giả định trải bài; lượt2 viện The Hanged Man chưa được cung cấp | Thừa nhận không biết động cơ người kia, không dựng card context |
| Hành động | Viết3nhu cầu hữu ích; follow-up2lựa chọn trà/vẽ thay vì chọn1 | Chọn tắm10phút/điện thoại ở ngoài phòng, xử lý thôi thúc và kết thúc rõ |
| Tải đọc/giọng | Gọn, không khí persona rõ | Lượt1 dài hơn, cụ thể hơn |

**ChatGPT bám tình huống và yêu cầu tốt hơn trong cặp này.** Không suy thắng/thua tổng thể hoặc do model. Ba lenses GenZ/emotional/wisdom qua cùng subagent, không blind/independent/interviews. Mỗi sản phẩm thấy reply trước của chính nó ở lượt2: trải nghiệm hội thoại tự nhiên, không lịch sử đồng nhất.14 case/repetitions/holdout chưa chạy; score/winRate/cost/latency và Nilaza actual route/fallback/version chưa thu giữnull. Không dùng UI “Worked…” làm latency.

### Configure thực hay template?

| Capability | Thực tế/gap |
| --- | --- |
| Model Router | Publisher/runtime reader thật. Active metadata Persona/Tarot/Astrology DeepSeek, Oracle free route riêng; không xác định model của reply cụ thể |
| Astrology Composer | Load/publish VI+EN atomic/CAS và runtime reader thật; pair đã load, DB/editor đối chiếu, prior pair lưu và candidate draft điền |
| Content Ops Persona prompt | Publish admin_content_bundles; backend đọc canonical personas/prompt_versions, không bundle. Editor publish chưa đổi Love Oracle system prompt |
| Persona stack | Selector global thiếu purpose, base/handoff cùng active Staging. Structured handoff chưa consume đầy đủ; textual prefill card+synthesis vẫn có nếu không bị thay; RAG chưa nối |
| Tarot Composer | Local draft/preview; runtime system hardcoded, không dùng editor/deck prompt |
| Oracle context | Hardcoded system/current text, chưa chứng minh memory controls có effect |
| Council | Config/templates/rosters thật; guides trong một model call. Mobile pin version cũ; publish mới có thể query miss rồi dùng cấu hình từ mobile payload, endpoint vẫn có thể gọi provider. Publisher nhiều requests, chưa atomic/CAS |
| Test Run/optimizer | UI xác nhận không provider call/score/cost/latency; chưa vòng optimization thật |

Nguồn chênh lệch có thể là persona instructions/themes, prompt selection/purpose, route/token budget, context/history/contract/UI. Chưa có actual version/model trace nên không quy reply cụ thể cho một prompt/model chưa chứng minh.

### Giá trị khác biệt và cấu hình đã làm

**Nghi thức có hình ảnh/dữ kiện rõ → guide có phương pháp → đúng một thử nghiệm nhỏ → Journal tiếp nối theo consent.** Giá trị cần xây: giảm công sức bắt đầu/quay lại để tự quan sát, premium/intimate experience. Chưa có bằng chứng khách hàng sẽ chuyển từ ChatGPT. Không tăng số deck/guide trước grounding/lưu/tiếp nối.

[Candidate Astrology VI/EN](ai-admin-quality-candidate.json) áp hypothesis trong contract hiện có: synthesis theo câu hỏi, tension chỉ khi selected facts hỗ trợ, một thử nghiệm nhỏ, giữ factIDs/caveat/safety/schema/model/route. **Đã lưu browser draft trong editor Admin thật**, active pair vẫn2026-09-25-ai-insight-v1. [Screenshot draft](screenshots/admin-astrology-draft.jpg), [prior pair/rollback](astrology-prior-active-pair.json).

**Publish/retest còn bị chặn:** clientFree; server Insight cần Premium active/trialing, owner không bypass. Admin transport có config/trace-read nhưng không inference endpoint; Test Run chưa gọi. Legacy astrology-report không đọc candidate Insight prompt nên không dùng nghiệm thu. Tarot/Persona drafts chưa nối runtime; Council version/publisher cần sửa. Không activate candidate khi thiếu đường test hợp lệ; không lấy token/sửa subscription/đổi route để vượt gate.

Sau khi đóng gap: baseline/candidate cùng fictional fixtures và route/token/model, kiểm tra schema/grounding/trace promptVersion/fallback, publish atomic pair qua Admin; fail thì re-publish prior texts bằng rollback version mới/expected versions hiện hành. DB push/repair vẫn blocked bởi ledger, không sửa migration trong audit.

## 6. Checks đã chạy

| Kiểm tra | Kết quả/giới hạn |
| --- | --- |
| Preflight/gated dev |PASS cho local review/draft; Metro8081/Admin4173 render qua IAB |
| Mobile TypeScript |PASS |
| Mobile full Jest |221/222 tests;37/38 suitesPASS;1Astrology timeoutFAIL |
| Astrology isolated rerun |2/3 PASS, cùng test vượt15 s; chưa phân biệt fixture/test performance với native defect |
| Admin check/test |PASS49/49 |
| Data/backend/Council/governance |PASS7decks/78cards,14 gateway paths/21 local functions, contract/22 agents/6 lanes |
| Supabase readiness |72 PASS/9 WARN/0 FAIL, artifact/env không live E2E |
| Migration ledger |BLOCKED, không push/repair |
| Release config |PASS 0.1.3 Android4/iOS4, không store/device acceptance |
| Brand/visual |PASS84brand sources/118exports,24 feature visuals/684 runtime files |
| Public content |PASS8bilingual help/3 legal,22 docs/58 chunks |
| Astrology AI contract/tests |PASS11tests |
| Web check/build |FAIL môi trường EPERM Vite; isolated cache/out vẫn EPERM `.astro` schema/types, libuv assertion/Pagefind0pages. Chưa chứng minh source compile defect; release gate chưa xanh |
| Dependency audit |Hoàn tất findings; chưa dependency fix/reachability triage |
| Browser/AI |IAB visual/C01two-turn completed; Chrome unavailable; native/full benchmark/performance chưa chạy |
| Deep scan |FAIL trước discovery, không canonical findings/coverage |
| AI candidate |Actual browser draft verified; active publish/provider retest chưa làm |

## 7. Thứ tự đóng gap và handoff

1. Journal/privacy + test gate:2 clients/accounts, save/edit/delete/reopen đúng nguồn, export file/cloud deletion, retry/offline không mất/duplicate, xử lý timeout căn nguyên.
2. Entitlement/quota:authoritative free/premium, purchase/restore, budget/idempotency và QA inference hợp lệ; giữ server guards, chưa mở bán trước gate.
3. AI config/runtime/eval:purpose pointers, Tarot/Persona/Oracle wiring, Council active-version delivery/atomic publisher, actual contract Test Run/trace; sau đó paired/holdout.
4. UI/accessibility:hero geometry/intention/copy/Why/Journal actions, controls 48 px, selected/error/focus/motion/font200%, native back/keyboard.
5. Performance/security/release:Android+iOS profiling, list/assets/startup/RAM/jank/p95 budgets, dependency/advisors/scan/pentest và source/signing provenance.

Mỗi slice cần UI/loading/error, ownership/durability, trace/config version và manager test path; không nghiệm thu từ checklist nguồn. Report không cấp production/migration/destructive authority.

Changed:dated reports/evidence/candidates/preflight helper/record, isolated web-QA config/cache ignore và actual Admin browser draft. Normal UI tests tạo fictional chat/trace và lưu một Tarot insight theo lifecycle hiện có. Không sửa app code, active prompts/routes, entitlements, dependencies, schema/RLS hoặc production. Metro/Admin giữ để chủ dự án kiểm tra. Local draft có thể bỏ; prior pair dành rollback sau publish. Skills Plan-QC/brand vẫn current; vấn đề nằm ở consumers/wiring. **Publish/retest chưa hoàn tất; chưa có cải thiện AI sau cấu hình để báo đạt.**
