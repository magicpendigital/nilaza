# Mẫu email tài khoản Nilaza — phân tích và bản soạn (15/11/2026)

Trạng thái: **Owner duyệt nội dung tiếng Việt 15/11; đã áp 3 mẫu** (đăng ký, quên mật khẩu, mời thành viên) lên Supabase Singapore. Mỗi mẫu có bản tiếng Anh đầy đủ khi tài khoản có `locale = en`, còn lại tiếng Việt; không còn dòng tiếng Anh ở cuối. Không in tên người dùng trong thư (người khác có thể đăng ký bằng email của bạn và gõ tên tùy ý). Mẫu báo đổi mật khẩu đã soạn, chưa bật. Tệp nguồn: `supabase/templates/auth/`.

Người gửi: `Nilaza <no-reply@auth.nilaza.magicpendigital.com>` (Resend, đã xác minh 15/11).

## 1. Khi nào Nilaza gửi email

Đối chiếu mã app và Admin ngày 15/11:

| # | Tình huống | Ai nhận | Mẫu Supabase | Đang dùng? | Đề xuất |
|---|---|---|---|---|---|
| 1 | Đăng ký tài khoản mới, cần xác nhận email (cả khi bấm “Gửi lại thư xác nhận”) | Người dùng app | `confirmation` | **Có** | Áp ngay |
| 2 | Quên mật khẩu | Người dùng app **và** thành viên Admin (cùng một mẫu) | `recovery` | **Có** | Áp ngay; lời văn trung tính cho cả hai |
| 3 | Owner mời thành viên vào trang quản trị | Thành viên Admin mới | `invite` | **Có** (trang Thành viên & quyền) | Áp ngay |
| 4 | Mật khẩu vừa được đổi (báo an toàn) | Người dùng app, thành viên Admin | `password_changed_notification` | Chưa bật | Bật sau khi thử xong 1–3 |
| 5 | Đổi email tài khoản | — | `email_change`, `email_changed_notification` | Không (app chưa có chức năng đổi email) | Giữ sẵn, không bật |
| 6 | Đăng nhập bằng liên kết/mã (magic link, OTP) | — | `magic_link`, `reauthentication` | Không | Giữ sẵn, không bật |
| 7 | Xác thực 2 lớp, liên kết Google/Apple, đổi số điện thoại | — | `mfa_*`, `identity_*`, `phone_changed` | Không | Giữ sẵn, không bật |

Hai thư **Supabase không gửi được** (cần một hàm gửi thư riêng, để sau khi app lên Play):

- Thư chào mừng sau khi xác nhận email.
- Thư xác nhận đã xóa tài khoản (hữu ích khi Google Play hỏi về xóa dữ liệu).

## 2. Nguyên tắc chung

- **Tiếng Việt trước, một dòng tiếng Anh ngắn ở cuối.** App chưa lưu ngôn ngữ của người dùng lúc đăng ký (chỉ lưu tên), nên Supabase chưa thể chọn ngôn ngữ theo người. Nếu muốn thư chỉ một ngôn ngữ, app cần gửi thêm `locale` khi đăng ký — một thay đổi nhỏ trong app, làm sau.
- **Gọi tên khi có.** Thư đăng ký và đổi mật khẩu có thể chào “Chào {tên},” (lấy từ tên người dùng nhập lúc đăng ký); không có tên thì chào “Chào bạn,”.
- **Giọng Nilaza:** ấm, ngắn, dùng “bạn”, không hứa hẹn quá mức, không dùng chữ in hoa hay dấu chấm than để thúc giục.
- **An toàn:** một nút duy nhất; nói rõ liên kết hết hạn sau bao lâu; nói rõ “nếu không phải bạn” thì làm gì; không bao giờ hỏi mật khẩu; không chèn theo dõi mở thư hay nhấp chuột (đã tắt ở Resend).
- **Tránh vào thư rác:** tiêu đề không quá 60 ký tự, không biểu tượng cảm xúc, không chữ “miễn phí/khuyến mãi”, có địa chỉ hỗ trợ ở chân thư.
- **Thời hạn liên kết:** cấu hình mẫu trong repo là 1 giờ (`otp_expiry = 3600`). *Chưa kiểm* giá trị thật trên Singapore — cần đối chiếu trước khi áp.

Chân thư dùng chung:

> Nilaza · Một khoảng mở để lắng nghe mình.
> Đây là thư tự động, vui lòng không trả lời. Cần hỗ trợ: magicpendigital@gmail.com
> *This is an automated message from Nilaza. Need help? magicpendigital@gmail.com*

## 3. Bản soạn

### 3.1 Xác nhận đăng ký (`confirmation`)

- **Tiêu đề:** Xác nhận email để bắt đầu với Nilaza
- **Dòng xem trước:** Một bước nữa là bạn có thể đăng nhập.
- **Nội dung:**

