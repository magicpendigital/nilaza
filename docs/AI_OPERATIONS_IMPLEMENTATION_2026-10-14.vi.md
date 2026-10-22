# Nilaza — triển khai publish, truy nguyên câu trả lời và feedback

Ngày bắt đầu: 14/10/2026. Kiểm chứng cuối: 16/10/2026, múi giờ Asia/Bangkok.

**A1–A3 đã được triển khai và kiểm chứng cục bộ. Chưa triển khai migration, Edge Function hay cấu hình lên cloud; chưa nghiệm thu trên thiết bị iOS/Android thật.** Báo cáo này tiếp nối [đánh giá nội dung và Admin](TAROT_ASTROLOGY_CONTENT_ADMIN_REVIEW_2026-10-14.vi.md) theo thứ tự chủ sở hữu đã đồng ý.

## 1. Kết quả đối với người dùng và đội ngũ vận hành

| Hạng mục | Thay đổi đã làm | Giá trị thực tế |
|---|---|---|
| A1. Publish cấu hình | Đồng bộ hợp đồng Admin → Edge → SQL; publish nguyên tử, kiểm tra phiên bản đang active, chống publish trùng khi thử lại | Tránh thông báo thành công khi cấu hình thực tế chưa đúng; không ghi đè âm thầm thay đổi của người khác |
| A2. Truy nguyên câu trả lời | Mỗi tương tác/lần thử/request có mã riêng, kèm phiên bản prompt, bộ ghép prompt, route, schema và dữ liệu tính toán/nội dung khi có | Feedback có thể liên hệ với cấu hình đã tạo câu trả lời, không dựa vào cấu hình hiện tại rồi đoán |
| A3. Feedback xuyên hệ thống | App gửi phản hồi theo câu trả lời hoặc phần nội dung; hàng đợi theo tài khoản; backend xác thực liên kết; Admin có inbox và trạng thái xử lý | Đội ngũ biết lỗi thuộc nhóm nào, phần nào, phiên bản nào và đã xử lý đến đâu |
| Tính trung thực của trạng thái | Tách AI hợp lệ, nội dung tham chiếu/fallback, lỗi kiểm tra và lỗi lưu; chỉ báo “Đã gửi” sau xác nhận đúng | Người dùng không nhận thông báo thành công giả khi offline hoặc backend lỗi |
| Bảo vệ dữ liệu | Luồng feedback chỉ nhận nhóm vấn đề và mã kỹ thuật; không nhận câu hỏi, bài AI, ghi chú hoặc dữ liệu sinh | Có thể điều tra metadata mà không mặc định thu thập thêm nội dung riêng tư |

Phạm vi tác động: entry point là Model Router trong Admin và thao tác góp ý trên bài Tarot/Astrology; dữ liệu mới là provenance trong bài đọc, queue theo tài khoản, biên nhận server và feedback. Admin vẫn giữ Content Operations, AI Studio và các tuyến hiện có. Không thay đổi thuật toán rút bài, calculator lá số, quyền premium, giá/credits hay thư viện 78 lá trong đợt này. Không phát sinh cuộc gọi AI thật trong kiểm thử.

## 2. A1 — sửa publish cấu hình

Hợp đồng `model_route_publish_v2` dùng cùng cấu trúc primary/fallback giữa Admin, Edge và SQL. Giá trị nhiệt độ bằng 0, fallback tắt và policy rỗng không bị thay bằng mặc định. Mỗi yêu cầu publish có mã ổn định để thử lại khi chưa biết kết quả; SQL kiểm tra bản active mà người duyệt đã nhìn thấy trước khi thay đổi.

Archive bản cũ, tạo bản mới và ghi audit nằm trong cùng giao dịch. Lỗi ở giữa không để lại trạng thái publish một phần. Quyền ghi trực tiếp từ client vào bảng cấu hình được thu hồi; dùng đường publish có kiểm tra quyền. Admin chỉ xóa phần draft đã publish khi biên nhận khớp đầy đủ cấu hình được duyệt. Draft của prompt/context khác vẫn giữ nguyên. Draft được phân theo tài khoản và backend; bản draft cũ không tự nhập sang môi trường mới.

Đọc lại cấu hình chứng minh cấu hình được lưu, **không chứng minh provider đã chạy**. UI tiếp tục phân biệt điều này. Phục hồi bản lịch sử tạo draft mới để duyệt, không sửa lịch sử.

## 3. A2 — truy nguyên và giữ đầy đủ câu trả lời

`nilaza.answer-provenance.v1` bao gồm:

- `interactionId`: cùng một hành trình; `attemptId` và `clientRequestId`: mới cho mỗi lần thử.
- Feature, ngôn ngữ, thời điểm tạo, loại nguồn, trạng thái kiểm tra và trạng thái lưu.
- ID/phiên bản prompt, prompt assembly, route, output schema, content hash hoặc phiên bản calculator/chart/report khi có.
- Remote ID, trace/provider request ID khi có và biên nhận server khi ghi thành công.

Tarot kiểm tra JSON có giới hạn: summary/reflection/sections, đúng locale, section key không trùng, card ID chỉ thuộc các lá đã chọn. Output bị cắt bị từ chối kể cả JSON tình cờ vẫn parse được. Nội dung lỗi đi vào fallback có nhãn; không đưa nguyên văn output lỗi lên màn hình như AI đã hợp lệ. Đây là kiểm tra cấu trúc và tham chiếu, không phải chứng nhận chất lượng diễn giải.

Astrology giữ kiểm tra schema và dữ kiện lá số; AI không tự tạo placement. Provenance nằm ngoài response schema của bài phân tích, đồng thời lưu cạnh bài trên backend. Khi lưu bài vào chart trên thiết bị, app giữ toàn bộ câu trả lời, phiên bản, ngôn ngữ và facts/caveats cần hiển thị; không chỉ giữ bản tóm tắt. Mở lại offline vẫn đọc được bài đã lưu.

Trace được kết thúc sau kiểm tra và lưu. Lỗi ghi usage hoặc biên nhận phụ trợ không làm mất câu trả lời đã lưu. Sau khi tạo biên nhận, endpoint bổ sung liên kết vào bản ghi bài đọc để hỗ trợ mở lại. Việc bổ sung này là best effort: nếu thất bại, bài hiện tại vẫn có biên nhận trong response/local save nhưng bản tải lại từ server có thể thiếu liên kết đó. Khi thiếu biên nhận, feedback vẫn được tiếp nhận với trạng thái chưa xác minh; không tự gán phiên bản/model.

## 4. A3 — feedback và Admin

### Trên app

Người dùng chọn nhóm: quá chung chung, sai lá bài/dữ kiện, khó hiểu, không phù hợp, lỗi ngôn ngữ hoặc lỗi kỹ thuật; có thể chọn toàn bài hoặc một phần. Nhãn section dễ đọc được hiển thị trên app, còn payload chỉ chứa ID.

App ghi queue trước khi gửi. Nếu offline, thông báo chờ gửi; mở lại panel trong phiên online sẽ thử lại tối đa ba mục đang chờ thuộc bài đó. Thử lại dùng cùng mã để không tạo bản trùng. Không có background worker tự gửi mọi bài. Nếu server xác nhận nhưng thiết bị chưa lưu được receipt, UI nói rõ và cho thử lại cùng mã. Nếu biên nhận bài đọc hết hạn, app chỉ gửi không kèm liên kết sau lựa chọn rõ ràng của người dùng.

Queue giới hạn 50 mục và dọn bản cũ hơn 30 ngày khi mở panel. Không hứa thiết bị không mở app vẫn tự xóa đúng ngày. Dữ liệu feedback thuộc local export. Xuất feedback server và xóa toàn bộ có ACK riêng; xóa giữ tombstone khi chưa hoàn tất để phản hồi cũ không bị tự gửi lại. Xóa feedback không xóa bài đọc.

### Backend

`ai-feedback` xác thực tài khoản không ẩn danh trước khi đọc JSON có giới hạn. Payload thêm ghi chú, đoạn trích hoặc object tùy ý bị từ chối. Receipt do service của server tạo; client không được tạo/sửa trực tiếp. Liên kết feedback phải khớp owner, feature, request ID, locale và section của receipt còn hiệu lực.

Submit có idempotency, giới hạn 20 phản hồi/giờ và 100/ngày. Bảng đặt trong schema riêng, bật forced RLS, không cấp client quyền đọc/ghi trực tiếp. Export/delete chỉ truy cập dữ liệu chính tài khoản. Xóa toàn bộ xóa cả receipt, kể cả receipt chưa có feedback; xóa một feedback không xóa receipt khác. Xóa tài khoản cascade các bản ghi liên quan.

Receipt/feedback quá 30 ngày không xuất hiện qua read path. Hàm purge vật lý đã được thực thi trong PostgreSQL cục bộ. **Lịch purge trên cloud chưa được cài hoặc xác minh**; đây là điều kiện nghiệm thu môi trường, không được quảng bá là đã vận hành.

### Admin

AI Studio có Feedback Inbox, lọc feature/trạng thái, hiển thị tối đa 100 mục mỗi lần tải, trạng thái chưa tải/loading/rỗng/lỗi, biên nhận và liên kết tìm trace. Triage dùng `open → investigating → resolved/dismissed` và kiểm tra revision để tránh ghi đè đồng thời. Quyền `safety.review` được kiểm tra lại tại request và SQL. Thay đổi tài khoản/quyền, rời trang hoặc ẩn workspace sẽ xóa dữ liệu nhạy cảm đang hiển thị; response muộn không được khôi phục nội dung của phiên cũ.

