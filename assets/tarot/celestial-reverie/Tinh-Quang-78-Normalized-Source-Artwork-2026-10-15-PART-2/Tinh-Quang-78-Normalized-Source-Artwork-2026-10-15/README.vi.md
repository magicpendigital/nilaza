# Tinh Quang — đủ 78 artwork chuẩn hóa

Ngày đóng gói: 2026-10-15 UTC.

## Gói này chứa gì?

- Đủ 78 PNG artwork riêng biệt, kích thước 656 × 1130.
- 75 ảnh được giữ nguyên bytes từ gói gốc Tinh-Quang-Interim-Pre-Render-Review.zip.
- 3 ảnh bổ sung là Strength v3, The World v5 và Ten of Swords v2 từ gói ngày 13/10/2026.
- Bộ bàn giao mới gồm 2 ZIP, cộng lại đủ 78 artwork chuẩn hóa; không cần lấy thêm artwork từ hai ZIP cũ.
- PART-1 gồm 36 ảnh: 22 Major Arcana và 14 Cups.
- PART-2 gồm 42 ảnh: 14 Pentacles, 14 Swords và 14 Wands.
- Cần tải cả PART-1 và PART-2; riêng một phần chưa đủ 78 ảnh.
- Không chứa raw variants, catalog dùng chung, code hoặc script tự áp dụng.

## Ảnh nằm ở đâu?

Sau khi giải nén cả hai phần vào cùng một thư mục trống, assets/tarot/tinh-quang/artwork/ có đủ 78 file PNG, đặt tên theo card ID. MANIFEST.json trong mỗi phần đều liệt kê đủ 78 file, kích thước, SHA-256 và nguồn gốc. PACKAGE-CONTENTS-PART-1.json và PACKAGE-CONTENTS-PART-2.json chỉ rõ ảnh thuộc từng phần; PART-1-SHA256SUMS.txt và PART-2-SHA256SUMS.txt kiểm các file trong phần tương ứng. Hai phần không có ảnh trùng tên. README.vi.md, MANIFEST.json và PROVENANCE.json giống hệt nhau trong cả hai phần; nếu công cụ giải nén hỏi, có thể giữ bản tài liệu đã có.

## Trạng thái QC và giới hạn

Đây là artwork bên trong lá bài, CHƯA phải 78 mặt bài hoàn chỉnh đã render bằng renderer/font Nilaza. Các bản nguồn có hồ sơ source QC trước đó; lần đóng gói này kiểm trực tiếp bytes, tên/ID, checksum, khả năng đọc PNG, kích thước và tính toàn vẹn ZIP. Không thực hiện lại visual review đầy đủ của 78 ảnh. Không được coi kiểm tra đóng gói là final QC PASS.

Trạng thái bàn giao trước đó: SOURCE_COMPLETION_READY; FINAL_NILAZA_QC_BLOCKED. FinalCardFacesReviewed = 0, FinalQCPassed = 0. Tình trạng checkout hiện tại cần được kiểm tra riêng trước khi tích hợp. Gói này không xác nhận đã nhập vào dự án, đã test app, commit/push hoặc deploy.

## Cách sử dụng an toàn

1. Tải cả hai ZIP PART-1 và PART-2. Giải nén cả hai vào cùng một thư mục mới, tách biệt với checkout dự án, để kiểm tra. Chưa chép vào D:\nilaza ở bước này.
2. Mở assets/tarot/tinh-quang/artwork/ và đối chiếu 78 file với MANIFEST.json.
3. Trước khi đưa vào D:\nilaza, kiểm tra các file đang có, xác minh local edits và quyền ghi. Giữ bản sao các file hiện có; nếu tên file trùng nhưng hash khác, dừng để đối chiếu thay vì ghi đè.
4. Chỉ nhập các artwork đã xác minh theo quy trình Nilaza được phê duyệt. Không dùng gói này để thay shared catalog, renderer hoặc font.
5. Tiếp tục render 78 mặt bài, native/mobile visual review, ledger, asset/data validation và app tests trước khi kết luận final QC.

PROVENANCE.json ghi rõ hai gói nguồn và các checksum đã xác minh.
