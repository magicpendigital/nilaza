# Nilaza — hướng dẫn cho Agent (Claude Code)

**Bắt đầu ở đây:** `git fetch` và làm trên `origin/main` mới nhất → [`PLAN.md`](PLAN.md) (đang ở đâu, còn gì, chờ ai) → chỉ khi cần: [`docs/HANDOFF_CURRENT_STATE.vi.md`](docs/HANDOFF_CURRENT_STATE.vi.md) (quyết định, bẫy môi trường, việc cấm tự làm), `AGENTS.md`, `docs/AGENT_TASK_ROUTER.md`, `docs/PLAN_QC_PROTOCOL.md`. Không quét toàn repo khi chưa cần.
- **Skills:** dùng `nilaza-plan-qc` cho mọi việc không tầm thường, thêm `nilaza-ai-runtime` cho tính năng AI; bộ Tarot/brand khi đúng việc (xem `docs/SKILLS_REVIEW_2026-11-04.vi.md`). Sửa skill thì sửa ở `skills/`, cập nhật `skills/manifest.json`, chạy `npm run skills:validate` rồi `npm run skills:sync`.
- **Cuối mỗi PR/phiên: cập nhật `PLAN.md`** (và `docs/backlog/review-2026-10-30.json` nếu đóng một mục rà soát) trong cùng PR.

- Owner không chuyên kỹ thuật và dùng **tiếng Việt**: trả lời bằng tiếng Việt, ngôn ngữ sản phẩm, nêu rõ cái gì *đã kiểm chứng* và cái gì *chưa*.
- Mục tiêu hiện tại: **Android lên Google Play** (iOS làm sau). Repo phát triển là `github.com/magicpendigital/nilaza`; **không** phát triển ở `nilaza-legacy` hay `D:\nilaza`.
- **Cần Owner duyệt từng lần:** chạy SQL/migration, deploy Edge Function, đặt hay đọc bí mật, đổi cài đặt Supabase/Vercel/GitHub/EAS/Play, tạo hay xóa tài khoản, phát hành. Không nhập mật khẩu hay khóa thay Owner; không đọc `.env` hay giá trị khóa.
- Mọi thay đổi không tầm thường: lập hồ sơ `docs/feature-plans/<tên>.json` và chạy `npm run feature:preflight` **trước** khi sửa (xem mục 6 của tài liệu hiện trạng).
- **Mỗi push lên `main` tự deploy Admin staging.** Khi báo cáo xin duyệt giao việc, nhắc Owner điều này.
- **Giao việc luôn về nhánh chính `main` (Owner quyết 15/11/2026):** `main` là bản duy nhất đáng tin; không để nhiều phiên bản song song khó kiểm soát. Khi xong **một tính năng** (đã chạy kiểm tra, có bàn giao, đã cập nhật `PLAN.md`): ① báo cáo Owner bằng tiếng Việt, nêu *đã kiểm chứng / chưa kiểm chứng*, và **xin duyệt một lần** cho "commit → merge → push vào `main`"; ② khi Owner đồng ý thì làm liền cả ba bước: nhánh ngắn hạn cắt từ `origin/main` mới nhất → PR vào `main` → CI xanh mới merge → xóa nhánh ngắn hạn và worktree tạm, rồi kiểm `main` cục bộ khớp `origin/main`. Chưa được Owner duyệt thì **không** merge hay push; mỗi lần duyệt chỉ áp cho tính năng đó, nhưng sửa lỗi CI trên chính PR đó không cần xin lại. Không đẩy việc dở dang, không giữ nhánh dài hạn hay bản sao `main` riêng. Duyệt này **không** thay cho các việc cần duyệt riêng ở trên (SQL, deploy, bí mật, cài đặt, phát hành).
- **Nhánh và Vercel (đã kiểm chứng 12/11/2026 qua lịch sử PR + deployment):**
  - `main` là **nguồn duy nhất của toàn bộ repo** (app, backend, Admin, docs). Dữ liệu app **không** được để lâu ở nhánh riêng: PR #2–#31 đều gộp vào `main`.
  - Vercel (`nilaza-admin-staging`, Root `apps/admin`) chỉ phục vụ **trang quản trị**. Mọi commit trên `main` vẫn tạo một deploy Production Admin (kể cả khi chỉ đổi code app) — vô hại nhưng tốn build.
  - Nhánh tên `codex/android-release-unblock-2026-10-19` chỉ là **tên nhánh PR để Vercel bỏ qua build** (Ignored Build Step; deployment hiện CANCELED). Nó không phải nơi lưu dữ liệu app. Nhánh bị xóa sau mỗi PR; tạo lại từ `origin/main` khi cần.
  - Làm việc: nhánh làm việc → PR vào `main` theo **lô nhỏ**, không gom hàng chục commit vào một PR kéo dài (PR #31 từng gom 53 commit). Chỉ merge khi Owner đã duyệt cho tính năng đó (xem quy tắc giao việc ở trên).
  - Không đổi quy tắc Vercel (Ignored Build Step, Root Directory) khi chưa có Owner duyệt.
- Giữ `.gitattributes` (`skills/** -text`); không đổi hash trong `skills/manifest.json` để che lỗi.
