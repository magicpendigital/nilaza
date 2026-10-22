# R06 — Ngăn yêu cầu đăng nhập cũ lấn ý định mới

Ngày 2026-10-01. Source/UI tests local đạt; auth/recovery/ownership live và native chưa nghiệm thu.

Plan: `docs/feature-plans/mvp-R06-auth-intent-2026-10-01.json`. Reviewer độc lập đọc AuthFlow và SDK authAttempt, phát hiện signup delay420ms và signin delay360ms có thể đảo thứ tự request khi đổi view sau50ms. Reviewer không tự chạy test, không đọc credentials.

Đã sửa: mỗi intent có generation, đổi view/unmount hủy callback chưa bắt đầu network. Submit có ref khóa ngay, tránh double press trước render. Khi network đang chạy, giữ form/loading hiện hành đến khi request kết thúc; không cho callback cũ trở thành request mới của một form khác. Error/confirmation/finally chỉ cập nhật UI của generation còn hiện hành. Không đổi SDK adoption/session/namespace/RLS.

Checks: **13/13 AuthFlow tests PASS**, gồm 3 ca mới: signupA→50ms→signinB chỉ gọi B; network pending không mở form cạnh tranh/không double submit; unmount không gọi callback chưa vào network. Một lần đầu test sai chữ hoa của welcome label nên fail; đã sửa locator theo label thực rồi tất cả đạt, không sửa assertion để che race.

Manager path: ở account QA signed-out, nhập signup giả lập → bấm submit → đổi Sign In ngay → nhập B; chỉ B được gửi. Sau khi request đã bắt đầu, chờ loading/result/error rồi đổi form. Unit tests dùng emails fixture, không tạo account live.

Còn lại: auth verify/recovery link/OAuth configuration, two-account/two-client isolation, session revoked/callback SDK, toàn bộ onboarding và native cần đúng môi trường R02. UI kiểm thử local không thay việc nghiệm thu các flow này. Rollback chỉ delta AuthFlow; không có dữ liệu/schema cần rollback. Plan-QC/Brand skills verified-current, không đổi hướng thiết kế.
