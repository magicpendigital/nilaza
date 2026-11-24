# Đánh giá trang đích của link chia sẻ (Tarot, Bản đồ sao, Bản đồ số)

> **Ngày:** 24/11/2026. **Loại:** đánh giá bằng đọc mã, **chưa sửa gì**. **Câu hỏi của Owner:** có nên thiết kế lại trang web mà người nhận bấm vào link chia sẻ để hấp dẫn, dễ dùng và chuyển đổi tốt hơn không?
> **Kết luận ngắn: Có, nên làm lại, nhưng làm nhẹ và theo hai bước, không đụng backend.** Lý do và phạm vi bên dưới.

## 1. Hiện trạng (đã đọc mã, chưa xem trang chạy thật)

Nguồn: `apps/web/src/pages/[locale]/share/index.astro`, `compare/index.astro`, `apps/web/src/lib/shareLanding.ts`, `apps/mobile/src/features/share/shareLink.ts`.

| Điểm | Hiện tại | Vấn đề |
|---|---|---|
| Lời hứa của người gửi | Tin nhắn nói “Bạn rút thử xem lá của bạn là gì?” | Trang đích **không cho rút**. Người nhận chỉ đọc một đoạn giới thiệu rồi gặp ô đăng ký. Lời hứa và trang lệch nhau ngay giây đầu |
| Nội dung `/share` | Một tiêu đề chung (“Một lá bài để chậm lại một nhịp”), tên lá chữ thường nếu có `?c=`, một đoạn giới thiệu | Không có hình lá bài, không có từ khóa hay câu nào của lá, không có lý do để ở lại |
| Lời kêu gọi | Một nút duy nhất “Đăng ký trước ra mắt” | Phù hợp lúc chưa có bản cài, nhưng không có bước “thử một chút trước” để tạo động lực |
| Bản đồ sao | `/compare` đã có ô nhập ngày sinh, tính cung Mặt Trời ngay trên trình duyệt, ghép nguyên tố | **Đây là mẫu tốt nhất hiện có** (có tương tác, có kết quả, ghi rõ không gửi ngày sinh). Vẫn thiếu hình và CTA theo giai đoạn |
| Bản đồ số (mới, lô 3) | Link đi về `/share` | Trang đang nói về “một lá bài”, **sai ngữ cảnh** với người nhận thẻ số |
| Xem trước link (Zalo, Messenger) | Một ảnh OG chung `brand/v1/og-{vi,en}.png` | Mọi link trông giống nhau, không gợi tò mò. Ảnh thẻ có gửi kèm, nhưng phần xem trước của link thì chung |
| Đo lường | Có `share_link_opened`, `waitlist_cta_click`, `signup_from_share` (theo `utm_campaign` = bề mặt chia sẻ) | Đủ để đo **mở → bấm CTA → đăng ký**. Chưa có số liệu nền nào được xem trong phiên này |

## 2. Có nên làm lại?

**Có.** Trang này là bước nối duy nhất giữa một lần chia sẻ và một người dùng mới. Hiện nó là một “thông báo” chứ không phải một trải nghiệm, nên mọi giá trị của thẻ chia sẻ (tò mò, bằng chứng xã hội từ người quen) bị bỏ phí ngay tại đó. Làm lại không cần dựng hệ thống mới: nội dung công khai (tên lá, từ khóa, câu hỏi tự phản chiếu) đã có sẵn trong `packages/content`, và `/compare` đã chứng minh mẫu “nhập tại chỗ, tính trên trình duyệt”.

**Không đề xuất:** bán hàng gắt, đếm ngược, khẳng định dự đoán hay hứa kết quả, ảnh người nổi tiếng, hay thu họ tên/ngày sinh gửi về máy chủ. Những thứ này trái với “để tự phản chiếu, không phải dự đoán”, với quy tắc nội dung (mục 4 của bản đặc tả) và với lời hứa quyền riêng tư của app.

## 3. Đề xuất theo hai bước

**Bước A: làm lại nội dung và tương tác (chỉ `apps/web`, không backend, không SQL).**
1. **Một khung chung, bốn biến thể** theo `utm_campaign`: `today_card`, `tarot_reading`, `astro_big3`/`astro_invite`, `numerology_map`. Mỗi biến thể mở bằng đúng thứ người gửi hứa, không dùng chung một câu “lá bài”.
2. **Thẻ Tarot:** hiện hình lá (hoặc các lá) từ link, kèm từ khóa công khai và một câu hỏi tự phản chiếu của lá; sau đó nút **“Rút lá của bạn”** rút ngẫu nhiên ngay trên trình duyệt (không gửi gì đi) và hiện tên lá, từ khóa, một câu hỏi. Đây là phần “thử một chút” còn thiếu.
3. **Bản đồ số:** tái dùng module tính của lô 3 (thuần, không phụ thuộc giao diện) để người nhận nhập ngày sinh và thấy số chủ đạo cùng một đoạn ngắn, ngay trên trình duyệt, theo mẫu `/compare`. Chỉ làm sau khi nội dung được người duyệt chuyên môn thông qua.
4. **CTA theo giai đoạn:** đang closed test thì “Đăng ký thử bản Android” (danh sách thử); sau khi lên Google Play thì nút Google Play (chỉ hiện Apple khi iOS có). Một CTA chính, một dòng giải thích lợi ích, một dòng quyền riêng tư.
5. **Phần tin cậy ngắn:** 3 ý (tính ngay trên máy, không dự đoán, 18+), liên kết Chính sách và An toàn. Không đưa số người dùng hay lời chứng thực khi chưa có thật.
6. **Thẻ xem trước theo bề mặt** (tiêu đề và mô tả OG riêng cho từng biến thể). Ảnh OG riêng cho từng lá là việc **bước B**.

**Bước B (sau khi A có số liệu):** ảnh OG sinh theo lá/theo bề mặt, thử hai phiên bản tiêu đề, thêm `numerology_map` vào danh sách bề mặt phía máy chủ để đếm (cần **Owner duyệt riêng** vì phải deploy Edge Function `share-events`).

## 4. Cách nhận biết có tốt hơn không

Đo bằng các sự kiện đã có, so theo từng bề mặt: **mở link → có tương tác (rút lá hoặc nhập ngày sinh) → bấm CTA → đăng ký**. Cần lấy số liệu nền của trang hiện tại trước khi sửa để so; phiên này **chưa xem số liệu nào** nên không thể nói trang cũ chuyển đổi thấp bao nhiêu, và không hứa mức tăng.

## 5. Ràng buộc và việc cần Owner

- Nội dung chữ trên trang là nội dung công khai: cần Owner duyệt (và người duyệt chuyên môn cho phần số).
- Hình lá bài trên web phải dùng ảnh đã có giấy phép trong repo (bộ bài của Nilaza), thêm bản thu nhỏ vào `apps/web/public`; chưa kiểm dung lượng.
- Chưa xác nhận trong phiên này **cách trang web công khai được deploy** (Vercel project của `apps/web` có khác Admin staging không). Cần kiểm trước khi hứa thời điểm lên.
- Thêm bề mặt vào máy chủ, đổi thiết lập Vercel/Play: **cần Owner duyệt riêng**.

## 6. Việc ngay trong lô 3

Lô 3 chỉ thêm bề mặt `numerology_map` ở **phía app** (thẻ không họ tên, link không mang số hay tên). Link hiện đi về `/share` nên trang sẽ nói về lá bài cho tới khi làm bước A; **nên làm bước A (ít nhất biến thể `numerology_map`) trước khi bản có tính năng này ra cho người ngoài thử**.
