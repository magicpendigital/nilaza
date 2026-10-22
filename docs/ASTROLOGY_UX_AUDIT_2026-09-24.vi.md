# Báo cáo kiểm tra UX Astrology — 2026-09-24

## Kết quả triển khai và cài đặt

Ứng viên UI cuối cùng đã được cài đè lên Android `Q88549EEXCUOONGA` bằng `adb install -r`, không gỡ app và không xóa dữ liệu. Package/version trên máy là `app.nilaza.mobile` / `0.1.1` / version code `2`; chữ ký debug giữ nguyên certificate của bản đã cài. Sau kiểm thử, ứng dụng đang ở tab Explore; hai report dữ liệu tổng hợp đã thoát trước bước lưu.

APK: `.brand-work/astrology-ux-review-2026-09-24b/nilaza-astrology-ux-review-safearea.apk`  
SHA-256: `AA52C412F1C25174492EF5CDDF6EC6B941A3EF975737CA59B539969A5749E7AC`

Gradle `assembleRelease` chưa hoàn tất vì môi trường thiếu một số JAR Maven/Gradle trong cache và không tải đủ dependency. Candidate này lấy native APK review đã cài, thay bằng Hermes bundle mới, rồi zipalign và ký bằng cùng debug certificate. Bundle trong APK trùng SHA-256 với bundle vừa xuất; chữ ký v2/v3 hợp lệ. Đây là APK review JavaScript/UI, chưa phải native release build.

## Kiểm tra tự động

- `npm --workspace apps/mobile run check` — đạt.
- `npm --workspace apps/mobile test -- --runInBand` — đạt, 35 suites / 207 tests.
- `npm run validate:data` — đạt.
- `npm run validate:visual-assets` — đạt.
- Expo web export và mobile-export validation — đạt.
- Android embedded Hermes bundle export — đạt.
- APK alignment, signature, package update và cài đè — đạt.
- Logcat sau khi mở lại form, chart, sheet và map không có fatal exception hoặc lỗi React Native.

## Kết quả theo chín góp ý

| # | Điểm cần xem | Kết quả trên Android |
|---|---|---|
| 1 | Zoom bị giới hạn trong ô vuông | **Đạt.** Map ở 100% hiển thị trọn vòng; ở 125% hình tràn tới mép viewport và bị cắt theo mép màn hình, không còn khung vuông nhỏ. Nút − / 100% / + hoạt động. Ảnh: `device/41-immersive-safearea.png`, `device/42-zoom-safearea.png`. |
| 2 | Bottom sheet thiếu mượt | **Đạt trong thao tác kiểm tra.** Vuốt từ focus xuống peek và chạm tay nắm để mở lại đều phản hồi; spring kết thúc đúng nấc, không kẹt trạng thái. |
| 3 | Sheet đè map/mất nút; nhãn AI trang trí vướng dữ liệu | **Đạt.** Bản đồ tương tác mở thành vùng toàn màn hình riêng, không bị sheet phủ; selector Big 3 vẫn hiện ở peek. Không thấy ribbon AI trang trí chồng lên chart. **Đã phát hiện và sửa** tiêu đề immersive ban đầu chồng thanh trạng thái Android bằng cách lấy chiều cao status bar làm safe-area tối thiểu; xác nhận lại trên APK mới. |
| 4 | Tab Dữ liệu có thể bị hiểu là nội dung cung chung | **Đạt.** Tab ghi “Dữ liệu trong bản đồ này” và giải thích dữ kiện lấy từ chart đang mở. Chạm Mặt Trăng đổi placement đang chọn; chọn vị trí trong map cũng đổi phần story tương ứng. |
| 5 | Peek sheet bị cụt nội dung | **Đạt.** Peek chỉ giữ ba chip Mặt Trời/Mặt Trăng/Cung Mọc, điểm đang đọc, mô tả ngắn và thao tác “Mở”; không lộ đoạn văn bị cắt. Chạm tay nắm mở lại được. |
| 6 | Trang portal dài, CTA và đề xuất animation | **Đạt về phân cấp.** “Tạo bản đồ sao cá nhân” và “Khám phá 12 cung” cùng xuất hiện trên màn hình đầu. Chuyển cảnh nhiều lớp kiểu mở cổng chưa nằm trong APK này; đề xuất làm một animation ngắn, có Reduce Motion ở vòng polish riêng sau khi xác nhận bản đồ và kết quả tính ổn định. Ảnh: `device/18-portal.png`. |
| 7 | Có nên thêm hình chòm sao thiên văn theo cung? | **Chưa triển khai có chủ đích.** Không gắn cung nhiệt đới với chòm sao quan sát thật khi chưa có catalog/ephemeris và kiểm tra alignment; giữ artwork biểu tượng để tránh khẳng định sai về thiên văn. |
| 8 | Giờ ước chừng/không rõ thiếu thu hút thị giác | **Đạt trên dữ liệu tổng hợp, không lưu.** Đã tính report tại chỗ cho ngày thử nghiệm `2000-01-01`, Hà Nội ở cả chế độ không rõ giờ và ước chừng ±30 phút. Hai report dùng thẻ theo từng hành tinh, glyph màu, chip các cung khả dĩ và lời giải thích lấy mẫu; chế độ ước chừng xác nhận khoảng UTC một giờ. Đã thoát trước “Lưu bản đồ trên thiết bị”, nên không thêm chart vào hồ sơ. |
| 9 | Form và hướng dẫn chưa rõ | **Đạt về copy và phân nhóm.** Ngày sinh, mức nhớ giờ, giờ địa phương, sai số và thành phố nơi sinh được tách nhãn; phần giải thích phương pháp nằm riêng. Giá trị nơi sinh có sẵn trong form của hồ sơ thử nghiệm hiện báo “không tìm thấy”; tôi giữ nguyên và không gửi form. |

## Luồng đã chạy trên thiết bị

Explore → Astrology → portal; xem form với giờ chính xác/ước chừng/không rõ; tính hai report bằng dữ liệu tổng hợp, thoát trước khi lưu; quay lại chart đã lưu; vào map immersive; zoom 100% → 125%; chạm vị trí hành tinh; xác nhận tên điểm chọn đổi; quay lại story; đổi tab Dữ liệu; vuốt sheet focus → peek → expand; kiểm tra Android Back cho modal. Dữ liệu birth profile đã lưu không bị sửa; không có chart mới được lưu.

Ảnh chứa dữ liệu chart cá nhân không được đưa vào báo cáo. Bộ ảnh test nằm trong thư mục review cục bộ bị Git ignore; ảnh biểu mẫu chứa birth data và XML hierarchy đã được xóa. Ảnh map/portal và report fixture tổng hợp chỉ giữ cục bộ để đối chiếu UI, không commit cùng mã nguồn.

## Giới hạn còn lại

Animation mở cổng nhiều lớp chưa được đưa vào candidate; nên thiết kế riêng theo hướng ngắn, nhẹ, tôn trọng Reduce Motion và không cản CTA. Candidate hiện tại phù hợp để review trải nghiệm UI trên Android, nhưng chưa có bằng chứng build native sạch từ Gradle nên không dùng làm bản phát hành.
