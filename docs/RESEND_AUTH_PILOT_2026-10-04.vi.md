# Resend — triển khai bước Auth đầu tiên

Ngày tạo: 2026-10-04; cập nhật 2026-10-05. Kế hoạch gốc: [tích hợp toàn hệ thống](RESEND_SYSTEM_INTEGRATION_PLAN_2026-10-04.vi.md). Chủ sản phẩm đã đồng ý triển khai từng bước. Domain tổ chức `magicpendigital.com`, website Nilaza `https://nilaza.magicpendigital.com`, DNS Cloudflare. Domain gửi QA: `auth-qa.nilaza.magicpendigital.com`. **SMTP QA đã bật và xác minh; hai mẫu confirmation/recovery đã áp dụng và đối chiếu hậu lưu. APK Android QA mới đã build/kiểm tra và cài đè giữ dữ liệu trên Air1 Ultra theo yêu cầu chủ sản phẩm; hash đã cài khớp. Chưa gửi email hoặc nghiệm thu luồng Auth trên thiết bị.** [Receipt cài đặt](../artifacts/resend-auth-android-qa-2026-10-05/device-install-receipt.json).

## Cập nhật sau xác minh domain và callback

Cập nhật 05/10 sau chủ sản phẩm đăng nhập lại: Chrome mở đúng QA `akgrokwnkfqnfjqrildi`/org Nilaza. SMTP enabled, `Nilaza QA`, `smtp.resend.com:465`, interval 60 giây, stored password hidden; sender/username redacted nên không đối chiếu giá trị. Đã sao lưu, Save và reload hai mẫu; subject đúng manifest, toàn bộ HTML copied từ Source editor khớp nguồn khi chuẩn hóa line ending. Ảnh Preview và receipt hash tại [bước template QA](RESEND_AUTH_QA_TEMPLATE_ACTIVATION_2026-10-04.vi.md). 11 mẫu khác vẫn chỉ prepared; bộ nguồn manifest không đổi trạng thái tổng thể.

Resend key list hiển thị `nilaza-auth-qa-smtp` có Sending access, No activity tại thời điểm đọc; chủ sản phẩm tự xác nhận chỉ domain QA. Agent không đọc credential hoặc key detail sau automatic approval review từ chối vì nguy cơ hiển thị secret. Mailbox test đã được chỉ định nhưng không ghi vào repo. Supabase SMTP/two template UI không có Send test button; chưa gửi hoặc chứng minh delivery. [APK Android QA](../artifacts/resend-auth-android-qa-2026-10-05/nilaza-auth-qa-20261005.apk) chứa code mới đã build và xác minh; TypeScript, 11 suite/62 test Auth, signature/package/embedded bundle và web export validator đều PASS, 2.268 đầu vào nguồn không đổi. Chủ sản phẩm tự cài theo [hướng dẫn](../artifacts/resend-auth-android-qa-2026-10-05/OWNER_TEST.vi.md); device/delivery acceptance còn pending. Artifact dùng debug signing và nguồn còn dirty, không phải release production.

Resend domain, DKIM và hai CNAME Sending đã **Verified**. Configuration chưa có tracking subdomain; không tạo tracking. Hai Redirect URLs `nilaza://auth/confirm` và `nilaza://auth/recovery` đã lưu vào đúng QA sau xác nhận. Site URL vẫn localhost; web QA cần origin/path thực tế, website giới thiệu không thay callback app. Xem [runbook SMTP QA](RESEND_SMTP_QA_SETUP_2026-10-04.vi.md) cho thông số và giới hạn; tích hợp chưa được nghiệm thu end-to-end.

## Baseline trước thiết lập domain (lịch sử, không phải hiện trạng mới)

