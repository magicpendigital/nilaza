# Sao lưu khóa Android — 18/10/2026

Bộ khóa Android mặc định đang có trên EAS đã được kiểm tra, mã hóa và sao lưu vào Google Drive riêng. Bản tải lại từ Drive có SHA256 trùng bản gốc. **Khôi phục từ Drive đã PASS lúc 10:20:44 ngày 18/10/2026 (Asia/Bangkok)**: Owner nhập mật khẩu recovery trong cửa sổ riêng; công cụ mở bản tải từ Drive, đối chiếu chứng chỉ và ký/xác minh thành công. Agent đã xác nhận biên nhận `ANDROID_DRIVE_RESTORE_SIGN_VERIFIED`.

Owner xác nhận ngày 18/10/2026: Nilaza chưa từng tải AAB/APK lên Google Play. Vì vậy đây là **khóa Android hiện có trên EAS**, chưa phải bằng chứng Google Play đã chấp nhận khóa upload này. Không tạo, thay đổi hay xoay khóa trong bước này.

## Những gì đã được kiểm tra

| Hạng mục | Kết quả và ý nghĩa |
| --- | --- |
| Đúng dự án | EAS `@magicpen/nilaza`, project `8a6197d1-feaa-488b-90a3-12bb177ee005`, package `app.nilaza.mobile`. |
| Đúng bộ khóa | Một bộ mặc định, không legacy: build credential `5b9fb458-6fa8-47c6-8a2d-80e13fd127f7`, keystore `b6b83046-d427-42e5-a80a-a991d6c31147`, JKS. |
| Khóa dùng được | Java mở JKS bằng thông tin lưu trên EAS, dùng khóa riêng ký thử dữ liệu kiểm tra rồi xác minh bằng chứng chỉ. `SHA256withRSA`: PASS. |
| Mã hóa | Dùng public recipient của recovery `owner-v1` đã được kiểm thử. Keystore, alias và các mật khẩu đi qua bộ nhớ/pipe; không ghi file rõ. |
| Drive riêng | Thư mục Keys/Android và file chỉ có quyền Owner, `shared=false`. Không thay đổi chia sẻ. |
| Tải lại | 3.753 byte; SHA256 khớp. Đây là kiểm tra vận chuyển file, chưa thay thế phép thử giải mã. |
| Khôi phục Android từ Drive | PASS — giải mã bản tải từ Drive, keystore SHA256 và chứng chỉ khớp; ký/xác minh `SHA256withRSA` thành công. |
| Phát hành | Chưa build, cài lại app hay upload Play. Cấu hình Gradle local hiện dùng debug signing; không dùng nó làm bằng chứng ký bản phát hành. |

