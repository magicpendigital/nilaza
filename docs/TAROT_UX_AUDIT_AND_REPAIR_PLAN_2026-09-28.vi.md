# Review UX Tarot và phương án sửa — 2026-09-28

**Trạng thái:** hoàn thành bước 1–2 để chủ sản phẩm review. Chưa sửa mã Tarot, chưa kiểm thử sau sửa, chưa nghiệm thu trên thiết bị.

## 1. Phạm vi và mức độ bằng chứng

- Đối chiếu luồng hiện tại trong `apps/mobile/App.tsx`, `apps/mobile/src/backendClient.ts`, `apps/mobile/src/a2ui/index.tsx`, tài liệu sản phẩm và nhận diện hiện hành. Đây là trạng thái working tree ngày 2026-09-28, có thay đổi chưa commit; không suy ra trạng thái bản phát hành.
- Mở bản web export có sẵn `apps/mobile/.ci-web-export-ai-fix-20260926` trên trình duyệt local. Màn chào và màn đăng ký hiển thị; không có tài khoản QA để vào Tarot. Thao tác pointer tự động trên màn chào không chuyển trang, còn Enter chuyển được; chưa đủ bằng chứng quy lỗi này cho ứng dụng. Không tạo tài khoản vì màn đăng ký yêu cầu đồng ý điều khoản dịch vụ.
- `adb devices` không thấy thiết bị. Chưa có bằng chứng trực tiếp cho Tarot trên Android/iOS, AI staging, thanh toán hoặc đồng bộ thật. Bảng dưới ghi **xác nhận từ mã** khi đường điều khiển và kết quả có thể suy ra trực tiếp; ghi **cần tái hiện** cho cảm nhận, hiệu năng và backend theo dữ liệu tài khoản.
- Ba chân dung QA trong [quy trình kiểm thử khách hàng](CUSTOMER_PERSPECTIVE_QA.md) là giả thuyết dựa trên nhóm mục tiêu của PRD; không thay thế phỏng vấn và quan sát người dùng thật.

### Luồng mục tiêu

Tarot là luồng phụ từ Home/Explore. Người dùng đặt chủ đề và câu hỏi tùy chọn, chọn trải và bộ bài, xem câu chuyện bộ bài trước khi rút từng lá, nhận diễn giải theo đúng lá/vị trí/hướng, lưu hoặc chia sẻ có kiểm soát, hỏi tiếp và mở lại bài đã lưu. [PRD §6.4](FEATURE_PRD.md) và [router](AGENT_TASK_ROUTER.md) là nguồn cho hành vi; [Brand Guidelines](BRAND_GUIDELINES.md) và [DESIGN.md](../DESIGN.md) là nguồn cho cảm giác, khả năng đọc và bố cục.

## 2. Vấn đề phát hiện

Mức **P0**: phơi lộ dữ liệu riêng tư, mất dữ liệu không khôi phục hoặc luồng gây hại nghiêm trọng; **P1**: chặn luồng chính, sai dữ liệu, niềm tin hoặc mất giá trị đã lưu; **P2**: khả dụng, rõ ràng hoặc chiều sâu trải nghiệm. Mức này cần được điều chỉnh khi có kiểm thử trực tiếp.

