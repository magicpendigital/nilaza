# Nilaza — hiện trạng và bàn giao cho Agent mới (cập nhật 26/10/2026)

Tài liệu này là **điểm vào duy nhất** để một Agent mới (hoặc phiên mới) hiểu dự án đang ở đâu mà không phải bắt đầu lại. Đọc theo thứ tự: `CLAUDE.md` → `AGENTS.md` → tài liệu này → `docs/AGENT_TASK_ROUTER.md` → các tài liệu được chỉ ở mục 9. Nếu có mâu thuẫn, **mã nguồn và kết quả kiểm tra ngày gần nhất thắng tài liệu cũ**; mọi mục dưới đây ghi rõ cái nào *đã kiểm chứng* và cái nào *chưa*.

## 1. Mục tiêu hiện tại

Đưa **bản Android miễn phí lên Google Play** (iOS làm sau khi Android thành công). Chủ dự án (Owner) là người không chuyên kỹ thuật, giao tiếp **tiếng Việt**, giữ mọi tài khoản, khóa và quyền duyệt phát hành. Agent chuẩn bị, kiểm thử và hướng dẫn; **không** tự làm các việc ở mục 7.

## 2. Quyết định của Owner (23/10/2026) — không hỏi lại

| # | Quyết định |
|---|---|
| 1 | Tài khoản Google Play **cá nhân, tạo sau 13/11/2023** ⇒ closed test bắt buộc: ≥12 người thử liên tục ≥14 ngày trước khi xin production |
| 2 | Bản đầu **miễn phí**, chưa bán Premium |
| 3 | AI qua **OpenRouter**; model do Owner cấu hình trong trang Admin; khóa chỉ ở backend |
| 4 | **Council và Astrology AI nằm trong bản Play đầu** (có công tắc tắt trong Admin nếu chưa đạt chất lượng/an toàn) |
| 5 | **18+**; khi chưa đăng nhập xem được nội dung tĩnh; tính năng chạy model AI yêu cầu đăng nhập |
| 6 | Tắt Android Auto Backup (đã làm) |
| 7 | Chuyển sang **repo mới sạch** (phương án B) — đã hoàn tất |
| 8 | Owner sẽ tự tuyển ≥12 người thử (nên 15–20) |

Quyết định trước đó vẫn hiệu lực: Supabase **Singapore** (`etfajmrwyywokgafzxsb`, tổ chức Nilaza Free `drxbmvimiekeoeesgssp`) là backend chính dự kiến; ngân sách AI QA **5 USD/ngày, 50 USD/14 ngày**; hạn mức người dùng: Chat+Oracle dùng chung 5 lượt/ngày, Tarot 1 lá/ngày (Astrology AI và Council **đề xuất** 1 lượt/ngày mỗi loại, chưa duyệt); ngày tính theo UTC+7.

## 3. Repository, thư mục và tài khoản

| Mục | Giá trị |
|---|---|
| **Repo phát triển** | `github.com/magicpendigital/nilaza` (private, nhánh `main`, nguồn sạch ~280 MB). Bản clone làm việc: `D:\nilaza_clean_staging\repo` |
| Repo lưu trữ | `github.com/magicpendigital/nilaza-legacy` (private; lịch sử cũ, 29 nhánh, 21 PR mở của nhánh tự sinh). **Không phát triển ở đó.** Chứa các hồ sơ trình duyệt QA trong lịch sử — Owner nên thu hồi phiên các tài khoản liên quan |
| Thư mục cũ | `D:\nilaza` (remote đã trỏ `nilaza-legacy`, nhiều thay đổi chưa commit, nhiều rác). **Đừng sửa ở đó.** Tạm giữ vì còn chứa công cụ Android/Gradle và bản sao PGlite (xem mục 6) |
| Bản sao lưu | `D:\nilaza_backup_2026-10-23\workspace` (28.444 tệp, đã kiểm hash mẫu) |
| Vercel | Project `nilaza-admin-staging`, team `magicpens-projects`, gắn repo `nilaza`, Root Directory `apps/admin`, Node 24.x, Production branch `main` |
| EAS (Expo) | Tài khoản `magicpen`, project id `8a6197d1-feaa-488b-90a3-12bb177ee005`; **cả 3 môi trường `production`, `preview`, `development` chưa có biến nào** |
| Supabase | Connector tùy chỉnh trỏ đúng project Singapore, chỉ đọc (do Owner thêm trong Claude → Connectors; vai trò DB `supabase_read_only_user`, đã dùng được ngày 26/10). Project Singapore là gói Free: **tự tạm dừng khi lâu không dùng** — lỗi "Database is possibly not accessible" nghĩa là cần Owner bấm khôi phục. Project **QA cũ** `akgrokwnkfqnfjqrildi` (tổ chức khác) vẫn được app và Admin staging trỏ tới |
| Google Play | Chưa tạo ứng dụng; tài khoản/xác minh là việc của Owner |

