# Retest UI/UX Tarot theo góc nhìn khách hàng — 2026-09-29

## Phạm vi

- Thiết bị: Android `Q88549EEXCUOONGA` / Air1_Ultra, màn hình dọc 1080×2460.
- Locale: tiếng Việt; dữ liệu kiểm thử là entry Tarot có sẵn với câu hỏi hư cấu.
- Build QA cục bộ: `app.nilaza.mobile` versionCode 4 / versionName 0.1.3.
- APK QA dùng native release APK hiện có và Hermes bundle mới từ `apps/mobile/App.tsx`; debug-signed, chỉ dùng trên thiết bị review, không phải bản phát hành.
- APK SHA-256: `ED2FEB0C8ED9D2709362495B5881D88B180FBAEB7DC03C66D7959D785BFE583D`.

## Kết quả theo kịch bản

| ID | Kết quả | Bằng chứng trực tiếp | Ghi chú |
| --- | --- | --- | --- |
| S01 | pass | Explore → Trải bài Tarot trên thiết bị | Entry point, card Tarot và bottom navigation đọc được trên màn hình hẹp. |
| S02 | unverified | — | Chưa chạy đủ thư viện 78 lá và detail từng lá trong lượt retest này. |
| S03 | pass | `window-qa-v3-draw-after.xml` | Sau rút hiển thị `1 / 1 LÁ` và `XEM THÔNG ĐIỆP`; loading có trạng thái rõ ràng. |
| S04 | pass | `window-qa-v3-reopen.xml`, `window-qa-v3-result-actions.xml` | Kết quả khôi phục đúng `Ace of Swords`, `THÔNG ĐIỆP · NGƯỢC`; có nhãn chia sẻ văn bản. |
| S05 | pass | [journal reopen](/D:/nilaza/device-tarot-qa-v3-journal-reopen-20260929.png) | Từ Journal → Mở lại nguồn không còn rơi về màn hình chọn chủ đề; giữ đúng lá và chiều. |
| S06 | pass | [fresh draw](/D:/nilaza/device-tarot-qa-v3-start-over-draw-20260929.png) | Bắt đầu lại tạo phiên sạch; trước khi rút không còn kết quả cũ, sau đó nút là `RÚT LÁ ĐẦU TIÊN`. |
| S07 | partial | `window-qa-v3-result-actions.xml` | VI, narrow viewport, back/header, loading và local fallback đã thấy; EN, empty, lỗi backend và toàn bộ offline matrix chưa chạy. |
| S08 | unverified | — | Chưa chạy câu hỏi nhạy cảm hư cấu trong lượt này. |

## Retest theo chân dung

| Chân dung | Kết quả | Nhận xét |
| --- | --- | --- |
| Gen Z khám phá | pass cho entry, progress, reset; S02 chưa chạy | Có điểm bắt đầu rõ, card lựa chọn dễ hiểu, tiến trình và CTA đọc được. |
| Người cần phản chiếu cảm xúc | pass cho wording và continuity | Kết quả giữ ngôn ngữ phản chiếu, không biến thành kết luận chắc chắn; cần chạy thêm privacy/share thực tế. |
| Người muốn học sâu | pass cho orientation và detail kết quả; S02 chưa chạy | Lá, chiều xuôi/ngược và phần tổng hợp khớp; thư viện detail cần retest riêng. |

## Lỗi đã sửa và xác nhận

1. Callback `Mở lại nguồn` không còn gọi fallback `onTarot()` sau khi hàm khôi phục trả về `undefined`.
2. Snapshot Tarot cũ có thể khôi phục theo `cardId`, `id`, tên lá hoặc tên lá xuất hiện trong summary.
3. Kết quả khôi phục hiển thị đúng chiều `NGƯỢC`, card name và meaning.
4. `Bắt đầu lại` làm sạch reading, question, selected card, lỗi và progress trước phiên mới.

## Giới hạn còn lại

- Chưa chạy native build mới từ đầu; bundle QA được thay vào native APK debug-signed để kiểm tra nhanh trên thiết bị.
- Backend credits/reporting, network fallback timeout, EN, empty/error, 78-card library, deck detail và safety scenario còn `unverified` hoặc cần lượt riêng.
- Khi mạng không phản hồi, trạng thái “Đang mở trải bài...” có thể kéo dài trước khi fallback hoàn tất; cần một slice riêng để đặt timeout/feedback rõ hơn.
