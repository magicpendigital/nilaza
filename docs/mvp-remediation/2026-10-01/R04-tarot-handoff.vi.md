# R04 — Tarot: bàn giao phần sửa luồng và bố cục

Ngày: 2026-10-01. Trạng thái: đã triển khai và kiểm tra trình duyệt; chưa nghiệm thu native hoặc toàn bộ R04.

Theo kế hoạch `docs/feature-plans/mvp-R04-tarot-flow-2026-10-01.json`, root là người duy nhất tích hợp `App.tsx`. Giữ các sửa đổi có sẵn của chủ dự án.

Đã đổi:

- Đưa tên, mô tả ngắn và bậc truy cập lên trước tranh. Khung tranh tỷ lệ 3:2, ảnh contain, không dùng chiều cao nội tại 640 px để đẩy nội dung xuống.
- Đi từ một bộ bài đã chọn qua ý định tùy chọn và kiểu trải bài; không bắt chọn lại bộ bài. Lối một lá cũng đi qua ý định.
- “Vì sao” hiển thị câu hỏi, vị trí, chiều lá và ý nghĩa của đúng lá đã chọn. Đây là giải thích từ dữ liệu phản chiếu, không phải suy nghĩ nội bộ của mô hình.
- Đổi nhãn lưu thành “Lưu trải bài”; lượt mới xoá câu hỏi, kết quả và trạng thái chọn của lượt trước.

Đường kiểm tra của người quản lý: Khám phá → mở bộ bài → Đặt ý định → nhập hoặc bỏ trống → chọn trải bài → rút → Xem thông điệp → mở Vì sao → Lưu trải bài → Nhật ký → quay lại → bắt đầu lượt mới. Thử đổi bộ bài bằng hành động riêng ở bước ý định.

Bằng chứng đã chạy:

- TypeScript mobile đạt sau tích hợp R04/R05/R07 ngày 2026-10-01.
- Đo DOM trên web: tên cả bảy bộ bài nằm ở y=136..176 ở 390×844 và 360×640. Không tràn ngang ở 360. Chưa dùng kết quả này để khẳng định toàn bộ nội dung dài/CTA hoặc cỡ chữ lớn đều trong màn hình đầu.
- Classic Arcana: tên, giá trị ngắn và tranh gốc còn chi tiết ở màn hình đầu. Xem `R04-classic-390.jpg`.
- Lượt giả lập học vẽ: Moon Garden, Four of Cups xuôi; ý định và lá trong Vì sao trùng lượt hiện tại. Xem `R04-why-390.jpg`.
- Đã mở kết quả, lưu, thấy trải bài ở Nhật ký, reset và kiểm tra ý định trống ở lượt mới. Độ bền lưu được kiểm tra riêng ở R07.

Còn phải làm/nghiệm thu: iOS/Android, ảnh từng slot native, cỡ chữ 200%, khả năng tiếp cận CTA, nhãn Write và ghi chú độc lập (R08). Một lượt không có câu hỏi đã nhận tổng hợp tiếng Anh trong UI tiếng Việt; chuyển sang R13, không coi bản sửa bố cục là đã sửa prompt.

Không thay đổi ở lát cắt này: dữ liệu 78 lá, artwork, giới hạn credit, provider, DB, Admin. Rollback chỉ hoàn tác phần bố cục/luồng R04 so với baseline trong record, không hoàn tác các sửa khác trong App.
