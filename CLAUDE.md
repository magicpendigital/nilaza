# Nilaza — hướng dẫn cho Agent (Claude Code)

**Bắt đầu ở đây, theo thứ tự:** `AGENTS.md` → [`docs/HANDOFF_CURRENT_STATE.vi.md`](docs/HANDOFF_CURRENT_STATE.vi.md) (hiện trạng, quyết định của Owner, việc đang chờ, bẫy môi trường) → `docs/AGENT_TASK_ROUTER.md` → `docs/PLAN_QC_PROTOCOL.md`. Không quét toàn repo khi chưa cần.

- Owner không chuyên kỹ thuật và dùng **tiếng Việt**: trả lời bằng tiếng Việt, ngôn ngữ sản phẩm, nêu rõ cái gì *đã kiểm chứng* và cái gì *chưa*.
- Mục tiêu hiện tại: **Android lên Google Play** (iOS làm sau). Repo phát triển là `github.com/magicpendigital/nilaza`; **không** phát triển ở `nilaza-legacy` hay `D:\nilaza`.
- **Cần Owner duyệt từng lần:** chạy SQL/migration, deploy Edge Function, đặt hay đọc bí mật, đổi cài đặt Supabase/Vercel/GitHub/EAS/Play, tạo hay xóa tài khoản, phát hành. Không nhập mật khẩu hay khóa thay Owner; không đọc `.env` hay giá trị khóa.
- Mọi thay đổi không tầm thường: lập hồ sơ `docs/feature-plans/<tên>.json` và chạy `npm run feature:preflight` **trước** khi sửa (xem mục 6 của tài liệu hiện trạng).
- **Mỗi push lên `main` tự deploy Admin staging.** PR nên dùng nhánh `codex/android-release-unblock-2026-10-19`; không merge nếu Owner chưa bảo.
- Giữ `.gitattributes` (`skills/** -text`); không đổi hash trong `skills/manifest.json` để che lỗi.
