# Luồng trang mở link chia sẻ Tarot: xem lá của bạn mình → muốn biết lá của mình → tải app

Ngày 28/11/2026. Đề xuất để Owner quyết; **chưa sửa code**. Owner yêu cầu cùng ngày:

- Trang chỉ hiện lá người chia sẻ đã mở, kèm ý nghĩa nếu người chia sẻ chọn.
- Sau đó kêu gọi tải app để biết lá bài nói gì về mình.
- Nếu vẫn cho rút trên web thì chỉ một lần, và phần ý nghĩa trọn vẹn phải tải app mới xem được.

Các bản vẽ trong tài liệu là **bản vẽ mẫu**, không phải ảnh chụp app hay web.

## 1. Hiện trạng (đã kiểm chứng trong code `main` f86460c)

| Phần | Đang làm gì |
|---|---|
| Link app gửi đi (`shareLink.ts`) | Có mã lá `c=<id>` (tối đa 4 lá) + các giá trị `utm_*`. **Không có chiều lá** (xuôi/ngược), không có câu hỏi, không có lời giải AI. |
| Mã QR trên ảnh | Chỉ địa chỉ trang + 3 giá trị `utm`, **không có mã lá**. Người quét QR không thấy lá của bạn mình. |
| Ảnh thẻ chia sẻ | **Đã in sẵn một câu ý nghĩa** (câu đầu của ý nghĩa lá) cho mọi lần chia sẻ. Người chia sẻ chưa có lựa chọn bật/tắt. |
| Trang web `/vi/share/card` và `/reading` | Hiện lá của bạn mình (hình, tên, 3 từ khóa, câu hỏi của lá). Lá luôn hiện xuôi. Sau đó nút "Rút lá của bạn" **rút không giới hạn** ("Rút lá khác"). Mỗi lá rút hiện tên, từ khóa và câu hỏi. |
| Nút kêu gọi | Play chưa công khai nên là **đăng ký chờ bản Android** (email). Khi Owner điền địa chỉ Play vào `shareCta.ts`, mọi trang tự đổi sang nút Google Play. |
| Lời nhắn gửi kèm link | "Bạn rút thử xem lá của bạn là gì?" Đây là lời hứa trang đích phải giữ (bài học từ đánh giá 24/11). |

## 2. Người xem là ai, họ cần gì

Người mở link phần lớn là **bạn bè của người dùng Nilaza**, mở từ Facebook, Zalo hay Messenger trên điện thoại, trong vài giây rảnh. Họ thích Tarot hay tự soi chiếu nhưng chưa biết Nilaza (giả định từ kênh chia sẻ; chưa có số liệu người xem).

| Họ đang nghĩ | Trang nên làm |
|---|---|
| "Bạn mình rút được lá gì?" (tò mò về bạn) | Hiện ngay lá của bạn mình, lớn và đẹp, ở màn hình đầu. |
| "Còn mình thì sao?" (tò mò về mình) | Đây là lúc kêu gọi. Đừng trả lời trọn trên web: để lại một khoảng trống mà app lấp. |
| "App này có đáng tin, có đòi gì của mình không?" | Một dòng: Tarot để tự soi chiếu, không dự đoán; không cần ngày sinh; miễn phí tải. |
| Không muốn cài app ngay | Một lối nhẹ: rút một lá trên web (chỉ một lần), hoặc để lại email khi chưa có Play. |

Nguyên tắc: **trang web là trailer, app là phim**. Web cho thấy đủ để thèm, app giữ phần có giá trị lâu dài: ý nghĩa đầy đủ, câu hỏi của bạn, nhật ký, lời giải theo tình huống.

## 3. Luồng đề xuất

```
Mở link (từ bài đăng, tin nhắn hay QR)
   │
   ▼
① LÁ CỦA BẠN MÌNH           hình lá đúng chiều + tên + 3 từ khóa
   │                         + 1 câu ý nghĩa (chỉ khi người chia sẻ bật "Kèm ý nghĩa")
   ▼
② CÂU HỎI CHUYỂN Ý          "Còn lá bài đang chờ bạn hôm nay là gì?"
   │
   ├──► [Tải Nilaza để rút lá của bạn]        nút chính (Play; trước khi có Play là đăng ký email)
   │
   └──► [Rút thử một lá ở đây]                nút phụ, chỉ một lần mỗi ngày trên máy này
            │
            ▼
③ LÁ CỦA BẠN (trên web)     hình lá + tên + 3 từ khóa + câu hỏi của lá
   │                         ý nghĩa: một câu đầu, phần còn lại mờ đi
   │                         "Đọc trọn ý nghĩa, ghi lại suy nghĩ và hỏi tiếp trong app"
   ▼
④ [Tải Nilaza / Đăng ký]    nhắc lại nút chính; không còn nút "Rút lá khác"
   Quay lại trong ngày → thấy lại đúng lá đã rút, không rút lại được.
```

