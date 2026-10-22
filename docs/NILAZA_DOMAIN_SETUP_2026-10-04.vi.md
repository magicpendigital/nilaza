# Nilaza — thiết lập domain và DNS email

Ngày kiểm tra: 2026-10-04. Chủ sản phẩm đã mua domain tại Cloudflare và chọn tự thiết lập DNS. Đây là hướng dẫn nội bộ, không xuất bản vào Help hoặc search corpus.

## Quyết định và hiện trạng

| Mục đích | Hostname | Trạng thái |
| --- | --- | --- |
| Website / Help | `nilaza.magicpendigital.com` | Default nguồn đã đồng bộ; DNS website chưa có lúc kiểm tra, chưa xác minh project Pages đang deploy |
| Auth QA | `auth-qa.nilaza.magicpendigital.com` | Domain, DKIM và hai CNAME đã Verified trên Resend; hai callback native đã lưu trên QA. SMTP có bản nháp chưa lưu, chưa có API key |
| Auth production | `auth.nilaza.magicpendigital.com` | Đề xuất cho bước production, chưa tạo |
| Growth | Domain/team riêng theo kế hoạch Resend toàn hệ thống | Chưa kích hoạt; không đưa người đăng ký Auth vào marketing audience |
| Nhận thư hỗ trợ | Chưa chọn mailbox hoặc inbound processor | Resend SMTP không tạo hộp thư; chưa cấu hình reply-to |

Nameserver công khai của `magicpendigital.com`: `clint.ns.cloudflare.com`, `amber.ns.cloudflare.com`. Cloudflare CLI đã hết phiên đăng nhập và không refresh được. Script local có tên `nilaza-web-staging`, nhưng chưa chứng minh project này tồn tại trên cloud.

Lần kiểm tra mới sau ảnh Verified: Tokyo `ap-northeast-1`, Sending bật, Receiving tắt. Configuration yêu cầu tạo tracking subdomain mới, chưa có tracking subdomain cấu hình; không tạo mới. Checkbox click tracking ở form tạo mới không phải trạng thái tracking đã lưu. TLS Opportunistic giữ nguyên; URL thực tế sẽ kiểm tra khi gửi thử. Không có credential được tạo, không có email đã gửi bởi agent. Thông số và trạng thái hiện hành: [bàn giao SMTP QA](RESEND_SMTP_QA_SETUP_2026-10-04.vi.md).

## 1. Lấy bảng DNS thực tế từ Resend

