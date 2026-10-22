# Thiết lập recovery: sửa luồng nhập trên Windows

Ngày 17/10/2026. Bổ sung cho hướng dẫn ngày 16/10; đích vẫn là Keys/Recovery trên Google Drive. Không đổi thuật toán, file khóa, quyền lưu trữ hoặc phạm vi cloud.

## Điều đã xác minh

Sau lỗi Owner báo, không có `owner-v1.age`, `.partial`, receipt hoặc probe, và không còn tiến trình Setup. Chưa có khóa bị mất/hỏng được quan sát. Không kết luận người dùng nhập sai vì không quan sát phím hoặc mật khẩu.

Hướng dẫn Ctrl+U trước đây của AI **không đúng trên đường nhập Windows này**. Go x/term được age v1.3.2 sử dụng chỉ xử lý Backspace, CR và LF trong hàm đọc mật khẩu Windows; Ctrl+U có thể trở thành byte của mật khẩu. Đây là nguyên nhân có thể gây không khớp nếu sử dụng, chưa phải bằng chứng Owner đã dùng nó. [Mã nguồn x/term v0.45.0](https://github.com/golang/term/blob/v0.45.0/terminal.go), [mã nguồn terminal age](https://github.com/FiloSottile/age/blob/v1.3.2/internal/term/term.go).

Không thấy hai luồng cùng đọc bàn phím trong script: PowerShell chờ age hoàn tất. age mở console Windows riêng với stdin nhận private key qua pipe. Giữ nguyên đường truyền nhị phân và định dạng mã hóa; không chuyển mật khẩu vào biến môi trường, đối số lệnh, SendKeys hoặc file rõ.

## Owner làm theo năm bước

**Tạm dừng làm lại Setup sau ảnh “Enter trống → Confirm” ngày 17/10.** Hai canary CLI với dữ liệu công khai (gọi age trực tiếp và gọi qua stdin pipe sau Read-Host) đều tạo passphrase tự động và thoát 0. Chưa tái hiện lỗi trong PTY; chưa kết luận nguyên nhân, chưa sửa console mode theo giả thuyết. Phiên Setup chưa hoàn tất đã được đóng; không đọc mật khẩu hoặc xóa file khóa.

**Đính chính bài thử console cổ điển đầu tiên:** receipt ghi lỗi ngay khi mở, trước khi tạo fixture, nên không phải bằng chứng phím Enter thất bại. Probe công khai tái hiện `Get-FileHash` không nạp được khi Windows PowerShell được mở qua process API với môi trường kế thừa. Import manifest Security/Management/Utility đúng `$PSHOME` đã sửa lỗi chuẩn bị này; dùng `IO.Path.Combine` trong bootstrap để tránh phụ thuộc autoload. Kiểm tra không tương tác đã PASS cả qua process trực tiếp và qua conhost. Setup thật vốn đã import module, vì vậy sửa bài thử **chưa chứng minh sửa được lỗi Enter → Confirm ban đầu**. Bản canary mới ghi riêng trạng thái kiểm tra môi trường và mã lỗi không chứa nội dung nhập, chờ tối đa 15 phút cho thao tác Owner.

Bước tiếp theo là bài thử công khai trong console cổ điển mới: cửa sổ có tiêu đề **NILAZA - THU ENTER - KHONG CO KHOA THAT**. **Từ bản sửa ngày 18/10, gõ chữ công khai `BAT_DAU` rồi Enter khi sẵn sàng; bước chuẩn bị này không tính giờ và chưa chạy age.** Sau đó chỉ Enter tại `Enter passphrase`; nếu vẫn hiện `Confirm passphrase`, Enter thêm một lần để kết thúc bài thử và báo kết quả. Không nhập mật khẩu thật; cụm từ ngẫu nhiên trong bài thử chỉ mã hóa câu mẫu công khai, không cần lưu. Script thử không gọi keygen/Setup, không dùng đường dẫn khóa của Owner, chỉ ghi trạng thái và ciphertext mẫu. Không thay thiết lập Terminal mặc định. Chỉ tiếp tục Setup thật sau khi xác minh kết quả bài thử và đưa hướng dẫn phù hợp với host đang dùng.

Ngày 18/10 đọc receipt mới nhất của phiên mở ngày 17/10: `Synthetic canary timeout`, sau khoảng 15 phút 5 giây kể từ metadata launch. Đây là hết thời gian chờ, không phải bằng chứng nhập sai mật khẩu hoặc bàn phím hỏng. Bản sửa bắt đầu timer sau readiness, phân loại riêng `PUBLIC_CANARY_TIMED_OUT` và hiển thị `HET THOI GIAN CHO`; giữ giới hạn 15 phút sau khi bắt đầu và dừng child khi hết giờ. Canary CLI đã xác minh: giới hạn 1 giây không hết trong hơn 10 giây chờ readiness; sau `BAT_DAU` thì timeout được phân loại đúng; luồng `BAT_DAU` rồi Enter trống sinh phrase và thoát 0. Setup thật và crypto không thay đổi, nghiệm thu bàn phím Owner vẫn chờ.

**Cập nhật ngày 18/10: Owner đã hoàn tất bài thử công khai.** Screenshot và receipt `owner-console-result-691a3b01baff426fb5c0edc3ae28d7c3.json` khớp: readiness, Enter trống, phrase tự sinh, exit 0, `PUBLIC_CANARY_ENCRYPTED`. Phrase đó chỉ dùng mã hóa câu mẫu công khai; tuyệt đối không dùng lại làm mật khẩu khóa thật. Kết quả này đủ để mở lại Setup riêng trong cùng loại Console Host; chưa chứng nhận khóa thật hoặc khôi phục mất máy đã hoàn tất.

**Làm rõ sau lần Setup tiếp theo:** Owner xác nhận đã gõ thử mật khẩu tự chọn, tưởng bàn phím không nhận vì không thấy ký tự, rồi nhấn Enter. Ô mật khẩu của age ẩn hoàn toàn, không hiển thị cả `*`; `Confirm passphrase` phù hợp với việc lần đầu đã nhận nội dung và cần nhập lại cùng mật khẩu. Nhấn Enter trống ở lần xác nhận sẽ không khớp. Điều này giải thích lần lỗi mới nhất; không có cơ sở sửa luồng keygen/console theo giả thuyết cạnh tranh bàn phím. Kế hoạch thử pipeline chỉ được chuẩn bị, chưa triển khai và được dừng sau thông tin này. Hướng dẫn trong script được làm rõ: **để tự sinh, không gõ thử hoặc dán bất cứ gì ở dòng đầu; chỉ Enter trống**. Ở bước mở khóa sau đó thì nhập/dán mật khẩu mới dù không thấy ký tự. Kiểm tra cả 5 đường dẫn Owner vẫn phải thực hiện trước khi mở lại.

Các bước bên dưới là luồng Setup thật trong cửa sổ **NILAZA - KHOA THAT - GIU RIENG MAT KHAU**. Từ khi mật khẩu mới xuất hiện, không chụp/gửi màn hình hoặc gửi mật khẩu vào chat:

1. **Chuẩn bị và bắt đầu:** chuẩn bị nơi giữ mật khẩu riêng ngoài Drive, vẫn truy cập được khi mất máy. Tại `BUOC 1/5`, khi sẵn sàng gõ chữ công khai `NILAZA`, phải thấy chữ hiện, rồi Enter. Đây chưa phải ô mật khẩu, không tính giờ chờ. Nếu không nhập được, chuyển bàn phím sang ENG bằng Win+Space; chỉ báo kết quả gõ chữ này, không dùng mật khẩu thật để thử.
2. **Tạo mật khẩu:** tại `Enter passphrase`, chỉ nhấn Enter để age tạo một mật khẩu ngẫu nhiên. Mật khẩu sẽ hiện trong cửa sổ riêng, thường trong dấu ngoặc kép; không chụp/gửi màn hình từ lúc này. Lưu chính xác mật khẩu ngoài Drive, có thể lấy lại khi mất máy. [Tính năng tích hợp của age](https://github.com/FiloSottile/age/blob/v1.3.2/README.md#passphrases).
3. **Thử mở khóa:** dùng đúng mật khẩu mới vừa hiện, không kèm ngoặc kép hoặc khoảng trắng. Trong Console Host hiện tại, nhấp phải thanh tiêu đề → **Edit → Mark**, chọn đúng phần mật khẩu, rồi **Edit → Copy**. Tại lời hỏi mật khẩu, nhấp phải thanh tiêu đề → **Edit → Paste**, chỉ dán một lần rồi Enter. Có thể kéo rộng cửa sổ để dễ chọn đủ cụm từ. Ô nhập không hiện ký tự; không dùng Ctrl+U. Bài thử chỉ giải mã một câu cố định vô hại. Hướng dẫn dùng menu phù hợp Console Host, không phụ thuộc phím riêng của Windows Terminal. [Tài liệu Console của Microsoft](https://learn.microsoft.com/en-us/windows-server/administration/windows-console-changes).
4. **Xác nhận giữ mật khẩu:** sau khi đã lưu ở nơi độc lập, gõ `DA_LUU_RIENG` tại lời hỏi của PowerShell rồi Enter. Chữ ở bước này hiển thị bình thường.
5. **Hoàn tất:** chờ `DA XONG TREN MAY`, Enter để đóng. Thay nội dung clipboard bằng một đoạn chữ không bí mật sau khi lưu mật khẩu. Báo “Đã thiết lập khóa”; AI kiểm receipt/ACL/checksum rồi mới upload ciphertext và kiểm lại bản trên Drive.

Mật khẩu ngẫu nhiên chỉ được hiện trong console riêng do Owner điều khiển; agent không đọc console, clipboard hoặc mật khẩu. Việc hiện này là cần thiết để Owner giữ mật khẩu, không phải cho phép chụp/capture vào chat. Nếu dùng clipboard history/sync, Owner cần xử lý bản lưu theo thiết lập riêng; thay clipboard hiện tại không bảo đảm xóa lịch sử.

## Khi lỗi

Chỉ báo `MA_BUOC` và thông báo không chứa bí mật. Cửa sổ giữ mở đến khi Owner nhấn Enter. Không xóa hoặc ghi đè `.partial` để thử lại; AI kiểm trạng thái trước. Mã bước gồm `KEYBOARD_CHECK`, `ENCRYPT_IDENTITY`, `VERIFY_PUBLIC_RECIPIENT`, `CREATE_PROBE`, `VERIFY_DECRYPTION`, `CONFIRM_CUSTODY`, `FINALIZE_IDENTITY`.

`DA XONG TREN MAY` chỉ chứng nhận tạo khóa và thử mở trên máy. Nó không chứng nhận đã backup lên Drive, phục hồi khi mất máy, khóa Android/API, hay được phép triển khai Singapore/Google Play.

## Kiểm tra kỹ thuật

Chỉ chạy parser và `-Action Plan` trong phiên được agent capture. Không chạy Setup thật qua test harness. Kiểm lại hash script/vendor, guard chống redirected console/transcript, file đã tồn tại và quyền Owner/SYSTEM trước khi mở cửa sổ riêng. Luồng crypto không thay nên giữ bằng chứng crypto trước đây với đúng phạm vi; nghiệm thu nhập thật chờ Owner hoàn tất.
