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

## 9. Owner đã quyết (28/11/2026)

1. Rút trên web **1 lần/ngày** (phương án B).
2. Công tắc "Kèm ý nghĩa" trong app **mặc định bật**.
3. Link **gửi kèm chiều lá**.
4. Lá người xem tự rút trên web **có hiện nội dung ý nghĩa cơ bản**, kèm nút tải app để xem sâu hơn. Owner lưu ý: phần này phải **có giá trị và khiến người xem thấy đúng**, thì mới gợi được tò mò muốn tìm hiểu sâu hơn.
5. Thứ tự: T1 web → T2 app (cùng bản Android kế tiếp) → T3 sau khi Play công khai.

Owner hỏi thêm: tải app ngay lúc đó thì mở app có xem tiếp được đúng lá đã rút trên web không? Phân tích ở mục 10–11.

## 10. Phần ý nghĩa cơ bản trên web: thế nào là "có giá trị, thấy đúng"

Sự thật về thư viện (đã đo trên `tarot-cards.json`):

- Mỗi chiều lá có **một đoạn ý nghĩa ngắn, trung bình 135 ký tự (khoảng 2 câu)**.
- Phần còn lại của mỗi lá là "giới thiệu" (khoảng 180 ký tự), "chân dung" (khoảng 180 ký tự) và một câu hỏi.

Nghĩa là "phần sâu" trong app **không nằm ở chữ thư viện dài hơn**. Nó nằm ở việc **lá bài được đọc theo chuyện riêng của người đó**, cùng nhật ký và câu hỏi tiếp theo. Nếu hứa "ý nghĩa đầy đủ trong app" mà app chỉ có thêm hai đoạn ngắn, người dùng sẽ thấy bị hụt.

Đề xuất sửa phần web đã viết ở mục 3:

- **Hiện trọn đoạn ý nghĩa của đúng chiều lá** (2 câu), thay cho chỉ câu đầu. Kèm 3 từ khóa và câu hỏi của lá.
  - Trình bày như lời nói với người xem: "Hôm nay lá này gợi với bạn: …".
  - Đó là cái "thấy đúng": ngắn, gần, có câu hỏi để tự nghĩ tiếp.
- **Lời hứa của nút tải app** nói đúng thứ app có mà web không có: "Lá này nói gì về chuyện bạn đang bận tâm? Hỏi lá bài trong app, ghi lại suy nghĩ của bạn." Không hứa "ý nghĩa trọn vẹn" chung chung.
- **Trước khi T1 lên**, rà 156 đoạn ý nghĩa (78 lá × 2 chiều) xem đứng riêng một mình có đủ rõ và ấm không. Dùng quy trình rà nội dung Tarot (`nilaza-tarot-content-qc`). Đoạn nào cụt hoặc khó hiểu khi thiếu ngữ cảnh thì viết lại trước khi lên web.

## 11. Liền mạch web → app: mở app thấy tiếp đúng lá đã rút trên web

**Trả lời ngắn: làm được trên Android**, với điều kiện người xem bấm nút Google Play trên chính trang đó, trên cùng điện thoại. Đây cũng là cách biến "sợ mất lá" thành lý do tải ngay.

### Cách hoạt động (đề xuất)

```
Web: rút lá → lá lưu trong trình duyệt
   │  bấm "Tải Nilaza để hỏi tiếp lá này"
   ▼
Link Google Play kèm "referrer" = mã lá + chiều + ngày + loại trang  (không có gì về người xem)
   │  cài app
   ▼
App mở lần đầu: đọc referrer (Play Install Referrer) → kiểm mã lá có trong thư viện, ngày còn trong 7 ngày
   │
   ▼
Màn đầu tiên, TRƯỚC khi đòi đăng ký: "Lá bạn vừa rút trên web"
   hình lá đúng chiều + ý nghĩa đã thấy + giới thiệu + chân dung lá + câu hỏi
   [Hỏi lá này về chuyện của bạn]  [Ghi lại suy nghĩ]  → lúc này mới mời tạo tài khoản để lưu
   │
   ▼
Lá được giữ trên máy (như lá rút khi chưa đăng nhập hiện nay) → sau khi đăng ký vẫn còn; Trang chủ hôm đó hiện đúng lá này
```

