# Rà soát skills của Nilaza (04/11/2026)

Phạm vi: 5 skill trong `skills/` + các năng lực của mca (MCP `mca`: `image`, `delegate`, `write_tests`, `write_docs`, `refactor_mechanical`, `second_opinion`, `write_content`, `design_mockup`, `video`, 17 vai trò trong `org.yaml`) và plugin `mca-tools` (`delegate-to-agents`, `generate-asset`, `make-video`, `task-intake`, `write-content`).

## 1. Phát hiện chính

1. **Claude Code chưa dùng được skill của repo.** `npm run skills:sync` chỉ cài vào `~/.codex/skills` (Codex). Claude Code đọc `~/.claude/skills`, nên mọi phiên Claude chỉ biết skill nếu tự mở tệp. → **Đã sửa:** sync cài cho cả hai; kiểm tra đạt, 6 skill hiện trong Claude Code.
2. **`nilaza-plan-qc` lệch thực tế:** chưa biết `PLAN.md`; không nhắc `git fetch` (03/11 thư mục làm việc tụt 84 commit); không có quy tắc "đổi hash thì lời duyệt hết hiệu lực" (vừa gặp ở gói SQL Singapore); lệnh kiểm tra cũ; một mục "Release evidence workflow" dán thêm bị lặp; preflight bị làm *sau* khi sửa ở 2 phiên gần đây mà skill không cảnh báo. → **Đã cập nhật lên 1.6.0.**
3. **Thiếu skill cho phần AI** — nơi tập trung nhiều lỗi nhất 31/10–03/11 (JSON mode, token suy nghĩ, timeout, kiểm định dạng sau router, hàm không bắt đăng nhập). → **Thêm `nilaza-ai-runtime` 1.0.0.**
4. **Chưa có quy tắc dùng mca:** mca giúp tiết kiệm hạn mức và có "người chấm độc lập" chạy engine khác — đúng thứ mà QC tranh Tarot đòi hỏi nhưng trước đây phải để "chờ duyệt". → **Đưa vào mục Delegation của `nilaza-plan-qc`.**

## 2. Quyết định từng skill

| Skill | Quyết định | Lý do |
|---|---|---|
| `nilaza-plan-qc` | **Giữ, viết gọn lại (1.6.0)** | Cổng chính của mọi việc. Thêm: mở/đóng phiên với `PLAN.md`, preflight trước khi sửa, ranh giới duyệt Owner + hash, lệnh kiểm tra hiện hành, dùng mca. Bỏ: đoạn release lặp, hướng dẫn trùng `PLAN_QC_PROTOCOL.md` |
| `nilaza-ai-runtime` | **Mới** | Bản đồ router/prompt/công tắc/hạn mức, 9 quy tắc rút ra từ live QA, lệnh kiểm tra AI |
| `nilaza-brand-experience` | Giữ nguyên | Nguồn và lệnh kiểm vẫn đúng |
| `nilaza-tarot-deck-production` | Giữ, ít dùng | Chỉ cần khi làm bộ bài mới; cổng `tarot-deck-quality-gate.mjs` vẫn đọc nó |
| `nilaza-tarot-content-qc`, `nilaza-tarot-art-qc` | Giữ | Bắt buộc trong cổng bộ bài; có thể gộp sau, nhưng script ghi sổ duyệt đang dựa vào hai vai riêng nên chưa gộp |

**Không xóa skill nào:** cả 5 vẫn có đường dùng thật; phần lỗi thời nằm *bên trong* `nilaza-plan-qc` và đã được cắt.

## 3. mca trong quy trình Nilaza

| Việc | Dùng | Ghi chú |
|---|---|---|
| Ý kiến độc lập về thiết kế, bảo mật, chất lượng câu trả lời AI | `second_opinion` hoặc vai `quality.evaluator` | Engine khác người làm → ý kiến thứ hai thật |
| QC tranh Tarot cần người duyệt độc lập | `quality.evaluator` | Vẫn ghi bằng chứng vào sổ duyệt của bộ bài |
| Viết test hàng loạt, refactor lặp lại | `write_tests`, `refactor_mechanical` | Kết quả ở nhánh `mca/ext/<id>`: xem diff, chạy test rồi mới gộp |
| Ảnh, icon, minh họa | `image` / `generate-asset` | Ảnh Tarot vẫn qua `nilaza-tarot-art-qc` |
| Phác bố cục nhanh | `design_mockup` | Thiết kế chính thức vẫn ở canvas Admin/app |
| Mô tả cửa hàng, bài mạng xã hội, video ngắn | `write_content`, vai marketing, `video` | Đăng bài luôn do Owner |

Không giao cho mca: bí mật, `.env`, dữ liệu người dùng, thao tác ra ngoài (đăng bài, trả tiền, nhắn khách), SQL/deploy.

## 4. Đã kiểm

`npm run skills:validate` (6 skill), `npm run validate:governance`, `npm run skills:sync` + `skills:check` (Codex và Claude Code). Chất lượng nội dung skill được rà bằng đọc, **chưa** chạy bộ đánh giá kích hoạt (trigger eval).
