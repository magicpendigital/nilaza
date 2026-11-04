# Bộ khởi tạo dự án làm cùng AI Agent (rút từ dự án Nilaza, 11/2026)

Thư mục này là **khung quy trình** để bắt đầu một dự án phần mềm mới do một người chủ dự án (Owner, có thể không chuyên kỹ thuật) điều phối cùng AI Agent (Claude Code, Codex…). Nó không chứa mã sản phẩm; nó giúp mọi phiên làm việc mới **biết ngay dự án đang ở đâu**, làm việc theo một cổng chất lượng thống nhất và **không tự làm những việc cần Owner duyệt**.

## Cách áp dụng cho dự án mới (5 bước)

1. Chép toàn bộ nội dung thư mục này vào gốc repo mới (giữ nguyên cấu trúc).
2. Tìm và thay mọi `{{...}}` (tên dự án, mục tiêu, stack, lệnh kiểm tra). Lệnh nhanh: `grep -rn "{{" .`
3. Điền `PLAN.md` mục 1–2 (mục tiêu, quyết định Owner) và `docs/HANDOFF.md` mục 2–3 (tài khoản, môi trường).
4. Cài skills cho Agent: chép `skills/*` vào `~/.claude/skills/` (Claude Code) và/hoặc `~/.codex/skills/` (Codex). Đổi tên skill nếu muốn có tiền tố dự án.
5. Commit đầu tiên, rồi chạy `node scripts/check-plan.mjs` — nó báo `PLAN.md` quá hạn hay hồ sơ việc thiếu trường.

## Có gì bên trong

| Tệp | Vai trò |
|---|---|
| `AGENTS.md` (+ `CLAUDE.md` nhập lại nó) | Luật cho Agent: thứ tự đọc, ranh giới duyệt, cách báo cáo |
| `PLAN.md` | **Bảng tiến độ sống** — đọc đầu tiên, cập nhật trong mọi PR |
| `docs/HANDOFF.md` | Quyết định đã chốt, tài khoản, bẫy môi trường, việc cấm tự làm |
| `docs/PLAN_QC.md` | Cổng chất lượng: phân làn, bản đồ ảnh hưởng, kiểm tra, định nghĩa "xong" |
| `docs/APPROVALS.md` | Mẫu xin duyệt một quyết định (đích, hash, rủi ro, hoàn tác) và nhật ký duyệt |
| `docs/feature-plans/_TEMPLATE.json` | Hồ sơ cho mỗi việc không tầm thường, lập **trước** khi sửa |
| `docs/backlog/` | Danh sách phát hiện rà soát có mã (APP-01, ADM-01…) và trạng thái |
| `docs/decisions/` | Ghi chép quyết định kiến trúc ngắn (ADR) |
| `skills/` | 3 skill: `plan-qc`, `ai-feature-runtime` (dự án có gọi LLM), `release-approval` |
| `scripts/check-plan.mjs` | Kiểm tra nhẹ, không cần thư viện ngoài |
| `.github/pull_request_template.md` | Checklist PR: đã kiểm / chưa kiểm / đã cập nhật PLAN.md |

## 12 bài học đã đóng vào khung này

1. **Một tệp trạng thái duy nhất (`PLAN.md`)**, cập nhật trong mọi PR. Nhiều tài liệu "hiện trạng" theo ngày sẽ cũ dần và mâu thuẫn nhau.
2. **Đầu phiên luôn `git fetch` và làm trên `main` mới nhất.** Đã có lần thư mục làm việc tụt 84 commit mà không ai biết.
3. **Kết quả rà soát phải nằm trong repo** (`docs/backlog/`), không chỉ trong chat hay thư mục tạm của phiên.
4. **Hồ sơ việc lập trước khi sửa**, có tiêu chí đo được, phạm vi ghi, bề mặt cố ý không đụng, bảo mật, hoàn tác.
5. **Tách rõ "đã kiểm" và "chưa kiểm"** (máy local, CI, staging, điện thoại thật, production) trong mọi báo cáo.
6. **Ranh giới duyệt:** SQL, deploy, bí mật, cài đặt dịch vụ, tài khoản, phát hành — Owner duyệt từng lần, một quyết định mỗi lần. Agent không nhập mật khẩu/khóa thay Owner.
7. **Lời duyệt gắn với mã hash cụ thể**; gói thay đổi thì xin duyệt lại.
8. **Cổng chạy thử trước cloud:** migration chạy thử trên Postgres cục bộ/Docker kèm kiểm phân quyền và khôi phục, biên nhận có hạn dùng.
9. **Mỗi ô cấu hình trong trang quản trị phải có nơi tiêu thụ thật** — nếu không, ẩn đi.
10. **Mọi lệnh gọi LLM cần: đăng nhập, hạn mức, công tắc tắt, thời gian chờ, dự phòng, nhãn "câu dự phòng"** khi AI không trả lời.
11. **Lát cắt dọc nhỏ, mỗi PR một mục đích**, push vào `main` có thể tự deploy — biết rõ điều đó trước khi merge.
12. **Giao việc cho Agent khác cần brief đủ**: mục tiêu, tệp, tiêu chí xong, dữ liệu được phép, điều kiện dừng; không giao bí mật hay thao tác ra ngoài; luôn xem diff trước khi nhận.

Sau khi chép sang dự án mới, có thể xóa tệp README này hoặc giữ làm tài liệu quy trình.
