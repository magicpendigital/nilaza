# Tinh Quang — bổ sung nguồn và bàn giao tiếp tục QC

Ngày 14/10/2026 (Việt Nam), 13/10/2026 (UTC).

## Kết quả hiện tại
- Đã bổ sung 3 tranh: Strength v3, The World v5 và Ten of Swords v2.
- Ba tranh đã qua review nguồn độc lập. Bản chuẩn hóa dùng đúng thuật toán Nilaza, 656×1130; không đổi renderer/font.
- Tổng nguồn hiện có: 78/78, gồm 75 nguồn giữ nguyên của gói trước và 3 nguồn mới. Danh mục VI/EN v6 đủ 78 ID.
- 352 file nguồn của gói gốc được kiểm lại SHA-256, không thay đổi; 75 bản chuẩn hóa cũ cũng không thay đổi.
- Chưa nhập vào checkout Nilaza, chưa tạo mặt bài 1024×1768, chưa có final QC hoặc kiểm thử app. Số lá đạt final QC vẫn là 0.

## Cách dùng gói
SELECTED-78-SOURCES.json là danh sách lựa chọn duy nhất. raw-variants giữ cả các phiên bản đã loại để bảo toàn lịch sử; chỉ dùng ba raw được SELECTED trỏ tới. normalized chứa ba nguồn mới sau chuẩn hóa. receipts lưu prompt và hash đầu vào/đầu ra của các lần tạo/sửa bằng image_gen chính thức.

75 nguồn còn lại và cover/back ở gói Library gốc Tinh-Quang-Interim-Pre-Render-Review.zip, ID libfile_78de4c8918cc819190bceee1ef7f3116. Archive gốc: 381078603 byte, SHA-256 db277e7b1179032cb42cbfb4793eabef41fcc373836b4cfd6a393c3355256bd9.

deck-metadata chỉ là dữ liệu của riêng Tinh Quang và tài liệu v6 đã có. Đây là tài liệu handoff, không phải patch tự áp dụng. Không chép đè nguyên các catalog shared của Nilaza bằng dữ liệu cũ. Đặc biệt không đưa tarot-cards.json ngày 01/10 vào project: nội dung canonical đã được sửa vào 13/10.

## Điểm chặn tích hợp
D:\nilaza có cấu trúc app Nilaza và hiện chưa có bộ tinh-quang. Remote app đã xác minh là magicpendigital/nilaza; checkout local chưa xác minh được branch/commit/local edits vì Git báo: fatal: cannot change to 'D:\nilaza': Permission denied.

Canonical tarot-cards.json hiện đọc được có SHA-256 e926472eeda71a637a8554e6465f14200ef9873e94a8a9e12611aa765968561f, khác bản 01/10. Có 12 lá/23 trường canonical đã được sửa trong công việc review nội dung ngày 13/10; cần giữ nguyên và phối hợp quyền sở hữu file. Máy cũng đang thiếu RAM khả dụng nên chưa chạy render/build.

## Các gate còn phải làm tại đúng checkout
1. Xác minh checkout, local edits và quyền ghi; chạy feature preflight theo Plan-QC hiện hành, giữ snapshot/backup.
2. Hợp nhất record deck, design/back, manifest và 78 introductions VI/EN của riêng Tinh Quang vào dữ liệu hiện tại. Tạo đủ 78 deck-specific Admin drafts theo hướng dẫn Admin; giữ deck ở draft và chưa tự chọn Free/Premium.
3. Render đủ 78 face bằng renderer/font chuẩn; kiểm từng face ở native/mobile, cover/back và contact sheet; ghi ledger theo hash.
4. Chạy quality-gate prepare/verify, validate_tarot_assets và validate:data; chưa dùng kết quả nguồn làm final PASS.
5. Export runtime riêng deck, cập nhật card/cover/back maps; kiểm visual-assets và mobile. Giới hạn runtime đã đọc: dưới 700 KB mỗi ảnh và dưới 90 MB toàn bộ.
6. Review độc lập và kiểm thử theo chuẩn dự án trước đồng bộ. Không tự deploy production hay ghi/xóa dữ liệu backend.

Không có thay đổi repository, DB, production hoặc quyền chia sẻ nào trong gói bổ sung này.
