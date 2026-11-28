# Bàn giao: thẻ chia sẻ v2, bước S1b — phần trang web (28/11/2026)

Nhánh `claude/share-cards-v2-s1b`, cắt từ `main` 3affb98 (đã có S1a, PR #91). Hồ sơ: `docs/feature-plans/share-cards-v2-s1b-2026-11-28.json`. Owner duyệt 28/11: "Đồng ý triển khai bước S1b."

## 1. Đã làm gì

**Trang mới `/vi/share/quote` và `/en/share/quote`** — nơi link và mã QR của thẻ "Một câu cho hôm nay" dẫn tới:
- Hiện **câu hôm nay**: câu trích, tác giả · nguồn (chương/kệ), ô "Câu hỏi cho mình".
- Câu được chọn **cùng cách với app** (theo ngày trên máy người xem, cùng thứ tự sách). Ai quét QR trong ngày thẻ được đăng thì thấy đúng câu trên thẻ. Có bài kiểm cố định 5 ngày, chạy ở cả app và web, bảo đảm hai bên không lệch.
- Năm nút sách (Đạo Đức Kinh, Suy tưởng, Pháp Cú, Binh pháp, Kinh Dịch): bấm để xem câu hôm nay của sách đó. Mỗi lần bấm gửi sự kiện `share_landing_try` chỉ mang tên trang (`quote`), không mang sách hay câu.
- Chỉ đăng các câu **đã duyệt** (cùng cổng duyệt của app), chỉ phần câu trích, nguồn và câu hỏi; không đăng phần bình giải.
- Link cũ `/share?utm_campaign=book_quote` cũng mở đúng phần Một câu.

**Ảnh xem trước riêng cho từng trang chia sẻ (khi dán link lên Facebook/Zalo):** 10 ảnh 1200×630 (5 trang × Việt/Anh) trong `apps/web/public/share/og/`: lá bài, trải bài, Bản đồ số, bầu trời, Một câu. Màu, phông EB Garamond / Hanken Grotesk và logo đúng bộ nhận diện; không ∞, không chữ N. Mỗi ảnh < 200 KB. Dựng lại bằng `node scripts/build-share-og.mjs`; lệnh `--check` chạy trong `npm run web:share:test` để báo khi thiếu, sai cỡ hay quá nặng.

**Đếm lượt quét QR:** trang web nhận `utm_medium=qr` (bên cạnh `card`, `invite`), nên sự kiện `share_link_opened` tách được lượt quét QR với lượt bấm link. Giá trị lạ vẫn bị bỏ.

## 2. Chữ mới cần rà nội dung (chưa chạy `nilaza-content-review`)

Không có nội dung phản chiếu mới: câu, nguồn, câu hỏi lấy nguyên từ 5 tệp sách Owner đã duyệt 27/11. Chữ giao diện mới:
- Tiêu đề trang: "Một câu cho hôm nay." / "A line for today."
- Dòng dẫn: "Một người bạn vừa chia sẻ một câu từ sách cổ trên Nilaza. Mỗi ngày một câu, kèm một câu hỏi để bạn tự ngẫm."
- "Câu hôm nay của sách khác", "Câu được chọn theo ngày trên máy bạn, giống trong ứng dụng. Không có gì được gửi đi."
- Xem trước link: "Một câu cho hôm nay từ Nilaza" — "Một câu trích từ sách cổ và một câu hỏi để tự ngẫm. Đọc câu hôm nay, rồi xem câu của những cuốn sách khác ngay trên trình duyệt."
- Chữ trên 10 ảnh xem trước (xem `copy` trong `scripts/build-share-og.mjs`), chân ảnh "Để tự phản chiếu, không phải dự đoán."

## 3. Kiểm tra đã chạy

Đã kiểm chứng (trên máy tính):
- Test trang web chia sẻ: **22/22 đạt** (thêm: trang quote, `qr`, `book_quote` → quote, cùng câu với app theo 5 ngày cố định, chỉ đăng câu đã duyệt, mỗi trang có ảnh xem trước riêng).
- Test app phần Một câu: 32/32 đạt (thêm bảng 5 ngày giống web).
- `build-share-og --check`, `build-share-card-thumbs --check`: đạt.
- `web:check` 0 lỗi; `web:build` 58 trang, kiểm tương thích Safari/iOS 15 đạt.
- Mở bản dựng trên trình duyệt ở khổ điện thoại 375 px: `/vi/share/quote?…utm_medium=qr…` hiện Đạo Đức Kinh Chương 42 (đúng câu app chọn cho 28/11); bấm Pháp Cú hiện kệ 25 (đúng); không cuộn ngang; `og:image` trỏ `quote-vi.png`. `/en/share?utm_campaign=book_quote` hiện phần Một câu tiếng Anh.

Chưa kiểm chứng:
- Ảnh xem trước thật trên Facebook/Zalo (Facebook giữ ảnh cũ trong bộ nhớ đệm; nếu link đã từng được dán, Owner có thể dùng Sharing Debugger để làm mới).
- Sự kiện `share_link_opened` với `medium: qr` ghi vào số liệu thật (cần quét QR từ thẻ trên bản Android mới).
- Rà nội dung chữ giao diện mới (mục 2).

## 4. Rủi ro

- Câu hôm nay theo ngày trên máy người xem: người ở múi giờ khác, hoặc mở link vào ngày sau, sẽ thấy câu khác câu trên thẻ. Link không mang mã câu (giữ đúng quy tắc không đưa nội dung người dùng vào link).
- Trang `/share` cũ nặng thêm khoảng 46 KB vì chứa câu của 5 sách (để mở được link cũ có `book_quote`).

## 5. Đưa lên và rút lại

Sau khi gộp `main`: `npm --workspace apps/web run deploy:staging` (Cloudflare Pages `nilaza-web-staging`, cả `nilaza.magicpendigital.com`). Không có SQL, không đổi Edge Function. Rút lại: quay về bản deploy trước trên Cloudflare Pages; khi đó link Một câu trên thẻ app sẽ lại báo không tìm thấy trang.

## 6. Đường thử cho Owner

1. Trên điện thoại, mở `https://nilaza.magicpendigital.com/vi/share/quote` → thấy câu hôm nay, nguồn, câu hỏi; bấm sách khác → câu đổi.
2. Dán link đó vào ô viết bài Facebook (không cần đăng) → ảnh xem trước có dấu ngoặc vàng và chữ "Một câu cho hôm nay".
3. Sau khi có bản Android mới: chia sẻ thẻ Một câu, dùng máy khác quét mã QR trên ảnh → mở đúng trang này.