Mở [Resend Domains](https://resend.com/domains), chọn team `magicpendigital`, tìm `auth-qa.nilaza.magicpendigital.com`. Nếu đã có, mở domain đó; không Add domain lần nữa. Nếu chưa có, Add domain với đúng hostname trên, kiểm tra kết quả rồi mới tiếp tục.

Chép các dòng tại **DNS Records → Sending** gồm Type, Name, Value/Content và Priority. DKIM là public key, có thể sao chép; API key/password không phải DNS record và không gửi vào chat.

Ảnh thực tế của tài khoản yêu cầu **TXT DKIM và hai CNAME Sending**, không phải TXT SPF + MX. Dùng đúng bảng của tài khoản; hướng dẫn generic trước đó đã được thay thế. Không tự thêm MX/SPF từ ví dụ Internet. Receiving tiếp tục tắt cho pilot gửi Auth.

| Type | Name trong zone `magicpendigital.com` | Content / Target | Kiểm tra ngày 04/10 |
| --- | --- | --- | --- |
| TXT | `resend._domainkey.auth-qa.nilaza` | Public key `p=...` đã đối chiếu toàn bộ với Copy label trên dashboard | Đã có trên authoritative Cloudflare DNS; khớp chính xác key Resend và đã Verified. Không thêm trùng |
| CNAME | `rsend.auth-qa.nilaza` | `rsend-apne1.forge.rmta.net` | DNS công khai đã có, TTL 3600; không cần tạo trùng |
| CNAME | `send.auth-qa.nilaza` | `send.forge.rmta.net` | DNS công khai đã có, TTL 3600; không cần tạo trùng |

Lưu ý CNAME đầu là **`rsend`**, không phải `resend`. Lần kiểm tra trước chưa thấy DKIM/DMARC; sau ảnh Cloudflare mới, authoritative DNS đã trả TXT DKIM đúng Name và full key khớp Resend, cùng `_dmarc.magicpendigital.com` = `v=DMARC1; p=none;`. Ảnh Cloudflare chỉ hiển thị ba dòng không chứng minh DKIM vắng mặt. Lần kiểm tra cập nhật sau ảnh Verified xác nhận domain và cả ba record bắt buộc đã Verified trên Resend; không cần thêm DNS trùng. Agent không sửa DNS.

## 2. Nhập vào Cloudflare

1. Cloudflare → Websites → `magicpendigital.com` → **DNS → Records → Add record**.
2. Đối chiếu các record đã có trước; hiện hai CNAME và DKIM đều tồn tại, không thêm trùng. Nếu cần khôi phục DKIM trong tương lai, Type chọn TXT. Name là tên đầy đủ hoặc tên tương đối của zone; kiểm tra hostname hiển thị cuối cùng để tránh lặp hậu tố `magicpendigital.com`.
3. Ví dụ chuyển tên (chỉ minh họa cách nhập, không phải record đã lấy từ Resend): nếu bảng ghi `resend._domainkey.auth-qa.nilaza.magicpendigital.com`, Name trong zone là `resend._domainkey.auth-qa.nilaza`; nếu `send.auth-qa.nilaza.magicpendigital.com`, Name là `send.auth-qa.nilaza`.
4. Value/Content DKIM sao chép nguyên vẹn từ Resend, không nhập ký hiệu `[...]`. TTL chọn Auto; hai CNAME Sending đặt DNS Only (mây xám), TXT không dùng proxy. Bảng hiện tại không có MX/Priority phải thêm. Không xóa/sửa MX của `@` hoặc TXT SPF khác đang tồn tại.
5. Quay lại domain trong Resend → thao tác xác minh tương ứng (**I've added the records / Verify**). DNS có thể cần thời gian lan truyền; chỉ coi hoàn thành khi Sending và các record bắt buộc báo Verified.

DMARC gốc hiện đã có `v=DMARC1; p=none;`; giữ nguyên trong bước này. Chính sách riêng cho Auth QA là quyết định tiếp theo nếu cần, không bắt buộc thêm để hoàn thành bảng Sending hiện tại. Không thêm `rua` trỏ đến mailbox chưa hoạt động. Production sẽ đánh giá alignment và policy sau smoke test.

## 3. Website là một cấu hình riêng

Trong Cloudflare **Workers & Pages**, xác nhận đúng project chứa website Nilaza, bản deploy và URL `*.pages.dev` thực tế. Vào **Custom domains → Set up a custom domain**, nhập `nilaza.magicpendigital.com`, hoàn thành liên kết theo Cloudflare. Liên kết project trước DNS; CNAME tự tạo/được hướng dẫn phải trỏ đến project thực tế. Không tự trỏ vào tên staging trong script chỉ vì giống tên sản phẩm.

Website đạt khi HTTPS hoạt động, `/vi`, `/en`, Help hai ngôn ngữ mở đúng; canonical, `/robots.txt` và `/sitemap.xml` cùng origin chính thức. DNS gửi verified không có nghĩa website đã hoạt động. Public website hiện không xử lý token Supabase Auth; không đặt nó làm callback signup/reset khi chưa có Auth consumer tương ứng.

## 4. Sau DNS gửi Verified

Tiếp tục [Auth pilot](RESEND_AUTH_PILOT_2026-10-04.vi.md): kiểm tra tracking/receiving, key gửi giới hạn đúng domain QA, SMTP của **Nilaza Staging QA `akgrokwnkfqnfjqrildi`**, callback app QA, upload signup/recovery, rate limit, smoke test. Production và Growth có bước nghiệm thu riêng. Không thay target sang project MCY hoặc project production inactive.

SMTP dự kiến theo Resend: `smtp.resend.com`, port `465`, username `resend`; password là API key lưu trực tiếp trong cấu hình server. Sender pilot có thể là `Nilaza QA <no-reply@auth-qa.nilaza.magicpendigital.com>` sau domain verified. Reply-to cần mailbox thực sự tiếp nhận phản hồi. Không gửi key trong chat hoặc đặt vào `EXPO_PUBLIC_*`.

## Tác động và kiểm tra nguồn

Website root canonical, sitemap và robots nay dùng chung `Astro.site`; override `PUBLIC_SITE_URL` được giữ. Mobile Help default đổi domain và giữ `{locale}` override. Waitlist default CORS đổi domain; thiếu secret trả 503, CAPTCHA lỗi/sai hostname trả 400 trước RPC; lỗi mạng/JSON/timeout không cho phép bỏ qua kiểm tra. Request JSON null/array bị từ chối.

Không thay session/onboarding/profile/credits, Admin Content/AI Studio/Growth, RLS hoặc schema. Migration ledger vẫn `blocked_pending_reconciliation`; checker đạt không có nghĩa gate mở. Website/Edge/app chưa được deploy trong bước này. Localhost chỉ dùng review; cấu hình public cần site key, secret, hostname Turnstile và allowlist phù hợp trên đúng môi trường.

Lệnh xác minh: `npm run web:check`, `npm run web:build`, `npm run validate:public-content`, `npm --workspace apps/mobile run check`, `node --test scripts/test-marketing-waitlist-security.mjs` (Node có TypeScript stripping), `npm run validate:backend`; kiểm tra emitted URLs của build thường và override.

| Kiểm tra local | Kết quả |
| --- | --- |
| Feature Preflight | PASS trước triển khai; scope bổ sung tsconfig đã preflight trước chỉnh sửa |
| Web source check | PASS trên 19 file, 0 lỗi/warning/hint. Lần đầu báo 0 file vì tsconfig chỉ include worker declaration; đã sửa include source và generated Astro types |
| Web build | PASS, 43 trang; Pagefind 16 bài Help, VI/EN |
| URL đầu ra | PASS: root, robots, toàn bộ 42 sitemap URL và canonical product/Help VI/EN cùng origin chính thức |
| PUBLIC_SITE_URL override | PASS trên build với hostname kiểm tra `.invalid`; root/robots/sitemap và canonical Help đồng bộ; build cuối khôi phục origin chính thức |
| Mobile TypeScript | PASS |
| CAPTCHA regression | 5/5 PASS; thiếu cấu hình/token, đúng/sai hostname, malformed result, HTTP/JSON/network và abort timeout |
| Public content | PASS, 22 documents / 58 chunks; không phát hành tài liệu owner vào corpus |
| Backend contracts / diff whitespace | PASS; không phải kiểm tra Deno runtime hoặc mở migration gate |

Không chạy gửi mail thật, deploy, DNS mutation, native acceptance hoặc Deno integration trong bước này. Node test phát cảnh báo package type của module TypeScript vì root package CommonJS; không đổi kiểu module của toàn repo để xóa cảnh báo. Không thay đổi skill: Plan-QC và Brand vẫn bao quát whole-app impact, Auth isolation và release gate; thông tin domain/provider giữ trong runbook này.

Rollback nguồn: revert các default URL và route robots trong scope; giữ CAPTCHA fail-closed khi endpoint public. Không có schema rollback, không thu hồi key chưa tạo. DNS do chủ sản phẩm tự quản lý; mọi thay đổi website/email cần ghi lại record trước để có thể khôi phục.

Nguồn chính thức đã kiểm tra 04/10: [Resend domain](https://resend.com/docs/dashboard/domains/introduction), [Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp), [Cloudflare Pages custom domain](https://developers.cloudflare.com/pages/configuration/custom-domains/), [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
