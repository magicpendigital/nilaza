# Thẻ chia sẻ và lời mời so bản đồ sao — bàn giao (12/11/2026)

Trạng thái: **đã viết code và kiểm thử cục bộ; chưa dựng bản Android, chưa thử trên điện thoại, chưa merge, chưa deploy.** Tài liệu này không cho phép chạy SQL, deploy hàm hay phát hành.

## 1. Đã làm gì

| Bề mặt | Trước | Sau |
|---|---|---|
| Lá bài hôm nay (Home) | Nút chia sẻ gửi một đoạn chữ | Mở màn "Chia sẻ" với **thẻ ảnh 1080×1350**, nút **Chia sẻ ảnh** và **Gửi kèm link** |
| Kết quả trải bài (Tarot) | Chia sẻ đoạn chữ từ màn xem trước | Cùng màn "Chia sẻ"; thẻ có 1–3 lá, tên vị trí và một câu thông điệp |
| Astrology | Chỉ có "Chia sẻ tệp sao lưu" (dữ liệu sinh riêng tư, giữ nguyên) | Thêm **Chia sẻ thẻ của bạn** (Big 3) và **Mời bạn so bản đồ sao** trên thẻ "Bầu trời của bạn" |
| Web | Chưa có trang nhận link | Hai trang công khai: `/vi/share`, `/vi/compare` (và `/en/...`) |

Người nhận link vào trang web, **không** vào app (app chưa có xử lý link vào, và chưa lên Google Play).

## 2. Dữ liệu nào được và không được rời máy

Được in trên thẻ hoặc đưa vào link: tên lá bài và hình lá (thư viện công khai), tên vị trí trong trải bài, một câu thông điệp, tên cung Mặt Trời/Mặt Trăng/Cung mọc (chỉ cung chắc chắn), mã ngẫu nhiên 8 ký tự không liên quan tài khoản.

**Không bao giờ:** câu hỏi, ghi chú, tâm trạng, ngày/giờ/nơi sinh, tên người dùng. Các hàm dựng thẻ chỉ nhận đúng các trường được phép, có test với đầu vào cố tình chứa dữ liệu riêng tư. Trang `/compare` xử lý ngày sinh của người nhận **ngay trong trình duyệt**; kiểm tra thực tế cho thấy không có yêu cầu mạng nào mang ngày đó.

## 3. Bốn sự kiện đo lường

| Sự kiện | Ở đâu | Ghi ở đâu hiện nay |
|---|---|---|
| `share_tapped` | App | Bộ ghi sự kiện cục bộ (tối đa 80 mục trên máy) |
| `share_completed` | App | Như trên. Nghĩa là "bảng chia sẻ của hệ điều hành đã trả về", **không** chứng minh tin đã gửi (Android không báo) |
| `share_link_opened` | Web | Hàm phân tích công khai (Zaraz nếu đã cấu hình) |
| `signup_from_share` | Web | Như trên, khi đăng ký danh sách chờ bắt đầu từ link chia sẻ. Danh sách chờ **đã lưu sẵn mã UTM** (`utm_source=share`), nên đếm được từ dữ liệu hiện có |

**Chưa làm:** đưa hai sự kiện của app lên máy chủ. Bảng `usage_events` đã đóng quyền ghi từ app, nên cần một hàm và/hoặc migration mới. Việc này cần Owner duyệt (SQL, deploy) và nên đi cùng gói Singapore. Cho tới lúc đó, số lượt chia sẻ chỉ xem được trên từng máy.

## 4. Giới hạn đã biết (cần nói thẳng)

