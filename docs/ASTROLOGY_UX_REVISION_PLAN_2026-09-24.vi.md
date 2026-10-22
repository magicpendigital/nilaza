# Kế hoạch chỉnh UX Astrology — 2026-09-24

## Mục tiêu và tiêu chí nghiệm thu

Chỉnh trải nghiệm Astrology trên điện thoại theo phản hồi review: bản đồ có không gian phóng lớn dễ đọc hơn; bảng nội dung chuyển trạng thái mượt và có chế độ thu gọn hữu ích; dữ liệu cá nhân được phân biệt rõ với thư viện biểu tượng; trang vào và form tạo bản đồ dễ hiểu, ít dồn chữ; giờ sinh ước chừng/không rõ được trình bày trực quan mà không giả định độ chính xác.

Nghiệm thu được khi: (1) bản đồ có thể phóng lớn đến mép vùng xem mà không bị cắt trong một ô vuông nhỏ; (2) bảng có ba nấc rõ ràng, nấc thu gọn vẫn cho biết điểm đang đọc và có nút mở; (3) tab Dữ liệu ghi rõ chỉ chứa dữ kiện của bản đồ hiện tại; biểu tượng thư viện được gắn nhãn riêng; (4) nút tạo bản đồ và khám phá thần thoại được nhìn thấy sớm trên trang vào; (5) form giải thích giờ sinh, độ lệch và nơi sinh bằng câu ngắn, nhãn dễ hiểu; (6) dữ liệu không chắc chắn hiển thị dưới dạng nhiều khả năng, không tạo một vị trí giả; (7) không đổi hợp đồng, cách tính, lưu trữ hoặc gọi AI.

## Phân luồng và phạm vi

- Lane: mobile UI/UX, copy và visual composition.
- Điểm vào: Explore → Astrology → trang giới thiệu; tạo bản đồ; mở bản đồ tương tác; chạm một vị trí; chuyển Story / AI Guide / Data; Android Back.
- Files dự kiến: `apps/mobile/src/features/astrology/AstrologyChartStory.tsx`, `apps/mobile/src/features/astrology/ZodiacWheel.tsx`, `apps/mobile/src/features/astrology/AstrologyExperience.tsx`; tài liệu review và kế hoạch này.
- Dữ liệu: không thêm trường, không ghi dữ liệu mới; giữ nguyên AsyncStorage, lịch sử phiên bản, xóa/xuất dữ liệu, kết quả chart và thư viện chương.
- Backend / canonical contract: không đổi endpoint, migration, prompt, `council-contract.json`, astrology chart contract hay provider boundary. Preview AI tiếp tục không gửi yêu cầu hay trừ credits.
- Admin: không đổi quyền xem, redaction, audit hay readiness.
- Quyền riêng tư/an toàn: dữ liệu sinh tiếp tục được tính local; không log thêm birth data; không đưa ra dự đoán tất định. Bản đồ giờ không rõ/ước chừng chỉ thể hiện các khả năng đã có trong dữ liệu mẫu.
- Analytics/observability: không thêm event; blind spot hiện tại giữ nguyên.
- Visual: chỉ dùng tài sản Astrology đã được khai báo. Không mô phỏng bầu trời thiên văn theo tên cung nếu chưa có phép tính và nguồn tọa độ thiên thể thực; biểu tượng cung nếu có phải nói rõ là minh họa biểu tượng.
- Các bề mặt được xem xét nhưng không sửa: Tarot, Chat, Journal, Profile, AI Council, Supabase, payments/entitlements, Admin, brand assets chung.
- Rollback: hoàn nguyên riêng các chỉnh sửa ba component Astrology; không có migration hay dữ liệu cần phục hồi. Bản đồ local và luồng thư viện vẫn là đường lui.
- Handoff: chủ sở hữu Nilaza review APK nội bộ; phạm vi agent chỉ là ba component UI và tài liệu. Dữ liệu được phép xử lý: UI/copy và chart presentation local; dừng nếu cần thay đổi tính toán, schema, backend, payment hoặc phát hành công khai.

## Hướng thiết kế cho chín góp ý

