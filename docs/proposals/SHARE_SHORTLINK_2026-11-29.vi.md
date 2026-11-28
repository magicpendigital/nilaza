# Link chia sẻ ngắn: phương án (29/11/2026)

Owner hỏi 28/11: link chia sẻ dài làm người cẩn thận về bảo mật ngại bấm vì sợ lừa đảo. Đây là tài liệu nghiên cứu, **chưa có code**.

## 1. Link hiện tại trông thế nào

Lá bài hôm nay, sau T1/T2 (có chiều lá và ý nghĩa):

`https://nilaza.magicpendigital.com/vi/share/card?c=major-00-fool&o=1&m=1&utm_source=share&utm_medium=card&utm_campaign=today_card`

Khoảng 130 ký tự. Trải 3 lá dài hơn nữa.

Phần gây ngại không phải tên miền. Phần gây ngại là đuôi `?c=…&utm_…`, vì nó trông giống link theo dõi hoặc link quảng cáo.

## 2. Người cẩn thận tin một link khi nào

1. **Thấy rõ tên miền thật** của thương hiệu, không bị che.
2. **Ảnh xem trước đẹp, đúng nội dung** khi dán vào Zalo hoặc Messenger (tiêu đề, mô tả, ảnh lá bài). Đây là dấu hiệu tin cậy mạnh nhất trong tin nhắn.
3. **Ngắn, không có chuỗi lạ.**

Dịch vụ rút gọn của bên thứ ba (bit.ly, tinyurl…) **làm mất điểm 1**. Kẻ lừa đảo hay dùng chúng chính vì chúng che địa chỉ thật. Nhiều người và một số bộ lọc tin nhắn coi các link này là đáng ngờ.

## 3. Các phương án

| | A. Đường dẫn ngắn trên tên miền hiện có | B. Mua thêm một tên miền ngắn riêng | C. Dịch vụ rút gọn bên thứ ba |
|---|---|---|---|
| Ví dụ | `nilaza.magicpendigital.com/c/00r1` | `<tên-ngắn>/c/00r1` (ví dụ dạng `nlz.vn`, chưa kiểm tra còn trống) | `bit.ly/3xYz…` |
| Độ dài | khoảng 38 ký tự | khoảng 15–20 ký tự | khoảng 20 ký tự |
| Thấy rõ thương hiệu | Có | Có, nếu tên gợi Nilaza | **Không** |
| Ảnh xem trước | Giữ nguyên | Giữ, nếu chuyển thẳng về trang Nilaza | Phụ thuộc dịch vụ |
| Riêng tư | Không qua bên thứ ba | Không qua bên thứ ba | Bên thứ ba thấy mọi lượt bấm |
| Chi phí | 0 | Tiền tên miền hằng năm + cài DNS | Thường có phí cho tên miền riêng |
| Cần Owner | Duyệt deploy web như mọi lần | Mua tên miền, cài DNS/Cloudflare (Owner tự làm) | Tạo tài khoản dịch vụ |
| Phụ thuộc mạng | Không | Không | Dịch vụ ngừng thì link chết |

**Đề xuất: làm A trước. Cân nhắc B khi chuẩn bị ra mắt công khai. Không dùng C.**

## 4. Cách làm phương án A

### Mã ngắn trong đường dẫn

- Lá bài hôm nay: `/c/<mã>`. Trải bài: `/r/<mã>`. Bản tiếng Anh: `/en/c/<mã>`.
- **Mã:** mỗi lá gồm 2 ký tự cho số thứ tự lá (0–77, hệ 36) và 1 ký tự cho chiều (`0` xuôi, `1` ngược). Thêm `m` ở cuối khi kèm ý nghĩa.
  - Ví dụ Kẻ Khờ ngược, có ý nghĩa: `/c/001m`.
  - Trải 3 lá: `/r/001…0a0…1k1m`, khoảng 10 ký tự.
- **Nguồn:** thêm ký tự `q` ở cuối mã khi link nằm trong mã QR trên ảnh. Nhờ vậy số liệu vẫn tách được link gửi tay và QR mà không cần `utm_…`.
- **Thứ tự lá** lấy theo một danh sách cố định có kiểm thử ở cả app lẫn web. Thêm lá mới thì chỉ thêm vào cuối danh sách, để link cũ không đổi nghĩa.

### Trên máy chủ web (Cloudflare Pages)

Đã đọc tài liệu chính thức ngày 29/11/2026 tại `developers.cloudflare.com/pages/configuration/redirects/`.

- Tệp `_redirects` hỗ trợ **mã 200** (giữ nguyên địa chỉ trên thanh trình duyệt, phục vụ trang khác trên cùng site). Ví dụ: `/c/* /vi/share/card 200`.
- Trang `card` đọc mã từ đường dẫn rồi giải ra lá, chiều và cờ ý nghĩa, theo cùng cách T1 đang đọc `?c=&o=&m=`. Mã chỉ được nhận ở dạng cho phép (danh sách lá cố định, ký tự 0/1). Không có gì từ link được đưa vào trang dưới dạng mã HTML.
- Giới hạn: 100 luật động, đủ dùng vì chỉ cần khoảng 6 luật. Tham số `?…` của yêu cầu không dùng được để so khớp luật, và phương án này cũng không cần đến chúng.
- Link dài hiện có **vẫn chạy**: không có link cũ nào bị hỏng.

### Trong app

`buildShareUrl` tạo link ngắn thay cho link dài. QR trên thẻ cũng dùng link ngắn, nên QR thưa ô hơn và dễ quét hơn.

### Ảnh xem trước

Không đổi. Mỗi loại trang đã có tiêu đề, mô tả và ảnh riêng. Ảnh xem trước theo từng lá là việc sau và không bắt buộc.

## 5. Rủi ro và chưa kiểm chứng

- **Chưa kiểm chứng:** việc trang tải đúng khi dùng mã 200 qua `_redirects` trên Cloudflare Pages thật (cần một lần deploy thử). Zalo/Messenger hiện ảnh xem trước của link ngắn (cần thử trên máy thật).
- Bản app cũ vẫn tạo link dài. Hai dạng link cùng tồn tại, và web hiểu được cả hai.
- Phương án B chỉ còn là chuyện tên miền: đường dẫn `/c/<mã>` giữ nguyên.

## 6. Owner cần quyết

> **Owner đã chốt 29/11/2026:** đồng ý **phương án A** (đường dẫn ngắn trên tên miền hiện có). Làm cùng T2. Phương án B chưa quyết.

1. Đồng ý **phương án A** (đường dẫn ngắn trên tên miền hiện có) không?
2. Có muốn tìm hiểu **mua tên miền ngắn** (phương án B) cho giai đoạn ra mắt không? Nếu có, tôi sẽ lập danh sách tên còn trống và giá. Việc mua và cài đặt do Owner tự làm.
3. Thứ tự đề xuất: làm cùng **T2** (app gửi chiều lá và cờ ý nghĩa), vì cùng phải sửa `buildShareUrl`. Như vậy không phải phát hành hai bản app.
