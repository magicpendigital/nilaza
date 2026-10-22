# Nilaza — đánh giá email và Supabase Auth

Ngày kiểm tra: 2026-10-01. Phạm vi: kiểm tra chỉ đọc cấu hình hosted, metadata database, danh sách Edge Functions, code ứng dụng và tài liệu chính thức. Không gửi email, tạo tài khoản, thay đổi SMTP/Auth, mua dịch vụ hoặc chạy migration.

## Kết luận

**Giữ Supabase Auth cho tài khoản; bổ sung nhà cung cấp gửi email trước khi mở đăng ký đại trà.** Supabase có sẵn xác nhận đăng ký và reset mật khẩu. Dịch vụ gửi email mặc định chỉ phù hợp thử nghiệm. Email marketing/waitlist tự động của Nilaza mới có nền tảng dữ liệu, chưa có luồng vận hành gửi hoàn chỉnh. Nhận email từ bên ngoài cần mailbox hoặc dịch vụ inbound riêng.

## Hiện trạng đã xác minh

| Hạng mục | Bằng chứng thực tế | Đánh giá |
| --- | --- | --- |
| Backend đang dùng | Bootstrap Admin hosted và CLI project-ref cùng trỏ `akgrokwnkfqnfjqrildi` — Nilaza Staging QA; trạng thái ACTIVE_HEALTHY | Đây là backend staging đang hoạt động |
| Tổ chức Supabase | MCP trả plan `free`, tier `tier_free` | Chưa phải cấu hình vận hành production được nghiệm thu |
| Dự án cũ | Project tên Nilaza, ref `uannkrywhxzrulufgqvx`, trạng thái INACTIVE | Không dùng trạng thái dự án cũ làm bằng chứng cho backend đang phục vụ Admin |
| Custom SMTP | Dashboard Authentication → Emails → SMTP Settings: Toggle SMTP = 0 | Chưa kết nối SMTP riêng |
| Đăng ký email | GET `/auth/v1/settings`: external.email = true, disable_signup = false, mailer_autoconfirm = false | Cho phép signup; yêu cầu xác nhận email |
| Template email | Dashboard yêu cầu thiết lập custom SMTP để sửa template; hiện gửi bằng default templates | Chưa có template Nilaza VI/EN được nghiệm thu |
| Thông báo bảo mật | Các switch Password changed, Email address changed, Phone number changed, Sign-in method linked/removed, MFA method added/removed đều = 0 | Các cảnh báo này chưa bật; reset email khác với cảnh báo sau khi đổi mật khẩu |
| Waitlist | Live database có marketing_waitlist, marketing_consent_events, marketing_suppressions, marketing_email_tokens, marketing_deliveries; marketing-waitlist function ACTIVE, metadata version 21 | Đã có nơi lưu đăng ký, consent và ledger; source deployed chỉ xác thực input/Turnstile rồi gọi register_marketing_waitlist_request, không gọi ESP hoặc enqueue email |
| Lịch/queue trên Supabase | Query pg_extension: không có pg_cron, pgmq, pg_net | Chưa có nền tảng Cron/Queues theo phương án hiện tại |
| Email worker/webhook | Danh sách deployed Edge Functions không có marketing email sender, confirmation/unsubscribe endpoint hoặc inbound email webhook được nhận diện | Chưa thấy chuỗi gửi/nhận email marketing hoàn chỉnh trên backend này |

Các function notification-dispatch, notification-receipts và notification-inbox thuộc kênh notification/push/in-app hiện tại; chúng không chứng minh có email SMTP hay mailbox.

Kiểm tra DNS bổ sung: `nilaza.ai` là Site URL mặc định trong `apps/web/astro.config.mjs` và origin mặc định của waitlist. Truy vấn MX của `nilaza.ai` và TXT của `_dmarc.nilaza.ai` từ máy làm việc đều trả “DNS name does not exist”, kể cả lần chạy ngoài sandbox. Chưa có bằng chứng MX/DMARC cho domain mặc định này. `PUBLIC_SITE_URL` có thể thay domain website; kết quả trên không xác định domain sender/mailbox thực tế của owner và không kết luận về những domain khác. Cần chọn/xác minh domain thực tế trước cấu hình ESP.

Giới hạn kiểm tra: kết nối browser bị mất trong lúc mở Rate Limits, Auth Hooks và URL Configuration. Vì vậy **chưa xác minh giá trị rate limit tùy chỉnh, Send Email Hook, redirect allowlist hosted, DNS sender, tài khoản ESP bên ngoài, hay mailbox đang có**. Không kết luận tuyệt đối rằng không có hệ thống email bên ngoài Supabase. Custom SMTP tắt và template mặc định đã được nhìn thấy trực tiếp; không có bằng chứng một hook thay thế đang vận hành.

