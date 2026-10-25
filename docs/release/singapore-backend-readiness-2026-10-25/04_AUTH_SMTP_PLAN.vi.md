# Gói D — Kế hoạch Auth và SMTP cho Singapore (chưa thực hiện)

Ngày 25/10/2026, Asia/Bangkok. Kế hoạch này dựa trên các hồ sơ đã có cho project QA cũ (Resend, Supabase Auth, mẫu thư) và các quyết định ngày 23/10: bản đầu miễn phí, đối tượng 18+, chỉ nội dung tĩnh khi chưa đăng nhập, tính năng AI cần đăng nhập. **Mọi cấu hình dưới đây cần bạn đăng nhập Supabase, Resend và Cloudflare; tôi không đọc hay nhập mật khẩu/khóa thay bạn.** Không có gì trong gói này đã được thay đổi trên cloud.

## 1. Hiện trạng đã biết (QA cũ, không áp tự động cho Singapore)

| Mục | Trạng thái ghi nhận |
|---|---|
| Resend | Team `magicpendigital`; domain gửi QA `auth-qa.nilaza.magicpendigital.com` **Verified** (DKIM + hai CNAME), vùng Tokyo, Sending bật, Receiving tắt; khóa `nilaza-auth-qa-smtp` quyền Sending access |
| Supabase QA | SMTP bật (`smtp.resend.com`, cổng 465, người gửi `Nilaza QA`), hai mẫu xác nhận/đặt lại mật khẩu VI/EN đã lưu; Redirect URLs `nilaza://auth/confirm`, `nilaza://auth/recovery`; Site URL còn `http://localhost:3000` |
| Chưa làm | Domain gửi **production** (`auth.nilaza.magicpendigital.com` mới là đề xuất), nghiệm thu giao thư thật, 7 thông báo bảo mật, hộp thư nhận hỗ trợ |
| Singapore | Chưa có cấu hình Auth nào được xác minh; **mọi thứ phải thiết lập mới** |

## 2. Cấu hình đích trên Supabase Singapore (Authentication)

| Mục | Giá trị đề xuất | Lý do / cách kiểm |
|---|---|---|
| Email/Password | Bật | App dùng email + mật khẩu |
| Xác nhận email | **Bắt buộc** | Tránh tài khoản giả; hàm xóa/AI cần tài khoản thật |
| Anonymous sign-ins | **Tắt** | Guard AI và hàm xóa từ chối người dùng ẩn danh |
| Site URL | Địa chỉ web thực (ví dụ `https://nilaza.magicpendigital.com`) thay cho `localhost` | Link thư không rơi về localhost |
| Redirect URLs | Đúng hai mục: `nilaza://auth/confirm`, `nilaza://auth/recovery` | Khớp `EmailConfirmationBoundary` và `PasswordRecoveryBoundary`; kiểm danh sách chỉ có 2 mục |
| Độ dài mật khẩu tối thiểu | ≥ 8 (đọc lại quy tắc hiện tại của app trước khi đặt, tránh app chấp nhận mà server từ chối) | Đồng bộ với form đăng ký |
| Xoay vòng refresh token | Bật; thời hạn JWT mặc định | Giảm rủi ro token bị đánh cắp |
| Nhà cung cấp OAuth (Google/Apple/Facebook/X) | **Tắt cho bản đầu** (xem mục 6) | Nút chưa cấu hình làm hỏng trải nghiệm và bị người duyệt Play thấy |
| Thông báo bảo mật (đổi mật khẩu/email, liên kết đăng nhập…) | **Bật** các mục áp dụng | Có sẵn 7 mẫu trong `supabase/templates/auth` |
| Giới hạn tần suất gửi thư | Đọc giá trị mặc định **sau khi** bật SMTP riêng rồi đặt theo nhu cầu closed test | Dịch vụ gửi mặc định chỉ để thử, giới hạn rất thấp; giá trị chính xác kiểm trên dashboard, không đoán |
| CAPTCHA khi đăng ký | Cân nhắc (Turnstile); chưa bật trừ khi thấy lạm dụng | Cần khóa Turnstile; giữ đơn giản cho closed test |