Chi tiết từng bước:

1. **Lá của bạn mình.** Hiện đúng chiều lá: lá ngược thì xoay ảnh và ghi "Ngược".
   - Ý nghĩa là văn bản thư viện cho chiều đó (câu đầu của ý nghĩa xuôi hay ngược). Chỉ hiện khi link có cờ "kèm ý nghĩa".
   - Với trải bài: hiện các lá theo vị trí (ví dụ "Quá khứ · Hiện tại · Tương lai"). Mỗi lá chỉ có tên và chiều. Ý nghĩa nếu được bật là một câu cho mỗi lá.
   - **Không bao giờ** hiện câu hỏi người chia sẻ đã gõ hay lời giải AI (lời giải viết theo câu hỏi riêng của họ).
2. **Câu chuyển ý.** Một dòng lớn: "Còn lá bài đang chờ bạn hôm nay là gì?" Nó nối thẳng vào lời nhắn người chia sẻ đã gửi ("Bạn rút thử xem lá của bạn là gì?").
3. **Nút chính: tải app.**
   - Khi có Play: "Tải Nilaza để rút lá của bạn", kèm một dòng "Miễn phí tải · Không cần ngày sinh để rút bài". Dòng "miễn phí" chỉ in nếu đúng với bản phát hành.
   - Trước khi có Play: "Đăng ký thử bản Android", giữ như hiện nay.
4. **Nút phụ: rút một lá trên web.** Chỉ một lần mỗi ngày trên trình duyệt đó.
   - Lá rút được lưu trên máy (bộ nhớ trình duyệt). Mở lại trong ngày thì thấy lại đúng lá đó.
   - Điều này giống "Lá bài hôm nay" trong app, nên nhất quán và dễ giải thích: "Mỗi ngày một lá".
5. **Ý nghĩa bị giới hạn trên web.** Chỉ câu đầu của ý nghĩa và câu hỏi của lá. Phần còn lại trong app gồm:
   - giới thiệu lá, chân dung lá;
   - ý nghĩa đủ cả hai chiều;
   - ghi nhật ký;
   - hỏi tiếp theo câu hỏi của chính mình.

   Trên web không giấu chữ thật dưới lớp mờ: trang chỉ chứa câu đầu, khối mờ là hình trang trí. Như vậy không ai "mở khóa" được bằng cách xem mã trang, và không có cảm giác bị lừa.

## 4. Vì sao chọn "rút 1 lần" thay vì bỏ hẳn nút rút trên web

| Phương án | Ưu | Nhược |
|---|---|---|
| A. Bỏ hẳn rút trên web, chỉ có nút tải app | Đơn giản, đẩy thẳng về app. | Người chưa muốn cài app thì rời trang ngay. Lời nhắn "Bạn rút thử xem…" bị hụt. Trước khi có Play thì không có gì để thử. |
| **B. Rút 1 lần/ngày, ý nghĩa rút gọn (đề xuất)** | Người xem đã "có lá của mình" nên muốn biết thêm. Đây là lý do mạnh nhất để cài app. Giữ lời hứa của lời nhắn. Không tốn gì của máy chủ. | Giới hạn chỉ là "mềm": xóa dữ liệu trình duyệt hay mở ẩn danh là rút lại được. Không sao, vì đây là phép lịch sự của trải nghiệm, không phải bảo mật. |
| C. Giữ như hiện nay (rút không giới hạn) | Vui, không rào cản. | Rút đến chán thì không còn lý do tải app. Rút nhiều lần làm mất cảm giác "lá này dành cho mình". |

**Theo giai đoạn:**

- **Trước khi Play công khai:** không có app để tải. Nếu khóa ý nghĩa sau một app chưa tải được thì người xem thấy bị đánh đố. Giai đoạn này nên cho rút 1 lần và hiện câu đầu ý nghĩa như trên. Nút chính là đăng ký email: "Nhận tin khi bản Android mở, để đọc trọn ý nghĩa lá của bạn."
- **Khi Play công khai:** bật nút Google Play (một dòng cấu hình đã có sẵn). Luồng giữ nguyên.

