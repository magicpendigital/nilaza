# Kiểm tra máy chủ khi mở app và đưa nội dung lên máy chủ (đề xuất 27/11/2026)

Trạng thái: **Owner duyệt kế hoạch 28/11/2026, chưa code.** Owner đồng ý hướng đi ngày 27/11/2026 (chat): khách cũng đọc bảng công tắc Miễn phí/Premium; mở app phải kiểm tra máy chủ, cho đọc nhật ký và nội dung đã tải trong 24 giờ, AI luôn cần mạng; lập kế hoạch đưa nội dung Nilaza tự viết lên máy chủ, bắt đầu từ phần tự viết.

## Hiện trạng (đọc mã 27/11, chưa thử trên máy)

- Mở app: khôi phục phiên đăng nhập trên máy (`useAccountSession`), rồi vào app. **Không** hỏi máy chủ trước, **không** có kiểm tra phiên bản tối thiểu, **không** có màn “Mất kết nối” chung; mất mạng chỉ báo lỗi ở từng tính năng AI.
- App chưa có thư viện dò mạng (NetInfo); hiện chỉ biết mất mạng khi một lần gọi thất bại.
- Khách chưa đăng nhập: thấy màn chào/đăng nhập; nếu bật “xem thử” thì xem 78 lá Tarot, 12 cung và rút 1 lá qua máy chủ.
- Nhật ký lưu trên máy trước, đồng bộ lên máy chủ khi có mạng (đã có hàng đợi).
- Nội dung soạn sẵn nằm **trọn trong app** (khoảng 2,3 MB JSON): câu sách 456 KB, Tarot ~560 KB, Chiêm tinh ~300 KB, Bản đồ số 66 KB, hồ sơ người dẫn ~120 KB. Ai giải nén tệp cài đặt cũng lấy được hết.
- Máy chủ đã có sẵn bảng “gói nội dung” do Admin phát hành (`admin_content_bundles`, `get_published_content_bundle`) nhưng app chưa dùng; hiện chỉ chứa người dẫn và bộ bài.

## Việc 1 — Kiểm tra máy chủ khi mở app

**Luồng:**
1. Mở app → gọi một hàm máy chủ duy nhất “khởi động” (mới) trả về: phiên bản app tối thiểu, bảng công tắc Miễn phí/Premium đang phát hành, tình trạng tài khoản (hoặc “khách”), thời gian máy chủ.
2. Trả lời được → lưu “lần kiểm tra thành công” kèm giờ, vào app.
3. Bản app cũ hơn mức tối thiểu → lời nhắc cập nhật (nút mở Google Play), vẫn dùng tiếp trong số ngày Owner đặt; quá hạn mới hiện màn “Cần cập nhật”.
4. Không trả lời được (mất mạng, máy chủ lỗi, quá 8 giây):
   - lần kiểm tra thành công gần nhất **còn trong 24 giờ** → vào app ở **chế độ ngoại tuyến**: đọc/viết nhật ký, đọc nội dung đã tải; mọi tính năng AI và tính năng cần máy chủ hiện “Cần kết nối mạng”;
   - **quá 24 giờ hoặc chưa từng kiểm tra** → màn “Mất kết nối – Thử lại”, không vào được tính năng nào.
5. Khi app trở lại từ nền: kiểm tra lại nếu lần trước đã quá 5 phút.

**Phần việc:** hàm máy chủ `app-bootstrap` (không cần đăng nhập, chỉ trả cấu hình công khai, có giới hạn tần suất); bảng/cấu hình “phiên bản tối thiểu” sửa được trong Admin (chỉ Owner phát hành); thêm thư viện dò mạng vào app; màn “Mất kết nối”, “Cần cập nhật”, dải “Đang ngoại tuyến”; nối công tắc Miễn phí/Premium vào 5 tính năng (việc đang thiếu).

**Rủi ro và cách giảm:** máy chủ lỗi là chặn mọi người mới mở app → hàm phải rất nhẹ, có theo dõi lỗi; người duyệt Google Play có thể thử khi tắt mạng → màn báo lỗi rõ ràng, có nút thử lại; quy tắc 24 giờ dựa vào giờ máy nên người dùng chỉnh đồng hồ có thể kéo dài → chấp nhận (chỉ mở nội dung đã có trên máy, không mở AI).

**Cần Owner duyệt riêng:** SQL (nếu thêm bảng phiên bản tối thiểu), deploy `app-bootstrap`, bản build Android mới.

## Việc 2 — Nội dung Nilaza tự viết lên máy chủ

**Mục tiêu đúng mức:** chặn việc giải nén tệp cài đặt để lấy trọn kho nội dung. **Không** chặn tuyệt đối được: chữ đã hiện trên màn hình thì người quyết tâm vẫn chép được.

**Nguyên tắc:**
- Chỉ đưa lên máy chủ phần **Nilaza tự viết** (lời bình, câu hỏi soi chiếu, lời đọc Bản đồ số, nghĩa Tarot do Nilaza soạn, lời Chiêm tinh). Câu gốc phạm vi công cộng vẫn có thể để trong app.
- **Tải theo nhu cầu:** ví dụ chỉ câu sách của hôm nay, lá vừa rút, ô Bản đồ số đang xem — không tải trọn bộ.
- **Giới hạn tần suất** theo thiết bị/tài khoản để không ai kéo hết kho bằng máy.
- **Lưu đệm trên máy** những gì đã tải để dùng trong 24 giờ ngoại tuyến (khớp Việc 1).
- Admin sửa và phát hành nội dung trên máy chủ (dùng lại bảng gói nội dung đã có), giữ quy trình duyệt nội dung hiện nay.
- Lớp pháp lý: điều khoản sử dụng nêu bản quyền nội dung, lưu bằng chứng ngày tạo (lịch sử Git + biên bản duyệt).

**Thứ tự đề xuất:** (1) câu sách “Một câu cho hôm nay” (mới, nhỏ, dễ thử); (2) lời đọc Bản đồ số; (3) nghĩa Tarot và lớp bài đọc; (4) lời Chiêm tinh. Mỗi bước là một lô riêng: migration + hàm phát nội dung + app tải/lưu đệm + gỡ nội dung khỏi gói app.

**Cái giá:** tốn thêm lưu lượng máy chủ; app chậm hơn lần đầu mở nội dung; nhiều bước cần Owner duyệt SQL/deploy; mỗi lô cần bản build Android mới.

## Thứ tự làm

1. Việc 1 trước (nó là nền cho chế độ ngoại tuyến 24 giờ và cho công tắc áp đúng với khách).
2. Việc 2, lô câu sách, sau khi Việc 1 chạy ổn trên máy thử.

Mỗi việc lập hồ sơ `docs/feature-plans/*.json` và chạy kiểm tra trước khi code.

## Owner đã quyết (28/11/2026)

- Duyệt kế hoạch: Việc 1 trước, Việc 2 bắt đầu từ câu sách.
- Giữ mức **24 giờ** ngoại tuyến.
- App cũ hơn phiên bản tối thiểu: **cho dùng tiếp vài ngày kèm lời nhắc** cập nhật (không chặn ngay). Số ngày cho dùng tiếp đặt trong Admin cùng phiên bản tối thiểu; sau hạn đó mới hiện màn “Cần cập nhật”.