| Hệ thống | Bằng chứng ngày 04/10 | Hệ quả |
| --- | --- | --- |
| Resend | Team `magicpendigital`; Transactional Free; 0/3.000 tháng, 0/100 ngày; chưa có domain | Chưa thể bật người gửi Nilaza thật; không mua gói hoặc dùng sender demo thay thế |
| Supabase | Project `akgrokwnkfqnfjqrildi`, tên Nilaza Staging QA, org Nilaza | Phân biệt với MCY; nhãn branch PRODUCTION trong dashboard không biến project QA thành môi trường sản phẩm |
| URL Configuration | Site URL `http://localhost:3000`; No Redirect URLs | Luồng email hiện có thể rơi về localhost; cần bổ sung callback và Site URL phù hợp trước smoke test |
| Emails | Custom SMTP tắt; yêu cầu custom SMTP để sửa template; 7 thông báo bảo mật đều tắt | Các file template trong repo chưa phải template đang dùng trên cloud |
| Auth Hooks | Trang hiển thị tạo hook mới, chưa có hook cấu hình | Chưa có Send Email Hook thay thế SMTP |
| Migration ledger | `blocked_pending_reconciliation` | Không push/repair migration, không triển khai schema outbox hoặc queue trong bước này |

Hạn mức email Auth live chi tiết chưa được xác minh lại; không suy từ quota Resend thành quota Auth. Bảng trên chỉ là baseline lịch sử trước domain/SMTP. Domain QA sau đó đã Verified theo [runbook domain](NILAZA_DOMAIN_SETUP_2026-10-04.vi.md); không tạo lại domain/CNAME. Tracking URL thực tế cần kiểm tra khi delivery smoke test.

## Phần đã triển khai

Cập nhật hiện hành: TXT DKIM khớp full public key, DMARC gốc `v=DMARC1; p=none;`; domain/record bắt buộc Verified, callback native đã lưu, SMTP enabled và hai mẫu đã áp dụng. Delivery/native acceptance còn pending; đây không phải production readiness.

- Đăng ký và gửi lại xác nhận dùng callback rõ ràng: native `nilaza://auth/confirm`; web lấy đúng origin/path của bản app đang mở, thêm `?confirmation=1`. Không hard-code tên miền chưa sở hữu.
- Màn hình xác nhận kiểm tra JWT với `Supabase Auth getUser`, yêu cầu `email_confirmed_at`. Không lưu token, không tự nhận phiên đăng nhập từ link; tài khoản đang dùng trên thiết bị không bị thay thế. Người dùng quay về app để đăng nhập bằng mật khẩu.
- Callback sai loại, link lỗi/hết hạn hoặc user chưa xác nhận không báo thành công. Web xóa query/fragment nhạy cảm khỏi URL khi nhận callback. Kết quả request cũ không ghi đè callback mới.
- Giữ nguyên boundary khôi phục mật khẩu ở ngoài boundary xác nhận. Reset tiếp tục dùng client tạm riêng và `nilaza://auth/recovery`; không nhập phiên recovery vào phiên chính.
- Gửi lại xác nhận có cooldown 60 giây trên tiến trình client, kể cả khi provider lỗi hoặc đổi người nhận. Đây là UX protection; vẫn phải cấu hình rate limit/CAPTCHA phía Auth để chống abuse khi mở public.
- Signup trùng email giữ phản hồi chung của Supabase; không báo rằng địa chỉ đó đã có tài khoản. Nội dung màn hình phân biệt yêu cầu được nhận với email thực sự đến hộp thư.
- Telemetry của signup chưa có session chuyển từ `supabase_account_created` sang `supabase_signup_confirmation_requested`. Không tính request chung, kể cả signup trùng, thành tài khoản đã tạo. Không thêm email hoặc token vào metadata.
- Chuẩn bị 13 template VI/EN: 6 Auth và 7 security notification. Chỉ signup/recovery thuộc pilot hiện tại. Magic link, invite, đổi email, reauthentication và các thông báo khác cần nghiệm thu riêng trước bật tính năng tương ứng.

Nguồn template: [`supabase/templates/auth/manifest.json`](../supabase/templates/auth/manifest.json); mỗi HTML là nguồn để upload, subject và Management API keys nằm trong manifest. Trạng thái `prepared-not-applied` là trạng thái của bộ nguồn này, không chứng minh trạng thái cloud. Mẫu không có tracking, remote asset, thông tin Chat/Journal/ngày sinh, tên người dùng hoặc đường dẫn domain đoán trước. Font hệ thống là fallback khi email client không có font thương hiệu; không dựng logo thay thế.