### Điểm then chốt và cách xử lý

| Vấn đề | Cách xử lý đề xuất |
|---|---|
| App đã có sẵn cơ chế tương tự: lá rút khi chưa đăng nhập được giữ sang tài khoản (`guestDraw.ts`, máy chủ giữ lại lá cũ) | Dùng lại cách đó: lá từ web lưu trên máy như một "lá khách". Không làm đường riêng. |
| **Lá bài hôm nay** ở Trang chủ đang tính theo tài khoản và ngày, nên sẽ khác lá web và gây rối | Hôm đó Trang chủ hiện lá web thay cho lá tính sẵn (chỉ ảnh hưởng phần hiển thị). Từ hôm sau trở lại bình thường. |
| **Hỏi AI về lá này:** máy chủ đang tự rút và khóa lá mỗi ngày cho mỗi tài khoản (nguyên tắc "một sự kiện, một câu trả lời"). Nếu máy chủ nhận lá do điện thoại gửi lên, người ta có thể sửa link để tự chọn lá. | **Phương án đề xuất:** việc rút trên web do máy chủ làm. Trang web gọi một hàm máy chủ nhỏ; hàm rút lá và trả về lá kèm một **chữ ký**. App gửi lại chữ ký đó, máy chủ kiểm rồi nhận lá đó là lá rút của ngày. Cần Edge Function mới và một khóa bí mật (Owner duyệt riêng). Chưa làm thì: app vẫn hiện trọn nội dung thư viện của lá web, còn nút "Hỏi lá này" chuyển thành lượt rút thường của app. |
| Người xem không bấm nút trên trang, mà tự tìm app trên Play; hoặc xem trên máy tính rồi cài trên điện thoại | Referrer không có. Phương án dự phòng đơn giản: màn đầu của app hỏi "Bạn vừa rút một lá trên web?" và cho chọn lại lá đó từ 78 lá có hình (người xem vừa thấy hình và tên). Chỉ hiển thị nội dung thư viện, không tính là lá rút trên máy chủ. |
| Người xem đã cài app từ trước | Liên kết mở thẳng app (App Links), mang theo mã lá. Cần đặt tệp xác minh trên website và mã vân tay khóa ký của Play: Owner lấy trong Play Console, vì là cài đặt Play. Làm sau, khi đã có người cài. |
| Mở app sau nhiều ngày | Lá vẫn hiện, nhưng ghi "Lá bạn rút trên web ngày 28/11", không tính là lá hôm nay. Quá 7 ngày thì bỏ. |
| Riêng tư | Referrer chỉ có mã lá, chiều lá, ngày và loại trang. Không có email, tên hay ngày sinh. Cần kiểm lại cách khai báo trong mục An toàn dữ liệu của Play (chưa kiểm). |
| iOS | Không có referrer tương đương. Để sau, khi làm iOS. |

**Chưa kiểm chứng trong phiên này:**

- tài liệu chính thức về Play Install Referrer (độ trễ, thời hạn lưu);
- thư viện đọc referrer cho Expo: `expo-application` hiện **chưa** có trong app.

Cả hai cần kiểm trước khi làm T3. Tất cả phần app ở đây cần bản Android mới.

### Vị trí trong lộ trình

- **T1 (web):** lưu lá đã rút cùng ngày rút trong trình duyệt. Cho sẵn chỗ gắn lá vào link Play: khi Play công khai chỉ cần bật lên.
- **T3 (khi Play công khai):** đây là hạng mục chính.
  - Đọc referrer, hiện màn "Lá bạn vừa rút trên web", giữ lá qua bước đăng ký, Trang chủ hôm đó hiện đúng lá đó.
  - Làm cùng lúc màn dự phòng "chọn lại lá".
  - Rút có chữ ký trên máy chủ, để hỏi AI về đúng lá web: cần Owner duyệt Edge Function và khóa bí mật.
  - Mở thẳng app bằng App Links làm sau cùng.
- **Đo:** số lượt cài có referrer từ trang chia sẻ, và tỉ lệ mở màn "Lá bạn vừa rút" → tạo tài khoản.
