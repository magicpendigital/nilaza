# Thẻ chia sẻ v2 — biến mỗi lần chia sẻ thành một kênh giới thiệu miễn phí

> Ngày 28/11/2026 · Trạng thái: **đề xuất, chưa code**, chờ Owner chọn hướng.
> Mẫu thiết kế (canvas, riêng tư cho Owner): <https://claude.ai/artifact/Kk7sPYvPm3hWh4kyvdeoCS>.
> Đây là **mẫu vẽ**, không phải ảnh chụp app.
> Liên quan: [SHARE_LANDING_REVIEW_2026-11-24](SHARE_LANDING_REVIEW_2026-11-24.vi.md) (trang đích khi người nhận bấm link).

## 1. Hiện trạng (đã đọc code, chưa thử trên máy)

- App đang có **một mẫu thẻ duy nhất**: nền tối, ảnh 1080×1350 (`apps/mobile/src/features/share/ShareCardView.tsx`).
- Mẫu này dùng cho 5 chỗ chia sẻ: thẻ hôm nay, trải bài Tarot, Big 3, lời mời so sánh cung, Bản đồ số.
- Ảnh được gửi đi kèm một dòng tin nhắn. Link có gắn mã nguồn (`utm_source=share`, `utm_campaign=<chỗ chia sẻ>`), trỏ về `/share` hoặc `/compare`.
- Riêng tư đã được bảo đảm ngay trong cách làm thẻ: câu hỏi, ghi chú, ngày sinh và họ tên **không thể** lọt lên thẻ.
- Còn thiếu:
  - **Mọi tính năng trông giống nhau**, nên người xem không nhận ra mình đang thấy tính năng gì.
  - Không có khổ **Story 9:16**.
  - Không có **mã QR**, mà người xem ảnh trên Facebook hay Zalo thường không bấm được link nằm trong ảnh.
  - Câu mời chưa khớp với từng tính năng.
  - `share-events` chưa nhận `numerology_map`.
  - Trang đích chưa đổi nội dung theo chỗ chia sẻ (xem bản rà 24/11).

## 2. Ý tưởng chính: "Gia đình thẻ Nilaza"

**Khung chung** (giữ nhận diện, giống nhau trên mọi thẻ):

- logo Nilaza;
- câu mời thử, viết riêng cho từng tính năng;
- ô QR dẫn về trang thử trên web;
- địa chỉ `nilaza.magicpendigital.com`;
- dòng "Để tự phản chiếu, không phải dự đoán."

**Bộ da riêng** cho từng tính năng:

| Tính năng | Bộ da | Điểm nhấn kiểu infographic | Câu mời (nháp) |
|---|---|---|---|
| Một câu cho hôm nay | giấy ngà, chữ là chính | dấu ngoặc vàng lớn, nguồn sách, ô câu hỏi | Nhận một câu mỗi sáng từ 5 cuốn sách |
| Bản đồ số | nền teal đêm | số lớn, lưới 3×3, điểm sáng + câu hỏi | Còn bạn là số mấy? Tính trong 10 giây |
| Lá bài hôm nay | nền than, khung vàng | ảnh lá thật, tên tiếng Anh + tên Việt, 3 từ khóa | Bạn rút thử xem lá của bạn là gì? |
| Bầu trời hôm nay | xanh đêm, chấm sao | pha trăng, % sáng, cung Mặt Trăng | Trăng hôm nay ở cung nào? |
| Big 3 | nền than, ba vòng tròn | Mặt Trời · Mặt Trăng · Mọc | Big 3 của bạn là gì? |
| Hợp số (sau này) | hai màu đan nhau | hai số, một chữ chung, không chấm điểm | Hai mình hợp nhau ở điểm nào? |
| Vận 9 / Kinh Dịch (sau này) | giấy ngà, nét mực | quẻ, một câu gợi | Hỏi Kinh Dịch một câu |
| Bói Kiều (sau này) | giấy dó | hai câu Kiều, một câu hỏi | Mở Kiều một trang |

**Hai khổ ảnh:**

- **4:5** (1080×1350) cho bài đăng Facebook và tin nhắn Zalo hay Messenger.
- **9:16** (1080×1920) cho Story Facebook, Instagram, TikTok và Zalo. Logo và QR nằm trong vùng an toàn, không bị thanh Story che.

**Ba phần bắt buộc** trên mọi thẻ:

1. **Nhận ra ngay**: thấy là biết thẻ Nilaza, thuộc tính năng nào.
2. **Lời mời**: một câu khiến người xem muốn thử với chính mình.
3. **Đường vào 10 giây**: QR hoặc link mở trang thử ngay trên trình duyệt, không bắt cài app trước.

