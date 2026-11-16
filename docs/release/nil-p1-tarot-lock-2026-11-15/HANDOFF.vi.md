# Bàn giao P1-A: Khoá kết quả Tarot (một sự kiện, một câu trả lời)

Nhánh `claude/nil-p1-tarot-2026-11-15` (cắt từ `claude/nil-p0-p1-2026-11-15`). Hồ sơ: `docs/feature-plans/nil-p1-tarot-lock-2026-11-15.json`.
Chưa áp lên Supabase nào, chưa deploy, chưa push.

## Thay đổi cho người dùng

- **Lá bài do máy chủ rút** (với tài khoản đã đăng nhập). Máy chủ dùng bộ sinh số ngẫu nhiên an toàn. App chỉ hiển thị các lá đó, không tự rút thay.
- **Một sự kiện, một câu trả lời.** Một trải bài được khoá theo bốn thứ: tài khoản, kiểu trải, chủ đề, ngày giờ Việt Nam.
  - Rút lại cùng trải và cùng chủ đề trong ngày thì app hiện đúng các lá và lời diễn giải cũ, không gọi AI và không trừ lượt.
  - Phía trên có lời nhắc nhẹ: "Lá bài này vẫn còn điều muốn nói…", kèm giờ mở trải bài mới là 0:00 giờ Việt Nam.
- **Lời diễn giải không đổi được** sau khi đã lưu.
- **Nếu AI lỗi thì không mất lượt.** Nút "Thử lại" chỉ hiện khi AI lỗi, và thử lại trên đúng các lá đã rút. Tối đa 3 lần thử mỗi ngày.
- **Lá làm rõ.** Nút "Rút một lá làm rõ" cho thêm tối đa 1 lá mỗi trải bài.
  - Máy chủ rút lá này và đi kèm nghĩa có sẵn trong thư viện, không gọi AI.
  - Rút rồi thì không đổi được.
- **Giới hạn mỗi ngày.** Tối đa 3 trải bài mỗi ngày, nhưng không vượt hạn mức AI của gói.
  - Gói Free mặc định 1 trải bài và 1 lời diễn giải AI mỗi ngày, như hiện nay.
  - Hết lượt thì app báo bằng giọng nhẹ nhàng, không nhắc chuỗi ngày (streak).
- **Lá bài hôm nay ở Trang chủ** cố định theo tài khoản và ngày Việt Nam. Đổi mục tiêu hay giọng điệu trong hồ sơ không làm đổi lá.
- **Không đổi:**
  - Khách chưa đăng nhập vẫn rút lá ngay trên máy.
  - Câu trả lời khủng hoảng vẫn hiện thẻ 115.
  - Nhãn "văn bản dự phòng" và thông báo hết lượt giữ nguyên.

## Migration cần Owner duyệt

- Tệp: `supabase/migrations/20261115100000_tarot_reading_lock.sql`.
- SHA-256 (LF): `e193323e6b96cb2e085ab3f785b8033d221a2fe2cf6a5e90e50a02cfee0740ba`. Tệp đổi thì phải duyệt lại.
- Nội dung:
  - thêm cột khoá vào `tarot_readings`;
  - khoá `lock_key` là duy nhất;
  - trigger giữ lời diễn giải bất biến;
  - người dùng chỉ được **đọc** trải bài của chính mình (trừ bài đã xoá); quyền ghi chuyển hết sang máy chủ;
  - hai hàm `tarot_draw_claim` và `tarot_interpret_claim`, chỉ `service_role` gọi được.
- Chạy lại nhiều lần vẫn an toàn.

## Thứ tự triển khai (mỗi bước cần Owner duyệt riêng)

1. Áp migration lên staging, sau đó chạy Security Advisor.
2. Deploy Edge Function `ai-tarot-reading`. Cả thư mục phải lên cùng lúc: `index.ts`, `handler.ts`, `draw.ts`, `store.ts`.
3. Phát hành bản app mới.

**Lưu ý:** sau bước 2, bản app cũ không còn nhận được diễn giải AI Tarot. Máy chủ trả `draw_required`, và app cũ hiện văn bản tham khảo có nhãn dự phòng.

## Cách Owner thử trên điện thoại

Làm sau bước 1–2, trên bản app thử có mã này, với tài khoản đã đăng nhập:

1. Mở Tarot → chọn **Tình cảm** → trải 1 lá → đặt câu hỏi → rút lá → đọc kết quả.
2. Thoát ra, mở lại Tarot, chọn lại **Tình cảm** và rút. Kết quả mong đợi: đúng lá và lời cũ, có lời nhắc nhẹ, không phải chờ AI.
3. Chọn chủ đề khác trong cùng ngày. Kết quả mong đợi với gói Free: "Hôm nay bạn đã mở đủ trải bài…", kèm giờ mở lại.
4. Bấm **Rút một lá làm rõ**. Lá hiện ra kèm nghĩa và câu hỏi gợi mở. Mở lại trải bài thì lá làm rõ vẫn còn và nút không hiện nữa.
5. Ở Trang chủ, đổi mục tiêu hoặc giọng điệu trong hồ sơ. Lá bài hôm nay phải giữ nguyên.
6. Sau 0:00 giờ Việt Nam, rút lại được.

## Rủi ro đã biết

- **Chủ đề khác trong ngày.** Với gói Free, "khác chủ đề thì được rút mới" chỉ có tác dụng khi Admin nâng hạn mức AI của gói.
- **Chặn nhầm.** Nếu bộ lọc an toàn chặn nhầm, chủ đề đó bị giữ đến hết ngày, vì câu hỏi đã cố định lúc rút.
- **Bài đã xoá** chỉ bị ẩn khỏi app (xoá mềm): vẫn được lưu và vẫn tính lượt, cho đến khi xoá tài khoản. App chưa có nút xoá trải bài.
- **Lá làm rõ** chưa được lưu vào Nhật ký. Nhật ký vẫn lưu trải bài như cũ.
- **Người ở ngoài Việt Nam:** lá Trang chủ đổi lúc 0:00 giờ Việt Nam, còn dấu "đã lật" vẫn theo ngày của máy (giữ hành vi cũ).
- **Kiểm thử cục bộ.** PGlite không phải Supabase thật: phần đăng nhập chỉ được giả lập. Cần chạy Security Advisor sau khi áp.
- **Diễn tập cơ sở dữ liệu.** Script `scripts/rehearse-nilaza-database.mjs` đang ghi `tarot_readings` bằng quyền người dùng, nên cần sửa khi gói diễn tập có migration này.

## Hoàn tác (cần Owner duyệt)

1. Deploy lại `ai-tarot-reading` bản trước, từ commit `3a624c7`.
2. Chạy khối SQL "Rollback" ghi ở đầu tệp migration. Khối này bỏ hai hàm và trigger, rồi trả lại quyền ghi cũ cho người dùng.

Các cột mới có thể để nguyên, vì mã cũ bỏ qua chúng.

## Đề xuất, chưa làm

- Hạ temperature cho Tarot để lời diễn giải ổn định hơn. Nên làm qua Admin AI Studio, sau khi Owner duyệt.