Admin phân biệt metadata do server xác nhận với nguồn do client khai báo. Trace cũ có nguồn ghi chưa xác minh vẫn được ghi nhãn như vậy, kể cả khi tìm thấy từ receipt. Không dùng trace cũ để tuyên bố toàn bộ workflow đã chạy đúng. Đợt này chưa lưu nội dung câu trả lời vào feedback nên đội ngũ có thể truy phiên bản/nhóm lỗi, nhưng không tự động đọc lại nguyên văn từ inbox. Bất kỳ cơ chế gửi đoạn trích có đồng ý hoặc raw QA capture nào cần thiết kế riêng.

Sơ đồ Tarot/Astrology trong Admin đã cập nhật mô tả validation, provenance và receipt theo mã hiện tại; 39 nguồn được ràng buộc hash. Không tô trạng thái node thành “đã chạy” chỉ dựa vào cấu hình hoặc HTTP 200.

## 5. Bằng chứng kiểm chứng cục bộ

| Kiểm tra | Kết quả |
|---|---|
| Mobile toàn bộ, cache riêng, timeout 15 giây/test | **323/323**, 52 suites |
| Admin regression, gồm publish/access/catalog và Feedback Inbox | **169/169**, đã tích hợp vào `npm run admin:test` |
| Handler/receipt/provenance/Tarot validator/trace qua Deno | **15/15** |
| Endpoint Tarot/Astrology chạy mã thật với boundary giả lập + SQL publish/feedback | **22/22** |
| TypeScript mobile; Deno check cả 4 Edge Function publish/feedback/Tarot/Astrology và helper | Đạt |
| Backend contracts, Admin contracts/generated assets, governance, Council contract | Đạt |
| Dataset, skill drift, source catalog, diff whitespace | Đạt |
| Expo web export và kiểm tra dung lượng | Đạt, **69,92 MB** |
| Browser: panel VI offline và EN gửi nhận ở 390×844; Admin ở 1440×1000 | Đạt với fixture cục bộ |

Các nhóm trên không cộng thành một số “E2E” duy nhất vì có phạm vi và phần giao nhau khác nhau. PGlite 0.5.8 chạy SQL thật với role/auth schema tổng hợp; không phải bằng chứng Supabase JWT hay đồng thời nhiều kết nối. Endpoint harness chạy source thật, chỉ giả lập provider/database/transport. Deno check toàn endpoint đã đạt sau khi cache đủ dependency công khai; không gọi provider hoặc backend khi kiểm tra.

Chạy lại nhóm luồng AI/SQL bằng `npm run ai-operations:test`; nhóm Admin bằng `npm run admin:test`. [Evidence manifest](../artifacts/ai-operations-2026-10-14/evidence.json) ghi kết quả, giới hạn và hash các nguồn chính; log Admin/AI operations nằm cùng thư mục.

Browser dùng component mobile thật và workspace guard thật với danh tính/ACK giả lập, chặn kết nối cloud. Nó kiểm chứng hiển thị và thao tác, không chứng minh App–Supabase đã chạy liên thông ở môi trường online. Fixture mobile dùng font regular chính thức cho kiểm tra layout; nghiệm thu trọng lượng font/native accessibility còn trên thiết bị thật. Lần chạy riêng đầu tiên của panel bị timeout 5 giây khi khởi động bộ test; chạy toàn suite với giới hạn 15 giây đã đạt, không sửa logic sản phẩm để né lỗi test.

![Feedback Inbox với dữ liệu QA tổng hợp](../artifacts/ai-operations-2026-10-14/admin-feedback.png)

Ảnh bổ sung: [mobile VI](../artifacts/ai-operations-2026-10-14/feedback-mobile-vi.png), [mobile EN đã nhận ACK giả lập](../artifacts/ai-operations-2026-10-14/feedback-mobile-en-sent.png), [Content Operations](../artifacts/ai-operations-2026-10-14/admin-content.png). Bản build/cache lớn được giữ cục bộ và loại khỏi Git trong thư mục bằng chứng; không phải gói phát hành.

## 6. Kịch bản nghiệm thu cho chủ sở hữu

Thực hiện trên QA sau khi migration và endpoint đã được đưa lên **đúng target được phê duyệt**:

