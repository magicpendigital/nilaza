# Nilaza — xác nhận tạo và sao lưu khóa khôi phục

Ngày 18/10/2026, Asia/Bangkok. Cập nhật tiếp theo của [hướng dẫn một Owner và kho key](SOLO_ANDROID_AND_KEYS_2026-10-16.vi.md). Trạng thái “0 key thật” trong hồ sơ ngày 16/10 là lịch sử; hiện đã có **một bản khóa recovery thật đã mã hóa trên Drive**. Không sửa ngược bằng chứng cũ.

## Kết quả đã kiểm

| Kiểm tra | Kết quả và giới hạn |
|---|---|
| Thiết lập khóa | PASS — `owner-v1`, tạo lúc 01:22:55 ngày 18/10/2026 giờ Bangkok. `Inspect` xác minh file hoàn tất, ACL riêng tư, receipt và checksum. Không chạy lại Setup. |
| Mở khóa trên máy hiện tại | PASS — receipt ghi `OWNER_KEY_CREATED_LOCAL_PROBE_VERIFIED`; Owner đã hoàn thành probe và xác nhận giữ mật khẩu riêng. AI không đọc mật khẩu. |
| Sao lưu Drive | PASS — [owner-v1.age](https://drive.google.com/file/d/14PAhlK38T5w8r_BqSyfHSmo_UUKVwqsf/view?usp=drivesdk), đúng [Keys/Recovery](https://drive.google.com/drive/folders/1NT8l-G30J2XQzfmBOvAYuymMfGEnsmiR). |
| Quyền truy cập | PASS tại thời điểm kiểm — file và ba cấp Recovery/Keys/root đều `shared=false`, chỉ một quyền `user/owner`. |
| Tải lại và đối chiếu | PASS — bản tải từ connector Drive có 371 byte, SHA-256 khớp receipt local. Chỉ kiểm ciphertext trong bộ nhớ, không giải mã. |
| Khôi phục khi mất máy | BLOCKED — chưa diễn tập. Probe trên cùng máy và checksum không thay thế bước này. |
| Android/backend/API | BLOCKED — chưa có bằng chứng sao lưu các key thuộc hai nhóm này. |
| Recovery toàn hệ thống và release | BLOCKED — còn dữ liệu, Auth, Storage, cấu hình, secret và bài thử riêng. Không mở quyền SQL, retarget, rotation hoặc phát hành. |

SHA-256 của `owner-v1.age`: `4bb2563f9627d223ac9116e442a13bef5046aa4d6cbb87082a70581714d5718a`.

Biên bản không chứa bí mật: [owner-v1.backup.json](../../artifacts/recovery-key-backup-2026-10-18/owner-v1.backup.json). Hướng dẫn đặt cạnh bản mã hóa: [README-RECOVERY.vi.txt](../../artifacts/recovery-key-backup-2026-10-18/README-RECOVERY.vi.txt). Cả hai đã được upload vào Recovery và đọc lại metadata để xác nhận tên, dung lượng, đúng thư mục, quyền chủ sở hữu; [receipt Drive](../../artifacts/recovery-key-backup-2026-10-18/drive-receipt.json) ghi các ID/URL thực tế.

## Owner làm gì tiếp theo

Không cần tạo lại khóa hoặc gửi mật khẩu. Giữ mật khẩu ở nơi có thể truy cập độc lập khi mất máy/tài khoản Drive. Có thể mở thư mục Recovery để kiểm tra tên file; không cần mở nội dung file mã hóa.

Bước kế tiếp là chuẩn bị bài thử lấy lại khóa từ Drive trong môi trường riêng tư. AI chuẩn bị và kiểm tra công cụ; Owner nhập mật khẩu riêng. Chỉ đánh dấu bài thử khôi phục đạt khi có receipt của lần thực hiện thật. Sau đó tiếp tục gói backup Android và backend/API theo đúng key hiện hữu; phần cần tài khoản hoặc mật khẩu sẽ do Owner thao tác trong ngữ cảnh riêng.

## QC và phạm vi

Plan `recovery-key-backup-2026-10-18` đã qua feature preflight trước upload. Không đổi mã chạy của app, Admin, backend, script tạo khóa hoặc release gate. Google Drive plugin được dùng để upload/readback; không thay đổi chia sẻ. Inspect chạy chỉ đọc, không bypass ExecutionPolicy. Đường tải về đầu tiên qua Node không kết nối được; kiểm tra tiếp theo dùng đường tải xác thực do connector trả về trong PowerShell và thành công. URL tải tạm thời và dữ liệu nhị phân không lưu vào hồ sơ.

Đây là bằng chứng của bước sao lưu một khóa. Quyền và khả năng truy cập Drive có thể thay đổi về sau; các bước khôi phục tiếp theo phải kiểm lại. Không có thao tác xóa, thay khóa, thay dữ liệu thiết bị hoặc thay credential runtime.