[Thư mục Android trên Drive](https://drive.google.com/drive/folders/1VvV6v_Qx9KaWowcP5NdtnxPoF2tKP-mJ) · [Bản mã hóa](https://drive.google.com/file/d/1wyK9K6d69RuAyZ-LkUnXgDsBYOJamP6Q/view)

[Biên nhận khôi phục](https://drive.google.com/file/d/11MwB4aF0ZDBNdC4O8gHZ_ZNLdhbY9yoV/view?usp=drivesdk) và [trạng thái hiện tại](https://drive.google.com/file/d/1IBSfs3HRUUJnnih29bB3utRpW2b0Yw59/view?usp=drivesdk) đã được lưu vào cùng thư mục và xác nhận lại quyền chỉ Owner bằng metadata Drive.

SHA256 chứng chỉ: `4e459a4554c9e543a3a128622e15bbb7bd9a557dc6a1eef997b9ca8e53582536`.

SHA256 gói mã hóa: `7f0e6ab9c90931e90a1ceb7427c98a8919fa9e2fa36bb47dfd0fd7c8c24eb00e`.

Theo [hướng dẫn Expo về credentials](https://docs.expo.dev/app-signing/app-credentials/), cần giữ bản sao bộ khóa và thông tin mở khóa. [Cấu trúc credentials của Expo](https://docs.expo.dev/app-signing/local-credentials/) gồm keystore, mật khẩu kho, alias và mật khẩu khóa khi có. Gói này lưu đủ thông tin EAS trả về; nếu EAS không có mật khẩu khóa riêng, helper kiểm tra dùng mật khẩu kho. Mật khẩu recovery chỉ dùng để mở lớp bảo vệ bản sao và do Owner giữ riêng.

## Các bước Owner đã hoàn tất trong cửa sổ riêng

Phép thử đã hoàn thành. Không cần chạy lại; các bước dưới đây được giữ làm tài liệu thao tác.

1. Tìm cửa sổ **NILAZA - THU KHOI PHUC KHOA ANDROID**. Tại dòng chờ sẵn sàng, gõ `BAT_DAU` rồi nhấn Enter. Bước này chỉ báo rằng anh/chị đã sẵn sàng.
2. Khi xuất hiện `Enter passphrase`, nhập hoặc dán **đúng mật khẩu recovery đã lưu**, rồi nhấn Enter một lần. Mật khẩu không hiện chữ hay dấu `*`, nhưng bàn phím vẫn nhận. Không tạo mật khẩu mới; không nhấn Enter khi dòng trống. Với Console Host có thể dán bằng chuột phải trên thanh tiêu đề → Edit → Paste.
3. Chờ dòng **KHOI PHUC KHOA ANDROID THANH CONG**. Công cụ sẽ giải mã bản Android tải từ Drive bằng bản recovery tải từ Drive, mở keystore và ký/xác minh một lần nữa. Không cần nhập mật khẩu keystore Android.
4. Nhấn Enter để đóng rồi báo Codex: **“Khôi phục khóa Android thành công”**. Nếu có lỗi, chỉ gửi `MA_BUOC`, không gửi mật khẩu hay ảnh chứa mật khẩu.

Agent đã dùng `Inspect` đọc biên nhận công khai `restore.json` và đối chiếu dấu vân tay, hash gói tải về cùng toolchain trước khi ghi PASS. Bản lưu công khai là `artifacts/android-key-backup-2026-10-18/android.restore-test-2026-10-18.json`. Biên nhận `backup.json` được giữ nguyên trạng thái tại thời điểm tạo bản sao; biên nhận restore bổ sung kết quả xảy ra sau đó.

## Dữ liệu và bằng chứng

- File riêng trên máy: `C:\Users\Admin\AppData\Local\NilazaRecovery\AndroidBackups\eas-default-20261018`. Thư mục chỉ cấp quyền cho Owner và SYSTEM; chỉ chứa bản mã hóa và biên nhận không có bí mật.
- Bản recovery dùng cho thử khôi phục: `C:\Users\Admin\AppData\Local\NilazaRecovery\RestoreTests\drive-owner-v1-20261018\downloaded-owner-v1.age` — giữ nguyên bản tải từ Drive đã thử thành công.
- Mã công cụ: `scripts/nilaza-android-key-backup.mjs`, `scripts/nilaza-android-key-owner.ps1`, `scripts/VerifyAndroidKeystore.java`.
- Bằng chứng công khai: `artifacts/android-key-backup-2026-10-18/` gồm nguồn EAS, toolchain pins, backup, Drive, download, validation, restore-test và `ANDROID-STATUS.vi.txt`. Không có alias, password, keystore thô hoặc URL tải tạm.
- Kiểm tra Node: 4/4 PASS (chọn đúng credential, giới hạn dữ liệu/framing, biên nhận không chứa bí mật, từ chối keystore hỏng). PowerShell parse/Plan PASS; Restore trong terminal bị ghi lại đầu ra bị chặn tại `PRIVATE_CONSOLE_REQUIRED`. Bộ khóa thật đã ký/xác minh thành công trước mã hóa.
- Preflight và đánh giá tác động: `docs/feature-plans/android-key-backup-2026-10-18.json`. Skill Plan/QC và hướng dẫn Drive hiện phù hợp; không cần thay đổi chính sách skill cho thao tác sao lưu này.

## Giới hạn và bước tiếp theo

Phép thử này chạy trên cùng máy Windows. Chưa chứng minh khôi phục trên máy khác, khôi phục toàn hệ thống, ký AAB thực tế hoặc Google Play chấp nhận khóa. Gate `managedRecovery` vẫn BLOCKED. Máy và runtime đáng tin vẫn có thể tiếp cận bộ nhớ tiến trình; xóa buffer không bảo đảm xóa mọi bản sao chuỗi JavaScript hay pagefile.

Khôi phục Android đã được xác nhận. Bước tiếp theo là lập danh mục backend/API để sao lưu phần có thể xuất hợp lệ. Không đưa runtime secret vào app hoặc trang Admin. Secret không thể đọc lại sẽ cần phương án khôi phục/rotation riêng và quyết định Owner khi áp dụng. Việc retarget Supabase, SQL, build phát hành và đưa app lên Play vẫn theo các gate hiện có; iOS tiếp tục được hoãn theo quyết định Owner.
