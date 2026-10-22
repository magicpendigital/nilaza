# Android UX review — 2026-09-14

## Phạm vi và bằng chứng

Thiết bị Air1 Ultra, Android development client và APK độc lập ký debug; tài khoản online trên Nilaza Staging QA. Đã kiểm tra Home, Today Pulse, Explore, Oracle và Tarot portrait. Ảnh trong `.brand-work/ux-sep14` và `.brand-work/ux-sep20` chỉ phục vụ QA nội bộ vì có tài khoản thật; không dùng làm ảnh Help/store/social. Một số ảnh chụp nhầm trạng thái hoặc màn hình tắt không được dùng làm bằng chứng.

## Phát hiện và điều chỉnh

| Mức | Vấn đề | Điều chỉnh / trạng thái |
| --- | --- | --- |
| Chặn sử dụng | Native gọi `window.addEventListener` của web | Effect giới hạn Platform web; đã mở Home trên thiết bị. |
| Cao | Oracle chạy fallback do phiên Metro bỏ dotenv | Nạp lại env; Expo public env dùng cú pháp dot tĩnh; online login/Home đã xác nhận. |
| Cao | Oracle trả `User Safety: safe` | Staging chuyển sang `2026-09-14-oracle-pinned-v2`, model `nex-agi/nex-n2.5-mini:free`; bản cũ archived. Hai lượt QA sau đổi route thành công, không fallback; thiết bị hiển thị câu hỏi phản chiếu tiếng Việt bình thường (ảnh 21). |
| Cao | Today Pulse mở thẳng nội dung | Thêm bước chủ động chạm lá bài; đóng trước khi chạm không đánh dấu đã xem; người quay lại xem nội dung cũ. Đã kiểm tra trên máy và interaction test. |
| Cao | Tarot không xác nhận rõ từng lá, CTA ngoài vùng nhìn | Trung tâm hiển thị mặt trước lá vừa rút, số lá đã rút, dock tiếp tục và bước Xem thông điệp sau đủ lá; back-to-top dùng absolute trong khung. Đã xác nhận lại trên APK 20/09. |
| Vừa | Explore tiêu đề dài chiếm phần đầu, Tarot CTA dưới nếp gấp | Tiêu đề Khám phá và mô tả ngắn; CTA Tarot hiện ngay trên thiết bị. |
| Vừa | Oracle dùng avatar N và hiện intent/moderation kỹ thuật | Dùng symbol Open Reflection; ẩn metadata kỹ thuật, giữ nhãn phản hồi dự phòng dễ hiểu. Device và hai unit test xác nhận. |
| Vừa | Chat danh sách gần đây đẩy người dẫn chuyện xuống quá sâu | Đề xuất chỉ hiện 2–3 phiên gần đây và nút Xem tất cả; cần kiểm tra toàn bộ đường vào trước thay đổi. |
| Vừa | Oracle ba thẻ gợi ý chiếm nhiều chiều cao ở màn hẹp | Đề xuất hành động chính rõ ràng, các đường chuyển tính năng gọn hơn; chưa thay hợp đồng action cards. |
| Cao | Oracle giữ vị trí cuộn cũ sau gửi, câu trả lời mới nằm bên dưới | Đưa lượt mới vào vùng nhìn khi layout hoàn tất; không đổi các phòng chat khác. Đang kiểm chứng trên binary mới. |
| Cao | Tarot lỗi đọc có thể giữ trạng thái bận; rút nhanh có thể chọn lại sau đã mở lá | Trả về trạng thái cho thử lại khi lỗi; ẩn/chặn rút nhanh sau lá đầu, giữ bộ lá đã chọn. Kiểm chứng native tiếp theo. |

## Kiểm tra kỹ thuật

- Mobile TypeScript đạt; bộ đầy đủ trước chỉnh Oracle: 162 tests / 24 suites đạt. Hai test Oracle mới đạt riêng (metadata và fallback).
- Backend contract và data validation đạt. Supabase readiness: 67 pass, 9 cảnh báo env/runtime/observability, 0 fail.
- Build standalone ngày 14/09 và 15/09 đã đạt sau khi đồng bộ Gradle root và Metro server root về mobile workspace. Đã cài cập nhật và xác nhận chạy khi adb reverse trống, không có Metro; xem bằng chứng bổ sung bên dưới.

## Cổng còn lại

### Bằng chứng bổ sung 15–16/09

Phát hiện khi khởi động lại cuối vòng: `useDailyInsight` ưu tiên cache bất kể `dateKey`, còn hydration chỉ giữ cờ đã xem của ngày hiện tại. Cache cũ vì vậy làm cờ không khớp. Phạm vi sửa thêm: chỉ nhận cache cùng ngày, còn lại dùng fallback hiện có; không xóa cache/user data, không thay API, consent, credits hoặc analytics. Test hồi quy cho cache hôm qua và kiểm tra mở lại trên thiết bị là cổng bắt buộc trước bàn giao tiếp; bản checksum bên dưới tạm được thay thế khi binary mới sẵn sàng.

**Bản bàn giao cuối 16/09:** `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`, 91.117.481 bytes, SHA-256 `8603F671441813539F3EEE1532976D41138E99B73F2ED9960CA2D1A2D0E63EFE`. Build đạt 7 phút 47 giây; apksigner verify đạt (Android Debug, nội bộ). Đã cài cập nhật thành công trên Air1 Ultra và mở lại không có adb reverse. Bản này gồm dòng hướng dẫn xem lá đã sửa. TypeScript đạt sau sửa cuối. Các bước nghiệm thu chi tiết bên dưới dùng bản 15/09, chỉ khác dòng hướng dẫn này.

