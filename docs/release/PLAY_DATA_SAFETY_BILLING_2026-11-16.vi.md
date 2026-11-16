# Play Console: An toàn dữ liệu và trang cửa hàng cho gói Premium (16/11/2026)

Tài liệu này để **Owner tự điền** trong Play Console khi mở bán gói Premium trên Android. Agent không đăng nhập và không sửa Play Console.

Mọi câu trả lời dưới đây phải khớp với [Chính sách quyền riêng tư](../../apps/web/src/content/legal/vi/privacy.md), [Điều khoản](../../apps/web/src/content/legal/vi/terms.md) và trang [Xóa tài khoản](../../apps/web/src/content/legal/vi/account-deletion.md), bản cập nhật ngày 16/11/2026. Khi cần đối chiếu, đọc thêm hai tài liệu sau:

- `docs/release/GOOGLE_PLAY_ROADMAP_AND_UX_REVIEW_2026-10-23.vi.md`, phần gói đăng ký.
- `docs/release/singapore-backend-readiness-2026-10-25/02_ACCOUNT_DELETION.vi.md`.

## 1. Nguồn đã đọc (ngày 16/11/2026)

- RevenueCat, trang "Google Play's Data Safety": <https://www.revenuecat.com/docs/platform-resources/google-platform-resources/google-plays-data-safety>
- RevenueCat REST API v1, phần xóa khách hàng: <https://www.revenuecat.com/docs/api-v1>
- Google Play, mẫu An toàn dữ liệu: <https://support.google.com/googleplay/android-developer/answer/10787469>
- Google Play, chính sách gói đăng ký: <https://support.google.com/googleplay/android-developer/answer/9900533>

Google ghi rõ **nhà phát triển tự chịu trách nhiệm** về câu trả lời trong mẫu An toàn dữ liệu. Tài liệu này chỉ là bản nháp để Owner xét lại.

## 2. Mẫu An toàn dữ liệu: phần thêm do gói Premium

Phần này chỉ nói về **phần thêm vào** do gói Premium. Các mục đã khai cho tài khoản, Nhật ký, AI, ngày sinh… giữ nguyên như bản khai trước.

### 2.1. Thu thập hoặc chia sẻ

| Nhóm (Play) | Loại dữ liệu | Thu thập | Chia sẻ | Bắt buộc? | Mục đích | Ghi chú |
|---|---|---|---|---|---|---|
| Thông tin tài chính (Financial info) | Lịch sử mua hàng (Purchase history) | **Có** | **Không** (xem 2.2) | Bắt buộc với người mua gói; không mua thì không có | Chức năng ứng dụng (App functionality); Quản lý tài khoản (Account management) | Gồm mã sản phẩm, trạng thái gói, ngày gia hạn và hết hạn. Nilaza **không** nhận số thẻ hay thông tin thanh toán: Google Play xử lý. |
| Thông tin cá nhân (Personal info) | Mã người dùng (User IDs) | **Có** (thường đã khai cho tài khoản) | **Không** (xem 2.2) | Bắt buộc khi đăng nhập | Chức năng ứng dụng; Quản lý tài khoản | Ứng dụng gửi cho bên quản lý gói **chỉ mã tài khoản ngẫu nhiên** (UUID), không gửi email hay tên. Đã kiểm trong code: ứng dụng không gọi hàm gửi thuộc tính khách hàng (email, tên) sang RevenueCat. |

Ba nhóm sau **không** cần khai thêm vì Premium:

- **Thông tin thanh toán** (payment info): Google Play giữ.
- **Định danh thiết bị và quảng cáo**: Nilaza không bật tích hợp dùng mã quảng cáo. Nếu sau này bật tích hợp quảng cáo hoặc đo lường, phải khai lại.
- **Analytics**: RevenueCat gợi ý chọn thêm mục đích "Analytics" vì họ dùng dữ liệu để vẽ biểu đồ doanh thu cho nhà phát triển. **Owner quyết:** chọn thêm "Analytics" nếu Owner dùng biểu đồ doanh thu của RevenueCat; chọn thì an toàn hơn.

### 2.2. "Chia sẻ" hay không?

Theo định nghĩa của Google, chuyển dữ liệu cho **nhà cung cấp dịch vụ** xử lý thay mặt nhà phát triển **không tính là chia sẻ**. Nilaza dùng RevenueCat, Inc. đúng như vậy: quản lý gói thay mặt Nilaza, và chính sách quyền riêng tư đã nêu tên.