## Tác động toàn hệ thống

| Phần | Xử lý trong bước này |
| --- | --- |
| Entry/navigation | Bổ sung confirmation boundary trước AccountBoundary; recovery giữ ưu tiên; có loading, error, success, nút quay về và VI/EN |
| Data/account | Không sửa bảng/profile, credits, export/delete hoặc onboarding; không nhận phiên của tài khoản khác từ email |
| Backend/provider | Supabase tiếp tục phát và xác minh token; QA SMTP đã bật, hai template đã áp dụng; không triển khai hook/API worker |
| Admin | Content Operations, AI Studio, Growth giữ nguyên; không thêm chỉ số “delivered” giả |
| Privacy/consent | Email Auth không cấp marketing consent; không thêm người dùng vào audience Resend |
| Analytics | Tách request xác nhận khỏi account-created; không log token, email body hoặc recipient; delivery vẫn chưa được kiểm chứng |
| Rollback | Code Auth rollback riêng theo nguồn; template cloud phục hồi hai subject/body từ backup. Credential disable/revoke do chủ sản phẩm thực hiện; không migration rollback |
| Release | Mã nguồn local; kiểm tra bundle không thay thế CI, email-client render hoặc nghiệm thu thiết bị thật |

Các thay đổi Admin/workflow đang có trong working tree được giữ nguyên. Không deploy chúng như một phần của Auth pilot.

## Trình tự tiếp tục khi có domain

