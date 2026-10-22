# Nilaza YouTube Studio — bàn giao cấu hình kiểm tra khô 05/10/2026

## Kết quả và thực trạng

Đã bổ sung một nhánh YouTube vào tám vai trò Growth hiện có, không phải một đội tự vận hành đã hoạt động. Core vẫn draft_only, provider adapter disabled/contract-only. Runtime Nilaza chỉ nhận W2 carousel VI/EN; renderer hiện tạo ba PNG mỗi ngôn ngữ, không phải video renderer. Không sửa hai module này hay sáu ảnh pilot đã được Owner duyệt ngày 01/10. ProductTruth còn reviewedAt 30/09; chỉ brand claim cho public_organic_candidate, feature claims vẫn internal_only. Không tự nâng claim từ các thay đổi app gần đây.

Git kiểm tra 05/10: HEAD/remote branch codex/admin-shared-content-sync cùng 235f03acb5ab2ad5a598691f25dedb18e2013448; remote main bdde54971af5caa909a12dfadb1547e533a19827. Working tree có nhiều thay đổi đồng thời của người khác; Growth Core/Pack/runtime/renderer không có thay đổi trong scoped status trước task. Brand/Plan-QC có sửa hiện hữu đã đọc và hash-pin; không sửa hoặc commit/push chúng. .agents/skills không tồn tại tại repo/cwd; dùng sources skills/nilaza-plan-qc và nilaza-brand-experience, source/install parity pass trước edit.

Peek lịch 05/10 chỉ thấy hai task nhắc dashboard/GitHub active và một task nhắc cũ paused, không có YouTube schedule trong kết quả trả về. Không suy từ đó rằng đã kiểm hết scheduler ngoài ChatGPT. Nhánh này không tạo task/cron. Cadence đề xuất đã điều chỉnh thận trọng thành một video dài và tối đa một Short mỗi tuần; giờ Việt Nam chưa duyệt, không có lịch active.

ContentOps task 01a10590-6a63-761e-a3c6-1ab4b39b809f theo bàn giao parent đã có Node/SQLite, durable queue, immutable approvals, idempotency và unknown-result reconciliation; YouTube private/stub, chưa OAuth/lịch chạy thật. Chưa đọc source consumer/path ở task này: adapter-contract.json đánh dấu consumer acceptance pending, không tuyên bố tích hợp đã hoạt động. Không dùng workspace Python Content-generate như bằng chứng cho Node ContentOps.

## Phân công đúng tám vai trò

- `growth_orchestrator`: Điều phối Nilaza YouTube.
- `research_jtbd`: Nghiên cứu nguồn và giả thuyết.
- `product_truth_claim_guard`: Kiểm chứng sản phẩm và claim.
- `positioning_experiment`: Chiến lược và thử nghiệm nội dung.
- `content_studio`: Kịch bản, thiết kế/chuyển động và audio.
- `independent_qa`: QA độc lập.
- `distribution_planner`: Bàn giao lịch và đối soát kênh.
- `journey_measurement`: Đo lường và học từ aggregate.

Role briefs nằm trong packages/growth-nilaza/youtube/roles; kịch bản, visual_motion và audio là workstreams của content_studio, không phải thêm ba Agent vào catalog. QA phải khác mọi creator và xem/nghe media thật. Chuỗi tương lai: orchestrator/claim guard → research/positioning → content_studio → independent_qa → Owner exact envelope → ContentOps consumer → aggregate learning. Hiện mới có cấu hình, brief và kiểm tra offline.

## Cô lập và đường chạy khô

Brand brief, source register, editorial ledger, asset-rights catalog, metrics, ngân sách và cadence riêng ở packages/growth-nilaza/youtube. Output tương lai chỉ .local/nilaza-youtube/outputs. Channel ID/URL null, ngân sách caps null/unapproved; không lấy ngân sách product API, channel/voice/music/assets/approval/lịch Mây. Queue authoritative chỉ ở ContentOps namespace nilaza.youtube; editorial seed trống không thay durable queue.

