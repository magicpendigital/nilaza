# Growth Operations — đồng bộ hiện trạng Nilaza

Ngày rà soát nguồn: 2026-09-30. Hoàn thiện và kiểm tra tiếp vào 2026-10-01.

Trạng thái: triển khai trong workspace để review nội bộ; chưa triển khai bản này lên staging/production. Không có thao tác gửi email, đăng bài, chạy quảng cáo, sửa database hoặc kích hoạt worker.

## Kết quả và nguồn hiện hành

Growth Operations trước đây chỉ có ba màn Waitlist, Campaign map và Delivery health. Bản cập nhật giữ các luồng đó và bổ sung Tổng quan Growth, Hiện trạng sản phẩm, Draft nội dung, Đo lường và Bước tiếp theo. Chủ dự án có thể xem sáu brief, mười hai concept VI/EN, bằng chứng của từng claim và tám việc cần hoàn tất ngay trong Admin.

`#/growth/overview` hiện là tổng quan toàn bộ Growth. Bookmark để xem số Waitlist chuyển sang `#/growth/waitlist`; các đường `campaign-map` và `delivery-health` giữ nguyên.

Nguồn được chỉnh sửa là `packages/growth-nilaza`, không phải file generated. `apps/admin/generated/growth-operations.json` là bản chiếu chọn lọc, xác định từ chín file nguồn, có hash để phát hiện drift. Builder kiểm tra tenant, contract, reference, trường dữ liệu nhạy cảm và giới hạn quyền trước khi tạo. Không đưa nội dung tài liệu gốc, audience, email, token, raw UTM, chat/Journal hoặc thông tin sinh vào snapshot.

Snapshot là static asset có thể truy cập bằng URL; session guard kiểm soát giao diện nhưng không biến asset thành kho dữ liệu riêng tư có xác thực phía server. Chỉ dữ liệu cấu hình đã được chọn lọc cho bề mặt này mới được phép đưa vào. Các số đếm Waitlist vẫn lấy riêng qua RPC `get_growth_waitlist_overview`, yêu cầu `overview.read`; không có endpoint ghi mới.

| Nguồn | Vai trò |
| --- | --- |
| `packages/growth-nilaza/product-truth.json` | Trạng thái tính năng, claim VI/EN, bằng chứng và ngày hết hạn |
| `packages/growth-nilaza/briefs/sprint-01.json` | Sáu giả thuyết nội dung, liên kết claim và đích đến |
| `packages/growth-nilaza/content-drafts/sprint-01.json` | Mười hai concept, copy, visual brief và review còn thiếu |
| `packages/growth-nilaza/measurement/event-ownership-map.json` | Event, owner, binding trong source và giới hạn đo lường |
| `packages/growth-nilaza/operations/roadmap.json` | Tám ưu tiên, phụ thuộc, người phụ trách và nghiệm thu |
| `docs/reviews/2026-09-30/REPORT.vi.md` | Công việc sản phẩm chưa hoàn tất và gate còn mở |
| `docs/ANDROID_NATIVE_RELEASE_BUILD_2026-09-30.vi.md` | Bằng chứng build nội bộ mới; không phải chứng nhận store |

## Nội dung lỗi thời đã xử lý

- Astrology không còn chỉ là chuẩn bị: chart deterministic và thư viện thần thoại đã tích hợp, có QA Android ngày 23/09. Cloud report, AI preview, nghiệm thu native trên build cuối và iOS vẫn là gate riêng. ID lịch sử được giữ để không làm hỏng tham chiếu brief/asset.
- Tarot đã có QA native ngày 29/09 và smoke build ngày 30/09. Bản APK 0.1.3/code 4 là bản nội bộ debug-signed, có giới hạn provenance; không dùng làm bằng chứng đã phát hành công khai.
- AI Guides/Council và Journal được mô tả theo phần đã tích hợp cùng các việc prompt/runtime, grounding, lưu–mở lại–xóa/export và cô lập tài khoản còn cần nghiệm thu. Không khẳng định toàn bộ G-A đã pass.
- W0/W1/W2/W6 là nền tảng draft/contract đã có. W3 distribution, W4 publishing có kiểm soát và W5 paid tiếp tục để giai đoạn sau. Không coi các package/template là agent runtime đang chạy.
- Tài liệu kế hoạch 20–21/09 được gắn nhãn lịch sử và trỏ về handoff này. Lịch sử QA được giữ; trạng thái hiện hành lấy từ nguồn phía trên. Các phase M trong kế hoạch cũ và workflow W trong template là hai hệ ID khác nhau.
- `B_PARALLEL_MARKETING_PILOT_EXECUTION_PLAN_2026-09-21.vi.md` là bằng chứng kế hoạch lịch sử. Các mô tả workflow còn khác baseline template không ghi đè W0/W1/W2/W6 trong readiness hiện hành.

