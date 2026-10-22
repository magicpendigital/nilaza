# Quality Gate Sprint Marketing AI 01

Phiên bản 1.0 · 21/09/2026 · Phạm vi: B0/B1 nội bộ, không thực thi ra ngoài

Tài liệu này tách bốn câu hỏi thường bị lẫn với nhau: framework có chạy được không; Nilaza có ProductTruth đúng không; 12 concept/copy package có đủ tốt để vào human review không; và có gì đã được phép phát hành hay đưa lên GitHub. Một câu trả lời “pass” ở lớp đầu không thay thế các lớp sau.

## Kết luận hiện tại

| Lớp | Trạng thái | Ý nghĩa thực tế |
| --- | --- | --- |
| F1 — framework quality | **PASS, automated** | Core portable, contracts, fixture, hard-fail lint, state machine và clean-room export hoạt động độc lập. |
| T1 — Nilaza ProductTruth | **PASS có điều kiện** | Claim thương hiệu có evidence; Tarot, AI Guides/Council, Journal và Astrology vẫn bị khóa theo các product gate tương ứng. |
| G-M2 — thư viện concept/copy | **CHƯA PASS** | 12 package đã qua automation và có independent-review feedback, nhưng vẫn cần human editorial decision; chưa có creative render hoặc destination/channel thật. |
| E1 — public material candidate | **BLOCKED** | Chưa có owner/editor/privacy approval gắn hash, visual proof, destination proof và product evidence hiện hành. |
| E2 — controlled publishing | **BLOCKED** | Chưa có channel adapter, OAuth, receipt, reconciliation, retry/retract test hay channel owner. |
| E3 — paid media | **BLOCKED** | Chưa có product-release proof, consented attribution, budget cap, account owner hay kill switch. |
| GitHub extraction | **CLEAN-ROOM PASS cho core/template** | Dry-run tạo được export portable không chứa Nilaza; chưa tạo repository hoặc chuyển tenant data. |

Do đó Sprint 01 **đạt mục tiêu nền B0/B1 nội bộ**. Nó **chưa đạt external-marketing ready**, chưa phải pilot hai business thật và chưa là cơ sở để publish, gửi email, mở quảng cáo hoặc tạo repository GitHub.

## Evidence đã kiểm

| Kiểm tra | Kết quả | Điều nó chứng minh |
| --- | --- | --- |
| `npm run growth:validate` | Pass; 12 Nilaza concept/copy package, 16 fixture đối kháng | Claim/brief/destination/QA metadata liên kết; toàn bộ package vẫn blocked external. |
| `npm run growth:test` | 7/7 pass | Chặn claim bị rút quyền, prediction tất định, Nilaza lẫn sang template Business B, email trong copy, cross-tenant brand, và video thiếu storyboard/transcript. |
| `npm run growth:validate:portable` | Pass | Core/contracts/template/fixture/LearningExport chạy không cần `growth-nilaza` hay `agent-config`. |
| `npm run growth:test:portable` | 6/6 pass | Portable validation, PII/foreign-brand lint, opaque alias/bounded LearningExport, clean export độc lập, rejection khi chèn tenant brand và fail-closed khi thiếu source-tenant term. |
| `npm run growth:export:dry-run` | Pass | Chỉ copy bảy path allow-list, quét source tenant term, PII/credential-like content và validate export trong clean room. |
| `npm run validate:governance` | Pass; 19 agents, 6 delivery lanes | Config không phá governance hiện có. |
| `npm run validate:brand` | Pass; 118 export, 84 nguồn | Brand source/boundary hiện hành không bị phá. |
| `npm run validate:data` | Pass | Seed content hiện hữu vẫn nhất quán. |
| `git diff --check` | Pass | Không có whitespace error trong patch. |

Các check này không đo conversion, retention, visual craft, account policy approval, product usability trên cohort thật hay hiệu quả so với ChatGPT/Gemini/Claude. Những điều đó cần B2 trở đi.

## Kết quả quality review của 12 package

Mỗi package được gắn nhãn `concept_copy_package`, `draft_internal` và `externalReadiness: blocked`. Điều này có chủ ý: đây là copy + visual direction để review, chưa phải một static, carousel hay video render có thể đăng.

