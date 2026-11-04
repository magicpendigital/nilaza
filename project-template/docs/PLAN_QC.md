# Cổng kế hoạch và chất lượng (Plan & QC)

Áp dụng cho mọi việc không tầm thường (nhiều tệp, đổi dữ liệu/hợp đồng API, bảo mật, giao diện người dùng thấy, cấu hình AI). Sửa chính tả thì chỉ cần kế hoạch một dòng và một lệnh kiểm.

## 1. Trước khi sửa
1. Đọc `PLAN.md` và mục liên quan.
2. Xác định **làn**: giao diện, backend/API, dữ liệu/migration, AI/LLM, quản trị, bảo mật/riêng tư, nội dung, phát hành, tài liệu/quy trình.
3. Lập `docs/feature-plans/<tên>.json` từ `_TEMPLATE.json` và chạy `node scripts/check-plan.mjs --record <tệp>`.
4. Có rủi ro cao chưa giải quyết → dừng, hỏi Owner.

## 2. Bản đồ ảnh hưởng (bắt buộc trong hồ sơ)
- **Lối vào:** người dùng/quản trị vào từ đâu, nút Back, trạng thái rỗng.
- **Ghi dữ liệu:** bộ nhớ máy, CSDL, migration, xuất/xóa dữ liệu.
- **Hợp đồng backend:** API, function, nhà cung cấp, hàng đợi, đường dự phòng khi backend lỗi.
- **Trang quản trị:** thấy gì, ghi nhật ký gì, che gì. Ô cấu hình nào cũng phải có nơi dùng thật.
- **Riêng tư/an toàn:** đồng ý, dữ liệu nhạy cảm, rủi ro duyệt cửa hàng, không để khóa ở client.
- **Quan sát:** sự kiện, đếm lỗi, điểm mù.
- **Hoàn tác:** tắt bằng công tắc, tương thích migration, cách người quản lý thử lại.
- **Cố ý không đụng:** màn/dữ liệu liên quan đã xem và để nguyên.

## 3. Trong khi làm
- Giữ đúng phạm vi ghi; phát hiện bề mặt mới thì cập nhật hồ sơ trước.
- Test đi kèm thay đổi; không sửa test để che lỗi.
- Không đổi mã hash/manifest để che sai lệch.

## 4. Kiểm tra chuẩn
| Làn | Lệnh |
|---|---|
| Tất cả | {{typecheck}} · {{test}} · {{lint}} |
| Giao diện | {{build/export}}, xem trên khung điện thoại/trình duyệt, ghi "chưa kiểm trên thiết bị" nếu chưa |
| Backend/API | {{test function}}, kiểm hợp đồng, E2E có đăng nhập trên staging khi đổi endpoint bảo vệ |
| Migration | Chạy thử toàn bộ trên Postgres cục bộ/Docker kèm kiểm phân quyền (RLS) và khôi phục; ghi biên nhận có hạn |
| AI/LLM | Skill `ai-feature-runtime`; chạy bộ câu mẫu, kiểm định dạng, chi phí |
| Quy trình/skill | Kiểm cấu trúc skill, đồng bộ vào thư mục skill của Agent |

## 5. Định nghĩa "xong"
Đúng thiết kế đã duyệt · chạy trên kích thước màn hình phổ biến · có trạng thái tải/rỗng/lỗi · lưu/đọc đúng dữ liệu · prompt AI có phiên bản · luồng nhạy cảm có kiểm soát riêng tư · người quản lý tự thử được đường chính · `PLAN.md` đã cập nhật.

## 6. Mẫu báo cáo cuối việc
**Việc** · **Đã thay đổi** · **Cách Owner thử** · **Đã kiểm** (lệnh + kết quả) · **Chưa kiểm** · **Rủi ro còn lại** · **Việc tiếp theo / cần duyệt**.

## 7. Giao việc cho Agent khác
Brief gồm: mục tiêu, tệp/khu vực, tiêu chí xong đo được, lệnh kiểm phải xanh, dữ liệu được phép, điều kiện dừng. Không giao bí mật, dữ liệu người dùng, thao tác ra ngoài, SQL/deploy. Kết quả về nhánh riêng: xem diff và chạy test trước khi gộp. Dùng một engine khác làm **người chấm độc lập** cho việc cần ý kiến thứ hai.