## 3. Ý tưởng lan truyền ngân sách thấp

1. **Thẻ tặng người thân.** Ví dụ "Gửi mẹ một câu cho hôm nay". Người nhận mở link và đọc được ngay, không cần tài khoản.
2. **Lịch mùa vụ.** Mẫu thẻ theo dịp: Rằm, Trăng mới, Valentine, Ngày của Mẹ, Tết. Đây là những dịp người Việt hay chia sẻ.
3. **Xuất thẻ hàng loạt từ Admin.** Dùng để đăng fanpage và TikTok: mỗi ngày tự có "Một câu" và "Trăng hôm nay" mà không cần thiết kế tay.
4. **Trang thử trên web cho từng tính năng.** Người nhận tính số chủ đạo hay rút một lá ngay trên trình duyệt, sau đó mới được mời cài app.
5. **Ảnh xem trước (OG) cho từng link.** Khi dán link vào Zalo hay Facebook, ảnh thẻ hiện ra luôn.
6. **Thưởng khi giới thiệu.** Làm sau, cần Owner quyết vì liên quan đến Premium.
7. **Đo lường.** Theo dõi tỉ lệ bấm "chia sẻ" → chia sẻ xong → người nhận mở link → cài app, theo từng tính năng và từng khổ ảnh. Tính năng nào lan tốt thì đầu tư bộ da trước.

## 4. Rào chắn (bắt buộc)

- Không dự đoán, không chấm điểm hay % hợp nhau, không phán "tốt/xấu".
- Không đưa họ tên, ngày sinh, câu hỏi hay nhật ký lên thẻ. Lưới số trên thẻ Bản đồ số chỉ để trang trí, **không** phải chữ số ngày sinh thật.
- Bói Kiều và Vận 9 phải viết theo hướng gợi suy ngẫm.
- Mọi câu chữ mới trên thẻ phải qua `nilaza-content-review`. Riêng chữ trên thẻ Tarot qua `nilaza-tarot-content-qc`.
- Nội dung trên thẻ chỉ lấy từ kho đã duyệt.
- Thẻ Tarot ghi tên tiếng Anh làm tiêu đề, tên tiếng Việt ở dòng nhỏ.
- Màu, phông và bo góc theo `docs/BRAND_GUIDELINES.md`. Tương phản chữ tối thiểu 4.5:1.

## 5. Lộ trình đề xuất

| Bước | Nội dung | Cần duyệt riêng |
|---|---|---|
| S0 | Trang đích theo chỗ chia sẻ (Bước A của bản rà 24/11); thêm `numerology_map` vào `share-events`; thử chia sẻ thật qua Zalo, Messenger và Facebook | deploy Edge Function, deploy web |
| S1 | Khung v2 + khổ 9:16 + QR + 3 bộ da (Một câu, Bản đồ số, Lá bài) + màn chọn khổ ảnh + đo lường | build Android mới |
| S2 | Bộ da Bầu trời, Big 3, Hợp số, Vận 9. Quy tắc: tính năng mới nào cũng phải có thẻ chia sẻ | — |
| S3 | Thẻ tặng, lịch mùa vụ, xuất hàng loạt từ Admin, ảnh OG, thưởng giới thiệu | thưởng giới thiệu: Owner quyết |

Nên làm S1 sau các việc chặn Google Play (P0), vì thẻ mới chỉ tới người dùng qua bản build mới.

## 6. Owner cần quyết

1. Ưu tiên kênh nào trước: Zalo, Facebook hay TikTok? Kênh được chọn sẽ quyết định khổ ảnh làm trước.
2. Có đặt mã QR trên thẻ không? QR giúp người xem ảnh bấm vào được, nhưng chiếm chỗ.
3. Có làm thưởng giới thiệu không, và nếu có thì thưởng gì?
4. Ba mẫu trên canvas đã đúng hướng chưa, cần chỉnh gì?

## 7. Chưa kiểm chứng

- Giả định "người dùng mục tiêu chia sẻ nhiều qua Zalo và Facebook" **chưa có số liệu**: chưa đọc dữ liệu `share-events` thật.
- Chưa thử chia sẻ ảnh thật trên Zalo, Messenger, Facebook và Instagram Story để xem ảnh bị nén hay bị cắt thế nào.
- Vùng an toàn của Story mới ước lượng, chưa đo trên máy.
- Mẫu vẽ ở nửa kích thước, chưa xuất ảnh thật từ app. Ô QR hiện chỉ là chỗ giữ chỗ.