1. Mở vùng nhìn của canvas thành viewport rộng theo màn hình, để chart phóng tràn qua kích thước minh họa nhưng vẫn được cắt tại mép màn hình; giữ nút thu phóng/đặt lại dễ tìm.
2. Dùng chuyển động spring có giới hạn, chỉ nhận kéo ở vùng tay nắm/nút điều khiển, đồng thời tôn trọng Reduce Motion.
3. Tách lớp bản đồ khỏi sheet bằng cách tính vùng canvas theo độ cao sheet hiện tại; bỏ nhãn AI trang trí ở cạnh; giữ nút lựa chọn chính trong vùng nhìn.
4. Đổi tiêu đề tab thành “Dữ liệu trong bản đồ này”; nêu rõ các vị trí/nhà/góc là dữ kiện của chart hiện tại, còn cung được chạm trong thư viện là nội dung biểu tượng chung.
5. Chế độ peek hiển thị tóm tắt điểm đang chọn và thao tác “Mở câu chuyện”, không để lộ các đoạn bị cắt.
6. Đưa hai hành động chính “Tạo bản đồ sao cá nhân” và “Khám phá 12 cung” lên đầu trang; dồn giải thích và cấu hình phụ xuống dưới hoặc vào mục mở rộng; thử nghiệm một chuyển cảnh nhẹ có hỗ trợ Reduce Motion.
7. Chưa dùng hình chòm sao thiên văn thật làm nền theo cung nhiệt đới. Có thể dùng artwork biểu tượng cùng ngôn ngữ thần thoại và nhãn minh họa; chỉ liên kết với chòm sao quan sát được khi có catalog/ephemeris và kiểm tra alignment.
8. Với giờ ước chừng/không rõ, biểu diễn các cung khả dĩ thành chip có glyph/màu và nhãn “khả năng”; giữ cảnh báo lấy mẫu 15 phút và không vẽ một điểm giả.
9. Viết lại nhãn form theo ngôn ngữ hành động: ngày sinh, giờ địa phương tại nơi sinh, sai số ± phút, thành phố sinh; chỉ hiện giải thích tương ứng với lựa chọn giờ và chuyển ghi chú phương pháp dài thành disclosure.

## Kiểm tra và đường dẫn review

- Kiểm tra tĩnh: `npm --workspace apps/mobile run check`; test Astrology hiện có; `npm run validate:data`; `npm run validate:visual-assets`; Metro web export và Android embedded bundle.
- QA tay: vào Astrology từ Explore; xác nhận hai CTA; tạo chart exact/approximate/unknown; xác nhận nội dung ranges; mở chart; kéo sheet giữa ba nấc; phóng/pan bản đồ tới mép; chạm Sun/Moon/đường nối; đổi tabs; xác nhận dữ liệu và highlight cùng điểm; kiểm tra Android Back và Reduce Motion.
- Không xóa app data. Nếu build/cài lại để test, giữ dữ liệu cài đặt hiện tại.
- Thành công quản lý kiểm chứng được qua ảnh chụp màn hình mới trên Android và thao tác trên APK review; không suy diễn từ mô phỏng browser.

## Nhật ký thực thi — 2026-09-24

- Đã chạy `npm --workspace apps/mobile run check`, toàn bộ Jest (`35` suites / `207` tests), `npm run validate:data`, `npm run validate:visual-assets`, web export và Android Hermes bundle export; đều đạt.
- Đã cài APK review mới nhất bằng `adb install -r`; không gỡ ứng dụng hay xóa dữ liệu. Thiết bị đã mở khóa và kiểm thử trực tiếp portal, chart đã lưu, map, sheet, chọn placement và tab dữ liệu.
- Trong lượt test trực tiếp phát hiện tiêu đề map immersive chồng lên status bar. Đã sửa safe area, đóng gói/cài lại APK cùng debug certificate, rồi xác nhận tiêu đề nằm dưới status bar trên máy thật.
- QA giờ ước chừng/không rõ đã chạy đến report trên điện thoại bằng dữ liệu tổng hợp; glyph, chip các cung khả dĩ, thông điệp lấy mẫu và khoảng UTC hiển thị đúng. Đã thoát trước thao tác lưu; dữ liệu hồ sơ hiện tại không bị sửa và không có chart mới được lưu.
- Cổng Astrology có hai CTA chính trên màn hình đầu. Animation mở cổng nhiều lớp chưa nằm trong candidate; đề xuất đánh giá như một lớp polish độc lập với Reduce Motion sau khi chốt UX cơ bản.
- Gradle release build bị chặn do thiếu dependency Maven/Gradle trong cache. APK review dùng native APK có sẵn với Hermes bundle mới; đây chỉ là candidate để xem thay đổi UI/JavaScript, không phải bản phát hành.