1. Vào AI Studio → Tarot → Model Router. Chỉnh một giá trị, mở review; kiểm tra đúng feature, backend và phiên bản. Publish, tải lại, đối chiếu giá trị. Thử fallback None và temperature 0. Mở hai phiên Admin để kiểm tra phiên bản xung đột; draft phải còn, không thông báo thành công giả.
2. Tạo một bài Tarot VI và Astrology EN. Lưu bài, thoát/mở lại; nội dung đầy đủ và ngôn ngữ gốc phải còn. Kiểm tra provenance và receipt bằng tài khoản QA; gửi lại yêu cầu phải có attempt mới nhưng giữ interaction.
3. Góp ý “quá chung chung” cho một phần cụ thể. Online chỉ hiện Đã gửi khi có ACK. Offline phải hiện chờ gửi; mở lại online không tạo trùng. Đổi tài khoản khi request đang chạy: dữ liệu của tài khoản cũ không được hiện/lưu vào tài khoản mới.
4. Mở Feedback Inbox với quyền phù hợp; kiểm tra đúng feature, section, phiên bản, receipt và nhãn trace. Chuyển investigating; mở phiên khác sửa cùng revision để kiểm tra conflict. Tài khoản không có `safety.review` không được đọc hoặc triage.
5. Xuất feedback rồi xóa toàn bộ; kiểm tra queue, feedback và receipt của tài khoản QA đã mất, bài đọc vẫn còn, tài khoản QA khác không bị ảnh hưởng. Chạy kiểm tra purge và xác nhận lịch thực tế.
6. Trên iOS/Android: kiểm tra chữ lớn, màn hình nhỏ, cuộn/đóng modal, đổi ngôn ngữ, mất mạng và khởi động lại. Các đường happy/error/empty phải đọc được và không kẹt thao tác.

## 7. Đưa lên QA và hoàn tác

Hai migration mới là `20261014074711_model_route_publish_contract_v2.sql` và `20261014080754_ai_feedback_receipts_v1.sql`. Không sửa migration cũ, không `db push`/repair, không đổi URL/credentials, không bật allowlist cloud trong đợt này.

Theo quyết định phân bổ hiện tại, Singapore Free `etfajmrwyywokgafzxsb` là ứng viên canonical, còn binding hiện có vẫn trỏ legacy QA `akgrokwnkfqnfjqrildi`. Cần giải quyết migration ledger, map môi trường và duyệt packet exact-target theo [release runbook](release/RELEASE_RUNBOOK.md), [chuẩn bị Singapore Free](release/SINGAPORE_FREE_PREPARATION_2026-10-09.vi.md) trước khi áp dụng cloud. Bắt đầu bằng synthetic QA kín, tách riêng phê duyệt production.

Thứ tự đề xuất: kiểm tra migration trên DB QA sạch có prerequisite → apply đúng target đã duyệt → deploy cặp contract/endpoint tương thích → Admin đọc lại hợp đồng v2 → mobile QA → nghiệm thu các tình huống trên → production riêng. Không triển khai riêng Admin v2 trước backend hỗ trợ. Chuẩn bị snapshot cấu hình và evidence hash trước thay đổi.

Hoàn tác cục bộ chỉ hoàn tác các file thuộc đợt này sau khi tách khỏi dirty work hiện có. Trên cloud, ưu tiên deploy lại bộ phiên bản tương thích; giữ bảng/audit mới, không xóa dữ liệu hay sửa lịch sử migration để rollback. Khôi phục route qua draft và publish bản mới. Nếu receipt/feedback chưa sẵn sàng, UI phải thể hiện chưa gửi/chưa xác minh, không chuyển thành xác nhận giả.

## 8. Phần tiếp theo sau nền tảng A1–A3

Sau QA liên thông, dùng tập câu hỏi VI/EN cố định và rubric về độ cụ thể, đúng dữ kiện, chiều sâu, hành động gợi ý và an toàn để so sánh các phiên bản prompt. Feedback “sơ sài” là tín hiệu lựa chọn mẫu kiểm tra, không tự động chứng minh model kém hay prompt cần dài hơn. Đánh giá có người review trước khi đổi cấu hình cho toàn bộ người dùng.

Sau đó mới tiếp tục phần thư viện Tarot/Astrology sâu hơn, mở rộng nội dung đã biên tập và trải nghiệm người mới theo báo cáo trước. A1–A3 tạo khả năng đo và điều tra; chưa chứng minh chất lượng AI đã vượt ChatGPT hoặc tăng retention. Chưa có dữ liệu người dùng thật để đưa ra kết luận đó.

Skills đã đối chiếu bằng `npm run skills:check` và không drift. Plan-QC, brand và Tarot content QC vẫn phù hợp: provenance/receipt là hợp đồng tính năng và đã được ghi trong tài liệu observability, chưa phát sinh quy tắc thương hiệu hoặc phương pháp nội dung mới cần sửa skill. Bản ghi kế hoạch: `docs/feature-plans/ai-publish-provenance-feedback-2026-10-14.json`.
