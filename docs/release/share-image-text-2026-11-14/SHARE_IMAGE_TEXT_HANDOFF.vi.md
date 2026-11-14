# Chia sẻ ảnh kèm lời nhắn (14–15/11/2026)

Hồ sơ kế hoạch: [share-image-text-2026-11-14.json](../../feature-plans/share-image-text-2026-11-14.json). Nối tiếp [bàn giao chia sẻ](../share-events-2026-11-12/SHARE_EVENTS_HANDOFF.vi.md).

## 1. Đã làm gì

- **Ảnh và lời nhắn trong một lần chia sẻ.** Nút **Chia sẻ ảnh** mở bảng chia sẻ của Android với ảnh thẻ và lời nhắn kèm link. Dùng thư viện `react-native-share` 12.3.1 (MIT, chạy được với kiến trúc mới, Owner duyệt thêm ngày 14/11). Nếu thư viện lỗi thì tự quay về cách cũ (chỉ ảnh).
- **Vẫn sao chép lời nhắn kèm link vào clipboard** làm dự phòng, vì ứng dụng nhận tự quyết định có hiện chữ hay không.
- **Lời nhắn viết lại theo giọng người chia sẻ**, gợi tò mò, không còn câu "Để tự phản chiếu, không phải dự đoán." trong lời nhắn. Mỗi nơi chia sẻ có một câu riêng (lá hôm nay, trải bài, Big 3, lời mời so bản đồ sao), tiếng Việt và tiếng Anh. Chỉ dùng thông tin công khai: tên lá bài từ thư viện, hoặc cung Mặt Trời tính được. Câu hỏi, ghi chú, tâm trạng, ngày giờ sinh không bao giờ vào lời nhắn (có test).
- **Ảnh tạm được xóa ở lần chia sẻ kế tiếp**, không xóa ngay, để ứng dụng nhận còn thời gian đọc ảnh.
- Sự kiện `share_tapped`/`share_completed` giữ nguyên nghĩa: hủy bảng chia sẻ vẫn tính là "returned"; không có nghĩa người nhận đã nhận.

## 2. Đã kiểm chứng

- **Offline:** tsc sạch; Jest nhóm chia sẻ 38/38; Jest toàn bộ 504/506 ở lần chạy đầu, hai test thiên văn quá giờ chờ khi máy tải nặng (chạy lại riêng đều qua).
- **Trên điện thoại Air1 Ultra, APK 0.1.3 cài đè ngày 15/11 (không gỡ app cũ):**
  - Lá hôm nay → Chia sẻ: màn Chia sẻ hiện ghi chú mới ("Ảnh được gửi kèm lời nhắn và link của bạn…").
  - **Chia sẻ ảnh:** bảng chia sẻ Android hiện ảnh thẻ. Chọn Gmail (chỉ mở nháp, không gửi, đã Discard): **thư nháp có đủ lời nhắn, link theo dõi và ảnh thẻ đính kèm** — "Hôm nay mình rút được lá Ten of Wands (Mười Gậy). Đọc xong mình ngồi nghĩ mất một lúc. Bạn rút thử xem lá của bạn là gì?" + link `…/vi/share?c=minor-wands-ten&utm_…`.
  - Sau khi chia sẻ, app hiện "Đã sao chép lời nhắn kèm link…"; Android hiện chip clipboard đúng nội dung.
  - **Gửi kèm link:** bảng chia sẻ hiện đúng lời nhắn mới.
  - Chia sẻ lần hai rồi hủy ở bảng chia sẻ: không lỗi, không crash trong log.

## 3. CHƯA kiểm chứng

- Zalo, Messenger, Facebook, Telegram: có hiện lời nhắn cạnh ảnh hay không. Facebook và Messenger thường bỏ chữ; trường hợp đó người dùng dán lời nhắn đã sao chép sẵn. Dán sau khi ứng dụng đã dùng sẵn chữ có thể bị lặp.
- Ứng dụng nhận còn đọc được ảnh nếu chậm sau khi bảng chia sẻ đóng (mới thử qua Gmail).
- Bài đọc Tarot, Big 3 và lời mời so bản đồ sao trên máy (tài khoản thử chưa có ngày sinh); Android 13.
- Sự kiện lên máy chủ: hàm `share-events` vẫn **chưa deploy**.

## 4. Câu hỏi và việc cho Owner

- Tên lá bài trong lời nhắn đang là "Ten of Wands (Mười Gậy)" vì dữ liệu thẻ hiển thị cả hai tên. Có muốn chỉ dùng tên tiếng Việt cho người dùng Việt không?
- Câu "Để tự phản chiếu, không phải dự đoán." **vẫn còn trên chân ảnh thẻ** (không phải trong lời nhắn). Có muốn đổi cả ở ảnh không?
- Ý tưởng (chưa làm): ô sửa lời nhắn ngay trong màn chia sẻ.
- Còn mở từ trước: deploy `share-events`; deploy lại website cho `/share` và `/compare`; kiểm tra Cloudflare có chặn trình thu thập của mạng xã hội không; ảnh xem trước riêng cho từng thẻ (không bắt buộc).
- Lỗi có sẵn, không thuộc việc này: bản kỹ năng `nilaza-plan-qc` cài trong máy khác bản trong repo (preflight cần `CODEX_HOME` trỏ vào bản repo); `validate:public-content` báo "help corpus stale".

## 5. Dựng và hoàn tác

- Dựng release arm64 trong thư mục ngắn `D:\nzb` (đường dẫn dài làm CMake lỗi), ký bằng khóa debug mẫu; không commit khóa. Hoàn tác: gỡ `react-native-share` khỏi `apps/mobile/package.json` và bỏ nhánh `native.open` trong `captureShareCard.ts`; cần dựng native lại.