## Bổ sung UX theo ảnh thiết bị — bản đồ cá nhân chưa hiện trực tiếp

### Mục tiêu và nghiệm thu

- Khi mở chart cá nhân đã tính, vòng bản đồ phải nhìn thấy ngay mà không cần chạm nút mở immersive; bản đồ là hình ảnh chính, nút phóng lớn có nhãn dễ hiểu.
- Sheet khởi đầu ở mức peek hữu ích để chừa vùng nhìn cho vòng bản đồ; người dùng vẫn mở được Câu chuyện, Người dẫn đường và Dữ liệu bằng tay nắm hoặc tab.
- Nội dung tóm tắt ở peek cách mép ngang ít nhất theo token `spacing.screen`; các bài đọc tiếp tục dùng token khoảng cách chung hiện tại.
- Xác nhận layout trên Android 1080×2460 và viewport nhỏ/thiết bị hẹp; không cắt vòng, text không chạm mép, thao tác chọn chart vẫn hoạt động.

### Whole-App Impact Brief

- Entry: Explore → Astrology → mở chart cá nhân đã lưu → Chart Story; luồng chart mới giữ nguyên.
- Data/backend/contracts/AI/admin/analytics: không đổi. Chỉ đọc dữ liệu chart hiện có; không lưu thêm, không gửi birth data, không gọi AI hay trừ credits.
- UI/accessibility/localization: đổi trạng thái sheet mặc định, tính kích thước theo chiều cao thực của vùng Astrology, đặt nhãn chữ cho hành động phóng lớn; dịch VI/EN và giữ nhãn vòng tương tác.
- Assets: dùng lại ZodiacWheel và artwork Astrology đã khai báo; không tạo asset mới.
- Files dự kiến: `AstrologyChartStory.tsx`, test của component, audit/plan report. `ZodiacWheel.tsx` chỉ đổi nếu cần nhãn kiểm thử/viewport.
- Surfaces để nguyên: portal, form, calculator, mythology, AI guide contract, account persistence, Tarot, Chat, Journal, Profile, Admin, Supabase, billing.
- Rollback: hoàn nguyên component story và test; không cần migration hay phục hồi dữ liệu.

### Xác nhận

- Mobile check, Astrology component tests, toàn bộ Jest, validate visual assets và kiểm tra Android trên chart đã lưu.
- Tiêu chí quản lý: mở chart đã lưu → vòng bản đồ thấy ngay → chạm placement và thấy câu chuyện tương ứng → phóng lớn qua nút có nhãn → thu sheet/mở story; không cần lưu hoặc tạo chart mới.

### Cập nhật sau kiểm thử thiết bị — canvas inline vẫn rỗng

- APK ARM64 review đã cài đè thành công và giữ nguyên chart đã lưu. Nút **Mở lớn** hiện rõ; chế độ immersive mở đúng vòng sao.
- Ảnh chụp thiết bị xác nhận vòng vẫn không được vẽ trong vùng chart thông thường. Vì vậy chưa đạt nghiệm thu dù compile và test tự động đều qua.
- Điều chỉnh tiếp theo: mặc định peek để ưu tiên chart; đổi vùng canvas từ ràng buộc top/bottom hoạt ảnh sang viewport có `height` đo/cấp rõ ràng theo chiều cao root trừ sheet hiện tại; đặt `ZodiacWheel` trong khung vuông kích thước tính từ viewport. Gắn testID cho vùng này để đo bounds trên máy.
- Test component sẽ xác nhận luồng ban đầu là chart + nút mở câu chuyện; các bài test cần nội dung Story/Guide/Data sẽ mở sheet trước khi kiểm tra.
- Nghiệm thu thiết bị cập nhật: ở peek, vòng 12 cung nhìn thấy ngay, nằm gọn trong viewport; ở focus bản đồ co vừa vùng còn lại; immersive vẫn hoạt động. Nếu chart vẫn vắng, dùng bounds testID/logcat để điều tra tiếp thay vì kết luận đạt.