| ID | Mức / bằng chứng | Vấn đề và tác động tới khách hàng | Nguồn kiểm tra |
| --- | --- | --- | --- |
| T01 | P1 · xác nhận từ mã | Từ Nhật ký, **Mở lại nguồn** hoặc CTA **Rút Tarot** ở trạng thái rỗng truyền sự kiện `onPress` vào tham số `stage` của `startTarot`. `tarotStage` thành object không hợp lệ; không nhánh màn Tarot nào khớp, có thể thấy màn trống. | [App.tsx](../apps/mobile/App.tsx) `startTarot` quanh dòng 3975, Journal quanh 8830/8890/8949; [A2UI](../apps/mobile/src/a2ui/index.tsx) quanh dòng 166. |
| T02 | P1 · xác nhận từ mã | Nhật ký chỉ hiện tóm tắt và metadata thô. **Mở lại nguồn** khởi động trải bài mới; sau khởi động lại, `reading` cũ không được dựng từ snapshot. Giá trị người dùng đã lưu không xem lại được đầy đủ. Snapshot hiện thiếu câu hỏi gốc. | `App.tsx` quanh dòng 3060, 3299, 8202, 8851. |
| T03 | P1 · xác nhận từ mã | `startTarot`, `startQuickTarot` và **Bắt đầu lại** không xóa `reading` cũ. `drawnCount` dùng `reading` để hiện đủ `N/N` ngay khi vào lượt rút mới; Back có thể mở kết quả cũ với chủ đề/bộ bài hiện hành. | `App.tsx` quanh dòng 3975–3993, 7273, 7554, 8134–8150. |
| T04 | P1 · điều kiện theo tài khoản, cần staging | Hạn mức của người đăng nhập ưu tiên `backendCredits`. Ledger rỗng cho 0 dù copy hứa ba lượt miễn phí; khi có số dư, luồng rút không trừ/làm mới nó. Helper trừ credit còn map URL không khớp endpoint. Người dùng có thể bị chặn sai hoặc thấy số lượt sai. | `App.tsx` quanh dòng 3120, 4877; [backendClient.ts](../apps/mobile/src/backendClient.ts) quanh 376/734; [user-credits](../supabase/functions/user-credits/index.ts) quanh 40/57. |
| T05 | P1 · xác nhận từ mã | Lỗi/timeout API được chuyển thành `null`, rồi diễn giải local được trả về như thành công; màn Tarot không cho biết nguồn hoặc cách thử lại. Người dùng tưởng đang nhận bài AI qua backend trong khi đã dùng fallback. | `backendClient.ts` quanh dòng 438–481; `App.tsx` quanh 4900–4933/8164. |
| T06 | P1 · xác nhận từ mã | **Báo cáo lượt trải bài** chỉ ghi safety event local nhưng UI xác nhận đã báo cáo. Người vận hành không nhìn thấy sự cố ở thiết bị khác. | `App.tsx` quanh dòng 3861–3870, 8232. |
| T07 | P2 · xác nhận từ mã | CTA tại danh sách bộ bài có thể đi thẳng tới rút, bỏ trang câu chuyện/chi tiết; CTA chi tiết lại vòng sang lựa chọn trải. Đường đi và nhãn hành động không nhất quán với router. | `App.tsx` quanh dòng 7505–7512, 8313; [router](AGENT_TASK_ROUTER.md) mục Tarot. |
| T08 | P2 · xác nhận từ mã | Chọn bộ Premium rồi đi tới bước rút mới gặp nút **Nâng cấp** chỉ dẫn đến lỗi/toast preview. Đây là ngõ cụt muộn. | `App.tsx` quanh dòng 4869–4876, 7480–7512, 8102. |
| T09 | P2 · xác nhận từ mã | Bấm lưu nhiều lần tạo nhiều Journal entry cho cùng `reading.id`; toast “đã lưu” đến trước khi kết quả đồng bộ được thể hiện rõ. | `App.tsx` quanh dòng 4589–4614, 8202–8221. |
| T10 | P1 · xác nhận từ mã | Nút có nhãn **Tạo ảnh chia sẻ** nhưng chỉ gửi văn bản. Nội dung `reading.summary` được đưa thẳng vào share sheet, có thể lặp lại câu hỏi riêng tư; không có bước chọn nội dung chia sẻ rõ ràng. | `App.tsx` quanh dòng 4936–4982, 8223. |
| T11 | P2 · xác nhận từ mã | Kết quả từng lá dùng câu chung, đặc biệt nhánh VI bỏ nghĩa riêng đã biên tập; các `sections` từ AI không được ánh xạ cho từng lá. Không hiện hướng xuôi/ngược ngay tại kết quả; VI/EN của snapshot có chỗ được gán cùng một chuỗi. Bài đọc dễ chung chung hoặc sai ngôn ngữ. | `App.tsx` quanh dòng 2341–2418, 8141–8160; [tarot-cards.json](../packages/content/data/tarot-cards.json). |
| T12 | P2 · xác nhận từ mã | Topic/deck dùng màu để báo lựa chọn nhưng thiếu `accessibilityState.selected`; lựa chọn spread thiếu role và selected state. Người dùng screen reader khó xác nhận lựa chọn. | `App.tsx` quanh dòng 7715, 7786, 10267–10320. |
| T13 | Cần đo trực tiếp | Trang chi tiết có thể render thư viện 78 ảnh trong `ScrollView`. Cần đo tốc độ mở, cuộn và bộ nhớ trên Android tầm trung trước khi quyết định phân trang/virtualization. | `App.tsx` quanh dòng 7917. |

**Không kết luận từ lần web export:** pointer trên màn chào không phản hồi trong công cụ tự động, còn Enter phản hồi. Cần thử chạm thật hoặc trình duyệt ngoài trước khi mở issue độc lập về onboarding.

