# 17/11/2026 — APK preview trỏ về Singapore

## Nguyên nhân
Bản APK preview cũ vẫn kết nối máy chủ Supabase QA cũ, nên đăng ký tài khoản mới báo lỗi (máy chủ cũ không còn khớp với dữ liệu và hàm đã chuyển sang Singapore `etfajmrwyywokgafzxsb`).

## Đã làm (Owner duyệt từng bước)
1. Đặt lại 2 biến EAS môi trường `preview` về Singapore: `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_ANON_KEY` (khóa công khai, không phải khóa bí mật); biến thứ ba `EXPO_PUBLIC_NILAZA_API_URL` được kiểm lại.
2. Dựng lại APK preview trên EAS (build `f9ddce10`), tải về và cài lên điện thoại Android đang kết nối bằng `adb`.
3. Chuẩn bị ghi chú khôi phục chỉ gồm thông tin công khai (địa chỉ dự án, tên biến, vị trí cấu hình) ở tệp cục bộ. **Không ghi khóa bí mật.**

## Đã kiểm chứng
- Đăng nhập trên điện thoại thật thành công (Owner xác nhận).
- Đăng ký tài khoản mới chạy bình thường sau khi đổi về Singapore (Owner thử lại và xác nhận).

## Chưa kiểm chứng / chưa làm
- **Chưa tải lên Google Drive** thư mục "Nilaza Recovery - Singapore". 18/11 đã kiểm lại sau khi Owner nối plugin Google Drive: phiên làm việc chỉ thấy một công cụ Drive là xem lịch sử phiên bản tệp (`list_file_revisions`), **không có công cụ tạo/tải tệp lên hay tìm tệp**. Cần Owner tự tải tệp ghi chú cục bộ lên, hoặc bật thêm quyền ghi cho plugin.
- Tài khoản thử tạo khi kiểm tra đăng ký chưa xóa; việc xóa tài khoản cần Owner duyệt riêng.

## Việc tiếp theo
Góp ý Tarot của Owner sau lần thử này xử lý ở [báo cáo 18/11](2026-11-18-tarot-ritual-ux.md).
