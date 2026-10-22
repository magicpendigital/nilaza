# Nilaza — thử mở khóa từ bản sao Google Drive

Ngày 18/10/2026, Asia/Bangkok. Owner đã đồng ý thử khôi phục sau khi [bản sao khóa recovery được xác minh](RECOVERY_KEY_BACKUP_2026-10-18.vi.md).

**Đã nghiệm thu bài thử bản sao Drive:** Owner hoàn tất lúc **02:00:47 ngày 18/10/2026** giờ Bangkok và báo thành công. Công cụ `Inspect` đã đọc lại receipt, kiểm ACL và checksum của bản tải, câu kiểm tra giải mã, công cụ và hồ sơ chuẩn bị; kết quả `DRIVE_COPY_OWNER_DECRYPT_VERIFIED`. [Biên bản hoàn tất](../../artifacts/recovery-drive-test-2026-10-18/owner-v1.restore-test-2026-10-18.json) và [các kiểm tra](../../artifacts/recovery-drive-test-2026-10-18/validation.json) là bằng chứng hiện tại. Không cần chạy lại bài thử này.

Đã lưu [trạng thái hiện tại trên Drive](https://drive.google.com/file/d/1yM2qoI-vc5AXZDB8h9kmWVV9yqcytDY8/view?usp=drivesdk) và [biên bản thử mở khóa](https://drive.google.com/file/d/1rYQTE6ij5Hoa0MRhkfo_zF-PkroudBel/view?usp=drivesdk) vào Recovery. Đọc lại metadata xác nhận đúng thư mục và chỉ quyền chủ sở hữu; [receipt tải hồ sơ](../../artifacts/recovery-drive-test-2026-10-18/drive-result-receipt.json) ghi ID và phạm vi kiểm chứng. Hai file mới chỉ chứa trạng thái/hash, không có mật khẩu hoặc private key dạng rõ.

## Mục đích và phạm vi

Bài thử tải mới `owner-v1.age` từ Drive, kiểm checksum, đặt trong thư mục riêng và dùng bản đó mở một câu kiểm tra mới. Không dùng file khóa gốc của lần thiết lập. Mật khẩu chỉ được nhập vào cửa sổ riêng của Owner; AI không đọc mật khẩu hoặc private key dạng rõ.

Chạy thành công chứng minh bản sao trên Drive và mật khẩu hiện có dùng được để giải mã dữ liệu dành cho khóa này. Bài thử vẫn dùng Windows và quyền truy cập Google trên máy hiện tại; không tự chứng minh khôi phục khi mất máy/tài khoản Google. Database, Auth, Storage, Android và API key không thuộc dữ liệu phục hồi trong bài thử. Gate recovery toàn hệ thống vẫn BLOCKED.

Công cụ dùng khả năng nhận identity đã mã hóa của [age v1.3.2](https://github.com/FiloSottile/age/blob/v1.3.2/README.md), không xuất private key ra file. Nhị phân được kiểm SHA-256 trước khi chạy.

## Các bước Owner thực hiện

1. **Tìm cửa sổ `NILAZA - THU KHOI PHUC TU DRIVE`.** Đây là cửa sổ thử mở khóa. Không chạy lại bước thiết lập hoặc tạo khóa.
2. **Lấy mật khẩu từ nơi đã lưu riêng.** Không gửi qua chat. Việc lấy lại mật khẩu đã lưu là phần cần kiểm tra trong bài thử.
3. **Tại bước chuẩn bị, gõ `BAT_DAU` rồi Enter.** Chữ này sẽ hiện. Nó chỉ báo đã sẵn sàng; không nhập mật khẩu tại dòng này.
4. **Chờ age hỏi `Enter passphrase…`, rồi nhập hoặc dán đúng mật khẩu đã lưu và nhấn Enter một lần.** Không để trống. Chữ, dấu `*` và chuyển động con trỏ có thể không hiện nhưng bàn phím vẫn nhận. Nếu dán trong Console Host: nhấp phải thanh tiêu đề → Edit → Paste. Dán một lần, không kèm dấu ngoặc kép hoặc khoảng trắng thừa. Không dùng Ctrl+U để xóa dòng.
5. **Đợi thông báo `THU KHOI PHUC TU DRIVE THANH CONG`.** Công cụ tự so sánh nội dung câu kiểm tra và lưu receipt không bí mật. Thông báo này chỉ xuất hiện sau khi kiểm tra đúng.
6. **Nhấn Enter để đóng cửa sổ rồi báo `Thử khôi phục thành công`.** Nếu có lỗi, chỉ báo `MA_BUOC` hiện ra. Không gửi mật khẩu hoặc ảnh có mật khẩu; AI sẽ đọc receipt an toàn và xử lý bước tiếp theo.

Nếu lỡ nhập sai hoặc không chắc đã dán mấy lần, không tự tạo lại khóa. Đóng cửa sổ thử và báo mã bước nếu có; các file cũ được bảo toàn để kiểm tra trước khi thử lại.

## Công việc AI và bằng chứng

- Kiểm metadata của đúng Drive file `14PAhlK38T5w8r_BqSyfHSmo_UUKVwqsf`, đúng Recovery parent, quyền chỉ chủ sở hữu.
- Tải qua tham chiếu xác thực do connector trả về; không lưu URL tải tạm thời vào hồ sơ.
- Xác minh 371 byte và SHA-256 `4bb2563f9627d223ac9116e442a13bef5046aa4d6cbb87082a70581714d5718a` trước khi ghi.
- Chỉ ghi dưới `C:\Users\Admin\AppData\Local\NilazaRecovery\RestoreTests\drive-owner-v1-20261018`, ACL Owner và SYSTEM; từ chối đường reparse và ghi đè. Không đọc file identity gốc.
- Công cụ `scripts/nilaza-recovery-drive-test.ps1` có Plan/Prepare/Inspect không nhập mật khẩu. Run yêu cầu console riêng, không chuyển hướng luồng hoặc bật policy transcript; khóa độc quyền ngăn hai lần chạy chồng nhau.
- Chỉ đọc `result.json` sau Owner hoàn tất, xác minh hash của file tải, challenge, helper và receipt chuẩn bị. Không ghi PASS chỉ từ việc cửa sổ đã mở.

Trạng thái **AWAITING_OWNER_VERIFICATION** trong `launch.json` và hồ sơ trước đó ghi thời điểm chờ Owner; giữ nguyên các bằng chứng lịch sử. Kết quả hiện tại là **PASS cho việc mở bản sao Drive trên máy hiện tại**. Chưa diễn tập máy khác, mất quyền tài khoản Google hoặc khôi phục toàn bộ dự án; không đổi release profile hoặc các gate cloud/Android.
