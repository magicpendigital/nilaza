# Nilaza — hướng dẫn cho Agent (Claude Code)

**Bắt đầu ở đây:** `git fetch` và làm trên `origin/main` mới nhất → [`PLAN.md`](PLAN.md) (đang ở đâu, còn gì, chờ ai) → chỉ khi cần: [`docs/HANDOFF_CURRENT_STATE.vi.md`](docs/HANDOFF_CURRENT_STATE.vi.md) (quyết định, bẫy môi trường, việc cấm tự làm), `AGENTS.md`, `docs/AGENT_TASK_ROUTER.md`, `docs/PLAN_QC_PROTOCOL.md`. Không quét toàn repo khi chưa cần.
- **Skills:** dùng `nilaza-plan-qc` cho mọi việc không tầm thường, thêm `nilaza-ai-runtime` cho tính năng AI; bộ Tarot/brand khi đúng việc (xem `docs/SKILLS_REVIEW_2026-11-04.vi.md`). Sửa skill thì sửa ở `skills/`, cập nhật `skills/manifest.json`, chạy `npm run skills:validate` rồi `npm run skills:sync`.
- **Cuối mỗi PR/phiên: cập nhật `PLAN.md`** (và `docs/backlog/review-2026-10-30.json` nếu đóng một mục rà soát) trong cùng PR.

- Owner không chuyên kỹ thuật và dùng **tiếng Việt**: trả lời bằng tiếng Việt, ngôn ngữ sản phẩm, nêu rõ cái gì *đã kiểm chứng* và cái gì *chưa*.
- Mục tiêu hiện tại: **Android lên Google Play** (iOS làm sau). Repo phát triển là `github.com/magicpendigital/nilaza`; **không** phát triển ở `nilaza-legacy` hay `D:\nilaza`.
- **Cần Owner duyệt từng lần:** chạy SQL/migration, deploy Edge Function, đặt hay đọc bí mật, đổi cài đặt Supabase/Vercel/GitHub/EAS/Play, tạo hay xóa tài khoản, phát hành. Không nhập mật khẩu hay khóa thay Owner; không đọc `.env` hay giá trị khóa.
- Mọi thay đổi không tầm thường: lập hồ sơ `docs/feature-plans/<tên>.json` và chạy `npm run feature:preflight` **trước** khi sửa (xem mục 6 của tài liệu hiện trạng).
- **Nhánh và Vercel (đã kiểm chứng 12/11/2026 qua lịch sử PR + deployment):**
  - `main` là **nguồn duy nhất của toàn bộ repo** (app, backend, Admin, docs). Dữ liệu app **không** được để lâu ở nhánh riêng: PR #2–#31 đều gộp vào `main`.
  - Vercel (`nilaza-admin-staging`, Root `apps/admin`) chỉ phục vụ **trang quản trị**. Mọi commit trên `main` vẫn tạo một deploy Production Admin (kể cả khi chỉ đổi code app) — vô hại nhưng tốn build.
  - Nhánh tên `codex/android-release-unblock-2026-10-19` chỉ là **tên nhánh PR để Vercel bỏ qua build** (Ignored Build Step; deployment hiện CANCELED). Nó không phải nơi lưu dữ liệu app. Nhánh bị xóa sau mỗi PR; tạo lại từ `origin/main` khi cần.
  - Làm việc: nhánh làm việc → PR vào `main` theo **lô nhỏ**, không gom hàng chục commit vào một PR kéo dài (PR #31 từng gom 53 commit). Không merge nếu Owner chưa bảo.
  - Không đổi quy tắc Vercel (Ignored Build Step, Root Directory) khi chưa có Owner duyệt.
- Giữ `.gitattributes` (`skills/** -text`); không đổi hash trong `skills/manifest.json` để che lỗi.