## 3. Phương án sửa theo lát dọc

### Lát A — Khôi phục điều hướng và ranh giới một lượt Tarot

**Ưu tiên:** T01, T03, T07. **Chủ trì:** `mobile_app_agent`; QA độc lập: ba customer agents.

1. Bọc mọi callback đưa `startTarot` vào `onPress` bằng hàm không tham số; tại `startTarot` chỉ nhận `TarotStage` hợp lệ, mặc định `intro` khi dữ liệu ngoài không hợp lệ. Kiểm tra cả Journal rỗng và Journal detail.
2. Có một hành động `beginNewTarotSession` xóa kết quả, lỗi, lá đã rút, timer, share preview và lịch sử của lượt trước; **Bắt đầu lại** gọi hành động này. Kết quả đã hoàn thành giữ snapshot bất biến và render theo `reading.deck/topic/spread` của chính nó.
3. Chuẩn hóa đường đi: lối Tarot thông thường → chủ đề → chọn trải → danh sách bộ → chi tiết bộ → rút; Explore decks → danh sách → chi tiết, và CTA ở chi tiết dùng trải đã chọn hoặc yêu cầu chọn trải một lần trước khi rút. Danh sách không rút trực tiếp. Back trở về bước thực sự trước đó; đổi bộ không đổi bài đã hoàn thành.

**Điểm cần chủ sản phẩm chốt:** PRD ban đầu liệt kê chọn bộ trước chọn trải, còn Stitch status mô tả màn chọn trải trước chọn bộ. Đề xuất trên theo cấu trúc hiện hành và giữ quyết định router rằng chỉ CTA ở chi tiết bộ mới đưa vào rút; có thể đổi thứ tự chủ đề/bộ/trải mà không đổi ranh giới này.

**Nghiệm thu:** Journal rỗng mở đúng Tarot; mở lại bài cũ không thấy màn trống; lượt thứ hai bắt đầu `0/N`, từng chạm lên `1/N … N/N`; Back và Bắt đầu lại không lộ câu hỏi/kết quả cũ; đổi bộ không thay hình hoặc guide của bài trước.

### Lát B — Lưu, mở lại và đồng bộ có thể tin được

**Ưu tiên:** T02, T09. **Chủ trì:** `mobile_app_agent`, với review storage/privacy.

1. Định nghĩa snapshot có version cho một bài: `readingId`, `deckId` và version, topic, câu hỏi, spread, card IDs/vị trí/hướng, diễn giải theo lá, tổng hợp, câu hỏi phản tư, ngôn ngữ và nguồn diễn giải. Tận dụng `sourceSnapshot` hiện có; không ghi thêm dữ liệu nhạy cảm vào telemetry.
2. Journal detail dựng màn **Xem lại bài đã lưu** chỉ đọc từ snapshot, hiển thị ảnh và nội dung theo đúng bộ ban đầu. Với entry cũ thiếu trường, hiện tóm tắt cũ cùng lời giải thích rõ ràng; không tự tạo bài mới.
3. Lưu idempotent theo `reading.id`; vô hiệu nút khi đang lưu, đổi thành **Đã lưu** sau khi local write thành công. Nếu sync backend thất bại, hiện trạng thái **Đã lưu trên thiết bị · Chưa đồng bộ** và retry riêng, không tạo bản trùng. Xác nhận cách xóa/export tuân theo Journal hiện có.

**Nghiệm thu:** bấm Lưu hai lần chỉ có một entry; đóng/mở app rồi vào Journal xem đủ cùng lá, hướng, câu hỏi, tổng hợp và reflection; offline vẫn xem được; sync lỗi không báo đã đồng bộ.

### Lát C — Hạn mức, AI fallback và an toàn vận hành

**Ưu tiên:** T04–T06, T08. **Chủ trì:** `backend_supabase_lane` và `mobile_experience_lane`; cần preflight riêng trước sửa contract/backend.

