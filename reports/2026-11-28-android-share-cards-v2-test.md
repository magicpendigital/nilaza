# Thử thẻ chia sẻ v2 trên điện thoại thật (28/11/2026)

- Bản dựng: EAS `preview` build `2b10c936-a7ed-4957-bef7-a89da39f9ba4`, từ `main` d8de24d (đã có S1a PR 91 và S1b PR 92), APK 0.1.3 (versionCode 10), SHA-256 `ab2cec1bfccb2e138dca699ee2e1154b264f7aec9c44756f5213e39a6a177971`.
- Máy: Air1 Ultra (`Q88549EEXCUOONGA`), cài đè bằng adb, tài khoản Owner đang đăng nhập.
- Owner duyệt 28/11: "Đồng ý dựng bản Android và thử trên điện thoại đang kết nối."
- Mã QR được kiểm bằng cách giải mã ảnh chụp màn hình (thư viện jsQR), không phải bằng camera của máy khác.

## Kết quả

| Việc | Kết quả |
|---|---|
| Mở app (kiểm tra máy chủ khi mở app) | Đạt: vào thẳng Trang chủ, không bị màn "Mất kết nối" (bảng migration staging đã có `20261128090000 app_release_policy`) |
| Lá bài hôm nay → Chia sẻ, Bài đăng 4:5 | Đạt: nền than viền vàng, logo, hình lá, tên Anh + Việt, 3 từ khóa, một câu ý nghĩa, QR + dòng mời |
| Lá bài hôm nay, Story 9:16 | Đạt: cùng bố cục, chừa vùng trên và dưới |
| QR thẻ lá bài (cả hai khổ) | Đạt: `…/vi/share/card?utm_source=share&utm_medium=qr&utm_campaign=today_card` |
| Nút "Chia sẻ ảnh" | Đạt: mở bảng chia sẻ của Android (Zalo, X, Business Suite…); đã hủy, không gửi cho ai |
| Sự kiện chia sẻ lên máy chủ | Đạt một phần: nhật ký `share-events` có 2 lần POST trả 202 lúc 14:05 (đúng lúc bấm chia sẻ khổ Story). Chưa đọc bảng `usage_events` (cần chạy SQL) |
| Bản đồ số → Chia sẻ, 4:5 và Story | Đạt về nội dung: nền teal, số chủ đạo lớn màu vàng, lưới 1–9 sáng ô 5, Điểm sáng, Câu hỏi, chip Ngày sinh/Biểu đạt chỉ là con số; không tên, không ngày sinh |
| QR thẻ Bản đồ số | Đạt: `…/vi/share/numbers?…utm_medium=qr&utm_campaign=numerology_map` |
| Một câu cho hôm nay → "Chia sẻ câu này", 4:5 và Story | Đạt: nền ngà, dấu ngoặc vàng, câu Đạo Đức Kinh Chương 42, nguồn, ô "Câu hỏi cho mình", dòng mời "Nhận một câu mỗi sáng từ kho tri thức cổ" |
| QR thẻ Một câu | Đạt: `…/vi/share/quote?…utm_medium=qr&utm_campaign=book_quote` |
| Mở địa chỉ QR trên trình duyệt điện thoại | Đạt: trang "Một câu cho hôm nay." hiện **đúng câu** trên thẻ (Chương 42) và cùng câu hỏi |

## Lỗi nhỏ tìm thấy (chưa sửa)

1. **Thẻ Bản đồ số khổ 4:5:** dòng "BẢN ĐỒ SỐ CỦA MÌNH" và "SỐ CHỦ ĐẠO" sát nhau (gần như dính dòng).
2. **Thẻ Bản đồ số khổ 4:5:** hai chip "Ngày sinh · 9", "Biểu đạt · 1" chạm vạch kẻ phía trên phần QR (thiếu khoảng trống bên dưới). Khổ Story không bị.
3. **Khổ Story (cả 3 bộ da):** khoảng trống dưới phần QR lớn hơn phía trên; không lỗi, nhưng có thể dàn nội dung xuống giữa hơn.
4. **Dựng bản Android từ thư mục `main` trên máy bị EAS từ chối** (gói 4,0 GB > 2 GB) vì `.easignore` chưa loại `.claude/` (chứa các worktree). Lần này dựng từ một bản sao sạch của `main`. Nên thêm `.claude/` vào `.easignore`.

## Chưa kiểm chứng

- Ảnh thật sau khi đăng lên Facebook (nén ảnh) rồi quét bằng camera máy khác.
- Ảnh xem trước link trên Facebook/Zalo.
- Bản tiếng Anh của thẻ; thẻ trải bài, Big 3, Bầu trời hôm nay (khung v2, chưa thử).
- Dòng sự kiện trong `usage_events` (có `format`, `book_quote`) và `share_link_opened` với `medium: qr` trong số liệu web.