1. Xác nhận domain sở hữu, nhà quản lý DNS, target QA và địa chỉ nhận hỗ trợ thực tế. Website chính thức là `https://nilaza.magicpendigital.com`; rà soát website, Help/legal, sender, CORS/origin, Site URL và email links cùng nhau trên đúng môi trường. Không tự đổi MX gốc nếu chưa quyết định nơi nhận thư.
2. Tách đường gửi Auth khỏi Growth theo kế hoạch toàn hệ thống; quyết định team Resend trước tạo key vì suppression nằm ở cấp team. Xác minh domain/subdomain gửi QA bằng đúng DNS records Resend cung cấp. Không tự bịa DKIM/SPF/MX. Kiểm tra SPF/DKIM, DMARC và tắt open/click tracking cho Auth.
3. Tạo key gửi có phạm vi tối thiểu cho domain/team QA; nhập trực tiếp vào phần SMTP của Supabase. Không gửi key trong chat, không đặt trong `EXPO_PUBLIC_*` hoặc repo. Theo [hướng dẫn Resend SMTP](https://resend.com/docs/send-with-supabase-smtp): host `smtp.resend.com`, port `465`, username `resend`, password là API key. From và reply-to phải là địa chỉ đã được xác minh và có cách tiếp nhận phản hồi phù hợp.
4. Xác minh Send Email Hook không bật để giữ một tuyến gửi. Lưu bản cấu hình cũ theo quy trình secret-safe; cấu hình Site URL cho app QA thực tế và allowlist chính xác `nilaza://auth/confirm`, `nilaza://auth/recovery`, cùng URL web confirmation/recovery lấy từ app được deploy. Không dùng wildcard production. Chỉ thêm localhost URL khi cần test QA.
5. Giữ yêu cầu confirm email; bật SMTP sau khi lưu credential và domain verified. Upload signup/recovery theo manifest, kiểm tra những action khác đang dùng default có đúng return path. Templates không thực thi các luồng chưa có trong app.
6. Kiểm tra Auth email/hour, resend interval, password policy và CAPTCHA; quota provider và quota Auth là hai lớp riêng. Pilot đề xuất tối đa 20 người nhận nội bộ và 50 email/ngày tổng, chừa dung lượng cho resend/reset; không bật campaign hoặc trả phí tự động.
7. Chạy smoke test signup → nhận thư → xác nhận → đăng nhập; resend/cooldown; link lỗi/hết hạn; reset → mật khẩu cũ thất bại/mới thành công; mở link tài khoản B khi thiết bị đang ở A không thay thế phiên A. Kiểm tra cả native và web bản QA thực tế, Gmail/Outlook, VI/EN, spam và delivery logs. Không bấm link thật bằng công cụ preview vì có thể tiêu hao token một lần.
8. Sau SMTP ổn định và kênh hỗ trợ có thật, bật và kiểm tra thông báo đổi mật khẩu/email; ghi nguồn template/version/config và kết quả provider. Các thông báo identity/MFA/phone nghiệm thu cùng tính năng tương ứng.
9. Chuyển sang outbox/worker/webhook và Growth sau khi giải quyết target/migration forward path. Không thực hiện db push/repair chỉ để vượt qua gate. Production rollout có key/domain riêng và chỉ sau nghiệm thu QA.

SMTP dùng để gửi email; không tạo hộp thư hỗ trợ hoặc luồng nhận email. Inbound và email tự động nghiệp vụ là các bước riêng của kế hoạch toàn hệ thống.

## Kiểm tra và giới hạn

- Feature Preflight: PASS trước triển khai code/template và export ban đầu; đã chạy lại PASS sau khi cập nhật telemetry và ghi nhận tài liệu bàn giao trong working-tree review. Scope Auth riêng, không database write.
- Mobile TypeScript: PASS.
- Auth regression: 10 suite / 55 test PASS ở lần chạy đầu; suite Supabase Auth có lỗi cách đặt thời gian trong test cooldown. Đã sửa clock của fixture và chạy lại suite đó: 7/7 PASS. Tổng 62 test Auth đã đạt qua các lần chạy. Lỗi fixture không cần đổi logic cooldown.
- Template validator: PASS, đủ 13 action, VI/EN, đúng supported variables, không tracking/remote links/private metadata. Đây là static validation; email-client rendering và delivery chưa kiểm tra.
- Brand validation: PASS; không thay nguồn asset/skill. Skill Plan-QC và Brand giữ `verified-current` vì hướng dẫn đã bao quát Auth isolation, public communications và release gates; chi tiết provider lưu trong runbook riêng.
- Migration ledger checker: exit 0 nhưng ledger **vẫn blocked**, không có reconciliation.
- Web export production: PASS, 1.603 module, tổng 69,82 MB; export size validator PASS. Artifact: `apps/mobile/dist/auth-pilot-20261004/web`; JS cuối `index-0446e3ea634920e26ec393f33a4b4e0f.js`, 9.232.957 byte, SHA-256 `377f88fe56b0c6479f0d779b572568905df0c0fdaf22f097d31f7024667b1e94`.
- Android embedded bundle production: PASS, 1.968 module; có bundle, sourcemap và assets dưới `apps/mobile/dist/auth-pilot-20261004/native`. Bundle cuối 10.066.258 byte, SHA-256 `ad90a17261929d093d638531d70b80cdd701c54bc9bba8a27f9fecb548887f94`. Đã export lại sau sửa telemetry. Đây là bundle kiểm tra, không phải APK đã cài hoặc nghiệm thu thiết bị.
- Mobile TypeScript cuối cùng sau sửa telemetry: PASS. CI và thiết bị thật chưa chạy cho thay đổi này. Export dùng `EXPO_NO_DOTENV=1`, không cần secret Resend hoặc gửi email.

Tiêu chí hoàn tất Auth pilot: domain/callback/SMTP đã cấu hình, hai mẫu đúng nguồn, bản app QA chứa code mới, native và delivery smoke test đạt; web/security notifications có gate riêng khi mở tương ứng. **DNS gửi, callback native, SMTP enabled và hai template cloud đã hoàn tất bước cấu hình. Chưa gửi thư, chưa kiểm thử delivery hoặc device; chưa phát hành app mới.** Phạm vi domain của key do chủ sản phẩm xác nhận; sender/username chưa đối chiếu do redaction, validity của credential cần kiểm chứng bằng lần gửi thực tế.
