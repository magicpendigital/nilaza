# R05 — Shared controls và Reduce Motion

Ngày: 2026-10-01. Trạng thái: đã triển khai lát cắt A2UI; chưa nghiệm thu khả năng tiếp cận toàn ứng dụng.

Theo `docs/feature-plans/mvp-R05-a2ui-accessibility-2026-10-01.json`, dùng component hiện có và token chung. Không thêm thư viện.

Đã đổi: token vùng chạm tối thiểu 48; các nút/tab/chip dùng token, trạng thái selected/disabled có nhãn accessibility; điều khiển tháng/năm có nhãn song ngữ. Lưới lịch giữ bảy cột tại màn hình hẹp. Tracking tiêu đề dùng 0 để giữ dấu tiếng Việt. Hook Reduce Motion khởi đầu tĩnh, nghe thay đổi hệ điều hành, chống promise trả về muộn ghi đè sự kiện mới và gỡ listener. Fade/đèn chờ chat dừng animation khi bật Reduce Motion.

Kiểm tra: TypeScript đạt; 29/29 ca A2UI đạt, gồm race sự kiện/promise Reduce Motion và trạng thái điều khiển. Đây là test hành vi, chưa phải bằng chứng VoiceOver/TalkBack.

Đường nghiệm thu: mở lịch, đổi tháng/năm/ngày; chọn chip và tab; mở chat đang chờ rồi bật Reduce Motion; tăng cỡ chữ 200%; dùng VoiceOver và TalkBack trên máy thật. Lặp trên 360×640 và 390×844.

Chưa đạt toàn bộ R05: ô ngày ở lịch hẹp có chiều rộng dưới 48 dù chiều cao đạt 48; các điều khiển riêng trong App chưa được rà hết; font scale, focus, contrast và đọc màn hình native chưa có bằng chứng. Không công bố đã đạt accessibility toàn app.

Rollback: hoàn tác đúng hook và các component/token thuộc lát cắt này; giữ layout/flow và dữ liệu của R04/R07. Hướng dẫn skill hiện có còn phù hợp; chưa phát sinh hướng dẫn thiết kế mới cần sửa skill.