| Nhóm | Package | Kết quả review hiện tại | Quyết định |
| --- | --- | --- | --- |
| Awareness/reflection | A01–A04 | Đã thay wording chung chung bằng ritual ba bước; A04 có duration, storyboard ba cảnh và transcript song ngữ. Vẫn cần human editor kiểm tra xem phương pháp có đủ khác biệt với general AI hay không. | Giữ làm hypothesis nội bộ. |
| Tarot | A05–A06 | Định vị Tarot là biểu tượng/câu hỏi, giữ quyền quyết định của người dùng, không prediction. | Chỉ có thể xét beta sau G-A2 và destination mở. |
| Guided conversation | A07–A08 | Làm rõ flow giả định → lựa chọn → bước thử; A08 đã có storyboard/transcript. Cần bằng chứng từ build thật trước khi gọi đó là lợi ích sản phẩm. | Chỉ có thể xét beta sau G-A2. |
| Journal/revisit | A09–A10 | Copy nhấn consent và bỏ ngôn ngữ KPI nội bộ. | Chỉ có thể xét beta sau G-A5. |
| Astrology preparation | A11–A12 | CTA đã đổi sang waitlist; wording chuyển sang nguyên tắc/điều kiện tương lai, không còn claim calculated/provenance-backed feature hiện có. | Chỉ là education/preparation nội bộ cho đến G-A3/G-A4. |

Hard-fail scan không phát hiện deterministic prediction, advice nhạy cảm, impersonation, unlicensed-rights marker, personal data pattern trong copy, locale thiếu hoặc cross-tenant token. Điểm soft score trong file chỉ là self-assessment có cấu trúc để tìm chỗ yếu; nó không thay cho human QA. Mọi package vẫn ở trạng thái automation-pass và chờ human review theo gate.

## Những thay đổi đã làm sau independent review

1. Tách validator generic khỏi validator Nilaza; portable test không còn cần package tenant hoặc `agent-config` của Nilaza.
2. Thêm clean-room exporter allow-list với test tạo workspace mới, validation độc lập và quét term tenant khi export từ source repo.
3. Chuyển cross-tenant/PII từ cờ do artifact tự khai sang text scan và negative tests; fixture chứa PII chỉ được phép vì được đánh dấu synthetic, nằm trong QA fixture path.
4. Siết `LearningExport`: alias opaque không mang brand, cohort tối thiểu 20–49, percentage/cost bucket enum, nested allow-list và opaque receipt hash.
5. Thêm approval state machine; Sprint 01 không được chuyển vượt `qa_pass_pending_human`.
6. Bổ sung source register, interview kit chưa tuyển người, journey event ownership map definition-only và learning note synthetic-only.
7. Chỉnh copy A01–A04, A08, A10–A12; thêm video duration/storyboard/transcript cho A04/A08; đổi nhãn asset để không giả vờ là creative đã render.

## Manager review cần hoàn tất trước G-M2

1. Chọn `approve for next visual draft`, `revise` hoặc `block` cho từng A01–A12; ghi owner, lý do, rubric version và ngày review.
2. Với A01–A04, đánh giá có thể nói được vì sao ritual/continuity của Nilaza đáng dùng hơn một prompt tự viết trong general AI hay không. Nếu không, loại khỏi launch library thay vì cố tăng media spend.
3. Với A05–A10, chỉ giữ claim sau khi product gate tương ứng và destination beta thật đã được xác minh trên build đúng.
4. Với A11–A12, xác nhận copy tiếp tục nói rõ đây là feature đang chuẩn bị; không dùng chart screenshot, accuracy promise hoặc claim personal result trước G-A3/G-A4.
5. Khi làm creative render, thêm asset file, rights/source record, contrast review, caption/alt, build/device/locale/date provenance và version-bound approval. Render mới phải qua QA lại.

## Điều kiện còn thiếu trước GitHub và Business B thật

Clean-room export hiện chứng minh khả năng tách **core/template**, không cho phép chuyển dữ liệu marketing của Nilaza. Trước khi tạo repository GitHub mới, cần đủ:

1. Một Business B thật có BrandPack, ProductTruth, identity boundary, consent/data map, activation event, channel/approval/incident owner và backend/analytics/secret store riêng.
2. Hai tenant chạy W0–W2 bằng config riêng; negative test chứng minh approval, credential, receipt, cache/queue namespace và nội dung không đi chéo tenant.
3. Ít nhất một `LearningExport` cho mỗi business, chỉ aggregate de-identified, cohort đủ lớn, qua privacy review và được đối chiếu với source receipt.
4. Owner chốt repository name, GitHub organization/owner, private visibility, license, CODEOWNERS/branch protection và IP/dependency review.

Không tạo repository hay push trong Sprint này vì Business B hiện chỉ là template synthetic và G-M2/E1 vẫn chưa đạt. `packages/growth-contracts`, `packages/growth-core`, `packages/growth-fixtures` là phân vùng local sạch đã sẵn sàng cho lần extraction sau; `packages/growth-nilaza` tiếp tục ở repo Nilaza.

## Gate tiếp theo

Sau human review, ưu tiên là B2: dùng A2 evidence đã xác minh để lập beta charter 18+, research consent, event proof và một cohort nhỏ. Khi đó dữ liệu học hỏi đi theo `LearningExport` aggregate; không lấy chat, journal, birth/chart, ảnh, email hay prompt/trace sang framework dùng chung.
