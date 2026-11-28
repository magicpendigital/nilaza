# Bàn giao: thẻ chia sẻ v2, bước S1a (28/11/2026)

Nhánh `claude/share-cards-v2-s1`, cắt từ `origin/main` 217e158. Hồ sơ: `docs/feature-plans/share-cards-v2-s1-2026-11-28.json`. Đề xuất Owner đã duyệt: `docs/proposals/SHARE_CARDS_V2_2026-11-28.vi.md` (mục 6, quyết định 28/11).

S1 được chia hai phần để mỗi PR nhỏ:
- **S1a (PR này):** thẻ trong app + mã sự kiện chia sẻ (app và máy chủ).
- **S1b (PR sau):** trang web `/share/quote`, ảnh xem trước Facebook (OG) riêng cho từng trang, trang web nhận `utm_medium=qr`.

## 1. Đã làm gì

**Khung thẻ v2 (mọi thẻ):** logo Nilaza ở đầu, một dòng mời riêng cho từng tính năng, **mã QR**, địa chỉ web và dòng "Để tự phản chiếu, không phải dự đoán." ở cuối thẻ.

**Hai khổ ảnh:** trong khung chia sẻ có hai nút chọn **"Bài đăng 4:5"** (1080×1350, mặc định) và **"Story 9:16"** (1080×1920). Khổ Story chừa vùng an toàn trên và dưới để chữ không bị thanh của Facebook/Instagram che.

**Ba bộ da mới:**
| Tính năng | Bộ da | Nội dung trên thẻ |
|---|---|---|
| Một câu cho hôm nay | nền ngà | dấu ngoặc vàng, câu trích (tự thu nhỏ chữ cho vừa), nguồn sách, ô "Câu hỏi cho mình" |
| Bản đồ số | nền xanh teal | số chủ đạo lớn màu vàng, tên khối, lưới 1–9 trang trí sáng một ô, "Điểm sáng" + "Câu hỏi", chip Ngày sinh/Biểu đạt (chỉ là con số) |
| Lá bài hôm nay | nền than, viền vàng | hình lá, tên tiếng Anh + dòng nhỏ tiếng Việt, tối đa 3 từ khóa, một câu ý nghĩa |

Các thẻ còn lại (trải bài Tarot, Big 3, Bầu trời hôm nay) giữ bố cục cũ nhưng đã có khung v2 (logo, dòng mời, QR) — bộ da riêng để S2.

**Nút mới "Chia sẻ câu này"** trong màn Một câu cho hôm nay (chỗ chia sẻ mới `book_quote`).

**Số liệu:** sự kiện chia sẻ ảnh giờ mang thêm `format` (`post` hoặc `story`); chia sẻ link không mang. Máy chủ `share-events` nhận `book_quote` và `format`, từ chối giá trị lạ hoặc `format` đi kèm chia sẻ link.

**Mã QR:** dẫn tới cùng trang như link chia sẻ, đánh dấu `utm_medium=qr` để tách được lượt quét QR với lượt bấm link. Vẽ bằng thư viện `qrcode@1.5.4` (MIT, khóa đúng phiên bản), chỉ dùng phần mã hóa, mức sửa lỗi M, ô vuông đen trên nền ngà ở mọi bộ da.

## 2. Những gì KHÔNG có trên thẻ (giữ đúng quy tắc riêng tư)

Không tên, không ngày sinh, không câu hỏi người dùng gõ, không ghi chú, không nhật ký, không dự đoán hay điểm số. Bản đồ số chỉ in con số; lưới 1–9 là trang trí cố định, không phải chữ số ngày sinh. Một câu cho hôm nay chỉ in câu đã duyệt trong file sách, nguồn và câu hỏi đi kèm câu đó — không in câu đã lưu hay nhật ký. Có bài kiểm tự động cho các điểm này.

## 3. Chữ mới cần rà nội dung (chưa chạy `nilaza-content-review`)

Dòng mời (cạnh mã QR):
- Một câu: "Nhận một câu mỗi sáng từ kho tri thức cổ" (Owner chốt 28/11)
- Bản đồ số: "Còn bạn là số mấy? Tính trong 10 giây"
- Lá bài hôm nay: "Bạn rút thử xem lá của bạn là gì?"
- Trải bài: "Bạn thử trải xem mình ra những lá nào?"
- Bầu trời: "Trăng hôm nay ở cung nào?"
- Big 3: "Big 3 của bạn là gì?"
- Mời so bản đồ: "Bản đồ sao của hai mình hợp nhau ở đâu?"

Nhãn: "Bài đăng 4:5", "Story 9:16", "Chia sẻ câu này", "Câu hỏi cho mình", "Điểm sáng", "Câu hỏi", "Một câu cho hôm nay" (đầu thẻ). Bản tiếng Anh nằm cạnh trong `apps/mobile/src/features/share/shareLink.ts` và `shareCardContent.ts`.

## 4. Kiểm tra đã chạy

Đã kiểm chứng (trên máy, không phải trên điện thoại):
- `tsc` app: sạch.
- Toàn bộ test app: **132 bộ, 1163 bài, đều đạt**.
- Test máy chủ `share-events` (Deno): 21 đạt.
- Test trang web chia sẻ: 19 đạt.
- `validate:data`, `validate:backend`: đạt.
- Mã QR: bài kiểm xác nhận mọi ô đen của bộ mã hóa đều được vẽ, có viền trắng 2 ô; địa chỉ dài nhất cho mã ≤45×45 ô, mỗi ô ~4,4–4,9 điểm ảnh trên ảnh 1080. **Chưa** có bài giải mã lại bằng máy quét — phải thử quét thật.

`validate:brand` **báo lỗi có sẵn từ trước, không do PR này**: checksum của `assets/brand/open-reflection/v1/source/geometry.json` (f5ff51…) khác giá trị ghi trong `packages/content/data/brand-identity.json` (6a53f2…). File này giống hệt trên `origin/main` và PR này không sửa nó. Cần một việc riêng để xác định bên nào đúng.

Chưa kiểm chứng:
- Thẻ trên điện thoại thật: bố cục, chữ tràn với câu dài, vùng an toàn Story, màu.
- Quét QR sau khi Facebook nén ảnh.
- Nội dung chữ mới (mục 3) chưa qua rà nội dung.

## 5. Rủi ro và thứ tự đưa lên (mỗi bước cần Owner duyệt riêng)

1. **Deploy lại `share-events`** (thêm `book_quote` và `format`). Trước khi deploy, sự kiện chia sẻ Một câu và mọi sự kiện có `format` sẽ bị máy chủ trả 400 và mất lặng lẽ — việc chia sẻ của người dùng **không** bị chặn.
2. **S1b trang web `/share/quote`** phải lên **trước** khi phát hành bản Android có PR này, vì link và QR của thẻ Một câu trỏ tới trang đó (hiện chưa có).
3. Dựng bản Android và thử trên điện thoại.

Không có migration (metadata là jsonb tự do). Rút lại: revert PR; thẻ cũ vẫn chạy, máy chủ cũ vẫn nhận sự kiện cũ.

## 6. Đường thử cho Owner (sau khi có bản Android)

1. Hôm nay → Lá bài hôm nay → Chia sẻ → chọn "Story 9:16" → xem thẻ than viền vàng, tên tiếng Anh + tiếng Việt, QR.
2. Khám phá → Bản đồ số → Chia sẻ → thẻ teal, số lớn, lưới sáng một ô.
3. Một câu cho hôm nay → "Chia sẻ câu này" → thẻ ngà.
4. Dùng điện thoại khác quét QR trên ảnh đã đăng Facebook.
