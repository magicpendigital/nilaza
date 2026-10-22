# Sao lưu backend/API và rà soát lịch sử Nilaza — 18/10/2026

Đã tạo gói mã hóa các credential hiện còn thu được, lưu vào thư mục Google Drive riêng và tải lại kiểm tra SHA256 trùng khớp. **Khôi phục bản tải từ Drive đã PASS lúc 18:11:52 ngày 18/10/2026 (Asia/Bangkok)**. Owner nhập mật khẩu recovery trong cửa sổ riêng; agent xác minh biên nhận `BACKEND_API_DRIVE_RESTORE_VERIFIED`, checksum payload, nguồn dữ liệu và cả toolchain gốc/hiện tại. **Chưa đủ bằng chứng toàn bộ khóa backend/API đã có bản sao.**

Owner đã giao toàn bộ triển khai cho AI và không cần tự biết tên hay giá trị các khóa. Lượt này chủ động rà soát cấu hình, API quản lý và lịch sử các task; không yêu cầu Owner gửi secret vào chat.

## Kết quả theo từng nhóm

| Nhóm | Kết quả thực tế |
| --- | --- |
| Supabase Singapore `etfajmrwyywokgafzxsb` | Đã sao lưu 4 API key hiện tại: anon, service-role, publishable và secret. Đúng tổ chức `drxbmvimiekeoeesgssp`, vùng Singapore; hiện chưa có Edge secret nào trong lượt kiểm tra. Đây vẫn là candidate, chưa được promote production. |
| Supabase QA cũ `akgrokwnkfqnfjqrildi` | Đã sao lưu riêng 4 API key hiện tại từ đúng dự án. Không trộn hoặc retarget sang Singapore. |
| OpenRouter local | Có bản gốc trong `supabase/.env.local`, đã mã hóa. Giá trị này không khớp digest `OPENROUTER_API_KEY` đang lưu trên Edge QA, nên không coi là bản sao của khóa QA hiện hành. Chưa gọi provider để kiểm tra hiệu lực. |
| Cấu hình public | Đã giữ cấu hình public local, URL Supabase và Langfuse base URL khôi phục từ lịch sử có digest khớp. Publishable/anon key được phân biệt với quyền đặc biệt service-role/secret. |
| AI hiện đặt trên QA | `OPENAI_API_KEY`, `OPENROUTER_API_KEY`: chỉ lấy được digest; không tìm được bản gốc khớp trong lượt rà soát đầy đủ. Chưa sao lưu được các giá trị hiện hành này. |
| Langfuse | Base URL khôi phục được. `LANGFUSE_PUBLIC_KEY` và `LANGFUSE_SECRET_KEY` chưa tìm được bản gốc khớp digest QA. |
| Turnstile | `TURNSTILE_SECRET_KEY` đang có trên QA nhưng chưa khôi phục được bản gốc. |
| DB | `SUPABASE_DB_URL` chưa khôi phục được từ lịch sử. Sao lưu API key không thay thế mật khẩu/kết nối DB và không phải backup database. |
| Giá trị Edge `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Chưa khôi phục đúng nguồn. Một anon JWT trong lịch sử có digest trùng nhưng `ref` thuộc dự án khác, nên bị từ chối. Không tự dùng nó để phục hồi Nilaza. API key hiện tại lấy từ chính hai dự án đã được sao lưu ở hai hàng đầu. |
| Token Vercel | File Admin local chỉ có `VERCEL_OIDC_TOKEN`; đây là token phiên tạm thời, đã loại khỏi gói sao lưu. |
| SMTP, RevenueCat, push/service account và hệ thống khác | Chưa được xác nhận đầy đủ bởi phạm vi local + API keys + Edge inventory. Các tham chiếu trong template/source không chứng minh chúng đang cấu hình hoặc đã có credential. Không tuyên bố NOT_APPLICABLE khi chưa kiểm đủ. |

## Bằng chứng rà soát lịch sử

- Đối chiếu chỉ mục task local ở chế độ read-only với đúng cwd `D:\nilaza` hoặc thư mục con; nhận diện cả dạng đường dẫn Windows mở rộng. Chỉ mở rollout nằm trong thư mục sessions/archive được phép và gắn đúng UUID task.
- Kiểm kê 674 nhật ký; 603 file là `.jsonl.zst`. Đã xử lý **toàn bộ 674 file**, 4.696.026.714 byte dữ liệu trực tiếp qua bộ nhớ. Không thiếu file, không chạm giới hạn quét 8 GiB và không ghi bản giải nén ra đĩa.
- Đối chiếu 15.914 ứng viên với SHA256 từ cloud. Không lưu hoặc in các ứng viên chưa khớp. Digest không thể đảo ngược thành secret; một chuỗi tìm được không được coi là giá trị hiện hành nếu không khớp.
- Langfuse base URL khớp từ task `01a0822c-5a5f-7772-b663-9da6d8e03531`. Một anon JWT khớp digest nhưng sai project đã bị từ chối. Không thu thập session/access/refresh token của người dùng hoặc cache đăng nhập vào gói key.
- Các task backend cũ cũng được đối chiếu qua công cụ đọc lịch sử ứng dụng; phát hiện rollout cũ được nén, không phải đã mất dữ liệu. Kết luận “chưa tìm được bản gốc” áp dụng cho phạm vi lịch sử/cấu hình đã nêu, không chứng minh mọi nơi lưu trữ ngoài phạm vi đều không còn bản sao.

## Gói trên Google Drive

[Thư mục Backend-API](https://drive.google.com/drive/folders/1I6SrofOkLV0lvAzDLaAHoJih5lc4jyrT) · [Gói mã hóa](https://drive.google.com/file/d/1tRlQh08xkZJSQtAyM2My1nlfRsYsdIAg/view?usp=drivesdk)

[Bản trạng thái dễ đọc trên Drive](https://drive.google.com/file/d/1oz7fMqVAd2X7Ljcjhhd-kHgwXixRmAQn/view?usp=drivesdk) và [biên nhận lúc tạo gói](https://drive.google.com/file/d/1p_0RhDKaFBQgkmOdDJlsQ0RIM_4kzwgG/view?usp=drivesdk) đã được đọc lại metadata, đúng thư mục và chỉ quyền Owner.

[Biên nhận khôi phục thành công](https://drive.google.com/file/d/1uoCf49mDnG4yUdiEZ8KzFbFRD4ITnYSS/view?usp=drivesdk) đã được upload vào cùng thư mục; trạng thái trên Drive đã cập nhật tại chỗ. Metadata của cả hai file được xác nhận lại chỉ quyền Owner. Biên nhận backup ban đầu được giữ nguyên.

- Tên: `nilaza-backend-api-20261018.age`; 3.565 byte.
- SHA256: `9dfb6e60444e226462ea4498905e6bc94db6731f5437d8e7e7a75a7678a57228`.
- File, thư mục Backend-API và thư mục Keys đã được đọc lại metadata: `shared=false`, chỉ quyền Owner. Không thay đổi chia sẻ.
- Bản tải lại ở `C:\Users\Admin\AppData\Local\NilazaRecovery\BackendBackups\nilaza-20261018\downloaded-backend-api.age`; SHA256 khớp bản mã hóa gốc. Thư mục local chỉ cấp quyền Owner và SYSTEM.
- Dùng public recipient recovery `owner-v1` đã thử thành công trước đó. Không tạo mật khẩu mới. Raw key chỉ đi qua bộ nhớ/pipe đến công cụ age đã pin; không đưa file `.env` hoặc plaintext secret lên Drive/repository.

## Các bước Owner đã hoàn tất

Phép thử đã PASS và được xác minh bằng biên nhận. Không cần nhập lại mật khẩu hoặc chạy lại; các bước dưới đây được giữ làm tài liệu thao tác.

1. Tìm cửa sổ **NILAZA - THU KHOI PHUC BACKEND API**. Gõ `BAT_DAU`, nhấn Enter: xác nhận đã sẵn sàng.
2. Khi hiện `Enter passphrase`, nhập/dán **mật khẩu recovery đã lưu**, nhấn Enter một lần. Ký tự và dấu `*` không hiện nhưng bàn phím vẫn nhận. Không để trống và không tạo mật khẩu mới. Console Host có thể dán bằng chuột phải thanh tiêu đề → Edit → Paste.
3. Công cụ dùng bản recovery tải từ Drive để giải mã gói backend tải từ Drive trong bộ nhớ, kiểm tra checksum toàn payload, cấu trúc và danh mục nguồn. **Không kích hoạt hay ghi secret trở lại cloud.**
4. Chờ **KHOI PHUC BACKEND API THANH CONG**, Enter để đóng, rồi báo Codex kết quả. Nếu lỗi chỉ gửi `MA_BUOC`, không gửi mật khẩu/ảnh chứa mật khẩu.

PASS của phép thử này chứng minh mở và lấy lại được **những giá trị nằm trong gói**. Nó không chứng minh khóa còn hiệu lực, đủ toàn bộ credential hoặc backend đã phục hồi hoạt động. Agent đã đọc biên nhận công khai `artifacts/backend-api-key-backup-2026-10-18/restore-test.json` trước khi ghi PASS. Biên nhận `backup.json` giữ nguyên trạng thái lúc tạo bản sao; biên nhận restore bổ sung kết quả xảy ra sau đó. Không cần Owner tự chạy lệnh hay biết mật khẩu của từng API key.

## Phương án xử lý phần chưa phục hồi được

Không yêu cầu Owner tự tìm lại khóa không biết mình đã từng được cấp. AI thực hiện tiếp phần chuẩn bị:

| Bước | Kết quả cần chuẩn bị | Quyết định Owner khi cần |
| --- | --- | --- |
| Xác định dịch vụ còn dùng | Đối chiếu route AI được publish, trace có bật không, waitlist có dùng Turnstile không và SMTP thực tế. Phân biệt cần cho Singapore với tài sản QA cũ cần lưu lịch sử. | Chọn chức năng cần bật và mức chi phí/hạn mức. Không tạo đủ mọi provider chỉ vì source hỗ trợ. |
| Lập phương án thay thế | Danh sách chính xác credential không phục hồi được, tài khoản sở hữu, consumer bị ảnh hưởng và cách quay lại. Giữ app cũ hoạt động trong khi chuẩn bị. | Duyệt riêng việc cấp lại/rotation và nơi kích hoạt. Yêu cầu sao lưu không tự cấp quyền đổi secret đang chạy. |
| Cấp và sao lưu trước kích hoạt | Dùng thao tác tài khoản riêng khi cần; secret đi thẳng vào backend secret storage và bản mã hóa. Gắn metadata nguồn/ngày tạo, thử khôi phục bản tải từ Drive. | Owner giữ quyền đăng nhập tài khoản, mật khẩu recovery và phê duyệt khoản chi. Không gửi secret qua chat. |
| Nghiệm thu online | Kiểm chứng credential đúng target, endpoint, hành vi UI/Admin/trace và hạn mức đã chọn. | Runtime retarget, SQL, promotion và phát hành tiếp tục theo gate hiện có. |

Không thay khóa của QA cũ chỉ để lấp đầy kho backup. Hai giá trị Supabase Edge chưa xác minh đúng nguồn cần được xem lại khi chuẩn bị môi trường canonical; không tự chép giá trị lịch sử sang Singapore. Lượt này không tạo key, xoay key, chạy SQL, thay cấu hình cloud, gọi AI trả phí, build hoặc phát hành.

## Kiểm tra, phiên bản và giới hạn

- 20/20 kiểm tra Node PASS: loại token phiên, JWT đúng project/role, key modern và giới hạn kích thước, digest so với giá trị thực, không lộ secret qua metadata, UUID/nguồn lịch sử, đường dẫn mở rộng, file fork/nén và chặn thoát thư mục.
- PowerShell parser PASS. Luồng Restore trong terminal bị thu đầu ra bị chặn trước khi đọc secret (`PRIVATE_CONSOLE_REQUIRED`). Đã xác minh Node v25.9.0 đọc được nhật ký zstd cũ; Supabase CLI 2.108.0 và age hiện có được pin, không cài thêm dependency.
- Bằng chứng: `artifacts/backend-api-key-backup-2026-10-18/backup.json`, `download.json`, `drive-receipt.json`, `validation.json`; không có giá trị key hoặc URL tải tạm.
- `toolchain.backup-origin.json` giữ nguyên công cụ lúc tạo gói. Sau khi tạo gói, quy tắc tên file fork được siết thêm cho lần chạy sau; metadata thực tế của 674 file đã được kiểm riêng và đúng nguồn. Công cụ khôi phục hiện tại được pin trong `toolchain.json`; biên nhận restore ghi cả hash toolchain gốc và hiện tại. Không sửa biên nhận backup lịch sử để giả cùng phiên bản.
- Kế hoạch/preflight: `docs/feature-plans/backend-api-key-backup-2026-10-18.json`. Skill Plan/QC vẫn phù hợp, không cần sửa chính sách skill; bảo toàn toàn bộ dirty work ngoài phạm vi.
- Chưa thử trên máy khác, chưa khôi phục dữ liệu DB/Auth/Storage/jobs hoặc đo RPO/RTO. `managedRecovery` vẫn BLOCKED. Hệ điều hành/runtime đáng tin còn có thể tiếp cận bộ nhớ; xóa buffer không bảo đảm xóa mọi bản sao chuỗi JavaScript/pagefile.
