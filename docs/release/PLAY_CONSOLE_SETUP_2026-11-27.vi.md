# Biên nhận thiết lập Google Play Console (26–27/11/2026)

Owner duyệt 26/11: tạo app Nilaza trên tài khoản nhà phát triển "Magicpen Digital", app miễn phí (có gói Premium bán trong app), đồng ý các cam kết chính sách của Google, đồng ý gửi bản build đi xét duyệt. Agent thao tác bằng Chrome của Owner (tiện ích Claude in Chrome); không nhập mật khẩu hay khóa nào.

## Đã làm (đã kiểm chứng trên Play Console)

- **App:** Nilaza, ngôn ngữ mặc định Tiếng Việt, loại Ứng dụng, miễn phí.
- **Chính sách quyền riêng tư:** đã khai URL.
- **Quảng cáo:** không có quảng cáo. **Mức phân loại nội dung:** đã trả lời bảng hỏi.
- **Mã nhận dạng quảng cáo:** không dùng. **Ứng dụng chính phủ:** không. **Tính năng tài chính:** không. **Sức khỏe:** không có tính năng sức khỏe. **Tư cách người bán:** có (bán gói Premium); ô URL điều khoản để trống vì trang điều khoản còn chỗ "[CẦN OWNER".
- **An toàn dữ liệu (Data safety):** đã điền đủ và lưu nháp; chưa gửi được vì Play bắt hoàn tất "Đối tượng mục tiêu" trước. 9 loại dữ liệu, không chia sẻ cho bên thứ ba, không tạm thời:
  | Loại | Bắt buộc | Mục đích |
  |---|---|---|
  | Tên | Có | Chức năng, cá nhân hóa, quản lý tài khoản |
  | Email | Có | Chức năng, quản lý tài khoản |
  | Mã người dùng | Có | Chức năng, quản lý tài khoản, chống gian lận/bảo mật |
  | Thông tin khác (ngày giờ nơi sinh) | Không | Chức năng, cá nhân hóa |
  | Lịch sử mua hàng | Không | Chức năng, quản lý tài khoản |
  | Tin nhắn khác trong app | Không | Chức năng, cá nhân hóa |
  | Tương tác trong app | Có | Chức năng, phân tích, chống gian lận/bảo mật |
  | Nội dung khác do người dùng tạo | Không | Chức năng, cá nhân hóa |
  | Mã thiết bị | Không | Chức năng |
- **Trang cửa hàng (Tiếng Việt):** tên, mô tả ngắn (73 ký tự), mô tả đầy đủ (2359 ký tự) lấy từ [nội dung trang cửa hàng](PLAY_STORE_LISTING_2026-11-27.vi.md); biểu tượng 512×512; ảnh đầu trang 1024×500; 4 ảnh chụp màn hình điện thoại 1140×2280 (Khám phá, Người dẫn, 78 lá Tarot, Trải bài). Trạng thái: "Sẵn sàng gửi để xem xét".
- **Khai báo thành phần do AI tạo:** gắn nhãn AI cho 4 ảnh chụp màn hình (có tranh Tarot và chân dung người dẫn do AI vẽ); biểu tượng và ảnh đầu trang không gắn nhãn.
- **Danh mục:** Ứng dụng → Lối sống.
- **Hồ sơ build EAS mới** `play-internal` trong `apps/mobile/eas.json` (dựng AAB, môi trường preview, tự tăng versionCode).

## Còn lại, cần Owner

1. ✅ **Thông tin đăng nhập (App access):** Owner tự nhập tài khoản thử cho người duyệt (27/11).
2. ✅ **Đối tượng mục tiêu:** đã chọn 18+ (27/11).
3. ✅ **An toàn dữ liệu:** đã gửi; bản xem trước bước 5 khớp nội dung trong biên nhận này (27/11).
4. ✅ **Email liên hệ công khai** và danh sách người thử: Owner tự làm (27/11).
5. Quyết định còn mở về An toàn dữ liệu: có coi việc gửi nội dung cho OpenRouter là "chia sẻ" không (đang khai là bên xử lý thay mặt, không chia sẻ); thông báo đẩy Expo; câu "hít thở" trong nghi thức Tarot có bị coi là tính năng sức khỏe không.
6. Trang điều khoản còn chỗ trống; điền xong thì thêm URL vào Tư cách người bán.
7. Thử nghiệm khép kín: đã tạo và gửi xét duyệt (xem mục dưới). Để đăng ký Production (tài khoản cá nhân) cần ≥ 12 người thử tham gia liên tục 14 ngày; hiện 4 danh sách có 11 email, cần thêm ít nhất 1 người.
8. Lợi ích Premium trong mô tả còn chung chung; thanh toán chưa kiểm đầu cuối.