## 3. Domain gửi thư production (Resend + Cloudflare)

1. **Resend → Domains → Add domain**, ví dụ `auth.nilaza.magicpendigital.com` (hoặc dùng lại domain QA cho closed test — chấp nhận được nhưng nên tách trước production). Chọn vùng gần người dùng (Tokyo đang dùng cho QA).
2. **Sao chép đúng bảng DNS của tài khoản** (TXT DKIM + CNAME gửi; **không tự thêm SPF/MX theo ví dụ trên mạng** — bài học từ lần QA: bảng thực tế khác bảng generic). Nhập vào Cloudflare DNS (hai CNAME ở chế độ **DNS only**, đúng tên tương đối của vùng).
3. Chờ **Verified**; kiểm DMARC gốc (`_dmarc.magicpendigital.com` hiện `p=none`); cân nhắc nâng chính sách sau khi có dữ liệu giao thư.
4. **Tạo khóa API riêng** `nilaza-auth-prod-smtp`, quyền **Sending access giới hạn đúng domain**. Chỉ bạn thấy giá trị; nhập thẳng vào Supabase, không dán vào chat/repo.
5. Supabase → Authentication → Emails → **SMTP Settings**: host `smtp.resend.com`, cổng `465`, username `resend`, password = khóa ở bước 4, người gửi `no-reply@<domain>`, tên `Nilaza`, khoảng cách tối thiểu 60 giây.
6. Chưa bật theo dõi click/open nếu không cần (giữ URL thư sạch).

## 4. Mẫu thư (13 mẫu song ngữ VI/EN đã có trong repo)

`supabase/templates/auth/`: `confirmation`, `recovery`, `email_change`, `invite`, `magic_link`, `reauthentication` và 7 mẫu thông báo bảo mật + `manifest.json`. Nội dung dùng `{{ .ConfirmationURL }}` và `{{ .Token }}`.

- Áp qua **Dashboard → Authentication → Emails → Templates** (cần SMTP riêng để sửa). Sao lưu mẫu mặc định trước khi ghi đè; sau khi **Save và tải lại**, đối chiếu từng mẫu với nguồn trong repo (cách đã làm ở QA).
- Kiểm tra chủ đề, hiển thị trên Gmail/Outlook/điện thoại, và **URL thực trong thư** (kiểm tracking domain nếu có).
- Chỉ áp những mẫu app thật sự dùng ở bản đầu: `confirmation`, `recovery`, `email_change`, các thông báo đổi mật khẩu/email; để các mẫu còn lại ở trạng thái sẵn sàng.

## 5. Ma trận kiểm thử giao thư (trước closed test)

| Ca | Tài khoản | Mong đợi |
|---|---|---|
| Đăng ký → nhận thư xác nhận → bấm link trên điện thoại | A (giả) | App mở bằng `nilaza://auth/confirm`, tài khoản xác nhận, vào Home |
| Gửi lại thư xác nhận (quá nhanh, rồi đúng giãn cách) | A | Chặn đúng khoảng cách 60 giây, báo lỗi dễ hiểu |
| Quên mật khẩu → link đặt lại → đổi mật khẩu | A | App mở `nilaza://auth/recovery`; thông báo “mật khẩu đã đổi” được gửi |
| Link hết hạn / dùng hai lần / mở trên máy không cài app | A | Thông báo rõ, không treo; không lộ thông tin |
| Đổi email | A | Thư xác nhận tới địa chỉ mới |
| Thư vào hộp thư đến (không phải spam) ở Gmail và một dịch vụ khác; tiêu đề SPF/DKIM/DMARC đạt | A | Kiểm tiêu đề thư gốc |
| Hai người dùng và một tài khoản bị thu hồi quyền | A, B | Không đọc/sửa dữ liệu của nhau (đã có kế hoạch phân quyền riêng) |
| Xóa tài khoản rồi đăng ký lại cùng email | A | Đăng ký lại được; hàng chờ waitlist theo email đã sạch |