1. Chốt nguồn sự thật cho ba lượt miễn phí và Premium. Backend quyết định cấp, trừ, hoàn hoặc không trừ; mỗi lần rút dùng `readingId` làm khóa idempotency để retry không tính thêm lượt. Sửa path `/user-credits/deduct` và làm mới số dư sau giao dịch. Tách bộ Premium đã khóa ngay tại danh sách/chi tiết; CTA cho phép đổi sang bộ miễn phí, hoặc mở paywall khi entitlement thật đã sẵn sàng.
2. Trả trạng thái diễn giải có kiểu rõ (`remote`, `local`, `error` cùng lý do đã làm sạch) từ backend wrapper. Khi API lỗi, giữ nguyên lá đã chọn, cho chọn **Đọc bản trên thiết bị** hoặc **Thử lại AI**; nêu rõ chế độ hiện tại. Retry không rút lại và không trừ thêm lượt.
3. Trước khi có endpoint báo cáo được bảo vệ và quan sát được trong Admin, đổi xác nhận thành **Đã lưu báo cáo trên thiết bị**. Khi bổ sung sync thật, có trạng thái gửi/thất bại và chỉ gửi dữ liệu tối thiểu đã làm sạch.

**Cổng phụ thuộc:** `docs/SUPABASE_MIGRATION_LEDGER.md` đang chặn `db push` và migration repair. Không thực hiện thay đổi dữ liệu từ xa cho tới khi có đường forward được review và database-owner approval theo runbook. Giai đoạn đầu có thể sửa copy/UI local không cần migration; không tuyên bố credits hoặc báo cáo staging đạt nếu chưa test endpoint được xác thực.

**Nghiệm thu:** tài khoản staging ledger rỗng/còn lượt/hết lượt thấy hạn mức đúng; một reading trừ đúng một lần; offline và timeout hiển thị nguồn rõ, retry giữ lá; báo cáo không nói “đã gửi” khi chỉ local; bộ Premium không dẫn vào ngõ cụt.

### Lát D — Chất lượng giải bài, chia sẻ và tiếp cận

**Ưu tiên:** T10 là P1 về quyền riêng tư và kỳ vọng chia sẻ; T11–T13 là P2. **Chủ trì:** `mobile_app_agent` và content QA.

1. Ánh xạ phần giải AI theo card ID/vị trí/hướng và chỉ dùng các lá app đã chọn. Khi thiếu section, dùng nghĩa `vi`/`en` đã biên tập của đúng lá; không dựng câu chung theo suit/rank thay cho nghĩa lá. Ghi rõ xuôi/ngược ở kết quả và share. Lưu đúng ngôn ngữ thực tế của AI; chuyển VI/EN chỉ dùng bản có sẵn hoặc thông báo bản dịch chưa có.
2. **Khuyến nghị cho phiên sửa đầu:** đặt CTA đúng là **Chia sẻ văn bản**, mở preview cho người dùng bỏ phần tổng hợp/câu hỏi trước khi gọi share sheet; mặc định không kèm câu hỏi cá nhân hay ghi chú. Xuất ảnh thật là một lát thiết kế và kiểm thử native riêng nếu chủ sản phẩm chọn giữ lời hứa “ảnh”. Với ba lá, preview phải có đủ ba lá nếu xuất ảnh sau này.
3. Thêm role, selected state, nhãn dễ hiểu và thứ tự focus cho topic/spread/deck, lá bài, Save/Share/Back. Kiểm thử chữ lớn, tương phản, Reduce Motion và màn khoảng 390×884. Đo tải 78 ảnh trên Android tầm trung; chỉ virtualize khi số đo cho thấy vấn đề.

**Nghiệm thu:** ba lá/vị trí/hướng khớp kết quả, bản VI dùng nghĩa riêng của đúng lá, không có khẳng định định mệnh; preview chia sẻ cho phép kiểm tra nội dung trước khi rời app; VoiceOver/TalkBack đọc lựa chọn đang chọn và CTA luôn chạm được.

## 4. Whole-App Impact Brief cho bước sửa tiếp theo

| Mặt tác động | Kế hoạch |
| --- | --- |
| Entry point/navigation | Home và Explore giữ Tarot là subflow; Journal mở lại snapshot; Back và lượt mới có trạng thái xác định. Deep link Tarot hiện không đổi trừ khi audit code cho thấy đường riêng. |
| Data write | `reading` trong bộ nhớ, AsyncStorage/Journal snapshot và trạng thái sync cần cùng `readingId`; kiểm tra ảnh hưởng export/delete. Không đổi seed 78 lá nếu chỉ sửa cách chọn nghĩa. |
| Backend contract | Giữ app chọn lá; thay đổi credits, trạng thái fallback và report phải có contract/version, authz/RLS, idempotency và staging E2E. Không đẩy migration trong trạng thái ledger bị chặn. |
| Admin | Chỉ báo cáo đã đồng bộ mới được gọi là đã gửi; Admin chỉ xem trạng thái/lý do đã làm sạch, không raw câu hỏi. Hai workspace Admin được giữ nguyên trừ khi có task riêng. |
| Privacy/safety | Câu hỏi Tarot là dữ liệu riêng tư; share mặc định không kèm, report tối thiểu, AI không khẳng định chắc chắn hoặc chẩn đoán. |
| Analytics | Chỉ ghi ID/mode/status/số lá, không câu hỏi hay phần giải; tách local fallback khỏi remote success trong sự kiện. |
| Rollback/fallback | Có thể quay lại snapshot cũ bằng version reader; legacy entry vẫn xem tóm tắt; backend xuống vẫn cho bản local minh bạch; không mất bài đã lưu. |
| Mặt không đổi | Nhận diện Open Reflection, 5 tab, Astrology, Persona/Council, gói thanh toán và dữ liệu Admin hiện hữu. |

