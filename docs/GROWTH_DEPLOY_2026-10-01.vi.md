# Growth Operations — bàn giao deploy staging

Ngày: 2026-10-01. User đã yêu cầu deploy sau bàn giao Growth local ngày 2026-09-30.

## Kết quả

**Đã triển khai và promote lên [Nilaza Admin staging](https://nilaza-admin-staging.vercel.app/#/growth/overview).** Vercel xác nhận deployment mới READY và alias đã trỏ tới bản mới. Đây là deploy code Admin vào project `nilaza-admin-staging`; không phải phát hành mobile/store, publish content bundle hoặc kích hoạt email marketing.

| Mốc | Giá trị |
| --- | --- |
| Vercel project | nilaza-admin-staging / prj_cjpkCLLKMUaH6x4Bw6PK6cklx1qL |
| Backend | Nilaza Staging QA / akgrokwnkfqnfjqrildi |
| Preview đã kiểm tra | [6eova06df](https://nilaza-admin-staging-6eova06df-magicpens-projects.vercel.app), dpl_BSzfnefM7ubMPGihsEr9aN2ct1Ca |
| Deployment sau promote | [7men9k1lz](https://nilaza-admin-staging-7men9k1lz-magicpens-projects.vercel.app), dpl_9B7rPsmy3dbdSPSiNMVxm7kt86gy, target production của project staging, READY |
| Alias | https://nilaza-admin-staging.vercel.app |
| Bản trước để rollback | dpl_FYFWhXRduxTAQaSEuYdsbEr1CnDY / nilaza-admin-staging-dprr34mcp-magicpens-projects.vercel.app |
| Local CLI/runtime | Vercel 59.20.0 / Node 24.19.0; remote build log ghi Vercel 61.1.0 |
| Source provenance | HEAD 691ab75f59b829dbd19de77e3a8ffb109a4d4941 cộng working tree đã review; không phải release từ clean commit, không tạo commit/push |
| Content seed | Tạo lại từ 6 nguồn canonical đã validate; sourceVersion cf389bd2fae6db15db19296a620e4d93a5533db8c66ede077495508ddaca23da |
| Growth snapshot SHA-256 | f4f85dae0dd111df4add83c703e911fbf3d9baa01bb356b9b2334b5e9e202e7a |
| Content snapshot SHA-256 | b749952c1153387437879c51cc2e5c4a447a6c7773a96354543c149e5216c677 |
| Source manifest SHA-256 | f13e0c2e821389b346ee8c789bfa7174381c99551f84485ec96770595af6df4f — 56 file Admin sau loại env, .vercel và tài liệu nội bộ; Vercel bỏ thêm .gitignore và nhận root ignore file |

Promote lần này tạo deployment target production mới. Đã kiểm tra lại stable alias sau promote, không suy ra alias parity chỉ từ kết quả preview.

## Chuẩn bị và thay đổi trong lượt deploy

- Preflight record: `docs/feature-plans/growth-deploy-email-audit-2026-10-01.json`.
- Refresh `apps/admin/generated/content-seed.json` do nguồn canonical hiện tại khác seed cũ; không sửa nguồn tarot/persona và không publish dữ liệu Supabase.
- Thêm `apps/admin/.vercelignore`: loại env, .vercel, AGENTS.md và README.md. Bản cũ phục vụ hai tài liệu nội bộ với HTTP 200; preview và stable mới trả 404.
- Project có rootDirectory `apps/admin`; deploy trực tiếp từ thư mục này bị lỗi đường dẫn lặp. Tạo gói chỉ chứa Admin tại temp root, đặt Admin dưới `apps/admin`, giữ project link ở temp root. Không upload toàn repository hoặc credential.
- Dry run xác nhận 56 file, khoảng 1,49 MB, framework Other. Gói tạm: `C:\Users\Admin\AppData\Local\Temp\nilaza-admin-growth-deploy-20261001-a1`.

## Kiểm tra đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| Feature preflight | PASS trước cập nhật/generator; sẽ giữ record final với trạng thái nghiệm thu bên dưới |
| admin:test | 78/78 PASS |
| validate:data | PASS: 7 decks, 78 cards, không lỗi safety/mojibake/ASCII VI |
| admin:check sau regenerate | PASS: Content seed, Growth snapshot, owner guide và 3 workspace/27 capability |
| Preview artifact parity | 15 file khớp SHA-256 local: JS/model/guard/config contract, 2 snapshot và 2 font |
| Preview hosted config | 5 HTML cùng trỏ đúng Supabase staging, chỉ publishable/anon key |
| Preview exclusions | AGENTS.md, README.md và .env.local đều HTTP 404 |
| Protected Growth RPC | Request chưa đăng nhập tới get_growth_waitlist_overview bị từ chối HTTP 401; không đọc PII hoặc thay đổi DB |
| Stable alias sau promote | Vercel READY; 5 file trọng yếu khớp local, đúng backend, 3 exclusion đều 404 |
| Browser signed-in happy paths/layout | **Chưa xác minh trong lượt này**: browser liên tục mất debugger/kết nối rồi kernel reset; không dùng HTTP thay làm bằng chứng UI |

Kiểm thử tự động bảo vệ Content Operations và AI Studio vẫn đạt; kiểm tra tương tác thật `#/content/personas`, `#/ai-studio/workflow` và tám route Growth còn cần manager browser smoke. Không có thay đổi auth/RLS/backend trong lượt deploy.

## Manager test path

1. Mở stable URL, refresh trang để nhận bản mới và đăng nhập Owner như thường lệ.
2. Vào Growth: Overview, Product Truth, Content Drafts, Measurement, Roadmap, Waitlist, Campaign Map, Delivery Health.
3. Trong Content Drafts, chọn A11/A12 và VI/EN: nội dung Astrology phản ánh bản integrated internal, giữ các gate cloud/AI/native chưa nghiệm thu.
4. Kiểm tra nguồn repository và live waitlist tách riêng; lỗi live có Retry, dữ liệu synthetic chỉ bật khi chọn rõ; campaign/email vẫn ở trạng thái chưa kích hoạt.
5. Mở Content Operations → Personas và AI Studio → Workflow; kiểm tra data tải và điều hướng bình thường. Không bấm Publish chỉ để thử deploy.

## Rollback và giới hạn

Rollback code bằng deployment trước `dpl_FYFWhXRduxTAQaSEuYdsbEr1CnDY` trong Vercel project này. Bản cũ cũng chứa các tài liệu nội bộ từng truy cập được; cân nhắc giữ exclusion trong bản sửa tiếp theo nếu rollback. Không xóa deployment hiện tại hoặc sửa DB để rollback code.

Giữ nguyên dữ liệu, SMTP/Auth settings, migration ledger, consent và campaign. Generated Growth JSON là cấu hình được lọc có thể truy cập bằng URL static; session guard bảo vệ UI và RPC, không biến file static thành tài nguyên private server. Không có subscriber PII/secret/raw chat/journal trong snapshot.

Đánh giá gửi/nhận email và email tài khoản: [báo cáo Supabase email](SUPABASE_EMAIL_READINESS_2026-10-01.vi.md). Custom SMTP và các cảnh báo bảo mật đang tắt; chưa gửi test email hoặc kích hoạt provider.