## Dịch vụ có sẵn phục vụ demo hay production?

Hai phần cần đánh giá riêng:

1. **Supabase Auth** quản lý user, phiên đăng nhập, token xác nhận và reset. Đây là thành phần có thể dùng trong production; không cần chuyển toàn bộ tài khoản sang hệ thống Auth khác chỉ để gửi email.
2. **Dịch vụ gửi email mặc định** có hạn mức hiện hành 2 email/giờ theo project, chỉ gửi đến địa chỉ thành viên nhóm dự án, best-effort và không có SLA gửi/uptime. Nhà cung cấp khuyến nghị custom SMTP cho ứng dụng thực tế. [Supabase Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

Nâng gói Supabase không tự biến default SMTP thành dịch vụ giao email production. Cần cấu hình ESP riêng qua SMTP, hoặc Send Email Hook gọi API của ESP. Sau khi cấu hình SMTP, tài liệu hiện ghi mức ban đầu 30 email/giờ; phải điều chỉnh theo nhu cầu và quota ESP, không coi đó là mức đã cấu hình của Nilaza. [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Các email tài khoản

Supabase có sẵn confirm signup, invite, magic link/OTP, change email, reset password và reauthentication. Các cảnh báo đổi mật khẩu/email/phương thức đăng nhập/MFA chỉ gửi khi bật tùy chọn tương ứng. Đây không phải hệ thống tự động gửi toàn bộ email nghiệp vụ: welcome sau kích hoạt, nhắc dùng app, mời beta, thanh toán hoặc chiến dịch vẫn cần logic riêng. [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates).

Code Nilaza hiện có:

- `apps/mobile/src/auth/supabaseAuth.ts`: signup, resend signup confirmation và resetPasswordForEmail; reset chặn gửi lại trong 60 giây ở client.
- `apps/mobile/src/auth/passwordRecovery.ts`: redirect native `nilaza://auth/recovery`, xác minh recovery session trước đổi mật khẩu, không nhận recovery thành phiên app thông thường.
- Signup/resend chưa truyền `emailRedirectTo` riêng; đường về sau xác nhận phụ thuộc Site URL/template hosted. Đây là mục phải kiểm thử trước public beta.
- `apps/admin/recovery.html`, `recovery.js`, `recovery-core.js`: có luồng recovery Admin và kiểm thử tự động; không thay thế QA link email thực trên iOS/Android.

Các template default hiện không thể tùy chỉnh trên Free project mới dùng default SMTP; changelog ngày 2026-06-03 và thông báo dashboard phù hợp nhau. [Supabase changelog](https://supabase.com/changelog). `supabase/config.toml` là cấu hình local, không dùng nó để suy ra cấu hình hosted.

## Có đáp ứng lượng người dùng lớn không?

Có thể phát triển trên Supabase Auth, nhưng **hiện trạng Nilaza chưa đủ bằng chứng sẵn sàng cho lượng người dùng lớn**. Nút thắt email hiện nằm ở dịch vụ giao email và các gate chưa nghiệm thu, không chỉ số user lưu trong Auth.

Theo bảng giá kiểm tra hôm nay: Free gồm 50.000 MAU, Pro từ 25 USD/tháng gồm 100.000 MAU; vượt phần bao gồm tính theo MAU. Free có tài nguyên nhỏ và có thể bị pause sau một tuần không hoạt động. Quota MAU không phải số email/tháng, tốc độ signup/giây hay cam kết tải đồng thời. [Supabase Pricing](https://supabase.com/pricing).

Khi tăng user cần kiểm tra đồng thời: quota MAU/compute/database; Auth email limit theo project; rate limit theo IP/user; quota ESP và uy tín domain; thời gian giao mail; link hết hạn và recovery; xử lý bot/429; giám sát lỗi và chi phí. Ví dụ kế hoạch 1.000 signup/giờ đã cần ít nhất khoảng 1.000 email xác nhận/giờ, chưa tính resend/reset; default sender không đáp ứng. Đây là phép tính dung lượng minh họa, không phải dự báo user Nilaza.

Đề xuất dùng Pro cho backend production khi ra public beta, ngân sách compute và ESP tính riêng; giữ staging tách biệt. Không cần đổi Auth provider lúc này. Muốn cam kết quy mô phải có mục tiêu signup/giờ, MAU, phép thử tải, giám sát và kế hoạch nâng tài nguyên.

## Gửi và nhận email tự động

**Gửi Auth:** Supabase Auth → SMTP của ESP → inbox người dùng. Với nhu cầu VI/EN theo user, template tùy biến hoặc failover phức tạp, Send Email Hook có thể thay SMTP bằng API provider; cần xác minh sự hỗ trợ cụ thể và kiểm thử lỗi trước lựa chọn. [Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook).

**Gửi marketing/waitlist:** form → pending_confirmation → durable outbox/queue → worker gửi confirmation → token một lần → confirmed → chuỗi email được duyệt. Cần unsubscribe, suppression, idempotency, retry/backoff, dead letter, webhook chữ ký và hạn mức cohort. Các table hiện hữu chưa tự thực hiện chuỗi này. Phương án chi tiết có trong [kế hoạch waitlist](NILAZA_WAITLIST_MARKETING_AUTOMATION_PLAN.md); ledger migration vẫn chặn generic db push/repair.

**Nhận email:** Supabase Auth không cung cấp mailbox/IMAP hoặc inbound SMTP cho domain Nilaza. Để người dùng trả lời support, dùng mailbox đang có hoặc Google Workspace/Microsoft 365/helpdesk. Nếu app cần tự xử lý email đến, dùng dịch vụ inbound nhận MX và chuyển signed webhook → protected Edge Function → lưu metadata tối thiểu. Resend hỗ trợ inbound qua domain được cấu hình MX và webhook; đây là lựa chọn có tài liệu tích hợp gửi SMTP với Supabase. [Resend SMTP](https://resend.com/docs/send-with-supabase-smtp), [Resend Receiving](https://resend.com/docs/dashboard/receiving/introduction).

Không chuyển MX của domain đang có mailbox khi chưa kiểm tra; có thể dùng subdomain inbound riêng. Nội dung email đến là dữ liệu không tin cậy: không để nó tự thực thi lệnh, gọi agent có quyền hoặc đi vào AI trace chứa thông tin riêng tư.

## Đề xuất triển khai cho Nilaza

Đề xuất ban đầu: **Supabase Auth + Resend qua custom SMTP** cho email tài khoản, vì có hướng dẫn tích hợp chính thức và đường inbound nếu cần sau này. Postmark, AWS SES, SendGrid hoặc Brevo cũng tương thích SMTP theo tài liệu Supabase; chưa đánh giá tài khoản, giá/quota và khả năng giao email thực tế của các nhà cung cấp này cho Nilaza. Đây là đề xuất kiến trúc, chưa phải quyết định mua hoặc kết nối provider.

Tách sender/subdomain và luồng vận hành Auth khỏi marketing, để campaign không làm ảnh hưởng email khôi phục tài khoản. Với quy mô lớn hoặc nhu cầu dịch vụ khác nhau, tách provider theo khuyến nghị Supabase; một provider chung với hai stream cần đánh giá rủi ro uy tín chung. Không gộp email quảng cáo vào email xác nhận/reset. [Custom SMTP best practices](https://supabase.com/docs/guides/auth/auth-smtp).

Thứ tự thực hiện:

1. Chọn ESP và domain/subdomain sender; xác minh SPF/DKIM/DMARC, From/Reply-To; cấp secret ở server.
2. Kết nối custom SMTP trên staging; rà Site URL và redirect allowlist; tạo template tài khoản VI/EN theo lựa chọn SMTP hoặc Hook. Bật các cảnh báo bảo mật phù hợp sau khi kiểm tra quota và nội dung.
3. Với địa chỉ test được owner chỉ định, kiểm thử signup, resend, reset, link hết hạn/đã dùng, cảnh báo đổi mật khẩu, Gmail/Outlook và iOS/Android; chỉ gọi bước gửi mail sau khi được cho phép.
4. Chọn production project/gói, quota Auth/ESP và mục tiêu tải; giám sát send errors, bounce/complaint, thời gian delivery, 429 và ngân sách. Tắt link tracking của ESP cho link Auth nếu nó làm hỏng luồng xác nhận.
5. Hoàn thiện migration forward path đã duyệt, outbox/worker/webhooks và consent/unsubscribe cho waitlist; bắt đầu cohort nhỏ có kill switch. Không kích hoạt hàng loạt từ UI Growth hiện tại.
6. Chỉ tích hợp inbound khi có nhu cầu support/automation cụ thể; kiểm tra mailbox/DNS đang có trước.

## Bằng chứng và giới hạn nghiệm thu

Nguồn hosted: MCP list_projects/get_organization/list_edge_functions; SQL metadata và extension catalog; dashboard SMTP/Templates; public Auth settings lấy từ project do Admin đang dùng. Không đọc danh sách user hoặc email subscriber.

Nguồn repo: mobile auth/recovery, Admin recovery, backend notification architecture, waitlist plan và migration ledger. Đã đối chiếu tài liệu chính thức ngày 2026-10-01; Markdown changelog bị công cụ fetch từ chối nên dùng trang HTML changelog.

Chưa gửi email thật, thử signup/reset thật, đổi password, kiểm thử tải hay xác nhận DNS/inbound. Vì vậy báo cáo đánh giá cấu hình và luồng; không phải nghiệm thu deliverability hoặc production launch.