### Kết quả kiểm thử lại trên Android — 2026-09-24

- Bản APK ARM64 sau khi cấp chiều cao canvas rõ ràng được cài đè thành công; dữ liệu chart lưu cục bộ vẫn còn nguyên.
- Mở chart đã lưu ở trạng thái peek: toàn bộ vòng bản đồ xuất hiện ngay, không cần chạm nút phóng lớn. Nút **Mở lớn** có cả biểu tượng và nhãn chữ.
- Mở rộng sheet: tab Câu chuyện, Người dẫn đường và Dữ liệu dùng được; các đoạn nội dung chính có lề an toàn rõ ràng ở hai bên, không áp sát cạnh màn hình. Tab Dữ liệu tiếp tục thể hiện riêng chart đang mở.
- Immersive mở đúng bản đồ; nút zoom đổi mức hiển thị từ 100% lên 125% và bản đồ vẫn nằm trong vùng xem.
- Chưa thấy lỗi hiển thị hoặc lỗi thao tác trong kịch bản kiểm thử trên thiết bị. Không tạo hay sửa chart trong quá trình test.
- APK review: `.brand-work/astrology-inline-chart-review-2026-09-24/nilaza-chart-visible-arm64-peek.apk`; ARM64, cài đặt review nội bộ, ký bằng Android Debug certificate. SHA-256: `F30FA1D21669A87DF4D4BE66735E9FB1B492E6B6448C393DA9E188CA7854BF09`.

## Kế hoạch chỉnh lớp liên kết và trọng tâm bản đồ — 2026-09-24

### Mục tiêu và tiêu chí nghiệm thu

- Khi chọn một thiên thể, điểm đang đọc được làm nổi rõ trên vòng và khớp với phần nội dung đang mở.
- Chỉ các góc hợp trực tiếp nối với thiên thể đang chọn được nhấn mạnh; các góc khác lùi xuống để giảm giao cắt. Khi chọn riêng một góc hợp, hai đầu mút và đường tương ứng cùng được nhấn mạnh.
- Bỏ ba đường dẫn của Big Three đang hội tụ tại cùng một điểm trên bản đồ; lựa chọn Sun/Moon/Ascendant tiếp tục đồng bộ với bản đồ và nội dung qua trạng thái focus.
- Danh sách toàn bộ góc hợp tiếp tục truy cập được trong tab Dữ liệu; màu sắc không phải tín hiệu duy nhất để phân biệt.
- Không đổi phép tính vị trí/góc hợp, dữ liệu lưu, AI contract, privacy boundary, điều hướng hoặc nội dung diễn giải.

### Whole-App Impact Brief

- Entry: Explore → Astrology → chart cá nhân → vòng tương tác; chạm điểm/góc hợp và xem các tab hiện có.
- UI: sửa cách vẽ điểm, aspect lines và focus trong `ZodiacWheel`; bỏ prop `guideMode` chỉ dùng để vẽ các đường hội tụ khỏi component và hai caller trong `AstrologyChartStory`; thêm chú giải màu và kiểu nét VI/EN cạnh danh sách góc hợp trong tab Dữ liệu.
- Data/storage/backend/canonical contracts/AI/Admin/analytics: không đổi; chỉ đọc chart đã tính và selection state trong màn hiện tại, không ghi hay gửi dữ liệu mới.
- Privacy/safety: giữ nguyên ranh giới birth data local và ngôn ngữ tự phản chiếu; không thêm dự đoán hoặc tuyên bố độ tin cậy mới.
- Accessibility/localization: giữ nhãn VI/EN, tương tác chọn điểm/khía cạnh, trạng thái focus có thể kiểm tra bằng test; tôn trọng Reduce Motion vì không thêm animation bắt buộc.
- Visual assets: không thêm asset; dùng token màu hiện có và cấu trúc SVG hiện có.
- Surfaces cố ý không sửa: calculator, chart schema, AI guide/prompt, dữ liệu nội dung, Tarot, Chat, Journal, Profile, Admin, Supabase, billing và các event analytics.
- Rollback: hoàn nguyên các thay đổi ở `ZodiacWheel.tsx`, `AstrologyChartStory.tsx` và test; không có dữ liệu hay migration cần phục hồi.

