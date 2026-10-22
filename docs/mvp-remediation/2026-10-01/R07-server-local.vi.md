# R07 — Contract server Journal upsert/delete

Ngày 2026-10-01. Code và unit tests local đạt; chưa deploy, chưa áp migration, chưa xóa dữ liệu live.

Plan: `docs/feature-plans/mvp-R07-server-local-2026-10-01.json`. Agent backend chuyển exact handler scope cho root sau khi tool riêng bị treo; root giữ các sửa owner ở phần khác. Dùng Deno2.9.0 đã cài, không tải tool.

Đã đổi:

- Tách handler testable; thiếu env trả503, thiếu/không hợp lệ JWT trả401, không còn ACK giả `journal-${localId}`. User owner chỉ từ getUser, bỏ mọi userId/user_id từ body.
- Giữ POST legacy thiếu operation như upsert; thêm explicit delete với ACK operation/localId khớp client. Upsert chỉ ACK remote UUID hợp lệ.
- Delete tạo/ghi tombstone theo unique(user_id,local_id) ngay cả khi entry chưa tới server, xóa fields nội dung. Upsert không đặt deleted_at về null; row đã xóa trả409 thay synced. Đây là soft delete theo cột sẵn có, không cloud account deletion.
- Đọc stream tối đa128KiB, snapshot64KiB; validate types, nguồn, ngày, độ dài. Error không trả raw DB/private content. Client vẫn anon+JWT/RLS, không thêm service-role.

Checks: **10/10 Deno tests PASS** không network import/permission; bao gồm config/auth, owner spoof A/B, legacyACK, delete trước save/deleted-upsert, idempotent delete, errors/UUID, malformed/oversized stream/method. Entrypoint Deno check với `--deny-import --no-config --no-lock` đạt trên dependency cache đã có. Fake-store tests kiểm contract handler; chưa chứng minh Postgres transaction/RLS của adapter. Sau integration, backend validator đạt14 paths/21functions; supabase:check đạt72 pass/9 warnings/0 fail. Warnings env/machine và migration ledger blocked vẫn là gate riêng, không có deploy authorization.

Đã bổ sung consumer local theo `mvp-R07-tombstone-read-2026-10-01.json`: GET giữ filter owner và nhận deleted_at metadata; App không map nội dung đã xóa thành entry hiển thị. Repository chỉ áp tombstone sau ACK lưu đĩa, hủy outbox cũ và không để lỗi/ACK cũ làm sống lại mục đã xóa. 54/54 tests repository/accountQueries/backendClient đạt, gồm refresh thiết bị B mô phỏng, restart, late failure và disk failure.

Giới hạn còn lại: conflict/revision/CAS và hai client thật cần nghiệm thu riêng. Server upsert đến muộn có thể ghi fields vào row tombstoned nhưng không mở visibility; retention/privacy purge phải được review trong R09, không claim transactional erasure. Các thử nghiệm DB phải dùng môi trường Nilaza sạch/được owner cho phép sau R02.

Manager path sau deploy được phép: QA A/B dùng cùng localId, A save/delete/retry và kiểm B không bị thay đổi; delete trước queued save không làm row visible; restart và hai client đồng bộ. Hiện chỉ fixture local đã chạy. Rollback endpoint phải giữ compatibility tombstones/old-client ACK, không dùng legacy handler trả synced giả làm fallback.
