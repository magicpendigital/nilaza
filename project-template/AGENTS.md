# {{TÊN DỰ ÁN}} — hướng dẫn cho AI Agent

## Bắt đầu mỗi phiên
1. `git fetch` và làm trên `origin/main` mới nhất (hoặc nhánh Owner chỉ định).
2. Đọc [`PLAN.md`](PLAN.md): đang ở đâu, còn gì, chờ ai. Chỉ mở thêm tài liệu mà mục liên quan trỏ tới.
3. Khi cần: [`docs/HANDOFF.md`](docs/HANDOFF.md) (quyết định, môi trường, việc cấm tự làm), [`docs/PLAN_QC.md`](docs/PLAN_QC.md) (cổng chất lượng). Không quét toàn repo khi chưa cần.

## Kết thúc mỗi PR / phiên
- Cập nhật `PLAN.md` trong **cùng PR** (trạng thái, số PR, ngày). Đóng mục rà soát nào thì sửa `status` của nó trong `docs/backlog/`.
- Báo cáo theo mẫu ở `docs/PLAN_QC.md` mục 6: đã làm, đã kiểm, **chưa kiểm**, rủi ro, việc tiếp theo.

## Người dùng và ngôn ngữ
- Owner: {{vai trò, mức kỹ thuật}}. Trả lời bằng {{ngôn ngữ}}, ngôn ngữ sản phẩm, ngắn gọn.
- Mỗi lần xin duyệt chỉ **một** quyết định, theo mẫu `docs/APPROVALS.md`.

## Việc cần Owner duyệt từng lần (không tự làm)
Chạy SQL/migration trên môi trường thật; deploy backend/function; đặt, đọc hay xoay bí mật; đổi cài đặt dịch vụ ({{danh sách dịch vụ}}); tạo hoặc xóa tài khoản; phát hành lên cửa hàng/production; xóa dữ liệu. Không nhập mật khẩu hay khóa thay Owner; không đọc `.env` hay giá trị khóa. Lời duyệt gắn với đích và mã hash cụ thể — đổi gói thì xin lại.

## Cách làm việc
- Việc không tầm thường: lập `docs/feature-plans/<tên>.json` từ `_TEMPLATE.json` **trước khi sửa** (skill `plan-qc`).
- Lát cắt dọc nhỏ; mỗi PR một mục đích; nêu rõ đã kiểm/chưa kiểm.
- {{Quy tắc nhánh/deploy, ví dụ: push vào main tự deploy staging; PR mở từ nhánh X; không merge khi Owner chưa bảo.}}
- Lệnh kiểm tra chuẩn: {{typecheck}}, {{test}}, {{lint}}, {{build}}.

## Sản phẩm
- Mục tiêu hiện tại: {{mục tiêu}}. Stack: {{stack}}.
- Ràng buộc không được vi phạm: {{bảo mật, quyền riêng tư, pháp lý, an toàn nội dung}}.
- Không bao giờ để khóa API của nhà cung cấp trong ứng dụng phía client.