Concept vẫn là bản nội dung và visual brief, chưa có ảnh/video render. QA trong seed là metadata tự khai báo; chưa có review độc lập gắn hash hoặc phê duyệt bên ngoài. Tất cả package tiếp tục `draft_internal`, `approval=not_submitted`, `externalReadiness=blocked`.

Hai draft Astrology A11/A12 lên **v1.1.0**, sửa caption VI/EN từ “đang chuẩn bị/chưa thể dùng” sang trạng thái tích hợp nội bộ cùng các gate còn thiếu. Cả 12 package đều `human_review_required`; điểm seed được gắn `historical_seed_scores_not_independently_revalidated`. A05–A12 còn cần review lại do ngữ cảnh claim/bằng chứng đã thay đổi. Source register có 10 nguồn được phân biệt vai trò; event map có 11 định nghĩa/binding, không phải 11 event đã có số liệu live.

## Luồng vận hành mới

Mở Growth → kiểm tra Hiện trạng sản phẩm → chọn draft VI/EN → xem claim, nguồn và gate → xem Đo lường → lấy việc và đường nghiệm thu ở Bước tiếp theo. Nội dung này dùng để giao việc, không phải nút thực thi campaign.

| Ưu tiên | Công việc tiếp theo | Bằng chứng để đóng việc |
| --- | --- | --- |
| GROWTH-01 | Hoàn tất Journal/cloud, mở lại, sửa/xóa/export và cô lập tài khoản | Happy path trên bản native cuối, negative case và đối chiếu lưu dữ liệu |
| GROWTH-02 | Đồng bộ AI prompt/config/runtime và chất lượng phản hồi | Config active đúng version, trace đã redaction, regression grounding/safety |
| GROWTH-03 | Event spine và aggregate có consent, denominator rõ | Event → lưu → aggregate → Admin; phân biệt thiếu dữ liệu với 0 |
| GROWTH-04 | Creative thực và editorial review độc lập | Artifact/hash/version, quyền nguồn, review VI/EN và accessibility |
| GROWTH-05 | Phạm vi beta, CI và artifact/signing nghiệm thu | Bản cuối có provenance, device acceptance, quyết định phạm vi công khai |
| GROWTH-06 | Email confirmation/unsubscribe/provider/outbox | Suppression, idempotency, retry, webhook, secret và gate được kiểm chứng |
| GROWTH-07 | Một kênh organic có adapter và receipt | Approval gắn hash/đích/hạn, receipt, audit và rollback theo scope |
| GROWTH-08 | Paid sau readiness sản phẩm và đo lường | Entitlements/credits, retention, cap ngân sách và phê duyệt cụ thể |

Roadmap ghi phụ thuộc trực tiếp trong dữ liệu. Owner là vai trò phụ trách công việc, không phải cấp quyền triển khai hay sử dụng ngân sách.

## Waitlist và đo lường

- Requested là contact duy nhất đã lưu, không phải số lần submit.
- Pool confirmed chưa loại suppression, người đã accepted, delay và frequency cap; không coi là audience đủ điều kiện gửi.
- Các stage và reason suppression không cộng thành số người duy nhất. “Contact bị dừng” chỉ gồm ba status unsubscribe/bounce/complaint; chưa có union suppression và chưa gồm manual.
- Engagement live chưa nối provider events. Không có mẫu số hoặc mẫu số bằng 0 thì tỷ lệ là `Unavailable`; tử số 0 trên mẫu số hợp lệ mới là `0.0%`.
- Provider flag không phải health check. Worker, cron và email tự động chưa kích hoạt.
- Event có mặt trong web/mobile source không có nghĩa pipeline aggregate đã được nghiệm thu. Activation, retention và meaningful value day chưa có số liệu đáng tin.
- Lỗi RPC không tự động chuyển sang số mẫu. Người review phải bấm chọn fixture; badge luôn phân biệt repository snapshot, live aggregate và synthetic. Nút tải lại thử cả hai nguồn; lỗi Waitlist không chặn dữ liệu repo và ngược lại.

## Kiểm tra cho chủ dự án