Chạy node scripts/nilaza-youtube-dry-run.mjs --week YYYY-MM-DD (thứ Hai). Planner deterministic đề xuất chủ đề reflection và slot tương lai theo policy, không phải AI research/generation đã thực thi; slot quá khứ/gần giờ bị bỏ, không catch-up. sourceFingerprint bao gồm policy/brief/adapter/role/metric/source bindings; đổi nguồn cần review cấu hình. Content ledger dùng để tránh đề xuất lại stable content ID trong kiểm khô; concurrency/unique reservation thật cần consumer ContentOps.

Offline envelope lint kiểm tenant/path/hash, public ProductTruth/evidence/expiry, channel pin/mine/post-upload identity, quyền nguồn, disclosure/audience, QA độc lập/nine scores, Owner hash/QA/schedule/channel/budget/expiry, future private never-public, cap/reservation và duplicate intent/video hash. Các trường metadata hợp lệ không xác minh license, OAuth hay approval thật; output luôn externalExecutionAllowed=false. Không có transport, uploader, queue writer hay HTTP client.

## YouTube checklist có nguồn

- Channel Studio invitation không xác lập OAuth API; parent đã nghiên cứu [Studio permissions](https://support.google.com/youtube/answer/9481328). Permission/access thực tế còn pending.
- [videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert) yêu cầu OAuth; API project chưa audit tạo sau 28/07/2020 bị private-only. Không coi OAuth app verification và YouTube API audit là cùng một gate; chưa kiểm live cả hai.
- Trước upload dùng authenticated [channels.list(mine=true)](https://developers.google.com/youtube/v3/docs/channels/list) để khớp đúng pinned Nilaza ID; sau upload/đọc lại kiểm snippet.channelId, không fallback Mây hoặc channel đầu tiên.
- [publishAt](https://developers.google.com/youtube/v3/docs/videos#status.publishAt) chỉ dùng private/chưa từng public; thời gian quá khứ có thể public ngay. Consumer phải giữ lead time và block missed slots; không thử live trong task này.
- [OAuth External Testing](https://developers.google.com/identity/protocols/oauth2) với scope ngoài identity cơ bản có refresh token bảy ngày; Studio invite không giải quyết lifecycle. Token, grant, audit, revocation/reconnect đều pending, không đọc secret.
- Đối chiếu [GenAI disclosure](https://support.google.com/youtube/answer/14328491) với nội dung thật; realistic alterations và music AI cần đánh giá hiện hành. Trường containsSyntheticMedia phải có decision/source, không chỉ bật nhãn vì viết script bằng AI.
- Unknown upload: persist và reconcile qua ContentOps, không insert mù. Atomic reservation/idempotency/receipt/channel/processing/copyright/kill switch cần consumer test và live nghiệm thu riêng. Không hardcode quota/cost từ tài liệu cũ; budget USD không phải quota units.

## Repo có cần tách ngay không?

Chưa cần repo mới để review cấu hình/offline. Nên tách repo nội dung mỏng nilaza-content-studio khi Owner chốt kênh và cần worker/artifact lifecycle độc lập app; người dùng tạo repo trước, Agent không tự tạo hay chuyển org.

Dự kiến chuyển: packages/growth-nilaza/youtube/ → studio/nilaza/youtube/; scripts/nilaza-youtube-dry-run.mjs và test → tooling/; handoff này → docs/; .local/nilaza-youtube/outputs và rights files chỉ đưa vào private artifact store theo quyền, không commit media/token/queue DB mặc định. Existing app feature preflight giữ làm lịch sử; repo mới có gate riêng.

Phụ thuộc phải giải quyết trước chuyển: canonical public-approved ProductTruth/BrandPack/BusinessPack snapshot có version/hash và cadence refresh từ app; selected manifest brand assets/fonts/licences; shared Growth catalog/quality/approval contract từ bản framework đã pin; ContentOps handoff contract được consumer chấp thuận. Không fork queue/publisher, không copy app/mobile/Admin/Supabase/.env/.git hay toàn bộ Core sang repo nội dung. Loader hiện resolve app-relative sources, nên chuyển path đơn thuần chưa chạy được: cần adapter nguồn versioned và tests export/import.

## Nghiệm thu và phần chưa chạy

Manager đọc studio.json, tám role briefs và adapter-contract; chạy dry CLI để thấy source/slot/blocker, rồi chạy node --test scripts/nilaza-youtube-dry-run.test.mjs. Synthetic tests không phải independent video QA hay chứng cứ vận hành. Kết quả lệnh thực tế được trả trong báo cáo task, không ghi PASS giả ở tài liệu này.

Chưa chạy model/script generation, image/motion/video render, TTS/music, OAuth, upload kể cả private, API scheduling, webhook/cron, analytics, consumer integration hoặc production DB. Chưa có video/media mới hoặc KPI; costs unknown/null. Các quyết định cần chốt: Nilaza channel URL/ID và Owner, cadence/timezone, budget riêng/voices/licenses, phạm vi autonomy/immutable approval, ContentOps consumer ownership và thời điểm tạo repo mỏng.

Rollback: gỡ riêng các file mới của slice này; không có external state hoặc migration phải hoàn tác. Plan-QC/Brand skills verified-current vì không đổi policy hoặc master; hướng dẫn mới sống trong role briefs riêng tenant.

## Kết quả chạy thật trong task này

- Feature preflight: PASS trước implementation và sau cài source.
- YouTube offline tests: 18/18 PASS; Growth baseline tests: 7/7 PASS.
- growth:validate: PASS, 12 concept/copy packages và 17 adversarial fixtures.
- validate:governance: PASS, 22 agent/6 lane; không tạo Agent mới.
- validate:brand: PASS, 84 source/118 export; skills:check PASS.
- 21 tệp mới: UTF-8/JSON/whitespace/credential-pattern scan PASS; 18/18 sourceReview hash hiện hữu được giữ nguyên. Git diff --check trong scope không báo lỗi; tệp mới được kiểm text trực tiếp vì chưa tracked.
- CLI revision 1 chạy thật cho tuần 05/10 từng đề xuất ba slot; revision 2 thay bằng tối đa hai slot, media/QA chưa tạo/chưa chạy; externalExecutionAllowed=false, không queue/provider/scheduler/publish.

Các checks này chỉ chứng minh phần cấu hình và logic offline. Không có video, OAuth hay consumer/live acceptance PASS. Không chạy thêm mobile/Admin builds vì các surface đó không thay đổi.

## Điều chỉnh đề xuất trước bàn giao — revision 2

Người dùng chưa có kênh Nilaza và đang cân nhắc đổi kênh họ báo sở hữu [Mystic Art](https://www.youtube.com/@mysticartrealm) thành Nilaza. Chưa có quyết định chọn/đổi tên. Handle và tên hiển thị không phải pinned channel ID hay OAuth proof; selected channel.id/url vẫn null, pendingCandidate tách riêng. Không tự reuse nội dung, audience, ngân sách, quyền tài sản hoặc token.

Public audit do parent cung cấp ngày 05/10 ghi một video Picasso tiếng Anh, ngày 11/06/2024, sáu views. Đây là snapshot công khai được parent báo lại cho lựa chọn kênh cũ, không phải nghiên cứu khách hàng, KPI Nilaza hay bằng chứng quyền API; task này không audit lại hoặc nhập video đó vào ledger.

Pilot mặc định đề xuất: một video dài và tối đa một Short/tuần, maximumVideosPerWeek=2 và maximumByFormat long=1/short=1. Thứ Năm/Chủ nhật 20:00 giờ Việt Nam chỉ là slot minh họa cho dry planner; Owner chưa duyệt cadence/timezone/giờ, scheduler vẫn not_activated và provider/OAuth/external execution disabled. Bộ ba template chủ đề vẫn là pool ý tưởng, không phải ba slot cam kết.

Kiểm tra lại revision 2 đã chạy thật: 20/20 YouTube offline tests PASS, gồm pending handle không pin ID và chặn ba slot/hai video cùng format; feature preflight PASS trước/sau sửa. CLI trả hai draft (một Short, một long), channel ID null, cadence chưa duyệt, externalExecutionAllowed=false/schedulerActivated=false/queueCreated=false. 18 sourceReview hash hiện hữu vẫn nguyên. Kết quả 18/18 và các baseline checks ở phần trên là lịch sử revision 1; không chạy lại Growth/brand/mobile/Admin vì sửa này chỉ giảm đề xuất cadence, ghi candidate chưa chọn và thêm hai regression checks. Không có kiểm thử live mới.
