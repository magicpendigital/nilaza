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

1. **Thông tin đăng nhập (App access):** nhập tài khoản thử cho người duyệt của Google (email + mật khẩu). Agent không được nhập mật khẩu. Mục này chặn mục 2 và 3.
2. **Đối tượng mục tiêu:** chọn 18+ (theo quyết định sản phẩm). Agent làm được sau khi xong mục 1.
3. **Gửi An toàn dữ liệu:** bấm Gửi sau mục 2 (nội dung đã điền sẵn).
4. **Email liên hệ công khai** trong Cài đặt cửa hàng (bắt buộc, hiện công khai trên Google Play) và trang web nếu muốn.
5. Quyết định còn mở về An toàn dữ liệu: có coi việc gửi nội dung cho OpenRouter là "chia sẻ" không (đang khai là bên xử lý thay mặt, không chia sẻ); thông báo đẩy Expo; câu "hít thở" trong nghi thức Tarot có bị coi là tính năng sức khỏe không.
6. Trang điều khoản còn chỗ trống; điền xong thì thêm URL vào Tư cách người bán.
7. Thử nghiệm khép kín: cần ≥ 12 người thử trong 14 ngày trước khi lên Production (tài khoản cá nhân).
8. Lợi ích Premium trong mô tả còn chung chung; thanh toán chưa kiểm đầu cuối.

## Bản build AAB (chưa có, chưa tải lên Play)

- Lệnh: `EAS_NO_VCS=1 EAS_PROJECT_ROOT=../.. eas build -p android --profile play-internal --non-interactive --no-wait` chạy trong `apps/mobile`. `EAS_NO_VCS=1` bỏ thư mục `.git` khỏi gói nén (440 MB còn 224 MB); đã kiểm gói không chứa `.env`, khóa hay chứng chỉ.
- Kết quả 26–27/11: 5 lần đều đứt khi tải gói nén lên kho của EAS (Google Cloud Storage), lỗi `write ECONNRESET` ở 397/440, 159/440, 190/440, 80/224 và 92/224 MB. EAS chưa nhận gói nào nên **chưa có bản build, chưa tốn lượt build**.
- Mỗi lần thử, EAS tự tăng versionCode trên máy chủ (nay khoảng 7). Không ảnh hưởng gì, bản build đầu tiên lên Play sẽ mang số đó.
- Cách xử lý đề xuất: chạy lại lệnh trên ở mạng ổn định hơn (cáp, mạng khác hoặc giờ thấp điểm). Khi build xong: tải AAB về, tạo bản phát hành **Thử nghiệm nội bộ** trên Play Console, dán ghi chú phát hành trong [nội dung trang cửa hàng](PLAY_STORE_LISTING_2026-11-27.vi.md), rồi gửi xét duyệt (Owner đã duyệt 26/11).
