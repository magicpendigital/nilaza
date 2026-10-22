# R09 — Export dữ liệu trên thiết bị

Ngày 2026-10-01. Source và unit tests local đã đạt; cloud account deletion và native sharing chưa nghiệm thu.

Plan: `docs/feature-plans/mvp-R09-local-export-2026-10-01.json`. Root là App integration owner. Dependencies đã cài tương thích Expo SDK54: **expo-file-system 19.0.24**, **expo-sharing 14.0.8**. Native review build phải được build lại. Lockfile có thay đổi owner trước đó; không quy toàn bộ diff cho task này và không chạy audit fix.

Đã đổi:

- Thay export đếm số dòng bằng JSON có dữ liệu thật, schema `nilaza-local-export-v1`, phạm vi local-device: profile/birth, chat, insight, chart, council, favourites/preferences và Journal envelope đã ACK.
- Chỉ đọc allowlist của account hiện hành; loại session/auth/provider/operator/device-push keys, lọc các khóa secret trong snapshot lồng nhau. Storage hỏng hoặc account đóng giữa lần đọc chặn delivery, không xuất file thiếu mà báo success.
- Web tải Blob JSON. Native mở share sheet do người dùng chọn; kết quả chỉ ghi sheet đã đóng, không suy là đã lưu. UI có xác nhận dữ liệu riêng tư và phạm vi local.
- File ở thư mục cache riêng. iOS dọn sau sheet; Android giữ tối đa 10 phút khi process còn chạy để recipient có thể đọc URI, dọn file quá hạn lúc app khởi động. Lỗi sheet dọn ngay. Cleanup failure không che kết quả gốc, startup có thể thử lại.
- Nhãn “Xóa dữ liệu trên thiết bị” không còn ngụ ý xoá account cloud; clear Journal nói rõ thay đổi đang chờ gửi server.

Kiểm tra hiện tại: **10/10 tests** privacy đạt (allowlist/data thực/redaction, validated persisted Journal draft, read failure, account closure, web download/revoke, iOS/Android cleanup, original error không bị cleanup che). Full mobile44suites/269tests và TypeScript đạt. Draft export chỉ title/body/mood đã ACK trên disk; không RAM chưa lưu hoặc envelope extras. Reviewer độc lập chỉ đọc source; không đọc/export nội dung người dùng. Không claim browser download E2E hoặc native recipient proof.

Manager path cần nghiệm thu tiếp: Profile → Xuất dữ liệu trên thiết bị → xem xác nhận → download/share trên account QA giả lập → mở file, đối chiếu notes, kiểm không có token. Android recipient đọc chậm, iOS cancel/handoff, account switch khi build/share, restart sau expiry phải được thử trên native build mới. Chỉ gửi file tới nơi người dùng chủ động chọn.

Rủi ro còn lại: TTL không bảo đảm wall-clock cleanup khi app bị kill; file được copy ra ngoài app không thu hồi được. Cloud account deletion/request-retention, server-only export và thu hồi phiên chưa được triển khai ở lát cắt này; R09 toàn bộ vẫn chưa đạt. Không biến clear-local thành evidence xoá server.

Rollback: giữ nguyên dữ liệu nguồn; disable export/hoàn tác driver và dependencies theo reviewed baseline, build lại native. Plan-QC/Brand verified-current, không thay nguồn brand hoặc protocol.
