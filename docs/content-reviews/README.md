# Hồ sơ duyệt nội dung (Content reviews)

Mỗi lô nội dung phản chiếu (câu trích sách, Kinh Dịch, Bói Kiều, Rune, câu hỏi Big Five / Enneagram, persona…) được duyệt bằng skill `$nilaza-content-review` trước khi vào `packages/content/data` hoặc brief persona.

- Một tệp cho mỗi lô: `docs/content-reviews/<batch-id>.json`, định dạng ở `skills/nilaza-content-review/references/review-record.md`.
- Kết luận mỗi mục: `PASS` / `REVISE` / `BLOCK`, kèm ý kiến riêng của từng người duyệt chuyên trách (kinh điển Đông Á, Phật học, triết học phương Tây, văn học Việt, hệ biểu tượng, tâm lý học, giữ đúng giọng nhân vật, ngôn ngữ, an toàn, nguồn và bản quyền).
- `ownerDecision` chỉ điền theo lời Owner trong chat; agent không tự đánh dấu "đã duyệt".
- Người duyệt là AI: giảm lỗi nhưng không thay chuyên gia thật. Các mục rủi ro cao được gắn cờ để Owner đọc kiểm.
