# R07 — Nhật ký bền vững: client và hàng đợi đồng bộ

Ngày: 2026-10-01. Trạng thái: client và handler server local đã triển khai; deployment và nghiệm thu cloud/native còn riêng.

Records: `mvp-R07-journal-durability-2026-10-01.json`, `mvp-R07-server-local-2026-10-01.json`, `mvp-R07-tombstone-read-2026-10-01.json` trong docs/feature-plans. Root sở hữu App/backendClient/repository và nhận handler scope từ Agent backend khi writer của Agent bị treo. Không thay schema hay push/repair DB.

Đã đổi:

- Một envelope theo account lưu entries, tombstone, revision và outbox. Ghi đĩa thành công mới cập nhật UI hoặc báo đã lưu. Không biến dữ liệu hỏng/future schema thành mảng trống.
- Serialize ghi/sửa/xoá. Thay đổi offline còn trong outbox sau restart. ACK cũ không ghi đè sửa mới hoặc làm sống lại mục đã xoá.
- Chỉ ACK hợp lệ mới báo đồng bộ; delete cần operation/localId khớp, upsert cần remote UUID. Thiếu phiên hay server trả fallback không giả thành công.
- Ghi chú/mood, lưu Tarot/Chat/Astrology dùng cùng repository. UI phân biệt “Đã lưu trên máy” và “Đã đồng bộ”, có số thay đổi đang chờ và retry.

Kiểm tra theo slice: TypeScript đạt; 45/45 ca repository/Composer/backendClient đạt sau các sửa từ review độc lập. Sau bổ sung tombstone read, 54/54 ca repository/accountQueries/backendClient đạt. Bao gồm lỗi ghi đĩa, offline/restart, edit/delete khi ACK đang chờ, hai patch chồng nhau, clear sau upsert, sync fail rồi GET/retry, account đóng, envelope hỏng và nhận dấu xóa ở client B mô phỏng. Full regression cuối cùng được ghi trong R01-validation; không bỏ ca hoặc tăng timeout.

Consumer nhận metadata tombstone của đúng owner, không hiển thị/export nội dung đã xóa; hủy pending mutation cũ chỉ sau ACK local. Handler server trả lỗi cấu hình/auth thật và ACK operation/localId/UUID hợp lệ; 10/10 Deno tests đạt. Đây là fixture contract tests, chưa chứng minh transaction/RLS hoặc đồng bộ hai máy thật.

Review độc lập đã dẫn đến ba sửa thêm: lượt lưu trùng chia sẻ cùng Promise ACK thay vì trả success sớm; lỗi mutation local có cảnh báo riêng và không bị retry background che đi; merge dữ liệu remote được await để lỗi lưu không bị bỏ qua. Ghi chú độc lập được tính trong memory count và card preview dùng nội dung đã sửa.

Kiểm tra UI ngày 2026-10-01: với trải bài giả lập Four of Cups đã tạo ở R04, thêm ghi chú `QA giả lập R07...`. UI hiện một thay đổi chờ đồng bộ, trạng thái lưu trên máy và toast xác nhận local. Reload → mở lại Nhật ký → ghi chú giữ nguyên; UI sau đó hiện ACK đồng bộ. Đây là bằng chứng save/reload/ACK của một tài khoản, không chứng minh hai thiết bị, quyền RLS A/B hoặc cloud delete.

Đường nghiệm thu còn lại: dùng hai tài khoản/thiết bị QA được phép; lưu → sửa mood/note → offline → restart → online/retry → xác nhận dữ liệu server → xoá → restart cả hai máy; đổi A→B khi request đang chờ. Cần bản server delete đã triển khai và kiểm tra ownership. Native durability chưa đo.

Lần kiểm tra trình duyệt cuối vẫn đọc được ghi chú QA sau reload; khi GET cloud thất bại, banner ghi rõ đang xem bản trên máy. Không dùng ACK UI trước đó làm bằng chứng rằng schema/migration của Staging đã được nghiệm thu.

Rủi ro/rollback: envelope v1 là nguồn client mới; các legacy keys được đọc để chuyển đổi, không bị xoá. Quay về app cũ có thể đọc legacy cache cũ; cần bước tương thích được review trước rollout, không coi downgrade trực tiếp là rollback dữ liệu an toàn. Xoá account/export/retention nằm R09; không dùng kết quả R07 để nghiệm thu chúng.