RevenueCat cũng ghi: chỉ cần khai "chia sẻ" khi bật tích hợp gửi dữ liệu sang bên thứ ba không phải nhà cung cấp dịch vụ. Nilaza hiện không bật tích hợp nào như vậy.

- **Đề xuất:** chọn "Không chia sẻ".
- **Owner xác nhận:** trong bảng điều khiển RevenueCat chưa bật tích hợp nào (quảng cáo, analytics bên ngoài, webhook sang bên thứ ba). Webhook về Supabase của Nilaza thì không tính.

### 2.3. Bảo mật

- **Mã hóa khi truyền:** chọn **Có**. Ứng dụng ↔ Supabase, ứng dụng ↔ RevenueCat, RevenueCat ↔ Supabase (webhook) và Supabase ↔ RevenueCat (xóa khách hàng) đều dùng HTTPS.
- **Người dùng yêu cầu xóa dữ liệu:** chọn **Có**.
  - Trong ứng dụng: **Tôi → Tài khoản → Xóa tài khoản**.
  - Ngoài ứng dụng: trang `https://<tên miền website>/vi/account-deletion`. Owner điền đúng URL đã khai ở mục "Xóa tài khoản" của Play Console.
  - Khi xóa tài khoản, máy chủ xóa trạng thái gói trên Nilaza **và** gọi RevenueCat xóa hồ sơ khách hàng (code Lô 3). Điều kiện: Edge Function `account-delete` đã được deploy **với** bí mật `REVENUECAT_API_KEY`. Xem mục 5.
- **Dữ liệu còn giữ sau khi xóa** (đã ghi trên trang xóa tài khoản):
  - Nhật ký kỹ thuật thông báo thanh toán: mã sự kiện, loại, thời gian, mã người dùng ngẫu nhiên. Thời hạn lưu: **[CẦN OWNER QUYẾT]**.
  - Bản ghi giao dịch do Google Play giữ.

## 3. Trang cửa hàng: đoạn mô tả gói đăng ký (nháp để Owner sửa)

Chính sách của Google yêu cầu nói rõ: giá, chu kỳ thanh toán, việc tự gia hạn, cách hủy, và quyền lợi khi trả phí so với miễn phí. **Giá thật lấy từ Play Console**; không ghi số tiền cứng nếu chưa chốt.

**Tiếng Việt (mô tả đầy đủ, thêm vào cuối):**

> **Gói Premium (tùy chọn).** Nilaza dùng miễn phí với các tính năng cơ bản. Premium mở thêm lượt diễn giải AI và các tính năng nâng cao [CẦN OWNER LIỆT KÊ ĐÚNG QUYỀN LỢI]. Gói trả theo tháng hoặc theo năm, giá hiển thị trong ứng dụng và trên Google Play trước khi bạn xác nhận. Gói **tự gia hạn** cho đến khi bạn hủy. Bạn có thể hủy bất cứ lúc nào trong Google Play → Thanh toán và gói đăng ký → Gói đăng ký; Premium vẫn dùng được đến hết kỳ đã trả. Xóa ứng dụng hoặc xóa tài khoản không tự hủy gói. Hoàn tiền theo chính sách của Google Play.

**English:**

> **Premium (optional).** Nilaza is free to use with core features. Premium adds more AI interpretations and advanced features [OWNER TO LIST EXACT BENEFITS]. It is billed monthly or yearly at the price shown in the app and on Google Play before you confirm. The subscription **renews automatically** until you cancel. Cancel any time in Google Play → Payments & subscriptions → Subscriptions; Premium stays until the end of the paid period. Uninstalling the app or deleting your account does not cancel it. Refunds follow Google Play's policy.

Ngoài ra Owner cần làm hai việc:

- Khai sản phẩm gói (monthly/yearly) và giá trong **Play Console → Kiếm tiền → Gói thuê bao**.
- Nếu có bản dùng thử hoặc ưu đãi, ghi rõ thời gian và giá sau khi hết ưu đãi.

## 4. Kiểm tra theo chính sách gói đăng ký của Google Play

Phần **Trạng thái** chỉ ghi điều đã thấy trong code hoặc trang web. Chưa có ai thử trên điện thoại thật.

