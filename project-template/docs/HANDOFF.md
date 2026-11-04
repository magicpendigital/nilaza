# Bàn giao: quyết định, môi trường và giới hạn

Tài liệu nền, ít thay đổi. Tiến độ hằng ngày nằm ở `PLAN.md`; khi khác nhau, `PLAN.md` và mã nguồn thắng.

## 1. Mục tiêu và phạm vi
{{Sản phẩm là gì, cho ai, mục tiêu giai đoạn này, những gì để sau.}}

## 2. Quyết định của Owner (không hỏi lại)
| Ngày | Quyết định | Ghi chú |
|---|---|---|
| {{YYYY-MM-DD}} | {{quyết định}} | {{phạm vi, ràng buộc}} |

## 3. Repository, môi trường, tài khoản
| Mục | Giá trị |
|---|---|
| Repo chính | {{url, nhánh mặc định}} |
| Thư mục làm việc | {{đường dẫn}} |
| Môi trường staging | {{dịch vụ, id project, cách deploy}} |
| Môi trường production | {{…}} |
| Ai giữ khóa và quyền phát hành | Owner. Bản sao lưu khóa: {{nơi lưu đã mã hóa}} |

Tự deploy khi nào: {{ví dụ: mỗi push vào main deploy trang quản trị staging}}.

## 4. Bằng chứng đã có và giới hạn
- Đã kiểm: {{CI, test, chạy thử}} — ngày, commit.
- Chưa kiểm: {{thiết bị thật, cloud thật, tải}}.

## 5. Bẫy môi trường
- {{Ví dụ: xuống dòng CRLF trên Windows; công cụ chưa cài; dịch vụ gói miễn phí tự tạm dừng.}}

## 6. Việc Agent KHÔNG được tự làm
Xem `AGENTS.md` mục "Việc cần Owner duyệt". Bổ sung riêng của dự án: {{…}}

## 7. Cách báo cáo với Owner
Ngôn ngữ của Owner, ngôn ngữ sản phẩm, ngắn; tách đã kiểm/chưa kiểm; mỗi lần xin duyệt một quyết định; không ghi bí mật vào chat hay repo.