> Chào {tên},
>
> Cảm ơn bạn đã tạo tài khoản Nilaza. Bấm nút bên dưới để xác nhận đây là email của bạn, sau đó quay lại ứng dụng và đăng nhập.
>
> **[Xác nhận email]**
>
> Liên kết dùng được trong 1 giờ. Nếu đã hết hạn, mở Nilaza và chọn “Gửi lại thư xác nhận”.
>
> Nếu bạn không đăng ký Nilaza, cứ bỏ qua thư này — tài khoản sẽ không được kích hoạt.
>
> *Confirm your email to finish creating your Nilaza account. The link works for 1 hour.*

### 3.2 Đặt lại mật khẩu (`recovery`) — dùng chung cho app và trang quản trị

- **Tiêu đề:** Đặt lại mật khẩu Nilaza
- **Dòng xem trước:** Liên kết đặt lại mật khẩu của bạn, dùng được trong 1 giờ.
- **Nội dung:**

> Chào bạn,
>
> Chúng tôi vừa nhận được yêu cầu đặt lại mật khẩu cho tài khoản Nilaza gắn với email này. Bấm nút bên dưới để chọn mật khẩu mới.
>
> **[Đặt mật khẩu mới]**
>
> Liên kết dùng được một lần, trong 1 giờ.
>
> Nếu bạn không yêu cầu, cứ bỏ qua thư này — mật khẩu hiện tại vẫn giữ nguyên. Nilaza không bao giờ hỏi mật khẩu của bạn qua email hay tin nhắn.
>
> *Someone asked to reset the password for your Nilaza account. If it was you, use the button above within 1 hour. If not, ignore this email; your password stays the same.*

Lưu ý: không ghi “mở ứng dụng” vì thành viên Admin cũng nhận mẫu này và liên kết của họ mở trang web quản trị.

### 3.3 Lời mời vào trang quản trị (`invite`)

- **Tiêu đề:** Bạn được mời tham gia quản trị Nilaza
- **Dòng xem trước:** Đặt mật khẩu để bắt đầu.
- **Nội dung:**

> Chào bạn,
>
> Bạn được mời tham gia nhóm quản trị Nilaza. Bấm nút bên dưới để đặt mật khẩu và đăng nhập vào trang quản trị. Quyền của bạn do Owner chọn khi gửi lời mời.
>
> **[Nhận lời mời]**
>
> Liên kết dùng được một lần, trong 1 giờ. Nếu đã hết hạn, hãy nhờ Owner gửi lại lời mời.
>
> Nếu bạn không biết lời mời này, cứ bỏ qua thư — sẽ không có tài khoản nào được kích hoạt.
>
> *You have been invited to the Nilaza admin team. Use the button above within 1 hour to set your password.*

Lưu ý: mẫu `invite` của Supabase dùng cho mọi lời mời; hiện chỉ trang quản trị gửi lời mời, nên viết riêng cho thành viên Admin.

### 3.4 Mật khẩu vừa được đổi (`password_changed_notification`) — bật sau

- **Tiêu đề:** Mật khẩu Nilaza của bạn vừa được đổi
- **Dòng xem trước:** Nếu không phải bạn, hãy đặt lại mật khẩu ngay.
- **Nội dung:**

> Chào {tên},
>
> Mật khẩu tài khoản Nilaza gắn với email {email} vừa được đổi.
>
> Nếu là bạn, bạn không cần làm gì thêm.
>
> Nếu không phải bạn, hãy mở Nilaza, chọn “Quên mật khẩu” để đặt mật khẩu mới, rồi báo cho chúng tôi qua magicpendigital@gmail.com.
>
> *The password for your Nilaza account was just changed. If this wasn't you, reset your password and contact us.*

Thư này không có nút (tránh giống thư lừa đảo).

### 3.5 Các mẫu chưa dùng

Đổi email, liên kết đăng nhập, mã xác minh, 2 lớp, liên kết tài khoản, đổi số điện thoại: giữ bản song ngữ ngắn đang có, **không bật**. Khi app có chức năng tương ứng sẽ soạn lại theo cùng giọng.

## 4. Áp dụng (cần Owner duyệt riêng)

1. Owner duyệt nội dung ở mục 3 (hoặc sửa câu chữ).
2. Viết lại 4 tệp HTML theo bản duyệt (giữ màu, font và khung hiện tại), cập nhật `manifest.json`, chạy kiểm tra.
3. Đối chiếu thời hạn liên kết thật trên Singapore.
4. **Áp lên Supabase** (đổi cài đặt — cần Owner duyệt): dán tiêu đề và nội dung 3 mẫu vào Authentication → Emails; mẫu 4 bật sau khi thử.
5. Thử thật: đăng ký mới, quên mật khẩu (app và Admin), mời một thành viên; xem trên Gmail điện thoại và máy tính, kiểm không vào Thư rác.