## Bản build AAB và bản phát hành Thử nghiệm nội bộ (27/11)

- **Build EAS:** `53865123-f57c-49dc-af90-78ae3ecb3519`, hồ sơ `play-internal`, môi trường preview (backend Singapore), từ commit `8698752`. Phiên bản 0.1.3, versionCode **8**. Lệnh: `EAS_NO_VCS=1 EAS_PROJECT_ROOT=../.. eas build -p android --profile play-internal --non-interactive --no-wait` trong `apps/mobile` (bỏ `.git` khỏi gói nén, 224 MB; đã kiểm không có `.env`, khóa hay chứng chỉ).
- 5 lần đầu (26–27/11) đứt khi tải gói nén lên EAS (`write ECONNRESET`); lần 6 trên mạng mới của Owner tải lên trong 1 phút 34 giây.
- **Tệp AAB:** 134.195.198 byte, sha256 `cce1830768e1a34c0f962b9bebdbcc7f46f1c04657df9575e16219809d0bdcee`.
- **Play Console:** bản phát hành "8 (0.1.3)" ở kênh **Thử nghiệm nội bộ**, ghi chú phát hành tiếng Việt từ [nội dung trang cửa hàng](PLAY_STORE_LISTING_2026-11-27.vi.md). Play đọc được: API tối thiểu 24, SDK mục tiêu 36, kích thước cài mới 88,9 MB. Trạng thái 27/11 10:25: "Đã phát hành cho những người thử nghiệm nội bộ", "Chưa được xem xét"; tên tạm `app.nilaza.mobile (unreviewed)` cho đến khi Google duyệt xong.
- 2 cảnh báo, không chặn: chưa có danh sách người thử (kênh hiện "Không hoạt động"); chưa tải tệp gỡ rối mã (R8/proguard).
- **Còn cần Owner:** thêm email người thử ở thẻ "Nhân viên kiểm thử" của kênh Thử nghiệm nội bộ, rồi gửi đường liên kết tham gia cho họ. Chưa cài thử từ Google Play trên máy thật.

## Thử nghiệm khép kín và gửi Google xét duyệt (27/11)

- **Vì sao cần:** nút "Gửi ứng dụng đi xem xét" bị khóa dù mọi mục Nội dung ứng dụng đã xong. Google chỉ xét duyệt khi có bản phát hành ở kênh Thử nghiệm khép kín (hoặc công khai); kênh nội bộ không qua xét duyệt. Owner duyệt tạo bản khép kín và gửi xét duyệt (27/11, "Đồng ý, tạo luôn").
- **Kênh "Thử nghiệm khép kín - Alpha":** quốc gia Việt Nam; người thử là 4 danh sách email Chess (1), Clik (1), From FB (3), MCY-Phase1-Internal-test (6); bản phát hành "8 (0.1.3)" dùng lại gói AAB versionCode 8 ở trên (không dựng bản mới); ghi chú phát hành chép từ bản nội bộ. Ô "email hoặc URL để gửi ý kiến phản hồi" để trống.
- 1 cảnh báo, không chặn: chưa có tệp gỡ rối mã (R8/proguard).
- **Đã gửi 14 thay đổi** (kênh khép kín, trang cửa hàng tiếng Việt, phân loại nội dung, đối tượng 18+, chính sách quyền riêng tư, quảng cáo, An toàn dữ liệu, ứng dụng sức khỏe, tư cách người bán, danh mục, thông tin đăng nhập, mã nhận dạng quảng cáo, ứng dụng chính phủ, tính năng tài chính). Trang Tổng quan về việc xuất bản hiện "Các thay đổi đang được xem xét"; Play chạy kiểm tra nhanh (tối đa 14 phút) rồi tự chuyển cho Google; Google báo thường xong trong 7 ngày.
- **Chưa kiểm chứng:** kết quả kiểm tra nhanh và kết quả xét duyệt của Google; cài app từ Google Play trên máy thật; đường liên kết tham gia khép kín (chỉ hiện sau khi được duyệt).