1. Chạy Admin local bằng `npm run admin:dev`; dùng luồng đăng nhập Admin hiện có với backend QA đã cấu hình.
2. Mở Growth Operations. Xem Tổng quan có 6 brief, 12 concept, 4 workflow nền tảng và không có kênh thực thi đang hoạt động.
3. Mở Hiện trạng sản phẩm. Astrology phải thể hiện tích hợp nội bộ; public beta/payments/store vẫn còn gate. Claim hết hạn hoặc thiếu bằng chứng phải yêu cầu review lại.
4. Mở Draft nội dung, chọn từng package, đổi VI/EN/VI+EN. Kiểm tra bản draft astrology đã cập nhật và các trạng thái review/phê duyệt chưa hoàn tất.
5. Mở Đo lường, xem source binding và chỉ số chưa khả dụng. Mở Bước tiếp theo, kiểm tra đủ tám việc và nghiệm thu cụ thể.
6. Mở Waitlist. Khi backend lỗi, phải thấy lỗi và lựa chọn fixture rõ ràng. Chỉ sau khi chọn fixture mới được thấy số mẫu. Tải lại phải thử nguồn live mới; không giữ số mẫu dưới badge live.
7. Mở Campaign map và Delivery health, kiểm tra cảnh báo pool/worker/suppression. Chuyển lại Content Operations và AI Studio, xác nhận các workspace cũ vẫn truy cập được.

## Tạo lại snapshot và kiểm tra drift

Sau khi review và sửa nguồn canonical, cập nhật hash/source review của feature record, chạy preflight rồi dùng runner allowlist:

```powershell
npm run feature:preflight -- --record docs/feature-plans/growth-operations-sync-2026-09-30.json
npm run feature:run -- --record docs/feature-plans/growth-operations-sync-2026-09-30.json --script admin:growth:seed
npm run admin:growth:check
npm run admin:check
npm run admin:test
npm run growth:validate
npm run growth:test
```

Không sửa tay file generated. `admin:check` phát hiện snapshot cũ; builder không cấp phê duyệt hoặc tạo công việc chạy bên ngoài.

## Bằng chứng validation và giới hạn

| Kiểm tra | Kết quả |
| --- | --- |
| Feature preflight và runner Growth generator | Pass; scope/source đã review, tạo snapshot qua allowlist |
| `admin:check` | Pass: seed Content/Owner Guide hiện hành, Growth parity, 3 workspace và 27 capabilities |
| `admin:test` | **78/78 pass**, bao gồm Content Operations, AI Studio, session/capability, recovery, shell và Growth |
| Growth render/behavior và projection tests | **19 + 14 pass**, nằm trong 78 Admin tests; bao gồm 8 route, hai nguồn độc lập, lỗi/retry, locale/draft, auth revocation và response cũ |
| `growth:validate` | Pass: 12 package, 17 adversarial fixtures; automation pass vẫn cần human review |
| `growth:test` | 7/7 pass |
| `feature:run:test` | 8/8 pass |
| `validate:data` | Pass: 7 deck/78 card; không mojibake, ASCII VI hoặc safety lint issue |
| `validate:brand` | Pass: 84 nguồn/118 export; không sửa brand master |
| `validate:governance` và `skills:check` | Pass; 22 agent/6 lane và không drift skill |
| `git diff --check` | Pass trong phạm vi file đã chỉnh |

Browser QA chưa hoàn tất. Trước khi mất kết nối, đã xác minh staging vẫn là UI cũ và shell local có tám route cùng trạng thái snapshot thiếu. Local smoke dùng server QA tạm ở loopback, session/capability giả lập và RPC ngắt kết nối; không thực hiện production request/write và không chứng minh auth/backend staging thật. Sau đó công cụ browser báo lỗi kết nối debugger/Windows sandbox; các lần kết nối lại và reset không khôi phục được tab. Chưa xác minh giao diện render cuối ở desktop/mobile, screenshot cuối hoặc happy path Content Operations/AI Studio trên browser trong lượt này.

Các behavioral tests thực thi module `growth.js` thật trong VM với DOM/transport giả lập; chúng kiểm tra logic nhưng không thay thế layout, accessibility hoặc browser integration QA. Phải hoàn tất manager path ở trên trong browser hoạt động trước khi coi bản này là đã nghiệm thu hoặc triển khai staging. Không có kết luận native release mới vì mobile runtime không thay đổi.

Skill review: `nilaza-plan-qc` và `nilaza-brand-experience` được xác minh vẫn áp dụng. Phát hiện bền vững về nguồn, generated snapshot, metric và manager test đã ghi vào router, Admin README và handoff; không phát sinh ngoại lệ policy hoặc thay đổi brand master yêu cầu sửa skill. `skills:check` kiểm tra drift giữa source và bản cài.

Rollback chỉ hoàn nguyên các file của slice Growth này hoặc quay lại ba route Waitlist cũ; không cần migration, phục hồi database hay thu hồi email/bài đăng vì không có thao tác đó. Nội dung/mobile/backend hiện có và hai workspace Admin được giữ nguyên.