**File dự kiến theo lát:** A chủ yếu ở `apps/mobile/App.tsx` và test điều hướng Tarot/Journal; B ở `apps/mobile/App.tsx`, `apps/mobile/src/types.ts`, `apps/mobile/src/storage.ts` hoặc adapter Journal liên quan cùng test snapshot cũ/mới; C ở `apps/mobile/src/backendClient.ts`, `supabase/functions/user-credits`, hợp đồng credits/AI liên quan và test staging, chỉ mở rộng `supabase/migrations` sau khi cổng ledger được giải quyết; D ở thành phần Tarot trong `App.tsx`, nội dung card đã có trong `packages/content/data/tarot-cards.json` chỉ đọc, cùng test accessibility/VI-EN và kiểm tra asset. Nếu sửa A2UI dùng chung hoặc hai workspace Admin, phải cập nhật impact map và preflight trước khi mở rộng phạm vi.

## 5. Kế hoạch kiểm thử sau khi chủ sản phẩm duyệt bước 3

1. Trước mỗi lát sửa: cập nhật Feature Preflight cho đúng write scope, source hash, skill và rủi ro mới; chạy preflight. Với backend/credits, kiểm tra migration ledger và quyền database trước khi viết dữ liệu từ xa.
2. Tự động: `npm --workspace apps/mobile run check`; test tương tác Tarot/Journal cho sự kiện `onPress`, reset lượt, lưu idempotent, đọc snapshot cũ/mới, fallback giữ lá; `npm run validate:data`, `npm run validate:visual-assets`. Với contract/backend: `npm run validate:backend`, `npm run supabase:check`, `npm run supabase:migration-ledger:check`, staging E2E xác thực, không log dữ liệu riêng.
3. Build/runtime: Metro web export và Android embedded bundle theo mobile quality CI. Bản web chỉ là bằng chứng web; release/native cần thiết bị iOS/Android thực và build/version rõ ràng.
4. Kiểm thử tay VI/EN: Home/Explore → 1 lá và 3 lá → đổi bộ → kết quả → lưu → đóng/mở → xem lại → chia sẻ → hỏi tiếp. Thêm offline/timeout, tài khoản ledger rỗng/còn/hết, Premium, Back, chữ lớn, Reduce Motion và screen reader.
5. Sau coding, kích hoạt cả ba customer agents cùng **một build và cùng bộ dữ liệu giả lập**, ghi issue theo mẫu trong [CUSTOMER_PERSPECTIVE_QA.md](CUSTOMER_PERSPECTIVE_QA.md). Agent không được tự xác nhận bug đã sửa chỉ từ mã; phải retest trên môi trường đã gắn nhãn. QA owner tổng hợp khác biệt giữa ba góc nhìn, triage P0/P1 trước khi bàn giao.

## 6. Đường review cho chủ sản phẩm

1. Khuyến nghị lát A → B trước, sau đó xử lý T10 và trạng thái fallback UI sớm. Phần credits/báo cáo cần backend ở lát C theo cổng migration; các cải thiện còn lại của lát D có thể làm song song khi write scope không giao nhau.
2. Chốt lựa chọn chia sẻ: **khuyến nghị chia sẻ văn bản có preview riêng tư** cho phiên đầu; ảnh chia sẻ thật là phần tiếp theo nếu cần.
3. Cấp môi trường QA hợp lệ cho vòng kiểm thử trực tiếp: build nội bộ và tài khoản staging/test do chủ sản phẩm kiểm soát. Không cần gửi mật khẩu qua tài liệu hoặc issue.
4. Nghiệm thu bước 3–4 chỉ khi các tiêu chí từng lát và ba agent khách hàng đều có bằng chứng trên cùng phiên bản; không dùng web export để khẳng định iOS/Android đã đạt.