## 6. Đăng nhập mạng xã hội: đề xuất ẩn ở bản đầu

Màn đăng ký hiện hiển thị Apple, Google, Facebook, X; hai nút sau mờ “Sắp ra mắt”. Để bản Play đầu gọn và không có nút hỏng, **đề xuất chỉ giữ email + mật khẩu**:
- **Google** cần OAuth client trên Google Cloud và chứng chỉ SHA-1 của khóa ký (với Play App Signing, SHA-1 chỉ biết sau lần upload đầu); thêm một vòng cấu hình và kiểm thử.
- **Apple** trên Android cần luồng web; không bắt buộc khi không có đăng nhập xã hội nào khác, và iOS làm sau.
- Facebook/X chưa có kế hoạch.
Việc ẩn nút là một thay đổi mã giao diện nhỏ (lát cắt mobile giai đoạn 3).

## 7. Tài khoản cho người duyệt Play (mục “App access”)

App yêu cầu đăng nhập cho tính năng AI; người duyệt cần tài khoản dùng được.
- Tạo bằng Dashboard → Authentication → Users → *Add user* (xác nhận sẵn email), đặt mật khẩu mạnh **chỉ lưu trong Play Console**, không đưa vào repo/chat; không gán vai trò staff.
- Đưa hướng dẫn từng bước vào mục App access: mở app → Đăng nhập → email/mật khẩu → các luồng cần xem. Báo trước nếu AI đang ở chế độ dự phòng (giai đoạn 0).
- Sau khi duyệt xong, đổi mật khẩu hoặc xóa tài khoản; không dùng chung với tài khoản thật của bạn.
- Nếu sau này có chế độ khách xem nội dung tĩnh, vẫn giữ tài khoản này cho các tính năng AI.

## 8. Hộp thư hỗ trợ

Play yêu cầu email liên hệ nhà phát triển, và trang xóa tài khoản cần một địa chỉ cho người không còn truy cập app. **Hiện chưa có hộp thư nhận** (Resend chỉ gửi). Đề xuất **Cloudflare Email Routing** (miễn phí, tên miền đã ở Cloudflare): tạo `support@magicpendigital.com` chuyển tiếp tới hộp thư của bạn; kiểm bằng một thư thử. Chưa kiểm khả năng áp dụng trên gói hiện tại.

## 9. Việc của Owner và của tôi

| Việc | Ai |
|---|---|
| Đăng nhập Supabase/Resend/Cloudflare; thêm domain; nhập bản ghi DNS; tạo khóa API và nhập vào SMTP; bấm Save | **Owner** |
| Sao chép mẫu thư, đối chiếu nội dung sau khi lưu, lập bảng kết quả kiểm thử | Tôi chuẩn bị, **Owner** thao tác trên dashboard (hoặc đăng nhập trong khung trình duyệt để tôi đọc — chỉ đọc, không nhập khóa) |
| Cập nhật nút đăng nhập, thông báo lỗi thân thiện | Tôi (lát cắt mã riêng) |
| Chạy ma trận mục 5 trên Air1 Ultra | **Owner** (thao tác) + tôi (ghi nhận và phân tích) |

## 10. Rủi ro và điểm chưa xác minh

- Giới hạn gửi thư, hành vi khi chạm trần, và các tùy chọn Auth của **gói Free** chưa được đọc cho Singapore.
- Link `nilaza://` chỉ mở được trên máy đã cài app; thư mở trên máy tính sẽ không xử lý token. Cân nhắc trang web đích sau khi có bản app công khai.
- Hộp thư đến phụ thuộc danh tiếng domain mới; chuẩn bị thư thử sớm và theo dõi bounce/complaint trong Resend.
