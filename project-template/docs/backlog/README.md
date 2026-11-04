# Backlog rà soát

Mỗi đợt rà soát (UI/UX, bảo mật, AI…) lưu thành một tệp `review-YYYY-MM-DD.json` theo dạng `review-TEMPLATE.json`. **Không để kết quả rà soát chỉ trong chat** — phiên sau sẽ không thấy.

- `id`: mã ngắn theo khu vực (`APP-01`, `ADM-03`, `AI-07`), giữ cố định để PR và `PLAN.md` trích dẫn.
- `severity`: `crit` (chặn phát hành), `warn` (nên sửa), `ok` (nhỏ).
- `status`: `open` · `partial` · `done`; khi đổi, ghi `pr` và `note` (đã kiểm gì).
- `PLAN.md` chỉ tóm tắt số lượng và mục mở quan trọng; chi tiết ở đây.