## 5. Nối từ web sang app (giai đoạn sau, cần kiểm tra kỹ thuật)

- **Đo được ai cài app từ link chia sẻ.** Google Play cho gắn `referrer` vào link cửa hàng, và app đọc được lúc mở lần đầu (Play Install Referrer). Cần kiểm lại tài liệu chính thức và gói thư viện trước khi làm; **chưa kiểm chứng** trong phiên này.
- **Mang lá đã rút trên web vào app.** Cách duy nhất không cần tài khoản là gắn mã lá vào `referrer`. Khi mở app lần đầu, app hiện "Lá bạn đã rút trên web: …" và mở trọn ý nghĩa. Đây là điểm nối mạnh nhất nhưng phức tạp nhất, nên để sau khi Play công khai.
- **Liên kết mở thẳng app** (App Links: link web mở app nếu đã cài). Cần tệp xác minh trên website và cấu hình app. Chỉ có ích khi đã có nhiều người cài, nên để sau.

## 6. Thay đổi cần làm (khi Owner duyệt)

**Bước T1: trang web.** Làm và triển khai được trước, không cần bản app mới.

- Đọc thêm chiều lá và cờ "kèm ý nghĩa" từ link. Link cũ không có hai giá trị này thì hiện như nay: lá xuôi, không ý nghĩa.
- Đổi khối rút: một lần mỗi ngày, lưu lá trong trình duyệt, bỏ "Rút lá khác". Thêm câu đầu ý nghĩa cùng khối "Đọc trọn trong app".
- Thêm câu chuyển ý và đổi thứ tự nút: tải app/đăng ký là chính, rút thử là phụ.
- Thêm sự kiện `share_cta_click` (chỉ giá trị liệt kê: `play` hoặc `waitlist`, cùng loại trang). Hiện chưa có sự kiện này nên chưa đo được bước "bấm nút".
- Cập nhật mô tả xem trước link (Zalo, Messenger). Câu hiện tại ghi "tự rút một lá ngay trên trình duyệt", vẫn đúng với phương án B.

**Bước T2: app.** Cần bản Android mới.

- Bảng chia sẻ thêm công tắc **"Kèm ý nghĩa lá bài"**. Công tắc điều khiển cả hai: câu ý nghĩa in trên ảnh và cờ trong link. Hiện nay ảnh luôn in câu ý nghĩa.
- Link gửi kèm chiều lá. Mã lá và chiều lá là nội dung thư viện công khai, không nói gì về người gửi ngoài lá họ đã chọn chia sẻ.

**Bước T3: sau khi Play công khai.** Gồm `referrer` Play và mang lá từ web vào app (mục 5).

**Đo kết quả** (so theo loại trang, trước và sau T1):

- mở link → bấm "Rút thử" → bấm nút chính → đăng ký hoặc cài app.
- Chưa có số nền: cần xem số liệu `share_link_opened` và `share_landing_try` hiện có trước khi đổi. Không hứa mức tăng.

## 7. An toàn và quyền riêng tư

- Link chỉ mang mã lá, chiều lá, cờ ý nghĩa và `utm`. Không có tên, ngày sinh, câu hỏi, ghi chú hay lời giải AI. Cờ ý nghĩa chỉ bật văn bản thư viện công khai, nên ai sửa link cũng không lộ gì thêm.
- Chữ trên trang là văn bản thư viện đã duyệt. Giọng tự soi chiếu, không dự đoán. Không đếm ngược, không ép "chỉ còn hôm nay".
- Lá rút trên web chỉ nằm trong trình duyệt của người xem và không gửi đi đâu. Sự kiện đo lường chỉ có giá trị liệt kê.

## 8. Owner cần quyết

1. **Phương án rút trên web:** B, rút 1 lần/ngày, ý nghĩa rút gọn (đề xuất); hay A, bỏ hẳn; hay C, giữ như cũ.
2. **Công tắc "Kèm ý nghĩa" trong app:** mặc định **bật** (giống hiện nay, ảnh vẫn có câu ý nghĩa) hay **tắt**. Đề xuất: bật, vì người dùng đã quen và câu đó làm ảnh đẹp hơn.
3. **Gửi kèm chiều lá trong link** (để web hiện đúng lá ngược): đề xuất **có**.
4. **Trước khi có Play:** cho hiện câu đầu ý nghĩa của lá người xem tự rút (đề xuất có), hay khóa luôn.
5. **Thứ tự làm:** T1 (web) trước, T2 (app) đi cùng bản Android kế tiếp, T3 sau khi Play công khai.