## 4. Tiến độ theo giai đoạn

| GĐ | Nội dung | Trạng thái |
|---|---|---|
| **0** | Chốt nguồn, sao lưu, repo sạch, nối Vercel, CI online | **Xong** (xem `docs/release/repo-migration-2026-10-23/`) |
| **1** | Làm sạch Android release: gỡ quyền thừa, thêm `POST_NOTIFICATIONS`, tắt backup, gỡ activity xem trước | **Xong và đã merge** (PR #2). Đã kiểm manifest *đã gộp* của bản release bằng Gradle; **chưa** dựng AAB |
| **2** | Gói backend Singapore: SQL, xóa tài khoản, kế hoạch chặn chi phí AI, kế hoạch Auth/SMTP | **Đã soạn, kiểm thử cục bộ và merge vào `main` (PR #3); chưa áp/deploy gì.** Bậc 1 (đọc lại Singapore) xong 26/10; **Owner đã duyệt 2a ngày 26/10** (chốt gói + đích); chờ 2b rồi 2c (xem mục 8) |
| **3** | UI/UX Gói A (FAB Oracle, chế độ khách, xác nhận 18+, nút xóa tài khoản, ngày địa phương, ma trận thiết bị, báo cáo nội dung AI…) | **Chưa bắt đầu** |
| **4** | QA online + thiết bị (Air1 Ultra, API 33) + AAB đầu tiên | Chưa; chặn bởi GĐ2 và biến EAS |
| **5** | Play Console, Data safety, nội dung cửa hàng | Chưa; Owner làm song song |
| **6–7** | Internal → Closed test (≥14 ngày) → Production | Chưa |

## 5. Bằng chứng kiểm chứng đã có (và giới hạn)

- **CI GitHub Actions (Linux, Node 24.19.0):** Mobile quality ✔ (24/10 và trên `main` 25/10), Admin quality ✔ (24/10), Feature governance ✔ (trên PR thử). Mobile: **327/327 test, 53 suites**, tsc, xuất bundle web và Android nhúng ✔.
- **Local (Windows):** Deno 41/41 (13 test mới của `account-delete` + 28 của guard/worker); replay **31/31 migration** trên PostgreSQL 17.5 (PGlite) + 10/10 kiểm tra SQL xóa tài khoản kèm đối chứng âm (xem `docs/release/singapore-backend-readiness-2026-10-25/`).
- **Chưa kiểm chứng:** AAB thật (chữ ký, kích thước, căn chỉnh 16 KB); hành vi trên Supabase thật (`auth.admin.deleteUser`, JWT, vai trò, extension gói Free, tranh chấp nhiều kết nối); hộp thoại quyền thông báo trên Android 13; chất lượng AI online (chưa chạy đánh giá R21); Docker/replay native bản 31 migration; đăng nhập Admin trên bản Vercel mới; vùng/trạng thái project Singapore qua connector (không có công cụ đọc metadata).
- **Singapore đọc lại 26/10 (chỉ đọc):** Postgres 17.11; 0 bảng public, 0 migration, 0 Edge Function, 0 bucket, 0 người dùng Auth; đủ 3 vai trò; `vector`/`pgcrypto`/`pg_cron`/`pg_net` có sẵn; `postgres` có quyền cấp SELECT trên `auth.users` (rủi ro R1 thấp). Hash gói tính lại từ Git khớp `packet-manifest.json`. Biên nhận: `docs/release/singapore-backend-readiness-2026-10-25/readback-2026-10-26.json`.

## 6. Môi trường máy này — những điều dễ vấp

- **Xuống dòng (Windows `core.autocrlf=true`):** cảnh báo "LF will be replaced by CRLF" là bình thường. `skills/manifest.json` ghim hash **byte gốc** nên `.gitattributes` đặt `skills/** -text` — **đừng bỏ**. Hash gói SQL tính trên nội dung **đã chuẩn hóa LF** (trùng blob Git); đừng đối chiếu bằng `sha256sum` trên bản checkout Windows.
- **Deno không cài sẵn:** dùng `npx --yes deno@2 test <đường dẫn>`. **Supabase CLI** chưa cài (có thể dùng `npx supabase`, chưa thử). **Docker** không chạy.
- **PGlite** cho replay SQL: `node scripts/singapore-packet-replay.mjs --pglite D:/nilaza/.brand-work/singapore-migration-rehearsal-2026-10-05 --receipt out.json --manifest out2.json` (thư mục này nằm ở `D:\nilaza`; **đừng xóa** cho tới khi chép sang chỗ khác). Dùng đường dẫn dạng `D:/...` cho Node, không dùng `/d/...`.
- **Android local:** SDK ở `D:\nilaza\.brand-work\android-sdk`, Gradle user home `D:\nilaza\.brand-work\gradle`, JDK 17 `C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot`. Dựng manifest bản release: `gradlew :app:processReleaseMainManifest -PreactNativeArchitectures=arm64-v8a --offline` (chạy cả release + debug cùng lúc từng lỗi; chạy riêng release thì được). `debug.keystore` cố ý không có trong repo mới; build thật dùng khóa của EAS.
- **Junction `node_modules`:** đừng `rm -rf` thư mục chứa junction trong Git Bash.
- **Mỗi push lên `main` tự deploy Admin staging (Production)** trên Vercel. PR nên đẩy lên đúng tên nhánh **`codex/android-release-unblock-2026-10-19`** (Vercel bỏ qua build nhánh này); nhánh remote bị xóa sau mỗi PR, tạo lại khi cần.
- **Feature Preflight:** PR sửa đường dẫn tính năng (gồm mọi thứ trong `docs/`, `scripts/`, `supabase/`, `apps/`, `.github/`) phải kèm một hồ sơ `docs/feature-plans/<tên>.json` được thêm/sửa trong **chính PR**, có `writeScope` bao phủ, `sourceReview` ghim SHA-256 hiện tại (chuẩn hóa CRLF→LF với tệp văn bản) và danh sách `workingTreeReview.paths` cho các tệp đang sửa. Mẫu: `docs/feature-plans/android-release-hygiene-2026-10-25.json`. Kiểm cục bộ: `npm run feature:preflight -- --record <tệp>` và `node scripts/feature-preflight.mjs --ci --base origin/main`.
- Commit/PR kết thúc bằng dòng attribution đã quy định của phiên (xem nhắc nhở hệ thống).

## 7. Việc Agent KHÔNG được tự làm (cần Owner duyệt từng lần)

Chạy SQL hoặc `db push/repair` trên bất kỳ project Supabase; deploy Edge Function; đặt/đọc/xoay bí mật (khóa OpenRouter, service role, SMTP, EAS biến, khóa ký); đổi cài đặt Auth/SMTP/Vercel/GitHub/Play; tạo hoặc xóa tài khoản; phát hành lên cửa hàng; xóa dữ liệu của Owner. Agent không nhập mật khẩu/khóa thay Owner. Sổ cái migration của project QA cũ ở trạng thái `blocked_pending_reconciliation` và `release-profile.json.targets` rỗng — **giữ nguyên** cho tới khi Owner duyệt gói SQL.

## 8. Việc đang chờ / bước tiếp theo đề xuất (theo thứ tự)

1. ~~Đọc lại project Singapore (chỉ đọc)~~ — **xong 26/10**, vẫn trống, không đổi so với trước.
2. **Owner duyệt gói SQL** theo `docs/release/singapore-backend-readiness-2026-10-25/05_STEP2_APPROVAL_FORM.vi.md`, tách 3 lần: **2a** chốt `migrationSetSha256` + đích (**đã duyệt 26/10**, bản ghi trong phiếu) → **2b** (tiếp theo) PR riêng thêm Singapore vào `release-profile.json` + sổ cái riêng → **2c** thực thi (khuyến nghị Supabase CLI, Owner nhập mật khẩu DB; đọc lại project ngay trước khi chạy). Tính lại hash trước 2c; hash khác thì duyệt lại.
3. Deploy `account-delete`; làm **lát cắt mobile** (đường dẫn `/account/delete`, nút "Xóa tài khoản", xác nhận, dọn dữ liệu cục bộ) và **trang web xóa tài khoản** (URL cho Play) — cần hộp thư hỗ trợ (đề xuất Cloudflare Email Routing).
4. **Auth/SMTP** theo `04_AUTH_SMTP_PLAN.vi.md` (Owner đăng nhập từng dịch vụ).
5. **Chặn chi phí AI** theo `03_AI_COST_GUARD_PLAN.vi.md`: S1–S3 trước khi đặt khóa OpenRouter; ra mắt thử **không có khóa** là an toàn.
6. **UI/UX Gói A** (mục 4 của báo cáo ngày 23/10), chế độ khách, xác nhận 18+, ẩn nút đăng nhập mạng xã hội chưa hoạt động, ngày địa phương.
7. Owner gắn 3 biến `EXPO_PUBLIC_*` vào EAS production (hướng dẫn đã đưa) rồi dựng AAB đầu tiên; kiểm chữ ký, kích thước, 16 KB, danh sách quyền (`bundletool`).
8. **Owner:** thu hồi phiên các tài khoản trong Chrome profile QA; chọn nơi lưu PNG gốc Tarot (1,37 GB) rồi dọn dữ liệu cũ theo `docs/release/repo-migration-2026-10-23/STALE_DATA_REPORT.vi.md`; Play Console; tuyển ≥12 người thử.

## 9. Tài liệu cần đọc, theo chủ đề

| Chủ đề | Tệp |
|---|---|
| Kế hoạch tổng thể lên Google Play, đánh giá UI/UX, quyết định Owner | `docs/release/GOOGLE_PLAY_ROADMAP_AND_UX_REVIEW_2026-10-23.vi.md` |
| Chuyển repo, Vercel, CI, bài học | `docs/release/repo-migration-2026-10-23/MIGRATION_STATUS.vi.md`, `STALE_DATA_REPORT.vi.md` |
| Làm sạch Android + cấu hình EAS/AAB | `docs/release/android-release-hygiene-2026-10-25/ANDROID_HYGIENE_REPORT.vi.md` |
| Gói backend Singapore (A–D) | `docs/release/singapore-backend-readiness-2026-10-25/README.vi.md` và `01`–`04` |
| Quy trình, an toàn, định tuyến | `AGENTS.md`, `docs/AGENT_TASK_ROUTER.md`, `docs/PLAN_QC_PROTOCOL.md`, `docs/release/RELEASE_RUNBOOK.md` |
| Sản phẩm, thiết kế, thương hiệu | `docs/FEATURE_PRD.md`, `DESIGN.md`, `docs/BRAND_GUIDELINES.md` |
| Chi phí AI đã duyệt | `docs/mvp-remediation/2026-10-02/R10-quota-reservation.vi.md`, `packages/agent-config/ai-usage-policy.json` |
| Khóa, khôi phục, sao lưu (đã mã hóa lên Drive, đã thử khôi phục 18/10) | `docs/release/ANDROID_KEY_BACKUP_2026-10-18.vi.md`, `RECOVERY_KEY_BACKUP_2026-10-18.vi.md`, `BACKEND_API_KEY_BACKUP_2026-10-18.vi.md` |
| Đánh giá UX/Tarot/Astrology trước đây | `docs/reviews/2026-09-30/`, `docs/UX_CONTENT_DEPTH_REVIEW_2026-10-14.vi.md` |

## 10. Cách báo cáo với Owner

Tiếng Việt, ngôn ngữ sản phẩm, ngắn gọn; nêu rõ **đã kiểm chứng / chưa kiểm chứng**, mỗi lần xin duyệt chỉ **một** quyết định cụ thể (đối tượng, hash/đích, rủi ro, cách hoàn tác); không ghi bí mật vào chat hoặc repo; không suy một kết quả thành phê duyệt phát hành.