### Kiểm thử và đường dẫn quản lý

- Kiểm tra selection focus, độ ưu tiên nét và style mapping bằng test deterministic cho các trường hợp body, aspect và không có lựa chọn; xác nhận chú giải phản ánh đúng style của nét trên bản đồ.
- Chạy `npm --workspace apps/mobile run check`, test Astrology liên quan và toàn bộ Jest.
- Kiểm thử màn chart trên Android: chọn Sun/Moon/Ascendant; xác nhận đúng nút và điểm được sáng; chọn góc hợp; xác nhận hai đầu mút và đường đó nổi hơn; kiểm tra lưới nền không còn ba đường cùng hội tụ; tab Dữ liệu vẫn liệt kê đủ góc hợp.
- Build/cài đè APK review để xác nhận cách native SVG hiển thị các kiểu nét và màu trên thiết bị; giữ nguyên dữ liệu cài đặt hiện có.

### Kết quả triển khai và review Android — 2026-09-24

- `ZodiacWheel` giờ chuẩn hóa `body:<id>` trước khi tìm điểm tiêu điểm. Khi chọn thiên thể, điểm, nhãn và các góc hợp trực tiếp sáng rõ; liên kết không liên quan lùi xuống. Khi chọn một góc hợp, hai điểm đầu cuối và đường tương ứng được nhấn mạnh.
- Mỗi loại góc hợp có màu và kiểu nét riêng: đồng vị liền vàng, lục hợp chấm xám trăng, vuông góc gạch hồng, tam hợp nét kết hợp màu ngà, đối đỉnh chấm hồng. Chú giải VI/EN nằm trong tab Dữ liệu ngay trước danh sách góc hợp.
- Đã bỏ ba đường hội tụ Big Three trong Guide; trạng thái Sun/Moon/Ascendant vẫn cập nhật chart và nội dung qua cùng selection.
- `npm --workspace apps/mobile run check` đạt; test Astrology liên quan đạt `13/13`; toàn bộ Jest mobile đạt `36/36` suites và `211/211` tests; `git diff --check` đạt.
- Đóng gói ARM64 bằng `.\gradlew.bat -PreactNativeArchitectures=arm64-v8a :app:assembleRelease`; APK xác nhận ký v2 hợp lệ, cài đè bằng `adb install -r` thành công. Bản đồ đã lưu còn nguyên sau cài đặt; kịch bản không tạo/sửa/lưu chart.
- Review trên điện thoại 1080×2460: mở chart đã lưu; chọn Mặt Trăng; xác nhận vị trí và các đường trực tiếp đồng bộ; mở Dữ liệu; chọn một góc hợp; xác nhận hai đầu mút sáng và đường nối theo đúng ký hiệu; cuộn xem chú giải đủ năm loại. Đã kiểm tra logcat, không ghi nhận fatal exception hoặc lỗi JS TypeError/ReferenceError/Unhandled trong lượt test.
- APK nội bộ: [nilaza-aspect-focus-arm64.apk](../.brand-work/astrology-aspect-focus-review-2026-09-24/nilaza-aspect-focus-arm64.apk), SHA-256 `83CACBAED664BF5E10766C5F38064127B8BA578E26F4BADA893817B393631072`. Candidate dùng debug signing; chỉ để review, chưa phải bản phát hành store.
- Ảnh bằng chứng: [bản đồ sau khi chọn góc hợp](../.brand-work/astrology-aspect-focus-review-2026-09-24/aspect-selected.png), [chú giải trong tab Dữ liệu](../.brand-work/astrology-aspect-focus-review-2026-09-24/data-scrolled.png), [Mặt Trăng được chọn](../.brand-work/astrology-aspect-focus-review-2026-09-24/moon-selected.png).
- Phần chưa được chứng minh: chưa chạy thử nghiệm người dùng thật hoặc accessibility với TalkBack; đây là kiểm thử kỹ thuật/UX trên một điện thoại Android.