1. **Android không gửi được ảnh kèm link trong một thao tác.** Vì vậy có hai nút: *Chia sẻ ảnh* (ảnh có in địa chỉ `nilaza.magicpendigital.com`, không có mã theo dõi) và *Gửi kèm link* (đoạn chữ + link có mã theo dõi). Muốn một chạm cần thêm thư viện sao chép (clipboard) hoặc đổi cách chia sẻ.
2. **Chưa kiểm chứng trên máy thật:** chụp thẻ bằng `react-native-view-shot` trên kiến trúc mới (Fabric), bảng chia sẻ Android, dọn tệp tạm. Thư viện cần **bản dựng native mới**; cần Owner duyệt lần dựng tiếp theo.
3. **Không đo được "cài đặt từ link"** cho tới khi app lên Google Play và có cơ chế install referrer. Hiện chuyển đổi thật là "đăng ký danh sách chờ".
4. Cung Mặt Trời trên web tính theo ngày chuyển cung phổ biến; ngày sát ranh giới có thể khác app (app tính theo vị trí thiên văn thật). Trang đã ghi chú điều này.
5. Hình lá bài chỉ có trên thẻ ảnh trong app; trang web hiện chỉ hiện **tên** lá (chưa có ảnh web đã tối ưu, tránh đưa tệp tranh nặng lên web).

## 5. Phiên bản và phụ thuộc

`react-native-view-shot` **4.0.3** (MIT), cài bằng `expo install` để Expo SDK 54 chọn bản tương thích; ghi trong `package-lock.json`. Không thêm phụ thuộc nào khác. Cần dựng lại native trước khi thử trên máy.

## 6. Cách Owner thử (sau khi có bản dựng mới)

1. Home → mở lá bài hôm nay → biểu tượng chia sẻ → thấy thẻ ảnh; bấm **Chia sẻ ảnh** gửi sang Zalo/Messenger; bấm **Gửi kèm link** gửi đoạn chữ + link.
2. Tarot → rút bài → Chia sẻ → thẻ có đúng 1–3 lá, **không** có câu hỏi của bạn.
3. Astrology → "Chia sẻ thẻ của bạn" và "Mời bạn so bản đồ sao" (cần đã có lá số).
4. Mở link trên máy khác: trang `/compare` hiện lời mời; nhập ngày sinh → thấy hai cung và đoạn nội dung đã duyệt, không có điểm số.
5. Kiểm tra mọi thẻ/link: không có câu hỏi, ghi chú, ngày sinh.

## 7. Kiểm thử đã chạy (12/11/2026, Windows, Node 26)

- `npm run mobile:check` (tsc): sạch.
- Jest toàn bộ mobile: **469/469 test, 89 bộ** (có 21 test mới cho chia sẻ).
- `node --test scripts/share-landing.test.mjs`: **9/9** (mọi ranh giới cung, mọi cặp nguyên tố có nội dung đã duyệt, danh sách cho phép sự kiện).
- `npm run web:check`: 0 lỗi; `npm run web:build`: đạt (46 trang, tương thích Safari/iOS 15).
- Chạy thử hai trang trong trình duyệt: kết quả đúng; tham số độc hại, ngày rỗng và ngày không tồn tại được xử lý an toàn; không có yêu cầu mạng nào mang ngày sinh.
- `validate:data`, `mobile:release:config:check`: đạt.
- `validate:public-content`: báo "public help corpus ... stale" — **lỗi có sẵn**, tái hiện trên bản checkout sạch của commit `033fb86`, không do thay đổi này.

## 8. Việc cần Owner quyết định / duyệt

1. Duyệt lần dựng native tiếp theo (thư viện mới) để thử trên Air1 Ultra.
2. Duyệt bước riêng: đưa `share_tapped`/`share_completed` lên máy chủ (hàm + SQL).
3. Quyết định có muốn thêm sao chép clipboard để chia sẻ ảnh + link trong một thao tác không.
4. Skill `nilaza-plan-qc` đã cài trên máy (thư mục Codex) **mới hơn** bản trong repo (nhắc `PLAN.md` và `docs/backlog/review-2026-10-30.json`); cần đối chiếu và đưa bản mới vào repo. Trong lần làm này, kiểm tra skill được chạy trên một thư mục tạm; skill thật của bạn không bị sửa.