- APK ngày 15/09 build đạt trong 7 phút 3 giây; đã cài `install -r`, giữ tài khoản. SHA-256 `A69B62E807D88568F178438A282C84D926FFE9090F07C3F1CCAE6DF39CE232D5`. Ngắt adb reverse, mở từ launcher vẫn qua splash và vào Home (ảnh 35–36). AI online cần Internet, không cần Metro/USB.
- Oracle trên binary này trả lời QA ngày 16/09 lúc 16:20 UTC, trace model pinned v2, fallback=false; câu trả lời tự vào vùng nhìn (ảnh 38). Phản hồi fallback cũ vẫn được giữ trong lịch sử và gắn nhãn minh bạch.
- Trải ba lá: mặt trước thay đổi ngay ở trung tâm, đếm 1/3 → 2/3 → 3/3 và chờ Xem thông điệp (ảnh 31–33). Trải một lá cũng chờ Xem thông điệp sau 1/1 (ảnh 41).
- Nút lên đầu hiển thị đầy đủ trên dock và bấm quay lại lá trung tâm (ảnh 43–44).
- Xem thông điệp chuyển sang kết quả và giữ đúng King of Wands đã mở trong trải một lá (ảnh 45). Today Pulse trên APK: mở lần đầu thấy mặt lưng; đóng/mở lại vẫn chưa lộ nội dung (ảnh 46–47); chỉ sau chạm mới hiện lá và nội dung (ảnh 48).
- Help VI/EN, owner-facing end-user guide và PRD được cập nhật theo nghi thức thực tế. Public-content/corpus check đạt 22 tài liệu / 56 chunks; Astro check đạt, web build đạt. Không publish website hoặc bộ Office cũ.
- Phát hiện nhỏ: nhãn Chạm vào bộ bài để rút còn hiện sau khi mở lá. Đã sửa thành Chạm lá bài để xem rõ hơn; bản đóng gói 16/09 đang chạy, thay đổi này chưa có trong ảnh 41–44.

### Tối ưu tiếp theo được đề xuất từ màn hình thực tế

- Thẻ giải nghĩa lá bài trên màn hẹp nên xếp ảnh nhỏ phía trên và đoạn giải nghĩa toàn chiều rộng, tránh cột chữ quá hẹp.
- Mở rộng kiểm thử tình huống lỗi/thử lại khi backend không sẵn sàng và rút nhanh, trước khi coi Tarot đạt toàn bộ trạng thái ngoại lệ.

### Theo dõi xác nhận 2026-09-20

**APK QA hiện hành:** `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`, SHA-256 `EE1C565A6A10079F336F72139AA4735B8EB408AF0BD4AE76E787DF20A940F6AF`. Build arm64 release-mode đạt trong 2 phút 48 giây; `apksigner verify` đạt với Android Debug certificate. Đã cài `adb install -r` trên Air1 Ultra, giữ nguyên dữ liệu, gỡ `tcp:8081` và mở lại từ launcher. Đây là APK kiểm thử nội bộ, không phải binary phát hành store.

- Sau khởi động lại, Home hiển thị CTA “Bắt đầu phút phản chiếu” của ngày hiện tại thay vì nội dung cache cũ. Test hồi quy bảo vệ điều kiện `dateKey` đã đạt.
- Today Pulse mở lá úp trước; nội dung chỉ lộ sau khi người dùng chạm lá.
- Phản hồi AI đã hoàn tất không còn giữ dock cố định trên Home/Explore. Chuông thông báo và Inbox vẫn là đường quay lại bền vững; dock chỉ hiện khi tác vụ còn đang chạy.
- Tarot dùng wordmark Open Reflection ở bước biên tập. Thẻ bộ bài giữ ảnh đúng tỷ lệ `contain` trong khung thấp hơn, nên Moon Garden, mô tả hai dòng, nút tìm hiểu và CTA tiếp tục cùng nằm trong vùng nhìn.
- Luồng rút ba lá: trước rút có lá úp và CTA rõ; sau lá đầu có mặt trước trung tâm, “1 / 3 lá”, nội dung hướng dẫn và CTA “Rút lá tiếp theo” trong vùng nhìn. Không gửi tổng hợp AI ở bước này.
- TypeScript đạt; full mobile suite đạt 25 suites / 165 tests. `validate:brand`, `assets:generate -- --check`, `validate:visual-assets` và `validate:data` đạt.

1. Landscape, font lớn, Reduce Motion, screen reader, iOS và tablet chưa nghiệm thu.
2. Hướng dẫn Help VI/EN đã bổ sung nghi thức; corpus đã sinh lại. Office/PDF/slide đã chuẩn bị ngày 13/09 cần cập nhật ảnh/flow theo RC mới trước công khai. Chưa phát hành chính thức.

Rollback Oracle: trong cùng transaction archive v2 và active lại `2026-09-08-oracle-openrouter-v1`; bản cũ có lỗi chọn model nên chỉ dùng khẩn cấp. Không đổi moderation, consent, schema, auth hoặc credits. Không có nội dung chat riêng tư trong báo cáo này.