| # | Yêu cầu | Trạng thái | Ở đâu |
|---|---|---|---|
| 1 | Màn mua nêu giá, chu kỳ (tháng/năm) rõ ràng trước khi mua | Có trong code màn Premium; **chưa thử trên máy** | `apps/mobile/src/features/billing/PaywallPanel.tsx` (agent khác đang sửa) |
| 2 | Nói rõ gói tự gia hạn | Có ở Điều khoản và trang trợ giúp; cần kiểm lại trên màn mua | Điều khoản, mục "Gói Premium"; trợ giúp `astrology-premium` |
| 3 | Cách hủy dễ tìm, có liên kết hủy trực tuyến | Có nút **Quản lý gói** mở trang gói đăng ký của Google Play; trang web hướng dẫn đường hủy | `playSubscriptionsUrl`; Điều khoản; trợ giúp |
| 4 | Không lừa người dùng nghĩ là miễn phí, không giấu điều kiện | Văn bản nói rõ có trả phí; **Owner duyệt câu chữ cuối cùng** | Trang cửa hàng, mục 3 |
| 5 | Quyền lợi trả phí khớp với điều ứng dụng thực sự mở | **Chưa kiểm chứng** đầu cuối (mua, webhook, mở quyền) | Lô 1–2 billing |
| 6 | Khôi phục giao dịch mua trên máy mới | Có nút trong code; **chưa thử trên máy** | Màn Premium |
| 7 | Xóa tài khoản: báo người dùng gói **không** tự hủy | Đã thêm thông báo trên màn Xóa tài khoản, kèm liên kết Google Play | `DeleteAccountBillingNotice.tsx` |
| 8 | Hoàn tiền: không hứa điều Google Play không làm | Văn bản chỉ dẫn về chính sách hoàn tiền của Google Play | Điều khoản |
| 9 | Chính sách quyền riêng tư nêu bên quản lý gói | Có (RevenueCat, Inc.) | Quyền riêng tư, mục "Mua gói Premium" |
| 10 | Thanh toán chỉ qua Google Play Billing trong ứng dụng Android | Theo thiết kế (RevenueCat dùng Google Play Billing); không có liên kết thanh toán ngoài | — |

## 5. Owner cần điền, quyết hoặc duyệt

1. **Đặt bí mật `REVENUECAT_API_KEY`** (khóa bí mật REST v1 của RevenueCat) cho Supabase, rồi **deploy lại `account-delete`**. Mỗi việc cần Owner duyệt riêng.
   - Nếu chưa có khóa, xóa tài khoản vẫn chạy nhưng **không** xóa hồ sơ bên RevenueCat. Khi đó văn bản quyền riêng tư sẽ nói nhiều hơn thực tế.
   - Phải xong việc này **trước** khi mở bán.
2. Điền các chỗ trống trong văn bản pháp lý:
   - `[CẦN OWNER ĐIỀN: tên nhà phát triển hoặc pháp nhân bán gói]` trong Điều khoản (vi/en).
   - `[CẦN OWNER QUYẾT: thời hạn lưu]` cho nhật ký thông báo thanh toán, trên trang Xóa tài khoản (vi/en).
   - Danh sách quyền lợi Premium trong đoạn mô tả cửa hàng.
3. **Nhờ người có chuyên môn pháp lý rà** Điều khoản, Quyền riêng tư và trang Xóa tài khoản trước khi phát hành. Agent không phải luật sư.
4. Xác nhận RevenueCat chưa bật tích hợp gửi dữ liệu sang bên thứ ba (mục 2.2), và quyết có chọn mục đích "Analytics" hay không (mục 2.1).
5. Điền URL trang xóa tài khoản và URL chính sách quyền riêng tư đúng tên miền đang chạy trong Play Console.

## 6. Chưa kiểm chứng

- **Chưa thử trên điện thoại thật** hay với tài khoản thử của Google Play: mua, gia hạn, hủy, khôi phục, và màn Xóa tài khoản có thông báo mới.
- `account-delete` bản mới **chưa deploy** và khóa **chưa đặt**. Lời gọi xóa thật tới RevenueCat mới chỉ được kiểm bằng test giả lập (Deno), chưa gọi máy chủ thật.
- Theo tài liệu RevenueCat, lệnh xóa khách hàng được xếp hàng xử lý sau, không xóa ngay tức thì. Thời gian xử lý thực tế chưa đo.
- Bảng `nilaza_private.revenuecat_webhook_events` **vẫn giữ mã người dùng** sau khi xóa tài khoản. Cần một migration hoặc quy tắc tự xóa theo thời hạn (lô sau, cần duyệt SQL). Văn bản hiện công khai điều này kèm chỗ trống thời hạn.
- Văn bản pháp lý **chưa** được người có chuyên môn pháp lý duyệt.
- Câu trả lời mẫu An toàn dữ liệu dựa trên tài liệu RevenueCat và Google ngày 16/11/2026; Google có thể đổi biểu mẫu.
